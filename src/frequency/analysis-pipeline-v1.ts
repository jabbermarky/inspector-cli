import { createModuleLogger } from '../utils/logger.js';
import {
    runSanityChecks,
    type SanityChecksReport,
    type ValidationWarning,
} from './sanity-checks-v1.js';
import { testMultipleCorrelations, type SignificanceTestResult } from './statistical-tests-v1.js';
import type {
    HeaderCMSCorrelation,
    //    CMSDistribution,
    DatasetBiasAnalysis,
} from './bias-detector-v1.js';
import type { FrequencyOptionsWithDefaults } from './types/frequency-types-v2.js';
import type { DetectionDataPoint } from '../utils/cms/analysis/types.js';

const logger = createModuleLogger('frequency-analysis-pipeline');

export enum AnalysisStage {
    FREQUENCY_FILTER = 'frequency_filter',
    SAMPLE_SIZE_FILTER = 'sample_size_filter',
    DISTRIBUTION_ANALYSIS = 'distribution_analysis',
    CORRELATION_CALC = 'correlation_calc',
    SANITY_CHECKS = 'sanity_checks',
    SIGNIFICANCE_TEST = 'significance_test',
    RECOMMENDATION_GEN = 'recommendation_gen',
}

export interface StageResult {
    stage: AnalysisStage;
    passed: boolean;
    message: string;
    itemsProcessed: number;
    itemsFiltered: number;
    warnings: ValidationWarning[];
    errors: ValidationWarning[];
    executionTimeMs: number;
    details?: any;
}

export interface PipelineResult {
    totalStages: number;
    completedStages: number;
    overallPassed: boolean;
    totalExecutionTimeMs: number;
    stageResults: StageResult[];
    finalData: {
        correlations: Map<string, HeaderCMSCorrelation>;
        significanceResults?: Map<string, SignificanceTestResult>;
        sanityCheckReport?: SanityChecksReport;
    };
    summary: {
        initialHeaders: number;
        finalHeaders: number;
        filterEfficiency: number;
        qualityScore: number;
    };
}

export interface PipelineOptions {
    stages: AnalysisStage[];
    frequencyThreshold: number; // Minimum frequency (0.001 = 0.1%)
    sampleSizeThreshold: number; // Minimum sample size (30)
    concentrationThreshold: number; // Minimum CMS concentration (0.4 = 40%)
    skipSignificanceTesting: boolean; // Skip statistical tests for speed
    stopOnError: boolean; // Stop pipeline on first error
    debugMode: boolean; // Enhanced logging
}

/**
 * Multi-stage analysis pipeline with validation and quality control
 */
export class AnalysisPipeline {
    private options: PipelineOptions;
    private stageResults: StageResult[] = [];

    constructor(options: Partial<PipelineOptions> = {}) {
        this.options = {
            stages: [
                AnalysisStage.FREQUENCY_FILTER,
                AnalysisStage.SAMPLE_SIZE_FILTER,
                AnalysisStage.DISTRIBUTION_ANALYSIS,
                AnalysisStage.CORRELATION_CALC,
                AnalysisStage.SANITY_CHECKS,
                AnalysisStage.SIGNIFICANCE_TEST,
                AnalysisStage.RECOMMENDATION_GEN,
            ],
            frequencyThreshold: 0.001, // 0.1%
            sampleSizeThreshold: 30,
            concentrationThreshold: 0.4, // 40%
            skipSignificanceTesting: false,
            stopOnError: false,
            debugMode: false,
            ...options,
        };
    }

