import { Router } from 'express'
import mongoose from 'mongoose'
import { body, param, query } from 'express-validator'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import Pigeon from '../models/Pigeon.js'
import VendorProfile from '../models/VendorProfile.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { ApiError } from '../middleware/error.js'
import { emitNewMessage } from '../services/socket.js'

const router = Router()

router.use(requireAuth)

/** Load a conversation and assert the current user is a participant. */
async function loadConversation(id, userId) {
  const convo = await Conversation.findById(id)
  if (!convo) throw new ApiError(404, 'Conversation not found')
  const isBuyer = convo.buyerId.equals(userId)
  const isVendor = convo.vendorUserId.equals(userId)
  if (!isBuyer && !isVendor) throw new ApiError(403, 'Not a participant in this conversation')
  return { convo, role: isBuyer ? 'buyer' : 'vendor' }
}

// ---------------------------------------------------------------------------
// GET /messages/conversations — list my conversations (buyer or vendor side)
// ---------------------------------------------------------------------------
router.get('/conversations', async (req, res, next) => {
  try {
    const uid = req.user._id
    const items = await Conversation.find(
      mongoose.trusted({ $or: [{ buyerId: uid }, { vendorUserId: uid }] })
    )
      .sort({ updatedAt: -1 })
      .limit(100)
      .populate('buyerId', 'name')
      .populate('vendorUserId', 'name')
      .populate('vendorProfileId', 'storeName storeSlug')
      .populate('pigeonId', 'title price media.photos status')
    res.json({ success: true, data: items })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /messages/conversations — start (or reuse) a conversation with a vendor
// body: { pigeonId } — buyer contacts the seller about a listing
// ---------------------------------------------------------------------------
router.post(
  '/conversations',
  validate([body('pigeonId').isMongoId()]),
  async (req, res, next) => {
    try {
      const pigeon = await Pigeon.findById(req.body.pigeonId).populate('vendorId')
      if (!pigeon) throw new ApiError(404, 'Listing not found')
      const vendorProfile = pigeon.vendorId
      if (!vendorProfile) throw new ApiError(404, 'Vendor not found')
      if (vendorProfile.userId.equals(req.user._id)) {
        throw new ApiError(400, 'You cannot message yourself about your own listing')
      }

      let convo = await Conversation.findOne({
        buyerId: req.user._id,
        vendorUserId: vendorProfile.userId,
        pigeonId: pigeon._id,
      })
      if (!convo) {
        convo = await Conversation.create({
          buyerId: req.user._id,
          vendorUserId: vendorProfile.userId,
          vendorProfileId: vendorProfile._id,
          pigeonId: pigeon._id,
        })
        await Pigeon.updateOne({ _id: pigeon._id }, mongoose.trusted({ $inc: { inquiries: 1 } }))
      }
      const populated = await Conversation.findById(convo._id)
        .populate('buyerId', 'name')
        .populate('vendorUserId', 'name')
        .populate('vendorProfileId', 'storeName storeSlug')
        .populate('pigeonId', 'title price media.photos status')
      res.status(201).json({ success: true, data: populated })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// GET /messages/conversations/:id — messages in a conversation (marks read)
// ---------------------------------------------------------------------------
router.get(
  '/conversations/:id',
  validate([param('id').isMongoId(), query('after').optional().isISO8601()]),
  async (req, res, next) => {
    try {
      const { convo, role } = await loadConversation(req.params.id, req.user._id)

      const filter = { conversationId: convo._id }
      if (req.query.after) {
        filter.createdAt = mongoose.trusted({ $gt: new Date(req.query.after) })
      }
      const messages = await Message.find(filter).sort({ createdAt: 1 }).limit(200)

      // mark my side read
      if (convo.unread[role] > 0) {
        convo.unread[role] = 0
        await convo.save()
      }

      const populated = await Conversation.findById(convo._id)
        .populate('buyerId', 'name')
        .populate('vendorUserId', 'name')
        .populate('vendorProfileId', 'storeName storeSlug')
        .populate('pigeonId', 'title price media.photos status')

      res.json({ success: true, data: { conversation: populated, messages } })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /messages/conversations/:id — send a message
// ---------------------------------------------------------------------------
router.post(
  '/conversations/:id',
  validate([param('id').isMongoId(), body('body').trim().isLength({ min: 1, max: 2000 })]),
  async (req, res, next) => {
    try {
      const { convo, role } = await loadConversation(req.params.id, req.user._id)

      const message = await Message.create({
        conversationId: convo._id,
        senderId: req.user._id,
        body: req.body.body,
      })

      convo.lastMessage = { body: message.body, senderId: req.user._id, at: message.createdAt }
      const other = role === 'buyer' ? 'vendor' : 'buyer'
      convo.unread[other] = (convo.unread[other] || 0) + 1
      await convo.save()

      // Real-time delivery to the other participant (open thread + badge)
      emitNewMessage({ conversation: convo, message })

      res.status(201).json({ success: true, data: message })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// GET /messages/unread-count — total unread for navbar badge
// ---------------------------------------------------------------------------
router.get('/unread-count', async (req, res, next) => {
  try {
    const uid = req.user._id
    const convos = await Conversation.find(
      mongoose.trusted({ $or: [{ buyerId: uid }, { vendorUserId: uid }] }),
      'buyerId unread'
    )
    let total = 0
    for (const c of convos) {
      total += c.buyerId.equals(uid) ? c.unread.buyer : c.unread.vendor
    }
    res.json({ success: true, data: { total } })
  } catch (err) {
    next(err)
  }
})

export default router
