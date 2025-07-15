import { getConfig } from '../config.js';
import puppeteerExtra from 'puppeteer-extra';
import { Browser, HTTPRequest, BrowserContext } from 'puppeteer';
import puppeteerStealth from 'puppeteer-extra-plugin-stealth';
// import puppeteerAdblocker from 'puppeteer-extra-plugin-adblocker'; // Disabled for CMS detection
import { createModuleLogger } from '../logger.js';
import { Semaphore, createSemaphore } from './semaphore.js';
import {
    BrowserManagerConfig,
    ManagedPage,
    BrowserManagerError,
    BrowserNetworkError,
    BrowserResourceError,
    BrowserTimeoutError,
    BrowserRedirectError,
    NavigationResult,
    RedirectInfo,
    NAVIGATION_STRATEGIES,
    RESOURCE_BLOCKING_STRATEGIES,
    DEFAULT_ESSENTIAL_SCRIPT_PATTERNS,
    DEFAULT_BROWSER_CONFIG,
    UserAgentConfig
} from './types.js';
import { UserAgentManager, DEFAULT_USER_AGENT_POOL } from './user-agents.js';

const logger = createModuleLogger('browser-manager');

// Configure puppeteer plugins lazily
let puppeteerConfigured = false;

function ensurePuppeteerConfigured() {
    if (!puppeteerConfigured) {
        const config = getConfig();
        puppeteerExtra.use(puppeteerStealth());
        
        // Disable adblocker for CMS detection to prevent ERR_BLOCKED_BY_CLIENT
        // CMS detection needs access to all resources including potential ads/trackers
        if (config.puppeteer.blockAds) {
            logger.debug('Adblocker disabled for CMS detection to prevent blocking legitimate requests');
        }
        
        puppeteerConfigured = true;
        logger.debug('Puppeteer plugins configured for CMS detection');
    }
}

/**
 * Unified browser manager with purpose-based configuration
 */
export class BrowserManager {
    private browser: Browser | null = null;
    private pages: Set<ManagedPage> = new Set();
    private contexts: Set<BrowserContext> = new Set();
    private semaphoreAcquired = false;
    private readonly config: BrowserManagerConfig;
    private userAgentManager: UserAgentManager | null = null;
    private static semaphore: Semaphore | null = null;

    constructor(config: Partial<BrowserManagerConfig>) {
        this.config = this.mergeWithDefaults(config);
        
        // Initialize user agent manager if rotation is enabled
        this.initializeUserAgentManager();
        
        logger.debug('BrowserManager created', { 
            purpose: this.config.purpose,
            strategy: this.config.resourceBlocking.strategy,
            userAgentRotation: this.userAgentManager !== null
        });
    }

    /**
     * Initialize user agent manager based on configuration
     */
    private initializeUserAgentManager(): void {
        if (typeof this.config.userAgent === 'object' && 'rotation' in this.config.userAgent) {
            const uaConfig = this.config.userAgent as UserAgentConfig;
            
            if (uaConfig.rotation) {
                const pool = uaConfig.pool || DEFAULT_USER_AGENT_POOL;
                const strategy = uaConfig.strategy || 'random';
                const updateFrequency = uaConfig.updateFrequency || 1;
                
                this.userAgentManager = new UserAgentManager(pool, strategy, updateFrequency);
                
                logger.debug('User agent rotation enabled', {
                    poolSize: pool.length,
                    strategy,
                    updateFrequency
                });
            }
        }
    }

    /**
     * Create isolated incognito context for URL
     * This provides a fresh browser state for each URL while keeping the main browser instance running
     */
    async createIsolatedContext(): Promise<BrowserContext> {
        try {
            ensurePuppeteerConfigured();
            
            // Launch browser if not already launched
            if (!this.browser) {
                await this.launchBrowser();
            }

            logger.debug('Creating isolated browser context', { 
                purpose: this.config.purpose
            });

            // Create incognito context for state isolation
            const context = await this.browser!.createBrowserContext();
            this.contexts.add(context);

            logger.debug('Isolated browser context created', { 
                purpose: this.config.purpose,
                totalContexts: this.contexts.size
            });

            return context;

        } catch (error) {
            logger.error('Failed to create isolated browser context', { 
                purpose: this.config.purpose,
                error: (error as Error).message 
            });
            
            throw new BrowserManagerError(
                `Failed to create isolated context: ${(error as Error).message}`,
                'context_creation_failed',
                { purpose: this.config.purpose },
                error as Error
            );
        }
    }

