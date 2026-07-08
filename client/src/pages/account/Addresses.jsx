import { useState } from 'react'
import { MapPin, Plus, Trash2 } from 'lucide-react'
import { api, apiErrorMessage } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import AccountNav from '../../components/AccountNav'
import { INDIAN_STATES } from '../../lib/india'

const EMPTY = { label: 'Home', fullName: '', phone: '', line1: '', city: '', state: '', pincode: '', landmark: '' }

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

function AddressForm({ onSaved, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/users/addresses', form)
      onSaved()
    } catch (err) {
      setError(apiErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="addr-label" className="mb-1.5 block text-sm font-medium">Label</label>
          <input id="addr-label" maxLength={40} value={form.label} onChange={set('label')} className={inputCls} placeholder="Home / Loft / Office" />
        </div>
        <div>
          <label htmlFor="addr-name" className="mb-1.5 block text-sm font-medium">Full name *</label>
          <input id="addr-name" required value={form.fullName} onChange={set('fullName')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="addr-phone" className="mb-1.5 block text-sm font-medium">Mobile number *</label>
          <input id="addr-phone" required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={form.phone} onChange={set('phone')} className={inputCls} placeholder="10-digit mobile" />
        </div>
        <div>
          <label htmlFor="addr-line1" className="mb-1.5 block text-sm font-medium">Address *</label>
          <input id="addr-line1" required value={form.line1} onChange={set('line1')} className={inputCls} placeholder="House no, street, area" />
        </div>
        <div>
          <label htmlFor="addr-city" className="mb-1.5 block text-sm font-medium">City *</label>
          <input id="addr-city" required value={form.city} onChange={set('city')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="addr-state" className="mb-1.5 block text-sm font-medium">State *</label>
          <select id="addr-state" required value={form.state} onChange={set('state')} className={inputCls}>
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="addr-pincode" className="mb-1.5 block text-sm font-medium">Pincode *</label>
          <input id="addr-pincode" required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={form.pincode} onChange={set('pincode')} className={inputCls} placeholder="6-digit pincode" />
        </div>
        <div>
          <label htmlFor="addr-landmark" className="mb-1.5 block text-sm font-medium">Landmark</label>
          <input id="addr-landmark" maxLength={200} value={form.landmark} onChange={set('landmark')} className={inputCls} />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {busy ? 'Saving...' : 'Save address'}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function Addresses() {
  const { data, loading, error, refetch } = useFetch('/users/addresses')
  const [adding, setAdding] = useState(false)
  const [actionError, setActionError] = useState('')

  if (loading) return <LoadingState label="Loading your addresses..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const items = data?.data ?? []

  const remove = async (id) => {
    try {
      await api.delete(`/users/addresses/${id}`)
      refetch()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    }
  }

  return (
    <>
      <AccountNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-serif text-2xl font-bold md:text-3xl">
              <MapPin className="size-6 text-primary" aria-hidden="true" />
              Saved addresses
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Delivery addresses for your orders (max 5).</p>
          </div>
          {!adding && items.length < 5 && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add address
            </button>
          )}
        </div>

        {actionError && (
          <p role="alert" className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionError}
          </p>
        )}

        {adding && (
          <AddressForm
            onSaved={() => {
              setAdding(false)
              refetch()
            }}
            onCancel={() => setAdding(false)}
          />
        )}

        {items.length === 0 && !adding ? (
          <div className="mt-8">
            <EmptyState title="No saved addresses" message="Add an address to speed up checkout." />
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {items.map((a) => (
              <li key={a._id} className="flex flex-col rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                    {a.label || 'Address'}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(a._id)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label={`Delete ${a.label || 'address'}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-2 text-sm font-semibold">{a.fullName}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {a.line1}
                  {a.landmark ? `, ${a.landmark}` : ''}
                  <br />
                  {a.city}, {a.state} — {a.pincode}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Mobile: {a.phone}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
