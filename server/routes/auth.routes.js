import { Router } from 'express'
import { body } from 'express-validator'
import slugify from 'slugify'
import { OAuth2Client } from 'google-auth-library'
import User from '../models/User.js'
import VendorProfile from '../models/VendorProfile.js'
import OtpCode from '../models/OtpCode.js'
import { sendOtpEmail, sendWelcomeEmail, isEmailDevMode, isEmailConfigured } from '../services/email.js'
import { validate } from '../middleware/validate.js'
import { ApiError } from '../middleware/error.js'
import {
  requireAuth,
  setAuthCookies,
  clearAuthCookies,
  verifyRefreshToken,
} from '../middleware/auth.js'

const router = Router()

/**
 * Send an OTP email and FAIL LOUDLY if it can't be delivered.
 * Previously send failures were silently swallowed: in production without
 * working SMTP the user saw "OTP sent to email" but nothing ever arrived.
 */
async function sendOtpEmailOrThrow(email, code) {
  if (process.env.NODE_ENV === 'production' && !isEmailConfigured()) {
    console.error('[pigeono] OTP email requested but SMTP is not configured')
    throw new ApiError(503, 'Email service is not configured. Please contact support or sign in with Google.')
  }
  const result = await sendOtpEmail(email, code)
  if (!result.ok) {
    throw new ApiError(502, 'We could not send the verification email. Please try again in a moment.')
  }
}

router.post(
  '/register',
  validate([
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name is required (2-100 chars)'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ]),
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body
      const existing = await User.findOne({ email })
      if (existing && existing.emailVerified) {
        throw new ApiError(409, 'An account with this email already exists')
      }
      let user
      if (existing) {
        // Unverified account re-registering: update details and resend OTP
        existing.name = name
        existing.password = password
        user = await existing.save()
      } else {
        user = await User.create({ name, email, password })
      }
      user.emailOtpSentAt = new Date()
      await user.save()
      const code = await OtpCode.issue(email, 'email_verify')
      await sendOtpEmailOrThrow(email, code)
      // User is NOT logged in until the email is verified
      res.status(201).json({
        success: true,
        message: 'Verification OTP sent to email',
        data: {
          email,
          requiresVerification: true,
          // Dev mode only: surface the code so the flow is testable without SMTP
          ...(isEmailDevMode() ? { devOtp: code } : {}),
        },
      })
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').isString().notEmpty(),
  ]),
  async (req, res, next) => {
    try {
      const { email, password } = req.body
      const user = await User.findOne({ email }).select('+password')
      if (!user || !(await user.comparePassword(password))) {
        throw new ApiError(401, 'Invalid email or password')
      }
      if (user.isSuspended) throw new ApiError(403, 'Account suspended')
      if (user.authProviders.includes('password') && !user.emailVerified && !user.isVerified) {
        // Legacy accounts created before email verification are treated as verified
        const createdBeforeFeature = !user.emailOtpSentAt
        if (!createdBeforeFeature) {
          const code = await OtpCode.issue(user.email, 'email_verify')
          user.emailOtpSentAt = new Date()
          await user.save()
          await sendOtpEmailOrThrow(user.email, code)
          return res.status(403).json({
            success: false,
            message: 'Email not verified. A new OTP has been sent.',
            data: {
              requiresVerification: true,
              email: user.email,
              ...(isEmailDevMode() ? { devOtp: code } : {}),
            },
          })
        }
      }
      setAuthCookies(req, res, user)
      res.json({ success: true, data: user.toSafeJSON() })
    } catch (err) {
      next(err)
    }
  }
)

/** POST /auth/verify-email — verify OTP sent to email; logs the user in */
router.post(
  '/verify-email',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('code').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Enter the 6-digit code'),
  ]),
  async (req, res, next) => {
    try {
      const { email, code } = req.body
      const user = await User.findOne({ email })
      if (!user) throw new ApiError(404, 'No account found for this email')
      if (user.isSuspended) throw new ApiError(403, 'Account suspended')

      const result = await OtpCode.verify(email, code)
      if (!result.ok) throw new ApiError(401, result.reason)

      user.emailVerified = true
      user.isVerified = true
      await user.save()
      sendWelcomeEmail(user) // fire-and-forget
      setAuthCookies(req, res, user)
      res.json({ success: true, message: 'Email verified', data: user.toSafeJSON() })
    } catch (err) {
      next(err)
    }
  }
)

