import { CMSDetectionResult, CMSDetector } from './types.js';
import { BrowserManager, createDetectionConfig, BrowserNetworkError } from '../browser/index.js';
import { WordPressDetector } from './detectors/wordpress.js';
import { JoomlaDetector } from './detectors/joomla.js';
import { DrupalDetector } from './detectors/drupal.js';
import { DudaDetector } from './detectors/duda.js';
import { createModuleLogger } from '../logger.js';
import { validateAndNormalizeUrl, createValidationContext } from '../url/index.js';
import { DataCollector } from './analysis/collector.js';
import { DataStorage } from './analysis/storage.js';
import { CollectionConfig, DetectionDataPoint } from './analysis/types.js';
import { getVersionManager, getCurrentVersion } from './version-manager.js';
import { validateDNS, DNSSkipReason, DNSValidationResult } from '../dns/index.js';
import { RobotsTxtAnalyzer, RobotsTxtAnalysis } from '../robots-txt-analyzer.js';

const logger = createModuleLogger('cms-detection');

class CMSDetectionIterator {
    private browserManager: BrowserManager | null = null;
    private dataCollector: DataCollector | null = null;
    private dataStorage: DataStorage | null = null;
    private collectData: boolean = false;
    private sessionStartTime: number = 0;
    private sessionResults: { successful: number; failed: number; blocked: number; skipped: number } = { successful: 0, failed: 0, blocked: 0, skipped: 0 };
    private dnsSkipDetails: Array<{ url: string; reason: string; error?: string }> = [];

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
        
