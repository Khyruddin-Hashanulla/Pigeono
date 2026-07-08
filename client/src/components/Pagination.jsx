import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onPage }) {
  if (!totalPages || totalPages <= 1) return null
  return (
    <nav className="flex items-center justify-center gap-2 py-6" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Prev
      </button>
      <span className="px-2 text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40"
      >
        Next
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  )
}
