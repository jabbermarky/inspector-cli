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
  HeaderSpecificData,
  PlatformDiscriminationData 
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

    // Calculate frequencies first (needed for platform discrimination)
    for (const [key, pattern] of patterns) {
      pattern.frequency = pattern.siteCount / data.totalSites;
    }

    // Calculate platform discrimination if enabled
    if (options.focusPlatformDiscrimination) {
      this.calculatePlatformDiscrimination(patterns, data);
    }

    // Apply filtering and sorting
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
   * Calculate platform discrimination metrics for patterns
   */
  private calculatePlatformDiscrimination(
    patterns: Map<string, PatternData>,
    data: PreprocessedData
  ): void {
    // Group sites by CMS platform
    const platformSites = new Map<string, Set<string>>();
    const totalSitesByPlatform = new Map<string, number>();
    
    for (const [siteUrl, siteData] of data.sites) {
      const platform = siteData.cms || 'unknown';
      if (!platformSites.has(platform)) {
        platformSites.set(platform, new Set());
      }
      platformSites.get(platform)!.add(siteUrl);
    }
    
    // Calculate total sites per platform
    for (const [platform, sites] of platformSites) {
      totalSitesByPlatform.set(platform, sites.size);
    }

    // Calculate discrimination metrics for each pattern
    for (const [patternKey, pattern] of patterns) {
      const platformFrequency = new Map<string, number>();
      const platformSpecificity = new Map<string, number>();
      
      // Calculate frequency within each platform
      for (const [platform, platformSiteSet] of platformSites) {
        const platformTotal = platformSiteSet.size;
        if (platformTotal === 0) continue;
        
        // Count pattern occurrences in this platform
        const patternSitesInPlatform = Array.from(pattern.sites)
          .filter(site => platformSiteSet.has(site)).length;
        
        const frequency = patternSitesInPlatform / platformTotal;
        platformFrequency.set(platform, frequency);
        
        // Calculate specificity: how much this pattern favors this platform
        // If a pattern appears on 100% of WordPress sites but only 50% overall, specificity = 2.0
        const overallFrequency = pattern.frequency;
        const specificity = overallFrequency > 0 ? frequency / overallFrequency : 0;
        platformSpecificity.set(platform, specificity);
      }
      
      // Calculate information-theoretic entropy for discrimination
      const entropy = this.calculateDiscriminationEntropy(platformFrequency, totalSitesByPlatform);
      
      // Find the platform with highest specificity
      let maxSpecificity = 0;
      let targetPlatform: string | null = null;
      for (const [platform, specificity] of platformSpecificity) {
        if (specificity > maxSpecificity) {
          maxSpecificity = specificity;
          targetPlatform = platform;
        }
      }
      
      // Check if this is infrastructure noise (appears equally across platforms)
      const isInfrastructureNoise = this.isInfrastructureNoise(platformFrequency, 0.1); // 10% threshold
      
      // Calculate overall discriminative score (0-1)
      // For patterns that concentrate in few platforms: use inverse entropy (1 - entropy) * maxSpecificity
      // Platform-specific patterns should have low entropy (high concentration) and high specificity
      const concentrationScore = 1 - entropy; // Higher = more concentrated in fewer platforms
      const discriminativeScore = isInfrastructureNoise ? 0 : Math.min(concentrationScore * Math.min(maxSpecificity, 1), 1.0);
      
      // Add platform discrimination data
      pattern.platformDiscrimination = {
        discriminativeScore,
        platformSpecificity,
        crossPlatformFrequency: platformFrequency,
        discriminationMetrics: {
          entropy,
          maxSpecificity,
          targetPlatform,
          isInfrastructureNoise
        }
      };
    }
  }

  /**
   * Calculate information-theoretic entropy for platform discrimination
   * Higher entropy means better discrimination between platforms
   */
  private calculateDiscriminationEntropy(
    platformFrequency: Map<string, number>,
    totalSitesByPlatform: Map<string, number>
  ): number {
    if (platformFrequency.size < 2) return 0; // Need at least 2 platforms to discriminate
    
    const totalSites = Array.from(totalSitesByPlatform.values()).reduce((sum, count) => sum + count, 0);
    if (totalSites === 0) return 0;
    
    // Calculate entropy based on platform distribution of the pattern
    let entropy = 0;
    let totalPatternOccurrences = 0;
    
    // First, calculate total pattern occurrences across all platforms
    for (const [platform, frequency] of platformFrequency) {
      const platformTotal = totalSitesByPlatform.get(platform) || 0;
      totalPatternOccurrences += frequency * platformTotal;
    }
    
    if (totalPatternOccurrences === 0) return 0;
    
    // Calculate entropy: -Σ(p_i * log2(p_i)) where p_i is proportion of pattern in platform i
    for (const [platform, frequency] of platformFrequency) {
      const platformTotal = totalSitesByPlatform.get(platform) || 0;
      const patternOccurrencesInPlatform = frequency * platformTotal;
      
      if (patternOccurrencesInPlatform > 0) {
        const proportion = patternOccurrencesInPlatform / totalPatternOccurrences;
        entropy -= proportion * Math.log2(proportion);
      }
    }
    
    // Normalize to 0-1 range (max entropy is log2(num_platforms))
    const maxEntropy = Math.log2(platformFrequency.size);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  /**
   * Check if pattern is infrastructure noise (appears equally across platforms)
   */
  private isInfrastructureNoise(
    platformFrequency: Map<string, number>,
    threshold: number
  ): boolean {
    if (platformFrequency.size < 2) return false;
    
    const frequencies = Array.from(platformFrequency.values());
    const mean = frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
    
    // Check if all frequencies are within threshold of the mean
    return frequencies.every(freq => Math.abs(freq - mean) <= threshold);
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
      // Frequency should already be calculated, but ensure it's set
      if (!pattern.frequency) {
        pattern.frequency = pattern.siteCount / totalSites;
      }

      // Apply minOccurrences filter (based on site count, not occurrences!)
      if (pattern.siteCount >= options.minOccurrences) {
        // Apply platform discrimination filtering if enabled
        if (options.focusPlatformDiscrimination && pattern.platformDiscrimination) {
          // Filter out pure infrastructure noise with very low discriminative scores
          const discriminativeScore = pattern.platformDiscrimination.discriminativeScore;
          const isInfrastructureNoise = pattern.platformDiscrimination.discriminationMetrics.isInfrastructureNoise;
          
          // Keep infrastructure noise patterns for analysis - they're important to understand
          // Only filter out if explicitly configured to do so
          filtered.set(key, pattern);
        } else {
          // No platform discrimination filtering - include all patterns that meet minOccurrences
          filtered.set(key, pattern);
        }
      }
    }

    // Sort by discriminative score first (if available), then by frequency
    const sortedEntries = Array.from(filtered.entries())
      .sort(([, a], [, b]) => {
        if (options.focusPlatformDiscrimination && a.platformDiscrimination && b.platformDiscrimination) {
          // Sort by discriminative score first
          const scoreA = a.platformDiscrimination.discriminativeScore;
          const scoreB = b.platformDiscrimination.discriminativeScore;
          if (Math.abs(scoreA - scoreB) > 0.01) { // If scores are significantly different
            return scoreB - scoreA;
          }
        }
        // Fall back to frequency sorting
        return b.frequency - a.frequency;
      });

    return new Map(sortedEntries);
  }
}

// Export a factory function for backward compatibility
export function createHeaderAnalyzer(): HeaderAnalyzerV2 {
  return new HeaderAnalyzerV2();
}