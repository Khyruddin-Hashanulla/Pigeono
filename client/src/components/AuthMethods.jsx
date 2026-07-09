import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { RotateCw, MailCheck } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'

const inputCls =
  'w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring'

/**
 * Email OTP verification form (post-registration / unverified login).
 * Auto-submits when 6 digits are entered. "Resend" has a 60s countdown.
 * In email dev mode the server returns the code and we surface it inline.
 */
export function EmailOtpVerify({ email, initialDevOtp = '', verifyEmail, resendOtp, onSuccess }) {
  const [code, setCode] = useState('')
  const [devOtp, setDevOtp] = useState(initialDevOtp)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(60)
  const submittedRef = useRef(false)

  // Resend cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const submit = async (value) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setError('')
    setBusy(true)
    try {
      const user = await verifyEmail(email, value)
      onSuccess(user)
    } catch (err) {
      setError(apiErrorMessage(err))
      setCode('')
      submittedRef.current = false
    } finally {
      setBusy(false)
    }
  }

  const onChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
    setError('')
    if (value.length === 6) submit(value) // auto-submit
  }

  const resend = async () => {
    setError('')
    setBusy(true)
    try {
      const data = await resendOtp(email)
      setDevOtp(data?.devOtp || '')
      setCooldown(60)
      setCode('')
      submittedRef.current = false
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (code.length === 6) submit(code)
      }}
      className="flex flex-col gap-4"
    >
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. Enter it below to
          verify your email.
        </span>
      </p>
      {devOtp && (
        <p className="rounded-md border border-accent bg-accent/10 px-3 py-2 text-sm">
          <span className="font-semibold">Dev mode:</span> your OTP is{' '}
          <span className="font-mono font-bold">{devOtp}</span>
          <span className="block text-xs text-muted-foreground">Configure SMTP to send real emails.</span>
        </p>
      )}
      <div>
        <label htmlFor="email-otp-code" className="mb-1.5 block text-sm font-medium">
          6-digit code
        </label>
        <input
          id="email-otp-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={onChange}
          disabled={busy}
          className={`${inputCls} text-center font-mono text-lg tracking-[0.5em]`}
        />
      </div>
      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {busy ? 'Verifying...' : 'Verify email'}
      </button>
      <button
        type="button"
        onClick={resend}
        disabled={busy || cooldown > 0}
        className="flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RotateCw className="size-3.5" aria-hidden="true" />
        {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
      </button>
    </form>
  )
}

/**
 * Google sign-in setup.
 *
 * GoogleOAuthProvider must be mounted ONCE at the app root — mounting it per
 * button caused `google.accounts.id.initialize()` to run again on every
 * Login/Register navigation (the "initialize() is called multiple times"
 * console warning). GoogleAuthProvider fetches /auth/google/config a single
 * time and provides the client ID to all buttons via context.
 */
const GoogleClientIdContext = createContext('')

let googleConfigPromise = null
function fetchGoogleConfig() {
  if (!googleConfigPromise) {
    googleConfigPromise = api
      .get('/auth/google/config')
      .then(({ data }) => (data.data?.enabled ? data.data.clientId : ''))
      .catch(() => {
        googleConfigPromise = null // allow retry on transient failure
        return ''
      })
  }
  return googleConfigPromise
}

/** Mount once at the app root (see main.jsx). Renders children as-is until config loads. */
export function GoogleAuthProvider({ children }) {
  const [clientId, setClientId] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchGoogleConfig().then((id) => {
      if (!cancelled && id) setClientId(id)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!clientId) {
    // Google not configured (or config still loading) — app works without it
    return <GoogleClientIdContext.Provider value="">{children}</GoogleClientIdContext.Provider>
  }

  return (
    <GoogleClientIdContext.Provider value={clientId}>
      <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
    </GoogleClientIdContext.Provider>
  )
}

export function GoogleSignInButton({ onSuccess, onError, loginWithGoogle }) {
  const clientId = useContext(GoogleClientIdContext)

  if (!clientId) return null

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <GoogleLogin
        text="continue_with"
        width={320}
        onSuccess={async (credentialResponse) => {
          try {
            const user = await loginWithGoogle(credentialResponse.credential)
            onSuccess(user)
          } catch (err) {
            onError?.(apiErrorMessage(err))
          }
        }}
        onError={() => onError?.('Google sign-in failed. Please try again.')}
      />
    </div>
  )
}
