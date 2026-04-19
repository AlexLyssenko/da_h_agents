import { useState } from 'react'
import { useRooms } from '../../hooks/useRooms'
import { useUiStore } from '../../store/uiStore'
import { useUnreadStore } from '../../store/unreadStore'
import { Badge } from '../common/Badge'
import { Spinner } from '../common/Spinner'
import { DMList } from '../contacts/DMList'
import { RoomCatalog } from '../rooms/RoomCatalog'
import { CreateRoomModal } from '../rooms/CreateRoomModal'
import { NewDMModal } from '../contacts/NewDMModal'
import clsx from 'clsx'

export function Sidebar() {
  const { activeChannel, setActiveChannel } = useUiStore()
  const [roomsOpen, setRoomsOpen] = useState(true)
  const [dmsOpen, setDmsOpen] = useState(true)
  const [showCatalog, setShowCatalog] = useState(false)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showNewDM, setShowNewDM] = useState(false)
  const { data: rooms, isLoading: roomsLoading } = useRooms()
  const counts = useUnreadStore((s) => s.counts)

  return (
    <aside className="w-60 bg-[var(--bg-secondary)] flex flex-col border-l border-[var(--border)] overflow-hidden">
      {/* Rooms section */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-2">
          <button
            onClick={() => setRoomsOpen((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-primary)] transition-colors"
          >
            <span className={`transition-transform ${roomsOpen ? 'rotate-90' : ''}`}>▶</span>
            Rooms
          </button>
          <div className="flex gap-1">
            <button
              onClick={() => setShowCatalog(true)}
              className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
              title="Browse rooms"
              aria-label="Browse rooms"
            >
              🔍
            </button>
            <button
              onClick={() => setShowCreateRoom(true)}
              className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
              title="New room"
              aria-label="New room"
            >
              ＋
            </button>
          </div>
        </div>

        {roomsOpen && (
          <div className="pb-1">
            {roomsLoading && <div className="flex justify-center py-2"><Spinner size="sm" /></div>}
            {rooms?.map((room) => {
              const isActive = activeChannel?.type === 'room' && activeChannel.id === room.id
              const unread = counts.get(room.id) ?? 0
              return (
                <button
                  key={room.id}
                  onClick={() => setActiveChannel({ type: 'room', id: room.id })}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left transition-colors',
                    isActive
                      ? 'bg-blue-600/20 text-[var(--text-primary)]'
                      : 'hover:bg-[var(--bg-surface)] text-[var(--text-muted)]'
                  )}
                >
                  <span className="text-[var(--text-muted)] shrink-0">#</span>
                  <span className={clsx('text-sm truncate flex-1', isActive ? 'font-medium text-[var(--text-primary)]' : '')}>
                    {room.name}
                  </span>
                  {unread > 0 && <Badge count={unread} />}
                </button>
              )
            })}
            {rooms?.length === 0 && !roomsLoading && (
              <p className="text-xs text-[var(--text-muted)] px-3 py-1">No rooms joined</p>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-[var(--border)] mx-3 my-1" />

      {/* Direct Messages section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
          <button
            onClick={() => setDmsOpen((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-primary)] transition-colors"
          >
            <span className={`transition-transform ${dmsOpen ? 'rotate-90' : ''}`}>▶</span>
            Direct Messages
          </button>
          <button
            onClick={() => setShowNewDM(true)}
            className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
            title="New direct message"
            aria-label="New direct message"
          >
            ＋
          </button>
        </div>

        {dmsOpen && (
          <div className="flex-1 overflow-y-auto pb-2">
            <DMList />
          </div>
        )}
      </div>

      {/* Modals */}
      {showCatalog && <RoomCatalog onClose={() => setShowCatalog(false)} />}
      {showCreateRoom && <CreateRoomModal onClose={() => setShowCreateRoom(false)} />}
      {showNewDM && <NewDMModal onClose={() => setShowNewDM(false)} />}
    </aside>
  )
}
