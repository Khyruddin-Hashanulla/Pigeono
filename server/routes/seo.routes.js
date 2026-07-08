import { Router } from 'express'
import Pigeon from '../models/Pigeon.js'
import VendorProfile from '../models/VendorProfile.js'
import Post from '../models/Post.js'

const router = Router()

/** Public site origin used in sitemap URLs (set SITE_ORIGIN in production) */
function siteOrigin(req) {
  return process.env.SITE_ORIGIN || `${req.protocol}://${req.get('host')}`
}

const xmlEscape = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c])

/** GET /sitemap.xml — all public pages, listings, stores and blog posts */
router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const origin = siteOrigin(req)
    const [pigeons, stores, posts] = await Promise.all([
      Pigeon.find({ status: 'active' }, '_id updatedAt').sort({ updatedAt: -1 }).limit(5000).lean(),
      VendorProfile.find({ status: 'approved' }, 'storeSlug updatedAt').limit(1000).lean(),
      Post.find({ status: 'published' }, 'slug updatedAt').limit(1000).lean(),
    ])

    const staticPages = ['', '/search', '/blog', '/about', '/contact', '/become-vendor']
    const urls = [
      ...staticPages.map((p) => ({ loc: `${origin}${p}`, priority: p === '' ? '1.0' : '0.7' })),
      ...pigeons.map((p) => ({
        loc: `${origin}/pigeons/${p._id}`,
        lastmod: p.updatedAt?.toISOString(),
        priority: '0.9',
      })),
      ...stores.map((s) => ({
        loc: `${origin}/store/${s.storeSlug}`,
        lastmod: s.updatedAt?.toISOString(),
        priority: '0.8',
      })),
      ...posts.map((b) => ({
        loc: `${origin}/blog/${b.slug}`,
        lastmod: b.updatedAt?.toISOString(),
        priority: '0.6',
      })),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`,
  )
  .join('\n')}
</urlset>`

    res.set('Content-Type', 'application/xml').set('Cache-Control', 'public, max-age=3600').send(xml)
  } catch (err) {
    next(err)
  }
})

/** GET /robots.txt */
router.get('/robots.txt', (req, res) => {
  const origin = siteOrigin(req)
  res
    .set('Content-Type', 'text/plain')
    .send(`User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /admin\n\nSitemap: ${origin}/sitemap.xml\n`)
})

export default router
