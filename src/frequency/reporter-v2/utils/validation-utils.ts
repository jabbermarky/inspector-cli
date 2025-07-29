/**
 * Validation utilities for pattern analysis
 * Provides confidence scores and validation metrics for patterns
 */

import { PatternData } from '../../types/analyzer-interface.js';
import { isSet } from '../../utils/map-converter.js';

export interface ValidationScore {
  confidence: 'high' | 'medium' | 'low';
  score: number; // 0-1
  factors: ValidationFactor[];
  recommendation: string;
}

export interface ValidationFactor {
  factor: string;
  weight: number;
  score: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

/**
 * Calculate validation score for a pattern based on multiple factors
 */
export function calculateValidationScore(
  pattern: PatternData,
  totalSites: number
): ValidationScore {
  const factors: ValidationFactor[] = [];
  
  // Factor 1: Sample size adequacy (0-1)
  const sampleSizeScore = calculateSampleSizeScore(pattern.siteCount, totalSites);
  factors.push({
    factor: 'sample_size',
    weight: 0.25,
    score: sampleSizeScore,
    impact: sampleSizeScore > 0.7 ? 'positive' : sampleSizeScore > 0.4 ? 'neutral' : 'negative',
    description: `Sample size: ${pattern.siteCount} sites (${(pattern.frequency * 100).toFixed(1)}% of dataset)`
  });
  
  // Factor 2: Frequency stability (0-1)
  const frequencyScore = calculateFrequencyScore(pattern.frequency);
  factors.push({
    factor: 'frequency_stability',
    weight: 0.20,
    score: frequencyScore,
    impact: frequencyScore > 0.6 ? 'positive' : frequencyScore > 0.3 ? 'neutral' : 'negative',
    description: `Frequency: ${(pattern.frequency * 100).toFixed(1)}% (${getFrequencyCategory(pattern.frequency)})`
  });
  
  // Factor 3: Value diversity (0-1)
  const diversityScore = calculateValueDiversityScore(pattern.examples);
  factors.push({
    factor: 'value_diversity',
    weight: 0.15,
    score: diversityScore,
    impact: diversityScore > 0.5 ? 'positive' : diversityScore > 0.2 ? 'neutral' : 'negative',
    description: `Value diversity: ${getExampleCount(pattern.examples)} unique values`
  });
  
  // Factor 4: Pattern specificity (0-1)
  const specificityScore = calculatePatternSpecificityScore(pattern);
  factors.push({
    factor: 'pattern_specificity',
    weight: 0.20,
    score: specificityScore,
    impact: specificityScore > 0.7 ? 'positive' : specificityScore > 0.4 ? 'neutral' : 'negative',
    description: `Pattern specificity: ${getSpecificityDescription(specificityScore)}`
  });
  
  // Factor 5: Statistical significance (0-1)
  const significanceScore = calculateStatisticalSignificanceScore(pattern.siteCount, totalSites);
  factors.push({
    factor: 'statistical_significance',
    weight: 0.20,
    score: significanceScore,
    impact: significanceScore > 0.8 ? 'positive' : significanceScore > 0.5 ? 'neutral' : 'negative',
    description: `Statistical significance: ${getSignificanceDescription(significanceScore)}`
  });
  
  // Calculate weighted score
  const weightedScore = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);
  
  // Determine confidence level and recommendation
  const confidence = getConfidenceLevel(weightedScore);
  const recommendation = generateRecommendation(weightedScore, factors);
  
  return {
    confidence,
    score: weightedScore,
    factors,
    recommendation
  };
}

/**
 * Calculate sample size adequacy score
 */
function calculateSampleSizeScore(siteCount: number, totalSites: number): number {
  const frequency = siteCount / totalSites;
  
  // Adjust minimum sample size based on frequency
  let minSampleSize: number;
  if (frequency >= 0.5) minSampleSize = 30;      // High frequency patterns
  else if (frequency >= 0.1) minSampleSize = 50;  // Medium frequency patterns
  else if (frequency >= 0.05) minSampleSize = 100; // Low frequency patterns
  else minSampleSize = 200;                        // Very low frequency patterns
  
  // Score based on how well we meet the minimum
  if (siteCount >= minSampleSize * 2) return 1.0;
  if (siteCount >= minSampleSize * 1.5) return 0.9;
  if (siteCount >= minSampleSize) return 0.8;
  if (siteCount >= minSampleSize * 0.75) return 0.6;
  if (siteCount >= minSampleSize * 0.5) return 0.4;
  if (siteCount >= minSampleSize * 0.25) return 0.2;
  return 0.1;
}

/**
 * Calculate frequency stability score
 */
function calculateFrequencyScore(frequency: number): number {
  // Prefer frequencies that are neither too high nor too low
  if (frequency >= 0.05 && frequency <= 0.95) return 1.0; // Sweet spot
  if (frequency >= 0.02 && frequency <= 0.98) return 0.8; // Good
  if (frequency >= 0.01 && frequency <= 0.99) return 0.6; // Acceptable
  if (frequency >= 0.005) return 0.4; // Low but usable
  return 0.2; // Very low
}

/**
 * Calculate value diversity score
 */
