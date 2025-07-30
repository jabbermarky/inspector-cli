/**
 * FrequencyAggregator - Phase 3 implementation
 * Coordinates all analyzers with unified data and consistent results
 */

import type {
    FrequencyAnalyzer,
    PreprocessedData,
    AnalysisOptions,
    AggregatedResults,
    FrequencySummary,
    PatternSummary,
    PlatformDiscriminationSummary,
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
import { createModuleLogger } from '../utils/logger.js';
import type { ProgressIndicator } from '../utils/progress-indicator.js';
import type { FrequencyOptions } from './types/frequency-types-v2.js';

const logger = createModuleLogger('frequency-aggregator');

export class FrequencyAggregator {
    private preprocessor: DataPreprocessor;
    private analyzers: Map<string, FrequencyAnalyzer<any>>;

    constructor(dataPath?: string) {
        this.preprocessor = new DataPreprocessor(dataPath);

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
    }

    /**
     * Run frequency analysis with all analyzers
     */
    async analyze(options: FrequencyOptions, progress?: ProgressIndicator): Promise<AggregatedResults> {
        logger.info('Starting aggregated frequency analysis', {
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

        return {
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

        // Get top discriminatory patterns
        const topDiscriminatoryPatterns = discriminatoryPatterns
            .sort((a, b) => b.platformDiscrimination.discriminativeScore - a.platformDiscrimination.discriminativeScore)
            .slice(0, 10)
            .map(pattern => ({
                pattern: pattern.pattern,
                discriminativeScore: pattern.platformDiscrimination.discriminativeScore,
                targetPlatform: pattern.platformDiscrimination.discriminationMetrics.targetPlatform,
                frequency: pattern.frequency
            }));

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
export function createFrequencyAggregator(dataPath?: string): FrequencyAggregator {
    return new FrequencyAggregator(dataPath);
}
