/**
 * Centralized logger mock utilities
 * 
 * Provides a complete mock implementation of the logger module
 * that matches the actual ModuleLogger interface.
 */

import { vi } from 'vitest';

/**
 * Interface matching the actual ModuleLogger class
 * Used for type-safe mocking without depending on the actual implementation
 */
export interface MockModuleLogger {
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any, error?: Error): void;
    error(message: string, data?: any, error?: Error): void;
    apiCall(method: string, url: string, data?: any): void;
    apiResponse(method: string, url: string, status: number, data?: any): void;
    performance(operation: string, duration: number): void;
}

/**
 * Complete mock implementation of ModuleLogger
 * Includes all methods from the actual implementation
 */
export const createMockLogger = (): any => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    apiCall: vi.fn(),
    apiResponse: vi.fn(),
    performance: vi.fn()
});

/**
 * Mock for the createModuleLogger function
 */
export const mockCreateModuleLogger = vi.fn(createMockLogger);

/**
 * Setup the logger module mock
 * DEPRECATED: Use vi.mock() at the top of test files instead
 * 
 * @deprecated Use this pattern instead:
 * ```typescript
 * vi.mock('../../utils/logger.js', () => ({
 *     createModuleLogger: vi.fn(() => ({
 *         debug: vi.fn(),
 *         info: vi.fn(),
 *         warn: vi.fn(),
 *         error: vi.fn(),
 *         apiCall: vi.fn(),
 *         apiResponse: vi.fn(),
 *         performance: vi.fn()
 *     }))
 * }));
 * ```
 */
export function setupLoggerMock(): void {
    console.warn('setupLoggerMock() is deprecated. Use vi.mock() at the top of test files instead.');
    vi.doMock('../../utils/logger.js', () => ({
        createModuleLogger: mockCreateModuleLogger
    }));
}

/**
 * Get a fresh logger mock instance
 * Useful when you need a separate logger instance for testing
 * 
 * @example
 * ```typescript
 * const logger = getLoggerMock();
 * // Use in your test
 * expect(logger.error).toHaveBeenCalledWith('Error message');
 * ```
 */
export function getLoggerMock(): any {
    return createMockLogger();
}

/**
 * Reset all logger mocks
 * Call this in beforeEach to ensure clean state between tests
 */
export function resetLoggerMocks(): void {
    mockCreateModuleLogger.mockClear();
    // Clear all instances created by mockCreateModuleLogger
    mockCreateModuleLogger.mock.results.forEach(result => {
        if (result.type === 'return' && result.value) {
            Object.values(result.value).forEach((fn: any) => {
                if (typeof fn === 'function' && fn.mockClear) {
                    fn.mockClear();
                }
            });
        }
    });
}

/**
 * Verify no logger errors were recorded
 * Useful assertion helper for tests
 */
export function expectNoLoggerErrors(logger: any): void {
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
}

/**
 * Verify logger was called with specific log levels
 * @param logger - The logger mock to check
 * @param levels - Object mapping log levels to expected call counts
 * 
 * @example
 * ```typescript
 * expectLoggerCalls(logger, {
 *     info: 2,
 *     debug: 1,
 *     error: 0
 * });
 * ```
 */
export function expectLoggerCalls(
    logger: any,
    levels: Partial<Record<keyof MockModuleLogger, number>>
): void {
    Object.entries(levels).forEach(([level, count]) => {
        expect(logger[level as keyof MockModuleLogger]).toHaveBeenCalledTimes(count!);
    });
}