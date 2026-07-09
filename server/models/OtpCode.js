import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

/**
 * One-time codes for email verification. Codes are stored hashed and expire
 * automatically via a TTL index. Attempts are capped to prevent brute force.
 */
const otpCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ['email_verify'], default: 'email_verify' },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
)

otpCodeSchema.statics.issue = async function (email, purpose = 'email_verify') {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const codeHash = await bcrypt.hash(code, 8)
  const query = { email: email.toLowerCase() }
  // Replace any outstanding code for this email
  await this.deleteMany(query)
  await this.create({ ...query, codeHash, purpose, expiresAt: new Date(Date.now() + 5 * 60 * 1000) })
  return code
}

otpCodeSchema.statics.verify = async function (email, code) {
  const record = await this.findOne({ email: email.toLowerCase() })
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

export default mongoose.model('OtpCode', otpCodeSchema)
