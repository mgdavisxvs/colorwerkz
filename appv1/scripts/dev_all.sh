#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PY_SERVICE_DIR="$ROOT_DIR/services/python-color"
API_DIR="$ROOT_DIR/apps/api"

# Ensure Python venv and deps
PYTHON_PATH="$("$ROOT_DIR/scripts/ensure_py_service.sh")"

# Ports
PY_PORT="${PY_PORT:-8001}"
API_PORT="${PORT:-3001}"

PY_CMD=("$PYTHON_PATH" -m uvicorn app.main:app --reload --host 0.0.0.0 --port "$PY_PORT" --app-dir "$PY_SERVICE_DIR")
API_CMD=(env PORT="$API_PORT" PY_SERVICE_BASE="http://localhost:$PY_PORT" npm --workspace "$API_DIR" run dev)

echo "[dev] Starting Python service on :$PY_PORT and API on :$API_PORT" >&2

exec npx concurrently -k -n python,api -c blue,green \
  "${PY_CMD[@]}" \
  "${API_CMD[@]}"
