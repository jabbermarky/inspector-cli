/**
 * Individual Validation Stages for ValidationPipelineV2Native
 * 
 * Each stage implements specific validation logic following V2 architecture patterns.
 * Stages operate on native V2 data structures without V1 dependencies.
 */

import type { 
  ValidationStage,
  ValidationStageResult,
  ValidationContext,
  ValidationWarning,
  ValidationError,
  ValidationRecommendation
} from './validation-pipeline-v2-native.js';
import type {
  PreprocessedData,
  AnalysisOptions,
  PatternData
} from '../types/analyzer-interface.js';
import { createModuleLogger } from '../../utils/logger.js';
import { 
  StatisticalUtils,
  type PowerAnalysisResult,
  type SignificanceTestResult,
  type SanityCheckResult
} from './statistical-utils.js';

const logger = createModuleLogger('validation-stages');

/**
 * Stage 1: Frequency Validation
 * Validates patterns meet minimum frequency and occurrence requirements
 */
export class FrequencyValidationStage implements ValidationStage {
  name = 'FrequencyValidation';
  description = 'Validates pattern frequencies and occurrence thresholds';

  async validate(
    data: PreprocessedData, 
    options: AnalysisOptions, 
    context: ValidationContext
  ): Promise<ValidationStageResult> {
    logger.info('Running frequency validation', { 
      patterns: context.validatedPatterns.size,
      minOccurrences: options.minOccurrences 
    });

    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const recommendations: ValidationRecommendation[] = [];
    let patternsValidated = 0;
    let patternsFiltered = 0;

    // Validate each pattern against frequency requirements
    for (const [key, pattern] of context.validatedPatterns) {
      const frequency = pattern.frequency;
      const siteCount = pattern.siteCount;

      // Check minimum occurrences
      if (siteCount < options.minOccurrences) {
        context.validatedPatterns.delete(key);
        patternsFiltered++;
        continue;
      }

      // Check for extremely rare patterns (potential noise)
      if (frequency < 0.01 && siteCount < 5) {
        warnings.push({
          type: 'statistical',
          severity: 'low',
          message: `Pattern "${pattern.pattern}" has very low frequency (${(frequency * 100).toFixed(2)}%)`,
          affectedPatterns: [pattern.pattern],
          suggestedAction: 'Consider increasing minimum occurrence threshold'
        });
      }

      // Check for suspiciously common patterns (potential errors)
      if (frequency > 0.95) {
        warnings.push({
          type: 'data_quality',
          severity: 'medium',
          message: `Pattern "${pattern.pattern}" appears in ${(frequency * 100).toFixed(1)}% of sites`,
          affectedPatterns: [pattern.pattern],
          suggestedAction: 'Verify this pattern is not a data collection artifact'
        });
      }

      patternsValidated++;
    }

    // Generate recommendations based on filtering results
    const filterRate = patternsFiltered / (patternsValidated + patternsFiltered);
    if (filterRate > 0.5) {
      recommendations.push({
        type: 'methodology',
        severity: 'medium',
        title: 'High Pattern Filtering Rate',
        description: `${(filterRate * 100).toFixed(1)}% of patterns were filtered due to low frequency`,
        actionableSteps: [
          'Consider lowering minimum occurrence threshold',
          'Verify data collection is capturing sufficient diversity',
          'Check for data quality issues affecting pattern detection'
        ],
        expectedImpact: 'Increase pattern diversity and analytical depth',
        confidence: 0.8,
        priority: 6
      });
    }

    const passed = errors.length === 0;
    const score = Math.max(0.5, 1 - (warnings.length * 0.1) - (filterRate * 0.3));

    return {
      stageName: this.name,
      passed,
      score,
      patternsValidated,
      patternsFiltered,
      warnings,
      errors,
      metrics: {
        filter_rate: filterRate,
        average_frequency: this.calculateAverageFrequency(context.validatedPatterns),
        data_completeness: Math.min(1, patternsValidated / 100) // Baseline expectation
      },
      recommendations
    };
  }

  private calculateAverageFrequency(patterns: Map<string, any>): number {
    if (patterns.size === 0) return 0;
    const frequencies = Array.from(patterns.values()).map(p => p.frequency);
    return frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
  }
}

/**
 * Stage 2: Sample Size Validation  
 * Ensures adequate sample sizes for statistical reliability
 */
export class SampleSizeValidationStage implements ValidationStage {
  name = 'SampleSizeValidation';
  description = 'Validates sample sizes for statistical significance';

