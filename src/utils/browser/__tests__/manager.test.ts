// Mock dependencies before other imports
jest.mock('../../logger.js', () => ({
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

jest.mock('../../config.js', () => ({
    getConfig: jest.fn()
}));

jest.mock('../semaphore.js', () => ({
    Semaphore: jest.fn().mockImplementation((max: any) => ({
        acquire: jest.fn(),
        release: jest.fn(),
        getState: jest.fn(() => ({ current: 0, max, queueSize: 0 }))
    })),
    createSemaphore: jest.fn(() => ({
        acquire: jest.fn(),
        release: jest.fn()
    }))
}));

import { jest } from '@jest/globals';
import { BrowserManager } from '../manager.js';
import {
    BrowserManagerConfig,
    BrowserNetworkError,
    BrowserResourceError,
    BrowserTimeoutError
} from '../types.js';
import { setupBrowserTests, setupJestExtensions, createTestConfig, createMockPage, createMockBrowserManager } from '@test-utils';

// Setup custom Jest matchers
setupJestExtensions();

// Mock puppeteer-extra - get from factory functions
let mockPage: any;
let mockContext: any;
let mockBrowser: any;

jest.mock('puppeteer-extra', () => ({
    __esModule: true,
    default: {
        use: jest.fn(),
        launch: jest.fn(() => Promise.resolve(mockBrowser))
    }
}));

jest.mock('puppeteer-extra-plugin-stealth', () => ({
    __esModule: true,
    default: jest.fn()
}));

jest.mock('puppeteer-extra-plugin-adblocker', () => ({
    __esModule: true,
    default: jest.fn()
}));

describe('BrowserManager', () => {
    let browserManager: BrowserManager;
    let detectionConfig: BrowserManagerConfig;
    let captureConfig: BrowserManagerConfig;

    setupBrowserTests();

    beforeEach(() => {
        // Create fresh mock objects for each test
        mockPage = createMockPage();
        mockContext = {
            newPage: jest.fn(() => Promise.resolve(mockPage)),
            close: jest.fn()
        };
        mockBrowser = {
            newPage: jest.fn(() => Promise.resolve(mockPage)),
            createBrowserContext: jest.fn(() => Promise.resolve(mockContext)),
            close: jest.fn()
        };
        
        // Setup config mock with optimized settings for testing
        const testConfig = createTestConfig();
        const mockGetConfig = jest.fn(() => testConfig);
        require('../../config.js').getConfig = mockGetConfig;
        
        detectionConfig = {
            headless: true,
            viewport: { width: 1024, height: 768 },
            userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
            purpose: 'detection',
            resourceBlocking: {
                enabled: true,
                strategy: 'aggressive',
                allowEssentialScripts: true
            },
            navigation: {
                timeout: 5000,
                retryAttempts: 3
            },
            concurrency: {
                maxConcurrent: 2
            }
        };

        captureConfig = {
            headless: true,
            viewport: { width: 1024, height: 768 },
            userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
            purpose: 'capture',
            resourceBlocking: {
                enabled: true,
                strategy: 'moderate'
            },
            navigation: {
                timeout: 15000,
                additionalWaitTime: 2000
            },
            concurrency: {
                maxConcurrent: 2
            }
        };
    });

    afterEach(async () => {
        if (browserManager) {
            await browserManager.cleanup();
        }
        // Reset semaphore for each test
        (BrowserManager as any).resetSemaphore();
    });

    describe('Constructor', () => {
        it('should create browser manager with detection config', () => {
            browserManager = new BrowserManager(detectionConfig);
            expect(browserManager).toBeInstanceOf(BrowserManager);
        });

        it('should create browser manager with capture config', () => {
            browserManager = new BrowserManager(captureConfig);
            expect(browserManager).toBeInstanceOf(BrowserManager);
        });

        it('should merge user config with defaults', () => {
            const partialConfig = {
                purpose: 'detection' as const,
                resourceBlocking: {
                    enabled: true,
                    strategy: 'aggressive' as const
                }
            };
            
            browserManager = new BrowserManager(partialConfig);
            expect(browserManager).toBeInstanceOf(BrowserManager);
        });
    });

    describe('Page Creation', () => {
        beforeEach(() => {
            browserManager = new BrowserManager(detectionConfig);
            
            // Mock successful navigation
            mockPage.goto.mockResolvedValue({
                ok: () => true,
                status: () => 200,
                statusText: () => 'OK'
            });
        });

        it('should create page for detection purpose', async () => {
            const url = 'https://example.com';
            const page = await browserManager.createPage(url);
            
            expect(page).toBeDefined();
            expect(mockPage.goto).toHaveBeenCalledWith(url, {
                waitUntil: 'domcontentloaded',
                timeout: 5000
            });
            expect(mockPage.setUserAgent).toHaveBeenCalled();
            expect(mockPage.setRequestInterception).toHaveBeenCalledWith(true);
        });

        it('should create page for capture purpose with different navigation strategy', async () => {
            browserManager = new BrowserManager(captureConfig);
            const url = 'https://example.com';
            
            const page = await browserManager.createPage(url);
            
            expect(page).toBeDefined();
            expect(mockPage.goto).toHaveBeenCalledWith(url, {
                waitUntil: 'networkidle0',
                timeout: 15000
            });
            expect(mockPage.waitForTimeout).toHaveBeenCalledWith(2000);
        });

        it('should set browser manager context on page', async () => {
            const url = 'https://example.com';
            const page = await browserManager.createPage(url);
            
            expect(page._browserManagerContext).toBeDefined();
            expect(page._browserManagerContext?.purpose).toBe('detection');
            expect(page._browserManagerContext?.createdAt).toBeGreaterThan(0);
            expect(page._browserManagerContext?.navigationCount).toBe(1);
        });

        it('should handle navigation errors appropriately', async () => {
            const url = 'https://nonexistent.example';
            mockPage.goto.mockRejectedValue(new Error('ERR_NAME_NOT_RESOLVED'));
            
            await expect(browserManager.createPage(url))
                .rejects.toThrow(BrowserNetworkError);
        });

        it('should handle timeout errors', async () => {
            const url = 'https://slow.example';
            mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));
            
            await expect(browserManager.createPage(url))
                .rejects.toThrow(BrowserTimeoutError);
        });
    });

    describe('Resource Blocking', () => {
        beforeEach(() => {
            mockPage.goto.mockResolvedValue({
                ok: () => true,
                status: () => 200,
                statusText: () => 'OK'
            });
        });

        it('should setup aggressive resource blocking for detection', async () => {
            browserManager = new BrowserManager(detectionConfig);
            
            await browserManager.createPage('https://example.com');
            
            expect(mockPage.setRequestInterception).toHaveBeenCalledWith(true);
            expect(mockPage.on).toHaveBeenCalledWith('request', expect.any(Function));
        });

        it('should setup moderate resource blocking for capture', async () => {
            browserManager = new BrowserManager(captureConfig);
            
            await browserManager.createPage('https://example.com');
            
            expect(mockPage.setRequestInterception).toHaveBeenCalledWith(true);
            expect(mockPage.on).toHaveBeenCalledWith('request', expect.any(Function));
        });

        it('should not setup resource blocking when disabled', async () => {
            const configWithoutBlocking = {
                ...detectionConfig,
                resourceBlocking: {
                    enabled: false,
                    strategy: 'minimal' as const
                }
            };
            
            browserManager = new BrowserManager(configWithoutBlocking);
            await browserManager.createPage('https://example.com');
            
            expect(mockPage.setRequestInterception).not.toHaveBeenCalled();
        });
    });

    describe('Screenshot Capture', () => {
        let page: any;

        beforeEach(async () => {
            browserManager = new BrowserManager(captureConfig);
            mockPage.goto.mockResolvedValue({
                ok: () => true,
                status: () => 200,
                statusText: () => 'OK'
            });
            
            page = await browserManager.createPage('https://example.com');
        });

        it('should capture screenshot with dimensions', async () => {
            const dimensions = [1200, 800] as [number, number];
            mockPage.evaluate.mockResolvedValue(dimensions);
            mockPage.screenshot.mockResolvedValue(undefined);
            
            const result = await browserManager.captureScreenshot(page, './test.png');
            
            expect(result).toEqual(dimensions);
            expect(mockPage.evaluate).toHaveBeenCalled();
            expect(mockPage.screenshot).toHaveBeenCalledWith({
                path: './test.png',
                fullPage: true
            });
        });

        it('should handle screenshot capture errors', async () => {
            mockPage.evaluate.mockResolvedValue([1200, 800]);
            mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));
            
            await expect(browserManager.captureScreenshot(page, './test.png'))
                .rejects.toThrow(BrowserResourceError);
        });

        it('should capture partial screenshots', async () => {
            const dimensions = [1200, 800] as [number, number];
            mockPage.evaluate.mockResolvedValue(dimensions);
            mockPage.screenshot.mockResolvedValue(undefined);
            
            const result = await browserManager.captureScreenshot(page, './test.png', false);
            
            expect(result).toEqual(dimensions);
            expect(mockPage.screenshot).toHaveBeenCalledWith({
                path: './test.png',
                fullPage: false
            });
        });
    });

    describe('Navigation Strategy', () => {
        it('should use domcontentloaded for detection purpose', async () => {
            browserManager = new BrowserManager(detectionConfig);
            mockPage.goto.mockResolvedValue({
                ok: () => true,
                status: () => 200,
                statusText: () => 'OK'
            });
            
            await browserManager.createPage('https://example.com');
            
            expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
                waitUntil: 'domcontentloaded',
                timeout: 5000
            });
        });

        it('should use networkidle0 for capture purpose', async () => {
            browserManager = new BrowserManager(captureConfig);
            mockPage.goto.mockResolvedValue({
                ok: () => true,
                status: () => 200,
                statusText: () => 'OK'
            });
            
            await browserManager.createPage('https://example.com');
            
            expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
                waitUntil: 'networkidle0',
                timeout: 15000
            });
        });

        it('should handle additional wait time for capture', async () => {
            browserManager = new BrowserManager(captureConfig);
            mockPage.goto.mockResolvedValue({
                ok: () => true,
                status: () => 200,
                statusText: () => 'OK'
            });
            
            await browserManager.createPage('https://example.com');
            
            expect(mockPage.waitForTimeout).toHaveBeenCalledWith(2000);
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            browserManager = new BrowserManager(detectionConfig);
        });

        it('should categorize DNS resolution errors', async () => {
            mockPage.goto.mockRejectedValue(new Error('ERR_NAME_NOT_RESOLVED'));
            
            await expect(browserManager.createPage('https://nonexistent.example'))
                .rejects.toThrow(BrowserNetworkError);
        });

        it('should categorize connection refused errors', async () => {
            mockPage.goto.mockRejectedValue(new Error('ERR_CONNECTION_REFUSED'));
            
            await expect(browserManager.createPage('https://refused.example'))
                .rejects.toThrow(BrowserNetworkError);
        });

        it('should categorize timeout errors', async () => {
            mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));
            
            await expect(browserManager.createPage('https://timeout.example'))
                .rejects.toThrow(BrowserTimeoutError);
        });

        it('should handle unknown navigation errors', async () => {
            mockPage.goto.mockRejectedValue(new Error('Unknown error'));
            
            await expect(browserManager.createPage('https://unknown.example'))
                .rejects.toThrow(BrowserNetworkError);
        });
    });

    describe('Cleanup', () => {
        it('should cleanup browser and pages', async () => {
            browserManager = new BrowserManager(detectionConfig);
            mockPage.goto.mockResolvedValue({
                ok: () => true,
                status: () => 200,
                statusText: () => 'OK'
            });
            
            await browserManager.createPage('https://example.com');
            await browserManager.cleanup();
            
            expect(mockPage.close).toHaveBeenCalled();
            expect(mockBrowser.close).toHaveBeenCalled();
        });

        it('should handle cleanup errors gracefully', async () => {
            browserManager = new BrowserManager(detectionConfig);
            mockPage.goto.mockResolvedValue({
                ok: () => true,
                status: () => 200,
                statusText: () => 'OK'
            });
            
            mockPage.close.mockRejectedValue(new Error('Close failed'));
            mockBrowser.close.mockRejectedValue(new Error('Browser close failed'));
            
            await browserManager.createPage('https://example.com');
            
            // Should not throw despite errors
            await expect(browserManager.cleanup()).resolves.toBeUndefined();
        });

        it('should close individual pages', async () => {
            browserManager = new BrowserManager(detectionConfig);
            mockPage.goto.mockResolvedValue({
                ok: () => true,
                status: () => 200,
                statusText: () => 'OK'
            });
            
            const page = await browserManager.createPage('https://example.com');
            await browserManager.closePage(page);
            
            expect(mockPage.close).toHaveBeenCalled();
        });
    });

    describe('Debug Features', () => {
        it('should setup console capture when enabled', async () => {
            const debugConfig = {
                ...detectionConfig,
                debug: {
                    captureConsole: true
                }
            };
            
            browserManager = new BrowserManager(debugConfig);
            mockPage.goto.mockResolvedValue({
                ok: () => true,
                status: () => 200,
                statusText: () => 'OK'
            });
            
            await browserManager.createPage('https://example.com');
            
            expect(mockPage.on).toHaveBeenCalledWith('console', expect.any(Function));
        });

        it('should not setup console capture when disabled', async () => {
            browserManager = new BrowserManager(detectionConfig);
            mockPage.goto.mockResolvedValue({
                ok: () => true,
                status: () => 200,
                statusText: () => 'OK'
            });
            
            await browserManager.createPage('https://example.com');
            
            // Should only have 'request' event listener for resource blocking
            const consoleCalls = (mockPage.on as jest.Mock).mock.calls
                .filter(call => call[0] === 'console');
            expect(consoleCalls).toHaveLength(0);
        });
    });

    describe('Isolated Context Management', () => {
        it('should create isolated browser context', async () => {
            browserManager = new BrowserManager(detectionConfig);
            
            const context = await browserManager.createIsolatedContext();
            
            expect(mockBrowser.createBrowserContext).toHaveBeenCalledTimes(1);
            expect(context).toBeDefined();
        });

        it('should create page in isolated context', async () => {
            browserManager = new BrowserManager(detectionConfig);
            
            // Mock navigation response
            mockPage.goto.mockResolvedValueOnce({ ok: () => true, status: () => 200, statusText: () => 'OK' });
            
            const result = await browserManager.createPageInIsolatedContext('https://example.com');
            
            expect(result.page).toBeDefined();
            expect(result.context).toBeDefined();
            expect(mockBrowser.createBrowserContext).toHaveBeenCalledTimes(1);
            expect(mockContext.newPage).toHaveBeenCalledTimes(1);
        });

        it('should close isolated context and release semaphore', async () => {
            browserManager = new BrowserManager(detectionConfig);
            
            // Mock navigation response
            mockPage.goto.mockResolvedValueOnce({ ok: () => true, status: () => 200, statusText: () => 'OK' });
            
            const { context } = await browserManager.createPageInIsolatedContext('https://example.com');
            
            await browserManager.closeContext(context);
            
            expect(mockContext.close).toHaveBeenCalled();
        });

        it('should handle context creation errors gracefully', async () => {
            browserManager = new BrowserManager(detectionConfig);
            
            // Mock browser context creation failure
            mockBrowser.createBrowserContext.mockRejectedValueOnce(new Error('Context creation failed'));
            
            await expect(browserManager.createIsolatedContext()).rejects.toThrow('Failed to create isolated context: Context creation failed');
        });
    });

    describe('Static Semaphore Management', () => {
        it('should provide static semaphore access', () => {
            // Test that resetSemaphore is available
            expect(typeof (BrowserManager as any).resetSemaphore).toBe('function');
            
            // Reset should not throw
            (BrowserManager as any).resetSemaphore();
        });

        it('should reset semaphore state', async () => {
            // Create a browser manager which will initialize the semaphore
            browserManager = new BrowserManager(detectionConfig);
            
            // Reset the semaphore
            (BrowserManager as any).resetSemaphore();
            
            // Creating another manager should work fine
            const anotherManager = new BrowserManager(captureConfig);
            expect(anotherManager).toBeInstanceOf(BrowserManager);
        });
    });
});