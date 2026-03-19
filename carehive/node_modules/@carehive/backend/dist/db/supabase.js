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
    // Backward compatibility: older DBs might not have `health_logs.source` yet.
    const msg = String(error?.message ?? error);
    const missingSource = msg.toLowerCase().includes("health_logs") &&
        msg.toLowerCase().includes('source') &&
        msg.toLowerCase().includes('column');
    if (missingSource) {
        // Remove `source` from the insert payload entirely.
        const { source: _omitSource, ...rowWithoutSource } = row;
        const { data: retryData, error: retryError } = await supabase
            .from('health_logs')
            .insert(rowWithoutSource)
            .select('*')
            .single();
        if (retryError)
            return { data: null, error: retryError };
        return { data: retryData, error: null };
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
    };
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
