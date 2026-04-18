import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { Spinner } from '../common/Spinner'
import { formatRelative } from '../../utils/formatDate'

interface Session {
  id: string
  userAgent?: string
  ip?: string
  lastSeen: string
  createdAt: string
}

interface SessionsModalProps {
  onClose: () => void
}

export function SessionsModal({ onClose }: SessionsModalProps) {
  const queryClient = useQueryClient()
  const sessionId = useAuthStore((s) => s.sessionId)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: () => apiClient.get('/api/sessions').then((r) => r.data),
  })

  const logoutSession = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/sessions/${id}`).then((r) => r.data),
    onSuccess: (_, id) => {
      if (id === sessionId) {
        clearAuth()
        window.location.href = '/login'
      } else {
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
      }
    },
  })

  const logoutAll = useMutation({
    mutationFn: () => {
      const others = sessions?.filter((s) => s.id !== sessionId) ?? []
      return Promise.all(others.map((s) => apiClient.delete(`/api/sessions/${s.id}`)))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  })

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg w-full max-w-lg p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Active Sessions</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Close">
            ✕
          </button>
        </div>

        {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}

        {sessions && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)]"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {session.userAgent || 'Unknown browser'}
                    {session.id === sessionId && (
                      <span className="ml-2 text-xs text-blue-400">(current)</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {session.ip} · Last seen {formatRelative(session.lastSeen)}
                  </div>
                </div>
                <button
                  onClick={() => logoutSession.mutate(session.id)}
                  className="ml-3 text-xs text-red-400 hover:text-red-300 shrink-0"
                >
                  Log out
                </button>
              </div>
            ))}
          </div>
        )}

        {sessions && sessions.length > 1 && (
          <button
            onClick={() => logoutAll.mutate()}
            className="mt-4 w-full py-2 text-sm text-red-400 border border-red-800 rounded-md hover:bg-red-900/20 transition-colors"
          >
            Log out all other sessions
          </button>
        )}
      </div>
    </div>
  )
}
