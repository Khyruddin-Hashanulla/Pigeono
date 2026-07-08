import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'order',
        'message',
        'listing',
        'subscription',
        'transport',
        'contact',
        'system',
      ],
      default: 'system',
    },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, maxlength: 1000 },
    link: { type: String }, // in-app path, e.g. /dashboard/orders
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
)

notificationSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model('Notification', notificationSchema)
