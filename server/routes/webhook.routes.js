import { Router } from 'express'
import express from 'express'
import crypto from 'node:crypto'
import { activateSubscription, recordFailedSubscriptionPayment } from '../services/subscription.js'
import { generateReceiptNo } from '../services/razorpay.js'

/**
 * Razorpay webhooks.
 *
 * Mounted BEFORE the global express.json() so we get the raw body for
 * HMAC signature verification (Razorpay signs the exact payload bytes).
 *
 * Configure in the Razorpay dashboard:
 *   URL:    https://<your-domain>/api/v1/webhooks/razorpay
 *   Secret: RAZORPAY_WEBHOOK_SECRET
 *   Events: payment.captured, payment.failed
 */

const router = Router()

function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-razorpay-signature']
  if (!verifyWebhookSignature(req.body, signature)) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' })
  }

  let event
  try {
    event = JSON.parse(req.body.toString('utf8'))
  } catch {
    return res.status(400).json({ success: false, message: 'Malformed payload' })
  }

  try {
    const payment = event.payload?.payment?.entity
    const notes = payment?.notes || {}

    if (event.event === 'payment.captured' && notes.kind === 'subscription') {
      const { alreadyProcessed } = await activateSubscription({
        vendorId: notes.vendorId,
        planId: notes.plan,
        amount: Math.round((payment.amount || 0) / 100),
        orderId: payment.order_id,
        paymentId: payment.id,
        receiptNo: notes.receiptNo || generateReceiptNo(),
      })
      return res.json({ success: true, processed: !alreadyProcessed })
    }

    if (event.event === 'payment.failed' && notes.kind === 'subscription') {
      await recordFailedSubscriptionPayment({
        vendorId: notes.vendorId,
        planId: notes.plan,
        orderId: payment.order_id,
      })
      return res.json({ success: true })
    }

    // Acknowledge unhandled events so Razorpay doesn't retry them
    res.json({ success: true, ignored: true })
  } catch (err) {
    console.error('[webhook] razorpay handler error:', err.message)
    // 500 → Razorpay will retry with backoff
    res.status(500).json({ success: false })
  }
})

export default router
