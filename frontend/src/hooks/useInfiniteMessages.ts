import { useInfiniteQuery } from '@tanstack/react-query'
import { messagesApi } from '../api/messages'
import type { Message, MessagesPage } from '../api/messages'

const PAGE_SIZE = 50

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
    // Cursor = ID of the oldest message in the page (first item, since backend returns asc).
    // If we got fewer messages than the page size there are no more older messages.
    getNextPageParam: (lastPage) => {
      if (lastPage.messages.length < PAGE_SIZE) return undefined
      return lastPage.messages[0]?.id
    },
    enabled: !!(roomId || dialogId),
  })
}

// Pages are ordered: pages[0] = newest batch (first load), pages[n] = older batches.
// Reverse page order so older messages are at the top, newer at the bottom.
export function flattenMessages(pages: MessagesPage[]): Message[] {
  return [...pages].reverse().flatMap((p) => p.messages)
}
