import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

function normalizeSocketUrl(url: string) {
  let u = url.trim()
  u = u.replace(/^(https?:\/)([^/])/, '$1/$2')
  u = u.replace(/^(https?:\/\/)+/, (m) => m.toLowerCase().startsWith('https') ? 'https://' : 'http://')
  return u.replace(/\/$/, '') || '/'
}

function resolveSocketHost() {
  if (import.meta.env.VITE_SOCKET_URL) {
    return normalizeSocketUrl(import.meta.env.VITE_SOCKET_URL)
  }
  if (import.meta.env.VITE_API_URL) {
    return normalizeSocketUrl(import.meta.env.VITE_API_URL.replace(/\/api\/?$/, ''))
  }
  // If hosted on Vercel or live web, default directly to the live Render backend
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return 'https://bubi-l4u2.onrender.com'
  }
  return '/'
}

export const SOCKET_URL = resolveSocketHost()

export function getSocket(token: string) {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })
  } else {
    socket.auth = { token }
    if (!socket.connected) {
      socket.connect()
    }
  }
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