  async validate(
    data: PreprocessedData,
    options: AnalysisOptions,
    context: ValidationContext
  ): Promise<ValidationStageResult> {
    logger.info('Running sample size validation', { totalSites: data.totalSites });

    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const recommendations: ValidationRecommendation[] = [];

    // Check overall sample size
    const totalSites = data.totalSites;
    const minimumSample = 5; // Minimum for basic analysis
    const recommendedSample = 30; // Statistical rule of thumb

    if (totalSites < minimumSample) {
      errors.push({
        type: 'critical_failure',
        message: `Sample size (${totalSites}) below minimum threshold (${minimumSample})`,
        affectedData: ['entire_dataset'],
        recoverable: false
      });
    } else if (totalSites < recommendedSample) {
      warnings.push({
        type: 'statistical',
        severity: 'high',
        message: `Sample size (${totalSites}) below recommended threshold (${recommendedSample})`,
        affectedPatterns: ['all_patterns'],
        suggestedAction: 'Collect additional data for improved reliability'
      });
    }

    // Calculate statistical power for pattern detection
    const powerAnalysis = this.calculateStatisticalPower(totalSites, context.validatedPatterns);
    
    if (powerAnalysis.adequatePower < 0.8) {
      recommendations.push({
        type: 'statistical',
        severity: 'medium',
        title: 'Insufficient Statistical Power',
        description: `Current sample size provides ${(powerAnalysis.adequatePower * 100).toFixed(1)}% power`,
        actionableSteps: [
          `Increase sample size to at least ${powerAnalysis.recommendedSize} sites`,
          'Focus collection on diverse website types',
          'Consider stratified sampling by CMS type'
        ],
        expectedImpact: 'Improve reliability of pattern detection and frequency estimates',
        confidence: 0.9,
        priority: 7
      });
    }

    const passed = errors.length === 0;
    const score = this.calculateSampleScore(totalSites, powerAnalysis.adequatePower);

    return {
      stageName: this.name,
      passed,
      score,
      patternsValidated: context.validatedPatterns.size,
      patternsFiltered: 0,
      warnings,
      errors,
      metrics: {
        sample_size: totalSites,
        statistical_power: powerAnalysis.adequatePower,
        sample_adequacy: Math.min(1, totalSites / recommendedSample),
        statistical_reliability: passed ? score : 0
      },
      recommendations
    };
  }

  private calculateStatisticalPower(sampleSize: number, patterns: Map<string, any>): {
    adequatePower: number;
    recommendedSize: number;
  } {
    // Use real power analysis from statistical-utils
    const minDetectableFrequency = 0.1;
    const powerResult = StatisticalUtils.PowerAnalysis.calculateStatisticalPower(
      sampleSize,
      minDetectableFrequency
    );
    
    return {
      adequatePower: powerResult.observedPower,
      recommendedSize: powerResult.requiredSampleSize
    };
  }

  private calculateSampleScore(sampleSize: number, power: number): number {
    const sizeScore = Math.min(1, sampleSize / 30); // Adjusted for more reasonable scoring
    const powerScore = power;
    return (sizeScore + powerScore) / 2;
  }
}

/**
 * Stage 3: Distribution Validation
 * Analyzes pattern distribution health and detects anomalies
 */
export class DistributionValidationStage implements ValidationStage {
  name = 'DistributionValidation';
  description = 'Validates pattern distribution health and detects outliers';

  async validate(
    data: PreprocessedData,
    options: AnalysisOptions,
    context: ValidationContext
  ): Promise<ValidationStageResult> {
    logger.info('Running distribution validation');

    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const recommendations: ValidationRecommendation[] = [];

    // Analyze frequency distribution
    const frequencies = Array.from(context.validatedPatterns.values()).map(p => p.frequency);
    const distributionAnalysis = this.analyzeDistribution(frequencies);

    // Check for extreme skewness
    if (Math.abs(distributionAnalysis.skewness) > 2) {
      warnings.push({
        type: 'statistical',
        severity: 'medium',
        message: `Pattern frequency distribution is highly skewed (skewness: ${distributionAnalysis.skewness.toFixed(2)})`,
        affectedPatterns: ['frequency_distribution'],
        suggestedAction: 'Consider log transformation or alternative analysis methods'
      });
    }

    // Detect outliers
    const outliers = this.detectOutliers(frequencies, context.validatedPatterns);
    for (const outlier of outliers) {
      context.flaggedPatterns.set(outlier.pattern, {
        flagType: 'outlier',
        severity: 'warning',
        reason: `Frequency (${(outlier.frequency * 100).toFixed(2)}%) is an outlier`,
        confidence: 0.8,
        metadata: { zScore: outlier.zScore }
      });
    }

    if (outliers.length > 0) {
      warnings.push({
        type: 'statistical',
        severity: 'low',
        message: `Detected ${outliers.length} outlier patterns`,
        affectedPatterns: outliers.map(o => o.pattern),
        suggestedAction: 'Review outlier patterns for data quality issues'
      });
    }

    // Check for adequate distribution coverage
    const coverageAnalysis = this.analyzeCoverage(frequencies);
    if (coverageAnalysis.coverage < 0.5) {
      recommendations.push({
        type: 'data_quality',
        severity: 'low',
        title: 'Limited Frequency Range Coverage',
        description: `Pattern frequencies cover only ${(coverageAnalysis.coverage * 100).toFixed(1)}% of possible range`,
        actionableSteps: [
          'Diversify data collection across different website types',
          'Include both common and rare patterns in analysis',
          'Consider stratified sampling approaches'
        ],
        expectedImpact: 'Improve representativeness of frequency analysis',
        confidence: 0.7,
        priority: 4
      });
    }

    const passed = errors.length === 0;
    const score = this.calculateDistributionScore(distributionAnalysis, outliers.length, coverageAnalysis.coverage);

    return {
      stageName: this.name,
      passed,
      score,
      patternsValidated: context.validatedPatterns.size,
      patternsFiltered: 0,
      warnings,
      errors,
      metrics: {
        distribution_skewness: distributionAnalysis.skewness,
        distribution_kurtosis: distributionAnalysis.kurtosis,
        outlier_count: outliers.length,
        distribution_health: score,
        coverage: coverageAnalysis.coverage
      },
      recommendations
    };
  }

