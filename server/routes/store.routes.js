import { Router } from 'express'
import VendorProfile from '../models/VendorProfile.js'
import Pigeon from '../models/Pigeon.js'
import Review from '../models/Review.js'
import { ApiError } from '../middleware/error.js'
import { getPagination, paginatedResponse } from '../utils/pagination.js'

const router = Router()

/** GET /api/v1/stores/:slug — public storefront */
router.get('/:slug', async (req, res, next) => {
  try {
    const store = await VendorProfile.findOne({
      storeSlug: req.params.slug.toLowerCase(),
      status: 'approved',
    }).populate('userId', 'name createdAt')
    if (!store) throw new ApiError(404, 'Store not found')

    const { page, limit, skip } = getPagination(req.query)
    const filter = { vendorId: store._id, status: 'active' }
    const [listings, totalCount, reviews] = await Promise.all([
      Pigeon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Pigeon.countDocuments(filter),
      Review.find({ vendorId: store._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('buyerId', 'name')
        .populate('pigeonId', 'title'),
    ])

    res.json({
      success: true,
      data: { store, reviews, ...paginatedResponse(listings, totalCount, page, limit) },
    })
  } catch (err) {
    next(err)
  }
})

export default router
