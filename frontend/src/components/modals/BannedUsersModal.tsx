import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roomsApi } from '../../api/rooms'
import type { RoomBan } from '../../api/rooms'
import { Spinner } from '../common/Spinner'
import { formatRelative } from '../../utils/formatDate'

interface BannedUsersModalProps {
  roomId: string
  onClose: () => void
}

export function BannedUsersModal({ roomId, onClose }: BannedUsersModalProps) {
  const queryClient = useQueryClient()
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const { data: bans, isLoading } = useQuery<RoomBan[]>({
    queryKey: ['rooms', roomId, 'bans'],
    queryFn: () => roomsApi.getBans(roomId),
  })

  const unban = useMutation({
    mutationFn: (userId: string) => roomsApi.unban(roomId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'bans'] }),
  })

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
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Banned Users</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Close">✕</button>
        </div>

        {isLoading && <div className="flex justify-center py-6"><Spinner /></div>}

        {bans && bans.length === 0 && (
          <p className="text-center text-[var(--text-muted)] text-sm py-6">No banned users</p>
        )}

        {bans && bans.length > 0 && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {bans.map((ban) => (
              <div key={ban.userId} className="flex items-center justify-between p-3 rounded-md bg-[var(--bg-secondary)]">
                <div>
                  <div className="font-mono text-sm text-[var(--text-primary)]">{ban.username}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Banned by {ban.bannedBy} · {formatRelative(ban.createdAt)}
                  </div>
                </div>
                <button
                  onClick={() => unban.mutate(ban.userId)}
                  className="text-xs text-green-400 hover:text-green-300"
                >
                  Unban
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
