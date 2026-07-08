/**
 * Razorpay Checkout loader. Opens the real Razorpay modal and resolves with
 * the payment result, or rejects if the user dismisses it.
 * Simulated test-mode payments are handled by the caller (no script needed).
 */
export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve()
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existing) {
      existing.addEventListener('load', resolve)
      existing.addEventListener('error', reject)
      return
    }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = resolve
    s.onerror = () => reject(new Error('Could not load Razorpay — check your connection'))
    document.body.appendChild(s)
  })
}

export async function openRazorpayCheckout({ keyId, order, name, description, prefill }) {
  await loadRazorpayScript()
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name,
      description,
      prefill,
      theme: { color: '#a24b34' },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    })
    rzp.on('payment.failed', (resp) => reject(new Error(resp?.error?.description || 'Payment failed')))
    rzp.open()
  })
}
