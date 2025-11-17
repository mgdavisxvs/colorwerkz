#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PY_SERVICE_DIR="$ROOT_DIR/services/python-color"
VENV_DIR="$PY_SERVICE_DIR/.venv"

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  echo "[ensure_py_service] Creating virtualenv in $VENV_DIR" >&2
  python3 -m venv "$VENV_DIR"
fi

"$VENV_DIR/bin/pip" install --upgrade pip >/dev/null
"$VENV_DIR/bin/pip" install -r "$PY_SERVICE_DIR/requirements.txt"

echo "$VENV_DIR/bin/python"
