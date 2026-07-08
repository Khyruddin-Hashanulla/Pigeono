import mongoose from 'mongoose'

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    excerpt: { type: String, maxlength: 500 },
    body: { type: String, required: true, maxlength: 50000 },
    coverImage: { type: String },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: { type: Date },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

postSchema.index({ publishedAt: -1 })

export default mongoose.model('Post', postSchema)
