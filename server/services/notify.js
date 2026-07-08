import Notification from '../models/Notification.js'

/**
 * Fire-and-forget in-app notification. Never throws — a notification
 * failure must not break the main flow.
 */
export async function notify(userId, { type = 'system', title, body, link }) {
  try {
    if (!userId || !title) return
    await Notification.create({ userId, type, title, body, link })
  } catch (err) {
    console.error('[pigeono] notify failed:', err.message)
  }
}
