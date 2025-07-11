import { RobotsTxtAnalyzer, RobotsTxtAnalysis } from '../robots-txt-analyzer.js';
import { setupAnalysisTests, setupJestExtensions } from '@test-utils';

// Setup custom Jest matchers
setupJestExtensions();

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock logger
jest.mock('../logger.js', () => ({
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

// Use standardized retry mock pattern from test-utils
jest.mock('../retry.js', () => ({
    withRetry: jest.fn().mockImplementation(async (fn: any) => await fn())
}));

describe('RobotsTxtAnalyzer', () => {
    setupAnalysisTests();
    
    let analyzer: RobotsTxtAnalyzer;

    beforeEach(() => {
        analyzer = new RobotsTxtAnalyzer();
        jest.clearAllMocks();
    });

    // Factory functions for test data
    const createMockResponse = (content: string, headers: Record<string, string> = {}, status = 200, statusText = 'OK') => {
        const mockHeaders = new Map();
        Object.entries(headers).forEach(([key, value]) => {
            mockHeaders.set(key.toLowerCase(), value);
        });
        
        return {
            ok: status >= 200 && status < 300,
            status,
            statusText,
            text: jest.fn().mockResolvedValue(content),
            headers: {
                forEach: jest.fn((callback) => {
                    mockHeaders.forEach((value, key) => callback(value, key));
                })
            }
        } as any;
    };

    const createWordPressRobotsTxt = () => `# This file was automatically created by the Yoast SEO plugin v15.0.
# START YOAST BLOCK
# ---------------------------
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Disallow: /wp-content/
Disallow: /wp-includes/
Disallow: /wp-json/
Sitemap: https://example.com/sitemap_index.xml
# ---------------------------
# END YOAST BLOCK`;

    const createDrupalRobotsTxt = () => `#
# robots.txt
#
# This file is to prevent the crawling and indexing of certain parts
# of your site by web crawlers and spiders run by sites like Yahoo!
# and Google.
#
User-agent: *
Crawl-delay: 10
# CSS, JS, Images
Allow: /core/*.css$
Allow: /core/*.css?*
Disallow: /core/
Disallow: /profiles/
Disallow: /modules/
Disallow: /themes/
Disallow: /sites/`;

    const createJoomlaRobotsTxt = () => `# If the Joomla site is installed within a folder
# eg www.example.com/joomla/ then the robots.txt file
# MUST be moved to the site root
# eg www.example.com/robots.txt
# AND the joomla folder name MUST be prefixed to all of the
# paths.
User-agent: *
Disallow: /administrator/
Disallow: /components/
Disallow: /modules/
Disallow: /templates/
Disallow: /media/
Disallow: /cache/`;

    const createLegacyDrupalRobotsTxt = () => `#
# robots.txt for legacy Drupal 7
#
User-agent: *
Crawl-delay: 10
Disallow: /profiles/
Disallow: /modules/
Disallow: /themes/
Disallow: /misc/
Disallow: /includes/
Disallow: /install.php
Disallow: /update.php`;

    describe('buildRobotsUrl', () => {
        it('should use centralized joinUrl function', () => {
            // Access the private method for testing by casting to any
            const buildRobotsUrl = (analyzer as any).buildRobotsUrl.bind(analyzer);
            
            expect(buildRobotsUrl('https://example.com')).toBe('https://example.com/robots.txt');
            expect(buildRobotsUrl('https://example.com/')).toBe('https://example.com/robots.txt');
            expect(buildRobotsUrl('example.com')).toContain('/robots.txt');
        });

        it('should handle URLs with paths', () => {
            const buildRobotsUrl = (analyzer as any).buildRobotsUrl.bind(analyzer);
            
            const result = buildRobotsUrl('https://example.com/some/path');
            expect(result).toContain('/robots.txt');
            expect(result).toContain('example.com');
        });
    });

    describe('analyze', () => {
        describe('successful analysis', () => {
            it('should analyze WordPress robots.txt successfully', async () => {
                const wordpressContent = createWordPressRobotsTxt();
                const mockResponse = createMockResponse(wordpressContent, {
                    'server': 'Apache/2.4.41',
                    'content-type': 'text/plain; charset=UTF-8'
                });
                
                mockFetch.mockResolvedValueOnce(mockResponse);
                
                const result = await analyzer.analyze('https://wordpress-site.com');
                
                expect(result.cms).toBe('WordPress');
                expect(result.confidence).toBeGreaterThan(0.5);
                expect(result.signals).toContain('WordPress admin directory');
                expect(result.signals).toContain('WordPress content directory');
                expect(result.content).toBe(wordpressContent);
                expect(result.url).toBe('https://wordpress-site.com/robots.txt');
                expect(result.headers).toEqual({
                    'server': 'Apache/2.4.41',
                    'content-type': 'text/plain; charset=UTF-8'
                });
                expect(result.error).toBeUndefined();
            });

            it('should analyze Drupal robots.txt successfully', async () => {
                const drupalContent = createDrupalRobotsTxt();
                const mockResponse = createMockResponse(drupalContent, {
                    'x-drupal-cache': 'HIT',
                    'x-generator': 'Drupal 9'
                });
                
                mockFetch.mockResolvedValueOnce(mockResponse);
                
                const result = await analyzer.analyze('https://drupal-site.com');
                
                expect(result.cms).toBe('Drupal');
                expect(result.confidence).toBeGreaterThan(0.5);
                expect(result.signals).toContain('Drupal 8+ core directory');
                expect(result.signals).toContain('Drupal profiles directory');
                expect(result.content).toBe(drupalContent);
                expect(result.url).toBe('https://drupal-site.com/robots.txt');
            });

            it('should analyze Joomla robots.txt successfully', async () => {
                const joomlaContent = createJoomlaRobotsTxt();
                const mockResponse = createMockResponse(joomlaContent);
                
                mockFetch.mockResolvedValueOnce(mockResponse);
                
                const result = await analyzer.analyze('https://joomla-site.com');
                
                expect(result.cms).toBe('Joomla');
                expect(result.confidence).toBeGreaterThan(0.5);
                expect(result.signals).toContain('Joomla administrator directory');
                expect(result.signals).toContain('Joomla components directory');
                expect(result.content).toBe(joomlaContent);
            });

            it('should detect legacy Drupal 7 patterns', async () => {
                const legacyContent = createLegacyDrupalRobotsTxt();
                const mockResponse = createMockResponse(legacyContent);
                
                mockFetch.mockResolvedValueOnce(mockResponse);
                
                const result = await analyzer.analyze('https://legacy-drupal.com');
                
                expect(result.cms).toBe('Drupal');
                expect(result.signals).toContain('Legacy Drupal 7 pattern detected');
                expect(result.confidence).toBeGreaterThan(0.4);
            });

            it('should detect WordPress through plugin patterns', async () => {
                // Create content that will trigger plugin detection (no main WordPress patterns)
                const pluginContent = `User-agent: *\nDisallow: /some-other-path/\nSitemap: https://example.com/wp-sitemap.xml\n# WordPress.org`;
                const mockResponse = createMockResponse(pluginContent);
                
                mockFetch.mockResolvedValueOnce(mockResponse);
                
                const result = await analyzer.analyze('https://wp-plugin-site.com');
                
                expect(result.cms).toBe('WordPress');
                expect(result.confidence).toBe(0.7); // Plugin detection sets fixed confidence
                expect(result.signals).toContain('WordPress plugin patterns detected');
            });

            it('should return Unknown for unrecognizable content', async () => {
                const genericContent = `User-agent: *\nDisallow: /admin/\nDisallow: /private/`;
                const mockResponse = createMockResponse(genericContent);
                
                mockFetch.mockResolvedValueOnce(mockResponse);
                
                const result = await analyzer.analyze('https://generic-site.com');
                
                expect(result.cms).toBe('Unknown');
                expect(result.confidence).toBe(0);
                expect(result.signals).toHaveLength(0);
                expect(result.content).toBe(genericContent);
            });
        });

        describe('error handling', () => {
            it('should handle network errors gracefully', async () => {
                mockFetch.mockRejectedValueOnce(new Error('Network error'));
                
                const result = await analyzer.analyze('https://unreachable-site.com');
                
                expect(result.cms).toBe('Unknown');
                expect(result.confidence).toBe(0);
                expect(result.signals).toHaveLength(0);
                expect(result.content).toBe('');
                expect(result.headers).toEqual({});
                expect(result.error).toBe('Network error');
                expect(result.url).toBe('https://unreachable-site.com/robots.txt');
            });

            it('should handle HTTP error responses', async () => {
                const mockResponse = createMockResponse('Not Found', {}, 404, 'Not Found');
                mockFetch.mockResolvedValueOnce(mockResponse);
                
                const result = await analyzer.analyze('https://no-robots-site.com');
                
                expect(result.cms).toBe('Unknown');
                expect(result.confidence).toBe(0);
                expect(result.error).toBe('HTTP 404: Not Found');
            });

            it('should handle timeout errors', async () => {
                // Simulate AbortController timeout
                const abortError = new Error('AbortError');
                abortError.name = 'AbortError';
                mockFetch.mockRejectedValueOnce(abortError);
                
                const result = await analyzer.analyze('https://slow-site.com');
                
                expect(result.cms).toBe('Unknown');
                expect(result.error).toBe('AbortError');
            });

            it('should handle invalid URLs gracefully', async () => {
                // This tests the joinUrl integration
                const result = await analyzer.analyze('');
                
                expect(result.cms).toBe('Unknown');
                expect(result.confidence).toBe(0);
                expect(result.error).toBeDefined();
            });
        });

        describe('version extraction', () => {
            it('should extract Drupal version from comments', async () => {
                const versionContent = `# Generated by Drupal 9.3\nUser-agent: *\nDisallow: /core/`;
                const mockResponse = createMockResponse(versionContent);
                mockFetch.mockResolvedValueOnce(mockResponse);
                
                const result = await analyzer.analyze('https://drupal-versioned.com');
                
                expect(result.cms).toBe('Drupal');
                expect(result.version).toBe('9.3');
            });

            it('should extract WordPress version from comments', async () => {
                const versionContent = `# WordPress 6.1 robots.txt\nUser-agent: *\nDisallow: /wp-admin/`;
                const mockResponse = createMockResponse(versionContent);
                mockFetch.mockResolvedValueOnce(mockResponse);
                
                const result = await analyzer.analyze('https://wp-versioned.com');
                
                expect(result.cms).toBe('WordPress');
                expect(result.version).toBe('6.1');
            });

            it('should extract Joomla version from comments', async () => {
                const versionContent = `# Joomla 4.2 installation\nUser-agent: *\nDisallow: /administrator/`;
                const mockResponse = createMockResponse(versionContent);
                mockFetch.mockResolvedValueOnce(mockResponse);
                
                const result = await analyzer.analyze('https://joomla-versioned.com');
                
                expect(result.cms).toBe('Joomla');
                expect(result.version).toBe('4.2');
            });
        });

        describe('complex pattern matching', () => {
            it('should handle mixed CMS patterns correctly', async () => {
                // Content with both WordPress and Drupal patterns, but WordPress should win
                const mixedContent = `User-agent: *\nDisallow: /wp-admin/\nDisallow: /wp-content/\nDisallow: /modules/\nDisallow: /themes/`;
                const mockResponse = createMockResponse(mixedContent);
                mockFetch.mockResolvedValueOnce(mockResponse);
                
                const result = await analyzer.analyze('https://mixed-patterns.com');
                
                expect(result.cms).toBe('WordPress');
                expect(result.confidence).toBeGreaterThan(0.5);
                expect(result.signals).toContain('WordPress admin directory');
                expect(result.signals).toContain('WordPress content directory');
            });

            it('should handle case-insensitive pattern matching', async () => {
                const upperCaseContent = `USER-AGENT: *\nDISALLOW: /WP-ADMIN/\nDISALLOW: /WP-CONTENT/`;
                const mockResponse = createMockResponse(upperCaseContent);
                mockFetch.mockResolvedValueOnce(mockResponse);
                
                const result = await analyzer.analyze('https://uppercase-site.com');
                
                expect(result.cms).toBe('WordPress');
                expect(result.confidence).toBeGreaterThan(0.5);
            });

            it('should handle wildcard patterns correctly', async () => {
                const wildcardContent = `User-agent: *\nDisallow: /wp-admin/*\nDisallow: /wp-content/*`;
                const mockResponse = createMockResponse(wildcardContent);
                mockFetch.mockResolvedValueOnce(mockResponse);
                
                const result = await analyzer.analyze('https://wildcard-site.com');
                
                expect(result.cms).toBe('WordPress');
                expect(result.signals).toContain('WordPress admin directory');
                expect(result.signals).toContain('WordPress content directory');
            });
        });
    });

    describe('getInterestingHeaders', () => {
        it('should extract only interesting headers', () => {
            const allHeaders = {
                'server': 'Apache/2.4.41',
                'x-powered-by': 'PHP/7.4.0',
                'x-drupal-cache': 'HIT',
                'content-type': 'text/plain',
                'content-length': '1234',
                'random-header': 'should be ignored',
                'another-header': 'also ignored'
            };
            
            const interesting = analyzer.getInterestingHeaders(allHeaders);
            
            expect(interesting).toEqual({
                'server': 'Apache/2.4.41',
                'x-powered-by': 'PHP/7.4.0',
                'x-drupal-cache': 'HIT',
                'content-type': 'text/plain',
                'content-length': '1234'
            });
            expect(interesting).not.toHaveProperty('random-header');
            expect(interesting).not.toHaveProperty('another-header');
        });

        it('should handle empty headers object', () => {
            const interesting = analyzer.getInterestingHeaders({});
            expect(interesting).toEqual({});
        });

        it('should handle case-sensitive header matching', () => {
            const mixedCaseHeaders = {
                'Server': 'Apache',
                'X-Powered-By': 'PHP',
                'server': 'Apache2' // Should prefer exact match
            };
            
            const interesting = analyzer.getInterestingHeaders(mixedCaseHeaders);
            
            expect(interesting).toHaveProperty('server', 'Apache2');
            expect(interesting).not.toHaveProperty('Server');
            expect(interesting).not.toHaveProperty('X-Powered-By');
        });
    });
});