/**
 * ScriptAnalyzerV2 - Comprehensive Algorithmic Tests
 * Tests core business logic algorithms, not just interface contracts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptAnalyzerV2 } from '../script-analyzer-v2.js';
import type { PreprocessedData, SiteData, AnalysisOptions } from '../../types/analyzer-interface.js';

// Helper functions for creating test data
function createMockPreprocessedData(sites: Record<string, { scripts: Set<string> }>): PreprocessedData {
  const siteMap = new Map<string, SiteData>();
  
  Object.entries(sites).forEach(([normalizedUrl, siteConfig]) => {
    siteMap.set(normalizedUrl, {
      url: `https://${normalizedUrl}`,
      normalizedUrl,
      cms: null,
      confidence: 0,
      headers: new Map(),
      metaTags: new Map(),
      scripts: siteConfig.scripts,
      technologies: new Set(),
      capturedAt: new Date().toISOString()
    });
  });
  
  return {
    sites: siteMap,
    totalSites: siteMap.size,
    metadata: {
      version: '1.0.0',
      preprocessedAt: new Date().toISOString()
    }
  };
}

function createBasicAnalysisOptions(): AnalysisOptions {
  return {
    minOccurrences: 1,
    includeExamples: false,
    maxExamples: 5,
    semanticFiltering: false
  };
}

describe('ScriptAnalyzerV2', () => {
  let analyzer: ScriptAnalyzerV2;
  let basicOptions: AnalysisOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new ScriptAnalyzerV2();
    basicOptions = createBasicAnalysisOptions();
  });

  describe('Unique Site Counting (Core Algorithm)', () => {
    it('should count each site only once per script pattern', async () => {
      const data = createMockPreprocessedData({
        'site1.com': {
          scripts: new Set([
            'https://code.jquery.com/jquery-3.6.0.min.js',
            'https://cdn.example.com/jquery.min.js' // Different jQuery URL, same pattern
          ])
        },
        'site2.com': {
          scripts: new Set([
            'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js'
          ])
        },
        'site3.com': {
          scripts: new Set([
            'https://example.com/react.js'
          ])
        }
      });

      const result = await analyzer.analyze(data, { ...basicOptions, minOccurrences: 1 });

      // jQuery appears on 2 sites, should count uniquely
      const jqueryPattern = result.patterns.get('jquery');
      expect(jqueryPattern).toBeDefined();
      expect(jqueryPattern!.siteCount).toBe(2);
      expect(jqueryPattern!.sites.size).toBe(2);
      expect(jqueryPattern!.frequency).toBeCloseTo(2/3, 10); // 66.67%

      // React appears on 1 site
      const reactPattern = result.patterns.get('react');
      expect(reactPattern).toBeDefined();
      expect(reactPattern!.siteCount).toBe(1);
      expect(reactPattern!.frequency).toBeCloseTo(1/3, 10); // 33.33%
    });

    it('should handle script pattern extraction algorithms correctly', async () => {
      const data = createMockPreprocessedData({
        'site1.com': {
          scripts: new Set([
            'https://code.jquery.com/jquery-3.6.0.min.js',
            'https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js',
            'https://cdn.example.com/some-file.js'
          ])
        },
        'site2.com': {
          scripts: new Set([
            'https://angular.io/assets/js/angular.min.js',
            'https://unpkg.com/react@17/umd/react.production.min.js'
          ])
        }
      });

      const result = await analyzer.analyze(data, { ...basicOptions, minOccurrences: 1 });

      // Test specific pattern extraction
      expect(result.patterns.has('jquery')).toBe(true);
      expect(result.patterns.has('bootstrap')).toBe(true);
      expect(result.patterns.has('cdn-usage')).toBe(true);
      expect(result.patterns.has('angular')).toBe(true);
      expect(result.patterns.has('react')).toBe(true);
      expect(result.patterns.has('unpkg.com-scripts')).toBe(true);

      // Verify site counting for each pattern
      expect(result.patterns.get('jquery')!.siteCount).toBe(1);
      expect(result.patterns.get('bootstrap')!.siteCount).toBe(1);
      expect(result.patterns.get('cdn-usage')!.siteCount).toBe(1); // Only site1 has cdn.
      expect(result.patterns.get('angular')!.siteCount).toBe(1);
      expect(result.patterns.get('react')!.siteCount).toBe(1);
    });
  });

  describe('Frequency Calculation Precision', () => {
    it('should calculate frequencies with mathematical precision', async () => {
      const data = createMockPreprocessedData({
        'site1.com': { scripts: new Set(['https://code.jquery.com/jquery.min.js']) },
        'site2.com': { scripts: new Set(['https://code.jquery.com/jquery.min.js']) },
        'site3.com': { scripts: new Set(['https://example.com/other.js']) },
        'site4.com': { scripts: new Set(['https://example.com/other.js']) },
        'site5.com': { scripts: new Set(['https://example.com/other.js']) },
        'site6.com': { scripts: new Set(['https://example.com/other.js']) },
        'site7.com': { scripts: new Set(['https://example.com/other.js']) }
      });

      const result = await analyzer.analyze(data, { ...basicOptions, minOccurrences: 1 });

      const jqueryPattern = result.patterns.get('jquery');
      expect(jqueryPattern).toBeDefined();
      expect(jqueryPattern!.siteCount).toBe(2);
      expect(jqueryPattern!.frequency).toBeCloseTo(2/7, 10); // ~0.2857142857

      // Verify precision: 2 ÷ 7 = 0.2857142857142857...
      expect(jqueryPattern!.frequency).toBeCloseTo(0.2857142857142857, 10);
    });

    it('should handle edge case frequencies correctly', async () => {
      // Single site = 100% frequency
      const singleSiteData = createMockPreprocessedData({
        'site1.com': { scripts: new Set(['https://code.jquery.com/jquery.min.js']) }
      });

      const singleResult = await analyzer.analyze(singleSiteData, basicOptions);
      const pattern = singleResult.patterns.get('jquery');
      expect(pattern!.frequency).toBe(1.0); // Exactly 100%

      // Zero scripts
      const noScriptsData = createMockPreprocessedData({
        'site1.com': { scripts: new Set() },
        'site2.com': { scripts: new Set() }
      });

      const noScriptsResult = await analyzer.analyze(noScriptsData, basicOptions);
      expect(noScriptsResult.patterns.size).toBe(0);
    });
  });

  describe('Script Pattern Extraction Algorithms (Lines 117-218)', () => {
    it('should extract CDN patterns correctly', async () => {
      const data = createMockPreprocessedData({
        'site1.com': {
          scripts: new Set([
            'https://cdn.example.com/lib.js',
            'https://static.cdn.com/script.js',
            'https://regular.example.com/script.js'
          ])
        }
      });

      const result = await analyzer.analyze(data, { ...basicOptions, minOccurrences: 1 });

      expect(result.patterns.has('cdn-usage')).toBe(true);
      expect(result.patterns.get('cdn-usage')!.siteCount).toBe(1);
    });

    it('should extract CMS-specific script patterns', async () => {
      const data = createMockPreprocessedData({
        'site1.com': {
          scripts: new Set([
            'https://example.com/wp-content/themes/theme/script.js',
            'https://example.com/wp-includes/js/jquery.min.js'
          ])
        },
        'site2.com': {
          scripts: new Set([
            'https://example.com/sites/default/modules/custom/script.js'
          ])
        },
        'site3.com': {
          scripts: new Set([
            'https://example.com/media/jui/js/jquery.min.js'
          ])
        }
      });

      const result = await analyzer.analyze(data, { ...basicOptions, minOccurrences: 1 });

      // WordPress scripts
      expect(result.patterns.has('wordpress-scripts')).toBe(true);
      expect(result.patterns.get('wordpress-scripts')!.siteCount).toBe(1);

      // Drupal scripts
      expect(result.patterns.has('drupal-scripts')).toBe(true);
      expect(result.patterns.get('drupal-scripts')!.siteCount).toBe(1);

      // Joomla scripts
      expect(result.patterns.has('joomla-scripts')).toBe(true);
      expect(result.patterns.get('joomla-scripts')!.siteCount).toBe(1);
    });

    it('should handle inline script patterns correctly', async () => {
      const data = createMockPreprocessedData({
        'site1.com': {
          scripts: new Set([
            'inline:var $ = jQuery; $(document).ready(function() { console.log("hello"); });',
            'inline:gtag("config", "GA_TRACKING_ID");'
          ])
        },
        'site2.com': {
          scripts: new Set([
            'inline:wp_localize_script("handle", "object", data);'
          ])
        }
      });

      const result = await analyzer.analyze(data, { ...basicOptions, minOccurrences: 1 });

      expect(result.patterns.has('inline-script')).toBe(true);
      expect(result.patterns.get('inline-script')!.siteCount).toBe(2);

      expect(result.patterns.has('jquery-inline')).toBe(true);
      expect(result.patterns.get('jquery-inline')!.siteCount).toBe(1);

      expect(result.patterns.has('google-analytics-inline')).toBe(true);
      expect(result.patterns.get('google-analytics-inline')!.siteCount).toBe(1);

      expect(result.patterns.has('wordpress-inline')).toBe(true);
      expect(result.patterns.get('wordpress-inline')!.siteCount).toBe(1);
    });

    it('should handle analytics service patterns', async () => {
      const data = createMockPreprocessedData({
        'site1.com': {
          scripts: new Set([
            'https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID',
            'https://connect.facebook.net/en_US/fbevents.js'
          ])
        }
      });

      const result = await analyzer.analyze(data, { ...basicOptions, minOccurrences: 1 });

      expect(result.patterns.has('google-analytics')).toBe(true);
      expect(result.patterns.get('google-analytics')!.siteCount).toBe(1);

      expect(result.patterns.has('facebook-pixel')).toBe(true);
      expect(result.patterns.get('facebook-pixel')!.siteCount).toBe(1);
    });
  });

  describe('CDN Usage Calculation (Lines 223-233)', () => {
    it('should accurately calculate CDN usage statistics', async () => {
      const data = createMockPreprocessedData({
        'site1.com': {
          scripts: new Set([
            'https://cdn.example.com/lib.js',
            'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js'
          ])
        },
        'site2.com': {
          scripts: new Set([
            'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js'
          ])
        },
        'site3.com': {
          scripts: new Set([
            'https://example.com/local-script.js' // Not a CDN
          ])
        }
      });

      const result = await analyzer.analyze(data, { ...basicOptions, minOccurrences: 1 });

      expect(result.analyzerSpecific?.cdnUsage).toBeDefined();
      const cdnUsage = result.analyzerSpecific!.cdnUsage;

      // Should track CDN-related patterns
      expect(cdnUsage.has('cdn-usage')).toBe(true);
      expect(cdnUsage.get('cdn-usage')).toBe(2); // Both site1 and site2 use CDNs

      expect(cdnUsage.has('googleapis.com-scripts')).toBe(true);
      expect(cdnUsage.get('googleapis.com-scripts')).toBe(1);

      expect(cdnUsage.has('jsdelivr.net-scripts')).toBe(true);
      expect(cdnUsage.get('jsdelivr.net-scripts')).toBe(1);

      // Should not include non-CDN patterns
      expect(cdnUsage.has('jquery')).toBe(false);
    });
  });

  describe('Script Types Calculation (Lines 238-257)', () => {
    it('should correctly categorize script types', async () => {
      const data = createMockPreprocessedData({
        'site1.com': {
          scripts: new Set([
            'https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID',
            'https://code.jquery.com/jquery-3.6.0.min.js',
            'inline:console.log("test");'
          ])
        },
        'site2.com': {
          scripts: new Set([
            'https://example.com/wp-content/themes/theme/script.js',
            'https://connect.facebook.net/en_US/fbevents.js'
          ])
        },
        'site3.com': {
          scripts: new Set([
            'https://unpkg.com/react@17/umd/react.production.min.js',
            'https://example.com/custom-script.js'
          ])
        }
      });

      const result = await analyzer.analyze(data, { ...basicOptions, minOccurrences: 1 });

      expect(result.analyzerSpecific?.scriptTypes).toBeDefined();
      const scriptTypes = result.analyzerSpecific!.scriptTypes;

      // Analytics: google-analytics (site1) + facebook-pixel (site2) = 2 sites
      expect(scriptTypes.get('analytics')).toBe(2);

      // Libraries: jquery (site1) + react (site3) = 2 sites
      expect(scriptTypes.get('libraries')).toBe(2);

      // CMS: wordpress-scripts (site2) = 1 site
      expect(scriptTypes.get('cms')).toBe(1);

      // Inline: inline-script (site1) = 1 site
      expect(scriptTypes.get('inline')).toBe(1);

      // External: unpkg.com-scripts (site3) + external non-CDN = varies
      expect(scriptTypes.has('external')).toBe(true);
    });
  });

  describe('Filtering and Result Processing', () => {
    it('should apply minOccurrences filter correctly', async () => {
      const data = createMockPreprocessedData({
        'site1.com': { scripts: new Set(['https://code.jquery.com/jquery.min.js']) },
        'site2.com': { scripts: new Set(['https://code.jquery.com/jquery.min.js']) },
        'site3.com': { scripts: new Set(['https://unpkg.com/react@17/umd/react.min.js']) }, // Only 1 site
        'site4.com': { scripts: new Set(['https://code.jquery.com/jquery.min.js']) },
        'site5.com': { scripts: new Set(['https://example.com/bootstrap.min.js']) } // Only 1 site
      });

      const result = await analyzer.analyze(data, { ...basicOptions, minOccurrences: 2 });

      // jQuery appears on 3 sites (≥ 2) - should be included
      expect(result.patterns.has('jquery')).toBe(true);
      expect(result.patterns.get('jquery')!.siteCount).toBe(3);

      // React appears on 1 site (< 2) - should be filtered out
      expect(result.patterns.has('react')).toBe(false);

      // Bootstrap appears on 1 site (< 2) - should be filtered out
      expect(result.patterns.has('bootstrap')).toBe(false);
    });

    it('should return properly structured result format', async () => {
      const data = createMockPreprocessedData({
        'site1.com': { scripts: new Set(['https://code.jquery.com/jquery.min.js']) }
      });

      const result = await analyzer.analyze(data, basicOptions);

      // Verify result structure
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('totalSites');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('analyzerSpecific');

      expect(result.totalSites).toBe(1);
      expect(result.metadata.analyzer).toBe('ScriptAnalyzerV2');
      expect(result.metadata).toHaveProperty('analyzedAt');
      expect(result.metadata).toHaveProperty('totalPatternsFound');
      expect(result.metadata).toHaveProperty('totalPatternsAfterFiltering');

      expect(result.analyzerSpecific).toHaveProperty('cdnUsage');
      expect(result.analyzerSpecific).toHaveProperty('scriptTypes');
    });
  });

  describe('Example Collection', () => {
    it('should collect script examples when enabled', async () => {
      const data = createMockPreprocessedData({
        'site1.com': {
          scripts: new Set([
            'https://code.jquery.com/jquery-3.6.0.min.js',
            'https://ajax.googleapis.com/ajax/libs/jquery/3.6.4/jquery.min.js'
          ])
        }
      });

      const result = await analyzer.analyze(data, {
        ...basicOptions,
        includeExamples: true,
        maxExamples: 3
      });

      const jqueryPattern = result.patterns.get('jquery');
      expect(jqueryPattern?.examples).toBeDefined();
      expect(jqueryPattern!.examples!.size).toBeGreaterThan(0);
      
      // Should contain actual script URLs
      const examples = Array.from(jqueryPattern!.examples!);
      expect(examples.some(example => example.includes('jquery'))).toBe(true);
    });

    it('should respect maxExamples limit', async () => {
      const data = createMockPreprocessedData({
        'site1.com': {
          scripts: new Set([
            'https://code.jquery.com/jquery-3.6.0.min.js',
            'https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.2/jquery.min.js',
            'https://unpkg.com/jquery@3.6.3/dist/jquery.min.js'
          ])
        }
      });

      const result = await analyzer.analyze(data, {
        ...basicOptions,
        includeExamples: true,
        maxExamples: 2
      });

      const jqueryPattern = result.patterns.get('jquery');
      expect(jqueryPattern?.examples?.size).toBeLessThanOrEqual(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed script URLs gracefully', async () => {
      const data = createMockPreprocessedData({
        'site1.com': {
          scripts: new Set([
            'not-a-valid-url',
            'javascript:void(0)',
            '',
            'ftp://example.com/script.js'
          ])
        }
      });

      const result = await analyzer.analyze(data, basicOptions);

      // Should handle errors gracefully and still process
      expect(result.totalSites).toBe(1);
      expect(result.patterns.size).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty script sets correctly', async () => {
      const data = createMockPreprocessedData({
        'site1.com': { scripts: new Set() },
        'site2.com': { scripts: new Set() },
        'site3.com': { scripts: new Set() }
      });

      const result = await analyzer.analyze(data, basicOptions);

      expect(result.patterns.size).toBe(0);
      expect(result.totalSites).toBe(3);
      expect(result.analyzerSpecific?.cdnUsage.size).toBe(0);
      expect(result.analyzerSpecific?.scriptTypes.size).toBe(0);
    });

    it('should handle mixed valid and invalid script URLs', async () => {
      const data = createMockPreprocessedData({
        'site1.com': {
          scripts: new Set([
            'https://code.jquery.com/jquery.min.js', // Valid
            'not-a-url', // Invalid
            'https://unpkg.com/react@17/umd/react.min.js' // Valid
          ])
        }
      });

      const result = await analyzer.analyze(data, { ...basicOptions, minOccurrences: 1 });

      // Should process valid URLs
      expect(result.patterns.has('jquery')).toBe(true);
      expect(result.patterns.has('react')).toBe(true);
      expect(result.patterns.has('unpkg.com-scripts')).toBe(true);
    });
  });

  describe('Large-Scale Data Processing', () => {
    it('should handle large number of sites efficiently', async () => {
      // Create data for 100 sites
      const sites: Record<string, any> = {};
      for (let i = 1; i <= 100; i++) {
        sites[`site${i}.com`] = {
          scripts: new Set([
            'https://code.jquery.com/jquery.min.js',
            `https://example${i}.com/custom-script.js`
          ])
        };
      }

      const data = createMockPreprocessedData(sites);

      const startTime = Date.now();
      const result = await analyzer.analyze(data, { ...basicOptions, minOccurrences: 10 });
      const duration = Date.now() - startTime;

      // Should complete within reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);

      // jQuery should appear on 100 sites
      const jqueryPattern = result.patterns.get('jquery');
      expect(jqueryPattern?.siteCount).toBe(100);
      expect(jqueryPattern?.frequency).toBe(1.0);

      expect(result.totalSites).toBe(100);
    });
  });
});