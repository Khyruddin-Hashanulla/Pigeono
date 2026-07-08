import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MapPin, MessageSquare, ShoppingCart, FileText, Eye, Store, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api, apiErrorMessage } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import Seo from '../components/Seo'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import PigeonCard, { formatPrice } from '../components/PigeonCard'
import VerifiedBadge from '../components/VerifiedBadge'
import Rating from '../components/Rating'

function PedigreePanel({ pedigree }) {
  const rows = [
    { label: 'Ring number', value: pedigree?.ringNumber },
    { label: 'Father lineage', value: pedigree?.fatherLineage },
    { label: 'Mother lineage', value: pedigree?.motherLineage },
  ].filter((r) => r.value)

  if (rows.length === 0 && !pedigree?.pedigreeDocumentUrl) {
    return <EmptyState title="No pedigree information" message="This seller has not provided pedigree details." />
  }

  return (
    <div className="flex flex-col gap-4">
      {pedigree?.isVerified ? (
        <VerifiedBadge large />
      ) : (
        <p className="text-sm text-muted-foreground">
          Pedigree details provided by the seller. Not yet verified by Pigeono admins.
        </p>
      )}
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded-md border border-border bg-card p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{r.label}</dt>
            <dd className="mt-1 text-sm font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
      {pedigree?.pedigreeDocumentUrl && (
        <a
          href={pedigree.pedigreeDocumentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <FileText className="size-4" aria-hidden="true" />
          View pedigree document
        </a>
      )}
    </div>
  )
}

function HealthPanel({ health }) {
  const rows = [
    { label: 'Vaccinated', value: health?.vaccinated ? 'Yes' : 'No' },
    { label: 'Vaccine details', value: health?.vaccineDetails },
    {
      label: 'Last vet check',
      value: health?.lastVetCheck ? new Date(health.lastVetCheck).toLocaleDateString() : null,
    },
  ].filter((r) => r.value)

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-3 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-md border border-border bg-card p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{r.label}</dt>
            <dd className="mt-1 text-sm font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
      {health?.healthCertificate && (
        <a
          href={health.healthCertificate}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <FileText className="size-4" aria-hidden="true" />
          View health certificate
        </a>
      )}
    </div>
  )
}

