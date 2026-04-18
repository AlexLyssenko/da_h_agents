import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { roomsApi } from '../../api/rooms'
import { useUiStore } from '../../store/uiStore'

interface CreateRoomModalProps {
  onClose: () => void
}

export function CreateRoomModal({ onClose }: CreateRoomModalProps) {
  const queryClient = useQueryClient()
  const setActiveChannel = useUiStore((s) => s.setActiveChannel)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const createRoom = useMutation({
    mutationFn: () => roomsApi.create({ name: name.trim(), description: description.trim() || undefined, isPublic }),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['rooms', 'mine'] })
      setActiveChannel({ type: 'room', id: room.id })
      onClose()
    },
    onError: () => setError('Could not create room. Name may already be taken.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Room name is required'); return }
    setError('')
    createRoom.mutate()
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create Room</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Room Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. general"
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this room about?"
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-md bg-[var(--bg-secondary)]">
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">
                {isPublic ? 'Public' : 'Private'}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {isPublic ? 'Anyone can join' : 'Invite-only'}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-blue-600' : 'bg-[var(--border)]'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={createRoom.isPending}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md font-medium disabled:opacity-50 transition-colors"
          >
            {createRoom.isPending ? 'Creating...' : 'Create Room'}
          </button>
        </form>
      </div>
    </div>
  )
}
