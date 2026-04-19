import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { isMember, isBannedFromRoom } from './rooms';
import { isBanned } from './friends';

const prisma = new PrismaClient();

const MAX_CONTENT_BYTES = 3072;

function validateDialogId(dialogId: string, userId: string): [string, string] {
  const parts = dialogId.split(':');
  if (parts.length !== 2) throw new AppError(400, 'Invalid dialogId format');
  if (!parts.includes(userId)) throw new AppError(403, 'Access denied');
  return [parts[0], parts[1]];
}

export function buildDialogId(userA: string, userB: string): string {
  return [userA, userB].sort().join(':');
}

export async function sendRoomMessage(
  authorId: string,
  roomId: string,
  content: string | undefined,
  replyToId: string | undefined,
  attachmentIds: string[]
) {
  if (!content && attachmentIds.length === 0) {
    throw new AppError(422, 'Message must have content or attachments');
  }
  if (content) {
    const bytes = Buffer.byteLength(content, 'utf8');
    if (bytes > MAX_CONTENT_BYTES) throw new AppError(422, 'Content exceeds 3072 bytes');
  }

  const member = await isMember(authorId, roomId);
  if (!member) throw new AppError(403, 'Not a member of this room');

  const banned = await isBannedFromRoom(authorId, roomId);
  if (banned) throw new AppError(403, 'You are banned from this room');

  const message = await prisma.message.create({
    data: {
      roomId,
      authorId,
      content,
      replyToId,
      attachments: attachmentIds.length > 0
        ? { connect: attachmentIds.map((id) => ({ id })) }
        : undefined,
    },
    include: {
      author: { select: { id: true, username: true } },
      attachments: true,
      replyTo: { include: { author: { select: { id: true, username: true } } } },
    },
  });
  return message;
}

export async function sendDMMessage(
  authorId: string,
  dialogId: string,
  content: string | undefined,
  replyToId: string | undefined,
  attachmentIds: string[]
) {
  if (!content && attachmentIds.length === 0) {
    throw new AppError(422, 'Message must have content or attachments');
  }
  if (content) {
    const bytes = Buffer.byteLength(content, 'utf8');
    if (bytes > MAX_CONTENT_BYTES) throw new AppError(422, 'Content exceeds 3072 bytes');
  }

  const [userA, userB] = validateDialogId(dialogId, authorId);
  const otherId = userA === authorId ? userB : userA;

  const banned = await isBanned(authorId, otherId);
  if (banned) throw new AppError(403, 'Cannot message this user');

  const message = await prisma.message.create({
    data: {
      dialogId,
      authorId,
      content,
      replyToId,
      attachments: attachmentIds.length > 0
        ? { connect: attachmentIds.map((id) => ({ id })) }
        : undefined,
    },
    include: {
      author: { select: { id: true, username: true } },
      attachments: true,
      replyTo: { include: { author: { select: { id: true, username: true } } } },
    },
  });
  return { message, otherId };
}

export async function getRoomMessages(
  userId: string,
  isAdmin: boolean,
  roomId: string,
  cursor?: string,
  limit = 50
) {
  if (!isAdmin) {
    const member = await isMember(userId, roomId);
    if (!member) {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room || !room.isPublic) throw new AppError(403, 'Access denied');
    }
  }

  const messages = await prisma.message.findMany({
    where: { roomId, ...(cursor ? { id: { lt: cursor } } : {}) },
    include: {
      author: { select: { id: true, username: true } },
      attachments: true,
      replyTo: { include: { author: { select: { id: true, username: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return messages.reverse();
}

export async function getDMMessages(
  userId: string,
  dialogId: string,
  cursor?: string,
  limit = 50
) {
  validateDialogId(dialogId, userId);

  const messages = await prisma.message.findMany({
    where: { dialogId, ...(cursor ? { id: { lt: cursor } } : {}) },
    include: {
      author: { select: { id: true, username: true } },
      attachments: true,
      replyTo: { include: { author: { select: { id: true, username: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return messages.reverse();
}

export async function editMessage(userId: string, messageId: string, content: string) {
  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes > MAX_CONTENT_BYTES) throw new AppError(422, 'Content exceeds 3072 bytes');

  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg) throw new AppError(404, 'Message not found');
  if (msg.authorId !== userId) throw new AppError(403, 'Not the author');

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content, editedAt: new Date() },
    include: {
      author: { select: { id: true, username: true } },
      attachments: true,
    },
  });
  return updated;
}

export async function deleteMessage(userId: string, isAdmin: boolean, messageId: string) {
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg) throw new AppError(404, 'Message not found');

  if (!isAdmin && msg.authorId !== userId) {
    // Allow room admin/owner
    if (!msg.roomId) throw new AppError(403, 'Not authorized');
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: msg.roomId, userId } },
    });
    const room = await prisma.room.findUnique({ where: { id: msg.roomId } });
    if (!member?.isAdmin && room?.ownerId !== userId) {
      throw new AppError(403, 'Not authorized');
    }
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  });

  return { messageId, roomId: msg.roomId, dialogId: msg.dialogId };
}

export async function listDMConversations(userId: string) {
  // Find all distinct dialogIds where this user is a participant
  const rows = await prisma.message.findMany({
    where: {
      dialogId: { not: null },
      OR: [
        { dialogId: { startsWith: `${userId}:` } },
        { dialogId: { endsWith: `:${userId}` } },
      ],
    },
    select: { dialogId: true },
    distinct: ['dialogId'],
  });

  const conversations = await Promise.all(
    rows.map(async ({ dialogId }) => {
      const lastMsg = await prisma.message.findFirst({
        where: { dialogId: dialogId! },
        orderBy: { createdAt: 'desc' },
        select: { content: true, createdAt: true },
      });

      const parts = dialogId!.split(':');
      const otherId = parts[0] === userId ? parts[1] : parts[0];
      const otherUser = await prisma.user.findUnique({
        where: { id: otherId },
        select: { id: true, username: true },
      });

      return {
        dialogId: dialogId!,
        userId: otherId,
        username: otherUser?.username ?? 'Unknown',
        lastMessage: lastMsg?.content ?? null,
        lastMessageAt: lastMsg?.createdAt?.toISOString() ?? null,
      };
    })
  );

  // Sort by most recent message
  return conversations.sort((a, b) => {
    if (!a.lastMessageAt) return 1;
    if (!b.lastMessageAt) return -1;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });
}
