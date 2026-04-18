import { create } from 'zustand'
import apiClient from '../api/client'

interface UnreadState {
  counts: Map<string, number>
  setUnread: (key: string, count: number) => void
  incrementUnread: (key: string) => void
  clearUnread: (key: string) => void
  totalUnread: () => number
}

export const useUnreadStore = create<UnreadState>((set, get) => ({
  counts: new Map(),

  setUnread: (key, count) =>
    set((state) => {
      const next = new Map(state.counts)
      next.set(key, count)
      return { counts: next }
    }),

  incrementUnread: (key) =>
    set((state) => {
      const next = new Map(state.counts)
      next.set(key, (next.get(key) ?? 0) + 1)
      return { counts: next }
    }),

  clearUnread: (key) => {
    set((state) => {
      const next = new Map(state.counts)
      next.delete(key)
      return { counts: next }
    })
    // Notify the server that messages are read
    apiClient.post('/api/notifications/read', { channelId: key }).catch(() => {})
  },

  totalUnread: () => {
    const { counts } = get()
    let total = 0
    counts.forEach((v) => (total += v))
    return total
  },
}))
