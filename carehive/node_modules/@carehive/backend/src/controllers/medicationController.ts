import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { supabase } from '../utils/supabaseClient.js';

let knownMedCols: string[] | null = null;
let medDiscoveryTime = 0;

async function discoverMedColumns(): Promise<string[]> {
  if (knownMedCols && Date.now() - medDiscoveryTime < 60_000) return knownMedCols;

  const candidates = [
    'id', 'user_id', 'patient_id',
    'name', 'medication_name', 'med_name',
    'dosage', 'dose',
    'frequency', 'freq',
    'timing', 'schedule', 'times',
    'instructions', 'notes', 'description',
    'active', 'is_active', 'status',
    'created_at', 'updated_at',
  ];
  const found: string[] = [];
  for (const col of candidates) {
    const { error } = await supabase.from('medications').select(col).limit(1);
    if (!error) found.push(col);
  }
  knownMedCols = found;
  medDiscoveryTime = Date.now();
  console.log('[Medications] Discovered columns:', found);
  return found;
}

function normalizeMedRow(row: Record<string, unknown>) {
  return {
    id: (row.id as string) || '',
    userId: (row.user_id ?? row.patient_id ?? '') as string,
    name: (row.name ?? row.medication_name ?? row.med_name ?? '') as string,
    dosage: (row.dosage ?? row.dose ?? '') as string,
    frequency: (row.frequency ?? row.freq ?? 'once_daily') as string,
    timing: (row.timing ?? row.schedule ?? row.times ?? ['08:00']) as string[],
    instructions: (row.instructions ?? row.notes ?? row.description ?? null) as string | null,
    active: (row.active ?? row.is_active ?? true) as boolean,
    createdAt: (row.created_at ?? row.updated_at ?? new Date().toISOString()) as string,
  };
}

function buildMedPayload(
  cols: string[],
  values: {
    userId: string;
    name: string;
    dosage: string;
    frequency: string;
    timing: string[];
    instructions: string | null;
  }
): Record<string, unknown> {
  const p: Record<string, unknown> = {};

  if (cols.includes('user_id')) p.user_id = values.userId;
  else if (cols.includes('patient_id')) p.patient_id = values.userId;

  if (cols.includes('name')) p.name = values.name;
  else if (cols.includes('medication_name')) p.medication_name = values.name;
  else if (cols.includes('med_name')) p.med_name = values.name;

  if (cols.includes('dosage')) p.dosage = values.dosage;
  else if (cols.includes('dose')) p.dose = values.dosage;

  if (cols.includes('frequency')) p.frequency = values.frequency;
  else if (cols.includes('freq')) p.freq = values.frequency;

  if (cols.includes('timing')) p.timing = values.timing;
  else if (cols.includes('schedule')) p.schedule = values.timing;
  else if (cols.includes('times')) p.times = values.timing;

  if (cols.includes('instructions')) p.instructions = values.instructions;
  else if (cols.includes('notes')) p.notes = values.instructions;
  else if (cols.includes('description')) p.description = values.instructions;

  return p;
}

interface MedicationLogRow {
  id: string;
  medication_id: string;
  user_id: string;
  status: string;
  scheduled_time: string;
  taken_at: string | null;
  created_at: string;
}

function toMedicationLog(r: MedicationLogRow) {
  return {
    id: r.id,
    medicationId: r.medication_id,
    userId: r.user_id,
    status: r.status,
    scheduledTime: r.scheduled_time,
    takenAt: r.taken_at,
    createdAt: r.created_at,
  };
}

export async function getMedications(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const cols = await discoverMedColumns();
    const userCol = cols.includes('user_id') ? 'user_id' : 'patient_id';

    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq(userCol, userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Medications] List error:', error);
      res.json({ medications: [] });
      return;
    }
    res.json({
      medications: (data || []).map((r: Record<string, unknown>) => normalizeMedRow(r)),
    });
  } catch (e) {
    console.error(e);
    res.json({ medications: [] });
  }
}

export async function addMedication(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { name, dosage, frequency, timing, instructions } = req.body;
    if (!name || !dosage) {
      res.status(400).json({ error: 'Missing required fields: name, dosage' });
      return;
    }

    const cols = await discoverMedColumns();
    const payload = buildMedPayload(cols, {
      userId,
      name,
      dosage,
      frequency: frequency || 'once_daily',
      timing: timing || ['08:00'],
      instructions: instructions || null,
    });

    console.log('[Medications] Insert payload keys:', Object.keys(payload));

    const { data, error } = await supabase
      .from('medications')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('[Medications] Insert error:', error);
      res.status(500).json({ error: 'Failed to add medication' });
      return;
    }
    res.status(201).json(normalizeMedRow(data as Record<string, unknown>));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add medication' });
  }
}

