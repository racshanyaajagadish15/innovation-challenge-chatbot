/**
 * Database access using Supabase client.
 * Maps snake_case from DB to camelCase for the rest of the app.
 */
import { supabase } from '../utils/supabaseClient.js';

export interface UserRow {
  id: string;
  name: string;
  age: number;
  condition: string;
  email: string | null;
  created_at: string;
}

export interface HealthLogRow {
  id: string;
  user_id: string;
  medication_taken: boolean;
  steps: number;
  mood: number;
  notes: string | null;
  timestamp: string;
  source?: string;
  sleep_hours?: number | null;
  activity_minutes?: number | null;
}

export interface MedicationRow {
  id: string;
  user_id: string;
  name: string;
  dosage: string | null;
  instructions: string | null;
  created_at: string;
}

export interface MedicationReminderRow {
  id: string;
  medication_id: string;
  time_of_day: string; // "HH:MM" or "HH:MM:SS"
  enabled: boolean;
  created_at: string;
}

export interface MedicationIntakeRow {
  id: string;
  user_id: string;
  medication_id: string;
  taken: boolean;
  taken_at: string;
}

export interface ActivitySessionRow {
  id: string;
  user_id: string;
  type: string;
  start_time: string;
  end_time: string;
  distance_km: number | null;
  notes: string | null;
  created_at: string;
}

export interface EhrUploadRow {
  id: string;
  user_id: string;
  filename: string;
  extracted_text: string | null;
  summary: string | null;
  parsed: any;
  created_at: string;
}

export interface InterventionRow {
  id: string;
  user_id: string;
  agent_type: string;
  message: string;
  priority: string;
  read: boolean;
  created_at: string;
}

export async function getFirstUser() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data as UserRow | null, error: null };
}

export async function getUserById(id: string) {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error) return { data: null, error };
  return { data: data as UserRow, error: null };
}

/**
 * Ensure an authenticated user's profile row exists.
 * This is important because `health_logs.user_id` and `interventions.user_id` have FK constraints.
 *
 * We insert a minimal placeholder row (name/age/condition) only if the user row doesn't exist.
 * The user can later complete their real profile via `POST /api/user/profile`.
 */
export async function ensureUserRowExists(userId: string, email?: string | null) {
  const safeEmail = typeof email === 'string' ? email : null;
  const defaultName = safeEmail ? safeEmail.split('@')[0] || 'User' : 'User';

  // Only insert if missing, so we don't overwrite a user's real profile.
  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) return;

  // Important: don't include `email` in the placeholder insert.
  // Your Supabase project might not have `users.email` yet, and the FK work
  // (health_logs/interventions) should still succeed.
  const { error: insertError } = await supabase.from('users').insert({
    id: userId,
    name: defaultName,
    age: 1,
    condition: 'other',
  });
  if (insertError) throw insertError;
}

export async function getHealthLogsByUserId(userId: string, limit = 30) {
  const { data, error } = await supabase
    .from('health_logs')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);
  if (error) return { data: [], error };
  return { data: (data || []) as HealthLogRow[], error: null };
}

export async function createHealthLog(row: Omit<HealthLogRow, 'id'>) {
  const insertWithSource = {
    ...row,
    source: row.source ?? 'manual',
  };

  const { data, error } = await supabase
    .from('health_logs')
    .insert(insertWithSource)
    .select('*')
    .single();

  if (!error) {
    return { data: data as HealthLogRow, error: null };
  }

  const msg = String((error as any)?.message ?? error).toLowerCase();
  const isColumnError = msg.includes('health_logs') && msg.includes('column');

  if (isColumnError) {
    // Retry strategy for older DB schemas:
    // 1) Drop newer optional columns (sleep/activity).
    // 2) If still failing due to missing `source`, drop `source` too.
    const { sleep_hours: _sh, activity_minutes: _am, ...withoutSleepActivity } = insertWithSource as any;

    const { data: retry1, error: err1 } = await supabase
      .from('health_logs')
      .insert(withoutSleepActivity as any)
      .select('*')
      .single();

    if (!err1) return { data: retry1 as HealthLogRow, error: null };

    const msg1 = String((err1 as any)?.message ?? err1).toLowerCase();
    const missingSource =
      msg1.includes('health_logs') && msg1.includes('source') && msg1.includes('column');
    if (missingSource) {
      const { source: _s, ...withoutSource } = withoutSleepActivity as any;
      const { data: retry2, error: err2 } = await supabase
        .from('health_logs')
        .insert(withoutSource as any)
        .select('*')
        .single();
      if (!err2) return { data: retry2 as HealthLogRow, error: null };
      return { data: null, error: err2 };
    }

    return { data: null, error: err1 };
  }

  return { data: null, error };
}

export async function upsertUserProfile(
  userId: string,
  profile: { name: string; age: number; condition: string; email?: string | null }
) {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: userId,
        name: profile.name,
        age: profile.age,
        condition: profile.condition,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();
  if (error) return { data: null, error };
  return { data: data as UserRow, error: null };
}

export async function getInterventionsByUserId(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('interventions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { data: [], error };
  return { data: (data || []) as InterventionRow[], error: null };
}

export async function createIntervention(row: Omit<InterventionRow, 'id' | 'read' | 'created_at'>) {
  const { data, error } = await supabase
    .from('interventions')
    .insert({ ...row, read: false })
    .select('*')
    .single();
  if (error) return { data: null, error };
  return { data: data as InterventionRow, error: null };
}

/** Map DB row to app shape (camelCase) for API responses */
export function toUser(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    age: u.age,
    condition: u.condition,
    email: u.email ?? undefined,
    createdAt: u.created_at,
  };
}

