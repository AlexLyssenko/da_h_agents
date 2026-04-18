import { useEffect, useRef, useState, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import { useInfiniteMessages, flattenMessages } from '../../hooks/useInfiniteMessages'
import { useMessages } from '../../hooks/useMessages'
import type { Message } from '../../api/messages'
import { MessageItem } from './MessageItem'
import { TypingIndicator } from './TypingIndicator'
import { Spinner } from '../common/Spinner'
import { EmptyState } from '../common/EmptyState'
import { formatDateSeparator, isSameDay_ } from '../../utils/formatDate'
import { useUnreadStore } from '../../store/unreadStore'

interface MessageListProps {
  roomId?: string
  dialogId?: string
  isAdmin?: boolean
  onReply: (message: Message) => void
}

export function MessageList({ roomId, dialogId, isAdmin = false, onReply }: MessageListProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteMessages(
    roomId,
    dialogId
  )
  useMessages(roomId, dialogId)

  const listRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const prevScrollHeightRef = useRef(0)
  const messageIdMap = useRef<Map<string, HTMLDivElement>>(new Map())
  const [showJumpToBottom, setShowJumpToBottom] = useState(false)

  const clearUnread = useUnreadStore((s) => s.clearUnread)
  const channelKey = roomId ?? dialogId ?? ''

  // Sentinel at the top triggers loading more messages
  const { ref: topSentinelRef, inView } = useInView({ threshold: 0 })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      prevScrollHeightRef.current = listRef.current?.scrollHeight ?? 0
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Restore scroll after loading older messages
  useEffect(() => {
    if (!isFetchingNextPage && prevScrollHeightRef.current && listRef.current) {
      const newScrollHeight = listRef.current.scrollHeight
      const diff = newScrollHeight - prevScrollHeightRef.current
      listRef.current.scrollTop += diff
      prevScrollHeightRef.current = 0
    }
  }, [isFetchingNextPage, data])

  // Auto-scroll to bottom on new messages if already at bottom
  const messages = data ? flattenMessages(data.pages) : []
  const lastMessageId = messages[messages.length - 1]?.id

  useEffect(() => {
    if (isAtBottomRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
      clearUnread(channelKey)
    }
  }, [lastMessageId, channelKey, clearUnread])

  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtBottomRef.current = distanceFromBottom < 100
    setShowJumpToBottom(distanceFromBottom > 300)
  }, [])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToMessage = (messageId: string) => {
    const el = messageIdMap.current.get(messageId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.classList.add('bg-yellow-500/10')
    setTimeout(() => el?.classList.remove('bg-yellow-500/10'), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon="💬"
          title="No messages yet"
          description="Be the first to send a message!"
        />
      </div>
    )
  }

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto py-2"
        onScroll={handleScroll}
      >
        {/* Top sentinel for infinite scroll */}
        <div ref={topSentinelRef} className="h-1" />

        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Spinner size="sm" />
          </div>
        )}

        {messages.map((message, idx) => {
          const prev = messages[idx - 1]
          const showDateSep = !prev || !isSameDay_(prev.createdAt, message.createdAt)
          const isCompact =
            !showDateSep &&
            !!prev &&
            prev.authorId === message.authorId &&
            new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000

          return (
            <div key={message.id}>
              {showDateSep && (
                <div className="flex items-center gap-3 my-3 px-4">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-xs text-[var(--text-muted)] shrink-0">
                    {formatDateSeparator(message.createdAt)}
                  </span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
              )}
              <div ref={(el) => { if (el) messageIdMap.current.set(message.id, el) }}>
                <MessageItem
                  message={message}
                  isCompact={isCompact}
                  isAdmin={isAdmin}
                  onReply={onReply}
                  onScrollTo={scrollToMessage}
                />
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      <TypingIndicator roomId={roomId} dialogId={dialogId} />

      {showJumpToBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-12 right-4 flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg z-10 transition-colors"
          aria-label="Jump to bottom"
        >
          ↓
        </button>
      )}
    </div>
  )
}