  private analyzeDistribution(frequencies: number[]): {
    mean: number;
    stdDev: number;
    skewness: number;
    kurtosis: number;
  } {
    if (frequencies.length === 0) {
      return { mean: 0, stdDev: 0, skewness: 0, kurtosis: 0 };
    }

    const mean = frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length;
    const variance = frequencies.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / frequencies.length;
    const stdDev = Math.sqrt(variance);

    // Calculate skewness and kurtosis
    let skewness = 0;
    let kurtosis = 0;
    
    if (stdDev > 0) {
      for (const freq of frequencies) {
        const z = (freq - mean) / stdDev;
        skewness += Math.pow(z, 3);
        kurtosis += Math.pow(z, 4);
      }
      skewness = skewness / frequencies.length;
      kurtosis = (kurtosis / frequencies.length) - 3; // Excess kurtosis
    }

    return { mean, stdDev, skewness, kurtosis };
  }

  private detectOutliers(frequencies: number[], patterns: Map<string, any>): Array<{
    pattern: string;
    frequency: number;
    zScore: number;
  }> {
    if (frequencies.length < 3) return [];

    const mean = frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length;
    const stdDev = Math.sqrt(frequencies.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / frequencies.length);
    
    if (stdDev === 0) return [];

    const outliers: Array<{ pattern: string; frequency: number; zScore: number; }> = [];
    
    for (const [key, pattern] of patterns) {
      const zScore = Math.abs((pattern.frequency - mean) / stdDev);
      if (zScore > 2.5) { // Outlier threshold
        outliers.push({
          pattern: pattern.pattern,
          frequency: pattern.frequency,
          zScore
        });
      }
    }

    return outliers;
  }

  private analyzeCoverage(frequencies: number[]): { coverage: number } {
    if (frequencies.length === 0) return { coverage: 0 };
    
    const min = Math.min(...frequencies);
    const max = Math.max(...frequencies);
    const range = max - min;
    
    // Coverage is how much of the 0-1 range is actually used
    const coverage = range / 1.0;
    
    return { coverage };
  }

  private calculateDistributionScore(
    analysis: { skewness: number; kurtosis: number },
    outlierCount: number,
    coverage: number
  ): number {
    let score = 1.0;
    
    // Penalty for extreme skewness
    if (Math.abs(analysis.skewness) > 2) score *= 0.8;
    if (Math.abs(analysis.skewness) > 3) score *= 0.7;
    
    // Penalty for outliers
    score *= Math.max(0.5, 1 - (outlierCount * 0.1));
    
    // Bonus for good coverage
    score *= (0.5 + 0.5 * coverage);
    
    return Math.max(0, score);
  }
}

/**
 * Stage 4: Correlation Validation
 * Validates CMS correlations and cross-pattern relationships
 */
export class CorrelationValidationStage implements ValidationStage {
  name = 'CorrelationValidation';
  description = 'Validates CMS correlations and pattern relationships';

  async validate(
    data: PreprocessedData,
    options: AnalysisOptions,
    context: ValidationContext
  ): Promise<ValidationStageResult> {
    logger.info('Running correlation validation');

    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const recommendations: ValidationRecommendation[] = [];

    // Analyze CMS distribution
    const cmsDistribution = this.analyzeCMSDistribution(data);
    
    // Validate CMS correlations for patterns
    const correlationAnalysis = this.validateCMSCorrelations(context.validatedPatterns, data);

    // Check for balanced CMS representation
    if (cmsDistribution.balance < 0.3) {
      warnings.push({
        type: 'data_quality',
        severity: 'medium',
        message: `Unbalanced CMS distribution (balance score: ${cmsDistribution.balance.toFixed(2)})`,
        affectedPatterns: ['cms_correlations'],
        suggestedAction: 'Ensure representative sampling across different CMS types'
      });
    }

    // Check for suspiciously perfect correlations
    const suspiciousCorrelations = correlationAnalysis.filter(c => Math.abs(c.correlation) > 0.95);
    if (suspiciousCorrelations.length > 0) {
      warnings.push({
        type: 'statistical',
        severity: 'high',
        message: `Found ${suspiciousCorrelations.length} patterns with suspiciously high CMS correlation`,
        affectedPatterns: suspiciousCorrelations.map(c => c.pattern),
        suggestedAction: 'Verify these patterns are not data collection artifacts'
      });
    }

    const passed = errors.length === 0;
    const score = this.calculateCorrelationScore(cmsDistribution, correlationAnalysis);

    return {
      stageName: this.name,
      passed,
      score,
      patternsValidated: context.validatedPatterns.size,
      patternsFiltered: 0,
      warnings,
      errors,
      metrics: {
        cms_balance: cmsDistribution.balance,
        correlation_strength: score,
        suspicious_correlations: suspiciousCorrelations.length
      },
      recommendations
    };
  }

