import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { getPresence } from './presence';

const prisma = new PrismaClient();

export async function sendFriendRequest(requesterId: string, username: string, _message?: string) {
  const recipient = await prisma.user.findUnique({ where: { username } });
  if (!recipient) throw new AppError(404, 'User not found');
  if (recipient.id === requesterId) throw new AppError(400, 'Cannot send friend request to yourself');

  // Check for existing ban (either direction)
  const ban = await prisma.userBan.findFirst({
    where: {
      OR: [
        { bannerId: requesterId, bannedId: recipient.id },
        { bannerId: recipient.id, bannedId: requesterId },
      ],
    },
  });
  if (ban) throw new AppError(403, 'Cannot send friend request');

  // Check for existing friendship
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, recipientId: recipient.id },
        { requesterId: recipient.id, recipientId: requesterId },
      ],
    },
  });
  if (existing) {
    if (existing.status === 'ACCEPTED') throw new AppError(409, 'Already friends');
    throw new AppError(409, 'Friend request already pending');
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId, recipientId: recipient.id, status: 'ACCEPTED' },
    include: {
      requester: { select: { id: true, username: true } },
      recipient: { select: { id: true, username: true } },
    },
  });

  return { friendship, recipientId: recipient.id };
}

export async function acceptFriendRequest(currentUserId: string, friendshipId: string) {
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship) throw new AppError(404, 'Friend request not found');
  if (friendship.recipientId !== currentUserId) throw new AppError(403, 'Not authorized');
  if (friendship.status !== 'PENDING') throw new AppError(400, 'Request already handled');

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: 'ACCEPTED' },
    include: {
      requester: { select: { id: true, username: true } },
      recipient: { select: { id: true, username: true } },
    },
  });

  return { friendship: updated, requesterId: friendship.requesterId };
}

export async function removeFriend(currentUserId: string, friendshipId: string) {
  const friendship = await prisma.friendship.findFirst({
    where: {
      id: friendshipId,
      OR: [{ requesterId: currentUserId }, { recipientId: currentUserId }],
    },
  });
  if (!friendship) throw new AppError(404, 'Friendship not found');

  await prisma.friendship.delete({ where: { id: friendshipId } });
}

export async function listFriends(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: userId }, { recipientId: userId }],
    },
    include: {
      requester: { select: { id: true, username: true } },
      recipient: { select: { id: true, username: true } },
    },
  });

  const accepted = friendships
    .filter((f) => f.status === 'ACCEPTED')
    .map((f) => {
      const friend = f.requesterId === userId ? f.recipient : f.requester;
      return { friendshipId: f.id, friend, presence: getPresence(friend.id) };
    });

  const pendingIncoming = friendships
    .filter((f) => f.status === 'PENDING' && f.recipientId === userId)
    .map((f) => ({ friendshipId: f.id, from: f.requester, createdAt: f.createdAt }));

  const pendingOutgoing = friendships
    .filter((f) => f.status === 'PENDING' && f.requesterId === userId)
    .map((f) => ({ friendshipId: f.id, to: f.recipient, createdAt: f.createdAt }));

  return { accepted, pendingIncoming, pendingOutgoing };
}

export async function banUser(bannerId: string, bannedId: string) {
  if (bannerId === bannedId) throw new AppError(400, 'Cannot ban yourself');

  const banned = await prisma.user.findUnique({ where: { id: bannedId } });
  if (!banned) throw new AppError(404, 'User not found');

  await prisma.userBan.upsert({
    where: { bannerId_bannedId: { bannerId, bannedId } },
    update: {},
    create: { bannerId, bannedId },
  });

  // Remove any existing friendship
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { requesterId: bannerId, recipientId: bannedId },
        { requesterId: bannedId, recipientId: bannerId },
      ],
    },
  });

  return { bannedId };
}

export async function unbanUser(bannerId: string, bannedId: string) {
  const deleted = await prisma.userBan.deleteMany({
    where: { bannerId, bannedId },
  });
  if (deleted.count === 0) throw new AppError(404, 'Ban not found');
}

export async function areFriends(userA: string, userB: string): Promise<boolean> {
  const f = await prisma.friendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userA, recipientId: userB },
        { requesterId: userB, recipientId: userA },
      ],
    },
  });
  return !!f;
}

export async function isBanned(bannerId: string, bannedId: string): Promise<boolean> {
  const ban = await prisma.userBan.findFirst({
    where: {
      OR: [
        { bannerId, bannedId },
        { bannerId: bannedId, bannedId: bannerId },
      ],
    },
  });
  return !!ban;
}
