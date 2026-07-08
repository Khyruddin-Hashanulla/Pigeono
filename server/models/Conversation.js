import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema(
  {
    // buyer <-> vendor (as users); unique per (buyer, vendor, listing)
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorProfile', required: true },
    pigeonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pigeon' },
    lastMessage: {
      body: String,
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: Date,
    },
    // per-participant unread counters
    unread: {
      buyer: { type: Number, default: 0 },
      vendor: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
)

conversationSchema.index({ buyerId: 1, vendorUserId: 1, pigeonId: 1 }, { unique: true })
conversationSchema.index({ updatedAt: -1 })

export default mongoose.model('Conversation', conversationSchema)
