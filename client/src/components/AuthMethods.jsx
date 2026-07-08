import { useEffect, useRef, useState } from 'react'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { Smartphone, RotateCw, MailCheck } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'

const inputCls =
  'w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring'

/**
 * Phone OTP login/signup form. Two steps: request code, then verify.
 * In dev SMS mode the server returns the code and we surface it inline.
 */
export function PhoneOtpForm({ onSuccess, loginWithOtp }) {
  const [step, setStep] = useState('phone') // phone | code
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const [devOtp, setDevOtp] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const requestOtp = async (e) => {
    e?.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data } = await api.post('/auth/otp/request', { phone })
      setIsNewUser(Boolean(data.data?.isNewUser))
      setDevOtp(data.data?.devOtp || '')
      setStep('code')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const verifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await loginWithOtp(phone, code, isNewUser ? name : undefined)
      onSuccess(user)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={requestOtp} className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="otp-phone" className="mb-1.5 block text-sm font-medium">
            Mobile number
          </label>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-muted px-3 text-sm text-muted-foreground">
              +91
            </span>
            <input
              id="otp-phone"
              type="tel"
              inputMode="numeric"
              required
              maxLength={10}
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className={`${inputCls} rounded-l-none`}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy || phone.length !== 10}
          className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Sending code...' : 'Send OTP'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={verifyOtp} className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Smartphone className="size-4 shrink-0" aria-hidden="true" />
        Code sent to +91 {phone}.{' '}
        <button type="button" onClick={() => setStep('phone')} className="font-medium text-primary hover:underline">
          Change
        </button>
      </p>
      {devOtp && (
        <p className="rounded-md border border-accent bg-accent/10 px-3 py-2 text-sm">
          <span className="font-semibold">Dev mode:</span> your OTP is <span className="font-mono font-bold">{devOtp}</span>
          <span className="block text-xs text-muted-foreground">Add an SMS provider to send real texts.</span>
        </p>
      )}
      {isNewUser && (
        <div>
          <label htmlFor="otp-name" className="mb-1.5 block text-sm font-medium">
            Your name
          </label>
          <input
            id="otp-name"
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </div>
      )}
      <div>
        <label htmlFor="otp-code" className="mb-1.5 block text-sm font-medium">
          6-digit code
        </label>
        <input
          id="otp-code"
          type="text"
          inputMode="numeric"
          required
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className={`${inputCls} text-center font-mono text-lg tracking-[0.5em]`}
        />
      </div>
      <button
        type="submit"
        disabled={busy || code.length !== 6 || (isNewUser && name.trim().length < 2)}
        className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {busy ? 'Verifying...' : isNewUser ? 'Create account' : 'Log in'}
      </button>
      <button
        type="button"
        onClick={requestOtp}
        disabled={busy}
        className="flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <RotateCw className="size-3.5" aria-hidden="true" />
        Resend code
      </button>
    </form>
  )
}

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
 * Google Sign-In button using @react-oauth/google.
 * Fetches /auth/google/config first — renders nothing until
 * GOOGLE_CLIENT_ID is configured on the server.
 */
export function GoogleSignInButton({ onSuccess, onError, loginWithGoogle }) {
  const [clientId, setClientId] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get('/auth/google/config')
      .then(({ data }) => {
        if (!cancelled && data.data?.enabled) setClientId(data.data.clientId)
      })
      .catch(() => {
        // Google not configured — keep hidden
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!clientId) return null

  return (
    <GoogleOAuthProvider clientId={clientId}>
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
    </GoogleOAuthProvider>
  )
}
