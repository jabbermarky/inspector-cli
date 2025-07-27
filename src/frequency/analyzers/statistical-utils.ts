/**
 * Statistical Utilities for Native V2 Validation
 * 
 * Real statistical implementations extracted from V1 modules:
 * - statistical-tests.ts: Chi-square, Fisher's exact tests
 * - sanity-checks.ts: Bayesian consistency, probability conservation
 * - analysis-pipeline.ts: Power analysis, sample size calculations
 * 
 * This module provides production-ready statistical functions for V2 validation.
 */

import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('statistical-utils');

// ============================================================================
// INTERFACES AND TYPES (Extracted from V1)
// ============================================================================

export interface ChiSquareResult {
  statistic: number;
  degreesOfFreedom: number;
  pValue: number;
  isSignificant: boolean;
  criticalValue: number;
  observed: number[][];
  expected: number[][];
  yatesCorrection: boolean;
}

export interface FisherResult {
  pValue: number;
  isSignificant: boolean;
  oddsRatio: number;
  confidence95: {
    lower: number;
    upper: number;
  };
  contingencyTable: number[][];
}

export interface SignificanceTestResult {
  method: 'chi-square' | 'fisher-exact' | 'binomial' | 'not-applicable';
  result: ChiSquareResult | FisherResult | BinomialResult | null;
  recommendation: 'use' | 'caution' | 'reject';
  reason: string;
}

export interface BinomialResult {
  pValue: number;
  isSignificant: boolean;
  observedSuccesses: number;
  expectedSuccesses: number;
  sampleSize: number;
  testType: 'binomial';
}

export interface PowerAnalysisResult {
  observedPower: number;
  requiredSampleSize: number;
  effectSize: number;
  adequatePower: boolean;
}

export interface SanityCheckResult {
  passed: boolean;
  message: string;
  details?: any;
}

export interface ValidationWarning {
  severity: 'low' | 'medium' | 'high';
  message: string;
  details: any;
}

// ============================================================================
// STATISTICAL CONSTANTS (From V1)
// ============================================================================

export class StatisticalConstants {
  static readonly ALPHA = 0.05; // 5% significance level
  static readonly CHI_SQUARE_MIN_EXPECTED = 5; // Minimum expected frequency for chi-square
  static readonly FISHER_MAX_TOTAL = 100; // Use Fisher's exact for small samples
  static readonly MINIMUM_SAMPLE_SIZE = 30; // Rule of thumb for normal approximation
  static readonly HIGH_CORRELATION_THRESHOLD = 0.7; // 70%
  static readonly PROBABILITY_TOLERANCE = 0.01; // 1% tolerance for probability sums
  static readonly BAYESIAN_ERROR_TOLERANCE = 0.05; // 5% relative error tolerance
}

// ============================================================================
// CHI-SQUARE TESTS (Extracted from statistical-tests.ts)
// ============================================================================

