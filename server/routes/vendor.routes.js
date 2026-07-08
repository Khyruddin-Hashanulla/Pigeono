import { Router } from 'express'
import mongoose from 'mongoose'
import { body, param } from 'express-validator'
import Pigeon from '../models/Pigeon.js'
import VendorProfile from '../models/VendorProfile.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { ApiError } from '../middleware/error.js'
import { getPagination, paginatedResponse } from '../utils/pagination.js'
import { PLANS, INDIAN_STATES, planForApi } from '../config/plans.js'
import { sweepSubscriptionAlerts, notifyListingLimitReached } from '../services/subscriptionAlerts.js'

const router = Router()

router.use(requireAuth, requireRoles('vendor'))

/** Loads the caller's approved vendor profile onto req.vendor */
async function loadVendor(req, _res, next) {
  const vendor = await VendorProfile.findOne({ userId: req.user._id })
  if (!vendor) return next(new ApiError(404, 'Vendor profile not found'))
  req.vendor = vendor
  // Lazy renewal/expiry sweep — replaces a cron job; never blocks the request on failure
  try {
    await sweepSubscriptionAlerts(vendor)
  } catch {
    /* alerts are best-effort */
  }
  next()
}

router.use(loadVendor)

/** GET /api/v1/vendor/profile */
router.get('/profile', (req, res) => {
  res.json({ success: true, data: req.vendor })
})

/**
 * GET /api/v1/vendor/analytics — per-listing performance + 30-day sales trend.
 * Basic plan: summary only. Pro/Elite: full listing table + trend.
 * Revenue is the full order amount — buyers pay vendors directly (no platform cut).
 */
router.get('/analytics', async (req, res, next) => {
  try {
    const Order = (await import('../models/Order.js')).default
    const plan = req.vendor.subscription?.plan
    const tier = plan === 'elite' ? 'premium' : plan === 'pro' ? 'full' : 'summary'

    const [listings, orders] = await Promise.all([
      Pigeon.find({ vendorId: req.vendor._id }).select('title views inquiries price status createdAt'),
      Order.find({ vendorId: req.vendor._id }).select('totalAmount status createdAt'),
    ])

    const totalViews = listings.reduce((s, l) => s + (l.views || 0), 0)
    const totalInquiries = listings.reduce((s, l) => s + (l.inquiries || 0), 0)
    const completed = orders.filter((o) => o.status === 'completed')
    const revenue = Math.round(completed.reduce((s, o) => s + o.totalAmount, 0) * 100) / 100

    const summary = {
      totalViews,
      totalInquiries,
      totalOrders: orders.length,
      completedSales: completed.length,
      revenue,
      activeListings: listings.filter((l) => l.status === 'active').length,
    }

    if (tier === 'summary') {
      return res.json({ success: true, data: { tier, summary, listings: null, trend: null } })
    }

    // 30-day daily sales trend
    const trend = []
    for (let i = 29; i >= 0; i--) {
      const day = new Date()
      day.setHours(0, 0, 0, 0)
      day.setDate(day.getDate() - i)
      const next = new Date(day.getTime() + 24 * 60 * 60 * 1000)
      const dayOrders = orders.filter((o) => o.createdAt >= day && o.createdAt < next)
      trend.push({
        date: day.toISOString().slice(0, 10),
        orders: dayOrders.length,
        amount: Math.round(dayOrders.reduce((s, o) => s + o.totalAmount, 0) * 100) / 100,
      })
    }

    res.json({ success: true, data: { tier, summary, listings, trend } })
  } catch (err) {
    next(err)
  }
})

/** PATCH /api/v1/vendor/profile — shop settings (name, description, logo, banner) */
router.patch(
  '/profile',
  validate([
    body('storeName').optional().trim().isLength({ min: 3, max: 100 }),
    body('storeDescription').optional().trim().isLength({ max: 2000 }),
    body('storeLogo').optional().trim().isLength({ max: 500 }),
    body('bannerImage').optional().trim().isLength({ max: 500 }),
  ]),
  async (req, res, next) => {
    try {
      const { storeName, storeDescription, storeLogo, bannerImage } = req.body
      if (storeName !== undefined) req.vendor.storeName = storeName
      if (storeDescription !== undefined) req.vendor.storeDescription = storeDescription
      if (storeLogo !== undefined) req.vendor.storeLogo = storeLogo
      if (bannerImage !== undefined) req.vendor.bannerImage = bannerImage
      await req.vendor.save()
      res.json({ success: true, data: req.vendor })
    } catch (err) {
      next(err)
    }
  }
)

