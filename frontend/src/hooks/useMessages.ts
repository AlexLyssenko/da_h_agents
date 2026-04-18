import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '../api/socket'
import type { Message } from '../api/messages'

export function useMessages(roomId?: string, dialogId?: string) {
  const queryClient = useQueryClient()
  const key = roomId ? ['messages', 'room', roomId] : ['messages', 'dialog', dialogId]

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleNew = ({ message }: { message: Message }) => {
      const isRelevant =
        (roomId && message.roomId === roomId) ||
        (dialogId && message.dialogId === dialogId)
      if (!isRelevant) return
      queryClient.setQueryData(key, (old: { pages: { messages: Message[] }[]; pageParams: unknown[] } | undefined) => {
        if (!old) return old
        const pages = [...old.pages]
        const lastPage = { ...pages[pages.length - 1] }
        lastPage.messages = [...lastPage.messages, message]
        pages[pages.length - 1] = lastPage
        return { ...old, pages }
      })
    }

    const handleEdited = ({ message }: { message: Message }) => {
      queryClient.setQueryData(key, (old: { pages: { messages: Message[] }[]; pageParams: unknown[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) => (m.id === message.id ? message : m)),
          })),
        }
      })
    }

    const handleDeleted = ({ messageId }: { messageId: string }) => {
      queryClient.setQueryData(key, (old: { pages: { messages: Message[] }[]; pageParams: unknown[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.filter((m) => m.id !== messageId),
          })),
        }
      })
    }

    socket.on('message:new', handleNew)
    socket.on('message:edited', handleEdited)
    socket.on('message:deleted', handleDeleted)

    return () => {
      socket.off('message:new', handleNew)
      socket.off('message:edited', handleEdited)
      socket.off('message:deleted', handleDeleted)
    }
  }, [roomId, dialogId, queryClient])
}
