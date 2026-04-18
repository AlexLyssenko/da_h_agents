import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { resetUnread, getUnreadMap } from '../services/notifications';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const unread = getUnreadMap(req.user!.id);
    res.json({ unread });
  })
);

router.post(
  '/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({ roomId: z.string().optional(), dialogId: z.string().optional() })
      .parse(req.body);

    if (body.roomId) {
      resetUnread(req.user!.id, `room:${body.roomId}`);
    } else if (body.dialogId) {
      resetUnread(req.user!.id, `dm:${body.dialogId}`);
    }
    res.status(204).send();
  })
);

export default router;
