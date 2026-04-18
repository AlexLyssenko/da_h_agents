import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import * as roomsService from '../services/rooms';

const router = Router();

const createRoomSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[\w-]+$/, 'Room name must be alphanumeric'),
  description: z.string().max(256).optional(),
  isPublic: z.boolean(),
});

const updateRoomSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[\w-]+$/).optional(),
  description: z.string().max(256).optional(),
  isPublic: z.boolean().optional(),
});

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '20'), 10);
    const rooms = await roomsService.listPublicRooms(req.user!.id, search, page, limit);
    res.json({ rooms });
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = createRoomSchema.parse(req.body);
    const room = await roomsService.createRoom(req.user!.id, body);
    res.status(201).json({ room });
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const room = await roomsService.getRoom(req.user!.id, req.params.id);
    res.json({ room });
  })
);

router.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = updateRoomSchema.parse(req.body);
    const room = await roomsService.updateRoom(req.user!.id, req.params.id, body);
    res.json({ room });
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await roomsService.deleteRoom(req.user!.id, req.params.id);
    res.status(204).send();
  })
);

router.post(
  '/:id/join',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await roomsService.joinRoom(req.user!.id, req.params.id);
    res.status(201).json(result);
  })
);

router.post(
  '/:id/leave',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await roomsService.leaveRoom(req.user!.id, req.params.id);
    res.json(result);
  })
);

router.post(
  '/:id/invite',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z.object({ userId: z.string().min(1) }).parse(req.body);
    const result = await roomsService.inviteToRoom(req.user!.id, req.params.id, body.userId);
    res.status(201).json(result);
  })
);

router.get(
  '/:id/members',
  requireAuth,
  asyncHandler(async (req, res) => {
    const members = await roomsService.getMembers(req.user!.id, req.params.id);
    res.json({ members });
  })
);

router.delete(
  '/:id/members/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await roomsService.kickMember(req.user!.id, req.params.id, req.params.userId);
    res.json(result);
  })
);

router.get(
  '/:id/bans',
  requireAuth,
  asyncHandler(async (req, res) => {
    const bans = await roomsService.getBans(req.user!.id, req.params.id);
    res.json({ bans });
  })
);

router.delete(
  '/:id/bans/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await roomsService.removeBan(req.user!.id, req.params.id, req.params.userId);
    res.status(204).send();
  })
);

router.post(
  '/:id/admins/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await roomsService.promoteAdmin(req.user!.id, req.params.id, req.params.userId);
    res.status(204).send();
  })
);

router.delete(
  '/:id/admins/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await roomsService.demoteAdmin(req.user!.id, req.params.id, req.params.userId);
    res.status(204).send();
  })
);

export default router;
