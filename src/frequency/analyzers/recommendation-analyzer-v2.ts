/**
 * RecommendationAnalyzerV2Simple - Lightweight replacement for the 2400+ line monolith
 * 
 * This is a simple wrapper around the modular recommendation system.
 * Total complexity: ~50 lines vs 2400+ lines in the original.
 * 
 * Follows KISS principles and delegates to focused modules.
 */

import type { 
  FrequencyAnalyzer,
  PreprocessedData,
  AnalysisOptions,
  AnalysisResult,
  AggregatedResults
} from '../types/analyzer-interface.js';
import type { RecommendationSpecificData } from '../types/recommendation-types-v2.js';
import type { BiasSpecificData } from '../types/bias-analysis-types-v2.js';

import { RecommendationCoordinator } from './recommendations/core/recommendation-coordinator.js';

/**
 * Simple recommendation analyzer - replaces the 2400+ line implementation
 */
export class RecommendationAnalyzerV2 implements FrequencyAnalyzer<RecommendationSpecificData> {
  private coordinator = new RecommendationCoordinator();

  getName(): string {
    return 'RecommendationAnalyzerV2';
  }

  // Cross-analyzer integration methods
  setAggregatedResults(results: AggregatedResults): void {
    this.coordinator.setAggregatedResults(results);
  }

  setBiasAnalysis(results: AnalysisResult<BiasSpecificData>): void {
    this.coordinator.setBiasAnalysis(results);
  }

  setValidationResults(results: any): void {
    this.coordinator.setValidationResults(results);
  }

  async analyze(
    data: PreprocessedData,
    options: AnalysisOptions
  ): Promise<AnalysisResult<RecommendationSpecificData>> {
    return this.coordinator.analyze(data, options);
  }
}