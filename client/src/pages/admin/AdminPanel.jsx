import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  FileText,
  Store,
  CreditCard,
  Newspaper,
  Megaphone,
  Users,
  BarChart3,
} from 'lucide-react'
import { api, apiErrorMessage } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import { SubscriptionsTab } from './AdminMonetization'
import { PostsTab, AdsTab } from './AdminContent'
import { CustomersTab, ReportsTab } from './AdminPeople'

const money = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`

function StatCard({ label, value, tone = 'default' }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === 'warn' && value > 0 ? 'text-destructive' : ''}`}>
        {value}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Approval queue                                                      */
/* ------------------------------------------------------------------ */
function ApprovalQueue({ onChanged }) {
  const { data, loading, error, refetch } = useFetch('/admin/listings?status=pending_approval')
  const [busyId, setBusyId] = useState(null)
  const [verifyChecks, setVerifyChecks] = useState({})
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState(null)

  const listings = data?.data ?? []

  async function approve(id) {
    setBusyId(id)
    setActionError(null)
    try {
      await api.post(`/admin/listings/${id}/approve`, { verifyPedigree: !!verifyChecks[id] })
      await refetch()
      onChanged()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  async function reject(id) {
    if (rejectReason.trim().length < 3) return
    setBusyId(id)
    setActionError(null)
    try {
      await api.post(`/admin/listings/${id}/reject`, { reason: rejectReason.trim() })
      setRejectingId(null)
      setRejectReason('')
      await refetch()
      onChanged()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingState label="Loading approval queue..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (listings.length === 0)
    return <EmptyState title="Queue is clear" message="No listings are waiting for approval." />

  return (
    <div className="flex flex-col gap-4">
      {actionError && (
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}
      {listings.map((p) => (
        <article key={p._id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <img
              src={p.media?.photos?.[0] || '/placeholder.svg?height=96&width=96'}
              alt={p.title}
              className="size-24 shrink-0 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{p.title}</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{p.category}</span>
                <span className="text-sm font-semibold text-primary">{money(p.price)}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {p.breed} · {p.gender} · {p.age || 'age n/a'} · by{' '}
                <Link to={`/store/${p.vendorId?.storeSlug}`} className="underline hover:text-foreground">
                  {p.vendorId?.storeName}
                </Link>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">
                  Ring: <span className="font-medium text-foreground">{p.pedigree?.ringNumber || '—'}</span>
                </span>
                <span className="text-muted-foreground">
                  Lineage:{' '}
                  <span className="font-medium text-foreground">
                    {p.pedigree?.fatherLineage || '—'} × {p.pedigree?.motherLineage || '—'}
                  </span>
                </span>
                {p.pedigree?.pedigreeDocumentUrl ? (
                  <a
                    href={p.pedigree.pedigreeDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline"
                  >
                    <FileText className="size-3.5" aria-hidden="true" />
                    Pedigree document
                  </a>
                ) : (
                  <span className="text-muted-foreground">No pedigree document</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!verifyChecks[p._id]}
                onChange={(e) => setVerifyChecks((v) => ({ ...v, [p._id]: e.target.checked }))}
                className="size-4 accent-primary"
              />
              <BadgeCheck className="size-4 text-primary" aria-hidden="true" />
              Mark pedigree as verified (I reviewed the document / ring number)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => approve(p._id)}
                disabled={busyId === p._id}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejectingId(rejectingId === p._id ? null : p._id)
                  setRejectReason('')
                }}
                disabled={busyId === p._id}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                <XCircle className="size-4" aria-hidden="true" />
                Reject
              </button>
            </div>
          </div>

          {rejectingId === p._id && (
            <div className="mt-3 flex flex-col gap-2 rounded-md bg-muted p-3 sm:flex-row">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (shown to the vendor)"
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => reject(p._id)}
                disabled={busyId === p._id || rejectReason.trim().length < 3}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                Confirm rejection
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pedigree verification (live listings)                               */
/* ------------------------------------------------------------------ */
function PedigreeQueue({ onChanged }) {
  const { data, loading, error, refetch } = useFetch('/admin/listings?status=active&limit=50')
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)

  const listings = (data?.data ?? []).filter((p) => p.pedigree)

  async function setVerified(id, verified) {
    setBusyId(id)
    setActionError(null)
    try {
      await api.post(`/admin/listings/${id}/verify-pedigree`, { verified })
      await refetch()
      onChanged()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingState label="Loading live listings..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (listings.length === 0) return <EmptyState title="No live listings" />

  return (
    <div className="flex flex-col gap-3">
      {actionError && (
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}
      {listings.map((p) => (
        <div
          key={p._id}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center"
        >
          <img
            src={p.media?.photos?.[0] || '/placeholder.svg?height=56&width=56'}
            alt={p.title}
            className="size-14 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <Link to={`/pigeons/${p._id}`} className="font-medium hover:underline">
              {p.title}
            </Link>
            <p className="text-sm text-muted-foreground">
              Ring {p.pedigree?.ringNumber || '—'} · {p.vendorId?.storeName}
              {p.pedigree?.pedigreeDocumentUrl && (
                <>
                  {' · '}
                  <a
                    href={p.pedigree.pedigreeDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    document
                  </a>
                </>
              )}
            </p>
          </div>
          {p.pedigree?.isVerified ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                Verified
              </span>
              <button
                type="button"
                onClick={() => setVerified(p._id, false)}
                disabled={busyId === p._id}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                Revoke
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setVerified(p._id, true)}
              disabled={busyId === p._id}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              Verify pedigree
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Disputes                                                            */
/* ------------------------------------------------------------------ */
function DisputeQueue({ onChanged }) {
  const { data, loading, error, refetch } = useFetch('/admin/disputes')
  const [busyId, setBusyId] = useState(null)
  const [resolvingId, setResolvingId] = useState(null)
  const [resolution, setResolution] = useState('favor_vendor')
  const [note, setNote] = useState('')
  const [actionError, setActionError] = useState(null)

  const orders = data?.data ?? []

  async function resolve(id) {
    setBusyId(id)
    setActionError(null)
    try {
      await api.post(`/admin/disputes/${id}/resolve`, { resolution, note: note.trim() })
      setResolvingId(null)
      setNote('')
      await refetch()
      onChanged()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingState label="Loading disputes..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (orders.length === 0)
    return <EmptyState title="No open disputes" message="All orders are running smoothly." />

  return (
    <div className="flex flex-col gap-4">
      {actionError && (
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}
      {orders.map((o) => (
        <article key={o._id} className="rounded-lg border border-destructive/40 bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{o.itemSnapshot?.title || 'Listing'}</h3>
              <p className="text-sm text-muted-foreground">
                {money(o.totalAmount)} · Buyer {o.buyerId?.name} ({o.buyerId?.email}) · Seller{' '}
                {o.vendorId?.storeName}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Payment: {o.paymentStatus === 'confirmed' ? 'confirmed by seller' : o.paymentStatus === 'paid_by_buyer' ? 'buyer says sent, unconfirmed' : 'not paid'}
                {o.vendorPaymentMethod ? ` via ${o.vendorPaymentMethod.replace('_', ' ')}` : ''}
              </p>
            </div>
            <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
              Disputed {o.dispute?.openedAt ? new Date(o.dispute.openedAt).toLocaleDateString() : ''}
            </span>
          </div>
          <blockquote className="mt-3 rounded-md bg-muted p-3 text-sm">
            <span className="font-medium">Buyer&apos;s reason: </span>
            {o.dispute?.reason || 'No reason provided.'}
          </blockquote>

          {resolvingId !== o._id ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setResolvingId(o._id)
                  setResolution('favor_vendor')
                  setNote('')
                }}
                disabled={busyId === o._id}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Resolve dispute…
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                resolve(o._id)
              }}
              className="mt-4 flex flex-col gap-3 rounded-md bg-muted p-3"
            >
              <p className="text-xs leading-relaxed text-muted-foreground">
                Payment happened directly between buyer and seller, so ruling for the buyer cancels
                the order and puts the bird back on sale — the seller must return any money received.
                Ruling for the seller marks the order completed.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm ${resolution === 'favor_vendor' ? 'border-primary bg-background' : 'border-border'}`}>
                  <input
                    type="radio"
                    name={`res-${o._id}`}
                    checked={resolution === 'favor_vendor'}
                    onChange={() => setResolution('favor_vendor')}
                    className="accent-primary"
                  />
                  Rule for seller (complete order)
                </label>
                <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm ${resolution === 'favor_buyer' ? 'border-primary bg-background' : 'border-border'}`}>
                  <input
                    type="radio"
                    name={`res-${o._id}`}
                    checked={resolution === 'favor_buyer'}
                    onChange={() => setResolution('favor_buyer')}
                    className="accent-primary"
                  />
                  Rule for buyer (cancel order)
                </label>
              </div>
              <div>
                <label htmlFor={`note-${o._id}`} className="mb-1 block text-sm font-medium">
                  Resolution note (sent to both parties) *
                </label>
                <textarea
                  id={`note-${o._id}`}
                  required
                  minLength={3}
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Explain the decision and any next steps (e.g. seller must refund the buyer)"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busyId === o._id || note.trim().length < 3}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {busyId === o._id ? 'Resolving...' : 'Confirm resolution'}
                </button>
                <button
                  type="button"
                  disabled={busyId === o._id}
                  onClick={() => setResolvingId(null)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </article>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Vendor applications & stores                                        */
/* ------------------------------------------------------------------ */
function VendorQueue({ onChanged }) {
  const [statusFilter, setStatusFilter] = useState('pending')
  const { data, loading, error, refetch } = useFetch(`/admin/vendors?status=${statusFilter}&limit=50`)
  const [busyId, setBusyId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState(null)

  const vendors = data?.data ?? []

  async function act(id, action, payload) {
    setBusyId(id)
    setActionError(null)
    try {
      await api.post(`/admin/vendors/${id}/${action}`, payload)
      setRejectingId(null)
      setRejectReason('')
      await refetch()
      onChanged()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2" role="group" aria-label="Filter vendors by status">
        {['pending', 'approved', 'rejected', 'suspended'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            aria-pressed={statusFilter === s}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'border border-border hover:bg-muted'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {actionError && (
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      {loading ? (
        <LoadingState label="Loading vendors..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : vendors.length === 0 ? (
        <EmptyState title={`No ${statusFilter} vendors`} message="Nothing to review here right now." />
      ) : (
        vendors.map((v) => (
          <article key={v._id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold">
                  <Store className="mr-1.5 inline size-4 text-primary" aria-hidden="true" />
                  {v.storeName}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {v.userId?.name} ({v.userId?.email}) · applied{' '}
                  {new Date(v.createdAt).toLocaleDateString()}
                </p>
                {v.storeDescription && (
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                    {v.storeDescription}
                  </p>
                )}
                {v.status === 'rejected' && v.rejectionReason && (
                  <p className="mt-2 text-sm text-destructive">Rejected: {v.rejectionReason}</p>
                )}
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                {v.status}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
              {(v.status === 'pending' || v.status === 'suspended' || v.status === 'rejected') && (
                <button
                  type="button"
                  onClick={() => act(v._id, 'approve')}
                  disabled={busyId === v._id}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  {v.status === 'pending' ? 'Approve store' : 'Reinstate store'}
                </button>
              )}
              {v.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => {
                    setRejectingId(rejectingId === v._id ? null : v._id)
                    setRejectReason('')
                  }}
                  disabled={busyId === v._id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  <XCircle className="size-4" aria-hidden="true" />
                  Reject
                </button>
              )}
              {v.status === 'approved' && (
                <button
                  type="button"
                  onClick={() => act(v._id, 'suspend')}
                  disabled={busyId === v._id}
                  className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  Suspend store
                </button>
              )}
            </div>

            {rejectingId === v._id && (
              <div className="mt-3 flex flex-col gap-2 rounded-md bg-muted p-3 sm:flex-row">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (shown to the applicant)"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => act(v._id, 'reject', { reason: rejectReason.trim() })}
                  disabled={busyId === v._id || rejectReason.trim().length < 3}
                  className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                >
                  Confirm rejection
                </button>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Panel shell                                                         */
/* ------------------------------------------------------------------ */
const TABS = [
  { key: 'approvals', label: 'Approvals', icon: ClipboardList },
  { key: 'vendors', label: 'Vendors', icon: Store },
  { key: 'pedigrees', label: 'Pedigrees', icon: BadgeCheck },
  { key: 'disputes', label: 'Disputes', icon: AlertTriangle },
  { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { key: 'posts', label: 'Blog', icon: Newspaper },
  { key: 'ads', label: 'Ads', icon: Megaphone },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
]

export default function AdminPanel() {
  const [tab, setTab] = useState('approvals')
  const { data: statsData, refetch: refetchStats } = useFetch('/admin/stats')
  const stats = statsData?.data

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="flex items-center gap-3">
        <ShieldCheck className="size-7 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold text-balance">Admin panel</h1>
          <p className="text-sm text-muted-foreground">
            Review listings, verify pedigrees, and resolve order disputes.
          </p>
        </div>
      </header>

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Pending listings" value={stats.pendingListings} tone="warn" />
          <StatCard label="Vendor applications" value={stats.pendingVendors ?? 0} tone="warn" />
          <StatCard label="Open disputes" value={stats.disputedOrders} tone="warn" />
          <StatCard label="Active orders" value={stats.activeOrders} />
          <StatCard label="Active listings" value={stats.activeListings} />
          <StatCard label="Users" value={stats.totalUsers} />
        </div>
      )}

      <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-border" aria-label="Admin sections">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key ? 'page' : undefined}
            className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium ${
              tab === key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      <section className="mt-6">
        {tab === 'approvals' && <ApprovalQueue onChanged={refetchStats} />}
        {tab === 'vendors' && <VendorQueue onChanged={refetchStats} />}
        {tab === 'pedigrees' && <PedigreeQueue onChanged={refetchStats} />}
        {tab === 'disputes' && <DisputeQueue onChanged={refetchStats} />}
        {tab === 'subscriptions' && <SubscriptionsTab />}
        {tab === 'posts' && <PostsTab />}
        {tab === 'ads' && <AdsTab />}
        {tab === 'customers' && <CustomersTab />}
        {tab === 'reports' && <ReportsTab />}
      </section>
    </div>
  )
}
