/**
 * Common test setup functions
 * 
 * Provides standardized setup and teardown functions that can be
 * reused across test files to ensure consistent test environments.
 */

// Note: jest.mock() calls must be at the top level of each test file
// These setup functions only handle beforeEach/afterEach patterns

export interface TestEnvironmentOptions {
    timeout?: number;
    enableLogs?: boolean;
    enableMetrics?: boolean;
    customUserAgent?: string;
    mockConfig?: Record<string, any>;
}

export interface TestEnvironment {
    timeout: number;
    enableLogs: boolean;
    enableMetrics: boolean;
    customUserAgent?: string;
    mockConfig?: Record<string, any>;
    createdAt: number;
}

export interface TestContextOptions {
    url?: string;
    timeout?: number;
    enableLogs?: boolean;
    userAgent?: string;
    mockBrowser?: boolean;
}

export interface TestContext {
    url: string;
    timeout: number;
    enableLogs: boolean;
    userAgent?: string;
    mockBrowser: boolean;
    createdAt: number;
}

/**
 * Standard test setup for CMS detection tests
 * Call this in describe blocks that test CMS detection functionality
 */
export function setupCMSDetectionTests(): void {
    beforeEach(() => {
        // Common setup for CMS detection tests
        // Individual mocks should be set up using jest.mock() at top level
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });
}

/**
 * Standard test setup for browser-related tests
 * Call this in describe blocks that test browser functionality
 */
export function setupBrowserTests(): void {
    beforeEach(() => {
        // Additional browser-specific setup
        jest.setTimeout(10000); // Longer timeout for browser tests
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });
}

/**
 * Standard test setup for strategy tests
 * Call this in describe blocks that test detection strategies
 */
export function setupStrategyTests(): void {
    beforeEach(() => {
        // Common setup for strategy tests
        // Individual mocks should be set up using jest.mock() at top level
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });
}

/**
 * Standard test setup for analysis tests
 * Call this in describe blocks that test analysis functionality
 */
export function setupAnalysisTests(): void {
    beforeEach(() => {
        // Common setup for analysis tests
        // Individual mocks should be set up using jest.mock() at top level
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });
}

/**
 * Standard test setup for screenshot tests
 * Call this in describe blocks that test screenshot functionality
 */
export function setupScreenshotTests(): void {
    beforeEach(() => {
        // Screenshot tests may need longer timeout
        jest.setTimeout(15000);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });
}

/**
 * Standard test setup for file operation tests
 * Call this in describe blocks that test file operations
 */
export function setupFileTests(): void {
    beforeEach(() => {
        // Common setup for file operation tests
        // Individual mocks should be set up using jest.mock() at top level
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });
}

/**
 * Standard test setup for URL utility tests
 * Call this in describe blocks that test URL utilities
 */
export function setupUrlTests(): void {
    beforeEach(() => {
        // Common setup for URL utility tests
        // Individual mocks should be set up using jest.mock() at top level
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });
}

/**
 * Standard test setup for command tests
 * Call this in describe blocks that test CLI commands
 */
export function setupCommandTests(): void {
    beforeEach(() => {
        // Commands may need longer timeout
        jest.setTimeout(30000);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });
}

/**
 * Sets up a complete test environment with configuration
 */
export function setupTestEnvironment(options: TestEnvironmentOptions = {}): TestEnvironment {
    const env: TestEnvironment = {
        timeout: options.timeout || 30000,
        enableLogs: options.enableLogs || false,
        enableMetrics: options.enableMetrics || false,
        customUserAgent: options.customUserAgent,
        mockConfig: options.mockConfig,
        createdAt: Date.now()
    };

    // Apply timeout if specified
    if (env.timeout !== 30000) {
        jest.setTimeout(env.timeout);
    }

    // Note: Individual mocks should be set up using jest.mock() at top level

    return env;
}

/**
 * Tears down a test environment
 */
export async function teardownTestEnvironment(env: TestEnvironment): Promise<void> {
    if (!env) return;

    jest.clearAllMocks();
    jest.resetModules();
    
    // Reset timeout to default
    jest.setTimeout(5000);
}

/**
 * Creates a test context for specific test scenarios
 */
export function createTestContext(options: TestContextOptions = {}): TestContext {
    return {
        url: options.url || 'https://example.com',
        timeout: options.timeout || 30000,
        enableLogs: options.enableLogs || false,
        userAgent: options.userAgent,
        mockBrowser: options.mockBrowser !== false, // Default to true
        createdAt: Date.now()
    };
}

/**
 * Cleans up a test context
 */
export async function cleanupTestContext(context: TestContext): Promise<void> {
    if (!context) return;

    // Context cleanup logic would go here
    // For now, just ensure mocks are cleared
    jest.clearAllMocks();
}

/**
 * Helper assertion for successful CMS detection results
 */
export function expectSuccessfulDetection(result: any, expectedCMS: string): void {
    expect(result.cms).toBe(expectedCMS);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.originalUrl).toBeDefined();
    expect(result.finalUrl).toBeDefined();
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
    expect(result.detectionMethods).toBeDefined();
}

/**
 * Helper assertion for failed CMS detection results
 */
export function expectFailedDetection(result: any): void {
    expect(result.cms).toBe('Unknown');
    expect(result.confidence).toBe(0);
    // Either error field should be defined OR detection methods should be empty
    if (!result.error) {
        expect(Array.isArray(result.detectionMethods)).toBe(true);
        expect(result.detectionMethods.length).toBe(0);
    }
}

/**
 * Helper assertion for valid detection result structure
 */
export function expectValidResult(result: any): void {
    expect(typeof result.cms).toBe('string');
    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(typeof result.originalUrl).toBe('string');
    expect(typeof result.finalUrl).toBe('string');
    expect(typeof result.executionTime).toBe('number');
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.detectionMethods)).toBe(true);
}

/**
 * Helper assertion for execution time ranges
 */
export function expectDetectionTime(actualTime: number, minTime: number, maxTime: number): void {
    expect(actualTime).toBeGreaterThanOrEqual(minTime);
    expect(actualTime).toBeLessThanOrEqual(maxTime);
}

/**
 * Helper assertion for confidence ranges
 */
export function expectConfidenceRange(confidence: number, minConfidence: number, maxConfidence: number): void {
    expect(confidence).toBeGreaterThanOrEqual(minConfidence);
    expect(confidence).toBeLessThanOrEqual(maxConfidence);
}

/**
 * Common test configuration constants
 */
export const testConfig = {
    defaultTimeout: 5000,
    browserTimeout: 10000,
    screenshotTimeout: 15000,
    commandTimeout: 30000,
    retryAttempts: 3,
    defaultUserAgent: 'Mozilla/5.0 (compatible; Inspector-CLI-Test/1.0)',
    testUrls: {
        valid: 'https://example.com',
        invalid: 'not-a-url',
        timeout: 'https://httpstat.us/504?sleep=10000',
        redirect: 'https://httpstat.us/301'
    }
};

/**
 * Helper function to create test-specific temporary directories
 */
export function createTestTempDir(testName: string): string {
    const sanitizedName = testName.replace(/[^a-zA-Z0-9]/g, '-');
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `/tmp/inspector-cli-test-${sanitizedName}-${timestamp}-${random}`;
}

/**
 * Helper function to clean up test resources
 */
export function cleanupTestResources(): void {
    jest.clearAllMocks();
    jest.resetModules();
}