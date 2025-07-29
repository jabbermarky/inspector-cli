/**
 * Unit tests for ConfidenceCalculator
 * 
 * Focused tests for the confidence calculation utility,
 * testing the mathematical calculations and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { ConfidenceCalculator } from '../recommendations/utils/confidence-calculator.js';

describe('ConfidenceCalculator', () => {
  describe('calculateBasicConfidence', () => {
    it('should calculate confidence based on frequency', () => {
      const result = ConfidenceCalculator.calculateBasicConfidence(0.8, 80, 100);
      
      expect(result.value).toBeCloseTo(0.88, 2); // 0.8 * 1.1 (good sample size bonus)
      expect(result.level).toBe('very-high');
    });

    it('should apply low sample size penalty', () => {
      // 3% sample ratio (3/100) should get penalty
      const result = ConfidenceCalculator.calculateBasicConfidence(0.6, 3, 100);
      
      expect(result.value).toBeCloseTo(0.42, 2); // 0.6 * 0.7 (low sample penalty)
      expect(result.level).toBe('medium');
    });

    it('should apply good sample size bonus', () => {
      // 25% sample ratio (25/100) should get bonus
      const result = ConfidenceCalculator.calculateBasicConfidence(0.5, 25, 100);
      
      expect(result.value).toBeCloseTo(0.55, 2); // 0.5 * 1.1 (good sample bonus)
      expect(result.level).toBe('medium');
    });

    it('should handle normal sample sizes without adjustment', () => {
      // 10% sample ratio (10/100) - between 5% and 20%, no adjustment
      const result = ConfidenceCalculator.calculateBasicConfidence(0.7, 10, 100);
      
      expect(result.value).toBe(0.7); // No adjustment
      expect(result.level).toBe('high');
    });

    it('should clamp values to 0-1 range', () => {
      // Test upper clamp
      const highResult = ConfidenceCalculator.calculateBasicConfidence(0.95, 50, 100);
      expect(highResult.value).toBeLessThanOrEqual(1);
      
      // Test lower clamp - negative input should be clamped to 0
      const lowResult = ConfidenceCalculator.calculateBasicConfidence(-0.1, 10, 100);
      expect(lowResult.value).toBe(0);
      expect(lowResult.level).toBe('low');
    });

    it('should handle edge case of zero total sites', () => {
      // This would cause division by zero, should be handled gracefully
      const result = ConfidenceCalculator.calculateBasicConfidence(0.5, 10, 0);
      
      // Should not crash and return reasonable value
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(1);
    });

    it('should assign correct confidence levels', () => {
      expect(ConfidenceCalculator.calculateBasicConfidence(0.9, 50, 100).level).toBe('very-high');
      expect(ConfidenceCalculator.calculateBasicConfidence(0.7, 50, 100).level).toBe('high');
      expect(ConfidenceCalculator.calculateBasicConfidence(0.5, 50, 100).level).toBe('medium');
      expect(ConfidenceCalculator.calculateBasicConfidence(0.3, 50, 100).level).toBe('low');
    });
  });

  describe('fromStatisticalTest', () => {
    it('should assign high confidence for significant p-values', () => {
      const result = ConfidenceCalculator.fromStatisticalTest(0.01);
      
      expect(result.value).toBe(0.9);
      expect(result.level).toBe('very-high');
    });

    it('should assign medium confidence for marginally significant p-values', () => {
      const result = ConfidenceCalculator.fromStatisticalTest(0.08);
      
      expect(result.value).toBe(0.7);
      expect(result.level).toBe('high');
    });

    it('should assign low confidence for non-significant p-values', () => {
      const result = ConfidenceCalculator.fromStatisticalTest(0.15);
      
      expect(result.value).toBe(0.5);
      expect(result.level).toBe('medium');
    });

    it('should handle edge case p-values', () => {
      // Exactly at threshold - p=0.05 should give 0.7, p=0.1 should give 0.5
      expect(ConfidenceCalculator.fromStatisticalTest(0.05).value).toBe(0.7);
      expect(ConfidenceCalculator.fromStatisticalTest(0.1).value).toBe(0.5);
      
      // Very small p-value
      expect(ConfidenceCalculator.fromStatisticalTest(0.001).value).toBe(0.9);
      
      // Large p-value
      expect(ConfidenceCalculator.fromStatisticalTest(0.8).value).toBe(0.5);
    });
  });

  describe('combineConfidences', () => {
    it('should handle empty array', () => {
      const result = ConfidenceCalculator.combineConfidences([]);
      
      expect(result.value).toBe(0);
      expect(result.level).toBe('low');
    });

    it('should calculate geometric mean for multiple confidences', () => {
      const result = ConfidenceCalculator.combineConfidences([0.8, 0.6, 0.9]);
      
      // Geometric mean: (0.8 * 0.6 * 0.9)^(1/3) = (0.432)^(1/3) ≈ 0.756
      expect(result.value).toBeCloseTo(0.756, 2);
      expect(result.level).toBe('high');
    });

    it('should handle single confidence value', () => {
      const result = ConfidenceCalculator.combineConfidences([0.7]);
      
      expect(result.value).toBe(0.7);
      expect(result.level).toBe('high');
    });

    it('should be affected by low confidence values', () => {
      // One low confidence should pull down the overall score
      const result = ConfidenceCalculator.combineConfidences([0.9, 0.9, 0.1]);
      
      // Geometric mean: (0.9 * 0.9 * 0.1)^(1/3) = (0.081)^(1/3) ≈ 0.433
      expect(result.value).toBeCloseTo(0.433, 2);
      expect(result.level).toBe('medium');
    });

    it('should handle identical confidence values', () => {
      const result = ConfidenceCalculator.combineConfidences([0.6, 0.6, 0.6]);
      
      expect(result.value).toBeCloseTo(0.6, 2);
      expect(result.level).toBe('high');
    });

    it('should handle extreme values', () => {
      // All high values
      const highResult = ConfidenceCalculator.combineConfidences([0.95, 0.98, 0.92]);
      expect(highResult.value).toBeGreaterThan(0.9);
      expect(highResult.level).toBe('very-high');
      
      // All low values
      const lowResult = ConfidenceCalculator.combineConfidences([0.1, 0.2, 0.15]);
      expect(lowResult.value).toBeLessThan(0.2);
      expect(lowResult.level).toBe('low');
    });

    it('should be commutative (order should not matter)', () => {
      const result1 = ConfidenceCalculator.combineConfidences([0.7, 0.8, 0.6]);
      const result2 = ConfidenceCalculator.combineConfidences([0.6, 0.7, 0.8]);
      
      expect(result1.value).toBeCloseTo(result2.value, 10);
      expect(result1.level).toBe(result2.level);
    });
  });

  describe('confidence level boundaries', () => {
    it('should correctly assign very-high level', () => {
      expect(ConfidenceCalculator.calculateBasicConfidence(0.8, 50, 100).level).toBe('very-high');
      expect(ConfidenceCalculator.calculateBasicConfidence(0.85, 50, 100).level).toBe('very-high');
      expect(ConfidenceCalculator.calculateBasicConfidence(1.0, 50, 100).level).toBe('very-high');
    });

    it('should correctly assign high level', () => {
      expect(ConfidenceCalculator.calculateBasicConfidence(0.6, 10, 100).level).toBe('high'); // No bonus (10% sample)
      expect(ConfidenceCalculator.calculateBasicConfidence(0.7, 10, 100).level).toBe('high'); // No bonus (10% sample)
      // Note: 0.79 with 50% sample gets 1.1x bonus = 0.869 = very-high
    });

    it('should correctly assign medium level', () => {
      expect(ConfidenceCalculator.calculateBasicConfidence(0.4, 10, 100).level).toBe('medium'); // No bonus (10% sample)
      expect(ConfidenceCalculator.calculateBasicConfidence(0.5, 10, 100).level).toBe('medium'); // No bonus (10% sample)
      // Note: 0.59 with 50% sample gets 1.1x bonus = 0.649 = high
    });

    it('should correctly assign low level', () => {
      expect(ConfidenceCalculator.calculateBasicConfidence(0.0, 10, 100).level).toBe('low'); // No bonus (10% sample)
      expect(ConfidenceCalculator.calculateBasicConfidence(0.2, 10, 100).level).toBe('low'); // No bonus (10% sample)
      expect(ConfidenceCalculator.calculateBasicConfidence(0.39, 10, 100).level).toBe('low'); // No bonus (10% sample)
    });

    it('should handle boundary values correctly', () => {
      // Exact boundary values (use 10% sample to avoid bonus)
      expect(ConfidenceCalculator.calculateBasicConfidence(0.8, 10, 100).level).toBe('very-high');
      expect(ConfidenceCalculator.calculateBasicConfidence(0.6, 10, 100).level).toBe('high');
      expect(ConfidenceCalculator.calculateBasicConfidence(0.4, 10, 100).level).toBe('medium');
      
      // Just below boundaries (use 10% sample to avoid bonus)
      expect(ConfidenceCalculator.calculateBasicConfidence(0.799, 10, 100).level).toBe('high');
      expect(ConfidenceCalculator.calculateBasicConfidence(0.599, 10, 100).level).toBe('medium');
      expect(ConfidenceCalculator.calculateBasicConfidence(0.399, 10, 100).level).toBe('low');
    });
  });

  describe('realistic scenarios', () => {
    it('should handle common header frequency scenarios', () => {
      // Very common header (server)
      const commonHeader = ConfidenceCalculator.calculateBasicConfidence(0.95, 95, 100);
      expect(commonHeader.level).toBe('very-high');
      
      // Moderately common header (x-powered-by)
      const moderateHeader = ConfidenceCalculator.calculateBasicConfidence(0.6, 60, 100);
      expect(moderateHeader.level).toBe('high');
      
      // Rare but significant header
      const rareHeader = ConfidenceCalculator.calculateBasicConfidence(0.05, 5, 100);
      expect(rareHeader.level).toBe('low');
    });

    it('should handle small dataset scenarios', () => {
      // Small dataset with good pattern
      const smallGood = ConfidenceCalculator.calculateBasicConfidence(0.8, 8, 10);
      expect(smallGood.value).toBeGreaterThan(0.8); // Gets bonus for good sample ratio
      
      // Small dataset with poor pattern but high sample ratio gets bonus
      const smallPoor = ConfidenceCalculator.calculateBasicConfidence(0.3, 3, 10);
      expect(smallPoor.value).toBeCloseTo(0.33, 2); // 30% sample ratio gets 1.1x bonus = 0.33
    });

    it('should combine confidences from multiple analyzers realistically', () => {
      // Strong agreement across analyzers
      const strongAgreement = ConfidenceCalculator.combineConfidences([0.9, 0.85, 0.88]);
      expect(strongAgreement.level).toBe('very-high');
      
      // Mixed agreement - geometric mean of [0.8, 0.4, 0.7] = (0.224)^(1/3) ≈ 0.607 = high
      const mixedAgreement = ConfidenceCalculator.combineConfidences([0.8, 0.4, 0.7]);
      expect(mixedAgreement.level).toBe('high');
      
      // Weak agreement
      const weakAgreement = ConfidenceCalculator.combineConfidences([0.3, 0.2, 0.4]);
      expect(weakAgreement.level).toBe('low');
    });
  });
});