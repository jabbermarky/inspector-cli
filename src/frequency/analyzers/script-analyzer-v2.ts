/**
 * ScriptAnalyzer V2 - Phase 3 implementation
 * Implements unique site counting for script pattern analysis
 */

import type { 
  FrequencyAnalyzer, 
  PreprocessedData, 
  AnalysisOptions, 
  AnalysisResult, 
  PatternData,
  ScriptSpecificData 
} from '../types/analyzer-interface.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('script-analyzer-v2');

export class ScriptAnalyzerV2 implements FrequencyAnalyzer<ScriptSpecificData> {
  getName(): string {
    return 'ScriptAnalyzerV2';
  }

  async analyze(
    data: PreprocessedData, 
    options: AnalysisOptions
  ): Promise<AnalysisResult<ScriptSpecificData>> {
    const startTime = Date.now();
    
    logger.info(`Starting script analysis for ${data.totalSites} sites`, {
      minOccurrences: options.minOccurrences,
      includeExamples: options.includeExamples
    });

    // Process each site
    const patterns = new Map<string, PatternData>();

    for (const [url, siteData] of data.sites) {
      if (siteData.scripts.size === 0) {
        continue;
      }

      const sitePatternsFound = new Set<string>();

      // Extract patterns from each script
      for (const scriptSrc of siteData.scripts) {
        const scriptPatterns = this.extractScriptPatterns(scriptSrc);
        
        
        for (const patternName of scriptPatterns) {
          // Only count once per site (unique site counting)
          if (!sitePatternsFound.has(patternName)) {
            // Create pattern if it doesn't exist
            if (!patterns.has(patternName)) {
              patterns.set(patternName, {
                pattern: patternName,
                siteCount: 0,
                frequency: 0,
                sites: new Set(),
                examples: options.includeExamples ? new Set() : undefined
              });
            }

            const pattern = patterns.get(patternName)!;
            
            // Add this site (Set ensures uniqueness)
            pattern.sites.add(url);
            pattern.siteCount = pattern.sites.size;
            sitePatternsFound.add(patternName);
            
            // Add example if requested
            if (options.includeExamples && pattern.examples && pattern.examples.size < (options.maxExamples || 5)) {
              pattern.examples.add(scriptSrc);
            }
          }
        }
      }
    }

    // Update frequencies and filter by threshold
    const filteredPatterns = new Map<string, PatternData>();
    let totalPatternsFound = 0;

    for (const [patternName, pattern] of patterns) {
      pattern.frequency = pattern.siteCount / data.totalSites;
      
      if (pattern.siteCount >= options.minOccurrences) {
        filteredPatterns.set(patternName, pattern);
        totalPatternsFound++;
      }
    }

    // Create script-specific data
    const specificData: ScriptSpecificData = {
      cdnUsage: this.calculateCdnUsage(filteredPatterns),
      scriptTypes: this.calculateScriptTypes(filteredPatterns)
    };

    const duration = Date.now() - startTime;
    logger.info(`Script analysis completed in ${duration}ms. Found ${totalPatternsFound} patterns.`);

    return {
      patterns: filteredPatterns,
      totalSites: data.totalSites,
      analyzerSpecific: specificData,
      metadata: {
        analyzer: this.getName(),
        analyzedAt: new Date().toISOString(),
        totalPatternsFound,
        totalPatternsAfterFiltering: totalPatternsFound,
        options
      }
    };
  }

