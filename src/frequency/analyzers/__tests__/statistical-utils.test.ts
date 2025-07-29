/**
 * Statistical Utilities Tests
 * 
 * Comprehensive tests for real statistical implementations ported from V1.
 * Tests extracted and adapted from V1 statistical modules.
 */

import { describe, it, expect } from 'vitest';
import { 
  StatisticalUtils,
  type ChiSquareResult,
  type FisherResult,
  type BinomialResult,
  type PowerAnalysisResult
} from '../statistical-utils-v2.js';

describe('StatisticalUtils', () => {
  describe('ChiSquare Tests', () => {
    it('should perform basic chi-square test', () => {
      // Test data: 2x2 contingency table
      const observed = [[10, 20], [15, 25]];
      
      const result = StatisticalUtils.ChiSquare.chiSquareTest(observed);
      
      expect(result.statistic).toBeGreaterThan(0);
      expect(result.degreesOfFreedom).toBe(1);
      expect(result.pValue).toBeGreaterThan(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
      expect(result.observed).toEqual(observed);
      expect(result.expected).toHaveLength(2);
      expect(result.expected[0]).toHaveLength(2);
      expect(typeof result.isSignificant).toBe('boolean');
      expect(result.yatesCorrection).toBe(true); // 2x2 table
    });

    it('should apply Yates correction for 2x2 tables', () => {
      const observed = [[5, 10], [15, 20]];
      
      const result = StatisticalUtils.ChiSquare.chiSquareTest(observed);
      
      expect(result.yatesCorrection).toBe(true);
      expect(result.degreesOfFreedom).toBe(1);
    });

    it('should not apply Yates correction for larger tables', () => {
      const observed = [[5, 10, 3], [15, 20, 7], [8, 12, 5]];
      
      const result = StatisticalUtils.ChiSquare.chiSquareTest(observed);
      
      expect(result.yatesCorrection).toBe(false);
      expect(result.degreesOfFreedom).toBe(4); // (3-1) * (3-1)
    });

    it('should detect low expected frequencies', () => {
      // Table with low expected frequencies
      const lowFreqTable = [[1, 2], [3, 4]];
      
      const hasLowFreq = StatisticalUtils.ChiSquare.hasLowExpectedFrequencies(lowFreqTable);
      
      expect(hasLowFreq).toBe(true);
    });

    it('should not flag adequate expected frequencies', () => {
      // Table with adequate expected frequencies
      const adequateTable = [[10, 20], [30, 40]];
      
      const hasLowFreq = StatisticalUtils.ChiSquare.hasLowExpectedFrequencies(adequateTable);
      
      expect(hasLowFreq).toBe(false);
    });
  });

  describe('Fisher Exact Tests', () => {
    it('should perform Fisher exact test', () => {
      const contingencyTable = [[2, 8], [5, 15]];
      
      const result = StatisticalUtils.Fisher.fisherExactTest(contingencyTable);
      
      expect(result.pValue).toBeGreaterThan(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
      expect(result.oddsRatio).toBeGreaterThan(0);
      expect(typeof result.isSignificant).toBe('boolean');
      expect(result.confidence95.lower).toBeGreaterThan(0);
      expect(result.confidence95.upper).toBeGreaterThan(result.confidence95.lower);
      expect(result.contingencyTable).toEqual(contingencyTable);
    });

    it('should calculate correct odds ratio', () => {
      // Known test case: a=5, b=3, c=2, d=7
      const contingencyTable = [[5, 3], [2, 7]];
      
      const result = StatisticalUtils.Fisher.fisherExactTest(contingencyTable);
      
      // Odds ratio = (a*d)/(b*c) = (5*7)/(3*2) = 35/6 ≈ 5.83
      expect(result.oddsRatio).toBeCloseTo(5.83, 2);
    });

    it('should handle edge case with zero cells', () => {
      const contingencyTable = [[0, 5], [3, 7]];
      
      const result = StatisticalUtils.Fisher.fisherExactTest(contingencyTable);
      
      expect(result.oddsRatio).toBe(0);
      expect(result.pValue).toBeGreaterThan(0);
    });
  });

  describe('Binomial Tests', () => {
    it('should perform binomial test for large samples', () => {
      const result = StatisticalUtils.Binomial.binomialTest(15, 100, 0.1);
      
      expect(result.observedSuccesses).toBe(15);
      expect(result.expectedSuccesses).toBe(10); // 100 * 0.1
      expect(result.sampleSize).toBe(100);
      expect(result.testType).toBe('binomial');
      expect(result.pValue).toBeGreaterThan(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
      expect(typeof result.isSignificant).toBe('boolean');
    });

    it('should use conservative approximation for small samples', () => {
      const result = StatisticalUtils.Binomial.binomialTest(2, 10, 0.1);
      
      expect(result.sampleSize).toBe(10);
      expect(result.testType).toBe('binomial');
      expect(result.pValue).toBeGreaterThan(0);
    });

    it('should detect significant deviations', () => {
      // Very high success rate should be significant
      const result = StatisticalUtils.Binomial.binomialTest(25, 30, 0.1);
      
      expect(result.isSignificant).toBe(true);
      expect(result.pValue).toBeLessThan(0.05);
    });
  });

  describe('Power Analysis', () => {
    it('should calculate minimum sample size', () => {
      const sampleSize = StatisticalUtils.PowerAnalysis.minimumSampleSize(1000, 0.05, 0.95);
      
      expect(sampleSize).toBeGreaterThan(0);
      expect(sampleSize).toBeLessThan(1000);
      expect(Number.isInteger(sampleSize)).toBe(true);
    });

    it('should calculate statistical power', () => {
      const result = StatisticalUtils.PowerAnalysis.calculateStatisticalPower(100, 0.1);
      
      expect(result.observedPower).toBeGreaterThan(0);
      expect(result.observedPower).toBeLessThanOrEqual(1);
      expect(result.requiredSampleSize).toBeGreaterThan(0);
      expect(result.effectSize).toBe(0.1);
      expect(typeof result.adequatePower).toBe('boolean');
    });

    it('should flag inadequate power for small samples', () => {
      const result = StatisticalUtils.PowerAnalysis.calculateStatisticalPower(10, 0.1);
      
      expect(result.adequatePower).toBe(false);
      expect(result.observedPower).toBeLessThan(0.8);
    });

    it('should confirm adequate power for large samples', () => {
      const result = StatisticalUtils.PowerAnalysis.calculateStatisticalPower(200, 0.1);
      
      expect(result.adequatePower).toBe(true);
      expect(result.observedPower).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('Sanity Checks', () => {
    it('should validate correlation sum', () => {
      const validCorrelations = new Map([
        ['wordpress', 0.6],
        ['shopify', 0.3],
        ['drupal', 0.1]
      ]);
      
      const result = StatisticalUtils.SanityCheck.correlationSumCheck(validCorrelations);
      
      expect(result.passed).toBe(true);
      expect(result.message).toContain('100%');
    });

    it('should flag invalid correlation sum', () => {
      const invalidCorrelations = new Map([
        ['wordpress', 0.7],
        ['shopify', 0.4],
        ['drupal', 0.1]
      ]); // Sum = 1.2 (120%)
      
      const result = StatisticalUtils.SanityCheck.correlationSumCheck(invalidCorrelations);
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('120.00%');
    });

    it('should validate correlation ranges', () => {
      const validCorrelations = new Map([
        ['wordpress', 0.5],
        ['shopify', 0.3],
        ['drupal', 0.2]
      ]);
      
      const result = StatisticalUtils.SanityCheck.correlationRangeCheck(validCorrelations);
      
      expect(result.passed).toBe(true);
    });

    it('should flag negative correlations', () => {
      const invalidCorrelations = new Map([
        ['wordpress', 0.8],
        ['shopify', -0.1], // Invalid
        ['drupal', 0.3]
      ]);
      
      const result = StatisticalUtils.SanityCheck.correlationRangeCheck(invalidCorrelations);
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Negative');
    });

    it('should flag correlations over 100%', () => {
      const invalidCorrelations = new Map([
        ['wordpress', 1.2], // Invalid
        ['shopify', 0.5]
      ]);
      
      const result = StatisticalUtils.SanityCheck.correlationRangeCheck(invalidCorrelations);
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('> 100%');
    });

    it('should validate Bayesian consistency', () => {
      // P(A|B) × P(B) should ≈ P(B|A) × P(A)
      const pAGivenB = 0.8;
      const pB = 0.3;
      const pBGivenA = 0.6;
      const pA = 0.4;
      
      const result = StatisticalUtils.SanityCheck.bayesianConsistencyCheck(
        pAGivenB, pB, pBGivenA, pA
      );
      
      // Left: 0.8 × 0.3 = 0.24, Right: 0.6 × 0.4 = 0.24 (perfect match)
      expect(result.passed).toBe(true);
    });

    it('should flag Bayesian inconsistency', () => {
      const pAGivenB = 0.9;
      const pB = 0.5;
      const pBGivenA = 0.2;
      const pA = 0.3;
      
      const result = StatisticalUtils.SanityCheck.bayesianConsistencyCheck(
        pAGivenB, pB, pBGivenA, pA
      );
      
      // Left: 0.9 × 0.5 = 0.45, Right: 0.2 × 0.3 = 0.06 (major inconsistency)
      expect(result.passed).toBe(false);
      expect(result.message).toContain('inconsistency');
    });

    it('should validate frequency consistency', () => {
      const result = StatisticalUtils.SanityCheck.frequencyConsistencyCheck(
        25, 100, 0.25
      );
      
      expect(result.passed).toBe(true);
    });

    it('should flag frequency inconsistency', () => {
      const result = StatisticalUtils.SanityCheck.frequencyConsistencyCheck(
        25, 100, 0.3 // Should be 0.25
      );
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('mismatch');
    });
  });

  describe('Test Selector', () => {
    it('should select Fisher exact for small samples', () => {
      const smallTable = [[2, 3], [4, 5]]; // Total = 14
      
      const result = StatisticalUtils.TestSelector.selectAndRunTest(smallTable, 'small_sample');
      
      expect(result.method).toBe('fisher-exact');
      expect(result.reason).toContain('Fisher');
      expect(result.result).toBeDefined();
    });

    it('should select chi-square for large samples', () => {
      const largeTable = [[50, 60], [70, 80]]; // Total = 260
      
      const result = StatisticalUtils.TestSelector.selectAndRunTest(largeTable, 'large_sample');
      
      expect(result.method).toBe('chi-square');
      expect(result.reason).toContain('Chi-square');
      expect(result.result).toBeDefined();
    });

    it('should reject invalid contingency tables', () => {
      const invalidTable = [[1, 2, 3]]; // Not 2x2
      
      const result = StatisticalUtils.TestSelector.selectAndRunTest(invalidTable, 'invalid');
      
      expect(result.method).toBe('not-applicable');
      expect(result.recommendation).toBe('reject');
      expect(result.reason).toContain('Invalid');
    });

    it('should reject negative values', () => {
      const negativeTable = [[-1, 5], [3, 7]];
      
      const result = StatisticalUtils.TestSelector.selectAndRunTest(negativeTable, 'negative');
      
      expect(result.method).toBe('not-applicable');
      expect(result.recommendation).toBe('reject');
      expect(result.reason).toContain('negative');
    });

    it('should provide appropriate recommendations', () => {
      // Create a highly significant result
      const significantTable = [[40, 10], [10, 40]];
      
      const result = StatisticalUtils.TestSelector.selectAndRunTest(significantTable, 'significant');
      
      expect(['use', 'caution']).toContain(result.recommendation);
      if (result.result?.isSignificant) {
        expect(['use', 'caution']).toContain(result.recommendation);
      } else {
        expect(result.recommendation).toBe('reject');
      }
    });
  });

  describe('Distribution Analysis', () => {
    it('should calculate distribution moments', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const moments = StatisticalUtils.Distribution.calculateDistributionMoments(values);
      
      expect(moments.mean).toBe(5.5);
      expect(moments.variance).toBeCloseTo(8.25, 2);
      expect(moments.stdDev).toBeCloseTo(2.87, 2);
      expect(moments.skewness).toBeCloseTo(0, 1); // Symmetric distribution
      expect(moments.kurtosis).toBeCloseTo(-1.2, 1); // Uniform distribution
    });

    it('should handle empty arrays', () => {
      const moments = StatisticalUtils.Distribution.calculateDistributionMoments([]);
      
      expect(moments.mean).toBe(0);
      expect(moments.variance).toBe(0);
      expect(moments.stdDev).toBe(0);
      expect(moments.skewness).toBe(0);
      expect(moments.kurtosis).toBe(0);
    });

    it('should detect outliers', () => {
      const values = [1, 2, 3, 4, 5, 100]; // 100 is clear outlier
      
      const outliers = StatisticalUtils.Distribution.detectOutliers(values, 2.0);
      
      expect(outliers).toHaveLength(1);
      expect(outliers[0].value).toBe(100);
      expect(outliers[0].zScore).toBeGreaterThan(2.0);
    });

    it('should not flag normal values as outliers', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const outliers = StatisticalUtils.Distribution.detectOutliers(values, 2.5);
      
      expect(outliers).toHaveLength(0);
    });

    it('should handle constant values', () => {
      const values = [5, 5, 5, 5, 5];
      
      const outliers = StatisticalUtils.Distribution.detectOutliers(values);
      
      expect(outliers).toHaveLength(0); // No outliers in constant data
    });
  });

  describe('Statistical Constants', () => {
    it('should have correct constant values', () => {
      expect(StatisticalUtils.Constants.ALPHA).toBe(0.05);
      expect(StatisticalUtils.Constants.CHI_SQUARE_MIN_EXPECTED).toBe(5);
      expect(StatisticalUtils.Constants.FISHER_MAX_TOTAL).toBe(100);
      expect(StatisticalUtils.Constants.MINIMUM_SAMPLE_SIZE).toBe(30);
      expect(StatisticalUtils.Constants.HIGH_CORRELATION_THRESHOLD).toBe(0.7);
      expect(StatisticalUtils.Constants.PROBABILITY_TOLERANCE).toBe(0.01);
      expect(StatisticalUtils.Constants.BAYESIAN_ERROR_TOLERANCE).toBe(0.05);
    });
  });

  describe('Integration Tests', () => {
    it('should process realistic frequency analysis scenario', () => {
      // Simulate header analysis scenario
      const totalSites = 150;
      const headerOccurrences = 45;
      const expectedRate = 0.2; // 20% baseline
      
      // Test significance
      const binomialResult = StatisticalUtils.Binomial.binomialTest(
        headerOccurrences, totalSites, expectedRate
      );
      
      // Check power
      const powerResult = StatisticalUtils.PowerAnalysis.calculateStatisticalPower(
        totalSites, expectedRate
      );
      
      // Validate frequency
      const frequency = headerOccurrences / totalSites;
      const sanityResult = StatisticalUtils.SanityCheck.frequencyConsistencyCheck(
        headerOccurrences, totalSites, frequency
      );
      
      expect(binomialResult.testType).toBe('binomial');
      expect(powerResult.adequatePower).toBe(true); // 150 sites should be adequate
      expect(sanityResult.passed).toBe(true);
    });

    it('should handle CMS correlation analysis scenario', () => {
      // Create contingency table for header-CMS correlation
      const headerWithCms = 20;
      const headerWithoutCms = 10;
      const noHeaderWithCms = 15;
      const noHeaderNoCms = 55;
      
      const contingencyTable = [
        [headerWithCms, headerWithoutCms],
        [noHeaderWithCms, noHeaderNoCms]
      ];
      
      // Select and run appropriate test
      const testResult = StatisticalUtils.TestSelector.selectAndRunTest(
        contingencyTable, 'header_cms_correlation'
      );
      
      // Validate the correlation mathematically
      const totalSites = headerWithCms + headerWithoutCms + noHeaderWithCms + noHeaderNoCms;
      const headerFreq = (headerWithCms + headerWithoutCms) / totalSites;
      const cmsFreq = (headerWithCms + noHeaderWithCms) / totalSites;
      
      expect(testResult.method).toBeOneOf(['chi-square', 'fisher-exact']);
      expect(testResult.result).toBeDefined();
      expect(headerFreq).toBeCloseTo(0.3, 2); // 30/100
      expect(cmsFreq).toBeCloseTo(0.35, 2); // 35/100
    });
  });
});