import { useState } from 'react'
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react'
import { api, apiErrorMessage } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

/* ------------------------------------------------------------------ */
/* Blog / CMS                                                          */
/* ------------------------------------------------------------------ */
const EMPTY_POST = { title: '', excerpt: '', body: '', coverImage: '', status: 'draft' }

export function PostsTab() {
  const { data, loading, error, refetch } = useFetch('/admin/posts')
  const [editing, setEditing] = useState(null) // null | 'new' | post._id
  const [form, setForm] = useState(EMPTY_POST)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const posts = data?.data ?? []
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function startEdit(post) {
    setEditing(post ? post._id : 'new')
    setForm(
      post
        ? { title: post.title, excerpt: post.excerpt || '', body: post.body, coverImage: post.coverImage || '', status: post.status }
        : EMPTY_POST
    )
    setActionError(null)
  }

  async function save() {
    setBusy(true)
    setActionError(null)
    try {
      if (editing === 'new') await api.post('/admin/posts', form)
      else await api.put(`/admin/posts/${editing}`, form)
      setEditing(null)
      await refetch()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    setBusy(true)
    try {
      await api.delete(`/admin/posts/${id}`)
      await refetch()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Loading posts..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-4">
      {actionError && (
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      {editing ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold">{editing === 'new' ? 'New post' : 'Edit post'}</h3>
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <label htmlFor="post-title" className="mb-1 block text-sm font-medium">Title</label>
              <input id="post-title" value={form.title} onChange={set('title')} className={inputCls} />
            </div>
            <div>
              <label htmlFor="post-excerpt" className="mb-1 block text-sm font-medium">Excerpt</label>
              <input id="post-excerpt" value={form.excerpt} onChange={set('excerpt')} className={inputCls} placeholder="Short summary shown on the blog page" />
            </div>
            <div>
              <label htmlFor="post-cover" className="mb-1 block text-sm font-medium">Cover image URL</label>
              <input id="post-cover" value={form.coverImage} onChange={set('coverImage')} className={inputCls} placeholder="/images/pigeons/racing-blue-bar.png" />
            </div>
            <div>
              <label htmlFor="post-body" className="mb-1 block text-sm font-medium">Body</label>
              <textarea id="post-body" rows={10} value={form.body} onChange={set('body')} className={inputCls} placeholder="Separate paragraphs with a blank line" />
            </div>
            <div>
              <label htmlFor="post-status" className="mb-1 block text-sm font-medium">Status</label>
              <select id="post-status" value={form.status} onChange={set('status')} className={inputCls}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={busy || form.title.trim().length < 3 || form.body.trim().length < 20}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Saving...' : 'Save post'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => startEdit(null)}
          className="inline-flex w-fit items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden="true" />
          New post
        </button>
      )}

      {posts.length === 0 ? (
        <EmptyState title="No posts yet" message="Write your first article for the blog." />
      ) : (
        posts.map((p) => (
          <div key={p._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
            <div className="min-w-0">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-xs text-muted-foreground">
                /blog/{p.slug} ·{' '}
                <span className={p.status === 'published' ? 'font-medium text-primary' : ''}>{p.status}</span>
                {p.publishedAt && ` · ${new Date(p.publishedAt).toLocaleDateString('en-IN')}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startEdit(p)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => remove(p._id)}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-md border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Advertisements                                                      */
/* ------------------------------------------------------------------ */
const EMPTY_AD = { title: '', image: '', linkUrl: '', placement: 'home_banner' }

export function AdsTab() {
  const { data, loading, error, refetch } = useFetch('/admin/ads')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_AD)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const ads = data?.data ?? []
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function create() {
    setBusy(true)
    setActionError(null)
    try {
      await api.post('/admin/ads', form)
      setCreating(false)
      setForm(EMPTY_AD)
      await refetch()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function toggle(ad) {
    setBusy(true)
    try {
      await api.patch(`/admin/ads/${ad._id}`, { active: !ad.active })
      await refetch()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    setBusy(true)
    try {
      await api.delete(`/admin/ads/${id}`)
      await refetch()
    } catch (err) {
      setActionError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Loading ads..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-4">
      {actionError && (
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      {creating ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold">New advertisement</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ad-title" className="mb-1 block text-sm font-medium">Title</label>
              <input id="ad-title" value={form.title} onChange={set('title')} className={inputCls} />
            </div>
            <div>
              <label htmlFor="ad-placement" className="mb-1 block text-sm font-medium">Placement</label>
              <select id="ad-placement" value={form.placement} onChange={set('placement')} className={inputCls}>
                <option value="home_banner">Homepage banner</option>
                <option value="search_sidebar">Search sidebar</option>
              </select>
            </div>
            <div>
              <label htmlFor="ad-image" className="mb-1 block text-sm font-medium">Image URL</label>
              <input id="ad-image" value={form.image} onChange={set('image')} className={inputCls} placeholder="/images/pigeons/racing-blue-bar.png" />
            </div>
            <div>
              <label htmlFor="ad-link" className="mb-1 block text-sm font-medium">Link URL</label>
              <input id="ad-link" value={form.linkUrl} onChange={set('linkUrl')} className={inputCls} placeholder="/become-vendor or https://..." />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={create}
              disabled={busy || form.title.trim().length < 3 || !form.image.trim() || !form.linkUrl.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Creating...' : 'Create ad'}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex w-fit items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Megaphone className="size-4" aria-hidden="true" />
          New advertisement
        </button>
      )}

      {ads.length === 0 ? (
        <EmptyState title="No ads yet" message="Create a promotion for the homepage or search sidebar." />
      ) : (
        ads.map((ad) => (
          <div key={ad._id} className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
            <img src={ad.image || '/placeholder.svg'} alt="" aria-hidden="true" className="h-14 w-24 shrink-0 rounded-md object-cover" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{ad.title}</h3>
              <p className="text-xs text-muted-foreground">
                {ad.placement === 'home_banner' ? 'Homepage banner' : 'Search sidebar'} · {ad.impressions} views ·{' '}
                {ad.clicks} clicks · to {ad.linkUrl}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggle(ad)}
                disabled={busy}
                aria-pressed={ad.active}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  ad.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}
              >
                {ad.active ? 'Active' : 'Paused'}
              </button>
              <button
                type="button"
                onClick={() => remove(ad._id)}
                disabled={busy}
                className="rounded-md border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                aria-label={`Delete ad ${ad.title}`}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
