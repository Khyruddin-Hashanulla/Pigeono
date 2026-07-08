import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

/**
 * One-time codes for phone login and email verification. Codes are stored
 * hashed and expire automatically via a TTL index. Attempts are capped to
 * prevent brute force. Either `phone` or `email` identifies the target.
 */
const otpCodeSchema = new mongoose.Schema(
  {
    phone: { type: String, index: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ['login', 'email_verify'], default: 'login' },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
)

otpCodeSchema.pre('validate', function (next) {
  if (!this.phone && !this.email) {
    next(new Error('OtpCode requires a phone or email'))
  } else {
    next()
  }
})

function targetQuery(target) {
  return target.includes('@') ? { email: target.toLowerCase() } : { phone: target }
}

otpCodeSchema.statics.issue = async function (target, purpose = 'login') {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const codeHash = await bcrypt.hash(code, 8)
  const query = targetQuery(target)
  // Replace any outstanding code for this target
  await this.deleteMany(query)
  await this.create({ ...query, codeHash, purpose, expiresAt: new Date(Date.now() + 5 * 60 * 1000) })
  return code
}

otpCodeSchema.statics.verify = async function (target, code) {
  const record = await this.findOne(targetQuery(target))
  if (!record) return { ok: false, reason: 'No code requested or code expired' }
  if (record.attempts >= 5) {
    await record.deleteOne()
    return { ok: false, reason: 'Too many attempts — request a new code' }
  }
  const match = await bcrypt.compare(code, record.codeHash)
  if (!match) {
    record.attempts += 1
    await record.save()
    return { ok: false, reason: 'Incorrect code' }
  }
  await record.deleteOne()
  return { ok: true }
}

/** Seconds remaining before another OTP can be requested (60s cooldown). */
otpCodeSchema.statics.cooldownRemaining = async function (target) {
  const record = await this.findOne(targetQuery(target)).sort({ createdAt: -1 })
  if (!record) return 0
  const elapsed = Date.now() - record.createdAt.getTime()
  return Math.max(0, Math.ceil((60 * 1000 - elapsed) / 1000))
}

export default mongoose.model('OtpCode', otpCodeSchema)
