import { Router } from 'express'
import { body } from 'express-validator'
import Review from '../models/Review.js'
import Order from '../models/Order.js'
import VendorProfile from '../models/VendorProfile.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { ApiError } from '../middleware/error.js'

const router = Router()

/** Statuses that mean the buyer actually received the bird */
const REVIEWABLE_STATUSES = ['delivered', 'completed']

/**
 * GET /api/v1/reviews/mine — the current buyer's reviews
 * Used by the Orders page to know which orders were already reviewed.
 */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const reviews = await Review.find({ buyerId: req.user._id }).sort({ createdAt: -1 })
    res.json({ success: true, data: reviews })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/v1/reviews — leave a star rating + written review for an order.
 * The review is attached to both the product (pigeonId) and the seller (vendorId).
 */
router.post(
  '/',
  requireAuth,
  validate([
    body('orderId').isMongoId().withMessage('orderId is required'),
    body('rating').isInt({ min: 1, max: 5 }).toInt().withMessage('Rating must be 1-5 stars'),
    body('comment').optional().trim().isLength({ max: 2000 }),
  ]),
  async (req, res, next) => {
    try {
      const { orderId, rating, comment } = req.body

      // Order must exist and belong to this buyer
      const order = await Order.findOne({ _id: orderId, buyerId: req.user._id })
      if (!order) throw new ApiError(404, 'Order not found')

      if (!REVIEWABLE_STATUSES.includes(order.status)) {
        throw new ApiError(400, 'You can review an order after it has been delivered')
      }

      // One review per order
      const existing = await Review.findOne({ orderId: order._id })
      if (existing) throw new ApiError(409, 'You already reviewed this order')

      const review = await Review.create({
        orderId: order._id,
        buyerId: req.user._id,
        vendorId: order.vendorId,
        pigeonId: order.pigeonId,
        rating,
        comment,
      })

      // Recompute the seller's aggregate rating
      const agg = await Review.aggregate([
        { $match: { vendorId: order.vendorId } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ])
      if (agg.length > 0) {
        await VendorProfile.findByIdAndUpdate(order.vendorId, {
          rating: Math.round(agg[0].avg * 10) / 10,
          reviewCount: agg[0].count,
        })
      }

      res.status(201).json({ success: true, data: review })
    } catch (err) {
      next(err)
    }
  }
)

export default router
