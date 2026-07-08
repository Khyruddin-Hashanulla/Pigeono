import { useParams, Link } from 'react-router-dom'
import { Printer, ArrowLeft, BadgeCheck } from 'lucide-react'
import { useFetch } from '../lib/useFetch'
import { LoadingState, ErrorState } from '../components/States'
import { STATUS_LABELS, PaymentInstructions } from './Orders'

function formatINR(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const PAYMENT_STATUS_LABELS = {
  pending: 'Not yet paid — pay the seller directly',
  paid_by_buyer: 'Payment sent (awaiting seller confirmation)',
  confirmed: 'Payment confirmed by seller',
}

/** Printable order summary / receipt for a buyer's order (direct payment). */
export default function OrderReceipt() {
  const { id } = useParams()
  const { data, loading, error, refetch } = useFetch(`/orders/${id}/receipt`)

  if (loading) return <LoadingState label="Loading receipt..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const r = data?.data
  if (!r) return <ErrorState message="Receipt not found" />

  const isPaid = r.paymentStatus === 'confirmed' || Boolean(r.legacyPayment)

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Screen-only toolbar */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          to="/dashboard/orders"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to orders
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Printer className="size-4" aria-hidden="true" />
          Print / Save PDF
        </button>
      </div>

      {/* Receipt document */}
      <div className="rounded-xl border border-border bg-card p-8 print:border-0 print:p-0">
        <header className="flex items-start justify-between border-b border-border pb-6">
          <div>
            <p className="font-serif text-2xl font-bold">Pigeono</p>
            <p className="text-sm text-muted-foreground">Pigeon Marketplace with Verified Pedigrees</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {isPaid ? 'Payment Receipt' : 'Order Summary'}
            </p>
            <p className="font-mono text-sm font-bold">{r.receiptNo}</p>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap justify-between gap-6 text-sm">
          <div>
            <p className="font-semibold uppercase tracking-wide text-xs text-muted-foreground">Buyer</p>
            <p className="mt-1 font-medium">{r.buyer.name}</p>
            {r.buyer.email && <p className="text-muted-foreground">{r.buyer.email}</p>}
            {r.buyer.phone && <p className="text-muted-foreground">+91 {r.buyer.phone}</p>}
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-xs text-muted-foreground">Seller</p>
            <p className="mt-1 font-medium">{r.seller.storeName}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-xs text-muted-foreground">Ordered on</p>
            <p className="mt-1 font-medium">{formatDate(r.createdAt)}</p>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <caption className="sr-only">Receipt line items</caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="pb-2 font-semibold">Item</th>
              <th scope="col" className="pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-3">
                <p className="font-medium">{r.item.title}</p>
                <p className="text-xs text-muted-foreground">
                  Breed: {r.item.breed} · Delivery: {r.delivery.method === 'shipping' ? 'Shipping' : 'Loft pickup'}
                </p>
              </td>
              <td className="py-3 text-right font-medium">{formatINR(r.item.price)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="pt-3 text-right font-semibold">
                Total {isPaid ? 'paid to seller' : 'payable to seller'}
              </th>
              <td className="pt-3 text-right font-serif text-xl font-bold">{formatINR(r.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Payment state + instructions for unpaid orders */}
        <div className="mt-6 flex flex-col gap-3">
          <p className="rounded-md bg-muted px-4 py-3 text-sm">
            <span className="font-semibold">Order status: </span>
            {STATUS_LABELS[r.status] || r.status}
            <span className="mx-1.5 text-muted-foreground">·</span>
            <span className="font-semibold">Payment: </span>
            {PAYMENT_STATUS_LABELS[r.paymentStatus] || r.paymentStatus}
            {r.vendorPaymentMethod ? ` (${r.vendorPaymentMethod.replace('_', ' ')})` : ''}
          </p>
          {!isPaid && r.paymentInstructions && <PaymentInstructions details={r.paymentInstructions} />}
        </div>

        <footer className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <BadgeCheck className="size-4 text-primary" aria-hidden="true" />
            Payments go directly from buyer to seller. Pigeono verifies sellers and mediates
            disputes, but does not hold or process purchase money.
          </p>
          <p className="mt-2">
            Order ID: <span className="font-mono">{r.orderId}</span>
            {r.legacyPayment?.reference && (
              <>
                {' · Payment ref: '}
                <span className="font-mono">{r.legacyPayment.reference}</span>
              </>
            )}
          </p>
          <p className="mt-2">This is a computer-generated document and does not require a signature.</p>
        </footer>
      </div>
    </div>
  )
}