    /**
     * Create page in isolated context
     * Use this for batch processing to ensure fresh browser state for each URL
     */
    async createPageInIsolatedContext(url: string): Promise<{ page: ManagedPage; context: BrowserContext }> {
        try {
            // Acquire semaphore for concurrency control
            await BrowserManager.getSemaphore().acquire();
            this.semaphoreAcquired = true;
            
            logger.debug('Creating page in isolated context', { 
                url, 
                purpose: this.config.purpose 
            });
            
            // Create isolated context
            const context = await this.createIsolatedContext();
            
            // Create page in the isolated context
            const page = await this.setupPageInContext(context);
            
            // Navigate to target URL
            await this.navigateToUrl(page, url);

            // Track page
            this.pages.add(page);
            
            logger.debug('Page created in isolated context successfully', { 
                url, 
                purpose: this.config.purpose,
                totalPages: this.pages.size,
                totalContexts: this.contexts.size
            });
            
            return { page, context };

        } catch (error) {
            logger.error('Failed to create page in isolated context', { 
                url, 
                purpose: this.config.purpose,
                error: (error as Error).message 
            });
            await this.cleanup();
            
            if (error instanceof BrowserManagerError) {
                throw error;
            }
            
            throw new BrowserManagerError(
                `Failed to create page in isolated context: ${(error as Error).message}`,
                'isolated_page_creation_failed',
                { url, purpose: this.config.purpose },
                error as Error
            );
        }
    }

    /**
     * Create optimized page for specified purpose
     */
    async createPage(url: string): Promise<ManagedPage> {
        try {
            ensurePuppeteerConfigured();
            
            // Acquire semaphore for concurrency control
            await BrowserManager.getSemaphore().acquire();
            this.semaphoreAcquired = true;
            
            logger.debug('Creating browser page', { 
                url, 
                purpose: this.config.purpose 
            });
            
            // Launch browser if not already launched
            if (!this.browser) {
                await this.launchBrowser();
            }

            // Create page with purpose-specific setup
            const page = await this.setupPage();
            
            // Navigate to target URL
            await this.navigateToUrl(page, url);

            // Track page
            this.pages.add(page);
            
            logger.debug('Browser page created successfully', { 
                url, 
                purpose: this.config.purpose,
                totalPages: this.pages.size 
            });
            
            return page;

        } catch (error) {
            logger.error('Failed to create browser page', { 
                url, 
                purpose: this.config.purpose,
                error: (error as Error).message 
            });
            await this.cleanup();
            
            if (error instanceof BrowserManagerError) {
                throw error;
            }
            
            throw new BrowserManagerError(
                `Failed to create page: ${(error as Error).message}`,
                'page_creation_failed',
                { url, purpose: this.config.purpose },
                error as Error
            );
        }
    }

