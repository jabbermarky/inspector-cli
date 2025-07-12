/**
 * Standardized BrowserManager mocks
 * 
 * Provides consistent mocking for BrowserManager across all test files
 * to eliminate the 3 different mocking approaches currently in use.
 */

import { BrowserManager } from '../../utils/browser/index.js';

// Import vi for Vitest mocking
import { vi } from 'vitest';

export interface BrowserManagerMockOptions {
    shouldFailCreation?: boolean;
    shouldFailNavigation?: boolean;
    customNavigationInfo?: any;
    customScreenshotResult?: [number, number];
}

/**
 * Creates a standardized BrowserManager mock with all commonly used methods
 */
export function createMockBrowserManager(options: BrowserManagerMockOptions = {}): any {
    const mockBrowserManager = {
        // Core page management
        createPage: vi.fn(),
        createPageInIsolatedContext: vi.fn(),
        createIsolatedContext: vi.fn(),
        closePage: vi.fn(),
        closeContext: vi.fn(),
        
        // Navigation and info
        navigateToUrl: vi.fn(),
        getNavigationInfo: vi.fn(),
        
        // User agent management
        getUserAgentStats: vi.fn(),
        resetUserAgentRotation: vi.fn(),
        
        // Screenshot functionality
        captureScreenshot: vi.fn(),
        
        // Cleanup
        cleanup: vi.fn()
    } as unknown as vi.Mocked<BrowserManager>;

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