  private analyzeCMSDistribution(data: PreprocessedData): { balance: number; distribution: Record<string, number> } {
    const cmsCount = new Map<string, number>();
    
    for (const [_, siteData] of data.sites) {
      const cms = siteData.cms || 'Unknown';
      cmsCount.set(cms, (cmsCount.get(cms) || 0) + 1);
    }

    const distribution: Record<string, number> = {};
    const total = data.totalSites;
    
    for (const [cms, count] of cmsCount) {
      distribution[cms] = count / total;
    }

    // Calculate balance using entropy
    const entropy = -Object.values(distribution).reduce((sum, p) => {
      return p > 0 ? sum + p * Math.log2(p) : sum;
    }, 0);
    
    const maxEntropy = Math.log2(cmsCount.size);
    const balance = maxEntropy > 0 ? entropy / maxEntropy : 0;

    return { balance, distribution };
  }

  private validateCMSCorrelations(patterns: Map<string, any>, data: PreprocessedData): Array<{
    pattern: string;
    correlation: number;
    significance: number;
  }> {
    const correlations: Array<{ pattern: string; correlation: number; significance: number; }> = [];
    
    // Calculate CMS distribution
    const cmsCount = new Map<string, number>();
    for (const [_, siteData] of data.sites) {
      const cms = siteData.cms || 'Unknown';
      cmsCount.set(cms, (cmsCount.get(cms) || 0) + 1);
    }
    
    for (const [key, pattern] of patterns) {
      // Create contingency table for dominant CMS
      const sitesWithPattern = pattern.sites.size;
      const sitesWithoutPattern = data.totalSites - sitesWithPattern;
      
      // Find most common CMS for this pattern
      let dominantCms = '';
      let maxCmsCount = 0;
      
      for (const siteUrl of pattern.sites) {
        const siteData = data.sites.get(siteUrl);
        if (siteData) {
          const cms = siteData.cms || 'Unknown';
          const count = (cmsCount.get(cms) || 0);
          if (count > maxCmsCount) {
            maxCmsCount = count;
            dominantCms = cms;
          }
        }
      }
      
      if (dominantCms && maxCmsCount > 0) {
        const correlation = sitesWithPattern / maxCmsCount;
        correlations.push({
          pattern: pattern.pattern,
          correlation: Math.min(1, correlation),
          significance: correlation > 0.3 ? 0.05 : 0.2 // Simplified significance
        });
      }
    }
    
    return correlations;
  }

  private calculateCorrelationScore(
    cmsDistribution: { balance: number },
    correlationAnalysis: Array<{ correlation: number }>
  ): number {
    const balanceScore = cmsDistribution.balance;
    const correlationScore = correlationAnalysis.length > 0 
      ? correlationAnalysis.reduce((sum, c) => sum + Math.abs(c.correlation), 0) / correlationAnalysis.length
      : 0.8;
    
    return (balanceScore + correlationScore) / 2;
  }
}

/**
 * Stage 5: Sanity Validation
 * Comprehensive V2 implementation with 6 sanity check algorithms from V1
 * Validates mathematical consistency, Bayesian logic, and statistical constraints
 */
export class SanityValidationStage implements ValidationStage {
  name = 'SanityValidation';
  description = 'Comprehensive sanity validation with 6 mathematical consistency algorithms';

