/**
 * Frequency Analyzer V2 - Phase 3 implementation
 * Uses the new architecture with consistent counting methodology
 */

import { createModuleLogger } from '../utils/logger.js';
import { FrequencyAggregator } from './frequency-aggregator-v2.js';
import { RecommendationsCoordinator } from './analyzers/recommendations-coordinator.js';
import { convertV2ToV1Format, prepareSharedDataPoints } from './v1-adapter.js';
import type { FrequencyOptions, FrequencyResult } from './types/frequency-types-v2.js';
import type { DetectionDataPoint } from '../utils/cms/analysis/types.js';

const logger = createModuleLogger('frequency-analyzer-v2');

/**
 * Main frequency analysis function using the new architecture
 * This replaces the old analyzeFrequency function
 */
export async function analyzeFrequencyV2(options: FrequencyOptions = {}): Promise<FrequencyResult> {
    const startTime = performance.now();

    logger.info('Starting frequency analysis V2', { options });

    try {
        // Create aggregator
        const aggregator = new FrequencyAggregator(options.dataDir);

        // Run analysis with new architecture
        const aggregatedResults = await aggregator.analyze(options);

        // Load data points once for both recommendation calls
        let sharedDataPoints: DetectionDataPoint[] = [];
        let biasAnalysis = null;

        if (options.includeRecommendations !== false) {
            sharedDataPoints = await prepareSharedDataPoints(options);
        }
        if (options.includeRecommendations !== false) {
            try {
                const coordinator = new RecommendationsCoordinator();

                const result = await coordinator.generateRecommendations(
                    aggregatedResults,
                    sharedDataPoints,
                    options
                );
                biasAnalysis = result.biasAnalysis;
            } catch (error) {
                logger.warn('Failed to generate recommendations', {
                    error: (error as Error).message,
                });
            }
        }
        // Convert to legacy format for backward compatibility
        const legacyResult = await convertV2ToV1Format(
            aggregatedResults,
            options,
            biasAnalysis,
            sharedDataPoints
        );
        //TODO: create formatOutputV2 for the V2 analyzer and remove this conversion

        // Output results to file if specified (using V2 reporter)
        if (options.outputFile) {
            const { formatOutputV2: formatOutput } = await import('./reporter-v2.js');
            await formatOutput(legacyResult, options);
        }

        const duration = performance.now() - startTime;
        logger.info(`Frequency analysis V2 completed in ${duration.toFixed(2)}ms`);

        return legacyResult;
    } catch (error) {
        logger.error('Frequency analysis V2 failed', { error: (error as Error).message });
        throw error;
    }
}

/**
 * Backward compatibility wrapper
 * This allows existing code to use the new implementation transparently
 */
//export async function analyzeFrequency(options: FrequencyOptions = {}): Promise<FrequencyResult> {
//  return analyzeFrequencyV2(options);
//}

// Export the aggregator for direct use if needed
export { FrequencyAggregator } from './frequency-aggregator-v2.js';
