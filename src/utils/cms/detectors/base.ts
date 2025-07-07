import { 
    CMSDetector, 
    DetectionStrategy, 
    DetectionPage, 
    CMSDetectionResult, 
    PartialDetectionResult,
    CMSType,
    CMSPluginResult,
    CMSTimeoutError
} from '../types.js';
import { NavigationResult } from '../../browser/types.js';
import { createModuleLogger } from '../../logger.js';
import { withRetry } from '../../retry.js';

const logger = createModuleLogger('cms-detector');

/**
 * Base class for all CMS detectors implementing common functionality
 */
export abstract class BaseCMSDetector implements CMSDetector {
    protected strategies: DetectionStrategy[] = [];
    protected readonly CONFIDENCE_THRESHOLD = 0.4;
    
    abstract getCMSName(): CMSType;
    abstract getStrategies(): DetectionStrategy[];

    /**
     * Main detection method that orchestrates all strategies
     */
    async detect(page: DetectionPage, url: string): Promise<CMSDetectionResult> {
        const startTime = Date.now();
        logger.debug(`Starting ${this.getCMSName()} detection`, { url });

        try {
            // Execute all strategies concurrently with timeout protection
            const strategyPromises = this.getStrategies().map(strategy =>
                this.executeStrategyWithTimeout(strategy, page, url)
            );

            // Wait for all strategies to complete or timeout
            const settledResults = await Promise.allSettled(strategyPromises);
            
            // Extract navigation information from page context
            const navigationInfo = this.extractNavigationInfo(page);
            
            // Aggregate results into final detection result
            const result = this.aggregateResults(settledResults, startTime, url, navigationInfo);
            
            logger.info(`${this.getCMSName()} detection completed`, {
                originalUrl: result.originalUrl,
                finalUrl: result.finalUrl,
                cms: result.cms,
                confidence: result.confidence,
                redirectCount: result.redirectCount,
                protocolUpgraded: result.protocolUpgraded,
                executionTime: result.executionTime,
                methods: result.detectionMethods
            });

            return result;
        } catch (error) {
            const executionTime = Date.now() - startTime;
            logger.error(`${this.getCMSName()} detection failed`, {
                url,
                error: (error as Error).message,
                executionTime
            });

            // Extract navigation info even for failed detection
            const navigationInfo = this.extractNavigationInfo(page);
            
            return {
                cms: 'Unknown',
                confidence: 0,
                originalUrl: url,
                finalUrl: navigationInfo?.finalUrl || url,
                redirectCount: navigationInfo?.totalRedirects,
                protocolUpgraded: navigationInfo?.protocolUpgraded,
                error: (error as Error).message,
                executionTime
            };
        }
    }

