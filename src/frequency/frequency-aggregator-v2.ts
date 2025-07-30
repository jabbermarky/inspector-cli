/**
 * FrequencyAggregator - Phase 3 implementation
 * Coordinates all analyzers with unified data and consistent results
 */

import type {
    FrequencyAnalyzer,
    HybridFrequencyAnalyzer,
    AnalysisContext,
    PreprocessedData,
    AnalysisOptions,
    AggregatedResults,
    FrequencySummary,
    PatternSummary,
    PlatformDiscriminationSummary,
    PlatformSignature,
} from './types/analyzer-interface.js';
import { DataPreprocessor } from './data-preprocessor-v2.js';
import { HeaderAnalyzerV2 } from './analyzers/header-analyzer-v2.js';
import { MetaAnalyzerV2 } from './analyzers/meta-analyzer-v2.js';
import { ScriptAnalyzerV2 } from './analyzers/script-analyzer-v2.js';
import { ValidationPipelineV2Native } from './analyzers/validation-pipeline-v2-native.js';
import { SemanticAnalyzerV2 } from './analyzers/semantic-analyzer-v2.js';
import { VendorAnalyzerV2 } from './analyzers/vendor-analyzer-v2.js';
import { CooccurrenceAnalyzerV2 } from './analyzers/cooccurrence-analyzer-v2.js';
import { PatternDiscoveryV2 } from './analyzers/pattern-discovery-v2.js';
// Removed TechnologyAnalyzerV2 - redundant with script/vendor analyzers
import { BiasAnalyzerV2 } from './analyzers/bias-analyzer-v2.js';
import { PlatformSignatureAnalyzerV2, type PlatformSignatureSpecificData } from './analyzers/platform-signature-analyzer-v2.js';
import { createModuleLogger } from '../utils/logger.js';
import type { ProgressIndicator } from '../utils/progress-indicator.js';
import type { FrequencyOptions } from './types/frequency-types-v2.js';

const logger = createModuleLogger('frequency-aggregator');

export class FrequencyAggregator {
    private preprocessor: DataPreprocessor;
    private analyzers: Map<string, FrequencyAnalyzer<any>>;
    private useProgressivePipeline: boolean = true; // Phase 6: Enable progressive pipeline by default

    constructor(dataPath?: string, useProgressivePipeline: boolean = true) {
        this.preprocessor = new DataPreprocessor(dataPath);
        this.useProgressivePipeline = useProgressivePipeline;

        // Initialize analyzers in correct pipeline order
        this.analyzers = new Map();
        this.analyzers.set('headers', new HeaderAnalyzerV2());
        this.analyzers.set('metaTags', new MetaAnalyzerV2());
        this.analyzers.set('scripts', new ScriptAnalyzerV2());
        this.analyzers.set('validation', new ValidationPipelineV2Native()); // Native V2 validation with real statistics
        this.analyzers.set('semantic', new SemanticAnalyzerV2()); // After validation
        this.analyzers.set('vendor', new VendorAnalyzerV2()); // Before co-occurrence for dependency injection
        this.analyzers.set('discovery', new PatternDiscoveryV2()); // After vendor analysis for vendor data injection
        this.analyzers.set('cooccurrence', new CooccurrenceAnalyzerV2()); // After vendor analysis
        // Removed TechnologyAnalyzer - redundant with script/vendor analyzers
        this.analyzers.set('bias', new BiasAnalyzerV2()); // After all other analyzers for cross-analyzer bias analysis
        this.analyzers.set('platformSignatures', new PlatformSignatureAnalyzerV2()); // Phase 5: Cross-dimensional platform signatures
    }

    /**
     * Run frequency analysis with all analyzers
     */
    async analyze(options: FrequencyOptions, progress?: ProgressIndicator): Promise<AggregatedResults> {
        if (this.useProgressivePipeline) {
            return this.analyzeWithProgressivePipeline(options, progress);
        } else {
            return this.analyzeWithLegacyPipeline(options, progress);
        }
    }

