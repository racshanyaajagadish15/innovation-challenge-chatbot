#!/bin/bash
# List SEA-LION models (no Node required). Use this if Node crashes with dyld/conda errors.
# With Node: node scripts/sealion-models.cjs
# Usage: cd carehive/backend && bash scripts/sealion-models.sh
# Key is read from .env (line starting with SEA_LION_API_KEY=).

set -e
cd "$(dirname "$0")/.."
if [ -f .env ]; then
  KEY=$(grep -E '^SEA_LION_API_KEY=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
  export SEA_LION_API_KEY="$KEY"
fi
if [ -z "$SEA_LION_API_KEY" ]; then
  echo "Add SEA_LION_API_KEY to backend/.env or run:"
  echo "  curl -s -H 'Authorization: Bearer YOUR_KEY' https://api.sea-lion.ai/v1/models"
  exit 1
fi
echo "Fetching https://api.sea-lion.ai/v1/models ..."
curl -s -S -m 15 "https://api.sea-lion.ai/v1/models" \
  -H "Authorization: Bearer $SEA_LION_API_KEY" | head -c 2000
echo ""
