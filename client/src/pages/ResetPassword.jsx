import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, apiErrorMessage } from '../lib/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      navigate('/login', {
        replace: true,
        state: { notice: 'Password reset successfully. Log in with your new password.' },
      })
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center">
        <h1 className="font-serif text-3xl font-bold text-balance">Invalid reset link</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This link is missing its reset token. Please request a new one.
        </p>
        <Link
          to="/forgot-password"
          className="mt-6 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Request new link
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <h1 className="font-serif text-3xl font-bold">Set a new password</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Choose a new password for your account. Must be at least 8 characters with letters and numbers.
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Resetting...' : 'Reset password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  )
}
