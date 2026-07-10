import { io } from 'socket.io-client'
import { API_ORIGIN, getAccessToken } from './api'

/**
 * Socket.io client singleton.
 * Connects to VITE_API_URL when set (split deploys: Vercel + Render),
 * otherwise same-origin (Vite proxies /socket.io to the API server in dev).
 * Auth: the httpOnly accessToken cookie rides along via withCredentials,
 * plus a bearer token in the handshake auth for browsers that block
 * third-party cookies on split deploys (mobile Safari etc). The auth
 * callback re-reads the token on every (re)connect so reconnects after a
 * token refresh use the fresh token.
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
      auth: (cb) => cb({ token: getAccessToken() }),
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
