import { useEffect, useState } from 'react'
import { getSocket } from '../api/socket'
import { useAuthStore } from '../store/authStore'

interface TypingUser {
  userId: string
}

export function useTyping(roomId?: string, dialogId?: string) {
  const [typingUserIds, setTypingUserIds] = useState<string[]>([])
  const currentUser = useAuthStore((s) => s.user)
  const timersRef: Record<string, ReturnType<typeof setTimeout>> = {}

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleTyping = ({ userId, roomId: rId, dialogId: dId }: TypingUser & { roomId?: string; dialogId?: string }) => {
      if (userId === currentUser?.id) return
      const isRelevant = (roomId && rId === roomId) || (dialogId && dId === dialogId)
      if (!isRelevant) return

      setTypingUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]))

      if (timersRef[userId]) clearTimeout(timersRef[userId])
      timersRef[userId] = setTimeout(() => {
        setTypingUserIds((prev) => prev.filter((id) => id !== userId))
      }, 5000)
    }

    socket.on('typing', handleTyping)
    return () => {
      socket.off('typing', handleTyping)
      Object.values(timersRef).forEach(clearTimeout)
    }
  }, [roomId, dialogId, currentUser?.id])

  return { typingUserIds }
}
