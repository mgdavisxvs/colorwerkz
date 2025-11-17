/**
 * Request Validation Middleware
 * Validates incoming requests against schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, ValidationError } from '../utils/errors';
import { RAL_COLORS, ColorTransferMethod } from '../types';

const VALID_METHODS: ColorTransferMethod[] = [
  'production',
  'pytorch',
  'opencv',
  'i2i',
  'fast',
  'accurate'
];

/**
 * Validate color transfer request
 */
export function validateColorTransferRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Check file uploaded
    if (!req.file) {
      throw new ValidationError('No image file uploaded', {
        field: 'image',
        expected: 'multipart/form-data file'
      });
    }

    // Parse target_colors (might be JSON string)
    let targetColors;
    try {
      targetColors = typeof req.body.target_colors === 'string'
        ? JSON.parse(req.body.target_colors)
        : req.body.target_colors;
    } catch (error) {
      throw new ValidationError('Invalid target_colors format', {
        field: 'target_colors',
        expected: 'JSON object with drawer and frame properties'
      });
    }

    // Check target colors exist
    if (!targetColors || !targetColors.drawer || !targetColors.frame) {
      throw new ValidationError('Missing target colors', {
        field: 'target_colors',
        expected: '{ drawer: "RAL XXXX", frame: "RAL XXXX" }'
      });
    }

    // Validate RAL codes
    if (!RAL_COLORS.includes(targetColors.drawer)) {
      throw new ValidationError(`Invalid drawer color: ${targetColors.drawer}`, {
        field: 'target_colors.drawer',
        expected: `One of: ${RAL_COLORS.join(', ')}`
      });
    }

    if (!RAL_COLORS.includes(targetColors.frame)) {
      throw new ValidationError(`Invalid frame color: ${targetColors.frame}`, {
        field: 'target_colors.frame',
        expected: `One of: ${RAL_COLORS.join(', ')}`
      });
    }

    // Validate method (optional)
    if (req.body.method && !VALID_METHODS.includes(req.body.method)) {
      throw new ValidationError(`Invalid method: ${req.body.method}`, {
        field: 'method',
        expected: `One of: ${VALID_METHODS.join(', ')}`
      });
    }

    // Parse options (optional)
    if (req.body.options) {
      try {
        req.body.options = typeof req.body.options === 'string'
          ? JSON.parse(req.body.options)
          : req.body.options;
      } catch (error) {
        throw new ValidationError('Invalid options format', {
          field: 'options',
          expected: 'JSON object'
        });
      }
    }

    // Attach parsed values to request
    req.body.target_colors = targetColors;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate batch request
 */
export function validateBatchRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new ValidationError('No images uploaded for batch processing', {
        field: 'images',
        expected: 'Array of image files'
      });
    }

    if (files.length > 50) {
      throw new ValidationError(`Too many images: ${files.length}`, {
        field: 'images',
        expected: 'Maximum 50 images per batch',
        actual: files.length
      });
    }

    // Validate common fields (reuse single request validation)
    validateColorTransferRequest(req, res, next);
  } catch (error) {
    next(error);
  }
}

/**
 * Validate RAL code format
 */
export function isValidRALCode(code: string): boolean {
  return RAL_COLORS.includes(code);
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;

    if (page < 1) {
      throw new ValidationError('Page must be >= 1', {
        field: 'page',
        actual: page
      });
    }

    if (limit < 1 || limit > 1000) {
      throw new ValidationError('Limit must be between 1 and 1000', {
        field: 'limit',
        actual: limit,
        expected: '1-1000'
      });
    }

    // Attach to request
    req.query.page = page.toString();
    req.query.limit = limit.toString();

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate model upload
 */
export function validateModelUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    if (!req.file) {
      throw new ValidationError('No model file uploaded', {
        field: 'model',
        expected: 'Model file (.pt, .onnx, .pb, .h5)'
      });
    }

    const allowedExtensions = ['.pt', '.pth', '.onnx', '.pb', '.h5'];
    const ext = req.file.originalname.substring(req.file.originalname.lastIndexOf('.'));

    if (!allowedExtensions.includes(ext.toLowerCase())) {
      throw new ValidationError(`Invalid model file extension: ${ext}`, {
        field: 'model',
        expected: `One of: ${allowedExtensions.join(', ')}`
      });
    }

    if (!req.body.name) {
      throw new ValidationError('Model name is required', {
        field: 'name'
      });
    }

    if (!req.body.version) {
      throw new ValidationError('Model version is required', {
        field: 'version'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate training request
 */
export function validateTrainingRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const { manifest_path, epochs, batch_size, learning_rate } = req.body;

    if (!manifest_path) {
      throw new ValidationError('Manifest path is required', {
        field: 'manifest_path'
      });
    }

    if (epochs && (epochs < 1 || epochs > 1000)) {
      throw new ValidationError('Epochs must be between 1 and 1000', {
        field: 'epochs',
        actual: epochs
      });
    }

    if (batch_size && (batch_size < 1 || batch_size > 128)) {
      throw new ValidationError('Batch size must be between 1 and 128', {
        field: 'batch_size',
        actual: batch_size
      });
    }

    if (learning_rate && (learning_rate <= 0 || learning_rate > 1)) {
      throw new ValidationError('Learning rate must be between 0 and 1', {
        field: 'learning_rate',
        actual: learning_rate
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}
