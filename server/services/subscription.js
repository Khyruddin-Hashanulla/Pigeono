import VendorProfile from '../models/VendorProfile.js'
import { PLANS } from '../config/plans.js'
import { notify } from '../services/notify.js'
import { sendSubscriptionReceipt } from './email.js'
import User from '../models/User.js'

const DAY_MS = 24 * 60 * 60 * 1000
const PERIOD_DAYS = 30

/**
 * Activate / renew / switch a vendor's subscription plan.
 *
 * - Renewal of the SAME plan extends the current period by 30 days.
 * - Switching plans (upgrade/downgrade) prorates: the unused value of the
 *   old plan is converted into extra days on the new plan's price.
 * - Idempotent: if the payment (orderId) is already in history, it's a no-op.
 *
 * Returns { vendor, alreadyProcessed, periodEnd }.
 */
export async function activateSubscription({
  vendorId,
  planId,
  amount,
  orderId,
  paymentId,
  receiptNo,
}) {
  const vendor = await VendorProfile.findById(vendorId)
  if (!vendor) throw new Error('Vendor not found')
  const plan = PLANS[planId]
  if (!plan) throw new Error(`Unknown plan "${planId}"`)

  // Idempotency: payment.captured webhooks can arrive more than once,
  // and the client /verify call may race the webhook.
  const history = vendor.subscription?.history || []
  if (orderId && history.some((h) => h.reference === orderId)) {
    return { vendor, alreadyProcessed: true, periodEnd: vendor.subscription.currentPeriodEnd }
  }

  const now = new Date()
  const sub = vendor.subscription
  const hasActive = vendor.hasActiveSubscription()
  const isSamePlan = sub?.plan === planId && hasActive

  let periodEnd
  if (isSamePlan) {
    // Renewal: extend the existing period
    periodEnd = new Date(new Date(sub.currentPeriodEnd).getTime() + PERIOD_DAYS * DAY_MS)
  } else if (hasActive && sub?.plan && PLANS[sub.plan]) {
    // Plan switch with time left: prorate unused value into extra days
    const oldPlan = PLANS[sub.plan]
    const remainingMs = Math.max(0, new Date(sub.currentPeriodEnd).getTime() - now.getTime())
    const remainingDays = remainingMs / DAY_MS
    const unusedValue = (oldPlan.priceINR / PERIOD_DAYS) * remainingDays
    const bonusDays = Math.floor((unusedValue / plan.priceINR) * PERIOD_DAYS)
    periodEnd = new Date(now.getTime() + (PERIOD_DAYS + bonusDays) * DAY_MS)
  } else {
    // Fresh subscription
    periodEnd = new Date(now.getTime() + PERIOD_DAYS * DAY_MS)
  }

  const prevSub = sub?.toObject?.() ?? sub ?? {}
  vendor.subscription = {
    ...prevSub,
    plan: planId,
    status: 'active',
    startedAt: prevSub.startedAt || now,
    currentPeriodEnd: periodEnd,
    autoRenew: true,
    renewalReminderSentFor: null,
    expiryNotifiedFor: null,
    limitNotifiedAt: null,
    history: [
      ...history,
      {
        plan: planId,
        amount,
        paidAt: now,
        reference: orderId,
        paymentId,
        receiptNo,
        periodEnd,
      },
    ],
  }
  await vendor.save()

  // Fire-and-forget notifications
  notify(vendor.userId, {
    type: 'subscription',
    title: `${plan.name} plan activated`,
    body: `Payment received (receipt ${receiptNo}). Your ${plan.name} subscription is active until ${periodEnd.toLocaleDateString('en-IN')}.`,
    link: '/dashboard/vendor/subscription',
  })
  User.findById(vendor.userId)
    .then((user) => user && sendSubscriptionReceipt(user, { planName: plan.name, amount, receiptNo, periodEnd }))
    .catch(() => {})

  return { vendor, alreadyProcessed: false, periodEnd }
}

/** Mark a failed subscription payment and notify the vendor. */
export async function recordFailedSubscriptionPayment({ vendorId, planId, orderId }) {
  const vendor = await VendorProfile.findById(vendorId)
  if (!vendor) return
  const plan = PLANS[planId]
  notify(vendor.userId, {
    type: 'subscription',
    title: 'Subscription payment failed',
    body: `Your payment for the ${plan?.name || planId} plan did not go through${orderId ? ` (order ${orderId})` : ''}. Please try again.`,
    link: '/dashboard/vendor/subscription',
  })
}
