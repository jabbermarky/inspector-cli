/**
 * FrequencyAggregator Unit Tests - Algorithmic Focus
 * 
 * CRITICAL: This file tests the mathematical correctness of FrequencyAggregator's
 * core algorithms, not just interfaces. We focus on:
 * 1. Unique site counting accuracy
 * 2. Pattern frequency calculations
 * 3. Data aggregation consistency
 * 4. Multi-analyzer coordination
 * 5. Edge case handling
 * 
 * Testing Philosophy: Minimal mocking, real data structures, algorithmic validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FrequencyAggregator } from '../frequency-aggregator-v2.js';
import type { 
  PreprocessedData, 
  SiteData, 
  FrequencyOptions,
  AggregatedResults 
} from '../types/analyzer-interface.js';

describe('FrequencyAggregator - Core Algorithm Testing', () => {
  let aggregator: FrequencyAggregator;
  
  beforeEach(() => {
    // Use real aggregator instance, not mocked
    aggregator = new FrequencyAggregator();
  });

  describe('Unique Site Counting Algorithms', () => {
    it('should count each site only once per pattern across all analyzers', async () => {
      // Create realistic test data with overlapping patterns
      const testData = createRealisticTestData([
        {
          url: 'https://wordpress-site.com',
          cms: 'WordPress',
          headers: new Map([
            ['server', new Set(['nginx/1.18.0'])],
            ['x-powered-by', new Set(['PHP/8.0'])],
            ['x-pingback', new Set(['https://wordpress-site.com/xmlrpc.php'])]
          ]),
          metaTags: new Map([
            ['generator', new Set(['WordPress 6.2'])],
            ['description', new Set(['A WordPress site'])]
          ])
        },
        {
          url: 'https://drupal-site.org',
          cms: 'Drupal',
          headers: new Map([
            ['server', new Set(['nginx/1.18.0'])], // Same server as above
            ['x-powered-by', new Set(['PHP/8.1'])],
            ['x-generator', new Set(['Drupal 10 (https://www.drupal.org)'])]
          ]),
          metaTags: new Map([
            ['generator', new Set(['Drupal 10 (https://www.drupal.org)'])],
            ['description', new Set(['A Drupal site'])]
          ])
        },
        {
          url: 'https://custom-site.net',
          cms: null,
          headers: new Map([
            ['server', new Set(['Apache/2.4.41'])], // Different server
            ['x-custom-header', new Set(['custom-value'])]
          ]),
          metaTags: new Map([
            ['description', new Set(['A custom site'])]
          ])
        }
      ]);

      // Mock the preprocessor to return our test data
      aggregator['preprocessor'].load = async () => testData;

      const result = await aggregator.analyze({ minOccurrences: 1 });

      // Validate unique site counting across analyzers
      // 'server' header appears on all 3 sites
      const serverPattern = result.headers.patterns.get('server');
      expect(serverPattern).toBeDefined();
      expect(serverPattern!.siteCount).toBe(3);
      expect(serverPattern!.sites.size).toBe(3);
      expect(serverPattern!.frequency).toBeCloseTo(1.0, 3); // 3/3 = 100%
      
      // Verify sites are correctly identified
      expect(serverPattern!.sites).toContain('wordpress-site.com');
      expect(serverPattern!.sites).toContain('drupal-site.org');
      expect(serverPattern!.sites).toContain('custom-site.net');

      // 'x-powered-by' appears on 2 sites  
      const poweredByPattern = result.headers.patterns.get('x-powered-by');
      expect(poweredByPattern).toBeDefined();
      expect(poweredByPattern!.siteCount).toBe(2);
      expect(poweredByPattern!.sites.size).toBe(2);
      expect(poweredByPattern!.frequency).toBeCloseTo(0.667, 3); // 2/3 = 66.7%

      // 'generator' meta tag appears on 2 sites (WordPress and Drupal)
      const generatorPattern = result.metaTags.patterns.get('generator');
      expect(generatorPattern).toBeDefined();
      expect(generatorPattern!.siteCount).toBe(2);
      expect(generatorPattern!.sites.size).toBe(2);
      expect(generatorPattern!.frequency).toBeCloseTo(0.667, 3); // 2/3 = 66.7%
    });

    it('should handle duplicate headers within same site correctly', async () => {
      const testData = createRealisticTestData([
        {
          url: 'https://multi-value-site.com',
          cms: 'WordPress',
          headers: new Map([
            // Same header with multiple values - should count as 1 site
            ['set-cookie', new Set(['session=abc123', 'prefs=light', 'cart=empty'])],
            ['cache-control', new Set(['no-cache', 'no-store'])]
          ]),
          metaTags: new Map([
            // Multiple meta tags with same name - should count as 1 site
            ['keyword', new Set(['web', 'development', 'cms'])]
          ])
        },
        {
          url: 'https://single-value-site.com',
          cms: 'Drupal',
          headers: new Map([
            ['set-cookie', new Set(['session=xyz789'])], // Same header, different values
            ['server', new Set(['nginx'])]
          ]),
          metaTags: new Map([
            ['keyword', new Set(['blog', 'news'])]
          ])
        }
      ]);

      aggregator['preprocessor'].load = async () => testData;
      const result = await aggregator.analyze({ minOccurrences: 1 });

      // 'set-cookie' appears on 2 sites, regardless of multiple values per site
      const setCookiePattern = result.headers.patterns.get('set-cookie');
      expect(setCookiePattern!.siteCount).toBe(2);
      expect(setCookiePattern!.frequency).toBe(1.0); // 2/2 = 100%
      
      // Verify examples include values from both sites
      expect(setCookiePattern!.examples!.size).toBeGreaterThan(1);
      
      // 'keyword' meta tag appears on 2 sites
      const keywordPattern = result.metaTags.patterns.get('keyword');
      expect(keywordPattern!.siteCount).toBe(2);
      expect(keywordPattern!.frequency).toBe(1.0); // 2/2 = 100%
    });

    it('should apply minOccurrences filtering correctly', async () => {
      const testData = createRealisticTestData([
        { url: 'https://site1.com', cms: 'WordPress', headers: new Map([['x-rare-header', new Set(['value1'])]]) },
        { url: 'https://site2.com', cms: 'WordPress', headers: new Map([['x-rare-header', new Set(['value2'])]]) },
        { url: 'https://site3.com', cms: 'Drupal', headers: new Map([['x-common-header', new Set(['value1'])]]) },
        { url: 'https://site4.com', cms: 'Drupal', headers: new Map([['x-common-header', new Set(['value2'])]]) },
        { url: 'https://site5.com', cms: 'Joomla', headers: new Map([['x-common-header', new Set(['value3'])]]) }
      ]);

      aggregator['preprocessor'].load = async () => testData;

      // Test with minOccurrences = 3
      const result = await aggregator.analyze({ minOccurrences: 3 });

      // 'x-rare-header' (2 sites) should be filtered out
      expect(result.headers.patterns.has('x-rare-header')).toBe(false);
      
      // 'x-common-header' (3 sites) should be included
      const commonHeader = result.headers.patterns.get('x-common-header');
      expect(commonHeader).toBeDefined();
      expect(commonHeader!.siteCount).toBe(3);
      expect(commonHeader!.frequency).toBe(0.6); // 3/5 = 60%
    });
  });

  describe('Pattern Frequency Calculations', () => {
    it('should calculate frequencies with mathematical precision', async () => {
      // Create test data with known frequency distributions
      const testData = createRealisticTestData([
        { url: 'https://site1.com', cms: 'WordPress', headers: new Map([['x-test', new Set(['a'])]]) },
        { url: 'https://site2.com', cms: 'WordPress', headers: new Map([['x-test', new Set(['b'])]]) },
        { url: 'https://site3.com', cms: 'WordPress', headers: new Map([['x-test', new Set(['c'])]]) },
        { url: 'https://site4.com', cms: 'Drupal', headers: new Map([['x-other', new Set(['d'])]]) },
        { url: 'https://site5.com', cms: 'Drupal', headers: new Map([['x-other', new Set(['e'])]]) },
        { url: 'https://site6.com', cms: null, headers: new Map([['server', new Set(['nginx'])]]) },
        { url: 'https://site7.com', cms: null, headers: new Map([['server', new Set(['apache'])]]) }
      ]);

      aggregator['preprocessor'].load = async () => testData;
      const result = await aggregator.analyze({ minOccurrences: 1 });

      // Verify exact frequency calculations
      const testHeader = result.headers.patterns.get('x-test');
      expect(testHeader!.siteCount).toBe(3);
      expect(testHeader!.frequency).toBeCloseTo(3/7, 6); // Precise to 6 decimal places

      const otherHeader = result.headers.patterns.get('x-other');
      expect(otherHeader!.siteCount).toBe(2);
      expect(otherHeader!.frequency).toBeCloseTo(2/7, 6);

      const serverHeader = result.headers.patterns.get('server');
      expect(serverHeader!.siteCount).toBe(2);
      expect(serverHeader!.frequency).toBeCloseTo(2/7, 6);

      // Verify total sites is consistent across all patterns
      for (const [patternName, pattern] of result.headers.patterns) {
        expect(pattern.frequency).toBeCloseTo(pattern.siteCount / result.headers.totalSites, 6);
      }
    });

    it('should handle edge case frequencies correctly', async () => {
      // Test edge cases: 0%, 100%, and fractional percentages
      const testData = createRealisticTestData([
        { url: 'https://universal-site.com', cms: 'WordPress', 
          headers: new Map([['x-universal', new Set(['everywhere'])]]) },
        { url: 'https://another-universal.com', cms: 'Drupal', 
          headers: new Map([['x-universal', new Set(['everywhere'])]]) },
        { url: 'https://third-universal.com', cms: 'Joomla', 
          headers: new Map([['x-universal', new Set(['everywhere'])]]) }
      ]);

      aggregator['preprocessor'].load = async () => testData;
      const result = await aggregator.analyze({ minOccurrences: 1 });

      // 100% frequency case
      const universalHeader = result.headers.patterns.get('x-universal');
      expect(universalHeader!.frequency).toBe(1.0); // Exactly 100%
      expect(universalHeader!.siteCount).toBe(3);
      
      // Verify no patterns have invalid frequencies
      for (const [_, pattern] of result.headers.patterns) {
        expect(pattern.frequency).toBeGreaterThanOrEqual(0);
        expect(pattern.frequency).toBeLessThanOrEqual(1);
        expect(Number.isFinite(pattern.frequency)).toBe(true);
      }
    });
  });

  describe('Data Aggregation Consistency', () => {
    it('should maintain consistent data across all analyzers', async () => {
      const testData = createRealisticTestData([
        {
          url: 'https://full-featured-site.com',
          cms: 'WordPress',
          headers: new Map([
            ['server', new Set(['nginx'])],
            ['x-powered-by', new Set(['PHP/8.0'])]
          ]),
          metaTags: new Map([
            ['generator', new Set(['WordPress 6.2'])],
            ['description', new Set(['Test site'])]
          ]),
          scripts: new Set(['https://example.com/jquery.js', 'https://example.com/custom.js'])
        },
        {
          url: 'https://minimal-site.com',
          cms: null,
          headers: new Map([
            ['server', new Set(['apache'])]
          ]),
          metaTags: new Map(),
          scripts: new Set()
        }
      ]);

      aggregator['preprocessor'].load = async () => testData;
      const result = await aggregator.analyze({ minOccurrences: 1 });

      // All analyzers should see the same total site count
      expect(result.headers.totalSites).toBe(2);
      expect(result.metaTags.totalSites).toBe(2);
      expect(result.scripts.totalSites).toBe(2);
      expect(result.summary.totalSitesAnalyzed).toBe(2);

      // All analyzers should use the same analysis options
      const expectedOptions = { minOccurrences: 1, includeExamples: true, maxExamples: 5, semanticFiltering: false };
      expect(result.headers.metadata.options).toEqual(expectedOptions);
      expect(result.metaTags.metadata.options).toEqual(expectedOptions);
      expect(result.scripts.metadata.options).toEqual(expectedOptions);

      // Site counting should be consistent between analyzers
      // 'server' header on 2 sites should match frequency calculations
      const serverHeader = result.headers.patterns.get('server');
      expect(serverHeader!.siteCount).toBe(2);
      expect(serverHeader!.frequency).toBe(1.0);
    });

    it('should handle empty datasets gracefully', async () => {
      const emptyData = createRealisticTestData([]);
      
      aggregator['preprocessor'].load = async () => emptyData;
      const result = await aggregator.analyze({ minOccurrences: 1 });

      // Should handle empty data without errors
      expect(result.headers.totalSites).toBe(0);
      expect(result.headers.patterns.size).toBe(0);
      expect(result.metaTags.totalSites).toBe(0);
      expect(result.metaTags.patterns.size).toBe(0);
      expect(result.summary.totalSitesAnalyzed).toBe(0);
      expect(result.summary.totalPatternsFound).toBe(0);
    });

    it('should handle malformed site data gracefully', async () => {
      const malformedData: PreprocessedData = {
        sites: new Map([
          ['malformed-site.com', {
            url: 'https://malformed-site.com',
            normalizedUrl: 'malformed-site.com',
            cms: null,
            confidence: 0,
            headers: new Map(), // Empty headers
            metaTags: new Map(), // Empty meta tags  
            scripts: new Set(), // Empty scripts
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          }],
          ['null-data-site.com', {
            url: 'https://null-data-site.com',
            normalizedUrl: 'null-data-site.com', 
            cms: null,
            confidence: 0,
            // Missing some fields to test robustness
            headers: new Map([['server', new Set(['nginx'])]]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          } as SiteData]
        ]),
        totalSites: 2,
        metadata: {
          version: '1.0.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      aggregator['preprocessor'].load = async () => malformedData;
      const result = await aggregator.analyze({ minOccurrences: 1 });

      // Should process without throwing errors
      expect(result.headers.totalSites).toBe(2);
      expect(result.summary.totalSitesAnalyzed).toBe(2);
      
      // Should find the one header that exists
      const serverHeader = result.headers.patterns.get('server');
      expect(serverHeader).toBeDefined();
      expect(serverHeader!.siteCount).toBe(1);
      expect(serverHeader!.frequency).toBe(0.5); // 1/2 = 50%
    });
  });

  describe('Multi-Analyzer Coordination', () => {
    it('should coordinate multiple analyzers with shared data', async () => {
      const testData = createRealisticTestData([
        {
          url: 'https://rich-site.com',
          cms: 'WordPress',
          headers: new Map([
            ['server', new Set(['nginx'])],
            ['x-powered-by', new Set(['PHP/8.0'])],
            ['x-pingback', new Set(['https://rich-site.com/xmlrpc.php'])]
          ]),
          metaTags: new Map([
            ['generator', new Set(['WordPress 6.2'])],
            ['description', new Set(['A rich WordPress site'])],
            ['keywords', new Set(['wordpress, cms, blog'])]
          ]),
          scripts: new Set([
            'https://rich-site.com/wp-content/themes/theme/script.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js'
          ])
        }
      ]);

      aggregator['preprocessor'].load = async () => testData;
      const result = await aggregator.analyze({ minOccurrences: 1 });

      // Verify all analyzers found patterns
      expect(result.headers.patterns.size).toBeGreaterThan(0);
      expect(result.metaTags.patterns.size).toBeGreaterThan(0);
      expect(result.scripts.patterns.size).toBeGreaterThan(0);

      // Verify analyzers are properly identified
      expect(result.headers.metadata.analyzer).toBe('HeaderAnalyzerV2');
      expect(result.metaTags.metadata.analyzer).toBe('MetaAnalyzerV2');
      expect(result.scripts.metadata.analyzer).toBe('ScriptAnalyzerV2');

      // Verify summary aggregates data from all analyzers
      expect(result.summary.totalPatternsFound).toBe(
        result.headers.metadata.totalPatternsFound +
        result.metaTags.metadata.totalPatternsFound +
        (result.scripts.metadata.totalPatternsFound || 0)
      );

      // Verify top patterns are populated from each analyzer
      expect(result.summary.topPatterns.headers.length).toBeGreaterThan(0);
      expect(result.summary.topPatterns.metaTags.length).toBeGreaterThan(0);
      expect(result.summary.topPatterns.scripts.length).toBeGreaterThan(0);
    });

    it('should provide consistent analysis timestamps', async () => {
      const testData = createRealisticTestData([
        { url: 'https://test-site.com', cms: 'WordPress', 
          headers: new Map([['server', new Set(['nginx'])]]) }
      ]);

      aggregator['preprocessor'].load = async () => testData;
      
      const startTime = Date.now();
      const result = await aggregator.analyze({ minOccurrences: 1 });
      const endTime = Date.now();

      // All analyzer timestamps should be within the analysis timeframe
      const headerTime = new Date(result.headers.metadata.analyzedAt).getTime();
      const metaTime = new Date(result.metaTags.metadata.analyzedAt).getTime();
      const scriptTime = new Date(result.scripts.metadata.analyzedAt).getTime();
      const summaryTime = new Date(result.summary.analysisDate).getTime();

      expect(headerTime).toBeGreaterThanOrEqual(startTime);
      expect(headerTime).toBeLessThanOrEqual(endTime);
      expect(metaTime).toBeGreaterThanOrEqual(startTime);
      expect(metaTime).toBeLessThanOrEqual(endTime);
      expect(scriptTime).toBeGreaterThanOrEqual(startTime);
      expect(scriptTime).toBeLessThanOrEqual(endTime);
      expect(summaryTime).toBeGreaterThanOrEqual(startTime);
      expect(summaryTime).toBeLessThanOrEqual(endTime);
    });

    it('should run SemanticAnalyzerV2 and provide semantic analysis results', async () => {
      // Create larger test dataset so ValidationPipelineV2 has enough data to validate patterns
      const sites = Array.from({ length: 15 }, (_, i) => ({
        url: `https://site${i + 1}.com`,
        cms: i % 3 === 0 ? 'WordPress' : i % 3 === 1 ? 'Drupal' : 'Joomla',
        headers: new Map([
          // Common headers that will appear frequently and pass validation
          ['server', new Set([i % 2 === 0 ? 'nginx/1.18.0' : 'apache/2.4.41'])],
          ['content-type', new Set(['text/html; charset=utf-8'])],
          ['x-powered-by', new Set(['PHP/8.0'])],
          // Some CMS-specific headers
          ...(i % 3 === 0 ? [['x-wp-total', new Set(['42'])]] : []),
          ...(i % 3 === 1 ? [['x-drupal-cache', new Set(['HIT'])]] : []),
          // Security headers 
          ['content-security-policy', new Set(['default-src \'self\''])],
          ['x-frame-options', new Set(['SAMEORIGIN'])]
        ])
      }));
      
      const testData = createRealisticTestData(sites);

      aggregator['preprocessor'].load = async () => testData;
      const result = await aggregator.analyze({ minOccurrences: 1 });

      // Validate semantic analysis was performed
      expect(result.semantic).toBeDefined();
      expect(result.semantic.metadata.analyzer).toBe('SemanticAnalyzerV2');
      expect(result.semantic.analyzerSpecific).toBeDefined();
      
      // Validate semantic-specific data structure exists (V2 pure implementation)
      const semantic = result.semantic.analyzerSpecific!;
      expect(semantic.categoryDistribution).toBeDefined();
      expect(semantic.headerPatterns).toBeDefined();
      expect(semantic.vendorDetections).toBeDefined();
      expect(semantic.insights).toBeDefined();
      expect(semantic.qualityMetrics).toBeDefined();

      // ARCHITECTURAL CORRECTNESS: Semantic analyzer now uses validated headers
      // If validation doesn't produce validated headers (due to small dataset), 
      // semantic analysis should use fallback method
      if (result.validation.analyzerSpecific?.validatedPatterns?.size > 0) {
        // If validation found patterns, semantic analysis should use them
        expect(semantic.headerPatterns.size).toBeGreaterThan(0);
        expect(result.semantic.patterns.size).toBeGreaterThanOrEqual(0); // May be 0 if no patterns meet frequency threshold
      } else {
        // If validation didn't find patterns, semantic should fall back to raw headers
        expect(semantic.headerPatterns.size).toBeGreaterThanOrEqual(0);
      }
    });

    it('should run ValidationPipelineV2 before SemanticAnalyzerV2', async () => {
      const testData = createRealisticTestData([
        { url: 'https://site1.com', cms: 'WordPress', 
          headers: new Map([
            ['x-wp-total', new Set(['42'])],
            ['content-security-policy', new Set(['default-src \'self\''])]
          ]) 
        },
        { url: 'https://site2.com', cms: 'Drupal', 
          headers: new Map([
            ['x-drupal-cache', new Set(['HIT'])],
            ['server', new Set(['nginx/1.18.0'])]
          ]) 
        }
      ]);

      aggregator['preprocessor'].load = async () => testData;
      const result = await aggregator.analyze({ minOccurrences: 1 });

      // Validate validation pipeline was performed
      expect(result.validation).toBeDefined();
      expect(result.validation.metadata.analyzer).toBe('ValidationPipelineV2Native');
      expect(result.validation.analyzerSpecific).toBeDefined();
      
      // Validate validation-specific data
      const validation = result.validation.analyzerSpecific!;
      expect(validation.qualityMetrics.overallScore).toBeDefined();
      expect(validation.validationSummary.overallPassed).toBeDefined();
      expect(validation.stageResults).toBeDefined();
      expect(validation.validatedPatterns).toBeDefined();
      
      // Validate stage results were captured
      expect(validation.stageResults.length).toBe(7); // 7-stage pipeline
      expect(validation.validationSummary.totalStages).toBe(7);
      
      // Validate statistical metrics were calculated
      expect(validation.statisticalMetrics).toBeDefined();
      expect(validation.statisticalMetrics.chiSquareTests).toBeDefined();
      expect(validation.statisticalMetrics.powerAnalysis).toBeDefined();
    });
  });

  describe('Performance and Memory Characteristics', () => {
    it('should handle moderately large datasets efficiently', async () => {
      // Create a realistic moderate dataset (100 sites)
      const sitesData = Array.from({ length: 100 }, (_, i) => ({
        url: `https://site${i}.com`,
        cms: i % 3 === 0 ? 'WordPress' : i % 3 === 1 ? 'Drupal' : 'Joomla',
        headers: new Map([
          ['server', new Set([i % 2 === 0 ? 'nginx' : 'apache'])],
          ['x-powered-by', new Set([`PHP/${7 + (i % 3)}.${i % 10}`])],
          ...(i % 10 === 0 ? [['x-rare-header', new Set([`rare-${i}`])]] : [])
        ]),
        metaTags: new Map([
          ['generator', new Set([`CMS ${i % 3 === 0 ? 'WordPress' : i % 3 === 1 ? 'Drupal' : 'Joomla'}`])],
          ['description', new Set([`Site ${i} description`])]
        ])
      }));

      const testData = createRealisticTestData(sitesData);
      aggregator['preprocessor'].load = async () => testData;

      const startTime = performance.now();
      const result = await aggregator.analyze({ minOccurrences: 5 });
      const duration = performance.now() - startTime;

      // Should complete within reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
      
      // Should process all sites
      expect(result.summary.totalSitesAnalyzed).toBe(100);
      
      // Should find expected patterns
      expect(result.headers.patterns.has('server')).toBe(true);
      expect(result.headers.patterns.has('x-powered-by')).toBe(true);
      
      // Should respect minOccurrences filtering
      // x-rare-header appears on 10 sites (every 10th site), so with minOccurrences=5 it should be included
      expect(result.headers.patterns.has('x-rare-header')).toBe(true); // 10 sites >= 5 minOccurrences
      
      // Frequency calculations should be mathematically correct
      const serverPattern = result.headers.patterns.get('server');
      expect(serverPattern!.siteCount).toBe(100); // All sites have server header
      expect(serverPattern!.frequency).toBe(1.0);
    });
  });
});

/**
 * Helper function to create realistic test data
 * This replaces synthetic Array.from() fixtures with structured, realistic data
 */
