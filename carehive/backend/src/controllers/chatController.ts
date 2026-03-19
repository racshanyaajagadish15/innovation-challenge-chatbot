/**
 * Chat - user talks to AI, agent-style response (uses LLM or mock)
 */
import { Request, Response } from 'express';
import { generateCompletion } from '../services/llmService.js';

export async function chat(req: Request, res: Response) {
  try {
    const { message, userId } = req.body as { message?: string; userId?: string };
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message required' });
      return;
    }
    const systemPrompt = `You are CAREHIVE, an AI chronic care assistant. You support medication adherence, lifestyle (diet/exercise in Singapore context), and emotional wellbeing. Be brief, empathetic, and actionable. Do not give medical diagnoses.

IMPORTANT RULES:
- If the user mentions a medication name you do not recognize or that appears misspelled, ASK the user to clarify or double-check the spelling. Do NOT guess or assume what medication they meant. Say something like "I'm not sure I recognize that medication name. Could you double-check the spelling?"
- Never substitute one medication for another. Medication errors can be dangerous.
- Only provide information about a medication when you are confident the name is correct.`;
    const response = await generateCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ]);
    res.json({ reply: response, userId: userId ?? null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Chat failed' });
  }
}
