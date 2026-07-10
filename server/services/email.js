import nodemailer from 'nodemailer'

let transporter = null

function isBrevoApiConfigured() {
  return Boolean(process.env.BREVO_API_KEY)
}

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

export function isEmailConfigured() {
  return isBrevoApiConfigured() || isSmtpConfigured()
}

/** Parse EMAIL_FROM ('Name <addr@x.com>' or plain address) into API shape. */
function parseFrom() {
  const raw = process.env.EMAIL_FROM || 'Pigeono <no-reply@pigeono.com>'
  const match = raw.match(/^\s*(.*?)\s*<\s*(.+?)\s*>\s*$/)
  if (match) return { name: match[1] || 'Pigeono', email: match[2] }
  return { name: 'Pigeono', email: raw.trim() }
}

/** Send via Brevo's HTTPS API — works even where SMTP ports are blocked. */
async function sendViaBrevoApi({ to, subject, html }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: parseFrom(),
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Brevo API ${res.status}: ${body.slice(0, 200)}`)
    }
    return { ok: true }
  } finally {
    clearTimeout(timer)
  }
}

export function isEmailDevMode() {
  return !isEmailConfigured() && process.env.NODE_ENV !== 'production'
}

function getTransporter() {
  if (!isSmtpConfigured()) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    })
  }
  return transporter
}

/** Base send. Never throws — email failure must not break the main flow. */
export async function sendEmail({ to, subject, html }) {
  try {
    // Prefer the HTTPS API: immune to SMTP port blocking on cloud hosts
    if (isBrevoApiConfigured()) {
      return await sendViaBrevoApi({ to, subject, html })
    }
    const t = getTransporter()
    if (!t) {
      console.log(`[pigeono] (email dev mode) To: ${to} | Subject: ${subject}`)
      return { ok: true, devMode: true }
    }
    await t.sendMail({
      from: process.env.EMAIL_FROM || 'Pigeono <no-reply@pigeono.com>',
      to,
      subject,
      html,
    })
    return { ok: true }
  } catch (err) {
    console.error('[pigeono] sendEmail failed:', err.message)
    if (/timeout|ETIMEDOUT|ECONNREFUSED|aborted/i.test(err.message) && !isBrevoApiConfigured()) {
      console.error(
        '[pigeono] HINT: Your host is likely blocking outbound SMTP ports — Render free tier blocks ' +
          'ports 25/465/587 entirely (since Sept 2025), and Gmail blocks cloud IPs. ' +
          'Set BREVO_API_KEY to send via Brevo\'s HTTPS API instead (not affected by port blocking).'
      )
    }
    return { ok: false, error: err.message }
  }
}

/* ---------------------------------- Templates ---------------------------------- */

const BRAND = '#1a7f5a'

function layout(title, bodyHtml) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4;">
          <tr>
            <td style="background:${BRAND};padding:20px 32px;">
              <span style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">Pigeono</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#1c1917;">${title}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#fafaf9;border-top:1px solid #e7e5e4;">
              <p style="margin:0;font-size:12px;color:#78716c;">Pigeono — India's trusted pigeon marketplace. If you didn't request this email, you can safely ignore it.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

/** OTP verification email */
export async function sendOtpEmail(email, code) {
  const html = layout(
    'Verify your email',
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#44403c;">Use the code below to verify your email address. It expires in <strong>5 minutes</strong>.</p>
     <div style="text-align:center;margin:24px 0;">
       <span style="display:inline-block;background:#f0fdf4;border:1px solid ${BRAND};border-radius:8px;padding:14px 28px;font-size:28px;font-weight:bold;letter-spacing:8px;color:${BRAND};">${code}</span>
     </div>
     <p style="margin:0;font-size:13px;color:#78716c;">Never share this code with anyone. Pigeono staff will never ask for it.</p>`
  )
  return sendEmail({ to: email, subject: `${code} is your Pigeono verification code`, html })
}

