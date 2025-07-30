/**
 * HeaderAnalyzer V2 - Phase 3 implementation
 * Implements unique site counting to fix occurrence counting bug
 * 
 * Architecture: Uses DataPreprocessor's authoritative header classifications
 * instead of duplicate filtering logic. Focuses on statistical analysis,
 * frequency calculation, and pattern data structuring.
 */

import type { 
  FrequencyAnalyzer, 
  PreprocessedData, 
  AnalysisOptions, 
  AnalysisResult, 
  PatternData,
  HeaderSpecificData 
} from '../types/analyzer-interface.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('header-analyzer-v2');

export class HeaderAnalyzerV2 implements FrequencyAnalyzer<HeaderSpecificData> {
  getName(): string {
    return 'HeaderAnalyzerV2';
  }

  async analyze(
    data: PreprocessedData, 
    options: AnalysisOptions
  ): Promise<AnalysisResult<HeaderSpecificData>> {
    logger.info('Starting header analysis with unique site counting', {
      totalSites: data.totalSites,
      minOccurrences: options.minOccurrences,
      usingPreprocessorClassifications: !!data.metadata.semantic?.headerClassifications,
      semanticFiltering: options.semanticFiltering
    });

    const patterns = new Map<string, PatternData>();
    const securityHeaders = new Set<string>();
    const customHeaders = new Set<string>();

    // Track header values per header name: headerName -> value -> Set<siteUrl>
    const headerValueSites = new Map<string, Map<string, Set<string>>>();

    // Process each site ONCE
    for (const [siteUrl, siteData] of data.sites) {
      // Track which headers we've seen for THIS site
      const sitePatternsFound = new Set<string>();

      for (const [headerName, values] of siteData.headers) {
        // Skip non-informative headers if semantic filtering is enabled
        // Use DataPreprocessor's authoritative classification instead of duplicate filtering
        if (options.semanticFiltering) {
          const classification = data.metadata.semantic?.headerClassifications?.get(headerName.toLowerCase());
          if (classification?.filterRecommendation === 'always-filter') {
            continue;
          }
        }

        // Create pattern key (just header name for headers)
        const patternKey = headerName;

        // Only count this header once per site
        if (!sitePatternsFound.has(patternKey)) {
          sitePatternsFound.add(patternKey);

          // Get or create pattern data
          let pattern = patterns.get(patternKey);
          if (!pattern) {
            // Get pre-computed classification from DataPreprocessor
            const classification = data.metadata.semantic?.headerClassifications?.get(headerName.toLowerCase());
            
            pattern = {
              pattern: patternKey,
              siteCount: 0,
              sites: new Set<string>(),
              frequency: 0,
              examples: new Set<string>(),
              metadata: {
                isSecurityHeader: this.isSecurityHeader(headerName),
                isCustomHeader: this.isCustomHeader(headerName),
                valueFrequencies: new Map<string, number>(), // Track per-value frequencies
                // Add classification data from preprocessor
                category: classification?.category,
                discriminativeScore: classification?.discriminativeScore,
                vendor: classification?.vendor,
                platformName: classification?.platformName,
                filterRecommendation: classification?.filterRecommendation
              }
            };
            patterns.set(patternKey, pattern);
          }

          // Add this site (Set ensures uniqueness)
          pattern.sites.add(siteUrl);
          pattern.siteCount = pattern.sites.size;

          // Track header types
          if (pattern.metadata?.isSecurityHeader) {
            securityHeaders.add(headerName);
          }
          if (pattern.metadata?.isCustomHeader) {
            customHeaders.add(headerName);
          }

          // Track value frequencies per site
          if (!headerValueSites.has(headerName)) {
            headerValueSites.set(headerName, new Map());
          }
          const valueMap = headerValueSites.get(headerName)!;
          
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
              pattern.examples!.add(`${headerName}: ${exampleValue}`);
            }
          }
        }
      }
    }

    // Calculate value frequencies and page distribution, store in metadata
    for (const [headerName, pattern] of patterns) {
      if (!pattern.metadata) continue;
      
      // Calculate value frequencies
      const valueMap = headerValueSites.get(headerName);
      if (valueMap) {
        const valueFreqs = new Map<string, number>();
        for (const [value, sites] of valueMap) {
          valueFreqs.set(value, sites.size);
        }
        pattern.metadata.valueFrequencies = valueFreqs;
      }
      
      // Calculate page distribution (mainpage vs robots.txt)
      let mainpageCount = 0;
      let robotsCount = 0;
      
      for (const siteUrl of pattern.sites) {
        const siteData = data.sites.get(siteUrl);
        if (siteData?.headersByPageType) {
          // Check if header appears in mainpage
          if (siteData.headersByPageType.mainpage.has(headerName)) {
            mainpageCount++;
          }
          // Check if header appears in robots.txt
          if (siteData.headersByPageType.robots.has(headerName)) {
            robotsCount++;
          }
        } else {
          // Fallback: if no page type data, assume mainpage
          mainpageCount++;
        }
      }
      
      const totalPageCount = mainpageCount + robotsCount;
      if (totalPageCount > 0) {
        pattern.metadata.pageDistribution = {
          mainpage: mainpageCount / totalPageCount,
          robots: robotsCount / totalPageCount
        };
      } else {
        // Default to mainpage if no data
        pattern.metadata.pageDistribution = {
          mainpage: 1.0,
          robots: 0.0
        };
      }
    }

    // Calculate frequencies and apply filtering
    const filteredPatterns = this.finalizeResults(patterns, data.totalSites, options);

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
        securityHeaders,
        customHeaders
      }
    };
  }


  /**
   * Check if header is a security-related header
   */
  private isSecurityHeader(headerName: string): boolean {
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'content-security-policy',
      'strict-transport-security',
      'referrer-policy',
      'permissions-policy',
      'x-permitted-cross-domain-policies'
    ];
    return securityHeaders.includes(headerName.toLowerCase());
  }

  /**
   * Check if header is a custom (x- prefixed) header
   */
  private isCustomHeader(headerName: string): boolean {
    return headerName.toLowerCase().startsWith('x-') && 
           !this.isSecurityHeader(headerName);
  }

  /**
   * Finalize results: calculate frequencies and apply filtering
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
export function createHeaderAnalyzer(): HeaderAnalyzerV2 {
  return new HeaderAnalyzerV2();
}