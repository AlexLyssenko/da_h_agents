import { useInfiniteQuery } from '@tanstack/react-query'
import { messagesApi } from '../api/messages'
import type { Message, MessagesPage } from '../api/messages'

export function useInfiniteMessages(roomId?: string, dialogId?: string) {
  const key = roomId ? ['messages', 'room', roomId] : ['messages', 'dialog', dialogId]

  return useInfiniteQuery<MessagesPage, Error, { pages: MessagesPage[]; pageParams: unknown[] }, typeof key, string | undefined>({
    queryKey: key,
    queryFn: ({ pageParam }) => {
      if (roomId) return messagesApi.getRoomMessages(roomId, pageParam)
      if (dialogId) return messagesApi.getDialogMessages(dialogId, pageParam)
      return Promise.reject(new Error('No channel'))
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!(roomId || dialogId),
  })
}

export function flattenMessages(pages: MessagesPage[]): Message[] {
  return pages.flatMap((p) => p.messages).reverse()
}
