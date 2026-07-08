import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { api, apiErrorMessage } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import { formatPrice } from '../../components/PigeonCard'
import AccountNav from '../../components/AccountNav'

function WishlistRow({ pigeon, onChanged, onError }) {
  const [busy, setBusy] = useState(false)
  const sold = pigeon.status === 'sold'

  const remove = async () => {
    setBusy(true)
    try {
      await api.post(`/users/wishlist/${pigeon._id}`) // toggle off
      onChanged()
    } catch (err) {
      onError(apiErrorMessage(err))
      setBusy(false)
    }
  }

  const addToCart = async () => {
    setBusy(true)
    try {
      await api.post(`/users/cart/${pigeon._id}`)
      onError('')
      setBusy(false)
    } catch (err) {
      onError(apiErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <li className="flex gap-4 rounded-lg border border-border bg-card p-4">
      <Link to={`/pigeons/${pigeon._id}`} className="shrink-0">
        <img
          src={pigeon.media?.photos?.[0] || '/placeholder.svg'}
          alt={pigeon.title}
          className="size-20 rounded-md object-cover"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link to={`/pigeons/${pigeon._id}`} className="line-clamp-1 font-semibold hover:underline">
          {pigeon.title}
        </Link>
        <p className="text-xs text-muted-foreground">
          {pigeon.breed} · {pigeon.vendorId?.storeName}
        </p>
        <p className="mt-1 text-sm font-bold">
          {formatPrice(pigeon.price, pigeon.currency)}
          {sold && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">Sold</span>}
        </p>
        <div className="mt-auto flex gap-2 pt-2">
          {!sold && (
            <button
              type="button"
              disabled={busy}
              onClick={addToCart}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <ShoppingCart className="size-3.5" aria-hidden="true" />
              Add to cart
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Remove
          </button>
        </div>
      </div>
    </li>
  )
}

export default function Wishlist() {
  const { data, loading, error, refetch } = useFetch('/users/wishlist')
  const [actionError, setActionError] = useState('')

  if (loading) return <LoadingState label="Loading your wishlist..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const items = data?.data ?? []

  return (
    <>
      <AccountNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold md:text-3xl">
          <Heart className="size-6 text-primary" aria-hidden="true" />
          Wishlist
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Birds you have saved for later.</p>

        {actionError && (
          <p role="alert" className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionError}
          </p>
        )}

        {items.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Your wishlist is empty"
              message="Tap the heart on any listing to save it here."
              action={
                <Link to="/search" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  Browse pigeons
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {items.map((p) => (
              <WishlistRow key={p._id} pigeon={p} onChanged={refetch} onError={setActionError} />
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