    /**
     * Navigate to URL with purpose-specific strategy and redirect tracking
     */
    async navigateToUrl(page: ManagedPage, url: string): Promise<NavigationResult> {
        const navigationStrategy = NAVIGATION_STRATEGIES[this.config.purpose];
        const { timeout, additionalWaitTime, trackRedirectChain, maxRedirects } = this.config.navigation;
        
        const navigationStart = Date.now();
        const redirectChain: RedirectInfo[] = [];
        let finalUrl = url;
        
        try {
            logger.debug('Navigating to URL with redirect tracking', { 
                url, 
                purpose: this.config.purpose,
                strategy: navigationStrategy.waitUntil,
                trackRedirects: trackRedirectChain
            });
            
            // Setup redirect tracking if enabled
            if (trackRedirectChain) {
                page.on('response', (response) => {
                    const status = response.status();
                    const responseUrl = response.url();
                    
                    // Track redirects (3xx status codes)
                    if (status >= 300 && status < 400) {
                        const location = response.headers()['location'];
                        if (location) {
                            const redirectTo = new URL(location, responseUrl).href;
                            redirectChain.push({
                                from: responseUrl,
                                to: redirectTo,
                                status,
                                timestamp: Date.now()
                            });
                            
                            logger.debug('Redirect detected', {
                                from: responseUrl,
                                to: redirectTo,
                                status,
                                redirectCount: redirectChain.length
                            });
                            
                            // Check for redirect loops
                            if (this.detectRedirectLoop(redirectChain)) {
                                logger.warn('Redirect loop detected, stopping redirect tracking', {
                                    url,
                                    redirectChain: redirectChain.map(r => `${r.from} -> ${r.to} (${r.status})`)
                                });
                                // Don't throw error, just stop tracking further redirects
                                return;
                            }
                            
                            // Check max redirects
                            if (maxRedirects && redirectChain.length >= maxRedirects) {
                                logger.warn('Maximum redirects reached, stopping redirect tracking', {
                                    url,
                                    redirectCount: redirectChain.length,
                                    maxRedirects
                                });
                                // Don't throw error, just stop tracking further redirects
                                return;
                            }
                        }
                    }
                });
            }
            
            const response = await page.goto(url, {
                waitUntil: navigationStrategy.waitUntil,
                timeout
            });

            if (!response) {
                throw new BrowserNetworkError(
                    'No response received during navigation',
                    { url, networkError: 'no_response' }
                );
            }

            // Get final URL after all redirects
            finalUrl = page.url();
            
            if (!response.ok() && this.config.purpose === 'capture') {
                logger.warn('Non-200 response during navigation', {
                    url,
                    finalUrl,
                    status: response.status(),
                    statusText: response.statusText(),
                    purpose: this.config.purpose
                });
            }

            // Additional wait time if configured
            if (additionalWaitTime && additionalWaitTime > 0) {
                logger.debug('Additional wait time', { additionalWaitTime });
                await page.waitForTimeout(additionalWaitTime);
            }

            const navigationTime = Date.now() - navigationStart;
            const protocolUpgraded = this.detectProtocolUpgrade(url, finalUrl);
            
            // Extract response headers for detection strategies
            const headers: Record<string, string> = {};
            try {
                const responseHeaders = response.headers();
                // Copy headers to avoid any reference issues
                Object.assign(headers, responseHeaders);
                logger.debug('Successfully extracted response headers', { 
                    url, 
                    headerCount: Object.keys(headers).length,
                    headerNames: Object.keys(headers) 
                });
            } catch (error) {
                logger.warn('Failed to extract response headers', { url, error: (error as Error).message });
            }
            
            const navigationResult: NavigationResult = {
                originalUrl: url,
                finalUrl,
                redirectChain,
                totalRedirects: redirectChain.length,
                navigationTime,
                protocolUpgraded,
                success: true,
                headers
            };

            // Update page context
            if (page._browserManagerContext) {
                page._browserManagerContext.navigationCount++;
                page._browserManagerContext.lastNavigation = navigationResult;
            }

            logger.debug('Navigation completed', { 
                originalUrl: url,
                finalUrl,
                navigationTime,
                redirectCount: redirectChain.length,
                protocolUpgraded,
                status: response.status(),
                purpose: this.config.purpose 
            });
            
            return navigationResult;

        } catch (error) {
            const err = error as Error;
            const errorMessage = err.message;
            const navigationTime = Date.now() - navigationStart;
            
            logger.error('Navigation failed', { 
                originalUrl: url,
                finalUrl,
                timeout, 
                purpose: this.config.purpose,
                redirectCount: redirectChain.length,
                navigationTime,
                error: errorMessage 
            });
            
            // Create failed navigation result
            const failedResult: NavigationResult = {
                originalUrl: url,
                finalUrl,
                redirectChain,
                totalRedirects: redirectChain.length,
                navigationTime,
                protocolUpgraded: this.detectProtocolUpgrade(url, finalUrl),
                success: false
            };
            
            // Update page context with failed navigation
            if (page._browserManagerContext) {
                page._browserManagerContext.lastNavigation = failedResult;
            }
            
            // Re-throw redirect errors as-is
            if (err instanceof BrowserRedirectError) {
                throw err;
            }
            
            // Categorize navigation errors
            if (errorMessage.includes('timeout')) {
                throw new BrowserTimeoutError(
                    `Navigation timeout after ${timeout}ms`,
                    timeout,
                    'navigation',
                    { url, purpose: this.config.purpose, redirectCount: redirectChain.length },
                    err
                );
            } else if (errorMessage.includes('ERR_NAME_NOT_RESOLVED')) {
                throw new BrowserNetworkError(
                    `Domain not found: ${url}`,
                    { url, networkError: 'dns_resolution_failed' },
                    err
                );
            } else if (errorMessage.includes('ERR_CONNECTION_REFUSED')) {
                throw new BrowserNetworkError(
                    `Connection refused: ${url}`,
                    { url, networkError: 'connection_refused' },
                    err
                );
            } else {
                throw new BrowserNetworkError(
                    `Navigation failed: ${errorMessage}`,
                    { url, networkError: 'unknown', purpose: this.config.purpose },
                    err
                );
            }
        }
    }