    /**
     * Run the complete analysis pipeline
     */
    async process(
        data: DetectionDataPoint[],
        biasAnalysis: DatasetBiasAnalysis,
        _frequencyOptions: FrequencyOptionsWithDefaults
    ): Promise<PipelineResult> {
        const startTime = Date.now();
        this.stageResults = [];

        logger.info('Starting analysis pipeline', {
            stages: this.options.stages.length,
            totalSites: data.length,
            initialHeaders: biasAnalysis.headerCorrelations.size,
        });

        let currentData = new Map(biasAnalysis.headerCorrelations);
        const initialHeaderCount = currentData.size;
        let shouldStop = false;

        // Execute each stage in sequence
        for (const stage of this.options.stages) {
            if (shouldStop) break;

            const stageResult = await this.runStage(stage, currentData, biasAnalysis, data);
            this.stageResults.push(stageResult);

            if (this.options.debugMode) {
                logger.info(`Stage ${stage} completed`, {
                    passed: stageResult.passed,
                    processed: stageResult.itemsProcessed,
                    filtered: stageResult.itemsFiltered,
                    timeMs: stageResult.executionTimeMs,
                });
            }

            // Update current data based on stage results
            if (
                stage === AnalysisStage.FREQUENCY_FILTER ||
                stage === AnalysisStage.SAMPLE_SIZE_FILTER ||
                stage === AnalysisStage.DISTRIBUTION_ANALYSIS
            ) {
                currentData = this.filterHeaders(currentData, stageResult);
            }

            // Stop if error occurred and stopOnError is enabled
            if (!stageResult.passed && this.options.stopOnError) {
                logger.error(`Pipeline stopped at stage ${stage}`, { errors: stageResult.errors });
                shouldStop = true;
            }
        }

        const totalExecutionTime = Date.now() - startTime;
        const finalHeaderCount = currentData.size;

        // Run final significance tests if not skipped
        let significanceResults: Map<string, SignificanceTestResult> | undefined;
        let sanityCheckReport: SanityChecksReport | undefined;

        if (!this.options.skipSignificanceTesting && currentData.size > 0) {
            significanceResults = testMultipleCorrelations(
                currentData,
                biasAnalysis.cmsDistribution,
                biasAnalysis.totalSites
            );
        }

        // Run final sanity checks
        if (currentData.size > 0) {
            sanityCheckReport = runSanityChecks(currentData, biasAnalysis.cmsDistribution);
        }

        const result: PipelineResult = {
            totalStages: this.options.stages.length,
            completedStages: this.stageResults.length,
            overallPassed: this.stageResults.every(r => r.passed) && !shouldStop,
            totalExecutionTimeMs: totalExecutionTime,
            stageResults: this.stageResults,
            finalData: {
                correlations: currentData,
                significanceResults,
                sanityCheckReport,
            },
            summary: {
                initialHeaders: initialHeaderCount,
                finalHeaders: finalHeaderCount,
                filterEfficiency:
                    initialHeaderCount > 0
                        ? (initialHeaderCount - finalHeaderCount) / initialHeaderCount
                        : 0,
                qualityScore: this.calculateQualityScore(),
            },
        };

        logger.info('Analysis pipeline completed', {
            overallPassed: result.overallPassed,
            finalHeaders: finalHeaderCount,
            filterEfficiency: `${(result.summary.filterEfficiency * 100).toFixed(1)}%`,
            qualityScore: result.summary.qualityScore,
            totalTimeMs: totalExecutionTime,
        });

        return result;
    }

    /**
     * Run individual stage of the pipeline
     */
    private async runStage(
        stage: AnalysisStage,
        currentData: Map<string, HeaderCMSCorrelation>,
        biasAnalysis: DatasetBiasAnalysis,
        _originalData: DetectionDataPoint[]
    ): Promise<StageResult> {
        const stageStartTime = Date.now();
        const initialCount = currentData.size;

        try {
            switch (stage) {
                case AnalysisStage.FREQUENCY_FILTER:
                    return this.runFrequencyFilter(currentData, stageStartTime, initialCount);

                case AnalysisStage.SAMPLE_SIZE_FILTER:
                    return this.runSampleSizeFilter(currentData, stageStartTime, initialCount);

                case AnalysisStage.DISTRIBUTION_ANALYSIS:
                    return this.runDistributionAnalysis(currentData, stageStartTime, initialCount);

                case AnalysisStage.CORRELATION_CALC:
                    return this.runCorrelationValidation(currentData, stageStartTime, initialCount);

                case AnalysisStage.SANITY_CHECKS:
                    return this.runSanityChecksStage(
                        currentData,
                        biasAnalysis,
                        stageStartTime,
                        initialCount
                    );

                case AnalysisStage.SIGNIFICANCE_TEST:
                    return this.runSignificanceTestStage(
                        currentData,
                        biasAnalysis,
                        stageStartTime,
                        initialCount
                    );

                case AnalysisStage.RECOMMENDATION_GEN:
                    return this.runRecommendationValidation(
                        currentData,
                        stageStartTime,
                        initialCount
                    );

                default:
                    throw new Error(`Unknown stage: ${stage}`);
            }
        } catch (error) {
            return {
                stage,
                passed: false,
                message: `Stage failed with error: ${error}`,
                itemsProcessed: initialCount,
                itemsFiltered: 0,
                warnings: [],
                errors: [
                    {
                        severity: 'high',
                        message: `Stage ${stage} threw exception: ${error}`,
                        details: { error: String(error) },
                    },
                ],
                executionTimeMs: Date.now() - stageStartTime,
            };
        }
    }

