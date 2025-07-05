import puppeteerExtra from 'puppeteer-extra';
import { Browser, Page, HTTPRequest } from 'puppeteer';
import puppeteerStealth from 'puppeteer-extra-plugin-stealth';
import puppeteerAdblocker from 'puppeteer-extra-plugin-adblocker';
import { BrowserManager, DetectionPage, CMSDetectionConfig, CMSNetworkError, BrowserConfig } from './types.js';
import { createModuleLogger } from '../logger.js';
import { getConfig } from '../config.js';
import { getSemaphore } from '../utils.js';

const logger = createModuleLogger('cms-browser-manager');

// Configure puppeteer plugins
let puppeteerConfigured = false;

function ensurePuppeteerConfigured() {
    if (!puppeteerConfigured) {
        const config = getConfig();
        puppeteerExtra.use(puppeteerStealth());
        
        if (config.puppeteer.blockAds) {
            puppeteerExtra.use(puppeteerAdblocker({ blockTrackers: true }));
        }
        puppeteerConfigured = true;
    }
}

/**
 * Manages browser lifecycle and resource optimization for CMS detection
 */
export class CMSBrowserManager implements BrowserManager {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private semaphoreAcquired = false;
    private readonly config: CMSDetectionConfig;
    private readonly browserConfig: BrowserConfig;

    constructor(browserConfig?: BrowserConfig) {
        this.config = this.getDetectionConfig();
        this.browserConfig = {
            timeout: 5000,
            userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
            viewport: { width: 1024, height: 768 },
            blockResources: true,
            blockedResourceTypes: ['image', 'stylesheet', 'font'],
            ...browserConfig
        };
    }

    /**
     * Create optimized page for CMS detection
     */
    async createPage(url: string): Promise<DetectionPage> {
        try {
            ensurePuppeteerConfigured();
            
            // Acquire semaphore for concurrency control
            await getSemaphore().acquire();
            this.semaphoreAcquired = true;
            
            logger.debug('Creating browser for CMS detection', { url });
            
            // Launch browser with optimized settings
            this.browser = await puppeteerExtra.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ],
                defaultViewport: this.config.browser.viewport
            });

            // Create page with resource optimization
            this.page = await this.browser.newPage();
            
            // Set user agent if configured
            if (this.config.browser.userAgent) {
                await this.page.setUserAgent(this.config.browser.userAgent);
            }

            // Set timeouts
            this.page.setDefaultTimeout(this.config.timeout.navigation);
            this.page.setDefaultNavigationTimeout(this.config.timeout.navigation);

            // Setup resource blocking for performance
            if (this.browserConfig.blockResources) {
                await this.setupResourceBlocking();
            }

            // Navigate to target URL
            logger.debug('Navigating to URL for CMS detection', { url });
            const response = await this.page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: this.config.timeout.navigation
            });

            if (!response) {
                throw new CMSNetworkError(url, 'navigation', new Error('No response received'));
            }

            if (!response.ok()) {
                logger.warn('Non-200 response during CMS detection', {
                    url,
                    status: response.status(),
                    statusText: response.statusText()
                });
            }

            logger.debug('Browser page created successfully', { url, status: response.status() });
            return this.page as DetectionPage;

        } catch (error) {
            logger.error('Failed to create browser page', { url, error: (error as Error).message });
            await this.cleanup();
            throw new CMSNetworkError(url, 'browser-setup', error as Error);
        }
    }

    /**
     * Setup resource blocking to optimize detection performance
     */
    private async setupResourceBlocking(): Promise<void> {
        if (!this.page) return;

        await this.page.setRequestInterception(true);
        
        this.page.on('request', (request: HTTPRequest) => {
            try {
                const resourceType = request.resourceType();
                const url = request.url();

                // Block unnecessary resources but allow essential ones
                if (this.isResourceBlocked(resourceType)) {
                    request.abort();
                } else if (resourceType === 'script') {
                    // Allow scripts that might contain CMS information
                    if (this.isEssentialScript(url)) {
                        request.continue();
                    } else {
                        request.abort();
                    }
                } else {
                    request.continue();
                }
            } catch (error) {
                // Silently handle request interception errors
                try {
                    request.continue();
                } catch {
                    // Ignore if request is already handled
                }
            }
        });
    }

    /**
     * Determine if a resource type should be blocked
     */
    isResourceBlocked(resourceType: string): boolean {
        if (!resourceType) return false;
        const blockedTypes = this.browserConfig.blockedResourceTypes || ['image', 'font', 'media', 'stylesheet'];
        return blockedTypes.includes(resourceType);
    }

    /**
     * Determine if a script is essential for CMS detection
     */
    private isEssentialScript(url: string): boolean {
        const essentialPatterns = [
            '/wp-includes/',
            '/wp-content/',
            'joomla',
            'drupal',
            'wp-json',
            'generator'
        ];
        
        return essentialPatterns.some(pattern => url.toLowerCase().includes(pattern));
    }

    /**
     * Close a specific page
     */
    async closePage(page: DetectionPage): Promise<void> {
        try {
            await page.close();
            logger.debug('Browser page closed');
        } catch (error) {
            logger.warn('Error closing page', { error: (error as Error).message });
        } finally {
            if (this.semaphoreAcquired) {
                getSemaphore().release();
                this.semaphoreAcquired = false;
                logger.debug('Semaphore released');
            }
        }
    }

    /**
     * Close browser and all pages
     */
    async close(): Promise<void> {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                logger.debug('Browser closed');
            }
        } catch (error) {
            logger.warn('Error closing browser', { error: (error as Error).message });
        }
    }

    /**
     * Clean up browser resources
     */
    async cleanup(): Promise<void> {
        try {
            if (this.page) {
                await this.page.close();
                this.page = null;
                logger.debug('Browser page closed');
            }

            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                logger.debug('Browser closed');
            }
        } catch (error) {
            logger.warn('Error during browser cleanup', { error: (error as Error).message });
        } finally {
            if (this.semaphoreAcquired) {
                getSemaphore().release();
                this.semaphoreAcquired = false;
                logger.debug('Semaphore released');
            }
        }
    }

    /**
     * Get CMS detection configuration
     */
    private getDetectionConfig(): CMSDetectionConfig {
        const appConfig = getConfig();
        
        return {
            timeout: {
                navigation: appConfig.puppeteer.timeout,
                strategy: 5000,
                overall: 30000
            },
            retry: {
                maxAttempts: 3,
                initialDelay: 1000,
                retryableErrors: ['DETECTION_TIMEOUT', 'NETWORK_ERROR', 'ECONNRESET', 'ENOTFOUND']
            },
            confidence: {
                threshold: 0.6,
                metaTagWeight: 1.0,
                htmlContentWeight: 0.7,
                apiEndpointWeight: 0.9
            },
            browser: {
                blockResources: true,
                userAgent: appConfig.puppeteer.userAgent,
                viewport: {
                    width: appConfig.puppeteer.viewport.width,
                    height: appConfig.puppeteer.viewport.height
                }
            }
        };
    }
}