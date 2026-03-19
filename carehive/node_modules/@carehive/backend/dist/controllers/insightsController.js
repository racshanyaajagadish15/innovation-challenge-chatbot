import { getHealthLogsByUserId, getInterventionsByUserId } from '../db/supabase.js';
import { runOrchestrator } from '../agents/AgentOrchestrator.js';
import { buildInsights } from '../services/insightsService.js';
import { createIntervention } from '../services/interventionService.js';
import { getIO } from '../socket.js';
export async function getInsights(req, res) {
    try {
        const userId = req.query.userId;
        if (!userId) {
            res.status(400).json({ error: 'userId required' });
            return;
        }
        const [logsRes, interventionsRes] = await Promise.all([
            getHealthLogsByUserId(userId, 30),
            getInterventionsByUserId(userId, 20),
        ]);
        const logs = logsRes.data;
        const interventions = interventionsRes.data;
        const context = {
            userId,
            healthLogs: logs.map((l) => ({
                medicationTaken: l.medication_taken,
                steps: l.steps,
                mood: l.mood,
                timestamp: new Date(l.timestamp),
                notes: l.notes,
            })),
            recentInterventions: interventions.map((i) => ({ agentType: i.agent_type, message: i.message })),
        };
        const insights = buildInsights(userId, logs, ['care', 'lifestyle', 'emotional']);
        res.json({ insights });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch insights' });
    }
}
/**
 * Run orchestrator for user and persist new interventions
 */
export async function runOrchestratorForUser(req, res) {
    try {
        const userId = req.query.userId || req.body?.userId;
        if (!userId) {
            res.status(400).json({ error: 'userId required' });
            return;
        }
        const [logsRes, interventionsRes] = await Promise.all([
            getHealthLogsByUserId(userId, 30),
            getInterventionsByUserId(userId, 20),
        ]);
        const logs = logsRes.data;
        const interventions = interventionsRes.data;
        const context = {
            userId,
            healthLogs: logs.map((l) => ({
                medicationTaken: l.medication_taken,
                steps: l.steps,
                mood: l.mood,
                timestamp: new Date(l.timestamp),
                notes: l.notes,
            })),
            recentInterventions: interventions.map((i) => ({ agentType: i.agent_type, message: i.message })),
        };
        const result = await runOrchestrator(context);
        const created = [];
        for (const int of result.interventions) {
            const saved = await createIntervention(int.userId, int.agentType, int.message, int.priority);
            if (saved)
                created.push({ ...saved, createdAt: saved.createdAt });
        }
        const io = getIO();
        for (const int of created) {
            io.to(`user:${userId}`).emit('intervention', int);
        }
        res.json({
            summary: result.summary,
            agentOutputs: result.agentOutputs,
            interventionsCreated: result.interventions.length,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Orchestrator failed' });
    }
}
