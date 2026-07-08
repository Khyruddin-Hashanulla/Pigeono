import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2 } from 'lucide-react'
import { api, apiErrorMessage } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import { formatPrice } from '../../components/PigeonCard'
import AccountNav from '../../components/AccountNav'

export default function Cart() {
  const { data, loading, error, refetch } = useFetch('/users/cart')
  const [actionError, setActionError] = useState('')
  const navigate = useNavigate()

  if (loading) return <LoadingState label="Loading your cart..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const items = data?.data ?? []
  const total = items.reduce((s, p) => s + (p.price || 0), 0)

  const remove = async (id) => {
    try {
      await api.delete(`/users/cart/${id}`)
      refetch()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    }
  }

  return (
    <>
      <AccountNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold md:text-3xl">
          <ShoppingCart className="size-6 text-primary" aria-hidden="true" />
          Cart
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each bird is unique, so it is checked out one at a time — you pay the seller directly.
        </p>

        {actionError && (
          <p role="alert" className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionError}
          </p>
        )}

        {items.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Your cart is empty"
              message="Add birds to your cart while you browse, then buy them one by one."
              action={
                <Link to="/search" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  Browse pigeons
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <ul className="mt-6 flex flex-col gap-3">
              {items.map((p) => (
                <li key={p._id} className="flex gap-4 rounded-lg border border-border bg-card p-4">
                  <Link to={`/pigeons/${p._id}`} className="shrink-0">
                    <img
                      src={p.media?.photos?.[0] || '/placeholder.svg'}
                      alt={p.title}
                      className="size-20 rounded-md object-cover"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link to={`/pigeons/${p._id}`} className="line-clamp-1 font-semibold hover:underline">
                      {p.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {p.breed} · {p.vendorId?.storeName}
                    </p>
                    <p className="mt-1 text-sm font-bold">{formatPrice(p.price, p.currency)}</p>
                    <div className="mt-auto flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/checkout/${p._id}`)}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                      >
                        Buy now
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p._id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <span className="text-sm text-muted-foreground">
                {items.length} bird{items.length > 1 ? 's' : ''} in cart
              </span>
              <span className="font-bold">{formatPrice(total)}</span>
            </div>
          </>
        )}
      </main>
    </>
  )
}