export function toHealthLog(h: HealthLogRow) {
  return {
    id: h.id,
    userId: h.user_id,
    medicationTaken: h.medication_taken,
    steps: h.steps,
    mood: h.mood,
    notes: h.notes,
    timestamp: h.timestamp,
    source: (h.source as 'manual' | 'vision') || 'manual',
    sleepHours: h.sleep_hours ?? undefined,
    activityMinutes: h.activity_minutes ?? undefined,
  };
}

export async function getMedicationsByUserId(userId: string) {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return { data: [], error };
  return { data: (data || []) as MedicationRow[], error: null };
}

export async function getMedicationByIdAndUser(id: string, userId: string) {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data as MedicationRow | null, error: null };
}

export async function createMedication(row: Omit<MedicationRow, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('medications')
    .insert(row)
    .select('*')
    .single();
  if (error) return { data: null, error };
  return { data: data as MedicationRow, error: null };
}

export async function updateMedication(id: string, userId: string, updates: Partial<Pick<MedicationRow, 'name' | 'dosage' | 'instructions'>>) {
  const { data, error } = await supabase
    .from('medications')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) return { data: null, error };
  return { data: data as MedicationRow, error: null };
}

export async function deleteMedication(id: string, userId: string) {
  const { error } = await supabase.from('medications').delete().eq('id', id).eq('user_id', userId);
  return { error };
}

export async function getRemindersByMedicationId(medicationId: string) {
  const { data, error } = await supabase
    .from('medication_reminders')
    .select('*')
    .eq('medication_id', medicationId)
    .order('time_of_day', { ascending: true });
  if (error) return { data: [], error };
  return { data: (data || []) as MedicationReminderRow[], error: null };
}

export async function getRemindersByUserId(userId: string) {
  const { data: meds } = await getMedicationsByUserId(userId);
  const out: (MedicationReminderRow & { medication_name: string })[] = [];
  for (const m of meds) {
    const { data: rems } = await getRemindersByMedicationId(m.id);
    for (const r of rems) {
      out.push({ ...r, medication_name: m.name });
    }
  }
  return out.sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));
}

export async function createMedicationReminder(row: Omit<MedicationReminderRow, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('medication_reminders')
    .insert(row)
    .select('*')
    .single();
  if (error) return { data: null, error };
  return { data: data as MedicationReminderRow, error: null };
}

export async function updateMedicationReminder(
  id: string,
  medicationId: string,
  updates: Partial<Pick<MedicationReminderRow, 'time_of_day' | 'enabled'>>
) {
  const { data, error } = await supabase
    .from('medication_reminders')
    .update(updates)
    .eq('id', id)
    .eq('medication_id', medicationId)
    .select('*')
    .single();
  if (error) return { data: null, error };
  return { data: data as MedicationReminderRow, error: null };
}

export async function deleteMedicationReminder(id: string, medicationId: string) {
  const { error } = await supabase.from('medication_reminders').delete().eq('id', id).eq('medication_id', medicationId);
  return { error };
}

export async function createMedicationIntakes(rows: Array<Omit<MedicationIntakeRow, 'id'>>) {
  const { data, error } = await supabase.from('medication_intakes').insert(rows).select('*');
  if (error) return { data: null, error };
  return { data: (data || []) as MedicationIntakeRow[], error: null };
}

export async function getMedicationIntakesForDay(userId: string, dayIso: string) {
  // dayIso: YYYY-MM-DD in user's local assumption; stored as timestamps in UTC.
  const start = new Date(`${dayIso}T00:00:00.000Z`).toISOString();
  const end = new Date(`${dayIso}T23:59:59.999Z`).toISOString();
  const { data, error } = await supabase
    .from('medication_intakes')
    .select('*')
    .eq('user_id', userId)
    .gte('taken_at', start)
    .lte('taken_at', end);
  if (error) return { data: [], error };
  return { data: (data || []) as MedicationIntakeRow[], error: null };
}

export async function createActivitySession(row: Omit<ActivitySessionRow, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('activity_sessions').insert(row).select('*').single();
  if (error) return { data: null, error };
  return { data: data as ActivitySessionRow, error: null };
}

export async function getActivitySessionsByUserId(userId: string, limit = 30) {
  const { data, error } = await supabase
    .from('activity_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false })
    .limit(limit);
  if (error) return { data: [], error };
  return { data: (data || []) as ActivitySessionRow[], error: null };
}

export async function createEhrUpload(row: Omit<EhrUploadRow, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('ehr_uploads').insert(row).select('*').single();
  if (error) return { data: null, error };
  return { data: data as EhrUploadRow, error: null };
}

export async function getLatestEhrUpload(userId: string) {
  const { data, error } = await supabase
    .from('ehr_uploads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data as EhrUploadRow | null, error: null };
}

export async function getEhrUploadsByUserId(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('ehr_uploads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { data: [], error };
  return { data: (data || []) as EhrUploadRow[], error: null };
}

export function toIntervention(i: InterventionRow) {
  return {
    id: i.id,
    userId: i.user_id,
    agentType: i.agent_type,
    message: i.message,
    priority: i.priority,
    read: i.read,
    createdAt: i.created_at,
  };
}
