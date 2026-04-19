import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  sessionId: string;
  isAdmin: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }
  try {
    const payload = jwt.verify(token, config.jwtAccessSecret) as AuthUser & { type: string };
    if (payload.type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }
    req.user = { id: payload.id, username: payload.username, email: payload.email, sessionId: payload.sessionId, isAdmin: payload.isAdmin ?? false };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtAccessSecret) as AuthUser & { type: string };
      if (payload.type === 'access') {
        req.user = { id: payload.id, username: payload.username, email: payload.email, sessionId: payload.sessionId, isAdmin: payload.isAdmin ?? false };
      }
    } catch {
      // ignore invalid tokens for optionalAuth
    }
  }
  next();
}
