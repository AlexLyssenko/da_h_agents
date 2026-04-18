import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { connectSocket, disconnectSocket, getSocket } from '../api/socket'
import { useAuthStore } from '../store/authStore'
import { usePresenceStore } from '../store/presenceStore'
import { useUnreadStore } from '../store/unreadStore'
import toast from 'react-hot-toast'

export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setPresence = usePresenceStore((s) => s.setPresence)
  const setUnread = useUnreadStore((s) => s.setUnread)
  const queryClient = useQueryClient()
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAfkRef = useRef(false)

  useEffect(() => {
    if (!accessToken) return

    const socket = connectSocket(accessToken)

    // Presence heartbeat
    const sendHeartbeat = (status: 'online' | 'afk') => {
      getSocket()?.emit('presence:heartbeat', { status })
    }

    heartbeatRef.current = setInterval(() => {
      sendHeartbeat(isAfkRef.current ? 'afk' : 'online')
    }, 30000)

    // Idle detection
    const resetIdle = () => {
      if (isAfkRef.current) {
        isAfkRef.current = false
        sendHeartbeat('online')
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        isAfkRef.current = true
        sendHeartbeat('afk')
      }, 60000)
    }

    const idleEvents = ['mousemove', 'keydown', 'click', 'scroll'] as const
    idleEvents.forEach((e) => document.addEventListener(e, resetIdle))
    resetIdle()

    // Socket event listeners
    socket.on('presence:update', ({ userId, status }) => {
      setPresence(userId, status)
    })

    socket.on('notification:unread', ({ roomId, dialogId, count }) => {
      const key = roomId ?? dialogId
      if (key) setUnread(key, count)
    })

    socket.on('room:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    })

    socket.on('friend:request', (friendship) => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      toast(`Friend request from ${friendship.requester?.username}`, { icon: '👤' })
    })

    socket.on('friend:accepted', () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
    })

    socket.on('error', ({ message }: { code: string; message: string }) => {
      toast.error(message)
    })

    return () => {
      socket.off('presence:update')
      socket.off('notification:unread')
      socket.off('room:updated')
      socket.off('friend:request')
      socket.off('friend:accepted')
      socket.off('error')
      idleEvents.forEach((e) => document.removeEventListener(e, resetIdle))
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [accessToken, clearAuth, setPresence, setUnread, queryClient])

  useEffect(() => {
    return () => {
      disconnectSocket()
    }
  }, [])
}