  async validate(
    data: PreprocessedData,
    options: AnalysisOptions,
    context: ValidationContext
  ): Promise<ValidationStageResult> {
    logger.info('Running comprehensive sanity validation with 6 algorithms');

    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const recommendations: ValidationRecommendation[] = [];

    // Convert V2 data to structures compatible with V1 sanity checks
    const { correlations, cmsDistribution } = this.convertV2DataForSanityChecks(data, context);

    // Execute all 6 sanity check algorithms from V1
    const sanityResults = await this.executeAllSanityChecks(correlations, cmsDistribution);

    // Process sanity check results into V2 format
    let algorithmsPass = 0;
    const totalAlgorithms = 6;

    for (const [algorithmName, result] of Object.entries(sanityResults)) {
      if (result.passed) {
        algorithmsPass++;
      } else {
        errors.push({
          type: 'mathematical_inconsistency',
          message: `Sanity check failed: ${algorithmName} - ${result.message}`,
          affectedData: result.details?.affectedPatterns || ['correlation_data'],
          recoverable: true
        });
      }

      // Add warnings from individual checks
      if (result.warnings) {
        for (const warning of result.warnings) {
          warnings.push({
            type: 'correlation',
            severity: warning.severity as 'low' | 'medium' | 'high',
            message: warning.message,
            affectedPatterns: warning.headerName ? [warning.headerName] : ['correlation_system'],
            suggestedAction: 'Review correlation calculation accuracy'
          });
        }
      }
    }

    // Generate comprehensive recommendations based on failed checks
    if (algorithmsPass < totalAlgorithms) {
      const failureRate = (totalAlgorithms - algorithmsPass) / totalAlgorithms;
      
      if (failureRate > 0.5) {
        recommendations.push({
          type: 'methodology',
          severity: 'high',
          title: 'Major Mathematical Inconsistencies Detected',
          description: `${totalAlgorithms - algorithmsPass} out of ${totalAlgorithms} sanity checks failed`,
          actionableSteps: [
            'Review data collection methodology for systematic errors',
            'Verify frequency calculation algorithms',
            'Check for data corruption or processing bugs',
            'Validate CMS detection accuracy',
            'Consider rebuilding dataset with enhanced quality controls'
          ],
          expectedImpact: 'Restore mathematical consistency and reliability',
          confidence: 0.9,
          priority: 9
        });
      } else {
        recommendations.push({
          type: 'data_quality',
          severity: 'medium',
          title: 'Minor Mathematical Inconsistencies',
          description: `${totalAlgorithms - algorithmsPass} sanity checks detected issues`,
          actionableSteps: [
            'Investigate specific failed sanity checks',
            'Verify calculation precision and rounding',
            'Check for edge cases in data processing',
            'Consider adjusting tolerance thresholds'
          ],
          expectedImpact: 'Improve mathematical accuracy and confidence',
          confidence: 0.8,
          priority: 6
        });
      }
    }

    const passed = errors.length === 0;
    const score = passed ? 
      Math.max(0.7, 1 - (warnings.length * 0.1)) : 
      Math.max(0.2, algorithmsPass / totalAlgorithms);

    return {
      stageName: this.name,
      passed,
      score,
      patternsValidated: context.validatedPatterns.size,
      patternsFiltered: 0,
      warnings,
      errors,
      metrics: {
        sanity_checks_passed: algorithmsPass,
        sanity_checks_total: totalAlgorithms,
        sanity_success_rate: algorithmsPass / totalAlgorithms,
        mathematical_consistency: passed ? 1 : 0,
        bayesian_consistency: sanityResults.bayesianConsistency?.passed ? 1 : 0,
        probability_conservation: sanityResults.probabilityConservation?.passed ? 1 : 0
      },
      recommendations
    };
  }

  /**
   * Convert V2 PatternData to V1-compatible correlation structures
   */
  private convertV2DataForSanityChecks(
    data: PreprocessedData, 
    context: ValidationContext
  ): {
    correlations: Map<string, any>;
    cmsDistribution: any;
  } {
    // Build CMS distribution from V2 data
    const cmsCount = new Map<string, number>();
    const cmsSites = new Map<string, Set<string>>();
    
    for (const [siteUrl, siteData] of data.sites) {
      const cms = siteData.cms || 'Unknown';
      cmsCount.set(cms, (cmsCount.get(cms) || 0) + 1);
      
      if (!cmsSites.has(cms)) {
        cmsSites.set(cms, new Set());
      }
      cmsSites.get(cms)!.add(siteUrl);
    }

    const cmsDistribution: any = {};
    for (const [cms, count] of cmsCount) {
      cmsDistribution[cms] = {
        count,
        percentage: (count / data.totalSites) * 100,
        sites: Array.from(cmsSites.get(cms) || new Set())
      };
    }

    // Convert V2 patterns to V1-style correlations
    const correlations = new Map<string, any>();
    
    for (const [patternKey, pattern] of context.validatedPatterns) {
      // Build per-CMS frequency data
      const perCMSFrequency: Record<string, any> = {};
      const cmsGivenHeader: Record<string, any> = {};
      
      for (const [cms, cmsData] of cmsCount) {
        const cmsSiteSet = cmsSites.get(cms) || new Set();
        const patternCmsSites = new Set(
          [...pattern.sites].filter(site => cmsSiteSet.has(site))
        );
        
        const occurrences = patternCmsSites.size;
        const frequency = cmsSiteSet.size > 0 ? occurrences / cmsSiteSet.size : 0;
        
        perCMSFrequency[cms] = {
          frequency,
          occurrences,
          totalSitesForCMS: cmsSiteSet.size
        };

        // Calculate P(CMS|header) - Bayesian probability
        const probability = pattern.siteCount > 0 ? occurrences / pattern.siteCount : 0;
        cmsGivenHeader[cms] = {
          probability,
          count: occurrences
        };
      }

      correlations.set(pattern.pattern, {
        headerName: pattern.pattern,
        overallFrequency: pattern.frequency,
        overallOccurrences: pattern.siteCount,
        perCMSFrequency,
        cmsGivenHeader
      });
    }

    return { correlations, cmsDistribution };
  }

