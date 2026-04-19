import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { AppError } from '../middleware/errorHandler';
import { getMultiplePresence } from './presence';

const prisma = new PrismaClient();

export async function createRoom(
  ownerId: string,
  data: { name: string; description?: string; isPublic: boolean }
) {
  const existing = await prisma.room.findUnique({ where: { name: data.name } });
  if (existing) throw new AppError(409, 'Room name already taken');

  const room = await prisma.room.create({
    data: {
      name: data.name,
      description: data.description,
      isPublic: data.isPublic,
      ownerId,
      members: { create: { userId: ownerId, isAdmin: true } },
    },
    include: { _count: { select: { members: true } } },
  });
  return room;
}

export async function getMyRooms(userId: string) {
  const memberships = await prisma.roomMember.findMany({
    where: { userId },
    include: {
      room: { include: { _count: { select: { members: true } } } },
    },
    orderBy: { joinedAt: 'desc' },
  });
  return memberships.map((m) => m.room);
}

export async function listPublicRooms(
  userId: string,
  search?: string,
  page = 1,
  limit = 20
) {
  const bannedRoomIds = await prisma.roomBan
    .findMany({ where: { userId }, select: { roomId: true } })
    .then((bans) => bans.map((b) => b.roomId));

  const rooms = await prisma.room.findMany({
    where: {
      isPublic: true,
      id: { notIn: bannedRoomIds },
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: { _count: { select: { members: true } } },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
  return rooms;
}

export async function getRoom(userId: string, roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { _count: { select: { members: true } } },
  });
  if (!room) throw new AppError(404, 'Room not found');

  if (!room.isPublic) {
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) throw new AppError(403, 'Access denied');
  }

  const ban = await prisma.roomBan.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (ban) throw new AppError(403, 'You are banned from this room');

  return room;
}

export async function joinRoom(userId: string, roomId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError(404, 'Room not found');
  if (!room.isPublic) throw new AppError(403, 'Room is private');

  const ban = await prisma.roomBan.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (ban) throw new AppError(403, 'You are banned from this room');

  const existing = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (existing) throw new AppError(409, 'Already a member');

  await prisma.roomMember.create({ data: { roomId, userId } });
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, username: true },
  });
  return { room, user };
}

export async function leaveRoom(userId: string, roomId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError(404, 'Room not found');
  if (room.ownerId === userId) throw new AppError(403, 'Owner cannot leave — delete the room instead');

  const deleted = await prisma.roomMember.deleteMany({ where: { roomId, userId } });
  if (deleted.count === 0) throw new AppError(404, 'Not a member');
  return { roomId, userId };
}

export async function inviteToRoom(inviterId: string, roomId: string, targetUserId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError(404, 'Room not found');
  if (room.isPublic) throw new AppError(400, 'Room is public — users can join directly');

  const inviterMember = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: inviterId } },
  });
  if (!inviterMember) throw new AppError(403, 'Not a member');

  const ban = await prisma.roomBan.findUnique({
    where: { roomId_userId: { roomId, userId: targetUserId } },
  });
  if (ban) throw new AppError(403, 'User is banned from this room');

  await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    update: {},
    create: { roomId, userId: targetUserId },
  });

  return { roomId, targetUserId };
}

export async function deleteRoom(ownerId: string, roomId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError(404, 'Room not found');
  if (room.ownerId !== ownerId) throw new AppError(403, 'Only the owner can delete this room');

  // Delete attachment files from disk
  const attachments = await prisma.attachment.findMany({
    where: { message: { roomId } },
    select: { storagePath: true },
  });
  for (const att of attachments) {
    try {
      fs.unlinkSync(att.storagePath);
      // Also try to remove the parent uuid directory
      const dir = path.dirname(att.storagePath);
      if (fs.existsSync(dir)) fs.rmdirSync(dir);
    } catch {
      // ignore missing files
    }
  }

  await prisma.room.delete({ where: { id: roomId } });
}

export async function getMembers(userId: string, roomId: string) {
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!member) throw new AppError(403, 'Not a member');

  const members = await prisma.roomMember.findMany({
    where: { roomId },
    include: { user: { select: { id: true, username: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  const userIds = members.map((m) => m.user.id);
  const presenceMap = getMultiplePresence(userIds);

  return members.map((m) => ({
    id: m.id,
    userId: m.user.id,
    username: m.user.username,
    isAdmin: m.isAdmin,
    joinedAt: m.joinedAt,
    presence: presenceMap[m.user.id],
  }));
}

export async function kickMember(adminId: string, roomId: string, targetUserId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError(404, 'Room not found');

  const adminMember = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: adminId } },
  });
  if (!adminMember || (!adminMember.isAdmin && room.ownerId !== adminId)) {
    throw new AppError(403, 'Admin or owner only');
  }
  if (targetUserId === room.ownerId) throw new AppError(403, 'Cannot kick the room owner');

  await prisma.$transaction([
    prisma.roomMember.deleteMany({ where: { roomId, userId: targetUserId } }),
    prisma.roomBan.upsert({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      update: {},
      create: { roomId, userId: targetUserId, bannedBy: adminId },
    }),
  ]);

  return { roomId, targetUserId };
}

export async function getBans(adminId: string, roomId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError(404, 'Room not found');

  const adminMember = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: adminId } },
  });
  if (!adminMember || (!adminMember.isAdmin && room.ownerId !== adminId)) {
    throw new AppError(403, 'Admin only');
  }

  return prisma.roomBan.findMany({
    where: { roomId },
    include: { user: { select: { id: true, username: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function removeBan(adminId: string, roomId: string, targetUserId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError(404, 'Room not found');

  const adminMember = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: adminId } },
  });
  if (!adminMember || (!adminMember.isAdmin && room.ownerId !== adminId)) {
    throw new AppError(403, 'Admin only');
  }

  const deleted = await prisma.roomBan.deleteMany({ where: { roomId, userId: targetUserId } });
  if (deleted.count === 0) throw new AppError(404, 'Ban not found');
}

export async function promoteAdmin(ownerId: string, roomId: string, targetUserId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError(404, 'Room not found');
  if (room.ownerId !== ownerId) throw new AppError(403, 'Owner only');

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: targetUserId } },
  });
  if (!member) throw new AppError(404, 'User is not a member');

  await prisma.roomMember.update({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    data: { isAdmin: true },
  });
}

export async function demoteAdmin(ownerId: string, roomId: string, targetUserId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError(404, 'Room not found');
  if (room.ownerId !== ownerId) throw new AppError(403, 'Owner only');
  if (targetUserId === ownerId) throw new AppError(400, 'Cannot demote yourself');

  await prisma.roomMember.update({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    data: { isAdmin: false },
  });
}

export async function updateRoom(
  ownerId: string,
  roomId: string,
  data: { name?: string; description?: string; isPublic?: boolean }
) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError(404, 'Room not found');
  if (room.ownerId !== ownerId) throw new AppError(403, 'Owner only');

  if (data.name && data.name !== room.name) {
    const conflict = await prisma.room.findUnique({ where: { name: data.name } });
    if (conflict) throw new AppError(409, 'Room name already taken');
  }

  return prisma.room.update({
    where: { id: roomId },
    data,
    include: { _count: { select: { members: true } } },
  });
}

export async function isMember(userId: string, roomId: string): Promise<boolean> {
  const m = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  return !!m;
}

export async function isBannedFromRoom(userId: string, roomId: string): Promise<boolean> {
  const b = await prisma.roomBan.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  return !!b;
}

export async function getMembershipStatus(userId: string, roomId: string) {
  return prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
}
