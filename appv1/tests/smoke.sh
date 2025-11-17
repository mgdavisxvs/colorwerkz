#!/usr/bin/env bash
set -euo pipefail

API_PORT="${PORT:-3001}"
PY_PORT="${PY_PORT:-8001}"

echo "[smoke] Python health:" >&2
curl -sS "http://localhost:$PY_PORT/health" | jq . || true

echo "[smoke] API health:" >&2
curl -sS "http://localhost:$API_PORT/health" | jq . || true

echo "[smoke] color-transfer:" >&2
curl -sS -X POST "http://localhost:$API_PORT/api/v2/color-transfer" \
  -H 'content-type: application/json' \
  -d '{"image":"data:image/png;base64,AAAA","method":"pytorch"}' | jq . || true
