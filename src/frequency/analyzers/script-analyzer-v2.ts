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
  ScriptSpecificData,
  PlatformDiscriminationData 
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

    // Calculate frequencies first (needed for platform discrimination)
    for (const [patternName, pattern] of patterns) {
      pattern.frequency = pattern.siteCount / data.totalSites;
    }

    // Calculate platform discrimination if enabled
    if (options.focusPlatformDiscrimination) {
      this.calculatePlatformDiscrimination(patterns, data);
    }

    // Update frequencies and filter by threshold
    const filteredPatterns = new Map<string, PatternData>();
    let totalPatternsFound = 0;

    for (const [patternName, pattern] of patterns) {
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
        const content = scriptSrc.substring(7); // Remove "inline:" prefix
        const contentLower = content.toLowerCase();
        
        // Platform-specific global object patterns (highly discriminatory)
        const globalObjectPatterns = this.extractGlobalObjectPatterns(content);
        patterns.push(...globalObjectPatterns);

        // Platform-specific configuration patterns  
        const configPatterns = this.extractConfigurationPatterns(content);
        patterns.push(...configPatterns);

        // Legacy generic patterns (less discriminatory)
        if (contentLower.includes('jquery') || contentLower.includes('$')) {
          patterns.push('jquery-inline');
        }
        if (contentLower.includes('wp_') || contentLower.includes('wordpress')) {
          patterns.push('wordpress-inline');
        }
        if (contentLower.includes('google-analytics') || contentLower.includes('gtag') || contentLower.includes('ga(')) {
          patterns.push('google-analytics-inline');
        }
        if (contentLower.includes('facebook') || contentLower.includes('fbq')) {
          patterns.push('facebook-pixel-inline');
        }
        if (contentLower.includes('angular')) {
          patterns.push('angular-inline');
        }
        if (contentLower.includes('react')) {
          patterns.push('react-inline');
        }
        if (contentLower.includes('vue')) {
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

  /**
   * Extract highly discriminatory global object assignment patterns
   */
  private extractGlobalObjectPatterns(content: string): string[] {
    const patterns: string[] = [];

    // Duda global objects (highly discriminatory)
    if (content.match(/window\.dmAPI\s*[=:]|window\.DUDA_CONFIG\s*[=:]|window\.DudaSettings\s*[=:]|window\.duda\s*[=:]/i)) {
      patterns.push('duda-global-objects');
    }

    // WordPress global objects
    if (content.match(/window\.wp\s*[=:]|window\.wpApiSettings\s*[=:]|window\.ajaxurl\s*[=:]|window\._wpUtilSettings\s*[=:]/i)) {
      patterns.push('wordpress-global-objects');
    }

    // Shopify global objects  
    if (content.match(/window\.Shopify\s*[=:]|window\.ShopifyAnalytics\s*[=:]|window\.theme\s*[=:]|window\.shop\s*[=:]/i)) {
      patterns.push('shopify-global-objects');
    }

    // Drupal global objects
    if (content.match(/window\.Drupal\s*[=:]|window\.drupalSettings\s*[=:]|window\.jQuery\s*[=:].*drupal/i)) {
      patterns.push('drupal-global-objects');
    }

    // Joomla global objects
    if (content.match(/window\.Joomla\s*[=:]|window\.JText\s*[=:]|window\.joomla\s*[=:]/i)) {
      patterns.push('joomla-global-objects');
    }

    // Magento global objects
    if (content.match(/window\.Magento\s*[=:]|window\.checkout\s*[=:]|window\.customerData\s*[=:]/i)) {
      patterns.push('magento-global-objects');
    }

    // Generic platform detection patterns
    if (content.match(/window\.\w+API\s*[=:]|window\.\w+Config\s*[=:]|window\.\w+Settings\s*[=:]/i)) {
      patterns.push('platform-api-objects');
    }

    return patterns;
  }

  /**
   * Calculate platform discrimination metrics for script patterns
   */
  private calculatePlatformDiscrimination(patterns: Map<string, PatternData>, data: PreprocessedData): void {
    // Group sites by platform for discrimination analysis
    const sitesByPlatform = new Map<string, Set<string>>();
    const totalSitesByPlatform = new Map<string, number>();

    for (const [url, siteData] of data.sites) {
      const platform = siteData.cms || 'unknown';
      if (!sitesByPlatform.has(platform)) {
        sitesByPlatform.set(platform, new Set());
      }
      sitesByPlatform.get(platform)!.add(url);
      totalSitesByPlatform.set(platform, (totalSitesByPlatform.get(platform) || 0) + 1);
    }

    // Calculate discrimination metrics for each pattern
    for (const [patternName, pattern] of patterns) {
      // Calculate platform-specific frequency
      const platformFrequency = new Map<string, number>();
      
      for (const [platform, platformSites] of sitesByPlatform) {
        const sitesWithPattern = Array.from(pattern.sites).filter(site => platformSites.has(site));
        const frequency = sitesWithPattern.length / platformSites.size;
        if (frequency > 0) {
          platformFrequency.set(platform, frequency);
        }
      }

      // Calculate platform specificity (0-1 for each platform)
      const platformSpecificity = new Map<string, number>();
      let maxSpecificity = 0;
      let targetPlatform = '';

      for (const [platform, frequency] of platformFrequency) {
        // Calculate how much this pattern prefers this platform vs others
        const otherPlatformsFreq = Array.from(platformFrequency.entries())
          .filter(([p]) => p !== platform)
          .map(([, freq]) => freq);
        
        const avgOthersFreq = otherPlatformsFreq.length > 0 
          ? otherPlatformsFreq.reduce((sum, freq) => sum + freq, 0) / otherPlatformsFreq.length 
          : 0;
        
        // Specificity = how much more frequent in this platform vs average of others
        const specificity = avgOthersFreq > 0 ? frequency / (frequency + avgOthersFreq) : frequency;
        platformSpecificity.set(platform, specificity);
        
        if (specificity > maxSpecificity) {
          maxSpecificity = specificity;
          targetPlatform = platform;
        }
      }

      // Calculate discrimination entropy
      const entropy = this.calculateDiscriminationEntropy(platformFrequency, totalSitesByPlatform);
      
      // Check if this is infrastructure noise (appears equally across platforms)
      const isInfrastructureNoise = this.isInfrastructureNoise(platformFrequency, 0.1); // 10% threshold
      
      // Calculate overall discriminative score (0-1)
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
      const patternCount = frequency * platformTotal;
      const proportion = patternCount / totalPatternOccurrences;
      
      if (proportion > 0) {
        entropy -= proportion * Math.log2(proportion);
      }
    }
    
    // Normalize entropy to max possible entropy (log2(number of platforms))
    const maxEntropy = Math.log2(platformFrequency.size);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  /**
   * Check if pattern is infrastructure noise (appears equally across platforms)
   */
  private isInfrastructureNoise(platformFrequency: Map<string, number>, threshold: number): boolean {
    if (platformFrequency.size < 2) return false;
    
    const frequencies = Array.from(platformFrequency.values());
    const avg = frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
    
    // Check if all frequencies are within threshold of the average
    return frequencies.every(freq => Math.abs(freq - avg) <= threshold);
  }

  /**
   * Extract platform-specific configuration patterns
   */
  private extractConfigurationPatterns(content: string): string[] {
    const patterns: string[] = [];

    // Duda configuration patterns
    if (content.match(/DUDA_\w+|duda\w*Config|dmAPI|multiscreensite\.com/i)) {
      patterns.push('duda-configuration');
    }

    // WordPress configuration patterns
    if (content.match(/wp_\w+|wpApiSettings|wp-json|wp-admin|wp-content/i)) {
      patterns.push('wordpress-configuration');
    }

    // Shopify configuration patterns
    if (content.match(/shopify\w*Config|ShopifyAnalytics|myshopify\.com|cdn\.shopify/i)) {
      patterns.push('shopify-configuration');
    }

    // Drupal configuration patterns
    if (content.match(/drupalSettings|Drupal\.\w+|sites\/default/i)) {
      patterns.push('drupal-configuration');
    }

    // Joomla configuration patterns
    if (content.match(/JText\._|joomla\w*Config|administrator\/index\.php/i)) {
      patterns.push('joomla-configuration');
    }

    // Wix configuration patterns
    if (content.match(/wix\w*Config|static\.wixstatic\.com/i)) {
      patterns.push('wix-configuration');
    }

    // Squarespace configuration patterns
    if (content.match(/squarespace\w*Config|static1\.squarespace\.com/i)) {
      patterns.push('squarespace-configuration');
    }

    return patterns;
  }
}