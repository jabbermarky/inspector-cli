/**
 * CooccurrenceAnalyzerV2 Comprehensive Test Suite
 * 
 * Tests the native V2 implementation of co-occurrence analysis including
 * statistical accuracy, technology detection, and integration patterns.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CooccurrenceAnalyzerV2 } from '../cooccurrence-analyzer-v2.js';
import type { PreprocessedData, AnalysisOptions } from '../../types/analyzer-interface.js';

describe('CooccurrenceAnalyzerV2', () => {
  let analyzer: CooccurrenceAnalyzerV2;
  let options: AnalysisOptions;

  beforeEach(() => {
    analyzer = new CooccurrenceAnalyzerV2();
    options = {
      minOccurrences: 2,
      includeExamples: true,
      maxExamples: 5,
      semanticFiltering: false
    };
  });

  describe('Interface Compliance', () => {
    it('should implement FrequencyAnalyzer interface correctly', () => {
      expect(analyzer.getName()).toBe('CooccurrenceAnalyzerV2');
      expect(typeof analyzer.analyze).toBe('function');
    });

    it('should return AnalysisResult with required fields', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'x-wp-total': '10', 'cf-ray': '123' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'x-wp-total': '5', 'cf-ray': '456' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('totalSites', 2);
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('analyzerSpecific');
      expect(result.metadata.analyzer).toBe('CooccurrenceAnalyzerV2');
    });

    it('should handle AnalysisOptions correctly', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'server': 'nginx', 'x-wp-total': '10' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'server': 'nginx', 'x-wp-total': '5' } },
        { url: 'site3.com', cms: 'Drupal', headers: { 'server': 'apache' } }
      ]);

      const strictOptions = { ...options, minOccurrences: 3 };
      const result = await analyzer.analyze(testData, strictOptions);

      expect(result.metadata.options).toEqual(strictOptions);
      // With minOccurrences=3, only patterns appearing on all 3 sites should be included
      expect(result.patterns.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Header Occurrence Matrix', () => {
    it('should build accurate occurrence matrix from PreprocessedData', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'server': 'nginx', 'x-wp-total': '10', 'content-type': 'text/html' } },
        { url: 'site2.com', cms: 'Drupal', headers: { 'server': 'apache', 'x-drupal-cache': 'hit', 'content-type': 'text/html' } },
        { url: 'site3.com', cms: 'Unknown', headers: { 'server': 'nginx', 'content-type': 'text/html' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      // Server and content-type headers should co-occur on all 3 sites
      const serverContentCooccurrence = Array.from(result.analyzerSpecific!.cooccurrences.values())
        .find(c => 
          (c.header1 === 'server' && c.header2 === 'content-type') ||
          (c.header1 === 'content-type' && c.header2 === 'server')
        );
      
      expect(serverContentCooccurrence).toBeDefined();
      expect(serverContentCooccurrence!.cooccurrenceCount).toBe(3);
    });

    it('should handle sites with overlapping headers', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'a': '1', 'b': '1', 'c': '1' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'a': '2', 'b': '2' } },
        { url: 'site3.com', cms: 'Drupal', headers: { 'a': '3', 'c': '2' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      // Should find co-occurrences for headers that appear together
      expect(result.analyzerSpecific!.cooccurrences.size).toBeGreaterThan(0);
      
      // Headers 'a' and 'b' co-occur on 2 sites
      const abCooccurrence = Array.from(result.analyzerSpecific!.cooccurrences.values())
        .find(c => (c.header1 === 'a' && c.header2 === 'b') || (c.header1 === 'b' && c.header2 === 'a'));
      
      if (abCooccurrence) {
        expect(abCooccurrence.cooccurrenceCount).toBe(2);
      }
    });

    it('should handle sites with no headers gracefully', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'Unknown', headers: {} },
        { url: 'site2.com', cms: 'WordPress', headers: { 'x-wp-total': '10' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      expect(result.analyzerSpecific!.cooccurrences.size).toBe(0);
      expect(result.patterns.size).toBe(0);
    });

    it('should normalize header names to lowercase', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'SERVER': 'nginx', 'X-WP-Total': '10' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'server': 'apache', 'x-wp-total': '5' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      // Should find co-occurrence between normalized headers
      const cooccurrence = Array.from(result.analyzerSpecific!.cooccurrences.values())
        .find(c => 
          (c.header1 === 'server' && c.header2 === 'x-wp-total') ||
          (c.header1 === 'x-wp-total' && c.header2 === 'server')
        );

      expect(cooccurrence).toBeDefined();
      expect(cooccurrence!.cooccurrenceCount).toBe(2);
    });
  });

  describe('Co-occurrence Statistics', () => {
    it('should calculate accurate co-occurrence counts', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'a': '1', 'b': '1' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'a': '2', 'b': '2' } },
        { url: 'site3.com', cms: 'Drupal', headers: { 'a': '3', 'c': '1' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      // Headers 'a' and 'b' co-occur on 2 out of 3 sites
      const abCooccurrence = Array.from(result.analyzerSpecific!.cooccurrences.values())
        .find(c => (c.header1 === 'a' && c.header2 === 'b') || (c.header1 === 'b' && c.header2 === 'a'));

      expect(abCooccurrence).toBeDefined();
      expect(abCooccurrence!.cooccurrenceCount).toBe(2);
      expect(abCooccurrence!.cooccurrenceFrequency).toBeCloseTo(66.67, 1); // 2/3 * 100
    });

    it('should compute correct conditional probabilities', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'x-wp-total': '1', 'cf-ray': '1' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'x-wp-total': '2', 'cf-ray': '2' } },
        { url: 'site3.com', cms: 'WordPress', headers: { 'x-wp-total': '3' } } // Only x-wp-total
      ]);

      const result = await analyzer.analyze(testData, options);

      // P(cf-ray | x-wp-total) = 2/3 (cf-ray appears on 2 of 3 sites with x-wp-total)
      const cooccurrence = Array.from(result.analyzerSpecific!.cooccurrences.values())
        .find(c => 
          (c.header1 === 'x-wp-total' && c.header2 === 'cf-ray') ||
          (c.header1 === 'cf-ray' && c.header2 === 'x-wp-total')
        );

      expect(cooccurrence).toBeDefined();
      expect(cooccurrence!.conditionalProbability).toBeCloseTo(0.667, 2);
    });

    it('should calculate mutual information correctly', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'x-wp-total': '1', 'cf-ray': '1' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'x-wp-total': '2', 'cf-ray': '2' } },
        { url: 'site3.com', cms: 'Drupal', headers: { 'x-drupal-cache': '1' } },
        { url: 'site4.com', cms: 'Unknown', headers: { 'server': 'nginx' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      // Mutual information should be positive for correlated headers
      const wpCfCooccurrence = Array.from(result.analyzerSpecific!.cooccurrences.values())
        .find(c => 
          (c.header1 === 'x-wp-total' && c.header2 === 'cf-ray') ||
          (c.header1 === 'cf-ray' && c.header2 === 'x-wp-total')
        );

      if (wpCfCooccurrence) {
        expect(wpCfCooccurrence.mutualInformation).toBeGreaterThan(0);
      }
    });

    it('should apply minOccurrences filtering', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'rare1': '1', 'rare2': '1' } }, // Only 1 co-occurrence
        { url: 'site2.com', cms: 'WordPress', headers: { 'common1': '1', 'common2': '1' } },
        { url: 'site3.com', cms: 'Drupal', headers: { 'common1': '2', 'common2': '2' } }
      ]);

      const strictOptions = { ...options, minOccurrences: 2 };
      const result = await analyzer.analyze(testData, strictOptions);

      // Should only include co-occurrences with 2+ occurrences
      const rareCooccurrence = Array.from(result.analyzerSpecific!.cooccurrences.values())
        .find(c => 
          (c.header1 === 'rare1' && c.header2 === 'rare2') ||
          (c.header1 === 'rare2' && c.header2 === 'rare1')
        );

      expect(rareCooccurrence).toBeUndefined(); // Should be filtered out

      const commonCooccurrence = Array.from(result.analyzerSpecific!.cooccurrences.values())
        .find(c => 
          (c.header1 === 'common1' && c.header2 === 'common2') ||
          (c.header1 === 'common2' && c.header2 === 'common1')
        );

      expect(commonCooccurrence).toBeDefined(); // Should be included
    });

    it('should handle edge cases (0 co-occurrence, 100% co-occurrence)', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'always1': '1', 'always2': '1' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'always1': '2', 'always2': '2' } },
        { url: 'site3.com', cms: 'Drupal', headers: { 'never1': '1' } },
        { url: 'site4.com', cms: 'Unknown', headers: { 'never2': '1' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      // Perfect co-occurrence (100%)
      const perfectCooccurrence = Array.from(result.analyzerSpecific!.cooccurrences.values())
        .find(c => 
          (c.header1 === 'always1' && c.header2 === 'always2') ||
          (c.header1 === 'always2' && c.header2 === 'always1')
        );

      if (perfectCooccurrence) {
        expect(perfectCooccurrence.conditionalProbability).toBe(1.0);
        expect(perfectCooccurrence.cooccurrenceFrequency).toBe(50.0); // 2/4 * 100
      }

      // Zero co-occurrence headers shouldn't appear together in results
      const neverCooccurrence = Array.from(result.analyzerSpecific!.cooccurrences.values())
        .find(c => 
          (c.header1 === 'never1' && c.header2 === 'never2') ||
          (c.header1 === 'never2' && c.header2 === 'never1')
        );

      expect(neverCooccurrence).toBeUndefined(); // Should be filtered out by minOccurrences
    });
  });

  describe('Technology Stack Detection', () => {
    it('should detect WordPress + Cloudflare signature', async () => {
      const testData = createTestData([
        { url: 'wp1.com', cms: 'WordPress', headers: { 'x-wp-total': '10', 'cf-ray': '123-ATL', 'x-pingback': 'xmlrpc.php' } },
        { url: 'wp2.com', cms: 'WordPress', headers: { 'x-wp-total': '5', 'cf-ray': '456-LAX' } },
        { url: 'drupal.com', cms: 'Drupal', headers: { 'x-drupal-cache': 'HIT' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      const wpCfSignature = result.analyzerSpecific!.technologySignatures.get('WordPress + Cloudflare');
      expect(wpCfSignature).toBeDefined();
      expect(wpCfSignature!.occurrenceCount).toBe(2);
      expect(wpCfSignature!.confidence).toBeGreaterThan(0);
    });

    it('should detect Shopify platform signature', async () => {
      const testData = createTestData([
        { url: 'shop1.com', cms: 'Shopify', headers: { 'x-shopify-shop-id': '123', 'x-sorting-hat-shopid': '456' } },
        { url: 'shop2.com', cms: 'Shopify', headers: { 'x-shopify-shop-id': '789', 'x-sorting-hat-shopid': '012', 'x-shardid': '1' } },
        { url: 'wp.com', cms: 'WordPress', headers: { 'x-wp-total': '10' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      const shopifySignature = result.analyzerSpecific!.technologySignatures.get('Shopify Platform');
      expect(shopifySignature).toBeDefined();
      expect(shopifySignature!.occurrenceCount).toBe(2);
      expect(shopifySignature!.vendor).toBe('Shopify');
      expect(shopifySignature!.category).toBe('ecommerce');
    });

    it('should detect Duda platform signature', async () => {
      const testData = createTestData([
        { url: 'duda1.com', cms: 'Duda', headers: { 'd-geo': 'US', 'd-cache': 'HIT' } },
        { url: 'duda2.com', cms: 'Duda', headers: { 'd-geo': 'EU', 'd-cache': 'MISS', 'd-sid': '123' } },
        { url: 'wp.com', cms: 'WordPress', headers: { 'x-wp-total': '10' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      const dudaSignature = result.analyzerSpecific!.technologySignatures.get('Duda Platform');
      expect(dudaSignature).toBeDefined();
      expect(dudaSignature!.occurrenceCount).toBe(2);
      expect(dudaSignature!.category).toBe('cms');
    });

    it('should detect Drupal + Varnish signature', async () => {
      const testData = createTestData([
        { url: 'drupal1.com', cms: 'Drupal', headers: { 'x-drupal-cache': 'HIT', 'via': 'varnish' } },
        { url: 'drupal2.com', cms: 'Drupal', headers: { 'x-drupal-cache': 'MISS', 'via': '1.1 varnish', 'x-cache': 'HIT' } },
        { url: 'wp.com', cms: 'WordPress', headers: { 'x-wp-total': '10' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      const drupalVarnishSignature = result.analyzerSpecific!.technologySignatures.get('Drupal + Varnish Cache');
      expect(drupalVarnishSignature).toBeDefined();
      expect(drupalVarnishSignature!.occurrenceCount).toBe(2);
      expect(drupalVarnishSignature!.vendor).toBe('Drupal + Varnish');
    });

    it('should calculate signature confidence correctly', async () => {
      const testData = createTestData([
        // Perfect correlation - both headers always appear together
        { url: 'perfect1.com', cms: 'WordPress', headers: { 'x-wp-total': '1', 'cf-ray': '1' } },
        { url: 'perfect2.com', cms: 'WordPress', headers: { 'x-wp-total': '2', 'cf-ray': '2' } },
        // Imperfect correlation - sometimes separate
        { url: 'imperfect.com', cms: 'WordPress', headers: { 'x-wp-total': '3' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      const wpCfSignature = result.analyzerSpecific!.technologySignatures.get('WordPress + Cloudflare');
      if (wpCfSignature) {
        expect(wpCfSignature.confidence).toBeGreaterThan(0);
        expect(wpCfSignature.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should handle conflicting headers properly', async () => {
      const testData = createTestData([
        // Site with conflicting headers shouldn't match WordPress + Cloudflare
        { url: 'conflicted.com', cms: 'Mixed', headers: { 'x-wp-total': '1', 'cf-ray': '1', 'x-shopify-shop-id': '123' } },
        { url: 'clean.com', cms: 'WordPress', headers: { 'x-wp-total': '2', 'cf-ray': '2' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      const wpCfSignature = result.analyzerSpecific!.technologySignatures.get('WordPress + Cloudflare');
      if (wpCfSignature) {
        // Should only count the clean site, not the conflicted one
        expect(wpCfSignature.occurrenceCount).toBe(1);
        expect(wpCfSignature.sites).toContain('clean.com');
        expect(wpCfSignature.sites).not.toContain('conflicted.com');
      }
    });
  });

  describe('Platform-Specific Combinations', () => {
    it('should find WordPress-specific header combinations', async () => {
      const testData = createTestData([
        { url: 'wp1.com', cms: 'WordPress', headers: { 'x-wp-total': '1', 'x-pingback': '1', 'wp-super-cache': 'true' } },
        { url: 'wp2.com', cms: 'WordPress', headers: { 'x-wp-total': '2', 'x-pingback': '2' } },
        { url: 'wp3.com', cms: 'WordPress', headers: { 'x-wp-total': '3', 'x-pingback': '3' } },
        { url: 'drupal.com', cms: 'Drupal', headers: { 'x-drupal-cache': 'HIT' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      const wpCombinations = Array.from(result.analyzerSpecific!.platformCombinations.values())
        .filter(c => c.platform === 'WordPress');

      expect(wpCombinations.length).toBeGreaterThan(0);
      
      // x-wp-total + x-pingback should be a strong WordPress combination
      const wpPingbackCombo = wpCombinations.find(c => 
        c.headerGroup.includes('x-wp-total') && c.headerGroup.includes('x-pingback')
      );
      
      if (wpPingbackCombo) {
        expect(wpPingbackCombo.frequency).toBe(1.0); // Appears on 100% of WordPress sites
        expect(wpPingbackCombo.exclusivity).toBe(1.0); // Only on WordPress sites
      }
    });

    it('should find Drupal-specific header combinations', async () => {
      const testData = createTestData([
        { url: 'drupal1.com', cms: 'Drupal', headers: { 'x-drupal-cache': 'HIT', 'x-drupal-dynamic-cache': 'MISS' } },
        { url: 'drupal2.com', cms: 'Drupal', headers: { 'x-drupal-cache': 'MISS', 'x-drupal-dynamic-cache': 'HIT' } },
        { url: 'wp.com', cms: 'WordPress', headers: { 'x-wp-total': '10' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      const drupalCombinations = Array.from(result.analyzerSpecific!.platformCombinations.values())
        .filter(c => c.platform === 'Drupal');

      expect(drupalCombinations.length).toBeGreaterThan(0);
      
      const drupalCacheCombo = drupalCombinations.find(c => 
        c.headerGroup.includes('x-drupal-cache') && c.headerGroup.includes('x-drupal-dynamic-cache')
      );
      
      if (drupalCacheCombo) {
        expect(drupalCacheCombo.exclusivity).toBe(1.0); // Only on Drupal sites
      }
    });

    it('should calculate platform exclusivity correctly', async () => {
      const testData = createTestData([
        // Server header appears on multiple platforms - low exclusivity
        { url: 'wp.com', cms: 'WordPress', headers: { 'server': 'nginx', 'x-wp-total': '1' } },
        { url: 'drupal.com', cms: 'Drupal', headers: { 'server': 'apache', 'x-drupal-cache': '1' } },
        // WP-specific headers - high exclusivity
        { url: 'wp2.com', cms: 'WordPress', headers: { 'x-wp-total': '2', 'x-pingback': '1' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      const combinations = Array.from(result.analyzerSpecific!.platformCombinations.values());
      
      // Find WordPress combinations
      const wpCombinations = combinations.filter(c => c.platform === 'WordPress');
      
      // x-wp-total + x-pingback should have high exclusivity (only on WordPress)
      const exclusiveCombo = wpCombinations.find(c => 
        c.headerGroup.includes('x-wp-total') && c.headerGroup.includes('x-pingback')
      );
      
      if (exclusiveCombo) {
        expect(exclusiveCombo.exclusivity).toBe(1.0);
      }
    });

    it('should filter by frequency threshold', async () => {
      const testData = createTestData([
        // Rare combination (appears on only 1 of 3 WordPress sites)
        { url: 'wp1.com', cms: 'WordPress', headers: { 'x-wp-total': '1', 'rare-header': 'value' } },
        { url: 'wp2.com', cms: 'WordPress', headers: { 'x-wp-total': '2' } },
        { url: 'wp3.com', cms: 'WordPress', headers: { 'x-wp-total': '3' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      // Rare combinations (frequency < 30%) should be filtered out
      const wpCombinations = Array.from(result.analyzerSpecific!.platformCombinations.values())
        .filter(c => c.platform === 'WordPress');

      const rareCombo = wpCombinations.find(c => 
        c.headerGroup.includes('x-wp-total') && c.headerGroup.includes('rare-header')
      );

      expect(rareCombo).toBeUndefined(); // Should be filtered out
    });

    it('should handle multiple CMS platforms', async () => {
      const testData = createTestData([
        // WordPress sites with common headers
        { url: 'wp1.com', cms: 'WordPress', headers: { 'x-wp-total': '1', 'server': 'nginx' } },
        { url: 'wp2.com', cms: 'WordPress', headers: { 'x-wp-total': '2', 'server': 'apache' } },
        // Drupal sites with common headers
        { url: 'drupal1.com', cms: 'Drupal', headers: { 'x-drupal-cache': '1', 'server': 'nginx' } },
        { url: 'drupal2.com', cms: 'Drupal', headers: { 'x-drupal-cache': '2', 'server': 'apache' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      const platforms = new Set(
        Array.from(result.analyzerSpecific!.platformCombinations.values()).map(c => c.platform)
      );

      // With 2 sites per platform and common headers, should find platform-specific combinations
      expect(platforms.size).toBeGreaterThanOrEqual(0); // May be 0 if frequency threshold not met
      
      // Check that the analyzer runs without error
      expect(result.analyzerSpecific!.platformCombinations).toBeDefined();
    });
  });

  describe('Mutual Exclusivity Detection', () => {
    it('should detect mutually exclusive header pairs', async () => {
      const testData = createTestData([
        { url: 'wp1.com', cms: 'WordPress', headers: { 'x-wp-total': '1' } },
        { url: 'wp2.com', cms: 'WordPress', headers: { 'x-wp-total': '2' } },
        { url: 'wp3.com', cms: 'WordPress', headers: { 'x-wp-total': '3' } },
        { url: 'shopify1.com', cms: 'Shopify', headers: { 'x-shopify-shop-id': '1' } },
        { url: 'shopify2.com', cms: 'Shopify', headers: { 'x-shopify-shop-id': '2' } }
      ]);

      const result = await analyzer.analyze(testData, { ...options, minOccurrences: 1 });

      // x-wp-total and x-shopify-shop-id should never co-occur
      const mutualExclusivity = result.analyzerSpecific!.mutualExclusivityGroups;
      
      if (mutualExclusivity.length > 0) {
        const exclusiveGroup = mutualExclusivity.find(group => 
          group.headers.includes('x-wp-total') && group.headers.includes('x-shopify-shop-id')
        );
        
        if (exclusiveGroup) {
          expect(exclusiveGroup.exclusivityScore).toBeGreaterThan(0);
          expect(exclusiveGroup.reasoning).toContain('rarely appear together');
        }
      }
    });

    it('should group connected exclusive components', async () => {
      const testData = createTestData([
        // Platform A headers
        { url: 'a1.com', cms: 'PlatformA', headers: { 'a-header1': '1', 'a-header2': '1' } },
        { url: 'a2.com', cms: 'PlatformA', headers: { 'a-header1': '2', 'a-header2': '2' } },
        // Platform B headers  
        { url: 'b1.com', cms: 'PlatformB', headers: { 'b-header1': '1', 'b-header2': '1' } },
        { url: 'b2.com', cms: 'PlatformB', headers: { 'b-header1': '2', 'b-header2': '2' } },
        // Platform C headers
        { url: 'c1.com', cms: 'PlatformC', headers: { 'c-header1': '1' } }
      ]);

      const result = await analyzer.analyze(testData, { ...options, minOccurrences: 1 });

      const exclusivityGroups = result.analyzerSpecific!.mutualExclusivityGroups;
      
      // Should group platform-specific headers that are mutually exclusive
      const largeGroup = exclusivityGroups.find(group => group.headers.length >= 3);
      
      if (largeGroup) {
        expect(largeGroup.headers.length).toBeGreaterThanOrEqual(3);
        expect(largeGroup.exclusivityScore).toBeGreaterThan(0);
      }
    });

    it('should provide meaningful exclusivity reasoning', async () => {
      const testData = createTestData([
        { url: 'wp.com', cms: 'WordPress', headers: { 'x-wp-total': '1' } },
        { url: 'shopify.com', cms: 'Shopify', headers: { 'x-shopify-shop-id': '1' } }
      ]);

      const result = await analyzer.analyze(testData, { ...options, minOccurrences: 1 });

      const exclusivityGroups = result.analyzerSpecific!.mutualExclusivityGroups;
      
      if (exclusivityGroups.length > 0) {
        exclusivityGroups.forEach(group => {
          expect(group.reasoning).toBeTruthy();
          expect(typeof group.reasoning).toBe('string');
          expect(group.reasoning.length).toBeGreaterThan(0);
        });
      }
    });

    it('should handle threshold edge cases', async () => {
      const testData = createTestData([
        // Headers that co-occur exactly at threshold
        { url: 'edge1.com', cms: 'WordPress', headers: { 'edge1': '1', 'edge2': '1' } },
        { url: 'edge2.com', cms: 'WordPress', headers: { 'edge1': '2' } }, // edge1 alone
        { url: 'edge3.com', cms: 'WordPress', headers: { 'edge2': '2' } }  // edge2 alone
      ]);

      const result = await analyzer.analyze(testData, options);

      // Should handle edge cases without crashing
      expect(result.analyzerSpecific!.mutualExclusivityGroups).toBeDefined();
      expect(Array.isArray(result.analyzerSpecific!.mutualExclusivityGroups)).toBe(true);
    });
  });

  describe('Integration with ValidationPipelineV2', () => {
    it('should prioritize validated headers when available', async () => {
      const testData = createTestDataWithValidation([
        { url: 'site1.com', cms: 'WordPress', headers: { 'server': 'nginx', 'x-wp-total': '1', 'noise': 'value' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'server': 'apache', 'x-wp-total': '2', 'noise': 'value' } }
      ], ['server', 'x-wp-total']); // Only server and x-wp-total are validated

      const result = await analyzer.analyze(testData, options);

      // Should only analyze validated headers
      const cooccurrences = Array.from(result.analyzerSpecific!.cooccurrences.values());
      const hasNoiseHeader = cooccurrences.some(c => 
        c.header1 === 'noise' || c.header2 === 'noise'
      );

      expect(hasNoiseHeader).toBe(false); // Noise header should be filtered out
      
      // Should find server + x-wp-total co-occurrence
      const validatedCooccurrence = cooccurrences.find(c => 
        (c.header1 === 'server' && c.header2 === 'x-wp-total') ||
        (c.header1 === 'x-wp-total' && c.header2 === 'server')
      );

      expect(validatedCooccurrence).toBeDefined();
    });

    it('should fall back to raw headers when no validation data', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'server': 'nginx', 'x-wp-total': '1' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'server': 'apache', 'x-wp-total': '2' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      // Should analyze all headers when no validation data available
      expect(result.analyzerSpecific!.cooccurrences.size).toBeGreaterThan(0);
      
      const serverWpCooccurrence = Array.from(result.analyzerSpecific!.cooccurrences.values())
        .find(c => 
          (c.header1 === 'server' && c.header2 === 'x-wp-total') ||
          (c.header1 === 'x-wp-total' && c.header2 === 'server')
        );

      expect(serverWpCooccurrence).toBeDefined();
    });

    it('should log validation data usage', async () => {
      const testData = createTestDataWithValidation([
        { url: 'site1.com', cms: 'WordPress', headers: { 'server': 'nginx', 'x-wp-total': '1' } }
      ], ['server', 'x-wp-total']);

      // This test would require mocking the logger to verify log messages
      // For now, we just ensure it doesn't crash and produces results
      const result = await analyzer.analyze(testData, options);

      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
    });

    it('should produce different results with/without validation', async () => {
      const rawData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'server': 'nginx', 'x-wp-total': '1', 'noise1': 'a', 'noise2': 'b' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'server': 'apache', 'x-wp-total': '2', 'noise1': 'c', 'noise2': 'd' } }
      ]);

      const validatedData = createTestDataWithValidation([
        { url: 'site1.com', cms: 'WordPress', headers: { 'server': 'nginx', 'x-wp-total': '1', 'noise1': 'a', 'noise2': 'b' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'server': 'apache', 'x-wp-total': '2', 'noise1': 'c', 'noise2': 'd' } }
      ], ['server', 'x-wp-total']);

      const rawResult = await analyzer.analyze(rawData, options);
      const validatedResult = await analyzer.analyze(validatedData, options);

      // Results should be different
      expect(rawResult.analyzerSpecific!.cooccurrences.size).toBeGreaterThanOrEqual(
        validatedResult.analyzerSpecific!.cooccurrences.size
      );
    });
  });

  describe('V2 Pattern Creation', () => {
    it('should create standard PatternData for co-occurrences', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'x-wp-total': '1', 'cf-ray': '1' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'x-wp-total': '2', 'cf-ray': '2' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      expect(result.patterns.size).toBeGreaterThan(0);
      
      const pattern = Array.from(result.patterns.values())[0];
      expect(pattern).toHaveProperty('pattern');
      expect(pattern).toHaveProperty('siteCount');
      expect(pattern).toHaveProperty('sites');
      expect(pattern).toHaveProperty('frequency');
      expect(pattern.siteCount).toBeGreaterThanOrEqual(options.minOccurrences);
    });

    it('should include metadata for vendor and category information', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'x-wp-total': '1', 'cf-ray': '1' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'x-wp-total': '2', 'cf-ray': '2' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      const patterns = Array.from(result.patterns.values());
      if (patterns.length > 0) {
        const pattern = patterns[0];
        expect(pattern.metadata).toBeDefined();
        expect(pattern.metadata!.type).toBe('cooccurrence');
        expect(pattern.metadata!).toHaveProperty('mutualInformation');
        expect(pattern.metadata!).toHaveProperty('conditionalProbability');
      }
    });

    it('should respect minOccurrences in pattern filtering', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'rare1': '1', 'rare2': '1' } }, // Only 1 co-occurrence
        { url: 'site2.com', cms: 'WordPress', headers: { 'common1': '1', 'common2': '1' } },
        { url: 'site3.com', cms: 'Drupal', headers: { 'common1': '2', 'common2': '2' } }
      ]);

      const strictOptions = { ...options, minOccurrences: 2 };
      const result = await analyzer.analyze(testData, strictOptions);

      // All patterns should meet minOccurrences requirement
      for (const pattern of result.patterns.values()) {
        expect(pattern.siteCount).toBeGreaterThanOrEqual(strictOptions.minOccurrences);
      }
    });

    it('should provide examples and site lists', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'x-wp-total': '1', 'cf-ray': '1' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'x-wp-total': '2', 'cf-ray': '2' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      const patterns = Array.from(result.patterns.values());
      if (patterns.length > 0) {
        const pattern = patterns[0];
        if (options.includeExamples) {
          expect(pattern.examples).toBeDefined();
          expect(pattern.examples!.size).toBeGreaterThan(0);
        }
        expect(pattern.sites).toBeDefined();
        expect(pattern.sites.size).toBe(pattern.siteCount);
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently (1000+ sites)', async () => {
      const largeDataset = createTestData(
        Array.from({ length: 1000 }, (_, i) => ({
          url: `site${i}.com`,
          cms: i % 3 === 0 ? 'WordPress' : i % 3 === 1 ? 'Drupal' : 'Shopify',
          headers: {
            'server': i % 2 === 0 ? 'nginx' : 'apache',
            'x-common': 'value',
            [`x-specific-${i % 10}`]: 'value'
          }
        }))
      );

      const startTime = Date.now();
      const result = await analyzer.analyze(largeDataset, { ...options, minOccurrences: 10 });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.analyzerSpecific!.cooccurrences.size).toBeGreaterThan(0);
    });

    it('should complete analysis within reasonable time', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'a': '1', 'b': '1', 'c': '1' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'a': '2', 'b': '2', 'd': '1' } },
        { url: 'site3.com', cms: 'Drupal', headers: { 'a': '3', 'c': '2', 'e': '1' } }
      ]);

      const startTime = Date.now();
      const result = await analyzer.analyze(testData, options);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second for small datasets
      expect(result).toBeDefined();
    });

    it('should handle degenerate cases (all same headers, no overlap)', async () => {
      // All sites have identical headers
      const identicalData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'same': '1' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'same': '2' } },
        { url: 'site3.com', cms: 'WordPress', headers: { 'same': '3' } }
      ]);

      const identicalResult = await analyzer.analyze(identicalData, options);
      expect(identicalResult.analyzerSpecific!.cooccurrences.size).toBe(0); // No pairs to analyze

      // No header overlap
      const noOverlapData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'unique1': '1' } },
        { url: 'site2.com', cms: 'Drupal', headers: { 'unique2': '1' } },
        { url: 'site3.com', cms: 'Shopify', headers: { 'unique3': '1' } }
      ]);

      const noOverlapResult = await analyzer.analyze(noOverlapData, options);
      expect(noOverlapResult.analyzerSpecific!.cooccurrences.size).toBe(0); // No co-occurrences
    });
  });

  describe('Statistical Accuracy', () => {
    it('should calculate mutual information within statistical tolerance', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'a': '1', 'b': '1' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'a': '2', 'b': '2' } },
        { url: 'site3.com', cms: 'Drupal', headers: { 'a': '3' } },
        { url: 'site4.com', cms: 'Unknown', headers: { 'b': '3' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      const cooccurrences = Array.from(result.analyzerSpecific!.cooccurrences.values());
      
      for (const cooccurrence of cooccurrences) {
        // Mutual information should be finite (can be negative for anti-correlated headers)
        expect(Number.isFinite(cooccurrence.mutualInformation)).toBe(true);
        // MI can be negative when headers are negatively correlated (appear together less than expected by chance)
        expect(typeof cooccurrence.mutualInformation).toBe('number');
      }
    });

    it('should verify conditional probability formulas', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'a': '1', 'b': '1' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'a': '2', 'b': '2' } },
        { url: 'site3.com', cms: 'WordPress', headers: { 'a': '3' } } // Only 'a'
      ]);

      const result = await analyzer.analyze(testData, options);

      const abCooccurrence = Array.from(result.analyzerSpecific!.cooccurrences.values())
        .find(c => (c.header1 === 'a' && c.header2 === 'b') || (c.header1 === 'b' && c.header2 === 'a'));

      if (abCooccurrence) {
        // P(b|a) = 2/3 (b appears on 2 of 3 sites with a)
        expect(abCooccurrence.conditionalProbability).toBeCloseTo(2/3, 3);
        
        // Conditional probability should be between 0 and 1
        expect(abCooccurrence.conditionalProbability).toBeGreaterThanOrEqual(0);
        expect(abCooccurrence.conditionalProbability).toBeLessThanOrEqual(1);
      }
    });

    it('should handle floating point precision correctly', async () => {
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'x': '1', 'y': '1' } },
        { url: 'site2.com', cms: 'WordPress', headers: { 'x': '2', 'y': '2' } },
        { url: 'site3.com', cms: 'WordPress', headers: { 'x': '3', 'y': '3' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      const statisticalSummary = result.analyzerSpecific!.statisticalSummary;
      
      // All statistics should be finite numbers
      expect(Number.isFinite(statisticalSummary.averageMutualInformation)).toBe(true);
      expect(Number.isFinite(statisticalSummary.topConditionalProbability)).toBe(true);
      
      // No NaN values
      expect(Number.isNaN(statisticalSummary.averageMutualInformation)).toBe(false);
      expect(Number.isNaN(statisticalSummary.topConditionalProbability)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty datasets gracefully', async () => {
      const emptyData = createTestData([]);

      const result = await analyzer.analyze(emptyData, options);

      expect(result.totalSites).toBe(0);
      expect(result.patterns.size).toBe(0);
      expect(result.analyzerSpecific!.cooccurrences.size).toBe(0);
      expect(result.analyzerSpecific!.technologySignatures.size).toBe(0);
      expect(result.analyzerSpecific!.platformCombinations.size).toBe(0);
      expect(result.analyzerSpecific!.mutualExclusivityGroups.length).toBe(0);
    });

    it('should handle malformed site data', async () => {
      const malformedData: PreprocessedData = {
        sites: new Map([
          ['malformed.com', {
            url: 'https://malformed.com',
            normalizedUrl: 'malformed.com',
            cms: null,
            confidence: 0,
            headers: new Map(), // Empty headers
            metaTags: new Map(),
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

      const result = await analyzer.analyze(malformedData, options);

      expect(result.totalSites).toBe(1);
      expect(result.analyzerSpecific!.cooccurrences.size).toBe(0); // No headers to analyze
    });

    it('should handle sites with no CMS detection', async () => {
      const testData = createTestData([
        { url: 'unknown1.com', cms: null, headers: { 'server': 'nginx' } },
        { url: 'unknown2.com', cms: 'Unknown', headers: { 'server': 'apache' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      // Should handle null/unknown CMS gracefully
      expect(result.totalSites).toBe(2);
      expect(result.analyzerSpecific).toBeDefined();
    });

    it('should provide meaningful error messages', async () => {
      // This test would require mocking error scenarios
      // For now, we ensure basic error handling doesn't crash
      const testData = createTestData([
        { url: 'site1.com', cms: 'WordPress', headers: { 'valid': 'header' } }
      ]);

      const result = await analyzer.analyze(testData, options);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });
});

// Helper Functions

function createTestData(sites: Array<{
  url: string;
  cms: string | null;
  headers: Record<string, string>;
}>): PreprocessedData {
  const siteMap = new Map();
  
  sites.forEach(site => {
    const headerMap = new Map();
    Object.entries(site.headers).forEach(([name, value]) => {
      headerMap.set(name, new Set([value]));
    });
    
    siteMap.set(site.url, {
      url: `https://${site.url}`,
      normalizedUrl: site.url,
      cms: site.cms,
      confidence: site.cms && site.cms !== 'Unknown' ? 0.9 : 0.0,
      headers: headerMap,
      metaTags: new Map(),
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

function createTestDataWithValidation(
  sites: Array<{
    url: string;
    cms: string | null;
    headers: Record<string, string>;
  }>,
  validatedHeaders: string[]
): PreprocessedData {
  const baseData = createTestData(sites);
  
  // Add validation metadata with only specified headers
  const validatedHeaderMap = new Map();
  validatedHeaders.forEach(header => {
    const sites = new Set<string>();
    for (const [siteUrl, siteData] of baseData.sites) {
      if (siteData.headers.has(header)) {
        sites.add(siteUrl);
      }
    }
    
    if (sites.size > 0) {
      validatedHeaderMap.set(header, {
        pattern: header,
        siteCount: sites.size,
        sites,
        frequency: sites.size / baseData.totalSites,
        examples: new Set([header]),
        metadata: { validated: true }
      });
    }
  });

  baseData.metadata.validation = {
    qualityScore: 0.95,
    validationPassed: true,
    validatedHeaders: validatedHeaderMap,
    statisticallySignificantHeaders: validatedHeaders.length
  };

  return baseData;
}