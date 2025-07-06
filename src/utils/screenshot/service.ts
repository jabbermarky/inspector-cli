import { createModuleLogger } from '../logger.js';
import { 
    ScreenshotOptions, 
    ScreenshotResult, 
    ScreenshotError,
    IScreenshotService 
} from './types.js';
import { BrowserManager, createCaptureConfig, BrowserNetworkError, BrowserTimeoutError } from '../browser/index.js';
import { ScreenshotValidator } from './validation.js';

const logger = createModuleLogger('screenshot-service');

/**
 * Screenshot capture service with browser management and validation
 */
export class ScreenshotService implements IScreenshotService {
    private browserManager: BrowserManager | null = null;
    
    constructor() {
        // Browser manager is created per screenshot operation for better resource management
    }
    
    /**
     * Capture a screenshot of a web page
     * @param options Screenshot capture options
     * @returns Promise resolving to screenshot result
     */
    async captureScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
        const startTime = Date.now();
        
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
            
            // Create browser manager with capture configuration
            const config = createCaptureConfig({
                viewport: { 
                    width: options.width, 
                    height: 768 // Default height, will be adjusted by viewport
                },
                navigation: {
                    timeout: options.timeout || 15000,
                    additionalWaitTime: 2000 // Wait for animations/dynamic content
                },
                resourceBlocking: {
                    enabled: true,
                    strategy: 'moderate' // Preserve visual elements
                }
            });
            
            this.browserManager = new BrowserManager(config);
            
            // Create page and navigate
            const page = await this.browserManager.createPage(normalizedUrl);
            
            // Capture screenshot
            const screenshotStart = Date.now();
            const fullPage = normalizedOptions.fullPage ?? true;
            const sizes = await this.browserManager.captureScreenshot(page, options.path, fullPage);
            const screenshotTime = Date.now() - screenshotStart;
            
            const totalDuration = Date.now() - startTime;
            
            // Log performance metrics
            logger.screenshot(normalizedUrl, options.path, options.width);
            logger.performance('Screenshot capture', totalDuration);
            logger.debug('Screenshot timings', { 
                screenshot: screenshotTime, 
                total: totalDuration 
            });
            
            const result: ScreenshotResult = {
                url: normalizedUrl,
                path: options.path,
                width: options.width,
                sizes,
                duration: totalDuration,
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
            
            // Handle browser manager specific errors
            if (error instanceof BrowserNetworkError) {
                throw new ScreenshotError(
                    `Network error during screenshot: ${error.message}`,
                    { cause: error }
                );
            }
            
            if (error instanceof BrowserTimeoutError) {
                throw new ScreenshotError(
                    `Timeout during screenshot: ${error.message}`,
                    { cause: error }
                );
            }
            
            // Re-throw with context if it's not already a ScreenshotError
            if (error instanceof ScreenshotError) {
                throw error;
            }
            
            throw new ScreenshotError(
                `Screenshot capture failed: ${(error as Error).message}`,
                { cause: error as Error }
            );
            
        } finally {
            // Cleanup browser manager
            if (this.browserManager) {
                try {
                    await this.browserManager.cleanup();
                } catch (cleanupError) {
                    logger.warn('Error during screenshot cleanup', { 
                        error: (cleanupError as Error).message 
                    });
                }
                this.browserManager = null;
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