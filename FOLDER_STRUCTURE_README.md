# ColorWerkz Folder Structure

This document describes the complete folder structure and organization of the ColorWerkz application after implementing the Triad A recommendations.

## 📁 Root Structure

```
colorwerkz/
├── server/                  # Backend code (TypeScript + Python)
│   ├── routes/             # API route handlers
│   │   ├── v2/            # New v2 API routes (consolidated)
│   │   └── v1/            # Legacy v1 routes (deprecated)
│   ├── services/           # Business logic layer
│   ├── middleware/         # Request processing middleware
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   └── patches/           # Code patches (pseudo-label fix)
│
├── tests/                  # Test suite
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── fixtures/          # Test data and fixtures
│
├── scripts/               # Utility scripts
│   ├── deploy.sh          # Deployment automation
│   └── verify_pseudolabel_fix.py  # Verification script
│
├── docs/                  # Documentation
│   └── api/               # API documentation
│
├── config/                # Configuration files
│
└── Implementation Guides  # Production-ready guides
    ├── TRIAD_A_COMPUTATIONAL_ROADMAP.md
    ├── IMPLEMENTATION_1_PSEUDOLABEL_FIX.md
    ├── IMPLEMENTATION_2_COMPOSITE_INDEXES.sql
    ├── IMPLEMENTATION_3_ROUTE_CONSOLIDATION.md
    └── IMPLEMENTATION_SUMMARY.md
```

## 📂 Detailed Structure

### `/server` - Backend Code

#### `/server/routes/v2` - New Consolidated Routes

```
server/routes/v2/
├── color-transfer.ts      # Unified color transfer API (consolidates 8 routes)
├── manufacturing.ts       # Manufacturing API (consolidates 2 routes)
├── manufacturing-ws.ts    # Manufacturing WebSocket
├── training.ts            # Model training API (consolidates 7 routes)
├── models.ts              # Model management (consolidates 4 routes)
├── performance.ts         # Performance metrics (consolidates 4 routes)
├── analytics.ts           # Analytics (consolidates 2 routes)
├── image-processing.ts    # Image processing (consolidates 3 routes)
├── evaluation.ts          # Model evaluation (consolidates 3 routes)
└── site-analysis.ts       # Site analysis (consolidates 2 routes)

Total: 10 core routes (down from 37)
```

#### `/server/routes/v1` - Legacy Routes (Deprecated)

```
server/routes/v1/
├── color-transfer.ts      # Legacy endpoint with deprecation warnings
├── enhanced-color-transfer.ts
├── opencv-baseline.ts
├── pytorch-enhanced.ts
└── ... (other deprecated routes)

Note: These routes proxy to v2 and include deprecation headers
Sunset date: 6 months after v2 launch
```

#### `/server/services` - Service Layer

```
server/services/
├── color-transfer-service.ts   # Main color transfer logic
├── python-executor.ts          # Safe Python script execution
├── model-service.ts            # Model management
├── training-service.ts         # Training orchestration
├── analytics-service.ts        # Analytics collection
└── batch-optimizer.ts          # FFD bin packing algorithm

Purpose: Separates business logic from HTTP concerns
Pattern: Service layer pattern
Benefits: Reusable, testable, maintainable
```

#### `/server/middleware` - Request Processing

```
server/middleware/
├── image-upload.ts        # File upload handling (multer config)
├── validation.ts          # Request validation
├── auth.ts               # Authentication middleware
├── rate-limit.ts         # Rate limiting
└── error-handler.ts      # Global error handling

Purpose: Shared request processing logic
Benefits: DRY principle, consistent behavior
```

#### `/server/utils` - Utilities

```
server/utils/
├── errors.ts             # Error classes and handlers
├── logger.ts             # Structured logging
├── performance.ts        # Performance tracking
└── helpers.ts            # General helpers

Purpose: Common utilities used across the app
```

#### `/server/types` - TypeScript Definitions