    /**
     * Filter headers below frequency threshold
     */
    private runFrequencyFilter(
        currentData: Map<string, HeaderCMSCorrelation>,
        startTime: number,
        initialCount: number
    ): StageResult {
        const toRemove: string[] = [];
        const warnings: ValidationWarning[] = [];

        for (const [headerName, correlation] of currentData) {
            if (correlation.overallFrequency < this.options.frequencyThreshold) {
                toRemove.push(headerName);

                if (this.options.debugMode) {
                    warnings.push({
                        severity: 'low',
                        message: `Header ${headerName} filtered: frequency ${(correlation.overallFrequency * 100).toFixed(3)}% < threshold ${(this.options.frequencyThreshold * 100).toFixed(3)}%`,
                        headerName,
                        details: {
                            frequency: correlation.overallFrequency,
                            threshold: this.options.frequencyThreshold,
                        },
                    });
                }
            }
        }

        return {
            stage: AnalysisStage.FREQUENCY_FILTER,
            passed: true,
            message: `Filtered ${toRemove.length} headers below frequency threshold`,
            itemsProcessed: initialCount,
            itemsFiltered: toRemove.length,
            warnings,
            errors: [],
            executionTimeMs: Date.now() - startTime,
            details: { threshold: this.options.frequencyThreshold, filtered: toRemove },
        };
    }

    /**
     * Filter headers below sample size threshold
     */
    private runSampleSizeFilter(
        currentData: Map<string, HeaderCMSCorrelation>,
        startTime: number,
        initialCount: number
    ): StageResult {
        const toRemove: string[] = [];
        const warnings: ValidationWarning[] = [];

        for (const [headerName, correlation] of currentData) {
            if (correlation.overallOccurrences < this.options.sampleSizeThreshold) {
                toRemove.push(headerName);

                if (this.options.debugMode) {
                    warnings.push({
                        severity: 'low',
                        message: `Header ${headerName} filtered: sample size ${correlation.overallOccurrences} < threshold ${this.options.sampleSizeThreshold}`,
                        headerName,
                        details: {
                            sampleSize: correlation.overallOccurrences,
                            threshold: this.options.sampleSizeThreshold,
                        },
                    });
                }
            }
        }

        return {
            stage: AnalysisStage.SAMPLE_SIZE_FILTER,
            passed: true,
            message: `Filtered ${toRemove.length} headers below sample size threshold`,
            itemsProcessed: initialCount,
            itemsFiltered: toRemove.length,
            warnings,
            errors: [],
            executionTimeMs: Date.now() - startTime,
            details: { threshold: this.options.sampleSizeThreshold, filtered: toRemove },
        };
    }

