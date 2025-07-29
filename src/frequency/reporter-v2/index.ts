import { writeFile } from 'fs/promises';
import { AggregatedResults } from '../types/analyzer-interface.js';
import { FrequencyOptions } from '../types/frequency-types-v2.js';
import { OutputFormat, FormatterFunction, ExtendedFrequencyOptions } from './types.js';
import { formatHuman } from './formatters/human-formatter.js';
import { formatCSV } from './formatters/csv-formatter.js';
import { formatMarkdown } from './formatters/markdown-formatter.js';
import { formatJSON } from './formatters/json-formatter.js';

/**
 * Get the appropriate formatter function for the specified output format
 */
function getFormatter(format: OutputFormat | undefined): FormatterFunction {
  switch (format) {
    case 'human':
    case undefined:
      return formatHuman;
    case 'csv':
      return formatCSV;
    case 'markdown':
      return formatMarkdown;
    case 'json':
      return formatJSON;
    default:
      throw new Error(`Unsupported output format: ${format}`);
  }
}

/**
 * Main entry point for V2 reporter
 * Formats analysis results and outputs to console or file
 */
export async function formatOutputV2(
  result: AggregatedResults,
  options: FrequencyOptions
): Promise<void> {
  // Set default options
  const mergedOptions: ExtendedFrequencyOptions = {
    output: 'human',
    maxItemsPerSection: 20,
    includeRecommendations: false,
    ...options
  };
  
  try {
    const formatter = getFormatter(mergedOptions.output);
    const output = await formatter(result, mergedOptions);
    
    if (mergedOptions.outputFile) {
      await writeFile(mergedOptions.outputFile, output, 'utf-8');
      console.log(`\nReport saved to: ${mergedOptions.outputFile}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to format output: ${message}`);
  }
}

/**
 * Export individual formatters for testing
 */
export { formatHuman } from './formatters/human-formatter.js';
export { formatCSV } from './formatters/csv-formatter.js';
export { formatMarkdown } from './formatters/markdown-formatter.js';
export { formatJSON } from './formatters/json-formatter.js';

/**
 * Export section formatters for testing
 */
export * as summarySection from './sections/summary-section.js';
export * as filteringSection from './sections/filtering-section.js';
export * as headersSection from './sections/headers-section.js';
export * as metaSection from './sections/meta-tags-section.js';
export * as scriptsSection from './sections/scripts-section.js';
export * as biasSection from './sections/bias-section.js';