import { useQuery } from '@tanstack/react-query'
import { usePresenceStore } from '../../store/presenceStore'
import { friendsApi } from '../../api/friends'

interface DmHeaderProps {
  username: string
  userId: string
}

const presenceLabel: Record<string, string> = {
  ONLINE: 'Online',
  AFK: 'Away',
  OFFLINE: 'Offline',
}

const presenceColor: Record<string, string> = {
  ONLINE: 'bg-green-400',
  AFK: 'bg-yellow-400',
  OFFLINE: 'bg-[var(--text-muted)]',
}

export function DmHeader({ username, userId }: DmHeaderProps) {
  const presence = usePresenceStore((s) => s.getPresence(userId))

  const { data: banStatus } = useQuery({
    queryKey: ['ban', 'check', userId],
    queryFn: () => friendsApi.checkBan(userId),
  })

  const isBannedByMe = banStatus?.isBannedByMe ?? false
  const isBannedByThem = banStatus?.isBannedByThem ?? false

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)]">
      {/* Left: avatar + name + presence */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center text-sm font-bold text-blue-300">
            {username[0]?.toUpperCase()}
          </div>
          {!isBannedByMe && !isBannedByThem && (
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-surface)] ${presenceColor[presence] ?? presenceColor.OFFLINE}`} />
          )}
        </div>

        <div className="min-w-0">
          <h2 className="font-semibold text-[var(--text-primary)] leading-tight truncate">{username}</h2>
          {isBannedByMe && (
            <p className="text-xs text-red-400 leading-tight">You have blocked this user</p>
          )}
          {isBannedByThem && !isBannedByMe && (
            <p className="text-xs text-[var(--text-muted)] leading-tight">This user has blocked you</p>
          )}
          {!isBannedByMe && !isBannedByThem && (
            <p className="text-xs text-[var(--text-muted)] leading-tight">{presenceLabel[presence] ?? 'Offline'}</p>
          )}
        </div>
      </div>

    </div>
  )
}
