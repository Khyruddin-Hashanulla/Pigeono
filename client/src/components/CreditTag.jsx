import { useState } from 'react'
import { X, Feather, BadgeCheck } from 'lucide-react'

/**
 * Floating, closable credit tag pinned to the bottom-right corner.
 * Slides in with a soft float animation; the cross button dismisses it.
 */
export default function CreditTag() {
  const [visible, setVisible] = useState(true)
  const [closing, setClosing] = useState(false)

  if (!visible) return null

  const handleClose = () => {
    setClosing(true)
    setTimeout(() => setVisible(false), 300)
  }

  return (
    <aside
      aria-label="Site credits"
      className={`fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-xs ${closing ? 'credit-tag-out' : 'credit-tag-in'}`}
    >
      <div className="credit-tag-float relative overflow-hidden rounded-2xl border border-accent/40 bg-foreground text-background shadow-2xl">
        {/* subtle glow accent */}
        <div
          aria-hidden="true"
          className="credit-tag-glow pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-accent/25 blur-2xl"
        />

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close credits"
          className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full text-background/60 transition-colors hover:bg-background/10 hover:text-background"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <div className="relative flex flex-col gap-2.5 p-4 pr-9">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Feather className="size-4" aria-hidden="true" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">National Pigeon Loft</p>
          </div>

          <div className="flex flex-col gap-1 text-xs leading-relaxed">
            <p>
              <span className="opacity-60">Designed &amp; Developed by</span>{' '}
              <span className="font-semibold">Khyruddin Hashanulla</span>
            </p>
            <p>
              <span className="opacity-60">Loft Managed by</span> <span className="font-semibold">Mijanur Rahaman</span>
            </p>
          </div>

          <p className="flex items-center gap-1.5 border-t border-background/10 pt-2 text-[11px] font-medium text-accent">
            <BadgeCheck className="size-3.5 shrink-0" aria-hidden="true" />
            {'Passion • Quality • Trust'}
          </p>
        </div>
      </div>
    </aside>
  )
}
