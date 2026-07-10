const isProd = () => process.env.NODE_ENV === 'production'

export function validateEnv() {
  if (!isProd()) return

  const fatal = []
  const warnings = []

  // --- Security-critical: refuse to boot without these -------------------
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    fatal.push('JWT_SECRET must be set to a random string of at least 32 characters (e.g. `openssl rand -base64 48`).')
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
    fatal.push('JWT_REFRESH_SECRET must be set to a different random string of at least 32 characters.')
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    fatal.push('JWT_SECRET and JWT_REFRESH_SECRET must be different values.')
  }
  if (!process.env.MONGO_URI) {
    fatal.push('MONGO_URI must be set (MongoDB Atlas or self-hosted). The in-memory database loses ALL data on restart.')
  }
  if (!process.env.CLIENT_ORIGIN) {
    fatal.push('CLIENT_ORIGIN must be set to your site URL(s), e.g. https://pigeono.com — otherwise browsers cannot call the API.')
  } else if (/localhost|127\.0\.0\.1/.test(process.env.CLIENT_ORIGIN)) {
    fatal.push(
      'CLIENT_ORIGIN still points to localhost — password reset links in emails would send users to http://localhost:3000. ' +
        'Set it to your deployed frontend URL, e.g. https://your-app.vercel.app'
    )
  }

  // --- Feature-degrading: boot, but warn loudly --------------------------
  const brevoKey = (process.env.BREVO_API_KEY || '').trim().replace(/^["']|["']$/g, '')
  if (brevoKey && !brevoKey.startsWith('xkeysib-')) {
    warnings.push(
      `BREVO_API_KEY does not look like a Brevo API key (starts with "${brevoKey.slice(0, 8)}...", expected "xkeysib-"). ` +
        'You may have pasted the SMTP key by mistake — in Brevo go to Settings → SMTP & API → the "API Keys" TAB ' +
        '(not "SMTP") and generate an API key. Emails will fail with 401 "Key not found" until this is fixed.'
    )
  }
  if (!process.env.BREVO_API_KEY && !process.env.SMTP_HOST) {
    warnings.push(
      'No email transport configured — email OTP, receipts and notifications will NOT be delivered. ' +
        'Set BREVO_API_KEY (recommended) or SMTP_* variables. Registration by email will not work.'
    )
  } else if (!process.env.BREVO_API_KEY && process.env.SMTP_HOST) {
    warnings.push(
      'Email uses SMTP only — note that Render free tier blocks ALL outbound SMTP ports (25/465/587), ' +
        'causing "Connection timeout". If deployed on Render free tier, set BREVO_API_KEY to send over HTTPS instead.'
    )
  }
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    warnings.push('Razorpay keys are not set — vendor subscription checkout is DISABLED (simulated payments are blocked in production).')
  }
  if (!process.env.RAZORPAY_WEBHOOK_SECRET && process.env.RAZORPAY_KEY_ID) {
    warnings.push('RAZORPAY_WEBHOOK_SECRET is not set — auto-renewal webhooks will be rejected.')
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    warnings.push('Cloudinary is not configured — uploaded photos are stored on local disk and may be lost on redeploy.')
  }

  for (const w of warnings) console.warn(`[pigeono] PRODUCTION WARNING: ${w}`)

  if (fatal.length > 0) {
    console.error('[pigeono] FATAL: refusing to start in production with insecure configuration:')
    for (const f of fatal) console.error(`  - ${f}`)
    process.exit(1)
  }
}
