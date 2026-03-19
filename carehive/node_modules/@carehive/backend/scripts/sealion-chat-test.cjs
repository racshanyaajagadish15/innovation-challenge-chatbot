#!/usr/bin/env node
/**
 * Minimal SEA-LION chat completion test.
 * Run: node scripts/sealion-chat-test.cjs
 * Reads SEA_LION_API_KEY from .env. Logs timing and full response or error.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const https = require('https');

const key = process.env.SEA_LION_API_KEY;
if (!key) {
  console.log('Missing SEA_LION_API_KEY in .env');
  process.exit(1);
}

const body = JSON.stringify({
  model: 'aisingapore/Gemma-SEA-LION-v4-27B-IT',
  messages: [{ role: 'user', content: 'Reply with only the word Hello.' }],
  max_completion_tokens: 10,
  max_tokens: 10,
});

const start = Date.now();
console.log('Calling SEA-LION /v1/chat/completions ...');

const req = https.request(
  'https://api.sea-lion.ai/v1/chat/completions',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/plain',
      Authorization: `Bearer ${key}`,
      'Content-Length': Buffer.byteLength(body),
    },
  },
  (res) => {
    let data = '';
    res.on('data', (ch) => (data += ch));
    res.on('end', () => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log('Status:', res.statusCode, '| Elapsed:', elapsed + 's');
      console.log('Response:', data);
      try {
        const j = JSON.parse(data);
        const text = j.choices?.[0]?.message?.content;
        if (text) console.log('Extracted text:', text.trim());
        if (j.error) console.log('API error:', j.error);
      } catch (e) {
        console.log('(parse error)', e.message);
      }
    });
  }
);
req.on('error', (e) => {
  console.log('Request error after', ((Date.now() - start) / 1000).toFixed(1) + 's:', e.message);
});
req.setTimeout(90000, () => {
  req.destroy();
  console.log('Timeout after 90s – no response received.');
});
req.write(body);
req.end();
