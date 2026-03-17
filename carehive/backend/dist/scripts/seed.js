/**
 * CAREHIVE seed – demo user + 7 days of logs (missed meds, mood drop) + sample interventions
 * Uses Supabase client. Run: npm run db:seed
 */
import 'dotenv/config';
import { supabase } from '../utils/supabaseClient.js';
async function main() {
    const { data: existing } = await supabase.from('users').select('id').limit(1).single();
    if (existing) {
        console.log('User already exists, skipping seed. Delete rows in Supabase to re-seed.');
        return;
    }
    const { data: user, error: userError } = await supabase
        .from('users')
        .insert({ name: 'Alex Tan', age: 58, condition: 'diabetes' })
        .select('id')
        .single();
    if (userError || !user) {
        console.error('Failed to create user:', userError);
        process.exit(1);
    }
    const userId = user.id;
    const now = new Date();
    const logs = [
        { medication_taken: true, steps: 7200, mood: 7, dayOffset: -6 },
        { medication_taken: false, steps: 4500, mood: 6, dayOffset: -5 },
        { medication_taken: true, steps: 8100, mood: 7, dayOffset: -4 },
        { medication_taken: false, steps: 3200, mood: 5, dayOffset: -3 },
        { medication_taken: true, steps: 2800, mood: 3, dayOffset: -2 },
        { medication_taken: true, steps: 1500, mood: 4, dayOffset: -1 },
        { medication_taken: true, steps: 0, mood: 5, dayOffset: 0 },
    ];
    for (const log of logs) {
        const d = new Date(now);
        d.setDate(d.getDate() + log.dayOffset);
        d.setHours(12, 0, 0, 0);
        await supabase.from('health_logs').insert({
            user_id: userId,
            medication_taken: log.medication_taken,
            steps: log.steps,
            mood: log.mood,
            timestamp: d.toISOString(),
            source: 'manual',
        });
    }
    const interventions = [
        { agent_type: 'care', message: 'You missed your morning medication yesterday. Consider setting a daily alarm.', priority: 'high' },
        { agent_type: 'lifestyle', message: 'Your steps have been lower this week. A short 10-min walk after meals can help with blood sugar.', priority: 'medium' },
        { agent_type: 'emotional', message: "We noticed your mood has been lower. Remember small wins count—taking your meds today is a win!", priority: 'medium' },
    ];
    for (const int of interventions) {
        await supabase.from('interventions').insert({
            user_id: userId,
            agent_type: int.agent_type,
            message: int.message,
            priority: int.priority,
        });
    }
    console.log('Seed complete:', { userId, name: 'Alex Tan', logs: logs.length });
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
