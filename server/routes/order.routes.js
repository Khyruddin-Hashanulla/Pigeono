import { Router } from 'express'
import { body, param } from 'express-validator'
import Order from '../models/Order.js'
import Pigeon from '../models/Pigeon.js'
import User from '../models/User.js'
import VendorProfile from '../models/VendorProfile.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { ApiError } from '../middleware/error.js'
import { generateReceiptNo } from '../services/razorpay.js'
import { notify } from '../services/notify.js'
import { sendOrderNotificationEmail } from '../services/email.js'

/**
 * DIRECT VENDOR PAYMENT MODEL
 * ---------------------------
 * Pigeono is a lead-generation/contact marketplace: the buyer pays the
 * VENDOR directly (UPI / bank transfer / cash). The platform never holds
 * purchase money — only vendor subscription revenue goes to the platform.
 *
 * Flow: pending → (vendor confirms buyer's payment) confirmed_by_vendor →
 *       completed | cancelled. Buyers may flag a dispute at any active stage.
 */

const router = Router()

function pushEvent(order, status, by, note) {
  order.timeline.push({ status, by, note })
}

async function loadOrderForParty(orderId, user) {
  const order = await Order.findById(orderId)
    .populate({ path: 'vendorId', select: 'storeName storeSlug userId payoutDetails' })
    .populate({ path: 'buyerId', select: 'name email phone' })
  if (!order) throw new ApiError(404, 'Order not found')
  const isBuyer = order.buyerId._id.toString() === user._id.toString()
  const isVendor = order.vendorId.userId?.toString() === user._id.toString()
  const isAdmin = user.roles.includes('admin')
  if (!isBuyer && !isVendor && !isAdmin) throw new ApiError(403, 'Not your order')
  return { order, isBuyer, isVendor, isAdmin }
}

/* ------------------------------------------------------------------ */
/* POST /orders — record purchase intent; NO payment is processed      */
/* Returns the vendor's payment instructions for direct payment.       */
/* ------------------------------------------------------------------ */
router.post(
  '/',
  requireAuth,
  validate([
    body('pigeonId').isMongoId(),
    body('delivery.method').isIn(['shipping', 'pickup']),
    body('delivery.address.fullName').if(body('delivery.method').equals('shipping')).trim().notEmpty(),
    body('delivery.address.line1').if(body('delivery.method').equals('shipping')).trim().notEmpty(),
    body('delivery.address.city').if(body('delivery.method').equals('shipping')).trim().notEmpty(),
    body('delivery.address.country').if(body('delivery.method').equals('shipping')).trim().notEmpty(),
    body('vendorPaymentMethod').optional().isIn(['upi', 'bank_transfer', 'cash', 'other']),
  ]),
  async (req, res, next) => {
    try {
      const pigeon = await Pigeon.findOne({ _id: req.body.pigeonId, status: 'active' }).populate('vendorId')
      if (!pigeon) throw new ApiError(404, 'Listing not found or no longer available')
      if (pigeon.stock < 1) throw new ApiError(409, 'This bird is sold out')

      const vendor = pigeon.vendorId
      if (!vendor || vendor.status !== 'approved') throw new ApiError(409, 'Seller is not active')
      if (vendor.userId.toString() === req.user._id.toString()) {
        throw new ApiError(400, 'You cannot buy your own listing')
      }

      const paymentInstructions = vendor.paymentInstructions()

      const order = new Order({
        buyerId: req.user._id,
        vendorId: vendor._id,
        pigeonId: pigeon._id,
        itemSnapshot: {
          title: pigeon.title,
          breed: pigeon.breed,
          price: pigeon.price,
          photo: pigeon.media?.photos?.[0] || '',
        },
        totalAmount: pigeon.price,
        status: 'pending',
        paymentStatus: 'pending',
        vendorPaymentMethod: req.body.vendorPaymentMethod || undefined,
        vendorPaymentDetails: paymentInstructions,
        payment: { provider: 'direct', receiptNo: generateReceiptNo() },
        delivery: {
          method: req.body.delivery.method,
          address: req.body.delivery.method === 'shipping' ? req.body.delivery.address : undefined,
        },
      })
      pushEvent(order, 'pending', 'buyer', 'Order placed — buyer will pay the seller directly')
      await order.save()

      // Reserve the bird while the direct sale is arranged
      pigeon.stock -= 1
      if (pigeon.stock <= 0) pigeon.status = 'sold'
      await pigeon.save()

      // Notifications (fire-and-forget)
      notify(vendor.userId, {
        type: 'order',
        title: 'New order received',
        body: `${pigeon.title} — ₹${pigeon.price.toLocaleString('en-IN')}. The buyer will pay you directly.`,
        link: '/dashboard/vendor/sales',
      })
      notify(req.user._id, {
        type: 'order',
        title: 'Order placed',
        body: `Pay the seller directly for ${pigeon.title} using their payment details.`,
        link: '/dashboard/orders',
      })
      User.findById(vendor.userId)
        .then((vendorUser) =>
          sendOrderNotificationEmail(vendorUser, {
            orderId: order._id.toString(),
            pigeonName: pigeon.title,
            buyerName: req.user.name,
            amount: Math.round(pigeon.price * 100),
          })
        )
        .catch(() => {})

      res.status(201).json({
        success: true,
        message: 'Order placed. Pay the seller directly using their payment details.',
        data: { order, paymentInstructions },
      })
    } catch (err) {
      next(err)
    }
  }
)

