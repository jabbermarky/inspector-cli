import { getConfig } from '../config.js';
import puppeteer from 'puppeteer-extra';
import puppeteerStealth from 'puppeteer-extra-plugin-stealth';
import puppeteerAdblocker from 'puppeteer-extra-plugin-adblocker';
import { createModuleLogger } from '../logger.js';
import { 
    BrowserConfig, 
    ScreenshotOptions, 
    ScreenshotNetworkError, 
    IBrowserManager 
} from './types.js';

const logger = createModuleLogger('screenshot-browser-manager');

// Configure puppeteer plugins lazily
let puppeteerConfigured = false;

function ensurePuppeteerConfigured() {
    if (!puppeteerConfigured) {
        const config = getConfig();
        puppeteer.use(puppeteerStealth());
        
        // Only use adblocker if enabled in config
        if (config.puppeteer.blockAds) {
            puppeteer.use(puppeteerAdblocker({ blockTrackers: true }));
            logger.debug('Puppeteer adblocker plugin enabled');
        }
        
        puppeteerConfigured = true;
        logger.debug('Puppeteer plugins configured');
    }
}

// Default request headers
const DEFAULT_HEADERS = {
    Referer: 'https://www.google.com/',
};

export class ScreenshotBrowserManager implements IBrowserManager {
    /**
     * Launch a new browser instance with configuration
     */
    async launchBrowser(config: BrowserConfig): Promise<any> {
        ensurePuppeteerConfigured();
        
        try {
            logger.debug('Launching browser', { 
                headless: config.headless, 
                viewport: config.viewport 
            });
            
            const browser = await puppeteer.launch({
                headless: config.headless,
                defaultViewport: {
                    width: config.viewport.width,
                    height: config.viewport.height
                }
            });
            
            logger.debug('Browser launched successfully');
            return browser;
            
        } catch (error) {
            const err = error as Error;
            logger.error('Failed to launch browser', {}, err);
            throw new ScreenshotNetworkError(
                `Failed to launch browser: ${err.message}`,
                { cause: err }
            );
        }
    }
    
    /**
     * Setup a new page with screenshot options
     */
    async setupPage(browser: any, options: ScreenshotOptions): Promise<any> {
        try {
            logger.debug('Creating new page', { url: options.url });
            
            const page = await browser.newPage();
            
            // Set viewport if width is specified
            if (options.width) {
                const config = getConfig();
                await page.setViewport({
                    width: options.width,
                    height: config.puppeteer.viewport.height
                });
                logger.debug('Viewport set', { 
                    width: options.width, 
                    height: config.puppeteer.viewport.height 
                });
            }
            
            // Set timeout
            const timeout = options.timeout || getConfig().puppeteer.timeout;
            page.setDefaultTimeout(timeout);
            logger.debug('Page timeout set', { timeout });
            
            // Set headers and user agent
            await page.setExtraHTTPHeaders(DEFAULT_HEADERS);
            
            const userAgent = options.userAgent || getConfig().puppeteer.userAgent;
            await page.setUserAgent(userAgent);
            logger.debug('Headers and user agent configured');
            
            // Setup request interception for blocking
            if (options.blockImages || options.blockAds) {
                await page.setRequestInterception(true);
                
                page.on('request', (req: any) => {
                    const resourceType = req.resourceType();
                    
                    if (options.blockImages && resourceType === 'image') {
                        req.abort();
                        return;
                    }
                    
                    req.continue();
                });
                
                logger.debug('Request interception configured', { 
                    blockImages: options.blockImages 
                });
            }
            
            return page;
            
        } catch (error) {
            const err = error as Error;
            logger.error('Failed to setup page', { url: options.url }, err);
            throw new ScreenshotNetworkError(
                `Failed to setup page: ${err.message}`,
                { cause: err }
            );
        }
    }
    
    /**
     * Navigate to URL with error handling
     */
    async navigateToUrl(page: any, url: string, timeout: number): Promise<void> {
        try {
            logger.debug('Navigating to URL', { url });
            const navigationStart = Date.now();
            
            await page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout 
            });
            
            const navigationTime = Date.now() - navigationStart;
            logger.debug('Navigation completed', { url, navigationTime });
            
        } catch (error) {
            const err = error as Error;
            const errorMessage = err.message;
            logger.error('Navigation failed', { url, timeout }, err);
            
            // Categorize navigation errors
            if (errorMessage.includes('timeout')) {
                throw new ScreenshotNetworkError(
                    `Navigation timeout after ${timeout}ms`,
                    { 
                        cause: err,
                        networkError: 'timeout',
                        url 
                    }
                );
            } else if (errorMessage.includes('ERR_NAME_NOT_RESOLVED')) {
                throw new ScreenshotNetworkError(
                    `Domain not found: ${url}`,
                    { 
                        cause: err,
                        networkError: 'dns_resolution_failed',
                        url 
                    }
                );
            } else if (errorMessage.includes('ERR_CONNECTION_REFUSED')) {
                throw new ScreenshotNetworkError(
                    `Connection refused: ${url}`,
                    { 
                        cause: err,
                        networkError: 'connection_refused',
                        url 
                    }
                );
            } else {
                throw new ScreenshotNetworkError(
                    `Navigation failed: ${errorMessage}`,
                    { 
                        cause: err,
                        networkError: 'unknown',
                        url 
                    }
                );
            }
        }
    }
    
    /**
     * Capture screenshot and return page dimensions
     */
    async captureImage(page: any, path: string, fullPage: boolean = true): Promise<[number, number]> {
        try {
            logger.debug('Capturing screenshot', { path, fullPage });
            const screenshotStart = Date.now();
            
            // Get page dimensions before screenshot
            const sizes = await page.evaluate(() => [
                document.body.scrollWidth, 
                document.body.scrollHeight
            ]) as [number, number];
            
            logger.debug('Page dimensions detected', { 
                scrollWidth: sizes[0], 
                scrollHeight: sizes[1] 
            });
            
            // Capture screenshot
            await page.screenshot({ 
                path, 
                fullPage 
            });
            
            const screenshotTime = Date.now() - screenshotStart;
            logger.debug('Screenshot captured', { path, screenshotTime });
            
            return sizes;
            
        } catch (error) {
            const err = error as Error;
            logger.error('Screenshot capture failed', { path, fullPage }, err);
            throw new ScreenshotNetworkError(
                `Screenshot capture failed: ${err.message}`,
                { cause: err }
            );
        }
    }
    
    /**
     * Safely close browser instance
     */
    async closeBrowser(browser: any): Promise<void> {
        if (!browser) {
            return;
        }
        
        try {
            await browser.close();
            logger.debug('Browser closed successfully');
        } catch (error) {
            logger.warn('Error closing browser', {}, error as Error);
            // Don't throw - this is cleanup, best effort
        }
    }
}