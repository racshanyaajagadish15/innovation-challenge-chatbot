import { generateCompletion } from '../services/llmService.js';
export async function chat(req, res) {
    try {
        const { message, userId } = req.body;
        if (!message || typeof message !== 'string') {
            res.status(400).json({ error: 'message required' });
            return;
        }
        const systemPrompt = `You are CAREHIVE, an AI chronic care assistant. You support medication adherence, lifestyle (diet/exercise in Singapore context), and emotional wellbeing. Be brief, empathetic, and actionable. Do not give medical diagnoses.`;
        const response = await generateCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
        ]);
        res.json({ reply: response, userId: userId ?? null });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Chat failed' });
    }
}
