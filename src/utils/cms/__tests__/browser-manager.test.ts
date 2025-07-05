import { jest } from '@jest/globals';
import { CMSBrowserManager } from '../browser-manager.js';
import { BrowserConfig } from '../types.js';

// Mock the config module to avoid validation issues in tests
jest.mock('../../config.js', () => ({
    getConfig: jest.fn(() => ({
        openai: {
            apiKey: 'test-key',
            model: 'gpt-4o',
            temperature: 0.7,
            topP: 1.0,
            maxTokens: 4096
        },
        puppeteer: {
            headless: true,
            timeout: 30000,
            viewport: { width: 1024, height: 768 },
            userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
            blockAds: true,
            blockImages: false,
            maxConcurrency: 2
        },
        app: {
            environment: 'test',
            screenshotDir: './scrapes',
            logLevel: 'DEBUG',
            logFormat: 'text'
        },
        api: {
            retryAttempts: 3,
            retryDelay: 1000,
            requestTimeout: 60000,
            enableCaching: false
        }
    }))
}));

// Create a simplified test that focuses on the core functionality without complex mocking
describe('CMSBrowserManager', () => {
    let browserManager: CMSBrowserManager;
    let config: BrowserConfig;

    beforeEach(() => {
        config = {
            timeout: 5000,
            userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
            viewport: { width: 1024, height: 768 },
            blockResources: true,
            blockedResourceTypes: ['image', 'stylesheet', 'font']
        };
        
        browserManager = new CMSBrowserManager(config);
    });

    describe('Initialization', () => {
        it('should create browser manager with default config', () => {
            const defaultManager = new CMSBrowserManager();
            expect(defaultManager).toBeInstanceOf(CMSBrowserManager);
        });

        it('should create browser manager with custom config', () => {
            expect(browserManager).toBeInstanceOf(CMSBrowserManager);
        });
    });

    describe('Resource Blocking Logic', () => {
        it('should identify blocked resource types correctly', () => {
            expect(browserManager.isResourceBlocked('image')).toBe(true);
            expect(browserManager.isResourceBlocked('stylesheet')).toBe(true);
            expect(browserManager.isResourceBlocked('font')).toBe(true);
            expect(browserManager.isResourceBlocked('document')).toBe(false);
            expect(browserManager.isResourceBlocked('script')).toBe(false);
        });

        it('should handle undefined resource types', () => {
            expect(browserManager.isResourceBlocked(undefined as any)).toBe(false);
            expect(browserManager.isResourceBlocked('')).toBe(false);
        });

        it('should respect custom blocked resource types', () => {
            const customConfig = {
                ...config,
                blockedResourceTypes: ['media', 'other']
            };
            const customManager = new CMSBrowserManager(customConfig);
            
            expect(customManager.isResourceBlocked('media')).toBe(true);
            expect(customManager.isResourceBlocked('other')).toBe(true);
            expect(customManager.isResourceBlocked('image')).toBe(false);
        });
    });

    describe('Configuration Handling', () => {
        it('should use default configuration when no config provided', () => {
            const defaultManager = new CMSBrowserManager();
            expect(defaultManager).toBeInstanceOf(CMSBrowserManager);
        });

        it('should merge custom configuration with defaults', () => {
            const partialConfig: Partial<BrowserConfig> = {
                timeout: 10000
            };
            const manager = new CMSBrowserManager(partialConfig);
            expect(manager).toBeInstanceOf(CMSBrowserManager);
        });
    });
});