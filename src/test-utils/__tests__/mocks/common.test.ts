/**
 * Unit tests for common mock utilities
 * 
 * Tests the common utility mocking system including retry, URL validation,
 * and other frequently mocked modules.
 */

import { jest } from '@jest/globals';
import {
    mockRetry,
    mockUrlValidation,
    setupCommonMocks,
    resetCommonMocks,
    makeUrlValidationFail
} from '../../mocks/common.js';

describe('Common Mock Utilities', () => {
    beforeEach(() => {
        resetCommonMocks();
    });
    
    describe('mockRetry', () => {
        it('should have all retry utility methods', () => {
            expect(mockRetry.withRetry).toBeDefined();
            expect(mockRetry.withRetryAndTimeout).toBeDefined();
            expect(jest.isMockFunction(mockRetry.withRetry)).toBe(true);
            expect(jest.isMockFunction(mockRetry.withRetryAndTimeout)).toBe(true);
        });
        
        it('should execute function directly by default', async () => {
            const testFunction = jest.fn<() => Promise<string>>().mockResolvedValue('success');
            
            const result = await mockRetry.withRetry(testFunction);
            
            expect(result).toBe('success');
            expect(testFunction).toHaveBeenCalledTimes(1);
        });
        
        it('should execute function with timeout by default', async () => {
            const testFunction = jest.fn<() => Promise<string>>().mockResolvedValue('timeout success');
            
            const result = await mockRetry.withRetryAndTimeout(testFunction);
            
            expect(result).toBe('timeout success');
            expect(testFunction).toHaveBeenCalledTimes(1);
        });
        
        it('should allow custom mock implementations', async () => {
            const customRetryImpl = jest.fn().mockImplementation(async (fn: any) => {
                try {
                    return await fn();
                } catch (error) {
                    // Simulate one retry
                    return await fn();
                }
            });
            
            mockRetry.withRetry.mockImplementation(customRetryImpl);
            
            const failingFunction = jest.fn<() => Promise<string>>()
                .mockRejectedValueOnce(new Error('First attempt failed'))
                .mockResolvedValueOnce('Second attempt succeeded');
            
            const result = await mockRetry.withRetry(failingFunction);
            
            expect(result).toBe('Second attempt succeeded');
            expect(failingFunction).toHaveBeenCalledTimes(2);
        });
    });
    
    describe('mockUrlValidation', () => {
        it('should have all URL validation methods', () => {
            expect(mockUrlValidation.validateUrl).toBeDefined();
            expect(mockUrlValidation.normalizeUrl).toBeDefined();
            expect(mockUrlValidation.validateAndNormalizeUrl).toBeDefined();
            
            expect(jest.isMockFunction(mockUrlValidation.validateUrl)).toBe(true);
            expect(jest.isMockFunction(mockUrlValidation.normalizeUrl)).toBe(true);
            expect(jest.isMockFunction(mockUrlValidation.validateAndNormalizeUrl)).toBe(true);
        });
        
        it('should return default values by default', () => {
            expect(mockUrlValidation.validateUrl('https://example.com')).toBeUndefined();
            expect(mockUrlValidation.normalizeUrl('https://example.com')).toBe('https://example.com');
            expect(mockUrlValidation.validateAndNormalizeUrl('https://example.com')).toBe('https://example.com');
        });
        
        it('should allow custom return values', () => {
            mockUrlValidation.normalizeUrl.mockReturnValue('https://normalized.com');
            mockUrlValidation.validateAndNormalizeUrl.mockReturnValue('https://validated.com');
            
            expect(mockUrlValidation.normalizeUrl('https://example.com')).toBe('https://normalized.com');
            expect(mockUrlValidation.validateAndNormalizeUrl('https://example.com')).toBe('https://validated.com');
        });
        
        it('should track method calls correctly', () => {
            mockUrlValidation.validateUrl('https://test1.com');
            mockUrlValidation.normalizeUrl('https://test2.com');
            mockUrlValidation.validateAndNormalizeUrl('https://test3.com');
            
            expect(mockUrlValidation.validateUrl).toHaveBeenCalledWith('https://test1.com');
            expect(mockUrlValidation.normalizeUrl).toHaveBeenCalledWith('https://test2.com');
            expect(mockUrlValidation.validateAndNormalizeUrl).toHaveBeenCalledWith('https://test3.com');
        });
    });
    
    describe('makeUrlValidationFail', () => {
        it('should configure all URL validation methods to throw default error', () => {
            makeUrlValidationFail();
            
            expect(() => mockUrlValidation.validateUrl('https://example.com'))
                .toThrow('Invalid URL format');
            expect(() => mockUrlValidation.normalizeUrl('https://example.com'))
                .toThrow('Invalid URL format');
            expect(() => mockUrlValidation.validateAndNormalizeUrl('https://example.com'))
                .toThrow('Invalid URL format');
        });
        
        it('should configure all URL validation methods to throw custom error', () => {
            const customError = 'Custom validation error';
            makeUrlValidationFail(customError);
            
            expect(() => mockUrlValidation.validateUrl('https://example.com'))
                .toThrow(customError);
            expect(() => mockUrlValidation.normalizeUrl('https://example.com'))
                .toThrow(customError);
            expect(() => mockUrlValidation.validateAndNormalizeUrl('https://example.com'))
                .toThrow(customError);
        });
        
        it('should override previous mock configurations', () => {
            // First set up success
            mockUrlValidation.validateUrl.mockReturnValue(undefined);
            mockUrlValidation.normalizeUrl.mockReturnValue('https://success.com');
            
            // Then configure to fail
            makeUrlValidationFail('Now failing');
            
            expect(() => mockUrlValidation.validateUrl('https://example.com'))
                .toThrow('Now failing');
            expect(() => mockUrlValidation.normalizeUrl('https://example.com'))
                .toThrow('Now failing');
        });
    });
    
    describe('setupCommonMocks', () => {
        it('should set up mocks without throwing', () => {
            expect(() => setupCommonMocks()).not.toThrow();
        });
        
        it('should be callable multiple times', () => {
            expect(() => {
                setupCommonMocks();
                setupCommonMocks();
                setupCommonMocks();
            }).not.toThrow();
        });
    });
    
    describe('resetCommonMocks', () => {
        it('should clear all mock call history', () => {
            // Make some calls
            mockRetry.withRetry(jest.fn());
            mockUrlValidation.validateUrl('https://example.com');
            
            expect(mockRetry.withRetry).toHaveBeenCalledTimes(1);
            expect(mockUrlValidation.validateUrl).toHaveBeenCalledTimes(1);
            
            // Reset mocks
            resetCommonMocks();
            
            expect(mockRetry.withRetry).toHaveBeenCalledTimes(0);
            expect(mockUrlValidation.validateUrl).toHaveBeenCalledTimes(0);
        });
        
        it('should reset mock implementations to defaults', async () => {
            // Configure custom implementations
            mockRetry.withRetry.mockImplementation(() => Promise.resolve('custom'));
            mockUrlValidation.normalizeUrl.mockReturnValue('custom-url');
            
            // Verify custom behavior
            await expect(mockRetry.withRetry(jest.fn())).resolves.toBe('custom');
            expect(mockUrlValidation.normalizeUrl('test')).toBe('custom-url');
            
            // Reset and verify default behavior restored
            resetCommonMocks();
            
            const testFn = jest.fn().mockReturnValue('default');
            await expect(mockRetry.withRetry(testFn)).resolves.toBe('default');
            expect(mockUrlValidation.normalizeUrl('test')).toBe('https://example.com');
        });
        
        it('should be safe to call multiple times', () => {
            expect(() => {
                resetCommonMocks();
                resetCommonMocks();
                resetCommonMocks();
            }).not.toThrow();
        });
        
        it('should be safe to call without prior setup', () => {
            expect(() => resetCommonMocks()).not.toThrow();
        });
    });
    
    describe('Integration Testing', () => {
        it('should work together in a typical test scenario', async () => {
            // Setup
            setupCommonMocks();
            
            // Configure URL validation to succeed
            mockUrlValidation.validateAndNormalizeUrl.mockReturnValue('https://validated.example.com');
            
            // Configure retry to execute once
            const testFunction = jest.fn<() => Promise<string>>().mockResolvedValue('test result');
            
            // Execute
            const url = mockUrlValidation.validateAndNormalizeUrl('https://example.com');
            const result = await mockRetry.withRetry(testFunction);
            
            // Verify
            expect(url).toBe('https://validated.example.com');
            expect(result).toBe('test result');
            expect(testFunction).toHaveBeenCalledTimes(1);
            
            // Reset for next test
            resetCommonMocks();
            
            expect(mockUrlValidation.validateAndNormalizeUrl).toHaveBeenCalledTimes(0);
            expect(mockRetry.withRetry).toHaveBeenCalledTimes(0);
        });
        
        it('should handle error scenarios properly', () => {
            // Configure URL validation to fail
            makeUrlValidationFail('URL validation failed');
            
            // Configure retry to fail
            const failingFunction = jest.fn<() => Promise<any>>().mockRejectedValue(new Error('Function failed'));
            mockRetry.withRetry.mockRejectedValue(new Error('Retry failed'));
            
            // Test error handling
            expect(() => mockUrlValidation.validateUrl('bad-url'))
                .toThrow('URL validation failed');
            
            expect(mockRetry.withRetry(failingFunction))
                .rejects.toThrow('Retry failed');
        });
    });
    
    describe('Mock State Management', () => {
        it('should maintain independent mock states', () => {
            // Configure different behaviors for different methods
            mockUrlValidation.validateUrl.mockImplementation(() => { throw new Error('validate error'); });
            mockUrlValidation.normalizeUrl.mockReturnValue('normalized');
            mockRetry.withRetry.mockResolvedValue('retry success');
            
            // Test that each method maintains its own state
            expect(() => mockUrlValidation.validateUrl('test')).toThrow('validate error');
            expect(mockUrlValidation.normalizeUrl('test')).toBe('normalized');
            expect(mockRetry.withRetry(jest.fn())).resolves.toBe('retry success');
        });
        
        it('should allow method-specific resets', () => {
            // Configure and use mocks
            mockUrlValidation.validateUrl('test1');
            mockRetry.withRetry(jest.fn());
            
            // Reset only URL validation mocks
            Object.values(mockUrlValidation).forEach(fn => fn.mockClear());
            
            // Verify URL validation calls reset but retry calls preserved
            expect(mockUrlValidation.validateUrl).toHaveBeenCalledTimes(0);
            expect(mockRetry.withRetry).toHaveBeenCalledTimes(1);
        });
    });
});