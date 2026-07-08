import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, select: false },
    phone: { type: String, trim: true, unique: true, sparse: true, index: true },
    googleId: { type: String, unique: true, sparse: true, index: true },
    authProviders: {
      type: [String],
      enum: ['password', 'phone', 'google'],
      default: ['password'],
    },
    roles: {
      type: [String],
      enum: ['buyer', 'vendor', 'admin'],
      default: ['buyer'],
    },
    profileImage: { type: String },
    address: {
      line1: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    addresses: {
      type: [
        {
          label: { type: String, default: 'Home' },
          fullName: String,
          phone: String,
          line1: String,
          city: String,
          state: String,
          pincode: String,
          landmark: String,
        },
      ],
      default: [],
    },
    wishlist: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pigeon' }],
      default: [],
    },
    cart: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pigeon' }],
      default: [],
    },
    isVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    emailOtpSentAt: { type: Date },
    resetPasswordToken: { type: String, select: false }, // sha256 hash of the raw token
    resetPasswordExpires: { type: Date, select: false },
    isSuspended: { type: Boolean, default: false },
    vendorProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorProfile' },
  },
  { timestamps: true }
)

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return
  this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return Promise.resolve(false)
  return bcrypt.compare(candidate, this.password)
}

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject()
  delete obj.password
  return obj
}

export default mongoose.model('User', userSchema)
