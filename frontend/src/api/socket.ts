import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  return socket
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    return socket
  }
  if (socket) {
    socket.disconnect()
  }

  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
  })

  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function reconnectSocket(token: string): Socket {
  disconnectSocket()
  return connectSocket(token)
}