    /**
     * Phase 6: Progressive analysis pipeline with clean data flow
     */
    private async analyzeWithProgressivePipeline(options: FrequencyOptions, progress?: ProgressIndicator): Promise<AggregatedResults> {
        logger.info('Starting progressive frequency analysis pipeline', {
            analyzers: Array.from(this.analyzers.keys()),
            minOccurrences: options.minOccurrences,
        });

        const startTime = Date.now();

        // Convert FrequencyOptions to internal format
        const analysisOptions: AnalysisOptions = {
            minOccurrences: options.minOccurrences || 10,
            includeExamples: true,
            maxExamples: 5,
            semanticFiltering: true,
            focusPlatformDiscrimination: options.focusPlatformDiscrimination || false,
        };

        // Load and preprocess data once
        progress?.updateStep('Loading data');
        const preprocessedData = await this.preprocessor.load({
            dateRange: options.dateRange
                ? {
                      start: options.dateRange.start
                          ? new Date(options.dateRange.start)
                          : undefined,
                      end: options.dateRange.end ? new Date(options.dateRange.end) : undefined,
                  }
                : undefined,
            forceReload: false,
        });

        logger.info(`Progressive pipeline analyzing ${preprocessedData.totalSites} unique sites`);

        // Initialize progressive context
        const context: AnalysisContext = {
            preprocessedData,
            options: analysisOptions,
            previousResults: {},
            pipelineStage: 0,
            totalStages: this.analyzers.size,
            stageTimings: new Map()
        };

        // Progressive pipeline execution
        const analyzerStages = [
            { key: 'headers', name: 'Analyzing headers', analyzer: this.analyzers.get('headers')! },
            { key: 'metaTags', name: 'Analyzing meta tags', analyzer: this.analyzers.get('metaTags')! },
            { key: 'scripts', name: 'Analyzing scripts', analyzer: this.analyzers.get('scripts')! },
            { key: 'validation', name: 'Running validation', analyzer: this.analyzers.get('validation')! },
            { key: 'semantic', name: 'Semantic analysis', analyzer: this.analyzers.get('semantic')! },
            { key: 'vendor', name: 'Analyzing vendors', analyzer: this.analyzers.get('vendor')! },
            { key: 'discovery', name: 'Pattern discovery', analyzer: this.analyzers.get('discovery')! },
            { key: 'cooccurrence', name: 'Co-occurrence analysis', analyzer: this.analyzers.get('cooccurrence')! },
            { key: 'bias', name: 'Bias analysis', analyzer: this.analyzers.get('bias')! },
        ];

        const results: any = {};

        for (const stage of analyzerStages) {
            const stageStart = Date.now();
            progress?.updateStep(stage.name);
            context.pipelineStage++;

            logger.info(`Progressive stage ${context.pipelineStage}/${context.totalStages}: ${stage.name}`);

            // Check if analyzer supports progressive context
            const hybridAnalyzer = stage.analyzer as HybridFrequencyAnalyzer<any>;
            let result;

            if (hybridAnalyzer.supportsProgressiveContext?.() && hybridAnalyzer.analyzeWithContext) {
                // Use progressive context
                result = await hybridAnalyzer.analyzeWithContext(context);
            } else {
                // Fall back to legacy method
                result = await stage.analyzer.analyze(preprocessedData, analysisOptions);
            }

            results[stage.key] = result;
            context.previousResults[stage.key as keyof typeof context.previousResults] = result;

            const stageDuration = Date.now() - stageStart;
            context.stageTimings.set(stage.key, stageDuration);

            logger.info(`Progressive stage completed: ${stage.name}`, {
                patterns: result.patterns.size,
                duration: stageDuration
            });
        }

        // Add platform signatures if enabled
        if (options.focusPlatformDiscrimination) {
            progress?.updateStep('Platform signatures');
            context.pipelineStage++;

            const platformAnalyzer = this.analyzers.get('platformSignatures')! as HybridFrequencyAnalyzer<any>;
            if (platformAnalyzer.supportsProgressiveContext?.() && platformAnalyzer.analyzeWithContext) {
                results.platformSignatures = await platformAnalyzer.analyzeWithContext(context);
            }
        }

        // Create summary
        const summary = this.createSummary(
            preprocessedData,
            results.headers,
            results.metaTags,
            results.scripts,
            options.focusPlatformDiscrimination
        );

        const duration = Date.now() - startTime;
        logger.info(`Progressive pipeline completed in ${duration}ms`, {
            stageTimings: Object.fromEntries(context.stageTimings)
        });

        const aggregatedResults: AggregatedResults = {
            headers: results.headers,
            metaTags: results.metaTags,
            scripts: results.scripts,
            validation: results.validation,
            semantic: results.semantic,
            vendor: results.vendor,
            discovery: results.discovery,
            cooccurrence: results.cooccurrence,
            correlations: results.bias,
            summary,
        };

        // Add platform signatures if available
        if (results.platformSignatures?.analyzerSpecific) {
            aggregatedResults.platformSignatures = Array.from(results.platformSignatures.analyzerSpecific.signatures.values());
            aggregatedResults.crossDimensionalAnalysis = results.platformSignatures;
        }

        return aggregatedResults;
    }

