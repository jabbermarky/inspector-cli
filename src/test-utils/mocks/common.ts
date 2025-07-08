/**
 * Standardized mocks for common modules
 * 
 * Provides consistent mocking for frequently used modules like logger,
 * retry utilities, and URL validation to eliminate duplicate code.
 */

// Re-export logger mocks from dedicated logger mock file
export { createMockLogger as mockLogger, setupLoggerMock } from './logger';

// Re-export strategy mocks from dedicated strategy mock file
export { 
    createMockStrategy, 
    createStrategyPageMock, 
    createFailingStrategy,
    expectValidDetectionResult,
    setupStrategyMocks 
} from './strategies';

/**
 * Standardized retry utility mock
 */
export const mockRetry = {
    withRetry: jest.fn().mockImplementation(async (fn: any) => await fn()),
    withRetryAndTimeout: jest.fn().mockImplementation(async (fn: any) => await fn())
};

/**
 * Standardized URL validation mocks
 */
export const mockUrlValidation = {
    validateUrl: jest.fn().mockReturnValue(undefined),
    normalizeUrl: jest.fn().mockReturnValue('https://example.com'),
    validateAndNormalizeUrl: jest.fn().mockReturnValue('https://example.com')
};

/**
 * Setup function to apply common module mocks
 * Call this in beforeEach or at the top of test files
 */
export function setupCommonMocks(): void {
    // Mock retry utility
    jest.mock('../../utils/retry.js', () => mockRetry);

    // Mock URL validation
    jest.mock('../../utils/url/index.js', () => mockUrlValidation);
}

/**
 * Reset all common mocks - call this in beforeEach
 */
export function resetCommonMocks(): void {
    jest.clearAllMocks();
    
    // Reset retry mocks and restore default implementations
    mockRetry.withRetry.mockClear();
    mockRetry.withRetryAndTimeout.mockClear();
    
    // Restore default retry implementations
    mockRetry.withRetry.mockImplementation(async (fn) => fn());
    mockRetry.withRetryAndTimeout.mockImplementation(async (fn) => fn());
    
    // Reset URL validation mocks and restore default implementations
    mockUrlValidation.validateUrl.mockClear();
    mockUrlValidation.normalizeUrl.mockClear();
    mockUrlValidation.validateAndNormalizeUrl.mockClear();
    
    // Restore default implementations
    mockUrlValidation.validateUrl.mockReturnValue(undefined);
    mockUrlValidation.normalizeUrl.mockReturnValue('https://example.com');
    mockUrlValidation.validateAndNormalizeUrl.mockReturnValue('https://example.com');
}

/**
 * Configure URL validation mock to throw errors
 */
export function makeUrlValidationFail(errorMessage: string = 'Invalid URL format'): void {
    mockUrlValidation.validateUrl.mockImplementation(() => {
        throw new Error(errorMessage);
    });
    mockUrlValidation.normalizeUrl.mockImplementation(() => {
        throw new Error(errorMessage);
    });
    mockUrlValidation.validateAndNormalizeUrl.mockImplementation(() => {
        throw new Error(errorMessage);
    });
}