/**
 * ValidationPipelineV2 Native Implementation
 *
 * Pure V2 implementation with no V1 dependencies. Provides comprehensive
 * validation of frequency analysis data with enhanced quality metrics,
 * statistical testing, and actionable recommendations.
 *
 * Architecture: Native V2 data flow with staged validation pipeline
 */

import type {
    FrequencyAnalyzer,
    PreprocessedData,
    AnalysisOptions,
    AnalysisResult,
    PatternData,
} from '../types/analyzer-interface.js';
import { createModuleLogger } from '../../utils/logger.js';
import {
    FrequencyValidationStage,
    SampleSizeValidationStage,
    DistributionValidationStage,
    CorrelationValidationStage,
    SanityValidationStage,
    SignificanceValidationStage,
    RecommendationValidationStage,
} from './validation-stages-v2.js';
import { StatisticalUtils } from './statistical-utils-v2.js';
import type {
    ChiSquareResult,
    SignificanceTestResult,
    PowerAnalysisResult,
} from './statistical-utils-v2.js';

const logger = createModuleLogger('validation-pipeline-v2-native');

/**
 * Individual validation stage interface
 */
export interface ValidationStage {
    name: string;
    description: string;
    validate(
        data: PreprocessedData,
        options: AnalysisOptions,
        context: ValidationContext
    ): Promise<ValidationStageResult>;
}

/**
 * Result from individual validation stage
 */
export interface ValidationStageResult {
    stageName: string;
    passed: boolean;
    score: number; // 0-1
    patternsValidated: number;
    patternsFiltered: number;
    warnings: ValidationWarning[];
    errors: ValidationError[];
    metrics: Record<string, number>;
    recommendations: ValidationRecommendation[];
    enhancedData?: Partial<PreprocessedData>; // Stage-specific data enhancements
}

/**
 * Validation context passed between stages
 */
export interface ValidationContext {
    originalData: PreprocessedData;
    stageResults: ValidationStageResult[];
    accumulatedScore: number;
    validatedPatterns: Map<string, PatternData>;
    flaggedPatterns: Map<string, ValidationFlag>;
    qualityMetrics: QualityMetrics;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
    type: 'statistical' | 'data_quality' | 'pattern_consistency' | 'correlation';
    severity: 'low' | 'medium' | 'high';
    message: string;
    affectedPatterns: string[];
    suggestedAction?: string;
}

/**
 * Validation error
 */
export interface ValidationError {
    type: 'critical_failure' | 'data_corruption' | 'mathematical_inconsistency' | 'data_quality';
    message: string;
    affectedData: string[];
    recoverable: boolean;
}

/**
 * Validation flag for patterns
 */
export interface ValidationFlag {
    flagType: 'low_confidence' | 'statistical_concern' | 'outlier' | 'inconsistent';
    severity: 'info' | 'warning' | 'error';
    reason: string;
    confidence: number;
    metadata: Record<string, any>;
}

/**
 * Validation recommendation
 */
export interface ValidationRecommendation {
    type: 'data_quality' | 'statistical' | 'pattern' | 'correlation' | 'methodology';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    actionableSteps: string[];
    expectedImpact: string;
    confidence: number;
    priority: number; // 1-10
}

/**
 * Quality metrics system
 */
export interface QualityMetrics {
    overallScore: number; // 0-1 composite score
    dataCompleteness: number; // % of expected data present
    statisticalReliability: number; // Statistical confidence
    patternConsistency: number; // Internal consistency
    correlationStrength: number; // CMS correlation quality
    recommendationAccuracy: number; // Recommendation confidence
    sampleAdequacy: number; // Sample size adequacy
    distributionHealth: number; // Distribution quality
}

/**
 * Statistical validation metrics
 */
export interface StatisticalValidationMetrics {
    chiSquareTests: ChiSquareResult[];
    correlationTests: CorrelationTestResult[];
    significanceTests: SignificanceTestResult[];
    confidenceIntervals: ConfidenceInterval[];
    powerAnalysis: PowerAnalysisResult;
}

// ChiSquareResult imported from statistical-utils.ts

/**
 * Correlation test result
 */
export interface CorrelationTestResult {
    pattern1: string;
    pattern2: string;
    correlation: number;
    pValue: number;
    significant: boolean;
    confidenceInterval: [number, number];
}

// SignificanceTestResult imported from statistical-utils.ts

/**
 * Confidence interval
 */
export interface ConfidenceInterval {
    parameter: string;
    estimate: number;
    lowerBound: number;
    upperBound: number;
    confidenceLevel: number;
}

// PowerAnalysisResult imported from statistical-utils.ts

