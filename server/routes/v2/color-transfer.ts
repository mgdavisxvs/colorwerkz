/**
 * Color Transfer API v2
 * Unified endpoint for all color transfer methods
 */

import { Router, Request, Response } from 'express';
import { imageUpload, cleanupUploadedFiles } from '../../middleware/image-upload';
import { validateColorTransferRequest, validateBatchRequest } from '../../middleware/validation';
import { colorTransferService } from '../../services/color-transfer-service';
import { sendSuccessResponse, handleColorTransferError } from '../../utils/errors';
import { ColorTransferMethod } from '../../types';

const router = Router();

/**
 * POST /api/v2/color-transfer
 * Unified color transfer endpoint with method selection
 *
 * @body method - Transfer method: production|pytorch|opencv|i2i|fast|accurate
 * @body target_colors - { drawer: "RAL XXXX", frame: "RAL XXXX" }
 * @body options - Optional settings (timeout, quality_threshold, etc.)
 * @file image - Image file to process
 */
router.post(
  '/color-transfer',
  imageUpload.single('image'),
  validateColorTransferRequest,
  async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const {
        method = 'production',
        target_colors,
        options = {}
      } = req.body;

      // Route to service
      const result = await colorTransferService.transfer({
        image: req.file!,
        method: method as ColorTransferMethod,
        targetColors: target_colors,
        options
      });

      // Cleanup uploaded file
      await cleanupUploadedFiles(req.file!);

      // Send response
      return sendSuccessResponse(
        res,
        {
          image: result.transformedImage,
          delta_e: result.deltaE,
          processing_time: result.processingTime,
          manufacturing_ready: result.deltaE < 2.0,
          method_used: result.methodUsed,
          metadata: result.metadata
        },
        {
          processingTime: Date.now() - startTime,
          apiVersion: 'v2'
        }
      );
    } catch (error) {
      // Cleanup on error
      if (req.file) {
        await cleanupUploadedFiles(req.file);
      }

      return handleColorTransferError(error, res);
    }
  }
);

/**
 * POST /api/v2/color-transfer/batch
 * Batch processing with optimized batching (FFD bin packing)
 *
 * @body method - Transfer method
 * @body target_colors - Target colors for all images
 * @body options - Optional settings
 * @files images - Array of image files (max 50)
 */
router.post(
  '/color-transfer/batch',
  imageUpload.array('images', 50),
  validateBatchRequest,
  async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const images = req.files as Express.Multer.File[];
      const {
        method = 'production',
        target_colors,
        options = {}
      } = req.body;

      // Optimize batch sizes with bin packing
      const batches = colorTransferService.optimizeBatches(images);

      console.log(`Processing ${images.length} images in ${batches.length} optimized batches`);

      // Process batches
      const results = await colorTransferService.transferBatch({
        batches,
        method: method as ColorTransferMethod,
        targetColors: target_colors,
        options
      });

      // Cleanup uploaded files
      await cleanupUploadedFiles(images);

      // Calculate summary statistics
      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);
      const deltaEValues = successful.map((r) => r.deltaE);

      const summary = {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        mean_delta_e: deltaEValues.length > 0
          ? deltaEValues.reduce((a, b) => a + b, 0) / deltaEValues.length
          : null,
        manufacturing_ready_count: successful.filter((r) => r.deltaE < 2.0).length,
        total_processing_time: results.reduce((sum, r) => sum + r.processingTime, 0)
      };

      return sendSuccessResponse(
        res,
        {
          results: results.map((r) => ({
            transformed_image: r.transformedImage,
            delta_e: r.deltaE,
            processing_time: r.processingTime,
            manufacturing_ready: r.deltaE < 2.0,
            success: r.success,
            error: r.error
          })),
          summary,
          batches_used: batches.length
        },
        {
          processingTime: Date.now() - startTime,
          apiVersion: 'v2'
        }
      );
    } catch (error) {
      // Cleanup on error
      if (req.files) {
        await cleanupUploadedFiles(req.files as Express.Multer.File[]);
      }

      return handleColorTransferError(error, res);
    }
  }
);

/**
 * GET /api/v2/color-transfer/health
 * Health check endpoint
 */
router.get('/color-transfer/health', async (req: Request, res: Response) => {
  try {
    const health = await colorTransferService.healthCheck();

    return sendSuccessResponse(res, health);
  } catch (error) {
    return handleColorTransferError(error, res);
  }
});

/**
 * GET /api/v2/color-transfer/methods
 * List available methods with their characteristics
 */
router.get('/color-transfer/methods', (req: Request, res: Response) => {
  const methods = [
    {
      name: 'production',
      aliases: ['pytorch', 'accurate'],
      description: 'PyTorch U-Net - Manufacturing grade (Delta E < 2.0)',
      speed: 'medium',
      accuracy: 'high',
      avg_delta_e: 1.45,
      avg_processing_time: '485ms (CPU) / 3ms (GPU)',
      manufacturing_ready: true,
      recommended: true
    },
    {
      name: 'opencv',
      aliases: ['fast'],
      description: 'OpenCV baseline - Fast prototyping only',
      speed: 'fast',
      accuracy: 'low',
      avg_delta_e: 25.13,
      avg_processing_time: '100ms (CPU)',
      manufacturing_ready: false,
      recommended: false,
      warnings: [
        'Not suitable for production',
        'Preserves lightness - cannot darken/lighten surfaces',
        'Use only for quick previews'
      ]
    },
    {
      name: 'i2i',
      aliases: [],
      description: 'Image-to-image GAN - Experimental',
      speed: 'slow',
      accuracy: 'high',
      avg_delta_e: null,
      avg_processing_time: '2-5s',
      manufacturing_ready: false,
      warnings: ['Experimental - not fully validated']
    }
  ];

  return sendSuccessResponse(res, { methods });
});

export default router;
