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

import { DudaDetector } from '../../detectors/duda.js';
import { DetectionPage } from '../../types.js';
import { setupCMSDetectionTests, createMockPage, setupVitestExtensions } from '@test-utils';

// Setup custom Vitest matchers
setupVitestExtensions();

describe('Duda Detector', () => {
    let detector: DudaDetector;
    let mockPage: any;

    setupCMSDetectionTests();

    beforeEach(() => {
        detector = new DudaDetector();
        mockPage = createMockPage();
        
        // Set up comprehensive page mocks that work for ALL strategies
        
        // Default evaluate mock covering all strategy patterns
        mockPage.evaluate.mockImplementation((fn: Function) => {
            const fnStr = fn.toString();
            
            // DudaJavaScriptStrategy pattern
            if (fnStr.includes('querySelectorAll') && fnStr.includes('script')) {
                return []; // Default: no scripts (can be overridden in tests)
            }
            
            return [];
        });
        
        // Default content mock for HtmlContentStrategy and DudaJavaScriptStrategy
        mockPage.content.mockResolvedValue('<html><head></head><body></body></html>');
        
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
                headers: {} // Default: no Duda headers
            }
        };
    });

    describe('Individual Strategy Testing', () => {
        it('1. DudaJavaScriptStrategy should work', async () => {
            const detector = new DudaDetector();
            const strategies = detector.getStrategies();
            const dudaJsStrategy = strategies.find(s => s.getName() === 'duda-javascript');
            
            expect(dudaJsStrategy).toBeDefined();
            
            mockPage.content.mockResolvedValue('<html><script>window.Parameters = window.Parameters || {};</script></html>');
            mockPage.evaluate.mockResolvedValue([
                {
                    src: null,
                    content: 'window.Parameters = window.Parameters || {}; var config = { SiteType: atob("RFVEQU9ORQ=="), productId: "DM_DIRECT" };'
                }
            ]);
            
            const result = await dudaJsStrategy!.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('duda-javascript');
        });

        it('2. HtmlContentStrategy should work', async () => {
            const { HtmlContentStrategy } = await import('../../strategies/html-content.js');
            const strategy = new HtmlContentStrategy(['irp.cdn-website.com', 'duda_website_builder'], 'Duda', 5000);
            
            mockPage.content.mockResolvedValue('<html><script src="https://irp.cdn-website.com/js/app.js"></script></html>');
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('html-content');
        });

        it('3. HttpHeaderStrategy should work', async () => {
            const { HttpHeaderStrategy } = await import('../../strategies/http-headers.js');
            const strategy = new HttpHeaderStrategy([
                {
                    name: '*',
                    pattern: /duda/i,
                    confidence: 0.8,
                    extractVersion: false,
                    searchIn: 'both'
                }
            ], 'Duda', 4000);
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('http-headers');
        });
    });

    describe('High-Confidence Pattern Detection', () => {
        it('should detect Duda from window.Parameters pattern', async () => {
            mockPage.content.mockResolvedValue(`
                <html>
                    <script>
                        window.Parameters = window.Parameters || {};
                        window.Parameters.SiteId = "12345";
                    </script>
                </html>
            `);
            mockPage.evaluate.mockResolvedValue([
                {
                    src: null,
                    content: 'window.Parameters = window.Parameters || {}; window.Parameters.SiteId = "12345";'
                }
            ]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Duda');
            expect(result).toHaveConfidenceAbove(0.8);
            expect(result).toHaveUsedMethods(['duda-javascript']);
        });

        it('should detect Duda from DUDAONE SiteType pattern', async () => {
            mockPage.content.mockResolvedValue(`
                <html>
                    <script>
                        var config = {
                            SiteType: atob('RFVEQU9ORQ=='),
                            productId: 'DM_DIRECT'
                        };
                    </script>
                </html>
            `);
            mockPage.evaluate.mockResolvedValue([
                {
                    src: null,
                    content: 'var config = { SiteType: atob("RFVEQU9ORQ=="), productId: "DM_DIRECT" };'
                }
            ]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Duda');
            expect(result).toHaveConfidenceAbove(0.9);
            expect(result).toHaveUsedMethods(['duda-javascript']);
        });

        it('should detect Duda from DM_DIRECT productId pattern', async () => {
            mockPage.content.mockResolvedValue(`
                <html>
                    <script>
                        window.dudaConfig = {
                            productId: 'DM_DIRECT',
                            BlockContainerSelector: '.dmBody'
                        };
                    </script>
                </html>
            `);
            mockPage.evaluate.mockResolvedValue([
                {
                    src: null,
                    content: 'window.dudaConfig = { productId: "DM_DIRECT", BlockContainerSelector: ".dmBody" };'
                }
            ]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Duda');
            expect(result).toHaveConfidenceAbove(0.9);
            expect(result).toHaveUsedMethods(['duda-javascript']);
        });

        it('should detect Duda from dmBody selector pattern', async () => {
            mockPage.content.mockResolvedValue(`
                <html>
                    <script>
                        var settings = {
                            BlockContainerSelector: '.dmBody',
                            SystemID: 'US_DIRECT_PRODUCTION'
                        };
                    </script>
                </html>
            `);
            mockPage.evaluate.mockResolvedValue([
                {
                    src: null,
                    content: 'var settings = { BlockContainerSelector: ".dmBody", SystemID: "US_DIRECT_PRODUCTION" };'
                }
            ]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Duda');
            expect(result).toHaveConfidenceAbove(0.9);
            expect(result).toHaveUsedMethods(['duda-javascript']);
        });
    });

    describe('Medium-Confidence Pattern Detection', () => {
        it('should detect Duda from CDN patterns', async () => {
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <script src="https://irp.cdn-website.com/js/main.js"></script>
                        <link rel="stylesheet" href="https://lirp.cdn-website.com/css/styles.css">
                    </head>
                </html>
            `);
            mockPage.evaluate.mockResolvedValue([
                {
                    src: 'https://irp.cdn-website.com/js/main.js',
                    content: null
                }
            ]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Duda');
            expect(result).toHaveConfidenceAbove(0.3);
            expect(result.detectionMethods).toEqual(expect.arrayContaining(['duda-javascript', 'html-content']));
        });

        it('should detect Duda from dmAlbum CSS classes', async () => {
            mockPage.content.mockResolvedValue(`
                <html>
                    <body>
                        <div class="dmAlbum">Gallery content</div>
                        <img class="dmRespImg" src="image.jpg">
                        <p>Some duda_website_builder content</p>
                    </body>
                </html>
            `);
            mockPage.evaluate.mockResolvedValue([]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Duda');
            expect(result).toHaveConfidenceAbove(0.3);
            expect(result).toHaveUsedMethods(['html-content']);
        });

        it('should detect Duda from dudamobile.com references', async () => {
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <meta name="generator" content="Powered by dudamobile.com">
                    </head>
                    <body>
                        <a href="https://www.dudamobile.com/mobile-website">Mobile site</a>
                    </body>
                </html>
            `);
            mockPage.evaluate.mockResolvedValue([]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Duda');
            expect(result).toHaveConfidenceAbove(0.3);
            expect(result).toHaveUsedMethods(['html-content']);
        });
    });

    describe('Multiple Pattern Detection', () => {
        it('should have higher confidence with multiple high-confidence patterns', async () => {
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <script src="https://irp.cdn-website.com/js/app.js"></script>
                    </head>
                    <body>
                        <script>
                            window.Parameters = window.Parameters || {};
                            var config = {
                                SiteType: atob('RFVEQU9ORQ=='),
                                productId: 'DM_DIRECT',
                                BlockContainerSelector: '.dmBody',
                                SystemID: 'US_DIRECT_PRODUCTION'
                            };
                        </script>
                        <div class="dmAlbum">Gallery</div>
                    </body>
                </html>
            `);
            mockPage.evaluate.mockResolvedValue([
                {
                    src: 'https://irp.cdn-website.com/js/app.js',
                    content: null
                },
                {
                    src: null,
                    content: 'window.Parameters = window.Parameters || {}; var config = { SiteType: atob("RFVEQU9ORQ=="), productId: "DM_DIRECT", BlockContainerSelector: ".dmBody", SystemID: "US_DIRECT_PRODUCTION" };'
                }
            ]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Duda');
            expect(result).toHaveConfidenceAbove(0.7);
            expect(result.detectionMethods?.length).toBeGreaterThan(1);
        });

        it('should aggregate confidence from multiple strategies', async () => {
            // Setup for multiple strategies to succeed
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <script src="https://lirp.cdn-website.com/js/duda.js"></script>
                    </head>
                    <body>
                        <script>window.Parameters = window.Parameters || {};</script>
                        <div class="dmAlbum">Content</div>
                        <p>Built with duda_website_builder</p>
                    </body>
                </html>
            `);
            mockPage.evaluate.mockResolvedValue([
                {
                    src: 'https://lirp.cdn-website.com/js/duda.js',
                    content: null
                },
                {
                    src: null,
                    content: 'window.Parameters = window.Parameters || {};'
                }
            ]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Duda');
            expect(result).toHaveConfidenceAbove(0.7);
            expect(result.detectionMethods?.length).toBeGreaterThan(1);
            expect(result.detectionMethods).toEqual(expect.arrayContaining(['duda-javascript', 'html-content']));
        });
    });

    describe('Negative Cases', () => {
        it('should not detect Duda from unrelated content', async () => {
            mockPage.content.mockResolvedValue(`
                <html>
                    <head><title>My WordPress Site</title></head>
                    <body>
                        <script src="/wp-content/themes/theme/script.js"></script>
                        <p>Welcome to my website</p>
                    </body>
                </html>
            `);
            mockPage.evaluate.mockResolvedValue([
                {
                    src: '/wp-content/themes/theme/script.js',
                    content: null
                }
            ]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBeLessThan(0.3);
        });

        it('should not detect Duda from generic content', async () => {
            mockPage.content.mockResolvedValue(`
                <html>
                    <head><title>Static Site</title></head>
                    <body>
                        <p>Just a plain HTML website</p>
                        <script>var config = { theme: 'light' };</script>
                    </body>
                </html>
            `);
            mockPage.evaluate.mockResolvedValue([
                {
                    src: null,
                    content: 'var config = { theme: "light" };'
                }
            ]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
        });

        it('should handle missing JavaScript content gracefully', async () => {
            mockPage.content.mockResolvedValue('<html><head></head><body></body></html>');
            mockPage.evaluate.mockResolvedValue([]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.executionTime).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle strategy failures gracefully', async () => {
            mockPage.content.mockRejectedValue(new Error('Content failed'));
            mockPage.evaluate.mockRejectedValue(new Error('Evaluate failed'));

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.executionTime).toBeDefined();
        });

        it('should continue with other strategies if JavaScript strategy fails', async () => {
            mockPage.evaluate.mockRejectedValue(new Error('Script evaluation failed'));
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <script src="https://irp.cdn-website.com/js/main.js"></script>
                    </head>
                    <body>
                        <div class="dmAlbum">Gallery content</div>
                    </body>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Duda');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result).toHaveUsedMethods(['html-content']);
        });
    });

    describe('Strategy Weight Testing', () => {
        it('should prioritize JavaScript strategy over HTML content', async () => {
            const detector = new DudaDetector();
            
            // Test the strategy weight method
            expect((detector as any).getStrategyWeight('duda-javascript')).toBe(1.0);
            expect((detector as any).getStrategyWeight('html-content')).toBe(0.8);
            expect((detector as any).getStrategyWeight('http-headers')).toBe(0.7);
        });
    });

    describe('Confidence Scoring', () => {
        it('should have very high confidence with multiple high-confidence patterns', async () => {
            mockPage.content.mockResolvedValue('<html><script>config</script></html>');
            mockPage.evaluate.mockResolvedValue([
                {
                    src: null,
                    content: 'window.Parameters = window.Parameters; var config = { SiteType: atob("RFVEQU9ORQ=="), productId: "DM_DIRECT", BlockContainerSelector: ".dmBody" };'
                }
            ]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.95);
        });

        it('should have medium confidence with CDN patterns only', async () => {
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="https://irp.cdn-website.com/js/app.js"></script>
                    <link href="https://lirp.cdn-website.com/css/style.css" rel="stylesheet">
                </html>
            `);
            mockPage.evaluate.mockResolvedValue([
                {
                    src: 'https://irp.cdn-website.com/js/app.js',
                    content: null
                }
            ]);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.3);
            expect(result.confidence).toBeLessThan(0.9);
        });
    });
});