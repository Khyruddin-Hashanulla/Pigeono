import mongoose from 'mongoose'

const vendorProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    storeName: { type: String, required: true, trim: true, maxlength: 100 },
    storeSlug: { type: String, required: true, unique: true, lowercase: true, index: true },
    storeDescription: { type: String, maxlength: 2000 },
    storeLogo: { type: String },
    bannerImage: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String },
    commissionRate: { type: Number, default: 0.1, min: 0, max: 1 }, // 10% default
    // Vendor's direct-payment details shown to buyers at checkout.
    // Buyers pay the vendor directly — the platform never holds purchase money.
    payoutDetails: {
      upiId: { type: String, trim: true, maxlength: 100 },
      bankName: { type: String, trim: true, maxlength: 100 },
      accountNumber: { type: String, trim: true, maxlength: 30 },
      ifscCode: { type: String, trim: true, uppercase: true, maxlength: 11 },
      accountHolderName: { type: String, trim: true, maxlength: 100 },
      phoneNumber: { type: String, trim: true, maxlength: 15 }, // for UPI / phone pay
      // legacy (kept for migration safety)
      stripeAccountId: { type: String },
      onboarded: { type: Boolean, default: false },
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    subscription: {
      plan: { type: String, enum: ['basic', 'pro', 'elite', null], default: null },
      status: { type: String, enum: ['active', 'expired', 'none'], default: 'none' },
      startedAt: { type: Date },
      currentPeriodEnd: { type: Date },
      autoRenew: { type: Boolean, default: true },
      history: {
        type: [
          {
            plan: String,
            amount: Number,
            paidAt: Date,
            reference: String,
            paymentId: String,
            receiptNo: String,
            periodEnd: Date,
            _id: false,
          },
        ],
        default: [],
      },
      // Lazy notification bookkeeping (no cron needed)
      renewalReminderSentFor: { type: Date },
      expiryNotifiedFor: { type: Date },
      limitNotifiedAt: { type: Date },
    },
  },
  { timestamps: true }
)

/** True when the vendor holds a live (unexpired) subscription. */
vendorProfileSchema.methods.hasActiveSubscription = function () {
  const sub = this.subscription
  return Boolean(
    sub?.plan &&
      sub.status === 'active' &&
      sub.currentPeriodEnd &&
      new Date(sub.currentPeriodEnd) > new Date()
  )
}

/** True when the vendor has at least one direct-payment method configured. */
vendorProfileSchema.methods.hasPaymentDetails = function () {
  const p = this.payoutDetails || {}
  return Boolean(p.upiId || (p.accountNumber && p.ifscCode) || p.phoneNumber)
}

/** Payment details safe to show a buyer who placed an order. */
vendorProfileSchema.methods.paymentInstructions = function () {
  const p = this.payoutDetails || {}
  return {
    upiId: p.upiId || null,
    phoneNumber: p.phoneNumber || null,
    bank:
      p.accountNumber && p.ifscCode
        ? {
            bankName: p.bankName || null,
            accountNumber: p.accountNumber,
            ifscCode: p.ifscCode,
            accountHolderName: p.accountHolderName || null,
          }
        : null,
  }
}

export default mongoose.model('VendorProfile', vendorProfileSchema)
