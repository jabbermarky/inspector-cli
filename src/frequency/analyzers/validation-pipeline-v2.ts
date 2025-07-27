/**
 * ValidationPipelineV2 - Phase 3 implementation
 * Post-processor that validates results from all V2 analyzers using V1 validation logic
 */

import type { 
  FrequencyAnalyzer, 
  PreprocessedData, 
  AnalysisOptions, 
  AnalysisResult, 
  PatternData,
  AggregatedResults
} from '../types/analyzer-interface.js';
import { 
  AnalysisPipeline, 
  AnalysisStage, 
  type PipelineResult, 
  type PipelineOptions 
} from '../analysis-pipeline.js';
import { 
  analyzeDatasetBias, 
  type DatasetBiasAnalysis, 
  type HeaderCMSCorrelation 
} from '../bias-detector.js';
import { createModuleLogger } from '../../utils/logger.js';
import type { DetectionDataPoint, FrequencyOptionsWithDefaults } from '../types.js';

const logger = createModuleLogger('validation-pipeline-v2');

export interface ValidationSpecificData {
  pipelineResult: PipelineResult | null;
  qualityScore: number;
  validationPassed: boolean;
  sanityChecksPassed: boolean;
  statisticallySignificantHeaders: number;
  biasAnalysis: DatasetBiasAnalysis;
  validatedPatterns: {
    headers: Map<string, PatternData>;
    correlations: Map<string, HeaderCMSCorrelation>;
  };
  stages: {
    frequencyFilter: { filtered: number; passed: number };
    sampleSizeFilter: { filtered: number; passed: number };
    distributionAnalysis: { filtered: number; passed: number };
    correlationValidation: { errors: number; warnings: number };
    sanityChecks: { passed: number; failed: number };
    significanceTesting: { significant: number; total: number };
    recommendationValidation: { highConfidence: number; lowConfidence: number };
  };
}

/**
 * ValidationPipelineV2 - Post-processor that validates analyzer results
 * 
 * Architecture:
 * 1. Takes AggregatedResults from all V2 analyzers
 * 2. Converts V2 patterns to V1 correlation format
 * 3. Runs V1's 7-stage validation pipeline 
 * 4. Returns validated patterns and quality metrics
 * 5. Used by FrequencyAggregator as final validation step
 */
export class ValidationPipelineV2 implements FrequencyAnalyzer<ValidationSpecificData> {
  getName(): string {
    return 'ValidationPipelineV2';
  }

