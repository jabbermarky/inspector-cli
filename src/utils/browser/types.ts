import { Page } from 'puppeteer';

/**
 * Purpose-driven browser management types
 */
export type BrowserPurpose = 'detection' | 'capture' | 'analysis';

/**
 * Resource blocking strategies
 */
export type ResourceBlockingStrategy = 'aggressive' | 'moderate' | 'minimal';

/**
 * Navigation wait strategies
 */
export type NavigationWaitStrategy = 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';

/**
 * Browser viewport configuration
 */
export interface BrowserViewport {
    width: number;
    height: number;
}

/**
 * Resource blocking configuration
 */
export interface ResourceBlockingConfig {
    enabled: boolean;
    strategy: ResourceBlockingStrategy;
    allowEssentialScripts?: boolean;
    customTypes?: string[];
    allowPatterns?: string[];
}

/**
 * Navigation configuration
 */
export interface NavigationConfig {
    timeout: number;
    retryAttempts?: number;
    additionalWaitTime?: number;
    // Redirect handling
    followRedirects?: boolean;           // Default: true
    maxRedirects?: number;               // Default: 20 (Chrome's limit)
    redirectTimeout?: number;            // Per-redirect timeout (default: 5000ms)
    trackRedirectChain?: boolean;        // Default: true for debugging
}

/**
 * Concurrency control configuration
 */
export interface ConcurrencyConfig {
    maxConcurrent: number;
    acquireTimeout?: number;
}

/**
 * Debug and monitoring configuration
 */
export interface DebugConfig {
    enableTracing?: boolean;
    captureConsole?: boolean;
    saveFailureScreenshots?: boolean;
    performanceMetrics?: boolean;
}

/**
 * User agent rotation configuration
 */
export interface UserAgentConfig {
    rotation: boolean;                    // Enable user agent rotation
    pool?: string[];                     // Custom user agent pool
    strategy?: 'random' | 'sequential';  // Rotation strategy
    updateFrequency?: number;            // How often to change (requests)
}

/**
 * Main browser manager configuration
 */
export interface BrowserManagerConfig {
    // Core browser settings
    headless: boolean;
    viewport: BrowserViewport;
    userAgent: string | UserAgentConfig;  // Single UA or rotation config
    
    // Purpose-driven behavior
    purpose: BrowserPurpose;
    
    // Resource management
    resourceBlocking: ResourceBlockingConfig;
    
    // Navigation behavior
    navigation: NavigationConfig;
    
    // Concurrency control
    concurrency: ConcurrencyConfig;
    
    // Debug and monitoring
    debug?: DebugConfig;
}

/**
 * Navigation strategy mapping
 */
export interface NavigationStrategy {
    waitUntil: NavigationWaitStrategy;
    reasoning: string;
}

/**
 * Redirect information for a single redirect step
 */
export interface RedirectInfo {
    from: string;
    to: string;
    status: number;
    timestamp: number;
}

/**
 * Navigation result with redirect tracking
 */
export interface NavigationResult {
    originalUrl: string;
    finalUrl: string;
    redirectChain: RedirectInfo[];
    totalRedirects: number;
    navigationTime: number;
    protocolUpgraded: boolean;          // HTTP→HTTPS detection
    success: boolean;
    headers?: Record<string, string>;   // Response headers from final navigation
}

/**
 * Browser page with additional context
 */
export interface ManagedPage extends Page {
    _browserManagerContext?: {
        purpose: BrowserPurpose;
        createdAt: number;
        navigationCount: number;
        lastNavigation?: NavigationResult;
    };
    waitForTimeout(timeout: number): Promise<void>;
    setDefaultNavigationTimeout(timeout: number): void;
}

/**
 * Base error class for browser manager operations
 */
export class BrowserManagerError extends Error {
    public readonly type: string;
    public readonly context?: Record<string, any>;
    public readonly cause?: Error;

    constructor(message: string, type: string = 'browser_manager_error', context?: Record<string, any>, cause?: Error) {
        super(message);
        this.name = 'BrowserManagerError';
        this.type = type;
        this.context = context;
        this.cause = cause;
    }
}

