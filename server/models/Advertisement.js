import mongoose from 'mongoose'

const advertisementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    image: { type: String, required: true },
    linkUrl: { type: String, required: true },
    placement: {
      type: String,
      enum: ['home_banner', 'search_sidebar'],
      required: true,
      index: true,
    },
    active: { type: Boolean, default: true, index: true },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export default mongoose.model('Advertisement', advertisementSchema)
