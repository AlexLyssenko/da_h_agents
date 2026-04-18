import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roomsApi } from '../../api/rooms'
import type { Room } from '../../api/rooms'
import { RoomCard } from './RoomCard'
import { Spinner } from '../common/Spinner'
import { useRooms } from '../../hooks/useRooms'
import { useUiStore } from '../../store/uiStore'

interface RoomCatalogProps {
  onClose: () => void
}

export function RoomCatalog({ onClose }: RoomCatalogProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const setActiveChannel = useUiStore((s) => s.setActiveChannel)
  const { data: myRooms } = useRooms()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const { data: rooms, isLoading } = useQuery<Room[]>({
    queryKey: ['rooms', 'catalog', debouncedSearch],
    queryFn: () => roomsApi.list(debouncedSearch || undefined),
  })

  const joinRoom = useMutation({
    mutationFn: (id: string) => roomsApi.join(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rooms', 'mine'] })
      setActiveChannel({ type: 'room', id })
      onClose()
    },
  })

  const myRoomIds = new Set(myRooms?.map((r) => r.id) ?? [])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg w-full max-w-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Browse Rooms</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Close">✕</button>
        </div>

        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search rooms..."
          className="w-full px-3 py-2 mb-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
        />

        {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}

        {rooms && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {rooms.length === 0 && (
              <p className="text-center text-[var(--text-muted)] text-sm py-8">No rooms found</p>
            )}
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                isMember={myRoomIds.has(room.id)}
                onJoin={() => {
                  if (myRoomIds.has(room.id)) {
                    setActiveChannel({ type: 'room', id: room.id })
                    onClose()
                  } else {
                    joinRoom.mutate(room.id)
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
