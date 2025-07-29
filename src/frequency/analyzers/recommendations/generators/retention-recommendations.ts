/**
 * Retention recommendations generator
 * Simple logic for pattern retention decisions
 */

import type { 
  PreprocessedData,
  AnalysisOptions,
  AggregatedResults,
  PatternData 
} from '../../../types/analyzer-interface.js';
import type { SimpleRecommendation } from '../core/types.js';
import { ConfidenceCalculator } from '../utils/confidence-calculator.js';

export class RetentionRecommendationsGenerator {
  
  generate(
    data: PreprocessedData,
    options: AnalysisOptions,
    aggregatedResults?: AggregatedResults
  ): SimpleRecommendation[] {
    const recommendations: SimpleRecommendation[] = [];
    
    if (!aggregatedResults?.headers?.patterns) {
      return recommendations;
    }

    // Find patterns with strategic value
    for (const [headerName, patternData] of aggregatedResults.headers.patterns) {
      if (patternData.siteCount < options.minOccurrences) continue;
      
      const recommendation = this.createRetentionRecommendation(
        headerName,
        patternData,
        data.totalSites,
        aggregatedResults
      );
      
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  private createRetentionRecommendation(
    headerName: string,
    patternData: PatternData,
    totalSites: number,
    aggregatedResults: AggregatedResults
  ): SimpleRecommendation | null {
    
    // Get vendor and semantic data
    const vendorData = aggregatedResults.vendor?.analyzerSpecific?.vendorsByHeader?.get(headerName);
    const semanticData = aggregatedResults.semantic?.analyzerSpecific?.headerPatterns?.get(headerName);
    
    // Check for strategic value indicators
    const hasVendorInfo = vendorData && vendorData.length > 0;
    const isSemanticallyCategorized = semanticData?.category && semanticData.category !== 'unknown';
    const hasGoodFrequency = patternData.frequency >= 0.1 && patternData.frequency <= 0.8;
    
    // Only recommend retention for strategically valuable patterns
    if (!hasVendorInfo && !isSemanticallyCategorized) {
      return null;
    }

    let reasoning = '';
    const confidenceFactors: number[] = [];

    if (hasVendorInfo) {
      reasoning = `Contains vendor information (${vendorData![0].vendor})`;
      confidenceFactors.push(0.8);
    }

    if (isSemanticallyCategorized) {
      if (reasoning) {
        reasoning += ` and categorized as ${semanticData!.category}`;
      } else {
        reasoning = `Categorized as ${semanticData!.category}`;
      }
      confidenceFactors.push(0.7);
    }

    if (hasGoodFrequency) {
      if (reasoning) {
        reasoning += ` with optimal frequency (${Math.round(patternData.frequency * 100)}%)`;
      } else {
        reasoning = `Optimal frequency (${Math.round(patternData.frequency * 100)}%)`;
      }
      confidenceFactors.push(0.8);
    } else {
      confidenceFactors.push(0.6);
    }

    const confidence = ConfidenceCalculator.combineConfidences(confidenceFactors);

    return {
      type: 'retain',
      pattern: headerName,
      action: 'retain_for_strategic_value',
      confidence,
      reasoning
    };
  }
}