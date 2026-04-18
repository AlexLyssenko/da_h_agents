import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { getMultiplePresence } from '../services/presence';

const router = Router();
const prisma = new PrismaClient();

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { id: true, username: true, email: true, createdAt: true },
    });
    res.json({ user });
  })
);

router.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = z.string().min(1).parse(req.query.q);
    const users = await prisma.user.findMany({
      where: { username: { contains: q, mode: 'insensitive' }, id: { not: req.user!.id } },
      select: { id: true, username: true },
      take: 20,
    });
    res.json({ users });
  })
);

router.get(
  '/presence',
  requireAuth,
  asyncHandler(async (req, res) => {
    const raw = z.string().parse(req.query.ids);
    const ids = raw.split(',').filter(Boolean);
    const presence = getMultiplePresence(ids);
    res.json({ presence });
  })
);

export default router;
