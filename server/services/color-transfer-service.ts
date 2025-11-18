/**
 * Color Transfer Service
 * Handles all color transfer operations with multiple methods
 */

import { performance } from 'perf_hooks';
import path from 'path';
import {
  ColorTransferMethod,
  TransferParams,
  TransferResult,
  BatchTransferParams,
  TargetColors
} from '../types';
import { pythonExecutor } from './python-executor';
import { ApiError, InternalError } from '../utils/errors';

const GPU_MEMORY_LIMIT = parseInt(process.env.GPU_MEMORY_GB || '14') * 1024 * 1024 * 1024;

export class ColorTransferService {
  private onnxRuntimeAvailable: boolean = false;

  constructor() {
    this.checkONNXRuntime();
  }

  private async checkONNXRuntime(): Promise<void> {
    try {
      // Check if ONNX runtime is available
      const onnxrt = await import('onnxruntime-node').catch(() => null);
      this.onnxRuntimeAvailable = onnxrt !== null;

      if (!this.onnxRuntimeAvailable) {
        console.warn('ONNX Runtime not available. PyTorch method will use Python backend.');
      }
    } catch (error) {
      console.warn('ONNX Runtime check failed:', error);
      this.onnxRuntimeAvailable = false;
    }
  }

  /**
   * Main transfer method - routes to appropriate handler
   */
  async transfer(params: TransferParams): Promise<TransferResult> {
    const { image, method, targetColors, options = {} } = params;

    // Validate image file exists
    if (!image || !image.path) {
      throw new ApiError(400, 'No image file provided', 'MISSING_IMAGE');
    }

    // Route to appropriate handler
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
        throw new ApiError(
          400,
          `Unknown method: ${method}`,
          'INVALID_METHOD',
          { validMethods: ['production', 'pytorch', 'opencv', 'i2i', 'fast', 'accurate'] }
        );
    }
  }

  /**
   * PyTorch U-Net handler (Manufacturing-grade, Delta E < 2.0)
   */
  private async pytorchHandler(
    image: Express.Multer.File,
    targetColors: TargetColors,
    options: any
  ): Promise<TransferResult> {
    const startTime = performance.now();

    try {
      // Execute PyTorch color transfer via Python
      const scriptPath = path.join(__dirname, '..', 'pytorch_enhanced.py');

      const result = await pythonExecutor.execute(
        scriptPath,
        {
          source_image: image.path,
          frame_color: targetColors.frame,
          drawer_color: targetColors.drawer,
          model_path: options.model_path || 'models/unet_production.onnx',
          output_path: image.path.replace(/\.(jpg|jpeg|png|webp)$/i, '_transferred.$1')
        },
        {
          timeout: options.timeout || 60000
        }
      );

      const processingTime = performance.now() - startTime;

      return {
        transformedImage: result.output_image,
        deltaE: result.delta_e || 0,
        processingTime,
        methodUsed: 'pytorch',
        success: true,
        metadata: {
          imageSize: result.image_size,
          colorAccuracy: result.color_accuracy,
          manufacturingReady: (result.delta_e || 999) < 2.0
        }
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;

      console.error('PyTorch handler error:', error);

      return {
        transformedImage: '',
        deltaE: 999,
        processingTime,
        methodUsed: 'pytorch',
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * OpenCV baseline handler (Fast, inaccurate - for prototyping only)
   */
  private async opencvHandler(
    image: Express.Multer.File,
    targetColors: TargetColors,
    options: any
  ): Promise<TransferResult> {
    const startTime = performance.now();

    try {
      const scriptPath = path.join(__dirname, '..', 'opencv_baseline.py');

      const result = await pythonExecutor.execute(
        scriptPath,
        {
          source_image: image.path,
          frame_color: targetColors.frame,
          drawer_color: targetColors.drawer,
          output_path: image.path.replace(/\.(jpg|jpeg|png|webp)$/i, '_transferred.$1')
        },
        {
          timeout: options.timeout || 30000
        }
      );

      const processingTime = performance.now() - startTime;

      // Warning: OpenCV baseline has known accuracy issues (Delta E ~25)
      console.warn('OpenCV baseline used - Delta E expected to be high (~25)');

      return {
        transformedImage: result.output_image,
        deltaE: result.delta_e || 25.13, // Known average
        processingTime,
        methodUsed: 'opencv',
        success: true,
        metadata: {
          imageSize: result.image_size,
          colorAccuracy: result.color_accuracy,
          manufacturingReady: false // OpenCV never meets manufacturing spec
        }
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;

      console.error('OpenCV handler error:', error);

      return {
        transformedImage: '',
        deltaE: 999,
        processingTime,
        methodUsed: 'opencv',
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Image-to-image GAN handler
   */
  private async i2iHandler(
    image: Express.Multer.File,
    targetColors: TargetColors,
    options: any
  ): Promise<TransferResult> {
    const startTime = performance.now();

    try {
      const scriptPath = path.join(__dirname, '..', 'i2i_transfer.py');

      const result = await pythonExecutor.execute(
        scriptPath,
        {
          source_image: image.path,
          frame_color: targetColors.frame,
          drawer_color: targetColors.drawer,
          output_path: image.path.replace(/\.(jpg|jpeg|png|webp)$/i, '_transferred.$1')
        },
        {
          timeout: options.timeout || 120000 // GAN may take longer
        }
      );

      const processingTime = performance.now() - startTime;

      return {
        transformedImage: result.output_image,
        deltaE: result.delta_e || 0,
        processingTime,
        methodUsed: 'i2i',
        success: true,
        metadata: {
          imageSize: result.image_size,
          colorAccuracy: result.color_accuracy,
          manufacturingReady: (result.delta_e || 999) < 2.0
        }
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;

      console.error('I2I handler error:', error);

      return {
        transformedImage: '',
        deltaE: 999,
        processingTime,
        methodUsed: 'i2i',
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Batch transfer with optimized batching
   */
  async transferBatch(params: BatchTransferParams): Promise<TransferResult[]> {
    const results: TransferResult[] = [];

    for (const batch of params.batches) {
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map((image) =>
          this.transfer({
            image,
            method: params.method,
            targetColors: params.targetColors,
            options: params.options
          }).catch((error) => ({
            transformedImage: '',
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

  /**
   * Optimize batches using First-Fit Decreasing (FFD) bin packing
   */
  optimizeBatches(
    images: Express.Multer.File[],
    gpuMemory: number = GPU_MEMORY_LIMIT
  ): Express.Multer.File[][] {
    // Sort images by size descending
    const sorted = [...images].sort((a, b) => b.size - a.size);

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

    return batches.map((b) => b.images);
  }

  /**
   * Estimate GPU memory required for image
   */
  private estimateImageMemory(image: Express.Multer.File): number {
    // Assume images are resized to 512×512 for processing
    const pixels = 512 * 512;

    // Input: RGB float32
    const inputMem = pixels * 3 * 4; // bytes

    // U-Net activations: empirically ~50× input size
    const activationMem = inputMem * 50;

    return inputMem + activationMem;
  }

  /**
   * Compute Delta E color difference
   */
  async computeDeltaE(
    transformedImagePath: string,
    targetColors: TargetColors
  ): Promise<number> {
    try {
      const scriptPath = path.join(__dirname, '..', 'compute_delta_e.py');

      const result = await pythonExecutor.execute(
        scriptPath,
        {
          image_path: transformedImagePath,
          target_drawer: targetColors.drawer,
          target_frame: targetColors.frame
        },
        {
          timeout: 10000
        }
      );

      return result.delta_e || 999;
    } catch (error) {
      console.error('Delta E computation error:', error);
      return 999; // Return high value on error
    }
  }

  /**
   * Health check - verify all methods are working
   */
  async healthCheck(): Promise<{
    status: string;
    methods: Record<string, boolean>;
  }> {
    const methodStatus: Record<string, boolean> = {};

    // Check Python availability
    const pythonAvailable = await pythonExecutor.healthCheck();

    methodStatus.pytorch = pythonAvailable && this.onnxRuntimeAvailable;
    methodStatus.opencv = pythonAvailable;
    methodStatus.i2i = pythonAvailable;

    const allHealthy = Object.values(methodStatus).every((v) => v);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      methods: methodStatus
    };
  }
}

// Singleton instance
export const colorTransferService = new ColorTransferService();
