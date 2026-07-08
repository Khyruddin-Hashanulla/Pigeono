import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import VerifiedBadge from './VerifiedBadge'

export function formatPrice(n, currency = 'INR') {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

export default function PigeonCard({ pigeon }) {
  const photo = pigeon.media?.photos?.[0] || '/placeholder.svg'
  const store = pigeon.vendorId

  return (
    <Link
      to={`/pigeons/${pigeon._id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={photo || "/placeholder.svg"}
          alt={pigeon.title}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {pigeon.pedigree?.isVerified && (
          <div className="absolute left-2 top-2">
            <VerifiedBadge />
          </div>
        )}
        {pigeon.status === 'sold' && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/60">
            <span className="rounded-md bg-card px-3 py-1 text-sm font-semibold">Sold</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {pigeon.breed} · {pigeon.category.replace('-', ' ')}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-pretty">{pigeon.title}</h3>
        {pigeon.location?.country && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" aria-hidden="true" />
            {[pigeon.location.city, pigeon.location.country].filter(Boolean).join(', ')}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-base font-bold">
            {formatPrice(pigeon.price, pigeon.currency)}
            {pigeon.negotiable && <span className="ml-1 text-xs font-medium text-muted-foreground">Negotiable</span>}
          </span>
          {store?.storeName && <span className="truncate pl-2 text-xs text-muted-foreground">{store.storeName}</span>}
        </div>
      </div>
    </Link>
  )
}