/** POST /auth/resend-otp — resend email verification OTP (60s cooldown) */
router.post(
  '/resend-otp',
  validate([body('email').isEmail().normalizeEmail()]),
  async (req, res, next) => {
    try {
      const { email } = req.body
      const user = await User.findOne({ email })
      if (!user) throw new ApiError(404, 'No account found for this email')
      if (user.emailVerified) throw new ApiError(409, 'Email is already verified')
      if (user.isSuspended) throw new ApiError(403, 'Account suspended')

      if (user.emailOtpSentAt && Date.now() - user.emailOtpSentAt.getTime() < 60 * 1000) {
        const wait = Math.ceil((60 * 1000 - (Date.now() - user.emailOtpSentAt.getTime())) / 1000)
        throw new ApiError(429, `Please wait ${wait}s before requesting a new code`)
      }

      const code = await OtpCode.issue(email, 'email_verify')
      user.emailOtpSentAt = new Date()
      await user.save()
      await sendOtpEmailOrThrow(email, code)
      res.json({
        success: true,
        message: 'A new OTP has been sent to your email',
        data: { ...(isEmailDevMode() ? { devOtp: code } : {}) },
      })
    } catch (err) {
      next(err)
    }
  }
)

/**
 * Normalize an email exactly like express-validator's normalizeEmail() does on
 * the register/login routes (Gmail: strip dots and +suffix, googlemail → gmail).
 * Without this, "john.doe@gmail.com" from Google would not match the
 * "johndoe@gmail.com" stored at manual registration — creating a DUPLICATE account.
 */
function normalizeGoogleEmail(raw) {
  let [local, domain] = String(raw).trim().toLowerCase().split('@')
  if (!domain) return String(raw).trim().toLowerCase()
  if (domain === 'googlemail.com') domain = 'gmail.com'
  if (domain === 'gmail.com') {
    local = local.split('+')[0].replace(/\./g, '')
  }
  return `${local}@${domain}`
}

/** GET /auth/google/config — tells the client whether Google sign-in is available */
router.get('/google/config', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  res.json({ success: true, data: { enabled: Boolean(clientId), clientId } })
})

/** POST /auth/google — verify a Google ID token; logs in or creates the account */
router.post(
  '/google',
  validate([body('credential').isString().notEmpty().withMessage('Google credential required')]),
  async (req, res, next) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID
      if (!clientId) throw new ApiError(503, 'Google sign-in is not configured')

      const client = new OAuth2Client(clientId)
      let payload
      try {
        const ticket = await client.verifyIdToken({ idToken: req.body.credential, audience: clientId })
        payload = ticket.getPayload()
      } catch {
        throw new ApiError(401, 'Invalid Google credential')
      }
      if (!payload?.sub || !payload?.email) throw new ApiError(401, 'Google account missing required info')

      const email = normalizeGoogleEmail(payload.email)
      let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] })
      if (!user) {
        user = await User.create({
          name: payload.name || email.split('@')[0],
          email,
          googleId: payload.sub,
          profileImage: payload.picture,
          isVerified: Boolean(payload.email_verified),
          emailVerified: Boolean(payload.email_verified),
          authProviders: ['google'],
        })
      } else {
        if (user.isSuspended) throw new ApiError(403, 'Account suspended')
        if (user.googleId && user.googleId !== payload.sub) {
          throw new ApiError(409, 'This Google account is already linked to another user')
        }
        let changed = false
        if (!user.googleId) {
          user.googleId = payload.sub
          changed = true
        }
        if (!user.authProviders.includes('google')) {
          user.authProviders.push('google')
          changed = true
        }
        if (!user.profileImage && payload.picture) {
          user.profileImage = payload.picture
          changed = true
        }
        if (!user.emailVerified && payload.email_verified && user.email === email) {
          user.emailVerified = true
          user.isVerified = true
          changed = true
        }
        if (changed) await user.save()
      }
      setAuthCookies(req, res, user)
      res.json({ success: true, data: user.toSafeJSON() })
    } catch (err) {
      next(err)
    }
  }
)

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) throw new ApiError(401, 'No refresh token')
    const payload = verifyRefreshToken(token)
    const user = await User.findById(payload.sub)
    if (!user || user.isSuspended) {
      clearAuthCookies(req, res)
      throw new ApiError(401, 'Invalid refresh token')
    }
    setAuthCookies(req, res, user)
    res.json({ success: true, data: user.toSafeJSON() })
  } catch (err) {
    next(err instanceof ApiError ? err : new ApiError(401, 'Invalid refresh token'))
  }
})

