/**
 * ColorWerkz API Types
 * Shared types between frontend and backend
 *
 * Philosophy (Donald Knuth): Explicit types ensure correctness
 */

export type ColorTransferMethod =
  | 'production'
  | 'pytorch'
  | 'accurate'
  | 'opencv'
  | 'fast'
  | 'i2i';

export interface TargetColors {
  drawer: string; // RAL code, e.g., "RAL 5015"
  frame: string;  // RAL code, e.g., "RAL 7016"
}

export interface TransferResult {
  image: string;
  delta_e: number;
  processing_time: number;
  manufacturing_ready: boolean;
  method_used: ColorTransferMethod;
  metadata?: {
    imageSize?: [number, number];
    colorAccuracy?: string;
    manufacturingReady?: boolean;
  };
}

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp?: string;
    apiVersion?: string;
    [key: string]: any;
  };
}

export interface MethodInfo {
  name: ColorTransferMethod;
  aliases: ColorTransferMethod[];
  description: string;
  speed: 'fast' | 'medium' | 'slow';
  accuracy: 'low' | 'high' | 'experimental';
  avg_delta_e: number | null;
  avg_processing_time: string;
  manufacturing_ready: boolean;
  recommended?: boolean;
  warnings?: string[];
}

export interface HealthStatus {
  status: 'healthy' | 'degraded';
  timestamp: string;
  uptime: number;
  memory?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
}

export interface RALColor {
  code: string;
  name?: string;
  rgb: [number, number, number];
  lab?: [number, number, number];
}
