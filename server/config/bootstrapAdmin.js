import User from '../models/User.js'

/**
 * Creates the first admin account from ADMIN_EMAIL + ADMIN_PASSWORD env vars.
 *
 * Needed because production never auto-seeds demo accounts, so a fresh
 * production database would otherwise have no way to access the admin panel.
 *
 * - Runs only when both env vars are set.
 * - If the user already exists, ensures it has the admin role (never
 *   overwrites the password of an existing account).
 */
export async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) return

  if (password.length < 10) {
    console.warn('[pigeono] ADMIN_PASSWORD must be at least 10 characters — skipping admin bootstrap')
    return
  }

  const existing = await User.findOne({ email })
  if (existing) {
    if (!existing.roles.includes('admin')) {
      existing.roles.push('admin')
      await existing.save()
      console.log(`[pigeono] Granted admin role to existing user ${email}`)
    }
    return
  }

  await User.create({
    name: 'Administrator',
    email,
    password, // hashed by the User model pre-save hook
    roles: ['admin', 'buyer'],
    isVerified: true,
    emailVerified: true,
  })
  console.log(`[pigeono] Bootstrapped admin account ${email}`)
}