/**
 * Validation-specific data for analyzer
 */
export interface ValidationSpecificData {
    stageResults: ValidationStageResult[];
    qualityMetrics: QualityMetrics;
    statisticalMetrics: StatisticalValidationMetrics;
    validatedPatterns: Map<string, PatternData>;
    flaggedPatterns: Map<string, ValidationFlag>;
    recommendations: ValidationRecommendation[];
    validationSummary: {
        totalStages: number;
        stagesPassed: number;
        stagesFailed: number;
        overallPassed: boolean;
        qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
        improvementSuggestions: string[];
    };
}

/**
 * Native V2 ValidationPipelineV2 implementation
 */
export class ValidationPipelineV2Native implements FrequencyAnalyzer<ValidationSpecificData> {
    private stages: ValidationStage[];

    constructor() {
        this.stages = [
            new FrequencyValidationStage(),
            new SampleSizeValidationStage(),
            new DistributionValidationStage(),
            new CorrelationValidationStage(),
            new SanityValidationStage(),
            new SignificanceValidationStage(),
            new RecommendationValidationStage(),
        ];
    }

    getName(): string {
        return 'ValidationPipelineV2Native';
    }

    async analyze(
        data: PreprocessedData,
        options: AnalysisOptions
    ): Promise<AnalysisResult<ValidationSpecificData>> {
        logger.info('Starting native V2 validation pipeline', {
            totalSites: data.totalSites,
            stages: this.stages.length,
            minOccurrences: options.minOccurrences,
        });

        const startTime = Date.now();

        // Initialize validation context
        const context: ValidationContext = {
            originalData: data,
            stageResults: [],
            accumulatedScore: 1.0,
            validatedPatterns: new Map(),
            flaggedPatterns: new Map(),
            qualityMetrics: this.initializeQualityMetrics(),
        };

        // Extract initial patterns from data (basic patterns from headers, meta, scripts)
        const initialPatterns = this.extractInitialPatterns(data);
        context.validatedPatterns = new Map(initialPatterns);

        // Run validation stages sequentially
        for (const stage of this.stages) {
            logger.info(`Running validation stage: ${stage.name}`);

            try {
                const stageResult = await stage.validate(data, options, context);
                context.stageResults.push(stageResult);

                // Update context based on stage result
                if (stageResult.passed) {
                    context.accumulatedScore *= stageResult.score;
                } else {
                    context.accumulatedScore *= 0.5; // Penalty for failed stage
                }

                // Apply stage enhancements to data
                if (stageResult.enhancedData) {
                    this.applyStageEnhancements(data, stageResult.enhancedData);
                }

                logger.info(`Stage ${stage.name} completed`, {
                    passed: stageResult.passed,
                    score: stageResult.score,
                    warnings: stageResult.warnings.length,
                    errors: stageResult.errors.length,
                });
            } catch (error) {
                logger.error(`Stage ${stage.name} failed with error`, { error });

                // Create error stage result
                const errorResult: ValidationStageResult = {
                    stageName: stage.name,
                    passed: false,
                    score: 0,
                    patternsValidated: 0,
                    patternsFiltered: 0,
                    warnings: [],
                    errors: [
                        {
                            type: 'critical_failure',
                            message: `Stage failed: ${error}`,
                            affectedData: ['entire_dataset'],
                            recoverable: false,
                        },
                    ],
                    metrics: {},
                    recommendations: [],
                };

                context.stageResults.push(errorResult);
                context.accumulatedScore *= 0.1; // Severe penalty for stage error
            }
        }

        // Calculate final quality metrics
        const finalQualityMetrics = this.calculateFinalQualityMetrics(context);

        // Generate statistical validation metrics
        const statisticalMetrics = this.generateStatisticalMetrics(context);

        // Compile all recommendations
        const allRecommendations = this.compileRecommendations(context);

        // Create validation summary
        const validationSummary = this.createValidationSummary(context, finalQualityMetrics);

        // Create V2 patterns for interface compatibility
        const patterns = this.createValidationPatterns(context, options);

        const analyzerSpecific: ValidationSpecificData = {
            stageResults: context.stageResults,
            qualityMetrics: finalQualityMetrics,
            statisticalMetrics,
            validatedPatterns: context.validatedPatterns,
            flaggedPatterns: context.flaggedPatterns,
            recommendations: allRecommendations,
            validationSummary,
        };

        const duration = Date.now() - startTime;
        logger.info('Native V2 validation pipeline completed', {
            duration,
            overallPassed: validationSummary.overallPassed,
            qualityScore: finalQualityMetrics.overallScore,
            validatedPatterns: context.validatedPatterns.size,
        });

        return {
            patterns,
            totalSites: data.totalSites,
            metadata: {
                analyzer: 'ValidationPipelineV2Native',
                analyzedAt: new Date().toISOString(),
                totalPatternsFound: patterns.size,
                totalPatternsAfterFiltering: context.validatedPatterns.size,
                options,
            },
            analyzerSpecific,
        };
    }

