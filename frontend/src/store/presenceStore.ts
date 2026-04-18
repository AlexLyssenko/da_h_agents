import { create } from 'zustand'

type PresenceStatus = 'ONLINE' | 'AFK' | 'OFFLINE'

interface PresenceState {
  presences: Map<string, PresenceStatus>
  setPresence: (userId: string, status: PresenceStatus) => void
  getPresence: (userId: string) => PresenceStatus
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  presences: new Map(),

  setPresence: (userId, status) =>
    set((state) => {
      const next = new Map(state.presences)
      next.set(userId, status)
      return { presences: next }
    }),

  getPresence: (userId) => get().presences.get(userId) ?? 'OFFLINE',
}))
