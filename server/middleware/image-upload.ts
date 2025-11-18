/**
 * Image Upload Middleware
 * Handles file uploads with validation and storage
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { ApiError } from '../utils/errors';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/colorwerkz/uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10 MB default
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp'
];

// Ensure upload directory exists
(async () => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    console.log(`Upload directory ready: ${UPLOAD_DIR}`);
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
})();

// Storage configuration
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      // Create subdirectory based on date
      const dateDir = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const fullPath = path.join(UPLOAD_DIR, dateDir);
      await fs.mkdir(fullPath, { recursive: true });
      cb(null, fullPath);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);

    const filename = `${timestamp}-${random}-${basename}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        'INVALID_FILE_TYPE'
      )
    );
  }
};

// Create multer instance
export const imageUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 50 // Max for batch processing
  },
  fileFilter
});

/**
 * Cleanup uploaded files after processing
 */
export async function cleanupUploadedFiles(files: Express.Multer.File | Express.Multer.File[]): Promise<void> {
  const fileArray = Array.isArray(files) ? files : [files];

  for (const file of fileArray) {
    try {
      await fs.unlink(file.path);
      console.log(`Cleaned up file: ${file.path}`);
    } catch (error) {
      console.error(`Failed to cleanup file ${file.path}:`, error);
    }
  }
}

/**
 * Cleanup old uploads (older than 24 hours)
 */
export async function cleanupOldUploads(): Promise<void> {
  try {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    const dirs = await fs.readdir(UPLOAD_DIR);

    for (const dir of dirs) {
      const dirPath = path.join(UPLOAD_DIR, dir);
      const stat = await fs.stat(dirPath);

      if (stat.isDirectory()) {
        const files = await fs.readdir(dirPath);

        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const fileStat = await fs.stat(filePath);

          if (now - fileStat.mtimeMs > maxAge) {
            await fs.unlink(filePath);
            console.log(`Cleaned up old file: ${filePath}`);
          }
        }

        // Remove empty directories
        const remainingFiles = await fs.readdir(dirPath);
        if (remainingFiles.length === 0) {
          await fs.rmdir(dirPath);
          console.log(`Removed empty directory: ${dirPath}`);
        }
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Schedule cleanup every 6 hours
setInterval(cleanupOldUploads, 6 * 60 * 60 * 1000);