    /**
     * Initialize quality metrics with baseline values
     */
    private initializeQualityMetrics(): QualityMetrics {
        return {
            overallScore: 1.0,
            dataCompleteness: 1.0,
            statisticalReliability: 1.0,
            patternConsistency: 1.0,
            correlationStrength: 1.0,
            recommendationAccuracy: 1.0,
            sampleAdequacy: 1.0,
            distributionHealth: 1.0,
        };
    }

    /**
     * Extract initial patterns from preprocessed data
     */
    private extractInitialPatterns(data: PreprocessedData): Map<string, PatternData> {
        const patterns = new Map<string, PatternData>();

        // Extract header patterns
        const headerFrequency = new Map<string, Set<string>>();
        for (const [siteUrl, siteData] of data.sites) {
            for (const [headerName, _] of siteData.headers) {
                const lowerHeader = headerName.toLowerCase();
                if (!headerFrequency.has(lowerHeader)) {
                    headerFrequency.set(lowerHeader, new Set());
                }
                headerFrequency.get(lowerHeader)!.add(siteUrl);
            }
        }

        // Convert to pattern format
        for (const [header, sites] of headerFrequency) {
            const siteCount = sites.size;
            const frequency = siteCount / data.totalSites;

            patterns.set(`header:${header}`, {
                pattern: header,
                siteCount,
                sites,
                frequency,
                metadata: {
                    type: 'header',
                    source: 'validation_extraction',
                },
            });
        }

        return patterns;
    }

    /**
     * Apply stage enhancements to preprocessed data
     */
    private applyStageEnhancements(
        data: PreprocessedData,
        enhancements: Partial<PreprocessedData>
    ): void {
        if (enhancements.metadata) {
            data.metadata = { ...data.metadata, ...enhancements.metadata };
        }
    }

    /**
     * Calculate final quality metrics from all stage results
     */
    private calculateFinalQualityMetrics(context: ValidationContext): QualityMetrics {
        const metrics = { ...context.qualityMetrics };

        // Update overall score based on accumulated score
        metrics.overallScore = Math.max(0, context.accumulatedScore);

        // Calculate component scores from stage results
        const stageScores = context.stageResults.map(r => r.score);
        if (stageScores.length > 0) {
            metrics.dataCompleteness = this.calculateComponentScore(
                context.stageResults,
                'data_completeness'
            );
            metrics.statisticalReliability = this.calculateComponentScore(
                context.stageResults,
                'statistical_reliability'
            );
            metrics.patternConsistency = this.calculateComponentScore(
                context.stageResults,
                'pattern_consistency'
            );
            metrics.correlationStrength = this.calculateComponentScore(
                context.stageResults,
                'correlation_strength'
            );
            metrics.sampleAdequacy = this.calculateComponentScore(
                context.stageResults,
                'sample_adequacy'
            );
            metrics.distributionHealth = this.calculateComponentScore(
                context.stageResults,
                'distribution_health'
            );
        }

        return metrics;
    }

