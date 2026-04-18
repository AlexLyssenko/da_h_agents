import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useFriends } from '../../hooks/useFriends'
import { friendsApi } from '../../api/friends'
import type { FriendRequest } from '../../api/friends'
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
    mutationFn: (id: string) => friendsApi.accept(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  })

  const declineRequest = useMutation({
    mutationFn: (id: string) => friendsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  })

  const openDm = (friendship: FriendRequest) => {
    if (!currentUser) return
    const friend = friendship.requesterId === currentUser.id
      ? friendship.recipient
      : friendship.requester
    const dialogId = buildDialogId(currentUser.id, friend.id)
    setActiveChannel({ type: 'dialog', dialogId, userId: friend.id })
  }

  if (isLoading) return <div className="flex justify-center py-4"><Spinner size="sm" /></div>

  const { friends = [], pendingIncoming = [], pendingOutgoing = [] } = data ?? {}

  return (
    <div className="space-y-1">
      {friends.length > 0 && (
        <>
          {friends.map((f) => {
            const friend = f.requesterId === currentUser?.id ? f.recipient : f.requester
            const dialogId = currentUser ? buildDialogId(currentUser.id, friend.id) : ''
            const isActive =
              activeChannel?.type === 'dialog' && activeChannel.dialogId === dialogId
            return (
              <ContactItem
                key={f.id}
                friendship={f}
                isActive={isActive}
                onClick={() => openDm(f)}
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
            <div key={f.id} className="flex items-center gap-2 px-3 py-2">
              <Avatar username={f.requester.username} size="sm" />
              <span className="font-mono text-sm text-[var(--text-primary)] flex-1 truncate">
                {f.requester.username}
              </span>
              <button
                onClick={() => acceptRequest.mutate(f.id)}
                className="text-xs text-green-400 hover:text-green-300 px-1"
              >
                ✓
              </button>
              <button
                onClick={() => declineRequest.mutate(f.id)}
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
            <div key={f.id} className="flex items-center gap-2 px-3 py-2">
              <Avatar username={f.recipient.username} size="sm" />
              <span className="font-mono text-sm text-[var(--text-muted)] flex-1 truncate">
                {f.recipient.username}
              </span>
              <button
                onClick={() => declineRequest.mutate(f.id)}
                className="text-xs text-[var(--text-muted)] hover:text-red-400 px-1"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {friends.length === 0 && pendingIncoming.length === 0 && pendingOutgoing.length === 0 && (
        <p className="text-xs text-[var(--text-muted)] px-3 py-2">No friends yet</p>
      )}
    </div>
  )
}
