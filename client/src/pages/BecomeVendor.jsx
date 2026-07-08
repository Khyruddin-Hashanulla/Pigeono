import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api, apiErrorMessage } from '../lib/api'

export default function BecomeVendor() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [storeName, setStoreName] = useState('')
  const [storeDescription, setStoreDescription] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const existing = user?.vendorProfile

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/auth/become-vendor', { storeName, storeDescription })
      await refresh()
      setSubmitted(true)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (existing || submitted) {
    const status = typeof existing === 'object' ? existing?.status : 'pending'
    const approved = status === 'approved'
    const rejected = status === 'rejected'
    const suspended = status === 'suspended'
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        {approved ? (
          <CheckCircle2 className="size-10 text-accent" aria-hidden="true" />
        ) : rejected || suspended ? (
          <XCircle className="size-10 text-destructive" aria-hidden="true" />
        ) : (
          <Clock className="size-10 text-primary" aria-hidden="true" />
        )}
        <h1 className="mt-4 font-serif text-2xl font-bold">
          {approved
            ? 'Your store is approved'
            : rejected
              ? 'Application not approved'
              : suspended
                ? 'Your store is suspended'
                : 'Application received'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {approved
            ? 'You can now create listings and manage your storefront.'
            : rejected
              ? 'Unfortunately your application was not approved this time.'
              : suspended
                ? 'Your store has been suspended by our admin team. New listings and sales are paused.'
                : 'Your vendor application is pending admin review. You will be able to list birds once approved.'}
        </p>
        {(rejected || suspended) && typeof existing === 'object' && existing?.rejectionReason && (
          <p className="mt-3 rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
            Reason: {existing.rejectionReason}
          </p>
        )}
        {approved && (
          <button
            type="button"
            onClick={() => navigate('/dashboard/vendor')}
            className="mt-6 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Go to vendor dashboard
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <h1 className="font-serif text-3xl font-bold">Open your loft store</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Apply to sell on Pigeono. Applications are reviewed by our admin team, usually within a few days.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="storeName" className="mb-1.5 block text-sm font-medium">
            Store name
          </label>
          <input
            id="storeName"
            type="text"
            required
            minLength={3}
            maxLength={100}
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="e.g. Hilltop Racing Loft"
            className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="storeDescription" className="mb-1.5 block text-sm font-medium">
            About your loft
          </label>
          <textarea
            id="storeDescription"
            rows={5}
            maxLength={2000}
            value={storeDescription}
            onChange={(e) => setStoreDescription(e.target.value)}
            placeholder="Tell buyers about your bloodlines, experience and achievements..."
            className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit application'}
        </button>
      </form>
    </div>
  )
}
