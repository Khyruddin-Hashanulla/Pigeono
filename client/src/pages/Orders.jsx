import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Handshake, Star, ReceiptText, IndianRupee, Copy, Check } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import { formatPrice } from '../components/PigeonCard'
import { StarInput } from '../components/Rating'

export const STATUS_LABELS = {
  // Direct-payment flow
  pending: 'Awaiting payment',
  confirmed_by_vendor: 'Payment confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
  // Legacy escrow statuses (old orders)
  pending_payment: 'Pending payment',
  paid_escrow: 'Paid — in escrow',
  shipped: 'Shipped',
  delivered: 'Delivered',
  refunded: 'Refunded',
}

const STATUS_STYLES = {
  pending: 'bg-secondary text-secondary-foreground',
  confirmed_by_vendor: 'bg-primary/10 text-primary',
  completed: 'bg-primary text-primary-foreground',
  disputed: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
  // legacy
  paid_escrow: 'bg-secondary text-secondary-foreground',
  shipped: 'bg-primary/10 text-primary',
  delivered: 'bg-primary/10 text-primary',
}

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[status] || 'bg-muted text-muted-foreground'}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  )
}

/** One-click copy for UPI IDs / account numbers */
function CopyValue({ label, value }) {
  const [copied, setCopied] = useState(false)
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono font-semibold">{value}</span>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {
            /* clipboard unavailable */
          }
        }}
        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
      >
        {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      </button>
    </span>
  )
}

/** Seller payment details shown to buyers who still need to pay */
export function PaymentInstructions({ details }) {
  if (!details) return null
  const { upiId, phoneNumber, bank } = details
  if (!upiId && !phoneNumber && !bank) return null
  return (
    <div className="rounded-md border border-primary/30 bg-secondary/50 p-3 text-sm">
      <p className="mb-2 flex items-center gap-2 font-semibold">
        <IndianRupee className="size-4" aria-hidden="true" />
        Pay the seller directly
      </p>
      <dl className="flex flex-col gap-1.5 text-sm">
        {upiId && (
          <div className="flex flex-wrap items-center gap-2">
            <dt className="text-muted-foreground">UPI ID:</dt>
            <dd>
              <CopyValue label="UPI ID" value={upiId} />
            </dd>
          </div>
        )}
        {phoneNumber && (
          <div className="flex flex-wrap items-center gap-2">
            <dt className="text-muted-foreground">Phone (UPI/PhonePe):</dt>
            <dd>
              <CopyValue label="phone number" value={phoneNumber} />
            </dd>
          </div>
        )}
        {bank && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <dt className="text-muted-foreground">Account:</dt>
              <dd>
                <CopyValue label="account number" value={bank.accountNumber} />
              </dd>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <dt className="text-muted-foreground">IFSC:</dt>
              <dd>
                <CopyValue label="IFSC code" value={bank.ifscCode} />
              </dd>
            </div>
            {bank.bankName && (
              <div className="flex flex-wrap items-center gap-2">
                <dt className="text-muted-foreground">Bank:</dt>
                <dd>{bank.bankName}</dd>
              </div>
            )}
            {bank.accountHolderName && (
              <div className="flex flex-wrap items-center gap-2">
                <dt className="text-muted-foreground">Account holder:</dt>
                <dd>{bank.accountHolderName}</dd>
              </div>
            )}
          </>
        )}
      </dl>
    </div>
  )
}

