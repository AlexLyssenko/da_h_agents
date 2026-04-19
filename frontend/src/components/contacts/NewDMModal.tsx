import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../../api/users'
import type { UserSummary } from '../../api/users'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { buildDialogId } from '../../utils/dialogId'
import { Avatar } from '../common/Avatar'
import { Spinner } from '../common/Spinner'

interface NewDMModalProps {
  onClose: () => void
}

export function NewDMModal({ onClose }: NewDMModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const currentUser = useAuthStore((s) => s.user)
  const setActiveChannel = useUiStore((s) => s.setActiveChannel)

  useEffect(() => {
    inputRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const { data: users, isLoading } = useQuery<UserSummary[]>({
    queryKey: ['users', 'search', query],
    queryFn: () => usersApi.search(query || ' '),
    enabled: query.length > 0,
  })

  const openDm = (user: UserSummary) => {
    if (!currentUser) return
    const dialogId = buildDialogId(currentUser.id, user.id)
    setActiveChannel({ type: 'dialog', dialogId, userId: user.id, username: user.username })
    onClose()
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg w-full max-w-sm p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">New Message</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Close">✕</button>
        </div>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full px-3 py-2 mb-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
        />

        <div className="min-h-[80px] max-h-64 overflow-y-auto">
          {query.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] text-center py-6">Type a name to search users</p>
          )}
          {isLoading && <div className="flex justify-center py-4"><Spinner size="sm" /></div>}
          {users && users.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] text-center py-6">No users found</p>
          )}
          {users?.map((user) => (
            <button
              key={user.id}
              onClick={() => openDm(user)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[var(--bg-secondary)] transition-colors text-left"
            >
              <Avatar username={user.username} size="sm" />
              <span className="text-sm font-medium text-[var(--text-primary)]">{user.username}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
