# Implementation Guide: Route Consolidation (46 → 21 Files)

**Priority:** 🟡 MEDIUM
**Effort:** 4 weeks (phased migration)
**Impact:** 54% reduction in route surface area, 40% reduction in maintenance cost
**Status:** Ready to Implement

---

## Executive Summary

ColorWerkz currently has **46 route files** with extreme fragmentation:
- **8 color transfer routes** (should be 1)
- **7 AI training routes** (should be 2)
- **4 model management routes** (should be 1)
- **6 performance/analytics routes** (should be 2)
- Duplicated error handling, validation, and Python execution logic across all files

**Target:** Consolidate to **21 route files** (12 core domain + 9 infrastructure)

**Strategy:** Phased migration with parallel API versioning to maintain backward compatibility

---

## Current State Analysis

### Route Inventory

```
server/routes/
├── Color Transfer (8 files - MASSIVE OVERLAP)
│   ├── color-transfer.ts (1,032 lines) ⭐ Primary
│   ├── enhanced-color-transfer.ts (343 lines)
│   ├── ai-enhanced-color.ts (406 lines)
│   ├── i2i-transfer.ts (560 lines)
│   ├── direct-i2i.ts
│   ├── opencv-baseline.ts
│   ├── pytorch-enhanced.ts
│   └── image-optimization.ts
│
├── Manufacturing (3 files - CLEAR DUPLICATION)
│   ├── manufacturing_api.ts
│   ├── enhanced_manufacturing_api.ts
│   └── manufacturing_websocket.ts (2 files with same name!)
│
├── AI Training (7 files - SHOULD BE 2)
│   ├── ai-training.ts
│   ├── ai-training-runner.ts
│   ├── ai-feature-testing.ts
│   ├── ai-testing-storage-stubs.ts ⚠️ Test stubs in production!
│   ├── ai-optimization.ts
│   ├── ai-status.ts
│   └── training.ts
│
├── Model Management (4 files - OVERLAP)
│   ├── model-management.ts
│   ├── enhanced-model-management.ts
│   ├── model-export.ts
│   └── model-info.ts
│
├── Performance/Analytics (6 files - 4 "performance" routes!)
│   ├── performance.ts
│   ├── performance-metrics.ts
│   ├── performance-monitoring.ts
│   ├── performance-optimization.ts
│   ├── analytics.ts
│   └── analytics-dashboard.ts
│
├── Image Processing (4 files)
│   ├── image-analysis.ts
│   ├── annotation.ts
│   ├── batch-processor.ts
│   └── upload.ts
│
├── Evaluation (3 files - REDUNDANT)
│   ├── validation.ts
│   ├── evaluation-metrics.ts
│   └── enhanced-evaluation.ts
│
├── Site Analysis (2 files)
│   ├── site-analysis.ts
│   └── site-analysis-simple.ts
│
└── Infrastructure (9 files - KEEP AS-IS) ✅
    ├── auth.ts
    ├── backup.ts
    ├── security.ts
    ├── api-keys.ts
    ├── health.ts
    ├── monitoring.ts
    └── energy-ledger.ts

Total: 46 files, ~20,053 lines of code
```

### Duplication Patterns

**Pattern 1: "Enhanced" Files (5 instances)**
```typescript
// Original
color-transfer.ts
model-management.ts
evaluation-metrics.ts
manufacturing_api.ts

// "Enhanced" duplicates
enhanced-color-transfer.ts
enhanced-model-management.ts
enhanced-evaluation.ts
enhanced_manufacturing_api.ts
```

**Pattern 2: Technology-Specific Routes**
```typescript
// Bad: Routes organized by implementation detail
opencv-baseline.ts
pytorch-enhanced.ts
i2i-transfer.ts

// Good: Single route with method parameter
color-transfer.ts?method=opencv|pytorch|i2i
```

**Pattern 3: Inconsistent Error Handling**
```typescript
// color-transfer.ts
throw new ApiError(500, "Unified processing failed", "UNIFIED_ERROR");

// enhanced-color-transfer.ts
throw new ApiError("Failed to parse Python output", 500); // Wrong param order!

// i2i-transfer.ts
res.status(500).json({ status: 'error', message: '...' }); // No ApiError class
```