/** PATCH /api/v1/vendor/payment-details — direct-payment details shown to buyers */
router.patch(
  '/payment-details',
  validate([
    body('upiId')
      .optional({ values: 'falsy' })
      .trim()
      .matches(/^[\w.\-]{2,}@[a-zA-Z]{2,}$/)
      .withMessage('Enter a valid UPI ID (e.g. name@bank)'),
    body('phoneNumber')
      .optional({ values: 'falsy' })
      .trim()
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Enter a valid 10-digit Indian mobile number'),
    body('bankName').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
    body('accountNumber')
      .optional({ values: 'falsy' })
      .trim()
      .matches(/^\d{9,18}$/)
      .withMessage('Enter a valid account number (9-18 digits)'),
    body('ifscCode')
      .optional({ values: 'falsy' })
      .trim()
      .toUpperCase()
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
      .withMessage('Enter a valid IFSC code'),
    body('accountHolderName').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  ]),
  async (req, res, next) => {
    try {
      const fields = ['upiId', 'phoneNumber', 'bankName', 'accountNumber', 'ifscCode', 'accountHolderName']
      const details = req.vendor.payoutDetails || {}
      for (const f of fields) {
        if (req.body[f] !== undefined) details[f] = req.body[f] || undefined
      }
      // bank details must be all-or-nothing
      if ((details.accountNumber && !details.ifscCode) || (!details.accountNumber && details.ifscCode)) {
        throw new ApiError(400, 'Bank details need both account number and IFSC code')
      }
      req.vendor.payoutDetails = details
      await req.vendor.save()
      res.json({
        success: true,
        data: {
          payoutDetails: req.vendor.payoutDetails,
          hasPaymentDetails: req.vendor.hasPaymentDetails(),
        },
      })
    } catch (err) {
      next(err)
    }
  }
)

/** GET /api/v1/vendor/usage — listing count vs plan limit (for the limit banner) */
router.get('/usage', async (req, res, next) => {
  try {
    const usage = await Pigeon.countDocuments({
      vendorId: req.vendor._id,
      status: mongoose.trusted({ $in: ['active', 'pending_approval', 'draft'] }),
    })
    const plan = req.vendor.subscription?.plan ? planForApi(req.vendor.subscription.plan) : null
    res.json({
      success: true,
      data: {
        used: usage,
        limit: plan ? plan.listingLimit : 0, // null = unlimited
        plan: plan?.id || null,
        isActive: req.vendor.hasActiveSubscription(),
      },
    })
  } catch (err) {
    next(err)
  }
})

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
export const CATEGORIES = ['high-flying', 'racing', 'show', 'breeding', 'other']
export const GENDERS = ['pair', 'male', 'female', 'unknown']

const listingValidation = [
  body('title').trim().isLength({ min: 5, max: 150 }).withMessage('Title required (5-150 chars)'),
  body('breed').isIn(BREEDS).withMessage('Breed is required'),
  body('category').isIn(CATEGORIES).withMessage('Category is required'),
  body('age').trim().notEmpty().withMessage('Age is required'),
  body('gender').isIn(GENDERS).withMessage('Gender is required'),
  body('color').trim().notEmpty().withMessage('Color is required'),
  body('price').isFloat({ min: 1 }).toFloat().withMessage('Price must be a positive number'),
  // India-only marketplace: all prices are in INR
  body('currency').optional().isIn(['INR']).withMessage('Prices are in INR only'),
  body('negotiable').optional().isBoolean().toBoolean(),
  body('stock').isInt({ min: 0 }).toInt().withMessage('Stock is required'),
  body('health.vaccinated').optional().isBoolean().toBoolean(),
  body('health.vaccineDetails').optional().trim().isLength({ max: 500 }),
  body('health.lastVetCheck').optional({ values: 'falsy' }).isISO8601().toDate(),
  body('health.healthCertificate').optional().trim().isLength({ max: 500 }),
  body('description')
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Description is required (at least 20 characters)'),
  body('pedigree.ringNumber').optional().trim().isLength({ max: 60 }),
  body('pedigree.fatherLineage').optional().trim().isLength({ max: 500 }),
  body('pedigree.motherLineage').optional().trim().isLength({ max: 500 }),
  body('media.photos')
    .isArray({ min: 1, max: 5 })
    .withMessage('At least 1 photo is required (maximum 5)'),
  body('location.city').trim().notEmpty().withMessage('City is required'),
  body('location.state').isIn(INDIAN_STATES).withMessage('Choose an Indian state'),
  body('location.pincode')
    .trim()
    .matches(/^[1-9]\d{5}$/)
    .withMessage('Enter a valid 6-digit Indian pincode'),
  body('location.landmark').optional().trim().isLength({ max: 200 }),
  body('racingRecord').optional().isArray({ max: 20 }),
]

/** GET /api/v1/vendor/listings — own listings, any status */
router.get('/listings', async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = { vendorId: req.vendor._id }
    if (req.query.status) filter.status = req.query.status
    const [items, totalCount] = await Promise.all([
      Pigeon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Pigeon.countDocuments(filter),
    ])
    res.json(paginatedResponse(items, totalCount, page, limit))
  } catch (err) {
    next(err)
  }
})

