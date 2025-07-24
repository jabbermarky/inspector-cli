/**
 * MetaAnalyzer V2 - Phase 3 implementation
 * Fixes double filtering bug while maintaining unique site counting
 */

import type { 
  FrequencyAnalyzer, 
  PreprocessedData, 
  AnalysisOptions, 
  AnalysisResult, 
  PatternData,
  MetaSpecificData 
} from '../types/analyzer-interface.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('meta-analyzer-v2');

// Meta tags to skip as they're not informative for CMS detection
const SKIP_META_TAGS = new Set([
  'viewport',
  'charset',
  'content-type',
  'x-ua-compatible',
  'robots',
  'googlebot',
  'format-detection'
]);

export class MetaAnalyzerV2 implements FrequencyAnalyzer<MetaSpecificData> {
  getName(): string {
    return 'MetaAnalyzerV2';
  }

  async analyze(
    data: PreprocessedData, 
    options: AnalysisOptions
  ): Promise<AnalysisResult<MetaSpecificData>> {
    logger.info('Starting meta tag analysis', {
      totalSites: data.totalSites,
      minOccurrences: options.minOccurrences
    });

    const patterns = new Map<string, PatternData>();
    const ogTags = new Set<string>();
    const twitterTags = new Set<string>();
    
    // Track meta tag values per meta name: metaName -> value -> Set<siteUrl>
    const metaValueSites = new Map<string, Map<string, Set<string>>>();

    // Process each site ONCE
    for (const [siteUrl, siteData] of data.sites) {
      // Track which meta patterns we've seen for THIS site
      const sitePatternsFound = new Set<string>();

      for (const [metaName, values] of siteData.metaTags) {
        // Skip non-informative meta tags if semantic filtering is enabled
        if (options.semanticFiltering && this.shouldSkipMetaTag(metaName)) {
          continue;
        }

        // For meta tags, we typically want to track the name, not name:value combinations
        // This matches the current behavior where we group by meta name
        const patternKey = metaName;

        // Only count this meta tag once per site
        if (!sitePatternsFound.has(patternKey)) {
          sitePatternsFound.add(patternKey);

          // Get or create pattern data
          let pattern = patterns.get(patternKey);
          if (!pattern) {
            pattern = {
              pattern: patternKey,
              siteCount: 0,
              sites: new Set<string>(),
              frequency: 0,
              examples: new Set<string>(),
              metadata: {
                isOgTag: this.isOgTag(metaName),
                isTwitterTag: this.isTwitterTag(metaName),
                metaType: this.getMetaType(metaName),
                valueFrequencies: new Map<string, number>() // Track per-value frequencies
              }
            };
            patterns.set(patternKey, pattern);
          }

          // Add this site (Set ensures uniqueness)
          pattern.sites.add(siteUrl);
          pattern.siteCount = pattern.sites.size;

          // Track value frequencies per site
          if (!metaValueSites.has(metaName)) {
            metaValueSites.set(metaName, new Map());
          }
          const valueMap = metaValueSites.get(metaName)!;
          
          for (const value of values) {
            if (!valueMap.has(value)) {
              valueMap.set(value, new Set());
            }
            valueMap.get(value)!.add(siteUrl);
          }

          // Collect example values
          if (options.includeExamples && pattern.examples!.size < (options.maxExamples || 5)) {
            for (const value of values) {
              if (pattern.examples!.size >= (options.maxExamples || 5)) break;
              // Truncate long values
              const exampleValue = value.length > 100 ? value.substring(0, 97) + '...' : value;
              pattern.examples!.add(`${metaName}="${exampleValue}"`);
            }
          }
        }
      }
    }

    // Calculate value frequencies and store in metadata
    for (const [metaName, pattern] of patterns) {
      const valueMap = metaValueSites.get(metaName);
      if (valueMap && pattern.metadata) {
        const valueFreqs = new Map<string, number>();
        for (const [value, sites] of valueMap) {
          valueFreqs.set(value, sites.size);
        }
        pattern.metadata.valueFrequencies = valueFreqs;
      }
    }

    // Calculate frequencies and apply filtering (SINGLE FILTERING POINT)
    const filteredPatterns = this.finalizeResults(patterns, data.totalSites, options);

    // Track meta tag types from filtered results only
    for (const [metaName, pattern] of filteredPatterns) {
      if (pattern.metadata?.isOgTag) {
        ogTags.add(metaName);
      }
      if (pattern.metadata?.isTwitterTag) {
        twitterTags.add(metaName);
      }
    }

    return {
      patterns: filteredPatterns,
      totalSites: data.totalSites,
      metadata: {
        analyzer: this.getName(),
        analyzedAt: new Date().toISOString(),
        totalPatternsFound: patterns.size,
        totalPatternsAfterFiltering: filteredPatterns.size,
        options
      },
      analyzerSpecific: {
        ogTags,
        twitterTags
      }
    };
  }

  /**
   * Check if meta tag should be skipped for semantic filtering
   */
  private shouldSkipMetaTag(metaName: string): boolean {
    // Handle different meta tag formats
    const cleanName = metaName.replace(/^(name:|property:|http-equiv:)/, '').toLowerCase();
    return SKIP_META_TAGS.has(cleanName);
  }

  /**
   * Check if meta tag is an Open Graph tag
   */
  private isOgTag(metaName: string): boolean {
    return metaName.toLowerCase().includes('og:') || 
           metaName.toLowerCase().startsWith('property:og:');
  }

  /**
   * Check if meta tag is a Twitter Card tag
   */
  private isTwitterTag(metaName: string): boolean {
    return metaName.toLowerCase().includes('twitter:') ||
           metaName.toLowerCase().startsWith('name:twitter:');
  }

  /**
   * Get the type of meta tag (name, property, http-equiv)
   */
  private getMetaType(metaName: string): string {
    if (metaName.startsWith('name:')) return 'name';
    if (metaName.startsWith('property:')) return 'property';
    if (metaName.startsWith('http-equiv:')) return 'http-equiv';
    return 'unknown';
  }

  /**
   * Finalize results: calculate frequencies and apply filtering
   * This is the ONLY place where filtering should happen
   */
  private finalizeResults(
    patterns: Map<string, PatternData>,
    totalSites: number,
    options: AnalysisOptions
  ): Map<string, PatternData> {
    const filtered = new Map<string, PatternData>();

    for (const [key, pattern] of patterns) {
      // Calculate frequency
      pattern.frequency = pattern.siteCount / totalSites;

      // Apply minOccurrences filter (based on site count, not occurrences!)
      // This is the SINGLE filtering point - no double filtering!
      if (pattern.siteCount >= options.minOccurrences) {
        filtered.set(key, pattern);
      }
    }

    // Sort by frequency (most common first)
    const sortedEntries = Array.from(filtered.entries())
      .sort(([, a], [, b]) => b.frequency - a.frequency);

    return new Map(sortedEntries);
  }
}

// Export a factory function for backward compatibility
export function createMetaAnalyzer(): MetaAnalyzerV2 {
  return new MetaAnalyzerV2();
}