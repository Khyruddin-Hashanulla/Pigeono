import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, SESSION_EXPIRED_EVENT } from '../lib/api'
import { disconnectSocket } from '../lib/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // If a request hits a dead session (refresh failed too), drop the stale
  // user state so the app returns to the logged-out UI instead of erroring.
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    setUser(data.data)
    await refresh() // pull populated vendorProfile
    return data.data
  }

  /** Starts registration — server sends an email OTP; user is NOT logged in yet */
  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    return data.data // { email, requiresVerification, devOtp? }
  }

  /** Completes email verification with the OTP; logs the user in */
  const verifyEmail = async (email, code) => {
    const { data } = await api.post('/auth/verify-email', { email, code })
    setUser(data.data)
    await refresh()
    return data.data
  }

  /** Resends the email verification OTP (60s server-side cooldown) */
  const resendOtp = async (email) => {
    const { data } = await api.post('/auth/resend-otp', { email })
    return data.data // { devOtp? }
  }

  /** Complete phone OTP login/signup (name only needed for new accounts) */
  const loginWithOtp = async (phone, code, name) => {
    const { data } = await api.post('/auth/otp/verify', { phone, code, ...(name ? { name } : {}) })
    setUser(data.data)
    await refresh()
    return data.data
  }

  /** Complete Google sign-in with a Google Identity Services credential */
  const loginWithGoogle = async (credential) => {
    const { data } = await api.post('/auth/google', { credential })
    setUser(data.data)
    await refresh()
    return data.data
  }

  const logout = async () => {
    await api.post('/auth/logout')
    disconnectSocket() // drop the real-time connection tied to the old session
    setUser(null)
  }

  const isVendor = user?.roles?.includes('vendor')
  const isAdmin = user?.roles?.includes('admin')

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, verifyEmail, resendOtp, loginWithOtp, loginWithGoogle, logout, refresh, isVendor, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
