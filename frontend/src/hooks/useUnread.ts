import { useUnreadStore } from '../store/unreadStore'

export function useUnread(channelId: string) {
  const count = useUnreadStore((s) => s.counts.get(channelId) ?? 0)
  const clearUnread = useUnreadStore((s) => s.clearUnread)

  return {
    count,
    clear: () => clearUnread(channelId),
  }
}
