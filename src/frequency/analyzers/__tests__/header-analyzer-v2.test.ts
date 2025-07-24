/**
 * Tests for HeaderAnalyzerV2 - Verifying unique site counting
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HeaderAnalyzerV2 } from '../header-analyzer-v2.js';
import type { PreprocessedData, AnalysisOptions } from '../../types/analyzer-interface.js';

describe('HeaderAnalyzerV2', () => {
  let analyzer: HeaderAnalyzerV2;
  let testData: PreprocessedData;
  let options: AnalysisOptions;

  beforeEach(() => {
    analyzer = new HeaderAnalyzerV2();
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
          headers: new Map([
            ['x-powered-by', new Set(['PHP/7.4.0'])],
            ['x-pingback', new Set(['https://site1.com/xmlrpc.php'])],
            ['server', new Set(['Apache/2.4.41'])],
            ['date', new Set(['Mon, 01 Jan 2024 00:00:00 GMT'])] // Should be filtered
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }],
        ['site2.com', {
          url: 'https://site2.com',
          normalizedUrl: 'site2.com',
          cms: 'WordPress',
          confidence: 0.95,
          headers: new Map([
            ['x-powered-by', new Set(['PHP/8.0.0'])],
            ['x-pingback', new Set(['https://site2.com/xmlrpc.php'])],
            ['server', new Set(['nginx/1.18.0'])],
            ['cache-control', new Set(['no-cache'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-02T00:00:00Z'
        }],
        ['site3.com', {
          url: 'https://site3.com',
          normalizedUrl: 'site3.com',
          cms: 'Drupal',
          confidence: 0.85,
          headers: new Map([
            ['x-powered-by', new Set(['PHP/7.4.0'])],
            ['x-drupal-cache', new Set(['HIT'])],
            ['server', new Set(['Apache/2.4.41'])]
          ]),
          metaTags: new Map(),
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
    it('should count each site only once per header', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // x-powered-by appears on all 3 sites
      const xPoweredBy = result.patterns.get('x-powered-by');
      expect(xPoweredBy).toBeDefined();
      expect(xPoweredBy!.siteCount).toBe(3);
      expect(xPoweredBy!.sites.size).toBe(3);
      expect(xPoweredBy!.frequency).toBe(1.0); // 3/3 = 100%
    });

    it('should correctly count headers that appear on subset of sites', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // x-pingback appears on 2 WordPress sites
      const xPingback = result.patterns.get('x-pingback');
      expect(xPingback).toBeDefined();
      expect(xPingback!.siteCount).toBe(2);
      expect(xPingback!.sites.size).toBe(2);
      expect(xPingback!.frequency).toBeCloseTo(0.667, 3); // 2/3 = 66.7%
      
      // x-drupal-cache appears on 1 site
      const xDrupalCache = result.patterns.get('x-drupal-cache');
      expect(xDrupalCache).toBeUndefined(); // Filtered out by minOccurrences = 2
    });

    it('should not double-count if same header appears multiple times', async () => {
      // Add duplicate header to site1
      testData.sites.get('site1.com')!.headers.set('x-duplicate', new Set(['value1', 'value2']));
      
      const result = await analyzer.analyze(testData, options);
      
      // Even with multiple values, should count as 1 site
      const xDuplicate = result.patterns.get('x-duplicate');
      expect(xDuplicate).toBeUndefined(); // Only 1 site, below minOccurrences
    });
  });

  describe('Filtering', () => {
    it('should apply semantic filtering when enabled', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // 'date' header should be filtered out
      expect(result.patterns.has('date')).toBe(false);
      
      // Custom headers should remain
      expect(result.patterns.has('x-powered-by')).toBe(true);
    });

    it('should not apply semantic filtering when disabled', async () => {
      options.semanticFiltering = false;
      
      // Add 'date' header to another site to meet minOccurrences
      testData.sites.get('site2.com')!.headers.set('date', new Set(['Tue, 02 Jan 2024 00:00:00 GMT']));
      
      const result = await analyzer.analyze(testData, options);
      
      // 'date' header should now be included
      expect(result.patterns.has('date')).toBe(true);
      expect(result.patterns.get('date')!.siteCount).toBe(2);
    });

    it('should apply minOccurrences based on site count', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // Headers appearing on only 1 site should be filtered out
      expect(result.patterns.has('x-drupal-cache')).toBe(false);
      expect(result.patterns.has('cache-control')).toBe(false);
      
      // Headers appearing on 2+ sites should be included
      expect(result.patterns.has('x-powered-by')).toBe(true);
      expect(result.patterns.has('x-pingback')).toBe(true);
      expect(result.patterns.has('server')).toBe(true);
    });
  });

  describe('Example Collection', () => {
    it('should collect examples when enabled', async () => {
      const result = await analyzer.analyze(testData, options);
      
      const xPoweredBy = result.patterns.get('x-powered-by');
      expect(xPoweredBy!.examples).toBeDefined();
      expect(xPoweredBy!.examples!.size).toBeGreaterThan(0);
      expect(xPoweredBy!.examples!.size).toBeLessThanOrEqual(options.maxExamples!);
    });

    it('should not collect examples when disabled', async () => {
      options.includeExamples = false;
      const result = await analyzer.analyze(testData, options);
      
      const xPoweredBy = result.patterns.get('x-powered-by');
      expect(xPoweredBy!.examples!.size).toBe(0);
    });
  });

  describe('Metadata', () => {
    it('should identify security headers', async () => {
      // Add security header
      testData.sites.get('site1.com')!.headers.set('x-frame-options', new Set(['SAMEORIGIN']));
      testData.sites.get('site2.com')!.headers.set('x-frame-options', new Set(['DENY']));
      
      const result = await analyzer.analyze(testData, options);
      
      expect(result.analyzerSpecific!.securityHeaders.has('x-frame-options')).toBe(true);
    });

    it('should identify custom headers', async () => {
      const result = await analyzer.analyze(testData, options);
      
      expect(result.analyzerSpecific!.customHeaders.has('x-powered-by')).toBe(true);
      expect(result.analyzerSpecific!.customHeaders.has('x-pingback')).toBe(true);
      expect(result.analyzerSpecific!.customHeaders.has('x-drupal-cache')).toBe(true);
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
      expect(result.metadata.analyzer).toBe('HeaderAnalyzerV2');
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