    /**
     * Check CMS distribution concentration
     */
    private runDistributionAnalysis(
        currentData: Map<string, HeaderCMSCorrelation>,
        startTime: number,
        initialCount: number
    ): StageResult {
        const toRemove: string[] = [];
        const warnings: ValidationWarning[] = [];

        for (const [headerName, correlation] of currentData) {
            // Find maximum CMS concentration for this header
            let maxConcentration = 0;
            for (const data of Object.values(correlation.cmsGivenHeader)) {
                maxConcentration = Math.max(maxConcentration, data.probability);
            }

            if (maxConcentration < this.options.concentrationThreshold) {
                toRemove.push(headerName);

                warnings.push({
                    severity: 'medium',
                    message: `Header ${headerName} filtered: max CMS concentration ${(maxConcentration * 100).toFixed(1)}% < threshold ${(this.options.concentrationThreshold * 100).toFixed(1)}%`,
                    headerName,
                    details: { maxConcentration, threshold: this.options.concentrationThreshold },
                });
            }
        }

        return {
            stage: AnalysisStage.DISTRIBUTION_ANALYSIS,
            passed: true,
            message: `Filtered ${toRemove.length} headers with poor CMS concentration`,
            itemsProcessed: initialCount,
            itemsFiltered: toRemove.length,
            warnings,
            errors: [],
            executionTimeMs: Date.now() - startTime,
            details: { threshold: this.options.concentrationThreshold, filtered: toRemove },
        };
    }

    /**
     * Validate correlation calculations
     */
    private runCorrelationValidation(
        currentData: Map<string, HeaderCMSCorrelation>,
        startTime: number,
        _initialCount: number
    ): StageResult {
        const warnings: ValidationWarning[] = [];
        const errors: ValidationWarning[] = [];

        for (const [headerName, correlation] of currentData) {
            // Check correlation sum
            const cmsGivenHeaderSum = Object.values(correlation.cmsGivenHeader).reduce(
                (sum, data) => sum + data.probability,
                0
            );

            if (Math.abs(cmsGivenHeaderSum - 1.0) > 0.01) {
                errors.push({
                    severity: 'high',
                    message: `Correlation sum error for ${headerName}: ${(cmsGivenHeaderSum * 100).toFixed(2)}% ≠ 100%`,
                    headerName,
                    details: { correlationSum: cmsGivenHeaderSum },
                });
            }

            // Check for invalid ranges
            for (const [cmsName, data] of Object.entries(correlation.cmsGivenHeader)) {
                if (data.probability < 0 || data.probability > 1) {
                    errors.push({
                        severity: 'high',
                        message: `Invalid correlation range: ${headerName} → ${cmsName} = ${(data.probability * 100).toFixed(2)}%`,
                        headerName,
                        cmsName,
                        details: { correlation: data.probability },
                    });
                }
            }
        }

        return {
            stage: AnalysisStage.CORRELATION_CALC,
            passed: errors.length === 0,
            message: `Validated ${currentData.size} header correlations`,
            itemsProcessed: currentData.size,
            itemsFiltered: 0,
            warnings,
            errors,
            executionTimeMs: Date.now() - startTime,
        };
    }

    /**
     * Run comprehensive sanity checks
     */
    private runSanityChecksStage(
        currentData: Map<string, HeaderCMSCorrelation>,
        biasAnalysis: DatasetBiasAnalysis,
        startTime: number,
        _initialCount: number
    ): StageResult {
        const sanityReport = runSanityChecks(currentData, biasAnalysis.cmsDistribution);

        return {
            stage: AnalysisStage.SANITY_CHECKS,
            passed: sanityReport.passed,
            message: `Sanity checks: ${sanityReport.summary.passedChecks}/${sanityReport.summary.totalChecks} passed`,
            itemsProcessed: currentData.size,
            itemsFiltered: 0,
            warnings: sanityReport.warnings,
            errors: sanityReport.errors,
            executionTimeMs: Date.now() - startTime,
            details: sanityReport,
        };
    }

