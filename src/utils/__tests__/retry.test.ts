// Mock logger before other imports
jest.mock('../logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        apiCall: jest.fn(),
        apiResponse: jest.fn(),
        performance: jest.fn()
    }))
}));

// Note: This file tests the retry module itself, so it uses real retry functions
// rather than mocking them. The standardized retry mock pattern would be:
// jest.mock('../retry.js', () => ({
//     withRetry: jest.fn().mockImplementation(async (fn: any) => await fn())
// }));

import { withRetry, withRetryOpenAI } from '../retry';
import { setupFileTests, setupJestExtensions } from '@test-utils';

// Setup custom Jest matchers
setupJestExtensions();

// Factory functions for retry configurations
const createRetryOptions = (overrides: any = {}) => ({
    maxRetries: 1,
    initialDelayMs: 10,
    ...overrides
});

const createStrictRetryOptions = (retryableErrors: string[], overrides: any = {}) => ({
    retryableErrors,
    maxRetries: 1,
    initialDelayMs: 10,
    ...overrides
});

const createLongRetryOptions = (overrides: any = {}) => ({
    maxRetries: 2,
    initialDelayMs: 10,
    ...overrides
});

describe('Retry Utility', () => {
  setupFileTests();
  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(mockOperation, {}, 'test-operation');
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');
      
      const result = await withRetry(
        mockOperation,
        createRetryOptions(),
        'test-operation'
      );
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Invalid input'));
      
      await expect(withRetry(
        mockOperation,
        createStrictRetryOptions(['ECONNRESET']),
        'test-operation'
      )).rejects.toThrow('Invalid input');
      
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('ECONNRESET'));
      
      await expect(withRetry(
        mockOperation,
        { maxRetries: 2, initialDelayMs: 10 },
        'test-operation'
      )).rejects.toThrow('ECONNRESET');
      
      expect(mockOperation).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should detect OpenAI rate limit errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('rate_limit_exceeded'))
        .mockResolvedValue('success');
      
      const result = await withRetry(
        mockOperation,
        { maxRetries: 1, initialDelayMs: 10 },
        'test-operation'
      );
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should detect server errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('server_error'))
        .mockResolvedValue('success');
      
      const result = await withRetry(
        mockOperation,
        { maxRetries: 1, initialDelayMs: 10 },
        'test-operation'
      );
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors', async () => {
      const networkErrors = ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'];
      
      for (const errorType of networkErrors) {
        const mockOperation = jest.fn()
          .mockRejectedValueOnce(new Error(errorType))
          .mockResolvedValue('success');
        
        const result = await withRetry(
          mockOperation,
          { maxRetries: 1, initialDelayMs: 10 },
          `Network ${errorType} test`
        );
        
        expect(result).toBe('success');
        expect(mockOperation).toHaveBeenCalledTimes(2);
        
        jest.clearAllMocks();
      }
    });
  });

  describe('withRetryOpenAI', () => {
    it('should use OpenAI-specific retry configuration', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('insufficient_quota'))
        .mockResolvedValue('success');
      
      const result = await withRetryOpenAI(mockOperation, 'OpenAI test');
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should retry on OpenAI-specific errors', async () => {
      const errors = [
        'rate_limit_exceeded',
        'insufficient_quota', 
        'server_error',
        'timeout'
      ];
      
      for (const errorType of errors) {
        const mockOperation = jest.fn()
          .mockRejectedValueOnce(new Error(errorType))
          .mockResolvedValue('success');
        
        const result = await withRetryOpenAI(mockOperation, `OpenAI ${errorType} test`);
        
        expect(result).toBe('success');
        expect(mockOperation).toHaveBeenCalledTimes(2);
        
        jest.clearAllMocks();
      }
    });

    it('should not exceed maximum retries', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('rate_limit_exceeded'));
      
      await expect(withRetryOpenAI(mockOperation, 'OpenAI max retries test'))
        .rejects.toThrow('rate_limit_exceeded');
      
      // Should attempt 3 retries + 1 initial = 4 total
      expect(mockOperation).toHaveBeenCalledTimes(4);
    });
  });

  describe('Error detection', () => {
    it('should detect errors by error code', async () => {
      const error = new Error('Some error');
      (error as any).code = 'ECONNRESET';
      
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const result = await withRetry(
        mockOperation,
        { maxRetries: 1, initialDelayMs: 10 },
        'test-operation'
      );
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should detect errors by error type', async () => {
      const error = new Error('Some error');
      (error as any).type = 'timeout';
      
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const result = await withRetry(
        mockOperation,
        { maxRetries: 1, initialDelayMs: 10 },
        'test-operation'
      );
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should handle non-Error objects', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce('string error with ECONNRESET')
        .mockResolvedValue('success');
      
      const result = await withRetry(
        mockOperation,
        { maxRetries: 1, initialDelayMs: 10 },
        'test-operation'
      );
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });
});