---

## Target Architecture

### Target Route Structure (21 files)

```
server/routes/
├── Core Domain Routes (12 files)
│   ├── color-transfer.ts           ← Merge 8 files
│   ├── manufacturing.ts            ← Merge 2 files
│   ├── manufacturing-ws.ts         ← WebSocket only
│   ├── training.ts                 ← Merge 7 files
│   ├── training-monitor.ts         ← Real-time progress
│   ├── models.ts                   ← Merge 4 files
│   ├── performance.ts              ← Merge 4 files
│   ├── analytics.ts                ← Merge 2 files
│   ├── image-processing.ts         ← Merge 3 files
│   ├── evaluation.ts               ← Merge 3 files
│   ├── site-analysis.ts            ← Merge 2 files
│   └── upload.ts                   ← Keep (shared)
│
└── Infrastructure Routes (9 files - unchanged)
    ├── auth.ts
    ├── backup.ts
    ├── security.ts
    ├── api-keys.ts
    ├── health.ts
    ├── monitoring.ts
    └── energy-ledger.ts

Total: 21 files, ~18,000 lines (10% reduction from cleanup)
```

---

## Phase 1: Color Transfer Consolidation (Week 1)

### Goals
- Merge 8 color transfer routes into 1
- Extract shared validation middleware
- Implement method-based routing
- Deprecate old endpoints with migration path

### Step 1.1: Create Unified Route (Day 1)

**File:** `server/routes/v2/color-transfer.ts`

```typescript
import { Router, Request, Response } from 'express';
import { imageUpload } from '../middleware/image-upload';
import { validateColorTransferRequest } from '../middleware/validation';
import { ColorTransferService } from '../services/color-transfer-service';

const router = Router();
const service = new ColorTransferService();

/**
 * POST /api/v2/color-transfer
 * Unified color transfer endpoint with method selection
 */
router.post(
  '/api/v2/color-transfer',
  imageUpload.single('image'),
  validateColorTransferRequest,
  async (req: Request, res: Response) => {
    try {
      const { method = 'production', target_colors, options = {} } = req.body;

      // Route to appropriate handler based on method
      const result = await service.transfer({
        image: req.file,
        method: method as ColorTransferMethod,
        targetColors: target_colors,
        options
      });

      res.json({
        status: 'success',
        data: {
          image: result.transformedImage,
          delta_e: result.deltaE,
          processing_time: result.processingTime,
          manufacturing_ready: result.deltaE < 2.0,
          method_used: result.methodUsed
        },
        metadata: {
          timestamp: new Date().toISOString(),
          api_version: 'v2'
        }
      });
    } catch (error) {
      handleColorTransferError(error, res);
    }
  }
);

/**
 * POST /api/v2/color-transfer/batch
 * Batch processing with optimized batching
 */
router.post(
  '/api/v2/color-transfer/batch',
  imageUpload.array('images', 50),
  validateBatchRequest,
  async (req: Request, res: Response) => {
    try {
      const images = req.files as Express.Multer.File[];
      const { method, target_colors, options = {} } = req.body;

      // Optimize batch sizes with bin packing
      const batches = service.optimizeBatches(images, GPU_MEMORY_LIMIT);

      const results = await service.transferBatch({
        batches,
        method: method as ColorTransferMethod,
        targetColors: target_colors,
        options
      });

      res.json({
        status: 'success',
        data: {
          results: results.map(r => ({
            image_id: r.imageId,
            transformed_image: r.transformedImage,
            delta_e: r.deltaE,
            manufacturing_ready: r.deltaE < 2.0
          })),
          summary: {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            mean_delta_e: calculateMean(results.map(r => r.deltaE)),
            total_processing_time: results.reduce((sum, r) => sum + r.processingTime, 0)
          }
        }
      });
    } catch (error) {
      handleColorTransferError(error, res);
    }
  }
);

export default router;
```

### Step 1.2: Create Service Layer (Day 1-2)

**File:** `server/services/color-transfer-service.ts`

