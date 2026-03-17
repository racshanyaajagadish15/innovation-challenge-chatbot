/**
 * Adherence prediction & behaviour tracking
 * Predicts failure when missed medication >= 2, tracks trends
 */
export interface LogEntry {
  medication_taken?: boolean;
  medicationTaken?: boolean;
  steps: number;
  mood: number;
}

export interface AdherenceResult {
  adherenceRate: number;
  missedCount: number;
  predictedFailure: boolean;
  trend: 'improving' | 'declining' | 'stable';
}

export function computeAdherence(logs: LogEntry[]): AdherenceResult {
  const recent = logs.slice(-7);
  const taken = (l: LogEntry) => l.medicationTaken ?? l.medication_taken ?? false;
  const missed = recent.filter((l) => !taken(l)).length;
  const rate = recent.length ? ((recent.length - missed) / recent.length) * 100 : 100;
  const predictedFailure = missed >= 2;

  let trend: AdherenceResult['trend'] = 'stable';
  if (recent.length >= 3) {
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    const firstRate = firstHalf.filter((l) => taken(l)).length / firstHalf.length;
    const secondRate = secondHalf.filter((l) => taken(l)).length / secondHalf.length;
    if (secondRate > firstRate) trend = 'improving';
    else if (secondRate < firstRate) trend = 'declining';
  }

  return {
    adherenceRate: Math.round(rate * 10) / 10,
    missedCount: missed,
    predictedFailure,
    trend,
  };
}