export async function updateMedication(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const cols = await discoverMedColumns();
    const userCol = cols.includes('user_id') ? 'user_id' : 'patient_id';

    const updates: Record<string, unknown> = {};
    const fieldMap: Record<string, string[]> = {
      name: ['name', 'medication_name', 'med_name'],
      dosage: ['dosage', 'dose'],
      frequency: ['frequency', 'freq'],
      timing: ['timing', 'schedule', 'times'],
      instructions: ['instructions', 'notes', 'description'],
    };

    for (const [bodyKey, colOptions] of Object.entries(fieldMap)) {
      if (req.body[bodyKey] !== undefined) {
        const col = colOptions.find((c) => cols.includes(c));
        if (col) updates[col] = req.body[bodyKey];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    const { data, error } = await supabase
      .from('medications')
      .update(updates)
      .eq('id', id)
      .eq(userCol, userId)
      .select('*')
      .single();

    if (error) {
      console.error('[Medications] Update error:', error);
      res.status(500).json({ error: 'Failed to update medication' });
      return;
    }
    res.json(normalizeMedRow(data as Record<string, unknown>));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update medication' });
  }
}

export async function deleteMedication(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const cols = await discoverMedColumns();
    const userCol = cols.includes('user_id') ? 'user_id' : 'patient_id';

    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', id)
      .eq(userCol, userId);

    if (error) {
      console.error('[Medications] Delete error:', error);
      res.status(500).json({ error: 'Failed to delete medication' });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete medication' });
  }
}

export async function logMedicationDose(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { medicationId, status, scheduledTime } = req.body;
    if (!medicationId || !status || !scheduledTime) {
      res.status(400).json({ error: 'Missing: medicationId, status, scheduledTime' });
      return;
    }
    const takenAt = status === 'taken' ? new Date().toISOString() : null;
    const { data, error } = await supabase
      .from('medication_logs')
      .insert({
        medication_id: medicationId,
        user_id: userId,
        status,
        scheduled_time: scheduledTime,
        taken_at: takenAt,
      })
      .select('*')
      .single();
    if (error) {
      const msg = String((error as any)?.message ?? '');
      if (msg.includes('schema cache') || msg.includes('does not exist')) {
        console.warn('[Medications] medication_logs table may not exist yet.');
        res.status(201).json({
          id: crypto.randomUUID(),
          medicationId,
          userId,
          status,
          scheduledTime,
          takenAt,
          createdAt: new Date().toISOString(),
        });
        return;
      }
      console.error(error);
      res.status(500).json({ error: 'Failed to log dose' });
      return;
    }
    res.status(201).json(toMedicationLog(data as MedicationLogRow));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to log dose' });
  }
}

export async function getMedicationLogs(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const date = req.query.date as string | undefined;
    let query = supabase
      .from('medication_logs')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_time', { ascending: true });

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query = query.gte('scheduled_time', start.toISOString()).lte('scheduled_time', end.toISOString());
    }

    const { data, error } = await query.limit(200);
    if (error) {
      res.json({ logs: [] });
      return;
    }
    res.json({ logs: (data || []).map(toMedicationLog) });
  } catch (e) {
    console.error(e);
    res.json({ logs: [] });
  }
}

export async function getDailySchedule(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const cols = await discoverMedColumns();
    const userCol = cols.includes('user_id') ? 'user_id' : 'patient_id';

    const { data: meds, error: medsErr } = await supabase
      .from('medications')
      .select('*')
      .eq(userCol, userId);

    if (medsErr) {
      console.error('[Medications] Schedule error:', medsErr);
      res.json({ schedule: [], date });
      return;
    }

    let logs: MedicationLogRow[] = [];
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const { data: logData } = await supabase
      .from('medication_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('scheduled_time', start.toISOString())
      .lte('scheduled_time', end.toISOString());

    if (logData) logs = logData as MedicationLogRow[];

    const schedule = (meds || []).flatMap((rawMed: Record<string, unknown>) => {
      const med = normalizeMedRow(rawMed);
      const timingArr = Array.isArray(med.timing) ? med.timing : ['08:00'];
      return timingArr.map((time: string) => {
        const scheduledTime = `${date}T${time}:00`;
        const log = logs.find(
          (l) =>
            l.medication_id === med.id &&
            new Date(l.scheduled_time).toISOString().includes(time)
        );
        return {
          medication: med,
          time,
          scheduledTime,
          log: log ? toMedicationLog(log) : null,
        };
      });
    }).sort((a: { time: string }, b: { time: string }) => a.time.localeCompare(b.time));

    res.json({ schedule, date });
  } catch (e) {
    console.error(e);
    res.json({ schedule: [], date: new Date().toISOString().split('T')[0] });
  }
}
