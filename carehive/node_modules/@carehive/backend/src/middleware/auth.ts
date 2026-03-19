/**
 * Supabase JWT auth middleware.
 * Expects Authorization: Bearer <access_token>.
 * Sets req.userId and req.authUser on success.
 */
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabaseClient.js';

export interface AuthRequest extends Request {
  userId?: string;
  authUser?: { id: string; email?: string };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    req.userId = user.id;
    req.authUser = { id: user.id, email: user.email ?? undefined };
    next();
  } catch (e) {
    console.error('Auth middleware error:', e);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/** Optional auth: set req.userId if valid Bearer token present, never 401. */
export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    next();
    return;
  }
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (!error && user) {
      req.userId = user.id;
      req.authUser = { id: user.id, email: user.email ?? undefined };
    }
  } catch (_) {
    // ignore
  }
  next();
}