  /**
   * Validate aggregated results from all analyzers
   * This is called as a POST-PROCESSOR after basic pattern analysis
   */
  async analyze(
    data: PreprocessedData, 
    options: AnalysisOptions
  ): Promise<AnalysisResult<ValidationSpecificData>> {
    logger.info('Starting ValidationPipelineV2 analysis', {
      totalSites: data.totalSites,
      minOccurrences: options.minOccurrences
    });

    const startTime = Date.now();

    // ValidationPipelineV2 is designed as a post-processor
    // It needs AggregatedResults, not just PreprocessedData
    // For now, create minimal patterns for validation architecture
    const headerPatterns = this.extractHeaderPatternsFromData(data, options);
    
    // Convert preprocessed data to DetectionDataPoint format for V1 compatibility
    const dataPoints = this.convertToDetectionDataPoints(data);
    
    // Create frequency options for V1 compatibility
    const frequencyOptions: FrequencyOptionsWithDefaults = {
      dataSource: 'cms-analysis',
      dataDir: './data/cms-analysis',
      minSites: data.totalSites,
      minOccurrences: options.minOccurrences,
      pageType: 'all',
      output: 'human',
      outputFile: '',
      includeRecommendations: true,
      includeCurrentFilters: true,
      debugCalculations: false,
      enableValidation: true,
      skipStatisticalTests: false,
      validationStopOnError: false,
      validationDebugMode: false
    };

    try {
      // Step 1: Perform dataset bias analysis (V1 logic)
      logger.info('Performing dataset bias analysis');
      const biasAnalysis = await analyzeDatasetBias(dataPoints, frequencyOptions);
      
      logger.info('Bias analysis complete', {
        totalSites: biasAnalysis.totalSites,
        cmsTypes: Object.keys(biasAnalysis.cmsDistribution).length,
        headerCorrelations: biasAnalysis.headerCorrelations.size,
        concentrationScore: biasAnalysis.concentrationScore
      });

      // Step 2: Run V1 validation pipeline
      let pipelineResult: PipelineResult | null = null;
      let validationPassed = false;
      let sanityChecksPassed = false;
      let statisticallySignificantHeaders = 0;

      if (biasAnalysis.headerCorrelations.size > 0) {
        logger.info('Running V1 validation pipeline');
        
        const pipeline = new AnalysisPipeline({
          stages: [
            AnalysisStage.FREQUENCY_FILTER,
            AnalysisStage.SAMPLE_SIZE_FILTER,
            AnalysisStage.DISTRIBUTION_ANALYSIS,
            AnalysisStage.CORRELATION_CALC,
            AnalysisStage.SANITY_CHECKS,
            AnalysisStage.SIGNIFICANCE_TEST,
            AnalysisStage.RECOMMENDATION_GEN
          ],
          frequencyThreshold: options.minOccurrences / data.totalSites,
          sampleSizeThreshold: Math.max(30, options.minOccurrences),
          concentrationThreshold: 0.4,
          skipSignificanceTesting: false,
          stopOnError: false,
          debugMode: false
        });

        pipelineResult = await pipeline.process(dataPoints, biasAnalysis, frequencyOptions);
        
        validationPassed = pipelineResult.overallPassed;
        sanityChecksPassed = pipelineResult.finalData.sanityCheckReport?.passed || false;
        
        // Count statistically significant headers
        if (pipelineResult.finalData.significanceResults) {
          statisticallySignificantHeaders = Array.from(pipelineResult.finalData.significanceResults.values())
            .filter(result => result.result?.isSignificant).length;
        }

        logger.info('Validation pipeline completed', {
          passed: validationPassed,
          qualityScore: pipelineResult.summary.qualityScore,
          significantHeaders: statisticallySignificantHeaders,
          sanityChecksPassed,
          initialHeaders: pipelineResult.summary.initialHeaders,
          finalHeaders: pipelineResult.summary.finalHeaders
        });
      }

      // Step 3: Create validated pattern sets
      const validatedPatterns = {
        headers: this.createValidatedHeaderPatterns(pipelineResult, data, options),
        correlations: pipelineResult?.finalData.correlations || new Map()
      };

      // Step 4: Create stage summary
      const stages = this.createStagesSummary(pipelineResult);

      // Step 5: Create V2 patterns for interface compliance
      const patterns = this.createValidationPatterns(pipelineResult, data, options);

      const duration = Date.now() - startTime;
      logger.info('ValidationPipelineV2 completed', {
        duration,
        validationPassed,
        qualityScore: pipelineResult?.summary.qualityScore || 0,
        patterns: patterns.size
      });

      return {
        patterns,
        totalSites: data.totalSites,
        metadata: {
          analyzer: this.getName(),
          analyzedAt: new Date().toISOString(),
          totalPatternsFound: patterns.size,
          totalPatternsAfterFiltering: validatedPatterns.headers.size,
          options
        },
        analyzerSpecific: {
          pipelineResult,
          qualityScore: pipelineResult?.summary.qualityScore || 0,
          validationPassed,
          sanityChecksPassed,
          statisticallySignificantHeaders,
          biasAnalysis,
          validatedPatterns,
          stages
        }
      };

    } catch (error) {
      logger.error('ValidationPipelineV2 failed', { error: (error as Error).message });
      
      // Return minimal failed validation result
      return {
        patterns: new Map(),
        totalSites: data.totalSites,
        metadata: {
          analyzer: this.getName(),
          analyzedAt: new Date().toISOString(),
          totalPatternsFound: 0,
          totalPatternsAfterFiltering: 0,
          options
        },
        analyzerSpecific: {
          pipelineResult: null,
          qualityScore: 0,
          validationPassed: false,
          sanityChecksPassed: false,
          statisticallySignificantHeaders: 0,
          biasAnalysis: {
            cmsDistribution: {},
            totalSites: data.totalSites,
            concentrationScore: 0,
            biasWarnings: [`Validation failed: ${(error as Error).message}`],
            headerCorrelations: new Map()
          },
          validatedPatterns: {
            headers: new Map(),
            correlations: new Map()
          },
          stages: this.createEmptyStagesSummary()
        }
      };
    }
  }

