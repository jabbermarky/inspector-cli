import { jest } from '@jest/globals';
import { DrupalDetector } from '../../detectors/drupal.js';
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
    withRetry: jest.fn().mockImplementation(async (fn: any) => {
        return await fn();
    })
}));

describe('Drupal Detector', () => {
    let detector: DrupalDetector;
    let mockPage: jest.Mocked<DetectionPage>;

    beforeEach(() => {
        detector = new DrupalDetector();
        
        mockPage = {
            content: jest.fn(),
            goto: jest.fn(),
            evaluate: jest.fn()
        } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Meta Tag Detection', () => {
        it('should detect Drupal from meta generator tag', async () => {
            mockPage.evaluate.mockResolvedValue('Drupal 10.1.5 (https://www.drupal.org)');
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Drupal');
            expect(result.confidence).toBeGreaterThan(0.9);
            expect(result.version).toBe('10.1.5');
            expect(result.detectionMethods).toContain('meta-tag');
        });

        it('should handle missing meta tag gracefully', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <script src="/sites/all/modules/custom/module.js"></script>
                        <link href="/misc/drupal.js" rel="stylesheet">
                    </head>
                    <body>
                        <div class="drupal-settings-json">{"path":{"baseUrl":"\/"}}</div>
                        <script>Drupal.settings = {"basePath":"\/"};</script>
                    </body>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Drupal');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.detectionMethods).toContain('html-content');
        });
    });

    describe('HTML Content Detection', () => {
        it('should detect Drupal from drupal-specific paths', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <script src="/sites/all/themes/mytheme/js/script.js"></script>
                        <link rel="stylesheet" href="/core/themes/classy/css/components/action-links.css">
                    </head>
                    <body>
                        <div id="drupal-content">
                            <script src="/modules/contrib/views/js/views.js"></script>
                        </div>
                    </body>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Drupal');
            expect(result.confidence).toBeGreaterThan(0.4);
            expect(result.detectionMethods).toContain('html-content');
        });

        it('should detect Drupal from drupal.js reference', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <title>Test Site</title>
                        <script src="/misc/drupal.js"></script>
                    </head>
                    <body>
                        <div class="drupal-content">Welcome to our drupal site</div>
                        <script src="/core/misc/drupal.js"></script>
                        <script src="/modules/contrib/views/js/views.js"></script>
                        <script src="/themes/bartik/js/script.js"></script>
                    </body>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Drupal');
            expect(result.confidence).toBeGreaterThan(0.4);
            expect(result.detectionMethods).toContain('html-content');
        });

        it('should detect Drupal from Drupal.settings reference', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <head><title>Test Site</title></head>
                    <body>
                        <script>
                            Drupal.settings = {
                                "path": {"baseUrl": "/"},
                                "ajaxPageState": {"theme": "bartik"}
                            };
                        </script>
                    </body>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Drupal');
            expect(result.confidence).toBeGreaterThan(0.4);
            expect(result.detectionMethods).toContain('html-content');
        });

        it('should not detect Drupal from unrelated content', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <head><title>My Site</title></head>
                    <body><p>Welcome to my website built with Next.js</p></body>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBeLessThan(0.4);
        });
    });

    describe('File Detection Strategy', () => {
        it('should detect Drupal from CHANGELOG.txt file', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue('<html></html>');
            
            // Mock CHANGELOG.txt request
            mockPage.goto.mockImplementation((url: string) => {
                if (url.includes('/CHANGELOG.txt')) {
                    return Promise.resolve({
                        status: () => 200,
                        ok: () => true
                    } as any);
                }
                return Promise.resolve({ status: () => 404, ok: () => false } as any);
            });
            
            mockPage.evaluate.mockResolvedValue(`
                Drupal 10.1.5, 2023-10-04
                --------------------------
                - Issue #3388234: Update to Symfony 6.3.5
                - Issue #3385411: Update CKEditor 5 to version 39.0.2
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Drupal');
            expect(result.confidence).toBeGreaterThan(0.8);
            expect(result.version).toBe('10.1.5');
            expect(result.detectionMethods).toContain('file-detection');
        });

        it('should detect Drupal from core/CHANGELOG.txt file', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue('<html></html>');
            
            // Mock core/CHANGELOG.txt request
            let callCount = 0;
            mockPage.goto.mockImplementation((url: string) => {
                callCount++;
                if (url.includes('/CHANGELOG.txt') && callCount === 1) {
                    return Promise.resolve({ status: () => 404, ok: () => false } as any);
                }
                if (url.includes('/core/CHANGELOG.txt')) {
                    return Promise.resolve({
                        status: () => 200,
                        ok: () => true
                    } as any);
                }
                return Promise.resolve({ status: () => 404, ok: () => false } as any);
            });
            
            mockPage.evaluate.mockResolvedValue(`
                Drupal 9.5.10, 2023-06-07
                ---------------------------
                - Issue #3365234: Security update
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Drupal');
            expect(result.confidence).toBeGreaterThan(0.7);
            expect(result.detectionMethods).toContain('file-detection');
        });

        it('should detect Drupal from INSTALL.txt file', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue('<html></html>');
            
            // Mock INSTALL.txt request
            let callCount = 0;
            mockPage.goto.mockImplementation((url: string) => {
                callCount++;
                if (url.includes('/CHANGELOG.txt')) {
                    return Promise.resolve({ status: () => 404, ok: () => false } as any);
                }
                if (url.includes('/core/CHANGELOG.txt')) {
                    return Promise.resolve({ status: () => 404, ok: () => false } as any);
                }
                if (url.includes('/INSTALL.txt')) {
                    return Promise.resolve({
                        status: () => 200,
                        ok: () => true
                    } as any);
                }
                return Promise.resolve({ status: () => 404, ok: () => false } as any);
            });
            
            mockPage.evaluate.mockResolvedValue(`
                INSTALLING DRUPAL
                -----------------
                
                Drupal is a content management platform...
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Drupal');
            expect(result.confidence).toBeGreaterThan(0.7);
            expect(result.detectionMethods).toContain('file-detection');
        });

        it('should handle file detection failures gracefully', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockRejectedValue(new Error('Network error'));

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
        });
    });

    describe('Confidence Scoring', () => {
        it('should have high confidence with meta tag detection', async () => {
            mockPage.evaluate.mockResolvedValue('Drupal 10.1.5');
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.9);
        });

        it('should have high confidence with file detection', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockImplementation((url: string) => {
                if (url.includes('/CHANGELOG.txt')) {
                    return Promise.resolve({ status: () => 200, ok: () => true } as any);
                }
                return Promise.resolve({ status: () => 404, ok: () => false } as any);
            });
            mockPage.evaluate.mockResolvedValue('Drupal 10.1.5 changelog content');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.8);
        });

        it('should have medium confidence with HTML content only', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/sites/all/themes/theme/script.js"></script>
                    <div class="drupal-settings-json">{"path":{"baseUrl":"\/"}}</div>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.4);
            expect(result.confidence).toBeLessThan(0.9);
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
                    <script src="/sites/all/themes/theme/script.js"></script>
                    <div class="drupal-powered">Powered by Drupal</div>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Drupal');
            expect(result.confidence).toBeGreaterThan(0);
        });
    });

    describe('Version Extraction', () => {
        it('should extract version from meta generator tag', async () => {
            mockPage.evaluate.mockResolvedValue('Drupal 10.1.5');
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.version).toBe('10.1.5');
        });

        it('should extract version from changelog file', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockImplementation((url: string) => {
                if (url.includes('/CHANGELOG.txt')) {
                    return Promise.resolve({ status: () => 200, ok: () => true } as any);
                }
                return Promise.resolve({ status: () => 404, ok: () => false } as any);
            });
            mockPage.evaluate.mockResolvedValue(`
                Drupal 9.5.10, 2023-06-07
                ---------------------------
                - Issue #3365234: Security update
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.version).toBe('9.5.10');
        });

        it('should work without version when not available', async () => {
            mockPage.evaluate.mockResolvedValue('Drupal');
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Drupal');
            expect(result.version).toBeUndefined();
        });
    });

    describe('Strategy Weights', () => {
        it('should use correct strategy weights for drupal detection', async () => {
            const weights = (detector as any).getStrategyWeight;
            
            expect(weights('meta-tag')).toBe(1.0);
            expect(weights('file-detection')).toBe(0.9);
            expect(weights('html-content')).toBe(0.8);
            expect(weights('unknown-strategy')).toBe(0.5);
        });
    });
});