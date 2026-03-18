/**
 * EHR upload + listing (HealthHub simulation).
 * Upload requires AI (no mock fallback) and stores extracted JSON.
 */
import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { ensureUserRowExists, createEhrUpload, getEhrUploadsByUserId } from '../db/supabase.js';
import { generateCompletion, getLLMMode } from '../services/llmService.js';
import pdfParse from 'pdf-parse';

function safeJsonParse(raw: string): any | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function uploadEhr(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const file = (req as any).file as { originalname?: string; buffer?: Buffer; mimetype?: string } | undefined;
    if (!file?.buffer) {
      res.status(400).json({ error: 'PDF file required (field: file)' });
      return;
    }
    if (file.mimetype && !file.mimetype.includes('pdf')) {
      res.status(400).json({ error: 'Only PDF supported' });
      return;
    }

    await ensureUserRowExists(userId, req.authUser?.email ?? null);

    const parsed = await pdfParse(file.buffer);
    const text = (parsed.text || '').trim().slice(0, 15000);

    const llmMode = getLLMMode();
    if (llmMode !== 'groq') {
      res.status(503).json({
        error: 'AI extraction unavailable',
        details: 'Configure GROQ_API_KEY (and ensure USE_MOCK_LLM is not true) to enable AI-based EHR extraction.',
      });
      return;
    }

    const system = `You are CAREHIVE. Extract baseline patient info from an EHR text dump.
Return STRICT JSON only, no markdown.
Schema:
{
  "summary": string,
  "diagnoses": string[],
  "allergies": string[],
  "vaccinations": string[],
  "medications": Array<{"name": string, "dosage"?: string, "instructions"?: string}>,
  "symptoms": string[],
  "suggestedActions": Array<
    | {"type": "add_medications"}
    | {"type": "add_reminders", "defaultTimes": string[]}
    | {"type": "add_diagnoses"}
    | {"type": "add_activity_plan", "plan": string}
  >
}
If fields are unknown, use empty arrays, and keep summary brief.`;

    const user = `EHR TEXT:\n${text}\n\nExtract the JSON.`;
    const raw = await generateCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { maxTokens: 700 }
    );

    const llmJson = safeJsonParse(raw);
    if (!llmJson) {
      res.status(502).json({
        error: 'AI extraction failed',
        details: 'The AI did not return valid JSON. Try again, or adjust the prompt/model.',
      });
      return;
    }

    const filename = file.originalname || 'ehr.pdf';
    const summary = typeof llmJson?.summary === 'string' ? llmJson.summary : null;
    const { data, error } = await createEhrUpload({
      user_id: userId,
      filename,
      extracted_text: text || null,
      summary,
      parsed: llmJson,
    } as any);
    if (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to store EHR upload' });
      return;
    }

    res.status(201).json({
      id: data!.id,
      filename: data!.filename,
      summary: data!.summary,
      extractionSource: 'ai',
      llmProvider: llmMode,
      parsed: data!.parsed,
      createdAt: data!.created_at,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'EHR upload failed' });
  }
}

export async function listEhrs(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const limit = Math.min(50, Math.max(1, parseInt(String((req.query as any).limit ?? '20'), 10) || 20));
    const { data, error } = await getEhrUploadsByUserId(userId, limit);
    if (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch EHR uploads' });
      return;
    }
    res.json(
      data.map((e) => ({
        id: e.id,
        filename: e.filename,
        summary: e.summary,
        parsed: e.parsed,
        createdAt: e.created_at,
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch EHR uploads' });
  }
}
