import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useFriends } from '../../hooks/useFriends'
import { friendsApi } from '../../api/friends'
import { usersApi } from '../../api/users'
import type { UserSummary } from '../../api/users'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { usePresenceStore } from '../../store/presenceStore'
import { useUnreadStore } from '../../store/unreadStore'
import { buildDialogId } from '../../utils/dialogId'
import { Avatar } from '../common/Avatar'
import { PresenceDot } from '../common/PresenceDot'
import { Badge } from '../common/Badge'
import { Spinner } from '../common/Spinner'
import clsx from 'clsx'

export function PeoplePanel() {
  const [query, setQuery] = useState('')
  const currentUser = useAuthStore((s) => s.user)
  const { activeChannel, setActiveChannel } = useUiStore()
  const queryClient = useQueryClient()
  const getPresence = usePresenceStore((s) => s.getPresence)
  const counts = useUnreadStore((s) => s.counts)

  const { data: friendsData, isLoading: friendsLoading } = useFriends()
  const accepted = friendsData?.accepted ?? []
  const acceptedIds = new Set(accepted.map((f) => f.friend.id))

  const { data: searchResults, isLoading: searchLoading } = useQuery<UserSummary[]>({
    queryKey: ['users', 'search', query],
    queryFn: () => usersApi.search(query),
    enabled: query.trim().length > 0,
  })

  const addContact = useMutation({
    mutationFn: (username: string) => friendsApi.sendRequest(username),
    onSuccess: (_data, username) => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      toast.success(`${username} added to contacts`)
    },
    onError: () => toast.error('Could not add contact'),
  })

  const removeContact = useMutation({
    mutationFn: (friendshipId: string) => friendsApi.remove(friendshipId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
    onError: () => toast.error('Could not remove contact'),
  })

  const openDm = (userId: string, username: string) => {
    if (!currentUser) return
    const dialogId = buildDialogId(currentUser.id, userId)
    setActiveChannel({ type: 'dialog', dialogId, userId, username })
    setQuery('')
  }

  const isSearching = query.trim().length > 0

  return (
    <div className="flex flex-col gap-1">
      {/* Search input */}
      <div className="px-3 pt-1 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Search results */}
      {isSearching && (
        <div>
          {searchLoading && (
            <div className="flex justify-center py-2"><Spinner size="sm" /></div>
          )}
          {!searchLoading && searchResults?.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] px-3 py-2">No users found</p>
          )}
          {searchResults?.map((user) => {
            const isContact = acceptedIds.has(user.id)
            const isSelf = user.id === currentUser?.id
            if (isSelf) return null
            return (
              <div
                key={user.id}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-surface)] rounded-md"
              >
                <Avatar username={user.username} size="sm" />
                <span className="text-sm text-[var(--text-primary)] flex-1 truncate">{user.username}</span>
                {isContact ? (
                  <button
                    onClick={() => openDm(user.id, user.username)}
                    className="px-2 py-0.5 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded transition-colors shrink-0"
                  >
                    Message
                  </button>
                ) : (
                  <button
                    onClick={() => addContact.mutate(user.username)}
                    disabled={addContact.isPending}
                    className="px-2 py-0.5 text-xs bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded transition-colors shrink-0disabled:opacity-50"
                  >
                    + Add
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Contacts list (when not searching) */}
      {!isSearching && (
        <>
          {friendsLoading && (
            <div className="flex justify-center py-3"><Spinner size="sm" /></div>
          )}

          {!friendsLoading && accepted.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] px-3 py-2">
              No contacts yet — search above to add people.
            </p>
          )}

          {accepted.map((f) => {
            const dialogId = currentUser ? buildDialogId(currentUser.id, f.friend.id) : ''
            const isActive =
              activeChannel?.type === 'dialog' && activeChannel.dialogId === dialogId
            const presence = getPresence(f.friend.id)
            const unread = counts.get(`dm:${dialogId}`) ?? 0

            return (
              <div
                key={f.friendshipId}
                className={clsx(
                  'group flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors cursor-pointer',
                  isActive
                    ? 'bg-blue-600/20 text-[var(--text-primary)]'
                    : 'hover:bg-[var(--bg-surface)] text-[var(--text-muted)]'
                )}
                onClick={() => openDm(f.friend.id, f.friend.username)}
              >
                <div className="relative shrink-0">
                  <Avatar username={f.friend.username} size="sm" />
                  <PresenceDot
                    status={presence}
                    className="absolute -bottom-0.5 -right-0.5 border-2 border-[var(--bg-secondary)] !w-2.5 !h-2.5"
                  />
                </div>

                <span className={clsx(
                  'text-sm truncate flex-1',
                  isActive ? 'font-medium text-[var(--text-primary)]' : ''
                )}>
                  {f.friend.username}
                </span>

                {unread > 0 && (
                  <span className="group-hover:hidden">
                    <Badge count={unread} />
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeContact.mutate(f.friendshipId)
                  }}
                  className="hidden group-hover:flex items-center justify-center w-4 h-4 text-[var(--text-muted)] hover:text-red-400 shrink-0 transition-colors"
                  aria-label={`Remove ${f.friend.username}`}
                  title="Remove contact"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
