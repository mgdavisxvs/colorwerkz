/**
 * ColorWerkz API Client
 * Simple, composable API utilities
 *
 * Philosophy (Dennis Ritchie): Small, sharp tools
 * Security (Linus Torvalds): No eval, no dynamic code
 */

import type {
  ApiResponse,
  TargetColors,
  TransferResult,
  MethodInfo,
  ColorTransferMethod,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
      },
    });

    const data: ApiResponse<T> = await response.json();

    if (data.status === 'error') {
      throw new ApiError(
        response.status,
        data.error?.code || 'UNKNOWN_ERROR',
        data.error?.message || 'An unknown error occurred',
        data.error?.details
      );
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or parsing error
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed'
    );
  }
}

export const api = {
  /**
   * Health check
   */
  async health() {
    return fetchApi<{ status: string }>('/health');
  },

  /**
   * Get available color transfer methods
   */
  async getMethods() {
    return fetchApi<{ methods: MethodInfo[] }>('/api/v2/color-transfer/methods');
  },

  /**
   * Transfer single image
   */
  async transferImage(
    image: File,
    targetColors: TargetColors,
    method: ColorTransferMethod = 'production'
  ): Promise<TransferResult> {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('method', method);
    formData.append('target_colors', JSON.stringify(targetColors));

    return fetchApi<TransferResult>('/api/v2/color-transfer', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Transfer batch of images
   */
  async transferBatch(
    images: File[],
    targetColors: TargetColors,
    method: ColorTransferMethod = 'production'
  ): Promise<TransferResult[]> {
    const formData = new FormData();

    images.forEach((image) => {
      formData.append('images', image);
    });

    formData.append('method', method);
    formData.append('target_colors', JSON.stringify(targetColors));

    return fetchApi<TransferResult[]>('/api/v2/color-transfer/batch', {
      method: 'POST',
      body: formData,
    });
  },
};
