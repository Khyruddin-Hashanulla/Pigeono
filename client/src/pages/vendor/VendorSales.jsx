import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Truck, BadgeCheck, PackageCheck } from 'lucide-react'
import { api, apiErrorMessage } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import { formatPrice } from '../../components/PigeonCard'
import { StatusBadge } from '../Orders'
import VendorNav from '../../components/VendorNav'

const PAYMENT_LABELS = {
  pending: 'Buyer has not paid yet',
  paid_by_buyer: 'Buyer says payment sent — confirm it',
  confirmed: 'Payment confirmed',
}

function SaleCard({ order, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const item = order.itemSnapshot || {}
  const address = order.delivery?.address

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

  const isPending = order.status === 'pending'
  const isConfirmed = order.status === 'confirmed_by_vendor'

  return (
    <article className="rounded-lg border border-border bg-card p-4">
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
            Order #{order._id.slice(-8)} · {new Date(order.createdAt).toLocaleDateString()} · Buyer:{' '}
            {order.buyerId?.name || 'Buyer'}
            {order.buyerId?.phone ? ` · ${order.buyerId.phone}` : ''}
          </p>
          <p className="mt-1 text-xs capitalize text-muted-foreground">
            {order.delivery?.method === 'pickup' ? 'Buyer picks up' : 'Ship to buyer'}
            {order.vendorPaymentMethod ? ` · Pays via ${order.vendorPaymentMethod.replace('_', ' ')}` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold">{formatPrice(order.totalAmount)}</p>
          <p className="text-xs text-muted-foreground">Paid directly to you</p>
        </div>
      </div>

      {order.delivery?.method === 'shipping' && address?.line1 && (
        <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          Ship to: {address.fullName}, {address.line1}, {address.city}
          {address.state ? `, ${address.state}` : ''}
          {address.postalCode ? ` ${address.postalCode}` : ''}, {address.country}
          {address.phone ? ` · ${address.phone}` : ''}
        </p>
      )}

      {/* Transport status (shipping orders — arranged by admin after confirmation) */}
      {order.delivery?.method === 'shipping' && order.transport?.status && (
        <p className="mt-3 flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs text-secondary-foreground">
          <Truck className="size-3.5 shrink-0" aria-hidden="true" />
          {order.transport.status === 'awaiting_assignment'
            ? 'Waiting for admin to arrange transport.'
            : `Transport: ${order.transport.partnerName}${order.transport.trackingNumber ? ` · Tracking ${order.transport.trackingNumber}` : ''}${order.transport.contactPhone ? ` · ${order.transport.contactPhone}` : ''} (${order.transport.status.replace('_', ' ')})`}
        </p>
      )}

      {/* Payment state + vendor actions */}
      {isPending && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <p
            className={`rounded-md px-3 py-2 text-sm ${
              order.paymentStatus === 'paid_by_buyer'
                ? 'bg-secondary font-medium text-secondary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {PAYMENT_LABELS[order.paymentStatus] || 'Awaiting payment'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => post('mark-paid')}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <BadgeCheck className="size-4" aria-hidden="true" />
              Confirm payment received
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => post('cancel', { reason: 'Cancelled by seller' })}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Cancel order
            </button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Only confirm after the money has actually reached your account. Confirming reserves the
            bird for this buyer.
          </p>
        </div>
      )}

      {isConfirmed && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => post('complete')}
            className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <PackageCheck className="size-4" aria-hidden="true" />
            Mark sale complete
          </button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Complete the sale once the bird has been handed over or delivered to the buyer.
          </p>
        </div>
      )}

      {order.status === 'disputed' && (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          The buyer opened a dispute. Our team will review and contact you.
        </p>
      )}

      {actionError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {actionError}
        </p>
      )}
    </article>
  )
}

export default function VendorSales() {
  const { data, loading, error, refetch } = useFetch('/orders/sales')

  if (loading) return <LoadingState label="Loading your sales..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const orders = data?.data ?? []

  return (
    <>
    <VendorNav />
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div>
        <h1 className="font-serif text-2xl font-bold md:text-3xl">Sales</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Buyers pay you directly — confirm each payment once it reaches your account.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No sales yet"
            message="When a buyer purchases one of your birds, the order will appear here."
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {orders.map((order) => (
            <SaleCard key={order._id} order={order} onChanged={refetch} />
          ))}
        </div>
      )}
    </main>
    </>
  )
}
