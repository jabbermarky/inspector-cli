/**
 * Centralized Strategy Mock Utilities
 * 
 * Consolidates 3 different strategy mocking patterns across 12 test files
 * into standardized, type-safe utilities for all testing scenarios.
 */

import { vi } from 'vitest';
import { DetectionStrategy, PartialDetectionResult, DetectionPage } from '../../utils/cms/types.js';

export type StrategyType = 'meta-tag' | 'http-headers' | 'robots-txt' | 'api-endpoint' | 'html-content';
export type ErrorType = 'timeout' | 'network' | 'parse' | 'evaluation' | 'generic';

export interface MockStrategyOptions {
    name?: string;
    confidence?: number;
    timeout?: number;
    version?: string;
    evidence?: string[];
    executionTime?: number;
    shouldFail?: boolean;
    errorMessage?: string;
}

export interface StrategyPageMockData {
    // Meta tag strategy data
    metaTags?: Array<{
        name?: string;
        property?: string;
        content: string;
        httpEquiv?: string;
    }>;
    
    // HTTP headers strategy data
    httpHeaders?: Record<string, string>;
    
    // Robots.txt strategy data
    robotsTxtData?: {
        accessible: boolean;
        content: string;
        patterns?: {
            disallowedPaths: string[];
            sitemapUrls: string[];
            userAgents?: string[];
        };
        size?: number;
        statusCode?: number;
        error?: string;
    };
    
    // API endpoint strategy data
    apiResponse?: any;
    apiStatusCode?: number;
    
    // HTML content strategy data
    htmlContent?: string;
}

export interface StrategyTestCase {
    name: string;
    pageData: StrategyPageMockData;
    expected: Partial<PartialDetectionResult>;
    shouldFail?: boolean;
}

/**
 * Creates a configurable mock strategy for testing
 */
export function createMockStrategy(options: MockStrategyOptions = {}): any {
    const {
        name = 'mock-strategy',
        confidence = 0.9,
        timeout = 5000,
        version,
        evidence = ['Mock detection evidence'],
        executionTime = 100,
        shouldFail = false,
        errorMessage = 'Mock strategy error'
    } = options;

    const mockStrategy = {
        getName: vi.fn().mockReturnValue(name),
        getTimeout: vi.fn().mockReturnValue(timeout),
        detect: vi.fn()
    } as any;

    if (shouldFail) {
        mockStrategy.detect.mockRejectedValue(new Error(errorMessage));
    } else {
        mockStrategy.detect.mockResolvedValue({
            confidence,
            method: name,
            version,
            evidence,
            executionTime
        });
    }

    return mockStrategy;
}

/**
 * Creates a strategy-specific page mock with proper data structure
 */