    /**
     * Legacy analysis pipeline with injection pattern (Phase 3-5 implementation)
     */
    private async analyzeWithLegacyPipeline(options: FrequencyOptions, progress?: ProgressIndicator): Promise<AggregatedResults> {
        logger.info('Starting legacy aggregated frequency analysis', {
            analyzers: Array.from(this.analyzers.keys()),
            minOccurrences: options.minOccurrences,
        });

        const startTime = Date.now();

        // Convert FrequencyOptions to internal format
        const analysisOptions: AnalysisOptions = {
            minOccurrences: options.minOccurrences || 10,
            includeExamples: true,
            maxExamples: 5,
            semanticFiltering: true,
            focusPlatformDiscrimination: options.focusPlatformDiscrimination || false,
        };

        // Load and preprocess data once
        progress?.updateStep('Loading data'); // Step 1: Data loading
        const preprocessedData = await this.preprocessor.load({
            dateRange: options.dateRange
                ? {
                      start: options.dateRange.start
                          ? new Date(options.dateRange.start)
                          : undefined,
                      end: options.dateRange.end ? new Date(options.dateRange.end) : undefined,
                  }
                : undefined,
            forceReload: false,
        });

        logger.info(`Analyzing ${preprocessedData.totalSites} unique sites`);

        // Debug: Check if we actually have data
        if (preprocessedData.sites.size === 0) {
            logger.warn('No sites loaded from preprocessor');
        } else {
            const firstSite = Array.from(preprocessedData.sites.values())[0];
            logger.info('Sample site data', {
                url: firstSite.url,
                headerCount: firstSite.headers.size,
                metaTagCount: firstSite.metaTags.size,
            });
        }

        // Phase 1: Run basic pattern analyzers
        logger.info('Running basic pattern analyzers');
        progress?.updateStep('Analyzing headers'); // Step 2: Headers
        const headerResult = await this.analyzers
            .get('headers')!
            .analyze(preprocessedData, analysisOptions);
        progress?.updateStep('Analyzing meta tags'); // Step 3: Meta tags
        const metaResult = await this.analyzers
            .get('metaTags')!
            .analyze(preprocessedData, analysisOptions);
        progress?.updateStep('Analyzing scripts'); // Step 4: Scripts
        const scriptResult = await this.analyzers
            .get('scripts')!
            .analyze(preprocessedData, analysisOptions);

        logger.info('Basic analyzers completed', {
            headerPatterns: headerResult.patterns.size,
            metaPatterns: metaResult.patterns.size,
            scriptPatterns: scriptResult.patterns.size,
        });

        // Phase 2: Run validation pipeline on basic results
        logger.info('Running validation pipeline');
        progress?.updateStep('Running validation'); // Step 5: Validation
        const validationResult = await this.analyzers
            .get('validation')!
            .analyze(preprocessedData, analysisOptions);

        logger.info('Validation completed', {
            validationPassed:
                validationResult.analyzerSpecific?.validationSummary?.overallPassed || false,
            qualityScore: validationResult.analyzerSpecific?.qualityMetrics?.overallScore || 0,
            validatedPatterns: validationResult.analyzerSpecific?.validatedPatterns?.size || 0,
        });

        // Phase 3: Run semantic analysis on validated data
        logger.info('Running semantic analysis on validated data');

        // Create enhanced data that includes validation results for semantic analysis
        const validatedData: PreprocessedData = {
            ...preprocessedData,
            // Add validation metadata that semantic analyzer can use
            metadata: {
                ...preprocessedData.metadata,
                validation: {
                    qualityScore:
                        validationResult.analyzerSpecific?.qualityMetrics?.overallScore || 0,
                    validationPassed:
                        validationResult.analyzerSpecific?.validationSummary?.overallPassed ||
                        false,
                    validatedHeaders: validationResult.analyzerSpecific?.validatedPatterns,
                    statisticallySignificantHeaders:
                        validationResult.analyzerSpecific?.statisticalMetrics
                            ?.significantPatterns || 0,
                },
            },
        };

        // Phase 4: Run vendor analysis on validated data
        logger.info('Running vendor analysis on validated data');
        progress?.updateStep('Analyzing vendors'); // Step 6: Vendor analysis
        const vendorResult = await this.analyzers
            .get('vendor')!
            .analyze(validatedData, analysisOptions);

        logger.info('Vendor analysis completed', {
            vendorsDetected: vendorResult.analyzerSpecific?.summary?.totalVendorsDetected || 0,
            highConfidenceVendors:
                vendorResult.analyzerSpecific?.summary?.highConfidenceVendors || 0,
            technologyCategories:
                vendorResult.analyzerSpecific?.summary?.technologyCategories?.length || 0,
        });

        // Phase 4.5: Run semantic analysis with vendor data injection
        logger.info('Running semantic analysis with vendor data');

        // Inject vendor data into semantic analyzer for V1 dependency removal
        const semanticAnalyzer = this.analyzers.get('semantic')! as any;
        if (semanticAnalyzer.setVendorData && vendorResult.analyzerSpecific) {
            semanticAnalyzer.setVendorData(vendorResult.analyzerSpecific);
            logger.info('Injected vendor data into semantic analyzer');
        }

        progress?.updateStep('Semantic analysis'); // Step 7: Semantic analysis
        const semanticResult = await semanticAnalyzer.analyze(validatedData, analysisOptions);

        // Phase 5: Run pattern discovery analysis with vendor data injection
        logger.info('Running pattern discovery analysis with vendor data');

        // Inject vendor data into pattern discovery analyzer for V1 dependency removal
        const discoveryAnalyzer = this.analyzers.get('discovery')! as any;
        if (discoveryAnalyzer.setVendorData && vendorResult.analyzerSpecific) {
            discoveryAnalyzer.setVendorData(vendorResult.analyzerSpecific);
            logger.info('Injected vendor data into pattern discovery analyzer');
        }

        progress?.updateStep('Pattern discovery'); // Step 8: Pattern discovery
        const discoveryResult = await discoveryAnalyzer.analyze(validatedData, analysisOptions);

        logger.info('Pattern discovery completed', {
            discoveredPatterns: discoveryResult.analyzerSpecific?.discoveredPatterns?.size || 0,
            emergingVendors: discoveryResult.analyzerSpecific?.emergingVendors?.size || 0,
            anomaliesDetected: discoveryResult.analyzerSpecific?.semanticAnomalies?.length || 0,
        });

        // Phase 6: Run co-occurrence analysis on validated data with vendor context
        logger.info('Running co-occurrence analysis on validated data');

        // Inject vendor data into co-occurrence analyzer for V1 dependency removal
        const cooccurrenceAnalyzer = this.analyzers.get('cooccurrence')! as any;
        if (cooccurrenceAnalyzer.setVendorData && vendorResult.analyzerSpecific) {
            cooccurrenceAnalyzer.setVendorData(vendorResult.analyzerSpecific);
            logger.info('Injected vendor data into co-occurrence analyzer');
        }

        progress?.updateStep('Co-occurrence analysis'); // Step 9: Co-occurrence analysis
        const cooccurrenceResult = await cooccurrenceAnalyzer.analyze(
            validatedData,
            analysisOptions
        );

        // Removed Phase 7: Technology analysis - redundant with script/vendor analyzers

        // Phase 7: Run bias analysis with cross-analyzer data injection
        logger.info('Running bias analysis with cross-analyzer data');
        const biasAnalyzer = this.analyzers.get('bias')! as BiasAnalyzerV2;

        // Inject dependency data for enhanced bias analysis
        if (biasAnalyzer.setVendorData && vendorResult.analyzerSpecific) {
            biasAnalyzer.setVendorData(vendorResult.analyzerSpecific);
            logger.info('Injected vendor data into bias analyzer');
        }
        if (biasAnalyzer.setSemanticData && semanticResult.analyzerSpecific) {
            biasAnalyzer.setSemanticData(semanticResult.analyzerSpecific);
            logger.info('Injected semantic data into bias analyzer');
        }
        if (biasAnalyzer.setPatternDiscoveryData && discoveryResult.analyzerSpecific) {
            biasAnalyzer.setPatternDiscoveryData(discoveryResult.analyzerSpecific);
            logger.info('Injected pattern discovery data into bias analyzer');
        }

        progress?.updateStep('Bias analysis'); // Step 10: Bias analysis
        const biasResult = await biasAnalyzer.analyze(validatedData, analysisOptions);

        logger.info('Bias analysis completed', {
            headerCorrelations: biasResult.analyzerSpecific?.headerCorrelations?.size || 0,
            biasWarnings: biasResult.analyzerSpecific?.biasWarnings?.length || 0,
            concentrationScore: biasResult.analyzerSpecific?.concentrationMetrics?.herfindahlIndex || 0,
            overallBiasRisk: biasResult.analyzerSpecific?.concentrationMetrics?.overallBiasRisk || 'unknown',
        });

        // Phase 5: Run cross-dimensional platform signature analysis (Phase 5)
        let platformSignatureResult: any = null;
        if (options.focusPlatformDiscrimination) {
            logger.info('Running cross-dimensional platform signature analysis');
            progress?.updateStep('Platform signatures'); // Step 11: Platform signatures
            
            // Create aggregated results for platform signature analyzer
            const aggregatedResults = {
                headers: headerResult,
                metaTags: metaResult,
                scripts: scriptResult,
                validation: validationResult,
                semantic: semanticResult,
                vendor: vendorResult,
                discovery: discoveryResult,
                cooccurrence: cooccurrenceResult,
                correlations: biasResult,
                summary: {} as any // Will be created later
            };

            // Use dependency injection for legacy platform signature analyzer
            const platformAnalyzer = this.analyzers.get('platformSignatures')! as any;
            if (platformAnalyzer.setAggregatedResults) {
                platformAnalyzer.setAggregatedResults(aggregatedResults);
            }
            platformSignatureResult = await platformAnalyzer.analyze(validatedData, analysisOptions);

            logger.info('Platform signature analysis completed', {
                signaturesGenerated: platformSignatureResult.analyzerSpecific?.signatures?.size || 0,
                totalPlatformsDetected: platformSignatureResult.analyzerSpecific?.crossDimensionalMetrics?.totalPlatformsDetected || 0,
                multiDimensionalDetections: platformSignatureResult.analyzerSpecific?.crossDimensionalMetrics?.multiDimensionalDetections || 0,
            });
        }

        logger.info('All analyzers completed', {
            headerPatterns: headerResult.patterns.size,
            metaPatterns: metaResult.patterns.size,
            scriptPatterns: scriptResult.patterns.size,
            validationPatterns: validationResult.patterns.size,
            semanticPatterns: semanticResult.patterns.size,
            vendorPatterns: vendorResult.patterns.size,
            discoveryPatterns: discoveryResult.patterns.size,
            cooccurrencePatterns: cooccurrenceResult.patterns.size,
            biasCorrelations: biasResult.analyzerSpecific?.headerCorrelations?.size || 0,
        });

        // Create summary with platform discrimination analysis
        const summary = this.createSummary(
            preprocessedData,
            headerResult,
            metaResult,
            scriptResult,
            options.focusPlatformDiscrimination
        );

        const duration = Date.now() - startTime;
        logger.info(`Aggregated analysis completed in ${duration}ms`);

        const aggregatedResults: AggregatedResults = {
            headers: headerResult,
            metaTags: metaResult,
            scripts: scriptResult,
            validation: validationResult,
            semantic: semanticResult,
            vendor: vendorResult,
            discovery: discoveryResult,
            cooccurrence: cooccurrenceResult,
            // Removed technologies result - redundant with script/vendor analyzers
            correlations: biasResult,
            summary,
        };

        // Add Phase 5: Cross-dimensional platform signatures if available
        if (platformSignatureResult && platformSignatureResult.analyzerSpecific) {
            aggregatedResults.platformSignatures = Array.from(platformSignatureResult.analyzerSpecific.signatures.values());
            aggregatedResults.crossDimensionalAnalysis = platformSignatureResult;
        }

        return aggregatedResults;
    }

