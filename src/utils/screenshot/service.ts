import { getConfig } from '../config.js';
import { createModuleLogger } from '../logger.js';
import { getSemaphore } from '../utils.js';
import { 
    ScreenshotOptions, 
    ScreenshotResult, 
    ScreenshotError,
    IScreenshotService 
} from './types.js';
import { ScreenshotBrowserManager } from './browser-manager.js';
import { ScreenshotValidator } from './validation.js';

const logger = createModuleLogger('screenshot-service');

/**
 * Screenshot capture service with browser management and validation
 */
export class ScreenshotService implements IScreenshotService {
    private browserManager: ScreenshotBrowserManager;
    
    constructor() {
        this.browserManager = new ScreenshotBrowserManager();
    }
    
    /**
     * Capture a screenshot of a web page
     * @param options Screenshot capture options
     * @returns Promise resolving to screenshot result
     */
    async captureScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
        const startTime = Date.now();
        let browser: any = null;
        let page: any = null; // Track page for cleanup
        let semaphoreAcquired = false;
        
        try {
            // Validate options
            this.validateOptions(options);
            
            // Normalize URL
            const normalizedUrl = ScreenshotValidator.normalizeUrl(options.url);
            const normalizedOptions = { ...options, url: normalizedUrl };
            
            logger.info('Starting screenshot capture', { 
                url: normalizedUrl, 
                path: options.path, 
                width: options.width 
            });
            
            // Acquire semaphore for concurrency control
            await getSemaphore().acquire();
            semaphoreAcquired = true;
            logger.debug('Semaphore acquired for screenshot');
            
            // Get browser configuration
            const config = getConfig();
            const browserConfig = {
                headless: config.puppeteer.headless,
                viewport: config.puppeteer.viewport,
                timeout: config.puppeteer.timeout,
                userAgent: config.puppeteer.userAgent,
                blockAds: config.puppeteer.blockAds,
                blockImages: config.puppeteer.blockImages,
                maxConcurrency: config.puppeteer.maxConcurrency
            };
            
            // Launch browser
            browser = await this.browserManager.launchBrowser(browserConfig);
            
            // Setup page
            page = await this.browserManager.setupPage(browser, normalizedOptions);
            
            // Navigate to URL
            const navigationStart = Date.now();
            const timeout = normalizedOptions.timeout || config.puppeteer.timeout;
            await this.browserManager.navigateToUrl(page, normalizedUrl, timeout);
            const navigationTime = Date.now() - navigationStart;
            
            // Capture screenshot
            const screenshotStart = Date.now();
            const fullPage = normalizedOptions.fullPage ?? true;
            const sizes = await this.browserManager.captureImage(page, options.path, fullPage);
            const screenshotTime = Date.now() - screenshotStart;
            
            const totalDuration = Date.now() - startTime;
            
            // Log performance metrics
            logger.screenshot(normalizedUrl, options.path, options.width);
            logger.performance('Screenshot capture', totalDuration);
            logger.debug('Screenshot timings', { 
                navigation: navigationTime, 
                screenshot: screenshotTime, 
                total: totalDuration 
            });
            
            const result: ScreenshotResult = {
                url: normalizedUrl,
                path: options.path,
                width: options.width,
                sizes,
                duration: totalDuration,
                navigationTime,
                screenshotTime
            };
            
            logger.info('Screenshot capture completed', { 
                url: normalizedUrl,
                path: options.path,
                duration: totalDuration
            });
            
            return result;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Screenshot capture failed', { 
                url: options.url,
                path: options.path,
                width: options.width,
                duration
            }, error as Error);
            
            // Re-throw with context if it's not already a ScreenshotError
            if (error instanceof ScreenshotError) {
                throw error;
            }
            
            throw new ScreenshotError(
                `Screenshot capture failed: ${(error as Error).message}`,
                { cause: error as Error }
            );
            
        } finally {
            // Cleanup page and browser
            if (page) {
                try {
                    await page.close();
                } catch { /* empty */ }
            }
            if (browser) {
                try {
                    await this.browserManager.closeBrowser(browser);
                } catch { /* empty */ }
            }
            
            // Release semaphore
            if (semaphoreAcquired) {
                getSemaphore().release();
                logger.debug('Semaphore released');
            }
        }
    }
    
    /**
     * Validate screenshot options
     * @param options Options to validate
     * @throws ScreenshotValidationError if validation fails
     */
    validateOptions(options: ScreenshotOptions): void {
        ScreenshotValidator.validate(options);
    }
    
    /**
     * Clean up resources (placeholder for future cleanup needs)
     */
    async cleanup(): Promise<void> {
        logger.debug('Screenshot service cleanup completed');
    }
}

/**
 * Default screenshot service instance
 */
export const screenshotService = new ScreenshotService();