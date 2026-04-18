import { PrismaClient, PresenceStatus } from '@prisma/client';

const prisma = new PrismaClient();

type SocketStatus = 'online' | 'afk';

interface PresenceEntry {
  sockets: Map<string, SocketStatus>;
  lastHeartbeat: Map<string, number>; // socketId → timestamp
}

const presenceMap = new Map<string, PresenceEntry>();

function effectiveStatus(entry: PresenceEntry): PresenceStatus {
  if (entry.sockets.size === 0) return PresenceStatus.OFFLINE;
  for (const status of entry.sockets.values()) {
    if (status === 'online') return PresenceStatus.ONLINE;
  }
  return PresenceStatus.AFK;
}

async function persistStatus(userId: string, status: PresenceStatus) {
  await prisma.userPresence.upsert({
    where: { userId },
    update: { status, updatedAt: new Date() },
    create: { userId, status },
  });
}

export async function addSocket(userId: string, socketId: string): Promise<PresenceStatus> {
  let entry = presenceMap.get(userId);
  if (!entry) {
    entry = { sockets: new Map(), lastHeartbeat: new Map() };
    presenceMap.set(userId, entry);
  }
  entry.sockets.set(socketId, 'online');
  entry.lastHeartbeat.set(socketId, Date.now());
  const status = effectiveStatus(entry);
  await persistStatus(userId, status);
  return status;
}

export async function removeSocket(userId: string, socketId: string): Promise<PresenceStatus | null> {
  const entry = presenceMap.get(userId);
  if (!entry) return null;

  entry.sockets.delete(socketId);
  entry.lastHeartbeat.delete(socketId);

  const status = effectiveStatus(entry);
  await persistStatus(userId, status);

  if (entry.sockets.size === 0) presenceMap.delete(userId);
  return status;
}

export async function updateSocketStatus(
  userId: string,
  socketId: string,
  socketStatus: SocketStatus
): Promise<{ newStatus: PresenceStatus; changed: boolean }> {
  const entry = presenceMap.get(userId);
  if (!entry) return { newStatus: PresenceStatus.OFFLINE, changed: false };

  const prevEffective = effectiveStatus(entry);
  entry.sockets.set(socketId, socketStatus);
  entry.lastHeartbeat.set(socketId, Date.now());
  const newStatus = effectiveStatus(entry);

  const changed = newStatus !== prevEffective;
  if (changed) await persistStatus(userId, newStatus);

  return { newStatus, changed };
}

export function getPresence(userId: string): PresenceStatus {
  const entry = presenceMap.get(userId);
  if (!entry || entry.sockets.size === 0) return PresenceStatus.OFFLINE;
  return effectiveStatus(entry);
}

export function getMultiplePresence(userIds: string[]): Record<string, PresenceStatus> {
  const result: Record<string, PresenceStatus> = {};
  for (const id of userIds) result[id] = getPresence(id);
  return result;
}

export function evictStaleSocket(userId: string, socketId: string): boolean {
  const entry = presenceMap.get(userId);
  if (!entry) return false;
  const lastBeat = entry.lastHeartbeat.get(socketId) ?? 0;
  return Date.now() - lastBeat > 90_000;
}

export function getAllSocketEntries(): Array<{ userId: string; socketId: string }> {
  const result: Array<{ userId: string; socketId: string }> = [];
  for (const [userId, entry] of presenceMap.entries()) {
    for (const socketId of entry.sockets.keys()) {
      result.push({ userId, socketId });
    }
  }
  return result;
}
