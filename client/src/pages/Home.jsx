import { Link } from 'react-router-dom'
import {
  Trophy,
  Wind,
  Award,
  Sparkles,
  ShieldCheck,
  Lock,
  MessageSquare,
  ArrowRight,
  ArrowUpRight,
  Star,
  Store,
  Crown,
  Truck,
} from 'lucide-react'
import { useFetch } from '../lib/useFetch'
import PigeonCard from '../components/PigeonCard'
import AdBanner from '../components/AdBanner'
import CreditTag from '../components/CreditTag'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import Seo from '../components/Seo'
import { useLang } from '../lib/i18n'

const CATEGORY_ICONS = { trophy: Trophy, wind: Wind, award: Award, sparkles: Sparkles }

/** Photographic backdrops for the category tiles */
const CATEGORY_IMAGES = {
  racing: '/images/cat-racing.png',
  'high-flying': '/images/cat-high-flying.png',
  show: '/images/cat-show.png',
  breeding: '/images/cat-breeding.png',
  other: '/images/cat-other.png',
}

/** Eyebrow + title used to give every section a consistent, modern header */
function SectionHeader({ id, eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
        <h2 id={id} className="mt-2 font-serif text-3xl font-bold text-balance">
          {title}
        </h2>
      </div>
      {action}
    </div>
  )
}

