import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { AppError } from '../middleware/errorHandler';
import { isMember, isBannedFromRoom } from './rooms';
import { areFriends, isBanned } from './friends';

const prisma = new PrismaClient();

export async function createAttachment(data: {
  userId: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  size: number;
  comment?: string;
}) {
  return prisma.attachment.create({
    data: {
      filename: data.filename,
      storagePath: data.storagePath,
      mimeType: data.mimeType,
      size: data.size,
      comment: data.comment,
    },
    select: { id: true, filename: true, size: true, mimeType: true, comment: true },
  });
}

export async function getAttachment(userId: string, attachmentId: string) {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { message: true },
  });
  if (!attachment) throw new AppError(404, 'Attachment not found');
  if (!attachment.message) throw new AppError(404, 'Attachment not linked to any message');

  const msg = attachment.message;

  if (msg.roomId) {
    const member = await isMember(userId, msg.roomId);
    if (!member) throw new AppError(403, 'Access denied');
    const banned = await isBannedFromRoom(userId, msg.roomId);
    if (banned) throw new AppError(403, 'You are banned from this room');
  } else if (msg.dialogId) {
    const parts = msg.dialogId.split(':');
    if (!parts.includes(userId)) throw new AppError(403, 'Access denied');
    const otherId = parts[0] === userId ? parts[1] : parts[0];
    const banned = await isBanned(userId, otherId);
    if (banned) throw new AppError(403, 'Access denied');
  } else {
    throw new AppError(403, 'Access denied');
  }

  return attachment;
}

export async function cleanupOrphanAttachments() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const orphans = await prisma.attachment.findMany({
    where: { messageId: null, createdAt: { lt: cutoff } },
  });

  for (const orphan of orphans) {
    try {
      if (fs.existsSync(orphan.storagePath)) fs.unlinkSync(orphan.storagePath);
      const dir = path.dirname(orphan.storagePath);
      if (fs.existsSync(dir)) fs.rmdirSync(dir);
    } catch {
      // ignore
    }
  }

  await prisma.attachment.deleteMany({
    where: { messageId: null, createdAt: { lt: cutoff } },
  });

  return orphans.length;
}
