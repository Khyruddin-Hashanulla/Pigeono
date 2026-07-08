import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [devResetUrl, setDevResetUrl] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e?.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setDevResetUrl(data.data?.devResetUrl || '')
      setSent(true)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center">
        <MailCheck className="size-12 text-primary" aria-hidden="true" />
        <h1 className="mt-4 font-serif text-3xl font-bold text-balance">Check your email</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{email}</span>, we&apos;ve sent a
          password reset link. The link expires in 30 minutes.
        </p>
        {devResetUrl && (
          <div className="mt-6 w-full rounded-lg border border-border bg-card p-4 text-left text-xs">
            <p className="font-semibold text-foreground">Dev mode (no SMTP configured)</p>
            <p className="mt-1 text-muted-foreground">Use this link to reset your password:</p>
            <Link to={devResetUrl.replace(window.location.origin, '')} className="mt-2 block break-all font-medium text-primary hover:underline">
              {devResetUrl}
            </Link>
          </div>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-6 text-sm font-medium text-primary hover:underline disabled:opacity-50"
        >
          {submitting ? 'Resending...' : 'Resend email'}
        </button>
        <Link to="/login" className="mt-3 text-sm font-medium text-muted-foreground hover:text-foreground">
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <h1 className="font-serif text-3xl font-bold">Forgot password</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Enter your account email and we&apos;ll send you a link to reset your password.
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
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
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  )
}
