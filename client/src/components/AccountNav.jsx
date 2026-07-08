import { NavLink } from 'react-router-dom'

const links = [
  { to: '/dashboard/orders', label: 'Orders' },
  { to: '/dashboard/wishlist', label: 'Wishlist' },
  { to: '/dashboard/cart', label: 'Cart' },
  { to: '/dashboard/addresses', label: 'Addresses' },
  { to: '/dashboard/notifications', label: 'Notifications' },
  { to: '/dashboard/profile', label: 'Profile' },
]

/** Horizontal sub-nav shared by all customer account pages */
export default function AccountNav() {
  return (
    <nav aria-label="Account" className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
