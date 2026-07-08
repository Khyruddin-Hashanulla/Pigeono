import { Router } from 'express'
import mongoose from 'mongoose'
import { body } from 'express-validator'
import VendorProfile from '../models/VendorProfile.js'
import Pigeon from '../models/Pigeon.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { ApiError } from '../middleware/error.js'
import { PLANS, PLAN_IDS, planForApi } from '../config/plans.js'
import {
  createPaymentOrder,
  verifyPaymentSignature,
  simulatePayment,
  isRazorpayConfigured,
  generateReceiptNo,
} from '../services/razorpay.js'
import { notify } from '../services/notify.js'
import { activateSubscription } from '../services/subscription.js'

/**
 * Pending subscription orders awaiting payment verification.
 * Keyed by Razorpay order id; entries expire after 30 minutes.
 */
const pendingSubOrders = new Map()
function putPending(orderId, data) {
  pendingSubOrders.set(orderId, { ...data, expiresAt: Date.now() + 30 * 60 * 1000 })
  // opportunistic cleanup
  for (const [id, entry] of pendingSubOrders) {
    if (entry.expiresAt < Date.now()) pendingSubOrders.delete(id)
  }
}

const router = Router()

/** GET /api/v1/subscriptions/plans — public plan catalog */
router.get('/plans', (_req, res) => {
  res.json({ success: true, data: PLAN_IDS.map(planForApi) })
})

// everything below requires a vendor
router.use(requireAuth, requireRoles('vendor'))

async function loadVendor(req, _res, next) {
  const vendor = await VendorProfile.findOne({ userId: req.user._id })
  if (!vendor) return next(new ApiError(404, 'Vendor profile not found'))
  req.vendor = vendor
  next()
}
router.use(loadVendor)

/** GET /api/v1/subscriptions/me — current subscription + usage */
router.get('/me', async (req, res, next) => {
  try {
    const listingCount = await Pigeon.countDocuments({
      vendorId: req.vendor._id,
      status: mongoose.trusted({ $in: ['active', 'pending_approval', 'draft'] }),
    })
    const sub = req.vendor.subscription || {}
    const plan = sub.plan ? planForApi(sub.plan) : null
    res.json({
      success: true,
      data: {
        subscription: sub,
        plan,
        isActive: req.vendor.hasActiveSubscription(),
        listingCount,
        listingLimit: plan ? plan.listingLimit : 0,
      },
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/v1/subscriptions/create-order — step 1 of Razorpay checkout.
 * Creates a payment order for the chosen plan and returns everything the
 * client needs to open Razorpay Checkout (or the simulated test dialog).
 */
router.post(
  '/create-order',
  validate([body('plan').isIn(PLAN_IDS).withMessage('Choose a valid plan')]),
  async (req, res, next) => {
    try {
      const planId = req.body.plan
      const plan = PLANS[planId]
      const receiptNo = generateReceiptNo()
      const { order, keyId, simulated } = await createPaymentOrder({
        amountPaise: plan.priceINR * 100,
        receipt: receiptNo,
        notes: { vendorId: String(req.vendor._id), plan: planId, kind: 'subscription', receiptNo },
      })
      putPending(order.id, { vendorId: String(req.vendor._id), plan: planId, receiptNo, amount: plan.priceINR })

      // Test mode: pre-sign a simulated payment so the client can complete the flow
      const sim = simulated ? simulatePayment(order.id) : null

      res.json({
        success: true,
        data: {
          keyId,
          simulated,
          order: { id: order.id, amount: order.amount, currency: order.currency },
          plan: planForApi(planId),
          prefill: { name: req.user.name, email: req.user.email || '', contact: req.user.phone || '' },
          ...(sim ? { simPayment: sim } : {}),
        },
      })
    } catch (err) {
      next(err)
    }
  }
)

/**
 * POST /api/v1/subscriptions/verify — step 2 of Razorpay checkout.
 * Verifies the payment signature server-side, then activates/renews the plan.
 */
router.post(
  '/verify',
  validate([
    body('razorpay_order_id').isString().notEmpty(),
    body('razorpay_payment_id').isString().notEmpty(),
    body('razorpay_signature').isString().notEmpty(),
  ]),
  async (req, res, next) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

      const pending = pendingSubOrders.get(razorpay_order_id)
      if (!pending || pending.expiresAt < Date.now()) {
        throw new ApiError(400, 'Payment order not found or expired — start again')
      }
      if (pending.vendorId !== String(req.vendor._id)) {
        throw new ApiError(403, 'This payment order belongs to a different vendor')
      }

      const valid = verifyPaymentSignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      })
      if (!valid) throw new ApiError(400, 'Payment verification failed — signature mismatch')

      pendingSubOrders.delete(razorpay_order_id)

      const planId = pending.plan
      // Shared activation: handles renewals, upgrade/downgrade proration,
      // and idempotency (in case the Razorpay webhook already processed it).
      const { vendor } = await activateSubscription({
        vendorId: req.vendor._id,
        planId,
        amount: pending.amount,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        receiptNo: pending.receiptNo,
      })

      res.json({
        success: true,
        data: {
          subscription: vendor.subscription,
          plan: planForApi(planId),
          receiptNo: pending.receiptNo,
          razorpayConfigured: isRazorpayConfigured(),
        },
      })
    } catch (err) {
      next(err)
    }
  }
)

/** POST /api/v1/subscriptions/cancel — turn off auto-renew (plan runs out at period end) */
router.post('/cancel', async (req, res, next) => {
  try {
    if (!req.vendor.subscription?.plan) throw new ApiError(400, 'No subscription to cancel')
    req.vendor.subscription.autoRenew = false
    await req.vendor.save()
    await notify(req.user._id, {
      type: 'subscription',
      title: 'Auto-renew turned off',
      body: 'Your plan stays active until the end of the current period.',
      link: '/dashboard/vendor/subscription',
    })
    res.json({ success: true, data: req.vendor.subscription })
  } catch (err) {
    next(err)
  }
})

export default router
