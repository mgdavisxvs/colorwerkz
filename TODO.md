# ColorWerkz Refactoring Task List - Expanded

This document provides a highly detailed, actionable breakdown of the Refactoring & System Migration Report (RSR). It is designed to be a comprehensive guide for the development team, with granular steps, validation criteria, and explicit goals for each phase of the migration. Each task is cross-referenced with the corresponding requirements from the Software Requirements Specification (SRS).

## Phase 1: Critical Security & ML Fixes (Week 1)

**Goal:** Eliminate critical security vulnerabilities, unblock the primary machine learning pipeline, and implement high-impact foundational improvements. This phase is essential for making the application safe, trainable, and observable.

### Security Remediation (Days 1-2)
- [ ] **Task 1.1: Remediate Command Injection Vulnerabilities.**
  - **Objective:** Replace all instances of `execAsync` with `child_process.spawn` to prevent shell command injection. **(Addresses SRS: NFR-007)**
  - [ ] **1.1.1: Audit & Document:**
    - [ ] Run a global search for `execAsync` in the codebase to confirm all 90+ instances across the 20 affected route files.
    - [ ] Create a temporary checklist (`/tmp/execAsync_remediation_checklist.md`) to track the replacement of each instance.
  - [ ] **1.1.2: Implement `spawn` Wrapper:**
    - [ ] Create a utility function `executePythonScript(scriptPath, args)` in `server/lib/safer-spawn.ts` that encapsulates `child_process.spawn`.
    - [ ] This wrapper must handle argument serialization, error handling (listening on `stderr`), and data parsing from `stdout`.
  - [ ] **1.1.3: Systematic Replacement:**
    - [ ] Go through the checklist and replace every `execAsync` call with the new `executePythonScript` utility.
    - [ ] Ensure all script arguments are passed as an array to the `args` parameter.
  - [ ] **1.1.4: Validation:**
    - [ ] Create a new integration test file: `tests/security/command-injection.test.ts`.
    - [ ] The test should send a malicious payload (e.g., `image.jpg; rm -rf /`) as a parameter to an affected endpoint.
    - [ ] Assert that the API rejects the request with a `400 Bad Request` status and that the malicious command is not executed.

- [ ] **Task 1.2: Remove Exposed Test Stubs from Production.**
  - **Objective:** Isolate testing utilities from the production application bundle. **(Addresses SRS: NFR-011)**
  - [ ] **1.2.1: Relocate File:**
    - [ ] Move the file `server/routes/ai-testing-storage-stubs.ts` to `tests/fixtures/ai-testing-stubs.ts`.
  - [ ] **1.2.2: Update Imports:**
    - [ ] Perform a codebase-wide search for `ai-testing-storage-stubs` and update all import paths in test files to point to the new location.
  - [ ] **1.2.3: Prevent Future Issues:**
    - [ ] Add a rule to the ESLint configuration (`.eslintrc.js`) that forbids imports from the `tests/` directory within the `server/` directory.
    - [ ] Run `npm run lint -- --fix` to verify the new rule catches any invalid imports.

- [ ] **Task 1.3: Consolidate Duplicate WebSocket Route Files.**
  - **Objective:** Eliminate redundant code by merging two WebSocket route files. **(Addresses SRS: NFR-018, NFR-020)**
  - [ ] **1.3.1: Analysis:**
    - [ ] Use `git log --follow manufacturing_websocket_routes.ts manufacturing_websocket.ts` to compare the history and identify the canonical version.
    - [ ] Document the findings and the file to be deleted in the commit message.
  - [ ] **1.3.2: Deletion & Refactoring:**
    - [ ] Delete the redundant file (e.g., `manufacturing_websocket.ts`).
    - [ ] Ensure the main WebSocket server setup correctly imports the remaining file.
  - [ ] **1.3.3: Validation:**
    - [ ] Manually test WebSocket connections and event handling.
    - [ ] Run the full integration test suite (`npm test`) to confirm no regressions in real-time functionality.

