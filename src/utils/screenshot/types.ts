/**
 * Screenshot module type definitions
 * 
 * This module provides type definitions for the screenshot capture system,
 * including browser configuration, screenshot options, and results.
 */

export interface ScreenshotOptions {
    /** The URL to capture */
    url: string;
    /** Output file path for the screenshot */
    path: string;
    /** Viewport width for the screenshot */
    width: number;
    /** Whether to capture full page (default: true) */
    fullPage?: boolean;
    /** Custom timeout override in milliseconds */
    timeout?: number;
    /** Whether to block images during capture */
    blockImages?: boolean;
    /** Whether to block ads during capture */
    blockAds?: boolean;
    /** Custom user agent string */
    userAgent?: string;
}

export interface ScreenshotResult {
    /** The captured URL */
    url: string;
    /** Output file path */
    path: string;
    /** Viewport width used */
    width: number;
    /** Page dimensions [scrollWidth, scrollHeight] */
    sizes: [number, number];
    /** Capture duration in milliseconds */
    duration?: number;
    /** Navigation time in milliseconds */
    navigationTime?: number;
    /** Screenshot time in milliseconds */
    screenshotTime?: number;
}

export interface BrowserConfig {
    /** Whether to run browser in headless mode */
    headless: boolean;
    /** Default viewport configuration */
    viewport: {
        width: number;
        height: number;
    };
    /** Browser timeout in milliseconds */
    timeout: number;
    /** User agent string */
    userAgent: string;
    /** Whether to block ads */
    blockAds: boolean;
    /** Whether to block images */
    blockImages: boolean;
    /** Maximum concurrent browser instances */
    maxConcurrency: number;
}

export class ScreenshotError extends Error {
    /** Error code for categorization */
    code?: string;
    /** URL that failed */
    url?: string;
    /** Additional error context */
    context?: Record<string, any>;
    /** Original error that caused this error */
    cause?: Error;

    constructor(message: string, options?: { cause?: Error; code?: string; url?: string; context?: Record<string, any> }) {
        super(message);
        this.name = 'ScreenshotError';
        this.code = options?.code;
        this.url = options?.url;
        this.context = options?.context;
        this.cause = options?.cause;
    }
}

export class ScreenshotValidationError extends ScreenshotError {
    /** Field that failed validation */
    field: string;
    /** Invalid value */
    value: any;

    constructor(message: string, options: { field: string; value: any; cause?: Error }) {
        super(message, { 
            cause: options.cause, 
            code: 'VALIDATION_ERROR',
            context: { field: options.field, value: options.value }
        });
        this.name = 'ScreenshotValidationError';
        this.field = options.field;
        this.value = options.value;
    }
}

export class ScreenshotNetworkError extends ScreenshotError {
    /** Network error type */
    networkError: string;
    /** HTTP status code if available */
    statusCode?: number;

    constructor(message: string, options: { cause?: Error; networkError?: string; statusCode?: number; url?: string }) {
        super(message, { 
            cause: options.cause, 
            code: 'NETWORK_ERROR',
            url: options.url,
            context: { networkError: options.networkError, statusCode: options.statusCode }
        });
        this.name = 'ScreenshotNetworkError';
        this.networkError = options.networkError || 'unknown';
        this.statusCode = options.statusCode;
    }
}

/**
 * Screenshot service interface for dependency injection
 */
export interface IScreenshotService {
    /**
     * Capture a screenshot of a web page
     * @param options Screenshot capture options
     * @returns Promise resolving to screenshot result
     */
    captureScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult>;
    
    /**
     * Validate screenshot options
     * @param options Options to validate
     * @throws ScreenshotValidationError if validation fails
     */
    validateOptions(options: ScreenshotOptions): void;
    
    /**
     * Clean up resources
     */
    cleanup?(): Promise<void>;
}

/**
 * Browser manager interface for browser lifecycle management
 */
export interface IBrowserManager {
    /**
     * Launch a browser instance
     */
    launchBrowser(config: BrowserConfig): Promise<any>;
    
    /**
     * Setup page with configuration
     */
    setupPage(browser: any, options: ScreenshotOptions): Promise<any>;
    
    /**
     * Navigate to URL with retries
     */
    navigateToUrl(page: any, url: string, timeout: number): Promise<void>;
    
    /**
     * Capture screenshot
     */
    captureImage(page: any, path: string, fullPage: boolean): Promise<[number, number]>;
    
    /**
     * Close browser safely
     */
    closeBrowser(browser: any): Promise<void>;
}