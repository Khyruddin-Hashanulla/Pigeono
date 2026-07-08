import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { useFetch } from '../lib/useFetch'
import PigeonCard from '../components/PigeonCard'
import Pagination from '../components/Pagination'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import AdBanner from '../components/AdBanner'
import Seo from '../components/Seo'

const CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'high-flying', label: 'High-Flying' },
  { value: 'racing', label: 'Racing' },
  { value: 'show', label: 'Show' },
  { value: 'breeding', label: 'Breeding' },
  { value: 'other', label: 'Other' },
]

const BREEDS = [
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

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

export default function Search() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const q = params.get('q') || ''
  const category = params.get('category') || ''
  const breed = params.get('breed') || ''
  const gender = params.get('gender') || ''
  const minPrice = params.get('minPrice') || ''
  const maxPrice = params.get('maxPrice') || ''
  const verifiedOnly = params.get('verifiedOnly') === 'true'
  const sort = params.get('sort') || 'newest'
  const page = Number(params.get('page') || 1)

  const queryString = useMemo(() => {
    const s = new URLSearchParams()
    if (q) s.set('q', q)
    if (category) s.set('category', category)
    if (breed) s.set('breed', breed)
    if (gender) s.set('gender', gender)
    if (minPrice) s.set('minPrice', minPrice)
    if (maxPrice) s.set('maxPrice', maxPrice)
    if (verifiedOnly) s.set('verifiedOnly', 'true')
    s.set('sort', sort)
    s.set('page', String(page))
    s.set('limit', '12')
    return s.toString()
  }, [q, category, breed, gender, minPrice, maxPrice, verifiedOnly, sort, page])

  const { data, loading, error, refetch } = useFetch(`/listings?${queryString}`)

  const setFilter = (key, value, resetPage = true) => {
    const next = new URLSearchParams(params)
    if (value === '' || value === false || value == null) next.delete(key)
    else next.set(key, String(value))
    if (resetPage) next.delete('page')
    setParams(next)
  }

  const clearFilters = () => {
    const next = new URLSearchParams()
    if (q) next.set('q', q)
    setParams(next)
  }

  const items = data?.data || []
  const totalCount = data?.pagination?.totalCount ?? 0
  const totalPages = data?.pagination?.totalPages ?? 1
  const hasFilters = category || breed || gender || minPrice || maxPrice || verifiedOnly

  const filterPanel = (
    <div className="flex flex-col gap-5">
      <div>
        <label htmlFor="f-category" className="mb-1.5 block text-sm font-medium">
          Category
        </label>
        <select
          id="f-category"
          value={category}
          onChange={(e) => setFilter('category', e.target.value)}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-breed" className="mb-1.5 block text-sm font-medium">
          Breed
        </label>
        <select
          id="f-breed"
          value={breed}
          onChange={(e) => setFilter('breed', e.target.value)}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">All breeds</option>
          {BREEDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-gender" className="mb-1.5 block text-sm font-medium">
          Gender
        </label>
        <select
          id="f-gender"
          value={gender}
          onChange={(e) => setFilter('gender', e.target.value)}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">Any</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="pair">Pair</option>
        </select>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Price range</legend>
        <div className="flex items-center gap-2">
          <label htmlFor="f-min" className="sr-only">
            Minimum price
          </label>
          <input
            id="f-min"
            type="number"
            min="0"
            placeholder="Min"
            defaultValue={minPrice}
            onBlur={(e) => setFilter('minPrice', e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
          <span className="text-muted-foreground">–</span>
          <label htmlFor="f-max" className="sr-only">
            Maximum price
          </label>
          <input
            id="f-max"
            type="number"
            min="0"
            placeholder="Max"
            defaultValue={maxPrice}
            onBlur={(e) => setFilter('maxPrice', e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={verifiedOnly}
          onChange={(e) => setFilter('verifiedOnly', e.target.checked ? 'true' : '')}
          className="size-4 accent-[var(--color-accent)]"
        />
        Verified pedigree only
      </label>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <X className="size-4" aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Seo
        title={q ? `${q} — Pigeons for Sale` : 'Browse Pigeons for Sale'}
        description="Search racing, high-flyer, show and breeding pigeons from verified lofts across India. Filter by breed, price, and location."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold">{q ? `Results for "${q}"` : 'Browse pigeons'}</h1>
          {!loading && !error && (
            <p className="mt-1 text-sm text-muted-foreground">
              {totalCount} {totalCount === 1 ? 'listing' : 'listings'} found
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted lg:hidden"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
          </button>
          <label htmlFor="f-sort" className="sr-only">
            Sort by
          </label>
          <select
            id="f-sort"
            value={sort}
            onChange={(e) => setFilter('sort', e.target.value, false)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block`} aria-label="Filters">
          <div className="lg:sticky lg:top-20">
            <div className="rounded-lg border border-border bg-card p-4">{filterPanel}</div>
            <AdBanner placement="search_sidebar" className="mt-4" />
          </div>
        </aside>

        <section aria-label="Search results">
          {loading ? (
            <LoadingState label="Searching listings..." />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No pigeons match your search"
              message="Try removing some filters or searching for a different breed."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((p) => (
                  <PigeonCard key={p._id} pigeon={p} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPage={(n) => setFilter('page', n, false)} />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
