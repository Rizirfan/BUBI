import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/'

export function getSocket(token: string) {
  if (socket && socket.connected) return socket
  if (socket) { socket.auth = { token }; socket.connect(); return socket }
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
