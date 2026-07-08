import crypto from 'node:crypto'
import Razorpay from 'razorpay'

/**
 * Razorpay payment service with a built-in simulated test mode.
 *
 * Real mode: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET. Orders are created
 * on Razorpay and payments are verified with the official HMAC signature.
 *
 * Simulated mode (no keys): orders are created locally with the same shape,
 * and a signed simulated payment lets the full checkout flow run end-to-end
 * so the product is demonstrable before keys are added.
 */

const KEY_ID = process.env.RAZORPAY_KEY_ID || ''
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || ''
// Secret used only to sign simulated payments so they can't be forged trivially
const SIM_SECRET = process.env.JWT_SECRET || 'pigeono-sim-payments'

export function isRazorpayConfigured() {
  return Boolean(KEY_ID && KEY_SECRET)
}

let client = null
function getClient() {
  if (!client) client = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET })
  return client
}

/** Create a payment order (real Razorpay order, or simulated locally). */
export async function createPaymentOrder({ amountPaise, receipt, notes = {} }) {
  if (isRazorpayConfigured()) {
    const order = await getClient().orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes,
    })
    return { order, keyId: KEY_ID, simulated: false }
  }
  // SECURITY: simulated payments are for dev/demo only. In production they
  // would let anyone activate a paid subscription for free.
  if (process.env.NODE_ENV === 'production') {
    const err = new Error('Payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.')
    err.statusCode = 503
    throw err
  }
  const id = `order_sim_${crypto.randomBytes(8).toString('hex')}`
  return {
    order: { id, amount: amountPaise, currency: 'INR', receipt, notes },
    keyId: 'rzp_test_simulated',
    simulated: true,
  }
}

function hmac(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

/** Produce a signed simulated payment for an order (test mode only). */
export function simulatePayment(orderId) {
  const paymentId = `pay_sim_${crypto.randomBytes(8).toString('hex')}`
  const signature = hmac(SIM_SECRET, `${orderId}|${paymentId}`)
  return { paymentId, signature }
}

/** Verify a payment signature (Razorpay HMAC in real mode, sim HMAC otherwise). */
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) return false
  const secret = isRazorpayConfigured() ? KEY_SECRET : SIM_SECRET
  const expected = hmac(secret, `${orderId}|${paymentId}`)
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

/** Sequential-looking, unique receipt number, e.g. PGN-2026-8F3A2C */
export function generateReceiptNo() {
  const year = new Date().getFullYear()
  return `PGN-${year}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}