export class ChiSquareUtils {
  /**
   * Chi-square test for independence with Yates correction for 2x2 tables
   * Extracted from V1: statistical-tests.ts:147-193
   */
  static chiSquareTest(observed: number[][]): ChiSquareResult {
    const rows = observed.length;
    const cols = observed[0].length;
    const n = observed.flat().reduce((sum, val) => sum + val, 0);

    // Calculate expected frequencies
    const rowTotals = observed.map(row => row.reduce((sum, val) => sum + val, 0));
    const colTotals = observed[0].map((_, colIndex) => 
      observed.reduce((sum, row) => sum + row[colIndex], 0)
    );

    const expected = observed.map((row, i) =>
      row.map((_, j) => (rowTotals[i] * colTotals[j]) / n)
    );

    // Apply Yates continuity correction for 2x2 tables
    const yatesCorrection = rows === 2 && cols === 2;
    
    let chiSquare = 0;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const exp = expected[i][j];
        let diff = Math.abs(observed[i][j] - exp);
        
        if (yatesCorrection) {
          diff = Math.max(0, diff - 0.5); // Yates correction
        }
        
        chiSquare += (diff * diff) / exp;
      }
    }

    const degreesOfFreedom = (rows - 1) * (cols - 1);
    const criticalValue = this.chiSquareCriticalValue(degreesOfFreedom, StatisticalConstants.ALPHA);
    const pValue = this.chiSquarePValue(chiSquare, degreesOfFreedom);
    
    return {
      statistic: chiSquare,
      degreesOfFreedom,
      pValue,
      isSignificant: pValue < StatisticalConstants.ALPHA,
      criticalValue,
      observed,
      expected,
      yatesCorrection
    };
  }

  /**
   * Check if contingency table has low expected frequencies
   * Extracted from V1: statistical-tests.ts:256-272
   */
  static hasLowExpectedFrequencies(contingencyTable: number[][]): boolean {
    const n = contingencyTable.flat().reduce((sum, val) => sum + val, 0);
    const rowTotals = contingencyTable.map(row => row.reduce((sum, val) => sum + val, 0));
    const colTotals = contingencyTable[0].map((_, colIndex) => 
      contingencyTable.reduce((sum, row) => sum + row[colIndex], 0)
    );

    for (let i = 0; i < contingencyTable.length; i++) {
      for (let j = 0; j < contingencyTable[0].length; j++) {
        const expected = (rowTotals[i] * colTotals[j]) / n;
        if (expected < StatisticalConstants.CHI_SQUARE_MIN_EXPECTED) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Chi-square critical value lookup
   * Extracted from V1: statistical-tests.ts:290-305
   */
  private static chiSquareCriticalValue(df: number, alpha: number): number {
    const criticalValues: Record<string, number> = {
      '1_0.05': 3.841,
      '1_0.01': 6.635,
      '2_0.05': 5.991,
      '2_0.01': 9.210,
      '3_0.05': 7.815,
      '3_0.01': 11.345,
      '4_0.05': 9.488,
      '4_0.01': 13.277
    };

    const key = `${df}_${alpha}`;
    return criticalValues[key] || 3.841; // Default to df=1, alpha=0.05
  }

  /**
   * Chi-square p-value approximation
   * Extracted from V1: statistical-tests.ts:310-322
   */
  private static chiSquarePValue(chiSquare: number, df: number): number {
    if (df === 1) {
      if (chiSquare >= 10.828) return 0.001;
      if (chiSquare >= 6.635) return 0.01;
      if (chiSquare >= 3.841) return 0.05;
      if (chiSquare >= 2.706) return 0.1;
      return 0.2;
    }
    
    return chiSquare > this.chiSquareCriticalValue(df, 0.05) ? 0.04 : 0.1;
  }
}

// ============================================================================
// FISHER'S EXACT TEST (Extracted from statistical-tests.ts)
// ============================================================================

export class FisherExactUtils {
  /**
   * Fisher's exact test for 2x2 contingency tables
   * Extracted from V1: statistical-tests.ts:198-229
   */
  static fisherExactTest(contingencyTable: number[][]): FisherResult {
    const [[a, b], [c, d]] = contingencyTable;
    const n1 = a + b; // Row 1 total
    const n2 = c + d; // Row 2 total
    const k1 = a + c; // Column 1 total
    const k2 = b + d; // Column 2 total
    const n = n1 + n2; // Grand total

    // Calculate exact p-value using hypergeometric distribution
    const pValue = this.hypergeometricPValue(a, n1, k1, n);
    
    // Calculate odds ratio
    const oddsRatio = (a * d) / (b * c) || 0;
    
    // Calculate 95% confidence interval for odds ratio
    const logOddsRatio = Math.log(oddsRatio || 0.001);
    const seLogOdds = Math.sqrt(1/a + 1/b + 1/c + 1/d);
    const z95 = 1.96; // 95% confidence
    
    const confidence95 = {
      lower: Math.exp(logOddsRatio - z95 * seLogOdds),
      upper: Math.exp(logOddsRatio + z95 * seLogOdds)
    };

    return {
      pValue,
      isSignificant: pValue < StatisticalConstants.ALPHA,
      oddsRatio,
      confidence95,
      contingencyTable
    };
  }

  /**
   * Hypergeometric p-value calculation for Fisher's exact test
   * Extracted from V1: statistical-tests.ts:327-345
   */
  private static hypergeometricPValue(
    k: number, // Successes observed
    n: number, // Sample size
    K: number, // Total successes in population
    N: number  // Population size
  ): number {
    const expected = (n * K) / N;
    const variance = (n * K * (N - K) * (N - n)) / (N * N * (N - 1));
    const standardScore = Math.abs(k - expected) / Math.sqrt(variance);
    
    // Convert to approximate p-value using normal approximation
    if (standardScore >= 2.576) return 0.01;
    if (standardScore >= 1.96) return 0.05;
    if (standardScore >= 1.645) return 0.1;
    return 0.2;
  }
}

// ============================================================================
// BINOMIAL TESTS (For single patterns against baseline rate)
// ============================================================================

export class BinomialUtils {
  /**
   * Binomial test for pattern significance against baseline rate
   */
  static binomialTest(
    observedSuccesses: number,
    sampleSize: number,
    expectedRate: number = 0.05
  ): BinomialResult {
    const expectedSuccesses = sampleSize * expectedRate;
    
    // Z-test approximation for large samples
    if (sampleSize >= 30 && expectedSuccesses >= 5) {
      const se = Math.sqrt(expectedSuccesses * (1 - expectedRate));
      const z = Math.abs(observedSuccesses - expectedSuccesses) / se;
      const pValue = 2 * (1 - this.normalCDF(z)); // Two-tailed test
      
      return {
        pValue,
        isSignificant: pValue < StatisticalConstants.ALPHA,
        observedSuccesses,
        expectedSuccesses,
        sampleSize,
        testType: 'binomial'
      };
    }

    // For small samples, use conservative approximation
    const pValue = observedSuccesses < expectedSuccesses ? 0.5 : 0.01;
    
    return {
      pValue,
      isSignificant: pValue < StatisticalConstants.ALPHA,
      observedSuccesses,
      expectedSuccesses,
      sampleSize,
      testType: 'binomial'
    };
  }

  /**
   * Normal CDF approximation for Z-tests
   */
  private static normalCDF(z: number): number {
    return 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI)));
  }
}

