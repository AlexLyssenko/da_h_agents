import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roomsApi } from '../../api/rooms'
import type { RoomMember } from '../../api/rooms'
import { useAuthStore } from '../../store/authStore'
import { Avatar } from '../common/Avatar'
import { Spinner } from '../common/Spinner'

interface ManageAdminsModalProps {
  roomId: string
  ownerId: string
  onClose: () => void
}

export function ManageAdminsModal({ roomId, ownerId, onClose }: ManageAdminsModalProps) {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const { data: members, isLoading } = useQuery<RoomMember[]>({
    queryKey: ['rooms', roomId, 'members'],
    queryFn: () => roomsApi.getMembers(roomId),
  })

  const promote = useMutation({
    mutationFn: (userId: string) => roomsApi.promoteAdmin(roomId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'members'] }),
  })

  const demote = useMutation({
    mutationFn: (userId: string) => roomsApi.demoteAdmin(roomId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'members'] }),
  })

  const isOwner = currentUser?.id === ownerId

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
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Manage Admins</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Close">✕</button>
        </div>

        {isLoading && <div className="flex justify-center py-6"><Spinner /></div>}

        {members && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {members.filter(m => m.id !== ownerId).map((member) => (
              <div key={member.id} className="flex items-center justify-between p-2 rounded-md bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-2">
                  <Avatar username={member.username} size="sm" />
                  <span className="font-mono text-sm text-[var(--text-primary)]">{member.username}</span>
                  {member.isAdmin && <span className="text-xs text-blue-400">admin</span>}
                </div>
                {isOwner && (
                  member.isAdmin ? (
                    <button onClick={() => demote.mutate(member.id)}
                      className="text-xs text-yellow-400 hover:text-yellow-300">
                      Demote
                    </button>
                  ) : (
                    <button onClick={() => promote.mutate(member.id)}
                      className="text-xs text-blue-400 hover:text-blue-300">
                      Promote
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