/* ------------------------------------------------------------------ */
/* GET /orders — buyer's orders (paginated)                            */
/* ------------------------------------------------------------------ */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
    const filter = { buyerId: req.user._id }
    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: 'vendorId', select: 'storeName storeSlug' }),
      Order.countDocuments(filter),
    ])
    res.json({ success: true, data: orders, page, limit, totalCount })
  } catch (err) {
    next(err)
  }
})

/* ------------------------------------------------------------------ */
/* GET /orders/sales — vendor's incoming orders (paginated)            */
/* ------------------------------------------------------------------ */
router.get('/sales', requireAuth, async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ userId: req.user._id })
    if (!vendor) throw new ApiError(403, 'You are not a vendor')
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
    const filter = { vendorId: vendor._id }
    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: 'buyerId', select: 'name phone' }),
      Order.countDocuments(filter),
    ])
    res.json({ success: true, data: orders, page, limit, totalCount })
  } catch (err) {
    next(err)
  }
})

/* ------------------------------------------------------------------ */
/* GET /orders/:id — single order (buyer or vendor party only)         */
/* ------------------------------------------------------------------ */
router.get(
  '/:id',
  requireAuth,
  validate([param('id').isMongoId()]),
  async (req, res, next) => {
    try {
      const { order } = await loadOrderForParty(req.params.id, req.user)
      res.json({ success: true, data: order })
    } catch (err) {
      next(err)
    }
  }
)

