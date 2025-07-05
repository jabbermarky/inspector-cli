import { CMSDetectionResult, CMSDetector } from './types.js';
import { CMSBrowserManager } from './browser-manager.js';
import { WordPressDetector } from './detectors/wordpress.js';
import { JoomlaDetector } from './detectors/joomla.js';
import { DrupalDetector } from './detectors/drupal.js';
import { createModuleLogger } from '../logger.js';
import { validateFilePath } from '../file/index.js';

const logger = createModuleLogger('cms-detection');

/**
 * Main CMS detection orchestrator
 * Refactored from the original 207-line monolithic function
 */
export async function detectCMS(url: string): Promise<CMSDetectionResult> {
    const startTime = Date.now();
    let browserManager: CMSBrowserManager | null = null;

    try {
        logger.info('Starting CMS detection', { url });

        // Validate and normalize URL
        const normalizedUrl = validateAndNormalizeUrl(url);
        
        // Initialize browser manager
        browserManager = new CMSBrowserManager();
        const page = await browserManager.createPage(normalizedUrl);

        // Initialize CMS detectors in priority order (most common first)
        const detectors: CMSDetector[] = [
            new WordPressDetector(),  // Most common CMS
            new JoomlaDetector(),     // Second most common
            new DrupalDetector()      // Less common but still significant
        ];

        // Run detection with early exit on confident result
        for (const detector of detectors) {
            const result = await detector.detect(page, normalizedUrl);
            
            // If we have confident detection, return immediately
            if (result.confidence >= 0.6 && result.cms !== 'Unknown') {
                const finalResult = {
                    ...result,
                    executionTime: Date.now() - startTime
                };
                
                logger.info('CMS detection completed with confident result', {
                    url: normalizedUrl,
                    cms: result.cms,
                    confidence: result.confidence,
                    executionTime: finalResult.executionTime,
                    detector: detector.getCMSName()
                });
                
                return finalResult;
            }
        }

        // No confident detection found
        const executionTime = Date.now() - startTime;
        logger.info('CMS detection completed - no CMS identified', {
            url: normalizedUrl,
            executionTime
        });

        return {
            cms: 'Unknown',
            confidence: 0,
            executionTime
        };

    } catch (error) {
        const executionTime = Date.now() - startTime;
        logger.error('CMS detection failed', {
            url,
            error: (error as Error).message,
            executionTime
        });

        return {
            cms: 'Unknown',
            confidence: 0,
            error: (error as Error).message,
            executionTime
        };
    } finally {
        // Ensure browser cleanup
        if (browserManager) {
            await browserManager.cleanup();
        }
    }
}

/**
 * Validate and normalize URL for CMS detection
 */
function validateAndNormalizeUrl(url: string): string {
    // Input validation
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
        throw new Error('Invalid URL: URL must be a non-empty string');
    }

    let normalizedUrl = url.trim();

    // Add protocol if missing
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
    }

    // Validate URL format
    try {
        const urlObj = new URL(normalizedUrl);
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            throw new Error(`Invalid URL protocol: ${urlObj.protocol}. Only HTTP and HTTPS are supported.`);
        }
        return urlObj.href;
    } catch (error) {
        throw new Error(`Invalid URL format: ${(error as Error).message}`);
    }
}

// Re-export types and classes for external use
export * from './types.js';
export { CMSBrowserManager } from './browser-manager.js';
export { WordPressDetector } from './detectors/wordpress.js';
export { JoomlaDetector } from './detectors/joomla.js';
export { DrupalDetector } from './detectors/drupal.js';
export { MetaTagStrategy } from './strategies/meta-tag.js';
export { HtmlContentStrategy } from './strategies/html-content.js';
export { ApiEndpointStrategy } from './strategies/api-endpoint.js';