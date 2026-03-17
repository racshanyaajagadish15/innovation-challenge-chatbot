/**
 * Health log and history endpoints.
 * When authenticated (Bearer token), userId is taken from req.userId; otherwise from body/query (demo).
 */
import { Response } from 'express';
import { getHealthLogsByUserId, createHealthLog, ensureUserRowExists, toHealthLog } from '../db/supabase.js';
import { AuthRequest } from '../middleware/auth.js';

export async function logHealth(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId ?? (req.body as { userId?: string }).userId;
    const isAuthed = Boolean(req.userId);
    const { medicationTaken, steps, mood, notes } = req.body as {
      medicationTaken?: boolean;
      steps?: number;
      mood?: number;
      notes?: string;
    };
    if (!userId || typeof medicationTaken !== 'boolean' || typeof steps !== 'number' || typeof mood !== 'number') {
      res.status(400).json({ error: 'Missing or invalid: userId (or be logged in), medicationTaken, steps, mood' });
      return;
    }

    if (isAuthed) {
      await ensureUserRowExists(userId, req.authUser?.email ?? null);
    }

    const { data, error } = await createHealthLog({
      user_id: userId,
      medication_taken: medicationTaken,
      steps: Math.max(0, Math.round(steps)),
      mood: Math.min(10, Math.max(1, Math.round(mood))),
      notes: notes ?? null,
      timestamp: new Date().toISOString(),
      source: 'manual',
    });
    if (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create health log' });
      return;
    }
    res.status(201).json(data ? toHealthLog(data) : {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create health log' });
  }
}

export async function getHistory(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId ?? (req.query.userId as string);
    if (!userId) {
      res.status(400).json({ error: 'userId required (query or be logged in)' });
      return;
    }
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 30));
    const { data, error } = await getHealthLogsByUserId(userId, limit);
    if (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch history' });
      return;
    }
    res.json(data.map(toHealthLog));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
}
