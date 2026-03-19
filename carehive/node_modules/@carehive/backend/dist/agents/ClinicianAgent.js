import { summariseForClinician } from '../services/llmService.js';
const AGENT_TYPE = 'clinician';
export const ClinicianAgent = {
    type: AGENT_TYPE,
    async analyze(context) {
        const logs = context.healthLogs;
        const recent = logs.slice(-7);
        const missed = recent.filter((l) => !l.medicationTaken).length;
        const adherenceRate = recent.length ? ((recent.length - missed) / recent.length) * 100 : 100;
        const avgSteps = recent.length
            ? recent.reduce((s, l) => s + l.steps, 0) / recent.length
            : 0;
        const moods = recent.map((l) => l.mood).filter((m) => m > 0);
        const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;
        const moodTrend = recent.length >= 2 && (recent[recent.length - 1]?.mood ?? 0) < (recent[recent.length - 2]?.mood ?? 0)
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
    async decide(_context, analysis) {
        const flags = analysis.riskFlags ?? [];
        return flags.length > 0 ? 'generate_summary' : 'generate_summary';
    },
    async act(context, analysis, _decision) {
        const summary = await summariseForClinician({
            adherenceRate: analysis.adherenceRate ?? 0,
            missedDays: analysis.missedDays ?? 0,
            moodTrend: analysis.moodTrend ?? 'stable',
            stepsTrend: analysis.stepsTrend ?? 'stable',
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