### ML Pipeline Unblocking (Day 3)
- [ ] **Task 1.4: Fix Pseudo-Label Generation Bug.**
  - **Objective:** Correct the color transfer logic to enable accurate lightness channel (`L*`) processing. **(Addresses SRS: FR-033, FR-032)**
  - [ ] **1.4.1: Isolate the Bug:**
    - [ ] Write a small Python script (`tests/validation/test_color_transfer_channels.py`) that uses a sample image and drawer color to reproduce the incorrect lightness transfer.
  - [ ] **1.4.2: Implement the Fix:**
    - [ ] In `server/synthetic_ral_dataset.py` (lines 224-226), modify the line `result_lab[drawer_pixels, 1:] = drawer_lab[1:]` to `result_lab[drawer_pixels, :] = drawer_lab`.
  - [ ] **1.4.3: Validate the Fix:**
    - [ ] Run the new validation script and assert that the output image's LAB values in the target region match the source drawer's LAB values across all three channels.
    - [ ] Run the full `test_synthetic_ral_pipeline.py` script and confirm that the potential Delta E is now below 2.0.

### High-Impact Quick Wins (Days 4-5)
- [ ] **Task 1.5: Implement Structured Logging.**
  - **Objective:** Replace all `console.log` calls with a centralized, structured logger. **(Addresses SRS: NFR-022)**
  - [ ] **1.5.1: Setup Winston:**
    - [ ] `npm install winston`
    - [ ] Create `server/services/logger.ts` and configure a Winston logger instance. The logger should output JSON-formatted logs, including a timestamp, log level, message, and a `meta` object.
  - [ ] **1.5.2: Replace Console Logs:**
    - [ ] Use a regex search (`console\.(log|error|warn|info)`) to find all instances.
    - [ ] Replace them with structured calls: `logger.info('Message', { ...metadata })`, `logger.error('Error', { error: err.stack })`.
  - [ ] **1.5.3: Verification:**
    - [ ] Run the application and trigger a few API calls.
    - [ ] Check the console output to ensure logs are in the correct JSON format.

- [ ] **Task 1.6: Cache RAL Color Database.**
  - **Objective:** Load the RAL color database into memory at startup to reduce file I/O. **(Addresses SRS: NFR-001)**
  - [ ] **1.6.1: Create Cache Service:**
    - [ ] Create a singleton class `RALColorCache` in `server/services/ral-cache.ts`.
    - [ ] Implement a `load()` method that reads `ral_colors.json` and an asynchronous `getInstance()` method that ensures the data is loaded before the cache is used.
  - [ ] **1.6.2: Refactor Lookups:**
    - [ ] Replace all direct filesystem reads of `ral_colors.json` with calls to `RALColorCache.getInstance().getColor(ralCode)`.
  - [ ] **1.6.3: Validation:**
    - [ ] Add logging to the `load()` method to confirm it runs only once on application startup.
    - [ ] Run performance tests on a relevant endpoint to measure the reduction in response time.

- [ ] **Task 1.7: Add Request ID Tracing.**
  - **Objective:** Implement request tracing for improved debugging and observability. **(Addresses SRS: NFR-022, NFR-018)**
  - [ ] **1.7.1: Create Middleware:**
    - [ ] `npm install uuid`
    - [ ] Create a middleware in `server/middleware/request-id.ts` that generates a UUID v4 for each incoming request.
    - [ ] Attach the ID to the request object (e.g., `req.id = uuid()`) and set the `X-Request-ID` response header.
  - [ ] **1.7.2: Integrate with Logger:**
    - [ ] Modify the logger service to accept the request ID and include it in all log outputs for that request's lifecycle.
  - [ ] **1.7.3: Propagate to Python:**
    - [ ] Update the `executePythonScript` wrapper to pass the request ID as an argument to all Python scripts.
    - [ ] Modify Python scripts to accept and log this ID.

## Phase 2: Algorithm Migration & ML Training (Weeks 2-4)

**Goal:** Train the PyTorch U-Net model to achieve manufacturing-grade color accuracy (Delta E < 2.0) and begin a safe, phased rollout to production.

