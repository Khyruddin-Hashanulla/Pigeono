import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || ''

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(API_URL || '/', {
      path: '/socket.io',
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
