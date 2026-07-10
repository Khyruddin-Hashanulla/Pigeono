import axios from 'axios'

/**
 * Backend base URL.
 * - Same-origin deploys (VPS + Nginx, or dev with Vite proxy): leave unset.
 * - Split deploys (frontend on Vercel, backend on Render): set VITE_API_URL
 *   to the backend origin, e.g. https://pigeono-api.onrender.com
 */
export const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api/v1`,
  withCredentials: true,
})

/**
 * Bearer-token fallback for split deploys (frontend on Vercel, API on Render).
 *
 * Auth cookies are third-party cookies there, and mobile Safari/iOS (plus
 * other mobile browsers) block them entirely — login "succeeds" but the very
 * next request 401s, logging the user straight back out. The server also
 * returns the token pair in login responses; we store it and send the access
 * token via the Authorization header, which works on every browser. Cookies
 * still work as before for same-origin deploys.
 */
const TOKENS_KEY = 'pigeono:tokens'

function getStoredTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY)) || null
  } catch {
    return null
  }
}

function storeTokens(tokens) {
  try {
    if (tokens?.accessToken && tokens?.refreshToken) {
      localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
    }
  } catch {
    // storage unavailable (private mode quota etc.) — cookies may still work
  }
}

export function clearTokens() {
  try {
    localStorage.removeItem(TOKENS_KEY)
  } catch {
    // ignore
  }
}

/** Current access token, used by the socket handshake too. */
export function getAccessToken() {
  return getStoredTokens()?.accessToken || null
}

// Attach the Authorization header to every request when we have a token
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Fired when the session is irrecoverably dead (refresh also failed). */
export const SESSION_EXPIRED_EVENT = 'pigeono:session-expired'

// Auto-refresh expired access tokens once, then retry the original request
let refreshing = null
api.interceptors.response.use(
  (res) => {
    // Server returns { tokens } on login/verify/google/refresh — persist them
    if (res.data?.tokens) storeTokens(res.data.tokens)
    return res
  },
  async (error) => {
    const original = error.config
    const isAuthEndpoint = original?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && !original._retried && !isAuthEndpoint) {
      original._retried = true
      try {
        // Send the stored refresh token in the body for browsers that
        // blocked the cookie (mobile). Cookie path still works if present.
        const stored = getStoredTokens()
        refreshing =
          refreshing ||
          api.post('/auth/refresh', stored?.refreshToken ? { refreshToken: stored.refreshToken } : {})
        await refreshing
        refreshing = null
        return api(original)
      } catch {
        refreshing = null
        clearTokens()
        // Refresh failed too — the session is dead (e.g. user was deleted
        // after a dev database re-seed). Tell the app to log out cleanly.
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
      }
    }
    return Promise.reject(error)
  }
)

export function apiErrorMessage(err) {
  return err?.response?.data?.message || 'Something went wrong. Please try again.'
}
