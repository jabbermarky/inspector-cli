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
  ValidationRecommendation,
  PreprocessedData,
  AnalysisOptions
} from './validation-pipeline-v2-native.js';
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
 * Performs mathematical consistency and logic checks
 */
export class SanityValidationStage implements ValidationStage {
  name = 'SanityValidation';
  description = 'Validates mathematical consistency and logical constraints';

  async validate(
    data: PreprocessedData,
    options: AnalysisOptions,
    context: ValidationContext
  ): Promise<ValidationStageResult> {
    logger.info('Running sanity validation');

    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];
    const recommendations: ValidationRecommendation[] = [];

    // Check frequency sum constraints
    const frequencySum = Array.from(context.validatedPatterns.values())
      .reduce((sum, pattern) => sum + pattern.frequency, 0);

    // Frequencies shouldn't sum to more than reasonable bounds
    const maxReasonableSum = context.validatedPatterns.size * 0.5; // Rough heuristic
    if (frequencySum > maxReasonableSum) {
      warnings.push({
        type: 'mathematical_inconsistency',
        severity: 'medium',
        message: `Pattern frequency sum (${frequencySum.toFixed(2)}) exceeds reasonable bounds`,
        affectedPatterns: ['frequency_calculations'],
        suggestedAction: 'Review frequency calculation methodology'
      });
    }

    // Check site count consistency using real sanity checks
    let siteCountInconsistencies = 0;
    for (const [_, pattern] of context.validatedPatterns) {
      const consistencyCheck = StatisticalUtils.SanityCheck.frequencyConsistencyCheck(
        pattern.siteCount,
        data.totalSites,
        pattern.frequency
      );
      
      if (!consistencyCheck.passed) {
        siteCountInconsistencies++;
        errors.push({
          type: 'mathematical_inconsistency',
          message: consistencyCheck.message,
          affectedData: [pattern.pattern],
          recoverable: true
        });
      }
    }

    if (siteCountInconsistencies > 0) {
      errors.push({
        type: 'mathematical_inconsistency',
        message: `Found ${siteCountInconsistencies} patterns with site count/frequency inconsistencies`,
        affectedData: ['pattern_calculations'],
        recoverable: true
      });
    }

    const passed = errors.length === 0;
    const score = passed ? Math.max(0.5, 1 - (warnings.length * 0.2)) : 0.3;

    return {
      stageName: this.name,
      passed,
      score,
      patternsValidated: context.validatedPatterns.size,
      patternsFiltered: 0,
      warnings,
      errors,
      metrics: {
        frequency_sum: frequencySum,
        consistency_errors: siteCountInconsistencies,
        pattern_consistency: passed ? 1 : 0
      },
      recommendations
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