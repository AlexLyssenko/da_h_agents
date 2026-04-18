// In-memory unread count store: Map<userId, Map<channelKey, count>>
// channelKey = "room:<roomId>" | "dm:<dialogId>"

const unreadMap = new Map<string, Map<string, number>>();

export function incrementUnread(userId: string, channelKey: string) {
  let channels = unreadMap.get(userId);
  if (!channels) {
    channels = new Map();
    unreadMap.set(userId, channels);
  }
  channels.set(channelKey, (channels.get(channelKey) ?? 0) + 1);
}

export function resetUnread(userId: string, channelKey: string) {
  const channels = unreadMap.get(userId);
  if (channels) channels.delete(channelKey);
}

export function getUnreadMap(userId: string): Record<string, number> {
  const channels = unreadMap.get(userId);
  if (!channels) return {};
  const result: Record<string, number> = {};
  for (const [key, count] of channels.entries()) result[key] = count;
  return result;
}
