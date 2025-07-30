import { AggregatedResults } from '../../types/analyzer-interface.js';
import { ExtendedFrequencyOptions } from '../types.js';
import { mapJsonReplacer } from '../../utils/map-converter.js';
import * as technologyCategorizationSection from '../sections/technology-categorization-section.js';

export function formatJSON(
  result: AggregatedResults,
  options: ExtendedFrequencyOptions
): string {
  // Create a structured JSON output that preserves the analysis structure
  // but converts Maps and Sets to JSON-serializable formats
  
  const jsonOutput = {
    metadata: {
      formatVersion: '2.0',
      generatedAt: new Date().toISOString(),
      options: {
        output: options.output,
        maxItemsPerSection: options.maxItemsPerSection,
        includeRecommendations: options.includeRecommendations,
        minSites: options.minSites,
        minOccurrences: options.minOccurrences
      }
    },
    summary: result.summary,
    analysis: {
      headers: result.headers ? {
        totalSites: result.headers.totalSites,
        metadata: result.headers.metadata,
        patterns: result.headers.patterns ? Object.fromEntries(result.headers.patterns) : {},
        analyzerSpecific: result.headers.analyzerSpecific
      } : null,
      metaTags: result.metaTags ? {
        totalSites: result.metaTags.totalSites,
        metadata: result.metaTags.metadata,
        patterns: result.metaTags.patterns ? Object.fromEntries(result.metaTags.patterns) : {},
        analyzerSpecific: result.metaTags.analyzerSpecific
      } : null,
      scripts: result.scripts ? {
        totalSites: result.scripts.totalSites,
        metadata: result.scripts.metadata,
        patterns: result.scripts.patterns ? Object.fromEntries(result.scripts.patterns) : {},
        analyzerSpecific: result.scripts.analyzerSpecific
      } : null,
      semantic: result.semantic ? {
        totalSites: result.semantic.totalSites,
        metadata: result.semantic.metadata,
        patterns: result.semantic.patterns ? Object.fromEntries(result.semantic.patterns) : {},
        analyzerSpecific: result.semantic.analyzerSpecific
      } : null,
      validation: result.validation ? {
        totalSites: result.validation.totalSites,
        metadata: result.validation.metadata,
        patterns: result.validation.patterns ? Object.fromEntries(result.validation.patterns) : {},
        analyzerSpecific: result.validation.analyzerSpecific
      } : null,
      vendor: result.vendor ? {
        totalSites: result.vendor.totalSites,
        metadata: result.vendor.metadata,
        patterns: result.vendor.patterns ? Object.fromEntries(result.vendor.patterns) : {},
        analyzerSpecific: result.vendor.analyzerSpecific,
        technologyCategorization: technologyCategorizationSection.formatForJSON(result.vendor)
      } : null,
      discovery: result.discovery ? {
        totalSites: result.discovery.totalSites,
        metadata: result.discovery.metadata,
        patterns: result.discovery.patterns ? Object.fromEntries(result.discovery.patterns) : {},
        analyzerSpecific: result.discovery.analyzerSpecific
      } : null,
      cooccurrence: result.cooccurrence ? {
        totalSites: result.cooccurrence.totalSites,
        metadata: result.cooccurrence.metadata,
        patterns: result.cooccurrence.patterns ? Object.fromEntries(result.cooccurrence.patterns) : {},
        analyzerSpecific: result.cooccurrence.analyzerSpecific
      } : null,
      // Removed technologies - redundant with script/vendor analyzers
      correlations: result.correlations ? {
        totalSites: result.correlations.totalSites,
        metadata: result.correlations.metadata,
        patterns: result.correlations.patterns ? Object.fromEntries(result.correlations.patterns) : {},
        analyzerSpecific: result.correlations.analyzerSpecific
      } : null
    }
  };
  
  // Use the map replacer to handle any remaining Maps/Sets in nested structures
  return JSON.stringify(jsonOutput, mapJsonReplacer, 2);
}