/* ------------------------------------------------------------------ */
/* GET /orders/:id/receipt — order summary + vendor payment details    */
/* ------------------------------------------------------------------ */
router.get(
  '/:id/receipt',
  requireAuth,
  validate([param('id').isMongoId()]),
  async (req, res, next) => {
    try {
      const { order } = await loadOrderForParty(req.params.id, req.user)
      // Lazy backfill for orders created before receipt numbers existed
      if (!order.payment?.receiptNo) {
        order.payment = order.payment || {}
        order.payment.receiptNo = generateReceiptNo()
        await order.save()
      }
      res.json({
        success: true,
        data: {
          receiptNo: order.payment.receiptNo,
          orderId: order._id,
          createdAt: order.createdAt,
          item: order.itemSnapshot,
          totalAmount: order.totalAmount,
          delivery: order.delivery,
          status: order.status,
          paymentStatus: order.paymentStatus,
          vendorPaymentMethod: order.vendorPaymentMethod || null,
          paymentInstructions:
            order.vendorPaymentDetails && (order.vendorPaymentDetails.upiId || order.vendorPaymentDetails.bank || order.vendorPaymentDetails.phoneNumber)
              ? order.vendorPaymentDetails
              : order.vendorId.paymentInstructions?.() || null,
          buyer: { name: order.buyerId.name, email: order.buyerId.email, phone: order.buyerId.phone },
          seller: { storeName: order.vendorId.storeName, storeSlug: order.vendorId.storeSlug },
          // Legacy escrow receipt data for old orders
          legacyPayment: order.payment?.paidAt
            ? { provider: order.payment.provider, reference: order.payment.reference, paidAt: order.payment.paidAt }
            : null,
        },
      })
    } catch (err) {
      next(err)
    }
  }
)

/* ------------------------------------------------------------------ */
/* POST /orders/:id/buyer-paid — buyer says "I've paid the seller"     */
/* ------------------------------------------------------------------ */
router.post(
  '/:id/buyer-paid',
  requireAuth,
  validate([
    param('id').isMongoId(),
    body('method').optional().isIn(['upi', 'bank_transfer', 'cash', 'other']),
  ]),
  async (req, res, next) => {
    try {
      const order = await Order.findOne({ _id: req.params.id, buyerId: req.user._id }).populate({
        path: 'vendorId',
        select: 'userId storeName',
      })
      if (!order) throw new ApiError(404, 'Order not found')
      if (!['pending'].includes(order.status)) {
        throw new ApiError(409, `Cannot mark paid from status "${order.status}"`)
      }
      if (order.paymentStatus !== 'pending') throw new ApiError(409, 'Payment already marked')
      order.paymentStatus = 'paid_by_buyer'
      if (req.body.method) order.vendorPaymentMethod = req.body.method
      pushEvent(order, 'paid_by_buyer', 'buyer', 'Buyer says payment has been sent to the seller')
      await order.save()
      notify(order.vendorId.userId, {
        type: 'order',
        title: 'Buyer marked payment sent',
        body: `${order.itemSnapshot.title} — check your account and confirm the payment.`,
        link: '/dashboard/vendor/sales',
      })
      res.json({ success: true, data: order })
    } catch (err) {
      next(err)
    }
  }
)

/* ------------------------------------------------------------------ */
/* POST /orders/:id/mark-paid — vendor confirms payment received       */
/* ------------------------------------------------------------------ */
router.post(
  '/:id/mark-paid',
  requireAuth,
  validate([param('id').isMongoId(), body('note').optional().trim().isLength({ max: 500 })]),
  async (req, res, next) => {
    try {
      const vendor = await VendorProfile.findOne({ userId: req.user._id })
      if (!vendor) throw new ApiError(403, 'You are not a vendor')
      const order = await Order.findOne({ _id: req.params.id, vendorId: vendor._id })
      if (!order) throw new ApiError(404, 'Order not found')
      if (!['pending'].includes(order.status)) {
        throw new ApiError(409, `Cannot confirm payment from status "${order.status}"`)
      }
      order.paymentStatus = 'confirmed'
      order.status = 'confirmed_by_vendor'
      order.payment.paidAt = new Date()
      pushEvent(order, 'confirmed_by_vendor', 'vendor', req.body.note || 'Seller confirmed payment received')
      await order.save()
      notify(order.buyerId, {
        type: 'order',
        title: 'Payment confirmed',
        body: `The seller confirmed your payment for ${order.itemSnapshot.title}.`,
        link: '/dashboard/orders',
      })
      res.json({ success: true, data: order })
    } catch (err) {
      next(err)
    }
  }
)

