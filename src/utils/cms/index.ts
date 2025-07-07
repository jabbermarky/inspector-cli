import { CMSDetectionResult, CMSDetector } from './types.js';
import { BrowserManager, createDetectionConfig, BrowserNetworkError } from '../browser/index.js';
import { WordPressDetector } from './detectors/wordpress.js';
import { JoomlaDetector } from './detectors/joomla.js';
import { DrupalDetector } from './detectors/drupal.js';
import { createModuleLogger } from '../logger.js';
import { validateAndNormalizeUrl } from '../url/index.js';

const logger = createModuleLogger('cms-detection');

class CMSDetectionIterator {
    private browserManager: BrowserManager | null = null;

    constructor() {
        // Initialize browser manager with detection configuration
        const config = createDetectionConfig({
            resourceBlocking: {
                enabled: true,
                strategy: 'aggressive',
                allowEssentialScripts: true
            },
            navigation: {
                timeout: 8000,
                retryAttempts: 3
            }
        });
        
        this.browserManager = new BrowserManager(config);        
    }

    async detect(url: string): Promise<CMSDetectionResult> {
        return detectCMSWithIsolation(url, this.browserManager);
    }

    /**
     * Finalize the iterator and cleanup browser resources
     * Call this once after processing all URLs in a batch
     */
    async finalize(): Promise<void> {
        await this.cleanup();
    }

    private async cleanup(): Promise<void> {
        if (this.browserManager) {
            await this.browserManager.cleanup();
            this.browserManager = null;
        }
    }
}

/**
 * CMS detection for batch processing with isolated contexts
 * Each URL gets a fresh browser state to prevent cross-URL contamination
 */
export async function detectCMSWithIsolation(url: string, _browserManager: BrowserManager | null = null): Promise<CMSDetectionResult> {
    const startTime = Date.now();
    let browserManager: BrowserManager | null = _browserManager;
    let context: any = null;

    try {
        logger.info('Starting isolated CMS detection', { url });

        // Validate and normalize URL using shared validation
        const validationContext = {
            environment: 'production' as const,
            allowLocalhost: false,
            allowPrivateIPs: false,
            allowCustomPorts: false,
            defaultProtocol: 'http' as const // Use HTTP default as per revised plan
        };
        
        const normalizedUrl = validateAndNormalizeUrl(url, { context: validationContext });
        logger.debug('Normalized URL for isolated CMS detection', { normalizedUrl });

        if (!browserManager) {
            // Initialize browser manager with detection configuration
            const config = createDetectionConfig({
                resourceBlocking: {
                    enabled: true,
                    strategy: 'aggressive',
                    allowEssentialScripts: true
                },
                navigation: {
                    timeout: 8000,
                    retryAttempts: 3
                }
            });
            
            browserManager = new BrowserManager(config);
        }
        
        // Create page in isolated context for fresh browser state
        const { page, context: browserContext } = await browserManager.createPageInIsolatedContext(normalizedUrl);
        context = browserContext;

        // Extract redirect information from browser manager
        const navigationInfo = browserManager.getNavigationInfo(page);

        // Initialize CMS detectors in priority order (most common first)
        const detectors: CMSDetector[] = [
            new WordPressDetector(),  // Most common CMS
            new JoomlaDetector(),     // Second most common
            new DrupalDetector()      // Less common but still significant
        ];

        // Run detection with early exit on confident result
        for (const detector of detectors) {
            const result = await detector.detect(page, normalizedUrl);
            
            // If we have confident detection, return immediately with redirect info
            if (result.confidence >= 0.6 && result.cms !== 'Unknown') {
                const finalResult = {
                    ...result,
                    // Add redirect information from navigation
                    originalUrl: navigationInfo?.originalUrl || url,
                    finalUrl: navigationInfo?.finalUrl || normalizedUrl,
                    redirectCount: navigationInfo?.totalRedirects,
                    protocolUpgraded: navigationInfo?.protocolUpgraded,
                    executionTime: Date.now() - startTime
                };
                
                logger.info('Isolated CMS detection completed with confident result', {
                    url: normalizedUrl,
                    cms: result.cms,
                    confidence: result.confidence,
                    executionTime: finalResult.executionTime,
                    redirectCount: finalResult.redirectCount,
                    protocolUpgraded: finalResult.protocolUpgraded,
                    detector: detector.getCMSName()
                });
                
                return finalResult;
            }
        }

        // No confident detection found
        const executionTime = Date.now() - startTime;
        logger.info('Isolated CMS detection completed - no CMS identified', {
            url: normalizedUrl,
            executionTime
        });

        return {
            cms: 'Unknown',
            confidence: 0,
            originalUrl: navigationInfo?.originalUrl || url,
            finalUrl: navigationInfo?.finalUrl || normalizedUrl,
            redirectCount: navigationInfo?.totalRedirects,
            protocolUpgraded: navigationInfo?.protocolUpgraded,
            executionTime
        };

    } catch (error) {
        const executionTime = Date.now() - startTime;
        logger.error('Isolated CMS detection failed', {
            url,
            error: (error as Error).message,
            executionTime
        });

        // Handle browser manager specific errors
        let errorMessage = (error as Error).message;
        if (error instanceof BrowserNetworkError) {
            errorMessage = `Network error: ${error.message}`;
        }

        return {
            cms: 'Unknown',
            confidence: 0,
            originalUrl: url,
            finalUrl: url,  // Use original URL as fallback when error occurs
            error: errorMessage,
            executionTime
        };
    } finally {
        // Close isolated context to free resources and reset browser state
        if (browserManager && context) {
            await browserManager.closeContext(context);
        }
        // Note: cleanup is handled by the caller if needed}
    }
}

