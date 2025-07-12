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

import { RobotsTxtStrategy, RobotsPattern, WORDPRESS_ROBOTS_PATTERNS, DRUPAL_ROBOTS_PATTERNS, JOOMLA_ROBOTS_PATTERNS } from '../../strategies/robots-txt.js';
import { DetectionPage } from '../../types.js';
import { setupStrategyTests, createMockPage, setupVitestExtensions } from '@test-utils';

// Setup custom Vitest matchers
setupVitestExtensions();

describe('RobotsTxtStrategy', () => {
    let strategy: RobotsTxtStrategy;
    let mockPage: any;

    setupStrategyTests();

    beforeEach(() => {
        mockPage = createMockPage({
            robotsTxtData: {
                accessible: true,
                content: '',
                patterns: {
                    disallowedPaths: [],
                    sitemapUrls: []
                }
            }
        });
    });

    describe('Basic functionality', () => {
        beforeEach(() => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: '/wp-admin/',
                    confidence: 0.9,
                    description: 'WordPress admin directory',
                    category: 'disallow'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress', 5000);
        });

        test('should return correct name and timeout', () => {
            expect(strategy.getName()).toBe('robots-txt');
            expect(strategy.getTimeout()).toBe(5000);
        });

        test('should handle missing robots.txt data gracefully', async () => {
            mockPage._robotsTxtData = null;
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            
            expect(result).toBeValidPartialResult();
            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('robots-txt');
            expect(result.error).toBe('No robots.txt data available');
        });

        test('should handle inaccessible robots.txt gracefully', async () => {
            mockPage._robotsTxtData.accessible = false;
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            
            expect(result).toBeValidPartialResult();
            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('robots-txt');
            expect(result.error).toBe('No robots.txt data available');
        });

        test('should handle empty robots.txt content gracefully', async () => {
            mockPage._robotsTxtData.content = '';
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            
            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('robots-txt');
        });
    });

    describe('Disallow pattern matching', () => {
        test('should detect WordPress admin paths', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: '/wp-admin/',
                    confidence: 0.9,
                    description: 'WordPress admin directory',
                    category: 'disallow'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress');

            mockPage._robotsTxtData.content = 'User-agent: *\nDisallow: /wp-admin/\nDisallow: /private/';
            mockPage._robotsTxtData.patterns.disallowedPaths = ['/wp-admin/', '/private/'];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result).toHaveConfidenceAbove(0.89);
            expect(result.method).toBe('robots-txt');
            expect(result.evidence).toContain('WordPress admin directory: Disallow: /wp-admin/');
        });

        test('should be case-insensitive for string patterns', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: '/wp-admin/',
                    confidence: 0.9,
                    description: 'WordPress admin directory',
                    category: 'disallow'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress');

            mockPage._robotsTxtData.content = 'User-agent: *\nDisallow: /WP-ADMIN/';
            mockPage._robotsTxtData.patterns.disallowedPaths = ['/WP-ADMIN/'];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result).toHaveConfidenceAbove(0.89);
        });

        test('should handle regex patterns in disallow paths', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: /\?q=/,
                    confidence: 0.5,
                    description: 'Drupal query parameter pattern',
                    category: 'disallow'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'Drupal');

            mockPage._robotsTxtData.content = 'Disallow: /*?q=admin';
            mockPage._robotsTxtData.patterns.disallowedPaths = ['/*?q=admin', '/test'];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0.5);
            expect(result.evidence).toContain('Drupal query parameter pattern: Disallow: /*?q=admin');
        });

        test('should detect multiple disallow patterns', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: '/wp-admin/',
                    confidence: 0.5,
                    description: 'WordPress admin directory',
                    category: 'disallow'
                },
                {
                    pattern: '/wp-content/',
                    confidence: 0.4,
                    description: 'WordPress content directory',
                    category: 'disallow'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress');

            mockPage._robotsTxtData.content = 'Disallow: /wp-admin/\nDisallow: /wp-content/uploads/';
            mockPage._robotsTxtData.patterns.disallowedPaths = ['/wp-admin/', '/wp-content/uploads/'];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result).toHaveConfidenceAbove(0.89); // 0.5 + 0.4
            expect(result.evidence).toHaveLength(2);
        });
    });

    describe('Sitemap pattern matching', () => {
        test('should detect WordPress sitemap URLs', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: 'wp-sitemap.xml',
                    confidence: 0.7,
                    description: 'WordPress sitemap',
                    category: 'sitemap'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress');

            mockPage._robotsTxtData.content = 'Sitemap: https://example.com/wp-sitemap.xml';
            mockPage._robotsTxtData.patterns.sitemapUrls = ['https://example.com/wp-sitemap.xml'];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0.7);
            expect(result.evidence).toContain('WordPress sitemap: Sitemap: https://example.com/wp-sitemap.xml');
        });

        test('should handle regex patterns in sitemap URLs', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: /sitemap.*\.xml$/i,
                    confidence: 0.6,
                    description: 'Sitemap file pattern',
                    category: 'sitemap'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'Generic');

            mockPage._robotsTxtData.content = 'Sitemap: https://example.com/sitemap_index.xml';
            mockPage._robotsTxtData.patterns.sitemapUrls = ['https://example.com/sitemap_index.xml'];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0.6);
        });

        test('should be case-insensitive for sitemap string patterns', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: 'wp-sitemap.xml',
                    confidence: 0.7,
                    description: 'WordPress sitemap',
                    category: 'sitemap'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress');

            mockPage._robotsTxtData.content = 'Sitemap: https://example.com/WP-SITEMAP.XML';
            mockPage._robotsTxtData.patterns.sitemapUrls = ['https://example.com/WP-SITEMAP.XML'];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0.7);
        });
    });

    describe('Content pattern matching', () => {
        test('should detect patterns in full content', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: 'WordPress',
                    confidence: 0.5,
                    description: 'WordPress mention in robots.txt',
                    category: 'content'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress');

            mockPage._robotsTxtData.content = '# This site is built with WordPress\nUser-agent: *\nDisallow: /private/';

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0.5);
            expect(result.evidence).toContain('WordPress mention in robots.txt: # This site is built with WordPress');
        });

        test('should handle regex patterns in content', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: /wp-.*\.php/i,
                    confidence: 0.4,
                    description: 'WordPress PHP files',
                    category: 'admin'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress');

            mockPage._robotsTxtData.content = 'Disallow: /wp-login.php\nDisallow: /wp-admin.php';

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0.4);
            expect(result.evidence).toContain('WordPress PHP files: wp-login.php');
        });

        test('should be case-insensitive for content string patterns', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: 'joomla',
                    confidence: 0.6,
                    description: 'Joomla mention',
                    category: 'content'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'Joomla');

            mockPage._robotsTxtData.content = '# Generated by JOOMLA CMS\nUser-agent: *';

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0.6);
            expect(result.evidence).toContain('Joomla mention: # Generated by JOOMLA CMS');
        });
    });

    describe('Confidence aggregation and capping', () => {
        test('should aggregate confidence from multiple patterns', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: '/wp-admin/',
                    confidence: 0.4,
                    description: 'WordPress admin',
                    category: 'disallow'
                },
                {
                    pattern: '/wp-content/',
                    confidence: 0.3,
                    description: 'WordPress content',
                    category: 'disallow'
                },
                {
                    pattern: 'wp-sitemap.xml',
                    confidence: 0.2,
                    description: 'WordPress sitemap',
                    category: 'sitemap'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress');

            mockPage._robotsTxtData.content = 'Disallow: /wp-admin/\nDisallow: /wp-content/\nSitemap: https://example.com/wp-sitemap.xml';
            mockPage._robotsTxtData.patterns.disallowedPaths = ['/wp-admin/', '/wp-content/'];
            mockPage._robotsTxtData.patterns.sitemapUrls = ['https://example.com/wp-sitemap.xml'];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBeCloseTo(0.9); // 0.4 + 0.3 + 0.2
            expect(result.evidence).toHaveLength(3);
        });

        test('should cap confidence at 1.0', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: '/wp-admin/',
                    confidence: 0.8,
                    description: 'WordPress admin',
                    category: 'disallow'
                },
                {
                    pattern: '/wp-content/',
                    confidence: 0.7,
                    description: 'WordPress content',
                    category: 'disallow'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress');

            mockPage._robotsTxtData.content = 'Disallow: /wp-admin/\nDisallow: /wp-content/';
            mockPage._robotsTxtData.patterns.disallowedPaths = ['/wp-admin/', '/wp-content/'];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result).toHaveConfidenceAbove(0.99); // Capped at 1.0 instead of 1.5
        });
    });

    describe('Predefined CMS patterns', () => {
        test('should detect WordPress with predefined patterns', async () => {
            strategy = new RobotsTxtStrategy(WORDPRESS_ROBOTS_PATTERNS, 'WordPress');

            mockPage._robotsTxtData.content = `User-agent: *
Disallow: /wp-admin/
Disallow: /wp-includes/
Disallow: /wp-login.php
Sitemap: https://example.com/wp-sitemap.xml`;
            
            mockPage._robotsTxtData.patterns.disallowedPaths = ['/wp-admin/', '/wp-includes/', '/wp-login.php'];
            mockPage._robotsTxtData.patterns.sitemapUrls = ['https://example.com/wp-sitemap.xml'];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result).toHaveConfidenceAbove(0.99); // Multiple patterns, capped at 1.0
            expect(result.evidence!.length).toBeGreaterThan(3);
        });

        test('should detect Drupal with predefined patterns', async () => {
            strategy = new RobotsTxtStrategy(DRUPAL_ROBOTS_PATTERNS, 'Drupal');

            mockPage._robotsTxtData.content = `User-agent: *
Disallow: /admin/
Disallow: /user/login
Disallow: /node/add
Disallow: /modules/
Disallow: /sites/`;
            
            mockPage._robotsTxtData.patterns.disallowedPaths = ['/admin/', '/user/login', '/node/add', '/modules/', '/sites/'];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result).toHaveConfidenceAbove(0.99); // Multiple patterns, capped at 1.0
            expect(result.evidence!.length).toBeGreaterThan(3);
        });

        test('should detect Joomla with predefined patterns', async () => {
            strategy = new RobotsTxtStrategy(JOOMLA_ROBOTS_PATTERNS, 'Joomla');

            mockPage._robotsTxtData.content = `User-agent: *
Disallow: /administrator/
Disallow: /components/
Disallow: /modules/
Disallow: /templates/
Disallow: /cache/`;
            
            mockPage._robotsTxtData.patterns.disallowedPaths = ['/administrator/', '/components/', '/modules/', '/templates/', '/cache/'];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result).toHaveConfidenceAbove(0.99); // Multiple patterns, capped at 1.0
            expect(result.evidence!.length).toBeGreaterThan(3);
        });
    });

    describe('Pattern collision scenarios', () => {
        test('should distinguish between Drupal and Joomla modules directories', async () => {
            const drupalStrategy = new RobotsTxtStrategy(DRUPAL_ROBOTS_PATTERNS, 'Drupal');
            const joomlaStrategy = new RobotsTxtStrategy(JOOMLA_ROBOTS_PATTERNS, 'Joomla');

            // Robots.txt with both /modules/ and Joomla-specific paths
            mockPage._robotsTxtData.content = `User-agent: *
Disallow: /administrator/
Disallow: /modules/
Disallow: /components/`;
            
            mockPage._robotsTxtData.patterns.disallowedPaths = ['/administrator/', '/modules/', '/components/'];

            const drupalResult = await drupalStrategy.detect(mockPage, 'https://example.com');
            const joomlaResult = await joomlaStrategy.detect(mockPage, 'https://example.com');

            // Joomla should have higher confidence due to /administrator/ and /components/
            expect(joomlaResult.confidence).toBeGreaterThan(drupalResult.confidence);
        });

        test('should distinguish between Drupal and Joomla themes directories', async () => {
            const drupalStrategy = new RobotsTxtStrategy(DRUPAL_ROBOTS_PATTERNS, 'Drupal');
            const joomlaStrategy = new RobotsTxtStrategy(JOOMLA_ROBOTS_PATTERNS, 'Joomla');

            // Robots.txt with both /themes/ and Drupal-specific paths
            mockPage._robotsTxtData.content = `User-agent: *
Disallow: /admin/
Disallow: /themes/
Disallow: /sites/
Disallow: /user/login`;
            
            mockPage._robotsTxtData.patterns.disallowedPaths = ['/admin/', '/themes/', '/sites/', '/user/login'];

            const drupalResult = await drupalStrategy.detect(mockPage, 'https://example.com');
            const joomlaResult = await joomlaStrategy.detect(mockPage, 'https://example.com');

            // Drupal should have higher confidence due to /admin/, /sites/, /user/login
            expect(drupalResult.confidence).toBeGreaterThan(joomlaResult.confidence);
        });
    });

    describe('Edge cases and error handling', () => {
        test('should handle malformed robots.txt content', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: '/wp-admin/',
                    confidence: 0.9,
                    description: 'WordPress admin',
                    category: 'disallow'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress');

            mockPage._robotsTxtData.content = 'This is not a valid robots.txt file\nJust some random text';
            mockPage._robotsTxtData.patterns.disallowedPaths = [];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0);
        });

        test('should handle errors gracefully', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: '/wp-admin/',
                    confidence: 0.9,
                    description: 'WordPress admin',
                    category: 'disallow'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress');

            // Mock page that throws an error
            const errorPage = {
                get _robotsTxtData() {
                    throw new Error('Network error');
                }
            } as any;

            const result = await strategy.detect(errorPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('robots-txt');
            expect(result.error).toContain('Robots.txt detection failed');
        });

        test('should handle empty pattern arrays', async () => {
            strategy = new RobotsTxtStrategy([], 'Unknown');

            mockPage._robotsTxtData.content = 'User-agent: *\nDisallow: /admin/';
            mockPage._robotsTxtData.patterns.disallowedPaths = ['/admin/'];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0);
            expect(result.evidence).toHaveLength(0);
        });

        test('should handle null patterns data', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: '/wp-admin/',
                    confidence: 0.9,
                    description: 'WordPress admin',
                    category: 'disallow'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress');

            mockPage._robotsTxtData.content = 'Disallow: /wp-admin/';
            mockPage._robotsTxtData.patterns = null;

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0);
        });

        test('should handle undefined disallowed paths', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: '/wp-admin/',
                    confidence: 0.9,
                    description: 'WordPress admin',
                    category: 'disallow'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress');

            mockPage._robotsTxtData.content = 'Disallow: /wp-admin/';
            mockPage._robotsTxtData.patterns = {
                disallowedPaths: null as any,
                sitemapUrls: []
            };

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeValidPartialResult();
            expect(result.confidence).toBe(0);
        });
    });

    describe('Evidence collection', () => {
        test('should collect evidence for all matched patterns', async () => {
            const patterns: RobotsPattern[] = [
                {
                    pattern: '/wp-admin/',
                    confidence: 0.5,
                    description: 'WordPress admin',
                    category: 'disallow'
                },
                {
                    pattern: 'wp-sitemap.xml',
                    confidence: 0.3,
                    description: 'WordPress sitemap',
                    category: 'sitemap'
                },
                {
                    pattern: 'WordPress',
                    confidence: 0.2,
                    description: 'WordPress mention',
                    category: 'content'
                }
            ];
            strategy = new RobotsTxtStrategy(patterns, 'WordPress');

            mockPage._robotsTxtData.content = `# WordPress site
User-agent: *
Disallow: /wp-admin/
Sitemap: https://example.com/wp-sitemap.xml`;
            
            mockPage._robotsTxtData.patterns.disallowedPaths = ['/wp-admin/'];
            mockPage._robotsTxtData.patterns.sitemapUrls = ['https://example.com/wp-sitemap.xml'];

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.evidence).toHaveLength(3);
            expect(result.evidence).toContain('WordPress admin: Disallow: /wp-admin/');
            expect(result.evidence).toContain('WordPress sitemap: Sitemap: https://example.com/wp-sitemap.xml');
            expect(result.evidence).toContain('WordPress mention: # WordPress site');
        });
    });
});