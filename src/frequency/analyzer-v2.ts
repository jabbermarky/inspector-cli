/**
 * Frequency Analyzer V2 - Phase 3 implementation
 * Uses the new architecture with consistent counting methodology
 */

import { createModuleLogger } from '../utils/logger.js';
import { FrequencyAggregator } from './frequency-aggregator-v2.js';
import { ProgressIndicator } from '../utils/progress-indicator.js';
import type { FrequencyOptions } from './types/frequency-types-v2.js';
import type { AggregatedResults } from './types/analyzer-interface.js';

const logger = createModuleLogger('frequency-analyzer-v2');

/**
 * Main frequency analysis function using the new architecture
 * This replaces the old analyzeFrequency function
 */
export async function analyzeFrequencyV2(options: FrequencyOptions = {}): Promise<AggregatedResults> {
    const startTime = performance.now();

    logger.info('Starting frequency analysis V2', { options });

    // Create progress indicator (only shows if stdout is TTY)
    const progress = new ProgressIndicator({
        total: 10, // Data loading + 8 analysis phases + summary
        label: 'Frequency Analysis',
        showPercentage: true,
        showETA: true,
    });

    try {
        // Create aggregator
        const aggregator = new FrequencyAggregator(options.dataDir);

        // Run analysis with new architecture and progress tracking
        const aggregatedResults = await aggregator.analyze(options, progress);

        // Complete progress
        progress.complete();

        // Output results to file if specified (using simple V2 reporter)
        if (options.outputFile) {
            const { formatOutputV2: formatOutput } = await import('./simple-reporter-v2.js');
            await formatOutput(aggregatedResults, options);
        }

        const duration = performance.now() - startTime;
        logger.info(`Frequency analysis V2 completed in ${duration.toFixed(2)}ms`);

        return aggregatedResults;
    } catch (error) {
        // Clear progress on error
        progress.clear();
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
