/**
 * Screenshot Module
 * 
 * This module provides screenshot capture functionality for web pages using Puppeteer.
 * It includes validation, browser management, concurrency control, and error handling.
 * 
 * Key Features:
 * - URL validation with protocol normalization
 * - Browser automation with stealth mode and ad blocking
 * - Semaphore-based concurrency control
 * - Comprehensive error handling and categorization
 * - Performance monitoring and logging
 * - Resource cleanup and memory management
 * 
 * Usage:
 * ```typescript
 * import { takeScreenshot } from './utils/screenshot/index.js';
 * 
 * const result = await takeScreenshot({
 *   url: 'https://example.com',
 *   path: './screenshot.png',
 *   width: 1024
 * });
 * ```
 */

// Export types
export {
    ScreenshotOptions,
    ScreenshotResult,
    ScreenshotError,
    ScreenshotValidationError,
    ScreenshotNetworkError,
    IScreenshotService
} from './types.js';

// Export main service classes
export { ScreenshotService, screenshotService } from './service.js';
export { ScreenshotValidator } from './validation.js';

// Main screenshot function for backward compatibility
import { screenshotService } from './service.js';
import { ScreenshotOptions, ScreenshotResult } from './types.js';

/**
 * Take a screenshot of a web page
 * 
 * This is the main entry point for screenshot functionality, providing
 * a simple interface while using the full screenshot service underneath.
 * 
 * @param url The URL to capture
 * @param path Output file path for the screenshot
 * @param width Viewport width for the screenshot
 * @returns Promise resolving to screenshot result with metadata
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const result = await takeScreenshot('https://example.com', './screenshot.png', 1024);
 * 
 * // With additional options
 * const result = await takeScreenshot({
 *   url: 'https://example.com',
 *   path: './screenshot.png', 
 *   width: 1024,
 *   fullPage: true,
 *   timeout: 30000
 * });
 * ```
 */
export async function takeScreenshot(
    urlOrOptions: string | ScreenshotOptions,
    path?: string,
    width?: number
): Promise<ScreenshotResult> {
    let options: ScreenshotOptions;
    
    if (typeof urlOrOptions === 'string') {
        // Legacy function signature: takeScreenshot(url, path, width)
        if (!path || !width) {
            throw new Error('Path and width are required when using URL string format');
        }
        
        options = {
            url: urlOrOptions,
            path,
            width
        };
    } else {
        // Modern options object signature
        options = urlOrOptions;
    }
    
    return screenshotService.captureScreenshot(options);
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use takeScreenshot instead
 */
export async function takeAScreenshotPuppeteer(
    url: string,
    path: string,
    width: number
): Promise<ScreenshotResult> {
    return takeScreenshot(url, path, width);
}