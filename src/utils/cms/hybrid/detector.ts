import { CMSDetector, DetectionStrategy, DetectionPage, CMSDetectionResult, PartialDetectionResult, CMSType } from '../types.js';
import { createModuleLogger } from '../../logger.js';

const logger = createModuleLogger('hybrid-detector');

export interface StrategyConfiguration {
    name: string;
    strategy: DetectionStrategy;
    weight: number;
    enabled: boolean;
    source: 'builtin' | 'generated';
    version?: string;
    confidence?: number;
}

export interface HybridDetectionOptions {
    enableABTesting?: boolean;
    generatedStrategyWeight?: number;
    builtinStrategyWeight?: number;
    minStrategiesRequired?: number;
    confidenceThreshold?: number;
}

/**
 * Hybrid CMS detector that combines built-in and generated strategies
 * Supports A/B testing and gradual migration to data-driven rules
 */
export class HybridCMSDetector implements CMSDetector {
    private strategies: StrategyConfiguration[] = [];
    private options: Required<HybridDetectionOptions>;
    private cmsName: CMSType;

    constructor(
        cmsName: CMSType, 
        strategies: StrategyConfiguration[], 
        options: HybridDetectionOptions = {}
    ) {
        this.cmsName = cmsName;
        this.strategies = strategies;
        this.options = {
            enableABTesting: false,
            generatedStrategyWeight: 1.2, // Slightly favor generated strategies
            builtinStrategyWeight: 1.0,
            minStrategiesRequired: 2,
            confidenceThreshold: 0.4,
            ...options
        };

        logger.info('Hybrid detector initialized', {
            cms: cmsName,
            strategies: strategies.length,
            generated: strategies.filter(s => s.source === 'generated').length,
            builtin: strategies.filter(s => s.source === 'builtin').length
        });
    }

    getCMSName(): CMSType {
        return this.cmsName;
    }

    getStrategies(): DetectionStrategy[] {
        return this.strategies
            .filter(config => config.enabled)
            .map(config => config.strategy);
    }

    /**
     * Enhanced detection with hybrid strategy evaluation
     */
    async detect(page: DetectionPage, url: string): Promise<CMSDetectionResult> {
        const startTime = Date.now();
        logger.info(`Starting hybrid ${this.cmsName} detection`, { url });

        try {
            const enabledStrategies = this.strategies.filter(config => config.enabled);
            
            if (enabledStrategies.length < this.options.minStrategiesRequired) {
                logger.warn('Insufficient strategies enabled', {
                    enabled: enabledStrategies.length,
                    required: this.options.minStrategiesRequired
                });
            }

            // Execute all enabled strategies
            const strategyPromises = enabledStrategies.map(config =>
                this.executeStrategyWithMetrics(config, page, url)
            );

            const strategyResults = await Promise.allSettled(strategyPromises);

            // Process results and calculate hybrid confidence
            const result = await this.processHybridResults(strategyResults, url, startTime);

            // A/B testing comparison if enabled
            if (this.options.enableABTesting) {
                await this.performABComparison(enabledStrategies, page, url, result);
            }

            logger.info(`Hybrid ${this.cmsName} detection completed`, {
                url,
                confidence: result.confidence,
                strategies: enabledStrategies.length,
                executionTime: result.executionTime
            });

            return result;

        } catch (error) {
            const executionTime = Date.now() - startTime;
            logger.error(`Hybrid ${this.cmsName} detection failed`, {
                url,
                error: (error as Error).message,
                executionTime
            });

            return {
                cms: 'Unknown',
                confidence: 0,
                originalUrl: url,
                finalUrl: url,
                error: (error as Error).message,
                executionTime
            };
        }
    }

    /**
     * Execute strategy with performance and accuracy metrics
     */
    private async executeStrategyWithMetrics(
        config: StrategyConfiguration,
        page: DetectionPage,
        url: string
    ): Promise<StrategyExecutionResult> {
        const startTime = Date.now();
        
        try {
            const result = await config.strategy.detect(page, url);
            const executionTime = Date.now() - startTime;

            return {
                config,
                result,
                executionTime,
                success: true
            };

        } catch (error) {
            const executionTime = Date.now() - startTime;
            logger.warn(`Strategy ${config.name} failed`, {
                url,
                error: (error as Error).message,
                executionTime
            });

            return {
                config,
                result: {
                    confidence: 0,
                    method: config.name,
                    error: (error as Error).message,
                    executionTime
                },
                executionTime,
                success: false
            };
        }
    }

