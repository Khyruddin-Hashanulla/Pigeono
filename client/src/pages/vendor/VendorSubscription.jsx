import { useState } from 'react'
import { Check, Crown, Sparkles, ShieldCheck, X, CreditCard } from 'lucide-react'
import { api, apiErrorMessage } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { LoadingState, ErrorState } from '../../components/States'
import VendorNav from '../../components/VendorNav'
import { openRazorpayCheckout } from '../../lib/razorpayCheckout'

const PLAN_ICONS = { basic: ShieldCheck, pro: Sparkles, elite: Crown }

/** Build a displayable feature list from the plan flags returned by the API */
function planFeatures(plan) {
  const features = [
    plan.listingLimit == null ? 'Unlimited listings' : `Up to ${plan.listingLimit} active listings`,
    plan.analytics === 'premium'
      ? 'Premium analytics & sales trends'
      : plan.analytics === 'full'
        ? 'Full listing-level analytics'
        : 'Basic analytics summary',
  ]
  if (plan.featuredShop) features.push('Featured shop badge')
  if (plan.homepagePromotion) features.push('Homepage loft promotion')
  if (plan.prioritySupport) features.push('Priority support')
  features.push('Escrow-protected payments', 'Verified pedigree submissions')
  return features
}

function formatINR(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function VendorSubscription() {
  const plans = useFetch('/subscriptions/plans')
  const mine = useFetch('/subscriptions/me')
  const [busy, setBusy] = useState(null) // plan id being purchased
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // Simulated test-mode payment awaiting user confirmation
  const [simOrder, setSimOrder] = useState(null)

  if (plans.loading || mine.loading) return <LoadingState label="Loading subscription..." />
  if (plans.error) return <ErrorState message={plans.error} onRetry={plans.refetch} />

  const catalog = plans.data?.data ?? []
  const current = mine.data?.data
  const sub = current?.subscription
  const isActive = current?.isActive

  /** Complete checkout by verifying the payment server-side */
  const verifyPayment = async (payload) => {
    const res = await api.post('/subscriptions/verify', payload)
    const data = res.data?.data
    setSuccess(
      `${data?.plan?.name || 'Plan'} activated — payment of ${formatINR(data?.plan?.priceINR || 0)} received. Receipt ${data?.receiptNo}.`
    )
    mine.refetch()
  }

  const subscribe = async (planId) => {
    setBusy(planId)
    setError('')
    setSuccess('')
    try {
      // Step 1: create the payment order
      const res = await api.post('/subscriptions/create-order', { plan: planId })
      const data = res.data?.data

      if (data.simulated) {
        // Test mode: show the simulated payment dialog instead of Razorpay
        setSimOrder(data)
        return
      }

      // Real mode: open Razorpay Checkout, then verify the signature
      const response = await openRazorpayCheckout({
        keyId: data.keyId,
        order: data.order,
        name: 'Pigeono',
        description: `${data.plan.name} plan — 30 days`,
        prefill: data.prefill,
      })
      await verifyPayment({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      })
    } catch (err) {
      setError(err?.message === 'Payment cancelled' ? 'Payment cancelled.' : apiErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  /** Confirm button inside the simulated test-mode dialog */
  const confirmSimPayment = async () => {
    const order = simOrder
    setBusy(order.plan.id)
    setError('')
    try {
      await verifyPayment({
        razorpay_order_id: order.order.id,
        razorpay_payment_id: order.simPayment.paymentId,
        razorpay_signature: order.simPayment.signature,
      })
      setSimOrder(null)
    } catch (err) {
      setError(apiErrorMessage(err))
      setSimOrder(null)
    } finally {
      setBusy(null)
    }
  }

  const cancelAutoRenew = async () => {
    if (!window.confirm('Turn off auto-renew? Your plan stays active until the period ends.')) return
    setError('')
    try {
      await api.post('/subscriptions/cancel')
      mine.refetch()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <>
      <VendorNav />

      {/* Simulated Razorpay dialog (test mode, until real keys are added) */}
      {simOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sim-pay-title"
        >
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <CreditCard className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="sim-pay-title" className="font-bold">
                    Razorpay — Test Mode
                  </h2>
                  <p className="text-xs text-muted-foreground">Simulated payment (no real money)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSimOrder(null)}
                aria-label="Cancel payment"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <dl className="mt-5 flex flex-col gap-2 rounded-lg bg-secondary p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-semibold">{simOrder.plan.name} — 30 days</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-serif text-lg font-bold">{formatINR(simOrder.order.amount / 100)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Order</dt>
                <dd className="font-mono text-xs">{simOrder.order.id.slice(0, 22)}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={confirmSimPayment}
              disabled={busy !== null}
              className="mt-5 w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Verifying payment...' : `Pay ${formatINR(simOrder.order.amount / 100)}`}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to switch to real payments.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-serif text-2xl font-bold">Subscription</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A monthly subscription is required to list birds on Pigeono. Pay online — your plan
          activates instantly.
        </p>

        {/* Current plan status */}
        {sub?.plan && (
          <div className="mt-6 rounded-lg border border-border bg-secondary p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold capitalize">
                  Current plan: {sub.plan}
                  <span
                    className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive ? 'bg-accent text-accent-foreground' : 'bg-destructive/15 text-destructive'
                    }`}
                  >
                    {isActive ? 'Active' : 'Expired'}
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isActive
                    ? `Valid until ${new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : 'Renew below to continue selling.'}
                  {' · '}Listings used: {current.listingCount}
                  {current.listingLimit != null ? ` / ${current.listingLimit}` : ' (unlimited)'}
                  {isActive && !sub.autoRenew && ' · Auto-renew off'}
                </p>
              </div>
              {isActive && sub.autoRenew && (
                <button
                  type="button"
                  onClick={cancelAutoRenew}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Turn off auto-renew
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="mt-4 rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
            {success}
          </p>
        )}

        {/* Plan cards */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {catalog.map((plan) => {
            const Icon = PLAN_ICONS[plan.id] || ShieldCheck
            const isCurrent = sub?.plan === plan.id && isActive
            const highlight = plan.id === 'pro'
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-xl border p-6 ${
                  highlight ? 'border-primary shadow-md' : 'border-border'
                }`}
              >
                {highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    Most popular
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                </div>
                <p className="mt-3">
                  <span className="font-serif text-3xl font-bold">{formatINR(plan.priceINR)}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </p>
                <ul className="mt-4 flex flex-1 flex-col gap-2">
                  {planFeatures(plan).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm leading-relaxed">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={busy !== null || isCurrent}
                  onClick={() => subscribe(plan.id)}
                  className={`mt-6 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                    highlight
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'border border-border hover:bg-muted'
                  }`}
                >
                  {busy === plan.id
                    ? 'Processing payment...'
                    : isCurrent
                      ? 'Current plan'
                      : sub?.plan && isActive
                        ? sub.plan === plan.id
                          ? 'Renew'
                          : 'Switch to this plan'
                        : `Subscribe — ${formatINR(plan.priceINR)}/mo`}
                </button>
              </div>
            )
          })}
        </div>

        {/* Payment history */}
        {(sub?.history?.length ?? 0) > 0 && (
          <div className="mt-10">
            <h2 className="font-serif text-lg font-bold">Payment history</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Subscription payment history</caption>
                <thead className="bg-secondary text-left">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Amount</th>
                    <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Receipt</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Valid until</th>
                  </tr>
                </thead>
                <tbody>
                  {[...sub.history].reverse().map((h, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-3">{new Date(h.paidAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 capitalize">{h.plan}</td>
                      <td className="px-4 py-3 font-semibold">
                        {h.amount === 0 ? 'Free (admin)' : formatINR(h.amount)}
                      </td>
                      <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground md:table-cell">
                        {h.receiptNo || h.reference}
                      </td>
                      <td className="px-4 py-3">{new Date(h.periodEnd).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
