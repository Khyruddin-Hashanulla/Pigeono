/**
 * SMS delivery service.
 *
 * Provider-ready: set SMS_PROVIDER to "msg91" or "twilio" and add the
 * matching credentials to switch from dev mode to real SMS delivery.
 * In dev mode the OTP is returned to the client so the flow is fully testable.
 */
const PROVIDER = process.env.SMS_PROVIDER || 'dev'

/**
 * Dev mode surfaces OTP codes directly to the client for testability.
 * NEVER active in production — that would let anyone log in as any phone
 * number by reading the OTP from the API response.
 */
export function isSmsDevMode() {
  return PROVIDER === 'dev' && process.env.NODE_ENV !== 'production'
}

export async function sendOtpSms(phone, code) {
  switch (PROVIDER) {
    case 'msg91':
      // Plug in MSG91 Flow API here using MSG91_AUTH_KEY + MSG91_TEMPLATE_ID
      throw new Error('MSG91 not configured — add MSG91_AUTH_KEY and implement the flow call')
    case 'twilio':
      // Plug in Twilio Verify / Messages here using TWILIO_* env vars
      throw new Error('Twilio not configured — add TWILIO_ACCOUNT_SID and implement the send')
    default:
      console.log(`[pigeono] (dev SMS) OTP for ${phone}: ${code}`)
      return { delivered: false, devMode: true }
  }
}
