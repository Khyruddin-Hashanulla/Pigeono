import { Loader2, AlertTriangle, Inbox } from 'lucide-react'

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground" role="status">
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center" role="alert">
      <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title = 'Nothing here yet', message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      {message && <p className="max-w-sm text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
