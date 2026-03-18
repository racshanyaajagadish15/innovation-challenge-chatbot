/**
 * Database access using Supabase client.
 * Maps snake_case from DB to camelCase for the rest of the app.
 */
import { supabase } from '../utils/supabaseClient.js';
export async function getFirstUser() {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
    if (error)
        return { data: null, error };
    return { data: data, error: null };
}
export async function getUserById(id) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error)
        return { data: null, error };
    return { data: data, error: null };
}
/**
 * Ensure an authenticated user's profile row exists.
 * This is important because `health_logs.user_id` and `interventions.user_id` have FK constraints.
 *
 * We insert a minimal placeholder row (name/age/condition) only if the user row doesn't exist.
 * The user can later complete their real profile via `POST /api/user/profile`.
 */
export async function ensureUserRowExists(userId, email) {
    const safeEmail = typeof email === 'string' ? email : null;
    const defaultName = safeEmail ? safeEmail.split('@')[0] || 'User' : 'User';
    // Only insert if missing, so we don't overwrite a user's real profile.
    const { data: existing, error: existingError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
    if (existingError)
        throw existingError;
    if (existing)
        return;
    // Important: don't include `email` in the placeholder insert.
    // Your Supabase project might not have `users.email` yet, and the FK work
    // (health_logs/interventions) should still succeed.
    const { error: insertError } = await supabase.from('users').insert({
        id: userId,
        name: defaultName,
        age: 1,
        condition: 'other',
    });
    if (insertError)
        throw insertError;
}
export async function getHealthLogsByUserId(userId, limit = 30) {
    const { data, error } = await supabase
        .from('health_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);
    if (error)
        return { data: [], error };
    return { data: (data || []), error: null };
}
export async function createHealthLog(row) {
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
        return { data: data, error: null };
    }
    const msg = String(error?.message ?? error).toLowerCase();
    const isColumnError = msg.includes('health_logs') && msg.includes('column');
    if (isColumnError) {
        // Retry strategy for older DB schemas:
        // 1) Drop newer optional columns (sleep/activity).
        // 2) If still failing due to missing `source`, drop `source` too.
        const { sleep_hours: _sh, activity_minutes: _am, ...withoutSleepActivity } = insertWithSource;
        const { data: retry1, error: err1 } = await supabase
            .from('health_logs')
            .insert(withoutSleepActivity)
            .select('*')
            .single();
        if (!err1)
            return { data: retry1, error: null };
        const msg1 = String(err1?.message ?? err1).toLowerCase();
        const missingSource = msg1.includes('health_logs') && msg1.includes('source') && msg1.includes('column');
        if (missingSource) {
            const { source: _s, ...withoutSource } = withoutSleepActivity;
            const { data: retry2, error: err2 } = await supabase
                .from('health_logs')
                .insert(withoutSource)
                .select('*')
                .single();
            if (!err2)
                return { data: retry2, error: null };
            return { data: null, error: err2 };
        }
        return { data: null, error: err1 };
    }
    return { data: null, error };
}
export async function upsertUserProfile(userId, profile) {
    const { data, error } = await supabase
        .from('users')
        .upsert({
        id: userId,
        name: profile.name,
        age: profile.age,
        condition: profile.condition,
    }, { onConflict: 'id' })
        .select('*')
        .single();
    if (error)
        return { data: null, error };
    return { data: data, error: null };
}
export async function getInterventionsByUserId(userId, limit = 50) {
    const { data, error } = await supabase
        .from('interventions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error)
        return { data: [], error };
    return { data: (data || []), error: null };
}
export async function createIntervention(row) {
    const { data, error } = await supabase
        .from('interventions')
        .insert({ ...row, read: false })
        .select('*')
        .single();
    if (error)
        return { data: null, error };
    return { data: data, error: null };
}
/** Map DB row to app shape (camelCase) for API responses */
export function toUser(u) {
    return {
        id: u.id,
        name: u.name,
        age: u.age,
        condition: u.condition,
        email: u.email ?? undefined,
        createdAt: u.created_at,
    };
}
export function toHealthLog(h) {
    return {
        id: h.id,
        userId: h.user_id,
        medicationTaken: h.medication_taken,
        steps: h.steps,
        mood: h.mood,
        notes: h.notes,
        timestamp: h.timestamp,
        source: h.source || 'manual',
        sleepHours: h.sleep_hours ?? undefined,
        activityMinutes: h.activity_minutes ?? undefined,
    };
}
export async function getMedicationsByUserId(userId) {
    const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error)
        return { data: [], error };
    return { data: (data || []), error: null };
}
export async function getMedicationByIdAndUser(id, userId) {
    const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
    if (error)
        return { data: null, error };
    return { data: data, error: null };
}
export async function createMedication(row) {
    const { data, error } = await supabase
        .from('medications')
        .insert(row)
        .select('*')
        .single();
    if (error)
        return { data: null, error };
    return { data: data, error: null };
}
export async function updateMedication(id, userId, updates) {
    const { data, error } = await supabase
        .from('medications')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();
    if (error)
        return { data: null, error };
    return { data: data, error: null };
}
export async function deleteMedication(id, userId) {
    const { error } = await supabase.from('medications').delete().eq('id', id).eq('user_id', userId);
    return { error };
}
export async function getRemindersByMedicationId(medicationId) {
    const { data, error } = await supabase
        .from('medication_reminders')
        .select('*')
        .eq('medication_id', medicationId)
        .order('time_of_day', { ascending: true });
    if (error)
        return { data: [], error };
    return { data: (data || []), error: null };
}
export async function getRemindersByUserId(userId) {
    const { data: meds } = await getMedicationsByUserId(userId);
    const out = [];
    for (const m of meds) {
        const { data: rems } = await getRemindersByMedicationId(m.id);
        for (const r of rems) {
            out.push({ ...r, medication_name: m.name });
        }
    }
    return out.sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));
}
export async function createMedicationReminder(row) {
    const { data, error } = await supabase
        .from('medication_reminders')
        .insert(row)
        .select('*')
        .single();
    if (error)
        return { data: null, error };
    return { data: data, error: null };
}
export async function updateMedicationReminder(id, medicationId, updates) {
    const { data, error } = await supabase
        .from('medication_reminders')
        .update(updates)
        .eq('id', id)
        .eq('medication_id', medicationId)
        .select('*')
        .single();
    if (error)
        return { data: null, error };
    return { data: data, error: null };
}
export async function deleteMedicationReminder(id, medicationId) {
    const { error } = await supabase.from('medication_reminders').delete().eq('id', id).eq('medication_id', medicationId);
    return { error };
}
export async function createMedicationIntakes(rows) {
    const { data, error } = await supabase.from('medication_intakes').insert(rows).select('*');
    if (error)
        return { data: null, error };
    return { data: (data || []), error: null };
}
export async function getMedicationIntakesForDay(userId, dayIso) {
    // dayIso: YYYY-MM-DD in user's local assumption; stored as timestamps in UTC.
    const start = new Date(`${dayIso}T00:00:00.000Z`).toISOString();
    const end = new Date(`${dayIso}T23:59:59.999Z`).toISOString();
    const { data, error } = await supabase
        .from('medication_intakes')
        .select('*')
        .eq('user_id', userId)
        .gte('taken_at', start)
        .lte('taken_at', end);
    if (error)
        return { data: [], error };
    return { data: (data || []), error: null };
}
export async function createActivitySession(row) {
    const { data, error } = await supabase.from('activity_sessions').insert(row).select('*').single();
    if (error)
        return { data: null, error };
    return { data: data, error: null };
}
export async function getActivitySessionsByUserId(userId, limit = 30) {
    const { data, error } = await supabase
        .from('activity_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .limit(limit);
    if (error)
        return { data: [], error };
    return { data: (data || []), error: null };
}
export async function createEhrUpload(row) {
    const { data, error } = await supabase.from('ehr_uploads').insert(row).select('*').single();
    if (error)
        return { data: null, error };
    return { data: data, error: null };
}
export async function getLatestEhrUpload(userId) {
    const { data, error } = await supabase
        .from('ehr_uploads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error)
        return { data: null, error };
    return { data: data, error: null };
}
export async function getEhrUploadsByUserId(userId, limit = 20) {
    const { data, error } = await supabase
        .from('ehr_uploads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error)
        return { data: [], error };
    return { data: (data || []), error: null };
}
export function toIntervention(i) {
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
