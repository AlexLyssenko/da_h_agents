import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import * as authService from '../services/auth';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await authService.listSessions(req.user!.id, req.user!.sessionId);
    res.json({ sessions });
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await authService.deleteSession(req.params.id, req.user!.id);
    res.status(204).send();
  })
);

export default router;