```typescript
import { PythonExecutor } from './python-executor';
import { ONNXRuntime } from './onnx-runtime';

export type ColorTransferMethod =
  | 'production'   // PyTorch U-Net (trained, Delta E < 2.0)
  | 'pytorch'      // Same as production
  | 'opencv'       // Legacy baseline (fast, inaccurate)
  | 'i2i'          // Image-to-image GAN
  | 'fast'         // Alias for opencv
  | 'accurate';    // Alias for production

export class ColorTransferService {
  private pythonExecutor: PythonExecutor;
  private onnxRuntime: ONNXRuntime;

  constructor() {
    this.pythonExecutor = new PythonExecutor();
    this.onnxRuntime = new ONNXRuntime('models/unet_production.onnx');
  }

  async transfer(params: TransferParams): Promise<TransferResult> {
    const { image, method, targetColors, options } = params;

    // Select handler based on method
    switch (method) {
      case 'production':
      case 'pytorch':
      case 'accurate':
        return await this.pytorchHandler(image, targetColors, options);

      case 'opencv':
      case 'fast':
        return await this.opencvHandler(image, targetColors, options);

      case 'i2i':
        return await this.i2iHandler(image, targetColors, options);

      default:
        throw new ApiError(400, `Unknown method: ${method}`, 'INVALID_METHOD');
    }
  }

  private async pytorchHandler(
    image: Express.Multer.File,
    targetColors: TargetColors,
    options: TransferOptions
  ): Promise<TransferResult> {
    const startTime = performance.now();

    // Load and preprocess image
    const tensor = await this.preprocessImage(image.path);

    // Run ONNX inference
    const mask = await this.onnxRuntime.run(tensor);

    // Apply color transfer using mask
    const transferred = await this.applyColorFromMask(
      image.path,
      mask,
      targetColors
    );

    // Compute quality metrics
    const deltaE = await this.computeDeltaE(transferred, targetColors);

    const processingTime = performance.now() - startTime;

    return {
      transformedImage: transferred,
      deltaE,
      processingTime,
      methodUsed: 'pytorch',
      success: true
    };
  }

  private async opencvHandler(
    image: Express.Multer.File,
    targetColors: TargetColors,
    options: TransferOptions
  ): Promise<TransferResult> {
    const startTime = performance.now();

    // Execute Python OpenCV script
    const result = await this.pythonExecutor.execute(
      'opencv_baseline.py',
      {
        source_image: image.path,
        frame_color: targetColors.frame,
        drawer_color: targetColors.drawer
      },
      { timeout: 30000 }
    );

    const processingTime = performance.now() - startTime;

    return {
      transformedImage: result.output_image,
      deltaE: result.delta_e || 999,  // OpenCV doesn't meet spec
      processingTime,
      methodUsed: 'opencv',
      success: true
    };
  }

  private async i2iHandler(
    image: Express.Multer.File,
    targetColors: TargetColors,
    options: TransferOptions
  ): Promise<TransferResult> {
    // Implementation for image-to-image GAN
    // ... similar pattern ...
  }

  async transferBatch(params: BatchTransferParams): Promise<TransferResult[]> {
    const results: TransferResult[] = [];

    for (const batch of params.batches) {
      const batchResults = await Promise.all(
        batch.map(image =>
          this.transfer({
            image,
            method: params.method,
            targetColors: params.targetColors,
            options: params.options
          }).catch(error => ({
            transformedImage: null,
            deltaE: 999,
            processingTime: 0,
            methodUsed: params.method,
            success: false,
            error: error.message
          }))
        )
      );

      results.push(...batchResults);
    }

    return results;
  }

  optimizeBatches(
    images: Express.Multer.File[],
    gpuMemory: number
  ): Express.Multer.File[][] {
    // First-Fit Decreasing bin packing
    const sorted = images.sort((a, b) => b.size - a.size);

    const batches: { images: Express.Multer.File[]; size: number }[] = [];

    for (const img of sorted) {
      const imgMemory = this.estimateImageMemory(img);

      // Find first batch with room
      let placed = false;
      for (const batch of batches) {
        if (batch.size + imgMemory <= gpuMemory) {
          batch.images.push(img);
          batch.size += imgMemory;
          placed = true;
          break;
        }
      }

      // Create new batch if needed
      if (!placed) {
        batches.push({ images: [img], size: imgMemory });
      }
    }

    return batches.map(b => b.images);
  }

  private estimateImageMemory(image: Express.Multer.File): number {
    // Estimate GPU memory for image + activations
    const pixels = 512 * 512;  // Assuming resize to 512×512
    const inputMem = pixels * 3 * 4;  // RGB float32
    const activationMem = inputMem * 50;  // U-Net activations (empirical)
    return inputMem + activationMem;
  }
}
```

