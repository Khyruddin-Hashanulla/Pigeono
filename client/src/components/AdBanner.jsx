import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useFetch } from '../lib/useFetch'
import { api } from '../lib/api'

/**
 * Advertisement slot. Renders active ads for a placement
 * ("home_banner" | "search_sidebar") with click tracking.
 * home_banner: wide editorial split card. search_sidebar: compact vertical card.
 */
export default function AdBanner({ placement, className = '' }) {
  const ads = useFetch(`/content/ads?placement=${placement}`)
  const items = ads.data?.data || []
  if (ads.loading || ads.error || items.length === 0) return null

  function trackClick(id) {
    api.post(`/content/ads/${id}/click`).catch(() => {})
  }

  const isBanner = placement === 'home_banner'

  return (
    <div className={className}>
      {items.map((ad) => {
        const external = /^https?:\/\//.test(ad.linkUrl)
        const inner = isBanner ? (
          <span className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg md:flex-row">
            <span className="relative block h-44 overflow-hidden md:h-auto md:w-3/5">
              <img
                src={ad.image || '/placeholder.svg'}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </span>
            <span className="flex flex-1 flex-col justify-center gap-3 p-6 md:p-8">
              <span className="w-fit rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Sponsored
              </span>
              <span className="font-serif text-xl font-bold leading-snug text-balance md:text-2xl">{ad.title}</span>
              <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform group-hover:translate-x-1">
                Learn more
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </span>
            </span>
          </span>
        ) : (
          <span className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
            <span className="relative block h-32 overflow-hidden">
              <img
                src={ad.image || '/placeholder.svg'}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute left-2 top-2 rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Sponsored
              </span>
            </span>
            <span className="flex items-center justify-between gap-2 p-3.5">
              <span className="text-xs font-semibold leading-snug text-pretty">{ad.title}</span>
              <ArrowRight
                className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </span>
        )
        return external ? (
          <a
            key={ad._id}
            href={ad.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClick(ad._id)}
            className="mb-3 block last:mb-0"
          >
            {inner}
          </a>
        ) : (
          <Link key={ad._id} to={ad.linkUrl} onClick={() => trackClick(ad._id)} className="mb-3 block last:mb-0">
            {inner}
          </Link>
        )
      })}
    </div>
  )
}
