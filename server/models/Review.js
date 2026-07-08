import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    pigeonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pigeon', index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 2000 },
    vendorReply: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
)

export default mongoose.model('Review', reviewSchema)
