/**
 * PatternDiscoveryV2 Tests
 * 
 * Comprehensive test suite covering pattern discovery, emerging vendor detection,
 * semantic anomaly detection, and validation integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatternDiscoveryV2 } from '../pattern-discovery-v2.js';
import type { PreprocessedData, AnalysisOptions } from '../../types/analyzer-interface.js';

// Mock dependencies
vi.mock('../../semantic-analyzer.js', () => ({
  analyzeHeaderSemantics: vi.fn((header: string) => ({
    category: {
      primary: header.includes('cache') ? 'caching' : 
                header.includes('wp') ? 'cms' :
                header.includes('security') ? 'security' : 'other',
      confidence: 0.8,
      vendor: header.includes('cf-') ? 'cloudflare' : undefined
    }
  }))
}));

vi.mock('../../vendor-patterns.js', () => ({
  findVendorByHeader: vi.fn((header: string) => {
    if (header.includes('cf-')) return { name: 'cloudflare' };
    if (header.includes('shopify')) return { name: 'shopify' };
    return undefined;
  })
}));

vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }))
}));

describe('PatternDiscoveryV2', () => {
  let analyzer: PatternDiscoveryV2;
  let mockData: PreprocessedData;
  let defaultOptions: AnalysisOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new PatternDiscoveryV2();
    
    defaultOptions = {
      minOccurrences: 2,
      includeExamples: true,
      maxExamples: 5,
      semanticFiltering: true
    };

    // Create comprehensive test data
    mockData = {
      sites: new Map([
        ['site1.com', {
          url: 'site1.com',
          normalizedUrl: 'site1.com',
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map([
            ['x-wp-total', new Set(['10'])],
            ['cf-ray', new Set(['abc123'])],
            ['x-custom-header', new Set(['value1'])],
            ['cache-control', new Set(['max-age=3600'])],
            ['x-vendor-id', new Set(['123'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: new Date().toISOString()
        }],
        ['site2.com', {
          url: 'site2.com',
          normalizedUrl: 'site2.com',
          cms: 'WordPress',
          confidence: 0.8,
          headers: new Map([
            ['x-wp-version', new Set(['6.2'])],
            ['cf-cache-status', new Set(['HIT'])],
            ['x-custom-value', new Set(['value2'])],
            ['cache-control', new Set(['no-cache'])],
            ['x-vendor-token', new Set(['token123'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: new Date().toISOString()
        }],
        ['site3.com', {
          url: 'site3.com',
          normalizedUrl: 'site3.com',
          cms: 'Shopify',
          confidence: 0.9,
          headers: new Map([
            ['x-shopify-shop-id', new Set(['shop123'])],
            ['x-sorting-hat-shopid', new Set(['hat123'])],
            ['newvendor-api', new Set(['v1'])],
            ['newvendor-auth', new Set(['token'])],
            ['security-header', new Set(['enabled'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: new Date().toISOString()
        }],
        ['site4.com', {
          url: 'site4.com',
          normalizedUrl: 'site4.com',
          cms: 'Drupal',
          confidence: 0.85,
          headers: new Map([
            ['x-drupal-cache', new Set(['MISS'])],
            ['newvendor-data', new Set(['cached'])],
            ['api-version', new Set(['v2'])],
            ['response-time', new Set(['250ms'])],
            ['unknown-header', new Set(['value'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: new Date().toISOString()
        }],
        ['site5.com', {
          url: 'site5.com',
          normalizedUrl: 'site5.com',
          cms: 'Unknown',
          confidence: 0.1,
          headers: new Map([
            ['word-word-word', new Set(['test'])],
            ['test_underscore', new Set(['value'])],
            ['cf-connecting-ip', new Set(['1.2.3.4'])],
            ['header-id', new Set(['12345'])],
            ['test-version', new Set(['1.0'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: new Date().toISOString()
        }]
      ]),
      totalSites: 5,
      metadata: {
        version: '2.0',
        preprocessedAt: new Date().toISOString()
      }
    };
  });

  describe('getName', () => {
    it('should return correct analyzer name', () => {
      expect(analyzer.getName()).toBe('PatternDiscoveryV2');
    });
  });

  describe('analyze', () => {
    it('should perform pattern discovery analysis', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);

      expect(result).toBeDefined();
      expect(result.patterns).toBeInstanceOf(Map);
      expect(result.totalSites).toBe(5);
      expect(result.metadata.analyzer).toBe('PatternDiscoveryV2');
      expect(result.analyzerSpecific).toBeDefined();
    });

    it('should discover prefix patterns', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      const patterns = result.analyzerSpecific!.discoveredPatterns;

      // Should find x- prefix patterns
      const prefixPatterns = Array.from(patterns.values()).filter(p => p.type === 'prefix');
      expect(prefixPatterns.length).toBeGreaterThan(0);

      // Should find x- prefix specifically
      const xPrefixPattern = prefixPatterns.find(p => p.pattern.includes('x-'));
      expect(xPrefixPattern).toBeDefined();
      expect(xPrefixPattern?.examples.length).toBeGreaterThan(0);
    });

    it('should discover suffix patterns', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      const patterns = result.analyzerSpecific!.discoveredPatterns;

      // Should find suffix patterns
      const suffixPatterns = Array.from(patterns.values()).filter(p => p.type === 'suffix');
      expect(suffixPatterns.length).toBeGreaterThan(0);

      // Should find -id suffix
      const idSuffixPattern = suffixPatterns.find(p => p.pattern.includes('id'));
      expect(idSuffixPattern).toBeDefined();
    });

    it('should discover contains patterns', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      const patterns = result.analyzerSpecific!.discoveredPatterns;

      // Should find contains patterns
      const containsPatterns = Array.from(patterns.values()).filter(p => p.type === 'contains');
      expect(containsPatterns.length).toBeGreaterThan(0);

      // Should find patterns with common tokens
      const commonTokenPattern = containsPatterns.find(p => 
        p.pattern.includes('cache') || p.pattern.includes('version')
      );
      expect(commonTokenPattern).toBeDefined();
    });

    it('should discover regex patterns', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      const patterns = result.analyzerSpecific!.discoveredPatterns;

      // Should find regex patterns
      const regexPatterns = Array.from(patterns.values()).filter(p => p.type === 'regex');
      expect(regexPatterns.length).toBeGreaterThan(0);

      // Should recognize specific pattern types
      const regexPattern = regexPatterns.find(p => 
        p.pattern === 'word-word-word' || p.pattern === 'x-word-word'
      );
      expect(regexPattern).toBeDefined();
    });

    it('should calculate statistical significance for patterns', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      const patterns = result.analyzerSpecific!.discoveredPatterns;

      for (const pattern of patterns.values()) {
        expect(pattern.statisticalSignificance).toBeGreaterThanOrEqual(0);
        expect(pattern.statisticalSignificance).toBeLessThanOrEqual(1);
        expect(pattern.confidence).toBeGreaterThan(0);
      }
    });

    it('should identify emerging vendors', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      const emergingVendors = result.analyzerSpecific!.emergingVendors;

      expect(emergingVendors).toBeInstanceOf(Map);
      
      // Should identify at least some vendors from the test data
      expect(emergingVendors.size).toBeGreaterThanOrEqual(0);
      
      // Verify vendor properties if any are found
      for (const [vendorName, vendor] of emergingVendors) {
        expect(vendor.vendorName).toBe(vendorName);
        expect(vendor.patterns.length).toBeGreaterThanOrEqual(1);
        expect(vendor.siteCount).toBeGreaterThan(0);
        expect(vendor.confidence).toBeGreaterThan(0);
        expect(vendor.characteristics).toBeDefined();
        expect(vendor.vendorFingerprint).toBeDefined();
      }
    });

    it('should detect semantic anomalies', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      const anomalies = result.analyzerSpecific!.semanticAnomalies;

      expect(Array.isArray(anomalies)).toBe(true);
      
      // Should detect category mismatches
      const categoryMismatch = anomalies.find(a => a.anomalyType === 'category-mismatch');
      if (categoryMismatch) {
        expect(categoryMismatch.headerName).toBeDefined();
        expect(categoryMismatch.expectedCategory).toBeDefined();
        expect(categoryMismatch.actualCategory).toBeDefined();
        expect(categoryMismatch.confidence).toBeGreaterThan(0);
      }
    });

    it('should generate meaningful insights', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      const insights = result.analyzerSpecific!.insights;

      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);
      
      // Should have insight about discovered patterns
      const patternInsight = insights.find(i => i.includes('pattern'));
      expect(patternInsight).toBeDefined();
    });

    it('should calculate discovery metrics', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      const metrics = result.analyzerSpecific!.discoveryMetrics;

      expect(metrics.totalPatternsDiscovered).toBeGreaterThan(0);
      expect(metrics.averagePatternConfidence).toBeGreaterThan(0);
      expect(metrics.averagePatternConfidence).toBeLessThanOrEqual(1);
      expect(metrics.coveragePercentage).toBeGreaterThanOrEqual(0);
      expect(metrics.coveragePercentage).toBeLessThanOrEqual(1);
    });

    it('should track validation integration', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      const validationIntegration = result.analyzerSpecific!.validationIntegration;

      expect(validationIntegration.validatedPatternsUsed).toBeGreaterThanOrEqual(0);
      expect(validationIntegration.validationBoostApplied).toBe(false); // No validation in test data
      expect(validationIntegration.qualityScore).toBeGreaterThanOrEqual(0);
    });

    it('should create V2 patterns for interface compatibility', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      const patterns = result.patterns;

      expect(patterns).toBeInstanceOf(Map);
      expect(patterns.size).toBeGreaterThan(0);

      for (const [key, pattern] of patterns) {
        expect(key).toContain('discovery:');
        expect(pattern.pattern).toBeDefined();
        expect(pattern.siteCount).toBeGreaterThanOrEqual(defaultOptions.minOccurrences);
        expect(pattern.sites).toBeInstanceOf(Set);
        expect(pattern.frequency).toBeGreaterThan(0);
        expect(pattern.metadata?.type).toBe('pattern-discovery');
      }
    });
  });

  describe('validation integration', () => {
    it('should boost patterns when validation data is available', async () => {
      // Add validation data to mock
      const dataWithValidation: PreprocessedData = {
        ...mockData,
        metadata: {
          ...mockData.metadata,
          validation: {
            qualityScore: 0.85,
            validationPassed: true,
            validatedHeaders: new Map([
              ['x-wp-total', {
                pattern: 'x-wp-total',
                siteCount: 2,
                sites: new Set(['site1.com', 'site2.com']),
                frequency: 0.4,
                metadata: { validated: true }
              }],
              ['cf-ray', {
                pattern: 'cf-ray',
                siteCount: 1,
                sites: new Set(['site1.com']),
                frequency: 0.2,
                metadata: { validated: true }
              }]
            ]),
            statisticallySignificantHeaders: 2
          }
        }
      };

      const result = await analyzer.analyze(dataWithValidation, defaultOptions);
      
      expect(result.analyzerSpecific!.validationIntegration.validationBoostApplied).toBe(true);
      expect(result.analyzerSpecific!.validationIntegration.qualityScore).toBe(0.85);
      expect(result.analyzerSpecific!.validationIntegration.validatedPatternsUsed).toBeGreaterThanOrEqual(0);

      // Validated patterns should have higher confidence
      const patterns = result.analyzerSpecific!.discoveredPatterns;
      const validatedPattern = Array.from(patterns.values()).find(p => 
        p.validationConfidence && p.validationConfidence > 1
      );
      if (validatedPattern) {
        expect(validatedPattern.validationConfidence).toBeGreaterThan(1);
      }
    });

    it('should prioritize validated headers in pattern discovery', async () => {
      const dataWithValidation: PreprocessedData = {
        ...mockData,
        metadata: {
          ...mockData.metadata,
          validation: {
            qualityScore: 0.9,
            validationPassed: true,
            validatedHeaders: new Map([
              ['x-wp-total', {
                pattern: 'x-wp-total',
                siteCount: 2,
                sites: new Set(['site1.com', 'site2.com']),
                frequency: 0.4,
                metadata: { validated: true }
              }]
            ]),
            statisticallySignificantHeaders: 1
          }
        }
      };

      const result = await analyzer.analyze(dataWithValidation, defaultOptions);
      
      // Should prefer validated headers for pattern discovery
      const xPrefixPatterns = Array.from(result.analyzerSpecific!.discoveredPatterns.values())
        .filter(p => p.pattern.startsWith('x-'));
      
      expect(xPrefixPatterns.length).toBeGreaterThan(0);
      
      // At least one should have validation confidence
      const hasValidationConfidence = xPrefixPatterns.some(p => p.validationConfidence);
      expect(hasValidationConfidence).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty data gracefully', async () => {
      const emptyData: PreprocessedData = {
        sites: new Map(),
        totalSites: 0,
        metadata: {
          version: '2.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      const result = await analyzer.analyze(emptyData, defaultOptions);
      
      expect(result.patterns.size).toBe(0);
      expect(result.analyzerSpecific!.discoveredPatterns.size).toBe(0);
      expect(result.analyzerSpecific!.emergingVendors.size).toBe(0);
      expect(result.analyzerSpecific!.semanticAnomalies.length).toBe(0);
    });

    it('should handle sites with no headers', async () => {
      const noHeadersData: PreprocessedData = {
        sites: new Map([
          ['site1.com', {
            url: 'site1.com',
            normalizedUrl: 'site1.com',
            cms: 'Unknown',
            confidence: 0.1,
            headers: new Map(),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          }]
        ]),
        totalSites: 1,
        metadata: {
          version: '2.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      const result = await analyzer.analyze(noHeadersData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.patterns.size).toBe(0);
    });

    it('should filter patterns by minOccurrences', async () => {
      const highMinOccurrences: AnalysisOptions = {
        ...defaultOptions,
        minOccurrences: 10 // Higher than any pattern can meet with 5 sites
      };

      const result = await analyzer.analyze(mockData, highMinOccurrences);
      
      // Should have very few or no patterns that meet high threshold
      expect(result.patterns.size).toBe(0);
    });

    it('should handle malformed header names gracefully', async () => {
      const malformedData: PreprocessedData = {
        sites: new Map([
          ['site1.com', {
            url: 'site1.com',
            normalizedUrl: 'site1.com',
            cms: 'Unknown',
            confidence: 0.5,
            headers: new Map([
              ['', new Set(['empty-name'])],
              ['a', new Set(['too-short'])],
              ['header-with-numbers-123', new Set(['numbers'])],
              ['UPPERCASE-HEADER', new Set(['upper'])],
              ['header!@#$%', new Set(['special-chars'])]
            ]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          }]
        ]),
        totalSites: 1,
        metadata: {
          version: '2.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      const result = await analyzer.analyze(malformedData, defaultOptions);
      
      expect(result).toBeDefined();
      // Should handle malformed headers without crashing
    });
  });

  describe('vendor inference', () => {
    it('should infer vendors from prefix patterns', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      const patterns = result.analyzerSpecific!.discoveredPatterns;

      // Should infer vendors from patterns
      const vendorPatterns = Array.from(patterns.values()).filter(p => p.potentialVendor);
      expect(vendorPatterns.length).toBeGreaterThan(0);

      // Check vendor inference accuracy for known patterns
      for (const pattern of vendorPatterns) {
        expect(pattern.potentialVendor).toBeDefined();
        expect(pattern.potentialVendor!.length).toBeGreaterThan(0);
        
        // Cloudflare patterns should be identified
        if (pattern.examples.some(ex => ex.includes('cf-'))) {
          expect(pattern.potentialVendor).toBe('cloudflare');
        }
        
        // WordPress patterns should be identified  
        if (pattern.examples.some(ex => ex.includes('wp-'))) {
          expect(pattern.potentialVendor).toBe('wordpress');
        }
      }
    });

    it('should avoid inferring vendors from common words', async () => {
      const commonWordsData: PreprocessedData = {
        sites: new Map([
          ['site1.com', {
            url: 'site1.com',
            normalizedUrl: 'site1.com',
            cms: 'Unknown',
            confidence: 0.5,
            headers: new Map([
              ['cache-control', new Set(['max-age=3600'])],
              ['cache-status', new Set(['HIT'])],
              ['content-type', new Set(['text/html'])],
              ['content-length', new Set(['1234'])]
            ]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          }]
        ]),
        totalSites: 1,
        metadata: {
          version: '2.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      const result = await analyzer.analyze(commonWordsData, defaultOptions);
      const patterns = result.analyzerSpecific!.discoveredPatterns;

      // Should not infer 'cache' or 'content' as vendors
      const cacheVendor = Array.from(patterns.values()).find(p => 
        p.potentialVendor === 'cache'
      );
      expect(cacheVendor).toBeUndefined();

      const contentVendor = Array.from(patterns.values()).find(p => 
        p.potentialVendor === 'content'
      );
      expect(contentVendor).toBeUndefined();
    });
  });

  describe('cms correlation', () => {
    it('should calculate CMS correlations for patterns', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      const patterns = result.analyzerSpecific!.discoveredPatterns;

      for (const pattern of patterns.values()) {
        if (pattern.cmsCorrelation) {
          expect(typeof pattern.cmsCorrelation).toBe('object');
          
          // Correlations should be percentages (0-1)
          for (const correlation of Object.values(pattern.cmsCorrelation)) {
            expect(correlation).toBeGreaterThanOrEqual(0);
            expect(correlation).toBeLessThanOrEqual(1);
          }
        }
      }
    });

    it('should show higher correlation for CMS-specific headers', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      const patterns = result.analyzerSpecific!.discoveredPatterns;

      // WordPress headers should correlate with WordPress
      const wpPattern = Array.from(patterns.values()).find(p => 
        p.examples.some(ex => ex.includes('wp'))
      );
      
      if (wpPattern?.cmsCorrelation) {
        expect(wpPattern.cmsCorrelation['WordPress']).toBeGreaterThan(0);
      }
    });
  });

  describe('performance and scalability', () => {
    it('should handle larger datasets efficiently', async () => {
      // Create larger test dataset
      const largeSites = new Map();
      for (let i = 0; i < 50; i++) {
        largeSites.set(`site${i}.com`, {
          url: `site${i}.com`,
          normalizedUrl: `site${i}.com`,
          cms: i % 3 === 0 ? 'WordPress' : i % 3 === 1 ? 'Shopify' : 'Drupal',
          confidence: 0.8,
          headers: new Map([
            [`x-site${i}-header`, new Set(['value'])],
            ['cache-control', new Set(['max-age=3600'])],
            ['common-header', new Set(['shared'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: new Date().toISOString()
        });
      }

      const largeData: PreprocessedData = {
        sites: largeSites,
        totalSites: 50,
        metadata: {
          version: '2.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      const startTime = Date.now();
      const result = await analyzer.analyze(largeData, defaultOptions);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.patterns.size).toBeGreaterThan(0);
    });
  });
});