import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import * as messagesService from '../services/messages';

const router = Router();

router.get(
  '/rooms/:id/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 100);
    const messages = await messagesService.getRoomMessages(req.user!.id, req.params.id, cursor, limit);
    res.json({ messages });
  })
);

router.get(
  '/dialogs/:dialogId/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 100);
    const messages = await messagesService.getDMMessages(req.user!.id, req.params.dialogId, cursor, limit);
    res.json({ messages });
  })
);

router.put(
  '/messages/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z.object({ content: z.string().min(1) }).parse(req.body);
    const message = await messagesService.editMessage(req.user!.id, req.params.id, body.content);
    res.json({ message });
  })
);

router.delete(
  '/messages/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await messagesService.deleteMessage(req.user!.id, req.params.id);
    res.json(result);
  })
);

export default router;
