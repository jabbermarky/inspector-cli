/**
 * Standardized BrowserManager mocks
 * 
 * Provides consistent mocking for BrowserManager across all test files
 * to eliminate the 3 different mocking approaches currently in use.
 */

import { BrowserManager } from '../../utils/browser/index.js';

export interface BrowserManagerMockOptions {
    shouldFailCreation?: boolean;
    shouldFailNavigation?: boolean;
    customNavigationInfo?: any;
    customScreenshotResult?: [number, number];
}

/**
 * Creates a standardized BrowserManager mock with all commonly used methods
 */
export function createMockBrowserManager(options: BrowserManagerMockOptions = {}): jest.Mocked<BrowserManager> {
    const mockBrowserManager = {
        // Core page management
        createPage: jest.fn(),
        createPageInIsolatedContext: jest.fn(),
        createIsolatedContext: jest.fn(),
        closePage: jest.fn(),
        closeContext: jest.fn(),
        
        // Navigation and info
        navigateToUrl: jest.fn(),
        getNavigationInfo: jest.fn(),
        
        // User agent management
        getUserAgentStats: jest.fn(),
        resetUserAgentRotation: jest.fn(),
        
        // Screenshot functionality
        captureScreenshot: jest.fn(),
        
        // Cleanup
        cleanup: jest.fn()
    } as unknown as jest.Mocked<BrowserManager>;

    // Setup default behaviors
    if (options.shouldFailCreation) {
        mockBrowserManager.createPage.mockRejectedValue(new Error('Failed to create page'));
        mockBrowserManager.createPageInIsolatedContext.mockRejectedValue(new Error('Failed to create isolated context'));
    } else {
        mockBrowserManager.createPage.mockResolvedValue({} as any);
        mockBrowserManager.createPageInIsolatedContext.mockResolvedValue({
            page: {} as any,
            context: {} as any
        });
    }

    if (options.shouldFailNavigation) {
        mockBrowserManager.getNavigationInfo.mockReturnValue(null);
    } else {
        mockBrowserManager.getNavigationInfo.mockReturnValue(options.customNavigationInfo || {
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
    }

    // Navigation default behavior
    mockBrowserManager.navigateToUrl.mockResolvedValue({
        originalUrl: 'https://example.com',
        finalUrl: 'https://example.com',
        redirectChain: [],
        totalRedirects: 0,
        navigationTime: 1000,
        protocolUpgraded: false,
        success: true,
        headers: {}
    });

    // User agent management defaults
    mockBrowserManager.getUserAgentStats.mockReturnValue({ enabled: false });
    mockBrowserManager.resetUserAgentRotation.mockReturnValue(undefined);

    mockBrowserManager.captureScreenshot.mockResolvedValue(
        options.customScreenshotResult || [1024, 768]
    );
    
    mockBrowserManager.closeContext.mockResolvedValue(undefined);
    mockBrowserManager.closePage.mockResolvedValue(undefined);
    mockBrowserManager.cleanup.mockResolvedValue(undefined);

    return mockBrowserManager;
}