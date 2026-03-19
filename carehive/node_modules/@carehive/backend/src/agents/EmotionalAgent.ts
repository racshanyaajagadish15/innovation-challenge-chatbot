/**
 * EmotionalAgent - Mood analysis (mock from text/logs), stress/burnout patterns
 */
import type { AgentType } from '@carehive/shared';
import type { AgentContext, AgentOutput } from './types.js';

const AGENT_TYPE: AgentType = 'emotional';

export const EmotionalAgent = {
  type: AGENT_TYPE,

  async analyze(context: AgentContext): Promise<Record<string, unknown>> {
    const logs = context.healthLogs;
    const recent = logs.slice(-7);
    const moods = recent.map((l) => l.mood).filter((m) => m > 0);
    const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 5;
    const latestMood = recent[recent.length - 1]?.mood ?? 5;
    const declining = recent.length >= 2 && (latestMood < (recent[recent.length - 2]?.mood ?? 5));
    const lowMoodDays = recent.filter((l) => l.mood <= 4).length;
    return {
      avgMood: Math.round(avgMood * 10) / 10,
      latestMood,
      trend: declining ? 'declining' : 'stable',
      lowMoodDays,
      stressRisk: lowMoodDays >= 2 || (declining && latestMood <= 4),
    };
  },

  async decide(
    _context: AgentContext,
    analysis: Record<string, unknown>
  ): Promise<string> {
    const stressRisk = analysis.stressRisk as boolean;
    const lowMoodDays = (analysis.lowMoodDays as number) ?? 0;
    if (stressRisk && lowMoodDays >= 2) return 'support_message';
    if (analysis.trend === 'declining') return 'gentle_checkin';
    return 'no_action';
  },

  async act(
    _context: AgentContext,
    analysis: Record<string, unknown>,
    decision: string
  ): Promise<AgentOutput> {
    let message: string | undefined;
    const actions: Array<{ type: string; payload: unknown }> = [];

    if (decision === 'support_message') {
      message =
        "We've noticed your mood has been lower lately. Remember, small wins count—taking your meds and a short walk are wins. If you'd like to talk, consider reaching out to someone you trust or a helpline.";
      actions.push({ type: 'create_intervention', payload: { priority: 'high', message } });
    } else if (decision === 'gentle_checkin') {
      message =
        'How are you feeling today? Sometimes a brief check-in helps. You’re doing your best.';
      actions.push({ type: 'create_intervention', payload: { priority: 'medium', message } });
    }

    return {
      agentType: AGENT_TYPE,
      analysis,
      decision,
      actions,
      message,
    };
  },
};
