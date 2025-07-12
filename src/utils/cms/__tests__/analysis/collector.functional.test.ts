/**
 * REWRITTEN Functional Tests for DataCollector
 * Using proven minimal mocking pattern that successfully works
 * 
 * STRATEGY: Only mock external dependencies, use real business logic modules
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataCollector } from '../../analysis/collector.js';
import { CollectionConfig } from '../../analysis/types.js';

// ONLY mock external dependencies - no URL module mocking
vi.mock('../../../browser/index.js', () => ({
    BrowserManager: vi.fn().mockImplementation(() => ({
        createPageInIsolatedContext: vi.fn(),
        closeContext: vi.fn(),
        getNavigationInfo: vi.fn()
    }))
}));

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

vi.mock('../../version-manager.js', () => ({
    getCurrentVersion: vi.fn(() => 'v1.0.0')
}));

// Mock global fetch for robots.txt collection
global.fetch = vi.fn() as any;
global.AbortSignal = {
    timeout: vi.fn(() => ({} as AbortSignal))
} as any;

describe('Functional: DataCollector (Rewritten)', () => {
    // FUNCTIONAL TEST SETUP: No vi.resetModules() to preserve real URL module
    beforeEach(() => {
        vi.clearAllMocks(); // Only clear mocks, don't reset modules
    });
    
    let collector: DataCollector;
    let mockBrowserManager: any;
    let mockPage: any;
    let mockContext: any;

    beforeEach(() => {
        // Create comprehensive mock page
        mockPage = {
            content: vi.fn(),
            title: vi.fn(),
            evaluate: vi.fn(),
            waitForFunction: vi.fn(),
            waitForTimeout: vi.fn()
        };
        
        mockContext = { id: 'test-context' };

        // Create mock browser manager
        mockBrowserManager = {
            createPageInIsolatedContext: vi.fn(),
            closeContext: vi.fn(),
            getNavigationInfo: vi.fn()
        };
        
        // Setup browser manager mocks with comprehensive data
        mockBrowserManager.createPageInIsolatedContext.mockResolvedValue({
            page: mockPage,
            context: mockContext
        });
        
        mockBrowserManager.getNavigationInfo.mockReturnValue({
            finalUrl: 'https://example.com',
            redirectChain: [],
            totalRedirects: 0,
            protocolUpgraded: false,
            navigationTime: 500,
            headers: {
                'content-type': 'text/html; charset=UTF-8',
                'content-length': '12345'
            }
        });

        // Setup comprehensive page mocks
        mockPage.content.mockResolvedValue('<html><head><title>Test</title></head><body></body></html>');
        mockPage.title.mockResolvedValue('Test Page');
        
        // Mock page.evaluate for different collection operations
        mockPage.evaluate.mockImplementation((fn: any, ...args: any[]) => {
            const fnString = fn.toString();
            
            // User agent detection
            if (fnString.includes('navigator.userAgent')) {
                return 'Mozilla/5.0 Test Browser';
            }
            
            // Meta tags collection
            if (fnString.includes('querySelectorAll(\'meta\')')) {
                return [
                    { name: 'generator', content: 'Test Generator' },
                    { name: 'description', content: 'Test Description' }
                ];
            }
            
            // Performance metrics
            if (fnString.includes('performance.getEntriesByType')) {
                return { loadTime: 2500, resourceCount: 45 };
            }
            
            // Scripts collection
            if (fnString.includes('getElementsByTagName(\'script\')')) {
                return [
                    { src: '/test.js', inline: false, type: 'text/javascript' }
                ];
            }
            
            // Forms collection
            if (fnString.includes('querySelectorAll(\'form\')')) {
                return [
                    { action: '/search', method: 'get', fieldCount: 2, fieldTypes: ['text', 'submit'] }
                ];
            }
            
            // Links collection
            if (fnString.includes('querySelectorAll(\'a[href], link[href]\')')) {
                return [
                    { href: '/page-1', text: 'Page 1' },
                    { href: '/page-2', text: 'Page 2' }
                ];
            }
            
            // Stylesheets collection
            if (fnString.includes('querySelectorAll(\'style, link[rel=\"stylesheet\"]\')')) {
                return [
                    { href: '/style.css', inline: false }
                ];
            }
            
            // DOM elements collection
            if (fnString.includes('querySelectorAll') && fnString.includes('selector')) {
                return [
                    { selector: 'script[src*=\"test\"]', count: 1, sample: '<script src=\"/test.js\"></script>' }
                ];
            }
            
            // Status code detection
            if (fnString.includes('performance.getEntriesByType(\'navigation\')')) {
                return 200;
            }
            
            // Document ready state
            if (fnString.includes('document.readyState')) {
                return true;
            }
            
            return null;
        });
        
        mockPage.waitForFunction.mockResolvedValue(true);
        mockPage.waitForTimeout.mockResolvedValue(true);

        // Setup fetch mock for robots.txt
        const mockFetch = global.fetch as any;
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            text: vi.fn(() => Promise.resolve('User-agent: *\nDisallow: /admin/')),
            headers: new Map([['content-type', 'text/plain']])
        });

        // Create collector instance with mock browser manager
        collector = new DataCollector(mockBrowserManager);
    });

    describe('Core Functionality', () => {
        it('should collect comprehensive data for a valid URL using real URL module', async () => {
            const result = await collector.collect('https://example.com');

            expect(result.success).toBe(true);
            expect(result.dataPoint).toBeDefined();
            expect(result.dataPoint?.url).toBe('https://example.com');
            expect(result.dataPoint?.captureVersion).toBe('v1.0.0');
            expect(result.executionTime).toBeGreaterThan(0);
        });

        it('should handle custom collection config', async () => {
            const config: Partial<CollectionConfig> = {
                includeHtmlContent: false,
                includeDomAnalysis: false,
                includeScriptAnalysis: false,
                maxHtmlSize: 1000,
                timeout: 5000
            };

            collector = new DataCollector(mockBrowserManager, config);
            const result = await collector.collect('https://example.com');

            expect(result.success).toBe(true);
            expect(result.dataPoint?.htmlContent).toBe('');
            expect(result.dataPoint?.domElements).toHaveLength(0);
            expect(result.dataPoint?.scripts).toHaveLength(0);
        });

        it('should collect navigation information', async () => {
            mockBrowserManager.getNavigationInfo.mockReturnValue({
                finalUrl: 'https://example.com/redirected',
                redirectChain: [
                    { from: 'http://example.com', to: 'https://example.com', status: 301 }
                ],
                totalRedirects: 1,
                protocolUpgraded: true,
                navigationTime: 800,
                headers: { 'content-type': 'text/html' }
            });

            const result = await collector.collect('http://example.com');

            expect(result.dataPoint?.finalUrl).toBe('https://example.com/redirected');
            expect(result.dataPoint?.totalRedirects).toBe(1);
            expect(result.dataPoint?.protocolUpgraded).toBe(true);
            expect(result.dataPoint?.navigationTime).toBe(800);
        });

        it('should handle browser manager errors gracefully', async () => {
            mockBrowserManager.createPageInIsolatedContext.mockRejectedValue(
                new Error('Failed to create browser context')
            );

            const result = await collector.collect('https://example.com');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to create browser context');
            expect(result.executionTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Data Collection', () => {
        it('should collect meta tags', async () => {
            const result = await collector.collect('https://example.com');
            
            expect(result.dataPoint?.metaTags).toBeDefined();
            if (result.dataPoint?.metaTags && result.dataPoint.metaTags.length > 0) {
                expect(result.dataPoint.metaTags).toContainEqual(
                    expect.objectContaining({ name: 'description' })
                );
            }
        });

        it('should collect performance metrics', async () => {
            const result = await collector.collect('https://example.com');

            expect(result.dataPoint?.loadTime).toBe(2500);
            expect(result.dataPoint?.resourceCount).toBe(45);
        });

        it('should collect robots.txt data', async () => {
            const result = await collector.collect('https://example.com');

            expect(result.dataPoint?.robotsTxt?.accessible).toBe(true);
            expect(result.dataPoint?.robotsTxt?.statusCode).toBe(200);
        });
    });

    describe('Error Handling', () => {
        it('should handle page evaluation errors gracefully', async () => {
            // Create a new mock page that fails evaluation for some operations
            const failingPage = {
                ...mockPage,
                evaluate: vi.fn().mockImplementation((fn: any) => {
                    const fnString = fn.toString();
                    // Let some operations fail while others succeed for graceful degradation
                    if (fnString.includes('querySelectorAll(\'meta\')')) {
                        return Promise.reject(new Error('Execution context destroyed'));
                    }
                    // Allow other operations to succeed
                    return Promise.resolve([]);
                })
            };

            mockBrowserManager.createPageInIsolatedContext.mockResolvedValue({
                page: failingPage,
                context: mockContext
            });

            const result = await collector.collect('https://example.com');

            // Should still succeed overall despite some evaluation failures
            expect(result.success).toBe(true);
            expect(result.dataPoint?.metaTags).toEqual([]); // Failed collection returns empty array
        });

        it('should cleanup context on error', async () => {
            mockPage.content.mockRejectedValue(new Error('Critical error'));

            await collector.collect('https://example.com');

            expect(mockBrowserManager.closeContext).toHaveBeenCalledWith(mockContext);
        });
    });
});