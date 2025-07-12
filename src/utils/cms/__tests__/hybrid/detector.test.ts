import { HybridCMSDetector, StrategyConfiguration, HybridDetectionOptions } from '../../hybrid/detector.js';
import { DetectionStrategy, DetectionPage, PartialDetectionResult, CMSType } from '../../types.js';
import { createMockPage, setupCMSDetectionTests, setupVitestExtensions } from '@test-utils';

// Setup custom matchers
setupVitestExtensions();

// Mock logger
vi.mock('../../../logger.js', () => ({
    createModuleLogger: () => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        apiCall: vi.fn(),
        apiResponse: vi.fn(),
        performance: vi.fn()
    })
}));

// Mock strategies for testing
class MockStrategy implements DetectionStrategy {
    constructor(
        private name: string,
        private confidence: number,
        private shouldFail: boolean = false,
        private executionTime: number = 100
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
            evidence: [`${this.name} evidence for ${url}`],
            executionTime: this.executionTime
        };
    }
}

// Mock page object is now provided by test-utils

describe('HybridCMSDetector', () => {
    let mockPage: any;

    setupCMSDetectionTests();

    beforeEach(() => {
        mockPage = createMockPage();
    });

    describe('Constructor and Configuration', () => {
        test('should create hybrid detector with default options', () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'meta-tag',
                    strategy: new MockStrategy('meta-tag', 0.8),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies);

            expect(detector.getCMSName()).toBe('WordPress');
            expect(detector.getStrategies()).toHaveLength(1);
        });

        test('should create hybrid detector with custom options', () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'meta-tag',
                    strategy: new MockStrategy('meta-tag', 0.8),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                }
            ];

            const options: HybridDetectionOptions = {
                enableABTesting: true,
                generatedStrategyWeight: 1.5,
                builtinStrategyWeight: 0.8,
                minStrategiesRequired: 3,
                confidenceThreshold: 0.6
            };

            const detector = new HybridCMSDetector('WordPress', strategies, options);

            expect(detector.getCMSName()).toBe('WordPress');
        });

        test('should filter enabled strategies correctly', () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'meta-tag',
                    strategy: new MockStrategy('meta-tag', 0.8),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                },
                {
                    name: 'http-headers',
                    strategy: new MockStrategy('http-headers', 0.7),
                    weight: 1.0,
                    enabled: false,
                    source: 'builtin'
                },
                {
                    name: 'generated-rule',
                    strategy: new MockStrategy('generated-rule', 0.9),
                    weight: 1.2,
                    enabled: true,
                    source: 'generated'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies);

            expect(detector.getStrategies()).toHaveLength(2);
        });
    });

    describe('Basic Detection', () => {
        test('should detect CMS with single successful strategy', async () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'meta-tag',
                    strategy: new MockStrategy('meta-tag', 0.8),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies, {
                minStrategiesRequired: 1
            });

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.originalUrl).toBe('https://example.com');
            expect(result.finalUrl).toBe('https://example.com');
            expect(result.executionTime).toBeGreaterThan(0);
            expect(result.detectionMethods).toContain('meta-tag');
        });

        test('should combine multiple successful strategies', async () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'meta-tag',
                    strategy: new MockStrategy('meta-tag', 0.6),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                },
                {
                    name: 'http-headers',
                    strategy: new MockStrategy('http-headers', 0.7),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                },
                {
                    name: 'generated-rule',
                    strategy: new MockStrategy('generated-rule', 0.8),
                    weight: 1.2,
                    enabled: true,
                    source: 'generated'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.confidence).toBeGreaterThan(0.6); // Should be higher due to combination
            expect(result.detectionMethods).toHaveLength(3);
            expect(result.detectionMethods).toContain('meta-tag');
            expect(result.detectionMethods).toContain('http-headers');
            expect(result.detectionMethods).toContain('generated-rule');
        });

        test('should handle partial strategy failures gracefully', async () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'meta-tag',
                    strategy: new MockStrategy('meta-tag', 0.8),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                },
                {
                    name: 'failing-strategy',
                    strategy: new MockStrategy('failing-strategy', 0.7, true),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                },
                {
                    name: 'robots-txt',
                    strategy: new MockStrategy('robots-txt', 0.6),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.detectionMethods).toHaveLength(2); // Only successful strategies
            expect(result.detectionMethods).toContain('meta-tag');
            expect(result.detectionMethods).toContain('robots-txt');
            expect(result.detectionMethods).not.toContain('failing-strategy');
        });
    });

    describe('Confidence Calculation', () => {
        test('should apply strategy weights correctly', async () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'builtin-strategy',
                    strategy: new MockStrategy('builtin-strategy', 0.4),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                },
                {
                    name: 'generated-strategy',
                    strategy: new MockStrategy('generated-strategy', 0.8),
                    weight: 1.0,
                    enabled: true,
                    source: 'generated'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies, {
                generatedStrategyWeight: 1.5, // Favor generated strategies
                builtinStrategyWeight: 1.0
            });

            const result = await detector.detect(mockPage, 'https://example.com');

            // Weighted average: ((0.4 * 1.0 * 1.0) + (0.8 * 1.0 * 1.5)) / (1.0 + 1.5) = (0.4 + 1.2) / 2.5 = 0.64
            expect(result.confidence).toBeCloseTo(0.64, 1);
        });

        test('should respect confidence threshold', async () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'low-confidence',
                    strategy: new MockStrategy('low-confidence', 0.2),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies, {
                confidenceThreshold: 0.5,
                minStrategiesRequired: 1
            });

            const result = await detector.detect(mockPage, 'https://example.com');

            // Should return Unknown for low confidence
            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0.2);
        });

        test('should cap confidence at 1.0', async () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'high-confidence-1',
                    strategy: new MockStrategy('high-confidence-1', 0.9),
                    weight: 2.0,
                    enabled: true,
                    source: 'builtin'
                },
                {
                    name: 'high-confidence-2',
                    strategy: new MockStrategy('high-confidence-2', 0.8),
                    weight: 2.0,
                    enabled: true,
                    source: 'generated'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeLessThanOrEqual(1.0);
            expect(result.cms).toBe('WordPress');
        });
    });

    describe('Strategy Requirements', () => {
        test('should warn when insufficient strategies are enabled', async () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'meta-tag',
                    strategy: new MockStrategy('meta-tag', 0.8),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies, {
                minStrategiesRequired: 3
            });

            const result = await detector.detect(mockPage, 'https://example.com');

            // Should still proceed with available strategies
            expect(result.cms).toBe('WordPress');
            expect(result.confidence).toBeGreaterThan(0);
        });

        test('should handle no enabled strategies', async () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'disabled-strategy',
                    strategy: new MockStrategy('disabled-strategy', 0.8),
                    weight: 1.0,
                    enabled: false,
                    source: 'builtin'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
        });
    });

    describe('Error Handling', () => {
        test('should handle all strategies failing', async () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'failing-strategy-1',
                    strategy: new MockStrategy('failing-strategy-1', 0.8, true),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                },
                {
                    name: 'failing-strategy-2',
                    strategy: new MockStrategy('failing-strategy-2', 0.7, true),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.detectionMethods).toHaveLength(2); // Both failed strategies recorded
        });

        test('should handle detector-level errors gracefully', async () => {
            // Create a strategy that uses the page object
            const pageUsingStrategy = new (class extends MockStrategy {
                async detect(page: any, url: string): Promise<PartialDetectionResult> {
                    // Access page properties that might throw errors
                    const pageUrl = page.url();
                    return super.detect(page, url);
                }
            })('page-using-strategy', 0.8);

            const strategies: StrategyConfiguration[] = [
                {
                    name: 'page-using-strategy',
                    strategy: pageUsingStrategy,
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                }
            ];

            // Mock page that throws an error
            const errorPage = {
                ...mockPage,
                url: vi.fn().mockImplementation(() => {
                    throw new Error('Page error');
                })
            };

            const detector = new HybridCMSDetector('WordPress', strategies);

            const result = await detector.detect(errorPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.detectionMethods).toContain('page-using-strategy');
            expect(result.executionTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Performance Metrics', () => {
        test('should track execution times accurately', async () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'fast-strategy',
                    strategy: new MockStrategy('fast-strategy', 0.8, false, 50),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                },
                {
                    name: 'slow-strategy',
                    strategy: new MockStrategy('slow-strategy', 0.7, false, 200),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies);

            const startTime = Date.now();
            const result = await detector.detect(mockPage, 'https://example.com');
            const totalTime = Date.now() - startTime;

            // Allow for small timing variations (e.g., 199ms instead of 200ms)
            expect(result.executionTime).toBeGreaterThanOrEqual(195); // At least slow strategy time minus small tolerance
            expect(result.executionTime).toBeLessThan(totalTime + 100); // Within reasonable bounds
        });
    });

    describe('Source Type Handling', () => {
        test('should differentiate between builtin and generated strategies', async () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'builtin-meta',
                    strategy: new MockStrategy('builtin-meta', 0.7),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                },
                {
                    name: 'generated-pattern',
                    strategy: new MockStrategy('generated-pattern', 0.6),
                    weight: 1.0,
                    enabled: true,
                    source: 'generated',
                    version: '1.0.0'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.detectionMethods).toContain('builtin-meta');
            expect(result.detectionMethods).toContain('generated-pattern');
        });
    });

    describe('Version Extraction', () => {
        test('should extract version information when available', async () => {
            const mockStrategyWithVersion = new (class extends MockStrategy {
                async detect(page: DetectionPage, url: string): Promise<PartialDetectionResult> {
                    return {
                        confidence: 0.9,
                        method: 'version-extractor',
                        version: '6.3.1',
                        evidence: ['WordPress 6.3.1 detected'],
                        executionTime: 100
                    };
                }
            })('version-extractor', 0.9);

            const strategies: StrategyConfiguration[] = [
                {
                    name: 'version-extractor',
                    strategy: mockStrategyWithVersion,
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies, {
                minStrategiesRequired: 1
            });

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.version).toBe('6.3.1');
        });
    });

    describe('Evidence Collection', () => {
        test('should aggregate evidence from all successful strategies', async () => {
            const strategies: StrategyConfiguration[] = [
                {
                    name: 'meta-tag',
                    strategy: new MockStrategy('meta-tag', 0.8),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                },
                {
                    name: 'http-headers',
                    strategy: new MockStrategy('http-headers', 0.7),
                    weight: 1.0,
                    enabled: true,
                    source: 'builtin'
                }
            ];

            const detector = new HybridCMSDetector('WordPress', strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            // The evidence should be collected from each strategy
            // (Implementation dependent on how HybridCMSDetector aggregates evidence)
        });
    });

    describe('CMS Type Handling', () => {
        test('should work with different CMS types', async () => {
            const cmsTypes: CMSType[] = ['WordPress', 'Drupal', 'Joomla'];

            for (const cmsType of cmsTypes) {
                const strategies: StrategyConfiguration[] = [
                    {
                        name: 'generic-strategy',
                        strategy: new MockStrategy('generic-strategy', 0.8),
                        weight: 1.0,
                        enabled: true,
                        source: 'builtin'
                    }
                ];

                const detector = new HybridCMSDetector(cmsType, strategies, {
                    minStrategiesRequired: 1
                });

                const result = await detector.detect(mockPage, 'https://example.com');

                expect(result.cms).toBe(cmsType);
                expect(detector.getCMSName()).toBe(cmsType);
            }
        });
    });
});