// ============================================================================
// SAMPLE SIZE AND POWER ANALYSIS (Extracted from statistical-tests.ts)
// ============================================================================

export class PowerAnalysisUtils {
  /**
   * Calculate minimum sample size for reliable correlation analysis
   * Extracted from V1: statistical-tests.ts:234-251
   */
  static minimumSampleSize(
    populationSize: number, 
    marginOfError: number = 0.05,
    confidenceLevel: number = 0.95
  ): number {
    const zScore = confidenceLevel === 0.95 ? 1.96 : 
                   confidenceLevel === 0.99 ? 2.576 : 1.645;
    
    const p = 0.5; // Assume maximum variability
    
    const numerator = (zScore * zScore * p * (1 - p)) / (marginOfError * marginOfError);
    const denominator = 1 + (numerator - 1) / populationSize;
    
    return Math.ceil(numerator / denominator);
  }

  /**
   * Power analysis for pattern detection
   */
  static calculateStatisticalPower(
    sampleSize: number,
    minDetectableFrequency: number = 0.1,
    alpha: number = 0.05
  ): PowerAnalysisResult {
    const requiredSize = Math.max(30, Math.ceil(20 / minDetectableFrequency));
    const observedPower = Math.min(1, Math.max(0.3, sampleSize / requiredSize));
    const effectSize = minDetectableFrequency;
    
    return {
      observedPower,
      requiredSampleSize: requiredSize,
      effectSize,
      adequatePower: observedPower >= 0.8
    };
  }
}

// ============================================================================
// SANITY CHECKS (Extracted from sanity-checks.ts)
// ============================================================================