function calculateValueDiversityScore(examples: Set<string> | null | undefined): number {
  if (!examples || !isSet(examples) || examples.size === 0) return 0.1;
  
  const uniqueCount = examples.size;
  
  // Score based on diversity
  if (uniqueCount >= 10) return 1.0;   // High diversity
  if (uniqueCount >= 5) return 0.8;    // Good diversity
  if (uniqueCount >= 3) return 0.6;    // Moderate diversity
  if (uniqueCount >= 2) return 0.4;    // Low diversity
  return 0.2;                          // Single value
}

/**
 * Calculate pattern specificity score based on pattern characteristics
 */
function calculatePatternSpecificityScore(pattern: PatternData): number {
  // This is a simplified implementation
  // In a full implementation, this would analyze the pattern name and values
  // to determine how platform/technology specific it is
  
  const patternName = pattern.pattern.toLowerCase();
  
  // Highly specific patterns (platform indicators)
  if (patternName.includes('wordpress') || 
      patternName.includes('drupal') || 
      patternName.includes('joomla') ||
      patternName.includes('shopify')) {
    return 0.9;
  }
  
  // Moderately specific patterns (technology indicators)
  if (patternName.includes('server') || 
      patternName.includes('powered-by') ||
      patternName.includes('generator')) {
    return 0.7;
  }
  
  // Generic patterns
  if (patternName.includes('content-type') || 
      patternName.includes('cache-control') ||
      patternName.includes('expires')) {
    return 0.3;
  }
  
  // Default moderate specificity
  return 0.5;
}

/**
 * Calculate statistical significance score
 */
function calculateStatisticalSignificanceScore(siteCount: number, totalSites: number): number {
  // Simplified chi-square-like calculation
  const frequency = siteCount / totalSites;
  const expectedCount = totalSites * 0.1; // Assume 10% base rate
  
  if (siteCount >= expectedCount * 2) return 1.0;  // Highly significant
  if (siteCount >= expectedCount * 1.5) return 0.9; // Very significant
  if (siteCount >= expectedCount) return 0.8;       // Significant
  if (siteCount >= expectedCount * 0.75) return 0.6; // Marginally significant
  if (siteCount >= expectedCount * 0.5) return 0.4;  // Low significance
  return 0.2; // Not significant
}

/**
 * Get confidence level from score
 */
function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

/**
 * Generate recommendation based on score and factors
 */
function generateRecommendation(score: number, factors: ValidationFactor[]): string {
  if (score >= 0.8) {
    return 'High confidence pattern. Reliable for analysis and recommendations.';
  } else if (score >= 0.6) {
    return 'Good confidence pattern. Suitable for most analyses with minor caveats.';
  } else if (score >= 0.4) {
    const weakFactors = factors.filter(f => f.impact === 'negative').map(f => f.factor);
    return `Moderate confidence. Consider limitations: ${weakFactors.join(', ')}.`;
  } else {
    const majorIssues = factors.filter(f => f.score < 0.3).map(f => f.factor);
    return `Low confidence pattern. Significant limitations: ${majorIssues.join(', ')}. Use with caution.`;
  }
}

/**
 * Helper functions for descriptions
 */
function getFrequencyCategory(frequency: number): string {
  if (frequency >= 0.75) return 'very common';
  if (frequency >= 0.25) return 'common';
  if (frequency >= 0.05) return 'uncommon';
  return 'rare';
}

function getExampleCount(examples: Set<string> | null | undefined): number {
  return examples && isSet(examples) ? examples.size : 0;
}

function getSpecificityDescription(score: number): string {
  if (score >= 0.8) return 'highly platform-specific';
  if (score >= 0.6) return 'moderately specific';
  if (score >= 0.4) return 'somewhat generic';
  return 'very generic';
}

function getSignificanceDescription(score: number): string {
  if (score >= 0.8) return 'statistically significant';
  if (score >= 0.6) return 'marginally significant';
  return 'not significant';
}

/**
 * Batch validation scoring for multiple patterns
 */
export function calculateValidationScores(
  patterns: Map<string, PatternData>,
  totalSites: number
): Map<string, ValidationScore> {
  const scores = new Map<string, ValidationScore>();
  
  patterns.forEach((pattern, name) => {
    scores.set(name, calculateValidationScore(pattern, totalSites));
  });
  
  return scores;
}

/**
 * Get validation summary statistics
 */
export function getValidationSummary(scores: Map<string, ValidationScore>) {
  const total = scores.size;
  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;
  
  let totalScore = 0;
  
  scores.forEach(score => {
    totalScore += score.score;
    
    switch (score.confidence) {
      case 'high': highConfidence++; break;
      case 'medium': mediumConfidence++; break;
      case 'low': lowConfidence++; break;
    }
  });
  
  return {
    totalPatterns: total,
    averageScore: total > 0 ? totalScore / total : 0,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    confidenceDistribution: {
      high: total > 0 ? (highConfidence / total) * 100 : 0,
      medium: total > 0 ? (mediumConfidence / total) * 100 : 0,
      low: total > 0 ? (lowConfidence / total) * 100 : 0
    }
  };
}