### Step 1.3: Extract Shared Middleware (Day 2)

**File:** `server/middleware/image-upload.ts`

```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/colorwerkz/uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

// Ensure upload directory exists
(async () => {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
})();

export const imageUpload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 50  // Max for batch processing
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(
        400,
        `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
        'INVALID_FILE_TYPE'
      ));
    }
  }
});
```

**File:** `server/middleware/validation.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';

const RAL_COLORS = [
  'RAL 1013', 'RAL 3004', 'RAL 5010', 'RAL 5015', 'RAL 6011',
  'RAL 7016', 'RAL 7024', 'RAL 7035', 'RAL 9002', 'RAL 9005',
  'RAL 9006', 'RAL 9010', 'RAL 9011', 'RAL 9016'
];

export function validateColorTransferRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { target_colors, method } = req.body;

  // Check file uploaded
  if (!req.file) {
    throw new ApiError(400, 'No image file uploaded', 'MISSING_FILE');
  }

  // Check target colors
  if (!target_colors || !target_colors.drawer || !target_colors.frame) {
    throw new ApiError(
      400,
      'Missing target_colors.drawer or target_colors.frame',
      'MISSING_TARGET_COLORS'
    );
  }

  // Validate RAL codes
  if (!RAL_COLORS.includes(target_colors.drawer)) {
    throw new ApiError(
      400,
      `Invalid drawer color: ${target_colors.drawer}. Must be valid RAL code.`,
      'INVALID_COLOR'
    );
  }

  if (!RAL_COLORS.includes(target_colors.frame)) {
    throw new ApiError(
      400,
      `Invalid frame color: ${target_colors.frame}. Must be valid RAL code.`,
      'INVALID_COLOR'
    );
  }

  // Validate method
  const validMethods = ['production', 'pytorch', 'opencv', 'i2i', 'fast', 'accurate'];
  if (method && !validMethods.includes(method)) {
    throw new ApiError(
      400,
      `Invalid method: ${method}. Must be one of: ${validMethods.join(', ')}`,
      'INVALID_METHOD'
    );
  }

  next();
}

export function validateBatchRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new ApiError(400, 'No images uploaded for batch processing', 'MISSING_FILES');
  }

  if (files.length > 50) {
    throw new ApiError(
      400,
      `Too many images: ${files.length}. Maximum 50 per batch.`,
      'BATCH_TOO_LARGE'
    );
  }

  // Reuse single request validation
  validateColorTransferRequest(req, res, next);
}
```

### Step 1.4: Add Deprecation Warnings (Day 3)

**File:** `server/routes/v1/color-transfer.ts` (legacy)

```typescript
import { Router } from 'express';

const router = Router();

// Deprecation middleware
function addDeprecationHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-API-Deprecated', 'true');
  res.setHeader('X-API-Sunset-Date', '2025-07-17');
  res.setHeader('X-API-Migration-Guide', 'https://docs.colorwerkz.com/api/v2/migration');
  res.setHeader('Warning', '299 - "Deprecated API. Migrate to /api/v2/color-transfer"');
  next();
}

// Wrap all old routes with deprecation warnings
router.use(addDeprecationHeaders);

// Keep old endpoints functioning (proxy to v2)
router.post('/api/color-transfer', async (req, res) => {
  // Log deprecation usage
  await logDeprecationUsage('color-transfer', req);

  // Proxy to v2 with method mapping
  req.body.method = 'production';  // Default for old endpoint
  return v2ColorTransferHandler(req, res);
});

router.post('/api/opencv-baseline/process', async (req, res) => {
  await logDeprecationUsage('opencv-baseline', req);
  req.body.method = 'opencv';
  return v2ColorTransferHandler(req, res);
});

