/**
 * MetaAnalyzerV2 Unit Tests - Complete Algorithmic Coverage
 * 
 * CRITICAL: This file provides comprehensive algorithmic testing for MetaAnalyzerV2's
 * core business logic. We test:
 * 1. Unique site counting algorithms (lines 50-116)
 * 2. Frequency calculation precision (lines 207-208)
 * 3. Semantic filtering accuracy (lines 56-58, 163-166)
 * 4. Pattern detection logic (lines 63-86)
 * 5. Meta tag classification (OG/Twitter tag detection)
 * 6. Value frequency tracking and Map/Set conversion
 * 7. Edge cases and malformed data handling
 * 
 * Testing Philosophy: Real data structures, mathematical precision, minimal mocking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetaAnalyzerV2 } from '../meta-analyzer-v2.js';
import type { PreprocessedData, AnalysisOptions } from '../../types/analyzer-interface.js';

describe('MetaAnalyzerV2', () => {
  let analyzer: MetaAnalyzerV2;
  let testData: PreprocessedData;
  let options: AnalysisOptions;

  beforeEach(() => {
    analyzer = new MetaAnalyzerV2();
    options = {
      minOccurrences: 2,
      includeExamples: true,
      maxExamples: 3,
      semanticFiltering: true
    };

    // Create test data with multiple sites
    testData = {
      sites: new Map([
        ['site1.com', {
          url: 'https://site1.com',
          normalizedUrl: 'site1.com',
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map(),
          metaTags: new Map([
            ['name:generator', new Set(['WordPress 5.8'])],
            ['property:og:type', new Set(['website'])],
            ['property:og:title', new Set(['Site 1 Title'])],
            ['name:viewport', new Set(['width=device-width, initial-scale=1'])], // Should be filtered
            ['name:twitter:card', new Set(['summary'])]
          ]),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }],
        ['site2.com', {
          url: 'https://site2.com',
          normalizedUrl: 'site2.com',
          cms: 'WordPress',
          confidence: 0.95,
          headers: new Map(),
          metaTags: new Map([
            ['name:generator', new Set(['WordPress 6.0'])],
            ['property:og:type', new Set(['article'])],
            ['property:og:site_name', new Set(['Site 2'])],
            ['name:viewport', new Set(['width=device-width, initial-scale=1'])], // Should be filtered
            ['name:twitter:card', new Set(['summary_large_image'])]
          ]),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-02T00:00:00Z'
        }],
        ['site3.com', {
          url: 'https://site3.com',
          normalizedUrl: 'site3.com',
          cms: 'Drupal',
          confidence: 0.85,
          headers: new Map(),
          metaTags: new Map([
            ['name:generator', new Set(['Drupal 9'])],
            ['property:og:type', new Set(['website'])],
            ['name:drupal-specific', new Set(['some-value'])]
          ]),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-03T00:00:00Z'
        }]
      ]),
      totalSites: 3,
      metadata: {
        version: '1.0.0',
        preprocessedAt: '2024-01-01T00:00:00Z'
      }
    };
  });

  describe('Unique Site Counting', () => {
    it('should count each site only once per meta tag', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // name:generator appears on all 3 sites
      const generator = result.patterns.get('name:generator');
      expect(generator).toBeDefined();
      expect(generator!.siteCount).toBe(3);
      expect(generator!.sites.size).toBe(3);
      expect(generator!.frequency).toBe(1.0); // 3/3 = 100%
    });

    it('should correctly count meta tags that appear on subset of sites', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // property:og:type appears on all 3 sites
      const ogType = result.patterns.get('property:og:type');
      expect(ogType).toBeDefined();
      expect(ogType!.siteCount).toBe(3);
      expect(ogType!.frequency).toBe(1.0);
      
      // name:twitter:card appears on 2 sites
      const twitterCard = result.patterns.get('name:twitter:card');
      expect(twitterCard).toBeDefined();
      expect(twitterCard!.siteCount).toBe(2);
      expect(twitterCard!.frequency).toBeCloseTo(0.667, 3); // 2/3 = 66.7%
      
      // name:drupal-specific appears on 1 site
      const drupalSpecific = result.patterns.get('name:drupal-specific');
      expect(drupalSpecific).toBeUndefined(); // Filtered out by minOccurrences = 2
    });
  });

  describe('Single Filtering (No Double Filtering Bug)', () => {
    it('should apply minOccurrences filter only once', async () => {
      // Set minOccurrences to 1 to see all patterns
      options.minOccurrences = 1;
      const result = await analyzer.analyze(testData, options);
      
      // All patterns with siteCount >= 1 should be included
      expect(result.patterns.has('name:drupal-specific')).toBe(true);
      expect(result.patterns.get('name:drupal-specific')!.siteCount).toBe(1);
      
      // Now with minOccurrences = 2
      options.minOccurrences = 2;
      const result2 = await analyzer.analyze(testData, options);
      
      // Patterns with siteCount < 2 should be filtered out
      expect(result2.patterns.has('name:drupal-specific')).toBe(false);
      expect(result2.patterns.has('property:og:title')).toBe(false); // Only on 1 site
      expect(result2.patterns.has('property:og:site_name')).toBe(false); // Only on 1 site
      
      // Patterns with siteCount >= 2 should remain
      expect(result2.patterns.has('name:generator')).toBe(true);
      expect(result2.patterns.has('property:og:type')).toBe(true);
      expect(result2.patterns.has('name:twitter:card')).toBe(true);
    });

    it('should not apply frequency-based filtering', async () => {
      // The old double filtering bug would filter based on frequency threshold
      // This test ensures we only filter based on absolute site count
      options.minOccurrences = 2;
      const result = await analyzer.analyze(testData, options);
      
      // twitter:card has 2 sites (66.7% frequency)
      // With double filtering bug, this might be filtered if frequency < threshold
      expect(result.patterns.has('name:twitter:card')).toBe(true);
      expect(result.patterns.get('name:twitter:card')!.siteCount).toBe(2);
    });
  });

  describe('Semantic Filtering', () => {
    it('should apply semantic filtering when enabled', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // 'viewport' meta tag should be filtered out
      expect(result.patterns.has('name:viewport')).toBe(false);
      
      // CMS-relevant meta tags should remain
      expect(result.patterns.has('name:generator')).toBe(true);
    });

    it('should not apply semantic filtering when disabled', async () => {
      options.semanticFiltering = false;
      
      const result = await analyzer.analyze(testData, options);
      
      // 'viewport' meta tag should now be included (appears on 2 sites)
      expect(result.patterns.has('name:viewport')).toBe(true);
      expect(result.patterns.get('name:viewport')!.siteCount).toBe(2);
    });
  });

  describe('Meta Tag Type Detection', () => {
    it('should identify Open Graph tags', async () => {
      const result = await analyzer.analyze(testData, options);
      
      expect(result.analyzerSpecific!.ogTags.has('property:og:type')).toBe(true);
      expect(result.analyzerSpecific!.ogTags.has('property:og:title')).toBe(false); // Filtered by minOccurrences
      expect(result.analyzerSpecific!.ogTags.has('name:generator')).toBe(false); // Not an OG tag
    });

    it('should identify Twitter tags', async () => {
      const result = await analyzer.analyze(testData, options);
      
      expect(result.analyzerSpecific!.twitterTags.has('name:twitter:card')).toBe(true);
      expect(result.analyzerSpecific!.twitterTags.has('name:generator')).toBe(false); // Not a Twitter tag
    });
  });

  describe('Example Collection', () => {
    it('should collect examples when enabled', async () => {
      const result = await analyzer.analyze(testData, options);
      
      const generator = result.patterns.get('name:generator');
      expect(generator!.examples).toBeDefined();
      expect(generator!.examples!.size).toBeGreaterThan(0);
      expect(generator!.examples!.size).toBeLessThanOrEqual(options.maxExamples!);
      
      // Check example format
      const exampleArray = Array.from(generator!.examples!);
      expect(exampleArray[0]).toMatch(/^name:generator="/);
    });

    it('should truncate long example values', async () => {
      // Add a meta tag with long value
      const longValue = 'a'.repeat(150);
      testData.sites.get('site1.com')!.metaTags.set('name:long-value', new Set([longValue]));
      testData.sites.get('site2.com')!.metaTags.set('name:long-value', new Set([longValue]));
      
      const result = await analyzer.analyze(testData, options);
      
      const longValuePattern = result.patterns.get('name:long-value');
      const examples = Array.from(longValuePattern!.examples!);
      expect(examples[0]).toMatch(/\.\.\.\"$/); // Should end with ..."
      expect(examples[0].length).toBeLessThan(150); // Should be truncated
    });
  });

  describe('Result Format', () => {
    it('should return properly formatted AnalysisResult', async () => {
      const result = await analyzer.analyze(testData, options);
      
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('totalSites');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('analyzerSpecific');
      
      expect(result.totalSites).toBe(3);
      expect(result.metadata.analyzer).toBe('MetaAnalyzerV2');
      expect(result.metadata.totalPatternsFound).toBeGreaterThan(0);
      expect(result.metadata.totalPatternsAfterFiltering).toBeGreaterThan(0);
    });

    it('should sort patterns by frequency', async () => {
      const result = await analyzer.analyze(testData, options);
      
      const frequencies = Array.from(result.patterns.values()).map(p => p.frequency);
      const sortedFrequencies = [...frequencies].sort((a, b) => b - a);
      
      expect(frequencies).toEqual(sortedFrequencies);
    });
  });

  describe('Map/Set Conversion Validation (Lines 93-103 - Critical Algorithm Area)', () => {
    it('should correctly build metaValueSites Map<string, Map<string, Set<string>>> structure', async () => {
      const testData = createRealisticMetaTestData([
        { 
          url: 'https://wordpress1.com', 
          metaTags: new Map([
            ['name:generator', new Set(['WordPress 6.0'])],
            ['property:og:title', new Set(['WP Site 1'])]
          ])
        },
        { 
          url: 'https://wordpress2.com', 
          metaTags: new Map([
            ['name:generator', new Set(['WordPress 6.0'])], // Same value
            ['property:og:title', new Set(['WP Site 2'])] // Different value
          ])
        },
        { 
          url: 'https://drupal1.com', 
          metaTags: new Map([
            ['name:generator', new Set(['Drupal 10'])], // Different generator
            ['name:description', new Set(['Drupal Site'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Validate the Map/Set conversion worked correctly by checking value frequencies
      const generatorPattern = result.patterns.get('name:generator');
      expect(generatorPattern).toBeDefined();
      expect(generatorPattern!.metadata!.valueFrequencies).toBeDefined();
      
      // WordPress 6.0 should appear on 2 sites
      expect(generatorPattern!.metadata!.valueFrequencies!.get('WordPress 6.0')).toBe(2);
      // Drupal 10 should appear on 1 site
      expect(generatorPattern!.metadata!.valueFrequencies!.get('Drupal 10')).toBe(1);

      const ogTitlePattern = result.patterns.get('property:og:title');
      expect(ogTitlePattern!.metadata!.valueFrequencies!.get('WP Site 1')).toBe(1);
      expect(ogTitlePattern!.metadata!.valueFrequencies!.get('WP Site 2')).toBe(1);
    });

    it('should handle complex nested Map/Set operations without data loss', async () => {
      // Test complex meta tag structures with multiple values per tag
      const testData = createRealisticMetaTestData([
        { 
          url: 'https://complex-meta1.com', 
          metaTags: new Map([
            ['name:keywords', new Set(['cms', 'wordpress', 'blog', 'php'])],
            ['property:og:image', new Set(['https://site.com/img1.jpg', 'https://site.com/img2.jpg'])],
            ['name:robots', new Set(['index', 'follow', 'noarchive'])]
          ])
        },
        { 
          url: 'https://complex-meta2.com', 
          metaTags: new Map([
            ['name:keywords', new Set(['cms', 'drupal', 'website'])], // Some overlapping values
            ['property:og:image', new Set(['https://other.com/banner.png'])],
            ['name:author', new Set(['John Doe', 'Jane Smith'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Validate keywords meta tag conversion
      const keywordsPattern = result.patterns.get('name:keywords');
      expect(keywordsPattern!.siteCount).toBe(2);
      const keywordsFreqs = keywordsPattern!.metadata!.valueFrequencies!;
      
      // Each unique value should be tracked correctly
      expect(keywordsFreqs.get('cms')).toBe(2); // Both sites
      expect(keywordsFreqs.get('wordpress')).toBe(1); // Only site1
      expect(keywordsFreqs.get('drupal')).toBe(1); // Only site2
      expect(keywordsFreqs.get('blog')).toBe(1); // Only site1
      expect(keywordsFreqs.get('website')).toBe(1); // Only site2

      // Validate og:image meta tag conversion
      const ogImagePattern = result.patterns.get('property:og:image');
      expect(ogImagePattern!.siteCount).toBe(2);
      const imageFreqs = ogImagePattern!.metadata!.valueFrequencies!;
      
      expect(imageFreqs.get('https://site.com/img1.jpg')).toBe(1);
      expect(imageFreqs.get('https://site.com/img2.jpg')).toBe(1);
      expect(imageFreqs.get('https://other.com/banner.png')).toBe(1);
    });

    it('should prevent double-counting in nested Map/Set structure', async () => {
      // Test that same value from same site doesn't get counted multiple times
      const testData = createRealisticMetaTestData([
        { 
          url: 'https://duplicate-meta-site.com', 
          metaTags: new Map([
            ['name:keywords', new Set(['web', 'design', 'web'])] // Duplicate 'web' in Set
          ])
        },
        { 
          url: 'https://normal-meta-site.com', 
          metaTags: new Map([
            ['name:keywords', new Set(['development'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      const keywordsPattern = result.patterns.get('name:keywords');
      expect(keywordsPattern!.siteCount).toBe(2);
      
      const valueFreqs = keywordsPattern!.metadata!.valueFrequencies!;
      
      // Each value should be counted once per site, not per occurrence
      expect(valueFreqs.get('web')).toBe(1); // Only from duplicate-meta-site
      expect(valueFreqs.get('design')).toBe(1); // Only from duplicate-meta-site  
      expect(valueFreqs.get('development')).toBe(1); // Only from normal-meta-site
    });

    it('should maintain data integrity across Map/Set operations with edge cases', async () => {
      const testData = createRealisticMetaTestData([
        { 
          url: 'https://edge-case1.com', 
          metaTags: new Map([
            ['name:empty-values', new Set()], // Empty Set
            ['name:single-value', new Set(['single'])],
            ['name:special-chars', new Set(['', 'null', 'undefined'])] // Edge case values
          ])
        },
        { 
          url: 'https://edge-case2.com', 
          metaTags: new Map([
            ['property:og:special', new Set(['value with spaces', 'value,with,commas', 'value"with"quotes'])],
            ['name:unicode', new Set(['café', '🚀', '中文', '日本語'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Empty Set should still create pattern entry
      const emptyPattern = result.patterns.get('name:empty-values');
      expect(emptyPattern).toBeDefined();
      expect(emptyPattern!.siteCount).toBe(1);
      expect(emptyPattern!.metadata!.valueFrequencies!.size).toBe(0); // No values

      // Special characters should be preserved
      const specialPattern = result.patterns.get('property:og:special');
      const specialFreqs = specialPattern!.metadata!.valueFrequencies!;
      expect(specialFreqs.get('value with spaces')).toBe(1);
      expect(specialFreqs.get('value,with,commas')).toBe(1);
      expect(specialFreqs.get('value"with"quotes')).toBe(1);

      // Unicode should be preserved
      const unicodePattern = result.patterns.get('name:unicode');
      const unicodeFreqs = unicodePattern!.metadata!.valueFrequencies!;
      expect(unicodeFreqs.get('café')).toBe(1);
      expect(unicodeFreqs.get('🚀')).toBe(1);
      expect(unicodeFreqs.get('中文')).toBe(1);
      expect(unicodeFreqs.get('日本語')).toBe(1);
    });

    it('should handle large-scale Map/Set operations efficiently', async () => {
      // Create test with many meta tags and values to stress-test the conversion
      const sites = [];
      const numSites = 50;
      const numMetaTagsPerSite = 8;
      
      for (let i = 1; i <= numSites; i++) {
        const metaTags = new Map<string, Set<string>>();
        for (let j = 1; j <= numMetaTagsPerSite; j++) {
          const metaName = `name:meta-${j}`;
          const values = new Set<string>();
          // Add 2-4 values per meta tag to test Set operations
          for (let k = 1; k <= (j % 4) + 2; k++) {
            values.add(`value-${i}-${j}-${k}`);
          }
          metaTags.set(metaName, values);
        }
        sites.push({
          url: `https://meta-site${i}.com`,
          metaTags
        });
      }

      const testData = createRealisticMetaTestData(sites);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const startTime = Date.now();
      const result = await analyzer.analyze(testData, options);
      const endTime = Date.now();

      // Validate performance (should complete in reasonable time)
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second

      // Validate data integrity
      expect(result.totalSites).toBe(numSites);
      expect(result.patterns.size).toBe(numMetaTagsPerSite); // 8 unique meta tags

      // Validate Map/Set structure integrity
      for (const [metaName, pattern] of result.patterns) {
        expect(pattern.siteCount).toBe(numSites); // Each meta tag appears on all sites
        expect(pattern.frequency).toBe(1.0); // 100% frequency
        expect(pattern.metadata!.valueFrequencies!.size).toBeGreaterThan(0);
        
        // Verify each value appears on exactly one site (since values are unique per site)
        for (const count of pattern.metadata!.valueFrequencies!.values()) {
          expect(count).toBe(1);
        }
      }
    });

    it('should preserve type safety in Map/Set conversions', async () => {
      // Ensure the conversion maintains proper TypeScript types
      const testData = createRealisticMetaTestData([
        { 
          url: 'https://type-safe-meta.com', 
          metaTags: new Map([
            ['name:generator', new Set(['WordPress 6.0', 'Plugin Manager'])],
            ['property:og:url', new Set(['https://example.com', 'https://example.com/about'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Validate that all operations maintain proper types
      const generatorPattern = result.patterns.get('name:generator');
      expect(generatorPattern!.metadata!.valueFrequencies).toBeInstanceOf(Map);
      
      // Validate Map keys are strings
      for (const key of generatorPattern!.metadata!.valueFrequencies!.keys()) {
        expect(typeof key).toBe('string');
      }
      
      // Validate Map values are numbers
      for (const value of generatorPattern!.metadata!.valueFrequencies!.values()) {
        expect(typeof value).toBe('number');
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
      }

      // Validate sites Set contains strings
      for (const site of generatorPattern!.sites) {
        expect(typeof site).toBe('string');
      }
    });
  });

  describe('Meta Tag Classification Algorithms', () => {
    it('should accurately identify Open Graph tags with complex patterns', async () => {
      const testData = createRealisticMetaTestData([
        { 
          url: 'https://og-test1.com', 
          metaTags: new Map([
            ['property:og:title', new Set(['Page Title'])],
            ['property:og:description', new Set(['Page Description'])],
            ['property:og:image', new Set(['https://site.com/image.jpg'])],
            ['property:og:url', new Set(['https://site.com'])],
            ['property:og:type', new Set(['website'])],
            ['property:og:site_name', new Set(['Site Name'])],
            ['name:description', new Set(['Regular description'])], // Not OG
            ['name:keywords', new Set(['web', 'design'])] // Not OG
          ])
        },
        { 
          url: 'https://og-test2.com', 
          metaTags: new Map([
            ['property:og:title', new Set(['Different Title'])],
            ['property:og:type', new Set(['article'])],
            ['property:article:author', new Set(['Author Name'])], // OG article namespace
            ['name:generator', new Set(['WordPress'])] // Not OG
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Validate OG tag identification
      expect(result.analyzerSpecific!.ogTags.has('property:og:title')).toBe(true);
      expect(result.analyzerSpecific!.ogTags.has('property:og:description')).toBe(true);
      expect(result.analyzerSpecific!.ogTags.has('property:og:image')).toBe(true);
      expect(result.analyzerSpecific!.ogTags.has('property:og:url')).toBe(true);
      expect(result.analyzerSpecific!.ogTags.has('property:og:type')).toBe(true);
      expect(result.analyzerSpecific!.ogTags.has('property:og:site_name')).toBe(true);
      expect(result.analyzerSpecific!.ogTags.has('property:article:author')).toBe(false); // Not detected as OG since it doesn't contain "og:"
      
      // Non-OG tags should not be identified as OG
      expect(result.analyzerSpecific!.ogTags.has('name:description')).toBe(false);
      expect(result.analyzerSpecific!.ogTags.has('name:keywords')).toBe(false);
      expect(result.analyzerSpecific!.ogTags.has('name:generator')).toBe(false);

      // Verify metadata classification
      const ogTitlePattern = result.patterns.get('property:og:title');
      expect(ogTitlePattern!.metadata!.isOgTag).toBe(true);
      expect(ogTitlePattern!.metadata!.isTwitterTag).toBe(false);
      expect(ogTitlePattern!.metadata!.metaType).toBe('property');
    });

    it('should accurately identify Twitter Card tags with complex patterns', async () => {
      const testData = createRealisticMetaTestData([
        { 
          url: 'https://twitter-test1.com', 
          metaTags: new Map([
            ['name:twitter:card', new Set(['summary'])],
            ['name:twitter:site', new Set(['@website'])],
            ['name:twitter:creator', new Set(['@author'])],
            ['name:twitter:title', new Set(['Twitter Title'])],
            ['name:twitter:description', new Set(['Twitter Description'])],
            ['name:twitter:image', new Set(['https://site.com/twitter.jpg'])],
            ['property:og:title', new Set(['OG Title'])], // Not Twitter
            ['name:description', new Set(['Regular description'])] // Not Twitter
          ])
        },
        { 
          url: 'https://twitter-test2.com', 
          metaTags: new Map([
            ['name:twitter:card', new Set(['summary_large_image'])],
            ['name:twitter:image:alt', new Set(['Alt text'])],
            ['name:generator', new Set(['Next.js'])] // Not Twitter
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Validate Twitter tag identification
      expect(result.analyzerSpecific!.twitterTags.has('name:twitter:card')).toBe(true);
      expect(result.analyzerSpecific!.twitterTags.has('name:twitter:site')).toBe(true);
      expect(result.analyzerSpecific!.twitterTags.has('name:twitter:creator')).toBe(true);
      expect(result.analyzerSpecific!.twitterTags.has('name:twitter:title')).toBe(true);
      expect(result.analyzerSpecific!.twitterTags.has('name:twitter:description')).toBe(true);
      expect(result.analyzerSpecific!.twitterTags.has('name:twitter:image')).toBe(true);
      expect(result.analyzerSpecific!.twitterTags.has('name:twitter:image:alt')).toBe(true);
      
      // Non-Twitter tags should not be identified as Twitter
      expect(result.analyzerSpecific!.twitterTags.has('property:og:title')).toBe(false);
      expect(result.analyzerSpecific!.twitterTags.has('name:description')).toBe(false);
      expect(result.analyzerSpecific!.twitterTags.has('name:generator')).toBe(false);

      // Verify metadata classification
      const twitterCardPattern = result.patterns.get('name:twitter:card');
      expect(twitterCardPattern!.metadata!.isTwitterTag).toBe(true);
      expect(twitterCardPattern!.metadata!.isOgTag).toBe(false);
      expect(twitterCardPattern!.metadata!.metaType).toBe('name');
    });

    it('should correctly classify meta tag types (name, property, http-equiv)', async () => {
      const testData = createRealisticMetaTestData([
        { 
          url: 'https://meta-types-test.com', 
          metaTags: new Map([
            ['name:description', new Set(['Name type'])],
            ['name:keywords', new Set(['keyword1', 'keyword2'])],
            ['property:og:title', new Set(['Property type'])],
            ['property:og:type', new Set(['website'])],
            ['http-equiv:refresh', new Set(['30;url=https://example.com'])],
            ['http-equiv:content-type', new Set(['text/html; charset=utf-8'])],
            ['unknown:custom', new Set(['Unknown type'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Validate meta type classification
      expect(result.patterns.get('name:description')!.metadata!.metaType).toBe('name');
      expect(result.patterns.get('name:keywords')!.metadata!.metaType).toBe('name');
      expect(result.patterns.get('property:og:title')!.metadata!.metaType).toBe('property');
      expect(result.patterns.get('property:og:type')!.metadata!.metaType).toBe('property');
      expect(result.patterns.get('http-equiv:refresh')!.metadata!.metaType).toBe('http-equiv');
      expect(result.patterns.get('http-equiv:content-type')!.metadata!.metaType).toBe('http-equiv');
      expect(result.patterns.get('unknown:custom')!.metadata!.metaType).toBe('unknown');
    });
  });

  describe('Frequency Calculation Precision', () => {
    it('should calculate frequencies with mathematical precision', async () => {
      // Create data with known frequency distributions
      const testData = createRealisticMetaTestData([
        { url: 'https://site1.com', metaTags: new Map([['name:generator', new Set(['WordPress'])]]) },
        { url: 'https://site2.com', metaTags: new Map([['name:generator', new Set(['WordPress'])]]) },
        { url: 'https://site3.com', metaTags: new Map([['name:generator', new Set(['Drupal'])]]) },
        { url: 'https://site4.com', metaTags: new Map([['property:og:type', new Set(['website'])]]) },
        { url: 'https://site5.com', metaTags: new Map([['property:og:type', new Set(['article'])]]) },
        { url: 'https://site6.com', metaTags: new Map([['name:description', new Set(['Site 6'])]]) },
        { url: 'https://site7.com', metaTags: new Map([['name:description', new Set(['Site 7'])]]) }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Verify exact frequency calculations
      const generatorPattern = result.patterns.get('name:generator');
      expect(generatorPattern!.siteCount).toBe(3);
      expect(generatorPattern!.frequency).toBeCloseTo(3/7, 10); // Precise to 10 decimal places

      const ogTypePattern = result.patterns.get('property:og:type');
      expect(ogTypePattern!.siteCount).toBe(2);
      expect(ogTypePattern!.frequency).toBeCloseTo(2/7, 10);

      const descriptionPattern = result.patterns.get('name:description');
      expect(descriptionPattern!.siteCount).toBe(2);
      expect(descriptionPattern!.frequency).toBeCloseTo(2/7, 10);

      // Verify consistency: frequency = siteCount / totalSites
      for (const [_, pattern] of result.patterns) {
        expect(pattern.frequency).toBeCloseTo(pattern.siteCount / result.totalSites, 10);
      }
    });

    it('should handle edge case frequencies correctly', async () => {
      // Test 0%, 100%, and fractional percentages
      const testData = createRealisticMetaTestData([
        { url: 'https://universal1.com', metaTags: new Map([['name:generator', new Set(['Universal CMS'])]]) },
        { url: 'https://universal2.com', metaTags: new Map([['name:generator', new Set(['Universal CMS'])]]) },
        { url: 'https://universal3.com', metaTags: new Map([['name:generator', new Set(['Universal CMS'])]]) }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // 100% frequency case
      const universalPattern = result.patterns.get('name:generator');
      expect(universalPattern!.frequency).toBe(1.0); // Exactly 100%
      expect(universalPattern!.siteCount).toBe(3);
      
      // Verify no patterns have invalid frequencies
      for (const [_, pattern] of result.patterns) {
        expect(pattern.frequency).toBeGreaterThanOrEqual(0);
        expect(pattern.frequency).toBeLessThanOrEqual(1);
        expect(Number.isFinite(pattern.frequency)).toBe(true);
        expect(Number.isNaN(pattern.frequency)).toBe(false);
      }
    });

    it('should handle empty dataset gracefully', async () => {
      const emptyData = createRealisticMetaTestData([]);
      
      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(emptyData, options);

      expect(result.totalSites).toBe(0);
      expect(result.patterns.size).toBe(0);
      expect(result.metadata.totalPatternsFound).toBe(0);
      expect(result.metadata.totalPatternsAfterFiltering).toBe(0);
    });
  });

  describe('Semantic Filtering Precision', () => {
    it('should apply semantic filtering with case-insensitive matching', async () => {
      const testData = createRealisticMetaTestData([
        {
          url: 'https://semantic-test.com',
          metaTags: new Map([
            // Headers that should be filtered (in SKIP_META_TAGS)
            ['name:viewport', new Set(['width=device-width, initial-scale=1'])],
            ['name:VIEWPORT', new Set(['width=device-width, initial-scale=1'])], // Uppercase
            ['property:charset', new Set(['utf-8'])],
            ['http-equiv:content-type', new Set(['text/html; charset=utf-8'])],
            ['name:robots', new Set(['index, follow'])],
            ['name:googlebot', new Set(['index, follow'])],
            
            // Meta tags that should remain
            ['name:generator', new Set(['WordPress'])],
            ['property:og:title', new Set(['Page Title'])],
            ['name:custom-meta', new Set(['custom-value'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        semanticFiltering: true // Enable semantic filtering
      };

      const result = await analyzer.analyze(testData, options);

      // Filtered meta tags should not appear
      expect(result.patterns.has('name:viewport')).toBe(false);
      expect(result.patterns.has('name:VIEWPORT')).toBe(false);
      expect(result.patterns.has('property:charset')).toBe(false);
      expect(result.patterns.has('http-equiv:content-type')).toBe(false);
      expect(result.patterns.has('name:robots')).toBe(false);
      expect(result.patterns.has('name:googlebot')).toBe(false);
      
      // Informative meta tags should remain
      expect(result.patterns.has('name:generator')).toBe(true);
      expect(result.patterns.has('property:og:title')).toBe(true);
      expect(result.patterns.has('name:custom-meta')).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed meta tag data gracefully', async () => {
      const malformedData: PreprocessedData = {
        sites: new Map([
          ['malformed-site.com', {
            url: 'https://malformed-site.com',
            normalizedUrl: 'malformed-site.com',
            cms: null,
            confidence: 0,
            headers: new Map(),
            metaTags: new Map(), // Empty meta tags
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          }],
          ['normal-site.com', {
            url: 'https://normal-site.com',
            normalizedUrl: 'normal-site.com',
            cms: null,
            confidence: 0,
            headers: new Map(),
            metaTags: new Map([['name:generator', new Set(['WordPress'])]]),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          }]
        ]),
        totalSites: 2,
        metadata: {
          version: '1.0.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(malformedData, options);

      // Should process without throwing errors
      expect(result.totalSites).toBe(2);
      
      // Should find the one meta tag that exists
      const generatorMeta = result.patterns.get('name:generator');
      expect(generatorMeta).toBeDefined();
      expect(generatorMeta!.siteCount).toBe(1);
      expect(generatorMeta!.frequency).toBe(0.5); // 1/2 = 50%
    });

    it('should handle undefined meta tag values gracefully', async () => {
      const testData: PreprocessedData = {
        sites: new Map([
          ['test-site.com', {
            url: 'https://test-site.com',
            normalizedUrl: 'test-site.com',
            cms: null,
            confidence: 0,
            headers: new Map(),
            metaTags: new Map([
              ['name:generator', new Set(['WordPress'])],
              ['name:empty', new Set()] // Empty value set
            ]),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          }]
        ]),
        totalSites: 1,
        metadata: {
          version: '1.0.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Should handle empty value sets without errors
      expect(result.patterns.has('name:generator')).toBe(true);
      expect(result.patterns.has('name:empty')).toBe(true); // Meta tag exists even with empty values
      
      const emptyPattern = result.patterns.get('name:empty');
      expect(emptyPattern!.siteCount).toBe(1);
      expect(emptyPattern!.examples!.size).toBe(0); // No examples for empty values
    });
  });
});

/**
 * Helper function to create realistic meta tag test data
 * Replaces synthetic Array.from() fixtures with structured, realistic data
 */
function createRealisticMetaTestData(sites: Array<{
  url: string;
  metaTags: Map<string, Set<string>>;
}>): PreprocessedData {
  const siteMap = new Map();
  
  sites.forEach(site => {
    const normalizedUrl = site.url.replace(/^https?:\/\//, '');
    siteMap.set(normalizedUrl, {
      url: site.url,
      normalizedUrl,
      cms: null,
      confidence: 0.0,
      headers: new Map(),
      metaTags: site.metaTags,
      scripts: new Set(),
      technologies: new Set(),
      capturedAt: new Date().toISOString()
    });
  });

  return {
    sites: siteMap,
    totalSites: sites.length,
    metadata: {
      version: '1.0.0',
      preprocessedAt: new Date().toISOString()
    }
  };
}