/**
 * Network-related browser errors
 */
export class BrowserNetworkError extends BrowserManagerError {
    public readonly url?: string;
    public readonly networkError?: string;

    constructor(message: string, context?: Record<string, any>, cause?: Error) {
        super(message, 'browser_network_error', context, cause);
        this.name = 'BrowserNetworkError';
        this.url = context?.url;
        this.networkError = context?.networkError;
    }
}

/**
 * Resource management browser errors
 */
export class BrowserResourceError extends BrowserManagerError {
    public readonly resourceType?: string;

    constructor(message: string, context?: Record<string, any>, cause?: Error) {
        super(message, 'browser_resource_error', context, cause);
        this.name = 'BrowserResourceError';
        this.resourceType = context?.resourceType;
    }
}

/**
 * Timeout-related browser errors
 */
export class BrowserTimeoutError extends BrowserManagerError {
    public readonly timeout: number;
    public readonly operation: string;

    constructor(message: string, timeout: number, operation: string, context?: Record<string, any>, cause?: Error) {
        super(message, 'browser_timeout_error', context, cause);
        this.name = 'BrowserTimeoutError';
        this.timeout = timeout;
        this.operation = operation;
    }
}

/**
 * Redirect-related browser errors
 */
export class BrowserRedirectError extends BrowserManagerError {
    public readonly redirectChain: RedirectInfo[];
    public readonly redirectCount: number;
    public readonly loopDetected?: boolean;

    constructor(message: string, redirectChain: RedirectInfo[], context?: Record<string, any>, cause?: Error) {
        super(message, 'browser_redirect_error', context, cause);
        this.name = 'BrowserRedirectError';
        this.redirectChain = redirectChain;
        this.redirectCount = redirectChain.length;
        this.loopDetected = context?.loopDetected;
    }
}

/**
 * Strategy mappings for purpose-based configuration
 */
export const NAVIGATION_STRATEGIES: Record<BrowserPurpose, NavigationStrategy> = {
    'detection': {
        waitUntil: 'domcontentloaded',
        reasoning: 'CMS detection only needs DOM structure, not full visual loading'
    },
    'capture': {
        waitUntil: 'networkidle0',
        reasoning: 'Screenshots need full visual rendering including images and styles'
    },
    'analysis': {
        waitUntil: 'networkidle2',
        reasoning: 'Analysis might need partial network activity for dynamic content'
    }
};

/**
 * Resource blocking strategy mappings
 */
export const RESOURCE_BLOCKING_STRATEGIES: Record<ResourceBlockingStrategy, string[]> = {
    'aggressive': ['image', 'stylesheet', 'font', 'media', 'websocket'],  // CMS detection
    'moderate': ['font', 'media', 'websocket'],                          // Screenshot capture
    'minimal': ['websocket']                                             // Future use
};

/**
 * Default essential script patterns for CMS detection
 */
export const DEFAULT_ESSENTIAL_SCRIPT_PATTERNS = [
    '/wp-includes/',
    '/wp-content/',
    '/wp-admin/',
    'joomla',
    'drupal',
    'wp-json',
    'generator',
    'jquery',
    'bootstrap'
];

/**
 * Default browser manager configuration
 */
export const DEFAULT_BROWSER_CONFIG: Partial<BrowserManagerConfig> = {
    headless: true,
    viewport: { width: 1024, height: 768 },
    userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
    resourceBlocking: {
        enabled: true,
        strategy: 'moderate'
    },
    navigation: {
        timeout: 10000,
        retryAttempts: 3,
        additionalWaitTime: 0,
        followRedirects: true,
        maxRedirects: 20,
        redirectTimeout: 5000,
        trackRedirectChain: true
    },
    concurrency: {
        maxConcurrent: 2,
        acquireTimeout: 30000
    },
    debug: {
        enableTracing: false,
        captureConsole: false,
        saveFailureScreenshots: false,
        performanceMetrics: false
    }
};