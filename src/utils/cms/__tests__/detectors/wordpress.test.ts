import { vi } from 'vitest';

// Mock logger and retry before other imports
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

// Simple retry mock that just executes the function
vi.mock('../../../retry.js', () => ({
    withRetry: async (fn: any) => {
        return await fn();
    }
}));

// Use real strategies - mock their dependencies properly

import { WordPressDetector } from '../../detectors/wordpress.js';
import { DetectionPage } from '../../types.js';
import { setupCMSDetectionTests, createMockPage, setupVitestExtensions } from '@test-utils';

// Setup custom Vitest matchers
setupVitestExtensions();

describe('WordPress Detector', () => {
    let detector: WordPressDetector;
    let mockPage: any;

    setupCMSDetectionTests();

    beforeEach(() => {
        detector = new WordPressDetector();
        mockPage = createMockPage();
        
        // Set up comprehensive page mocks that work for ALL strategies
        
        // Default evaluate mock covering all strategy patterns
        mockPage.evaluate.mockImplementation((fn: Function) => {
            const fnStr = fn.toString();
            
            // MetaTagStrategy pattern
            if (fnStr.includes('getElementsByTagName') && fnStr.includes('meta')) {
                return ''; // Default: no meta tag (can be overridden in tests)
            }
            
            // ApiEndpointStrategy and WordPressPluginStrategy pattern
            if (fnStr.includes('document.body.textContent')) {
                return ''; // Default: empty response
            }
            
            return '';
        });
        
        // Default content mock for HtmlContentStrategy and WordPressPluginStrategy
        mockPage.content.mockResolvedValue('<html><head></head><body></body></html>');
        
        // Default goto mock for ApiEndpointStrategy and WordPressPluginStrategy
        mockPage.goto.mockImplementation(async (url: string, options?: any) => {
            return Promise.resolve({
                status: () => 404,
                ok: () => false,
                headers: () => ({})
            });
        });
        
        // Browser context for HttpHeaderStrategy and navigation info
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
                headers: {} // Default: no WordPress headers
            }
        };
        
        // Robots.txt data for RobotsTxtStrategy
        mockPage._robotsTxtData = undefined;
    });

    describe('Individual Strategy Testing', () => {
        it('1. MetaTagStrategy should work', async () => {
            const { MetaTagStrategy } = await import('../../strategies/meta-tag.js');
            const strategy = new MetaTagStrategy('WordPress', 3000);
            
            mockPage.evaluate.mockImplementation((fn: Function) => {
                const fnStr = fn.toString();
                if (fnStr.includes('getElementsByTagName') && fnStr.includes('meta')) {
                    return 'WordPress 5.9';
                }
                return '';
            });
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('meta-tag');
        });

        it('2. HtmlContentStrategy should work', async () => {
            const { HtmlContentStrategy } = await import('../../strategies/html-content.js');
            const strategy = new HtmlContentStrategy(['/wp-content/', '/wp-includes/'], 'WordPress', 4000);
            
            mockPage.content.mockResolvedValue('<html><script src="/wp-content/themes/theme.js"></script></html>');
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('html-content');
        });

        it('3. ApiEndpointStrategy should work', async () => {
            const { ApiEndpointStrategy } = await import('../../strategies/api-endpoint.js');
            const strategy = new ApiEndpointStrategy('/wp-json/', 'WordPress', 6000);
            
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false });
            mockPage.evaluate.mockResolvedValue('');
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('api-endpoint');
        });

        it('4. HttpHeaderStrategy should work', async () => {
            const { HttpHeaderStrategy } = await import('../../strategies/http-headers.js');
            const strategy = new HttpHeaderStrategy([], 'WordPress', 5000);
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('http-headers');
        });

        it('5. RobotsTxtStrategy should work', async () => {
            const { RobotsTxtStrategy } = await import('../../strategies/robots-txt.js');
            const strategy = new RobotsTxtStrategy([], 'WordPress', 3000);
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('robots-txt');
        });

        it('6. WordPressPluginStrategy should work', async () => {
            // Test the inline WordPressPluginStrategy by creating a detector and accessing its strategies
            const detector = new WordPressDetector();
            const strategies = detector.getStrategies();
            const pluginStrategy = strategies.find(s => s.getName() === 'plugin-detection');
            
            expect(pluginStrategy).toBeDefined();
            
            mockPage.content.mockResolvedValue('<html><script src="/wp-content/plugins/yoast/script.js"></script></html>');
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false });
            mockPage.evaluate.mockResolvedValue('');
            
            const result = await pluginStrategy!.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('plugin-detection');
        });


        it('should detect WordPress from meta generator tag', async () => {
            // Set up mocks for MetaTagStrategy to succeed
            mockPage.evaluate.mockImplementation((fn: Function) => {
                const fnStr = fn.toString();
                
                if (fnStr.includes('getElementsByTagName') && fnStr.includes('meta')) {
                    return 'WordPress 5.9';
                }
                if (fnStr.includes('document.body.textContent')) {
                    return '';
                }
                return '';
            });
            
            mockPage.content.mockResolvedValue('<html><head><meta name="generator" content="WordPress 5.9"></head></html>');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('WordPress');
            expect(result).toHaveConfidenceAbove(0.9);
            expect(result.version).toBe('5.9');
            expect(result).toHaveUsedMethods(['meta-tag']);
        });

        it('should handle missing meta tag gracefully', async () => {
            // Mock DOM environment with no meta generator tag but WordPress content
            mockPage.evaluate.mockImplementation((fn: Function) => {
                const fnStr = fn.toString();
                if (fnStr.includes('getElementsByTagName') && fnStr.includes('meta')) {
                    // No meta generator tag found
                    return '';
                }
                return '';
            });
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/wp-content/themes/theme/script.js"></script>
                    <script src="/wp-includes/js/jquery.js"></script>
                    <link rel="stylesheet" href="/wp-content/plugins/plugin/style.css">
                    <div class="wp-content">WordPress content here</div>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('WordPress');
            expect(result).toHaveConfidenceAbove(0);
            expect(result).toHaveUsedMethods(['html-content']);
        });
    });

    describe('HTML Content Detection', () => {
        it('should detect WordPress from wp-content paths', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <link rel="stylesheet" href="/wp-content/themes/twentytwentyone/style.css">
                        <script src="/wp-content/plugins/jetpack/script.js"></script>
                    </head>
                    <body>
                        <script src="/wp-includes/js/jquery.js"></script>
                    </body>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.confidence).toBeGreaterThan(0.4);
            expect(result.detectionMethods).toContain('html-content');
        });

        it('should not detect WordPress from unrelated content', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <head><title>My Site</title></head>
                    <body><p>Welcome to my website</p></body>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBeLessThan(0.6);
        });
    });

    describe('API Endpoint Detection', () => {
        it('should detect WordPress from wp-json API', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockResolvedValue({ 
                status: () => 200, 
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            } as any);
            mockPage.evaluate.mockResolvedValue('{"name":"Test Site","wordpress":{"version":"5.9"}}');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.confidence).toBeGreaterThan(0.5);
            // Version extraction requires confidence > 0.7 and API endpoint is not the primary strategy
            expect(result.detectionMethods).toContain('api-endpoint');
        });

        it('should handle API endpoint not found', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
        });
    });

    describe('Plugin Detection', () => {
        it('should detect WordPress plugins from HTML', async () => {
            mockPage.evaluate.mockResolvedValue('WordPress 5.9');
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <link rel="stylesheet" href="/wp-content/plugins/yoast-seo/css/style.css?ver=1.0">
                        <script src="/wp-content/plugins/jetpack/js/script.js?ver=2.1"></script>
                        <script src="/wp-content/plugins/contact-form-7/includes/js/scripts.js"></script>
                    </head>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.plugins).toBeDefined();
            expect(result.plugins?.length).toBeGreaterThan(0);
            
            const pluginNames = result.plugins?.map(p => p.name) || [];
            expect(pluginNames).toContain('yoast-seo');
            expect(pluginNames).toContain('jetpack');
            expect(pluginNames).toContain('contact-form-7');
        });

        it('should extract plugin versions when available', async () => {
            mockPage.evaluate.mockResolvedValue('WordPress 5.9');
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/wp-content/plugins/yoast-seo/js/script.js?ver=19.8"></script>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            const yoastPlugin = result.plugins?.find(p => p.name === 'yoast-seo');
            expect(yoastPlugin).toBeDefined();
            expect(yoastPlugin?.version).toBe('19.8');
        });

        it('should handle plugin API endpoint when available', async () => {
            mockPage.evaluate.mockResolvedValue('WordPress 5.9');
            mockPage.content.mockResolvedValue('<html></html>');
            
            // Mock API responses
            let callCount = 0;
            mockPage.goto.mockImplementation((url: string) => {
                callCount++;
                if (url.includes('/wp-json/wp/v2/plugins')) {
                    return Promise.resolve({
                        status: () => 200,
                        ok: () => true,
                        headers: () => ({ 'content-type': 'application/json' })
                    } as any);
                }
                return Promise.resolve({ status: () => 404, ok: () => false } as any);
            });
            
            mockPage.evaluate.mockResolvedValue(JSON.stringify([
                {
                    plugin: 'yoast-seo',
                    name: 'Yoast SEO',
                    version: '19.8',
                    description: 'The first true all-in-one SEO solution for WordPress'
                }
            ]));

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.plugins).toBeDefined();
            const yoastPlugin = result.plugins?.find(p => p.name === 'yoast-seo');
            expect(yoastPlugin?.version).toBe('19.8');
            expect(yoastPlugin?.description).toContain('SEO solution');
        });

        it('should deduplicate plugins from different sources', async () => {
            mockPage.evaluate.mockResolvedValue('WordPress 5.9');
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/wp-content/plugins/yoast-seo/js/script.js"></script>
                </html>
            `);
            
            // Mock API that returns same plugin with more details
            mockPage.goto.mockImplementation((url: string) => {
                if (url.includes('/wp-json/wp/v2/plugins')) {
                    return Promise.resolve({
                        status: () => 200,
                        ok: () => true,
                        headers: () => ({ 'content-type': 'application/json' })
                    } as any);
                }
                return Promise.resolve({ status: () => 404, ok: () => false } as any);
            });
            
            mockPage.evaluate.mockResolvedValue(JSON.stringify([
                {
                    plugin: 'yoast-seo',
                    name: 'Yoast SEO',
                    version: '19.8'
                }
            ]));

            const result = await detector.detect(mockPage, 'https://example.com');

            const yoastPlugins = result.plugins?.filter(p => p.name === 'yoast-seo') || [];
            expect(yoastPlugins.length).toBe(1); // Should be deduplicated
            expect(yoastPlugins[0].version).toBe('19.8'); // Should use version from API
        });
    });

    describe('Confidence Scoring', () => {
        it('should have high confidence with meta tag detection', async () => {
            mockPage.evaluate.mockResolvedValue('WordPress 5.9');
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.9);
        });

        it('should have medium confidence with HTML content only', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/wp-content/themes/theme/script.js"></script>
                    <link href="/wp-includes/css/style.css" rel="stylesheet">
                    <script src="/wp-content/plugins/plugin/script.js"></script>
                    <div class="wp-admin">WordPress admin</div>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.5);
            expect(result.confidence).toBeLessThan(0.9);
        });

        it('should aggregate confidence from multiple successful strategies', async () => {
            // Mock meta tag strategy
            mockPage.evaluate.mockResolvedValueOnce('WordPress 5.9');
            // Mock HTML content strategy  
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/wp-content/plugins/yoast/script.js"></script>
                </html>
            `);
            // Mock API endpoint strategy
            mockPage.goto.mockResolvedValue({ 
                status: () => 200, 
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            } as any);
            mockPage.evaluate.mockResolvedValueOnce('{"wordpress":{"version":"5.9"}}');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.6);
            expect(result.detectionMethods?.length).toBeGreaterThan(2);
        });
    });

    describe('Error Handling', () => {
        it('should handle strategy failures gracefully', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockRejectedValue(new Error('Content failed'));
            mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.executionTime).toBeDefined();
        });

        it('should continue with other strategies if one fails', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/wp-content/themes/theme/script.js"></script>
                    <script src="/wp-includes/js/jquery.js"></script>
                    <link rel="stylesheet" href="/wp-content/plugins/plugin/style.css">
                    <div class="wp-content">WordPress content</div>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.confidence).toBeGreaterThan(0);
        });
    });
});