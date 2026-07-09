import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import Conversation from '../models/Conversation.js'

// Must mirror middleware/auth.js: known dev fallback is never allowed in production.
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('JWT_SECRET must be set in production')
      })()
    : 'dev-only-secret-change-me')

let io = null

/** Parse the accessToken out of the raw Cookie header. */
function tokenFromCookies(cookieHeader = '') {
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith('accessToken='))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null
}

/**
 * Attach Socket.io to the HTTP server.
 *
 * Auth: reuses the same httpOnly accessToken cookie as the REST API.
 * Rooms:
 *   - user:<userId>   — personal room, always joined (badges, notifications)
 *   - convo:<convoId> — joined while a conversation thread is open
 *
 * Client → server events: conversation:join, conversation:leave, typing
 * Server → client events: message:new, conversation:updated, typing
 */
export function initSocket(server, { corsOrigins }) {
  io = new Server(server, {
    path: '/socket.io',
    cors: { origin: corsOrigins, credentials: true },
  })

  io.use((socket, next) => {
    try {
      const token =
        tokenFromCookies(socket.handshake.headers.cookie) || socket.handshake.auth?.token
      if (!token) return next(new Error('Not authenticated'))
      const payload = jwt.verify(token, JWT_SECRET)
      socket.data.userId = payload.sub
      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId
    socket.join(`user:${userId}`)

    socket.on('conversation:join', async (conversationId) => {
      try {
        if (typeof conversationId !== 'string' || !/^[a-f\d]{24}$/i.test(conversationId)) return
        // Only participants may join the room
        const convo = await Conversation.findById(conversationId, 'buyerId vendorUserId')
        if (!convo) return
        const isParticipant =
          convo.buyerId.toString() === userId || convo.vendorUserId.toString() === userId
        if (isParticipant) socket.join(`convo:${conversationId}`)
      } catch {
        // ignore malformed join attempts
      }
    })

    socket.on('conversation:leave', (conversationId) => {
      if (typeof conversationId === 'string') socket.leave(`convo:${conversationId}`)
    })

    // Relay typing indicators to the other participant(s) in the room
    socket.on('typing', ({ conversationId, isTyping }) => {
      if (typeof conversationId !== 'string') return
      socket.to(`convo:${conversationId}`).emit('typing', {
        conversationId,
        userId,
        isTyping: Boolean(isTyping),
      })
    })
  })

  return io
}

/** Emit a new message to the conversation room + both personal rooms. */
export function emitNewMessage({ conversation, message }) {
  if (!io) return
  const payload = { conversationId: String(conversation._id), message }
  io.to(`convo:${conversation._id}`).emit('message:new', payload)
  // Personal rooms drive the unread badge / conversation list refresh
  // for participants who don't have the thread open.
  const update = {
    conversationId: String(conversation._id),
    lastMessage: conversation.lastMessage,
    unread: conversation.unread,
  }
  io.to(`user:${conversation.buyerId}`).emit('conversation:updated', update)
  io.to(`user:${conversation.vendorUserId}`).emit('conversation:updated', update)
}

/** Emit an arbitrary event to one user's personal room (e.g. notifications). */
export function emitToUser(userId, event, payload) {
  if (!io) return
  io.to(`user:${userId}`).emit(event, payload)
}