    /**
     * Create summary of analysis results
     */
    private createSummary(
        data: PreprocessedData,
        headerResult: any,
        metaResult: any,
        scriptResult: any,
        focusPlatformDiscrimination?: boolean
    ): FrequencySummary {
        const topN = 10;

        // Get top patterns from each analyzer
        const topHeaders = this.getTopPatterns(headerResult, topN);
        const topMeta = this.getTopPatterns(metaResult, topN);
        const topScripts = this.getTopPatterns(scriptResult, topN);
        const topTech: PatternSummary[] = []; // TODO: Implement when tech analyzer is ready

        const summary: FrequencySummary = {
            totalSitesAnalyzed: data.totalSites,
            totalPatternsFound:
                headerResult.metadata.totalPatternsFound +
                metaResult.metadata.totalPatternsFound +
                (scriptResult?.metadata.totalPatternsFound || 0),
            analysisDate: new Date().toISOString(),
            filteringStats: data.filteringStats,
            topPatterns: {
                headers: topHeaders,
                metaTags: topMeta,
                scripts: topScripts,
                technologies: topTech,
            },
        };

        // Add platform discrimination summary if enabled
        if (focusPlatformDiscrimination) {
            summary.platformDiscrimination = this.generatePlatformDiscriminationSummary(
                headerResult,
                metaResult,
                scriptResult
            );
        }

        return summary;
    }

