# ColorWerkz Repository Structure

This document defines the target file structure for ColorWerkz, aligned with the Refactoring & System Migration Report (RSR) and feature roadmap. Use `scripts/scaffold_repo_structure.sh` to generate placeholders non-destructively.

## Top-Level

- `apps/` — Application entry points
  - `apps/web/` — Front-end workspace (Tailwind-first; Vite/React optional)
  - `apps/api/` — Node/Express API (v2 unified routes)
- `services/` — Long-running services
  - `services/python-color/` — FastAPI color service (transfer, training, eval)
- `packages/` — Shared libraries
  - `packages/schemas/` — Domain-modular TS schemas (split from monolith)
  - `packages/contracts/` — Shared API contracts (OpenAPI/Protobuf/Zod)
- `infra/` — Deployment artifacts (Dockerfiles, compose, IaC)
- `tests/` — Integration and E2E tests
- `.github/workflows/` — CI workflows
- `docs/` — Design docs, RSRs, roadmaps (existing files retained at root)

## apps/api (Consolidated Routes)

`apps/api/src/routes/` includes one file per domain, replacing the previous 46-file sprawl:

- Core domain routes
  - `color-transfer.ts` — Unified endpoint with `method` parameter
  - `manufacturing.ts`, `manufacturing-ws.ts`
  - `training.ts`, `training-monitor.ts`
  - `models.ts`
  - `performance.ts`, `analytics.ts`
  - `image-processing.ts`, `evaluation.ts`, `site-analysis.ts`, `upload.ts`
- Infrastructure routes
  - `auth.ts`, `backup.ts`, `security.ts`, `api-keys.ts`, `health.ts`, `monitoring.ts`, `energy-ledger.ts`

API versioning strategy:

- New: `/api/v2/*` (canonical)
- Legacy: `/api/v1/*` (6-month deprecation window; add `X-Deprecated-API`, `X-API-Sunset`, `X-Migration-Guide` headers)

## packages/schemas (Modular TS Schemas)

`packages/schemas/src/` modules by domain:

- `core.ts`, `auth.ts`, `security.ts`, `backup.ts`, `analytics.ts`, `api-management.ts`, `energy.ts`
- `ai-training.ts`, `ai-testing.ts`, `ai-models.ts`, `ai-evaluation.ts`, `ai-analysis.ts`
- `site-analysis.ts`, `ux-features.ts`, `metadata.ts`
- `index.ts` (re-exports for backward compatibility)

## services/python-color (FastAPI Service)

- `app/main.py` with `/health` and future routers (`/color/transfer`, `/training/*`, `/eval/*`).
- `requirements.txt` lists minimal runtime deps.

## infra

- `compose.yaml` defines `api` and `python-color` services; Dockerfiles live in `infra/docker/`.

## How to Scaffold

Run the non-destructive scaffold script (creates missing folders/files only):

```sh
chmod +x scripts/scaffold_repo_structure.sh
scripts/scaffold_repo_structure.sh
```

Then incrementally implement code in placeholders, wire routes in `apps/api/src/index.ts`, and grow schemas/contracts as needed.

## Guiding Principles

- Prefer one canonical route per domain over “enhanced” variants.
- Replace per-request Python subprocesses with a long-running service.
- Keep authoring sources (`packages/`, `apps/*/src`) separate from build artifacts.
- Enforce strict input validation at API boundaries; version contracts.
- Maintain back-compat via re-exports and deprecation headers during the cutover period.