    /**
     * Execute a single strategy with timeout and retry logic
     */
    private async executeStrategyWithTimeout(
        strategy: DetectionStrategy,
        page: DetectionPage,
        url: string
    ): Promise<PartialDetectionResult> {
        const strategyStartTime = Date.now();
        
        try {
            return await withRetry(
                async () => {
                    // Create timeout promise with cleanup capability
                    let timeoutId: NodeJS.Timeout | undefined;
                    const timeoutPromise = new Promise<never>((_, reject) => {
                        timeoutId = setTimeout(() => {
                            reject(new CMSTimeoutError(url, strategy.getName(), strategy.getTimeout()));
                        }, strategy.getTimeout());
                    });

                    // Race strategy execution against timeout
                    try {
                        const result = await Promise.race([
                            strategy.detect(page, url),
                            timeoutPromise
                        ]);
                        
                        // Clear timeout if strategy completes first
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                        }
                        return result;
                    } catch (error) {
                        // Clear timeout on any error (including timeout error)
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                        }
                        throw error;
                    }
                },
                {
                    maxRetries: 2,
                    initialDelayMs: 500,
                    retryableErrors: ['DETECTION_TIMEOUT', 'NETWORK_ERROR', 'ECONNRESET', 'ENOTFOUND']
                },
                `${this.getCMSName()}-${strategy.getName()}`
            );
        } catch (error) {
            logger.warn(`Strategy ${strategy.getName()} failed`, {
                url,
                cms: this.getCMSName(),
                error: (error as Error).message,
                executionTime: Date.now() - strategyStartTime
            });

            // Return low confidence result for failed strategy
            return {
                confidence: 0,
                method: strategy.getName(),
                error: (error as Error).message,
                executionTime: Date.now() - strategyStartTime
            };
        }
    }

    /**
     * Aggregate results from all strategies into final result
     */
    protected aggregateResults(
        settledResults: PromiseSettledResult<PartialDetectionResult>[],
        startTime: number,
        originalUrl: string,
        navigationInfo: NavigationResult | null
    ): CMSDetectionResult {
        const successfulResults: PartialDetectionResult[] = [];
        const failedMethods: string[] = [];
        const executionTime = Date.now() - startTime;

        // Process settled results
        for (const result of settledResults) {
            if (result.status === 'fulfilled') {
                successfulResults.push(result.value);
            } else {
                failedMethods.push(`Unknown strategy: ${result.reason?.message || 'Unknown error'}`);
            }
        }

        // Calculate weighted confidence score
        let totalConfidence = 0;
        let totalWeight = 0;
        let bestVersion: string | undefined;
        let allPlugins: CMSPluginResult[] = [];
        const detectionMethods: string[] = [];

        for (const result of successfulResults) {
            if (result.confidence > 0) {
                const weight = this.getStrategyWeight(result.method);
                totalConfidence += result.confidence * weight;
                totalWeight += weight;
                detectionMethods.push(result.method);

                // Take version from highest confidence result
                if (result.version && result.confidence > 0.7) {
                    bestVersion = result.version;
                }

                // Collect plugins
                if (result.plugins) {
                    allPlugins = [...allPlugins, ...result.plugins];
                }
            }
        }

        // Normalize confidence score
        const finalConfidence = totalWeight > 0 ? Math.min(totalConfidence / totalWeight, 1.0) : 0;

        // Determine if we have confident detection
        const detectedCMS = finalConfidence >= this.CONFIDENCE_THRESHOLD ? this.getCMSName() : 'Unknown';

        return {
            cms: detectedCMS,
            confidence: finalConfidence,
            version: bestVersion,
            originalUrl,
            finalUrl: navigationInfo?.finalUrl || originalUrl,
            redirectCount: navigationInfo?.totalRedirects,
            protocolUpgraded: navigationInfo?.protocolUpgraded,
            plugins: this.deduplicatePlugins(allPlugins),
            detectionMethods,
            executionTime
        };
    }

    /**
     * Get weight for different detection strategies
     */
    protected getStrategyWeight(method: string): number {
        const weights: Record<string, number> = {
            'meta-tag': 1.0,      // Highest confidence
            'api-endpoint': 0.9,   // Very high confidence
            'html-content': 0.7,   // Medium confidence
            'plugin-detection': 0.6 // Lower confidence
        };
        return weights[method] || 0.5;
    }

    /**
     * Remove duplicate plugins based on name
     */
    protected deduplicatePlugins(plugins: CMSPluginResult[]): CMSPluginResult[] {
        const unique = new Map<string, CMSPluginResult>();
        
        for (const plugin of plugins) {
            const existing = unique.get(plugin.name);
            if (!existing || (plugin.version && !existing.version)) {
                unique.set(plugin.name, plugin);
            }
        }
        
        return Array.from(unique.values());
    }

    /**
     * Extract navigation information from managed page context
     */
    private extractNavigationInfo(page: DetectionPage): NavigationResult | null {
        return page._browserManagerContext?.lastNavigation || null;
    }

    /**
     * Utility method to extract version from text using common patterns
     */
    protected extractVersion(text: string, cmsName: string): string | undefined {
        const patterns = [
            new RegExp(`${cmsName}\\s*[:\\/]?\\s*v?([0-9]+(?:\\.[0-9]+)*(?:\\.[0-9]+)?)`, 'i'),
            new RegExp(`version[:\\/\\s]*v?([0-9]+(?:\\.[0-9]+)*(?:\\.[0-9]+)?)`, 'i'),
            /v?([0-9]+(?:\.[0-9]+)*(?:\.[0-9]+)?)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return undefined;
    }
}