/** Star + comment review form for completed orders */
function ReviewSection({ order, review, onReviewed }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Already reviewed — show the submitted review
  if (review) {
    return (
      <div className="mt-4 border-t border-border pt-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Star className="size-4 fill-primary text-primary" aria-hidden="true" />
          Your review: {review.rating}/5
        </p>
        {review.comment && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
        )}
      </div>
    )
  }

  async function submit(e) {
    e.preventDefault()
    if (rating < 1) {
      setError('Please select a star rating')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.post('/reviews', { orderId: order._id, rating, comment: comment.trim() || undefined })
      onReviewed()
    } catch (err) {
      setError(apiErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Star className="size-4" aria-hidden="true" />
          Rate &amp; review this order
        </button>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-sm font-medium">How was the bird and the seller?</p>
            <StarInput value={rating} onChange={setRating} disabled={busy} />
          </div>
          <div>
            <label htmlFor={`review-${order._id}`} className="mb-1.5 block text-sm font-medium">
              Write a review <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id={`review-${order._id}`}
              rows={3}
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with the bird's health, the seller's communication, packaging..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || rating < 1}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Submitting...' : 'Submit review'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function OrderCard({ order, onChanged, justPlaced, review, onReviewed }) {
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const item = order.itemSnapshot || {}
  const vendor = order.vendorId || {}

  async function post(path, payload) {
    setBusy(true)
    setActionError(null)
    try {
      await api.post(`/orders/${order._id}/${path}`, payload)
      onChanged()
    } catch (err) {
      setActionError(apiErrorMessage(err))
      setBusy(false)
    }
  }

  const awaitingBuyerPayment = order.status === 'pending' && order.paymentStatus === 'pending'
  const awaitingVendorConfirm = order.status === 'pending' && order.paymentStatus === 'paid_by_buyer'
  const canDispute = ['pending', 'confirmed_by_vendor'].includes(order.status)

  return (
    <article className={`rounded-lg border bg-card p-4 ${justPlaced ? 'border-primary' : 'border-border'}`}>
      {justPlaced && (
        <p className="mb-3 flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground">
          <Handshake className="size-4 shrink-0" aria-hidden="true" />
          Order placed — pay the seller directly using the details below.
        </p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <img
          src={item.photo || '/placeholder.svg'}
          alt=""
          className="size-20 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold">
              <Link to={`/pigeons/${order.pigeonId}`} className="hover:underline">
                {item.title || 'Listing'}
              </Link>
            </h2>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Order #{order._id.slice(-8)} · {new Date(order.createdAt).toLocaleDateString()}
            {vendor.storeName && (
              <>
                {' · Sold by '}
                <Link to={`/store/${vendor.storeSlug}`} className="text-primary hover:underline">
                  {vendor.storeName}
                </Link>
              </>
            )}
          </p>
          <p className="mt-1 text-xs capitalize text-muted-foreground">
            {order.delivery?.method === 'pickup' ? 'Pickup from seller' : 'Shipping'} · {item.breed}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-base font-bold">{formatPrice(order.totalAmount)}</p>
          <Link
            to={`/dashboard/orders/${order._id}/receipt`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <ReceiptText className="size-3.5" aria-hidden="true" />
            Receipt
          </Link>
        </div>
      </div>

      {order.transport?.status && (
        <div className="mt-3 rounded-md bg-muted px-3 py-2 text-xs leading-relaxed">
          <span className="font-semibold">Transport: </span>
          <span className="capitalize">{order.transport.status.replace(/_/g, ' ')}</span>
          {order.transport.partnerName && <> · {order.transport.partnerName}</>}
          {order.transport.trackingNumber && <> · Tracking: {order.transport.trackingNumber}</>}
          {order.transport.contactPhone && <> · Contact: {order.transport.contactPhone}</>}
        </div>
      )}

      {/* Buyer needs to pay the seller */}
      {awaitingBuyerPayment && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <PaymentInstructions details={order.vendorPaymentDetails} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => post('buyer-paid', { method: order.vendorPaymentMethod || 'upi' })}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Check className="size-4" aria-hidden="true" />
              I&apos;ve paid the seller
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => post('cancel', { reason: 'Cancelled by buyer' })}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Cancel order
            </button>
          </div>
        </div>
      )}

      {/* Buyer paid — waiting for the seller to confirm */}
      {awaitingVendorConfirm && (
        <p className="mt-3 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
          You marked the payment as sent. Waiting for the seller to confirm they received it.
        </p>
      )}

      {order.status === 'confirmed_by_vendor' && (
        <p className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
          The seller confirmed your payment. They&apos;ll arrange delivery or pickup of your bird next.
        </p>
      )}

      {order.status === 'disputed' && (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Dispute open — our team is reviewing this order and will contact both parties.
        </p>
      )}

      {/* Report a problem (any active stage) */}
      {canDispute && !awaitingBuyerPayment && (
        <div className="mt-4 border-t border-border pt-4">
          {!disputeOpen ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setDisputeOpen(true)}
              className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              Report a problem
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                post('dispute', { reason: disputeReason })
              }}
              className="flex flex-col gap-2"
            >
              <label htmlFor={`dispute-${order._id}`} className="text-sm font-medium">
                What went wrong?
              </label>
              <textarea
                id={`dispute-${order._id}`}
                required
                minLength={10}
                rows={3}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe the issue (at least 10 characters)"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy || disputeReason.trim().length < 10}
                  className="self-start rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                >
                  Open dispute
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDisputeOpen(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {['delivered', 'completed'].includes(order.status) && (
        <ReviewSection order={order} review={review} onReviewed={onReviewed} />
      )}

      {actionError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {actionError}
        </p>
      )}
    </article>
  )
}

export default function Orders() {
  const { data, loading, error, refetch } = useFetch('/orders')
  const { data: reviewsData, refetch: refetchReviews } = useFetch('/reviews/mine')
  const [searchParams] = useSearchParams()
  const placedId = searchParams.get('placed')

  if (loading) return <LoadingState label="Loading your orders..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const orders = data?.data ?? []
  const reviewByOrder = new Map((reviewsData?.data ?? []).map((r) => [r.orderId, r]))

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-serif text-2xl font-bold md:text-3xl">My Orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        You pay sellers directly — use the payment details on each order.
      </p>

      {orders.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No orders yet"
            message="When you buy a pigeon, your order and its payment status will appear here."
          />
          <div className="text-center">
            <Link
              to="/search"
              className="inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Browse pigeons
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onChanged={refetch}
              justPlaced={order._id === placedId}
              review={reviewByOrder.get(order._id)}
              onReviewed={refetchReviews}
            />
          ))}
        </div>
      )}
    </main>
  )
}
