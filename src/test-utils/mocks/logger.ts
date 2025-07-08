/**
 * Centralized logger mock utilities
 * 
 * Provides a complete mock implementation of the logger module
 * that matches the actual ModuleLogger interface.
 */

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
export const createMockLogger = (): jest.Mocked<MockModuleLogger> => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    apiCall: jest.fn(),
    apiResponse: jest.fn(),
    performance: jest.fn()
});

/**
 * Mock for the createModuleLogger function
 */
export const mockCreateModuleLogger = jest.fn(createMockLogger);

/**
 * Setup the logger module mock
 * DEPRECATED: Use jest.mock() at the top of test files instead
 * 
 * @deprecated Use this pattern instead:
 * ```typescript
 * jest.mock('../../utils/logger.js', () => ({
 *     createModuleLogger: jest.fn(() => ({
 *         debug: jest.fn(),
 *         info: jest.fn(),
 *         warn: jest.fn(),
 *         error: jest.fn(),
 *         apiCall: jest.fn(),
 *         apiResponse: jest.fn(),
 *         performance: jest.fn()
 *     }))
 * }));
 * ```
 */
export function setupLoggerMock(): void {
    console.warn('setupLoggerMock() is deprecated. Use jest.mock() at the top of test files instead.');
    jest.doMock('../../utils/logger.js', () => ({
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
export function getLoggerMock(): jest.Mocked<MockModuleLogger> {
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
export function expectNoLoggerErrors(logger: jest.Mocked<MockModuleLogger>): void {
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
    logger: jest.Mocked<MockModuleLogger>,
    levels: Partial<Record<keyof MockModuleLogger, number>>
): void {
    Object.entries(levels).forEach(([level, count]) => {
        expect(logger[level as keyof MockModuleLogger]).toHaveBeenCalledTimes(count!);
    });
}