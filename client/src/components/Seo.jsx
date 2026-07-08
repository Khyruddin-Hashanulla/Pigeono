import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

const SITE_NAME = 'Pigeono'
const DEFAULT_DESCRIPTION =
  'Pigeono — the trusted multivendor marketplace for racing, high-flying and fancy pigeons with admin-verified pedigrees.'

/**
 * Per-page SEO tags: title, description, canonical, Open Graph / Twitter
 * cards, and optional JSON-LD structured data.
 *
 * Usage: <Seo title="Rampoori pigeons" description="..." image={photoUrl} />
 */
export default function Seo({ title, description = DEFAULT_DESCRIPTION, image, type = 'website', jsonLd, noIndex = false }) {
  const { pathname } = useLocation()
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Pigeon Marketplace with Verified Pedigrees`
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const canonical = `${origin}${pathname}`
  const ogImage = image ? (image.startsWith('http') ? image : `${origin}${image}`) : `${origin}/icons/icon-512.png`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  )
}
