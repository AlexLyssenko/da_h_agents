import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import * as friendsService from '../services/friends';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await friendsService.listFriends(req.user!.id);
    res.json(data);
  })
);

router.post(
  '/request',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({ username: z.string().min(1), message: z.string().optional() })
      .parse(req.body);
    const result = await friendsService.sendFriendRequest(req.user!.id, body.username, body.message);
    // Socket notification is emitted from the socket layer via global io instance
    res.status(201).json({ friendship: result.friendship });
  })
);

router.put(
  '/:id/accept',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await friendsService.acceptFriendRequest(req.user!.id, req.params.id);
    res.json({ friendship: result.friendship });
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await friendsService.removeFriend(req.user!.id, req.params.id);
    res.status(204).send();
  })
);

router.post(
  '/ban',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z.object({ userId: z.string().min(1) }).parse(req.body);
    await friendsService.banUser(req.user!.id, body.userId);
    res.status(204).send();
  })
);

router.delete(
  '/ban/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await friendsService.unbanUser(req.user!.id, req.params.userId);
    res.status(204).send();
  })
);

export default router;