function RacingRecordTable({ records }) {
  if (!records || records.length === 0) {
    return <EmptyState title="No racing record" message="This bird has no recorded race results." />
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">Racing record</caption>
        <thead className="bg-secondary text-left">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Race</th>
            <th scope="col" className="px-4 py-3 font-semibold">Date</th>
            <th scope="col" className="px-4 py-3 font-semibold">Distance</th>
            <th scope="col" className="px-4 py-3 font-semibold">Position</th>
            <th scope="col" className="px-4 py-3 font-semibold">Speed</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-4 py-3 font-medium">{r.raceName}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {r.date ? new Date(r.date).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3">{r.distance || '—'}</td>
              <td className="px-4 py-3">{r.position != null ? `#${r.position}` : '—'}</td>
              <td className="px-4 py-3">{r.speed || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PigeonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, loading, error, refetch } = useFetch(`/listings/${id}`)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [contacting, setContacting] = useState(false)
  const [contactError, setContactError] = useState(null)
  const wishlistIds = useFetch(user ? '/users/wishlist/ids' : null)
  const [wishBusy, setWishBusy] = useState(false)
  const [inCart, setInCart] = useState(false)
  const wishlisted = (wishlistIds.data?.data || []).includes(id)

  async function toggleWishlist() {
    if (!user) {
      navigate('/login', { state: { from: `/pigeons/${id}` } })
      return
    }
    setWishBusy(true)
    try {
      await api.post(`/users/wishlist/${id}`)
      wishlistIds.refetch()
    } catch {
      // non-critical
    } finally {
      setWishBusy(false)
    }
  }

  async function addToCart() {
    if (!user) {
      navigate('/login', { state: { from: `/pigeons/${id}` } })
      return
    }
    try {
      await api.post(`/users/cart/${id}`)
      setInCart(true)
    } catch (err) {
      setContactError(apiErrorMessage(err))
    }
  }

  function handleBuyNow() {
    if (!user) {
      navigate('/login', { state: { from: `/checkout/${id}` } })
      return
    }
    navigate(`/checkout/${id}`)
  }

  async function handleMessageSeller() {
    if (!user) {
      navigate('/login', { state: { from: `/pigeons/${id}` } })
      return
    }
    setContactError(null)
    setContacting(true)
    try {
      const { data: convoRes } = await api.post('/messages/conversations', { pigeonId: id })
      navigate(`/dashboard/messages/${convoRes.data._id}`)
    } catch (err) {
      setContactError(apiErrorMessage(err))
    } finally {
      setContacting(false)
    }
  }

  if (loading) return <LoadingState label="Loading listing..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const { pigeon, related, reviews } = data.data
  const store = pigeon.vendorId
  const photos = pigeon.media?.photos?.length ? pigeon.media.photos : ['/placeholder.svg']
  const specs = [
    { label: 'Breed', value: pigeon.breed },
    { label: 'Category', value: pigeon.category.replace('-', ' ') },
    { label: 'Age', value: pigeon.age },
    { label: 'Gender', value: pigeon.gender !== 'unknown' ? pigeon.gender : null },
    { label: 'Color', value: pigeon.color },
    { label: 'Available', value: pigeon.stock > 1 ? `${pigeon.stock} birds` : null },
  ].filter((s) => s.value)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Seo
        title={pigeon.title}
        description={`${pigeon.breed} ${pigeon.category.replace('-', ' ')} pigeon for ₹${Number(pigeon.price).toLocaleString('en-IN')} from ${store?.storeName || 'a verified loft'} on Pigeono.`}
        image={photos[0]}
        type="product"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: pigeon.title,
          image: photos,
          description: pigeon.description || undefined,
          brand: store?.storeName,
          offers: {
            '@type': 'Offer',
            price: pigeon.price,
            priceCurrency: 'INR',
            availability:
              pigeon.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
        }}
      />
      <nav className="mb-4 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link to="/" className="hover:text-foreground">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to={`/search?category=${pigeon.category}`} className="capitalize hover:text-foreground">{pigeon.category.replace('-', ' ')}</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="truncate text-foreground">{pigeon.title}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Gallery */}
        <div>
          <div className="overflow-hidden rounded-lg border border-border bg-muted">
            <img src={photos[photoIdx] || "/placeholder.svg"} alt={pigeon.title} className="aspect-[4/3] w-full object-cover" />
          </div>
          {photos.length > 1 && (
            <div className="mt-3 flex gap-2" role="tablist" aria-label="Photos">
              {photos.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={photoIdx === i}
                  aria-label={`Photo ${i + 1}`}
                  onClick={() => setPhotoIdx(i)}
                  className={`overflow-hidden rounded-md border-2 ${photoIdx === i ? 'border-primary' : 'border-transparent'}`}
                >
                  <img src={p || "/placeholder.svg"} alt="" className="size-16 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {pigeon.pedigree?.isVerified && <VerifiedBadge />}
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Eye className="size-3" aria-hidden="true" />
              {pigeon.views} views
            </span>
          </div>
          <h1 className="font-serif text-2xl font-bold leading-tight text-balance md:text-3xl">{pigeon.title}</h1>
          {pigeon.location?.country && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden="true" />
              {[pigeon.location.city, pigeon.location.state, pigeon.location.country].filter(Boolean).join(', ')}
              {pigeon.location.pickupOnly && ' · Pickup only'}
            </p>
          )}
          <p className="text-3xl font-bold">
            {formatPrice(pigeon.price, pigeon.currency)}
            {pigeon.negotiable && (
              <span className="ml-2 align-middle rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Negotiable
              </span>
            )}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={pigeon.status === 'sold'}
              onClick={handleBuyNow}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <ShoppingCart className="size-4" aria-hidden="true" />
              {pigeon.status === 'sold' ? 'Sold' : 'Buy Now'}
            </button>
            <button
              type="button"
              onClick={handleMessageSeller}
              disabled={contacting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-semibold hover:bg-muted disabled:opacity-50"
            >
              <MessageSquare className="size-4" aria-hidden="true" />
              {contacting ? 'Opening chat...' : 'Message Seller'}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleWishlist}
              disabled={wishBusy}
              aria-pressed={wishlisted}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                wishlisted
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <Heart className={`size-4 ${wishlisted ? 'fill-primary' : ''}`} aria-hidden="true" />
              {wishlisted ? 'In wishlist' : 'Add to wishlist'}
            </button>
            {pigeon.status !== 'sold' && (
              <button
                type="button"
                onClick={addToCart}
                disabled={inCart}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
              >
                <ShoppingCart className="size-4" aria-hidden="true" />
                {inCart ? 'Added to cart' : 'Add to cart'}
              </button>
            )}
          </div>
          {contactError && (
            <p className="text-xs text-destructive" role="alert">
              {contactError}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Pay the seller directly via UPI, bank transfer or cash — the seller confirms receipt and hands over the bird. Raise a dispute anytime if something goes wrong.
          </p>

          <dl className="grid grid-cols-2 gap-3">
            {specs.map((s) => (
              <div key={s.label} className="rounded-md border border-border bg-card p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</dt>
                <dd className="mt-1 text-sm font-medium capitalize">{s.value}</dd>
              </div>
            ))}
          </dl>

          {/* Seller card */}
          {store && (
            <Link
              to={`/store/${store.storeSlug}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <Store className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{store.storeName}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Rating value={store.rating} count={store.reviewCount} />
                  <span>{store.totalSales} sales</span>
                </div>
              </div>
              <span className="text-sm font-medium text-primary">Visit store</span>
            </Link>
          )}
        </div>
      </div>

      {/* Description */}
      {pigeon.description && (
        <section className="mt-10" aria-labelledby="desc-heading">
          <h2 id="desc-heading" className="font-serif text-xl font-bold">About this bird</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{pigeon.description}</p>
        </section>
      )}

      {/* Pedigree */}
      <section className="mt-10" aria-labelledby="pedigree-heading">
        <h2 id="pedigree-heading" className="font-serif text-xl font-bold">Pedigree</h2>
        <div className="mt-4">
          <PedigreePanel pedigree={pigeon.pedigree} />
        </div>
      </section>

      {/* Health */}
      <section className="mt-10" aria-labelledby="health-heading">
        <h2 id="health-heading" className="font-serif text-xl font-bold">Health</h2>
        <div className="mt-4">
          <HealthPanel health={pigeon.health} />
        </div>
      </section>

      {/* Racing record */}
      <section className="mt-10" aria-labelledby="record-heading">
        <h2 id="record-heading" className="font-serif text-xl font-bold">Racing record</h2>
        <div className="mt-4">
          <RacingRecordTable records={pigeon.racingRecord} />
        </div>
      </section>

      {/* Reviews */}
      <section className="mt-10" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" className="font-serif text-xl font-bold">Reviews</h2>
        <div className="mt-4">
          {reviews.length === 0 ? (
            <EmptyState title="No reviews yet" message="Reviews appear after buyers complete a purchase." />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {reviews.map((r) => (
                <li key={r._id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{r.buyerId?.name || 'Buyer'}</span>
                    <Rating value={r.rating} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-10" aria-labelledby="related-heading">
          <h2 id="related-heading" className="font-serif text-xl font-bold">Related listings</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <PigeonCard key={p._id} pigeon={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
