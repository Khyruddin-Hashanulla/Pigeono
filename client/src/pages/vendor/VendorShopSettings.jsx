import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, apiErrorMessage } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { LoadingState, ErrorState } from '../../components/States'
import VendorNav from '../../components/VendorNav'

/**
 * Direct-payment details: buyers pay the vendor directly (UPI / bank),
 * so these details are shown to buyers at checkout and on their orders.
 */
function PaymentDetailsForm({ store, onSaved }) {
  const [form, setForm] = useState({
    upiId: '',
    phoneNumber: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const p = store?.payoutDetails
    if (p) {
      setForm({
        upiId: p.upiId || '',
        phoneNumber: p.phoneNumber || '',
        bankName: p.bankName || '',
        accountNumber: p.accountNumber || '',
        ifscCode: p.ifscCode || '',
        accountHolderName: p.accountHolderName || '',
      })
    }
  }, [store])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await api.patch('/vendor/payment-details', form)
      setSuccess('Payment details saved. Buyers will now see these on their orders.')
      onSaved()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const input = (id, key, label, placeholder, props = {}) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        {...props}
      />
    </div>
  )

  const hasAny = form.upiId || form.phoneNumber || (form.accountNumber && form.ifscCode)

  return (
    <div className="mt-10">
      <h2 className="font-serif text-xl font-bold">Payment details</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Buyers pay you directly — add at least one payment method so buyers know where to send
        the money. These details are shown to buyers after they place an order.
      </p>
      {!hasAny && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          No payment method configured yet — buyers can&apos;t pay you until you add one.
        </p>
      )}

      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <fieldset className="rounded-lg border border-border bg-card p-4">
          <legend className="px-1 text-sm font-semibold">UPI</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {input('pd-upi', 'upiId', 'UPI ID', 'yourname@okhdfc')}
            {input('pd-phone', 'phoneNumber', 'Phone (UPI / PhonePe)', '98XXXXXXXX', { inputMode: 'numeric', maxLength: 10 })}
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-border bg-card p-4">
          <legend className="px-1 text-sm font-semibold">Bank transfer (IMPS / NEFT)</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {input('pd-holder', 'accountHolderName', 'Account holder name', 'As per bank records')}
            {input('pd-bank', 'bankName', 'Bank name', 'e.g. HDFC Bank')}
            {input('pd-account', 'accountNumber', 'Account number', '9-18 digits', { inputMode: 'numeric', maxLength: 18 })}
            {input('pd-ifsc', 'ifscCode', 'IFSC code', 'e.g. HDFC0000123', { maxLength: 11, style: { textTransform: 'uppercase' } })}
          </div>
        </fieldset>

        {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {success && <p role="status" className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">{success}</p>}

        <div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Saving...' : 'Save payment details'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function VendorShopSettings() {
  const profile = useFetch('/vendor/profile')
  const [form, setForm] = useState({ storeName: '', storeDescription: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const store = profile.data?.data

  useEffect(() => {
    if (store) {
      setForm({
        storeName: store.storeName || '',
        storeDescription: store.storeDescription || '',
      })
    }
  }, [store])

  if (profile.loading) return <LoadingState label="Loading shop settings..." />
  if (profile.error) return <ErrorState message={profile.error} onRetry={profile.refetch} />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await api.patch('/vendor/profile', form)
      setSuccess('Shop settings saved.')
      profile.refetch()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <VendorNav />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-serif text-2xl font-bold">Shop settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How your store appears to buyers.{' '}
          {store?.status === 'approved' && (
            <Link to={`/store/${store.storeSlug}`} className="text-primary underline-offset-2 hover:underline">
              View your storefront
            </Link>
          )}
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="shop-name" className="mb-1 block text-sm font-medium">Store name</label>
            <input
              id="shop-name"
              type="text"
              required
              minLength={3}
              maxLength={100}
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="shop-desc" className="mb-1 block text-sm font-medium">Store description</label>
            <textarea
              id="shop-desc"
              rows={5}
              maxLength={2000}
              value={form.storeDescription}
              onChange={(e) => setForm({ ...form, storeDescription: e.target.value })}
              placeholder="Tell buyers about your loft, bloodlines, and experience..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {success && <p role="status" className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">{success}</p>}

          <div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </form>

        <PaymentDetailsForm store={store} onSaved={profile.refetch} />

        <div className="mt-10 rounded-lg border border-border bg-secondary p-4 text-sm text-secondary-foreground">
          <p className="font-semibold">Store status</p>
          <p className="mt-1 capitalize">
            {store?.status?.replace('_', ' ')}
            {store?.status !== 'approved' && ' — every vendor requires admin approval before selling.'}
          </p>
        </div>
      </div>
    </>
  )
}
