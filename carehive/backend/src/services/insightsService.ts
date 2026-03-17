/**
 * Health insights from agent outputs and logs
 */
import type { HealthInsight } from '@carehive/shared';
import { computeAdherence, type LogEntry } from './adherenceService.js';

export function buildInsights(
  userId: string,
  logs: LogEntry[],
  _agentTypes: string[]
): HealthInsight[] {
  const insights: HealthInsight[] = [];
  const adherence = computeAdherence(logs);
  const recent = logs.slice(-7);
  const now = new Date().toISOString();

  if (adherence.predictedFailure) {
    insights.push({
      type: 'adherence',
      title: 'Adherence at risk',
      description: `Missed medication ${adherence.missedCount} time(s) in the last 7 days. Early intervention recommended.`,
      severity: 'critical',
      timestamp: now,
      agentSource: 'care',
    });
  } else if (adherence.missedCount === 1) {
    insights.push({
      type: 'adherence',
      title: 'One missed dose',
      description: 'You missed one dose recently. Keep up with your schedule to stay on track.',
      severity: 'warning',
      timestamp: now,
      agentSource: 'care',
    });
  }

  const avgSteps = recent.length ? recent.reduce((s, l) => s + l.steps, 0) / recent.length : 0;
  if (avgSteps < 5000 && recent.length > 0) {
    insights.push({
      type: 'lifestyle',
      title: 'Low activity',
      description: `Average steps this week: ${Math.round(avgSteps)}. Consider adding short walks.`,
      severity: 'warning',
      timestamp: now,
      agentSource: 'lifestyle',
    });
  }

  const moods = recent.map((l) => l.mood).filter((m) => m > 0);
  const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;
  if (avgMood <= 4 && moods.length > 0) {
    insights.push({
      type: 'mood',
      title: 'Mood check-in',
      description: 'Your mood entries have been lower lately. We\'re here to support you.',
      severity: 'warning',
      timestamp: now,
      agentSource: 'emotional',
    });
  }

  return insights;
}
