import type { Message } from '../../api/messages'
import { MessageBubble } from './MessageBubble'
import { useAuthStore } from '../../store/authStore'

interface MessageItemProps {
  message: Message
  isCompact: boolean
  isAdmin: boolean
  onReply: (message: Message) => void
  onScrollTo?: (messageId: string) => void
}

export function MessageItem({ message, isCompact, isAdmin, onReply, onScrollTo }: MessageItemProps) {
  const currentUser = useAuthStore((s) => s.user)
  const isOwn = message.authorId === currentUser?.id

  return (
    <MessageBubble
      message={message}
      isOwn={isOwn}
      isCompact={isCompact}
      isAdmin={isAdmin}
      onReply={onReply}
      onScrollTo={onScrollTo}
    />
  )
}