/** Post-registration welcome */
export async function sendWelcomeEmail(user) {
  if (!user?.email) return { ok: false }
  const html = layout(
    `Welcome to Pigeono, ${user.name}!`,
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#44403c;">Your account is verified and ready. Here's what you can do:</p>
     <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.8;color:#44403c;">
       <li>Browse verified pigeons with pedigree &amp; racing records</li>
       <li>Chat with sellers and buy directly from trusted breeders</li>
       <li>Open your own store and start selling</li>
     </ul>
     <div style="text-align:center;margin:24px 0 8px;">
       <a href="${process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:3000'}/browse" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:bold;">Browse Pigeons</a>
     </div>`
  )
  return sendEmail({ to: user.email, subject: 'Welcome to Pigeono', html })
}

/** Password reset email */
export async function sendPasswordResetEmail(email, resetLink) {
  const html = layout(
    'Reset your password',
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#44403c;">Click the button below to reset your Pigeono password. The link expires in 30 minutes.</p>
     <div style="text-align:center;margin:24px 0 8px;">
       <a href="${resetLink}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:bold;">Reset Password</a>
     </div>`
  )
  return sendEmail({ to: email, subject: 'Reset your Pigeono password', html })
}

/** Subscription payment receipt */
export async function sendSubscriptionReceipt(user, { planName, amount, receiptNo, periodEnd }) {
  if (!user?.email) return { ok: false }
  const html = layout(
    'Subscription receipt',
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#44403c;">Thank you for your payment. Details below:</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e4;border-radius:8px;font-size:14px;">
       <tr><td style="padding:10px 16px;color:#78716c;border-bottom:1px solid #e7e5e4;">Receipt No.</td><td style="padding:10px 16px;text-align:right;border-bottom:1px solid #e7e5e4;font-weight:bold;">${receiptNo}</td></tr>
       <tr><td style="padding:10px 16px;color:#78716c;border-bottom:1px solid #e7e5e4;">Plan</td><td style="padding:10px 16px;text-align:right;border-bottom:1px solid #e7e5e4;">${planName}</td></tr>
       <tr><td style="padding:10px 16px;color:#78716c;border-bottom:1px solid #e7e5e4;">Amount</td><td style="padding:10px 16px;text-align:right;border-bottom:1px solid #e7e5e4;font-weight:bold;">₹${(amount / 100).toLocaleString('en-IN')}</td></tr>
       <tr><td style="padding:10px 16px;color:#78716c;">Active until</td><td style="padding:10px 16px;text-align:right;">${new Date(periodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
     </table>`
  )
  return sendEmail({ to: user.email, subject: `Pigeono receipt ${receiptNo}`, html })
}

/** New order notification to vendor */
export async function sendOrderNotificationEmail(vendorUser, { orderId, pigeonName, buyerName, amount }) {
  if (!vendorUser?.email) return { ok: false }
  const html = layout(
    'You have a new order',
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#44403c;"><strong>${buyerName}</strong> wants to buy <strong>${pigeonName}</strong> for <strong>₹${(amount / 100).toLocaleString('en-IN')}</strong>.</p>
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#44403c;">The buyer will pay you directly using your payment details. Once you receive the payment, mark the order as paid in your dashboard.</p>
     <div style="text-align:center;margin:24px 0 8px;">
       <a href="${process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:3000'}/dashboard/vendor/sales" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:bold;">View Order</a>
     </div>
     <p style="margin:0;font-size:12px;color:#78716c;">Order ref: ${orderId}</p>`
  )
  return sendEmail({ to: vendorUser.email, subject: `New order for ${pigeonName}`, html })
}

/** Subscription renewal reminder */
export async function sendRenewalReminderEmail(user, { planName, periodEnd }) {
  if (!user?.email) return { ok: false }
  const html = layout(
    'Your subscription is expiring soon',
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#44403c;">Your <strong>${planName}</strong> plan expires on <strong>${new Date(periodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. Renew now to keep your listings live.</p>
     <div style="text-align:center;margin:24px 0 8px;">
       <a href="${process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:3000'}/dashboard/vendor/subscription" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:bold;">Renew Subscription</a>
     </div>`
  )
  return sendEmail({ to: user.email, subject: 'Your Pigeono subscription is expiring soon', html })
}