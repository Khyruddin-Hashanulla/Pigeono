import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Upload, X, ImageIcon } from 'lucide-react'
import { api, apiErrorMessage } from '../../lib/api'
import { LoadingState, ErrorState } from '../../components/States'
import { INDIAN_STATES } from '../../lib/india'

const MAX_PHOTOS = 5

export const BREEDS = [
  'Rampoori',
  'Ferozpori',
  'Madrasi',
  'Sialkoti',
  'Laldumma',
  'Teddy',
  'Lalsiray',
  'Kalsiray',
  'Abluk',
  'Kalduma',
  'Kalanka',
  'Kamagar',
  'Fullsiray',
  'Modena',
  'Homing',
  'Frillback',
  'Other',
]

const EMPTY = {
  title: '',
  breed: '',
  category: 'high-flying',
  ageValue: '',
  ageUnit: 'years',
  gender: 'unknown',
  color: '',
  price: '',
  currency: 'INR',
  negotiable: false,
  stock: 1,
  description: '',
  vaccinated: false,
  vaccineDetails: '',
  lastVetCheck: '',
  healthCertificate: '',
  photos: [],
  fatherLineage: '',
  motherLineage: '',
  ringNumber: '',
  pedigreeDocumentUrl: '',
  city: '',
  state: '',
  country: '',
  pincode: '',
  landmark: '',
  pickupOnly: false,
  racingRecord: [],
}

/** Parses stored age strings like "2 years" / "8 months" back into value + unit */
function parseAge(age) {
  const match = /^(\d+(?:\.\d+)?)\s*(month|year)s?$/i.exec((age || '').trim())
  if (match) return { ageValue: match[1], ageUnit: match[2].toLowerCase() === 'month' ? 'months' : 'years' }
  return { ageValue: age || '', ageUnit: 'years' }
}

function toForm(p) {
  return {
    title: p.title || '',
    breed: p.breed || '',
    category: p.category || 'high-flying',
    ...parseAge(p.age),
    gender: p.gender || 'unknown',
    color: p.color || '',
    price: p.price ?? '',
    currency: p.currency || 'INR',
    negotiable: p.negotiable || false,
    stock: p.stock ?? 1,
    description: p.description || '',
    vaccinated: p.health?.vaccinated || false,
    vaccineDetails: p.health?.vaccineDetails || '',
    lastVetCheck: p.health?.lastVetCheck ? p.health.lastVetCheck.slice(0, 10) : '',
    healthCertificate: p.health?.healthCertificate || '',
    photos: p.media?.photos || [],
    fatherLineage: p.pedigree?.fatherLineage || '',
    motherLineage: p.pedigree?.motherLineage || '',
    ringNumber: p.pedigree?.ringNumber || '',
    pedigreeDocumentUrl: p.pedigree?.pedigreeDocumentUrl || '',
    city: p.location?.city || '',
    state: p.location?.state || '',
    country: p.location?.country || '',
    pincode: p.location?.pincode || '',
    landmark: p.location?.landmark || '',
    pickupOnly: p.location?.pickupOnly || false,
    racingRecord: (p.racingRecord || []).map((r) => ({
      raceName: r.raceName || '',
      date: r.date ? r.date.slice(0, 10) : '',
      distance: r.distance || '',
      position: r.position ?? '',
      speed: r.speed || '',
    })),
  }
}

