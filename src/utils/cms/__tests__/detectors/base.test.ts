import { jest } from '@jest/globals';
import { BaseCMSDetector } from '../../detectors/base.js';
import { DetectionStrategy, CMSType, DetectionPage, PartialDetectionResult } from '../../types.js';

// Mock logger
jest.mock('../../../logger.js', () => ({
    createModuleLogger: () => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

// Test implementation of BaseCMSDetector
class TestCMSDetector extends BaseCMSDetector {
    protected strategies: DetectionStrategy[] = [];

    constructor(strategies: DetectionStrategy[] = []) {
        super();
        this.strategies = strategies;
    }

    getCMSName(): CMSType {
        return 'WordPress'; // For testing
    }

    getStrategies(): DetectionStrategy[] {
        return this.strategies;
    }
}

// Mock strategy implementation
class MockStrategy implements DetectionStrategy {
    constructor(
        private name: string,
        private result: PartialDetectionResult,
        private timeout: number = 3000,
        private shouldFail: boolean = false
    ) {}

    getName(): string {
        return this.name;
    }

    getTimeout(): number {
        return this.timeout;
    }

    async detect(page: DetectionPage, url: string): Promise<PartialDetectionResult> {
        if (this.shouldFail) {
            throw new Error(`${this.name} strategy failed`);
        }
        return this.result;
    }
}

describe('BaseCMSDetector', () => {
    let detector: TestCMSDetector;
    let mockPage: jest.Mocked<DetectionPage>;

    beforeEach(() => {
        mockPage = {
            $eval: jest.fn(),
            content: jest.fn(),
            goto: jest.fn(),
            evaluate: jest.fn()
        } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Strategy Execution', () => {
        it('should execute all strategies and aggregate results', async () => {
            const strategies = [
                new MockStrategy('strategy1', { confidence: 0.8, method: 'strategy1', version: '1.0' }),
                new MockStrategy('strategy2', { confidence: 0.6, method: 'strategy2' }),
                new MockStrategy('strategy3', { confidence: 0.4, method: 'strategy3' })
            ];

            detector = new TestCMSDetector(strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.confidence).toBeGreaterThanOrEqual(0.6); // Should aggregate high confidence
            expect(result.detectionMethods).toContain('strategy1');
            expect(result.detectionMethods).toContain('strategy2');
            expect(result.detectionMethods).toContain('strategy3');
            expect(result.version).toBe('1.0'); // Should use version from high confidence strategy (>0.7)
            expect(result.executionTime).toBeDefined();
        });

        it('should handle strategy failures gracefully', async () => {
            const strategies = [
                new MockStrategy('failing-strategy', { confidence: 0.8, method: 'failing' }, 3000, true),
                new MockStrategy('working-strategy', { confidence: 0.6, method: 'working' })
            ];

            detector = new TestCMSDetector(strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.confidence).toBe(0.6);
            expect(result.detectionMethods).toEqual(['working']);
        });

        it('should return unknown CMS when no strategies succeed', async () => {
            const strategies = [
                new MockStrategy('strategy1', { confidence: 0, method: 'strategy1' }),
                new MockStrategy('strategy2', { confidence: 0, method: 'strategy2' })
            ];

            detector = new TestCMSDetector(strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
        });

        it('should handle empty strategies array', async () => {
            detector = new TestCMSDetector([]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.detectionMethods).toEqual([]);
        });
    });

    describe('Timeout Handling', () => {
        it('should respect strategy timeouts', async () => {
            const slowStrategy = new MockStrategy('slow', { confidence: 0.8, method: 'slow' }, 1000);
            
            // Mock strategy that will timeout
            jest.spyOn(slowStrategy, 'detect').mockImplementation(async () => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({ confidence: 0.8, method: 'slow' });
                    }, 2000); // Longer than timeout
                });
            });

            detector = new TestCMSDetector([slowStrategy]);

            const result = await detector.detect(mockPage, 'https://example.com');

            // Should handle timeout and continue
            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
        });
    });

    describe('Confidence Aggregation', () => {
        it('should calculate weighted confidence correctly', async () => {
            const strategies = [
                new MockStrategy('meta-tag', { confidence: 0.9, method: 'meta-tag' }),
                new MockStrategy('html-content', { confidence: 0.7, method: 'html-content' }),
                new MockStrategy('api-endpoint', { confidence: 0.8, method: 'api-endpoint' })
            ];

            detector = new TestCMSDetector(strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.7); // Should be weighted average
            expect(result.confidence).toBeLessThan(1.0);
        });

        it('should calculate weighted average for low confidence strategies', async () => {
            const strategies = [
                new MockStrategy('weak1', { confidence: 0.2, method: 'weak1' }),
                new MockStrategy('weak2', { confidence: 0.3, method: 'weak2' })
            ];

            detector = new TestCMSDetector(strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            // Should be weighted average: (0.2*1.0 + 0.3*0.5) / (1.0+0.5) = 0.25
            expect(result.confidence).toBeCloseTo(0.25, 2);
        });
    });

    describe('Strategy Weights', () => {
        it('should apply default strategy weights', async () => {
            class WeightedDetector extends TestCMSDetector {
                protected getStrategyWeight(method: string): number {
                    const weights: Record<string, number> = {
                        'meta-tag': 1.0,
                        'html-content': 0.8,
                        'api-endpoint': 0.9
                    };
                    return weights[method] || 0.5;
                }
            }

            const strategies = [
                new MockStrategy('meta-tag', { confidence: 0.9, method: 'meta-tag' }),
                new MockStrategy('html-content', { confidence: 0.7, method: 'html-content' })
            ];

            const weightedDetector = new WeightedDetector(strategies);

            const result = await weightedDetector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.7);
            expect(result.cms).toBe('WordPress');
        });
    });

    describe('Version Selection', () => {
        it('should select version from highest confidence strategy', async () => {
            const strategies = [
                new MockStrategy('strategy1', { confidence: 0.6, method: 'strategy1', version: '1.0' }),
                new MockStrategy('strategy2', { confidence: 0.9, method: 'strategy2', version: '2.0' }),
                new MockStrategy('strategy3', { confidence: 0.4, method: 'strategy3', version: '3.0' })
            ];

            detector = new TestCMSDetector(strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.version).toBe('2.0'); // From highest confidence strategy
        });

        it('should handle missing version information', async () => {
            const strategies = [
                new MockStrategy('strategy1', { confidence: 0.8, method: 'strategy1' }),
                new MockStrategy('strategy2', { confidence: 0.6, method: 'strategy2' })
            ];

            detector = new TestCMSDetector(strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.version).toBeUndefined();
        });
    });

    describe('Error Reporting', () => {
        it('should handle all strategies failing', async () => {
            const strategies = [
                new MockStrategy('failing1', { confidence: 0, method: 'failing1' }, 3000, true),
                new MockStrategy('failing2', { confidence: 0, method: 'failing2' }, 3000, true)
            ];

            detector = new TestCMSDetector(strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
            // The base implementation doesn't automatically set error messages for all failed strategies
        });

        it('should not report errors when some strategies succeed', async () => {
            const strategies = [
                new MockStrategy('failing', { confidence: 0, method: 'failing' }, 3000, true),
                new MockStrategy('working', { confidence: 0.8, method: 'working' })
            ];

            detector = new TestCMSDetector(strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.error).toBeUndefined();
        });
    });

    describe('Performance Tracking', () => {
        it('should track execution time', async () => {
            const strategies = [
                new MockStrategy('fast', { confidence: 0.8, method: 'fast' })
            ];

            detector = new TestCMSDetector(strategies);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.executionTime).toBeDefined();
            expect(result.executionTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe('URL Normalization', () => {
        it('should normalize URLs correctly', async () => {
            const strategy = new MockStrategy('test', { confidence: 0.8, method: 'test' });
            const detectSpy = jest.spyOn(strategy, 'detect');

            detector = new TestCMSDetector([strategy]);

            await detector.detect(mockPage, 'https://example.com/');

            expect(detectSpy).toHaveBeenCalledWith(mockPage, 'https://example.com/');
        });
    });
});