    /**
     * Capture screenshot with dimension detection
     */
    async captureScreenshot(page: ManagedPage, path: string, fullPage: boolean = true): Promise<[number, number]> {
        try {
            logger.debug('Capturing screenshot', { 
                path, 
                fullPage, 
                purpose: this.config.purpose 
            });
            
            const screenshotStart = Date.now();
            
            // Get page dimensions before screenshot
            const dimensions = await page.evaluate(() => [
                document.body.scrollWidth, 
                document.body.scrollHeight
            ]) as [number, number];
            
            logger.debug('Page dimensions detected', { 
                scrollWidth: dimensions[0], 
                scrollHeight: dimensions[1],
                purpose: this.config.purpose 
            });
            
            // Capture screenshot
            await page.screenshot({ 
                path, 
                fullPage 
            });
            
            const screenshotTime = Date.now() - screenshotStart;
            logger.debug('Screenshot captured', { 
                path, 
                screenshotTime,
                dimensions,
                purpose: this.config.purpose 
            });
            
            return dimensions;
            
        } catch (error) {
            const err = error as Error;
            logger.error('Screenshot capture failed', { 
                path, 
                fullPage, 
                purpose: this.config.purpose,
                error: err.message 
            });
            
            throw new BrowserResourceError(
                `Screenshot capture failed: ${err.message}`,
                { path, fullPage, purpose: this.config.purpose },
                err
            );
        }
    }

    /**
     * Close a specific page
     */
    async closePage(page: ManagedPage): Promise<void> {
        try {
            if (this.pages.has(page)) {
                await page.close();
                this.pages.delete(page);
                logger.debug('Browser page closed', { 
                    purpose: this.config.purpose,
                    remainingPages: this.pages.size 
                });
            }
        } catch (error) {
            logger.warn('Error closing page', { 
                purpose: this.config.purpose,
                error: (error as Error).message 
            });
        }
    }

    /**
     * Close isolated context and all its pages
     * Use this after processing a URL in batch mode to free resources
     */
    async closeContext(context: BrowserContext): Promise<void> {
        try {
            if (this.contexts.has(context)) {
                // Close context (this also closes all pages in the context)
                await context.close();
                this.contexts.delete(context);
                
                logger.debug('Browser context closed', { 
                    purpose: this.config.purpose,
                    remainingContexts: this.contexts.size 
                });

                // Release semaphore since this URL is complete
                if (this.semaphoreAcquired) {
                    BrowserManager.getSemaphore().release();
                    this.semaphoreAcquired = false;
                    logger.debug('Semaphore released after context closure');
                }
            }
        } catch (error) {
            logger.warn('Error closing browser context', { 
                purpose: this.config.purpose,
                error: (error as Error).message 
            });
        }
    }