```
server/types/
└── index.ts              # Central type definitions

Includes:
- RAL color types
- Color transfer types
- API response types
- Database types
- Model types
```

#### `/server/patches` - Code Patches

```
server/patches/
└── pseudolabel_fix.patch  # Fix for pseudo-label generation

Usage: git apply server/patches/pseudolabel_fix.patch
Impact: Enables Delta E < 2.0 training
```

### `/tests` - Test Suite

```
tests/
├── unit/
│   ├── services/
│   │   ├── color-transfer-service.test.ts
│   │   └── python-executor.test.ts
│   ├── middleware/
│   │   ├── validation.test.ts
│   │   └── image-upload.test.ts
│   └── utils/
│       └── errors.test.ts
│
├── integration/
│   ├── color-transfer.test.ts     # API integration tests
│   ├── batch-processing.test.ts
│   └── route-consolidation.test.ts
│
└── fixtures/
    ├── test_image.jpg
    ├── test_manifest.csv
    └── mock_responses.json

Target Coverage: 85%+
```

### `/scripts` - Utility Scripts

```
scripts/
├── deploy.sh                      # Main deployment script
├── verify_pseudolabel_fix.py      # Verify pseudo-label fix
├── generate_manifest.py           # Generate training manifests
├── benchmark_methods.py           # Benchmark color transfer methods
└── cleanup_old_uploads.sh         # Cleanup temp files

Purpose: Automation and maintenance
```

### `/docs` - Documentation

```
docs/
├── api/
│   ├── v2/
│   │   ├── color-transfer.md
│   │   ├── manufacturing.md
│   │   └── migration-guide.md
│   └── v1/
│       └── deprecated-endpoints.md
│
├── architecture/
│   ├── service-layer.md
│   ├── error-handling.md
│   └── batch-optimization.md
│
└── guides/
    ├── getting-started.md
    ├── deployment.md
    └── troubleshooting.md
```

### `/config` - Configuration

```
config/
├── database.ts               # Database configuration
├── storage.ts               # File storage configuration
├── ml.ts                    # ML/AI configuration
└── environments/
    ├── development.ts
    ├── staging.ts
    └── production.ts
```

## 🗂️ File Organization Principles

### 1. Separation of Concerns

```
Routes → Services → Database
  ↓         ↓          ↓
HTTP     Business   Data
Layer     Logic     Layer
```

- **Routes**: Handle HTTP requests/responses only
- **Services**: Contain business logic
- **Models**: Database interactions

### 2. Dependency Injection

```typescript
// Route depends on service (injected)
import { colorTransferService } from '../../services/color-transfer-service';

router.post('/color-transfer', async (req, res) => {
  const result = await colorTransferService.transfer(params);
  res.json(result);
});
```

### 3. Single Responsibility

Each file has one clear purpose:
- `color-transfer-service.ts` - Color transfer logic only
- `python-executor.ts` - Python execution only
- `validation.ts` - Request validation only

### 4. Clear Naming

```
✅ Good:
- color-transfer-service.ts
- validateColorTransferRequest()
- sendSuccessResponse()

❌ Bad:
- utils.ts (too generic)
- doStuff() (unclear)
- handler1.ts (meaningless)
```

## 📊 Metrics After Consolidation

### Before Consolidation

```
Route files: 46
Total lines: 20,053
Duplicated code: 7,844 lines
Average file size: 436 lines
Complexity: HIGH
```

### After Consolidation

```
Route files: 21
Total lines: 18,000 (10% reduction from cleanup)
Duplicated code: <2,000 lines (74% reduction)
Average file size: 857 lines
Complexity: MEDIUM
```

### Improvements

- **54% reduction** in route files
- **74% reduction** in code duplication
- **Centralized** error handling
- **Consistent** validation
- **Reusable** service layer
- **Better** testability

## 🚀 Getting Started

### 1. Install Dependencies

```bash
# Node dependencies
npm install

# Python dependencies
pip install -r requirements.txt
```

