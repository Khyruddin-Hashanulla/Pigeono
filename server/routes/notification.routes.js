import { Router } from 'express'
import { param } from 'express-validator'
import Notification from '../models/Notification.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

router.use(requireAuth)

/** GET /api/v1/notifications — latest 50 + unread count */
router.get('/', async (req, res, next) => {
  try {
    const [items, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ userId: req.user._id, isRead: false }),
    ])
    res.json({ success: true, data: { items, unreadCount } })
  } catch (err) {
    next(err)
  }
})

/** POST /api/v1/notifications/read-all */
router.post('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

/** POST /api/v1/notifications/:id/read */
router.post('/:id/read', validate([param('id').isMongoId()]), async (req, res, next) => {
  try {
    await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { isRead: true })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