export default function Home() {
  const { t } = useLang()
  const featured = useFetch('/listings/featured')
  const categories = useFetch('/categories')
  const lofts = useFetch('/content/featured-vendors')
  const featuredLofts = lofts.data?.data || []

  const trustStats = [
    { icon: ShieldCheck, label: t('home.stat.verified') },
    { icon: Lock, label: t('home.stat.escrow') },
    { icon: Store, label: t('home.stat.lofts') },
    { icon: Truck, label: t('home.stat.transport') },
  ]

  return (
    <div>
      <Seo
        title="Buy & Sell Pigeons from Verified Lofts in India"
        description="India's trusted pigeon marketplace — racing, high-flyer, show and breeding pigeons from admin-verified lofts with checked pedigrees. Deal directly with trusted sellers."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Pigeono',
          url: typeof window !== 'undefined' ? window.location.origin : '',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${typeof window !== 'undefined' ? window.location.origin : ''}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-foreground text-background">
        <img
          src="/images/hero-loft.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover object-[70%_center] md:object-right"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/70 to-foreground/10"
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-foreground/80 to-transparent" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-24 md:py-36">
          <span className="inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm">
            <ShieldCheck className="size-3.5 text-accent-foreground" aria-hidden="true" />
            {t('hero.badge')}
          </span>
          <h1 className="max-w-2xl font-serif text-4xl font-bold leading-[1.1] text-balance md:text-6xl">
            {t('hero.title')}
          </h1>
          <p className="max-w-xl text-base leading-relaxed opacity-85 md:text-lg">{t('hero.subtitle')}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              to="/search"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
            >
              {t('hero.cta.browse')}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              to="/become-vendor"
              className="inline-flex items-center rounded-full border border-background/30 bg-background/5 px-7 py-3.5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-background/15"
            >
              {t('hero.cta.sell')}
            </Link>
          </div>
        </div>

        {/* Trust strip */}
        <div className="relative border-t border-background/15">
          <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-3 px-4 py-5 md:grid-cols-4">
            {trustStats.map((s) => (
              <li key={s.label} className="flex items-center gap-2.5 text-xs font-medium opacity-90 md:text-sm">
                <s.icon className="size-4 shrink-0 text-accent-foreground" aria-hidden="true" />
                {s.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="categories-heading">
        <SectionHeader id="categories-heading" eyebrow="Pigeono" title={t('home.categories')} />
        {categories.loading ? (
          <LoadingState label="Loading categories..." />
        ) : categories.error ? (
          <ErrorState message={categories.error} onRetry={categories.refetch} />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(categories.data?.data || []).slice(0, 4).map((cat, i) => {
              const Icon = CATEGORY_ICONS[cat.icon] || Award
              return (
                <Link
                  key={cat.slug}
                  to={`/search?category=${cat.slug}`}
                  className={`group relative flex min-h-64 flex-col justify-end overflow-hidden rounded-2xl ${
                    i === 0
                      ? 'sm:col-span-2 sm:row-span-2 sm:min-h-full'
                      : i === 3
                        ? 'lg:col-span-2 lg:min-h-64'
                        : 'lg:min-h-64'
                  }`}
                >
                  <img
                    src={CATEGORY_IMAGES[cat.slug] || '/images/cat-other.png'}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/25 to-transparent"
                    aria-hidden="true"
                  />
                  <span className="absolute left-4 top-4 flex size-10 items-center justify-center rounded-full bg-background/15 text-background backdrop-blur-sm">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="relative flex items-end justify-between gap-3 p-5 text-background">
                    <div>
                      <h3 className={`font-serif font-bold ${i === 0 ? 'text-2xl md:text-3xl' : 'text-xl'}`}>{cat.name}</h3>
                      <p className="mt-1 line-clamp-2 max-w-xs text-xs leading-relaxed opacity-85">{cat.description}</p>
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-background/30 transition-colors group-hover:bg-background group-hover:text-foreground">
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Featured */}
      <section className="bg-secondary" aria-labelledby="featured-heading">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <SectionHeader
            id="featured-heading"
            eyebrow="Marketplace"
            title={t('home.trending')}
            action={
              <Link
                to="/search"
                className="hidden shrink-0 items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted sm:inline-flex"
              >
                {t('common.viewAll')}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          />
          {featured.loading ? (
            <LoadingState label="Loading featured listings..." />
          ) : featured.error ? (
            <ErrorState message={featured.error} onRetry={featured.refetch} />
          ) : (featured.data?.data || []).length === 0 ? (
            <EmptyState title="No listings yet" message="Check back soon - new birds are added daily." />
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.data.data.map((p) => (
                <PigeonCard key={p._id} pigeon={p} />
              ))}
            </div>
          )}
          <Link
            to="/search"
            className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline sm:hidden"
          >
            {t('common.viewAll')}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Featured lofts — Elite plan homepage promotion */}
      {featuredLofts.length > 0 && (
        <section className="bg-foreground text-background" aria-labelledby="lofts-heading">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
                  <Crown className="size-3.5" aria-hidden="true" />
                  {t('home.loftsSub')}
                </p>
                <h2 id="lofts-heading" className="mt-2 font-serif text-3xl font-bold text-balance">
                  {t('home.lofts')}
                </h2>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {featuredLofts.map((v) => (
                <Link
                  key={v.storeSlug}
                  to={`/store/${v.storeSlug}`}
                  className="group relative overflow-hidden rounded-2xl border border-background/15 bg-background/5 transition-colors hover:border-accent/60 hover:bg-background/10"
                >
                  <div className="flex items-start gap-4 p-6">
                    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-accent/70 bg-background/10">
                      {v.storeLogo ? (
                        <img src={v.storeLogo || "/placeholder.svg"} alt="" className="size-full object-cover" />
                      ) : (
                        <Store className="size-6 text-accent" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-serif text-xl font-bold group-hover:text-accent">{v.storeName}</h3>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                          <Crown className="size-2.5" aria-hidden="true" />
                          Elite
                        </span>
                      </div>
                      {v.storeDescription && (
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed opacity-70">{v.storeDescription}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-background/10 px-6 py-3.5">
                    <div className="flex items-center gap-4 text-xs opacity-90">
                      <span className="flex items-center gap-1.5">
                        <Star className="size-3.5 fill-accent text-accent" aria-hidden="true" />
                        {v.rating > 0 ? `${v.rating.toFixed(1)} (${v.reviewCount})` : 'New loft'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5 text-accent" aria-hidden="true" />
                        {v.totalSales} sales
                      </span>
                    </div>
                    <span className="flex size-8 items-center justify-center rounded-full border border-background/25 transition-colors group-hover:bg-accent group-hover:border-accent group-hover:text-accent-foreground">
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sponsored */}
      <AdBanner placement="home_banner" className="mx-auto max-w-6xl px-4" />

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="how-heading">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Trust &amp; safety</p>
          <h2 id="how-heading" className="mt-2 font-serif text-3xl font-bold text-balance">
            {t('home.how')}
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              step: '01',
              title: 'Verified pedigrees',
              body: 'Our admin team reviews ring numbers and pedigree documents before a listing earns the Verified badge. Vendors can never self-verify.',
            },
            {
              icon: Lock,
              step: '02',
              title: 'Pay the seller directly',
              body: 'Pay the breeder directly via UPI or bank transfer — no middleman fees. Raise a dispute anytime and our admin team will step in.',
            },
            {
              icon: MessageSquare,
              step: '03',
              title: 'Talk to the breeder',
              body: 'Message sellers directly about bloodlines, race results and shipping before you commit to buy.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-7 transition-shadow hover:shadow-md"
            >
              <span className="absolute right-5 top-4 font-serif text-5xl font-bold text-muted" aria-hidden="true">
                {f.step}
              </span>
              <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-accent">
                <f.icon className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16" aria-labelledby="cta-heading">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground md:py-16">
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary-foreground/10"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-primary-foreground/10"
            aria-hidden="true"
          />
          <h2 id="cta-heading" className="relative mx-auto max-w-xl font-serif text-3xl font-bold text-balance md:text-4xl">
            {t('home.cta.title')}
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed opacity-90 md:text-base">
            {t('home.cta.sub')}
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 rounded-full bg-background px-7 py-3.5 text-sm font-semibold text-foreground transition-transform hover:scale-[1.03]"
            >
              {t('hero.cta.browse')}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              to="/become-vendor"
              className="inline-flex items-center rounded-full border border-primary-foreground/40 px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-primary-foreground/10"
            >
              {t('hero.cta.sell')}
            </Link>
          </div>
        </div>
      </section>

      {/* Floating credits tag (closable) */}
      <CreditTag />
    </div>
  )
}
