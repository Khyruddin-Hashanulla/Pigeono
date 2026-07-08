import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bird, Menu, X, Search as SearchIcon, Store, LogOut, Package, MessageSquare, ShieldCheck, Bell, Heart, ShoppingCart, UserRound, Globe } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { getSocket } from '../lib/socket'
import { useLang, LANGUAGES } from '../lib/i18n'

/** Compact EN/HI/BN selector shown in the navbar */
function LangSwitcher({ className = '' }) {
  const { lang, setLang } = useLang()
  return (
    <div className={`relative flex items-center ${className}`}>
      <Globe className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" aria-hidden="true" />
      <label htmlFor="lang-switcher" className="sr-only">
        Language
      </label>
      <select
        id="lang-switcher"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="cursor-pointer appearance-none rounded-md border border-border bg-card py-1.5 pl-7 pr-2 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function Navbar() {
  const { user, logout, isVendor, isAdmin } = useAuth()
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [unread, setUnread] = useState(0)
  const [alerts, setAlerts] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      setUnread(0)
      setAlerts(0)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const [msgs, notifs] = await Promise.all([
          api.get('/messages/unread-count'),
          api.get('/notifications'),
        ])
        if (!cancelled) {
          setUnread(msgs.data.data.total)
          setAlerts(notifs.data.data.unreadCount || 0)
        }
      } catch {
        // ignore — badges just stay stale
      }
    }
    load()
    // Real-time: bump the badge instantly when a conversation changes
    const socket = getSocket()
    socket.on('conversation:updated', load)
    const timer = setInterval(load, 30000)
    return () => {
      cancelled = true
      socket.off('conversation:updated', load)
      clearInterval(timer)
    }
  }, [user])

  const submitSearch = (e) => {
    e.preventDefault()
    setOpen(false)
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
  }

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bird className="size-5" aria-hidden="true" />
          </span>
          <span className="font-serif text-xl font-bold tracking-tight">Pigeono</span>
        </Link>

        <form onSubmit={submitSearch} className="hidden flex-1 md:block" role="search">
          <label htmlFor="nav-search" className="sr-only">
            Search pigeons
          </label>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="nav-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('nav.searchPlaceholder')}
              className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </form>

        <nav className="hidden items-center gap-1 whitespace-nowrap md:flex" aria-label="Main">
          <LangSwitcher className="mr-1" />
          <Link to="/" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
            {t('nav.home')}
          </Link>
          <Link to="/search" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
            {t('nav.browse')}
          </Link>
          {user ? (
            <>
              {!isAdmin && (
                <>
                  <Link to="/dashboard/messages" className="relative flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                    <MessageSquare className="size-4" aria-hidden="true" />
                    {t('nav.messages')}
                    {unread > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex size-4.5 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </Link>
                  <Link to="/dashboard/orders" className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                    <Package className="size-4" aria-hidden="true" />
                    {t('nav.orders')}
                  </Link>
                  <Link to="/dashboard/wishlist" className="rounded-md p-2 hover:bg-muted" aria-label="Wishlist">
                    <Heart className="size-4" aria-hidden="true" />
                  </Link>
                  <Link to="/dashboard/cart" className="rounded-md p-2 hover:bg-muted" aria-label="Cart">
                    <ShoppingCart className="size-4" aria-hidden="true" />
                  </Link>
                </>
              )}
              <Link to="/dashboard/notifications" className="relative rounded-md p-2 hover:bg-muted" aria-label={`Notifications${alerts > 0 ? ` (${alerts} unread)` : ''}`}>
                <Bell className="size-4" aria-hidden="true" />
                {alerts > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4.5 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {alerts > 9 ? '9+' : alerts}
                  </span>
                )}
              </Link>
              <Link to="/dashboard/profile" className="rounded-md p-2 hover:bg-muted" aria-label="Profile">
                <UserRound className="size-4" aria-hidden="true" />
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  {t('nav.admin')}
                </Link>
              )}
              {!isAdmin &&
                (isVendor ? (
                  <>
                    <Link to="/dashboard/vendor/sales" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                      {t('nav.sales')}
                    </Link>
                    <Link to="/dashboard/vendor" className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                      <Store className="size-4" aria-hidden="true" />
                      {t('nav.myStore')}
                    </Link>
                  </>
                ) : (
                  <Link to="/become-vendor" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                    {t('nav.becomeVendor')}
                  </Link>
                ))}

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                aria-label={t('nav.logout')}
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className={isAdmin ? 'sr-only' : undefined}>{t('nav.logout')}</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {t('nav.signup')}
              </Link>
            </>
          )}
        </nav>

        <button
          type="button"
          className="ml-auto rounded-md p-2 hover:bg-muted md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border px-4 py-4 md:hidden">
          <form onSubmit={submitSearch} role="search" className="mb-3">
            <label htmlFor="nav-search-mobile" className="sr-only">
              Search pigeons
            </label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                id="nav-search-mobile"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pigeons..."
                className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </form>
          <div className="mb-3">
            <LangSwitcher />
          </div>
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            <Link to="/" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
              {t('nav.home')}
            </Link>
            <Link to="/search" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
              {t('nav.browse')}
            </Link>
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    {t('nav.admin')}
                  </Link>
                )}
                {!isAdmin && (
                  <>
                    <Link to="/dashboard/messages" onClick={() => setOpen(false)} className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                      {t('nav.messages')}
                      {unread > 0 && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </Link>
                    <Link to="/dashboard/orders" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                      {t('nav.orders')}
                    </Link>
                    <Link to="/dashboard/wishlist" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                      {t('nav.wishlist')}
                    </Link>
                    <Link to="/dashboard/cart" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                      {t('nav.cart')}
                    </Link>
                  </>
                )}
                <Link to="/dashboard/notifications" onClick={() => setOpen(false)} className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                  {t('nav.notifications')}
                  {alerts > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {alerts > 9 ? '9+' : alerts}
                    </span>
                  )}
                </Link>
                <Link to="/dashboard/profile" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                  {t('nav.profile')}
                </Link>
                {!isAdmin &&
                  (isVendor ? (
                    <>
                      <Link to="/dashboard/vendor/sales" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                        {t('nav.sales')}
                      </Link>
                      <Link to="/dashboard/vendor" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                        {t('nav.myStore')}
                      </Link>
                    </>
                  ) : (
                    <Link to="/become-vendor" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                      {t('nav.becomeVendor')}
                    </Link>
                  ))}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground"
                >
                  {t('nav.signup')}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
