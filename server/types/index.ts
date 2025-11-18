/**
 * ColorWerkz Type Definitions
 * Central type definitions for the application
 */

// ============================================================================
// Color Transfer Types
// ============================================================================

export type RALCode = string; // e.g., "RAL 7016"

export const RAL_COLORS: RALCode[] = [
  'RAL 1013', 'RAL 3004', 'RAL 5010', 'RAL 5015', 'RAL 6011',
  'RAL 7016', 'RAL 7024', 'RAL 7035', 'RAL 9002', 'RAL 9005',
  'RAL 9006', 'RAL 9010', 'RAL 9011', 'RAL 9016'
];

export interface RALColor {
  code: RALCode;
  name: string;
  rgb: {
    r: number;
    g: number;
    b: number;
  };
  lab: {
    l: number;
    a: number;
    b: number;
  };
}

export type ColorTransferMethod =
  | 'production'   // PyTorch U-Net (trained, Delta E < 2.0)
  | 'pytorch'      // Same as production
  | 'opencv'       // Legacy baseline (fast, inaccurate)
  | 'i2i'          // Image-to-image GAN
  | 'fast'         // Alias for opencv
  | 'accurate';    // Alias for production

export interface TargetColors {
  drawer: RALCode;
  frame: RALCode;
}

export interface TransferOptions {
  timeout?: number;
  quality_threshold?: number;
  preserve_texture?: boolean;
  output_format?: 'png' | 'jpg' | 'webp';
}

export interface TransferParams {
  image: Express.Multer.File;
  method: ColorTransferMethod;
  targetColors: TargetColors;
  options?: TransferOptions;
}

export interface TransferResult {
  transformedImage: string; // URL or base64
  deltaE: number;
  processingTime: number;
  methodUsed: ColorTransferMethod;
  success: boolean;
  error?: string;
  metadata?: {
    imageSize?: { width: number; height: number };
    colorAccuracy?: number;
    manufacturingReady?: boolean;
  };
}

export interface BatchTransferParams {
  batches: Express.Multer.File[][];
  method: ColorTransferMethod;
  targetColors: TargetColors;
  options?: TransferOptions;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: ApiErrorDetails;
  metadata: {
    timestamp: string;
    processingTime?: number;
    apiVersion?: string;
  };
}

export interface ApiErrorDetails {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

// ============================================================================
// Database Types
// ============================================================================

export interface ColorCombination {
  id: bigint;
  drawerColor: RALCode;
  frameColor: RALCode;
  sku: string;
  metadata: {
    createdAt: Date;
    previewUrl?: string;
    manufacturingStatus?: 'pending' | 'ready' | 'failed';
    industry?: string;
    style?: string;
  };
  shardId: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roleId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingDataset {
  id: string;
  name: string;
  modelType: string;
  accuracyMetrics: {
    deltaE?: number;
    iou?: number;
    pixelAccuracy?: number;
  };
  filePath: string;
  createdBy: string;
  createdAt: Date;
}

// ============================================================================
// Training Types
// ============================================================================

export interface TrainingJob {
  id: string;
  manifestPath: string;
  modelArchitecture: 'unet' | 'resnet' | 'efficientnet';
  hyperparameters: {
    epochs: number;
    batchSize: number;
    learningRate: number;
    optimizer: 'Adam' | 'AdamW' | 'SGD';
  };
  state: {
    status: 'queued' | 'running' | 'completed' | 'failed';
    currentEpoch: number;
    lossHistory: number[];
    validationMetrics: {
      deltaE: number;
      iou: number;
      pixelAccuracy: number;
    };
  };
}

// ============================================================================
// Model Types
// ============================================================================

export interface ModelArtifact {
  id: string;
  name: string;
  version: string;
  format: 'pytorch' | 'onnx' | 'tensorflow' | 'torchscript';
  filePath: string;
  fileSize: number;
  metrics: {
    accuracy?: number;
    deltaE?: number;
    inferenceTime?: number;
  };
  createdAt: Date;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface AnalyticsEvent {
  id: bigint;
  userId?: string;
  eventType: string;
  eventData: Record<string, any>;
  sessionId?: string;
  timestamp: Date;
}

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AppConfig {
  server: {
    port: number;
    host: string;
    env: 'development' | 'staging' | 'production';
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    poolSize: number;
  };
  storage: {
    uploadDir: string;
    maxFileSize: number;
    allowedMimeTypes: string[];
  };
  ml: {
    modelPath: string;
    pythonPath: string;
    gpuEnabled: boolean;
  };
  api: {
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
    corsOrigins: string[];
  };
}
