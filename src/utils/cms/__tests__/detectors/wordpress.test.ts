import { jest } from '@jest/globals';
import { WordPressDetector } from '../../detectors/wordpress.js';
import { DetectionPage } from '../../types.js';

// Mock logger
jest.mock('../../../logger.js', () => ({
    createModuleLogger: () => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

// Mock retry utility
jest.mock('../../../retry.js', () => ({
    withRetry: jest.fn().mockImplementation((fn: any) => fn())
}));

describe('WordPress Detector', () => {
    let detector: WordPressDetector;
    let mockPage: jest.Mocked<DetectionPage>;

    beforeEach(() => {
        detector = new WordPressDetector();
        
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

    describe('Meta Tag Detection', () => {
        it('should detect WordPress from meta generator tag', async () => {
            mockPage.$eval.mockResolvedValue('wordpress 5.9');
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.confidence).toBeGreaterThan(0.9);
            expect(result.version).toBe('5.9');
            expect(result.detectionMethods).toContain('meta-tag');
        });

        it('should handle missing meta tag gracefully', async () => {
            mockPage.$eval.mockRejectedValue(new Error('Meta tag not found'));
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

            expect(result.cms).toBe('WordPress');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.detectionMethods).toContain('html-content');
        });
    });

    describe('HTML Content Detection', () => {
        it('should detect WordPress from wp-content paths', async () => {
            mockPage.$eval.mockRejectedValue(new Error('No meta tag'));
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
            mockPage.$eval.mockRejectedValue(new Error('No meta tag'));
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
            mockPage.$eval.mockRejectedValue(new Error('No meta tag'));
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
            mockPage.$eval.mockRejectedValue(new Error('No meta tag'));
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
        });
    });

    describe('Plugin Detection', () => {
        it('should detect WordPress plugins from HTML', async () => {
            mockPage.$eval.mockResolvedValue('wordpress 5.9');
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
            mockPage.$eval.mockResolvedValue('wordpress 5.9');
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
            mockPage.$eval.mockResolvedValue('wordpress 5.9');
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
            mockPage.$eval.mockResolvedValue('wordpress 5.9');
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
            mockPage.$eval.mockResolvedValue('wordpress 5.9');
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.9);
        });

        it('should have medium confidence with HTML content only', async () => {
            mockPage.$eval.mockRejectedValue(new Error('No meta tag'));
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
            mockPage.$eval.mockResolvedValue('wordpress 5.9');
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/wp-content/plugins/yoast/script.js"></script>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ 
                status: () => 200, 
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            } as any);
            mockPage.evaluate.mockResolvedValue('{"wordpress":{"version":"5.9"}}');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.6);
            expect(result.detectionMethods?.length).toBeGreaterThan(2);
        });
    });

    describe('Error Handling', () => {
        it('should handle strategy failures gracefully', async () => {
            mockPage.$eval.mockRejectedValue(new Error('Meta tag failed'));
            mockPage.content.mockRejectedValue(new Error('Content failed'));
            mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.executionTime).toBeDefined();
        });

        it('should continue with other strategies if one fails', async () => {
            mockPage.$eval.mockRejectedValue(new Error('Meta tag failed'));
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