export function createStrategyPageMock(strategyType: StrategyType, data: StrategyPageMockData): any {
    const basePage = {
        url: vi.fn().mockReturnValue('https://example.com'),
        title: vi.fn().mockResolvedValue('Test Page'),
        content: vi.fn().mockResolvedValue('<html><body>Test content</body></html>'),
        goto: vi.fn().mockResolvedValue(undefined),
        evaluate: vi.fn(),
        $eval: vi.fn(),
        $$eval: vi.fn(),
        setUserAgent: vi.fn(),
        setViewport: vi.fn(),
        waitForSelector: vi.fn(),
        waitForFunction: vi.fn(),
        waitForTimeout: vi.fn(),
        screenshot: vi.fn(),
        setDefaultNavigationTimeout: vi.fn(),
        setDefaultTimeout: vi.fn()
    };

    // Configure strategy-specific mock data
    switch (strategyType) {
        case 'meta-tag':
            if (data.metaTags) {
                basePage.evaluate.mockImplementation((fn: Function) => {
                    const fnStr = fn.toString();
                    if (fnStr.includes('querySelectorAll') && fnStr.includes('meta')) {
                        return Promise.resolve(data.metaTags);
                    }
                    return Promise.resolve([]);
                });
            }
            break;

        case 'http-headers':
            if (data.httpHeaders) {
                (basePage as any)._browserManagerContext = {
                    purpose: 'detection' as const,
                    createdAt: Date.now(),
                    navigationCount: 1,
                    lastNavigation: {
                        originalUrl: 'https://example.com',
                        finalUrl: 'https://example.com',
                        redirectChain: [],
                        totalRedirects: 0,
                        navigationTime: 1000,
                        protocolUpgraded: false,
                        success: true,
                        headers: data.httpHeaders
                    }
                };
            }
            break;

        case 'robots-txt':
            if (data.robotsTxtData) {
                (basePage as any)._robotsTxtData = data.robotsTxtData;
            }
            break;

        case 'api-endpoint':
            if (data.apiResponse !== undefined) {
                basePage.evaluate.mockResolvedValue(data.apiResponse);
            }
            if (data.apiStatusCode !== undefined) {
                // Mock response with status code
                basePage.goto.mockImplementation(() => {
                    const response = {
                        status: () => data.apiStatusCode!,
                        ok: () => data.apiStatusCode! >= 200 && data.apiStatusCode! < 300
                    };
                    return Promise.resolve(response);
                });
            }
            break;

        case 'html-content':
            if (data.htmlContent) {
                basePage.content.mockResolvedValue(data.htmlContent);
            }
            break;
    }

    return basePage;
}

/**
 * Creates a strategy that simulates specific error conditions
 */
export function createFailingStrategy(errorType: ErrorType, customMessage?: string): any {
    const errorMessages = {
        timeout: 'Strategy timeout exceeded',
        network: 'Network request failed',
        parse: 'Failed to parse response',
        evaluation: 'Page evaluation failed',
        generic: 'Strategy execution failed'
    };

    const errorMessage = customMessage || errorMessages[errorType];
    const error = new Error(errorMessage);

    // Add specific error properties based on type
    switch (errorType) {
        case 'timeout':
            (error as any).code = 'TIMEOUT';
            break;
        case 'network':
            (error as any).code = 'NETWORK_ERROR';
            break;
        case 'parse':
            (error as any).code = 'PARSE_ERROR';
            break;
        case 'evaluation':
            (error as any).code = 'EVALUATION_ERROR';
            break;
    }

    return createMockStrategy({
        name: `failing-${errorType}-strategy`,
        shouldFail: true,
        errorMessage
    });
}

/**
 * Creates multiple mock strategies for testing strategy aggregation
 */
export function createMockStrategySet(count: number = 3): any[] {
    const strategies: any[] = [];
    
    for (let i = 0; i < count; i++) {
        strategies.push(createMockStrategy({
            name: `strategy-${i + 1}`,
            confidence: Math.min(0.8 + (i * 0.02), 1.0), // Vary confidence, cap at 1.0
            timeout: 3000 + (i * 1000),   // Vary timeout
            executionTime: 100 + (i * 50) // Vary execution time
        }));
    }
    
    return strategies;
}

/**
 * Creates a mixed set of successful and failing strategies
 */
export function createMixedStrategySet(): any[] {
    return [
        createMockStrategy({ name: 'successful-strategy-1', confidence: 0.9 }),
        createFailingStrategy('timeout'),
        createMockStrategy({ name: 'successful-strategy-2', confidence: 0.8 }),
        createFailingStrategy('network'),
        createMockStrategy({ name: 'successful-strategy-3', confidence: 0.7 })
    ];
}

/**
 * Validates that a result matches the PartialDetectionResult interface
 */
export function expectValidDetectionResult(result: any): void {
    expect(result).toBeDefined();
    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(typeof result.method).toBe('string');
    expect(result.method.length).toBeGreaterThan(0);
    
    // Optional fields
    if (result.version !== undefined) {
        expect(typeof result.version).toBe('string');
    }
    if (result.evidence !== undefined) {
        expect(Array.isArray(result.evidence)).toBe(true);
    }
    if (result.error !== undefined) {
        expect(typeof result.error).toBe('string');
    }
    if (result.executionTime !== undefined) {
        expect(typeof result.executionTime).toBe('number');
        expect(result.executionTime).toBeGreaterThanOrEqual(0);
    }
}

