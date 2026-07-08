import { Router } from 'express'
import Category from '../models/Category.js'
import Pigeon from '../models/Pigeon.js'

const router = Router()

/** GET /api/v1/categories — all categories with active listing counts */
router.get('/', async (_req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean()
    const counts = await Pigeon.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ])
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]))
    const data = categories.map((c) => ({ ...c, listingCount: countMap[c.slug] || 0 }))
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

export default router
