import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, PresenceStatus } from '@prisma/client';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

interface TokenPayload {
  id: string;
  username: string;
  email: string;
  sessionId: string;
  isAdmin: boolean;
  type: 'access' | 'refresh' | 'reset';
}

function signAccess(payload: Omit<TokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessExpiry,
  } as jwt.SignOptions);
}

function signRefresh(payload: Omit<TokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'refresh' }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiry,
  } as jwt.SignOptions);
}

export async function register(email: string, password: string, username: string) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    if (existing.email === email) throw new AppError(409, 'Email already registered');
    throw new AppError(409, 'Username already taken');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      presence: { create: { status: PresenceStatus.OFFLINE } },
    },
    select: { id: true, username: true, email: true, isAdmin: true, createdAt: true },
  });
  return user;
}

export async function login(email: string, password: string, userAgent?: string, ip?: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: 'pending', // will be replaced below
      userAgent: userAgent ?? null,
      ip: ip ?? null,
    },
  });

  const base = { id: user.id, username: user.username, email: user.email, sessionId: session.id, isAdmin: user.isAdmin };
  const accessToken = signAccess(base);
  const refreshToken = signRefresh(base);

  await prisma.session.update({ where: { id: session.id }, data: { token: refreshToken } });

  return {
    accessToken,
    refreshToken,
    sessionId: session.id,
    user: { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin },
  };
}

export async function refreshTokens(refreshToken: string) {
  let payload: TokenPayload;
  try {
    payload = jwt.verify(refreshToken, config.jwtRefreshSecret) as TokenPayload;
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }
  if (payload.type !== 'refresh') throw new AppError(401, 'Invalid token type');

  const session = await prisma.session.findFirst({
    where: { id: payload.sessionId, token: refreshToken },
    include: { user: true },
  });
  if (!session) throw new AppError(401, 'Session not found or token mismatch');

  const base = {
    id: session.user.id,
    username: session.user.username,
    email: session.user.email,
    sessionId: session.id,
    isAdmin: session.user.isAdmin,
  };
  const newAccessToken = signAccess(base);
  const newRefreshToken = signRefresh(base);

  await prisma.session.update({
    where: { id: session.id },
    data: { token: newRefreshToken, lastSeen: new Date() },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    sessionId: session.id,
    user: {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email,
      isAdmin: session.user.isAdmin,
    },
  };
}

export async function logout(sessionId: string, userId: string) {
  await prisma.session.deleteMany({ where: { id: sessionId, userId } });
}

export async function listSessions(userId: string, currentSessionId: string) {
  const sessions = await prisma.session.findMany({ where: { userId } });
  return sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ip: s.ip,
    lastSeen: s.lastSeen,
    createdAt: s.createdAt,
    isCurrent: s.id === currentSessionId,
  }));
}

export async function deleteSession(sessionId: string, userId: string) {
  const deleted = await prisma.session.deleteMany({ where: { id: sessionId, userId } });
  if (deleted.count === 0) throw new AppError(404, 'Session not found');
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError(401, 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function initiatePasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // no user enumeration — silently return

  const token = jwt.sign(
    { id: user.id, email: user.email, type: 'reset' },
    config.jwtAccessSecret,
    { expiresIn: config.jwtResetExpiry } as jwt.SignOptions
  );
  console.log(`[PASSWORD RESET] Token for ${email}: ${token}`);
}

export async function confirmPasswordReset(token: string, newPassword: string) {
  let payload: { id: string; email: string; type: string };
  try {
    payload = jwt.verify(token, config.jwtAccessSecret) as typeof payload;
  } catch {
    throw new AppError(400, 'Invalid or expired reset token');
  }
  if (payload.type !== 'reset') throw new AppError(400, 'Invalid token type');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: payload.id }, data: { passwordHash } });
}

export async function deleteAccount(userId: string, password: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Incorrect password');

  // Delete owned rooms + their attachment files (handled in rooms service via cascade)
  // Here we just cascade-delete the user; Prisma cascade handles the rest
  await prisma.user.delete({ where: { id: userId } });
}
