import { useState } from 'react'
import { Star } from 'lucide-react'

/** Interactive 1-5 star picker for review forms */
export function StarInput({ value, onChange, disabled = false }) {
  const [hover, setHover] = useState(0)
  return (
    <div role="radiogroup" aria-label="Star rating" className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value)
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
          >
            <Star
              className={`size-6 transition-colors ${filled ? 'fill-primary text-primary' : 'text-muted-foreground/40'}`}
              aria-hidden="true"
            />
          </button>
        )
      })}
    </div>
  )
}

export default function Rating({ value = 0, count }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="size-4 fill-primary text-primary" aria-hidden="true" />
      <span className="font-semibold">{Number(value).toFixed(1)}</span>
      {count != null && <span className="text-muted-foreground">({count})</span>}
      <span className="sr-only">Rated {Number(value).toFixed(1)} out of 5{count != null ? ` from ${count} reviews` : ''}</span>
    </span>
  )
}