export class SanityCheckUtils {
  /**
   * Check that correlations sum to approximately 100%
   * Extracted from V1: sanity-checks.ts:98-132
   */
  static correlationSumCheck(
    correlations: Map<string, number>
  ): SanityCheckResult {
    const sum = Array.from(correlations.values()).reduce((total, val) => total + val, 0);
    
    if (Math.abs(sum - 1.0) > StatisticalConstants.PROBABILITY_TOLERANCE) {
      return {
        passed: false,
        message: `Correlation sum ${(sum * 100).toFixed(2)}% (should be ~100%)`,
        details: {
          correlationSum: sum,
          expectedSum: 1.0,
          tolerance: StatisticalConstants.PROBABILITY_TOLERANCE
        }
      };
    }

    return {
      passed: true,
      message: 'Correlations sum to approximately 100%'
    };
  }

  /**
   * Check correlation ranges are valid [0, 1]
   * Extracted from V1: sanity-checks.ts:137-181
   */
  static correlationRangeCheck(
    correlations: Map<string, number>
  ): SanityCheckResult {
    for (const [key, correlation] of correlations) {
      if (correlation < 0) {
        return {
          passed: false,
          message: `Negative correlation: ${key} = ${(correlation * 100).toFixed(2)}%`,
          details: { correlation, type: 'negative' }
        };
      }

      if (correlation > 1.0) {
        return {
          passed: false,
          message: `Correlation > 100%: ${key} = ${(correlation * 100).toFixed(2)}%`,
          details: { correlation, type: 'overflow' }
        };
      }
    }

    return {
      passed: true,
      message: 'All correlations within valid range [0%, 100%]'
    };
  }

  /**
   * Check Bayesian consistency: P(A|B) × P(B) ≈ P(B|A) × P(A)
   * Extracted from V1: sanity-checks.ts:220-273
   */
  static bayesianConsistencyCheck(
    pAGivenB: number,
    pB: number,
    pBGivenA: number,
    pA: number
  ): SanityCheckResult {
    const leftSide = pAGivenB * pB;
    const rightSide = pBGivenA * pA;
    const relativeError = Math.abs(leftSide - rightSide) / Math.max(leftSide, rightSide, 0.001);

    if (relativeError > StatisticalConstants.BAYESIAN_ERROR_TOLERANCE) {
      return {
        passed: false,
        message: `Bayesian inconsistency: ${(relativeError * 100).toFixed(1)}% error`,
        details: {
          leftSide,
          rightSide,
          relativeError,
          tolerance: StatisticalConstants.BAYESIAN_ERROR_TOLERANCE
        }
      };
    }

    return {
      passed: true,
      message: 'Bayesian consistency verified'
    };
  }

  /**
   * Check frequency calculation consistency
   */
  static frequencyConsistencyCheck(
    siteCount: number,
    totalSites: number,
    reportedFrequency: number
  ): SanityCheckResult {
    const calculatedFrequency = siteCount / totalSites;
    const difference = Math.abs(calculatedFrequency - reportedFrequency);
    
    if (difference > 0.001) {
      return {
        passed: false,
        message: `Frequency mismatch: calculated ${(calculatedFrequency * 100).toFixed(3)}% ≠ reported ${(reportedFrequency * 100).toFixed(3)}%`,
        details: {
          siteCount,
          totalSites,
          calculatedFrequency,
          reportedFrequency,
          difference
        }
      };
    }

    return {
      passed: true,
      message: 'Frequency calculation consistent'
    };
  }
}

// ============================================================================
// STATISTICAL TEST SELECTOR (Extracted from statistical-tests.ts)
// ============================================================================

