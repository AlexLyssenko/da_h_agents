import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roomsApi } from '../../api/rooms'
import type { RoomMember } from '../../api/rooms'
import { usePresenceStore } from '../../store/presenceStore'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { buildDialogId } from '../../utils/dialogId'
import { Avatar } from '../common/Avatar'
import { PresenceDot } from '../common/PresenceDot'
import { BanUserModal } from '../modals/BanUserModal'
import { Spinner } from '../common/Spinner'
import { useFriends } from '../../hooks/useFriends'

interface RoomMembersPanelProps {
  roomId: string
  ownerId: string
}

export function RoomMembersPanel({ roomId, ownerId }: RoomMembersPanelProps) {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const presences = usePresenceStore((s) => s.presences)
  const setActiveChannel = useUiStore((s) => s.setActiveChannel)
  const [contextMenu, setContextMenu] = useState<{ userId: string; username: string } | null>(null)
  const [banTarget, setBanTarget] = useState<{ userId: string; username: string } | null>(null)
  const { data: friends } = useFriends()

  const { data: members, isLoading } = useQuery<RoomMember[]>({
    queryKey: ['rooms', roomId, 'members'],
    queryFn: () => roomsApi.getMembers(roomId),
    refetchInterval: 10000,
  })

  const promote = useMutation({
    mutationFn: (userId: string) => roomsApi.promoteAdmin(roomId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'members'] }),
  })

  const demote = useMutation({
    mutationFn: (userId: string) => roomsApi.demoteAdmin(roomId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'members'] }),
  })

  const myMembership = members?.find((m) => m.userId === currentUser?.id)
  const isAdminOrOwner = currentUser?.id === ownerId || !!myMembership?.isAdmin
  const isOwner = currentUser?.id === ownerId

  const friendIds = new Set(
    friends?.accepted.map((f) => f.friend.id) ?? []
  )

  const sortMembers = (list: RoomMember[]) => {
    const order = { ONLINE: 0, AFK: 1, OFFLINE: 2 }
    return [...list].sort((a, b) => {
      const pa = presences.get(a.userId) ?? 'OFFLINE'
      const pb = presences.get(b.userId) ?? 'OFFLINE'
      if (order[pa] !== order[pb]) return order[pa] - order[pb]
      return a.username.localeCompare(b.username)
    })
  }

  if (isLoading) return <div className="flex justify-center py-4"><Spinner size="sm" /></div>

  const sorted = sortMembers(members ?? [])

  return (
    <div className="w-56 border-l border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Members — {members?.length ?? 0}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {sorted.map((member) => {
          const presence = presences.get(member.userId) ?? 'OFFLINE'
          const isSelf = member.userId === currentUser?.id

          return (
            <div
              key={member.id}
              className="relative group"
            >
              <button
                onClick={() => !isSelf && setContextMenu(contextMenu?.userId === member.userId ? null : { userId: member.userId, username: member.username })}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-surface)] rounded-md text-left transition-colors"
              >
                <div className="relative">
                  <Avatar username={member.username} size="sm" />
                  <PresenceDot
                    status={presence}
                    className="absolute -bottom-0.5 -right-0.5 border border-[var(--bg-secondary)] w-2.5 h-2.5"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs truncate text-[var(--text-primary)]">
                    {member.username}
                  </div>
                  {member.isAdmin && (
                    <div className="text-xs text-blue-400">{member.userId === ownerId ? 'owner' : 'admin'}</div>
                  )}
                </div>
              </button>

              {contextMenu?.userId === member.userId && (
                <div className="absolute right-2 top-8 z-30 w-44 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md shadow-lg overflow-hidden">
                  {friendIds.has(member.userId) && (
                    <button
                      onClick={() => {
                        const dialogId = buildDialogId(currentUser!.id, member.userId)
                        setActiveChannel({ type: 'dialog', dialogId, userId: member.userId, username: member.username })
                        setContextMenu(null)
                      }}
                      className="w-full px-3 py-2 text-xs text-left text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                    >
                      Send DM
                    </button>
                  )}
                  {isAdminOrOwner && member.userId !== ownerId && (
                    <button
                      onClick={() => { setBanTarget({ userId: member.userId, username: member.username }); setContextMenu(null) }}
                      className="w-full px-3 py-2 text-xs text-left text-red-400 hover:bg-[var(--bg-secondary)]"
                    >
                      Ban
                    </button>
                  )}
                  {isOwner && member.userId !== ownerId && (
                    member.isAdmin ? (
                      <button
                        onClick={() => { demote.mutate(member.userId); setContextMenu(null) }}
                        className="w-full px-3 py-2 text-xs text-left text-yellow-400 hover:bg-[var(--bg-secondary)]"
                      >
                        Demote Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => { promote.mutate(member.userId); setContextMenu(null) }}
                        className="w-full px-3 py-2 text-xs text-left text-blue-400 hover:bg-[var(--bg-secondary)]"
                      >
                        Promote Admin
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {banTarget && (
        <BanUserModal
          roomId={roomId}
          userId={banTarget.userId}
          username={banTarget.username}
          onClose={() => setBanTarget(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'members'] })}
        />
      )}
    </div>
  )
}
