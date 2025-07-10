import { jest } from '@jest/globals';
import { ScreenshotValidator } from '../validation.js';
import { ScreenshotValidationError } from '../types.js';
import { setupScreenshotTests } from '@test-utils';

// Mock logger
jest.mock('../../logger.js', () => ({
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

describe('ScreenshotValidator', () => {
    setupScreenshotTests();
    describe('validate', () => {
        it('should pass validation for valid options', () => {
            const validOptions = {
                url: 'https://example.com',
                path: './screenshot.png',
                width: 1024
            };

            expect(() => ScreenshotValidator.validate(validOptions)).not.toThrow();
        });

        it('should reject empty URL', () => {
            const options = {
                url: '',
                path: './screenshot.png',
                width: 1024
            };

            expect(() => ScreenshotValidator.validate(options))
                .toThrow(ScreenshotValidationError);
        });

        it('should reject invalid protocols', () => {
            const options = {
                url: 'ftp://example.com',
                path: './screenshot.png',
                width: 1024
            };

            expect(() => ScreenshotValidator.validate(options))
                .toThrow(ScreenshotValidationError);
        });

        it('should reject invalid width', () => {
            const options = {
                url: 'https://example.com',
                path: './screenshot.png',
                width: 0
            };

            expect(() => ScreenshotValidator.validate(options))
                .toThrow(ScreenshotValidationError);
        });
    });

    describe('normalizeUrl', () => {
        it('should add HTTP to URLs without protocol', () => {
            const url = 'example.com';
            expect(ScreenshotValidator.normalizeUrl(url)).toBe('http://example.com');
        });

        it('should not modify HTTPS URLs', () => {
            const url = 'https://example.com';
            expect(ScreenshotValidator.normalizeUrl(url)).toBe(url);
        });

        it('should not modify HTTP URLs', () => {
            const url = 'http://example.com';
            expect(ScreenshotValidator.normalizeUrl(url)).toBe(url);
        });
    });
});