    /**
     * Process hybrid results using weighted confidence calculation
     */
    private async processHybridResults(
        strategyResults: PromiseSettledResult<StrategyExecutionResult>[],
        url: string,
        startTime: number
    ): Promise<CMSDetectionResult> {
        const successfulResults: StrategyExecutionResult[] = [];
        const failedResults: StrategyExecutionResult[] = [];

        // Separate successful and failed results
        for (const settled of strategyResults) {
            if (settled.status === 'fulfilled') {
                if (settled.value.success) {
                    successfulResults.push(settled.value);
                } else {
                    failedResults.push(settled.value);
                }
            }
        }

        if (successfulResults.length === 0) {
            return {
                cms: 'Unknown',
                confidence: 0,
                originalUrl: url,
                finalUrl: url,
                executionTime: Date.now() - startTime,
                detectionMethods: failedResults.map(r => r.config.name)
            };
        }

        // Calculate hybrid confidence using weighted strategies
        let totalWeightedConfidence = 0;
        let totalWeight = 0;
        const detectionMethods: string[] = [];
        const evidenceCollected: string[] = [];
        let bestVersion: string | undefined;

        for (const strategyResult of successfulResults) {
            const { config, result } = strategyResult;
            
            if (result.confidence > 0) {
                // Apply source-based weighting
                const sourceWeight = config.source === 'generated' ? 
                    this.options.generatedStrategyWeight : 
                    this.options.builtinStrategyWeight;
                
                const configWeight = config.weight || 1.0;
                const finalWeight = sourceWeight * configWeight;

                totalWeightedConfidence += result.confidence * finalWeight;
                totalWeight += finalWeight;
                detectionMethods.push(config.name);

                // Collect evidence
                if (result.evidence) {
                    evidenceCollected.push(...result.evidence);
                }

                // Version detection
                if (result.version && result.confidence > 0.7) {
                    bestVersion = result.version;
                }
            }
        }

        // Calculate final confidence
        const finalConfidence = totalWeight > 0 ? 
            Math.min(totalWeightedConfidence / totalWeight, 1.0) : 0;

        // Determine detected CMS
        const detectedCMS = finalConfidence >= this.options.confidenceThreshold ? 
            this.cmsName : 'Unknown';

        const executionTime = Date.now() - startTime;

        return {
            cms: detectedCMS,
            confidence: finalConfidence,
            version: bestVersion,
            originalUrl: url,
            finalUrl: url, // Will be updated by caller if needed
            detectionMethods,
            executionTime,
            // Additional hybrid-specific metadata
            hybridMetadata: {
                strategiesExecuted: successfulResults.length,
                strategiesFailed: failedResults.length,
                weightingScheme: 'source-based',
                generatedStrategies: successfulResults.filter(r => r.config.source === 'generated').length,
                builtinStrategies: successfulResults.filter(r => r.config.source === 'builtin').length,
                evidenceCount: evidenceCollected.length
            }
        };
    }

    /**
     * A/B testing comparison between strategy types
     */
    private async performABComparison(
        strategies: StrategyConfiguration[],
        page: DetectionPage,
        url: string,
        finalResult: CMSDetectionResult
    ): Promise<void> {
        const generatedStrategies = strategies.filter(s => s.source === 'generated');
        const builtinStrategies = strategies.filter(s => s.source === 'builtin');

        if (generatedStrategies.length === 0 || builtinStrategies.length === 0) {
            return; // Can't do A/B testing without both types
        }

        // Calculate confidence using only generated strategies
        const generatedResults = await Promise.allSettled(
            generatedStrategies.map(config => this.executeStrategyWithMetrics(config, page, url))
        );

        // Calculate confidence using only built-in strategies
        const builtinResults = await Promise.allSettled(
            builtinStrategies.map(config => this.executeStrategyWithMetrics(config, page, url))
        );

        const generatedConfidence = this.calculateGroupConfidence(generatedResults);
        const builtinConfidence = this.calculateGroupConfidence(builtinResults);

        logger.info('A/B testing comparison', {
            url,
            generatedConfidence,
            builtinConfidence,
            hybridConfidence: finalResult.confidence,
            winner: generatedConfidence > builtinConfidence ? 'generated' : 'builtin'
        });

        // Store A/B testing results for analysis
        // In production, this would be sent to analytics/monitoring system
    }

    /**
     * Calculate group confidence for A/B testing
     */
    private calculateGroupConfidence(results: PromiseSettledResult<StrategyExecutionResult>[]): number {
        const successful = results
            .filter(r => r.status === 'fulfilled' && r.value.success)
            .map(r => (r as PromiseFulfilledResult<StrategyExecutionResult>).value);

        if (successful.length === 0) return 0;

        const totalConfidence = successful.reduce((sum, result) => sum + result.result.confidence, 0);
        return totalConfidence / successful.length;
    }

    /**
     * Add a new strategy to the detector
     */
    addStrategy(config: StrategyConfiguration): void {
        this.strategies.push(config);
        logger.info('Strategy added to hybrid detector', {
            cms: this.cmsName,
            strategy: config.name,
            source: config.source
        });
    }

    /**
     * Enable or disable a strategy
     */
    setStrategyEnabled(strategyName: string, enabled: boolean): void {
        const strategy = this.strategies.find(s => s.name === strategyName);
        if (strategy) {
            strategy.enabled = enabled;
            logger.info('Strategy status changed', {
                cms: this.cmsName,
                strategy: strategyName,
                enabled
            });
        }
    }

    /**
     * Update strategy weight
     */
    setStrategyWeight(strategyName: string, weight: number): void {
        const strategy = this.strategies.find(s => s.name === strategyName);
        if (strategy) {
            strategy.weight = weight;
            logger.info('Strategy weight updated', {
                cms: this.cmsName,
                strategy: strategyName,
                weight
            });
        }
    }

    /**
     * Get strategy performance metrics
     */
    getStrategyMetrics(): StrategyMetrics[] {
        return this.strategies.map(config => ({
            name: config.name,
            source: config.source,
            weight: config.weight,
            enabled: config.enabled,
            confidence: config.confidence || 0,
            // Additional metrics would be tracked over time
            executionCount: 0,
            averageExecutionTime: 0,
            successRate: 0
        }));
    }
}

// Supporting interfaces
interface StrategyExecutionResult {
    config: StrategyConfiguration;
    result: PartialDetectionResult;
    executionTime: number;
    success: boolean;
}

interface StrategyMetrics {
    name: string;
    source: 'builtin' | 'generated';
    weight: number;
    enabled: boolean;
    confidence: number;
    executionCount: number;
    averageExecutionTime: number;
    successRate: number;
}

// Extend CMSDetectionResult to include hybrid metadata
declare module '../types.js' {
    interface CMSDetectionResult {
        hybridMetadata?: {
            strategiesExecuted: number;
            strategiesFailed: number;
            weightingScheme: string;
            generatedStrategies: number;
            builtinStrategies: number;
            evidenceCount: number;
        };
    }
}