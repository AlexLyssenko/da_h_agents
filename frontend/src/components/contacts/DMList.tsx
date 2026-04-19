import { useQuery } from '@tanstack/react-query'
import { messagesApi } from '../../api/messages'
import type { Conversation } from '../../api/messages'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { useUnreadStore } from '../../store/unreadStore'
import { usePresenceStore } from '../../store/presenceStore'
import { Badge } from '../common/Badge'
import { Spinner } from '../common/Spinner'
import clsx from 'clsx'

const presenceDot: Record<string, string> = {
  ONLINE: 'bg-green-400',
  AFK: 'bg-yellow-400',
  OFFLINE: 'bg-[var(--text-muted)]',
}

export function DMList() {
  const currentUser = useAuthStore((s) => s.user)
  const { activeChannel, setActiveChannel } = useUiStore()
  const counts = useUnreadStore((s) => s.counts)
  const getPresence = usePresenceStore((s) => s.getPresence)

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: messagesApi.getConversations,
    refetchInterval: 30000,
  })

  const openDm = (conv: Conversation) => {
    if (!currentUser) return
    setActiveChannel({ type: 'dialog', dialogId: conv.dialogId, userId: conv.userId, username: conv.username })
  }

  if (isLoading) return <div className="flex justify-center py-3"><Spinner size="sm" /></div>

  if (!conversations || conversations.length === 0) {
    return (
      <p className="text-xs text-[var(--text-muted)] px-3 py-2">
        No conversations yet. Click ＋ to start one.
      </p>
    )
  }

  return (
    <div className="space-y-0.5">
      {conversations.map((conv) => {
        const isActive = activeChannel?.type === 'dialog' && activeChannel.dialogId === conv.dialogId
        const unread = counts.get(`dm:${conv.dialogId}`) ?? 0
        const presence = getPresence(conv.userId)

        return (
          <button
            key={conv.dialogId}
            onClick={() => openDm(conv)}
            className={clsx(
              'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left transition-colors',
              isActive
                ? 'bg-blue-600/20 text-[var(--text-primary)]'
                : 'hover:bg-[var(--bg-surface)] text-[var(--text-muted)]'
            )}
          >
            <div className="relative shrink-0">
              <div className="w-6 h-6 rounded-full bg-blue-600/30 flex items-center justify-center text-xs font-bold text-blue-300">
                {conv.username[0]?.toUpperCase()}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[var(--bg-secondary)] ${presenceDot[presence] ?? presenceDot.OFFLINE}`} />
            </div>
            <span className={clsx('text-sm truncate flex-1', isActive ? 'font-medium text-[var(--text-primary)]' : '')}>
              {conv.username}
            </span>
            {unread > 0 && <Badge count={unread} />}
          </button>
        )
      })}
    </div>
  )
}