- [ ] **Task 2.1: Prepare the Full Training Dataset.**
  - **Objective:** Generate and validate the complete dataset required for training the production model. **(Addresses SRS: FR-031, FR-032)**
  - [ ] **2.1.1: Generate Manifest:**
    - [ ] Run `python3 server/synthetic_ral_manifest_generator.py --num-products 202 --output-dir data/manifests`.
    - [ ] Verify that the manifest file contains exactly 39,592 entries.
  - [ ] **2.1.2: Validate Dataset:**
    - [ ] Run `python3 server/synthetic_ral_dataset.py --manifest data/manifests/full_manifest.json --validate-only`.
    - [ ] Check the output for any errors related to missing images or incorrect labels.

- [ ] **Task 2.2: Train the PyTorch U-Net Model.**
  - **Objective:** Execute the training process to produce a model that meets the required accuracy. **(Addresses SRS: FR-032)**
  - [ ] **2.2.1: Environment Setup:**
    - [ ] Provision a cloud GPU instance (e.g., AWS g4dn.xlarge) with CUDA drivers and PyTorch installed.
    - [ ] Clone the repository and install Python dependencies from `requirements.txt`.
  - [ ] **2.2.2: Execute Training:**
    - [ ] Run the training script: `python3 server/train_unet_synthetic_ral.py --epochs 30 --batch-size 16 --learning-rate 1e-4 --gpu 0`.
    - [ ] Pipe the output to a log file for later analysis: `... > training_run_$(date +%s).log`.
  - [ ] **2.2.3: Monitor Progress:**
    - [ ] Periodically check the log file for validation metrics.
    - [ ] **Checkpoint:** At epoch 10, Delta E should be < 10.0.
    - [ ] **Checkpoint:** At epoch 20, Delta E should be < 5.0.

- [ ] **Task 2.3: Validate and Deploy the Trained Model.**
  - **Objective:** Verify the trained model's performance and deploy it for production use. **(Addresses SRS: FR-032)**
  - [ ] **2.3.1: Quantitative Validation:**
    - [ ] Run the evaluation script against a holdout test set: `python3 server/evaluate_model.py --model models/unet_ral_v1.pth --test-set data/manifests/test_set.json`.
    - [ ] The script must confirm that **Delta E < 2.0 on at least 95%** of the validation images.
  - [ ] **2.3.2: Qualitative Validation:**
    - [ ] Manually review a sample of 20-30 output images to check for visual artifacts or color bleeding.
  - [ ] **2.3.3: Deploy Model:**
    - [ ] If validation passes, copy the trained model (`unet_ral_v1.pth`) to the production models directory (`server/python_service/models/`).

- [ ] **Task 2.4: Implement A/B Testing for Algorithm Rollout.**
  - **Objective:** Safely roll out the new model by gradually shifting traffic and monitoring performance. **(Addresses SRS: NFR-004, NFR-013)**
  - [ ] **2.4.1: Implement Feature Flag:**
    - [ ] In the color transfer route handler, add logic to read a configuration variable (e.g., `PYTORCH_ROLLOUT_PERCENTAGE`).
    - [ ] Use this variable to direct a percentage of traffic to the new PyTorch model. A simple `Math.random() < percentage` will suffice initially.
  - [ ] **2.4.2: Add Comparative Logging:**
    - [ ] Log the performance (response time) and accuracy (Delta E) for both the old OpenCV baseline and the new PyTorch model on every request.
    - [ ] Include an `algorithm` field in the log entry (`opencv` or `pytorch`).
  - [ ] **2.4.3: Gradual Rollout:**
    - [ ] Start with `PYTORCH_ROLLOUT_PERCENTAGE=0.1` (10%).
    - [ ] Monitor logs and dashboards for a day before increasing to 25%, 50%, and finally 100%.

## Phase 3: Route Consolidation (Weeks 5-8)

**Goal:** Refactor the fragmented API by consolidating 46 route files into 21, improving maintainability, discoverability, and developer experience.

