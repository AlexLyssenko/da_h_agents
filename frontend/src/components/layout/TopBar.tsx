import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { usePresenceStore } from '../../store/presenceStore'
import { useUiStore } from '../../store/uiStore'
import { useRooms } from '../../hooks/useRooms'
import { useFriends } from '../../hooks/useFriends'
import { Avatar } from '../common/Avatar'
import { PresenceDot } from '../common/PresenceDot'
import { SessionsModal } from '../modals/SessionsModal'
import { UserProfileModal } from '../modals/UserProfileModal'
import { buildDialogId } from '../../utils/dialogId'
import { authApi } from '../../api/auth'
import { disconnectSocket } from '../../api/socket'
import { useNavigate } from 'react-router-dom'

export function TopBar() {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const presences = usePresenceStore((s) => s.presences)
  const { activeChannel, toggleSidebar } = useUiStore()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [showSessions, setShowSessions] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const { data: rooms } = useRooms()
  const { data: friends } = useFriends()

  const myPresence = user ? (presences.get(user.id) ?? 'ONLINE') : 'OFFLINE'

  let channelName = ''
  if (activeChannel?.type === 'room') {
    const room = rooms?.find((r) => r.id === activeChannel.id)
    channelName = room ? `# ${room.name}` : ''
  } else if (activeChannel?.type === 'dialog' && user) {
    const f = friends?.accepted.find(
      (fr) => buildDialogId(user.id, fr.friend.id) === activeChannel.dialogId
    )
    if (f) channelName = `@ ${f.friend.username}`
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    disconnectSocket()
    clearAuth()
    navigate('/login')
  }

  return (
    <>
      <header className="flex items-center justify-between h-12 px-4 bg-[var(--bg-surface)] border-b border-[var(--border)] z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="md:hidden p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div className="font-mono font-bold text-[var(--accent)] text-lg select-none">
            IRC Chat
          </div>
        </div>

        {channelName && (
          <div className="hidden md:block text-sm font-medium text-[var(--text-primary)]">
            {channelName}
          </div>
        )}

        {user && (
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="flex items-center gap-2 p-1 rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <Avatar username={user.username} size="sm" />
              <span className="hidden md:block font-mono text-sm text-[var(--text-primary)]">
                {user.username}
              </span>
              <PresenceDot status={myPresence} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-10 z-50 w-52 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md shadow-xl overflow-hidden">
                <button onClick={() => { setShowMenu(false); setShowProfile(true) }}
                  className="w-full px-4 py-2.5 text-sm text-left text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
                  Profile
                </button>
                <button onClick={() => { setShowMenu(false); setShowSessions(true) }}
                  className="w-full px-4 py-2.5 text-sm text-left text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
                  Sessions
                </button>
                <div className="h-px bg-[var(--border)] my-1" />
                <button onClick={() => { setShowMenu(false); handleLogout() }}
                  className="w-full px-4 py-2.5 text-sm text-left text-red-400 hover:bg-[var(--bg-secondary)]">
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {showSessions && <SessionsModal onClose={() => setShowSessions(false)} />}
      {showProfile && <UserProfileModal onClose={() => setShowProfile(false)} />}
    </>
  )
}