router.post('/logout', (req, res) => {
  clearAuthCookies(req, res)
  res.json({ success: true, message: 'Logged out' })
})

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id).populate('vendorProfile')
  res.json({ success: true, data: user })
})

// Password reset request — emails a single-use tokenized link (30 min expiry)
router.post(
  '/forgot-password',
  validate([body('email').isEmail().normalizeEmail()]),
  async (req, res, next) => {
    try {
      // Config-based check (not account-based) — safe from email enumeration
      if (process.env.NODE_ENV === 'production' && !isEmailConfigured()) {
        console.error('[pigeono] Password reset requested but SMTP is not configured')
        throw new ApiError(503, 'Email service is not configured. Please contact support.')
      }
      const user = await User.findOne({ email: req.body.email })
      let devResetUrl
      if (user) {
        const crypto = await import('node:crypto')
        const rawToken = crypto.randomBytes(32).toString('hex')
        user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex')
        user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000)
        await user.save()

        const { sendPasswordResetEmail, isEmailDevMode: emailDevMode } = await import('../services/email.js')
        const origin = process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:3000'
        const resetUrl = `${origin}/reset-password?token=${rawToken}`
        sendPasswordResetEmail(user.email, resetUrl) // fire-and-forget
        if (emailDevMode()) devResetUrl = resetUrl // surfaced only when no SMTP is configured
      }
      // Always 200 to avoid email enumeration
      res.json({
        success: true,
        message: 'If that email exists, a reset link has been sent.',
        ...(devResetUrl ? { data: { devResetUrl } } : {}),
      })
    } catch (err) {
      next(err)
    }
  }
)

// Password reset submit — verifies the token, sets the new password
router.post(
  '/reset-password',
  validate([
    body('token').isString().isLength({ min: 32, max: 128 }),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Za-z]/)
      .matches(/\d/)
      .withMessage('Password must contain letters and numbers'),
  ]),
  async (req, res, next) => {
    try {
      const crypto = await import('node:crypto')
      const mongoose = (await import('mongoose')).default
      const hashed = crypto.createHash('sha256').update(req.body.token).digest('hex')
      // mongoose.trusted: the $gt operator is server-generated, not user input
      // (global sanitizeFilter would otherwise reject it)
      const user = await User.findOne({
        resetPasswordToken: hashed,
        resetPasswordExpires: mongoose.trusted({ $gt: new Date() }),
      }).select('+resetPasswordToken +resetPasswordExpires +password')
      if (!user) throw new ApiError(400, 'Reset link is invalid or has expired. Please request a new one.')

      user.password = req.body.password // hashed by the pre-save hook
      user.resetPasswordToken = undefined
      user.resetPasswordExpires = undefined
      if (!user.authProviders.includes('password')) user.authProviders.push('password')
      await user.save()

      res.json({ success: true, message: 'Password reset successfully. You can now log in.' })
    } catch (err) {
      next(err)
    }
  }
)

// "Become a Vendor" application
router.post(
  '/become-vendor',
  requireAuth,
  validate([
    body('storeName').trim().isLength({ min: 3, max: 100 }).withMessage('Store name required (3-100 chars)'),
    body('storeDescription').optional().trim().isLength({ max: 2000 }),
  ]),
  async (req, res, next) => {
    try {
      if (req.user.vendorProfile) throw new ApiError(409, 'You already have a vendor application/store')
      const { storeName, storeDescription } = req.body
      const base = slugify(storeName, { lower: true, strict: true })
      let storeSlug = base
      let i = 1
      while (await VendorProfile.exists({ storeSlug })) storeSlug = `${base}-${i++}`

      const profile = await VendorProfile.create({
        userId: req.user._id,
        storeName,
        storeSlug,
        storeDescription,
        status: 'pending',
      })
      req.user.vendorProfile = profile._id
      if (!req.user.roles.includes('vendor')) req.user.roles.push('vendor')
      await req.user.save()
      res.status(201).json({ success: true, data: profile })
    } catch (err) {
      next(err)
    }
  }
)

export default router
