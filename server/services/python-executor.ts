/**
 * Python Script Executor
 * Safely executes Python scripts with proper error handling
 * Prevents command injection by using spawn with args array
 */

import { spawn } from 'child_process';
import path from 'path';
import { ApiError, InternalError } from '../utils/errors';

export interface PythonExecuteOptions {
  timeout?: number;
  maxBuffer?: number;
  cwd?: string;
  env?: Record<string, string>;
}

export interface PythonExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export class PythonExecutor {
  private pythonPath: string;
  private serverDir: string;

  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || '/usr/local/bin/python3';
    this.serverDir = path.join(__dirname, '..');
  }

  /**
   * Execute Python script safely
   * SECURITY: Uses spawn with args array to prevent command injection
   */
  async execute(
    scriptPath: string,
    args: Record<string, any>,
    options: PythonExecuteOptions = {}
  ): Promise<any> {
    const timeout = options.timeout || 60000; // 60s default
    const maxBuffer = options.maxBuffer || 10 * 1024 * 1024; // 10 MB

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      // Safe: Use spawn with args array (prevents command injection)
      const pythonProcess = spawn(
        this.pythonPath,
        [
          scriptPath,
          '--args',
          JSON.stringify(args)
        ],
        {
          cwd: options.cwd || this.serverDir,
          env: {
            ...process.env,
            PYTHONPATH: this.serverDir,
            ...options.env
          }
        }
      );

      // Handle timeout manually
      const timeoutHandle = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error(`Python script timeout after ${timeout}ms`));
      }, timeout);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutHandle);
        const duration = Date.now() - startTime;

        // Check buffer size limit
        if (stdout.length > maxBuffer || stderr.length > maxBuffer) {
          reject(new InternalError('Python script output exceeded buffer limit', {
            maxBuffer,
            stdoutSize: stdout.length,
            stderrSize: stderr.length
          }));
          return;
        }

        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve({
              ...result,
              _metadata: {
                duration,
                scriptPath
              }
            });
          } catch (error) {
            reject(new InternalError('Failed to parse Python output', {
              stdout: stdout.substring(0, 1000), // Limit to 1000 chars
              stderr: stderr.substring(0, 1000),
              parseError: (error as Error).message
            }));
          }
        } else {
          reject(new InternalError('Python script execution failed', {
            exitCode: code,
            stderr: stderr.substring(0, 1000),
            scriptPath,
            duration
          }));
        }
      });

      pythonProcess.on('error', (error) => {
        const duration = Date.now() - startTime;

        if ((error as any).code === 'ETIMEDOUT') {
          reject(new ApiError(
            408,
            `Python script timeout after ${timeout}ms`,
            'PYTHON_TIMEOUT',
            { scriptPath, timeout, duration }
          ));
        } else {
          reject(new InternalError('Failed to spawn Python process', {
            error: error.message,
            scriptPath,
            pythonPath: this.pythonPath
          }));
        }
      });
    });
  }

  /**
   * Execute Python script with raw output (no JSON parsing)
   */
  async executeRaw(
    scriptPath: string,
    args: string[] = [],
    options: PythonExecuteOptions = {}
  ): Promise<PythonExecuteResult> {
    const timeout = options.timeout || 60000;
    const maxBuffer = options.maxBuffer || 10 * 1024 * 1024;

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(
        this.pythonPath,
        [scriptPath, ...args],
        {
          cwd: options.cwd || this.serverDir,
          env: {
            ...process.env,
            PYTHONPATH: this.serverDir,
            ...options.env
          }
        }
      );

      // Handle timeout manually
      const timeoutHandle = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error(`Python script timeout after ${timeout}ms`));
      }, timeout);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutHandle);
        const duration = Date.now() - startTime;

        // Check buffer size limit
        if (stdout.length > maxBuffer || stderr.length > maxBuffer) {
          reject(new Error('Python script output exceeded buffer limit'));
          return;
        }

        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
          duration
        });
      });

      pythonProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Check if Python is available and working
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.executeRaw('--version', [], { timeout: 5000 });
      return result.exitCode === 0;
    } catch (error) {
      console.error('Python health check failed:', error);
      return false;
    }
  }

  /**
   * Get Python version
   */
  async getVersion(): Promise<string> {
    try {
      const result = await this.executeRaw('--version', [], { timeout: 5000 });
      return result.stdout.trim() || result.stderr.trim();
    } catch (error) {
      throw new InternalError('Failed to get Python version', {
        error: (error as Error).message
      });
    }
  }
}

// Singleton instance
export const pythonExecutor = new PythonExecutor();
