/**
 * Tests for MetaAnalyzerV2 - Verifying single filtering and unique site counting
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
});