import { PLANS } from '../config/plans.js'
import { notify } from '../services/notify.js'

const DAY_MS = 24 * 60 * 60 * 1000
/** Send the renewal reminder when this many days (or fewer) remain */
const REMINDER_DAYS = 3

/**
 * Lazy subscription sweep — called whenever a vendor touches the API,
 * so no cron job is needed. Sends each alert at most once per period:
 *  - renewal reminder when <= 3 days remain (renewalReminderSentFor)
 *  - expiry notice once the period has lapsed (expiryNotifiedFor)
 */
export async function sweepSubscriptionAlerts(vendor) {
  const sub = vendor.subscription
  if (!sub?.plan || !sub.currentPeriodEnd) return

  const plan = PLANS[sub.plan]
  const periodEnd = new Date(sub.currentPeriodEnd)
  const msLeft = periodEnd.getTime() - Date.now()
  const periodKey = periodEnd.getTime()
  let changed = false

  if (msLeft <= 0 && sub.status === 'active') {
    // Period lapsed: mark expired + notify once
    sub.status = 'expired'
    changed = true
    if (new Date(sub.expiryNotifiedFor || 0).getTime() !== periodKey) {
      sub.expiryNotifiedFor = periodEnd
      await notify(vendor.userId, {
        type: 'subscription',
        title: `${plan?.name || 'Your'} plan has expired`,
        body: 'Your subscription has ended, so new listings are paused. Renew now to keep selling.',
        link: '/dashboard/vendor/subscription',
      })
    }
  } else if (msLeft > 0 && msLeft <= REMINDER_DAYS * DAY_MS && sub.status === 'active') {
    // Renewal window: remind once per period
    if (new Date(sub.renewalReminderSentFor || 0).getTime() !== periodKey) {
      sub.renewalReminderSentFor = periodEnd
      changed = true
      const daysLeft = Math.max(1, Math.ceil(msLeft / DAY_MS))
      await notify(vendor.userId, {
        type: 'subscription',
        title: `${plan?.name || 'Your'} plan renews in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
        body: `Your subscription ends on ${periodEnd.toLocaleDateString('en-IN')}. Renew to keep your listings live and create new ones.`,
        link: '/dashboard/vendor/subscription',
      })
    }
  }

  if (changed) await vendor.save()
}

/**
 * Notify the vendor once per period when they exhaust their listing limit.
 * Called after a listing-create attempt hits the limit (or reaches it exactly).
 */
export async function notifyListingLimitReached(vendor, { used, limit }) {
  const sub = vendor.subscription
  if (!sub) return
  // At most once per 24h so repeated attempts don't spam
  if (sub.limitNotifiedAt && Date.now() - new Date(sub.limitNotifiedAt).getTime() < DAY_MS) return
  sub.limitNotifiedAt = new Date()
  await vendor.save()
  const plan = PLANS[sub.plan]
  await notify(vendor.userId, {
    type: 'subscription',
    title: 'Listing limit reached',
    body: `You are using ${used} of ${limit} listings on the ${plan?.name || sub.plan} plan. Upgrade or renew to create your next listing.`,
    link: '/dashboard/vendor/subscription',
  })
}
