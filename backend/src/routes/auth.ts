import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import * as authService from '../services/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(2).max(32).regex(/^\w+$/, 'Username must be alphanumeric'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const resetInitSchema = z.object({ email: z.string().email() });

const resetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

const deleteAccountSchema = z.object({ password: z.string().min(1) });

router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const user = await authService.register(body.email, body.password, body.username);
    res.status(201).json({ user });
  })
);

router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(
      body.email,
      body.password,
      req.headers['user-agent'],
      req.ip
    );
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: result.accessToken, sessionId: result.sessionId, user: result.user });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }
    const result = await authService.refreshTokens(refreshToken);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: result.accessToken, sessionId: result.sessionId, user: result.user });
  })
);

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await authService.logout(req.user!.sessionId, req.user!.id);
    res.clearCookie('refreshToken');
    res.status(204).send();
  })
);

router.put(
  '/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = passwordChangeSchema.parse(req.body);
    await authService.changePassword(req.user!.id, body.currentPassword, body.newPassword);
    res.status(204).send();
  })
);

router.post(
  '/password/reset',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = resetInitSchema.parse(req.body);
    await authService.initiatePasswordReset(body.email);
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  })
);

router.put(
  '/password/reset/confirm',
  asyncHandler(async (req, res) => {
    const body = resetConfirmSchema.parse(req.body);
    await authService.confirmPasswordReset(body.token, body.newPassword);
    res.json({ message: 'Password updated.' });
  })
);

router.delete(
  '/account',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = deleteAccountSchema.parse(req.body);
    await authService.deleteAccount(req.user!.id, body.password);
    res.clearCookie('refreshToken');
    res.status(204).send();
  })
);

export default router;