        this.sessionStartTime = Date.now();
    }
    
    /**
     * Start a new scan session for batch processing
     */
    startSession(command: string, urlCount: number): void {
        if (this.collectData) {
            // Log session start with version manager
            const versionManager = getVersionManager();
            versionManager.logScanSession(command, urlCount);
            
            logger.info('Started scan session with data collection', {
                sessionId: versionManager.getSessionId(),
                command,
                urlCount
            });
        }
    }
    
    /**
     * End the current scan session
     */
    endSession(): void {
        if (this.collectData && this.sessionStartTime > 0) {
            const duration = Date.now() - this.sessionStartTime;
            const versionManager = getVersionManager();
            
            // Update session with final results
            versionManager.logScanSession('', 0, {
                ...this.sessionResults,
                duration
            });
            
            logger.info('Ended scan session', {
                sessionId: versionManager.getSessionId(),
                results: this.sessionResults,
                duration
            });
        }
    }
    
    /**
     * Get DNS skip details for reporting
     */
    getDNSSkipDetails(): Array<{ url: string; reason: string; error?: string }> {
        return [...this.dnsSkipDetails];
    }
    
    /**
     * Get session results including skip count
     */
    getSessionResults(): typeof this.sessionResults {
        return { ...this.sessionResults };
    }

    async detect(url: string): Promise<CMSDetectionResult> {
        try {
            // Perform DNS validation first
            const dnsResult = await validateDNS(url);
            
            if (!dnsResult.valid) {
                // Track DNS skip
                this.sessionResults.skipped++;
                this.dnsSkipDetails.push({
                    url,
                    reason: dnsResult.reason || DNSSkipReason.RESOLUTION_FAILED,
                    error: dnsResult.error
                });
                
                logger.warn('Skipping URL due to DNS validation failure', {
                    url,
                    reason: dnsResult.reason,
                    error: dnsResult.error,
                    duration: dnsResult.duration
                });
                
                // Return a special result indicating DNS skip
                return {
                    cms: 'Unknown',
                    confidence: 0,
                    originalUrl: url,
                    finalUrl: url,
                    error: `SKIPPED: ${dnsResult.reason}`,
                    skipped: true,
                    skipReason: dnsResult.reason,
                    executionTime: dnsResult.duration || 0
                };
            }
            
            // Phase 1: Analyze robots.txt FIRST (before page load)
            const robotsAnalyzer = new RobotsTxtAnalyzer();
            const robotsAnalysis = await robotsAnalyzer.analyze(url);
            
            logger.info('Robots.txt pre-analysis completed', {
                url,
                cms: robotsAnalysis.cms,
                confidence: robotsAnalysis.confidence,
                error: robotsAnalysis.error
            });
            
            // Check for early exit opportunity - BUT ONLY if NOT collecting comprehensive data
            if (robotsAnalysis.confidence >= 0.9 && robotsAnalysis.cms !== 'Unknown' && !this.collectData) {
                logger.info('High confidence detection from robots.txt - using early exit (no data collection)', {
                    url,
                    cms: robotsAnalysis.cms,
                    confidence: robotsAnalysis.confidence
                });
                
                // Return early result without page load only when NOT collecting data
                return {
                    cms: robotsAnalysis.cms,
                    confidence: robotsAnalysis.confidence,
                    version: robotsAnalysis.version,
                    originalUrl: url,
                    finalUrl: url,
                    detectionMethods: ['robots.txt'],
                    executionTime: 0 // Will be calculated
                };
            }
            
            // Log when we have high confidence but still proceeding with full collection
            if (robotsAnalysis.confidence >= 0.9 && robotsAnalysis.cms !== 'Unknown' && this.collectData) {
                logger.info('High confidence robots.txt detection - proceeding with full data collection', {
                    url,
                    cms: robotsAnalysis.cms,
                    confidence: robotsAnalysis.confidence,
                    reason: 'comprehensive-data-requested'
                });
            }
            
            // Phase 2: Proceed with normal detection (including page load)
            let result: CMSDetectionResult;
            
            if (this.collectData && this.dataCollector && this.dataStorage) {
                result = await this.detectWithDataCollection(url, robotsAnalysis);
            } else {
                result = await detectCMSWithIsolation(url, this.browserManager);
            }
            
            // Track result for session
            if (this.collectData) {
                if (result.error) {
                    this.sessionResults.failed++;
                } else if (result.cms === 'Unknown') {
                    this.sessionResults.blocked++;
                } else {
                    this.sessionResults.successful++;
                }
            }
            
            return result;
        } catch (error) {
            if (this.collectData) {
                this.sessionResults.failed++;
            }
            throw error;
        }
    }

    /**
     * Detection with comprehensive data collection for analysis
     */
    private async detectWithDataCollection(url: string, robotsAnalysis?: RobotsTxtAnalysis): Promise<CMSDetectionResult> {
        if (!this.dataCollector || !this.dataStorage) {
            throw new Error('Data collection not initialized');
        }

        const startTime = Date.now();
        
        try {
            logger.info('Starting detection with data collection', { url });

            // Prepare pre-fetched data if we have robots analysis
            const preFetchedData = robotsAnalysis ? {
                robotsTxt: {
                    content: robotsAnalysis.content || '',
                    accessible: !robotsAnalysis.error,
                    size: robotsAnalysis.content?.length || 0,
                    statusCode: robotsAnalysis.error ? 404 : 200,
                    httpHeaders: robotsAnalysis.headers || {},
                    responseTime: 0, // Not tracked by RobotsTxtAnalyzer yet
                    error: robotsAnalysis.error,
                    patterns: {
                        disallowedPaths: [],
                        sitemapUrls: [],
                        userAgents: []
                    }
                }
            } : undefined;
            
            // Collect comprehensive data
            const collectionResult = await this.dataCollector.collect(url, preFetchedData);
            
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
            new DrupalDetector(),
            new DudaDetector()
        ];

        // For now, we'll create a mock page object with the collected data
        // This allows us to reuse existing detector logic
        const mockPage = this.createMockPageFromDataPoint(dataPoint);

        let bestResult: any = null;
        
        for (const detector of detectors) {
            try {
                const result = await detector.detect(mockPage as any, dataPoint.finalUrl);
                
                // Track the best result (highest confidence)
                if (!bestResult || result.confidence > bestResult.confidence) {
                    bestResult = result;
                }
            } catch (error) {
                logger.debug('Detector failed on data point', {
                    detector: detector.getCMSName(),
                    url: dataPoint.url,
                    error: (error as Error).message
                });
            }
        }
        
        // Return the best result if we found any positive detection
        if (bestResult && bestResult.confidence > 0 && bestResult.cms !== 'Unknown') {
            return {
                cms: bestResult.cms,
                confidence: bestResult.confidence,
                version: bestResult.version,
                originalUrl: dataPoint.originalUrl,
                finalUrl: dataPoint.finalUrl,
                redirectCount: dataPoint.totalRedirects,
                protocolUpgraded: dataPoint.protocolUpgraded,
                plugins: bestResult.plugins,
                detectionMethods: bestResult.detectionMethods,
                executionTime: 0 // Will be set by caller
            };
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
                    const fnString = fn.toString();
                    
                    // Simulate MetaTagStrategy's DOM query for generator meta tag
                    if (fnString.includes('generator') && fnString.includes('getAttribute')) {
                        // Find the generator meta tag in collected data
                        const generatorMeta = dataPoint.metaTags?.find(
                            meta => meta.name?.toLowerCase() === 'generator'
                        );
                        return Promise.resolve(generatorMeta?.content || '');
                    }
                    
                    // Fallback for other meta tag queries
                    if (fnString.includes('meta')) {
                        return Promise.resolve(dataPoint.metaTags || []);
                    }
                    
                    // Default fallback
                    return Promise.resolve([]);
                } catch {
                    return Promise.resolve([]);
                }
            },
            url: () => dataPoint.finalUrl,
            response: dataPoint.statusCode > 0 ? {
                status: () => dataPoint.statusCode,
                headers: () => dataPoint.httpHeaders
            } : null,
            _robotsTxtData: dataPoint.robotsTxt,
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
        this.endSession();
        
        // Save DNS skip report if there were any skips
        if (this.dnsSkipDetails.length > 0) {
            await this.saveDNSSkipReport();
        }
        
        await this.cleanup();
    }

    private async cleanup(): Promise<void> {
        if (this.browserManager) {
            await this.browserManager.cleanup();
            this.browserManager = null;
        }
        
        // Reset state
        this.dataCollector = null;
        this.dataStorage = null;
        this.dnsSkipDetails = [];
    }
    
    /**
     * Save DNS skip report to file
     */
    private async saveDNSSkipReport(): Promise<void> {
        try {
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `dns-skip-report-${timestamp}.json`;
            
            const report = {
                timestamp: new Date().toISOString(),
                summary: {
                    totalSkipped: this.dnsSkipDetails.length,
                    byReason: this.dnsSkipDetails.reduce((acc, skip) => {
                        acc[skip.reason] = (acc[skip.reason] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>)
                },
                details: this.dnsSkipDetails
            };
            
            const fs = await import('fs/promises');
            await fs.writeFile(filename, JSON.stringify(report, null, 2));
            
            logger.info('DNS skip report saved', { 
                filename, 
                totalSkipped: this.dnsSkipDetails.length 
            });
        } catch (error) {
            logger.error('Failed to save DNS skip report', { 
                error: (error as Error).message 
            });
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
        const validationContext = createValidationContext('production');
        
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
            new DrupalDetector(),     // Less common but still significant
            new DudaDetector()        // Website builder - check after traditional CMSs
        ];

        // Run all detectors and choose the best result
        let bestResult: any = null;
        const allResults: any[] = [];
        
        for (const detector of detectors) {
            const result = await detector.detect(page, normalizedUrl);
            allResults.push({...result, detector: detector.getCMSName()});
            
            // Track the best result (highest confidence)
            if (!bestResult || result.confidence > bestResult.confidence) {
                bestResult = result;
            }
        }
        
        // If we found any positive result, return the best one
        if (bestResult && bestResult.confidence > 0 && bestResult.cms !== 'Unknown') {
            const finalResult = {
                ...bestResult,
                // Add redirect information from navigation
                originalUrl: navigationInfo?.originalUrl || url,
                finalUrl: navigationInfo?.finalUrl || normalizedUrl,
                redirectCount: navigationInfo?.totalRedirects,
                protocolUpgraded: navigationInfo?.protocolUpgraded,
                executionTime: Date.now() - startTime
            };
            
            logger.info('Isolated CMS detection completed with best result', {
                url: normalizedUrl,
                cms: bestResult.cms,
                confidence: bestResult.confidence,
                executionTime: finalResult.executionTime,
                redirectCount: finalResult.redirectCount,
                protocolUpgraded: finalResult.protocolUpgraded,
                allResults: allResults.map(r => ({cms: r.cms, confidence: r.confidence, detector: r.detector}))
            });
            
            return finalResult;
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
export { DudaDetector } from './detectors/duda.js';
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