- [ ] **Task 3.1: Consolidate the 8 Color Transfer Routes.**
  - **Objective:** Create a single, unified endpoint for all color transfer operations. **(Addresses SRS: FR-035, FR-037, NFR-020)**
  - [ ] **3.1.1: Create New V2 Endpoint:**
    - [ ] Create `server/routes/v2/color-transfer.ts`.
    - [ ] Define a new endpoint `/api/v2/color-transfer` that accepts a `method` field in the request body (`"opencv"`, `"pytorch"`, `"i2i"`).
  - [ ] **3.1.2: Deprecate Old Routes:**
    - [ ] Add middleware to the 8 old color transfer routes.
    - [ ] The middleware should log a deprecation warning and add `X-Deprecated-API: This endpoint is deprecated. Please use /api/v2/color-transfer.` and `X-Sunset: 2026-01-01` headers to the responses.
  - [ ] **3.1.3: Update Frontend:**
    - [ ] Refactor the frontend to use the new V2 endpoint.

- [ ] **Task 3.2: Merge "Enhanced" Routes.**
  - **Objective:** Merge "enhanced" route variants into their base counterparts to reduce redundancy. **(Addresses SRS: FR-036, NFR-020)**
  - [ ] **3.2.1: Merge Logic:**
    - [ ] For each pair of `*.ts` and `enhanced-*.ts` files, merge the logic into the base file (e.g., `manufacturing_api.ts`).
    - [ ] Use a query parameter (e.g., `?version=enhanced`) or an API versioning scheme to differentiate logic paths.
  - [ ] **3.2.2: Delete Redundant Files:**
    - [ ] After merging and testing, delete the `enhanced-*.ts` files.

- [ ] **Task 3.3: Consolidate Remaining Domains.**
  - **Objective:** Group related route files into logical, domain-based modules. **(Addresses SRS: FR-035, NFR-020)**
  - [ ] **3.3.1: AI Training Routes:** Merge 7 files into `training.ts` and `training-monitor.ts`.
  - [ ] **3.3.2: Performance/Analytics Routes:** Merge 6 files into `performance.ts` and `analytics.ts`.
  - [ ] **3.3.3: Image Processing Routes:** Merge 4 files into `image-processing.ts`.

- [ ] **Task 3.4: Create Shared Middleware.**
  - **Objective:** Extract common request handling logic into reusable middleware to reduce code duplication. **(Addresses SRS: NFR-018)**
  - [ ] **3.4.1: Identify Common Logic:**
    - [ ] Review the consolidated routes and identify repeated logic for image upload handling (e.g., using `multer`), request body validation (e.g., using `zod`), and error formatting.
  - [ ] **3.4.2: Extract to Middleware:**
    - [ ] Create `server/middleware/image-upload.ts`, `server/middleware/validate-request.ts`, and `server/middleware/error-handler.ts`.
    - [ ] Refactor the routes to use these new, shared middleware functions.

## Phase 4: Schema Modularization (Weeks 9-12)

**Goal:** Decompose the 4,337-line monolithic `schema.ts` into 17 maintainable, domain-specific modules for improved code ownership and clarity.

- [ ] **Task 4.1: Create the New Schema Directory Structure.**
  - **Objective:** Set up the new directory structure for the modularized schemas. **(Addresses SRS: FR-038, NFR-018)**
  - [ ] `mkdir -p packages/db/src/schema`
  - [ ] `touch packages/db/src/schema/{auth,energy,ai-training,core,manufacturing,...}.ts` (all 17 files).

- [ ] **Task 4.2: Migrate Schemas Domain by Domain.**
  - **Objective:** Systematically move schema definitions from the monolith to the new domain-specific files. **(Addresses SRS: FR-038, FR-040)**
  - [ ] **4.2.1: Migration Order:**
    - [ ] Start with `core.ts` (foundational types like users, organizations).
    - [ ] Proceed to `auth.ts` (sessions, accounts).
    - [ ] Continue with independent modules before tackling those with many cross-domain dependencies.
  - [ ] **4.2.2: Refactoring Process:**
    - [ ] Cut tables and types from `packages/db/src/schema.ts` and paste them into their new domain files.
    - [ ] Update import statements for foreign key references (e.g., `import { users } from './core'`).