/**
 * Main CMS detection orchestrator
 * Refactored from the original 207-line monolithic function
 */
export async function detectCMS(url: string): Promise<CMSDetectionResult> {
    const startTime = Date.now();
    let browserManager: BrowserManager | null = null;

    try {
        logger.info('Starting CMS detection', { url });

        // Validate and normalize URL using shared validation
        const validationContext = {
            environment: 'production' as const,
            allowLocalhost: false,
            allowPrivateIPs: false,
            allowCustomPorts: false,
            defaultProtocol: 'http' as const // Use HTTP default as per revised plan
        };
        
        const normalizedUrl = validateAndNormalizeUrl(url, { context: validationContext });
        logger.debug('Normalized URL for CMS detection', { normalizedUrl });
        
        // Initialize browser manager with detection configuration
        const config = createDetectionConfig({
            resourceBlocking: {
                enabled: true,
                strategy: 'aggressive',
                allowEssentialScripts: true
            },
            navigation: {
                timeout: 5000,
                retryAttempts: 3
            }
        });
        
        browserManager = new BrowserManager(config);
        const page = await browserManager.createPage(normalizedUrl);

        // Extract redirect information from browser manager
        const navigationInfo = browserManager.getNavigationInfo(page);

        // Initialize CMS detectors in priority order (most common first)
        const detectors: CMSDetector[] = [
            new WordPressDetector(),  // Most common CMS
            new JoomlaDetector(),     // Second most common
            new DrupalDetector()      // Less common but still significant
        ];

        // Run detection with early exit on confident result
        for (const detector of detectors) {
            const result = await detector.detect(page, normalizedUrl);
            
            // If we have confident detection, return immediately with redirect info
            if (result.confidence >= 0.6 && result.cms !== 'Unknown') {
                const finalResult = {
                    ...result,
                    // Add redirect information from navigation
                    originalUrl: navigationInfo?.originalUrl || url,
                    finalUrl: navigationInfo?.finalUrl || normalizedUrl,
                    redirectCount: navigationInfo?.totalRedirects,
                    protocolUpgraded: navigationInfo?.protocolUpgraded,
                    executionTime: Date.now() - startTime
                };
                
                logger.info('CMS detection completed with confident result', {
                    url: normalizedUrl,
                    cms: result.cms,
                    confidence: result.confidence,
                    executionTime: finalResult.executionTime,
                    redirectCount: finalResult.redirectCount,
                    protocolUpgraded: finalResult.protocolUpgraded,
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
            originalUrl: navigationInfo?.originalUrl || url,
            finalUrl: navigationInfo?.finalUrl || normalizedUrl,
            redirectCount: navigationInfo?.totalRedirects,
            protocolUpgraded: navigationInfo?.protocolUpgraded,
            executionTime
        };

    } catch (error) {
        const executionTime = Date.now() - startTime;
        logger.error('CMS detection failed', {
            url,
            error: (error as Error).message,
            executionTime
        });

        // Handle browser manager specific errors
        let errorMessage = (error as Error).message;
        if (error instanceof BrowserNetworkError) {
            errorMessage = `Network error: ${error.message}`;
        }

        return {
            cms: 'Unknown',
            confidence: 0,
            originalUrl: url,
            finalUrl: url,  // Use original URL as fallback when error occurs
            redirectCount: 0,
            protocolUpgraded: false,
            error: errorMessage,
            executionTime
        };
    } finally {
        // Ensure browser cleanup
        if (browserManager) {
            await browserManager.cleanup();
        }
    }
}

// URL validation is now handled by shared URL validation module

// Re-export types and classes for external use
    export * from './types.js';
    export { CMSDetectionIterator };
    
export { WordPressDetector } from './detectors/wordpress.js';
export { JoomlaDetector } from './detectors/joomla.js';
export { DrupalDetector } from './detectors/drupal.js';
export { MetaTagStrategy } from './strategies/meta-tag.js';
export { HtmlContentStrategy } from './strategies/html-content.js';
export { ApiEndpointStrategy } from './strategies/api-endpoint.js';