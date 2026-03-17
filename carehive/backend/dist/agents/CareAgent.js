const AGENT_TYPE = 'care';
export const CareAgent = {
    type: AGENT_TYPE,
    async analyze(context) {
        const logs = context.healthLogs;
        const recent = logs.slice(-7);
        const missed = recent.filter((l) => !l.medicationTaken).length;
        const adherenceRate = recent.length ? ((recent.length - missed) / recent.length) * 100 : 100;
        const consecutiveMissed = (() => {
            let max = 0;
            let curr = 0;
            for (const l of [...recent].reverse()) {
                if (!l.medicationTaken)
                    curr++;
                else
                    break;
            }
            return curr;
        })();
        return {
            missedCount: missed,
            adherenceRate: Math.round(adherenceRate * 10) / 10,
            consecutiveMissed,
            totalDays: recent.length,
            predictedFailure: missed >= 2 || consecutiveMissed >= 1,
        };
    },
    async decide(_context, analysis) {
        const missed = analysis.missedCount ?? 0;
        const predicted = analysis.predictedFailure;
        if (predicted && missed >= 2)
            return 'trigger_early_intervention';
        if (missed === 1)
            return 'send_reminder';
        return 'no_action';
    },
    async act(context, analysis, decision) {
        const actions = [];
        let message;
        if (decision === 'trigger_early_intervention') {
            message =
                "We noticed you've missed medication twice recently. Setting a reminder and a quick tip: linking your dose to a daily habit (e.g. after breakfast) can help. Would you like to set a specific time?";
            actions.push({ type: 'create_intervention', payload: { priority: 'high', message } });
            actions.push({ type: 'schedule_reminder', payload: { channel: 'in_app', nextAt: 'tomorrow_08:00' } });
        }
        else if (decision === 'send_reminder') {
            message = "You missed one dose recently. Try to take your next dose on time—we'll send you a reminder.";
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