    /**
     * Calculate component score from stage results
     */
    private calculateComponentScore(
        stageResults: ValidationStageResult[],
        component: string
    ): number {
        const relevantStages = stageResults.filter(r => r.metrics[component] !== undefined);
        if (relevantStages.length === 0) return 1.0;

        const scores = relevantStages.map(r => r.metrics[component]);
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    /**
     * Generate statistical validation metrics
     */
    private generateStatisticalMetrics(context: ValidationContext): StatisticalValidationMetrics {
        return {
            chiSquareTests: this.performChiSquareTests(context),
            correlationTests: this.performCorrelationTests(context),
            significanceTests: this.performSignificanceTests(context),
            confidenceIntervals: this.calculateConfidenceIntervals(context),
            powerAnalysis: this.performPowerAnalysis(context),
        };
    }

    /**
     * Perform chi-square tests for pattern independence
     */
    private performChiSquareTests(context: ValidationContext): ChiSquareResult[] {
        const results: ChiSquareResult[] = [];

        // Group patterns by CMS to test independence
        const patternsByCms = new Map<string, string[]>();

        for (const [_, siteData] of context.originalData.sites) {
            const cms = siteData.cms || 'Unknown';
            if (!patternsByCms.has(cms)) {
                patternsByCms.set(cms, []);
            }

            // Check which patterns this site has
            for (const [patternKey, pattern] of context.validatedPatterns) {
                if (pattern.sites.has(siteData.url)) {
                    patternsByCms.get(cms)!.push(pattern.pattern);
                }
            }
        }

        // Perform chi-square test if we have enough data
        if (patternsByCms.size >= 2 && context.validatedPatterns.size >= 2) {
            // Create contingency table for top 2 patterns and top 2 CMS
            const topPatterns = Array.from(context.validatedPatterns.values())
                .sort((a, b) => b.siteCount - a.siteCount)
                .slice(0, 2);

            const topCms = Array.from(patternsByCms.entries())
                .sort((a, b) => b[1].length - a[1].length)
                .slice(0, 2);

            if (topPatterns.length === 2 && topCms.length === 2) {
                // Build 2x2 contingency table
                const contingencyTable = [
                    [0, 0],
                    [0, 0],
                ];

                for (const [_, siteData] of context.originalData.sites) {
                    const cms = siteData.cms || 'Unknown';
                    const cmsIndex = cms === topCms[0][0] ? 0 : cms === topCms[1][0] ? 1 : -1;

                    if (cmsIndex >= 0) {
                        const hasPattern0 = topPatterns[0].sites.has(siteData.url) ? 0 : 1;
                        contingencyTable[hasPattern0][cmsIndex]++;
                    }
                }

                // Validate contingency table before testing
                const total = contingencyTable.flat().reduce((sum, val) => sum + val, 0);
                if (total > 0 && contingencyTable.every(row => row.some(val => val > 0))) {
                    const chiSquareResult =
                        StatisticalUtils.ChiSquare.chiSquareTest(contingencyTable);

                    // Only add result if calculations are valid
                    if (
                        Number.isFinite(chiSquareResult.statistic) &&
                        Number.isFinite(chiSquareResult.pValue)
                    ) {
                        results.push({
                            statistic: chiSquareResult.statistic,
                            pValue: chiSquareResult.pValue,
                            degreesOfFreedom: chiSquareResult.degreesOfFreedom,
                            isSignificant: chiSquareResult.isSignificant,
                            criticalValue: chiSquareResult.criticalValue || 0,
                            observed: chiSquareResult.observed || [],
                            expected: chiSquareResult.expected || [],
                            yatesCorrection: chiSquareResult.yatesCorrection || false,
                        });
                    }
                }
            }
        }

        return results;
    }

    /**
     * Perform correlation tests between patterns
     */
    private performCorrelationTests(context: ValidationContext): CorrelationTestResult[] {
        const results: CorrelationTestResult[] = [];
        const patterns = Array.from(context.validatedPatterns.values());

        // Test correlations between top patterns
        for (let i = 0; i < Math.min(patterns.length, 5); i++) {
            for (let j = i + 1; j < Math.min(patterns.length, 5); j++) {
                const pattern1 = patterns[i];
                const pattern2 = patterns[j];

                // Calculate co-occurrence
                const intersection = new Set(
                    [...pattern1.sites].filter(site => pattern2.sites.has(site))
                );
                const union = new Set([...pattern1.sites, ...pattern2.sites]);

                const correlation =
                    intersection.size / Math.sqrt(pattern1.sites.size * pattern2.sites.size);

                // Create contingency table for significance test
                const a = intersection.size; // Both patterns
                const b = pattern1.sites.size - a; // Pattern 1 only
                const c = pattern2.sites.size - a; // Pattern 2 only
                const d = context.originalData.totalSites - a - b - c; // Neither pattern

                const contingencyTable = [
                    [a, b],
                    [c, d],
                ];
                const testResult = StatisticalUtils.TestSelector.selectAndRunTest(
                    contingencyTable,
                    `${pattern1.pattern}_vs_${pattern2.pattern}`
                );

                results.push({
                    pattern1: pattern1.pattern,
                    pattern2: pattern2.pattern,
                    correlation,
                    pValue: testResult.result?.pValue || 1.0,
                    significant: testResult.result?.isSignificant || false,
                    confidenceInterval: [
                        Math.max(0, correlation - 0.1),
                        Math.min(1, correlation + 0.1),
                    ],
                });
            }
        }

        return results;
    }

    /**
     * Perform significance tests for individual patterns
     */
    private performSignificanceTests(context: ValidationContext): SignificanceTestResult[] {
        const results: SignificanceTestResult[] = [];

        for (const [_, pattern] of context.validatedPatterns) {
            // Test if pattern frequency is significantly different from baseline
            const baselineRate = 0.05; // 5% baseline expectation

            const binomialResult = StatisticalUtils.Binomial.binomialTest(
                pattern.siteCount,
                context.originalData.totalSites,
                baselineRate
            );

            results.push({
                method: 'binomial',
                result: binomialResult,
                recommendation: binomialResult.isSignificant ? 'use' : 'caution',
                reason: binomialResult.isSignificant
                    ? 'Pattern shows significant frequency'
                    : 'Pattern frequency not significant',
            });
        }

        return results;
    }

    /**
     * Calculate confidence intervals for key metrics
     */
    private calculateConfidenceIntervals(context: ValidationContext): ConfidenceInterval[] {
        return [
            {
                parameter: 'overall_quality',
                estimate: context.qualityMetrics.overallScore,
                lowerBound: Math.max(0, context.qualityMetrics.overallScore - 0.1),
                upperBound: Math.min(1, context.qualityMetrics.overallScore + 0.1),
                confidenceLevel: 0.95,
            },
        ];
    }

    /**
     * Perform power analysis for sample adequacy
     */
    private performPowerAnalysis(context: ValidationContext): PowerAnalysisResult {
        const totalSites = context.originalData.totalSites;

        // Calculate minimum detectable effect based on observed patterns
        const frequencies = Array.from(context.validatedPatterns.values()).map(p => p.frequency);
        const minFrequency = frequencies.length > 0 ? Math.min(...frequencies) : 0.1;

        return StatisticalUtils.PowerAnalysis.calculateStatisticalPower(totalSites, minFrequency);
    }

    /**
     * Compile recommendations from all stages
     */
    private compileRecommendations(context: ValidationContext): ValidationRecommendation[] {
        const recommendations: ValidationRecommendation[] = [];

        for (const stageResult of context.stageResults) {
            recommendations.push(...stageResult.recommendations);
        }

        // Sort by priority and confidence
        return recommendations.sort(
            (a, b) => b.priority - a.priority || b.confidence - a.confidence
        );
    }

    /**
     * Create validation summary
     */
    private createValidationSummary(
        context: ValidationContext,
        metrics: QualityMetrics
    ): ValidationSpecificData['validationSummary'] {
        const totalStages = context.stageResults.length;
        const stagesPassed = context.stageResults.filter(r => r.passed).length;
        const stagesFailed = totalStages - stagesPassed;
        const overallPassed = stagesFailed === 0 && metrics.overallScore >= 0.7;

        // Determine quality grade
        let qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
        if (metrics.overallScore >= 0.9) qualityGrade = 'A';
        else if (metrics.overallScore >= 0.8) qualityGrade = 'B';
        else if (metrics.overallScore >= 0.7) qualityGrade = 'C';
        else if (metrics.overallScore >= 0.6) qualityGrade = 'D';
        else qualityGrade = 'F';

        const improvementSuggestions = this.generateImprovementSuggestions(context, metrics);

        return {
            totalStages,
            stagesPassed,
            stagesFailed,
            overallPassed,
            qualityGrade,
            improvementSuggestions,
        };
    }

    /**
     * Generate improvement suggestions based on validation results
     */
    private generateImprovementSuggestions(
        context: ValidationContext,
        metrics: QualityMetrics
    ): string[] {
        const suggestions: string[] = [];

        if (metrics.dataCompleteness < 0.8) {
            suggestions.push('Increase data collection to improve completeness');
        }
        if (metrics.statisticalReliability < 0.8) {
            suggestions.push('Gather more samples to improve statistical reliability');
        }
        if (metrics.sampleAdequacy < 0.8) {
            suggestions.push('Increase sample size for better statistical power');
        }

        return suggestions;
    }

    /**
     * Create V2 patterns for interface compatibility
     */
    private createValidationPatterns(
        context: ValidationContext,
        options: AnalysisOptions
    ): Map<string, PatternData> {
        const patterns = new Map<string, PatternData>();

        // Create patterns for each validated pattern with enhanced metadata
        for (const [key, pattern] of context.validatedPatterns) {
            if (pattern.siteCount >= options.minOccurrences) {
                const flag = context.flaggedPatterns.get(key);

                patterns.set(`validated:${key}`, {
                    ...pattern,
                    metadata: {
                        ...pattern.metadata,
                        type: 'validated_pattern',
                        validationPassed: true,
                        qualityScore: context.qualityMetrics.overallScore,
                        flag: flag
                            ? {
                                  type: flag.flagType,
                                  severity: flag.severity,
                                  reason: flag.reason,
                                  confidence: flag.confidence,
                              }
                            : undefined,
                    },
                });
            }
        }

        return patterns;
    }
}
