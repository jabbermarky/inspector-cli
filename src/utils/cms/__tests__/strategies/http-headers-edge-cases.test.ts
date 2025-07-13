import { vi } from 'vitest';

// Mock logger before other imports
vi.mock('../../../logger.js', () => ({
    createModuleLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        apiCall: vi.fn(),
        apiResponse: vi.fn(),
        performance: vi.fn()
    }))
}));

import { HttpHeaderStrategy } from '../../strategies/http-headers.js';
import { setupStrategyTests, createMockPage, setupVitestExtensions } from '@test-utils';

// Setup custom Vitest matchers
setupVitestExtensions();

describe('HttpHeaderStrategy - Edge Cases and Invalid Responses', () => {
    let strategy: HttpHeaderStrategy;
    let mockPage: any;

    setupStrategyTests();

    beforeEach(() => {
        strategy = new HttpHeaderStrategy([
            {
                name: 'X-Powered-By',
                pattern: /WordPress/i,
                confidence: 0.9,
                extractVersion: true,
                searchIn: 'value'
            },
            {
                name: 'Server',
                pattern: 'Apache',
                confidence: 0.3,
                extractVersion: false,
                searchIn: 'value'
            },
            {
                name: '*',
                pattern: /wp-/i,
                confidence: 0.5,
                extractVersion: false,
                searchIn: 'both'
            }
        ], 'WordPress', 5000);

        mockPage = createMockPage();
    });

    describe('Missing Browser Context', () => {
        it('should handle missing browser manager context gracefully', async () => {
            mockPage._browserManagerContext = null;

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('http-headers');
            expect(result.error).toBe('No response headers available');
        });

        it('should handle missing navigation data', async () => {
            mockPage._browserManagerContext = {
                purpose: 'detection' as const,
                createdAt: Date.now(),
                navigationCount: 1,
                lastNavigation: null
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('http-headers');
            expect(result.error).toBe('No response headers available');
        });

        it('should handle undefined lastNavigation', async () => {
            mockPage._browserManagerContext = {
                purpose: 'detection' as const,
                createdAt: Date.now(),
                navigationCount: 1
                // lastNavigation is undefined
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('http-headers');
            expect(result.error).toBe('No response headers available');
        });
    });

    describe('Invalid Header Data', () => {
        it('should handle null headers object', async () => {
            mockPage._browserManagerContext = {
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
                    headers: null
                }
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('http-headers');
            expect(result.error).toBe('No response headers available');
        });

        it('should handle undefined headers object', async () => {
            mockPage._browserManagerContext = {
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
                    success: true
                    // headers is undefined
                }
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('http-headers');
            expect(result.error).toBe('No response headers available');
        });

        it('should handle empty headers object', async () => {
            mockPage._browserManagerContext = {
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
                    headers: {}
                }
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('http-headers');
            expect(result.error).toBe('No response headers available');
        });

        it('should handle headers with null/undefined values', async () => {
            mockPage._browserManagerContext = {
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
                    headers: {
                        'x-powered-by': null,
                        'server': undefined,
                        'content-type': 'text/html',
                        'x-wordpress': ''
                    }
                }
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.method).toBe('http-headers');
            // Should handle null/undefined values gracefully without throwing
        });
    });

    describe('Malformed Header Values', () => {
        it('should handle headers with non-string values', async () => {
            mockPage._browserManagerContext = {
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
                    headers: {
                        'x-powered-by': 42 as any, // Number instead of string
                        'server': ['Apache', '2.4'] as any, // Array instead of string
                        'content-type': { type: 'text/html' } as any, // Object instead of string
                        'x-custom': true as any // Boolean instead of string
                    }
                }
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.method).toBe('http-headers');
            // Should handle non-string values gracefully without throwing
        });

        it('should handle headers with extremely long values', async () => {
            const longValue = 'a'.repeat(100000); // 100KB string
            
            mockPage._browserManagerContext = {
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
                    headers: {
                        'x-powered-by': longValue,
                        'server': `Apache ${longValue}`,
                        'content-type': 'text/html'
                    }
                }
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.method).toBe('http-headers');
            // Should handle large values without hanging
        });

        it('should handle headers with special characters and unicode', async () => {
            mockPage._browserManagerContext = {
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
                    headers: {
                        'x-powered-by': 'WordPress 🚀💻',
                        'server': 'Apache/2.4 (\\x00\\x01\\x02)',
                        'x-custom': '测试值',
                        'x-emoji': '😀😃😄😁',
                        'x-special': '\\n\\r\\t\\b\\f',
                        'content-type': 'text/html; charset=utf-8'
                    }
                }
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.method).toBe('http-headers');
            // Version extraction requires regex patterns with capturing groups
        });
    });

    describe('Complex Pattern Matching Edge Cases', () => {
        it('should handle complex regex patterns without hanging', async () => {
            const complexStrategy = new HttpHeaderStrategy([
                {
                    name: 'X-Powered-By',
                    pattern: /WordPress\s+(\d+\.\d+)/i, // Safe regex pattern
                    confidence: 0.9,
                    extractVersion: true,
                    searchIn: 'value'
                }
            ], 'Test', 5000);

            mockPage._browserManagerContext = {
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
                    headers: {
                        'x-powered-by': 'WordPress 6.3.1'
                    }
                }
            };

            const result = await complexStrategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.method).toBe('http-headers');
            expect(result.version).toBe('6.3');
        });

        it('should handle mixed case header names and values', async () => {
            mockPage._browserManagerContext = {
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
                    headers: {
                        'X-POWERED-BY': 'WORDPRESS 6.3',
                        'sErVeR': 'aPaChE/2.4',
                        'Content-Type': 'Text/HTML'
                    }
                }
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.method).toBe('http-headers');
            // Version extraction requires regex with capturing group - current pattern doesn't have one
        });

        it('should handle headers with circular references (if possible)', async () => {
            const circularObj: any = { name: 'test' };
            circularObj.self = circularObj;

            mockPage._browserManagerContext = {
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
                    headers: {
                        'x-powered-by': 'WordPress 6.3',
                        'x-custom': circularObj.toString() // This should not cause infinite loops
                    }
                }
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.method).toBe('http-headers');
        });
    });

    describe('Error Recovery and Resilience', () => {
        it('should handle strategy pattern evaluation errors gracefully', async () => {
            const faultyStrategy = new HttpHeaderStrategy([
                {
                    name: 'X-Powered-By',
                    pattern: 'WordPress',
                    confidence: 0.9,
                    extractVersion: true,
                    searchIn: 'value'
                }
            ], 'WordPress', 5000);

            // Mock a scenario where header processing might throw
            mockPage._browserManagerContext = {
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
                    headers: {
                        'x-powered-by': 'WordPress 6.3',
                        get 'problem-header'() {
                            throw new Error('Getter error');
                        }
                    }
                }
            };

            const result = await faultyStrategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.method).toBe('http-headers');
            // Should handle any errors and still return a result
        });

        it('should handle memory pressure with many headers', async () => {
            const manyHeaders: Record<string, string> = {};
            for (let i = 0; i < 10000; i++) {
                manyHeaders[`x-header-${i}`] = `value-${i}-WordPress-related-content`;
            }

            mockPage._browserManagerContext = {
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
                    headers: manyHeaders
                }
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.method).toBe('http-headers');
            // Should handle many headers efficiently
        });

        it('should handle concurrent strategy executions', async () => {
            mockPage._browserManagerContext = {
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
                    headers: {
                        'x-powered-by': 'WordPress 6.3',
                        'server': 'Apache/2.4'
                    }
                }
            };

            // Run multiple detections concurrently
            const promises = Array(10).fill(0).map(() => 
                strategy.detect(mockPage, 'https://example.com')
            );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(10);
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(result.confidence).toBeGreaterThan(0);
                expect(result.method).toBe('http-headers');
            });
        });
    });

    describe('Performance and Resource Limits', () => {
        it('should complete detection within reasonable time even with complex patterns', async () => {
            const complexPatternStrategy = new HttpHeaderStrategy([
                {
                    name: '*',
                    pattern: /(?=.*word)(?=.*press)(?=.*[0-9]+\.[0-9]+)/i,
                    confidence: 0.9,
                    extractVersion: true,
                    searchIn: 'both'
                }
            ], 'WordPress', 1000); // Short timeout

            mockPage._browserManagerContext = {
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
                    headers: {
                        'x-powered-by': 'WordPress 6.3.1 with many additional features and plugins',
                        'server': 'Apache/2.4 with WordPress optimization'
                    }
                }
            };

            const startTime = Date.now();
            const result = await complexPatternStrategy.detect(mockPage, 'https://example.com');
            const endTime = Date.now();

            expect(result).toBeDefined();
            expect(result.method).toBe('http-headers');
            expect(endTime - startTime).toBeLessThan(2000); // Should complete quickly
        });

        it('should handle zero-timeout scenarios', async () => {
            const zeroTimeoutStrategy = new HttpHeaderStrategy([
                {
                    name: 'X-Powered-By',
                    pattern: 'WordPress',
                    confidence: 0.9,
                    extractVersion: false,
                    searchIn: 'value'
                }
            ], 'WordPress', 0);

            mockPage._browserManagerContext = {
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
                    headers: {
                        'x-powered-by': 'WordPress'
                    }
                }
            };

            const result = await zeroTimeoutStrategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.method).toBe('http-headers');
            expect(result.confidence).toBeGreaterThanOrEqual(0);
        });
    });
});