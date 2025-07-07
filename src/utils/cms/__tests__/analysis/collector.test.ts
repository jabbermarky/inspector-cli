import { DataCollector } from '../../analysis/collector.js';
import { CollectionConfig } from '../../analysis/types.js';
import { BrowserManager } from '../../../browser/index.js';

// Mock logger
jest.mock('../../../logger.js', () => ({
    createModuleLogger: () => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

// Mock URL validator
jest.mock('../../../url/index.js', () => ({
    validateAndNormalizeUrl: jest.fn((url: string) => ({
        isValid: true,
        normalizedUrl: url,
        errors: []
    }))
}));

// Mock BrowserManager
const mockBrowserManager = {
    createPageInIsolatedContext: jest.fn(),
    closeContext: jest.fn(),
    getNavigationInfo: jest.fn(),
    cleanup: jest.fn()
} as unknown as BrowserManager;

// Mock page object
const createMockPage = (overrides = {}) => ({
    url: jest.fn().mockReturnValue('https://example.com'),
    title: jest.fn().mockReturnValue('Example Title'),
    content: jest.fn().mockReturnValue('<html><head><title>Example</title></head><body><h1>Hello</h1></body></html>'),
    evaluate: jest.fn(),
    $eval: jest.fn(),
    $$eval: jest.fn(),
    goto: jest.fn(),
    setUserAgent: jest.fn(),
    setViewport: jest.fn(),
    waitForSelector: jest.fn(),
    waitForFunction: jest.fn(),
    waitForTimeout: jest.fn(),
    screenshot: jest.fn(),
    _browserManagerContext: {
        purpose: 'analysis' as const,
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
            headers: {
                'content-type': 'text/html',
                'server': 'nginx'
            }
        }
    },
    ...overrides
});

describe('DataCollector', () => {
    let collector: DataCollector;
    let mockPage: any;

    beforeEach(() => {
        jest.clearAllMocks();
        collector = new DataCollector(mockBrowserManager);
        mockPage = createMockPage();
        
        // Mock browser manager methods
        (mockBrowserManager.createPageInIsolatedContext as jest.Mock).mockResolvedValue({
            page: mockPage,
            context: {} // Mock context
        });
        
        (mockBrowserManager.getNavigationInfo as jest.Mock).mockReturnValue({
            originalUrl: 'https://example.com',
            finalUrl: 'https://example.com',
            redirectChain: [],
            totalRedirects: 0,
            navigationTime: 1000,
            protocolUpgraded: false,
            success: true,
            headers: {
                'content-type': 'text/html',
                'server': 'nginx'
            }
        });
        
        (mockBrowserManager.closeContext as jest.Mock).mockResolvedValue(undefined);
    });

    describe('Constructor and Configuration', () => {
        test('should create collector with default configuration', () => {
            const defaultCollector = new DataCollector(mockBrowserManager);
            expect(defaultCollector).toBeInstanceOf(DataCollector);
        });

        test('should create collector with custom configuration', () => {
            const config: Partial<CollectionConfig> = {
                includeHtmlContent: false,
                maxHtmlSize: 100000,
                timeout: 5000
            };
            const customCollector = new DataCollector(mockBrowserManager, config);
            expect(customCollector).toBeInstanceOf(DataCollector);
        });
    });

    describe('Basic Data Collection', () => {
        beforeEach(() => {
            // Mock page evaluation functions
            mockPage.evaluate.mockImplementation((fn: Function) => {
                if (fn.toString().includes('querySelector')) {
                    return null;
                }
                if (fn.toString().includes('querySelectorAll')) {
                    return [];
                }
                if (fn.toString().includes('title')) {
                    return 'Example Title';
                }
                return {};
            });

            mockPage.$eval.mockResolvedValue('Example Title');
            mockPage.$$eval.mockResolvedValue([]);
        });

        test('should collect basic data from valid URL', async () => {
            const result = await collector.collect('https://example.com');

            expect(result.success).toBe(true);
            expect(result.dataPoint).toBeDefined();
            expect(result.dataPoint!.url).toBe('https://example.com');
            expect(result.dataPoint!.timestamp).toBeInstanceOf(Date);
            expect(result.executionTime).toBeGreaterThan(0);
        });

        test('should collect navigation metadata', async () => {
            const result = await collector.collect('https://example.com');

            expect(result.dataPoint!.originalUrl).toBe('https://example.com');
            expect(result.dataPoint!.finalUrl).toBe('https://example.com');
            expect(result.dataPoint!.redirectChain).toEqual([]);
            expect(result.dataPoint!.totalRedirects).toBe(0);
            expect(result.dataPoint!.protocolUpgraded).toBe(false);
            expect(result.dataPoint!.navigationTime).toBe(1000);
        });

        test('should collect HTTP headers', async () => {
            const result = await collector.collect('https://example.com');

            expect(result.dataPoint!.httpHeaders).toEqual({
                'content-type': 'text/html',
                'server': 'nginx'
            });
        });

        test('should collect HTML content when enabled', async () => {
            const result = await collector.collect('https://example.com');

            expect(result.dataPoint!.htmlContent).toBeDefined();
            expect(result.dataPoint!.htmlSize).toBeGreaterThan(0);
            expect(result.dataPoint!.title).toBe('Example Title');
        });
    });

    describe('Meta Tags Collection', () => {
        beforeEach(() => {
            mockPage.evaluate.mockImplementation((fn: Function) => {
                const fnStr = fn.toString();
                if (fnStr.includes('querySelectorAll') && fnStr.includes('meta')) {
                    return [
                        {
                            name: 'generator',
                            content: 'WordPress 6.3'
                        },
                        {
                            property: 'og:title',
                            content: 'Example Site'
                        },
                        {
                            httpEquiv: 'content-type',
                            content: 'text/html; charset=UTF-8'
                        }
                    ];
                }
                return [];
            });
        });

        test('should collect meta tags with various attributes', async () => {
            const result = await collector.collect('https://example.com');

            expect(result.dataPoint!.metaTags).toHaveLength(3);
            expect(result.dataPoint!.metaTags[0]).toEqual({
                name: 'generator',
                content: 'WordPress 6.3'
            });
            expect(result.dataPoint!.metaTags[1]).toEqual({
                property: 'og:title',
                content: 'Example Site'
            });
            expect(result.dataPoint!.metaTags[2]).toEqual({
                httpEquiv: 'content-type',
                content: 'text/html; charset=UTF-8'
            });
        });
    });

    describe('DOM Analysis Collection', () => {
        beforeEach(() => {
            mockPage.evaluate.mockImplementation((fn: Function) => {
                const fnStr = fn.toString();
                if (fnStr.includes('wp-') || fnStr.includes('wordpress')) {
                    return [
                        {
                            selector: '[class*="wp-"]',
                            count: 5,
                            sample: '<div class="wp-content">Sample</div>',
                            attributes: { class: 'wp-content' }
                        }
                    ];
                }
                return [];
            });
        });

        test('should collect DOM elements analysis when enabled', async () => {
            const result = await collector.collect('https://example.com');

            expect(result.dataPoint!.domElements).toBeDefined();
            expect(Array.isArray(result.dataPoint!.domElements)).toBe(true);
        });
    });

    describe('Links Collection', () => {
        beforeEach(() => {
            mockPage.evaluate.mockImplementation((fn: Function) => {
                const fnStr = fn.toString();
                if (fnStr.includes('querySelectorAll') && fnStr.includes('link')) {
                    return [
                        {
                            href: 'https://example.com/wp-json/',
                            rel: 'https://api.w.org/',
                            type: 'application/json'
                        },
                        {
                            href: 'https://example.com/style.css',
                            rel: 'stylesheet',
                            type: 'text/css'
                        }
                    ];
                }
                if (fnStr.includes('querySelectorAll') && fnStr.includes('a[href]')) {
                    return [
                        {
                            href: 'https://example.com/about',
                            text: 'About Us'
                        }
                    ];
                }
                return [];
            });
        });

        test('should collect link elements and anchor links', async () => {
            const result = await collector.collect('https://example.com');

            expect(result.dataPoint!.links).toBeDefined();
            expect(Array.isArray(result.dataPoint!.links)).toBe(true);
        });
    });

    describe('Scripts and Stylesheets Collection', () => {
        beforeEach(() => {
            mockPage.evaluate.mockImplementation((fn: Function) => {
                const fnStr = fn.toString();
                if (fnStr.includes('script')) {
                    return [
                        {
                            src: 'https://example.com/wp-includes/js/jquery.js',
                            type: 'text/javascript',
                            inline: false
                        },
                        {
                            inline: true,
                            content: 'var wp_data = {"ajaxurl":"https://example.com/wp-admin/admin-ajax.php"};',
                            type: 'text/javascript'
                        }
                    ];
                }
                if (fnStr.includes('link') && fnStr.includes('stylesheet')) {
                    return [
                        {
                            href: 'https://example.com/wp-content/themes/theme/style.css',
                            inline: false
                        }
                    ];
                }
                return [];
            });
        });

        test('should collect script and stylesheet information when enabled', async () => {
            const result = await collector.collect('https://example.com');

            expect(result.dataPoint!.scripts).toBeDefined();
            expect(result.dataPoint!.stylesheets).toBeDefined();
            expect(Array.isArray(result.dataPoint!.scripts)).toBe(true);
            expect(Array.isArray(result.dataPoint!.stylesheets)).toBe(true);
        });
    });

    describe('Forms Collection', () => {
        beforeEach(() => {
            mockPage.evaluate.mockImplementation((fn: Function) => {
                const fnStr = fn.toString();
                if (fnStr.includes('form')) {
                    return [
                        {
                            action: '/wp-admin/admin-post.php',
                            method: 'POST',
                            fieldCount: 3,
                            fieldTypes: ['text', 'email', 'submit']
                        }
                    ];
                }
                return [];
            });
        });

        test('should collect form information', async () => {
            const result = await collector.collect('https://example.com');

            expect(result.dataPoint!.forms).toBeDefined();
            expect(Array.isArray(result.dataPoint!.forms)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle navigation errors gracefully', async () => {
            (mockBrowserManager.createPageInIsolatedContext as jest.Mock).mockRejectedValue(new Error('Navigation failed'));

            const result = await collector.collect('https://example.com');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Navigation failed');
            expect(result.executionTime).toBeGreaterThanOrEqual(0);
        });

        test('should handle invalid URLs', async () => {
            const { validateAndNormalizeUrl } = require('../../../url/index.js');
            validateAndNormalizeUrl.mockImplementation(() => {
                throw new Error('Invalid URL format');
            });

            const result = await collector.collect('invalid-url');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid URL format');
        });

        test('should handle page evaluation errors', async () => {
            // Reset URL validation mock first
            const { validateAndNormalizeUrl } = require('../../../url/index.js');
            validateAndNormalizeUrl.mockReturnValue('https://example.com');
            
            mockPage.evaluate.mockRejectedValue(new Error('Evaluation failed'));

            const result = await collector.collect('https://example.com');

            expect(result.success).toBe(false);
            expect(result.error).toContain('failed');
        });
    });

    describe('Configuration Impact', () => {
        test('should create collector with includeHtmlContent disabled', () => {
            const noHtmlCollector = new DataCollector(mockBrowserManager, {
                includeHtmlContent: false
            });

            expect(noHtmlCollector).toBeInstanceOf(DataCollector);
        });

        test('should create collector with includeDomAnalysis disabled', () => {
            const noDomCollector = new DataCollector(mockBrowserManager, {
                includeDomAnalysis: false
            });

            expect(noDomCollector).toBeInstanceOf(DataCollector);
        });

        test('should create collector with includeScriptAnalysis disabled', () => {
            const noScriptCollector = new DataCollector(mockBrowserManager, {
                includeScriptAnalysis: false
            });

            expect(noScriptCollector).toBeInstanceOf(DataCollector);
        });
    });

    describe('Performance Metrics', () => {
        test('should track execution time', async () => {
            const result = await collector.collect('https://example.com');

            expect(result.executionTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Data Integrity', () => {
        test('should return consistent result structure', async () => {
            const result = await collector.collect('https://example.com');

            // Basic result structure should always be present
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.executionTime).toBe('number');
            
            // Either success with dataPoint or failure with error
            if (result.success) {
                expect(result.dataPoint).toBeDefined();
                expect(result.error).toBeUndefined();
            } else {
                expect(result.dataPoint).toBeUndefined();
                expect(typeof result.error).toBe('string');
            }
        });
    });
});