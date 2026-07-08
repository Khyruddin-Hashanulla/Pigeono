import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Handshake, Truck, MapPin, IndianRupee } from 'lucide-react'
import { api } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { LoadingState, ErrorState } from '../components/States'
import { formatPrice } from '../components/PigeonCard'

/**
 * Direct-payment checkout: placing an order reserves the bird and reveals
 * the seller's payment details (UPI / bank). The buyer pays the seller
 * directly — Pigeono never holds the purchase money.
 */
export default function Checkout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useFetch(`/listings/${id}`)
  const [method, setMethod] = useState('shipping')
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [address, setAddress] = useState({
    fullName: '',
    line1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    phone: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  if (loading) return <LoadingState label="Loading checkout..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const { pigeon } = data.data

  if (pigeon.status === 'sold') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold">This bird has been sold</h1>
        <p className="mt-2 text-sm text-muted-foreground">Browse other listings to find a similar bird.</p>
        <Link to="/search" className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Browse listings
        </Link>
      </div>
    )
  }

  async function placeOrder(e) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await api.post('/orders', {
        pigeonId: pigeon._id,
        vendorPaymentMethod: paymentMethod,
        delivery: { method, ...(method === 'shipping' ? { address } : {}) },
      })
      navigate(`/dashboard/orders?placed=${res.data.data.order._id}`)
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Could not place your order. Please try again.')
      setSubmitting(false)
    }
  }

  const field = (key, label, required = true, autoComplete) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={key} className="text-sm font-medium">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={key}
        required={required}
        autoComplete={autoComplete}
        value={address[key]}
        onChange={(e) => setAddress((a) => ({ ...a, [key]: e.target.value }))}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )

  const payOption = (value, label, desc) => (
    <label
      className={`flex flex-1 cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${paymentMethod === value ? 'border-primary bg-secondary' : 'border-border'}`}
    >
      <input
        type="radio"
        name="paymentMethod"
        value={value}
        checked={paymentMethod === value}
        onChange={() => setPaymentMethod(value)}
        className="mt-0.5 accent-primary"
      />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </label>
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-serif text-2xl font-bold md:text-3xl">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">You pay the seller directly — no platform fees</p>

      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_320px]">
        <form onSubmit={placeOrder} className="flex flex-col gap-6">
          {/* Delivery method */}
          <fieldset className="rounded-lg border border-border bg-card p-4">
            <legend className="px-1 text-sm font-semibold">Delivery method</legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className={`flex flex-1 cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${method === 'shipping' ? 'border-primary bg-secondary' : 'border-border'}`}>
                <input
                  type="radio"
                  name="method"
                  value="shipping"
                  checked={method === 'shipping'}
                  onChange={() => setMethod('shipping')}
                  className="accent-primary"
                />
                <Truck className="size-4 shrink-0" aria-hidden="true" />
                Ship to my address
              </label>
              <label className={`flex flex-1 cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${method === 'pickup' ? 'border-primary bg-secondary' : 'border-border'}`}>
                <input
                  type="radio"
                  name="method"
                  value="pickup"
                  checked={method === 'pickup'}
                  onChange={() => setMethod('pickup')}
                  className="accent-primary"
                />
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                Pick up from seller
              </label>
            </div>
          </fieldset>

          {/* Shipping address */}
          {method === 'shipping' && (
            <fieldset className="rounded-lg border border-border bg-card p-4">
              <legend className="px-1 text-sm font-semibold">Shipping address</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {field('fullName', 'Full name', true, 'name')}
                {field('phone', 'Phone', false, 'tel')}
                <div className="sm:col-span-2">{field('line1', 'Address', true, 'address-line1')}</div>
                {field('city', 'City', true, 'address-level2')}
                {field('state', 'State / Province', false, 'address-level1')}
                {field('postalCode', 'Postal code', false, 'postal-code')}
                {field('country', 'Country', true, 'country-name')}
              </div>
            </fieldset>
          )}

          {/* How will you pay the seller? */}
          <fieldset className="rounded-lg border border-border bg-card p-4">
            <legend className="px-1 text-sm font-semibold">How will you pay the seller?</legend>
            <div className="flex flex-col gap-2">
              {payOption('upi', 'UPI', "Pay instantly to the seller's UPI ID (shown after you place the order)")}
              {payOption('bank_transfer', 'Bank transfer', "Transfer to the seller's bank account (IMPS / NEFT)")}
              {payOption('cash', 'Cash on pickup/delivery', 'Pay in cash when you receive the bird')}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              After you place the order, the seller&apos;s payment details are shown on your order page.
              Pay them directly, then mark the payment as sent so the seller can confirm.
            </p>
          </fieldset>

          {submitError && (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Handshake className="size-4" aria-hidden="true" />
            {submitting ? 'Placing order...' : 'Place order & get payment details'}
          </button>
        </form>

        {/* Order summary */}
        <aside className="h-fit rounded-lg border border-border bg-card p-4" aria-label="Order summary">
          <div className="flex gap-3">
            <img
              src={pigeon.media?.photos?.[0] || '/placeholder.svg'}
              alt=""
              className="size-16 shrink-0 rounded-md object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{pigeon.title}</p>
              <p className="text-xs capitalize text-muted-foreground">{pigeon.breed}</p>
            </div>
          </div>
          <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Item price</dt>
              <dd className="font-medium">{formatPrice(pigeon.price)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Platform fee</dt>
              <dd className="font-medium">{formatPrice(0)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <dt>Total (paid to seller)</dt>
              <dd>{formatPrice(pigeon.price)}</dd>
            </div>
          </dl>
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <IndianRupee className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            You pay the seller directly. Placing the order reserves this bird and shares the
            seller&apos;s payment details with you. If anything goes wrong, you can open a dispute
            and our team will step in.
          </p>
        </aside>
      </div>
    </div>
  )
}
