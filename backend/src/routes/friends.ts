import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import * as friendsService from '../services/friends';
import { getIo } from '../socket';

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
    const io = getIo();
    io.to(`user:${req.user!.id}`).emit('friend:accepted', { friendship: result.friendship });
    io.to(`user:${result.recipientId}`).emit('friend:accepted', { friendship: result.friendship });
    res.status(201).json({ friendship: result.friendship });
  })
);

router.put(
  '/:id/accept',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await friendsService.acceptFriendRequest(req.user!.id, req.params.id);
    const io = getIo();
    io.to(`user:${req.user!.id}`).emit('friend:accepted', { friendship: result.friendship });
    io.to(`user:${result.requesterId}`).emit('friend:accepted', { friendship: result.friendship });
    res.json({ friendship: result.friendship });
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await friendsService.removeFriend(req.user!.id, req.params.id);
    getIo().to(`user:${req.user!.id}`).emit('friend:removed', {});
    res.status(204).send();
  })
);

// List users I have banned
router.get(
  '/ban',
  requireAuth,
  asyncHandler(async (req, res) => {
    const banned = await friendsService.listBanned(req.user!.id);
    res.json({ banned });
  })
);

// Check ban status between current user and another user
router.get(
  '/ban/check/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = await friendsService.checkBanStatus(req.user!.id, req.params.userId);
    res.json(status);
  })
);

router.post(
  '/ban',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z.object({ userId: z.string().min(1) }).parse(req.body);
    await friendsService.banUser(req.user!.id, body.userId);
    const io = getIo();
    // Tell the banned user their access is revoked
    io.to(`user:${body.userId}`).emit('user:banned', { bannerId: req.user!.id });
    // Remove each other from contacts lists
    io.to(`user:${req.user!.id}`).emit('friend:removed', {});
    io.to(`user:${body.userId}`).emit('friend:removed', {});
    res.status(204).send();
  })
);

router.delete(
  '/ban/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await friendsService.unbanUser(req.user!.id, req.params.userId);
    // Notify unbanned user
    getIo().to(`user:${req.params.userId}`).emit('user:unbanned', { bannerId: req.user!.id });
    res.status(204).send();
  })
);

export default router;
