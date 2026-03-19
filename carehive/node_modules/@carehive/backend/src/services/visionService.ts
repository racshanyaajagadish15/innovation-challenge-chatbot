/**
 * Vision service – mood, posture, and appearance from a single image via Groq.
 * Model: meta-llama/llama-4-scout-17b-16e-instruct
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
// Groq model IDs typically need the full namespace prefix.
// Example from GroqDocs: `meta-llama/llama-4-scout-17b-16e-instruct`
const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

export interface VisionAnalysis {
  mood: number; // 1–10
  posture: string;
  summary?: string;
  raw?: string;
}

const PROMPT = `You are a healthcare assistant. Analyze this image of a person (e.g. from a short video frame or selfie).

Respond in this exact JSON format only, no other text:
{"mood": <number 1-10>, "posture": "<brief description: e.g. relaxed, slouched, tense, upright>", "summary": "<1-2 sentence overall observation>"}

Base mood on apparent facial expression and body language. Be respectful and non-judgmental.`;

export async function analyzeImage(base64Image: string, mimeType = 'image/jpeg'): Promise<VisionAnalysis> {
  if (!GROQ_API_KEY) {
    return {
      mood: 5,
      posture: 'Unable to analyze (no API key)',
      summary: 'Vision API not configured.',
    };
  }

  const dataUrl = `data:${mimeType};base64,${base64Image.replace(/^data:image\/\w+;base64,/, '')}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn('Groq vision API error', res.status, errBody);
      return {
        mood: 5,
        posture: 'Analysis unavailable',
        summary: 'Vision request failed.',
        raw: errBody,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '';

    // Parse JSON from response (may be wrapped in markdown code block)
    let parsed: { mood?: number; posture?: string; summary?: string };
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]) as { mood?: number; posture?: string; summary?: string };
      } catch {
        parsed = {};
      }
    } else {
      parsed = {};
    }

    const mood = Math.min(10, Math.max(1, Math.round(Number(parsed.mood) || 5)));
    const posture = typeof parsed.posture === 'string' ? parsed.posture : 'Unknown';
    const summary = typeof parsed.summary === 'string' ? parsed.summary : undefined;

    return { mood, posture, summary, raw };
  } catch (err) {
    console.warn('Vision analysis error:', err instanceof Error ? err.message : String(err));
    return {
      mood: 5,
      posture: 'Analysis failed',
      summary: 'An error occurred while analyzing the image.',
    };
  }
}