  /**
   * Extract script patterns from a script source URL or content
   */
  private extractScriptPatterns(scriptSrc: string): string[] {
    const patterns: string[] = [];

    try {
      // Handle inline scripts first (before URL parsing)
      if (scriptSrc.startsWith('inline:')) {
        const content = scriptSrc.substring(7).toLowerCase(); // Remove "inline:" prefix
        
        // Analyze inline script content for patterns
        if (content.includes('jquery') || content.includes('$')) {
          patterns.push('jquery-inline');
        }
        if (content.includes('wp_') || content.includes('wordpress')) {
          patterns.push('wordpress-inline');
        }
        if (content.includes('google-analytics') || content.includes('gtag') || content.includes('ga(')) {
          patterns.push('google-analytics-inline');
        }
        if (content.includes('facebook') || content.includes('fbq')) {
          patterns.push('facebook-pixel-inline');
        }
        if (content.includes('angular')) {
          patterns.push('angular-inline');
        }
        if (content.includes('react')) {
          patterns.push('react-inline');
        }
        if (content.includes('vue')) {
          patterns.push('vue-inline');
        }
        
        patterns.push('inline-script');
        return patterns; // Return early for inline scripts
      }

      const url = new URL(scriptSrc);
      const hostname = url.hostname;
      const pathname = url.pathname;

      // CDN patterns
      if (hostname.includes('cdn.') || hostname.includes('.cdn.')) {
        patterns.push('cdn-usage');
      }

      // Popular library patterns
      if (pathname.includes('jquery')) {
        patterns.push('jquery');
      }
      if (pathname.includes('bootstrap')) {
        patterns.push('bootstrap');
      }
      if (pathname.includes('angular')) {
        patterns.push('angular');
      }
      if (pathname.includes('react')) {
        patterns.push('react');
      }
      if (pathname.includes('vue')) {
        patterns.push('vue');
      }

      // Analytics patterns
      if (hostname.includes('google-analytics') || hostname.includes('googletagmanager')) {
        patterns.push('google-analytics');
      }
      if (hostname.includes('facebook.net') || pathname.includes('fbevents')) {
        patterns.push('facebook-pixel');
      }

      // WordPress patterns
      if (pathname.includes('wp-content') || pathname.includes('wp-includes')) {
        patterns.push('wordpress-scripts');
      }

      // Drupal patterns
      if (pathname.includes('/sites/') && pathname.includes('/modules/')) {
        patterns.push('drupal-scripts');
      }

      // Joomla patterns
      if (pathname.includes('/media/jui/') || pathname.includes('/media/system/')) {
        patterns.push('joomla-scripts');
      }

      // Generic domain patterns for common script sources
      const domain = hostname.replace('www.', '');
      const commonDomains = ['googleapis.com', 'cloudflare.com', 'jsdelivr.net', 'unpkg.com'];
      for (const commonDomain of commonDomains) {
        if (domain.endsWith(commonDomain)) {
          patterns.push(`${commonDomain}-scripts`);
          break; // Only add one domain pattern per script
        }
      }

    } catch (error) {
      // Handle inline scripts (prefixed with "inline:")
      if (scriptSrc.startsWith('inline:')) {
        const content = scriptSrc.substring(7).toLowerCase(); // Remove "inline:" prefix
        
        // Analyze inline script content for patterns
        if (content.includes('jquery') || content.includes('$')) {
          patterns.push('jquery-inline');
        }
        if (content.includes('wp_') || content.includes('wordpress')) {
          patterns.push('wordpress-inline');
        }
        if (content.includes('google-analytics') || content.includes('gtag') || content.includes('ga(')) {
          patterns.push('google-analytics-inline');
        }
        if (content.includes('facebook') || content.includes('fbq')) {
          patterns.push('facebook-pixel-inline');
        }
        if (content.includes('angular')) {
          patterns.push('angular-inline');
        }
        if (content.includes('react')) {
          patterns.push('react-inline');
        }
        if (content.includes('vue')) {
          patterns.push('vue-inline');
        }
        
        patterns.push('inline-script');
      } else {
        // Legacy handling for non-URL strings
        if (scriptSrc.includes('jQuery') || scriptSrc.includes('$')) {
          patterns.push('jquery-inline');
        }
        if (scriptSrc.includes('wp_')) {
          patterns.push('wordpress-inline');
        }
        patterns.push('inline-script');
      }
    }

    return patterns;
  }

  /**
   * Calculate CDN usage statistics
   */
  private calculateCdnUsage(patterns: Map<string, PatternData>): Map<string, number> {
    const cdnUsage = new Map<string, number>();

    for (const [pattern, data] of patterns) {
      if (pattern.includes('cdn') || pattern.includes('googleapis') || pattern.includes('jsdelivr') || pattern.includes('unpkg')) {
        cdnUsage.set(pattern, data.siteCount);
      }
    }

    return cdnUsage;
  }

  /**
   * Calculate script types statistics
   */
  private calculateScriptTypes(patterns: Map<string, PatternData>): Map<string, number> {
    const scriptTypes = new Map<string, number>();

    for (const [pattern, data] of patterns) {
      // Categorize script types
      if (pattern.includes('analytics') || pattern.includes('google-analytics') || pattern.includes('facebook-pixel')) {
        scriptTypes.set('analytics', (scriptTypes.get('analytics') || 0) + data.siteCount);
      } else if (pattern.includes('jquery') || pattern.includes('bootstrap') || pattern.includes('angular') || pattern.includes('react') || pattern.includes('vue')) {
        scriptTypes.set('libraries', (scriptTypes.get('libraries') || 0) + data.siteCount);
      } else if (pattern.includes('wordpress') || pattern.includes('drupal') || pattern.includes('joomla')) {
        scriptTypes.set('cms', (scriptTypes.get('cms') || 0) + data.siteCount);
      } else if (pattern.includes('inline')) {
        scriptTypes.set('inline', (scriptTypes.get('inline') || 0) + data.siteCount);
      } else {
        scriptTypes.set('external', (scriptTypes.get('external') || 0) + data.siteCount);
      }
    }

    return scriptTypes;
  }
}