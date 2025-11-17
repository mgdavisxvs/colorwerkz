# Unified Project Structure for ColorWerkz

This document outlines the target file structure for the ColorWerkz project, consolidating the fragmented components into a monorepo architecture. This structure is based on the recommendations from the "Refactoring & System Migration Report (RSR)".

## High-Level Overview

The project is organized as a monorepo with distinct packages for different concerns:

- **`apps/`**: Contains the user-facing applications, specifically the web frontend and the Node.js API server.
- **`packages/`**: Houses shared code, such as configuration, UI components, and database schemas, used across different applications.
- **`services/`**: Contains backend services that are not directly user-facing, like the Python-based machine learning service.

```
.
├── apps
│   ├── api/                  # Node.js/Express API
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/         # Consolidated routes (21 files)
│   │   │   │   ├── auth.ts
│   │   │   │   ├── color-transfer.ts
│   │   │   │   ├── manufacturing.ts
│   │   │   │   ├── models.ts
│   │   │   │   ├── training.ts
│   │   │   │   └── ...
│   │   │   └── services/       # Clients for external services
│   │   │       └── python-service.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                  # React Frontend
│       ├── src/
│       │   ├── components/     # Reusable UI components (shadcn/ui)
│       │   ├── features/       # Feature-based modules
│       │   │   ├── color-transfer/
│       │   │   ├── model-management/
│       │   │   └── ...
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── package.json
│       └── vite.config.ts
├── packages
│   ├── shared-schemas/       # Modularized database schemas
│   │   ├── src/
│   │   │   ├── index.ts      # Re-exports all schemas
│   │   │   ├── ai-evaluation.ts
│   │   │   ├── ai-models.ts
│   │   │   ├── ai-training.ts
│   │   │   ├── auth.ts
│   │   │   ├── core.ts
│   │   │   └── ... (17 total modules)
│   │   └── package.json
│   ├── ui/                   # Shared React components
│   │   ├── src/
│   │   │   ├── button.tsx
│   │   │   └── ...
│   │   └── package.json
│   └── config/               # Shared configuration (ESLint, Prettier)
│       ├── eslint-preset.js
│       └── package.json
├── services
│   └── python-service/       # Python FastAPI service
│       ├── app/
│       │   ├── main.py       # FastAPI app definition
│       │   ├── api/          # API endpoints
│       │   │   ├── color_transfer.py
│       │   │   └── training.py
│       │   ├── core/         # Core logic and models
│       │   │   ├── unet_model.py
│       │   │   └── color.py
│       │   └── schemas.py    # Pydantic schemas
│       ├── models/           # Trained ML models
│       │   └── unet_ral_v1.pth
│       ├── requirements.txt
│       └── Dockerfile
├── .gitignore
├── package.json              # Root package.json for monorepo management (e.g., using workspaces)
└── README.md
```

## Detailed Breakdown

### `apps/api`
- **Purpose**: The main backend API gateway, built with Node.js and Express.
- **Key Changes**:
    - **Route Consolidation**: Reduces 46 route files to 21, organized by domain. For example, all color transfer logic is now in `routes/color-transfer.ts`.
    - **Python Integration**: Instead of `exec` calls, it will communicate with the `python-service` via HTTP requests using a dedicated client in `services/python-service.ts`.

### `apps/web`
- **Purpose**: The main frontend application, built with React and Vite.
- **Key Changes**:
    - **Component-Based**: Follows a standard React project structure.
    - **Shared UI**: Will consume shared components from the `packages/ui` library.
    - **Typed API**: Will benefit from the modular schemas in `packages/shared-schemas` for type-safe data exchange with the API.

### `packages/shared-schemas`
- **Purpose**: To solve the schema monolith problem.
- **Key Changes**:
    - **Modularization**: The single 4,337-line schema file is broken down into 17 domain-specific modules (e.g., `auth.ts`, `ai-training.ts`).
    - **Bundle Size Reduction**: Frontend pages will only import the schemas they need, drastically reducing bundle size.
    - **Type Safety**: Provides consistent, typed data structures across the entire stack.

### `services/python-service`
- **Purpose**: A dedicated, long-running Python service for all computationally intensive tasks.
- **Key Changes**:
    - **Technology**: Built with FastAPI for high performance.
    - **Clean Boundary**: Eliminates insecure and inefficient `spawn` or `exec` calls from the Node.js backend. The boundary is now a clean HTTP API.
    - **Efficiency**: Machine learning models (like the PyTorch U-Net) are loaded once at startup, eliminating cold-start delays for each request.
    - **Consolidation**: All Python logic for color transfer, model training, and inference is consolidated here.

This structure provides a scalable and maintainable foundation for the future development of ColorWerkz.
