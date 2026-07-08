import { useState } from 'react'
import { Gift, Ban } from 'lucide-react'
import { api, apiErrorMessage } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

/* ------------------------------------------------------------------ */
/* Subscriptions                                                       */
/* ------------------------------------------------------------------ */
export function SubscriptionsTab() {
  const { data, loading, error, refetch } = useFetch('/admin/subscriptions')
  const [busyId, setBusyId] = useState(null)
  const [compId, setCompId] = useState(null)
  const [compPlan, setCompPlan] = useState('basic')
  const [actionError, setActionError] = useState(null)

  const vendors = data?.data?.vendors ?? []
  const summary = data?.data?.summary

  async function act(vendorId, action, payload) {
    setBusyId(vendorId)
    setActionError(null)
    try {
      await api.post(`/admin/subscriptions/${vendorId}/${action}`, payload)
      setCompId(null)
      await refetch()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingState label="Loading subscriptions..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const now = new Date()
  const isLive = (s) => s?.plan && s.status === 'active' && new Date(s.currentPeriodEnd) > now

  return (
    <div className="flex flex-col gap-4">
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">MRR</p>
            <p className="mt-1 text-2xl font-bold">{inr(summary.mrr)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Active subs</p>
            <p className="mt-1 text-2xl font-bold">{summary.activeCount}</p>
          </div>
          {['basic', 'pro', 'elite'].map((p) => (
            <div key={p} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs capitalize text-muted-foreground">{p}</p>
              <p className="mt-1 text-2xl font-bold">{summary.byPlan?.[p] ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {actionError && (
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      {vendors.length === 0 ? (
        <EmptyState title="No vendors yet" />
      ) : (
        vendors.map((v) => {
          const sub = v.subscription
          const live = isLive(sub)
          return (
            <article key={v._id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{v.storeName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {v.userId?.name} ({v.userId?.email})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {live ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold capitalize text-primary">
                      {sub.plan} · renews {new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN')}
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {sub?.plan ? `${sub.plan} (expired)` : 'No subscription'}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setCompId(compId === v._id ? null : v._id)}
                  disabled={busyId === v._id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  <Gift className="size-3.5" aria-hidden="true" />
                  Grant free month
                </button>
                {live && (
                  <button
                    type="button"
                    onClick={() => act(v._id, 'expire')}
                    disabled={busyId === v._id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <Ban className="size-3.5" aria-hidden="true" />
                    Force expire
                  </button>
                )}
              </div>
              {compId === v._id && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-muted p-3">
                  <label htmlFor={`plan-${v._id}`} className="text-sm">
                    Plan:
                  </label>
                  <select
                    id={`plan-${v._id}`}
                    value={compPlan}
                    onChange={(e) => setCompPlan(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  >
                    <option value="basic">Basic (₹599)</option>
                    <option value="pro">Pro (₹999)</option>
                    <option value="elite">Elite (₹1,999)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => act(v._id, 'comp', { plan: compPlan })}
                    disabled={busyId === v._id}
                    className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    Grant
                  </button>
                </div>
              )}
            </article>
          )
        })
      )}
    </div>
  )
}


