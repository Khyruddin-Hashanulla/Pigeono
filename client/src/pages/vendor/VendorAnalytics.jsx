import { Link } from 'react-router-dom'
import { Eye, MessageSquare, IndianRupee, Package, Lock } from 'lucide-react'
import { useFetch } from '../../lib/useFetch'
import { LoadingState, ErrorState } from '../../components/States'
import VendorNav from '../../components/VendorNav'
import { formatPrice } from '../../components/PigeonCard'

/** Simple CSS bar chart for the 30-day sales trend (no chart lib needed) */
function TrendChart({ trend }) {
  const max = Math.max(1, ...trend.map((d) => d.amount))
  return (
    <div className="mt-3 rounded-lg border border-border p-4">
      <div className="flex h-40 items-end gap-1" role="img" aria-label="Sales trend for the last 30 days">
        {trend.map((d) => (
          <div key={d.date} className="group relative flex-1">
            <div
              className="w-full rounded-t-sm bg-primary/70 transition-colors hover:bg-primary"
              style={{ height: `${Math.max(2, (d.amount / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-0.5 text-xs text-background group-hover:block">
              {d.date.slice(5)}: {formatPrice(d.amount)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{trend[0]?.date}</span>
        <span>Last 30 days</span>
        <span>{trend[trend.length - 1]?.date}</span>
      </div>
    </div>
  )
}

export default function VendorAnalytics() {
  const { data, loading, error, refetch } = useFetch('/vendor/analytics')

  if (loading) return <LoadingState label="Crunching your numbers..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const a = data?.data ?? {}
  const s = a.summary ?? {}
  const tier = a.tier // 'summary' | 'full' | 'premium'

  const cards = [
    { label: 'Total views', value: s.totalViews ?? 0, icon: Eye },
    { label: 'Inquiries', value: s.totalInquiries ?? 0, icon: MessageSquare },
    { label: 'Sales revenue', value: formatPrice(s.revenue ?? 0), icon: IndianRupee },
    { label: 'Active listings', value: s.activeListings ?? 0, icon: Package },
  ]

  return (
    <>
      <VendorNav />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-bold">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tier === 'premium'
                ? 'Premium analytics — Elite plan'
                : tier === 'full'
                  ? 'Full analytics — Pro plan'
                  : 'Basic summary — upgrade for listing-level insights'}
            </p>
          </div>
          {tier === 'summary' && (
            <Link
              to="/dashboard/vendor/subscription"
              className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Upgrade to Pro
            </Link>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-border p-4">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </p>
              <p className="mt-1 font-serif text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {tier === 'summary' ? (
          <div className="mt-10 flex flex-col items-center rounded-lg border border-dashed border-border p-10 text-center">
            <Lock className="size-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-3 font-serif text-lg font-bold">Listing-level analytics is a Pro feature</h2>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              Upgrade to Pro (₹999/month) or Elite (₹1,999/month) to see per-listing performance,
              your 30-day sales trend, and more.
            </p>
            <Link
              to="/dashboard/vendor/subscription"
              className="mt-4 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              View plans
            </Link>
          </div>
        ) : (
          <>
            <h2 className="mt-10 font-serif text-lg font-bold">Sales trend</h2>
            {a.trend && <TrendChart trend={a.trend} />}

            <h2 className="mt-10 font-serif text-lg font-bold">Listing performance</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Per-listing performance</caption>
                <thead className="bg-secondary text-left">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Listing</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Views</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Inquiries</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(a.listings ?? [])
                    .slice()
                    .sort((x, y) => (y.views || 0) - (x.views || 0))
                    .map((l) => (
                      <tr key={l._id} className="border-t border-border">
                        <td className="max-w-56 truncate px-4 py-3 font-medium">{l.title}</td>
                        <td className="px-4 py-3">{formatPrice(l.price)}</td>
                        <td className="px-4 py-3">{l.views ?? 0}</td>
                        <td className="px-4 py-3">{l.inquiries ?? 0}</td>
                        <td className="px-4 py-3 capitalize">{(l.status || '').replace('_', ' ')}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}