    /**
     * Generate platform discrimination summary from analysis results
     */
    private generatePlatformDiscriminationSummary(
        headerResult: any,
        metaResult: any,
        scriptResult: any
    ): PlatformDiscriminationSummary {
        const allPatterns = new Map<string, any>();
        
        // Collect all patterns with platform discrimination data
        if (headerResult?.patterns) {
            for (const [key, pattern] of headerResult.patterns) {
                if (pattern.platformDiscrimination) {
                    allPatterns.set(`header:${key}`, pattern);
                }
            }
        }
        if (metaResult?.patterns) {
            for (const [key, pattern] of metaResult.patterns) {
                if (pattern.platformDiscrimination) {
                    allPatterns.set(`meta:${key}`, pattern);
                }
            }
        }
        if (scriptResult?.patterns) {
            for (const [key, pattern] of scriptResult.patterns) {
                if (pattern.platformDiscrimination) {
                    allPatterns.set(`script:${key}`, pattern);
                }
            }
        }

        // If no patterns have platform discrimination data, return empty summary
        if (allPatterns.size === 0) {
            return {
                enabled: true,
                totalPatternsAnalyzed: 0,
                discriminatoryPatterns: 0,
                infrastructureNoiseFiltered: 0,
                averageDiscriminationScore: 0,
                noiseReductionPercentage: 0,
                topDiscriminatoryPatterns: [],
                platformSpecificityDistribution: new Map(),
                qualityMetrics: {
                    signalToNoiseRatio: 0,
                    platformCoverageScore: 0,
                    detectionConfidenceBoost: 0,
                }
            };
        }

        const totalPatternsAnalyzed = allPatterns.size;
        const discriminatoryPatterns = Array.from(allPatterns.values()).filter(
            pattern => pattern.platformDiscrimination.discriminativeScore > 0.3
        );
        const infrastructureNoise = Array.from(allPatterns.values()).filter(
            pattern => pattern.platformDiscrimination.discriminationMetrics.isInfrastructureNoise
        );

        const avgDiscriminationScore = totalPatternsAnalyzed > 0 
            ? Array.from(allPatterns.values())
                .reduce((sum, pattern) => sum + pattern.platformDiscrimination.discriminativeScore, 0) / totalPatternsAnalyzed
            : 0;

        const noiseReductionPercentage = totalPatternsAnalyzed > 0 
            ? (infrastructureNoise.length / totalPatternsAnalyzed) * 100
            : 0;

        // Get top discriminatory patterns - preserve the full key with dimension prefix
        const sortedPatterns = Array.from(allPatterns.entries())
            .filter(([key, pattern]) => pattern.platformDiscrimination.discriminativeScore > 0.1) // Lower threshold from 0.3 to 0.1
            .sort(([,a], [,b]) => b.platformDiscrimination.discriminativeScore - a.platformDiscrimination.discriminativeScore);

        const topDiscriminatoryPatterns = sortedPatterns
            .slice(0, 25) // Show top 25 instead of just 10
            .map(([fullKey, pattern]) => {
                // Determine dimension and clean pattern name
                let dimension = 'Unknown';
                let cleanPattern = fullKey;
                
                if (fullKey.startsWith('header:')) {
                    dimension = 'Header';
                    cleanPattern = fullKey.replace('header:', '');
                } else if (fullKey.startsWith('meta:')) {
                    dimension = 'Meta';
                    cleanPattern = fullKey.replace('meta:', '');
                } else if (fullKey.startsWith('script:')) {
                    dimension = 'Script';
                    cleanPattern = fullKey.replace('script:', '');
                }
                
                return {
                    pattern: cleanPattern, // Clean pattern without prefix
                    fullPattern: fullKey, // Keep full key for debugging
                    dimension: dimension, // Explicit dimension
                    discriminativeScore: pattern.platformDiscrimination.discriminativeScore,
                    targetPlatform: pattern.platformDiscrimination.discriminationMetrics.targetPlatform,
                    frequency: pattern.frequency
                };
            });

        // Calculate platform specificity distribution
        const platformSpecificityDistribution = new Map<string, number>();
        for (const pattern of allPatterns.values()) {
            for (const [platform, specificity] of pattern.platformDiscrimination.platformSpecificity) {
                if (specificity > 0.7) { // High specificity threshold
                    platformSpecificityDistribution.set(
                        platform, 
                        (platformSpecificityDistribution.get(platform) || 0) + 1
                    );
                }
            }
        }

        // Calculate quality metrics
        const signalToNoiseRatio = infrastructureNoise.length > 0 
            ? discriminatoryPatterns.length / infrastructureNoise.length 
            : discriminatoryPatterns.length;

        const platformCoverageScore = platformSpecificityDistribution.size / 3; // Assuming 3 main platforms (WordPress, Shopify, Drupal)
        
        const detectionConfidenceBoost = avgDiscriminationScore * 0.5; // Estimated confidence boost from discrimination

        return {
            enabled: true,
            totalPatternsAnalyzed,
            discriminatoryPatterns: discriminatoryPatterns.length,
            infrastructureNoiseFiltered: infrastructureNoise.length,
            averageDiscriminationScore: Math.round(avgDiscriminationScore * 1000) / 1000,
            noiseReductionPercentage: Math.round(noiseReductionPercentage * 100) / 100,
            topDiscriminatoryPatterns,
            platformSpecificityDistribution,
            qualityMetrics: {
                signalToNoiseRatio: Math.round(signalToNoiseRatio * 100) / 100,
                platformCoverageScore: Math.round(platformCoverageScore * 100) / 100,
                detectionConfidenceBoost: Math.round(detectionConfidenceBoost * 1000) / 1000,
            }
        };
    }

    /**
     * Get top N patterns from analysis result
     */
    private getTopPatterns(result: any, n: number): PatternSummary[] {
        if (!result?.patterns) return [];

        return Array.from(result.patterns.values())
            .slice(0, n)
            .map((pattern: any) => ({
                pattern: pattern.pattern,
                siteCount: pattern.siteCount,
                frequency: pattern.frequency,
            }));
    }

    /**
     * Clear preprocessor cache
     */
    clearCache(): void {
        this.preprocessor.clearCache();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { entries: number; keys: string[] } {
        return this.preprocessor.getCacheStats();
    }
}

// Factory function for backward compatibility
export function createFrequencyAggregator(dataPath?: string, useProgressivePipeline?: boolean): FrequencyAggregator {
    return new FrequencyAggregator(dataPath, useProgressivePipeline);
}
