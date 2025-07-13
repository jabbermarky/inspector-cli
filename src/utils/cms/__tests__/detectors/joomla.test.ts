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

import { JoomlaDetector } from '../../detectors/joomla.js';
import { DetectionStrategy, DetectionPage, PartialDetectionResult } from '../../types.js';
import { setupCMSDetectionTests, createMockPage, setupVitestExtensions } from '@test-utils';

// Setup custom Vitest matchers
setupVitestExtensions();

// Mock strategy implementation for testing
class MockJoomlaStrategy implements DetectionStrategy {
    constructor(
        private name: string,
        private result: PartialDetectionResult,
        private timeout: number = 3000
    ) {}

    getName(): string {
        return this.name;
    }

    getTimeout(): number {
        return this.timeout;
    }

    async detect(page: DetectionPage, url: string): Promise<PartialDetectionResult> {
        return this.result;
    }
}

describe('Joomla Detector', () => {
    let detector: JoomlaDetector;
    let mockPage: any;

    setupCMSDetectionTests();

    beforeEach(() => {
        detector = new JoomlaDetector();
        mockPage = createMockPage();
        
        // Set up comprehensive page mocks for ALL Joomla strategies
        
        // Default evaluate mock covering all strategy patterns
        mockPage.evaluate.mockImplementation((fn: Function) => {
            const fnStr = fn.toString();
            
            // MetaTagStrategy pattern
            if (fnStr.includes('getElementsByTagName') && fnStr.includes('meta')) {
                return ''; // Default: no meta tag (can be overridden in tests)
            }
            
            return '';
        });
        
        // Default content mock for HtmlContentStrategy
        mockPage.content.mockResolvedValue('<html><head></head><body></body></html>');
        
        // Default goto mock (not used by Joomla strategies but needed for completeness)
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
                headers: {} // Default: no Joomla headers
            }
        };
        
        // Robots.txt data for RobotsTxtStrategy
        mockPage._robotsTxtData = undefined;
    });

    describe('Individual Strategy Testing', () => {
        it('1. MetaTagStrategy should work', async () => {
            const { MetaTagStrategy } = await import('../../strategies/meta-tag.js');
            const strategy = new MetaTagStrategy('Joomla', 3000);
            
            mockPage.evaluate.mockResolvedValue('Joomla! 4.2.5');
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('meta-tag');
        });

        it('2. HtmlContentStrategy should work', async () => {
            const { HtmlContentStrategy } = await import('../../strategies/html-content.js');
            const strategy = new HtmlContentStrategy([
                'content="Joomla!',
                'joomla',
                '/administrator/',
                '/components/',
                'Joomla.JText'
            ], 'Joomla', 4000);
            
            mockPage.content.mockResolvedValue('<html><meta content="Joomla!"><script src="/administrator/index.php"></script><script>Joomla.JText = {};</script></html>');
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('html-content');
        });

        it('3. HttpHeaderStrategy should work', async () => {
            const { HttpHeaderStrategy } = await import('../../strategies/http-headers.js');
            const strategy = new HttpHeaderStrategy([
                {
                    name: 'X-Content-Encoded-By',
                    pattern: /Joomla/i,
                    confidence: 0.95,
                    extractVersion: false,
                    searchIn: 'value'
                }
            ], 'Joomla', 5000);
            
            // Mock page with browser context containing headers
            mockPage._browserManagerContext = {
                ...mockPage._browserManagerContext,
                lastNavigation: {
                    ...mockPage._browserManagerContext.lastNavigation,
                    headers: {
                        'x-content-encoded-by': 'Joomla! - Open Source Content Management',
                        'x-generator': 'Joomla! 4.2.5'
                    }
                }
            };
            
            const result = await strategy.detect(mockPage, 'https://example.com');
            expect(result).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.method).toBe('http-headers');
        });

        it('4. RobotsTxtStrategy should work', async () => {
            const { RobotsTxtStrategy, JOOMLA_ROBOTS_PATTERNS } = await import('../../strategies/robots-txt.js');
            const strategy = new RobotsTxtStrategy(JOOMLA_ROBOTS_PATTERNS, 'Joomla', 3000);
            
            // Mock robots.txt data in page context
            mockPage._robotsTxtData = {
                content: 'User-agent: *\nDisallow: /administrator/\nDisallow: /components/\nDisallow: /modules/',
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
    });

    describe('Meta Tag Detection', () => {
        it('should detect Joomla from meta generator tag', async () => {
            // Mock the detector to use our test strategy
            const mockStrategy = new MockJoomlaStrategy('meta-tag', {
                confidence: 0.95,
                method: 'meta-tag',
                version: '4.2'
            });
            
            vi.spyOn(detector, 'getStrategies').mockReturnValue([mockStrategy]);

            const result = await detector.detect(mockPage, 'https://example.com');

            // Note: This test validates detector behavior with mock strategies

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Joomla');
            expect(result).toHaveConfidenceAbove(0.89);
            expect(result.version).toBe('4.2');
            expect(result).toHaveUsedMethods(['meta-tag']);
        });

        it('should handle missing meta tag gracefully', async () => {
            // Mock evaluate to return empty string for meta tag query (no generator meta)
            mockPage.evaluate.mockImplementation((fn: Function) => {
                const fnStr = fn.toString();
                if (fnStr.includes('getElementsByTagName') && fnStr.includes('meta')) {
                    return ''; // No meta generator tag
                }
                return '';
            });
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <meta content="Joomla! - Open Source Content Management" />
                    </head>
                    <body>
                        <script src="/administrator/templates/atum/js/script.js"></script>
                        <link href="/components/com_content/assets/css/style.css" rel="stylesheet">
                    </body>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Joomla');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result).toHaveUsedMethods(['html-content']);
        });
    });

    describe('HTML Content Detection', () => {
        it('should detect Joomla from joomla-specific paths', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <title>Test Site</title>
                        <link rel="stylesheet" href="/administrator/templates/atum/css/template.css">
                        <script src="/components/com_content/assets/js/script.js"></script>
                    </head>
                    <body>
                        <div id="joomla-content">
                            <script src="/modules/mod_menu/tmpl/default.js"></script>
                        </div>
                    </body>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Joomla');
            expect(result.confidence).toBeGreaterThan(0.4);
            expect(result).toHaveUsedMethods(['html-content']);
        });

        it('should detect Joomla from content="Joomla!" meta tag', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <meta content="Joomla! - Open Source Content Management" />
                        <title>Test Site</title>
                    </head>
                    <body>
                        <script src="/administrator/templates/atum/js/script.js"></script>
                        <div class="joomla-content">Welcome to our joomla site</div>
                        <script src="/components/com_content/assets/js/script.js"></script>
                    </body>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Joomla');
            expect(result.confidence).toBeGreaterThan(0.4);
            expect(result).toHaveUsedMethods(['html-content']);
        });

        it('should detect Joomla from "joomla" text in HTML', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <head><title>Test Site</title></head>
                    <body>
                        <div class="joomla-footer">
                            Powered by Joomla! content management system
                        </div>
                        <script src="/administrator/index.php"></script>
                        <script src="/components/com_content/script.js"></script>
                        <script src="/modules/mod_menu/script.js"></script>
                    </body>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Joomla');
            expect(result.confidence).toBeGreaterThan(0.4);
            expect(result).toHaveUsedMethods(['html-content']);
        });

        it('should not detect Joomla from unrelated content', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <head><title>My Site</title></head>
                    <body><p>Welcome to my website built with React</p></body>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Unknown');
            expect(result.confidence).toBeLessThan(0.4);
        });
    });

    describe('Confidence Scoring', () => {
        it('should have high confidence with meta tag detection', async () => {
            mockPage.evaluate.mockResolvedValue('Joomla! 4.2 - Open Source Content Management');
            mockPage.content.mockResolvedValue('<html></html>');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.9);
        });

        it('should have medium confidence with HTML content only', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/administrator/templates/atum/js/script.js"></script>
                    <link href="/components/com_content/css/style.css" rel="stylesheet">
                    <div class="joomla-content">Content here</div>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.4);
            expect(result.confidence).toBeLessThan(0.9);
        });

        it('should aggregate confidence from multiple successful strategies', async () => {
            mockPage.evaluate.mockResolvedValue('Joomla! 4.2 - Open Source Content Management');
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/administrator/js/script.js"></script>
                    <div content="Joomla! CMS">Content</div>
                    <script src="/components/com_content/script.js"></script>
                    <script src="/modules/mod_menu/script.js"></script>
                    <script>Joomla.JText._('Some text');</script>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.6);
            expect(result.detectionMethods?.length).toBeGreaterThan(1);
        });
    });

    describe('Error Handling', () => {
        it('should handle strategy failures gracefully', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockRejectedValue(new Error('Content failed'));

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.executionTime).toBeDefined();
        });

        it('should continue with other strategies if one fails', async () => {
            mockPage.evaluate.mockResolvedValue('');
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/administrator/templates/atum/js/script.js"></script>
                    <div class="joomla-powered">Powered by Joomla!</div>
                    <script src="/components/com_content/script.js"></script>
                    <script src="/modules/mod_menu/script.js"></script>
                    <script>Joomla.JText._('Some text');</script>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Joomla');
            expect(result.confidence).toBeGreaterThan(0);
        });
    });

    describe('Version Extraction', () => {
        it('should extract version from meta generator tag', async () => {
            mockPage.evaluate.mockResolvedValue('Joomla! 4.2.3 - Open Source Content Management');
            mockPage.content.mockResolvedValue('<html></html>');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.version).toBe('4.2.3');
        });

        it('should handle version extraction with different formats', async () => {
            mockPage.evaluate.mockResolvedValue('Joomla 3.10.12');
            mockPage.content.mockResolvedValue('<html></html>');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.version).toBe('3.10.12');
        });

        it('should work without version when not available', async () => {
            mockPage.evaluate.mockResolvedValue('Joomla');
            mockPage.content.mockResolvedValue('<html></html>');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('Joomla');
            expect(result.version).toBeUndefined();
        });
    });

    describe('Strategy Weights', () => {
        it('should use correct strategy weights for joomla detection', async () => {
            const weights = (detector as any).getStrategyWeight;
            
            expect(weights('meta-tag')).toBe(1.0);
            expect(weights('html-content')).toBe(0.8);
            expect(weights('unknown-strategy')).toBe(0.5);
        });
    });
});