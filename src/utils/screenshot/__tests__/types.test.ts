import { ScreenshotError, ScreenshotValidationError, ScreenshotNetworkError } from '../types.js';
import { setupVitestExtensions } from '@test-utils';

// Setup custom matchers
setupVitestExtensions();

describe('Screenshot Error Classes', () => {
    describe('ScreenshotError', () => {
        it('should create error with message', () => {
            const error = new ScreenshotError('Test error');
            
            expect(error.message).toBe('Test error');
            expect(error.name).toBe('ScreenshotError');
        });

        it('should create error with options', () => {
            const cause = new Error('Original error');
            const error = new ScreenshotError('Test error', {
                cause,
                code: 'TEST_CODE',
                url: 'https://example.com',
                context: { test: true }
            });
            
            expect(error.message).toBe('Test error');
            expect(error.name).toBe('ScreenshotError');
            expect(error.code).toBe('TEST_CODE');
            expect(error.url).toBe('https://example.com');
            expect(error.context).toEqual({ test: true });
            expect(error.cause).toBe(cause);
        });
    });

    describe('ScreenshotValidationError', () => {
        it('should create validation error', () => {
            const error = new ScreenshotValidationError('Invalid field', {
                field: 'url',
                value: ''
            });
            
            expect(error.message).toBe('Invalid field');
            expect(error.name).toBe('ScreenshotValidationError');
            expect(error.field).toBe('url');
            expect(error.value).toBe('');
            expect(error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('ScreenshotNetworkError', () => {
        it('should create network error', () => {
            const error = new ScreenshotNetworkError('Network failed', {
                networkError: 'timeout',
                url: 'https://example.com'
            });
            
            expect(error.message).toBe('Network failed');
            expect(error.name).toBe('ScreenshotNetworkError');
            expect(error.networkError).toBe('timeout');
            expect(error.url).toBe('https://example.com');
            expect(error.code).toBe('NETWORK_ERROR');
        });
    });
});