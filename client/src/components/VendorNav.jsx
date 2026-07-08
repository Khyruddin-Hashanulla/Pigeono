import { NavLink, Link, useLocation } from 'react-router-dom'
import { LayoutGrid, TrendingUp, BarChart3, CreditCard, Settings, AlertTriangle } from 'lucide-react'
import { useFetch } from '../lib/useFetch'

const TABS = [
  { to: '/dashboard/vendor', label: 'Listings', icon: LayoutGrid, end: true },
  { to: '/dashboard/vendor/sales', label: 'Sales', icon: TrendingUp },
  { to: '/dashboard/vendor/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dashboard/vendor/subscription', label: 'Subscription', icon: CreditCard },
  { to: '/dashboard/vendor/settings', label: 'Shop settings', icon: Settings },
]

const DAY_MS = 24 * 60 * 60 * 1000

/** Renewal/expiry/limit warning strip shown across all vendor pages */
function RenewalBanner() {
  const { pathname } = useLocation()
  const { data } = useFetch('/subscriptions/mine')
  const { data: usageData } = useFetch('/vendor/usage')
  // The subscription page already shows full plan state — skip the banner there
  if (pathname === '/dashboard/vendor/subscription') return null

  const sub = data?.data?.subscription
  const usage = usageData?.data
  let message = null

  if (sub?.currentPeriodEnd) {
    const msLeft = new Date(sub.currentPeriodEnd).getTime() - Date.now()
    if (sub.status !== 'active' || msLeft <= 0) {
      message = 'Your subscription has expired — new listings are paused. Renew now to keep selling.'
    } else if (msLeft <= 3 * DAY_MS) {
      const days = Math.max(1, Math.ceil(msLeft / DAY_MS))
      message = `Your plan ends in ${days} day${days === 1 ? '' : 's'} (${new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN')}). Renew to avoid interruption.`
    }
  }
  // Listing limit exhausted (only if plan is otherwise fine)
  if (!message && usage?.isActive && usage.limit !== null && usage.used >= usage.limit) {
    message = `You are using ${usage.used} of ${usage.limit} listings on your plan. Upgrade to create your next listing.`
  }

  if (!message) return null
  return (
    <div className="border-b border-accent/40 bg-accent/15">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2.5">
        <p className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="size-4 shrink-0 text-accent-foreground" aria-hidden="true" />
          {message}
        </p>
        <Link
          to="/dashboard/vendor/subscription"
          className="shrink-0 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          View plans
        </Link>
      </div>
    </div>
  )
}

/** Horizontal tab navigation shared across all vendor dashboard pages */
export default function VendorNav() {
  return (
    <>
    <RenewalBanner />
    <nav aria-label="Vendor dashboard" className="border-b border-border">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
    </>
  )
}
