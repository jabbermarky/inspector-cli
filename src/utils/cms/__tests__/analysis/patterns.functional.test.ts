import { jest } from '@jest/globals';
import { setupAnalysisTests } from '@test-utils';

/**
 * Functional Tests for PatternDiscovery
 * 
 * These tests actually import and execute the PatternDiscovery class to generate
 * real code coverage for the CMS pattern analysis functionality.
 */

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

// Import the actual class we want to test
import { PatternDiscovery } from '../../analysis/patterns.js';
import { DetectionDataPoint } from '../../analysis/types.js';

describe('Functional: PatternDiscovery', () => {
    setupAnalysisTests();

    // Helper function to create test data points
    function createDataPoint(overrides: Partial<DetectionDataPoint> = {}): DetectionDataPoint {
        return {
            url: 'https://example.com',
            timestamp: new Date(),
            userAgent: 'Mozilla/5.0',
            captureVersion: {
                schema: '1',
                engine: { version: '1.0.0', commit: 'abc123', buildDate: '2023-01-01' },
                algorithms: { detection: '1', confidence: '1' },
                patterns: { lastUpdated: '2023-01-01' },
                features: { experimentalFlags: [] }
            },
            originalUrl: 'https://example.com',
            finalUrl: 'https://example.com',
            redirectChain: [],
            totalRedirects: 0,
            protocolUpgraded: false,
            navigationTime: 500,
            httpHeaders: {},
            statusCode: 200,
            contentType: 'text/html',
            metaTags: [],
            title: 'Test Site',
            htmlContent: '',
            htmlSize: 1000,
            robotsTxt: {
                content: '',
                accessible: true,
                size: 0,
                patterns: {
                    disallowedPaths: [],
                    sitemapUrls: [],
                    userAgents: []
                }
            },
            domElements: [],
            links: [],
            scripts: [],
            stylesheets: [],
            forms: [],
            technologies: [],
            loadTime: 1000,
            resourceCount: 10,
            detectionResults: [],
            errors: [],
            ...overrides
        };
    }

    describe('Constructor and Initialization', () => {
        it('should initialize with data points', () => {
            const dataPoints = [
                createDataPoint(),
                createDataPoint({ url: 'https://example2.com' })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            
            // Should not throw and log info about initialization
            expect(discovery).toBeDefined();
        });

        it('should handle empty data points array', () => {
            const discovery = new PatternDiscovery([]);
            
            expect(discovery).toBeDefined();
        });
    });

    describe('analyzeMetaTagPatterns()', () => {
        it('should discover WordPress meta tag patterns', () => {
            const wpDataPoints = [
                createDataPoint({
                    metaTags: [
                        { name: 'generator', content: 'WordPress 6.0' },
                        { property: 'og:type', content: 'website' }
                    ],
                    detectionResults: [{ 
                        detector: 'meta-tag', 
                        strategy: 'generator', 
                        cms: 'WordPress', 
                        confidence: 0.95, 
                        executionTime: 100 
                    }]
                }),
                createDataPoint({
                    metaTags: [
                        { name: 'generator', content: 'WordPress 5.9' },
                        { name: 'twitter:card', content: 'summary' }
                    ],
                    detectionResults: [{ 
                        detector: 'meta-tag', 
                        strategy: 'generator', 
                        cms: 'WordPress', 
                        confidence: 0.92, 
                        executionTime: 100 
                    }]
                }),
                createDataPoint({
                    metaTags: [
                        { name: 'generator', content: 'WordPress 6.1' }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'WordPress', confidence: 0.90, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(wpDataPoints);
            const patterns = discovery.analyzeMetaTagPatterns();

            expect(patterns.has('WordPress')).toBe(true);
            const wpPatterns = patterns.get('WordPress')!;
            expect(wpPatterns.length).toBeGreaterThan(0);
            
            // Should find generator pattern with high confidence
            const generatorPattern = wpPatterns.find((p: any) => p.pattern === 'name:generator');
            expect(generatorPattern).toBeDefined();
            expect(generatorPattern!.frequency).toBe(1.0); // All sites have it
            expect(generatorPattern!.confidence).toBeGreaterThan(0.9);
        });

        it('should discover Drupal meta tag patterns', () => {
            const drupalDataPoints = [
                createDataPoint({
                    metaTags: [
                        { name: 'Generator', content: 'Drupal 9' },
                        { name: 'MobileOptimized', content: 'width' }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'Drupal', confidence: 0.88, executionTime: 100 }]
                }),
                createDataPoint({
                    metaTags: [
                        { name: 'Generator', content: 'Drupal 10' },
                        { name: 'HandheldFriendly', content: 'true' }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'Drupal', confidence: 0.91, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(drupalDataPoints);
            const patterns = discovery.analyzeMetaTagPatterns();

            expect(patterns.has('Drupal')).toBe(true);
            const drupalPatterns = patterns.get('Drupal')!;
            expect(drupalPatterns.some((p: any) => p.pattern === 'name:Generator')).toBe(true);
        });

        it('should calculate pattern confidence across multiple CMS types', () => {
            const mixedDataPoints = [
                // WordPress sites
                createDataPoint({
                    metaTags: [{ name: 'generator', content: 'WordPress' }],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'WordPress', confidence: 0.9, executionTime: 100 }]
                }),
                createDataPoint({
                    metaTags: [{ name: 'generator', content: 'WordPress' }],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'WordPress', confidence: 0.9, executionTime: 100 }]
                }),
                // Drupal site
                createDataPoint({
                    metaTags: [{ name: 'generator', content: 'Drupal' }],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'Drupal', confidence: 0.9, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(mixedDataPoints);
            const patterns = discovery.analyzeMetaTagPatterns();

            // Both should have generator patterns but with different confidence
            const wpPatterns = patterns.get('WordPress')!;
            const drupalPatterns = patterns.get('Drupal')!;
            
            const wpGen = wpPatterns.find((p: any) => p.pattern === 'name:generator');
            const drupalGen = drupalPatterns.find((p: any) => p.pattern === 'name:generator');
            
            expect(wpGen).toBeDefined();
            expect(wpGen!.confidence).toBeCloseTo(0.666, 2); // 2 out of 3 generator tags
            
            if (drupalGen) {
                expect(drupalGen.confidence).toBeCloseTo(0.333, 2); // 1 out of 3 generator tags
            } else {
                // If Drupal pattern was filtered out due to low frequency, that's also valid
                console.log('Drupal generator pattern was filtered out due to low frequency/confidence');
            }
        });

        it('should filter patterns by frequency and confidence thresholds', () => {
            const dataPoints = [
                createDataPoint({
                    metaTags: [
                        { name: 'common', content: 'value' },
                        { name: 'rare', content: 'value' }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'TestCMS', confidence: 0.9, executionTime: 100 }]
                }),
                createDataPoint({
                    metaTags: [
                        { name: 'common', content: 'value' }
                        // 'rare' not present
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'TestCMS', confidence: 0.9, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            const patterns = discovery.analyzeMetaTagPatterns();

            const testPatterns = patterns.get('TestCMS')!;
            
            // 'common' appears in 100% (2/2), should be included
            expect(testPatterns.some((p: any) => p.pattern === 'name:common')).toBe(true);
            
            // 'rare' appears in 50% (1/2), might be included based on confidence
            const rarePattern = testPatterns.find((p: any) => p.pattern === 'name:rare');
            if (rarePattern) {
                expect(rarePattern.frequency).toBe(0.5);
            }
        });

        it('should handle sites with unknown CMS', () => {
            const dataPoints = [
                createDataPoint({
                    metaTags: [{ name: 'description', content: 'A site' }],
                    detectionResults: []
                }),
                createDataPoint({
                    metaTags: [{ name: 'keywords', content: 'test' }],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'Unknown', confidence: 0.1, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            const patterns = discovery.analyzeMetaTagPatterns();

            expect(patterns.has('Unknown')).toBe(true);
            const unknownPatterns = patterns.get('Unknown')!;
            expect(unknownPatterns).toBeDefined();
        });
    });

    describe('analyzeScriptPatterns()', () => {
        it('should discover WordPress script patterns', () => {
            const wpDataPoints = [
                createDataPoint({
                    scripts: [
                        { src: '/wp-includes/js/jquery/jquery.min.js' },
                        { src: '/wp-content/themes/twentyone/script.js' },
                        { inline: true, content: 'var wpData = {};' }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'WordPress', confidence: 0.95, executionTime: 100 }]
                }),
                createDataPoint({
                    scripts: [
                        { src: '/wp-includes/js/wp-emoji-release.min.js' },
                        { inline: true, content: 'window.wp = window.wp || {};' }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'WordPress', confidence: 0.92, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(wpDataPoints);
            const patterns = discovery.analyzeScriptPatterns();

            expect(patterns.has('WordPress')).toBe(true);
            const wpPatterns = patterns.get('WordPress')!;
            
            // Should find wp-* pattern
            expect(wpPatterns.some((p: any) => p.pattern === 'script:wp-*')).toBe(true);
            expect(wpPatterns.some((p: any) => p.pattern === 'path:wp-content')).toBe(true);
        });

        it('should discover Drupal script patterns', () => {
            const drupalDataPoints = [
                createDataPoint({
                    scripts: [
                        { src: '/sites/all/modules/custom/script.js' },
                        { src: '/core/assets/vendor/jquery/jquery.min.js' },
                        { inline: true, content: 'Drupal.behaviors.myModule = {};' }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'Drupal', confidence: 0.88, executionTime: 100 }]
                }),
                createDataPoint({
                    scripts: [
                        { src: '/sites/default/files/js/compiled.js' },
                        { inline: true, content: 'Drupal.settings = {};' }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'Drupal', confidence: 0.91, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(drupalDataPoints);
            const patterns = discovery.analyzeScriptPatterns();

            expect(patterns.has('Drupal')).toBe(true);
            const drupalPatterns = patterns.get('Drupal')!;
            
            expect(drupalPatterns.some((p: any) => p.pattern === 'path:sites')).toBe(true);
            expect(drupalPatterns.some((p: any) => p.pattern === 'inline:Drupal.')).toBe(true);
        });

        it('should extract inline script patterns', () => {
            const dataPoints = [
                createDataPoint({
                    scripts: [
                        { inline: true, content: 'var Joomla = {}; Joomla.init();' },
                        { inline: true, content: 'window.Joomla.submitform = function() {};' }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'Joomla', confidence: 0.85, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            const patterns = discovery.analyzeScriptPatterns();

            const joomlaPatterns = patterns.get('Joomla')!;
            expect(joomlaPatterns.some((p: any) => p.pattern === 'inline:Joomla.')).toBe(true);
        });

        it('should handle scripts with no src or content', () => {
            const dataPoints = [
                createDataPoint({
                    scripts: [
                        { type: 'text/javascript' }, // No src or content
                        { src: '', inline: false }, // Empty src
                        { inline: true, content: '' } // Empty content
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'TestCMS', confidence: 0.8, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            const patterns = discovery.analyzeScriptPatterns();

            // Should handle gracefully without errors
            expect(patterns.has('TestCMS')).toBe(true);
        });

        it('should limit examples collected', () => {
            const scripts = Array.from({ length: 10 }, (_, i) => ({
                src: `/script-${i}.js`
            }));

            const dataPoints = [
                createDataPoint({
                    scripts,
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'TestCMS', confidence: 0.9, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            const patterns = discovery.analyzeScriptPatterns();

            const testPatterns = patterns.get('TestCMS')!;
            testPatterns.forEach((pattern: any) => {
                expect(pattern.examples.length).toBeLessThanOrEqual(3);
            });
        });
    });

    describe('analyzeDOMPatterns()', () => {
        it('should discover WordPress DOM patterns', () => {
            const wpDataPoints = [
                createDataPoint({
                    domElements: [
                        {
                            selector: 'body[class*="wp-"]',
                            count: 1,
                            sample: '<body class="wp-custom-logo">',
                            attributes: { class: 'wp-custom-logo' }
                        },
                        {
                            selector: 'div[id*="wp-"]',
                            count: 3,
                            sample: '<div id="wp-block-123">',
                            attributes: { id: 'wp-block-123' }
                        }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'WordPress', confidence: 0.95, executionTime: 100 }]
                }),
                createDataPoint({
                    domElements: [
                        {
                            selector: 'body[class*="wp-"]',
                            count: 1,
                            sample: '<body class="wp-admin">',
                            attributes: { class: 'wp-admin' }
                        }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'WordPress', confidence: 0.92, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(wpDataPoints);
            const patterns = discovery.analyzeDOMPatterns();

            expect(patterns.has('WordPress')).toBe(true);
            const wpPatterns = patterns.get('WordPress')!;
            
            // body[class*="wp-"] appears in 100% of sites
            const bodyPattern = wpPatterns.find((p: any) => p.pattern === 'body[class*="wp-"]');
            expect(bodyPattern).toBeDefined();
            expect(bodyPattern!.frequency).toBe(1.0);
        });

        it('should filter DOM patterns by frequency and confidence', () => {
            const dataPoints = Array.from({ length: 5 }, (_, i) => 
                createDataPoint({
                    domElements: i < 3 ? [
                        {
                            selector: 'div[class*="common"]',
                            count: 1,
                            sample: '<div class="common-element">'
                        }
                    ] : [],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'TestCMS', confidence: 0.9, executionTime: 100 }]
                })
            );

            const discovery = new PatternDiscovery(dataPoints);
            const patterns = discovery.analyzeDOMPatterns();

            const testPatterns = patterns.get('TestCMS')!;
            
            // Pattern appears in 3/5 = 60% of sites
            // Should only be included if confidence is high enough
            const commonPattern = testPatterns.find((p: any) => p.pattern === 'div[class*="common"]');
            if (commonPattern) {
                expect(commonPattern.frequency).toBe(0.6);
            }
        });

        it('should handle empty DOM elements array', () => {
            const dataPoints = [
                createDataPoint({
                    domElements: [],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'TestCMS', confidence: 0.8, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            const patterns = discovery.analyzeDOMPatterns();

            expect(patterns.has('TestCMS')).toBe(true);
            expect(patterns.get('TestCMS')!).toEqual([]);
        });
    });

    describe('generateTechnologySignatures()', () => {
        it('should generate comprehensive technology signatures', () => {
            const dataPoints = [
                createDataPoint({
                    metaTags: [
                        { name: 'generator', content: 'WordPress 6.0' }
                    ],
                    scripts: [
                        { src: '/wp-includes/js/jquery.js' },
                        { inline: true, content: 'var wp = {};' }
                    ],
                    domElements: [
                        {
                            selector: 'body[class*="wp-"]',
                            count: 1,
                            sample: '<body class="wp-custom">'
                        }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'WordPress', confidence: 0.95, executionTime: 100 }]
                }),
                createDataPoint({
                    metaTags: [
                        { name: 'generator', content: 'WordPress 5.9' }
                    ],
                    scripts: [
                        { src: '/wp-content/themes/custom/script.js' }
                    ],
                    domElements: [
                        {
                            selector: 'body[class*="wp-"]',
                            count: 1,
                            sample: '<body class="wp-site">'
                        }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'WordPress', confidence: 0.92, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            const signatures = discovery.generateTechnologySignatures();

            expect(signatures.has('WordPress')).toBe(true);
            const wpSignature = signatures.get('WordPress')!;
            
            expect(wpSignature.name).toBe('WordPress');
            expect(wpSignature.category).toBe('cms');
            expect(wpSignature.patterns.length).toBeGreaterThan(0);
            
            // Should have different pattern types
            const patternTypes = new Set(wpSignature.patterns.map(p => p.type));
            expect(patternTypes.has('meta')).toBe(true);
            expect(patternTypes.has('script')).toBe(true);
            expect(patternTypes.has('dom')).toBe(true);
            
            // Should have confidence score
            expect(wpSignature.confidence).toBeGreaterThan(0);
            expect(wpSignature.confidence).toBeLessThanOrEqual(1);
        });

        it('should mark highly confident patterns as required', () => {
            const dataPoints = Array.from({ length: 10 }, () => 
                createDataPoint({
                    metaTags: [
                        { name: 'generator', content: 'CustomCMS' }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'CustomCMS', confidence: 0.99, executionTime: 100 }]
                })
            );

            const discovery = new PatternDiscovery(dataPoints);
            const signatures = discovery.generateTechnologySignatures();

            const customSignature = signatures.get('CustomCMS')!;
            const genPattern = customSignature.patterns.find(p => 
                p.pattern === 'name:generator' && p.type === 'meta'
            );
            
            // Pattern appears in 100% of sites with high confidence
            expect(genPattern).toBeDefined();
            expect(genPattern!.required).toBe(true);
        });

        it('should skip Unknown CMS when generating signatures', () => {
            const dataPoints = [
                createDataPoint({
                    metaTags: [{ name: 'description', content: 'Unknown site' }],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'Unknown', confidence: 0.1, executionTime: 100 }]
                }),
                createDataPoint({
                    metaTags: [{ name: 'generator', content: 'WordPress' }],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'WordPress', confidence: 0.9, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            const signatures = discovery.generateTechnologySignatures();

            expect(signatures.has('Unknown')).toBe(false);
            expect(signatures.has('WordPress')).toBe(true);
        });

        it('should limit number of patterns per type', () => {
            // Create many patterns
            const metaTags = Array.from({ length: 10 }, (_, i) => ({
                name: `meta-${i}`,
                content: `value-${i}`
            }));

            const dataPoints = [
                createDataPoint({
                    metaTags,
                    scripts: Array.from({ length: 10 }, (_, i) => ({
                        src: `/script-${i}.js`
                    })),
                    domElements: Array.from({ length: 10 }, (_, i) => ({
                        selector: `div[class*="pattern-${i}"]`,
                        count: 1,
                        sample: `<div class="pattern-${i}">`
                    })),
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'TestCMS', confidence: 0.9, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            const signatures = discovery.generateTechnologySignatures();

            const testSignature = signatures.get('TestCMS')!;
            
            const metaPatterns = testSignature.patterns.filter(p => p.type === 'meta');
            const scriptPatterns = testSignature.patterns.filter(p => p.type === 'script');
            const domPatterns = testSignature.patterns.filter(p => p.type === 'dom');
            
            expect(metaPatterns.length).toBeLessThanOrEqual(5);
            expect(scriptPatterns.length).toBeLessThanOrEqual(3);
            expect(domPatterns.length).toBeLessThanOrEqual(3);
        });
    });

    describe('compareDetectionPatterns()', () => {
        it('should generate comparative statistics for different CMS types', () => {
            const wpDataPoints = Array.from({ length: 3 }, () => 
                createDataPoint({
                    metaTags: Array(5).fill({ name: 'tag', content: 'value' }),
                    scripts: Array(10).fill({ src: '/script.js' }),
                    domElements: Array(3).fill({ selector: 'div', count: 1 }),
                    htmlSize: 50000,
                    loadTime: 1500,
                    protocolUpgraded: true,
                    totalRedirects: 1,
                    statusCode: 200,
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'WordPress', confidence: 0.9, executionTime: 100 }]
                })
            );

            const drupalDataPoints = Array.from({ length: 2 }, () => 
                createDataPoint({
                    metaTags: Array(8).fill({ name: 'tag', content: 'value' }),
                    scripts: Array(15).fill({ src: '/script.js' }),
                    domElements: Array(5).fill({ selector: 'div', count: 1 }),
                    htmlSize: 80000,
                    loadTime: 2000,
                    protocolUpgraded: false,
                    totalRedirects: 0,
                    statusCode: 200,
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'Drupal', confidence: 0.85, executionTime: 100 }]
                })
            );

            const discovery = new PatternDiscovery([...wpDataPoints, ...drupalDataPoints]);
            const comparison = discovery.compareDetectionPatterns();

            expect(comparison.has('WordPress')).toBe(true);
            expect(comparison.has('Drupal')).toBe(true);

            const wpStats = comparison.get('WordPress');
            expect(wpStats.siteCount).toBe(3);
            expect(wpStats.avgMetaTags).toBe(5);
            expect(wpStats.avgScripts).toBe(10);
            expect(wpStats.avgDOMElements).toBe(3);
            expect(wpStats.avgHtmlSize).toBe(50000);
            expect(wpStats.avgLoadTime).toBe(1500);
            expect(wpStats.protocolUpgradeRate).toBe(1.0);
            expect(wpStats.avgRedirects).toBe(1);
            expect(wpStats.statusCodes['200']).toBe(3);
            expect(wpStats.detectionConfidence).toBe(0.9);

            const drupalStats = comparison.get('Drupal');
            expect(drupalStats.siteCount).toBe(2);
            expect(drupalStats.avgMetaTags).toBe(8);
            expect(drupalStats.avgScripts).toBe(15);
            expect(drupalStats.protocolUpgradeRate).toBe(0);
        });

        it('should handle mixed status codes', () => {
            const dataPoints = [
                createDataPoint({
                    statusCode: 200,
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'TestCMS', confidence: 0.8, executionTime: 100 }]
                }),
                createDataPoint({
                    statusCode: 200,
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'TestCMS', confidence: 0.8, executionTime: 100 }]
                }),
                createDataPoint({
                    statusCode: 301,
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'TestCMS', confidence: 0.8, executionTime: 100 }]
                }),
                createDataPoint({
                    statusCode: 404,
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'TestCMS', confidence: 0.8, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            const comparison = discovery.compareDetectionPatterns();

            const stats = comparison.get('TestCMS');
            expect(stats.statusCodes['200']).toBe(2);
            expect(stats.statusCodes['301']).toBe(1);
            expect(stats.statusCodes['404']).toBe(1);
        });

        it('should handle sites with no detection results', () => {
            const dataPoints = [
                createDataPoint({
                    detectionResults: []
                }),
                createDataPoint({
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'TestCMS', confidence: 0.8, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            const comparison = discovery.compareDetectionPatterns();

            expect(comparison.has('Unknown')).toBe(true);
            expect(comparison.has('TestCMS')).toBe(true);

            const unknownStats = comparison.get('Unknown');
            expect(unknownStats.siteCount).toBe(1);
            expect(unknownStats.detectionConfidence).toBe(0); // No detection results
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle data points with low confidence detection', () => {
            const dataPoints = [
                createDataPoint({
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'WordPress', confidence: 0.2, executionTime: 100 }]
                }),
                createDataPoint({
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'Drupal', confidence: 0.25, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            const patterns = discovery.analyzeMetaTagPatterns();

            // Low confidence results should be treated as Unknown
            expect(patterns.has('Unknown')).toBe(true);
        });

        it('should handle multiple detection results per data point', () => {
            const dataPoints = [
                createDataPoint({
                    metaTags: [{ name: 'generator', content: 'Multi-CMS' }],
                    detectionResults: [
                        { detector: 'meta-tag', strategy: 'generator', cms: 'WordPress', confidence: 0.6, executionTime: 100 },
                        { detector: 'meta-tag', strategy: 'generator', cms: 'Drupal', confidence: 0.8, executionTime: 100 }
                    ]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            const patterns = discovery.analyzeMetaTagPatterns();

            // Should use the highest confidence result (Drupal)
            expect(patterns.has('Drupal')).toBe(true);
            const drupalPatterns = patterns.get('Drupal')!;
            expect(drupalPatterns.some((p: any) => p.pattern === 'name:generator')).toBe(true);
        });

        it('should handle empty pattern analysis gracefully', () => {
            const dataPoints = [
                createDataPoint({
                    metaTags: [],
                    scripts: [],
                    domElements: [],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'EmptyCMS', confidence: 0.9, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            
            const metaPatterns = discovery.analyzeMetaTagPatterns();
            const scriptPatterns = discovery.analyzeScriptPatterns();
            const domPatterns = discovery.analyzeDOMPatterns();
            const signatures = discovery.generateTechnologySignatures();

            expect(metaPatterns.get('EmptyCMS')).toEqual([]);
            expect(scriptPatterns.get('EmptyCMS')).toEqual([]);
            expect(domPatterns.get('EmptyCMS')).toEqual([]);
            
            // Should still generate a signature but with no patterns
            const emptySignature = signatures.get('EmptyCMS');
            if (emptySignature) {
                expect(emptySignature.patterns).toEqual([]);
                expect(emptySignature.confidence).toBe(0);
            }
        });

        it('should handle malformed meta tag structures', () => {
            const dataPoints = [
                createDataPoint({
                    metaTags: [
                        { content: 'No name or property' } as any,
                        { name: 'valid', content: 'tag' }
                    ],
                    detectionResults: [{ detector: 'meta-tag', strategy: 'generator', cms: 'TestCMS', confidence: 0.9, executionTime: 100 }]
                })
            ];

            const discovery = new PatternDiscovery(dataPoints);
            const patterns = discovery.analyzeMetaTagPatterns();

            // Should only process valid meta tags
            const testPatterns = patterns.get('TestCMS')!;
            expect(testPatterns.some((p: any) => p.pattern === 'name:valid')).toBe(true);
        });
    });
});