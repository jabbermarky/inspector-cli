import { CMSDetectionResult, CMSDetector } from './types.js';
import { BrowserManager, createDetectionConfig, BrowserNetworkError } from '../browser/index.js';
import { WordPressDetector } from './detectors/wordpress.js';
import { JoomlaDetector } from './detectors/joomla.js';
import { DrupalDetector } from './detectors/drupal.js';
import { createModuleLogger } from '../logger.js';
import { validateAndNormalizeUrl } from '../url/index.js';
import { DataCollector } from './analysis/collector.js';
import { DataStorage } from './analysis/storage.js';
import { CollectionConfig, DetectionDataPoint } from './analysis/types.js';

const logger = createModuleLogger('cms-detection');

class CMSDetectionIterator {
    private browserManager: BrowserManager | null = null;
    private dataCollector: DataCollector | null = null;
    private dataStorage: DataStorage | null = null;
    private collectData: boolean = false;

    constructor(options: { collectData?: boolean; collectionConfig?: Partial<CollectionConfig> } = {}) {
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
        this.collectData = options.collectData || false;
        
        if (this.collectData) {
            this.dataCollector = new DataCollector(this.browserManager, options.collectionConfig);
            this.dataStorage = new DataStorage();
        }
    }

    async detect(url: string): Promise<CMSDetectionResult> {
        if (this.collectData && this.dataCollector && this.dataStorage) {
            return this.detectWithDataCollection(url);
        } else {
            return detectCMSWithIsolation(url, this.browserManager);
        }
    }

    /**
     * Detection with comprehensive data collection for analysis
     */
    private async detectWithDataCollection(url: string): Promise<CMSDetectionResult> {
        if (!this.dataCollector || !this.dataStorage) {
            throw new Error('Data collection not initialized');
        }

        const startTime = Date.now();
        
        try {
            logger.info('Starting detection with data collection', { url });

            // Collect comprehensive data
            const collectionResult = await this.dataCollector.collect(url);
            
            if (!collectionResult.success || !collectionResult.dataPoint) {
                // Fall back to regular detection if data collection fails
                logger.warn('Data collection failed, falling back to regular detection', { 
                    url, 
                    error: collectionResult.error 
                });
                return detectCMSWithIsolation(url, this.browserManager);
            }

            const dataPoint = collectionResult.dataPoint;

            // Run CMS detection on the collected data
            const detectionResult = await this.runDetectionOnDataPoint(dataPoint);

            // Add detection results to data point
            dataPoint.detectionResults = [{
                detector: 'unified',
                strategy: 'multi-strategy',
                cms: detectionResult.cms,
                confidence: detectionResult.confidence,
                version: detectionResult.version,
                executionTime: Date.now() - startTime
            }];

            // Store data point for future analysis
            try {
                await this.dataStorage.initialize();
                const fileId = await this.dataStorage.store(dataPoint);
                logger.info('Data point stored for analysis', { url, fileId });
            } catch (storageError) {
                logger.warn('Failed to store data point', { 
                    url, 
                    error: (storageError as Error).message 
                });
            }

            return {
                ...detectionResult,
                executionTime: Date.now() - startTime
            };

        } catch (error) {
            logger.error('Detection with data collection failed', {
                url,
                error: (error as Error).message
            });

            // Fall back to regular detection
            return detectCMSWithIsolation(url, this.browserManager);
        }
    }

