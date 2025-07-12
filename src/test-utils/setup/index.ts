/**
 * Test setup utilities
 * 
 * Provides common setup functions and configurations for test files
 * to ensure consistent test environment across the project.
 */

export * from './common-setup.js';
export * from './vitest-extensions.js';

// Re-export commonly used setup functions for convenience
export {
    setupCMSDetectionTests,
    setupBrowserTests,
    setupStrategyTests,
    setupAnalysisTests,
    setupScreenshotTests,
    setupFileTests,
    setupUrlTests,
    setupCommandTests,
    setupInteractiveTests,
    setupTestEnvironment,
    teardownTestEnvironment,
    createTestContext,
    cleanupTestContext,
    expectSuccessfulDetection,
    expectFailedDetection,
    expectValidResult,
    expectDetectionTime,
    expectConfidenceRange,
    testConfig,
    createTestTempDir,
    cleanupTestResources
} from './common-setup.js';

export {
    setupVitestExtensions,
    setupAllVitestExtensions,
    verifyVitestExtensions
} from './vitest-extensions.js';