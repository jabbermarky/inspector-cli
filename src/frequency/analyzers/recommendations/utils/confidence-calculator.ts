/**
 * Simple confidence calculation utility
 * Focused on essential confidence scoring without over-engineering
 */

import type { SimpleConfidence } from '../core/types.js';

export class ConfidenceCalculator {
  /**
   * Calculate confidence based on frequency and basic factors
   */
  static calculateBasicConfidence(
    frequency: number,
    siteCount: number,
    totalSites: number
  ): SimpleConfidence {
    // Simple confidence calculation based on frequency and sample size
    let value = frequency;
    
    // Adjust for sample size adequacy
    const sampleRatio = siteCount / totalSites;
    if (sampleRatio < 0.05) value *= 0.7; // Low sample size penalty
    else if (sampleRatio > 0.2) value *= 1.1; // Good sample size bonus
    
    // Clamp to 0-1 range
    value = Math.max(0, Math.min(1, value));
    
    return {
      value,
      level: this.getConfidenceLevel(value)
    };
  }

  /**
   * Calculate confidence from statistical significance
   */
  static fromStatisticalTest(pValue: number): SimpleConfidence {
    const value = pValue < 0.05 ? 0.9 : pValue < 0.1 ? 0.7 : 0.5;
    
    return {
      value,
      level: this.getConfidenceLevel(value)
    };
  }

  /**
   * Combine multiple confidence scores
   */
  static combineConfidences(confidences: number[]): SimpleConfidence {
    if (confidences.length === 0) {
      return { value: 0, level: 'low' };
    }
    
    // Simple geometric mean for combining confidences
    const product = confidences.reduce((acc, conf) => acc * conf, 1);
    const value = Math.pow(product, 1 / confidences.length);
    
    return {
      value,
      level: this.getConfidenceLevel(value)
    };
  }

  private static getConfidenceLevel(value: number): 'low' | 'medium' | 'high' | 'very-high' {
    if (value >= 0.8) return 'very-high';
    if (value >= 0.6) return 'high';
    if (value >= 0.4) return 'medium';
    return 'low';
  }
}