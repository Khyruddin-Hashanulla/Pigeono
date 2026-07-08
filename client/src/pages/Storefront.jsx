import { useParams, useSearchParams } from 'react-router-dom'
import { Store, MapPinned, CalendarDays } from 'lucide-react'
import { useFetch } from '../lib/useFetch'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import PigeonCard from '../components/PigeonCard'
import Pagination from '../components/Pagination'
import Rating from '../components/Rating'
import Seo from '../components/Seo'

export default function Storefront() {
  const { storeSlug } = useParams()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') || 1)

  const { data, loading, error, refetch } = useFetch(`/stores/${storeSlug}?page=${page}&limit=12`)

  if (loading) return <LoadingState label="Loading store..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const { store, reviews } = data.data
  const listings = data.data.data || []
  const totalPages = data.data.totalPages ?? 1

  return (
    <div>
      <Seo
        title={`${store.storeName} — Verified Pigeon Loft`}
        description={
          store.storeDescription?.slice(0, 155) ||
          `Browse pigeons for sale from ${store.storeName}, a verified loft on Pigeono with ${store.totalSales} sales.`
        }
      />
      {/* Banner */}
      <section className="bg-foreground text-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:flex-row md:items-center">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-8" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl font-bold md:text-3xl">{store.storeName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm opacity-90">
              <Rating value={store.rating} count={store.reviewCount} />
              <span>{store.totalSales} sales</span>
              {store.userId?.createdAt && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  Member since {new Date(store.userId.createdAt).getFullYear()}
                </span>
              )}
            </div>
            {store.storeDescription && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed opacity-80">{store.storeDescription}</p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Listings */}
        <section aria-labelledby="store-listings-heading">
          <h2 id="store-listings-heading" className="font-serif text-xl font-bold">
            Available birds
          </h2>
          {listings.length === 0 ? (
            <EmptyState title="No active listings" message="This store has no birds for sale right now." />
          ) : (
            <>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {listings.map((p) => (
                  <PigeonCard key={p._id} pigeon={p} />
                ))}
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPage={(n) => {
                  const next = new URLSearchParams(params)
                  next.set('page', String(n))
                  setParams(next)
                }}
              />
            </>
          )}
        </section>

        {/* Reviews */}
        <section className="mt-12" aria-labelledby="store-reviews-heading">
          <h2 id="store-reviews-heading" className="font-serif text-xl font-bold">
            Buyer reviews
          </h2>
          {reviews.length === 0 ? (
            <EmptyState title="No reviews yet" message="Reviews appear after buyers complete a purchase." />
          ) : (
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {reviews.map((r) => (
                <li key={r._id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{r.buyerId?.name || 'Buyer'}</span>
                    <Rating value={r.rating} />
                  </div>
                  {r.pigeonId?.title && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPinned className="size-3" aria-hidden="true" />
                      Purchased: {r.pigeonId.title}
                    </p>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
