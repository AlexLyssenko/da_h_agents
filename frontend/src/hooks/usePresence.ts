import { usePresenceStore } from '../store/presenceStore'

type PresenceStatus = 'ONLINE' | 'AFK' | 'OFFLINE'

export function usePresence(userIds: string[]): Record<string, PresenceStatus> {
  const presences = usePresenceStore((s) => s.presences)
  return Object.fromEntries(
    userIds.map((id) => [id, presences.get(id) ?? 'OFFLINE'])
  ) as Record<string, PresenceStatus>
}
