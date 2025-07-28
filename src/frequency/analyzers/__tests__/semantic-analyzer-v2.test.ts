/**
 * SemanticAnalyzerV2 Unit Tests - Pure V2 Implementation
 * 
 * Tests the pure V2 implementation that uses only preprocessed semantic metadata.
 * No V1 dependencies, no independent preprocessing, true V2 architecture.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticAnalyzerV2 } from '../semantic-analyzer-v2.js';
import type { PreprocessedData, AnalysisOptions } from '../../types/analyzer-interface.js';
import type { HeaderClassification } from '../../data-preprocessor.js';

describe('SemanticAnalyzerV2', () => {
  let analyzer: SemanticAnalyzerV2;
  let testData: PreprocessedData;
  let options: AnalysisOptions;

  beforeEach(() => {
    analyzer = new SemanticAnalyzerV2();
    options = {
      minOccurrences: 1,
      includeExamples: true,
      maxExamples: 3,
      semanticFiltering: false
    };

    // Create test data with preprocessed semantic metadata
    const headerClassifications = new Map<string, HeaderClassification>([
      ['x-wp-total', {
        category: 'cms',
        discriminativeScore: 0.9,
        filterRecommendation: 'include',
        vendor: 'WordPress',
        platformName: 'WordPress'
      }],
      ['cf-ray', {
        category: 'infrastructure',
        discriminativeScore: 0.95,
        filterRecommendation: 'include',
        vendor: 'Cloudflare',
        platformName: 'Cloudflare CDN'
      }],
      ['content-security-policy', {
        category: 'security',
        discriminativeScore: 0.98,
        filterRecommendation: 'include'
      }],
      ['x-custom-header', {
        category: 'custom',
        discriminativeScore: 0.4,
        filterRecommendation: 'context-dependent'
      }]
    ]);

    const headerCategories = new Map<string, string>([
      ['x-wp-total', 'cms'],
      ['cf-ray', 'infrastructure'],
      ['content-security-policy', 'security'],
      ['x-custom-header', 'custom']
    ]);

    const vendorMappings = new Map<string, string>([
      ['x-wp-total', 'WordPress'],
      ['cf-ray', 'Cloudflare']
    ]);

    testData = {
      sites: new Map([
        ['site1.com', {
          url: 'https://site1.com',
          normalizedUrl: 'site1.com',
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map([
            ['x-wp-total', new Set(['42'])],
            ['cf-ray', new Set(['abc123'])],
            ['content-security-policy', new Set(['default-src \'self\''])],
            ['x-custom-header', new Set(['value1'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }],
        ['site2.com', {
          url: 'https://site2.com',
          normalizedUrl: 'site2.com',
          cms: 'Drupal',
          confidence: 0.85,
          headers: new Map([
            ['cf-ray', new Set(['def456'])],
            ['content-security-policy', new Set(['default-src \'none\''])],
            ['x-custom-header', new Set(['value2'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-02T00:00:00Z'
        }],
        ['site3.com', {
          url: 'https://site3.com',
          normalizedUrl: 'site3.com',
          cms: null,
          confidence: 0,
          headers: new Map([
            ['x-wp-total', new Set(['15'])],
            ['x-custom-header', new Set(['value3'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-03T00:00:00Z'
        }]
      ]),
      totalSites: 3,
      metadata: {
        version: '2.0.0',
        preprocessedAt: '2024-01-01T00:00:00Z',
        semantic: {
          categoryCount: 4,
          headerCategories,
          headerClassifications,
          vendorMappings
        }
      }
    };
  });

  describe('Pure V2 Architecture', () => {
    it('should analyze using only preprocessed semantic metadata', async () => {
      const result = await analyzer.analyze(testData, options);

      expect(result).toBeDefined();
      expect(result.patterns).toBeInstanceOf(Map);
      expect(result.totalSites).toBe(3);
      expect(result.metadata.analyzer).toBe('SemanticAnalyzerV2');
      expect(result.analyzerSpecific).toBeDefined();
    });

    it('should handle missing semantic metadata gracefully', async () => {
      const dataWithoutSemantic = {
        ...testData,
        metadata: {
          ...testData.metadata,
          semantic: undefined
        }
      };

      const result = await analyzer.analyze(dataWithoutSemantic, options);

      expect(result).toBeDefined();
      expect(result.patterns.size).toBe(0);
      expect(result.analyzerSpecific?.categoryDistribution.size).toBe(0);
    });

    it('should create category distribution from preprocessed data', async () => {
      const result = await analyzer.analyze(testData, options);
      const categoryDistribution = result.analyzerSpecific?.categoryDistribution;

      expect(categoryDistribution).toBeDefined();
      expect(categoryDistribution!.has('cms')).toBe(true);
      expect(categoryDistribution!.has('infrastructure')).toBe(true);
      expect(categoryDistribution!.has('security')).toBe(true);
      expect(categoryDistribution!.has('custom')).toBe(true);

      // Check CMS category data
      const cmsCategory = categoryDistribution!.get('cms')!;
      expect(cmsCategory.category).toBe('cms');
      expect(cmsCategory.headerCount).toBe(1); // x-wp-total
      expect(cmsCategory.siteCount).toBe(2); // site1.com and site3.com have x-wp-total
      expect(cmsCategory.frequency).toBeCloseTo(2/3); // 2 sites out of 3
    });

    it('should create semantic patterns with correct data', async () => {
      const result = await analyzer.analyze(testData, options);
      const headerPatterns = result.analyzerSpecific?.headerPatterns;

      expect(headerPatterns).toBeDefined();
      expect(headerPatterns!.has('x-wp-total')).toBe(true);
      expect(headerPatterns!.has('cf-ray')).toBe(true);

      const wpPattern = headerPatterns!.get('x-wp-total')!;
      expect(wpPattern.pattern).toBe('x-wp-total');
      expect(wpPattern.category).toBe('cms');
      expect(wpPattern.vendor).toBe('WordPress');
      expect(wpPattern.siteCount).toBe(2); // site1.com and site3.com
      expect(wpPattern.sites.size).toBe(2);
    });

    it('should analyze vendor detections from preprocessed mappings', async () => {
      const result = await analyzer.analyze(testData, options);
      const vendorDetections = result.analyzerSpecific?.vendorDetections;

      expect(vendorDetections).toBeDefined();
      expect(vendorDetections!.has('WordPress')).toBe(true);
      expect(vendorDetections!.has('Cloudflare')).toBe(true);

      const wordpressVendor = vendorDetections!.get('WordPress')!;
      expect(wordpressVendor.vendor).toBe('WordPress');
      expect(wordpressVendor.headerCount).toBe(1); // x-wp-total
      expect(wordpressVendor.headers).toContain('x-wp-total');
      expect(wordpressVendor.category).toBe('cms');
    });

    it('should generate V2-native insights', async () => {
      const result = await analyzer.analyze(testData, options);
      const insights = result.analyzerSpecific?.insights;

      expect(insights).toBeDefined();
      expect(insights!.totalHeaders).toBe(4); // Total unique headers
      expect(insights!.categorizedHeaders).toBe(3); // Non-custom headers
      expect(insights!.uncategorizedHeaders).toBe(1); // Custom headers
      expect(insights!.vendorHeaders).toBe(2); // Headers with vendors
      expect(insights!.customHeaders).toBe(1); // Custom category headers
      expect(insights!.recommendations).toBeInstanceOf(Array);
    });

    it('should calculate quality metrics', async () => {
      const result = await analyzer.analyze(testData, options);
      const qualityMetrics = result.analyzerSpecific?.qualityMetrics;

      expect(qualityMetrics).toBeDefined();
      expect(qualityMetrics!.categorizationCoverage).toBeCloseTo(0.75); // 3/4 headers categorized
      expect(qualityMetrics!.averageConfidence).toBeGreaterThan(0);
      expect(qualityMetrics!.vendorDetectionRate).toBeCloseTo(0.5); // 2/4 headers have vendors
      expect(qualityMetrics!.customHeaderRatio).toBeCloseTo(0.25); // 1/4 headers are custom
    });

    it('should create standard patterns for FrequencyAnalyzer interface', async () => {
      const result = await analyzer.analyze(testData, options);

      expect(result.patterns).toBeInstanceOf(Map);
      expect(result.patterns.size).toBeGreaterThan(0);

      // Check pattern structure
      const firstPattern = Array.from(result.patterns.values())[0];
      expect(firstPattern).toHaveProperty('pattern');
      expect(firstPattern).toHaveProperty('siteCount');
      expect(firstPattern).toHaveProperty('frequency');
      expect(firstPattern).toHaveProperty('sites');
      expect(firstPattern).toHaveProperty('metadata');
      expect(firstPattern.metadata?.type).toBe('semantic');
      expect(firstPattern.metadata?.source).toBe('semantic_analyzer_v2_pure');
    });

    it('should respect minOccurrences filter', async () => {
      const highMinOptions = { ...options, minOccurrences: 3 };
      const result = await analyzer.analyze(testData, highMinOptions);

      // Only x-custom-header appears in 3 sites, so only 1 pattern should remain
      expect(result.patterns.size).toBe(1);
      expect(result.patterns.has('x-custom-header')).toBe(true);
      expect(result.metadata.totalPatternsAfterFiltering).toBe(1);
      
      // Test with even higher threshold
      const veryHighMinOptions = { ...options, minOccurrences: 4 };
      const result2 = await analyzer.analyze(testData, veryHighMinOptions);
      
      // No headers appear in 4+ sites, so should be filtered out
      expect(result2.patterns.size).toBe(0);
      expect(result2.metadata.totalPatternsAfterFiltering).toBe(0);
    });

    it('should handle empty dataset', async () => {
      const emptyData = {
        ...testData,
        sites: new Map(),
        totalSites: 0,
        metadata: {
          ...testData.metadata,
          semantic: {
            categoryCount: 0,
            headerCategories: new Map(),
            headerClassifications: new Map(),
            vendorMappings: new Map()
          }
        }
      };

      const result = await analyzer.analyze(emptyData, options);

      expect(result).toBeDefined();
      expect(result.patterns.size).toBe(0);
      expect(result.totalSites).toBe(0);
      expect(result.analyzerSpecific?.categoryDistribution.size).toBe(0);
      expect(result.analyzerSpecific?.headerPatterns.size).toBe(0);
      expect(result.analyzerSpecific?.vendorDetections.size).toBe(0);
    });
  });

  describe('Site Counting Accuracy', () => {
    it('should accurately count unique sites for each header', async () => {
      const result = await analyzer.analyze(testData, options);
      const patterns = result.patterns;

      // cf-ray appears in site1.com and site2.com = 2 sites
      const cfRayPattern = patterns.get('cf-ray');
      expect(cfRayPattern?.siteCount).toBe(2);
      expect(cfRayPattern?.sites.size).toBe(2);

      // x-wp-total appears in site1.com and site3.com = 2 sites
      const wpPattern = patterns.get('x-wp-total');
      expect(wpPattern?.siteCount).toBe(2);
      expect(wpPattern?.sites.size).toBe(2);

      // content-security-policy appears in site1.com and site2.com = 2 sites
      const cspPattern = patterns.get('content-security-policy');
      expect(cspPattern?.siteCount).toBe(2);
      expect(cspPattern?.sites.size).toBe(2);

      // x-custom-header appears in all 3 sites
      const customPattern = patterns.get('x-custom-header');
      expect(customPattern?.siteCount).toBe(3);
      expect(customPattern?.sites.size).toBe(3);
    });

    it('should calculate correct frequencies', async () => {
      const result = await analyzer.analyze(testData, options);
      const patterns = result.patterns;

      // All patterns with 2 sites should have frequency 2/3 ≈ 0.67
      const cfRayPattern = patterns.get('cf-ray');
      expect(cfRayPattern?.frequency).toBeCloseTo(2/2); // siteCount / sites.size

      // Pattern with 3 sites should have frequency 3/3 = 1.0
      const customPattern = patterns.get('x-custom-header');
      expect(customPattern?.frequency).toBeCloseTo(3/3); // siteCount / sites.size
    });
  });

  describe('Interface Compliance', () => {
    it('should implement FrequencyAnalyzer interface correctly', () => {
      expect(analyzer.getName()).toBe('SemanticAnalyzerV2');
      expect(typeof analyzer.analyze).toBe('function');
    });

    it('should return properly typed AnalysisResult', async () => {
      const result = await analyzer.analyze(testData, options);

      // Check AnalysisResult structure
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('totalSites');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('analyzerSpecific');

      // Check metadata structure
      expect(result.metadata).toHaveProperty('analyzer');
      expect(result.metadata).toHaveProperty('analyzedAt');
      expect(result.metadata).toHaveProperty('totalPatternsFound');
      expect(result.metadata).toHaveProperty('totalPatternsAfterFiltering');
      expect(result.metadata).toHaveProperty('options');

      // Check SemanticSpecificData structure
      const specific = result.analyzerSpecific!;
      expect(specific).toHaveProperty('categoryDistribution');
      expect(specific).toHaveProperty('headerPatterns');
      expect(specific).toHaveProperty('vendorDetections');
      expect(specific).toHaveProperty('insights');
      expect(specific).toHaveProperty('qualityMetrics');
    });
  });
});