router.post('/api/pytorch-enhanced/process', async (req, res) => {
  await logDeprecationUsage('pytorch-enhanced', req);
  req.body.method = 'pytorch';
  return v2ColorTransferHandler(req, res);
});

// ... other deprecated routes ...

export default router;
```

### Step 1.5: Update Documentation (Day 4)

**File:** `docs/API_V2_MIGRATION_GUIDE.md`

```markdown
# API v2 Migration Guide: Color Transfer

## Overview

The Color Transfer API has been consolidated from 8 separate endpoints to a single unified endpoint with method selection.

## Breaking Changes

### Endpoints Consolidated

All of these endpoints are now **deprecated** (sunset: 2025-07-17):

- `POST /api/color-transfer` → Use `POST /api/v2/color-transfer?method=production`
- `POST /api/enhanced-color-transfer/process` → Use `POST /api/v2/color-transfer?method=production`
- `POST /api/opencv-baseline/process` → Use `POST /api/v2/color-transfer?method=opencv`
- `POST /api/pytorch-enhanced/process` → Use `POST /api/v2/color-transfer?method=pytorch`
- `POST /api/i2i/infer` → Use `POST /api/v2/color-transfer?method=i2i`

### Request Format Changes

**Before (v1):**
```json
POST /api/opencv-baseline/process
Content-Type: multipart/form-data

image: <file>
frameColor: "RAL 7016"
drawerColor: "RAL 5015"
```

**After (v2):**
```json
POST /api/v2/color-transfer
Content-Type: multipart/form-data

image: <file>
method: "opencv"
target_colors: {
  "frame": "RAL 7016",
  "drawer": "RAL 5015"
}
options: {
  "timeout": 30000,
  "quality_threshold": 2.0
}
```

### Response Format Changes

**Before (v1):**
```json
{
  "status": "success",
  "outputImage": "/uploads/result.jpg",
  "processingTime": 123
}
```

**After (v2):**
```json
{
  "status": "success",
  "data": {
    "image": "/uploads/result.jpg",
    "delta_e": 1.45,
    "processing_time": 123,
    "manufacturing_ready": true,
    "method_used": "pytorch"
  },
  "metadata": {
    "timestamp": "2025-01-17T14:23:45Z",
    "api_version": "v2"
  }
}
```

## Migration Steps

### Step 1: Update Client Code

**JavaScript/TypeScript:**
```typescript
// Before
const response = await fetch('/api/opencv-baseline/process', {
  method: 'POST',
  body: formData
});

// After
formData.append('method', 'opencv');
const response = await fetch('/api/v2/color-transfer', {
  method: 'POST',
  body: formData
});
```

**Python:**
```python
# Before
response = requests.post(
    'https://api.colorwerkz.com/api/opencv-baseline/process',
    files={'image': open('input.jpg', 'rb')},
    data={'frameColor': 'RAL 7016', 'drawerColor': 'RAL 5015'}
)

# After
response = requests.post(
    'https://api.colorwerkz.com/api/v2/color-transfer',
    files={'image': open('input.jpg', 'rb')},
    json={
        'method': 'opencv',
        'target_colors': {
            'frame': 'RAL 7016',
            'drawer': 'RAL 5015'
        }
    }
)
```

### Step 2: Test Migration

Use the parallel API period (6 months) to test v2 before v1 sunset:

```bash
# Test v2 endpoint
curl -X POST https://api.colorwerkz.com/api/v2/color-transfer \
  -F "image=@input.jpg" \
  -F "method=pytorch" \
  -F 'target_colors={"frame":"RAL 7016","drawer":"RAL 5015"}'

# Compare with v1 (still works with deprecation warnings)
curl -X POST https://api.colorwerkz.com/api/pytorch-enhanced/process \
  -F "image=@input.jpg" \
  -F "frameColor=RAL 7016" \
  -F "drawerColor=RAL 5015"
```

### Step 3: Update Error Handling

v2 uses standardized error format:

```typescript
try {
  const response = await fetch('/api/v2/color-transfer', {...});
  const data = await response.json();

  if (data.status === 'error') {
    // v2 error format
    console.error(`Error ${data.error.code}: ${data.error.message}`);
    console.error('Details:', data.error.details);
  }
} catch (error) {
  // Network or parsing error
  console.error('Request failed:', error);
}
```

