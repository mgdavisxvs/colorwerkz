/**
 * Standardized Error Handling
 * Provides consistent error responses across the API
 */

import { Response } from 'express';
import { ApiResponse, ApiErrorDetails } from '../types';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(400, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(409, message, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super(429, 'Too many requests', 'RATE_LIMIT_EXCEEDED', { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class InternalError extends ApiError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(500, message, 'INTERNAL_ERROR', details);
    this.name = 'InternalError';
  }
}

/**
 * Handle color transfer specific errors
 */
export function handleColorTransferError(error: any, res: Response): Response {
  console.error('Color transfer error:', error);

  if (error instanceof ApiError) {
    return sendErrorResponse(res, error);
  }

  // Handle known error types
  if (error.message?.includes('CUDA') || error.message?.includes('GPU')) {
    return sendErrorResponse(
      res,
      new InternalError('GPU processing error', {
        suggestion: 'Try using CPU mode or contact support'
      })
    );
  }

  if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
    return sendErrorResponse(
      res,
      new ApiError(
        408,
        'Processing timeout',
        'TIMEOUT',
        { timeout: '60s', suggestion: 'Try with a smaller image or faster method' }
      )
    );
  }

  if (error.message?.includes('ENOENT') || error.message?.includes('file not found')) {
    return sendErrorResponse(
      res,
      new NotFoundError('Image file')
    );
  }

  // Unknown error - log and return generic 500
  console.error('Unexpected error:', error);
  return sendErrorResponse(
    res,
    new InternalError(
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
    )
  );
}

/**
 * Send standardized error response
 */
export function sendErrorResponse(res: Response, error: ApiError): Response {
  const errorResponse: ApiResponse = {
    status: 'error',
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  };

  return res.status(error.statusCode).json(errorResponse);
}

/**
 * Send standardized success response
 */
export function sendSuccessResponse<T>(
  res: Response,
  data: T,
  metadata?: Record<string, any>
): Response {
  const successResponse: ApiResponse<T> = {
    status: 'success',
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      apiVersion: 'v2',
      ...metadata
    }
  };

  return res.status(200).json(successResponse);
}

/**
 * Global error handler middleware
 */
export function globalErrorHandler(err: any, req: any, res: Response, next: any) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ApiError) {
    return sendErrorResponse(res, err);
  }

  // Default to 500 for unknown errors
  console.error('Unhandled error:', err);
  return sendErrorResponse(
    res,
    new InternalError(
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? { stack: err.stack, message: err.message } : undefined
    )
  );
}
