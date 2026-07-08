import { Router } from 'express'
import mongoose from 'mongoose'
import { query, param } from 'express-validator'
import Pigeon from '../models/Pigeon.js'
import Review from '../models/Review.js'
import { validate } from '../middleware/validate.js'
import { ApiError } from '../middleware/error.js'
import { getPagination, paginatedResponse } from '../utils/pagination.js'

const router = Router()

/**
 * GET /api/v1/listings
 * Public search & filter. Only returns `active` listings.
 * Filters: q, breed, category, minPrice, maxPrice, gender, country, verifiedOnly, sort
 */
router.get(
  '/',
  validate([
    query('minPrice').optional().isFloat({ min: 0 }).toFloat(),
    query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
    query('verifiedOnly').optional().isBoolean().toBoolean(),
    query('sort').optional().isIn(['newest', 'price_asc', 'price_desc']),
    query('category').optional().isIn(['high-flying', 'racing', 'show', 'breeding', 'other']),
  ]),
  async (req, res, next) => {
    try {
      const { page, limit, skip } = getPagination(req.query)
      const { q, breed, category, minPrice, maxPrice, gender, country, verifiedOnly, sort } = req.query

      const filter = { status: 'active' }
      if (q) filter.$text = mongoose.trusted({ $search: String(q) })
      if (breed) filter.breed = new RegExp(String(breed).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      if (category) filter.category = category
      if (gender && ['pair', 'male', 'female'].includes(gender)) filter.gender = gender
      if (country) filter['location.country'] = new RegExp(String(country).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      if (verifiedOnly === true) filter['pedigree.isVerified'] = true
      if (minPrice != null || maxPrice != null) {
        const priceRange = {}
        if (minPrice != null) priceRange.$gte = minPrice
        if (maxPrice != null) priceRange.$lte = maxPrice
        filter.price = mongoose.trusted(priceRange)
      }

      const sortMap = {
        newest: { createdAt: -1 },
        price_asc: { price: 1 },
        price_desc: { price: -1 },
      }
      const sortBy = sortMap[sort] || { createdAt: -1 }

      const [items, totalCount] = await Promise.all([
        Pigeon.find(filter)
          .sort(sortBy)
          .skip(skip)
          .limit(limit)
          .populate('vendorId', 'storeName storeSlug rating reviewCount'),
        Pigeon.countDocuments(filter),
      ])

      res.json(paginatedResponse(items, totalCount, page, limit))
    } catch (err) {
      next(err)
    }
  }
)

/** GET /api/v1/listings/featured — top viewed active listings for the homepage */
router.get('/featured', async (_req, res, next) => {
  try {
    const items = await Pigeon.find({ status: 'active' })
      .sort({ isFeatured: -1, views: -1 })
      .limit(8)
      .populate('vendorId', 'storeName storeSlug rating reviewCount')
    res.json({ success: true, data: items })
  } catch (err) {
    next(err)
  }
})

/** GET /api/v1/listings/:id — public detail (active only), increments views */
router.get(
  '/:id',
  validate([param('id').isMongoId().withMessage('Invalid listing id')]),
  async (req, res, next) => {
    try {
      const pigeon = await Pigeon.findOneAndUpdate(
        { _id: req.params.id, status: mongoose.trusted({ $in: ['active', 'sold'] }) },
        { $inc: { views: 1 } },
        { new: true }
      ).populate('vendorId', 'storeName storeSlug storeLogo storeDescription rating reviewCount totalSales createdAt')
      if (!pigeon) throw new ApiError(404, 'Listing not found')

      const [related, reviews] = await Promise.all([
        Pigeon.find({
          _id: mongoose.trusted({ $ne: pigeon._id }),
          status: 'active',
          $or: [{ category: pigeon.category }, { breed: pigeon.breed }],
        })
          .limit(4)
          .populate('vendorId', 'storeName storeSlug'),
        Review.find({ pigeonId: pigeon._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('buyerId', 'name'),
      ])

      res.json({ success: true, data: { pigeon, related, reviews } })
    } catch (err) {
      next(err)
    }
  }
)

export default router