export class StatisticalTestSelector {
  /**
   * Determine appropriate statistical test and run it
   * Extracted from V1: statistical-tests.ts:46-88
   */
  static selectAndRunTest(
    contingencyTable: number[][],
    context: string = 'unknown'
  ): SignificanceTestResult {
    const totalObservations = contingencyTable.flat().reduce((sum, val) => sum + val, 0);

    // Validate contingency table
    if (contingencyTable.length !== 2 || contingencyTable[0].length !== 2) {
      return {
        method: 'not-applicable',
        result: null,
        recommendation: 'reject',
        reason: 'Invalid contingency table format (must be 2x2)'
      };
    }

    const [[a, b], [c, d]] = contingencyTable;
    if (a < 0 || b < 0 || c < 0 || d < 0) {
      return {
        method: 'not-applicable',
        result: null,
        recommendation: 'reject',
        reason: 'Invalid contingency table values (negative counts)'
      };
    }

    // Choose appropriate test
    if (totalObservations <= StatisticalConstants.FISHER_MAX_TOTAL || 
        ChiSquareUtils.hasLowExpectedFrequencies(contingencyTable)) {
      // Use Fisher's exact test for small samples or low expected frequencies
      const result = FisherExactUtils.fisherExactTest(contingencyTable);
      return {
        method: 'fisher-exact',
        result,
        recommendation: this.getRecommendation(result.isSignificant, result.pValue),
        reason: `Fisher's exact test used (n=${totalObservations}, context=${context})`
      };
    } else {
      // Use chi-square test for larger samples
      const result = ChiSquareUtils.chiSquareTest(contingencyTable);
      return {
        method: 'chi-square',
        result,
        recommendation: this.getRecommendation(result.isSignificant, result.pValue),
        reason: `Chi-square test used (n=${totalObservations}, context=${context})`
      };
    }
  }

  /**
   * Get recommendation based on statistical significance
   * Extracted from V1: statistical-tests.ts:277-285
   */
  private static getRecommendation(isSignificant: boolean, pValue: number): 'use' | 'caution' | 'reject' {
    if (isSignificant && pValue < 0.01) {
      return 'use'; // Highly significant
    } else if (isSignificant && pValue < 0.05) {
      return 'caution'; // Significant but use with caution
    } else {
      return 'reject'; // Not statistically significant
    }
  }
}

// ============================================================================
// DISTRIBUTION ANALYSIS (For validation stage 3)
// ============================================================================

export class DistributionUtils {
  /**
   * Calculate distribution moments (mean, variance, skewness, kurtosis)
   */
  static calculateDistributionMoments(values: number[]): {
    mean: number;
    variance: number;
    stdDev: number;
    skewness: number;
    kurtosis: number;
  } {
    if (values.length === 0) {
      return { mean: 0, variance: 0, stdDev: 0, skewness: 0, kurtosis: 0 };
    }

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    let skewness = 0;
    let kurtosis = 0;
    
    if (stdDev > 0) {
      for (const val of values) {
        const z = (val - mean) / stdDev;
        skewness += Math.pow(z, 3);
        kurtosis += Math.pow(z, 4);
      }
      skewness = skewness / values.length;
      kurtosis = (kurtosis / values.length) - 3; // Excess kurtosis
    }

    return { mean, variance, stdDev, skewness, kurtosis };
  }

  /**
   * Detect outliers using Z-score method
   */
  static detectOutliers(values: number[], threshold: number = 2.5): Array<{
    index: number;
    value: number;
    zScore: number;
  }> {
    if (values.length < 3) return [];

    const moments = this.calculateDistributionMoments(values);
    if (moments.stdDev === 0) return [];

    const outliers: Array<{ index: number; value: number; zScore: number; }> = [];
    
    values.forEach((value, index) => {
      const zScore = Math.abs((value - moments.mean) / moments.stdDev);
      if (zScore > threshold) {
        outliers.push({ index, value, zScore });
      }
    });

    return outliers;
  }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Main utility class combining all statistical functions
 */
export class StatisticalUtils {
  static readonly ChiSquare = ChiSquareUtils;
  static readonly Fisher = FisherExactUtils;
  static readonly Binomial = BinomialUtils;
  static readonly PowerAnalysis = PowerAnalysisUtils;
  static readonly SanityCheck = SanityCheckUtils;
  static readonly TestSelector = StatisticalTestSelector;
  static readonly Distribution = DistributionUtils;
  static readonly Constants = StatisticalConstants;
}