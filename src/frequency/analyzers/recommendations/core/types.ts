/**
 * Core types for the modular recommendation system
 * Simplified and focused types without over-engineering
 */

export interface SimpleConfidence {
  value: number; // 0-1
  level: 'low' | 'medium' | 'high' | 'very-high';
}

export interface SimpleRecommendation {
  type: 'filter' | 'retain' | 'refine';
  pattern: string;
  action: string;
  confidence: SimpleConfidence;
  reasoning: string;
}

export interface FilteringRecommendations {
  recommendations: SimpleRecommendation[];
  totalPatterns: number;
  confidenceDistribution: {
    low: number;
    medium: number;
    high: number;
    veryHigh: number;
  };
}

export interface RecommendationSummary {
  filtering: FilteringRecommendations;
  retention: SimpleRecommendation[];
  refinement: SimpleRecommendation[];
  overallConfidence: SimpleConfidence;
}