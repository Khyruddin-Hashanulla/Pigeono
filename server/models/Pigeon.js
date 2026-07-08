import mongoose from 'mongoose'

const racingRecordSchema = new mongoose.Schema(
  {
    raceName: { type: String, required: true },
    date: { type: Date },
    distance: { type: String }, // e.g. "500 km"
    position: { type: Number },
    speed: { type: String }, // e.g. "1450 m/min"
  },
  { _id: false }
)

const pigeonSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    breed: {
      type: String,
      required: [true, 'Breed is required'],
      enum: [
        'Rampoori',
        'Ferozpori',
        'Madrasi',
        'Sialkoti',
        'Laldumma',
        'Teddy',
        'Lalsiray',
        'Kalsiray',
        'Abluk',
        'Kalduma',
        'Kalanka',
        'Kamagar',
        'Fullsiray',
        'Modena',
        'Homing',
        'Frillback',
        'Other',
      ],
      index: true,
    },
    category: {
      type: String,
      enum: ['high-flying', 'racing', 'show', 'breeding', 'other'],
      required: true,
      index: true,
    },
    age: { type: String }, // e.g. "2 years"
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['pair', 'male', 'female', 'unknown'],
      default: 'unknown',
    },
    color: { type: String },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    currency: { type: String, default: 'INR' },
    negotiable: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    stock: { type: Number, default: 1, min: 0 },
    description: { type: String, maxlength: 5000 },
    health: {
      vaccinated: { type: Boolean, default: false },
      vaccineDetails: { type: String },
      lastVetCheck: { type: Date },
      healthCertificate: { type: String }, // URL
    },
    media: {
      photos: { type: [String], default: [] },
      videos: { type: [String], default: [] },
    },
    pedigree: {
      fatherLineage: { type: String },
      motherLineage: { type: String },
      pedigreeDocumentUrl: { type: String },
      ringNumber: { type: String },
      // ONLY set by admin during pedigree verification. Never trust vendor input.
      isVerified: { type: Boolean, default: false, index: true },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: { type: Date },
    },
    racingRecord: { type: [racingRecordSchema], default: [] },
    location: {
      city: String,
      state: String,
      country: String,
      pincode: String,
      landmark: String,
      pickupOnly: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'active', 'sold', 'rejected'],
      default: 'draft',
      index: true,
    },
    rejectionReason: { type: String },
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
  },
  { timestamps: true }
)

pigeonSchema.index({ title: 'text', breed: 'text', description: 'text' })
pigeonSchema.index({ price: 1 })
pigeonSchema.index({ createdAt: -1 })

export default mongoose.model('Pigeon', pigeonSchema)