    /**
     * Run statistical significance tests
     */
    private runSignificanceTestStage(
        currentData: Map<string, HeaderCMSCorrelation>,
        biasAnalysis: DatasetBiasAnalysis,
        startTime: number,
        _initialCount: number
    ): StageResult {
        if (this.options.skipSignificanceTesting) {
            return {
                stage: AnalysisStage.SIGNIFICANCE_TEST,
                passed: true,
                message: 'Significance testing skipped (disabled)',
                itemsProcessed: 0,
                itemsFiltered: 0,
                warnings: [],
                errors: [],
                executionTimeMs: Date.now() - startTime,
            };
        }

        const significanceResults = testMultipleCorrelations(
            currentData,
            biasAnalysis.cmsDistribution,
            biasAnalysis.totalSites
        );

        const warnings: ValidationWarning[] = [];
        let significantCount = 0;

        for (const [headerName, result] of significanceResults) {
            if (result.result?.isSignificant) {
                significantCount++;
            } else {
                warnings.push({
                    severity: 'medium',
                    message: `Header ${headerName} not statistically significant (${result.method}, p=${result.result?.pValue?.toFixed(4)})`,
                    headerName,
                    details: { method: result.method, pValue: result.result?.pValue },
                });
            }
        }

        return {
            stage: AnalysisStage.SIGNIFICANCE_TEST,
            passed: true,
            message: `Statistical significance: ${significantCount}/${currentData.size} headers significant`,
            itemsProcessed: currentData.size,
            itemsFiltered: 0,
            warnings,
            errors: [],
            executionTimeMs: Date.now() - startTime,
            details: { significantCount, totalTested: currentData.size },
        };
    }

    /**
     * Validate recommendation generation
     */
    private runRecommendationValidation(
        currentData: Map<string, HeaderCMSCorrelation>,
        startTime: number,
        _initialCount: number
    ): StageResult {
        const warnings: ValidationWarning[] = [];

        let highConfidenceCount = 0;
        let mediumConfidenceCount = 0;
        let lowConfidenceCount = 0;

        for (const [headerName, correlation] of currentData) {
            switch (correlation.recommendationConfidence) {
                case 'high':
                    highConfidenceCount++;
                    break;
                case 'medium':
                    mediumConfidenceCount++;
                    break;
                case 'low':
                    lowConfidenceCount++;
                    warnings.push({
                        severity: 'low',
                        message: `Low confidence recommendation for ${headerName}`,
                        headerName,
                        details: {
                            confidence: correlation.recommendationConfidence,
                            platformSpecificity: correlation.platformSpecificity,
                        },
                    });
                    break;
            }
        }

        return {
            stage: AnalysisStage.RECOMMENDATION_GEN,
            passed: true,
            message: `Recommendations: ${highConfidenceCount} high, ${mediumConfidenceCount} medium, ${lowConfidenceCount} low confidence`,
            itemsProcessed: currentData.size,
            itemsFiltered: 0,
            warnings,
            errors: [],
            executionTimeMs: Date.now() - startTime,
            details: { highConfidenceCount, mediumConfidenceCount, lowConfidenceCount },
        };
    }

    /**
     * Filter headers based on stage results
     */
    private filterHeaders(
        currentData: Map<string, HeaderCMSCorrelation>,
        stageResult: StageResult
    ): Map<string, HeaderCMSCorrelation> {
        if (!stageResult.details?.filtered) {
            return currentData;
        }

        const filtered = new Map(currentData);
        for (const headerName of stageResult.details.filtered) {
            filtered.delete(headerName);
        }
        return filtered;
    }

    /**
     * Calculate overall pipeline quality score
     */
    private calculateQualityScore(): number {
        const totalStages = this.stageResults.length;
        if (totalStages === 0) return 0;

        let score = 0;

        for (const result of this.stageResults) {
            // Base score for passing
            if (result.passed) score += 1;

            // Penalty for errors
            score -= result.errors.length * 0.2;

            // Small penalty for warnings
            score -= result.warnings.length * 0.05;
        }

        return Math.max(0, Math.min(1, score / totalStages));
    }
}

/**
 * Utility function to run standard pipeline with default stages
 */
export async function runStandardPipeline(
    data: DetectionDataPoint[],
    biasAnalysis: DatasetBiasAnalysis,
    frequencyOptions: FrequencyOptionsWithDefaults,
    options: Partial<PipelineOptions> = {}
): Promise<PipelineResult> {
    const pipeline = new AnalysisPipeline(options);
    return pipeline.process(data, biasAnalysis, frequencyOptions);
}