/* ------------------------------------------------------------------ */
/* POST /orders/:id/complete — vendor marks the sale complete          */
/* ------------------------------------------------------------------ */
router.post(
  '/:id/complete',
  requireAuth,
  validate([param('id').isMongoId(), body('note').optional().trim().isLength({ max: 500 })]),
  async (req, res, next) => {
    try {
      const vendor = await VendorProfile.findOne({ userId: req.user._id })
      if (!vendor) throw new ApiError(403, 'You are not a vendor')
      const order = await Order.findOne({ _id: req.params.id, vendorId: vendor._id })
      if (!order) throw new ApiError(404, 'Order not found')
      if (order.status !== 'confirmed_by_vendor') {
        throw new ApiError(409, `Cannot complete from status "${order.status}"`)
      }
      if (order.dispute.isOpen) throw new ApiError(409, 'Order is under dispute')
      order.status = 'completed'
      pushEvent(order, 'completed', 'vendor', req.body.note || 'Bird handed over — sale complete')
      await order.save()
      await VendorProfile.updateOne({ _id: order.vendorId }, { $inc: { totalSales: 1 } })
      notify(order.buyerId, {
        type: 'order',
        title: 'Order completed',
        body: `Your purchase of ${order.itemSnapshot.title} is complete. Happy flying!`,
        link: '/dashboard/orders',
      })
      res.json({ success: true, data: order })
    } catch (err) {
      next(err)
    }
  }
)

/* ------------------------------------------------------------------ */
/* POST /orders/:id/cancel — buyer or vendor cancels a pending order   */
/* ------------------------------------------------------------------ */
router.post(
  '/:id/cancel',
  requireAuth,
  validate([param('id').isMongoId(), body('reason').optional().trim().isLength({ max: 500 })]),
  async (req, res, next) => {
    try {
      const { order, isBuyer, isVendor } = await loadOrderForParty(req.params.id, req.user)
      if (!['pending'].includes(order.status)) {
        throw new ApiError(409, `Cannot cancel from status "${order.status}"`)
      }
      if (order.paymentStatus === 'confirmed') {
        throw new ApiError(409, 'Payment already confirmed — open a dispute instead')
      }
      order.status = 'cancelled'
      pushEvent(order, 'cancelled', isBuyer ? 'buyer' : isVendor ? 'vendor' : 'admin', req.body.reason || 'Order cancelled')
      await order.save()
      // Put the bird back on the market
      await Pigeon.updateOne(
        { _id: order.pigeonId, status: 'sold' },
        { $set: { status: 'active' }, $inc: { stock: 1 } }
      )
      const counterpartyId = isBuyer ? order.vendorId.userId : order.buyerId._id
      notify(counterpartyId, {
        type: 'order',
        title: 'Order cancelled',
        body: `${order.itemSnapshot.title} — ${req.body.reason || 'the order was cancelled'}.`,
        link: isBuyer ? '/dashboard/vendor/sales' : '/dashboard/orders',
      })
      res.json({ success: true, data: order })
    } catch (err) {
      next(err)
    }
  }
)

/* ------------------------------------------------------------------ */
/* POST /orders/:id/dispute — buyer opens a dispute                    */
/* ------------------------------------------------------------------ */
router.post(
  '/:id/dispute',
  requireAuth,
  validate([param('id').isMongoId(), body('reason').trim().isLength({ min: 10, max: 1000 })]),
  async (req, res, next) => {
    try {
      const order = await Order.findOne({ _id: req.params.id, buyerId: req.user._id })
      if (!order) throw new ApiError(404, 'Order not found')
      if (!['pending', 'confirmed_by_vendor'].includes(order.status)) {
        throw new ApiError(409, `Cannot open a dispute from status "${order.status}"`)
      }
      order.status = 'disputed'
      order.dispute = { isOpen: true, reason: req.body.reason, openedAt: new Date() }
      pushEvent(order, 'disputed', 'buyer', req.body.reason)
      await order.save()
      res.json({ success: true, data: order })
    } catch (err) {
      next(err)
    }
  }
)

export default router
