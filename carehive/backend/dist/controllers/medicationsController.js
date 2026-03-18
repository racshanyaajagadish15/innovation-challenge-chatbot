import { getMedicationsByUserId, getMedicationByIdAndUser, createMedication, updateMedication, deleteMedication, getRemindersByMedicationId, getRemindersByUserId, createMedicationReminder, updateMedicationReminder, deleteMedicationReminder, } from '../db/supabase.js';
function normalizeTimeOfDay(input) {
    const s = String(input || '').trim();
    if (!s)
        return null;
    // 24h: HH:MM or HH:MM:SS
    const m24 = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
    if (m24) {
        const hh = parseInt(m24[1], 10);
        const mm = parseInt(m24[2], 10);
        const ss = m24[3] ? parseInt(m24[3], 10) : 0;
        if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 && ss >= 0 && ss <= 59) {
            return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
        }
    }
    // 12h: 9am, 9:30 PM
    const cleaned = s.replace(/\./g, '').replace(/\s+/g, ' ').trim();
    const m12 = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i.exec(cleaned);
    if (m12) {
        let hh = parseInt(m12[1], 10);
        const mm = parseInt(m12[2] ?? '0', 10);
        const ap = m12[3].toLowerCase();
        if (hh < 1 || hh > 12 || mm < 0 || mm > 59)
            return null;
        if (ap === 'pm' && hh !== 12)
            hh += 12;
        if (ap === 'am' && hh === 12)
            hh = 0;
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
    }
    return null;
}
export async function listMedications(req, res) {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const { data, error } = await getMedicationsByUserId(userId);
        if (error) {
            res.status(500).json({ error: 'Failed to fetch medications' });
            return;
        }
        const withReminders = await Promise.all((data || []).map(async (m) => {
            const { data: reminders } = await getRemindersByMedicationId(m.id);
            return {
                id: m.id,
                name: m.name,
                dosage: m.dosage,
                instructions: m.instructions,
                createdAt: m.created_at,
                reminders: (reminders || []).map((r) => ({
                    id: r.id,
                    timeOfDay: r.time_of_day,
                    enabled: r.enabled,
                })),
            };
        }));
        res.json(withReminders);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch medications' });
    }
}
export async function addMedication(req, res) {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { name, dosage, instructions } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'name is required' });
        return;
    }
    try {
        const { data, error } = await createMedication({
            user_id: userId,
            name: name.trim(),
            dosage: dosage != null ? String(dosage).trim() || null : null,
            instructions: instructions != null ? String(instructions).trim() || null : null,
        });
        if (error) {
            res.status(500).json({ error: 'Failed to create medication' });
            return;
        }
        res.status(201).json({
            id: data.id,
            name: data.name,
            dosage: data.dosage ?? undefined,
            instructions: data.instructions ?? undefined,
            createdAt: data.created_at,
            reminders: [],
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create medication' });
    }
}
export async function patchMedication(req, res) {
    const userId = req.userId;
    const id = req.params.id;
    if (!userId || !id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { name, dosage, instructions } = req.body;
    const updates = {};
    if (name !== undefined)
        updates.name = String(name).trim();
    if (dosage !== undefined)
        updates.dosage = String(dosage).trim() || null;
    if (instructions !== undefined)
        updates.instructions = String(instructions).trim() || null;
    if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No updates provided' });
        return;
    }
    try {
        const { data, error } = await updateMedication(id, userId, updates);
        if (error) {
            res.status(500).json({ error: 'Failed to update medication' });
            return;
        }
        if (!data) {
            res.status(404).json({ error: 'Medication not found' });
            return;
        }
        const { data: reminders } = await getRemindersByMedicationId(data.id);
        res.json({
            id: data.id,
            name: data.name,
            dosage: data.dosage ?? undefined,
            instructions: data.instructions ?? undefined,
            createdAt: data.created_at,
            reminders: (reminders || []).map((r) => ({ id: r.id, timeOfDay: r.time_of_day, enabled: r.enabled })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update medication' });
    }
}
export async function removeMedication(req, res) {
    const userId = req.userId;
    const id = req.params.id;
    if (!userId || !id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const { error } = await deleteMedication(id, userId);
        if (error) {
            res.status(500).json({ error: 'Failed to delete medication' });
            return;
        }
        res.status(204).send();
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to delete medication' });
    }
}
export async function listReminders(req, res) {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const reminders = await getRemindersByUserId(userId);
        res.json(reminders.map((r) => ({
            id: r.id,
            medicationId: r.medication_id,
            medicationName: r.medication_name,
            timeOfDay: r.time_of_day,
            enabled: r.enabled,
        })));
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch reminders' });
    }
}
export async function addReminder(req, res) {
    const userId = req.userId;
    const medicationId = req.params.medicationId;
    if (!userId || !medicationId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { data: med } = await getMedicationByIdAndUser(medicationId, userId);
    if (!med) {
        res.status(404).json({ error: 'Medication not found' });
        return;
    }
    const { timeOfDay, enabled } = req.body;
    if (!timeOfDay || typeof timeOfDay !== 'string') {
        res.status(400).json({ error: 'timeOfDay is required (e.g. "09:00" or "09:30")' });
        return;
    }
    const timeNormalized = normalizeTimeOfDay(timeOfDay);
    if (!timeNormalized) {
        res.status(400).json({ error: 'timeOfDay must be HH:MM, HH:MM:SS, or a 12-hour time like 9:00 AM' });
        return;
    }
    try {
        const { data, error } = await createMedicationReminder({
            medication_id: medicationId,
            time_of_day: timeNormalized,
            enabled: enabled !== false,
        });
        if (error) {
            res.status(500).json({ error: 'Failed to create reminder' });
            return;
        }
        res.status(201).json({
            id: data.id,
            medicationId: data.medication_id,
            timeOfDay: data.time_of_day,
            enabled: data.enabled,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create reminder' });
    }
}
export async function patchReminder(req, res) {
    const userId = req.userId;
    const medicationId = req.params.medicationId;
    const reminderId = req.params.reminderId;
    if (!userId || !medicationId || !reminderId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { timeOfDay, enabled } = req.body;
    const updates = {};
    if (timeOfDay !== undefined) {
        const timeNormalized = normalizeTimeOfDay(String(timeOfDay));
        if (!timeNormalized) {
            res.status(400).json({ error: 'timeOfDay must be HH:MM, HH:MM:SS, or a 12-hour time like 9:00 AM' });
            return;
        }
        updates.time_of_day = timeNormalized;
    }
    if (enabled !== undefined)
        updates.enabled = Boolean(enabled);
    if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No updates provided' });
        return;
    }
    try {
        const { data, error } = await updateMedicationReminder(reminderId, medicationId, updates);
        if (error) {
            res.status(500).json({ error: 'Failed to update reminder' });
            return;
        }
        if (!data) {
            res.status(404).json({ error: 'Reminder not found' });
            return;
        }
        res.json({ id: data.id, medicationId: data.medication_id, timeOfDay: data.time_of_day, enabled: data.enabled });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update reminder' });
    }
}
export async function removeReminder(req, res) {
    const medicationId = req.params.medicationId;
    const reminderId = req.params.reminderId;
    if (!req.userId || !medicationId || !reminderId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const { error } = await deleteMedicationReminder(reminderId, medicationId);
        if (error) {
            res.status(500).json({ error: 'Failed to delete reminder' });
            return;
        }
        res.status(204).send();
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to delete reminder' });
    }
}
