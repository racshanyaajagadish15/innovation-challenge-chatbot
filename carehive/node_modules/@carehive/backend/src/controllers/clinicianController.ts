/**
 * Clinician summary endpoint
 */
import { Request, Response } from 'express';
import { getUserById, getHealthLogsByUserId, getInterventionsByUserId } from '../db/supabase.js';
import { ClinicianAgent } from '../agents/ClinicianAgent.js';
import type { AgentContext } from '../agents/types.js';

export async function getClinicianSummary(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: 'userId required' });
      return;
    }
    const [userRes, logsRes, interventionsRes] = await Promise.all([
      getUserById(userId),
      getHealthLogsByUserId(userId, 14),
      getInterventionsByUserId(userId, 10),
    ]);
    const user = userRes.data;
    const logs = logsRes.data;
    const interventions = interventionsRes.data;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const context: AgentContext = {
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
    const analysis = await ClinicianAgent.analyze(context);
    const decision = await ClinicianAgent.decide(context, analysis);
    const output = await ClinicianAgent.act(context, analysis, decision);

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 7);

    res.json({
      userId,
      userName: user.name,
      condition: user.condition,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      adherenceRate: analysis.adherenceRate,
      riskFlags: analysis.riskFlags ?? [],
      trends: [
        analysis.moodTrend && `Mood: ${analysis.moodTrend}`,
        analysis.stepsTrend && `Activity: ${analysis.stepsTrend}`,
      ].filter(Boolean),
      agentHighlights: output.message ? [output.message] : [],
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to generate clinician summary' });
  }
}
