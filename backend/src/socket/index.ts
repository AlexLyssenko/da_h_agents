import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import * as presenceService from '../services/presence';
import * as messagesService from '../services/messages';
import * as notificationsService from '../services/notifications';
import { isMember } from '../services/rooms';

// Typing timer map: key = `${userId}:${channelKey}`, value = timer
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

let io: Server;

export function getIo(): Server {
  return io;
}

interface AuthPayload {
  id: string;
  username: string;
  email: string;
  sessionId: string;
  isAdmin?: boolean;
  type: string;
}

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: config.clientOrigin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Missing auth token'));

    try {
      const payload = jwt.verify(token, config.jwtAccessSecret) as AuthPayload;
      if (payload.type !== 'access') return next(new Error('Invalid token type'));
      (socket as ExtSocket).userId = payload.id;
      (socket as ExtSocket).username = payload.username;
      (socket as ExtSocket).isAdmin = payload.isAdmin ?? false;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const ext = socket as ExtSocket;
    const userId = ext.userId;

    // Join personal channel for DM delivery and notifications
    socket.join(`user:${userId}`);

    // Register in presence map
    presenceService.addSocket(userId, socket.id).then((status) => {
      io.emit('presence:update', { userId, status });

      // Send unread map to newly connected socket
      const unread = notificationsService.getUnreadMap(userId);
      socket.emit('notification:unread', unread);
    });

    // ---- Presence heartbeat ----
    socket.on('presence:heartbeat', async ({ status }: { status: 'online' | 'afk' }) => {
      const result = await presenceService.updateSocketStatus(userId, socket.id, status);
      if (result.changed) {
        io.emit('presence:update', { userId, status: result.newStatus });
      }
    });

    // ---- Room channel management ----
    socket.on('room:join', async ({ roomId }: { roomId: string }) => {
      const member = await isMember(userId, roomId);
      if (member) socket.join(`room:${roomId}`);
    });

    socket.on('room:leave', ({ roomId }: { roomId: string }) => {
      socket.leave(`room:${roomId}`);
    });

    // ---- Message send ----
    socket.on('message:send', async (payload: MessageSendPayload) => {
      try {
        if (payload.roomId) {
          const message = await messagesService.sendRoomMessage(
            userId,
            payload.roomId,
            payload.content,
            payload.replyToId,
            payload.attachmentIds ?? []
          );
          io.to(`room:${payload.roomId}`).emit('message:new', { message });

          // Increment unread for other members
          // const room = `room:${payload.roomId}`;
          // const socketsInRoom = io.sockets.adapter.rooms.get(room);
          // We can't easily iterate members here — notifications are best-effort
          // In production, you'd query room members and increment for offline ones
        } else if (payload.dialogId) {
          const result = await messagesService.sendDMMessage(
            userId,
            payload.dialogId,
            payload.content,
            payload.replyToId,
            payload.attachmentIds ?? []
          );
          const dmChannel = `dm:${payload.dialogId}`;
          io.to(dmChannel).emit('message:new', { message: result.message });
          // Deliver to both users' personal channels (covers offline-from-dm-channel case)
          io.to(`user:${userId}`).emit('message:new', { message: result.message });
          io.to(`user:${result.otherId}`).emit('message:new', { message: result.message });

          // Increment unread for the other user and notify them
          notificationsService.incrementUnread(result.otherId, dmChannel);
          const unread = notificationsService.getUnreadMap(result.otherId);
          io.to(`user:${result.otherId}`).emit('notification:unread', unread);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        socket.emit('error', { code: 'MESSAGE_SEND_FAILED', message: msg });
      }
    });

    // ---- Message edit ----
    socket.on('message:edit', async ({ messageId, content }: { messageId: string; content: string }) => {
      try {
        const message = await messagesService.editMessage(userId, messageId, content);
        const channel = message.roomId ? `room:${message.roomId}` : `dm:${message.dialogId}`;
        io.to(channel).emit('message:edited', { message });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        socket.emit('error', { code: 'EDIT_FAILED', message: msg });
      }
    });

    // ---- Message delete ----
    socket.on('message:delete', async ({ messageId }: { messageId: string }) => {
      try {
        const result = await messagesService.deleteMessage(userId, ext.isAdmin, messageId);
        const channel = result.roomId ? `room:${result.roomId}` : `dm:${result.dialogId}`;
        io.to(channel!).emit('message:deleted', {
          messageId,
          roomId: result.roomId,
          dialogId: result.dialogId,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        socket.emit('error', { code: 'DELETE_FAILED', message: msg });
      }
    });

    // ---- Typing indicators ----
    socket.on('typing:start', ({ roomId, dialogId }: { roomId?: string; dialogId?: string }) => {
      const channel = roomId ? `room:${roomId}` : `dm:${dialogId}`;
      if (!channel) return;

      socket.to(channel).emit('typing', { userId, roomId, dialogId });

      // Auto-expire after 5 seconds
      const timerKey = `${userId}:${channel}`;
      const existing = typingTimers.get(timerKey);
      if (existing) clearTimeout(existing);
      typingTimers.set(
        timerKey,
        setTimeout(() => {
          socket.to(channel).emit('typing:stop', { userId, roomId, dialogId });
          typingTimers.delete(timerKey);
        }, 5000)
      );
    });

    socket.on('typing:stop', ({ roomId, dialogId }: { roomId?: string; dialogId?: string }) => {
      const channel = roomId ? `room:${roomId}` : `dm:${dialogId}`;
      if (!channel) return;

      const timerKey = `${userId}:${channel}`;
      const existing = typingTimers.get(timerKey);
      if (existing) {
        clearTimeout(existing);
        typingTimers.delete(timerKey);
      }
      socket.to(channel).emit('typing:stop', { userId, roomId, dialogId });
    });

    // ---- DM channel subscription ----
    socket.on('dm:join', ({ dialogId }: { dialogId: string }) => {
      if (dialogId.includes(userId)) {
        socket.join(`dm:${dialogId}`);
        socket.join(`user:${userId}`);
      }
    });

    // ---- Disconnect ----
    socket.on('disconnect', async () => {
      // Clear typing timers for this socket
      for (const [key] of typingTimers.entries()) {
        if (key.startsWith(`${userId}:`)) {
          clearTimeout(typingTimers.get(key)!);
          typingTimers.delete(key);
        }
      }

      const status = await presenceService.removeSocket(userId, socket.id);
      if (status !== null) {
        io.emit('presence:update', { userId, status });
      }
    });
  });

  return io;
}

interface ExtSocket extends Socket {
  userId: string;
  username: string;
  isAdmin: boolean;
}

interface MessageSendPayload {
  roomId?: string;
  dialogId?: string;
  content?: string;
  replyToId?: string;
  attachmentIds?: string[];
}