    /**
     * Clean up browser resources
     */
    async cleanup(): Promise<void> {
        try {
            // Close all contexts (this will also close their pages)
            for (const context of this.contexts) {
                try {
                    await context.close();
                } catch (error) {
                    logger.warn('Error closing context during cleanup', { 
                        error: (error as Error).message 
                    });
                }
            }
            this.contexts.clear();

            // Close all remaining pages
            for (const page of this.pages) {
                try {
                    await page.close();
                } catch (error) {
                    logger.warn('Error closing page during cleanup', { 
                        error: (error as Error).message 
                    });
                }
            }
            this.pages.clear();

            // Close browser
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                logger.debug('Browser closed during cleanup');
            }
        } catch (error) {
            logger.warn('Error during browser cleanup', { 
                purpose: this.config.purpose,
                error: (error as Error).message 
            });
        } finally {
            // Always release semaphore
            if (this.semaphoreAcquired) {
                BrowserManager.getSemaphore().release();
                this.semaphoreAcquired = false;
                logger.debug('Semaphore released during cleanup');
            }
        }
    }

    /**
     * Launch browser with optimized settings
     */
    private async launchBrowser(): Promise<void> {
        try {
            logger.debug('Launching browser', { purpose: this.config.purpose });
            
            this.browser = await puppeteerExtra.launch({
                headless: this.config.headless,
                args: [
                    '--no-sandbox',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    // Fix for ERR_BLOCKED_BY_CLIENT with HTTP URLs
                    // Chrome's HttpsFirstBalancedModeAutoEnable blocks HTTP navigation
                    '--disable-features=HttpsFirstBalancedModeAutoEnable'
                ],
                defaultViewport: this.config.viewport
            });

            logger.debug('Browser launched successfully', { purpose: this.config.purpose });
            
        } catch (error) {
            const err = error as Error;
            logger.error('Failed to launch browser', { 
                purpose: this.config.purpose,
                error: err.message 
            });
            
            throw new BrowserResourceError(
                `Failed to launch browser: ${err.message}`,
                { purpose: this.config.purpose },
                err
            );
        }
    }

    /**
     * Setup page in specific browser context
     */
    private async setupPageInContext(context: BrowserContext): Promise<ManagedPage> {
        try {
            const page = await context.newPage() as ManagedPage;
            
            // Add browser manager context
            page._browserManagerContext = {
                purpose: this.config.purpose,
                createdAt: Date.now(),
                navigationCount: 0
            };
            
            // Set user agent (with rotation support)
            const userAgent = this.getUserAgent();
            await page.setUserAgent(userAgent);
            
            logger.debug('User agent set for page in context', {
                userAgent: userAgent.substring(0, 50) + '...',
                rotationEnabled: this.userAgentManager !== null,
                purpose: this.config.purpose
            });
            
            // Set timeouts
            page.setDefaultTimeout(this.config.navigation.timeout);
            page.setDefaultNavigationTimeout(this.config.navigation.timeout);
            
            // Setup resource blocking if enabled
            if (this.config.resourceBlocking.enabled) {
                await this.setupRequestInterception(page);
            }
            
            // Setup console capture for debugging
            if (this.config.debug?.captureConsole) {
                page.on('console', (msg) => {
                    logger.debug('Browser console', { 
                        type: msg.type(),
                        text: msg.text(),
                        purpose: this.config.purpose 
                    });
                });
            }
            
            logger.debug('Page setup in context completed', { purpose: this.config.purpose });
            return page;
            
        } catch (error) {
            const err = error as Error;
            logger.error('Failed to setup page in context', { 
                purpose: this.config.purpose,
                error: err.message 
            });
            
            throw new BrowserResourceError(
                `Failed to setup page in context: ${err.message}`,
                { purpose: this.config.purpose },
                err
            );
        }
    }

    /**
     * Setup page with purpose-specific configuration
     */
    private async setupPage(): Promise<ManagedPage> {
        if (!this.browser) {
            throw new BrowserManagerError('Browser not launched', 'browser_not_launched');
        }

        try {
            const page = await this.browser.newPage() as ManagedPage;
            
            // Add browser manager context
            page._browserManagerContext = {
                purpose: this.config.purpose,
                createdAt: Date.now(),
                navigationCount: 0
            };
            
            // Set user agent (with rotation support)
            const userAgent = this.getUserAgent();
            await page.setUserAgent(userAgent);
            
            logger.debug('User agent set for page', {
                userAgent: userAgent.substring(0, 50) + '...',
                rotationEnabled: this.userAgentManager !== null,
                purpose: this.config.purpose
            });
            
            // Set timeouts
            page.setDefaultTimeout(this.config.navigation.timeout);
            page.setDefaultNavigationTimeout(this.config.navigation.timeout);
            
            // Setup resource blocking if enabled
            if (this.config.resourceBlocking.enabled) {
                await this.setupRequestInterception(page);
            }
            
            // Setup console capture for debugging
            if (this.config.debug?.captureConsole) {
                page.on('console', (msg) => {
                    logger.debug('Browser console', { 
                        type: msg.type(),
                        text: msg.text(),
                        purpose: this.config.purpose 
                    });
                });
            }
            
            logger.debug('Page setup completed', { purpose: this.config.purpose });
            return page;
            
        } catch (error) {
            const err = error as Error;
            logger.error('Failed to setup page', { 
                purpose: this.config.purpose,
                error: err.message 
            });
            
            throw new BrowserResourceError(
                `Failed to setup page: ${err.message}`,
                { purpose: this.config.purpose },
                err
            );
        }
    }

    /**
     * Setup request interception for resource blocking
     */
    private async setupRequestInterception(page: ManagedPage): Promise<void> {
        try {
            await page.setRequestInterception(true);
            
            const blockedTypes = this.getResourceBlockingRules();
            const allowPatterns = this.config.resourceBlocking.allowPatterns || DEFAULT_ESSENTIAL_SCRIPT_PATTERNS;
            
            page.on('request', (request: HTTPRequest) => {
                try {
                    const resourceType = request.resourceType();
                    const url = request.url();

                    // Always allow document requests (main page content)
                    if (resourceType === 'document') {
                        request.continue();
                        return;
                    }

                    // Block resources based on strategy
                    if (this.isResourceBlocked(resourceType, blockedTypes)) {
                        logger.debug('Blocking resource', { 
                            resourceType, 
                            url: url.substring(0, 100),
                            purpose: this.config.purpose 
                        });
                        request.abort();
                        return;
                    }

                    // Handle scripts specially for CMS detection
                    if (resourceType === 'script' && this.config.resourceBlocking.allowEssentialScripts) {
                        if (this.isEssentialScript(url, allowPatterns)) {
                            logger.debug('Allowing essential script', { 
                                url: url.substring(0, 100),
                                purpose: this.config.purpose 
                            });
                            request.continue();
                        } else {
                            logger.debug('Blocking non-essential script', { 
                                url: url.substring(0, 100),
                                purpose: this.config.purpose 
                            });
                            request.abort();
                        }
                        return;
                    }

                    request.continue();
                    
                } catch (error) {
                    // Silently handle request interception errors
                    logger.debug('Request interception error', { 
                        error: (error as Error).message,
                        purpose: this.config.purpose 
                    });
                    try {
                        request.continue();
                    } catch {
                        // Ignore if request is already handled
                    }
                }
            });
            
            logger.debug('Request interception configured', { 
                purpose: this.config.purpose,
                strategy: this.config.resourceBlocking.strategy,
                blockedTypes: blockedTypes.length,
                allowEssentialScripts: this.config.resourceBlocking.allowEssentialScripts 
            });
            
        } catch (error) {
            logger.warn('Failed to setup request interception', { 
                purpose: this.config.purpose,
                error: (error as Error).message 
            });
        }
    }

    /**
     * Get resource blocking rules based on strategy
     */
    private getResourceBlockingRules(): string[] {
        const { strategy, customTypes } = this.config.resourceBlocking;
        const defaultTypes = RESOURCE_BLOCKING_STRATEGIES[strategy] || [];
        
        return customTypes ? [...defaultTypes, ...customTypes] : defaultTypes;
    }

    /**
     * Determine if a resource type should be blocked
     */
    private isResourceBlocked(resourceType: string, blockedTypes: string[]): boolean {
        if (!resourceType) return false;
        return blockedTypes.includes(resourceType);
    }

    /**
     * Determine if a script is essential (for CMS detection)
     */
    private isEssentialScript(url: string, allowPatterns: string[]): boolean {
        const lowerUrl = url.toLowerCase();
        return allowPatterns.some(pattern => lowerUrl.includes(pattern.toLowerCase()));
    }

    /**
     * Merge user config with defaults
     */
    private mergeWithDefaults(userConfig: Partial<BrowserManagerConfig>): BrowserManagerConfig {
        const appConfig = getConfig();
        
        return {
            headless: userConfig.headless ?? DEFAULT_BROWSER_CONFIG.headless!,
            viewport: userConfig.viewport ?? {
                width: appConfig.puppeteer.viewport.width,
                height: appConfig.puppeteer.viewport.height
            },
            userAgent: userConfig.userAgent ?? appConfig.puppeteer.userAgent,
            purpose: userConfig.purpose!,
            resourceBlocking: {
                ...DEFAULT_BROWSER_CONFIG.resourceBlocking!,
                ...userConfig.resourceBlocking
            },
            navigation: {
                ...DEFAULT_BROWSER_CONFIG.navigation!,
                timeout: userConfig.navigation?.timeout ?? appConfig.puppeteer.timeout,
                ...userConfig.navigation
            },
            concurrency: {
                ...DEFAULT_BROWSER_CONFIG.concurrency!,
                ...userConfig.concurrency
            },
            debug: {
                ...DEFAULT_BROWSER_CONFIG.debug!,
                ...userConfig.debug
            }
        };
    }

    /**
     * Get the shared semaphore instance
     */
    private static getSemaphore(): Semaphore {
        if (!BrowserManager.semaphore) {
            BrowserManager.semaphore = createSemaphore();
        }
        return BrowserManager.semaphore;
    }

    /**
     * Reset the semaphore (primarily for testing)
     */
    public static resetSemaphore(): void {
        BrowserManager.semaphore = null;
    }

    /**
     * Get navigation information from a managed page
     */
    getNavigationInfo(page: ManagedPage): NavigationResult | null {
        return page._browserManagerContext?.lastNavigation || null;
    }

    /**
     * Detect redirect loops in redirect chain
     */
    private detectRedirectLoop(redirectChain: RedirectInfo[]): boolean {
        if (redirectChain.length < 3) return false; // Need at least 3 redirects to detect a loop
        
        // Normalize URLs for comparison (remove trailing slashes, etc.)
        const normalizedUrls = redirectChain.map(r => this.normalizeUrlForComparison(r.to));
        
        // Check if the last URL appears earlier in the chain
        const lastUrl = normalizedUrls[normalizedUrls.length - 1];
        const previousUrls = normalizedUrls.slice(0, -1);
        
        return previousUrls.includes(lastUrl);
    }

    /**
     * Normalize URL for redirect loop comparison
     */
    private normalizeUrlForComparison(url: string): string {
        try {
            const parsed = new URL(url);
            // Remove trailing slash and fragments for comparison
            const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/$/, '')}${parsed.search}`;
            return normalized.toLowerCase();
        } catch {
            return url.toLowerCase();
        }
    }

    /**
     * Get user agent for page setup (handles rotation)
     */
    private getUserAgent(): string {
        if (this.userAgentManager) {
            // Use user agent rotation
            return this.userAgentManager.getNext();
        } else {
            // Use static user agent from config
            if (typeof this.config.userAgent === 'string') {
                return this.config.userAgent;
            } else {
                // This shouldn't happen since initializeUserAgentManager handles rotation config
                logger.warn('UserAgent config is object but no manager initialized, using default');
                return 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)';
            }
        }
    }

    /**
     * Get user agent manager statistics (for monitoring)
     */
    getUserAgentStats(): { enabled: boolean; stats?: any } {
        if (this.userAgentManager) {
            return {
                enabled: true,
                stats: this.userAgentManager.getStats()
            };
        } else {
            return { enabled: false };
        }
    }

    /**
     * Reset user agent rotation state (useful for testing)
     */
    resetUserAgentRotation(): void {
        if (this.userAgentManager) {
            this.userAgentManager.reset();
            logger.debug('User agent rotation state reset');
        }
    }

    /**
     * Detect HTTP to HTTPS protocol upgrade
     */
    private detectProtocolUpgrade(originalUrl: string, finalUrl: string): boolean {
        try {
            const original = new URL(originalUrl);
            const final = new URL(finalUrl);
            
            return original.protocol === 'http:' && final.protocol === 'https:';
        } catch {
            return false;
        }
    }
}