  /**
   * Extract header patterns from preprocessed data for validation
   * TODO: This should be replaced with actual aggregated results
   */
  private extractHeaderPatternsFromData(
    data: PreprocessedData, 
    options: AnalysisOptions
  ): Map<string, PatternData> {
    const patterns = new Map<string, PatternData>();
    const headerCounts = new Map<string, Set<string>>();

    // Count unique headers across all sites
    for (const [siteUrl, siteData] of data.sites) {
      for (const [headerName] of siteData.headers) {
        if (!headerCounts.has(headerName)) {
          headerCounts.set(headerName, new Set());
        }
        headerCounts.get(headerName)!.add(siteUrl);
      }
    }

    // Create patterns for headers that meet minimum occurrence threshold
    for (const [headerName, sites] of headerCounts) {
      if (sites.size >= options.minOccurrences) {
        patterns.set(headerName, {
          pattern: headerName,
          siteCount: sites.size,
          sites: sites,
          frequency: sites.size / data.totalSites,
          examples: new Set([`${headerName}: <value>`]),
          metadata: {
            source: 'validation-extraction',
            headerType: 'extracted'
          }
        });
      }
    }

    return patterns;
  }

  /**
   * Convert PreprocessedData to DetectionDataPoint[] for V1 compatibility
   */
  private convertToDetectionDataPoints(data: PreprocessedData): DetectionDataPoint[] {
    return Array.from(data.sites.values()).map((site: any) => ({
      url: site.url,
      timestamp: new Date(site.capturedAt),
      userAgent: '',
      captureVersion: 'v2' as any,
      originalUrl: site.url,
      finalUrl: site.url,
      redirectChain: [],
      totalRedirects: 0,
      protocolUpgraded: false,
      navigationTime: 0,
      httpHeaders: this.mapOfSetsToRecord(site.headers),
      statusCode: 200,
      contentType: 'text/html',
      metaTags: this.mapOfSetsToMetaTags(site.metaTags),
      htmlContent: '',
      htmlSize: 0,
      domElements: [],
      links: [],
      scripts: [],
      stylesheets: [],
      forms: [],
      technologies: [],
      loadTime: 0,
      resourceCount: 0,
      detectionResults: site.cms ? [{
        detector: 'cms-detection',
        strategy: 'auto',
        cms: site.cms,
        confidence: site.confidence || 1.0,
        executionTime: 0
      }] : [],
      errors: []
    }));
  }

  /**
   * Convert Map<string, Set<string>> to Record<string, string>
   */
  private mapOfSetsToRecord(map: Map<string, Set<string>>): Record<string, string> {
    const record: Record<string, string> = {};
    for (const [key, valueSet] of map) {
      record[key] = Array.from(valueSet)[0] || '';
    }
    return record;
  }

  /**
   * Convert Map<string, Set<string>> to meta tag format
   */
  private mapOfSetsToMetaTags(map: Map<string, Set<string>>): any[] {
    const metaTags: any[] = [];
    for (const [name, valueSet] of map) {
      for (const value of valueSet) {
        metaTags.push({ name, content: value });
      }
    }
    return metaTags;
  }

  /**
   * Create validated header patterns from pipeline results
   */
  private createValidatedHeaderPatterns(
    pipelineResult: PipelineResult | null,
    data: PreprocessedData,
    options: AnalysisOptions
  ): Map<string, PatternData> {
    if (!pipelineResult || !pipelineResult.finalData.correlations) {
      return new Map();
    }

    const validatedPatterns = new Map<string, PatternData>();
    
    for (const [headerName, correlation] of pipelineResult.finalData.correlations) {
      // Find sites that have this header
      const sitesWithHeader = new Set<string>();
      for (const [siteUrl, siteData] of data.sites) {
        if (siteData.headers.has(headerName)) {
          sitesWithHeader.add(siteUrl);
        }
      }

      validatedPatterns.set(headerName, {
        pattern: headerName,
        siteCount: sitesWithHeader.size,
        sites: sitesWithHeader,
        frequency: correlation.overallFrequency,
        examples: new Set([`${headerName}: <validated>`]),
        metadata: {
          source: 'validation-pipeline',
          qualityScore: correlation.platformSpecificity,
          confidence: correlation.recommendationConfidence,
          biasAdjustedFrequency: correlation.biasAdjustedFrequency
        }
      });
    }

    return validatedPatterns;
  }

