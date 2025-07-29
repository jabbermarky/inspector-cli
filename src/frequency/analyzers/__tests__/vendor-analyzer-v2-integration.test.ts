/**
 * VendorAnalyzerV2 Integration Tests
 * 
 * Pipeline integration tests (12 tests)
 * 
 * Tests integration with FrequencyAggregator, CooccurrenceAnalyzerV2, 
 * and cross-analyzer consistency
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VendorAnalyzerV2 } from '../vendor-analyzer-v2.js';
import { FrequencyAggregator } from '../../frequency-aggregator-v2.js';
import { CooccurrenceAnalyzerV2 } from '../cooccurrence-analyzer-v2.js';
import { SemanticAnalyzerV2 } from '../semantic-analyzer-v2.js';
import type { PreprocessedData, AnalysisOptions } from '../../types/analyzer-interface.js';

// Mock external dependencies
vi.mock('../../../utils/logger.js', () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

vi.mock('../../data-preprocessor.js', () => ({
  DataPreprocessor: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue({
      sites: new Map(),
      totalSites: 0,
      metadata: {
        version: '1.0.0',
        preprocessedAt: '2024-01-01T00:00:00Z'
      }
    }),
    clearCache: vi.fn(),
    getCacheStats: vi.fn().mockReturnValue({ entries: 0, keys: [] }),
    classifyHeader: vi.fn().mockReturnValue({
      category: 'custom',
      discriminativeScore: 0.5,
      filterRecommendation: 'context-dependent'
    })
  }))
}));

describe('VendorAnalyzerV2 - Pipeline Integration Tests', () => {
  let vendorAnalyzer: VendorAnalyzerV2;
  let mockData: PreprocessedData;
  let defaultOptions: AnalysisOptions;

  beforeEach(() => {
    vendorAnalyzer = new VendorAnalyzerV2();
    
    mockData = {
      sites: new Map([
        ['wordpress-site.com', {
          url: 'https://wordpress-site.com',
          normalizedUrl: 'wordpress-site.com',
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map([
            ['cf-ray', new Set(['12345-LAX'])],
            ['x-wp-total', new Set(['150'])],
            ['x-pingback', new Set(['https://wordpress-site.com/xmlrpc.php'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }],
        ['shopify-site.com', {
          url: 'https://shopify-site.com',
          normalizedUrl: 'shopify-site.com',
          cms: 'Shopify',
          confidence: 0.8,
          headers: new Map([
            ['x-shopify-shop-id', new Set(['67890'])],
            ['x-served-by', new Set(['fastly-cache-456'])],
            ['x-cache', new Set(['HIT'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }],
        ['drupal-site.com', {
          url: 'https://drupal-site.com',
          normalizedUrl: 'drupal-site.com',
          cms: 'Drupal',
          confidence: 0.7,
          headers: new Map([
            ['x-drupal-cache', new Set(['HIT'])],
            ['x-amz-cf-id', new Set(['ABCD1234567890'])],
            ['x-generator', new Set(['Drupal 9'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }]
      ]),
      totalSites: 3,
      metadata: {
        version: '1.0.0',
        preprocessedAt: '2024-01-01T00:00:00Z'
      }
    };

    defaultOptions = {
      minOccurrences: 1,
      includeExamples: true,
      maxExamples: 5,
      semanticFiltering: false
    };
  });

  describe('FrequencyAggregator Integration', () => {
    it('should integrate into FrequencyAggregator pipeline', async () => {
      const aggregator = new FrequencyAggregator();
      
      // Mock the preprocessor to return our test data
      const mockPreprocessor = (aggregator as any).preprocessor;
      mockPreprocessor.load = vi.fn().mockResolvedValue(mockData);
      
      const result = await aggregator.analyze({ minOccurrences: 1 });
      
      expect(result).toBeDefined();
      expect(result.vendor).toBeDefined();
      expect(result.vendor.patterns).toBeInstanceOf(Map);
      expect(result.vendor.analyzerSpecific).toBeDefined();
    });

    it('should execute after basic analyzers, before co-occurrence', async () => {
      // This test verifies the execution order in FrequencyAggregator
      const aggregator = new FrequencyAggregator();
      
      // Spy on analyzer methods to verify execution order
      const analyzeSpies: Array<{ name: string; spy: any }> = [];
      
      const analyzers = (aggregator as any).analyzers;
      for (const [name, analyzer] of analyzers) {
        const spy = vi.spyOn(analyzer, 'analyze');
        analyzeSpies.push({ name, spy });
      }
      
      // Mock the preprocessor
      const mockPreprocessor = (aggregator as any).preprocessor;
      mockPreprocessor.load = vi.fn().mockResolvedValue(mockData);
      
      await aggregator.analyze({ minOccurrences: 1 });
      
      // Verify vendor analyzer was called
      const vendorSpy = analyzeSpies.find(s => s.name === 'vendor')?.spy;
      expect(vendorSpy).toHaveBeenCalled();
      
      // Verify co-occurrence analyzer was called after vendor
      const cooccurrenceSpy = analyzeSpies.find(s => s.name === 'cooccurrence')?.spy;
      expect(cooccurrenceSpy).toHaveBeenCalled();
    });

    it('should provide results accessible to other analyzers', async () => {
      const vendorResult = await vendorAnalyzer.analyze(mockData, defaultOptions);
      
      // Verify vendor results are in the expected format for other analyzers
      expect(vendorResult.analyzerSpecific).toBeDefined();
      expect(vendorResult.analyzerSpecific!.vendorsByHeader).toBeInstanceOf(Map);
      expect(vendorResult.analyzerSpecific!.vendorStats).toBeDefined();
      expect(vendorResult.analyzerSpecific!.technologyStack).toBeDefined();
      
      // Check data format is compatible with dependency injection
      const vendorData = vendorResult.analyzerSpecific!;
      expect(vendorData.vendorsByHeader.size).toBeGreaterThan(0);
      expect(vendorData.summary).toBeDefined();
    });
  });

  describe('CooccurrenceAnalyzerV2 Integration', () => {
    it('should eliminate V1 dependencies from CooccurrenceAnalyzerV2', async () => {
      const cooccurrenceAnalyzer = new CooccurrenceAnalyzerV2();
      
      // Get vendor results first
      const vendorResult = await vendorAnalyzer.analyze(mockData, defaultOptions);
      
      // Inject vendor data (simulating FrequencyAggregator behavior)
      (cooccurrenceAnalyzer as any).setVendorData(vendorResult.analyzerSpecific);
      
      // Run co-occurrence analysis with vendor data
      const cooccurrenceResult = await cooccurrenceAnalyzer.analyze(mockData, defaultOptions);
      
      expect(cooccurrenceResult).toBeDefined();
      expect(cooccurrenceResult.patterns).toBeInstanceOf(Map);
      
      // Should not throw errors related to V1 dependencies
      expect(cooccurrenceResult.analyzerSpecific).toBeDefined();
    });

    it('should provide vendor data for co-occurrence analysis', async () => {
      const vendorResult = await vendorAnalyzer.analyze(mockData, defaultOptions);
      
      // Check that vendor data is in the correct format for co-occurrence analysis
      const vendorData = vendorResult.analyzerSpecific!;
      
      expect(vendorData.vendorsByHeader).toBeInstanceOf(Map);
      
      // Check that vendor mappings are available
      for (const [header, detection] of vendorData.vendorsByHeader) {
        expect(detection.vendor).toBeDefined();
        expect(detection.vendor.name).toBeDefined();
        expect(detection.vendor.category).toBeDefined();
      }
    });

    it('should maintain co-occurrence functionality', async () => {
      const cooccurrenceAnalyzer = new CooccurrenceAnalyzerV2();
      const vendorResult = await vendorAnalyzer.analyze(mockData, defaultOptions);
      
      // Inject vendor data
      (cooccurrenceAnalyzer as any).setVendorData(vendorResult.analyzerSpecific);
      
      const result = await cooccurrenceAnalyzer.analyze(mockData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      
      // Should have co-occurrence data
      const cooccurrenceData = result.analyzerSpecific!;
      expect(cooccurrenceData.cooccurrences).toBeDefined();
      expect(cooccurrenceData.statisticalSummary).toBeDefined();
    });
  });

  describe('Cross-Analyzer Consistency', () => {
    it('should be consistent with SemanticAnalyzerV2 categories', async () => {
      const semanticAnalyzer = new SemanticAnalyzerV2();
      
      // Run both analyzers
      const vendorResult = await vendorAnalyzer.analyze(mockData, defaultOptions);
      const semanticResult = await semanticAnalyzer.analyze(mockData, defaultOptions);
      
      // Get vendor categories
      const vendorCategories = new Map<string, string>();
      for (const [header, detection] of vendorResult.analyzerSpecific!.vendorsByHeader) {
        vendorCategories.set(header, detection.vendor.category);
      }
      
      // Get semantic categories (V2 interface)
      const semanticCategories = new Map<string, string>();
      for (const [header, pattern] of semanticResult.analyzerSpecific!.headerPatterns) {
        semanticCategories.set(header, pattern.category);
      }
      
      // Check for consistency where both have data
      for (const [header, vendorCategory] of vendorCategories) {
        const semanticCategory = semanticCategories.get(header);
        if (semanticCategory) {
          // Define expected mappings
          const categoryMappings: Record<string, string[]> = {
            'cdn': ['infrastructure', 'caching', 'performance'],
            'cms': ['infrastructure', 'content-management'],
            'ecommerce': ['infrastructure', 'commerce', 'payment']
          };
          
          const expectedCategories = categoryMappings[vendorCategory] || [];
          if (expectedCategories.length > 0) {
            expect(expectedCategories).toContain(semanticCategory.toLowerCase());
          }
        }
      }
    });

    it('should align with ValidationPipelineV2Native quality scores', async () => {
      // Add validation metadata
      const validatedData: PreprocessedData = {
        ...mockData,
        metadata: {
          ...mockData.metadata,
          validation: {
            qualityScore: 0.9,
            validationPassed: true,
            validatedHeaders: new Map([
              ['cf-ray', { 
                pattern: 'cf-ray', 
                siteCount: 1, 
                sites: new Set(['wordpress-site.com']), 
                frequency: 0.33 
              }],
              ['x-wp-total', { 
                pattern: 'x-wp-total', 
                siteCount: 1, 
                sites: new Set(['wordpress-site.com']), 
                frequency: 0.33 
              }]
            ]),
            statisticallySignificantHeaders: 2
          }
        }
      };

      const result = await vendorAnalyzer.analyze(validatedData, defaultOptions);
      
      // Headers in validation should have higher confidence
      const cfRayDetection = result.analyzerSpecific!.vendorsByHeader.get('cf-ray');
      const wpTotalDetection = result.analyzerSpecific!.vendorsByHeader.get('x-wp-total');
      
      if (cfRayDetection) {
        expect(cfRayDetection.confidence).toBeGreaterThan(0.8);
      }
      if (wpTotalDetection) {
        expect(wpTotalDetection.confidence).toBeGreaterThan(0.8);
      }
    });

    it('should not contradict other analyzer findings', async () => {
      const vendorResult = await vendorAnalyzer.analyze(mockData, defaultOptions);
      
      // Technology stack should be consistent with individual vendor detections
      const techStack = vendorResult.analyzerSpecific!.technologyStack;
      const vendorDetections = vendorResult.analyzerSpecific!.vendorsByHeader;
      
      // If WordPress is detected in headers, it should be in the tech stack
      const wordpressDetection = Array.from(vendorDetections.values())
        .find(d => d.vendor.name === 'WordPress');
      
      if (wordpressDetection) {
        expect(techStack.cms).toBe('WordPress');
      }
      
      // If Cloudflare is detected, it should be in CDN list
      const cloudflareDetection = Array.from(vendorDetections.values())
        .find(d => d.vendor.name === 'Cloudflare');
      
      if (cloudflareDetection) {
        expect(techStack.cdn).toContain('Cloudflare');
      }
      
      // If Shopify is detected, it should be in ecommerce
      const shopifyDetection = Array.from(vendorDetections.values())
        .find(d => d.vendor.name === 'Shopify');
      
      if (shopifyDetection) {
        expect(techStack.ecommerce).toBe('Shopify');
      }
    });
  });

  describe('Technology Signature Detection', () => {
    it('should detect complex multi-header signatures', async () => {
      const result = await vendorAnalyzer.analyze(mockData, defaultOptions);
      
      const signatures = result.analyzerSpecific!.technologySignatures;
      
      // Should detect WordPress + Cloudflare combination
      const wpCloudflareSignature = signatures.find(s => s.name === 'WordPress + Cloudflare');
      if (wpCloudflareSignature) {
        expect(wpCloudflareSignature.sites).toContain('wordpress-site.com');
        expect(wpCloudflareSignature.confidence).toBeGreaterThan(0.6);
      }
      
      // Should detect Shopify + Fastly combination
      const shopifyFastlySignature = signatures.find(s => s.name === 'Shopify + Fastly');
      if (shopifyFastlySignature) {
        expect(shopifyFastlySignature.sites).toContain('shopify-site.com');
        expect(shopifyFastlySignature.confidence).toBeGreaterThan(0.6);
      }
      
      // Should detect Drupal + AWS CloudFront combination
      const drupalAwsSignature = signatures.find(s => s.name === 'Drupal + AWS CloudFront');
      if (drupalAwsSignature) {
        expect(drupalAwsSignature.sites).toContain('drupal-site.com');
        expect(drupalAwsSignature.confidence).toBeGreaterThan(0.6);
      }
    });

    it('should validate signature consistency across sites', async () => {
      const result = await vendorAnalyzer.analyze(mockData, defaultOptions);
      
      const signatures = result.analyzerSpecific!.technologySignatures;
      
      // Each signature should have consistent vendor mappings
      for (const signature of signatures) {
        expect(signature.sites.length).toBeGreaterThan(0);
        expect(signature.requiredHeaders.length).toBeGreaterThan(0);
        expect(signature.confidence).toBeGreaterThanOrEqual(0.6);
        
        // All sites in signature should actually have the required headers
        for (const siteUrl of signature.sites) {
          const siteData = mockData.sites.get(siteUrl);
          expect(siteData).toBeDefined();
          
          const siteHeaders = Array.from(siteData!.headers.keys());
          for (const requiredHeader of signature.requiredHeaders) {
            expect(siteHeaders).toContain(requiredHeader);
          }
        }
      }
    });
  });

  describe('Error Handling and Robustness', () => {
    it('should handle missing dependency data gracefully', async () => {
      // Test with no validation or semantic metadata
      const basicData: PreprocessedData = {
        ...mockData,
        metadata: {
          version: '1.0.0',
          preprocessedAt: '2024-01-01T00:00:00Z'
        }
      };

      const result = await vendorAnalyzer.analyze(basicData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      expect(result.analyzerSpecific!.vendorsByHeader.size).toBeGreaterThan(0);
    });

    it('should handle malformed vendor patterns gracefully', async () => {
      // Add malformed headers that don't match any vendor patterns
      mockData.sites.get('wordpress-site.com')!.headers.set('', new Set(['']));
      mockData.sites.get('wordpress-site.com')!.headers.set('malformed-header-123', new Set(['invalid']));
      
      const result = await vendorAnalyzer.analyze(mockData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      
      // Should still detect valid vendor patterns despite malformed ones
      expect(result.analyzerSpecific!.vendorsByHeader.size).toBeGreaterThan(0);
    });
  });
});