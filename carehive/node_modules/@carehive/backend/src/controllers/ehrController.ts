import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { supabase } from '../utils/supabaseClient.js';
import { parseEhrText, type EhrParsedData } from '../services/ehrParserService.js';

const EHR_TABLE = 'ehr_uploads';

let discoveredColumns: string[] | null = null;

async function discoverColumns(): Promise<string[]> {
  if (discoveredColumns) return discoveredColumns;
  const { data, error } = await supabase.from(EHR_TABLE).select('*').limit(0);
  if (!error && data !== null) {
    // If table is empty but query succeeded, try inserting to discover
    // For now just check a test query to get column info
  }
  // Try a dummy select with known possible columns to discover which exist
  const possibleCols = ['id', 'user_id', 'patient_id', 'uploaded_by', 'uploader_id',
    'file_name', 'filename', 'name', 'title', 'document_name',
    'raw_text', 'content', 'text', 'body', 'document_text',
    'parsed_data', 'parsed', 'extracted_data', 'analysis',
    'created_at', 'uploaded_at', 'timestamp'];
  const found: string[] = [];
  for (const col of possibleCols) {
    const { error: e } = await supabase.from(EHR_TABLE).select(col).limit(1);
    if (!e) found.push(col);
  }
  discoveredColumns = found;
  console.log(`[EHR] Discovered columns in ${EHR_TABLE}:`, found);
  return found;
}

function buildInsertPayload(
  cols: string[],
  userId: string,
  fileName: string,
  rawText: string,
  parsedData: EhrParsedData
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (cols.includes('user_id')) payload.user_id = userId;
  else if (cols.includes('patient_id')) payload.patient_id = userId;

  if (cols.includes('uploaded_by')) payload.uploaded_by = userId;
  else if (cols.includes('uploader_id')) payload.uploader_id = userId;

  if (cols.includes('file_name')) payload.file_name = fileName;
  else if (cols.includes('filename')) payload.filename = fileName;
  else if (cols.includes('name')) payload.name = fileName;
  else if (cols.includes('title')) payload.title = fileName;
  else if (cols.includes('document_name')) payload.document_name = fileName;

  if (cols.includes('raw_text')) payload.raw_text = rawText;
  else if (cols.includes('content')) payload.content = rawText;
  else if (cols.includes('text')) payload.text = rawText;
  else if (cols.includes('body')) payload.body = rawText;
  else if (cols.includes('document_text')) payload.document_text = rawText;

  if (cols.includes('parsed_data')) payload.parsed_data = parsedData;
  else if (cols.includes('parsed')) payload.parsed = parsedData;
  else if (cols.includes('extracted_data')) payload.extracted_data = parsedData;
  else if (cols.includes('analysis')) payload.analysis = parsedData;

  return payload;
}

function normalizeRow(row: Record<string, unknown>): {
  id: string;
  userId: string;
  uploadedBy: string;
  fileName: string;
  rawText: string;
  parsedData: EhrParsedData | null;
  createdAt: string;
} {
  return {
    id: (row.id as string) || '',
    userId: (row.user_id ?? row.patient_id ?? '') as string,
    uploadedBy: (row.uploaded_by ?? row.uploader_id ?? row.user_id ?? '') as string,
    fileName: (row.file_name ?? row.filename ?? row.name ?? row.title ?? row.document_name ?? '') as string,
    rawText: (row.raw_text ?? row.content ?? row.text ?? row.body ?? row.document_text ?? '') as string,
    parsedData: (row.parsed_data ?? row.parsed ?? row.extracted_data ?? row.analysis ?? null) as EhrParsedData | null,
    createdAt: (row.created_at ?? row.uploaded_at ?? row.timestamp ?? new Date().toISOString()) as string,
  };
}

export async function uploadEhr(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { patientId, fileName, rawText } = req.body;
    if (!fileName || !rawText) {
      res.status(400).json({ error: 'Missing: fileName, rawText' });
      return;
    }

    const targetUserId = patientId || userId;
    const parsedData = parseEhrText(rawText);

    const cols = await discoverColumns();
    const payload = buildInsertPayload(cols, targetUserId, fileName, rawText, parsedData);

    console.log(`[EHR] Inserting with payload keys:`, Object.keys(payload));

    const { data, error } = await supabase
      .from(EHR_TABLE)
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('[EHR] Insert error:', error);
      res.status(500).json({ error: 'Failed to save EHR record' });
      return;
    }

    res.status(201).json(normalizeRow(data as Record<string, unknown>));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to process EHR' });
  }
}

export async function getEhrRecords(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const patientId = (req.query.patientId as string) || userId;

    const cols = await discoverColumns();
    const userCol = cols.includes('user_id') ? 'user_id' : 'patient_id';

    const { data, error } = await supabase
      .from(EHR_TABLE)
      .select('*')
      .eq(userCol, patientId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[EHR] List error:', error);
      res.json({ records: [] });
      return;
    }

    res.json({ records: (data || []).map((r: Record<string, unknown>) => normalizeRow(r)) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch EHR records' });
  }
}

export async function getEhrRecord(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from(EHR_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'EHR record not found' });
      return;
    }

    res.json(normalizeRow(data as Record<string, unknown>));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch EHR record' });
  }
}

export async function convertEhrToMedications(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { ehrRecordId } = req.body;

    const { data: ehr, error: ehrErr } = await supabase
      .from(EHR_TABLE)
      .select('*')
      .eq('id', ehrRecordId)
      .single();

    if (ehrErr || !ehr) {
      res.status(404).json({ error: 'EHR record not found' });
      return;
    }

    const normalized = normalizeRow(ehr as Record<string, unknown>);
    const parsedData = normalized.parsedData;
    if (!parsedData?.medications?.length) {
      res.json({ created: 0, medications: [] });
      return;
    }

    const FREQUENCY_MAP: Record<string, string> = {
      'once daily': 'once_daily',
      'twice daily': 'twice_daily',
      'three times daily': 'three_daily',
      'four times daily': 'four_daily',
      'as needed': 'as_needed',
      weekly: 'weekly',
    };

    const TIMING_MAP: Record<string, string[]> = {
      once_daily: ['08:00'],
      twice_daily: ['08:00', '20:00'],
      three_daily: ['08:00', '14:00', '20:00'],
      four_daily: ['08:00', '12:00', '16:00', '20:00'],
      as_needed: [],
      weekly: ['08:00'],
    };

    const toInsert = parsedData.medications.map((m) => {
      const freq = FREQUENCY_MAP[m.frequency.toLowerCase()] || 'once_daily';
      return {
        user_id: normalized.userId || userId,
        name: m.name,
        dosage: m.dosage,
        frequency: freq,
        timing: TIMING_MAP[freq] || ['08:00'],
        instructions: m.instructions || null,
      };
    });

    const { data: inserted, error: insertErr } = await supabase
      .from('medications')
      .insert(toInsert)
      .select('*');

    if (insertErr) {
      console.error(insertErr);
      res.status(500).json({ error: 'Failed to create medications from EHR' });
      return;
    }

    res.json({ created: (inserted || []).length, medications: inserted || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to convert EHR to medications' });
  }
}
