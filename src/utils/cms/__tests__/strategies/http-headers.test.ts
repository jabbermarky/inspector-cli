// Mock logger before other imports
jest.mock('../../../logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        apiCall: jest.fn(),
        apiResponse: jest.fn(),
        performance: jest.fn()
    }))
}));

import { HttpHeaderStrategy, HeaderPattern } from '../../strategies/http-headers.js';
import { DetectionPage } from '../../types.js';
import { setupStrategyTests } from '@test-utils';

describe('HttpHeaderStrategy', () => {
    let strategy: HttpHeaderStrategy;
    let mockPage: DetectionPage;

    setupStrategyTests();

    beforeEach(() => {
        mockPage = {
            _browserManagerContext: {
                lastNavigation: {
                    originalUrl: 'https://example.com',
                    finalUrl: 'https://example.com',
                    headers: {}
                }
            }
        } as any;
    });

    describe('Basic functionality', () => {
        beforeEach(() => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Generator',
                    pattern: /WordPress/i,
                    confidence: 0.9,
                    extractVersion: false
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'WordPress', 5000);
        });

        test('should return correct name and timeout', () => {
            expect(strategy.getName()).toBe('http-headers');
            expect(strategy.getTimeout()).toBe(5000);
        });

        test('should handle missing headers gracefully', async () => {
            mockPage._browserManagerContext!.lastNavigation!.headers = {};
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('http-headers');
            expect(result.error).toBe('No response headers available');
        });

        test('should handle missing browser context gracefully', async () => {
            mockPage._browserManagerContext = undefined;
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('http-headers');
            expect(result.error).toBe('No response headers available');
        });
    });

    describe('Pattern matching in header values', () => {
        test('should detect WordPress in X-Generator header', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Generator',
                    pattern: /WordPress/i,
                    confidence: 0.9,
                    extractVersion: false
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'WordPress');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'X-Generator': 'WordPress 6.3',
                'Content-Type': 'text/html'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.9);
            expect(result.method).toBe('http-headers');
            expect(result.evidence).toContain('X-Generator: WordPress 6.3');
        });

        test('should detect string patterns in header values', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'Server',
                    pattern: 'nginx',
                    confidence: 0.5,
                    extractVersion: false
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'Custom');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'Server': 'nginx/1.18.0',
                'Content-Type': 'text/html'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.5);
            expect(result.evidence).toContain('Server: nginx/1.18.0');
        });

        test('should be case-insensitive for string patterns', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Powered-By',
                    pattern: 'wordpress',
                    confidence: 0.8,
                    extractVersion: false
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'WordPress');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'X-Powered-By': 'WordPress/6.3'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.8);
        });
    });

    describe('Case-insensitive header name matching', () => {
        test('should match headers with different casing', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'x-generator',
                    pattern: /WordPress/i,
                    confidence: 0.9,
                    extractVersion: false
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'WordPress');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'X-Generator': 'WordPress 6.3'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.9);
            expect(result.evidence).toContain('X-Generator: WordPress 6.3');
        });

        test('should handle various header name cases', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-DRUPAL-CACHE',
                    pattern: /.*/,
                    confidence: 0.8,
                    extractVersion: false
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'Drupal');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'x-drupal-cache': 'HIT'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.8);
            expect(result.evidence).toContain('x-drupal-cache: HIT');
        });
    });

    describe('Wildcard pattern matching', () => {
        test('should search all headers when pattern name is "*"', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: '*',
                    pattern: 'joomla',
                    confidence: 0.7,
                    extractVersion: false
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'Joomla');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'Server': 'Apache/2.4',
                'X-Custom': 'Joomla CMS System',
                'Content-Type': 'text/html'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.7);
            expect(result.evidence).toContain('X-Custom: Joomla CMS System');
        });

        test('should handle regex patterns with wildcards', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: '*',
                    pattern: /wp-/i,
                    confidence: 0.6,
                    extractVersion: false
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'WordPress');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'Link': '<https://example.com/wp-json/>',
                'Content-Type': 'text/html'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.6);
            expect(result.evidence).toContain('Link: <https://example.com/wp-json/>');
        });
    });

    describe('Version extraction', () => {
        test('should extract version from regex patterns', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Generator',
                    pattern: /WordPress\s+(\d+(?:\.\d+)*)/i,
                    confidence: 0.95,
                    extractVersion: true
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'WordPress');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'X-Generator': 'WordPress 6.3.1'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.95);
            expect(result.version).toBe('6.3.1');
        });

        test('should extract version from Drupal headers', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Generator',
                    pattern: /Drupal\s+(\d+(?:\.\d+)*)/i,
                    confidence: 0.95,
                    extractVersion: true
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'Drupal');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'X-Generator': 'Drupal 10.1.0'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.95);
            expect(result.version).toBe('10.1.0');
        });

        test('should not extract version from string patterns', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Powered-By',
                    pattern: 'WordPress',
                    confidence: 0.8,
                    extractVersion: true // This should be ignored for string patterns
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'WordPress');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'X-Powered-By': 'WordPress 6.3'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.8);
            expect(result.version).toBeUndefined();
        });
    });

    describe('SearchIn parameter functionality', () => {
        test('should search in header names when searchIn is "name"', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Drupal-Cache',
                    pattern: 'drupal',
                    confidence: 0.8,
                    extractVersion: false,
                    searchIn: 'name'
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'Drupal');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'X-Drupal-Cache': 'HIT'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.8);
            expect(result.evidence).toContain('X-Drupal-Cache: HIT');
        });

        test('should search in both names and values when searchIn is "both"', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'Server',
                    pattern: 'apache',
                    confidence: 0.3,
                    extractVersion: false,
                    searchIn: 'both'
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'Generic');

            // Should match in value
            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'Server': 'Apache/2.4.41'
            };

            const result1 = await strategy.detect(mockPage, 'https://example.com');
            expect(result1.confidence).toBe(0.3);

            // Should match in name
            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'Apache-Version': '2.4.41'
            };

            const result2 = await strategy.detect(mockPage, 'https://example.com');
            expect(result2.confidence).toBe(0.3);
        });

        test('should default to searching in values when searchIn is not specified', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Generator',
                    pattern: 'WordPress',
                    confidence: 0.9,
                    extractVersion: false
                    // searchIn not specified, should default to 'value'
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'WordPress');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'X-Generator': 'WordPress 6.3'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.9);
        });
    });

    describe('Multiple patterns and confidence aggregation', () => {
        test('should aggregate confidence from multiple matching patterns', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Generator',
                    pattern: /WordPress/i,
                    confidence: 0.5,
                    extractVersion: false
                },
                {
                    name: '*',
                    pattern: /wp-/i,
                    confidence: 0.3,
                    extractVersion: false
                },
                {
                    name: 'X-Powered-By',
                    pattern: 'PHP',
                    confidence: 0.1,
                    extractVersion: false
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'WordPress');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'X-Generator': 'WordPress 6.3',
                'Link': '<https://example.com/wp-json/>',
                'X-Powered-By': 'PHP/8.1'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.9); // 0.5 + 0.3 + 0.1
            expect(result.evidence).toHaveLength(3);
        });

        test('should cap confidence at 1.0', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Generator',
                    pattern: /Drupal/i,
                    confidence: 0.8,
                    extractVersion: false
                },
                {
                    name: 'X-Drupal-Cache',
                    pattern: /.*/,
                    confidence: 0.7,
                    extractVersion: false
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'Drupal');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'X-Generator': 'Drupal 10',
                'X-Drupal-Cache': 'HIT'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(1.0); // Capped at 1.0 instead of 1.5
        });
    });

    describe('Real-world CMS header patterns', () => {
        test('should detect WordPress with common header patterns', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'link',
                    pattern: /wp-json/i,
                    confidence: 0.9,
                    extractVersion: false,
                    searchIn: 'value'
                },
                {
                    name: 'X-Generator',
                    pattern: /WordPress\s*(\d+(?:\.\d+)*)/i,
                    confidence: 0.95,
                    extractVersion: true,
                    searchIn: 'value'
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'WordPress');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'Link': '<https://example.com/wp-json/>; rel="https://api.w.org/"',
                'X-Generator': 'WordPress 6.3.1'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(1.0); // Both patterns match, capped at 1.0
            expect(result.version).toBe('6.3.1');
        });

        test('should detect Drupal with specific headers', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Generator',
                    pattern: /Drupal\s+(\d+(?:\.\d+)*)/i,
                    confidence: 0.95,
                    extractVersion: true
                },
                {
                    name: 'X-Drupal-Cache',
                    pattern: /.*/,
                    confidence: 0.8,
                    extractVersion: false
                },
                {
                    name: 'X-Drupal-Route-Normalizer',
                    pattern: /.*/,
                    confidence: 0.8,
                    extractVersion: false
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'Drupal');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'X-Generator': 'Drupal 10.1.0',
                'X-Drupal-Cache': 'HIT'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(1.0); // Both patterns match, capped at 1.0
            expect(result.version).toBe('10.1.0');
        });

        test('should detect Joomla with headers', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Content-Encoded-By',
                    pattern: /Joomla/i,
                    confidence: 0.95,
                    extractVersion: false,
                    searchIn: 'value'
                },
                {
                    name: 'X-Generator',
                    pattern: /Joomla\\s*(\\d+(?:\\.\\d+)*)/i,
                    confidence: 0.9,
                    extractVersion: true,
                    searchIn: 'value'
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'Joomla');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'X-Content-Encoded-By': 'Joomla! 4.3',
                'Content-Type': 'text/html'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.95);
        });
    });

    describe('Error handling', () => {
        test('should handle errors gracefully', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Generator',
                    pattern: /WordPress/i,
                    confidence: 0.9,
                    extractVersion: false
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'WordPress');

            // Mock page that throws an error
            const errorPage = {
                get _browserManagerContext() {
                    throw new Error('Network error');
                }
            } as any;

            const result = await strategy.detect(errorPage, 'https://example.com');

            expect(result.confidence).toBe(0);
            expect(result.method).toBe('http-headers');
            expect(result.error).toContain('Header detection failed');
        });
    });

    describe('Evidence collection', () => {
        test('should collect evidence for matched patterns', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Generator',
                    pattern: /WordPress/i,
                    confidence: 0.5,
                    extractVersion: false
                },
                {
                    name: 'Server',
                    pattern: 'nginx',
                    confidence: 0.3,
                    extractVersion: false
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'WordPress');

            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'X-Generator': 'WordPress 6.3',
                'Server': 'nginx/1.18.0'
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.evidence).toHaveLength(2);
            expect(result.evidence).toContain('X-Generator: WordPress 6.3');
            expect(result.evidence).toContain('Server: nginx/1.18.0');
        });

        test('should truncate long header values in evidence', async () => {
            const patterns: HeaderPattern[] = [
                {
                    name: 'X-Custom',
                    pattern: 'test',
                    confidence: 0.5,
                    extractVersion: false
                }
            ];
            strategy = new HttpHeaderStrategy(patterns, 'Custom');

            const longValue = 'test ' + 'x'.repeat(200);
            mockPage._browserManagerContext!.lastNavigation!.headers = {
                'X-Custom': longValue
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.evidence![0]).toContain('...');
            expect(result.evidence![0].length).toBeGreaterThan(100);
            expect(result.evidence![0]).toContain('...');
        });
    });
});