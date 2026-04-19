import { usePresenceStore } from '../../store/presenceStore'

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

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center text-sm font-bold text-blue-300">
          {username[0]?.toUpperCase()}
        </div>
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-surface)] ${presenceColor[presence] ?? presenceColor.OFFLINE}`} />
      </div>
      <div>
        <h2 className="font-semibold text-[var(--text-primary)] leading-tight">{username}</h2>
        <p className="text-xs text-[var(--text-muted)] leading-tight">{presenceLabel[presence] ?? 'Offline'}</p>
      </div>
    </div>
  )
}
