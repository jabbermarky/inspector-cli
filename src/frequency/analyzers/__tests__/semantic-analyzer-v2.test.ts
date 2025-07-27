/**
 * SemanticAnalyzerV2 Unit Tests - Comprehensive Algorithmic Coverage
 * 
 * CRITICAL: This file provides comprehensive algorithmic testing for SemanticAnalyzerV2's
 * core business logic integration with V1 semantic analysis components.
 * 
 * Testing Philosophy: Real data structures, V1/V2 integration validation, minimal mocking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticAnalyzerV2 } from '../semantic-analyzer-v2.js';
import type { PreprocessedData, AnalysisOptions } from '../../types/analyzer-interface.js';

describe('SemanticAnalyzerV2', () => {
  let analyzer: SemanticAnalyzerV2;
  let testData: PreprocessedData;
  let options: AnalysisOptions;

  beforeEach(() => {
    analyzer = new SemanticAnalyzerV2();
    options = {
      minOccurrences: 2,
      includeExamples: true,
      maxExamples: 3,
      semanticFiltering: false
    };

    // Set up vendor data injection for semantic analysis
    const mockVendorData = {
      vendorsByHeader: new Map([
        ['cf-ray', {
          vendor: { name: 'Cloudflare', category: 'cdn' as const, headerPatterns: ['cf-ray'], description: 'Cloudflare CDN' },
          confidence: 0.9,
          matchedHeaders: ['cf-ray'],
          matchedSites: ['site1.com', 'site2.com'],
          frequency: 0.67
        }],
        ['x-wp-total', {
          vendor: { name: 'WordPress', category: 'cms' as const, headerPatterns: ['x-wp-*'], description: 'WordPress CMS' },
          confidence: 0.85,
          matchedHeaders: ['x-wp-total'],
          matchedSites: ['site1.com'],
          frequency: 0.33
        }],
        ['x-shopify-shop-id', {
          vendor: { name: 'Shopify', category: 'ecommerce' as const, headerPatterns: ['x-shopify-*'], description: 'Shopify Platform' },
          confidence: 0.95,
          matchedHeaders: ['x-shopify-shop-id'],
          matchedSites: ['site3.com'],
          frequency: 0.33
        }]
      ]),
      vendorStats: {
        totalHeaders: 15,
        vendorHeaders: 8,
        vendorCoverage: 0.53, // 8/15 = 53%
        vendorDistribution: [
          {
            vendor: 'Cloudflare',
            category: 'cdn',
            headerCount: 1,
            percentage: 12.5, // 1/8 vendor headers
            headers: ['cf-ray'],
            confidence: 0.9
          },
          {
            vendor: 'WordPress',
            category: 'cms',
            headerCount: 2,
            percentage: 25.0, // 2/8 vendor headers
            headers: ['x-wp-total', 'x-pingback'],
            confidence: 0.85
          },
          {
            vendor: 'Shopify',
            category: 'ecommerce',
            headerCount: 1,
            percentage: 12.5,
            headers: ['x-shopify-shop-id'],
            confidence: 0.95
          }
        ],
        categoryDistribution: {
          'cdn': 12.5,
          'cms': 25.0,
          'ecommerce': 12.5,
          'server': 25.0,
          'security': 25.0
        }
      },
      technologyStack: {
        cms: 'WordPress',
        ecommerce: 'Shopify',
        cdn: ['Cloudflare'],
        framework: 'React',
        hosting: 'AWS',
        confidence: 0.78,
        complexity: 'moderate' as const
      },
      vendorConfidence: 0.76,
      technologySignatures: new Map(),
      conflictingVendors: new Map(),
      summary: {
        totalVendorsDetected: 3,
        highConfidenceVendors: 2,
        categoryCoverage: 3,
        averageConfidence: 0.85
      }
    };

    // Inject vendor data before analysis
    analyzer.setVendorData(mockVendorData);

    // Create test data with headers that should trigger semantic analysis
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
            ['x-pingback', new Set(['https://site1.com/xmlrpc.php'])],
            ['content-security-policy', new Set(['default-src \'self\''])],
            ['server', new Set(['nginx/1.18.0'])]
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
            ['x-drupal-cache', new Set(['HIT'])],
            ['cf-ray', new Set(['def456'])],
            ['x-frame-options', new Set(['SAMEORIGIN'])],
            ['x-shopify-shop-id', new Set(['123456'])],
            ['server', new Set(['Apache/2.4.41'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-02T00:00:00Z'
        }],
        ['site3.com', {
          url: 'https://site3.com',
          normalizedUrl: 'site3.com',
          cms: 'Unknown',
          confidence: 0.0,
          headers: new Map([
            ['d-cache', new Set(['MISS'])],
            ['x-custom-header', new Set(['custom-value'])],
            ['strict-transport-security', new Set(['max-age=31536000'])],
            ['server', new Set(['nginx/1.20.0'])]
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

  describe('V1 Semantic Analysis Integration', () => {
    it('should integrate V1 semantic analysis functions correctly', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // Verify semantic analyses were created
      expect(result.analyzerSpecific!.semanticAnalyses).toBeDefined();
      expect(result.analyzerSpecific!.semanticAnalyses.size).toBeGreaterThan(0);
      
      // Check that headers were analyzed with V1 semantic analysis
      const analyses = result.analyzerSpecific!.semanticAnalyses;
      
      // Should have analyzed security headers
      expect(analyses.has('content-security-policy')).toBe(true);
      expect(analyses.has('x-frame-options')).toBe(true);
      expect(analyses.has('strict-transport-security')).toBe(true);
      
      // Should have analyzed vendor-specific headers
      expect(analyses.has('cf-ray')).toBe(true);
      expect(analyses.has('x-wp-total')).toBe(true);
      expect(analyses.has('x-drupal-cache')).toBe(true);
    });

    it('should generate semantic insights from V1 logic', async () => {
      const result = await analyzer.analyze(testData, options);
      
      const insights = result.analyzerSpecific!.insights;
      expect(insights).toBeDefined();
      expect(insights.categoryDistribution).toBeDefined();
      expect(insights.vendorDistribution).toBeDefined();
      expect(insights.topCategories).toBeDefined();
      expect(insights.topVendors).toBeDefined();
      
      // Should categorize security headers
      expect(insights.categoryDistribution.security).toBeGreaterThan(0);
      
      // Should detect vendors
      expect(Object.keys(insights.vendorDistribution)).toContain('Cloudflare');
    });

    it('should perform vendor analysis using V1 vendor-patterns logic', async () => {
      const result = await analyzer.analyze(testData, options);
      
      const vendorStats = result.analyzerSpecific!.vendorStats;
      expect(vendorStats).toBeDefined();
      expect(vendorStats.vendorCoverage).toBeGreaterThan(0);
      expect(vendorStats.vendorDistribution).toBeDefined();
      
      // Should detect Cloudflare from cf-ray headers
      const cloudflareVendor = vendorStats.vendorDistribution.find((v: any) => v.vendor === 'Cloudflare');
      expect(cloudflareVendor).toBeDefined();
      expect(cloudflareVendor.headerCount).toBe(1); // cf-ray appears once in unique headers
      
      // Should detect WordPress from x-wp-total
      const wordpressVendor = vendorStats.vendorDistribution.find((v: any) => v.vendor === 'WordPress');
      expect(wordpressVendor).toBeDefined();
    });

    it('should infer technology stack using V1 logic', async () => {
      const result = await analyzer.analyze(testData, options);
      
      const techStack = result.analyzerSpecific!.technologyStack;
      expect(techStack).toBeDefined();
      expect(techStack.confidence).toBeGreaterThan(0);
      
      // Should identify CMS technologies
      expect(techStack.cms).toBeDefined();
      
      // Should identify CDN technologies  
      expect(techStack.cdn).toBeDefined();
      expect(techStack.cdn).toContain('Cloudflare');
      
      // Should identify e-commerce platforms
      expect(techStack.ecommerce).toBeDefined();
      expect(techStack.ecommerce).toBe('Shopify'); // From x-shopify-shop-id
    });
  });

  describe('V2 Pattern Creation', () => {
    it('should create category-based patterns', async () => {
      const result = await analyzer.analyze(testData, options);
      
      const categoryPatterns = result.analyzerSpecific!.categoryPatterns;
      expect(categoryPatterns).toBeDefined();
      expect(categoryPatterns.size).toBeGreaterThan(0);
      
      // Should have security category
      const securityPattern = categoryPatterns.get('security');
      expect(securityPattern).toBeDefined();
      expect(securityPattern.category).toBe('security');
      expect(securityPattern.headerCount).toBeGreaterThan(0);
      expect(securityPattern.frequency).toBeGreaterThan(0);
      expect(securityPattern.examples).toContain('content-security-policy');
    });

    it('should create vendor-based patterns', async () => {
      const result = await analyzer.analyze(testData, options);
      
      const vendorPatterns = result.analyzerSpecific!.vendorPatterns;
      expect(vendorPatterns).toBeDefined();
      expect(vendorPatterns.size).toBeGreaterThan(0);
      
      // Should have Cloudflare vendor pattern
      const cloudflarePattern = vendorPatterns.get('Cloudflare');
      expect(cloudflarePattern).toBeDefined();
      expect(cloudflarePattern.vendor).toBe('Cloudflare');
      expect(cloudflarePattern.examples).toContain('cf-ray');
      expect(cloudflarePattern.categories).toContain('cdn');
    });

    it('should create V2-compatible semantic patterns', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // Should create patterns for categories
      expect(result.patterns.has('category:security')).toBe(true);
      expect(result.patterns.has('category:cms')).toBe(true);
      
      const securityPattern = result.patterns.get('category:security');
      expect(securityPattern!.siteCount).toBeGreaterThan(0);
      expect(securityPattern!.frequency).toBeGreaterThan(0);
      expect(securityPattern!.metadata!.category).toBe('security');
      expect(securityPattern!.metadata!.semanticType).toBe('category');
    });
  });

  describe('Unique Header Extraction', () => {
    it('should extract unique headers from all sites', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // Should have analyzed all unique headers from test data
      const analyses = result.analyzerSpecific!.semanticAnalyses;
      
      // Headers that appear in test data
      expect(analyses.has('server')).toBe(true); // All sites
      expect(analyses.has('cf-ray')).toBe(true); // Sites 1&2
      expect(analyses.has('x-wp-total')).toBe(true); // Site 1
      expect(analyses.has('x-drupal-cache')).toBe(true); // Site 2
      expect(analyses.has('d-cache')).toBe(true); // Site 3
      
      // Should not have duplicates
      const uniqueHeaders = Array.from(analyses.keys());
      const uniqueSet = new Set(uniqueHeaders);
      expect(uniqueHeaders.length).toBe(uniqueSet.size);
    });

    it('should handle case normalization correctly', async () => {
      // Add test data with mixed case headers
      testData.sites.get('site1.com')!.headers.set('X-Custom-Header', new Set(['value']));
      testData.sites.get('site2.com')!.headers.set('x-custom-header', new Set(['value2']));
      
      const result = await analyzer.analyze(testData, options);
      
      // Should normalize to lowercase
      const analyses = result.analyzerSpecific!.semanticAnalyses;
      expect(analyses.has('x-custom-header')).toBe(true);
      
      // Should not have both cases
      expect(analyses.has('X-Custom-Header')).toBe(false);
    });
  });

  describe('Site Counting Algorithms', () => {
    it('should count sites with any header correctly', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // Security category should count sites with any security header
      const securityPattern = result.analyzerSpecific!.categoryPatterns.get('security');
      expect(securityPattern).toBeDefined();
      
      // All 3 sites have at least one security header
      expect(securityPattern.frequency).toBe(1.0); // 3/3 = 100%
      
      // CMS category should include all sites that have CMS-indicative headers
      // Note: 'server' header is correctly classified as CMS-indicative since it can contain CMS info
      const cmsPattern = result.analyzerSpecific!.categoryPatterns.get('cms');
      if (cmsPattern) {
        // All 3 sites have CMS-related headers (including 'server' which is value-discriminative)
        expect(cmsPattern.frequency).toBe(1.0); // 3/3 = 100%
        expect(cmsPattern.examples).toContain('server'); // server header is CMS-indicative
      }
    });

    it('should accurately calculate vendor frequencies', async () => {
      const result = await analyzer.analyze(testData, options);
      
      const cloudflarePattern = result.analyzerSpecific!.vendorPatterns.get('Cloudflare');
      expect(cloudflarePattern).toBeDefined();
      
      // Cloudflare (cf-ray) appears on 2 out of 3 sites
      expect(cloudflarePattern.frequency).toBeCloseTo(2/3, 3);
    });
  });

  describe('Result Format Compliance', () => {
    it('should return properly formatted AnalysisResult', async () => {
      const result = await analyzer.analyze(testData, options);
      
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('totalSites');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('analyzerSpecific');
      
      expect(result.totalSites).toBe(3);
      expect(result.metadata.analyzer).toBe('SemanticAnalyzerV2');
      expect(result.metadata.totalPatternsFound).toBeGreaterThan(0);
    });

    it('should include all required analyzer-specific data', async () => {
      const result = await analyzer.analyze(testData, options);
      
      const specific = result.analyzerSpecific!;
      expect(specific.semanticAnalyses).toBeDefined();
      expect(specific.insights).toBeDefined();
      expect(specific.vendorStats).toBeDefined();
      expect(specific.technologyStack).toBeDefined();
      expect(specific.categoryPatterns).toBeDefined();
      expect(specific.vendorPatterns).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty dataset gracefully', async () => {
      const emptyData: PreprocessedData = {
        sites: new Map(),
        totalSites: 0,
        metadata: {
          version: '1.0.0',
          preprocessedAt: '2024-01-01T00:00:00Z'
        }
      };

      const result = await analyzer.analyze(emptyData, options);
      
      expect(result.totalSites).toBe(0);
      expect(result.patterns.size).toBe(0);
      expect(result.analyzerSpecific!.semanticAnalyses.size).toBe(0);
    });

    it('should handle sites with no headers', async () => {
      const testDataNoHeaders: PreprocessedData = {
        sites: new Map([
          ['empty-site.com', {
            url: 'https://empty-site.com',
            normalizedUrl: 'empty-site.com',
            cms: null,
            confidence: 0,
            headers: new Map(),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }]
        ]),
        totalSites: 1,
        metadata: {
          version: '1.0.0',
          preprocessedAt: '2024-01-01T00:00:00Z'
        }
      };

      const result = await analyzer.analyze(testDataNoHeaders, options);
      
      expect(result.totalSites).toBe(1);
      expect(result.analyzerSpecific!.semanticAnalyses.size).toBe(0);
      expect(result.patterns.size).toBe(0);
    });
  });
});

/**
 * Helper function to create realistic test data for semantic analysis
 */
function createSemanticTestData(sites: Array<{
  url: string;
  headers: Map<string, Set<string>>;
  cms?: string;
}>): PreprocessedData {
  const siteMap = new Map();
  
  sites.forEach(site => {
    const normalizedUrl = site.url.replace(/^https?:\/\//, '');
    siteMap.set(normalizedUrl, {
      url: site.url,
      normalizedUrl,
      cms: site.cms || null,
      confidence: site.cms ? 0.9 : 0.0,
      headers: site.headers,
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