export default function VendorListingForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get(`/vendor/listings?limit=100`)
        const found = data.data.find((p) => p._id === id)
        if (!found) throw new Error('Listing not found')
        if (!cancelled) setForm(toForm(found))
      } catch (err) {
        if (!cancelled) setLoadError(err.message === 'Listing not found' ? err.message : apiErrorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const removePhoto = (url) => {
    setForm((f) => ({ ...f, photos: f.photos.filter((p) => p !== url) }))
  }

  const onFilesPicked = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // allow re-picking the same file
    if (!files.length) return

    const remaining = MAX_PHOTOS - form.photos.length
    if (remaining <= 0) {
      setUploadError(`Maximum ${MAX_PHOTOS} photos allowed. Remove one first.`)
      return
    }

    setUploadError('')
    setUploading(true)
    try {
      const fd = new FormData()
      files.slice(0, remaining).forEach((file) => fd.append('photos', file))
      const { data } = await api.post('/uploads', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setForm((f) => ({
        ...f,
        photos: [...f.photos, ...data.data.urls].slice(0, MAX_PHOTOS),
      }))
    } catch (err) {
      setUploadError(apiErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const setRecord = (i, key, value) => {
    setForm((f) => {
      const rr = [...f.racingRecord]
      rr[i] = { ...rr[i], [key]: value }
      return { ...f, racingRecord: rr }
    })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.photos.length === 0) {
      setError('At least 1 photo is required.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        title: form.title,
        breed: form.breed,
        category: form.category,
        age: `${form.ageValue} ${form.ageUnit}`,
        gender: form.gender,
        color: form.color,
        price: Number(form.price),
        currency: form.currency,
        negotiable: form.negotiable,
        stock: Number(form.stock),
        description: form.description,
        health: {
          vaccinated: form.vaccinated,
          vaccineDetails: form.vaccineDetails || undefined,
          lastVetCheck: form.lastVetCheck || undefined,
          healthCertificate: form.healthCertificate || undefined,
        },
        media: { photos: form.photos },
        pedigree: {
          fatherLineage: form.fatherLineage || undefined,
          motherLineage: form.motherLineage || undefined,
          ringNumber: form.ringNumber || undefined,
          pedigreeDocumentUrl: form.pedigreeDocumentUrl || undefined,
        },
      location: {
        city: form.city,
        state: form.state,
        country: 'India',
        pincode: form.pincode,
          landmark: form.landmark || undefined,
          pickupOnly: form.pickupOnly,
        },
        racingRecord: form.racingRecord
          .filter((r) => r.raceName)
          .map((r) => ({
            raceName: r.raceName,
            date: r.date || undefined,
            distance: r.distance || undefined,
            position: r.position !== '' ? Number(r.position) : undefined,
            speed: r.speed || undefined,
          })),
      }
      if (isEdit) await api.put(`/vendor/listings/${id}`, payload)
      else await api.post('/vendor/listings', payload)
      navigate('/dashboard/vendor')
    } catch (err) {
      setError(apiErrorMessage(err))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState label="Loading listing..." />
  if (loadError) return <ErrorState message={loadError} />

  const inputCls =
    'w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring'

  const requiredMark = <span className="text-destructive" aria-hidden="true"> *</span>

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        to="/dashboard/vendor"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to listings
      </Link>
      <h1 className="mt-3 font-serif text-2xl font-bold">{isEdit ? 'Edit listing' : 'New listing'}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isEdit
          ? 'Edits are re-submitted for admin approval. Pedigree changes reset verification.'
          : 'New listings go to the admin approval queue before appearing publicly.'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Fields marked with <span className="text-destructive">*</span> are required.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-8">
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Basics */}
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 font-serif text-lg font-bold">Bird details</legend>
          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium">Title{requiredMark}</label>
            <input id="title" required minLength={5} maxLength={150} value={form.title} onChange={set('title')} className={inputCls} placeholder="e.g. Rampoori High Flyer Male — 10hr Kit Bird" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="breed" className="mb-1.5 block text-sm font-medium">Breed{requiredMark}</label>
              <select id="breed" required value={form.breed} onChange={set('breed')} className={inputCls}>
                <option value="" disabled>Select a breed</option>
                {BREEDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="category" className="mb-1.5 block text-sm font-medium">Category{requiredMark}</label>
              <select id="category" required value={form.category} onChange={set('category')} className={inputCls}>
                <option value="high-flying">High-Flying</option>
                <option value="racing">Racing</option>
                <option value="show">Show</option>
                <option value="breeding">Breeding</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="ageValue" className="mb-1.5 block text-sm font-medium">Age{requiredMark}</label>
              <div className="flex gap-2">
                <input
                  id="ageValue"
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={form.ageValue}
                  onChange={set('ageValue')}
                  className={`${inputCls} min-w-0 flex-1`}
                  placeholder="e.g. 2"
                />
                <select
                  aria-label="Age unit"
                  value={form.ageUnit}
                  onChange={set('ageUnit')}
                  className="w-32 shrink-0 rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="gender" className="mb-1.5 block text-sm font-medium">Gender{requiredMark}</label>
              <select id="gender" required value={form.gender} onChange={set('gender')} className={inputCls}>
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="pair">Pair</option>
              </select>
            </div>
            <div>
              <label htmlFor="color" className="mb-1.5 block text-sm font-medium">Color{requiredMark}</label>
              <input id="color" required value={form.color} onChange={set('color')} className={inputCls} placeholder="e.g. Blue Bar" />
            </div>
            <div>
              <label htmlFor="price" className="mb-1.5 block text-sm font-medium">Price{requiredMark}</label>
              <div className="flex gap-2">
                <select
                  aria-label="Currency"
                  value={form.currency}
                  onChange={set('currency')}
                  className="w-24 shrink-0 rounded-md border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </select>
                <input id="price" type="number" required min={1} step="1" value={form.price} onChange={set('price')} className={`${inputCls} min-w-0 flex-1`} />
              </div>
            </div>
            <div>
              <label htmlFor="stock" className="mb-1.5 block text-sm font-medium">Stock{requiredMark}</label>
              <input id="stock" type="number" required min={0} value={form.stock} onChange={set('stock')} className={inputCls} />
            </div>
          </div>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.negotiable}
              onChange={set('negotiable')}
              className="size-4 accent-[var(--color-accent)]"
            />
            Price is negotiable
          </label>
          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium">Description{requiredMark}</label>
            <textarea id="description" required minLength={20} rows={5} maxLength={5000} value={form.description} onChange={set('description')} className={inputCls} placeholder="Bloodline, achievements, condition, vaccination record... (at least 20 characters)" />
          </div>
        </fieldset>

        {/* Photos */}
        <fieldset>
          <legend className="mb-2 font-serif text-lg font-bold">
            Photos<span className="text-destructive" aria-hidden="true"> *</span>
          </legend>
          <p className="mb-3 text-sm text-muted-foreground">
            Upload 1 to {MAX_PHOTOS} photos (JPG, PNG, or WebP — max 5MB each). The first photo is the cover image.
          </p>

          {uploadError && (
            <p role="alert" className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {uploadError}
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={onFilesPicked}
            className="sr-only"
            aria-label="Upload photos"
          />

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {form.photos.map((url, i) => (
              <div key={url} className="group relative overflow-hidden rounded-md border border-border">
                <img
                  src={url || '/placeholder.svg'}
                  alt={`Listing photo ${i + 1}`}
                  className="aspect-square w-full object-cover"
                />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-destructive hover:bg-background"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}

            {form.photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <ImageIcon className="size-5 animate-pulse" aria-hidden="true" />
                    <span className="text-xs font-medium">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="size-5" aria-hidden="true" />
                    <span className="text-xs font-medium">Add photo</span>
                  </>
                )}
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {form.photos.length}/{MAX_PHOTOS} photos added
          </p>
        </fieldset>

        {/* Pedigree */}
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 font-serif text-lg font-bold">Pedigree</legend>
          <p className="-mt-2 text-sm text-muted-foreground">
            Pedigree verification is performed by Pigeono admins — providing a ring number and document speeds up review.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ringNumber" className="mb-1.5 block text-sm font-medium">Ring number</label>
              <input id="ringNumber" maxLength={60} value={form.ringNumber} onChange={set('ringNumber')} className={inputCls} placeholder="e.g. BE-2024-6109322" />
            </div>
            <div>
              <label htmlFor="pedigreeDocumentUrl" className="mb-1.5 block text-sm font-medium">Pedigree document URL</label>
              <input id="pedigreeDocumentUrl" type="url" value={form.pedigreeDocumentUrl} onChange={set('pedigreeDocumentUrl')} className={inputCls} placeholder="https://..." />
            </div>
            <div>
              <label htmlFor="fatherLineage" className="mb-1.5 block text-sm font-medium">Father lineage</label>
              <input id="fatherLineage" maxLength={500} value={form.fatherLineage} onChange={set('fatherLineage')} className={inputCls} />
            </div>
            <div>
              <label htmlFor="motherLineage" className="mb-1.5 block text-sm font-medium">Mother lineage</label>
              <input id="motherLineage" maxLength={500} value={form.motherLineage} onChange={set('motherLineage')} className={inputCls} />
            </div>
          </div>
        </fieldset>

        {/* Health */}
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 font-serif text-lg font-bold">Health</legend>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.vaccinated}
              onChange={set('vaccinated')}
              className="size-4 accent-[var(--color-accent)]"
            />
            Vaccinated
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="vaccineDetails" className="mb-1.5 block text-sm font-medium">Vaccine details</label>
              <input id="vaccineDetails" maxLength={500} value={form.vaccineDetails} onChange={set('vaccineDetails')} className={inputCls} placeholder="e.g. PMV-1 and pox, annual booster current" />
            </div>
            <div>
              <label htmlFor="lastVetCheck" className="mb-1.5 block text-sm font-medium">Last vet check</label>
              <input id="lastVetCheck" type="date" value={form.lastVetCheck} onChange={set('lastVetCheck')} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="healthCertificate" className="mb-1.5 block text-sm font-medium">Health certificate URL</label>
              <input id="healthCertificate" type="url" value={form.healthCertificate} onChange={set('healthCertificate')} className={inputCls} placeholder="https://..." />
            </div>
          </div>
        </fieldset>

        {/* Racing record */}
        <fieldset>
          <legend className="mb-2 font-serif text-lg font-bold">Racing record</legend>
          <div className="flex flex-col gap-3">
            {form.racingRecord.map((r, i) => (
              <div key={i} className="grid gap-2 rounded-md border border-border bg-card p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                <input aria-label="Race name" required value={r.raceName} onChange={(e) => setRecord(i, 'raceName', e.target.value)} className={inputCls} placeholder="Race name" />
                <input aria-label="Race date" type="date" value={r.date} onChange={(e) => setRecord(i, 'date', e.target.value)} className={inputCls} />
                <input aria-label="Distance" value={r.distance} onChange={(e) => setRecord(i, 'distance', e.target.value)} className={inputCls} placeholder="500 km" />
                <input aria-label="Position" type="number" min={1} value={r.position} onChange={(e) => setRecord(i, 'position', e.target.value)} className={inputCls} placeholder="Pos." />
                <input aria-label="Speed" value={r.speed} onChange={(e) => setRecord(i, 'speed', e.target.value)} className={inputCls} placeholder="1450 m/min" />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, racingRecord: f.racingRecord.filter((_, j) => j !== i) }))}
                  className="rounded-md p-2 text-destructive hover:bg-destructive/10"
                  aria-label="Remove race result"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            {form.racingRecord.length < 20 && (
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    racingRecord: [...f.racingRecord, { raceName: '', date: '', distance: '', position: '', speed: '' }],
                  }))
                }
                className="inline-flex w-fit items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add race result
              </button>
            )}
          </div>
        </fieldset>

        {/* Location */}
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 font-serif text-lg font-bold">
            Location &amp; delivery<span className="text-destructive" aria-hidden="true"> *</span>
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="city" className="mb-1.5 block text-sm font-medium">City{requiredMark}</label>
              <input id="city" required value={form.city} onChange={set('city')} className={inputCls} />
            </div>
            <div>
              <label htmlFor="state" className="mb-1.5 block text-sm font-medium">State{requiredMark}</label>
              <select id="state" required value={form.state} onChange={set('state')} className={inputCls}>
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pincode" className="mb-1.5 block text-sm font-medium">Pincode{requiredMark}</label>
              <input id="pincode" required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={form.pincode} onChange={set('pincode')} className={inputCls} placeholder="e.g. 700001" title="6-digit Indian pincode" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="landmark" className="mb-1.5 block text-sm font-medium">Landmark</label>
              <input id="landmark" maxLength={200} value={form.landmark} onChange={set('landmark')} className={inputCls} placeholder="e.g. Near the central market" />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={form.pickupOnly} onChange={set('pickupOnly')} className="size-4 accent-[var(--color-accent)]" />
            Pickup only (no courier shipping)
          </label>
        </fieldset>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || uploading}
            className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : isEdit ? 'Save & resubmit for approval' : 'Submit for approval'}
          </button>
          <Link to="/dashboard/vendor" className="rounded-md border border-border px-6 py-3 text-sm font-medium hover:bg-muted">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