## Deprecation Timeline

| Date | Event |
|------|-------|
| 2025-01-17 | v2 API released (parallel with v1) |
| 2025-04-17 | v1 deprecation warnings added (3 months) |
| 2025-07-17 | v1 API sunset (6 months) - endpoints return 410 Gone |

## Benefits of v2

1. **Single endpoint** - easier to discover and use
2. **Method flexibility** - switch algorithms without changing URL
3. **Better error handling** - standardized error format
4. **Quality metrics** - Delta E included in response
5. **Manufacturing readiness** - boolean flag for production use
6. **Batch processing** - optimized batch endpoint with bin packing

## Support

Questions about migration? Contact:
- Email: api-support@colorwerkz.com
- Docs: https://docs.colorwerkz.com/api/v2
- GitHub Issues: https://github.com/colorwerkz/api/issues
```

### Step 1.6: Deploy and Monitor (Day 5)

```bash
# Deploy v2 routes
npm run deploy:staging

# Monitor adoption
psql -d colorwerkz_prod -c "
SELECT
  CASE
    WHEN event_data->>'endpoint' LIKE '%/v2/%' THEN 'v2'
    ELSE 'v1'
  END as api_version,
  COUNT(*) as requests
FROM analytics_events
WHERE event_type = 'api_request'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY api_version;
"

# Monitor deprecation warnings
psql -d colorwerkz_prod -c "
SELECT
  event_data->>'endpoint' as deprecated_endpoint,
  COUNT(*) as usage_count,
  COUNT(DISTINCT event_data->>'user_id') as unique_users
FROM analytics_events
WHERE event_type = 'deprecation_warning'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY deprecated_endpoint
ORDER BY usage_count DESC;
"
```

---

## Phase 2: Manufacturing Routes (Week 2)

### Goals
- Merge 2 duplicate manufacturing APIs
- Fix dual WebSocket files
- Consolidate to 2 files (REST + WebSocket)

### Files to Merge

**Current:**
```
manufacturing_api.ts (main API)
enhanced_manufacturing_api.ts (duplicate with "enhanced" features)
manufacturing_websocket_routes.ts (WebSocket endpoints)
manufacturing_websocket.ts (duplicate!)
```

**Target:**
```
manufacturing.ts (unified REST API)
manufacturing-ws.ts (WebSocket only)
```

### Implementation Pattern

Follow same pattern as Phase 1:
1. Create v2 unified route
2. Extract service layer
3. Add deprecation warnings to v1
4. Update documentation
5. Deploy and monitor

---

## Phase 3: Training, Models, Performance (Week 3)

### Goals
- Consolidate 7 training routes → 2 files
- Consolidate 4 model routes → 1 file
- Consolidate 6 performance routes → 2 files

### Priority Actions

1. **Remove test stubs from production:**
   ```bash
   mv server/routes/ai-testing-storage-stubs.ts tests/stubs/
   git rm server/routes/ai-testing-storage-stubs.ts
   ```

2. **Merge training routes:**
   - `training.ts` + `ai-training.ts` → `training.ts` (unified)
   - `ai-status.ts` + `training-monitor.ts` → `training-monitor.ts`

3. **Merge model routes:**
   - All 4 files → `models.ts` (upload, info, export, management)

4. **Merge performance routes:**
   - 4 "performance" files → `performance.ts`
   - 2 "analytics" files → `analytics.ts`

---

## Phase 4: Remaining Routes (Week 4)

### Goals
- Consolidate remaining domain routes
- Update all tests
- Final documentation
- Production deployment

### Routes to Consolidate

1. **Image Processing (3 → 2 files):**
   - `annotation.ts` + `batch-processor.ts` → `image-processing.ts`
   - Keep `upload.ts` (shared)

2. **Evaluation (3 → 1 file):**
   - All evaluation routes → `evaluation.ts`

3. **Site Analysis (2 → 1 file):**
   - Both → `site-analysis.ts` with complexity parameter

---

## Shared Components

### Standardized Error Handling

**File:** `server/utils/errors.ts`

```typescript
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleColorTransferError(error: any, res: Response) {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      status: 'error',
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  // Unexpected error
  console.error('Unexpected error:', error);
  return res.status(500).json({
    status: 'error',
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  });
}
```

### Python Executor Service

**File:** `server/services/python-executor.ts`

```typescript
import { spawn } from 'child_process';
import path from 'path';

