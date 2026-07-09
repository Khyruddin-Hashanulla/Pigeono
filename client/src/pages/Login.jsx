import { useState, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiErrorMessage } from '../lib/api'
import { GoogleSignInButton, EmailOtpVerify } from '../components/AuthMethods'

export default function Login() {
  const { login, verifyEmail, resendOtp, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [devOtp, setDevOtp] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Only return to the remembered page if this user can actually access it.
  const redirectAfterLogin = useCallback(
    (loggedIn) => {
      const from = location.state?.from || '/'
      const roles = loggedIn?.roles || []
      const blocked =
        (from.startsWith('/dashboard/vendor') && !roles.includes('vendor')) ||
        (from.startsWith('/admin') && !roles.includes('admin'))
      navigate(blocked ? '/' : from, { replace: true })
    },
    [location.state, navigate]
  )

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const loggedIn = await login(email, password)
      redirectAfterLogin(loggedIn)
    } catch (err) {
      const resData = err.response?.data?.data
      if (resData?.requiresVerification) {
        // Account exists but email is unverified — server re-sent an OTP
        setDevOtp(resData.devOtp || '')
        setNeedsVerification(true)
      } else {
        setError(apiErrorMessage(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (needsVerification) {
    return (
      <div className="mx-auto flex max-w-md flex-col px-4 py-14">
        <h1 className="font-serif text-3xl font-bold">Verify your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your email isn&apos;t verified yet. Enter the code we just sent to continue.
        </p>
        <div className="mt-6">
          <EmailOtpVerify
            email={email}
            initialDevOtp={devOtp}
            verifyEmail={verifyEmail}
            resendOtp={resendOtp}
            onSuccess={redirectAfterLogin}
          />
        </div>
        <button
          type="button"
          onClick={() => setNeedsVerification(false)}
          className="mt-6 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Back to login
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <h1 className="font-serif text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">Log in to buy, sell and message breeders.</p>

      {location.state?.notice && (
        <p role="status" className="mt-4 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
          {location.state.notice}
        </p>
      )}

      <div className="mt-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>
      </div>

      <div className="mt-6">
        <GoogleSignInButton loginWithGoogle={loginWithGoogle} onSuccess={redirectAfterLogin} onError={setError} />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Pigeono?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>

      <div className="mt-8 rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">Demo accounts (seeded) — click to fill</p>
        <ul className="mt-2 flex flex-col gap-1">
          {[
            { label: 'Vendor', email: 'arjun@demo.pigeono.com', password: 'VendorPass123!' },
            { label: 'Buyer', email: 'buyer@pigeono.com', password: 'BuyerPass123!' },
            { label: 'Admin', email: 'admin1@pigeono.com', password: 'AdminPass123!' },
          ].map((acc) => (
            <li key={acc.label}>
              <button
                type="button"
                onClick={() => {
                  setEmail(acc.email)
                  setPassword(acc.password)
                  setError('')
                }}
                className="w-full rounded-md px-2 py-1 text-left transition-colors hover:bg-muted hover:text-foreground"
              >
                <span className="font-medium text-foreground">{acc.label}:</span> {acc.email} / {acc.password}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
