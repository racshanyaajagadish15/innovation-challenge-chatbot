/**
 * LLM Service - Abstracted AI layer
 * Uses Groq's OpenAI-compatible chat API. Falls back to mock if unavailable.
 * Set USE_MOCK_LLM=true in .env to always use mock.
 */
const USE_MOCK_LLM = process.env.USE_MOCK_LLM === 'true' || process.env.USE_MOCK_LLM === '1';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
export function getLLMMode() {
    return USE_MOCK_LLM || !GROQ_API_KEY ? 'mock' : 'groq';
}
export async function generateCompletion(messages, options) {
    if (USE_MOCK_LLM || !GROQ_API_KEY) {
        return getMockResponse(messages);
    }
    try {
        const maxTokens = options?.maxTokens ?? 300;
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages,
                max_tokens: maxTokens,
            }),
        });
        if (!res.ok) {
            const errBody = await res.text();
            console.warn('Groq API error status', res.status, errBody);
            return getMockResponse(messages);
        }
        const data = (await res.json());
        const text = data.choices?.[0]?.message?.content ?? '';
        return text.toString().trim() || getMockResponse(messages);
    }
    catch (err) {
        console.warn('Groq API error, using mock:', err instanceof Error ? err.message : String(err));
        return getMockResponse(messages);
    }
}
function getMockResponse(messages) {
    const lastContent = (messages[messages.length - 1]?.content || '').toLowerCase();
    if (lastContent.includes('summary') || lastContent.includes('clinician')) {
        return 'Patient shows moderate adherence (71% this week). Two missed medication days detected. Mood trend declining—consider gentle check-in. Lifestyle agent suggests increasing light activity.';
    }
    if (lastContent.includes('mood') || lastContent.includes('stress')) {
        return 'It\'s okay to have low days. Small steps like a short walk or talking to someone can help. You\'re doing your best.';
    }
    if (lastContent.includes('medication') || lastContent.includes('adherence')) {
        return 'Setting a daily reminder and linking it to a routine (e.g. after breakfast) often improves consistency. Would you like tips for remembering?';
    }
    if (lastContent.includes('diet') || lastContent.includes('exercise') || lastContent.includes('steps')) {
        return 'For Singapore context: try a 10-min walk after meals, and consider local options like brown rice and more vegetables at hawker meals.';
    }
    return 'I\'m here to support your care plan. Share how you\'re feeling or what you need help with.';
}
export async function summariseForClinician(context) {
    const prompt = `Summarise this patient data for a clinician in 2-3 short paragraphs. Adherence: ${context.adherenceRate}%, Missed days: ${context.missedDays}. Mood: ${context.moodTrend}. Steps: ${context.stepsTrend}. Be factual and suggest one follow-up if needed.`;
    return generateCompletion([
        { role: 'system', content: 'You are a medical scribe. Output concise, professional summaries.' },
        { role: 'user', content: prompt },
    ], { maxTokens: 400 });
}
