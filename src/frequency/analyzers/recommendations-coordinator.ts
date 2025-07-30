/**
 * RecommendationsCoordinator - Phase 3 implementation
 * Bridges the new architecture with the existing recommendations system
 */

import type { AggregatedResults } from '../types/analyzer-interface.js';
import { generateRecommendationsV1, type RecommendationInput } from '../recommender-v1.js';
import { DataPreprocessor } from '../data-preprocessor-v2.js';
import { createModuleLogger } from '../../utils/logger.js';
import type {
    FrequencyOptions,
    FrequencyOptionsWithDefaults,
} from '../types/frequency-types-v2.js';
import type { DetectionDataPoint } from '../../utils/cms/analysis/types.js';

const logger = createModuleLogger('recommendations-coordinator');

export class RecommendationsCoordinator {
    /**
     * Generate recommendations by converting V2 architecture results to V1 format
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

        // Convert V2 architecture results to V1 format expected by recommender
        const headerPatterns = this.convertV2HeaderPatternsToV1(aggregatedResults.headers);
        const metaPatterns = this.convertV2MetaPatternsToV1(aggregatedResults.metaTags);
        const scriptPatterns = this.convertV2ScriptPatternsToV1(aggregatedResults.scripts);

        // Convert options to V1 format
        const legacyV1Options: FrequencyOptionsWithDefaults = {
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
            focusPlatformDiscrimination: false, // Phase 4: Default to false for V1 compatibility
            enableValidation: true,
            includeValidation: true,  // For reporter compatibility
            skipStatisticalTests: false,
            validationStopOnError: false,
            validationDebugMode: false,
            ...options,
        };

        const preprocessor = new DataPreprocessor();
        const recommendationInput: RecommendationInput = {
            headerPatterns,
            metaPatterns,
            scriptPatterns,
            dataPoints,
            options: legacyV1Options,
            preprocessor,
        };

        //TODO: create generateRecommendationsV2 to handle new architecture directly
        try {
            const result = await generateRecommendationsV1(recommendationInput);
            logger.info('Recommendations generated successfully');
            return {
                learn: result.learn,
                detectCms: result.detectCms,
                groundTruth: result.groundTruth,
                biasAnalysis: result.biasAnalysis,
            };
        } catch (error) {
            logger.error('Failed to generate recommendations', { error: (error as Error).message });

            // Return empty recommendations on error
            return {
                learn: {
                    currentlyFiltered: [],
                    recommendToFilter: [],
                    recommendToKeep: [],
                },
                detectCms: {
                    newPatternOpportunities: [],
                    patternsToRefine: [],
                },
                groundTruth: {
                    currentlyUsedPatterns: [],
                    potentialNewRules: [],
                },
                biasAnalysis: null,
            };
        }
    }

    /**
     * Convert V2 architecture header results to V1 format
     */
    private convertV2HeaderPatternsToV1(headerResult: any): Map<string, any[]> {
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
                cmsCorrelation: { Unknown: patternData.frequency }, // Basic correlation data
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
     * Convert V2 architecture meta results to V1 format
     */
    private convertV2MetaPatternsToV1(metaResult: any): Map<string, any[]> {
        const legacyPatterns = new Map<string, any[]>();

        if (!metaResult?.patterns) {
            return legacyPatterns;
        }

        for (const [patternName, patternData] of metaResult.patterns) {
            const legacyPattern = {
                pattern: patternName,
                frequency: patternData.frequency,
                occurrences: patternData.siteCount,
                examples: patternData.examples || [],
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
     * Convert V2 architecture script results to V1 format
     */
    private convertV2ScriptPatternsToV1(scriptResult: any): Map<string, any[]> {
        const legacyPatterns = new Map<string, any[]>();

        if (!scriptResult?.patterns) {
            return legacyPatterns;
        }

        for (const [patternName, patternData] of scriptResult.patterns) {
            const legacyPattern = {
                pattern: patternName,
                frequency: patternData.frequency,
                occurrences: patternData.siteCount,
                examples: patternData.examples || [],
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
