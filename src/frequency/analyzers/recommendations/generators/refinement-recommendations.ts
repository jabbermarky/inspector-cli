/**
 * Refinement recommendations generator
 * Simple pattern refinement suggestions
 */

import type { 
  PreprocessedData,
  AnalysisOptions,
  AggregatedResults,
  PatternData 
} from '../../../types/analyzer-interface.js';
import type { SimpleRecommendation } from '../core/types.js';
import { ConfidenceCalculator } from '../utils/confidence-calculator.js';

export class RefinementRecommendationsGenerator {
  
  generate(
    data: PreprocessedData,
    options: AnalysisOptions,
    aggregatedResults?: AggregatedResults
  ): SimpleRecommendation[] {
    const recommendations: SimpleRecommendation[] = [];
    
    if (!aggregatedResults?.headers?.patterns) {
      return recommendations;
    }

    // Look for patterns that could be refined
    for (const [headerName, patternData] of aggregatedResults.headers.patterns) {
      if (patternData.siteCount < options.minOccurrences) continue;
      
      const recommendation = this.createRefinementRecommendation(
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

  private createRefinementRecommendation(
    headerName: string,
    patternData: PatternData,
    totalSites: number,
    aggregatedResults: AggregatedResults
  ): SimpleRecommendation | null {
    
    // Get vendor data for potential refinements
    const vendorData = aggregatedResults.vendor?.analyzerSpecific?.vendorsByHeader?.get(headerName);
    
    // Only suggest refinements for patterns with vendor info and good frequency
    if (!vendorData || vendorData.length === 0 || patternData.frequency < 0.1) {
      return null;
    }

    const primaryVendor = vendorData[0];
    
    // Suggest vendor-specific refinement
    const refinedPattern = `${headerName}.*${primaryVendor.vendor.toLowerCase()}`;
    
    const confidence = ConfidenceCalculator.calculateBasicConfidence(
      patternData.frequency * 0.8, // Refined patterns typically have lower frequency
      Math.round(patternData.siteCount * 0.6), // Estimate refined count
      totalSites
    );

    return {
      type: 'refine',
      pattern: headerName,
      action: `refine_to_${refinedPattern}`,
      confidence,
      reasoning: `Pattern contains ${primaryVendor.vendor} information and could be refined for better specificity`
    };
  }
}