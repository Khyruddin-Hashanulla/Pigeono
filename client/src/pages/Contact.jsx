import { useState } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/content/contact', form)
      setDone(data.message)
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="font-serif text-3xl font-bold">Contact us</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Questions about buying, selling or transport? Send us a message and our team will reply within one business
        day.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_280px]">
        <form onSubmit={submit} className="rounded-lg border border-border bg-card p-6">
          {done && (
            <p className="mb-4 rounded-md bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground" role="status">
              {done}
            </p>
          )}
          {error && (
            <p className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className="mb-1.5 block text-sm font-medium">
                Name
              </label>
              <input id="c-name" required minLength={2} value={form.name} onChange={set('name')} className={inputCls} />
            </div>
            <div>
              <label htmlFor="c-email" className="mb-1.5 block text-sm font-medium">
                Email
              </label>
              <input id="c-email" type="email" required value={form.email} onChange={set('email')} className={inputCls} />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="c-subject" className="mb-1.5 block text-sm font-medium">
              Subject
            </label>
            <input id="c-subject" required minLength={3} value={form.subject} onChange={set('subject')} className={inputCls} />
          </div>
          <div className="mt-4">
            <label htmlFor="c-message" className="mb-1.5 block text-sm font-medium">
              Message
            </label>
            <textarea
              id="c-message"
              required
              minLength={10}
              rows={5}
              value={form.message}
              onChange={set('message')}
              className={inputCls}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-5 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Sending...' : 'Send message'}
          </button>
        </form>

        <aside className="flex flex-col gap-4">
          {[
            { icon: Mail, label: 'Email', value: 'support@pigeono.com' },
            { icon: Phone, label: 'Phone', value: '+91 98765 43210' },
            { icon: MapPin, label: 'Office', value: 'Kolkata, West Bengal, India' },
          ].map((c) => (
            <div key={c.label} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                <c.icon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="mt-0.5 text-sm font-medium">{c.value}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </main>
  )
}
