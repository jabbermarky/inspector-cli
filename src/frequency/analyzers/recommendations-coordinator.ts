/**
 * RecommendationsCoordinator - Phase 3 implementation
 * Bridges the new architecture with the existing recommendations system
 */

import type { 
  AggregatedResults
} from '../types/analyzer-interface.js';
import type { FrequencyOptions } from '../types.js';
import { generateRecommendations, type RecommendationInput } from '../recommender.js';
import { createModuleLogger } from '../../utils/logger.js';
import type { DetectionDataPoint, FrequencyOptionsWithDefaults } from '../types.js';

const logger = createModuleLogger('recommendations-coordinator');

export class RecommendationsCoordinator {
  /**
   * Generate recommendations by converting new architecture results to legacy format
   */
  async generateRecommendations(
    aggregatedResults: AggregatedResults,
    dataPoints: DetectionDataPoint[],
    options: FrequencyOptions
  ): Promise<{
    learn: any;
    detectCms: any;
    groundTruth: any;
    biasAnalysis: any;
  }> {
    logger.info('Converting new architecture results for recommendations');

    // Convert new architecture results to legacy format expected by recommender
    const headerPatterns = this.convertHeaderPatternsToLegacy(aggregatedResults.headers);
    const metaPatterns = this.convertMetaPatternsToLegacy(aggregatedResults.metaTags);
    const scriptPatterns = this.convertScriptPatternsToLegacy(aggregatedResults.scripts);

    // Convert options to legacy format
    const legacyOptions: FrequencyOptionsWithDefaults = {
      dataSource: 'cms-analysis',
      dataDir: './data/cms-analysis',
      minSites: 100,
      minOccurrences: options.minOccurrences || 10,
      pageType: 'all',
      output: options.output || 'human',
      outputFile: options.outputFile || '',
      includeRecommendations: true,
      includeCurrentFilters: true,
      debugCalculations: false,
      enableValidation: true,
      skipStatisticalTests: false,
      validationStopOnError: false,
      validationDebugMode: false,
      ...options
    };

    
    const recommendationInput: RecommendationInput = {
      headerPatterns,
      metaPatterns,
      scriptPatterns,
      dataPoints,
      options: legacyOptions
    };

    try {
      const result = await generateRecommendations(recommendationInput);
      logger.info('Recommendations generated successfully');
      return {
        learn: result.learn,
        detectCms: result.detectCms,
        groundTruth: result.groundTruth,
        biasAnalysis: result.biasAnalysis
      };
    } catch (error) {
      logger.error('Failed to generate recommendations', { error: (error as Error).message });
      
      // Return empty recommendations on error
      return {
        learn: {
          currentlyFiltered: [],
          recommendToFilter: [],
          recommendToKeep: []
        },
        detectCms: {
          newPatternOpportunities: [],
          patternsToRefine: []
        },
        groundTruth: {
          currentlyUsedPatterns: [],
          potentialNewRules: []
        },
        biasAnalysis: null
      };
    }
  }

  /**
   * Convert new architecture header results to legacy format
   */
  private convertHeaderPatternsToLegacy(headerResult: any): Map<string, any[]> {
    const legacyPatterns = new Map<string, any[]>();

    if (!headerResult?.patterns) {
      return legacyPatterns;
    }

    for (const [patternName, patternData] of headerResult.patterns) {
      const legacyPattern = {
        pattern: patternName,
        frequency: patternData.frequency,
        occurrences: patternData.siteCount,
        examples: patternData.examples || [],
        confidence: Math.min(patternData.frequency * 2, 1), // Estimate confidence from frequency
        cmsCorrelation: { 'Unknown': patternData.frequency } // Basic correlation data
      };

      // Group by header name (extract from pattern if needed)
      const headerName = this.extractHeaderName(patternName);
      if (!legacyPatterns.has(headerName)) {
        legacyPatterns.set(headerName, []);
      }
      legacyPatterns.get(headerName)!.push(legacyPattern);
    }

    return legacyPatterns;
  }

  /**
   * Convert new architecture meta results to legacy format
   */
  private convertMetaPatternsToLegacy(metaResult: any): Map<string, any[]> {
    const legacyPatterns = new Map<string, any[]>();

    if (!metaResult?.patterns) {
      return legacyPatterns;
    }

    for (const [patternName, patternData] of metaResult.patterns) {
      const legacyPattern = {
        pattern: patternName,
        frequency: patternData.frequency,
        occurrences: patternData.siteCount,
        examples: patternData.examples || []
      };

      // Use pattern name as the key for meta tags
      if (!legacyPatterns.has(patternName)) {
        legacyPatterns.set(patternName, []);
      }
      legacyPatterns.get(patternName)!.push(legacyPattern);
    }

    return legacyPatterns;
  }

  /**
   * Convert new architecture script results to legacy format
   */
  private convertScriptPatternsToLegacy(scriptResult: any): Map<string, any[]> {
    const legacyPatterns = new Map<string, any[]>();

    if (!scriptResult?.patterns) {
      return legacyPatterns;
    }

    for (const [patternName, patternData] of scriptResult.patterns) {
      const legacyPattern = {
        pattern: patternName,
        frequency: patternData.frequency,
        occurrences: patternData.siteCount,
        examples: patternData.examples || []
      };

      // Use pattern name as the key for scripts
      if (!legacyPatterns.has(patternName)) {
        legacyPatterns.set(patternName, []);
      }
      legacyPatterns.get(patternName)!.push(legacyPattern);
    }

    return legacyPatterns;
  }

  /**
   * Extract header name from pattern name
   */
  private extractHeaderName(patternName: string): string {
    // For headers, the pattern name is typically the header name itself
    // or header:value format - extract the header part
    if (patternName.includes(':')) {
      return patternName.split(':')[0];
    }
    return patternName;
  }
}