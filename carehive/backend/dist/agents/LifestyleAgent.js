const AGENT_TYPE = 'lifestyle';
export const LifestyleAgent = {
    type: AGENT_TYPE,
    async analyze(context) {
        const logs = context.healthLogs;
        const recent = logs.slice(-7);
        const avgSteps = recent.length
            ? recent.reduce((s, l) => s + l.steps, 0) / recent.length
            : 0;
        const trend = recent.length >= 2
            ? (recent[recent.length - 1]?.steps ?? 0) - (recent[recent.length - 2]?.steps ?? 0)
            : 0;
        const lowActivityDays = recent.filter((l) => l.steps < 5000).length;
        return {
            avgSteps: Math.round(avgSteps),
            stepsTrend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
            lowActivityDays,
            suggestion: avgSteps < 5000 || lowActivityDays >= 3 ? 'suggest_activity' : 'encourage_maintain',
        };
    },
    async decide(_context, analysis) {
        return analysis.suggestion ?? 'encourage_maintain';
    },
    async act(_context, analysis, decision) {
        let message;
        const actions = [];
        if (decision === 'suggest_activity') {
            message =
                'Your steps have been lower this week. In Singapore, a 10-min walk after meals (e.g. around the block or to the MRT) can help with blood sugar. Consider brown rice and more vegetables at hawker meals when possible.';
            actions.push({ type: 'create_intervention', payload: { priority: 'medium', message } });
        }
        else {
            message =
                'You’re keeping a good level of activity. Keep it up—small, consistent movement helps long-term.';
            actions.push({ type: 'create_intervention', payload: { priority: 'low', message } });
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
