/**
 * Configuration mocking utilities
 * Provides standardized config mocking to eliminate duplicate patterns across tests
 */

import type { InspectorConfig } from '../../utils/config.js';

/**
 * Configuration mock options for customizing specific aspects
 */
export interface ConfigMockOptions {
    logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    headless?: boolean;
    timeout?: number;
    viewport?: { width: number; height: number };
    userAgent?: string;
    blockAds?: boolean;
    blockImages?: boolean;
    maxConcurrency?: number;
    temperature?: number;
    model?: string;
    apiKey?: string;
}

/**
 * Creates a mock configuration object with sensible defaults for testing
 * 
 * @param options - Optional overrides for specific config values
 * @returns Complete mock config object
 * 
 * @example
 * ```typescript
 * const config = createMockConfig({ headless: false, timeout: 5000 });
 * jest.doMock('../../utils/config.js', () => ({
 *     getConfig: () => config
 * }));
 * ```
 */
export function createMockConfig(options: ConfigMockOptions = {}): InspectorConfig {
    return {
        openai: {
            apiKey: options.apiKey || 'test-api-key',
            model: options.model || 'gpt-4',
            temperature: options.temperature || 0.7,
            topP: 1.0,
            maxTokens: 2048
        },
        puppeteer: {
            headless: options.headless ?? true,
            timeout: options.timeout || 10000,
            viewport: options.viewport || { width: 1024, height: 768 },
            userAgent: options.userAgent || 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
            blockAds: options.blockAds ?? true,
            blockImages: options.blockImages ?? false,
            maxConcurrency: options.maxConcurrency || 2
        },
        app: {
            environment: 'test',
            screenshotDir: '/tmp/screenshots',
            logLevel: options.logLevel || 'ERROR',
            logFile: '',
            logFormat: 'text'
        },
        api: {
            retryAttempts: 3,
            retryDelay: 1000,
            requestTimeout: 10000,
            enableCaching: false,
            cacheDir: '/tmp/cache'
        }
    };
}

/**
 * Creates a mock config for browser/puppeteer testing scenarios
 * Optimized for fast test execution
 */
export function createTestConfig(): InspectorConfig {
    return createMockConfig({
        logLevel: 'ERROR',
        headless: true,
        timeout: 5000,
        viewport: { width: 800, height: 600 },
        blockAds: true,
        blockImages: true,
        maxConcurrency: 1
    });
}

/**
 * Creates a mock config for development/debugging scenarios
 * Optimized for visibility and debugging
 */
export function createDebugConfig(): InspectorConfig {
    return createMockConfig({
        logLevel: 'DEBUG',
        headless: false,
        timeout: 30000,
        viewport: { width: 1920, height: 1080 },
        blockAds: false,
        blockImages: false,
        maxConcurrency: 1
    });
}

/**
 * Creates a mock config for production-like testing
 * Uses production-like settings but with test-safe values
 */
export function createProductionTestConfig(): InspectorConfig {
    return createMockConfig({
        logLevel: 'WARN',
        headless: true,
        timeout: 15000,
        viewport: { width: 1024, height: 768 },
        blockAds: true,
        blockImages: false,
        maxConcurrency: 2
    });
}

/**
 * Mock function factory for getConfig()
 * Returns a jest mock that can be spied on and configured
 * 
 * @param config - Configuration to return (defaults to createTestConfig())
 * @returns Jest mock function
 * 
 * @example
 * ```typescript
 * const mockGetConfig = createMockGetConfig();
 * jest.doMock('../../utils/config.js', () => ({
 *     getConfig: mockGetConfig
 * }));
 * 
 * // Later in test
 * expect(mockGetConfig).toHaveBeenCalledTimes(1);
 * ```
 */
export function createMockGetConfig(config?: InspectorConfig): jest.MockedFunction<() => InspectorConfig> {
    const mockConfig = config || createTestConfig();
    return jest.fn(() => mockConfig);
}

/**
 * Utility type for easier config mocking in tests
 */
export type MockConfig = jest.Mocked<InspectorConfig>;

/**
 * Utility to create a fully mocked config with jest mocks
 * Useful when you need to spy on config access patterns
 */
export function createSpyableConfig(options: ConfigMockOptions = {}): MockConfig {
    const baseConfig = createMockConfig(options);
    
    // Create a deeply mocked version where each access can be spied on
    return {
        app: {
            logLevel: baseConfig.app.logLevel,
            logFile: baseConfig.app.logFile,
            logFormat: baseConfig.app.logFormat
        },
        puppeteer: {
            headless: baseConfig.puppeteer.headless,
            timeout: baseConfig.puppeteer.timeout,
            viewport: baseConfig.puppeteer.viewport,
            userAgent: baseConfig.puppeteer.userAgent,
            blockAds: baseConfig.puppeteer.blockAds,
            blockImages: baseConfig.puppeteer.blockImages,
            maxConcurrency: baseConfig.puppeteer.maxConcurrency
        },
        openai: {
            apiKey: baseConfig.openai.apiKey,
            temperature: baseConfig.openai.temperature,
            topP: baseConfig.openai.topP,
            maxTokens: baseConfig.openai.maxTokens,
            model: baseConfig.openai.model
        }
    } as MockConfig;
}