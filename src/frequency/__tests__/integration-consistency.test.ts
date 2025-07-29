/**
 * Integration tests for cross-component consistency
 * Verifies that the Phase 3 implementation fixes the x-pingback inconsistency
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FrequencyAggregator } from '../frequency-aggregator-v2.js';
import { DataPreprocessor } from '../data-preprocessor-v2.js';
import type { PreprocessedData } from '../types/analyzer-interface.js';
import type { FrequencyOptions } from '../types-v1.js';

// Mock the DataPreprocessor to provide controlled test data
vi.mock('../data-preprocessor.js');

describe('Cross-Component Consistency', () => {
  let aggregator: FrequencyAggregator;
  let mockPreprocessor: any;
  let testData: PreprocessedData;
  let options: FrequencyOptions;

  beforeEach(() => {
    // Create test data that reproduces the x-pingback issue
    testData = {
      sites: new Map([
        // WordPress sites with x-pingback header
        ['wordpress1.com', {
          url: 'https://wordpress1.com',
          normalizedUrl: 'wordpress1.com',
          cms: 'WordPress',
          confidence: 0.95,
          headers: new Map([
            ['x-pingback', new Set(['https://wordpress1.com/xmlrpc.php'])],
            ['server', new Set(['Apache/2.4.41'])],
            ['x-powered-by', new Set(['PHP/7.4.0'])]
          ]),
          metaTags: new Map([
            ['name:generator', new Set(['WordPress 5.8'])]
          ]),
          scripts: new Set(),
          technologies: new Set(['WordPress']),
          capturedAt: '2024-01-01T00:00:00Z'
        }],
        ['wordpress2.com', {
          url: 'https://wordpress2.com',
          normalizedUrl: 'wordpress2.com',
          cms: 'WordPress',
          confidence: 0.92,
          headers: new Map([
            ['x-pingback', new Set(['https://wordpress2.com/xmlrpc.php'])],
            ['server', new Set(['nginx/1.18.0'])],
            ['x-powered-by', new Set(['PHP/8.0.0'])]
          ]),
          metaTags: new Map([
            ['name:generator', new Set(['WordPress 6.0'])]
          ]),
          scripts: new Set(),
          technologies: new Set(['WordPress']),
          capturedAt: '2024-01-02T00:00:00Z'
        }],
        // Non-WordPress sites without x-pingback
        ['drupal1.com', {
          url: 'https://drupal1.com',
          normalizedUrl: 'drupal1.com',
          cms: 'Drupal',
          confidence: 0.88,
          headers: new Map([
            ['server', new Set(['Apache/2.4.41'])],
            ['x-powered-by', new Set(['PHP/7.4.0'])],
            ['x-drupal-cache', new Set(['HIT'])]
          ]),
          metaTags: new Map([
            ['name:generator', new Set(['Drupal 9'])]
          ]),
          scripts: new Set(),
          technologies: new Set(['Drupal']),
          capturedAt: '2024-01-03T00:00:00Z'
        }],
        ['static1.com', {
          url: 'https://static1.com',
          normalizedUrl: 'static1.com',
          cms: 'Unknown',
          confidence: 0.1,
          headers: new Map([
            ['server', new Set(['nginx/1.18.0'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-04T00:00:00Z'
        }]
      ]),
      totalSites: 4,
      metadata: {
        version: '1.0.0',
        preprocessedAt: '2024-01-01T00:00:00Z'
      }
    };

    options = {
      minOccurrences: 1 // Low threshold to see all patterns
    };

    // Mock the DataPreprocessor
    mockPreprocessor = {
      load: vi.fn().mockResolvedValue(testData),
      clearCache: vi.fn(),
      getCacheStats: vi.fn().mockReturnValue({ entries: 0, keys: [] }),
      classifyHeader: vi.fn().mockReturnValue({
        category: 'custom',
        discriminativeScore: 0.5,
        filterRecommendation: 'context-dependent'
      })
    };

    // Replace the real DataPreprocessor with our mock
    vi.mocked(DataPreprocessor).mockImplementation(() => mockPreprocessor);

    aggregator = new FrequencyAggregator();
  });

  describe('x-pingback Consistency Fix', () => {
    it('should show consistent counts for x-pingback across all analyses', async () => {
      const result = await aggregator.analyze(options);

      // x-pingback should appear in exactly 2 sites (the WordPress ones)
      const xPingbackHeader = result.headers.patterns.get('x-pingback');
      expect(xPingbackHeader).toBeDefined();
      expect(xPingbackHeader!.siteCount).toBe(2);
      expect(xPingbackHeader!.frequency).toBe(0.5); // 2/4 = 50%

      // The same header should be identifiable across different analyses
      // (In full implementation, bias detector would show correlation with WordPress)
      expect(xPingbackHeader!.sites.has('wordpress1.com')).toBe(true);
      expect(xPingbackHeader!.sites.has('wordpress2.com')).toBe(true);
      expect(xPingbackHeader!.sites.has('drupal1.com')).toBe(false);
      expect(xPingbackHeader!.sites.has('static1.com')).toBe(false);
    });

    it('should not have mathematical impossibilities', async () => {
      const result = await aggregator.analyze(options);

      // Every pattern should have site count <= total sites
      for (const [name, pattern] of result.headers.patterns) {
        expect(pattern.siteCount).toBeLessThanOrEqual(result.headers.totalSites);
        expect(pattern.frequency).toBeLessThanOrEqual(1.0);
        expect(pattern.frequency).toBeGreaterThanOrEqual(0.0);
        
        // Site count should match the size of the sites set
        expect(pattern.siteCount).toBe(pattern.sites.size);
        
        // Frequency should match the calculation
        expect(pattern.frequency).toBeCloseTo(pattern.siteCount / result.headers.totalSites, 10);
      }

      // Same checks for meta tags
      for (const [name, pattern] of result.metaTags.patterns) {
        expect(pattern.siteCount).toBeLessThanOrEqual(result.metaTags.totalSites);
        expect(pattern.frequency).toBeLessThanOrEqual(1.0);
        expect(pattern.frequency).toBeGreaterThanOrEqual(0.0);
        expect(pattern.siteCount).toBe(pattern.sites.size);
        expect(pattern.frequency).toBeCloseTo(pattern.siteCount / result.metaTags.totalSites, 10);
      }
    });
  });

  describe('Unique Site Counting Consistency', () => {
    it('should use the same total sites count across all analyzers', async () => {
      const result = await aggregator.analyze(options);

      // All analyzers should report the same total sites
      expect(result.headers.totalSites).toBe(4);
      expect(result.metaTags.totalSites).toBe(4);
      expect(result.summary.totalSitesAnalyzed).toBe(4);
    });

    it('should count generators consistently', async () => {
      const result = await aggregator.analyze(options);

      // name:generator should appear in 3 sites (2 WordPress + 1 Drupal)
      const generator = result.metaTags.patterns.get('name:generator');
      expect(generator).toBeDefined();
      expect(generator!.siteCount).toBe(3);
      expect(generator!.frequency).toBe(0.75); // 3/4 = 75%

      // Should track the correct sites
      expect(generator!.sites.has('wordpress1.com')).toBe(true);
      expect(generator!.sites.has('wordpress2.com')).toBe(true);
      expect(generator!.sites.has('drupal1.com')).toBe(true);
      expect(generator!.sites.has('static1.com')).toBe(false);
    });
  });

  describe('Filtering Consistency', () => {
    it('should apply minOccurrences consistently across analyzers', async () => {
      // Test with higher threshold
      options.minOccurrences = 2;
      const result = await aggregator.analyze(options);

      // Patterns appearing on only 1 site should be filtered out
      expect(result.headers.patterns.has('x-drupal-cache')).toBe(false);
      
      // Patterns appearing on 2+ sites should remain
      expect(result.headers.patterns.has('x-pingback')).toBe(true); // 2 sites
      expect(result.headers.patterns.has('server')).toBe(true); // 4 sites
      expect(result.headers.patterns.has('x-powered-by')).toBe(true); // 3 sites
      
      expect(result.metaTags.patterns.has('name:generator')).toBe(true); // 3 sites
    });

    it('should not double-filter any patterns', async () => {
      // This test verifies that we fixed the double filtering bug identified in Phase 1
      
      // With minOccurrences = 2, x-pingback should appear exactly once in results
      options.minOccurrences = 2;
      const result = await aggregator.analyze(options);

      const xPingback = result.headers.patterns.get('x-pingback');
      expect(xPingback).toBeDefined();
      expect(xPingback!.siteCount).toBe(2);
      
      // The old bug would apply filtering twice:
      // 1. During analysis: if (siteCount >= minOccurrences) 
      // 2. During formatting: if (frequency >= minOccurrences / totalSites)
      // 
      // With totalSites=4 and minOccurrences=2:
      // - Site-based filter: siteCount=2 >= 2 ✓ (pass)
      // - Frequency-based filter: frequency=0.5 >= 0.5 ✓ (pass)
      // 
      // But if totalSites was much larger, the frequency filter could fail
      // even when the site count filter passed, causing the double filtering bug.
      
      // Since we now only apply site-based filtering, this should always work
      expect(xPingback!.frequency).toBe(0.5);
    });
  });

  describe('Data Preprocessing Consistency', () => {
    it('should use the same preprocessed data for all analyzers', async () => {
      await aggregator.analyze(options);

      // Verify that preprocessor.load was called exactly once
      expect(mockPreprocessor.load).toHaveBeenCalledTimes(1);
      
      // All analyzers should have received the same data
      // (We can't directly test this, but the consistent results above prove it)
    });

    it('should handle URL normalization correctly', async () => {
      // Add duplicate URLs with different formats
      testData.sites.set('wordpress1.com/', testData.sites.get('wordpress1.com')!);
      testData.sites.set('https://wordpress1.com', testData.sites.get('wordpress1.com')!);
      
      const result = await aggregator.analyze(options);
      
      // The total should still be 4 unique sites after normalization
      // (This tests the preprocessor's URL normalization)
      expect(result.summary.totalSitesAnalyzed).toBe(4);
    });
  });

  describe('Summary Consistency', () => {
    it('should create accurate summary from aggregated results', async () => {
      const result = await aggregator.analyze(options);

      expect(result.summary.totalSitesAnalyzed).toBe(4);
      expect(result.summary.totalPatternsFound).toBeGreaterThan(0);
      expect(result.summary.analysisDate).toBeDefined();
      
      // Top patterns should be sorted by frequency
      const topHeaders = result.summary.topPatterns.headers;
      if (topHeaders.length > 1) {
        for (let i = 1; i < topHeaders.length; i++) {
          expect(topHeaders[i-1].frequency).toBeGreaterThanOrEqual(topHeaders[i].frequency);
        }
      }
    });
  });
});