/**
 * ClinicianAgent - Weekly patient summary, structured report
 */
import type { AgentType } from '@carehive/shared';
import type { AgentContext, AgentOutput } from './types.js';
import { summariseForClinician } from '../services/llmService.js';

const AGENT_TYPE: AgentType = 'clinician';

export const ClinicianAgent = {
  type: AGENT_TYPE,

  async analyze(context: AgentContext): Promise<Record<string, unknown>> {
    const logs = context.healthLogs;
    const recent = logs.slice(-7);
    const missed = recent.filter((l) => !l.medicationTaken).length;
    const adherenceRate = recent.length ? ((recent.length - missed) / recent.length) * 100 : 100;
    const avgSteps = recent.length
      ? recent.reduce((s, l) => s + l.steps, 0) / recent.length
      : 0;
    const moods = recent.map((l) => l.mood).filter((m) => m > 0);
    const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;
    const moodTrend =
      recent.length >= 2 && (recent[recent.length - 1]?.mood ?? 0) < (recent[recent.length - 2]?.mood ?? 0)
        ? 'declining'
        : 'stable';
    return {
      adherenceRate: Math.round(adherenceRate * 10) / 10,
      missedDays: missed,
      avgSteps: Math.round(avgSteps),
      avgMood: Math.round(avgMood * 10) / 10,
      moodTrend,
      stepsTrend: avgSteps < 5000 ? 'low' : 'adequate',
      riskFlags: [
        ...(missed >= 2 ? ['Medication adherence at risk'] : []),
        ...(moodTrend === 'declining' ? ['Mood trend declining'] : []),
        ...(avgSteps < 3000 ? ['Low physical activity'] : []),
      ],
    };
  },

  async decide(
    _context: AgentContext,
    analysis: Record<string, unknown>
  ): Promise<string> {
    const flags = (analysis.riskFlags as string[]) ?? [];
    return flags.length > 0 ? 'generate_summary' : 'generate_summary';
  },

  async act(
    context: AgentContext,
    analysis: Record<string, unknown>,
    _decision: string
  ): Promise<AgentOutput> {
    const summary = await summariseForClinician({
      adherenceRate: (analysis.adherenceRate as number) ?? 0,
      missedDays: (analysis.missedDays as number) ?? 0,
      moodTrend: (analysis.moodTrend as string) ?? 'stable',
      stepsTrend: (analysis.stepsTrend as string) ?? 'stable',
    });
    const message = summary;
    return {
      agentType: AGENT_TYPE,
      analysis,
      decision: 'generate_summary',
      actions: [{ type: 'store_summary', payload: { userId: context.userId, summary } }],
      message,
    };
  },
};
