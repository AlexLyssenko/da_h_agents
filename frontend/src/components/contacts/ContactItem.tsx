import type { FriendRequest } from '../../api/friends'
import { Avatar } from '../common/Avatar'
import { PresenceDot } from '../common/PresenceDot'
import { Badge } from '../common/Badge'
import { usePresenceStore } from '../../store/presenceStore'
import { useUnreadStore } from '../../store/unreadStore'
import { useAuthStore } from '../../store/authStore'
import { buildDialogId } from '../../utils/dialogId'
import clsx from 'clsx'

interface ContactItemProps {
  friendship: FriendRequest
  isActive: boolean
  onClick: () => void
}

export function ContactItem({ friendship, isActive, onClick }: ContactItemProps) {
  const currentUser = useAuthStore((s) => s.user)
  const presences = usePresenceStore((s) => s.presences)

  const friend = friendship.requesterId === currentUser?.id
    ? friendship.recipient
    : friendship.requester

  const dialogId = currentUser ? buildDialogId(currentUser.id, friend.id) : ''
  const unreadCount = useUnreadStore((s) => s.counts.get(dialogId) ?? 0)
  const presence = presences.get(friend.id) ?? 'OFFLINE'

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors',
        isActive
          ? 'bg-blue-600/20 text-[var(--text-primary)]'
          : 'hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]'
      )}
    >
      <div className="relative">
        <Avatar username={friend.username} size="sm" />
        <PresenceDot
          status={presence}
          className="absolute -bottom-0.5 -right-0.5 border border-[var(--bg-primary)] w-2.5 h-2.5"
        />
      </div>
      <span className={clsx('font-mono text-sm truncate flex-1', isActive && 'text-[var(--text-primary)]')}>
        {friend.username}
      </span>
      {unreadCount > 0 && <Badge count={unreadCount} />}
    </button>
  )
}
