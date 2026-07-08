import { ShieldCheck } from 'lucide-react'

export default function VerifiedBadge({ large = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-accent font-semibold text-accent-foreground ${
        large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
      }`}
    >
      <ShieldCheck className={large ? 'size-4' : 'size-3'} aria-hidden="true" />
      Verified Pedigree
    </span>
  )
}