    /**
     * Run CMS detection on collected data point
     */
    private async runDetectionOnDataPoint(dataPoint: DetectionDataPoint): Promise<CMSDetectionResult> {
        // This is a simplified version that analyzes the collected data
        // In the future, this will use data-driven rules
        
        const detectors: CMSDetector[] = [
            new WordPressDetector(),
            new JoomlaDetector(),
            new DrupalDetector()
        ];

        // For now, we'll create a mock page object with the collected data
        // This allows us to reuse existing detector logic
        const mockPage = this.createMockPageFromDataPoint(dataPoint);

        for (const detector of detectors) {
            try {
                const result = await detector.detect(mockPage as any, dataPoint.finalUrl);
                
                if (result.confidence >= 0.6 && result.cms !== 'Unknown') {
                    return {
                        cms: result.cms,
                        confidence: result.confidence,
                        version: result.version,
                        originalUrl: dataPoint.originalUrl,
                        finalUrl: dataPoint.finalUrl,
                        redirectCount: dataPoint.totalRedirects,
                        protocolUpgraded: dataPoint.protocolUpgraded,
                        plugins: result.plugins,
                        detectionMethods: result.detectionMethods,
                        executionTime: 0 // Will be set by caller
                    };
                }
            } catch (error) {
                logger.debug('Detector failed on data point', {
                    detector: detector.getCMSName(),
                    url: dataPoint.url,
                    error: (error as Error).message
                });
            }
        }

        // No confident detection found
        return {
            cms: 'Unknown',
            confidence: 0,
            originalUrl: dataPoint.originalUrl,
            finalUrl: dataPoint.finalUrl,
            redirectCount: dataPoint.totalRedirects,
            protocolUpgraded: dataPoint.protocolUpgraded,
            executionTime: 0
        };
    }

    /**
     * Create a mock page object from collected data for detector compatibility
     */
    private createMockPageFromDataPoint(dataPoint: DetectionDataPoint): any {
        return {
            content: () => Promise.resolve(dataPoint.htmlContent),
            evaluate: (fn: Function) => {
                // Mock evaluate function that works with collected data
                try {
                    // This is a simplified implementation
                    // Real implementation would need to simulate DOM queries
                    return Promise.resolve(fn.toString().includes('meta') ? dataPoint.metaTags : []);
                } catch {
                    return Promise.resolve([]);
                }
            },
            url: () => dataPoint.finalUrl,
            response: dataPoint.statusCode > 0 ? {
                status: () => dataPoint.statusCode,
                headers: () => dataPoint.httpHeaders
            } : null,
            _browserManagerContext: {
                lastNavigation: {
                    originalUrl: dataPoint.originalUrl,
                    finalUrl: dataPoint.finalUrl,
                    redirectChain: dataPoint.redirectChain,
                    totalRedirects: dataPoint.totalRedirects,
                    protocolUpgraded: dataPoint.protocolUpgraded,
                    navigationTime: dataPoint.navigationTime,
                    headers: dataPoint.httpHeaders  // Add headers to navigation context
                }
            }
        };
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
 * Main CMS detection orchestrator - UNIFIED PIPELINE
 * Single URL detection now uses batch pipeline internally (single is batch of 1)
 */
export async function detectCMS(url: string): Promise<CMSDetectionResult> {
    logger.info('Starting unified CMS detection (single as batch of 1)', { url });
    
    // Use batch processing pipeline with a single URL
    // This ensures identical behavior between single and batch detection
    let iterator: CMSDetectionIterator | null = null;
    
    try {
        iterator = new CMSDetectionIterator();
        const result = await iterator.detect(url);
        
        logger.info('Unified CMS detection completed', {
            url,
            cms: result.cms,
            confidence: result.confidence,
            executionTime: result.executionTime
        });
        
        return result;
    } finally {
        // Clean up browser resources
        if (iterator) {
            await iterator.finalize();
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
export { HttpHeaderStrategy } from './strategies/http-headers.js';

// Re-export analysis modules
export { DataCollector } from './analysis/collector.js';
export { DataStorage } from './analysis/storage.js';
export { PatternDiscovery } from './analysis/patterns.js';
export { AnalysisReporter } from './analysis/reports.js';
export { RuleGenerator } from './analysis/generator.js';
export * from './analysis/types.js';

// Re-export hybrid detection
export { HybridCMSDetector } from './hybrid/detector.js';
export type { StrategyConfiguration, HybridDetectionOptions } from './hybrid/detector.js';