export class PythonExecutor {
  private pythonPath: string;
  private serverDir: string;

  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.serverDir = path.join(__dirname, '..', 'server');
  }

  async execute(
    scriptPath: string,
    args: Record<string, any>,
    options: {
      timeout?: number;
      maxBuffer?: number;
    } = {}
  ): Promise<any> {
    const timeout = options.timeout || 60000;
    const maxBuffer = options.maxBuffer || 10 * 1024 * 1024;

    return new Promise((resolve, reject) => {
      // Safe: Use spawn with args array (prevents command injection)
      const pythonProcess = spawn(this.pythonPath, [
        scriptPath,
        '--args', JSON.stringify(args)
      ], {
        timeout,
        maxBuffer,
        env: {
          ...process.env,
          PYTHONPATH: this.serverDir
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            reject(new ApiError(
              500,
              'Failed to parse Python output',
              'PYTHON_PARSE_ERROR',
              { stdout, stderr }
            ));
          }
        } else {
          reject(new ApiError(
            500,
            'Python script execution failed',
            'PYTHON_EXECUTION_ERROR',
            { code, stderr }
          ));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new ApiError(
          500,
          'Failed to spawn Python process',
          'PYTHON_SPAWN_ERROR',
          { error: error.message }
        ));
      });
    });
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/routes/color-transfer.test.ts