- [ ] **Task 4.3: Implement Backward Compatibility Shim.**
  - **Objective:** Create a temporary "barrel" file to avoid breaking existing imports during the transition. **(Addresses SRS: FR-039)**
  - [ ] **4.3.1: Create Barrel File:**
    - [ ] In `packages/db/src/schema/index.ts`, add `export * from './auth';`, `export * from './energy';`, etc., for all 17 modules.
  - [ ] **4.3.2: Deprecate Old Schema:**
    - [ ] Clear the contents of the old `packages/db/src/schema.ts`.
    - [ ] Add the following content:
      ```typescript
      /**
       * @deprecated This file is deprecated and will be removed in a future version.
       * Please import directly from the specific schema modules in `packages/db/src/schema/*`.
       */
      export * from './schema/index';
      ```

- [ ] **Task 4.4: Update All Codebase Imports.**
  - **Objective:** Refactor the entire codebase to use the new, modular schema imports. **(Addresses SRS: FR-040, NFR-021)**
  - [ ] **4.4.1: Automated Refactoring:**
    - [ ] Use `jscodeshift` or a similar codemod tool with a script to automatically update all import statements.
    - [ ] The script should transform `from '@shared/schema'` to `from '@shared/schemas/auth'` (or the correct module).
  - [ ] **4.4.2: Manual Verification:**
    - [ ] After running the script, perform a global search for the old import path to catch any misses.
    - [ ] Run the type checker (`tsc`) to ensure all types resolve correctly.

## Phase 5: Python Service Migration (Weeks 13-16)

**Goal:** Replace the inefficient and insecure process-spawning pattern with a high-performance, long-running Python service managed via a TypeScript client.

- [ ] **Task 5.1: Develop the Python FastAPI Service.**
  - **Objective:** Build a dedicated microservice for all AI/ML processing. **(Addresses SRS: FR-042, FR-043)**
  - [ ] **5.1.1: Scaffolding:**
    - [ ] `mkdir -p services/ai-service/app`
    - [ ] Create a `main.py` with a basic FastAPI app instance.
    - [ ] Define API endpoints (`/color-transfer`, `/training/start`) using routers.
    - [ ] Use Pydantic models in `app/models.py` for robust request/response validation.
  - [ ] **5.1.2: Model Loading:**
    - [ ] Implement application startup logic (`@app.on_event("startup")`) to load the PyTorch and other ML models into memory.

- [ ] **Task 5.2: Create a TypeScript Client for the Python Service.**
  - **Objective:** Develop a client in the Node.js backend to communicate with the new Python service. **(Addresses SRS: FR-043)**
  - [ ] **5.2.1: Client Implementation:**
    - [ ] `npm install axios`
    - [ ] In `apps/api/src/services/ai-service-client.ts`, create a `AIServiceClient` class.
    - [ ] Implement methods like `getColorTransfer(data)` that wrap `axios` calls to the FastAPI service.
    - [ ] Include error handling, retry logic (e.g., using `axios-retry`), and request tracing propagation.

- [ ] **Task 5.3: Containerize and Deploy the Python Service.**
  - **Objective:** Package the Python service for production deployment. **(Addresses SRS: FR-012, FR-013)**
  - [ ] **5.3.1: Dockerize:**
    - [ ] Write a `services/ai-service/Dockerfile` that installs dependencies from `requirements.txt` and runs the app with `uvicorn`.
  - [ ] **5.3.2: Orchestrate:**
    - [ ] Add the new Python service to the project's `docker-compose.yml`.
    - [ ] Ensure it's on the same Docker network as the Node.js API service to allow for direct communication.

- [ ] **Task 5.4: Migrate Routes to Use the Service.**
  - **Objective:** Transition all AI/ML-related routes from spawning processes to calling the new service. **(Addresses SRS: FR-041, FR-042, NFR-004)**
  - [ ] **5.4.1: Refactor Routes:**
    - [ ] In the Node.js route handlers (starting with `color-transfer.ts`), replace `spawn` calls with the new `AIServiceClient`.
  - [ ] **5.4.2: Progressive Rollout:**
    - [ ] Use the same feature flag/percentage-based rollout strategy from Task 2.4 to migrate traffic from the `spawn` method to the new FastAPI service.
    - [ ] Monitor performance, error rates, and resource utilization (CPU, memory) of both the Node.js and Python services during the rollout.
    - [ ] Once 100% of traffic is migrated, remove the old `spawn` logic and the feature flag.