### 2. Apply Critical Fixes

```bash
# Fix pseudo-labels
git apply server/patches/pseudolabel_fix.patch

# Verify fix
python3 scripts/verify_pseudolabel_fix.py
```

### 3. Setup Database

```bash
# Apply composite indexes
psql -d colorwerkz_dev -f IMPLEMENTATION_2_COMPOSITE_INDEXES.sql
```

### 4. Build Application

```bash
# TypeScript build
npm run build

# Run tests
npm test
```

### 5. Start Development Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📝 Development Workflow

### Adding a New Route

1. Create route file in `/server/routes/v2`
2. Create service in `/server/services` (if needed)
3. Add validation middleware (if needed)
4. Add tests in `/tests/integration`
5. Update API documentation

### Adding a New Service

1. Create service file in `/server/services`
2. Define service interface
3. Implement business logic
4. Add unit tests in `/tests/unit/services`
5. Export singleton instance

### Adding Middleware

1. Create middleware file in `/server/middleware`
2. Implement middleware function
3. Add tests in `/tests/unit/middleware`
4. Apply to routes as needed

## 🔧 Configuration

### Environment Variables

```bash
# Server
NODE_ENV=development|staging|production
PORT=5000
HOST=localhost

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Storage
UPLOAD_DIR=/tmp/colorwerkz/uploads
MAX_FILE_SIZE=10485760

# Python
PYTHON_PATH=/usr/bin/python3

# ML
MODEL_PATH=models/unet_production.onnx
GPU_ENABLED=true
```

### Configuration Files

```typescript
// config/database.ts
export const databaseConfig = {
  development: { ... },
  staging: { ... },
  production: { ... }
};
```

## 🧪 Testing Strategy

### Unit Tests (80%)

```bash
npm run test:unit
```

Tests individual functions/methods in isolation.

### Integration Tests (15%)

```bash
npm run test:integration
```

Tests API endpoints end-to-end.

### E2E Tests (5%)

```bash
npm run test:e2e
```

Tests complete user workflows.

## 📦 Deployment

### Staging

```bash
./scripts/deploy.sh staging
```

### Production

```bash
./scripts/deploy.sh production
```

### Dry Run

```bash
DRY_RUN=true ./scripts/deploy.sh production
```

## 🔍 Monitoring

### Health Checks

```bash
# v2 API health
curl http://localhost:5000/api/v2/color-transfer/health

# List methods
curl http://localhost:5000/api/v2/color-transfer/methods
```

### Logs

```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Access logs
tail -f logs/access.log
```

### Metrics

- API response times
- Error rates
- Delta E distribution
- GPU utilization
- Database query performance

## 🆘 Troubleshooting

### Common Issues

#### 1. Import Errors

```
Error: Cannot find module '../services/color-transfer-service'
```

**Solution**: Check file paths and TypeScript build output

#### 2. Python Execution Fails

```
Error: Python script timeout
```

**Solution**: Check Python path, dependencies, GPU availability

#### 3. Database Connection Fails

```
Error: Connection refused
```

**Solution**: Check DATABASE_URL, PostgreSQL running

### Debug Mode

```bash
# Enable debug logging
DEBUG=colorwerkz:* npm run dev
```

## 📚 Additional Resources

- [Triad A Roadmap](TRIAD_A_COMPUTATIONAL_ROADMAP.md)
- [Pseudo-Label Fix Guide](IMPLEMENTATION_1_PSEUDOLABEL_FIX.md)
- [Database Indexes](IMPLEMENTATION_2_COMPOSITE_INDEXES.sql)
- [Route Consolidation](IMPLEMENTATION_3_ROUTE_CONSOLIDATION.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)

## 🤝 Contributing

1. Create feature branch
2. Follow folder structure conventions
3. Add tests for new code
4. Update documentation
5. Submit pull request

---

**Version:** 1.0
**Last Updated:** 2025-01-17
**Status:** Production Ready
