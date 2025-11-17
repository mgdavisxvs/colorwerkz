// ═══════════════════════════════════════════════════════════════════════════
// ColorWerkz Server Entry Point
// ═══════════════════════════════════════════════════════════════════════════

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler, sendSuccessResponse } from './utils/errors';
import colorTransferRoutes from './routes/v2/color-transfer';

// Load environment variables
dotenv.config();

// ───────────────────────────────────────────────────────────────────────────
// Configuration
// ───────────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ───────────────────────────────────────────────────────────────────────────
// Application Setup
// ───────────────────────────────────────────────────────────────────────────

const app: Application = express();

// ───────────────────────────────────────────────────────────────────────────
// Middleware
// ───────────────────────────────────────────────────────────────────────────

// Security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Compression
app.use(compression());

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ───────────────────────────────────────────────────────────────────────────
// Routes
// ───────────────────────────────────────────────────────────────────────────

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  return sendSuccessResponse(res, {
    message: 'ColorWerkz API v2',
    version: '2.0.0',
    status: 'operational',
    endpoints: {
      color_transfer: '/api/v2/color-transfer',
      batch_transfer: '/api/v2/color-transfer/batch',
      health: '/api/v2/color-transfer/health',
      methods: '/api/v2/color-transfer/methods',
    },
    documentation: 'https://github.com/colorwerkz/api-docs',
  });
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  return sendSuccessResponse(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// API v2 routes
app.use('/api/v2', colorTransferRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  return res.status(404).json({
    status: 'error',
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      apiVersion: 'v2',
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

// ───────────────────────────────────────────────────────────────────────────
// Server Start
// ───────────────────────────────────────────────────────────────────────────

function startServer() {
  const server = app.listen(PORT, HOST, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ColorWerkz Server Started');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Environment: ${NODE_ENV}`);
    console.log(`  URL:         http://${HOST}:${PORT}`);
    console.log(`  API:         http://${HOST}:${PORT}/api/v2`);
    console.log(`  Health:      http://${HOST}:${PORT}/health`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  return server;
}

// Start server if not imported as module
if (require.main === module) {
  startServer();
}

export { app, startServer };