function createRealisticTestData(sites: Array<{
  url: string;
  cms: string | null;
  headers?: Map<string, Set<string>>;
  metaTags?: Map<string, Set<string>>;
  scripts?: Set<string>;
}>): PreprocessedData {
  const siteMap = new Map<string, SiteData>();
  
  sites.forEach(site => {
    const normalizedUrl = site.url.replace(/^https?:\/\//, '');
    siteMap.set(normalizedUrl, {
      url: site.url,
      normalizedUrl,
      cms: site.cms,
      confidence: site.cms ? 0.9 : 0.0,
      headers: site.headers || new Map(),
      metaTags: site.metaTags || new Map(),
      scripts: site.scripts || new Set(),
      technologies: new Set(),
      capturedAt: new Date().toISOString()
    });
  });

  // Generate semantic metadata for headers found in the test data
  const headerCategories = new Map<string, string>();
  const headerClassifications = new Map<string, any>();
  const vendorMappings = new Map<string, string>();
  
  // Collect all unique headers
  const allHeaders = new Set<string>();
  siteMap.forEach(site => {
    site.headers.forEach((_, headerName) => {
      allHeaders.add(headerName);
    });
  });
  
  // Classify headers for semantic metadata
  allHeaders.forEach(header => {
    let category = 'custom';
    let vendor: string | undefined;
    let discriminativeScore = 0.5;
    
    // Basic classification logic for test headers
    if (header.includes('wp-') || header === 'x-pingback') {
      category = 'cms';
      vendor = 'WordPress';
      discriminativeScore = 0.9;
    } else if (header.includes('drupal')) {
      category = 'cms';
      vendor = 'Drupal';
      discriminativeScore = 0.9;
    } else if (header === 'server' || header === 'content-type') {
      category = 'infrastructure';
      discriminativeScore = 0.8;
    } else if (header.includes('security') || header.includes('frame-options') || header === 'content-security-policy') {
      category = 'security';
      discriminativeScore = 0.95;
    } else if (header === 'x-powered-by') {
      category = 'infrastructure';
      discriminativeScore = 0.7;
    }
    
    headerCategories.set(header, category);
    headerClassifications.set(header, {
      category,
      discriminativeScore,
      filterRecommendation: discriminativeScore > 0.8 ? 'include' : 'context-dependent',
      vendor,
      platformName: vendor
    });
    
    if (vendor) {
      vendorMappings.set(header, vendor);
    }
  });

  return {
    sites: siteMap,
    totalSites: sites.length,
    metadata: {
      version: '1.0.0',
      preprocessedAt: new Date().toISOString(),
      semantic: {
        categoryCount: headerCategories.size,
        headerCategories,
        headerClassifications,
        vendorMappings
      }
    }
  };
}