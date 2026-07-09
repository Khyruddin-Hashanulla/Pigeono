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

/** Fired when the session is irrecoverably dead (refresh also failed). */
export const SESSION_EXPIRED_EVENT = 'pigeono:session-expired'

// Auto-refresh expired access tokens once, then retry the original request
let refreshing = null
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const isAuthEndpoint = original?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && !original._retried && !isAuthEndpoint) {
      original._retried = true
      try {
        refreshing = refreshing || api.post('/auth/refresh')
        await refreshing
        refreshing = null
        return api(original)
      } catch {
        refreshing = null
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
