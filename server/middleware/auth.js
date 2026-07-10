import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { ApiError } from './error.js'

// Defense-in-depth: validateEnv() already refuses to boot production without
// real secrets, but never allow the known dev fallback in production either.
function requireSecret(name, devFallback) {
  const value = process.env[name]
  if (value) return value
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set in production`)
  }
  return devFallback
}

const JWT_SECRET = requireSecret('JWT_SECRET', 'dev-only-secret-change-me')
const JWT_REFRESH_SECRET = requireSecret('JWT_REFRESH_SECRET', 'dev-only-refresh-secret-change-me')

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), roles: user.roles }, JWT_SECRET, {
    expiresIn: '15m',
  })
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString() }, JWT_REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET)
}

/**
 * Cookie options depend on how the client reached us:
 * - HTTPS (production, or a preview proxy that terminates TLS): the app may be
 *   embedded in a cross-site iframe, so cookies need SameSite=None; Secure or
 *   the browser silently drops them (symptom: instant auto-logout after login).
 * - Plain HTTP localhost: SameSite=None requires Secure, which HTTP can't do,
 *   so fall back to Lax.
 * Requires `app.set('trust proxy', 1)` so req.secure honors X-Forwarded-Proto.
 */
function cookieOptions(req) {
  // X-Forwarded-Proto may chain values through multiple proxies
  // (e.g. "https,http"); the first entry is the original client protocol.
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
  const isSecure = req.secure || forwardedProto === 'https'
  return {
    httpOnly: true,
    path: '/',
    sameSite: isSecure ? 'none' : 'lax',
    secure: isSecure,
  }
}

/**
 * Sets httpOnly auth cookies AND returns the token pair.
 *
 * Why both: on split deploys (frontend on Vercel, API on Render) the cookies
 * are THIRD-PARTY cookies, which mobile Safari/iOS and other mobile browsers
 * block entirely — login appears to succeed but the cookie is silently
 * dropped, and the next request 401s (symptom: instant logout on mobile).
 * The client stores the returned tokens and sends them via the
 * Authorization header as a fallback that works on every browser.
 */
export function setAuthCookies(req, res, user) {
  const common = cookieOptions(req)
  const accessToken = signAccessToken(user)
  const refreshToken = signRefreshToken(user)
  res.cookie('accessToken', accessToken, { ...common, maxAge: 15 * 60 * 1000 })
  res.cookie('refreshToken', refreshToken, { ...common, maxAge: 7 * 24 * 60 * 60 * 1000 })
  return { accessToken, refreshToken }
}

/** Access token from the httpOnly cookie OR the Authorization: Bearer header. */
export function getAccessToken(req) {
  if (req.cookies?.accessToken) return req.cookies.accessToken
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) return header.slice(7)
  return null
}

export function clearAuthCookies(req, res) {
  const common = cookieOptions(req)
  res.clearCookie('accessToken', common)
  res.clearCookie('refreshToken', common)
}

/** Requires a valid access token; attaches req.user */
export async function requireAuth(req, res, next) {
  try {
    const token = getAccessToken(req)
    if (!token) throw new ApiError(401, 'Not authenticated')
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(payload.sub)
    if (!user) {
      // Session references a deleted user (e.g. the dev database was
      // re-seeded). Clear the dead cookies so the client can recover.
      clearAuthCookies(req, res)
      throw new ApiError(401, 'Your session has expired. Please log in again.')
    }
    if (user.isSuspended) throw new ApiError(403, 'Account suspended')
    req.user = user
    next()
  } catch (err) {
    if (err instanceof ApiError) return next(err)
    next(new ApiError(401, 'Invalid or expired token'))
  }
}

/** Optional auth: attaches req.user if a valid token is present, otherwise continues */
export async function optionalAuth(req, _res, next) {
  try {
    const token = getAccessToken(req)
    if (token) {
      const payload = jwt.verify(token, JWT_SECRET)
      req.user = await User.findById(payload.sub)
    }
  } catch {
    // ignore - treat as guest
  }
  next()
}

/** RBAC middleware factory */
export function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Not authenticated'))
    const has = roles.some((r) => req.user.roles.includes(r))
    if (!has) return next(new ApiError(403, 'Insufficient permissions'))
    next()
  }
}
