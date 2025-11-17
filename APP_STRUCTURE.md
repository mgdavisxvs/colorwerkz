# ColorWerkz Application File Structure

This document outlines the proposed file structure for the ColorWerkz application, based on the analysis of all project documentation.

## Root Directory

```
/
├── apps/
│   ├── api/
│   └── web/
├── packages/
│   ├── schemas/
│   └── contracts/
├── services/
│   └── python-color/
├── infra/
│   ├── docker/
│   └── k8s/
├── scripts/
├── tests/
│   ├── integration/
│   └── security/
├── data/
│   ├── products/
│   └── manifests/
├── models/
├── docs/
├── .github/
│   └── workflows/
├── .gitignore
├── package.json
└── README.md
```

## `apps/api` (Node.js/Express Backend)

The backend application containing the consolidated API routes.

```
apps/api/
└── src/
    ├── index.ts        # Main server entry point
    ├── app.ts          # Express app setup
    ├── routes/
    │   ├── index.ts    # Main router
    │   ├── color-transfer.ts
    │   ├── manufacturing.ts
    │   ├── manufacturing-ws.ts
    │   ├── training.ts
    │   ├── training-monitor.ts
    │   ├── models.ts
    │   ├── performance.ts
    │   ├── analytics.ts
    │   ├── image-processing.ts
    │   ├── evaluation.ts
    │   ├── site-analysis.ts
    │   ├── upload.ts
    │   ├── auth.ts
    │   ├── backup.ts
    │   ├── security.ts
    │   ├── api-keys.ts
    │   ├── health.ts
    │   └── monitoring.ts
    ├── middleware/
    │   ├── auth.ts
    │   ├── error-handler.ts
    │   ├── image-upload.ts
    │   └── request-id.ts
    └── services/
        └── python-service.ts # Client for the Python service
```

## `apps/web` (React Frontend)

The user interface for the application.

```
apps/web/
└── src/
    ├── main.tsx            # Main entry point
    ├── App.tsx             # Root component
    ├── components/
    │   ├── ui/             # shadcn/ui components
    │   ├── core/           # Core application components
    │   └── features/       # Feature-specific components
    ├── pages/
    │   ├── ColorTransfer.tsx
    │   ├── Dashboard.tsx
    │   └── ModelTraining.tsx
    ├── hooks/
    ├── services/
    ├── styles/
    └── utils/
```

## `packages/schemas` (Shared Database Schemas)

Modularized Drizzle ORM schemas.

```
packages/schemas/
└── src/
    ├── index.ts
    ├── core.ts
    ├── auth.ts
    ├── security.ts
    ├── backup.ts
    ├── analytics.ts
    ├── api-management.ts
    ├── energy.ts
    ├── ai-training.ts
    ├── ai-testing.ts
    ├── ai-models.ts
    ├── ai-evaluation.ts
    ├── ai-analysis.ts
    ├── site-analysis.ts
    ├── ux-features.ts
    └── metadata.ts
```

## `packages/contracts` (Shared API Contracts)

Zod schemas for API request/response validation.

```
packages/contracts/
└── src/
    ├── index.ts
    ├── color-transfer.ts
    ├── training.ts
    └── user.ts
```

## `services/python-color` (Python FastAPI Service)

The long-running Python service for ML tasks.

```
services/python-color/
└── app/
    ├── main.py             # FastAPI entry point
    ├── requirements.txt
    ├── schemas.py          # Pydantic models
    ├── models.py           # ML model loading and management
    ├── color_transfer.py   # Unified color transfer logic
    └── training.py         # Training logic
```

## `infra` (Infrastructure)

Deployment and infrastructure configurations.

```
infra/
├── docker/
│   ├── Dockerfile.api
│   └── Dockerfile.python-color
├── compose.yaml
└── k8s/
    ├── api-deployment.yaml
    └── python-service-deployment.yaml
```

## `tests` (Testing)

Integration and security tests.

```
tests/
├── integration/
│   ├── color-transfer.test.ts
│   └── training.test.ts
└── security/
    └── injection.test.ts
```