/** POST /api/v1/vendor/listings — create (goes to pending_approval) */
router.post('/listings', validate(listingValidation), async (req, res, next) => {
  try {
    if (req.vendor.status !== 'approved') {
      throw new ApiError(403, 'Your store must be approved before creating listings')
    }

    // Subscription gate: active plan required, listing count within plan limit
    if (!req.vendor.hasActiveSubscription()) {
      throw new ApiError(
        402,
        'An active subscription is required to create listings. Choose a plan from your Subscription page.'
      )
    }
    const plan = PLANS[req.vendor.subscription.plan]
    if (plan.listingLimit !== Infinity) {
      const usage = await Pigeon.countDocuments({
        vendorId: req.vendor._id,
        status: mongoose.trusted({ $in: ['active', 'pending_approval', 'draft'] }),
      })
      if (usage >= plan.listingLimit) {
        // Best-effort notification so the vendor sees it in their bell too
        try {
          await notifyListingLimitReached(req.vendor, { used: usage, limit: plan.listingLimit })
        } catch {
          /* alerts are best-effort */
        }
        throw new ApiError(
          402,
          `Your ${plan.name} plan allows ${plan.listingLimit} listings and you have ${usage}. Upgrade your plan to add more.`
        )
      }
    }

    const {
      title, breed, category, age, gender, color, price, currency, negotiable,
      stock, description, media, pedigree, racingRecord, health, location,
    } = req.body

    const pigeon = await Pigeon.create({
      vendorId: req.vendor._id,
      title, breed, category, age, gender, color, price,
      currency: currency || 'INR',
      negotiable: negotiable ?? false,
      stock: stock ?? 1,
      description,
      media: { photos: media?.photos || [], videos: media?.videos || [] },
      pedigree: {
        fatherLineage: pedigree?.fatherLineage,
        motherLineage: pedigree?.motherLineage,
        pedigreeDocumentUrl: pedigree?.pedigreeDocumentUrl,
        ringNumber: pedigree?.ringNumber,
        isVerified: false, // NEVER trust vendor input — admin sets this
      },
      racingRecord: racingRecord || [],
      health: {
        vaccinated: health?.vaccinated ?? false,
        vaccineDetails: health?.vaccineDetails,
        lastVetCheck: health?.lastVetCheck,
        healthCertificate: health?.healthCertificate,
      },
      location: { ...location, country: 'India' },
      // Elite plan perk: listings are eligible for homepage promotion
      isFeatured: PLANS[req.vendor.subscription.plan]?.homepagePromotion === true,
      status: 'pending_approval',
    })
    res.status(201).json({ success: true, data: pigeon })
  } catch (err) {
    next(err)
  }
})

/** PUT /api/v1/vendor/listings/:id — update own listing (re-enters approval queue) */
router.put(
  '/listings/:id',
  validate([param('id').isMongoId(), ...listingValidation]),
  async (req, res, next) => {
    try {
      const pigeon = await Pigeon.findOne({ _id: req.params.id, vendorId: req.vendor._id })
      if (!pigeon) throw new ApiError(404, 'Listing not found')
      if (pigeon.status === 'sold') throw new ApiError(400, 'Sold listings cannot be edited')

      const {
        title, breed, category, age, gender, color, price, currency, negotiable,
        stock, description, media, pedigree, racingRecord, health, location,
      } = req.body

      const pedigreeChanged =
        (pedigree?.ringNumber || '') !== (pigeon.pedigree.ringNumber || '') ||
        (pedigree?.pedigreeDocumentUrl || '') !== (pigeon.pedigree.pedigreeDocumentUrl || '')

      Object.assign(pigeon, {
        title, breed, category, age, gender, color, price,
        currency: currency || pigeon.currency || 'INR',
        negotiable: negotiable ?? pigeon.negotiable,
        stock: stock ?? pigeon.stock,
        description,
        media: { photos: media?.photos || [], videos: media?.videos || [] },
        racingRecord: racingRecord || [],
        health: {
          vaccinated: health?.vaccinated ?? false,
          vaccineDetails: health?.vaccineDetails,
          lastVetCheck: health?.lastVetCheck,
          healthCertificate: health?.healthCertificate,
        },
        location: { ...location, country: 'India' },
        status: 'pending_approval', // edits require re-approval
      })
      pigeon.pedigree.fatherLineage = pedigree?.fatherLineage
      pigeon.pedigree.motherLineage = pedigree?.motherLineage
      pigeon.pedigree.pedigreeDocumentUrl = pedigree?.pedigreeDocumentUrl
      pigeon.pedigree.ringNumber = pedigree?.ringNumber
      // Pedigree changes invalidate prior admin verification
      if (pedigreeChanged) pigeon.pedigree.isVerified = false

      await pigeon.save()
      res.json({ success: true, data: pigeon })
    } catch (err) {
      next(err)
    }
  }
)

/** DELETE /api/v1/vendor/listings/:id */
router.delete(
  '/listings/:id',
  validate([param('id').isMongoId()]),
  async (req, res, next) => {
    try {
      const pigeon = await Pigeon.findOneAndDelete({
        _id: req.params.id,
        vendorId: req.vendor._id,
        status: mongoose.trusted({ $ne: 'sold' }),
      })
      if (!pigeon) throw new ApiError(404, 'Listing not found or cannot be deleted')
      res.json({ success: true, message: 'Listing deleted' })
    } catch (err) {
      next(err)
    }
  }
)

export default router
