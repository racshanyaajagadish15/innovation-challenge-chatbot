export function computeAdherence(logs) {
    const recent = logs.slice(-7);
    const taken = (l) => l.medicationTaken ?? l.medication_taken ?? false;
    const missed = recent.filter((l) => !taken(l)).length;
    const rate = recent.length ? ((recent.length - missed) / recent.length) * 100 : 100;
    const predictedFailure = missed >= 2;
    let trend = 'stable';
    if (recent.length >= 3) {
        const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
        const secondHalf = recent.slice(Math.floor(recent.length / 2));
        const firstRate = firstHalf.filter((l) => taken(l)).length / firstHalf.length;
        const secondRate = secondHalf.filter((l) => taken(l)).length / secondHalf.length;
        if (secondRate > firstRate)
            trend = 'improving';
        else if (secondRate < firstRate)
            trend = 'declining';
    }
    return {
        adherenceRate: Math.round(rate * 10) / 10,
        missedCount: missed,
        predictedFailure,
        trend,
    };
}
