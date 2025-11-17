# ColorWerkz Monorepo

A pragmatic monorepo for ColorWerkz with apps, services, and shared packages. Workspaces are enabled at the root for Node projects; the Python service runs independently.


## Project Structure (2025)

- `apps/`
  - `api/` – Node/Express API (v2 endpoints under `/api/v2/*`)
  - `web/` – React/Vite frontend workspace
- `services/`
  - `python-service/` – FastAPI service for color and training operations
  - `user-management/` – Node user management microservice
- `packages/`
  - `shared/`
    - `schemas/` – All shared TypeScript schemas (merged, unified)
  - `ui/` – Shared UI components
  - `config/` – Shared config and linting presets
- `scripts/` – Repo scaffolding and dev helpers
- `tests/` – Integration/E2E test scripts
- `docs/` – All project documentation (markdown)

## Next Steps

1. **Service Review:**
   - Consider merging `user-management` into `apps/api` if it is not a standalone service.
   - Review if `python-service` and `user-management` can be further modularized or integrated.
2. **Scripts Cleanup:**
   - Remove or document any unused scripts in `scripts/`.
3. **Testing:**
   - Expand `tests/` with integration and E2E coverage for all services.
4. **Documentation:**
   - Keep `docs/` up to date with architecture, API, and onboarding guides.
5. **Infra:**
   - Add Docker, Compose, or IaC as needed for deployment.
6. **Monorepo Hygiene:**
   - Periodically review for redundant packages, folders, or configs.


## Prerequisites

- Node.js ≥ 20, npm ≥ 9
- Python ≥ 3.9, `pip`

## Quick Start (Local)

1. Install Node workspaces

```sh
npm install
```

1. Start Python service (terminal A)

```sh
cd services/python-service
python3 -m venv .venv
"$PWD/.venv/bin/pip" install --upgrade pip
"$PWD/.venv/bin/pip" install -r requirements.txt
"$PWD/.venv/bin/python" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001 --app-dir app
```

1. Start Node API (terminal B)

```sh
PORT=3001 PY_SERVICE_BASE=http://localhost:8001 npm run dev:api
```

1. (Optional) Start Web Frontend (terminal C)

```sh
npm --workspace apps/web install
npm --workspace apps/web run dev
```

1. Test color-transfer endpoint

```sh
curl -s -X POST http://localhost:3001/api/v2/color-transfer \
  -H 'content-type: application/json' \
  -d '{"image":"data:image/png;base64,iVBORw0KGgo=","method":"pytorch"}' | jq
```

## One-Command Dev (optional)

After creating a virtualenv once, you can add a convenience script (see package.json `dev:all`) to run Python + API + Web concurrently.

## Workspace Scripts

- Root: `npm run dev:api` – API server
- Root: `npm run dev:web` – Web frontend (Vite)
- Root: `npm run dev:python` – FastAPI (assumes existing venv)
- Root: `npm run dev:all` – concurrent python + api + web

## Frontend Scaffold (Optional)

A Modern Minimal Tailwind UI scaffold is available:

```sh
chmod +x ./setup_project.sh
./setup_project.sh
open index.html  # macOS
```

## Notes

- Versioning is by URL path (`/api/v2/*`), not by route subfolders.
- The Python service is a placeholder; wire real color transfer and validation as you migrate.
