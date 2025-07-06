import { getConfig } from '../config.js';
import puppeteerExtra from 'puppeteer-extra';
import { Browser, HTTPRequest } from 'puppeteer';
import puppeteerStealth from 'puppeteer-extra-plugin-stealth';
import puppeteerAdblocker from 'puppeteer-extra-plugin-adblocker';
import { createModuleLogger } from '../logger.js';
import { Semaphore, createSemaphore } from './semaphore.js';
import {
    BrowserManagerConfig,
    ManagedPage,
    BrowserManagerError,
    BrowserNetworkError,
    BrowserResourceError,
    BrowserTimeoutError,
    NAVIGATION_STRATEGIES,
    RESOURCE_BLOCKING_STRATEGIES,
    DEFAULT_ESSENTIAL_SCRIPT_PATTERNS,
    DEFAULT_BROWSER_CONFIG
} from './types.js';

const logger = createModuleLogger('browser-manager');

// Configure puppeteer plugins lazily
let puppeteerConfigured = false;

function ensurePuppeteerConfigured() {
    if (!puppeteerConfigured) {
        const config = getConfig();
        puppeteerExtra.use(puppeteerStealth());
        
        if (config.puppeteer.blockAds) {
            puppeteerExtra.use(puppeteerAdblocker({ blockTrackers: true }));
            logger.debug('Puppeteer adblocker plugin enabled');
        }
        
        puppeteerConfigured = true;
        logger.debug('Puppeteer plugins configured');
    }
}

/**
 * Unified browser manager with purpose-based configuration
 */
export class BrowserManager {
    private browser: Browser | null = null;
    private pages: Set<ManagedPage> = new Set();
    private semaphoreAcquired = false;
    private readonly config: BrowserManagerConfig;
    private static semaphore: Semaphore | null = null;

    constructor(config: Partial<BrowserManagerConfig>) {
        this.config = this.mergeWithDefaults(config);
        logger.debug('BrowserManager created', { 
            purpose: this.config.purpose,
            strategy: this.config.resourceBlocking.strategy 
        });
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
     * Navigate to URL with purpose-specific strategy
     */
    async navigateToUrl(page: ManagedPage, url: string): Promise<void> {
        const navigationStrategy = NAVIGATION_STRATEGIES[this.config.purpose];
        const { timeout, additionalWaitTime } = this.config.navigation;
        
        try {
            logger.debug('Navigating to URL', { 
                url, 
                purpose: this.config.purpose,
                strategy: navigationStrategy.waitUntil 
            });
            
            const navigationStart = Date.now();
            
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

            if (!response.ok() && this.config.purpose === 'capture') {
                logger.warn('Non-200 response during navigation', {
                    url,
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

            // Update page context
            if (page._browserManagerContext) {
                page._browserManagerContext.navigationCount++;
            }

            const navigationTime = Date.now() - navigationStart;
            logger.debug('Navigation completed', { 
                url, 
                navigationTime,
                status: response.status(),
                purpose: this.config.purpose 
            });

        } catch (error) {
            const err = error as Error;
            const errorMessage = err.message;
            
            logger.error('Navigation failed', { 
                url, 
                timeout, 
                purpose: this.config.purpose,
                error: errorMessage 
            });
            
            // Categorize navigation errors
            if (errorMessage.includes('timeout')) {
                throw new BrowserTimeoutError(
                    `Navigation timeout after ${timeout}ms`,
                    timeout,
                    'navigation',
                    { url, purpose: this.config.purpose },
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
     * Clean up browser resources
     */
    async cleanup(): Promise<void> {
        try {
            // Close all pages
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
                    '--disable-renderer-backgrounding'
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
            
            // Set user agent
            await page.setUserAgent(this.config.userAgent);
            
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

                    // Block resources based on strategy
                    if (this.isResourceBlocked(resourceType, blockedTypes)) {
                        request.abort();
                        return;
                    }

                    // Handle scripts specially for CMS detection
                    if (resourceType === 'script' && this.config.resourceBlocking.allowEssentialScripts) {
                        if (this.isEssentialScript(url, allowPatterns)) {
                            request.continue();
                        } else {
                            request.abort();
                        }
                        return;
                    }

                    request.continue();
                    
                } catch {
                    // Silently handle request interception errors
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
}