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

// Fixed retry mock - must return function result
vi.mock('../../../retry.js', () => ({
    withRetry: async (fn: any) => {
        return await fn();
    }
}));

import { DrupalDetector } from '../../detectors/drupal.js';
import { DetectionPage } from '../../types.js';
import { setupCMSDetectionTests, createMockPage, setupVitestExtensions } from '@test-utils';

// Setup custom Vitest matchers
setupVitestExtensions();

describe('Drupal Detector', () => {
    let detector: DrupalDetector;
    let mockPage: any;

    setupCMSDetectionTests();

    beforeEach(() => {
        detector = new DrupalDetector();
        mockPage = createMockPage();
        
        // Set up comprehensive page mocks for ALL Drupal strategies
        
        // Default evaluate mock covering all strategy patterns
        mockPage.evaluate.mockImplementation((fn: Function) => {
            const fnStr = fn.toString();
            
            // MetaTagStrategy pattern
            if (fnStr.includes('getElementsByTagName') && fnStr.includes('meta')) {
                return ''; // Default: no meta tag (can be overridden in tests)
            }
            
            // DrupalFileStrategy pattern
            if (fnStr.includes('document.body.textContent')) {
                return ''; // Default: empty response
            }
            
            return '';
        });
        
        // Default content mock for HtmlContentStrategy
        mockPage.content.mockResolvedValue('<html><head></head><body></body></html>');
        
        // Default goto mock for DrupalFileStrategy
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
                headers: {} // Default: no Drupal headers
            }
        };
        
        // Robots.txt data for RobotsTxtStrategy
        mockPage._robotsTxtData = undefined;
    });

    describe('Individual Strategy Testing', () => {
        it('1. HttpHeaderStrategy should work', async () => {
            const { HttpHeaderStrategy } = await import('../../strategies/http-headers.js');
            const strategy = new HttpHeaderStrategy([
                {
                    name: 'X-Generator',
                    pattern: /Drupal\s+(\d+(?:\.\d+)*)/i,
                    confidence: 0.95,
                    extractVersion: true
                }
            ], 'Drupal', 5000);
            
            // Mock page with browser context containing headers
            mockPage._browserManagerContext = {
                ...mockPage._browserManagerContext,
                lastNavigation: {
                    ...mockPage._browserManagerContext.lastNavigation,
                    headers: {
                        'x-generator': 'Drupal 10.1.5',
                        'x-drupal-cache': 'HIT'
                    }
                }
            };
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('http-headers');
        });

        it('2. MetaTagStrategy should work', async () => {
            const { MetaTagStrategy } = await import('../../strategies/meta-tag.js');
            const strategy = new MetaTagStrategy('Drupal', 6000);
            
            mockPage.evaluate.mockResolvedValue('Drupal 10.1.5 (https://www.drupal.org)');
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('meta-tag');
        });

        it('3. HtmlContentStrategy should work', async () => {
            const { HtmlContentStrategy } = await import('../../strategies/html-content.js');
            const strategy = new HtmlContentStrategy([
                '/sites/all/',
                '/misc/drupal.js',
                'Drupal.settings'
            ], 'Drupal', 4000);
            
            mockPage.content.mockResolvedValue('<html><script src="/misc/drupal.js"></script><script>Drupal.settings = {};</script></html>');
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('html-content');
        });

        it('4. RobotsTxtStrategy should work', async () => {
            const { RobotsTxtStrategy, DRUPAL_ROBOTS_PATTERNS } = await import('../../strategies/robots-txt.js');
            const strategy = new RobotsTxtStrategy(DRUPAL_ROBOTS_PATTERNS, 'Drupal', 3000);
            
            // Mock robots.txt data in page context
            mockPage._robotsTxtData = {
                content: 'User-agent: *\nDisallow: /admin/\nDisallow: /sites/all/',
                url: 'https://example.com/robots.txt',
                accessible: true,
                size: 100,
                headers: {}
            };
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('robots-txt');
        });

        it('5. DrupalFileStrategy should work', async () => {
            const detector = new DrupalDetector();
            const strategies = detector.getStrategies();
            const fileStrategy = strategies.find(s => s.getName() === 'file-detection');
            
            expect(fileStrategy).toBeDefined();
            
            // Mock successful CHANGELOG.txt detection
            mockPage.goto.mockResolvedValue({ status: () => 200, ok: () => true } as any);
            mockPage.evaluate.mockResolvedValue('Drupal 10.1.5, 2023-11-01');
            
            const result = await fileStrategy!.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('file-detection');
        });
    });

    describe('Meta Tag Detection', () => {
        it('should detect Drupal from meta generator tag', async () => {
            mockPage.evaluate.mockResolvedValue('Drupal 10.1.5 (https://www.drupal.org)');
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Drupal');
            expect(result).toHaveConfidenceAbove(0.9);
            expect(result.version).toBe('10.1.5');
            expect(result).toHaveUsedMethods(['meta-tag']);
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

    describe('Timeout and Network Failure Scenarios', () => {
        it('should handle file detection timeout gracefully', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue('<html></html>');
            
            // Mock file detection timeout
            mockPage.goto.mockImplementation((url: string) => {
                if (url.includes('/CHANGELOG.txt')) {
                    return new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Timeout: Operation timed out')), 50);
                    });
                }
                return Promise.resolve({ status: () => 404, ok: () => false } as any);
            });

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.executionTime).toBeDefined();
        });

        it('should handle meta tag strategy timeout with fallback to other strategies', async () => {
            // Mock meta tag timeout but allow HTML content to succeed
            mockPage.evaluate.mockImplementation(() => {
                return new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Timeout')), 50);
                });
            });
            
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/misc/drupal.js"></script>
                    <script>Drupal.settings = { basePath: "/" };</script>
                    <div class="drupal-ajax-wrapper">Content</div>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false } as any);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Drupal');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result).toHaveUsedMethods(['html-content']);
        });

        it('should handle DNS resolution failures', async () => {
            const dnsError = new Error('getaddrinfo ENOTFOUND example.com');
            (dnsError as any).code = 'ENOTFOUND';
            (dnsError as any).hostname = 'example.com';
            
            mockPage.evaluate.mockRejectedValue(dnsError);
            mockPage.content.mockRejectedValue(dnsError);
            mockPage.goto.mockRejectedValue(dnsError);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.executionTime).toBeDefined();
        });

        it('should handle SSL/TLS certificate errors', async () => {
            const sslError = new Error('Certificate verification failed');
            (sslError as any).code = 'CERT_UNTRUSTED';
            
            mockPage.evaluate.mockRejectedValue(sslError);
            mockPage.content.mockRejectedValue(sslError);
            mockPage.goto.mockRejectedValue(sslError);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.executionTime).toBeDefined();
        });

        it('should handle HTTP 5xx server errors gracefully', async () => {
            const serverError = new Error('HTTP 503 Service Unavailable');
            (serverError as any).status = 503;
            
            mockPage.evaluate.mockRejectedValue(serverError);
            mockPage.content.mockRejectedValue(serverError);
            mockPage.goto.mockRejectedValue(serverError);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.executionTime).toBeDefined();
        });

        it('should handle connection reset by peer', async () => {
            const resetError = new Error('Connection reset by peer');
            (resetError as any).code = 'ECONNRESET';
            
            mockPage.evaluate.mockRejectedValue(resetError);
            mockPage.content.mockRejectedValue(resetError);
            mockPage.goto.mockRejectedValue(resetError);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.executionTime).toBeDefined();
        });

        it('should handle mixed timeout scenarios across strategies', async () => {
            // Meta tag times out, file detection times out, but HTML succeeds
            mockPage.evaluate.mockImplementation((fn: Function) => {
                const fnStr = fn.toString();
                if (fnStr.includes('meta') || fnStr.includes('textContent')) {
                    return new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Timeout')), 30);
                    });
                }
                return '';
            });
            
            mockPage.content.mockResolvedValue(`
                <html>
                    <head><title>Drupal Site</title></head>
                    <body>
                        <script src="/core/misc/drupal.js"></script>
                        <script>Drupal.settings = { "path": { "baseUrl": "/" } };</script>
                        <div class="block block-system">
                            <div class="field field-name-body">
                                <p>Powered by Drupal</p>
                            </div>
                        </div>
                    </body>
                </html>
            `);
            
            mockPage.goto.mockImplementation((url: string) => {
                if (url.includes('CHANGELOG.txt') || url.includes('INSTALL.txt')) {
                    return new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Timeout')), 30);
                    });
                }
                return Promise.resolve({ status: () => 404, ok: () => false } as any);
            });

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Drupal');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result).toHaveUsedMethods(['html-content']);
        });

        it('should handle rate limiting gracefully', async () => {
            const rateLimitError = new Error('Too Many Requests');
            (rateLimitError as any).status = 429;
            
            mockPage.evaluate.mockRejectedValue(rateLimitError);
            mockPage.content.mockRejectedValue(rateLimitError);
            mockPage.goto.mockRejectedValue(rateLimitError);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.executionTime).toBeDefined();
        });
    });
});