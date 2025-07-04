import { createModuleLogger } from './logger.js';

const logger = createModuleLogger('retry');

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'rate_limit_exceeded',
    'insufficient_quota',
    'server_error',
    'timeout'
  ]
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  if (!error) return false;
  
  const errorString = String(error).toLowerCase();
  const errorCode = (error as any)?.code?.toLowerCase();
  const errorType = (error as any)?.type?.toLowerCase();
  
  return retryableErrors.some(retryableError => 
    errorString.includes(retryableError.toLowerCase()) ||
    errorCode === retryableError.toLowerCase() ||
    errorType === retryableError.toLowerCase()
  );
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName = 'operation'
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      logger.debug(`Attempting ${operationName}`, { attempt, maxRetries: finalConfig.maxRetries });
      const result = await operation();
      
      if (attempt > 0) {
        logger.info(`${operationName} succeeded after ${attempt} retries`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt === finalConfig.maxRetries) {
        logger.error(`${operationName} failed after ${finalConfig.maxRetries} retries`, { error: String(error) });
        break;
      }
      
      if (!isRetryableError(error, finalConfig.retryableErrors)) {
        logger.error(`${operationName} failed with non-retryable error`, { error: String(error) });
        throw error;
      }
      
      const delayMs = Math.min(
        finalConfig.initialDelayMs * Math.pow(finalConfig.backoffMultiplier, attempt),
        finalConfig.maxDelayMs
      );
      
      logger.warn(`${operationName} failed, retrying in ${delayMs}ms`, { 
        attempt, 
        error: String(error), 
        delayMs 
      });
      
      await delay(delayMs);
    }
  }
  
  throw lastError;
}

export async function withRetryOpenAI<T>(
  operation: () => Promise<T>,
  operationName = 'OpenAI API call'
): Promise<T> {
  return withRetry(
    operation,
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      retryableErrors: [
        'rate_limit_exceeded',
        'insufficient_quota',
        'server_error',
        'timeout',
        'ECONNRESET',
        'ENOTFOUND',
        'ECONNREFUSED',
        'ETIMEDOUT'
      ]
    },
    operationName
  );
}