/**
 * Creates an automated test suite for a strategy with common test cases
 */
export function createStrategyTestSuite(
    strategy: DetectionStrategy, 
    testCases: StrategyTestCase[]
): void {
    describe(`${strategy.getName()} Strategy Tests`, () => {
        testCases.forEach(testCase => {
            it(testCase.name, async () => {
                // Determine strategy type from strategy name
                const strategyName = strategy.getName().toLowerCase();
                let strategyType: StrategyType = 'meta-tag'; // default
                
                if (strategyName.includes('meta')) strategyType = 'meta-tag';
                else if (strategyName.includes('header')) strategyType = 'http-headers';
                else if (strategyName.includes('robots')) strategyType = 'robots-txt';
                else if (strategyName.includes('api')) strategyType = 'api-endpoint';
                else if (strategyName.includes('html')) strategyType = 'html-content';

                const mockPage = createStrategyPageMock(strategyType, testCase.pageData);
                
                if (testCase.shouldFail) {
                    await expect(strategy.detect(mockPage, 'https://example.com'))
                        .rejects.toThrow();
                } else {
                    const result = await strategy.detect(mockPage, 'https://example.com');
                    expectValidDetectionResult(result);
                    
                    // Check expected values
                    Object.entries(testCase.expected).forEach(([key, value]) => {
                        expect(result[key as keyof PartialDetectionResult]).toEqual(value);
                    });
                }
            });
        });
    });
}

/**
 * Legacy MockDetectionStrategy class for backward compatibility
 * Migrate to createMockStrategy() for new tests
 */
export class MockDetectionStrategy implements DetectionStrategy {
    constructor(
        private name: string,
        private confidence: number,
        private shouldFail: boolean = false,
        private executionTime: number = 100,
        private version?: string,
        private evidence?: string[]
    ) {}

    getName(): string {
        return this.name;
    }

    getTimeout(): number {
        return 5000;
    }

    async detect(page: DetectionPage, url: string): Promise<PartialDetectionResult> {
        // Simulate execution time
        await new Promise(resolve => setTimeout(resolve, this.executionTime));
        
        if (this.shouldFail) {
            throw new Error(`${this.name} strategy failed`);
        }

        return {
            confidence: this.confidence,
            method: this.name,
            evidence: this.evidence || [`${this.name} evidence for ${url}`],
            executionTime: this.executionTime,
            version: this.version
        };
    }
}

/**
 * Legacy function for backward compatibility
 * Migrate to createMockStrategySet() for new tests
 */
export function createMockStrategies(): {
    successful: MockDetectionStrategy;
    failing: MockDetectionStrategy;
    lowConfidence: MockDetectionStrategy;
    highConfidence: MockDetectionStrategy;
    withVersion: MockDetectionStrategy;
} {
    return {
        successful: new MockDetectionStrategy('successful-strategy', 0.8, false, 50),
        failing: new MockDetectionStrategy('failing-strategy', 0.7, true, 100),
        lowConfidence: new MockDetectionStrategy('low-confidence-strategy', 0.2, false, 25),
        highConfidence: new MockDetectionStrategy('high-confidence-strategy', 0.95, false, 75),
        withVersion: new MockDetectionStrategy('version-strategy', 0.9, false, 100, '6.3.1', ['Version 6.3.1 detected'])
    };
}

/**
 * Sets up common strategy mock patterns for tests
 */
export function setupStrategyMocks(): void {
    // This can be used in test setup to configure common mock patterns
    // Currently empty but can be extended as needed
}

/**
 * Resets all strategy mocks between tests
 */
export function resetStrategyMocks(): void {
    vi.clearAllMocks();
}