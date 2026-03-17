/**
 * Vision check-in: analyze image for mood/posture and store as health log.
 */
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { analyzeImage } from '../services/visionService.js';
import { createHealthLog, ensureUserRowExists, toHealthLog } from '../db/supabase.js';

export async function analyzeVision(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { image, mimeType } = req.body as { image?: string; mimeType?: string };
    if (!image || typeof image !== 'string') {
      res.status(400).json({ error: 'Missing or invalid body: image (base64 string)' });
      return;
    }

    // Make sure FK constraints won't block the insert on first-time users.
    await ensureUserRowExists(userId, req.authUser?.email ?? null);

    const analysis = await analyzeImage(image, mimeType || 'image/jpeg');
    const notes = [analysis.posture, analysis.summary].filter(Boolean).join('. ').trim() || null;

    const { data: log, error } = await createHealthLog({
      user_id: userId,
      medication_taken: true,
      steps: 0,
      mood: analysis.mood,
      notes,
      timestamp: new Date().toISOString(),
      source: 'vision',
    });

    if (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to save vision check-in', analysis });
      return;
    }

    res.status(201).json({
      analysis: {
        mood: analysis.mood,
        posture: analysis.posture,
        summary: analysis.summary,
      },
      healthLog: log ? toHealthLog(log) : undefined,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Vision check-in failed' });
  }
}
