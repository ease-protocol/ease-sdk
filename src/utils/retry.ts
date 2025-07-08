import { logger } from './logger';

interface RetryOptions {
  retries?: number;
  delay?: number;
  factor?: number;
  maxDelay?: number;
  retryableStatusCodes?: number[];
}

export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const { retries = 3, delay = 1000, factor = 2, maxDelay = 30000, retryableStatusCodes = [429, 500, 502, 503, 504] } = options || {};

  let currentDelay = delay;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const statusCode = error?.statusCode || error?.response?.status;
      if (i < retries && (statusCode === undefined || retryableStatusCodes.includes(statusCode))) {
        logger.warn(`Attempt ${i + 1} failed. Retrying in ${currentDelay}ms...`, error);
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay = Math.min(currentDelay * factor, maxDelay);
      } else {
        throw error; // Re-throw the error if it's not retryable or max retries reached
      }
    }
  }
  throw new Error('Retry function failed unexpectedly.'); // Should not be reached
}