  /**
   * Create stages summary from pipeline results
   */
  private createStagesSummary(pipelineResult: PipelineResult | null) {
    if (!pipelineResult) {
      return this.createEmptyStagesSummary();
    }

    const stages: any = {
      frequencyFilter: { filtered: 0, passed: 0 },
      sampleSizeFilter: { filtered: 0, passed: 0 },
      distributionAnalysis: { filtered: 0, passed: 0 },
      correlationValidation: { errors: 0, warnings: 0 },
      sanityChecks: { passed: 0, failed: 0 },
      significanceTesting: { significant: 0, total: 0 },
      recommendationValidation: { highConfidence: 0, lowConfidence: 0 }
    };

    for (const stageResult of pipelineResult.stageResults) {
      switch (stageResult.stage) {
        case AnalysisStage.FREQUENCY_FILTER:
          stages.frequencyFilter = {
            filtered: stageResult.itemsFiltered,
            passed: stageResult.itemsProcessed - stageResult.itemsFiltered
          };
          break;
        case AnalysisStage.SAMPLE_SIZE_FILTER:
          stages.sampleSizeFilter = {
            filtered: stageResult.itemsFiltered,
            passed: stageResult.itemsProcessed - stageResult.itemsFiltered
          };
          break;
        case AnalysisStage.DISTRIBUTION_ANALYSIS:
          stages.distributionAnalysis = {
            filtered: stageResult.itemsFiltered,
            passed: stageResult.itemsProcessed - stageResult.itemsFiltered
          };
          break;
        case AnalysisStage.CORRELATION_CALC:
          stages.correlationValidation = {
            errors: stageResult.errors.length,
            warnings: stageResult.warnings.length
          };
          break;
        case AnalysisStage.SANITY_CHECKS:
          stages.sanityChecks = {
            passed: stageResult.passed ? stageResult.itemsProcessed : 0,
            failed: stageResult.passed ? 0 : stageResult.itemsProcessed
          };
          break;
        case AnalysisStage.SIGNIFICANCE_TEST:
          stages.significanceTesting = {
            significant: stageResult.details?.significantCount || 0,
            total: stageResult.itemsProcessed
          };
          break;
        case AnalysisStage.RECOMMENDATION_GEN:
          stages.recommendationValidation = {
            highConfidence: stageResult.details?.highConfidenceCount || 0,
            lowConfidence: stageResult.details?.lowConfidenceCount || 0
          };
          break;
      }
    }

    return stages;
  }

  /**
   * Create empty stages summary for error cases
   */
  private createEmptyStagesSummary() {
    return {
      frequencyFilter: { filtered: 0, passed: 0 },
      sampleSizeFilter: { filtered: 0, passed: 0 },
      distributionAnalysis: { filtered: 0, passed: 0 },
      correlationValidation: { errors: 0, warnings: 0 },
      sanityChecks: { passed: 0, failed: 0 },
      significanceTesting: { significant: 0, total: 0 },
      recommendationValidation: { highConfidence: 0, lowConfidence: 0 }
    };
  }

  /**
   * Create V2 validation patterns for interface compliance
   */
  private createValidationPatterns(
    pipelineResult: PipelineResult | null,
    data: PreprocessedData,
    options: AnalysisOptions
  ): Map<string, PatternData> {
    const patterns = new Map<string, PatternData>();

    if (pipelineResult) {
      // Create validation status patterns
      patterns.set('validation:overall', {
        pattern: 'validation:overall',
        siteCount: data.totalSites,
        sites: new Set(Array.from(data.sites.keys())),
        frequency: 1.0,
        examples: new Set([`validation: ${pipelineResult.overallPassed ? 'passed' : 'failed'}`]),
        metadata: {
          validationType: 'overall',
          qualityScore: pipelineResult.summary.qualityScore,
          passed: pipelineResult.overallPassed
        }
      });

      patterns.set('validation:quality-score', {
        pattern: 'validation:quality-score',
        siteCount: data.totalSites,
        sites: new Set(Array.from(data.sites.keys())),
        frequency: pipelineResult.summary.qualityScore,
        examples: new Set([`quality-score: ${pipelineResult.summary.qualityScore.toFixed(3)}`]),
        metadata: {
          validationType: 'quality',
          score: pipelineResult.summary.qualityScore
        }
      });
    }

    return patterns;
  }
}

// Export factory function for backward compatibility
export function createValidationPipeline(): ValidationPipelineV2 {
  return new ValidationPipelineV2();
}