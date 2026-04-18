import type { Room } from '../../api/rooms'

interface RoomCardProps {
  room: Room
  isMember: boolean
  onJoin: () => void
}

export function RoomCard({ room, isMember, onJoin }: RoomCardProps) {
  return (
    <div className="flex items-start justify-between p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-blue-600 transition-colors">
      <div className="min-w-0">
        <div className="font-semibold text-[var(--text-primary)]"># {room.name}</div>
        {room.description && (
          <p className="text-sm text-[var(--text-muted)] mt-0.5 truncate max-w-xs">{room.description}</p>
        )}
        {room.memberCount !== undefined && (
          <p className="text-xs text-[var(--text-muted)] mt-1">{room.memberCount} members</p>
        )}
      </div>
      <button
        onClick={onJoin}
        disabled={isMember}
        className="ml-4 px-3 py-1.5 text-sm rounded-md font-medium transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white disabled:bg-[var(--bg-surface)]"
      >
        {isMember ? 'Joined' : 'Join'}
      </button>
    </div>
  )
}
