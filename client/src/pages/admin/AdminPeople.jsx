import { useState } from 'react'
import { Ban, CheckCircle2, IndianRupee, Search } from 'lucide-react'
import { api, apiErrorMessage } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */
export function CustomersTab() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const { data, loading, error, refetch } = useFetch(
    `/admin/customers?q=${encodeURIComponent(search)}&limit=50`,
    [search]
  )
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)

  const users = data?.data ?? []

  async function toggleSuspend(u) {
    setBusyId(u._id)
    setActionError(null)
    try {
      await api.post(`/admin/customers/${u._id}/suspend`, { suspended: !u.isSuspended })
      await refetch()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(query.trim())
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm"
            aria-label="Search customers"
          />
        </div>
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Search
        </button>
      </form>

      {actionError && (
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      {loading ? (
        <LoadingState label="Loading customers..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : users.length === 0 ? (
        <EmptyState title="No customers found" />
      ) : (
        users.map((u) => (
          <div key={u._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
            <div className="min-w-0">
              <h3 className="font-semibold">
                {u.name}
                {u.isSuspended && (
                  <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                    Suspended
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {u.email} · roles: {(u.roles || []).join(', ')} · joined{' '}
                {new Date(u.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>
            {!(u.roles || []).includes('admin') && (
              <button
                type="button"
                onClick={() => toggleSuspend(u)}
                disabled={busyId === u._id}
                className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                  u.isSuspended
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'border border-destructive text-destructive hover:bg-destructive/10'
                }`}
              >
                {u.isSuspended ? (
                  <>
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Reinstate
                  </>
                ) : (
                  <>
                    <Ban className="size-4" aria-hidden="true" />
                    Suspend
                  </>
                )}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */
export function ReportsTab() {
  const { data, loading, error, refetch } = useFetch('/admin/reports')
  const r = data?.data

  if (loading) return <LoadingState label="Building report..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!r) return null

  const cards = [
    { label: 'Gross merchandise value', value: inr(r.gmv) },
    { label: 'Subscription revenue (MRR)', value: inr(r.subscriptionMRR) },
    { label: 'Paid orders', value: r.paidOrders },
    { label: 'Completed orders', value: r.completedOrders },
    { label: 'Active listings', value: r.activeListings },
    { label: 'Active vendors', value: r.activeVendors },
    { label: 'Registered users', value: r.totalUsers },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {r.topVendors?.length > 0 && (
        <section aria-labelledby="top-vendors-heading">
          <h3 id="top-vendors-heading" className="font-semibold">
            <IndianRupee className="mr-1 inline size-4 text-primary" aria-hidden="true" />
            Top vendors by completed sales
          </h3>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Store</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Sales</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {r.topVendors.map((v) => (
                  <tr key={v.vendorId} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{v.storeName}</td>
                    <td className="px-4 py-2 text-right">{v.sales}</td>
                    <td className="px-4 py-2 text-right">{inr(v.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
