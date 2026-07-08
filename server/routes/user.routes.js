import { Router } from 'express'
import { body, param } from 'express-validator'
import User from '../models/User.js'
import Pigeon from '../models/Pigeon.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { ApiError } from '../middleware/error.js'
import { INDIAN_STATES } from '../config/plans.js'

const router = Router()

router.use(requireAuth)

/* ---------------------------- Wishlist ---------------------------- */

/** GET /api/v1/users/wishlist — populated wishlist */
router.get('/wishlist', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      populate: { path: 'vendorId', select: 'storeName storeSlug rating reviewCount' },
    })
    // hide listings that were deleted or are no longer public
    const items = (user.wishlist || []).filter(
      (p) => p && ['active', 'sold'].includes(p.status)
    )
    res.json({ success: true, data: items })
  } catch (err) {
    next(err)
  }
})

/** POST /api/v1/users/wishlist/:pigeonId — toggle wishlist entry */
router.post(
  '/wishlist/:pigeonId',
  validate([param('pigeonId').isMongoId()]),
  async (req, res, next) => {
    try {
      const pigeon = await Pigeon.findById(req.params.pigeonId)
      if (!pigeon) throw new ApiError(404, 'Listing not found')
      const user = await User.findById(req.user._id)
      const idx = user.wishlist.findIndex((id) => id.toString() === req.params.pigeonId)
      let wishlisted
      if (idx >= 0) {
        user.wishlist.splice(idx, 1)
        wishlisted = false
      } else {
        user.wishlist.push(pigeon._id)
        wishlisted = true
      }
      await user.save()
      res.json({ success: true, data: { wishlisted, count: user.wishlist.length } })
    } catch (err) {
      next(err)
    }
  }
)

/** GET /api/v1/users/wishlist/ids — bare id list (for heart states) */
router.get('/wishlist/ids', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
    res.json({ success: true, data: (user.wishlist || []).map((id) => id.toString()) })
  } catch (err) {
    next(err)
  }
})

/* ---------------------------- Cart ---------------------------- */
// Each pigeon is a unique bird (stock of 1 in practice), so the cart is a
// simple set of listing ids — no quantities.

/** GET /api/v1/users/cart — populated cart (drops sold/removed listings) */
router.get('/cart', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'cart',
      populate: { path: 'vendorId', select: 'storeName storeSlug rating reviewCount' },
    })
    const items = (user.cart || []).filter((p) => p && p.status === 'active')
    // prune dead entries so the badge count stays accurate
    if (items.length !== (user.cart || []).length) {
      user.cart = items.map((p) => p._id)
      await user.save()
    }
    res.json({ success: true, data: items })
  } catch (err) {
    next(err)
  }
})

/** POST /api/v1/users/cart/:pigeonId — add to cart */
router.post(
  '/cart/:pigeonId',
  validate([param('pigeonId').isMongoId()]),
  async (req, res, next) => {
    try {
      const pigeon = await Pigeon.findById(req.params.pigeonId)
      if (!pigeon || pigeon.status !== 'active') throw new ApiError(404, 'Listing not available')
      const user = await User.findById(req.user._id)
      if (!user.cart.some((id) => id.toString() === req.params.pigeonId)) {
        user.cart.push(pigeon._id)
        await user.save()
      }
      res.json({ success: true, data: { count: user.cart.length } })
    } catch (err) {
      next(err)
    }
  }
)

/** DELETE /api/v1/users/cart/:pigeonId — remove from cart */
router.delete(
  '/cart/:pigeonId',
  validate([param('pigeonId').isMongoId()]),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id)
      user.cart = user.cart.filter((id) => id.toString() !== req.params.pigeonId)
      await user.save()
      res.json({ success: true, data: { count: user.cart.length } })
    } catch (err) {
      next(err)
    }
  }
)

/* ---------------------------- Addresses ---------------------------- */

const addressValidation = [
  body('label').optional().trim().isLength({ max: 40 }),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phone')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number'),
  body('line1').trim().notEmpty().withMessage('Address line is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').isIn(INDIAN_STATES).withMessage('Choose an Indian state'),
  body('pincode')
    .trim()
    .matches(/^[1-9]\d{5}$/)
    .withMessage('Enter a valid 6-digit pincode'),
  body('landmark').optional().trim().isLength({ max: 200 }),
]

/** GET /api/v1/users/addresses */
router.get('/addresses', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
    res.json({ success: true, data: user.addresses || [] })
  } catch (err) {
    next(err)
  }
})

/** POST /api/v1/users/addresses — add (max 5) */
router.post('/addresses', validate(addressValidation), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
    if ((user.addresses || []).length >= 5) throw new ApiError(400, 'Maximum 5 saved addresses')
    const { label, fullName, phone, line1, city, state, pincode, landmark } = req.body
    user.addresses.push({ label, fullName, phone, line1, city, state, pincode, landmark })
    await user.save()
    res.status(201).json({ success: true, data: user.addresses })
  } catch (err) {
    next(err)
  }
})

/** DELETE /api/v1/users/addresses/:addressId */
router.delete(
  '/addresses/:addressId',
  validate([param('addressId').isMongoId()]),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id)
      const before = user.addresses.length
      user.addresses = user.addresses.filter((a) => a._id.toString() !== req.params.addressId)
      if (user.addresses.length === before) throw new ApiError(404, 'Address not found')
      await user.save()
      res.json({ success: true, data: user.addresses })
    } catch (err) {
      next(err)
    }
  }
)

/* ---------------------------- Profile & security ---------------------------- */

/** PATCH /api/v1/users/profile — name/phone */
router.patch(
  '/profile',
  validate([
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name is required'),
    body('phone')
      .optional({ values: 'falsy' })
      .trim()
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Enter a valid 10-digit Indian mobile number'),
  ]),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id)
      user.name = req.body.name
      if (req.body.phone !== undefined) user.phone = req.body.phone
      await user.save()
      res.json({ success: true, data: user.toSafeJSON() })
    } catch (err) {
      next(err)
    }
  }
)

/** POST /api/v1/users/change-password */
router.post(
  '/change-password',
  validate([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8, max: 100 })
      .withMessage('New password must be at least 8 characters'),
  ]),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id).select('+password')
      const ok = await user.comparePassword(req.body.currentPassword)
      if (!ok) throw new ApiError(401, 'Current password is incorrect')
      user.password = req.body.newPassword
      await user.save()
      res.json({ success: true, message: 'Password updated' })
    } catch (err) {
      next(err)
    }
  }
)

export default router
