import { Server } from 'socket.io';
import * as presenceService from '../services/presence';

/**
 * Every 30 seconds, evict sockets that haven't sent a heartbeat in 90 seconds.
 * When all sockets are evicted, user goes OFFLINE.
 */
export function startHeartbeatWatchdog(io: Server) {
  setInterval(async () => {
    const entries = presenceService.getAllSocketEntries();
    for (const { userId, socketId } of entries) {
      const stale = presenceService.evictStaleSocket(userId, socketId);
      if (stale) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        } else {
          // Socket already gone — just clean up presence
          const status = await presenceService.removeSocket(userId, socketId);
          if (status !== null) {
            io.emit('presence:update', { userId, status });
          }
        }
      }
    }
  }, 30_000);
}
