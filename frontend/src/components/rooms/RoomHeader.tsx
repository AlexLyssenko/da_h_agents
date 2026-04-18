import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roomsApi } from '../../api/rooms'
import type { Room } from '../../api/rooms'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { ManageAdminsModal } from '../modals/ManageAdminsModal'
import { BannedUsersModal } from '../modals/BannedUsersModal'
import { ConfirmDialog } from '../modals/ConfirmDialog'

interface RoomHeaderProps {
  room: Room
}

export function RoomHeader({ room }: RoomHeaderProps) {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const setActiveChannel = useUiStore((s) => s.setActiveChannel)
  const toggleMembersPanel = useUiStore((s) => s.setMembersPanelOpen)
  const membersPanelOpen = useUiStore((s) => s.membersPanelOpen)
  const [showMenu, setShowMenu] = useState(false)
  const [showAdmins, setShowAdmins] = useState(false)
  const [showBans, setShowBans] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showEditRoom, setShowEditRoom] = useState(false)
  const [editName, setEditName] = useState(room.name)
  const [editDesc, setEditDesc] = useState(room.description ?? '')
  const [editPublic, setEditPublic] = useState(room.isPublic)
  const [descExpanded, setDescExpanded] = useState(false)

  const isOwner = currentUser?.id === room.ownerId

  // Get my membership to check if admin
  const { data: members } = useQuery({
    queryKey: ['rooms', room.id, 'members'],
    queryFn: () => roomsApi.getMembers(room.id),
    enabled: !!room.id,
  })
  const myMembership = members?.find((m) => m.userId === currentUser?.id)
  const isAdmin = isOwner || !!myMembership?.isAdmin

  const deleteRoom = useMutation({
    mutationFn: () => roomsApi.delete(room.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', 'mine'] })
      setActiveChannel(null)
    },
  })

  const updateRoom = useMutation({
    mutationFn: () => roomsApi.update(room.id, { name: editName, description: editDesc, isPublic: editPublic }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', 'mine'] })
      setShowEditRoom(false)
    },
  })

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">#</span>
            <h2 className="font-semibold text-[var(--text-primary)]">{room.name}</h2>
            {!room.isPublic && <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">private</span>}
          </div>
          {room.description && (
            <p
              className={`text-xs text-[var(--text-muted)] mt-0.5 cursor-pointer ${descExpanded ? '' : 'truncate max-w-xs'}`}
              onClick={() => setDescExpanded((v) => !v)}
            >
              {room.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => toggleMembersPanel(!membersPanelOpen)}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Toggle members panel"
          >
            👥
          </button>

          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Room settings"
              >
                ⚙️
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 z-30 w-48 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md shadow-lg overflow-hidden">
                  <button onClick={() => { setShowMenu(false); setShowEditRoom(true) }}
                    className="w-full px-4 py-2 text-sm text-left text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
                    Edit Room
                  </button>
                  <button onClick={() => { setShowMenu(false); setShowAdmins(true) }}
                    className="w-full px-4 py-2 text-sm text-left text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
                    Manage Admins
                  </button>
                  <button onClick={() => { setShowMenu(false); setShowBans(true) }}
                    className="w-full px-4 py-2 text-sm text-left text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
                    View Bans
                  </button>
                  {isOwner && (
                    <button onClick={() => { setShowMenu(false); setShowDelete(true) }}
                      className="w-full px-4 py-2 text-sm text-left text-red-400 hover:bg-[var(--bg-secondary)]">
                      Delete Room
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showEditRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Edit Room</h2>
              <button onClick={() => setShowEditRoom(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Close">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Description</label>
                <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-md bg-[var(--bg-secondary)]">
                <span className="text-sm text-[var(--text-primary)]">{editPublic ? 'Public' : 'Private'}</span>
                <button type="button" role="switch" aria-checked={editPublic}
                  onClick={() => setEditPublic((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${editPublic ? 'bg-blue-600' : 'bg-[var(--border)]'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <button onClick={() => updateRoom.mutate()} disabled={updateRoom.isPending}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md disabled:opacity-50">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdmins && <ManageAdminsModal roomId={room.id} ownerId={room.ownerId} onClose={() => setShowAdmins(false)} />}
      {showBans && <BannedUsersModal roomId={room.id} onClose={() => setShowBans(false)} />}

      {showDelete && (
        <ConfirmDialog
          title={`Delete "${room.name}"`}
          message="This will permanently delete the room and all its messages. This action cannot be undone."
          confirmLabel="Delete Room"
          dangerous
          onConfirm={() => deleteRoom.mutate()}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </>
  )
}
