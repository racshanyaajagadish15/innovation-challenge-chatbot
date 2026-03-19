#!/bin/bash
# Minimal SEA-LION chat test (no Node). Run: cd carehive/backend && bash scripts/sealion-chat-test.sh
set -e
cd "$(dirname "$0")/.."
if [ -f .env ]; then
  SEA_LION_API_KEY=$(grep -E '^SEA_LION_API_KEY=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
fi
[ -z "$SEA_LION_API_KEY" ] && echo "Add SEA_LION_API_KEY to .env" && exit 1

echo "Calling SEA-LION /v1/chat/completions (timeout 90s)..."
curl -s -S -m 90 -X POST 'https://api.sea-lion.ai/v1/chat/completions' \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/plain' \
  -H "Authorization: Bearer $SEA_LION_API_KEY" \
  -d '{
    "model": "aisingapore/Gemma-SEA-LION-v4-27B-IT",
    "messages": [{"role": "user", "content": "Reply with only the word Hello."}],
    "max_completion_tokens": 10,
    "max_tokens": 10
  }'
echo ""
