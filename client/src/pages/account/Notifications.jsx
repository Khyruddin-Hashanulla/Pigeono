import { Link } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import AccountNav from '../../components/AccountNav'

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function Notifications() {
  const { data, loading, error, refetch } = useFetch('/notifications')

  if (loading) return <LoadingState label="Loading notifications..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const items = data?.data?.items ?? []
  const unread = data?.data?.unreadCount ?? 0

  const markAll = async () => {
    try {
      await api.post('/notifications/read-all')
      refetch()
    } catch {
      // non-critical
    }
  }

  const open = async (n) => {
    if (!n.isRead) {
      try {
        await api.post(`/notifications/${n._id}/read`)
        refetch()
      } catch {
        // non-critical
      }
    }
  }

  return (
    <>
      <AccountNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-serif text-2xl font-bold md:text-3xl">
              <Bell className="size-6 text-primary" aria-hidden="true" />
              Notifications
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Order updates, transport, and announcements.
            </p>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <CheckCheck className="size-4" aria-hidden="true" />
              Mark all read
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="mt-8">
            <EmptyState title="No notifications yet" message="We&apos;ll let you know when something happens." />
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-2">
            {items.map((n) => (
              <li key={n._id}>
                <Link
                  to={n.link || '#'}
                  onClick={() => open(n)}
                  className={`block rounded-lg border p-4 transition-colors hover:bg-muted ${
                    n.isRead ? 'border-border bg-card' : 'border-primary/40 bg-primary/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold">
                      {!n.isRead && (
                        <span className="mr-2 inline-block size-2 rounded-full bg-primary" aria-hidden="true" />
                      )}
                      {n.title}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  </div>
                  {n.body && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.body}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
