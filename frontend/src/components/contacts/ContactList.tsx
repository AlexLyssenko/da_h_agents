import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useFriends } from '../../hooks/useFriends'
import { friendsApi } from '../../api/friends'
import type { AcceptedFriend } from '../../api/friends'
import { ContactItem } from './ContactItem'
import { Avatar } from '../common/Avatar'
import { Spinner } from '../common/Spinner'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { buildDialogId } from '../../utils/dialogId'

export function ContactList() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const { activeChannel, setActiveChannel } = useUiStore()
  const { data, isLoading } = useFriends()

  const acceptRequest = useMutation({
    mutationFn: (friendshipId: string) => friendsApi.accept(friendshipId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  })

  const declineOrCancel = useMutation({
    mutationFn: (friendshipId: string) => friendsApi.remove(friendshipId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  })

  const openDm = (f: AcceptedFriend) => {
    if (!currentUser) return
    const dialogId = buildDialogId(currentUser.id, f.friend.id)
    setActiveChannel({ type: 'dialog', dialogId, userId: f.friend.id, username: f.friend.username })
  }

  if (isLoading) return <div className="flex justify-center py-4"><Spinner size="sm" /></div>

  const { accepted = [], pendingIncoming = [], pendingOutgoing = [] } = data ?? {}

  return (
    <div className="space-y-1">
      {accepted.length > 0 && (
        <>
          {accepted.map((f) => {
            const dialogId = currentUser ? buildDialogId(currentUser.id, f.friend.id) : ''
            const isActive =
              activeChannel?.type === 'dialog' && activeChannel.dialogId === dialogId
            return (
              <ContactItem
                key={f.friendshipId}
                friendship={f}
                isActive={isActive}
                onClick={() => openDm(f)}
                onRemove={() => declineOrCancel.mutate(f.friendshipId)}
              />
            )
          })}
        </>
      )}

      {pendingIncoming.length > 0 && (
        <div className="mt-3">
          <div className="px-3 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Pending ({pendingIncoming.length})
          </div>
          {pendingIncoming.map((f) => (
            <div key={f.friendshipId} className="flex items-center gap-2 px-3 py-2">
              <Avatar username={f.from.username} size="sm" />
              <span className="font-mono text-sm text-[var(--text-primary)] flex-1 truncate">
                {f.from.username}
              </span>
              <button
                onClick={() => acceptRequest.mutate(f.friendshipId)}
                className="text-xs text-green-400 hover:text-green-300 px-1"
              >
                ✓
              </button>
              <button
                onClick={() => declineOrCancel.mutate(f.friendshipId)}
                className="text-xs text-red-400 hover:text-red-300 px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {pendingOutgoing.length > 0 && (
        <div className="mt-3">
          <div className="px-3 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Sent
          </div>
          {pendingOutgoing.map((f) => (
            <div key={f.friendshipId} className="flex items-center gap-2 px-3 py-2">
              <Avatar username={f.to.username} size="sm" />
              <span className="font-mono text-sm text-[var(--text-muted)] flex-1 truncate">
                {f.to.username}
              </span>
              <button
                onClick={() => declineOrCancel.mutate(f.friendshipId)}
                className="text-xs text-[var(--text-muted)] hover:text-red-400 px-1"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {accepted.length === 0 && pendingIncoming.length === 0 && pendingOutgoing.length === 0 && (
        <p className="text-xs text-[var(--text-muted)] px-3 py-2">No friends yet</p>
      )}
    </div>
  )
}