  /**
   * Execute all 6 sanity check algorithms from V1 system
   */
  private async executeAllSanityChecks(
    correlations: Map<string, any>,
    cmsDistribution: any
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    try {
      // Algorithm 1: Correlation Sum Check
      results.correlationSum = this.correlationSumCheck(correlations);
      
      // Algorithm 2: Correlation Range Check  
      results.correlationRange = this.correlationRangeCheck(correlations);
      
      // Algorithm 3: Support Check
      results.support = this.supportCheck(correlations);
      
      // Algorithm 4: Bayesian Consistency Check
      results.bayesianConsistency = this.bayesianConsistencyCheck(correlations, cmsDistribution);
      
      // Algorithm 5: Probability Conservation Check
      results.probabilityConservation = this.probabilityConservationCheck(correlations);
      
      // Algorithm 6: Mathematical Impossibility Check
      results.mathematicalImpossibility = this.mathematicalImpossibilityCheck(correlations);

    } catch (error) {
      logger.error('Error executing sanity checks', { error });
      results.executionError = {
        passed: false,
        message: `Sanity check execution failed: ${error}`,
        details: { error: String(error) }
      };
    }

    return results;
  }

  /**
   * Algorithm 1: Check that correlations for each header sum to approximately 100%
   */
  private correlationSumCheck(correlations: Map<string, any>): any {
    const warnings: any[] = [];
    
    for (const [headerName, correlation] of correlations) {
      const cmsGivenHeaderSum = Object.values(correlation.cmsGivenHeader)
        .reduce((sum: number, data: any) => sum + data.probability, 0);

      // Allow 1% tolerance for rounding errors
      if (Math.abs(cmsGivenHeaderSum - 1.0) > 0.01) {
        warnings.push({
          severity: 'high',
          message: `Header ${headerName} has correlation sum ${(cmsGivenHeaderSum * 100).toFixed(2)}% (should be ~100%)`,
          headerName,
          details: {
            correlationSum: cmsGivenHeaderSum,
            expectedSum: 1.0,
            tolerance: 0.01
          }
        });
        
        return {
          passed: false,
          message: `Correlation sum validation failed for ${headerName}`,
          warnings,
          details: { affectedPatterns: [headerName] }
        };
      }
    }

    return {
      passed: true,
      message: 'All header correlations sum to approximately 100%',
      warnings
    };
  }

  /**
   * Algorithm 2: Check that no individual correlation exceeds 100% or is negative
   */
  private correlationRangeCheck(correlations: Map<string, any>): any {
    for (const [headerName, correlation] of correlations) {
      for (const [cmsName, data] of Object.entries(correlation.cmsGivenHeader)) {
        const dataTyped = data as any;
        
        if (dataTyped.probability < 0) {
          return {
            passed: false,
            message: `Negative correlation: ${headerName} → ${cmsName} = ${(dataTyped.probability * 100).toFixed(2)}%`,
            details: { affectedPatterns: [headerName] }
          };
        }

        if (dataTyped.probability > 1.0) {
          return {
            passed: false,
            message: `Correlation > 100%: ${headerName} → ${cmsName} = ${(dataTyped.probability * 100).toFixed(2)}%`,
            details: { affectedPatterns: [headerName] }
          };
        }
      }
    }

    return {
      passed: true,
      message: 'All correlations within valid range [0%, 100%]'
    };
  }

  /**
   * Algorithm 3: Check for high correlations with insufficient statistical support
   */
  private supportCheck(correlations: Map<string, any>): any {
    const warnings: any[] = [];
    const minSampleSizeForHighCorr = 30;
    const highCorrelationThreshold = 0.7;

    for (const [headerName, correlation] of correlations) {
      for (const [cmsName, data] of Object.entries(correlation.cmsGivenHeader)) {
        const dataTyped = data as any;
        
        if (dataTyped.probability > highCorrelationThreshold && dataTyped.count < minSampleSizeForHighCorr) {
          warnings.push({
            severity: 'medium',
            message: `High correlation (${(dataTyped.probability * 100).toFixed(1)}%) with low support: ${headerName} → ${cmsName} (${dataTyped.count} sites)`,
            headerName,
            details: {
              correlation: dataTyped.probability,
              sampleSize: dataTyped.count,
              minRecommended: minSampleSizeForHighCorr
            }
          });
        }
      }
    }

    return {
      passed: true,
      message: 'Support check completed (warnings may exist)',
      warnings
    };
  }

