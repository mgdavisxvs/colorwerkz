#!/usr/bin/env sh
# ColorWerkz Monorepo Scaffold Script (POSIX-compliant)
# Creates a clean, consolidated app file structure per the RSR plan.

set -eu

say() { printf "%s\n" "$*"; }
fail() { say "Error: $*" 1>&2; exit 1; }

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")"/.. && pwd)"

exists() { [ -e "$1" ]; }
mkd() { mkdir -p "$1"; }
touch_if_missing() { [ -e "$1" ] || : > "$1"; }
write_if_missing() { # $1=path, $2=heredoc marker
  if [ -e "$1" ]; then
    say "Skip (exists): $1"
  else
    cat >"$1" <<"EOF"
EOF
  fi
}

say "Scaffolding ColorWerkz repository structure under: $ROOT_DIR"

# Top-level directories
mkd "$ROOT_DIR/apps/web/src" \
    "$ROOT_DIR/apps/web/public" \
    "$ROOT_DIR/apps/api/src/routes" \
    "$ROOT_DIR/services/python-color/app/routers" \
    "$ROOT_DIR/packages/schemas/src" \
    "$ROOT_DIR/packages/contracts" \
    "$ROOT_DIR/infra/docker" \
    "$ROOT_DIR/tests/integration" \
    "$ROOT_DIR/tests/e2e" \
    "$ROOT_DIR/.github/workflows"

# .gitignore (augment minimal ignores)
if ! exists "$ROOT_DIR/.gitignore"; then
  cat >"$ROOT_DIR/.gitignore" <<'EOF'
node_modules
dist
.DS_Store
.venv
__pycache__
*.pyc
build
coverage
.pytest_cache
EOF
fi

# apps/web placeholder README
if ! exists "$ROOT_DIR/apps/web/README.md"; then
  cat >"$ROOT_DIR/apps/web/README.md" <<'EOF'
# apps/web

Modern Minimal frontend workspace (Tailwind-first). Use Vite/React or static HTML.
- Entry: `index.html` at repo root or a Vite app here
- Styles: Tailwind pipeline outputs to `dist/`
EOF
fi

# apps/api skeleton (routes consolidated per RSR)
if ! exists "$ROOT_DIR/apps/api/README.md"; then
  cat >"$ROOT_DIR/apps/api/README.md" <<'EOF'
# apps/api

Consolidated Express API (v2). Unified color-transfer entrypoint with `method` parameter;
backwards-compatible v1 routes may emit deprecation headers.
EOF
fi

if ! exists "$ROOT_DIR/apps/api/src/index.ts"; then
  cat >"$ROOT_DIR/apps/api/src/index.ts" <<'EOF'
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

// v2 routes mounted under /api/v2
// Implement handlers in ./routes/*.ts and import here.

const port = process.env.PORT || 5000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on :${port}`);
});
EOF
fi

# Create consolidated route placeholders
for f in \
  color-transfer.ts \
  manufacturing.ts \
  manufacturing-ws.ts \
  training.ts \
  training-monitor.ts \
  models.ts \
  performance.ts \
  analytics.ts \
  image-processing.ts \
  evaluation.ts \
  site-analysis.ts \
  upload.ts \
  auth.ts \
  backup.ts \
  security.ts \
  api-keys.ts \
  health.ts \
  monitoring.ts \
  energy-ledger.ts
do
  p="$ROOT_DIR/apps/api/src/routes/$f"
  if ! exists "$p"; then
    cat >"$p" <<EOF
// Placeholder route module: $f
export {};
EOF
  fi
done

# services/python-color FastAPI minimal app
if ! exists "$ROOT_DIR/services/python-color/README.md"; then
  cat >"$ROOT_DIR/services/python-color/README.md" <<'EOF'
# services/python-color

FastAPI service for color transfer, training orchestration, and evaluation.
Exposes HTTP endpoints to replace per-request Python subprocesses.
EOF
fi

if ! exists "$ROOT_DIR/services/python-color/requirements.txt"; then
  cat >"$ROOT_DIR/services/python-color/requirements.txt" <<'EOF'
fastapi
uvicorn
numpy
EOF
fi

if ! exists "$ROOT_DIR/services/python-color/app/main.py"; then
  cat >"$ROOT_DIR/services/python-color/app/main.py" <<'EOF'
from fastapi import FastAPI

app = FastAPI(title="ColorWerkz Python Service", version="0.1.0")

@app.get("/health")
def health():
    return {"ok": True}
EOF
fi

# packages/schemas modular TypeScript schema placeholders
if ! exists "$ROOT_DIR/packages/schemas/README.md"; then
  cat >"$ROOT_DIR/packages/schemas/README.md" <<'EOF'
# packages/schemas

Domain-modular TypeScript schemas (split from monolithic shared/schema.ts).
Re-export through `index.ts` for backward compatibility.
EOF
fi

SCHEMAS_DIR="$ROOT_DIR/packages/schemas/src"
for mod in \
  index.ts \
  core.ts \
  auth.ts \
  security.ts \
  backup.ts \
  analytics.ts \
  api-management.ts \
  energy.ts \
  ai-training.ts \
  ai-testing.ts \
  ai-models.ts \
  ai-evaluation.ts \
  ai-analysis.ts \
  site-analysis.ts \
  ux-features.ts \
  metadata.ts
do
  p="$SCHEMAS_DIR/$mod"
  if ! exists "$p"; then
    case "$mod" in
      index.ts)
        cat >"$p" <<'EOF'
// Re-export modules for backward compatibility
export * from './core';
export * from './auth';
export * from './security';
export * from './backup';
export * from './analytics';
export * from './api-management';
export * from './energy';
export * from './ai-training';
export * from './ai-testing';
export * from './ai-models';
export * from './ai-evaluation';
export * from './ai-analysis';
export * from './site-analysis';
export * from './ux-features';
export * from './metadata';
EOF
        ;;
      *)
        cat >"$p" <<EOF
// Placeholder schema module: $mod
export {};
EOF
        ;;
    esac
  fi
done

# packages/contracts placeholder
if ! exists "$ROOT_DIR/packages/contracts/README.md"; then
  cat >"$ROOT_DIR/packages/contracts/README.md" <<'EOF'
# packages/contracts

Shared API contracts (OpenAPI/Protobuf/Zod/Pydantic) for API and Python service.
EOF
fi

# infra compose file (minimal, non-intrusive placeholders)
if ! exists "$ROOT_DIR/infra/compose.yaml"; then
  cat >"$ROOT_DIR/infra/compose.yaml" <<'EOF'
version: "3.9"
services:
  api:
    build: ./docker/api
    ports:
      - "5000:5000"
    environment:
      - PY_SERVICE_BASE=http://python-color:8001
  python-color:
    build: ./docker/python-color
    ports:
      - "8001:8001"
EOF
fi

# CI placeholder
if ! exists "$ROOT_DIR/.github/workflows/ci.yml"; then
  cat >"$ROOT_DIR/.github/workflows/ci.yml" <<'EOF'
name: ci
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Node setup
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: echo "Add lint and type-check steps here"
EOF
fi

say "Done. Review STRUCTURE.md for the intended layout and next steps."
