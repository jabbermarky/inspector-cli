/**
 * Filtering recommendations generator
 * Focused on core filtering logic without complexity
 */

import type { 
  PreprocessedData,
  AnalysisOptions,
  AggregatedResults,
  PatternData 
} from '../../../types/analyzer-interface.js';
import type { SimpleRecommendation, FilteringRecommendations } from '../core/types.js';
import { ConfidenceCalculator } from '../utils/confidence-calculator.js';

export class FilteringRecommendationsGenerator {
  
  generate(
    data: PreprocessedData,
    options: AnalysisOptions,
    aggregatedResults?: AggregatedResults
  ): FilteringRecommendations {
    const recommendations: SimpleRecommendation[] = [];
    
    if (!aggregatedResults?.headers?.patterns) {
      return this.emptyResult();
    }

    // Process each header pattern
    for (const [headerName, patternData] of aggregatedResults.headers.patterns) {
      if (patternData.siteCount < options.minOccurrences) continue;
      
      const recommendation = this.createFilteringRecommendation(
        headerName,
        patternData,
        data.totalSites,
        aggregatedResults
      );
      
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return {
      recommendations,
      totalPatterns: recommendations.length,
      confidenceDistribution: this.calculateDistribution(recommendations)
    };
  }

  private createFilteringRecommendation(
    headerName: string,
    patternData: PatternData,
    totalSites: number,
    aggregatedResults: AggregatedResults
  ): SimpleRecommendation | null {
    
    // Get semantic analysis if available
    const semanticData = aggregatedResults.semantic?.analyzerSpecific?.headerPatterns?.get(headerName);
    
    // Simple filtering decision based on frequency and semantic category
    const confidence = ConfidenceCalculator.calculateBasicConfidence(
      patternData.frequency,
      patternData.siteCount,
      totalSites
    );

    // Determine action based on semantic category and frequency
    let action: string;
    let reasoning: string;

    if (semanticData?.category === 'security' && patternData.frequency > 0.3) {
      action = 'filter';
      reasoning = `High-frequency security header (${Math.round(patternData.frequency * 100)}%) should be filtered`;
    } else if (patternData.frequency < 0.05) {
      action = 'filter';
      reasoning = `Low-frequency pattern (${Math.round(patternData.frequency * 100)}%) likely noise`;
    } else if (patternData.frequency > 0.7) {
      action = 'retain';
      reasoning = `High-frequency pattern (${Math.round(patternData.frequency * 100)}%) likely important`;
    } else {
      action = 'retain';
      reasoning = `Moderate frequency (${Math.round(patternData.frequency * 100)}%) warrants retention`;
    }

    return {
      type: action === 'filter' ? 'filter' : 'retain',
      pattern: headerName,
      action,
      confidence,
      reasoning
    };
  }

  private calculateDistribution(recommendations: SimpleRecommendation[]) {
    if (recommendations.length === 0) {
      // For empty results, distribute evenly to sum to 1
      return { low: 0.25, medium: 0.25, high: 0.25, veryHigh: 0.25 };
    }

    const counts = { low: 0, medium: 0, high: 0, veryHigh: 0 };
    
    for (const rec of recommendations) {
      switch (rec.confidence.level) {
        case 'low': counts.low++; break;
        case 'medium': counts.medium++; break;
        case 'high': counts.high++; break;
        case 'very-high': counts.veryHigh++; break;
      }
    }

    const total = recommendations.length;
    return {
      low: counts.low / total,
      medium: counts.medium / total,
      high: counts.high / total,
      veryHigh: counts.veryHigh / total
    };
  }

  private emptyResult(): FilteringRecommendations {
    return {
      recommendations: [],
      totalPatterns: 0,
      confidenceDistribution: { low: 0.25, medium: 0.25, high: 0.25, veryHigh: 0.25 }
    };
  }
}