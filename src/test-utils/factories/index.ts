/**
 * Mock factory functions
 * 
 * Provides configurable factory functions for creating mock objects
 * with standardized interfaces and customizable behavior.
 */

export * from './page-factory.js';
export * from './result-factory.js';

// Re-export commonly used factories for convenience
export {
    createMockPage,
    createMetaTagMockPage,
    createHttpHeaderMockPage,
    createCMSMockPage
} from './page-factory.js';

export {
    createDetectionResult,
    createWordPressResult,
    createDrupalResult,
    createJoomlaResult,
    createFailedResult,
    createMockDataPoint,
    createPartialDetectionResult
} from './result-factory.js';