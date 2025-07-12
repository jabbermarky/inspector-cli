/**
 * Basic tests for logger mock functionality
 * 
 * Tests the core logger mock functionality that can be reliably tested.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { getLoggerMock } from '../../mocks/logger.js';

describe('Logger Mock Basic Functionality', () => {
    describe('getLoggerMock', () => {
        it('should return a logger with all required methods', () => {
            const logger = getLoggerMock();
            
            expect(logger).toBeDefined();
            expect(logger.debug).toBeDefined();
            expect(logger.info).toBeDefined();
            expect(logger.warn).toBeDefined();
            expect(logger.error).toBeDefined();
            expect(logger.apiCall).toBeDefined();
            expect(logger.apiResponse).toBeDefined();
            expect(logger.performance).toBeDefined();
            
            // All should be vi mocks
            expect(vi.isMockFunction(logger.debug)).toBe(true);
            expect(vi.isMockFunction(logger.info)).toBe(true);
            expect(vi.isMockFunction(logger.warn)).toBe(true);
            expect(vi.isMockFunction(logger.error)).toBe(true);
            expect(vi.isMockFunction(logger.apiCall)).toBe(true);
            expect(vi.isMockFunction(logger.apiResponse)).toBe(true);
            expect(vi.isMockFunction(logger.performance)).toBe(true);
        });
        
        it('should allow logger methods to be called', () => {
            const logger = getLoggerMock();
            
            expect(() => {
                logger.info('test message');
                logger.debug('debug message');
                logger.warn('warning message');
                logger.error('error message');
                logger.apiCall('GET', 'https://example.com');
                logger.apiResponse('GET', 'https://example.com', 200, {});
                logger.performance('test operation', 100);
            }).not.toThrow();
        });
        
        it('should track method calls', () => {
            const logger = getLoggerMock();
            
            logger.info('test message');
            logger.debug('debug message');
            
            expect(logger.info).toHaveBeenCalledWith('test message');
            expect(logger.debug).toHaveBeenCalledWith('debug message');
        });
    });
});