import { getHealthLogsByUserId, createHealthLog, ensureUserRowExists, toHealthLog, createMedicationIntakes, createActivitySession, getActivitySessionsByUserId, } from '../db/supabase.js';
export async function logHealth(req, res) {
    try {
        const userId = req.userId ?? req.body.userId;
        const isAuthed = Boolean(req.userId);
        const { medicationTaken, steps, mood, notes, sleepHours, activityMinutes } = req.body;
        if (!userId || typeof medicationTaken !== 'boolean' || typeof steps !== 'number' || typeof mood !== 'number') {
            res.status(400).json({ error: 'Missing or invalid: userId (or be logged in), medicationTaken, steps, mood' });
            return;
        }
        if (isAuthed) {
            await ensureUserRowExists(userId, req.authUser?.email ?? null);
        }
        const sleep = sleepHours != null ? Math.max(0, Math.min(24, Number(sleepHours))) : null;
        const activity = activityMinutes != null ? Math.max(0, Math.round(Number(activityMinutes))) : null;
        const { data, error } = await createHealthLog({
            user_id: userId,
            medication_taken: medicationTaken,
            steps: Math.max(0, Math.round(steps)),
            mood: Math.min(10, Math.max(1, Math.round(mood))),
            notes: notes ?? null,
            timestamp: new Date().toISOString(),
            source: 'manual',
            sleep_hours: sleep,
            activity_minutes: activity,
        });
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create health log' });
            return;
        }
        res.status(201).json(data ? toHealthLog(data) : {});
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create health log' });
    }
}
export async function getHistory(req, res) {
    try {
        const userId = req.userId ?? req.query.userId;
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
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
}
/**
 * Create per-medication intake events (checkbox completion).
 * Body: { intakes: Array<{ medicationId: string; taken?: boolean; takenAt?: string }> }
 */
export async function logMedicationIntakes(req, res) {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { intakes } = req.body;
        if (!Array.isArray(intakes) || intakes.length === 0) {
            res.status(400).json({ error: 'intakes[] required' });
            return;
        }
        await ensureUserRowExists(userId, req.authUser?.email ?? null);
        const rows = intakes
            .filter((i) => typeof i.medicationId === 'string' && i.medicationId)
            .map((i) => ({
            user_id: userId,
            medication_id: String(i.medicationId),
            taken: i.taken !== false,
            taken_at: i.takenAt ? new Date(i.takenAt).toISOString() : new Date().toISOString(),
        }));
        if (rows.length === 0) {
            res.status(400).json({ error: 'No valid medicationId values' });
            return;
        }
        const { data, error } = await createMedicationIntakes(rows);
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create intakes' });
            return;
        }
        res.status(201).json({ created: data?.length ?? 0 });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create intakes' });
    }
}
/**
 * Log an activity session (walking with start/end and distance).
 * Body: { type?: string; startTime: string; endTime: string; distanceKm?: number; notes?: string }
 */
export async function logActivitySession(req, res) {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { type, startTime, endTime, distanceKm, notes } = req.body;
        if (!startTime || !endTime) {
            res.status(400).json({ error: 'startTime and endTime required' });
            return;
        }
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
            res.status(400).json({ error: 'Invalid start/end time' });
            return;
        }
        await ensureUserRowExists(userId, req.authUser?.email ?? null);
        const dist = distanceKm != null ? Math.max(0, Number(distanceKm)) : null;
        const { data, error } = await createActivitySession({
            user_id: userId,
            type: (type && String(type).trim()) || 'walk',
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            distance_km: dist,
            notes: notes != null ? String(notes).trim() || null : null,
        });
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create activity session' });
            return;
        }
        res.status(201).json({
            id: data.id,
            type: data.type,
            startTime: data.start_time,
            endTime: data.end_time,
            distanceKm: data.distance_km ?? undefined,
            notes: data.notes ?? undefined,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create activity session' });
    }
}
export async function getActivityHistory(req, res) {
    try {
        const userId = req.userId ?? req.query.userId;
        if (!userId) {
            res.status(400).json({ error: 'userId required (query or be logged in)' });
            return;
        }
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 30));
        const { data, error } = await getActivitySessionsByUserId(userId, limit);
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch activity history' });
            return;
        }
        res.json(data.map((s) => ({
            id: s.id,
            type: s.type,
            startTime: s.start_time,
            endTime: s.end_time,
            distanceKm: s.distance_km ?? undefined,
            notes: s.notes ?? undefined,
        })));
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch activity history' });
    }
}
