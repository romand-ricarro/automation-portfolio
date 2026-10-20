#!/usr/bin/env bash
# Posts each fake inquiry in sample-data/inquiries.json to the n8n webhook.
# Usage: ./scripts/send-sample-inquiries.sh [webhook-base-url]
# Default base URL is the local n8n production webhook path.
set -euo pipefail

BASE_URL="${1:-http://localhost:5678/webhook}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"

node -e 'for (const i of require(process.argv[1])) console.log(JSON.stringify(i))' \
  "$DIR/sample-data/inquiries.json" |
while IFS= read -r inquiry; do
  echo "POST $inquiry"
  curl -sS -X POST "$BASE_URL/lead-inquiry" -H 'Content-Type: application/json' -d "$inquiry"
  echo
done