  /**
   * Algorithm 4: Check Bayesian consistency: P(A|B) × P(B) = P(B|A) × P(A)
   */
  private bayesianConsistencyCheck(correlations: Map<string, any>, cmsDistribution: any): any {
    const warnings: any[] = [];
    const totalSites = Object.values(cmsDistribution).reduce((sum: number, cms: any) => sum + cms.count, 0);

    for (const [headerName, correlation] of correlations) {
      const pHeader = correlation.overallFrequency; // P(header)

      for (const [cmsName, cmsGivenHeaderData] of Object.entries(correlation.cmsGivenHeader)) {
        const cmsGivenHeaderDataTyped = cmsGivenHeaderData as any;
        const pCmsGivenHeader = cmsGivenHeaderDataTyped.probability; // P(CMS|header)
        const pCms = (cmsDistribution[cmsName]?.count || 0) / totalSites; // P(CMS)
        
        // Get P(header|CMS) from perCMSFrequency
        const headerGivenCmsData = correlation.perCMSFrequency[cmsName];
        if (!headerGivenCmsData) continue;
        
        const pHeaderGivenCms = headerGivenCmsData.frequency; // P(header|CMS)

        // Bayesian equation: P(CMS|header) × P(header) ≈ P(header|CMS) × P(CMS)
        const leftSide = pCmsGivenHeader * pHeader;
        const rightSide = pHeaderGivenCms * pCms;
        const relativeError = Math.abs(leftSide - rightSide) / Math.max(leftSide, rightSide, 0.001);

        // Allow 5% relative error for numerical precision
        if (relativeError > 0.05) {
          warnings.push({
            severity: 'low',
            message: `Bayesian inconsistency: ${headerName} → ${cmsName} (${(relativeError * 100).toFixed(1)}% error)`,
            headerName,
            details: {
              leftSide,
              rightSide,
              relativeError,
              pCmsGivenHeader,
              pHeader,
              pHeaderGivenCms,
              pCms
            }
          });
        }
      }
    }

    return {
      passed: true,
      message: 'Bayesian consistency check completed',
      warnings
    };
  }

  /**
   * Algorithm 5: Check probability conservation: counts should match across calculations
   */
  private probabilityConservationCheck(correlations: Map<string, any>): any {
    for (const [headerName, correlation] of correlations) {
      // Sum of CMS-specific counts should equal overall occurrences
      const cmsCountSum = Object.values(correlation.cmsGivenHeader)
        .reduce((sum: number, data: any) => sum + data.count, 0);

      if (cmsCountSum !== correlation.overallOccurrences) {
        return {
          passed: false,
          message: `Count mismatch for ${headerName}: CMS sum ${cmsCountSum} ≠ overall ${correlation.overallOccurrences}`,
          details: {
            affectedPatterns: [headerName],
            cmsCountSum,
            overallOccurrences: correlation.overallOccurrences,
            difference: cmsCountSum - correlation.overallOccurrences
          }
        };
      }
    }

    return {
      passed: true,
      message: 'Probability conservation verified'
    };
  }

  /**
   * Algorithm 6: Check for mathematical impossibilities in the data
   */
  private mathematicalImpossibilityCheck(correlations: Map<string, any>): any {
    for (const [headerName, correlation] of correlations) {
      // Check: count for any CMS can't exceed overall occurrences
      for (const [cmsName, data] of Object.entries(correlation.cmsGivenHeader)) {
        const dataTyped = data as any;
        
        if (dataTyped.count > correlation.overallOccurrences) {
          return {
            passed: false,
            message: `Impossible count: ${headerName} → ${cmsName} has ${dataTyped.count} occurrences but header total is ${correlation.overallOccurrences}`,
            details: {
              affectedPatterns: [headerName],
              cmsCount: dataTyped.count,
              headerTotal: correlation.overallOccurrences,
              impossibility: 'cms_count_exceeds_header_total'
            }
          };
        }
      }

      // Check: frequency values should be consistent with counts
      if (correlation.overallFrequency < 0 || correlation.overallFrequency > 1) {
        return {
          passed: false,
          message: `Invalid frequency for ${headerName}: ${(correlation.overallFrequency * 100).toFixed(2)}%`,
          details: {
            affectedPatterns: [headerName],
            frequency: correlation.overallFrequency,
            impossibility: 'invalid_frequency_range'
          }
        };
      }
    }

    return {
      passed: true,
      message: 'No mathematical impossibilities detected'
    };
  }
}

/**
 * Stage 6: Significance Validation  
 * Performs statistical significance testing
 */
export class SignificanceValidationStage implements ValidationStage {
  name = 'SignificanceValidation';
  description = 'Performs statistical significance testing for patterns';

  async validate(
    data: PreprocessedData,
    options: AnalysisOptions,
    context: ValidationContext
  ): Promise<ValidationStageResult> {
    logger.info('Running significance validation');

    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const recommendations: ValidationRecommendation[] = [];

    let significantPatterns = 0;
    let totalTested = 0;

    // Test each pattern for statistical significance
    for (const [key, pattern] of context.validatedPatterns) {
      const significanceTest = this.performSignificanceTest(pattern, data.totalSites);
      totalTested++;

      if (significanceTest.significant) {
        significantPatterns++;
      } else {
        // Flag non-significant patterns
        context.flaggedPatterns.set(key, {
          flagType: 'low_confidence',
          severity: 'info',
          reason: `Pattern not statistically significant (p=${significanceTest.pValue.toFixed(3)})`,
          confidence: 1 - significanceTest.pValue,
          metadata: { pValue: significanceTest.pValue, testType: significanceTest.testType }
        });
      }
    }

    const significanceRate = totalTested > 0 ? significantPatterns / totalTested : 0;

    if (significanceRate < 0.5) {
      warnings.push({
        type: 'statistical',
        severity: 'medium',
        message: `Only ${(significanceRate * 100).toFixed(1)}% of patterns are statistically significant`,
        affectedPatterns: ['statistical_testing'],
        suggestedAction: 'Consider increasing sample size or adjusting significance criteria'
      });
    }

    const passed = errors.length === 0;
    const score = Math.max(0.3, significanceRate);

    return {
      stageName: this.name,
      passed,
      score,
      patternsValidated: totalTested,
      patternsFiltered: 0,
      warnings,
      errors,
      metrics: {
        significance_rate: significanceRate,
        significant_patterns: significantPatterns,
        statistical_reliability: score
      },
      recommendations
    };
  }

