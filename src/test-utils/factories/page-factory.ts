/**
 * Standardized page mock factory
 * 
 * Replaces the 5 different DetectionPage mocking approaches found across
 * test files with a single configurable factory function.
 */

import { BrowserManagerConfig, NavigationResult } from '../../utils/browser/types.js';

export interface RobotsTxtMockData {
    accessible: boolean;
    content: string;
    patterns: {
        disallowedPaths: string[];
        sitemapUrls: string[];
        userAgents?: string[];
    };
    size?: number;
    statusCode?: number;
    error?: string;
}

export interface PageMockOptions {
    url?: string;
    title?: string;
    content?: string;
    userAgent?: string;
    
    // Strategy-specific mock data
    robotsTxtData?: RobotsTxtMockData;
    httpHeaders?: Record<string, string>;
    
    // Browser manager context
    browserContext?: {
        navigationCount?: number;
        lastNavigation?: Partial<NavigationResult>;
    };
    
    // Evaluation functions
    evaluateImplementation?: (fn: Function) => any;
    shouldFailEvaluation?: boolean;
    shouldFailNavigation?: boolean;
}

/**
 * Creates a standardized DetectionPage mock
 * Consolidates all 5 different mocking approaches found across test files
 */
export function createMockPage(options: PageMockOptions = {}): any {
    const {
        url = 'https://example.com',
        title = 'Example Title',
        content = '<html><head><title>Example</title></head><body><h1>Hello</h1></body></html>',
        userAgent = 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
        robotsTxtData,
        httpHeaders = {},
        browserContext,
        evaluateImplementation,
        shouldFailEvaluation = false,
        shouldFailNavigation = false
    } = options;

    const mockPage: any = {
        // Core Puppeteer page methods
        url: jest.fn().mockReturnValue(url),
        title: jest.fn().mockResolvedValue(title),
        content: jest.fn().mockResolvedValue(content),
        goto: shouldFailNavigation ? 
            jest.fn().mockRejectedValue(new Error('Navigation failed')) :
            jest.fn().mockResolvedValue(undefined),
        
        // Evaluation methods
        evaluate: jest.fn(),
        $eval: jest.fn(),
        $$eval: jest.fn(),
        
        // User agent and viewport
        setUserAgent: jest.fn(),
        setViewport: jest.fn(),
        
        // Wait methods
        waitForSelector: jest.fn(),
        waitForFunction: jest.fn(),
        waitForTimeout: jest.fn(),
        
        // Screenshot
        screenshot: jest.fn(),
        
        // Timeouts
        setDefaultNavigationTimeout: jest.fn(),
        setDefaultTimeout: jest.fn(),
        
        // Event handling
        on: jest.fn(),
        off: jest.fn(),
        once: jest.fn(),
        
        // Request interception
        setRequestInterception: jest.fn(),
        
        // Lifecycle events
        close: jest.fn()
    };

    // Setup evaluation behavior
    if (shouldFailEvaluation) {
        mockPage.evaluate.mockRejectedValue(new Error('Evaluation failed'));
        mockPage.$eval.mockRejectedValue(new Error('Evaluation failed'));
        mockPage.$$eval.mockRejectedValue(new Error('Evaluation failed'));
    } else if (evaluateImplementation) {
        mockPage.evaluate.mockImplementation(evaluateImplementation);
    } else {
        // Default evaluation behavior
        mockPage.evaluate.mockImplementation((fn: Function) => {
            const fnStr = fn.toString();
            
            // Handle user agent requests
            if (fnStr.includes('navigator.userAgent')) {
                return userAgent;
            }
            
            // Handle title requests
            if (fnStr.includes('document.title')) {
                return title;
            }
            
            // Handle meta tag queries
            if (fnStr.includes('querySelectorAll') && fnStr.includes('meta')) {
                return [
                    {
                        name: 'generator',
                        content: 'WordPress 6.3'
                    }
                ];
            }
            
            // For other functions, try to execute them
            try {
                return fn();
            } catch (error) {
                // If execution fails, return empty object
                return {};
            }
        });
        
        mockPage.$eval.mockResolvedValue(title);
        mockPage.$$eval.mockResolvedValue([]);
    }

    // Add strategy-specific data
    if (robotsTxtData) {
        mockPage._robotsTxtData = robotsTxtData;
    }

    // Add browser manager context for HTTP headers and navigation info
    if (httpHeaders || browserContext) {
        const defaultContext = {
            purpose: 'detection' as const,
            createdAt: Date.now(),
            navigationCount: 1,
            lastNavigation: {
                originalUrl: url,
                finalUrl: url,
                redirectChain: [],
                totalRedirects: 0,
                navigationTime: 1000,
                protocolUpgraded: false,
                success: true,
                headers: httpHeaders
            }
        };
        
        // Merge browserContext at top level and lastNavigation level
        mockPage._browserManagerContext = {
            ...defaultContext,
            ...browserContext,
            lastNavigation: {
                ...defaultContext.lastNavigation,
                ...browserContext?.lastNavigation
            }
        };
    }

    return mockPage;
}

/**
 * Creates a mock page specifically configured for meta tag strategy testing
 */
export function createMetaTagMockPage(metaTags: Array<{name?: string; property?: string; httpEquiv?: string; content: string}>): any {
    return createMockPage({
        evaluateImplementation: (fn: Function) => {
            const fnStr = fn.toString();
            if (fnStr.includes('querySelectorAll') && fnStr.includes('meta')) {
                return metaTags;
            }
            return [];
        }
    });
}

/**
 * Creates a mock page specifically configured for HTTP header strategy testing
 */
export function createHttpHeaderMockPage(headers: Record<string, string>): any {
    return createMockPage({
        httpHeaders: headers
    });
}

/**
 * Creates a mock page specifically configured for robots.txt strategy testing
 */
export function createRobotsTxtMockPage(robotsTxtData: RobotsTxtMockData): any {
    return createMockPage({
        robotsTxtData
    });
}