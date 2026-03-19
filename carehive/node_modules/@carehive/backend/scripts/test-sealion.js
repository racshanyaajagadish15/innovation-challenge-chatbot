#!/usr/bin/env node
/**
 * Quick test: one SEA-LION API call with 20s timeout.
 * Run from backend: node scripts/test-sealion.js
 */
require('dotenv').config();
const https = require('https');

const key = process.env.SEA_LION_API_KEY;
if (!key) {
  console.log('No SEA_LION_API_KEY in .env');
  process.exit(1);
}

const body = JSON.stringify({
  model: 'aisingapore/Gemma-SEA-LION-v4-27B-IT',
  messages: [{ role: 'user', content: 'Say "hello" in one word.' }],
  max_tokens: 10,
});

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
      try {
        const j = JSON.parse(data);
        const text = j.choices?.[0]?.message?.content;
        if (text) {
          console.log('SEA-LION OK:', text.trim());
        } else {
          console.log('SEA-LION response (no text):', data.slice(0, 200));
        }
      } catch (e) {
        console.log('SEA-LION parse error:', e.message, data.slice(0, 200));
      }
    });
  }
);
req.on('error', (e) => console.log('SEA-LION request error:', e.message));
req.setTimeout(20000, () => {
  req.destroy();
  console.log('SEA-LION timeout after 20s');
});
req.write(body);
req.end();
