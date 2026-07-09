import { useState } from 'react'
import { UserRound, KeyRound } from 'lucide-react'
import { api, apiErrorMessage } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import AccountNav from '../../components/AccountNav'

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

function ProfileForm() {
  const { user, refresh } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, text }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      await api.patch('/users/profile', { name, phone: phone || undefined })
      await refresh()
      setMsg({ ok: true, text: 'Profile updated.' })
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-serif text-lg font-bold">
        <UserRound className="size-5 text-primary" aria-hidden="true" />
        Profile details
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-name" className="mb-1.5 block text-sm font-medium">Full name</label>
          <input id="pf-name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="pf-phone" className="mb-1.5 block text-sm font-medium">Mobile number</label>
          <input id="pf-phone" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="10-digit mobile" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pf-email" className="mb-1.5 block text-sm font-medium">Email</label>
          <input id="pf-email" value={user?.email || ''} disabled className={`${inputCls} opacity-60`} />
          <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>
      </div>
      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`mt-3 text-sm ${msg.ok ? 'text-primary' : 'text-destructive'}`}>
          {msg.text}
        </p>
      )}
      <button type="submit" disabled={busy} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
        {busy ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  )
}

function PasswordForm() {
  const { user, refresh } = useAuth()
  // Google accounts have no password yet — they SET one (no current
  // password needed) instead of changing an existing one.
  const hasPassword = user?.authProviders?.includes('password')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (next !== confirm) {
      setMsg({ ok: false, text: 'New passwords do not match.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      await api.post('/users/change-password', {
        ...(hasPassword ? { currentPassword: current } : {}),
        newPassword: next,
      })
      setMsg({
        ok: true,
        text: hasPassword
          ? 'Password updated.'
          : 'Password set. You can now also log in with your email and password.',
      })
      setCurrent('')
      setNext('')
      setConfirm('')
      if (!hasPassword) await refresh() // authProviders now includes 'password'
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-serif text-lg font-bold">
        <KeyRound className="size-5 text-primary" aria-hidden="true" />
        {hasPassword ? 'Change password' : 'Set a password'}
      </h2>
      {!hasPassword && (
        <p className="mt-1 text-sm text-muted-foreground">
          You signed in with Google. Set a password to also log in with your email.
        </p>
      )}
      <div className={`mt-4 grid gap-4 ${hasPassword ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {hasPassword && (
          <div>
            <label htmlFor="pw-current" className="mb-1.5 block text-sm font-medium">Current password</label>
            <input id="pw-current" type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} />
          </div>
        )}
        <div>
          <label htmlFor="pw-new" className="mb-1.5 block text-sm font-medium">New password</label>
          <input id="pw-new" type="password" required minLength={8} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="pw-confirm" className="mb-1.5 block text-sm font-medium">Confirm new password</label>
          <input id="pw-confirm" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
        </div>
      </div>
      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`mt-3 text-sm ${msg.ok ? 'text-primary' : 'text-destructive'}`}>
          {msg.text}
        </p>
      )}
      <button type="submit" disabled={busy} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
        {busy ? 'Saving...' : hasPassword ? 'Update password' : 'Set password'}
      </button>
    </form>
  )
}

export default function Profile() {
  return (
    <>
      <AccountNav />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="font-serif text-2xl font-bold md:text-3xl">Profile &amp; security</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your personal details and password.</p>
        </div>
        <ProfileForm />
        <PasswordForm />
      </main>
    </>
  )
}
