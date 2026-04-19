import type { AcceptedFriend } from '../../api/friends'
import { Avatar } from '../common/Avatar'
import { PresenceDot } from '../common/PresenceDot'
import { Badge } from '../common/Badge'
import { usePresenceStore } from '../../store/presenceStore'
import { useUnreadStore } from '../../store/unreadStore'
import { useAuthStore } from '../../store/authStore'
import { buildDialogId } from '../../utils/dialogId'
import clsx from 'clsx'

interface ContactItemProps {
  friendship: AcceptedFriend
  isActive: boolean
  onClick: () => void
  onRemove: () => void
}

export function ContactItem({ friendship, isActive, onClick, onRemove }: ContactItemProps) {
  const currentUser = useAuthStore((s) => s.user)
  const presences = usePresenceStore((s) => s.presences)

  const friend = friendship.friend
  const dialogId = currentUser ? buildDialogId(currentUser.id, friend.id) : ''
  const unreadCount = useUnreadStore((s) => s.counts.get(dialogId) ?? 0)
  const presence = presences.get(friend.id) ?? 'OFFLINE'

  return (
    <div
      className={clsx(
        'group w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
        isActive
          ? 'bg-blue-600/20 text-[var(--text-primary)]'
          : 'hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]'
      )}
    >
      {/* Main clickable area */}
      <button
        onClick={onClick}
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
        aria-label={`Open DM with ${friend.username}`}
      >
        <div className="relative shrink-0">
          <Avatar username={friend.username} size="sm" />
          <PresenceDot
            status={presence}
            className="absolute -bottom-0.5 -right-0.5 border border-[var(--bg-primary)] w-2.5 h-2.5"
          />
        </div>
        <span className={clsx('font-mono text-sm truncate', isActive && 'text-[var(--text-primary)]')}>
          {friend.username}
        </span>
      </button>

      {/* Unread badge — hidden when remove button is visible */}
      {unreadCount > 0 && (
        <span className="group-hover:hidden">
          <Badge count={unreadCount} />
        </span>
      )}

      {/* Remove button — revealed on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded text-[var(--text-muted)] hover:text-red-400 transition-colors shrink-0"
        aria-label={`Remove ${friend.username} from friends`}
        title="Remove friend"
      >
        ✕
      </button>
    </div>
  )
}
