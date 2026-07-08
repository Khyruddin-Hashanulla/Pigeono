import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye, MessageSquare, Store } from 'lucide-react'
import { useFetch } from '../../lib/useFetch'
import { api, apiErrorMessage } from '../../lib/api'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import Pagination from '../../components/Pagination'
import { formatPrice } from '../../components/PigeonCard'
import VendorNav from '../../components/VendorNav'

const STATUS_STYLES = {
  active: 'bg-accent text-accent-foreground',
  pending_approval: 'bg-primary/15 text-primary',
  draft: 'bg-muted text-muted-foreground',
  sold: 'bg-foreground text-background',
  rejected: 'bg-destructive/15 text-destructive',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status] || ''}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default function VendorListings() {
  const [page, setPage] = useState(1)
  const [actionError, setActionError] = useState('')
  const profile = useFetch('/vendor/profile')
  const usage = useFetch('/vendor/usage')
  const listings = useFetch(`/vendor/listings?page=${page}&limit=10`, [page])

  const store = profile.data?.data
  const items = listings.data?.data || []
  const totalPages = listings.data?.totalPages ?? 1
  const u = usage.data?.data

  const onDelete = async (id, title) => {
    if (!window.confirm(`Delete listing "${title}"? This cannot be undone.`)) return
    setActionError('')
    try {
      await api.delete(`/vendor/listings/${id}`)
      listings.refetch()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    }
  }

  if (profile.loading) return <LoadingState label="Loading your store..." />
  if (profile.error) return <ErrorState message={profile.error} onRetry={profile.refetch} />

  return (
    <>
    <VendorNav />
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold">Listings manager</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Store className="size-4" aria-hidden="true" />
            {store?.storeName}
            <StatusBadge status={store?.status || 'pending'} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          {store?.status === 'approved' && (
            <Link
              to={`/store/${store.storeSlug}`}
              className="rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
            >
              View storefront
            </Link>
          )}
          <Link
            to="/dashboard/vendor/listings/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden="true" />
            New listing
          </Link>
        </div>
      </div>

      {store?.status !== 'approved' && (
        <p className="mt-4 rounded-md border border-border bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          Your store is awaiting admin approval. You can prepare listings once it&apos;s approved.
        </p>
      )}

      {/* Subscription status banner */}
      {u && !u.isActive && (
        <p className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          You need an active subscription to create listings.{' '}
          <Link to="/dashboard/vendor/subscription" className="font-semibold underline underline-offset-2">
            Choose a plan
          </Link>
        </p>
      )}
      {u && u.isActive && u.limit != null && (
        <p
          className={`mt-4 rounded-md px-4 py-3 text-sm ${
            u.used >= u.limit
              ? 'bg-destructive/10 text-destructive'
              : 'border border-border bg-secondary text-secondary-foreground'
          }`}
        >
          <span className="font-semibold capitalize">{u.plan} plan:</span> {u.used} of {u.limit}{' '}
          listings used.
          {u.used >= u.limit && (
            <>
              {' '}
              <Link to="/dashboard/vendor/subscription" className="font-semibold underline underline-offset-2">
                Upgrade for more
              </Link>
            </>
          )}
        </p>
      )}

      {actionError && (
        <p role="alert" className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <div className="mt-6">
        {listings.loading ? (
          <LoadingState label="Loading listings..." />
        ) : listings.error ? (
          <ErrorState message={listings.error} onRetry={listings.refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No listings yet"
            message="Create your first listing. It will go to the admin approval queue before going live."
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Your listings</caption>
                <thead className="bg-secondary text-left">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Listing</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Stats</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p._id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.media?.photos?.[0] || '/placeholder.svg'}
                            alt=""
                            className="size-10 shrink-0 rounded-md object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.breed} · {p.category.replace('-', ' ')}
                              {p.status === 'rejected' && p.rejectionReason && ` — Rejected: ${p.rejectionReason}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatPrice(p.price)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        <span className="mr-3 inline-flex items-center gap-1">
                          <Eye className="size-3.5" aria-hidden="true" />
                          {p.views}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="size-3.5" aria-hidden="true" />
                          {p.inquiries}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/dashboard/vendor/listings/${p._id}/edit`}
                            className="rounded-md p-2 hover:bg-muted"
                            aria-label={`Edit ${p.title}`}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => onDelete(p._id, p.title)}
                            className="rounded-md p-2 text-destructive hover:bg-destructive/10"
                            aria-label={`Delete ${p.title}`}
                            disabled={p.status === 'sold'}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPage={setPage} />
          </>
        )}
      </div>
    </div>
    </>
  )
}
