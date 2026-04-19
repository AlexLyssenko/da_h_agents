import { create } from 'zustand'

interface AuthUser {
  id: string
  username: string
  email: string
  isAdmin: boolean
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  sessionId: string | null
  setAuth: (user: AuthUser, accessToken: string, sessionId: string) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
}

const SESSION_KEY = 'chat_session'

function loadSession(): { user: AuthUser | null; sessionId: string | null } {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return { user: null, sessionId: null }
}

const saved = loadSession()

export const useAuthStore = create<AuthState>((set) => ({
  user: saved.user,
  accessToken: null,
  sessionId: saved.sessionId,

  setAuth: (user, accessToken, sessionId) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user, sessionId }))
    set({ user, accessToken, sessionId })
  },

  setAccessToken: (accessToken) => set({ accessToken }),

  clearAuth: () => {
    sessionStorage.removeItem(SESSION_KEY)
    set({ user: null, accessToken: null, sessionId: null })
  },
}))
