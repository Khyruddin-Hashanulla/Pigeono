import { Router } from 'express'
import mongoose from 'mongoose'
import { body, param } from 'express-validator'
import Post from '../models/Post.js'
import Advertisement from '../models/Advertisement.js'
import User from '../models/User.js'
import { validate } from '../middleware/validate.js'
import { ApiError } from '../middleware/error.js'
import { notify } from '../services/notify.js'

const router = Router()

/* ---------------------------- Blog (public) ---------------------------- */

/** GET /api/v1/content/posts — published posts */
router.get('/posts', async (_req, res, next) => {
  try {
    const posts = await Post.find({ status: 'published' })
      .sort({ publishedAt: -1 })
      .select('title slug excerpt coverImage publishedAt')
    res.json({ success: true, data: posts })
  } catch (err) {
    next(err)
  }
})

/** GET /api/v1/content/posts/:slug — single published post */
router.get(
  '/posts/:slug',
  validate([param('slug').trim().isLength({ min: 1, max: 200 })]),
  async (req, res, next) => {
    try {
      const post = await Post.findOne({ slug: req.params.slug.toLowerCase(), status: 'published' })
      if (!post) throw new ApiError(404, 'Post not found')
      res.json({ success: true, data: post })
    } catch (err) {
      next(err)
    }
  }
)

/* ---------------------------- Ads (public) ---------------------------- */

/** GET /api/v1/content/ads?placement=home_banner — active ads (counts an impression) */
router.get(
  '/ads',
  validate([]),
  async (req, res, next) => {
    try {
      const filter = { active: true }
      if (['home_banner', 'search_sidebar'].includes(req.query.placement)) {
        filter.placement = req.query.placement
      }
      const ads = await Advertisement.find(filter).sort({ createdAt: -1 }).limit(4)
      // count impressions fire-and-forget
      if (ads.length) {
        Advertisement.updateMany(
          { _id: mongoose.trusted({ $in: ads.map((a) => a._id) }) },
          { $inc: { impressions: 1 } }
        ).catch(() => {})
      }
      res.json({ success: true, data: ads })
    } catch (err) {
      next(err)
    }
  }
)

/** POST /api/v1/content/ads/:id/click — count a click */
router.post('/ads/:id/click', validate([param('id').isMongoId()]), async (req, res, next) => {
  try {
    await Advertisement.updateOne({ _id: req.params.id }, { $inc: { clicks: 1 } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

/* ---------------------- Featured lofts (Elite perk) ---------------------- */

/** GET /api/v1/content/featured-vendors — Elite-plan shops promoted on the homepage */
router.get('/featured-vendors', async (_req, res, next) => {
  try {
    const VendorProfile = (await import('../models/VendorProfile.js')).default
    const vendors = await VendorProfile.find({
      status: 'approved',
      'subscription.plan': 'elite',
      'subscription.status': 'active',
      'subscription.currentPeriodEnd': mongoose.trusted({ $gt: new Date() }),
    })
      .sort({ rating: -1 })
      .limit(4)
      .select('storeName storeSlug storeDescription storeLogo bannerImage rating reviewCount totalSales')
    res.json({ success: true, data: vendors })
  } catch (err) {
    next(err)
  }
})

/* ---------------------------- Contact form ---------------------------- */

/** POST /api/v1/content/contact — public contact form -> notifies all admins */
router.post(
  '/contact',
  validate([
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('subject').trim().isLength({ min: 3, max: 200 }).withMessage('Subject is required'),
    body('message').trim().isLength({ min: 10, max: 3000 }).withMessage('Message is required (10+ characters)'),
  ]),
  async (req, res, next) => {
    try {
      const admins = await User.find({ roles: 'admin' }).select('_id')
      await Promise.all(
        admins.map((a) =>
          notify(a._id, {
            type: 'contact',
            title: `Contact form: ${req.body.subject}`,
            body: `From ${req.body.name} (${req.body.email}): ${req.body.message}`,
          })
        )
      )
      res.json({ success: true, message: 'Thanks! We received your message and will reply soon.' })
    } catch (err) {
      next(err)
    }
  }
)

export default router
