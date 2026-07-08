import { Router } from 'express'
import mongoose from 'mongoose'
import { body, param, query } from 'express-validator'
import Pigeon from '../models/Pigeon.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import VendorProfile from '../models/VendorProfile.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { ApiError } from '../middleware/error.js'
import { getPagination } from '../utils/pagination.js'
import Post from '../models/Post.js'
import Advertisement from '../models/Advertisement.js'
import { PLANS, planForApi } from '../config/plans.js'
import { notify } from '../services/notify.js'

const router = Router()

// every admin endpoint requires an authenticated admin
router.use(requireAuth, requireRoles('admin'))

// ---------------------------------------------------------------------------
// GET /admin/stats — dashboard overview counts
// ---------------------------------------------------------------------------
router.get('/stats', async (req, res, next) => {
  try {
    const [
      pendingListings,
      activeListings,
      disputedOrders,
      activeOrders,
      totalUsers,
      totalVendors,
      pendingVendors,
    ] = await Promise.all([
      Pigeon.countDocuments({ status: 'pending_approval' }),
      Pigeon.countDocuments({ status: 'active' }),
      Order.countDocuments({ status: 'disputed' }),
      // Active (in-progress) direct-payment orders
      Order.countDocuments({
        status: mongoose.trusted({ $in: ['pending', 'confirmed_by_vendor'] }),
      }),
      User.countDocuments({}),
      VendorProfile.countDocuments({}),
      VendorProfile.countDocuments({ status: 'pending' }),
    ])
    res.json({
      success: true,
      data: {
        pendingListings,
        activeListings,
        disputedOrders,
        activeOrders,
        totalUsers,
        totalVendors,
        pendingVendors,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /admin/vendors — vendor applications / stores (default: pending)
// ---------------------------------------------------------------------------
router.get(
  '/vendors',
  validate([query('status').optional().isIn(['pending', 'approved', 'rejected', 'suspended'])]),
  async (req, res, next) => {
    try {
      const { page, limit, skip } = getPagination(req.query)
      const status = req.query.status || 'pending'
      const filter = { status }
      const [items, totalCount] = await Promise.all([
        VendorProfile.find(filter)
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'name email createdAt'),
        VendorProfile.countDocuments(filter),
      ])
      res.json({
        success: true,
        data: items,
        pagination: { page, limit, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / limit)) },
      })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /admin/vendors/:id/approve — approve a vendor application
// ---------------------------------------------------------------------------
router.post(
  '/vendors/:id/approve',
  validate([param('id').isMongoId()]),
  async (req, res, next) => {
    try {
      const vendor = await VendorProfile.findById(req.params.id)
      if (!vendor) throw new ApiError(404, 'Vendor not found')
      if (vendor.status === 'approved') throw new ApiError(400, 'Vendor is already approved')
      vendor.status = 'approved'
      vendor.rejectionReason = undefined
      await vendor.save()
      res.json({ success: true, data: vendor })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /admin/vendors/:id/reject — reject a vendor application with a reason
// ---------------------------------------------------------------------------
router.post(
  '/vendors/:id/reject',
  validate([param('id').isMongoId(), body('reason').trim().isLength({ min: 3, max: 500 })]),
  async (req, res, next) => {
    try {
      const vendor = await VendorProfile.findById(req.params.id)
      if (!vendor) throw new ApiError(404, 'Vendor not found')
      if (vendor.status !== 'pending') throw new ApiError(400, 'Only pending applications can be rejected')
      vendor.status = 'rejected'
      vendor.rejectionReason = req.body.reason
      await vendor.save()
      res.json({ success: true, data: vendor })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /admin/vendors/:id/suspend — suspend an approved store (blocks new
// listings and purchases; existing listings stay visible but cannot be bought)
// ---------------------------------------------------------------------------
router.post(
  '/vendors/:id/suspend',
  validate([param('id').isMongoId(), body('reason').optional().trim().isLength({ max: 500 })]),
  async (req, res, next) => {
    try {
      const vendor = await VendorProfile.findById(req.params.id)
      if (!vendor) throw new ApiError(404, 'Vendor not found')
      if (vendor.status !== 'approved') throw new ApiError(400, 'Only approved stores can be suspended')
      vendor.status = 'suspended'
      if (req.body.reason) vendor.rejectionReason = req.body.reason
      await vendor.save()
      res.json({ success: true, data: vendor })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// GET /admin/listings — approval queue (default: pending)
// ---------------------------------------------------------------------------
router.get(
  '/listings',
  validate([query('status').optional().isIn(['pending_approval', 'active', 'rejected', 'sold', 'draft'])]),
  async (req, res, next) => {
    try {
      const { page, limit, skip } = getPagination(req.query)
      const status = req.query.status || 'pending_approval'
      const filter = { status }
      const [items, totalCount] = await Promise.all([
        Pigeon.find(filter)
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limit)
          .populate('vendorId', 'storeName storeSlug rating'),
        Pigeon.countDocuments(filter),
      ])
      res.json({
        success: true,
        data: items,
        pagination: { page, limit, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / limit)) },
      })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /admin/listings/:id/approve — approve listing (optionally verify pedigree)
// ---------------------------------------------------------------------------
router.post(
  '/listings/:id/approve',
  validate([param('id').isMongoId(), body('verifyPedigree').optional().isBoolean()]),
  async (req, res, next) => {
    try {
      const pigeon = await Pigeon.findById(req.params.id)
      if (!pigeon) throw new ApiError(404, 'Listing not found')
      if (pigeon.status !== 'pending_approval') throw new ApiError(400, 'Listing is not pending approval')

      pigeon.status = 'active'
      pigeon.rejectionReason = undefined
      // pedigree verification is an independent, admin-only flag
      if (req.body.verifyPedigree === true && pigeon.pedigree) {
        pigeon.pedigree.isVerified = true
        pigeon.pedigree.verifiedBy = req.user._id
        pigeon.pedigree.verifiedAt = new Date()
      }
      await pigeon.save()
      const vendorDoc = await VendorProfile.findById(pigeon.vendorId).select('userId')
      if (vendorDoc) {
        notify(vendorDoc.userId, {
          type: 'listing',
          title: 'Listing approved',
          body: `${pigeon.title} is now live on the marketplace.`,
          link: '/dashboard/vendor',
        })
      }
      res.json({ success: true, data: pigeon })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /admin/listings/:id/reject — reject with a reason
// ---------------------------------------------------------------------------
router.post(
  '/listings/:id/reject',
  validate([param('id').isMongoId(), body('reason').trim().isLength({ min: 3, max: 500 })]),
  async (req, res, next) => {
    try {
      const pigeon = await Pigeon.findById(req.params.id)
      if (!pigeon) throw new ApiError(404, 'Listing not found')
      if (pigeon.status !== 'pending_approval') throw new ApiError(400, 'Listing is not pending approval')

      pigeon.status = 'rejected'
      pigeon.rejectionReason = req.body.reason
      await pigeon.save()
      const vendorDoc = await VendorProfile.findById(pigeon.vendorId).select('userId')
      if (vendorDoc) {
        notify(vendorDoc.userId, {
          type: 'listing',
          title: 'Listing rejected',
          body: `${pigeon.title}: ${req.body.reason}`,
          link: '/dashboard/vendor',
        })
      }
      res.json({ success: true, data: pigeon })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /admin/listings/:id/verify-pedigree — toggle pedigree verification
// on an already-live listing (independent of listing approval)
// ---------------------------------------------------------------------------
router.post(
  '/listings/:id/verify-pedigree',
  validate([param('id').isMongoId(), body('verified').isBoolean()]),
  async (req, res, next) => {
    try {
      const pigeon = await Pigeon.findById(req.params.id)
      if (!pigeon) throw new ApiError(404, 'Listing not found')
      if (!pigeon.pedigree) throw new ApiError(400, 'Listing has no pedigree data')

      pigeon.pedigree.isVerified = req.body.verified === true
      pigeon.pedigree.verifiedBy = req.body.verified === true ? req.user._id : undefined
      pigeon.pedigree.verifiedAt = req.body.verified === true ? new Date() : undefined
      await pigeon.save()
      res.json({ success: true, data: pigeon })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// GET /admin/disputes — disputed orders queue
// ---------------------------------------------------------------------------
router.get('/disputes', async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = { status: 'disputed' }
    const [items, totalCount] = await Promise.all([
      Order.find(filter)
        .sort({ 'dispute.openedAt': 1 })
        .skip(skip)
        .limit(limit)
        .populate('buyerId', 'name email')
        .populate('vendorId', 'storeName storeSlug'),
      Order.countDocuments(filter),
    ])
    res.json({
      success: true,
      data: items,
      pagination: { page, limit, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / limit)) },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /admin/disputes/:id/resolve — direct-payment model: money moved
// between buyer and vendor outside the platform, so the admin only rules
// on the outcome. favor_vendor => order completed; favor_buyer => cancelled
// (vendor must return any money received; listing goes back on sale).
// ---------------------------------------------------------------------------
router.post(
  '/disputes/:id/resolve',
  validate([
    param('id').isMongoId(),
    body('resolution').isIn(['favor_vendor', 'favor_buyer']),
    body('note').trim().isLength({ min: 3, max: 1000 }).withMessage('A resolution note is required'),
  ]),
  async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id)
      if (!order) throw new ApiError(404, 'Order not found')
      if (order.status !== 'disputed') throw new ApiError(400, 'Order is not disputed')

      const { resolution, note } = req.body

      if (resolution === 'favor_vendor') {
        order.status = 'completed'
        order.paymentStatus = 'confirmed'
      } else {
        order.status = 'cancelled'
        // put the pigeon back on sale
        await Pigeon.updateOne(
          { _id: order.pigeonId, status: 'sold' },
          { $set: { status: 'active' } }
        )
      }

      order.dispute.isOpen = false
      order.dispute.resolvedAt = new Date()
      order.dispute.resolvedBy = req.user._id
      order.dispute.resolution = resolution
      order.dispute.resolutionNote = note
      order.timeline.push({ status: order.status, by: 'admin', note: `Dispute resolved: ${resolution}` })
      await order.save()

      // notify both parties
      const vendorDoc = await VendorProfile.findById(order.vendorId).select('userId')
      const outcome =
        resolution === 'favor_vendor'
          ? 'resolved in favor of the vendor — order marked completed'
          : 'resolved in favor of the buyer — order cancelled'
      notify(order.buyerId, {
        type: 'order',
        title: 'Dispute resolved',
        body: `Your dispute was ${outcome}. ${note}`,
        link: `/orders/${order._id}`,
      })
      if (vendorDoc) {
        notify(vendorDoc.userId, {
          type: 'order',
          title: 'Dispute resolved',
          body: `The dispute was ${outcome}. ${note}`,
          link: '/dashboard/vendor/orders',
        })
      }

      res.json({ success: true, data: order })
    } catch (err) {
      next(err)
    }
  },
)

// ===========================================================================
// Subscriptions
// ===========================================================================

/** GET /admin/subscriptions — all vendor subscriptions + MRR summary */
router.get('/subscriptions', async (req, res, next) => {
  try {
    const vendors = await VendorProfile.find({})
      .select('storeName storeSlug status subscription userId')
      .populate('userId', 'name email')
      .sort({ 'subscription.currentPeriodEnd': -1 })
    const now = new Date()
    const active = vendors.filter(
      (v) =>
        v.subscription?.plan &&
        v.subscription.status === 'active' &&
        v.subscription.currentPeriodEnd > now
    )
    const mrr = active.reduce((sum, v) => sum + (PLANS[v.subscription.plan]?.priceINR || 0), 0)
    const byPlan = { basic: 0, pro: 0, elite: 0 }
    for (const v of active) byPlan[v.subscription.plan]++
    res.json({
      success: true,
      data: { vendors, summary: { mrr, activeCount: active.length, byPlan } },
    })
  } catch (err) {
    next(err)
  }
})

/** POST /admin/subscriptions/:vendorId/comp — grant a free month of a plan */
router.post(
  '/subscriptions/:vendorId/comp',
  validate([param('vendorId').isMongoId(), body('plan').isIn(Object.keys(PLANS))]),
  async (req, res, next) => {
    try {
      const vendor = await VendorProfile.findById(req.params.vendorId)
      if (!vendor) throw new ApiError(404, 'Vendor not found')
      const now = new Date()
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      vendor.subscription = {
        ...(vendor.subscription?.toObject?.() ?? vendor.subscription ?? {}),
        plan: req.body.plan,
        status: 'active',
        startedAt: vendor.subscription?.startedAt || now,
        currentPeriodEnd: periodEnd,
        history: [
          ...(vendor.subscription?.history || []),
          { plan: req.body.plan, amount: 0, paidAt: now, reference: 'admin_comp', periodEnd },
        ],
      }
      await vendor.save()
      notify(vendor.userId, {
        type: 'subscription',
        title: `${PLANS[req.body.plan].name} plan granted`,
        body: 'An admin granted you a complimentary month.',
        link: '/dashboard/vendor/subscription',
      })
      res.json({ success: true, data: vendor.subscription })
    } catch (err) {
      next(err)
    }
  },
)

/**
 * POST /admin/subscriptions/:vendorId/override — manually set a subscription.
 * For testing, goodwill gestures, or offline payments. Sets plan, status and
 * period length directly without touching Razorpay.
 */
router.post(
  '/subscriptions/:vendorId/override',
  validate([
    param('vendorId').isMongoId(),
    body('plan').isIn(Object.keys(PLANS)),
    body('status').optional().isIn(['active', 'expired', 'cancelled']),
    body('days').optional().isInt({ min: 1, max: 365 }),
    body('note').optional().trim().isLength({ max: 300 }),
  ]),
  async (req, res, next) => {
    try {
      const vendor = await VendorProfile.findById(req.params.vendorId)
      if (!vendor) throw new ApiError(404, 'Vendor not found')
      const now = new Date()
      const days = req.body.days || 30
      const status = req.body.status || 'active'
      const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
      vendor.subscription = {
        ...(vendor.subscription?.toObject?.() ?? vendor.subscription ?? {}),
        plan: req.body.plan,
        status,
        startedAt: vendor.subscription?.startedAt || now,
        currentPeriodEnd: status === 'active' ? periodEnd : now,
        renewalReminderSentFor: null,
        expiryNotifiedFor: null,
        limitNotifiedAt: null,
        history: [
          ...(vendor.subscription?.history || []),
          {
            plan: req.body.plan,
            amount: 0,
            paidAt: now,
            reference: `admin_override${req.body.note ? `: ${req.body.note}` : ''}`,
            periodEnd,
          },
        ],
      }
      await vendor.save()
      if (status === 'active') {
        notify(vendor.userId, {
          type: 'subscription',
          title: `${PLANS[req.body.plan].name} plan set by admin`,
          body: `Your subscription was updated by an admin (${days} days).`,
          link: '/dashboard/vendor/subscription',
        })
      }
      res.json({ success: true, data: vendor.subscription })
    } catch (err) {
      next(err)
    }
  },
)

/** POST /admin/subscriptions/:vendorId/expire — force-expire a subscription */
router.post(
  '/subscriptions/:vendorId/expire',
  validate([param('vendorId').isMongoId()]),
  async (req, res, next) => {
    try {
      const vendor = await VendorProfile.findById(req.params.vendorId)
      if (!vendor) throw new ApiError(404, 'Vendor not found')
      if (!vendor.subscription?.plan) throw new ApiError(400, 'Vendor has no subscription')
      vendor.subscription.status = 'expired'
      vendor.subscription.currentPeriodEnd = new Date()
      await vendor.save()
      res.json({ success: true, data: vendor.subscription })
    } catch (err) {
      next(err)
    }
  },
)

// ===========================================================================
// Blog / CMS
// ===========================================================================

const postValidation = [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title is required'),
  body('excerpt').optional().trim().isLength({ max: 500 }),
  body('body').trim().isLength({ min: 20, max: 50000 }).withMessage('Body is required (20+ characters)'),
  body('coverImage').optional().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['draft', 'published']),
]

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

/** GET /admin/posts — all posts (drafts included) */
router.get('/posts', async (_req, res, next) => {
  try {
    const posts = await Post.find({}).sort({ createdAt: -1 })
    res.json({ success: true, data: posts })
  } catch (err) {
    next(err)
  }
})

/** POST /admin/posts — create post */
router.post('/posts', validate(postValidation), async (req, res, next) => {
  try {
    let slug = slugify(req.body.title)
    if (await Post.findOne({ slug })) slug = `${slug}-${Date.now().toString(36)}`
    const post = await Post.create({
      title: req.body.title,
      slug,
      excerpt: req.body.excerpt,
      body: req.body.body,
      coverImage: req.body.coverImage,
      status: req.body.status || 'draft',
      publishedAt: req.body.status === 'published' ? new Date() : undefined,
      authorId: req.user._id,
    })
    res.status(201).json({ success: true, data: post })
  } catch (err) {
    next(err)
  }
})

/** PUT /admin/posts/:id — update post */
router.put('/posts/:id', validate([param('id').isMongoId(), ...postValidation]), async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post) throw new ApiError(404, 'Post not found')
    const wasPublished = post.status === 'published'
    Object.assign(post, {
      title: req.body.title,
      excerpt: req.body.excerpt,
      body: req.body.body,
      coverImage: req.body.coverImage,
      status: req.body.status || post.status,
    })
    if (!wasPublished && post.status === 'published') post.publishedAt = new Date()
    await post.save()
    res.json({ success: true, data: post })
  } catch (err) {
    next(err)
  }
})

/** DELETE /admin/posts/:id */
router.delete('/posts/:id', validate([param('id').isMongoId()]), async (req, res, next) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id)
    if (!post) throw new ApiError(404, 'Post not found')
    res.json({ success: true, message: 'Post deleted' })
  } catch (err) {
    next(err)
  }
})

// ===========================================================================
// Advertisements
// ===========================================================================

const adValidation = [
  body('title').trim().isLength({ min: 3, max: 150 }).withMessage('Title is required'),
  body('image').trim().notEmpty().withMessage('Image is required'),
  body('linkUrl').trim().notEmpty().withMessage('Link URL is required'),
  body('placement').isIn(['home_banner', 'search_sidebar']),
  body('active').optional().isBoolean().toBoolean(),
]

/** GET /admin/ads */
router.get('/ads', async (_req, res, next) => {
  try {
    const ads = await Advertisement.find({}).sort({ createdAt: -1 })
    res.json({ success: true, data: ads })
  } catch (err) {
    next(err)
  }
})

/** POST /admin/ads */
router.post('/ads', validate(adValidation), async (req, res, next) => {
  try {
    const ad = await Advertisement.create({
      title: req.body.title,
      image: req.body.image,
      linkUrl: req.body.linkUrl,
      placement: req.body.placement,
      active: req.body.active ?? true,
    })
    res.status(201).json({ success: true, data: ad })
  } catch (err) {
    next(err)
  }
})

/** PATCH /admin/ads/:id — toggle/update */
router.patch(
  '/ads/:id',
  validate([
    param('id').isMongoId(),
    body('active').optional().isBoolean().toBoolean(),
    body('title').optional().isString().trim().isLength({ min: 3, max: 120 }),
    body('image').optional().isString().trim().isLength({ min: 1, max: 500 }),
    body('linkUrl').optional().isString().trim().isLength({ min: 1, max: 500 }),
    body('placement').optional().isIn(['home_banner', 'search_sidebar']),
  ]),
  async (req, res, next) => {
    try {
      const ad = await Advertisement.findById(req.params.id)
      if (!ad) throw new ApiError(404, 'Ad not found')
      for (const field of ['active', 'title', 'image', 'linkUrl', 'placement']) {
        if (req.body[field] !== undefined) ad[field] = req.body[field]
      }
      await ad.save()
      res.json({ success: true, data: ad })
    } catch (err) {
      next(err)
    }
  },
)

/** DELETE /admin/ads/:id */
router.delete('/ads/:id', validate([param('id').isMongoId()]), async (req, res, next) => {
  try {
    const ad = await Advertisement.findByIdAndDelete(req.params.id)
    if (!ad) throw new ApiError(404, 'Ad not found')
    res.json({ success: true, message: 'Ad deleted' })
  } catch (err) {
    next(err)
  }
})

// ===========================================================================
// Customers
// ===========================================================================

/** GET /admin/customers — user management list */
router.get('/customers', async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = {}
    const q = String(req.query.q || '').trim()
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = mongoose.trusted([{ name: rx }, { email: rx }])
    }
    const [items, totalCount] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name email roles isSuspended createdAt'),
      User.countDocuments(filter),
    ])
    res.json({
      success: true,
      data: items,
      pagination: { page, limit, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / limit)) },
    })
  } catch (err) {
    next(err)
  }
})

/** POST /admin/customers/:id/suspend — toggle account suspension */
router.post(
  '/customers/:id/suspend',
  validate([param('id').isMongoId(), body('suspended').isBoolean()]),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id)
      if (!user) throw new ApiError(404, 'User not found')
      if (user.roles.includes('admin')) throw new ApiError(400, 'Cannot suspend an admin')
      user.isSuspended = req.body.suspended === true
      await user.save()
      res.json({ success: true, data: user.toSafeJSON() })
    } catch (err) {
      next(err)
    }
  },
)

// ===========================================================================
// Reports — platform-wide stats
// ===========================================================================

/** GET /admin/reports */
router.get('/reports', async (_req, res, next) => {
  try {
    const [activeListings, activeVendors, totalUsers, completedOrders] = await Promise.all([
      Pigeon.countDocuments({ status: 'active' }),
      VendorProfile.countDocuments({ status: 'approved' }),
      User.countDocuments({}),
      Order.countDocuments({ status: 'completed' }),
    ])
    const [orders, gmvAgg, topVendors, planVendors] = await Promise.all([
      Order.countDocuments({}),
      // GMV: value transacted between buyers and vendors (platform never touches it)
      Order.aggregate([
        { $match: { status: mongoose.trusted({ $nin: ['cancelled', 'refunded', 'pending_payment'] }) } },
        {
          $group: {
            _id: null,
            gmv: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      // Top vendors by completed sales
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$vendorId', sales: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { sales: -1, revenue: -1 } },
        { $limit: 5 },
      ]),
      VendorProfile.find({ 'subscription.status': 'active' }).select('subscription.plan'),
    ])
    const vendorIds = topVendors.map((t) => t._id)
    const vendorDocs = await VendorProfile.find({ _id: mongoose.trusted({ $in: vendorIds }) }).select('storeName')
    const nameById = new Map(vendorDocs.map((v) => [v._id.toString(), v.storeName]))
    const mrr = planVendors.reduce((s, v) => s + (PLANS[v.subscription.plan]?.priceINR || 0), 0)
    res.json({
      success: true,
      data: {
        totalOrders: orders,
        gmv: Math.round((gmvAgg[0]?.gmv || 0) * 100) / 100,
        paidOrders: gmvAgg[0]?.count || 0,
        subscriptionMRR: mrr,
        completedOrders,
        activeListings,
        activeVendors,
        totalUsers,
        topVendors: topVendors.map((t) => ({
          vendorId: t._id,
          storeName: nameById.get(t._id.toString()) || 'Unknown',
          sales: t.sales,
          revenue: Math.round(t.revenue * 100) / 100,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
