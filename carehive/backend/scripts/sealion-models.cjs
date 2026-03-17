#!/usr/bin/env node
/**
 * Step 1 from SEA-LION docs: list available models for your API key.
 * Run from backend: node scripts/sealion-models.cjs
 * Requires SEA_LION_API_KEY in .env
 *
 * If you see dyld/conda OpenSSL errors, use: bash scripts/sealion-models.sh
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const https = require('https');

const key = process.env.SEA_LION_API_KEY;
if (!key) {
  console.log('Missing SEA_LION_API_KEY in backend/.env');
  process.exit(1);
}

const req = https.get(
  'https://api.sea-lion.ai/v1/models',
  {
    headers: { Authorization: `Bearer ${key}` },
  },
  (res) => {
    let data = '';
    res.on('data', (ch) => (data += ch));
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.log('Status:', res.statusCode, data.slice(0, 300));
        return;
      }
      try {
        const j = JSON.parse(data);
        const models = j.data ?? j.models ?? [];
        console.log('Available models:', Array.isArray(models) ? models.length : 0);
        if (Array.isArray(models)) models.forEach((m) => console.log(' -', m.id || m));
        else console.log(JSON.stringify(j, null, 2).slice(0, 1000));
      } catch (e) {
        console.log('Response:', data.slice(0, 500));
      }
    });
  }
);
req.on('error', (e) => console.log('Error:', e.message));
req.setTimeout(15000, () => {
  req.destroy();
  console.log('Timeout after 15s');
});