  private performSignificanceTest(pattern: any, totalSites: number): {
    significant: boolean;
    pValue: number;
    testType: string;
  } {
    // Use real binomial test from statistical-utils
    const observed = pattern.siteCount;
    const expectedRate = 0.05; // Null hypothesis: 5% baseline rate
    
    const binomialResult = StatisticalUtils.Binomial.binomialTest(
      observed,
      totalSites,
      expectedRate
    );
    
    return {
      significant: binomialResult.isSignificant,
      pValue: binomialResult.pValue,
      testType: binomialResult.testType
    };
  }
}

/**
 * Stage 7: Recommendation Validation
 * Validates the quality and consistency of analysis recommendations
 */
export class RecommendationValidationStage implements ValidationStage {
  name = 'RecommendationValidation';
  description = 'Validates recommendation quality and consistency';

  async validate(
    data: PreprocessedData,
    options: AnalysisOptions,
    context: ValidationContext
  ): Promise<ValidationStageResult> {
    logger.info('Running recommendation validation');

    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const recommendations: ValidationRecommendation[] = [];

    // Collect all recommendations from previous stages
    const allRecommendations = context.stageResults.flatMap(r => r.recommendations);

    // Validate recommendation consistency
    const consistencyCheck = this.validateRecommendationConsistency(allRecommendations);
    if (!consistencyCheck.consistent) {
      warnings.push({
        type: 'pattern_consistency',
        severity: 'low',
        message: 'Found inconsistent recommendations across validation stages',
        affectedPatterns: ['recommendations'],
        suggestedAction: 'Review conflicting recommendations for data interpretation'
      });
    }

    // Check recommendation quality metrics
    const qualityMetrics = this.assessRecommendationQuality(allRecommendations);
    
    if (qualityMetrics.averageConfidence < 0.7) {
      recommendations.push({
        type: 'methodology',
        severity: 'low',
        title: 'Low Recommendation Confidence',
        description: `Average recommendation confidence is ${(qualityMetrics.averageConfidence * 100).toFixed(1)}%`,
        actionableSteps: [
          'Increase data collection for more confident recommendations',
          'Review validation criteria and thresholds',
          'Consider additional validation stages'
        ],
        expectedImpact: 'Improve reliability of analysis recommendations',
        confidence: 0.8,
        priority: 3
      });
    }

    const passed = errors.length === 0;
    const score = (qualityMetrics.averageConfidence + (consistencyCheck.consistent ? 1 : 0.5)) / 2;

    return {
      stageName: this.name,
      passed,
      score,
      patternsValidated: context.validatedPatterns.size,
      patternsFiltered: 0,
      warnings,
      errors,
      metrics: {
        recommendation_count: allRecommendations.length,
        average_confidence: qualityMetrics.averageConfidence,
        recommendation_accuracy: score
      },
      recommendations
    };
  }

  private validateRecommendationConsistency(recommendations: ValidationRecommendation[]): {
    consistent: boolean;
    conflicts: string[];
  } {
    // Simplified consistency check
    const conflicts: string[] = [];
    
    // Check for contradictory recommendations
    const sampleSizeRecs = recommendations.filter(r => r.title.includes('Sample Size'));
    if (sampleSizeRecs.length > 1) {
      // Check if recommendations contradict each other
      const increase = sampleSizeRecs.some(r => r.actionableSteps.some(s => s.includes('Increase')));
      const decrease = sampleSizeRecs.some(r => r.actionableSteps.some(s => s.includes('Decrease')));
      
      if (increase && decrease) {
        conflicts.push('Contradictory sample size recommendations');
      }
    }

    return {
      consistent: conflicts.length === 0,
      conflicts
    };
  }

  private assessRecommendationQuality(recommendations: ValidationRecommendation[]): {
    averageConfidence: number;
    qualityScore: number;
  } {
    if (recommendations.length === 0) {
      return { averageConfidence: 1, qualityScore: 1 };
    }

    const avgConfidence = recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length;
    
    // Quality score based on confidence and actionability
    const actionabilityScore = recommendations.reduce((sum, r) => {
      return sum + (r.actionableSteps.length > 0 ? 1 : 0);
    }, 0) / recommendations.length;

    const qualityScore = (avgConfidence + actionabilityScore) / 2;

    return {
      averageConfidence: avgConfidence,
      qualityScore
    };
  }
}