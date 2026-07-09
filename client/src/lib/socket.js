import { io } from 'socket.io-client'
import { API_ORIGIN } from './api'

/**
 * Socket.io client singleton.
 * Connects to VITE_API_URL when set (split deploys: Vercel + Render),
 * otherwise same-origin (Vite proxies /socket.io to the API server in dev).
 * Auth uses the same httpOnly accessToken cookie as REST calls, sent
 * automatically with the handshake because withCredentials is true.
 */
let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(API_ORIGIN || '/', {
      path: '/socket.io',
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
  }
  return socket
}

/** Disconnect and drop the singleton (call on logout). */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
