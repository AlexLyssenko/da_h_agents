import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { Avatar } from '../common/Avatar'
import { ConfirmDialog } from './ConfirmDialog'

interface UserProfileModalProps {
  onClose: () => void
}

export function UserProfileModal({ onClose }: UserProfileModalProps) {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<'profile' | 'password' | 'delete'>('profile')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [deletePw, setDeletePw] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const changePassword = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: currentPw, newPassword: newPw }),
    onSuccess: () => {
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setPwError('Changed successfully!')
    },
    onError: () => setPwError('Current password is incorrect'),
  })

  const deleteAccount = useMutation({
    mutationFn: () => authApi.deleteAccount({ password: deletePw }),
    onSuccess: () => { clearAuth(); window.location.href = '/login' },
  })

  const handleChangePassword = () => {
    if (newPw !== confirmPw) { setPwError("Passwords don't match"); return }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return }
    setPwError('')
    changePassword.mutate()
  }

  if (!user) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Profile & Settings</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Close">✕</button>
        </div>

        <div className="flex border-b border-[var(--border)]">
          {(['profile', 'password', 'delete'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize transition-colors ${
                tab === t
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t === 'delete' ? 'Delete Account' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'profile' && (
            <div className="flex flex-col items-center gap-4">
              <Avatar username={user.username} size="lg" />
              <div className="text-center">
                <div className="font-mono font-semibold text-[var(--text-primary)]">{user.username}</div>
                <div className="text-sm text-[var(--text-muted)]">{user.email}</div>
              </div>
            </div>
          )}

          {tab === 'password' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Current Password</label>
                <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">New Password</label>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Confirm New Password</label>
                <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500" />
              </div>
              {pwError && <p className={`text-xs ${pwError.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{pwError}</p>}
              <button onClick={handleChangePassword} disabled={changePassword.isPending}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md disabled:opacity-50">
                Change Password
              </button>
            </div>
          )}

          {tab === 'delete' && (
            <div className="space-y-4">
              <p className="text-sm text-red-400">This will permanently delete your account and all your data. This action cannot be undone.</p>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Confirm your password</label>
                <input type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-red-500" />
              </div>
              <button onClick={() => setShowDeleteConfirm(true)} disabled={!deletePw}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md disabled:opacity-50">
                Delete My Account
              </button>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Account"
          message="Are you absolutely sure you want to delete your account? This cannot be undone."
          confirmLabel="Yes, Delete"
          dangerous
          onConfirm={() => deleteAccount.mutate()}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
