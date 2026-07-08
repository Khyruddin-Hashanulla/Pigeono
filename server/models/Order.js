import mongoose from 'mongoose'

const timelineEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String },
    at: { type: Date, default: Date.now },
    by: { type: String, enum: ['buyer', 'vendor', 'admin', 'system'], default: 'system' },
  },
  { _id: false }
)

const orderSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    pigeonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pigeon', required: true },
    // denormalized snapshot so the order survives listing edits/deletion
    itemSnapshot: {
      title: String,
      breed: String,
      price: Number,
      photo: String,
    },
    totalAmount: { type: Number, required: true, min: 0 },
    // Legacy escrow fields (kept for migration safety; new orders don't use them)
    commissionRate: { type: Number },
    commissionAmount: { type: Number },
    vendorPayout: { type: Number },
    status: {
      type: String,
      enum: [
        // Direct-payment flow
        'pending',
        'confirmed_by_vendor',
        'completed',
        'cancelled',
        'disputed',
        // Legacy escrow statuses (kept for old orders)
        'pending_payment',
        'paid_escrow',
        'shipped',
        'delivered',
        'refunded',
      ],
      default: 'pending',
      index: true,
    },
    // Direct-payment tracking: buyer pays the vendor directly (UPI/bank/cash)
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid_by_buyer', 'confirmed'],
      default: 'pending',
      index: true,
    },
    // How the buyer says they paid / plan to pay (upi, bank_transfer, cash, other)
    vendorPaymentMethod: { type: String, maxlength: 50 },
    // Snapshot of the vendor's payment instructions at order time
    vendorPaymentDetails: {
      upiId: String,
      phoneNumber: String,
      bank: {
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        accountHolderName: String,
      },
    },
    delivery: {
      method: { type: String, enum: ['shipping', 'pickup'], default: 'shipping' },
      address: {
        fullName: String,
        line1: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
        phone: String,
      },
    },
    payment: {
      provider: { type: String, default: 'mock' }, // 'mock' | 'stripe'
      reference: { type: String }, // PaymentIntent id (or mock ref)
      receiptNo: { type: String, index: true },
      paidAt: { type: Date },
      releasedAt: { type: Date }, // when escrow was released to vendor
      refundedAt: { type: Date },
      refundAmount: { type: Number },
    },
    // Transport arranged by admin after the order is confirmed (paid)
    transport: {
      status: {
        type: String,
        enum: ['awaiting_assignment', 'assigned', 'in_transit', 'delivered', null],
        default: null,
      },
      partnerName: { type: String, maxlength: 150 },
      contactPhone: { type: String, maxlength: 20 },
      trackingNumber: { type: String, maxlength: 100 },
      assignedAt: { type: Date },
    },
    // buyer must confirm receipt; otherwise auto-release after this date
    autoReleaseAt: { type: Date },
    dispute: {
      isOpen: { type: Boolean, default: false },
      reason: String,
      openedAt: Date,
      resolution: {
        type: String,
        // Direct-payment resolutions + legacy escrow values (old orders)
        enum: ['favor_vendor', 'favor_buyer', 'released', 'partial_refund', 'full_refund', null],
        default: null,
      },
      resolvedAt: Date,
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      resolutionNote: String,
    },
    timeline: { type: [timelineEventSchema], default: [] },
  },
  { timestamps: true }
)

orderSchema.index({ createdAt: -1 })

export default mongoose.model('Order', orderSchema)