describe('Color Transfer API v2', () => {
  describe('POST /api/v2/color-transfer', () => {
    it('should transfer color using pytorch method', async () => {
      const response = await request(app)
        .post('/api/v2/color-transfer')
        .attach('image', 'test-fixtures/sample.jpg')
        .field('method', 'pytorch')
        .field('target_colors', JSON.stringify({
          frame: 'RAL 7016',
          drawer: 'RAL 5015'
        }));

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.delta_e).toBeLessThan(2.0);
      expect(response.body.data.manufacturing_ready).toBe(true);
    });

    it('should reject invalid method', async () => {
      const response = await request(app)
        .post('/api/v2/color-transfer')
        .attach('image', 'test-fixtures/sample.jpg')
        .field('method', 'invalid-method')
        .field('target_colors', JSON.stringify({
          frame: 'RAL 7016',
          drawer: 'RAL 5015'
        }));

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_METHOD');
    });

    it('should reject missing target colors', async () => {
      const response = await request(app)
        .post('/api/v2/color-transfer')
        .attach('image', 'test-fixtures/sample.jpg')
        .field('method', 'pytorch');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_TARGET_COLORS');
    });

    it('should handle batch processing', async () => {
      const response = await request(app)
        .post('/api/v2/color-transfer/batch')
        .attach('images', 'test-fixtures/sample1.jpg')
        .attach('images', 'test-fixtures/sample2.jpg')
        .attach('images', 'test-fixtures/sample3.jpg')
        .field('method', 'pytorch')
        .field('target_colors', JSON.stringify({
          frame: 'RAL 7016',
          drawer: 'RAL 5015'
        }));

      expect(response.status).toBe(200);
      expect(response.body.data.results.length).toBe(3);
      expect(response.body.data.summary.total).toBe(3);
    });
  });

  describe('Deprecation warnings', () => {
    it('should return deprecation headers for v1 endpoints', async () => {
      const response = await request(app)
        .post('/api/color-transfer')
        .attach('image', 'test-fixtures/sample.jpg')
        .field('frameColor', 'RAL 7016')
        .field('drawerColor', 'RAL 5015');

      expect(response.headers['x-api-deprecated']).toBe('true');
      expect(response.headers['x-api-sunset-date']).toBe('2025-07-17');
      expect(response.headers['warning']).toContain('Deprecated API');
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/route-consolidation.test.ts

describe('Route Consolidation Integration', () => {
  it('v1 and v2 endpoints should return equivalent results', async () => {
    const testImage = 'test-fixtures/sample.jpg';
    const targetColors = {
      frame: 'RAL 7016',
      drawer: 'RAL 5015'
    };

    // Call v1 endpoint
    const v1Response = await request(app)
      .post('/api/pytorch-enhanced/process')
      .attach('image', testImage)
      .field('frameColor', targetColors.frame)
      .field('drawerColor', targetColors.drawer);

    // Call v2 endpoint
    const v2Response = await request(app)
      .post('/api/v2/color-transfer')
      .attach('image', testImage)
      .field('method', 'pytorch')
      .field('target_colors', JSON.stringify(targetColors));

    // Results should be equivalent (within tolerance)
    expect(v1Response.status).toBe(v2Response.status);
    expect(v2Response.body.data.delta_e).toBeLessThan(2.0);

    // v1 should have deprecation headers
    expect(v1Response.headers['x-api-deprecated']).toBe('true');
  });
});
```

---

## Rollout Checklist

### Pre-Deployment

- [ ] All v2 routes implemented with service layer
- [ ] Shared middleware extracted (imageUpload, validation, errors)
- [ ] Python executor service created (prevents command injection)
- [ ] Deprecation warnings added to v1 routes
- [ ] Migration guide written
- [ ] Unit tests passing (100+ tests)
- [ ] Integration tests passing
- [ ] Code review completed
- [ ] Staging deployment successful

### Deployment (Week 1-4)

- [ ] Week 1: Deploy color transfer consolidation
- [ ] Week 2: Deploy manufacturing consolidation
- [ ] Week 3: Deploy training/models/performance consolidation
- [ ] Week 4: Deploy remaining routes
- [ ] Monitor API usage (v1 vs v2 adoption)
- [ ] Monitor error rates (should not increase)
- [ ] Monitor performance (should improve 30-50%)

### Post-Deployment

- [ ] Monitor for 2 weeks
- [ ] Send deprecation notices to API users (email campaign)
- [ ] Update public API documentation
- [ ] Create video tutorial for migration
- [ ] Track migration progress (goal: 80% v2 adoption in 3 months)

### Sunset Phase (Month 6)

- [ ] Final deprecation notice (1 month before sunset)
- [ ] Identify remaining v1 users
- [ ] Offer migration support
- [ ] Disable v1 endpoints (return 410 Gone)
- [ ] Remove v1 code from repository
- [ ] Archive v1 documentation

---

## Success Metrics

### Quantitative Metrics

| Metric | Before | Target After | Measured After |
|--------|--------|--------------|----------------|
| Route files | 46 | 21 | _____ |
| Total lines of code | 20,053 | 18,000 | _____ |
| Code duplication | 7,844 lines | <2,000 lines | _____ |
| API response time (p95) | 500ms | <350ms | _____ |
| Error rate | 2.3% | <1.0% | _____ |
| Test coverage | 60% | 85% | _____ |
| Developer onboarding time | 2 weeks | 2 days | _____ |

### Qualitative Metrics

- [ ] API easier to discover (single endpoint per domain)
- [ ] Error messages more consistent
- [ ] Code easier to maintain
- [ ] Easier to add new methods (just add to service)
- [ ] Better code organization (service layer pattern)

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing clients | 40% | HIGH | Parallel v1/v2 for 6 months, deprecation warnings |
| Regression bugs | 30% | MEDIUM | Comprehensive test suite, gradual rollout |
| Performance degradation | 10% | HIGH | Load testing before deployment, monitoring |
| Developer resistance | 50% | LOW | Clear migration guide, video tutorials |
| Missed edge cases | 20% | MEDIUM | Integration tests with v1/v2 equivalence checks |

---

## References

- **Triad A Roadmap:** Section 3.6 (Route Proliferation Gap)
- **RSR Task 3:** Full Route Consolidation Analysis
- **Graham's Assessment:** "46 files violates modularity principles"
- **Knuth's Verdict:** "Code duplication is a maintenance nightmare"

---

**Document Version:** 1.0
**Created:** 2025-01-17
**Status:** READY TO IMPLEMENT
**Estimated Duration:** 4 weeks (phased)
**Estimated Cost:** 160 developer hours
**Expected ROI:** 40% reduction in maintenance cost ($200k/year savings)
