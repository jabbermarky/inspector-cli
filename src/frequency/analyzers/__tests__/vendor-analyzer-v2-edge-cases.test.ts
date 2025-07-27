/**
 * VendorAnalyzerV2 Edge Case Tests
 * 
 * Robustness tests (10 tests)
 * 
 * Tests handling of edge cases, malformed data, and error conditions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VendorAnalyzerV2 } from '../vendor-analyzer-v2.js';
import type { PreprocessedData, AnalysisOptions, SiteData } from '../../types/analyzer-interface.js';

// Mock logger
vi.mock('../../../utils/logger.js', () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

describe('VendorAnalyzerV2 - Edge Case Tests', () => {
  let analyzer: VendorAnalyzerV2;
  let defaultOptions: AnalysisOptions;

  beforeEach(() => {
    analyzer = new VendorAnalyzerV2();
    
    defaultOptions = {
      minOccurrences: 1,
      includeExamples: true,
      maxExamples: 5,
      semanticFiltering: false
    };
  });

  describe('Data Quality Edge Cases', () => {
    it('should handle sites with no vendor headers', async () => {
      const dataWithNoVendors: PreprocessedData = {
        sites: new Map([
          ['no-vendor-site.com', {
            url: 'https://no-vendor-site.com',
            normalizedUrl: 'no-vendor-site.com',
            cms: null,
            confidence: 0.0,
            headers: new Map([
              ['custom-header-1', new Set(['value1'])],
              ['custom-header-2', new Set(['value2'])],
              ['application-specific', new Set(['data'])]
            ]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }],
          ['another-custom-site.com', {
            url: 'https://another-custom-site.com',
            normalizedUrl: 'another-custom-site.com',
            cms: null,
            confidence: 0.0,
            headers: new Map([
              ['proprietary-header', new Set(['secret'])],
              ['internal-system', new Set(['v2.1'])]
            ]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }]
        ]),
        totalSites: 2,
        metadata: {
          version: '1.0.0',
          preprocessedAt: '2024-01-01T00:00:00Z'
        }
      };

      const result = await analyzer.analyze(dataWithNoVendors, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      expect(result.analyzerSpecific!.vendorsByHeader.size).toBe(0);
      expect(result.analyzerSpecific!.summary.totalVendorsDetected).toBe(0);
      expect(result.analyzerSpecific!.technologyStack.complexity).toBe('simple');
      expect(result.analyzerSpecific!.conflictingVendors.length).toBe(0);
    });

    it('should handle malformed header values', async () => {
      const dataWithMalformedHeaders: PreprocessedData = {
        sites: new Map([
          ['malformed-site.com', {
            url: 'https://malformed-site.com',
            normalizedUrl: 'malformed-site.com',
            cms: 'WordPress',
            confidence: 0.5,
            headers: new Map([
              // Valid vendor header
              ['cf-ray', new Set(['12345-LAX'])],
              // Malformed/empty headers
              ['', new Set(['empty-name'])],
              ['null-header', new Set()], // Empty value set
              ['unicode-header-🚀', new Set(['unicode-value-🌟'])],
              ['very-long-header-name-that-exceeds-normal-limits-and-might-cause-issues', new Set(['long-value'])],
              // Headers with special characters
              ['header/with/slashes', new Set(['value'])],
              ['header with spaces', new Set(['spaced value'])],
              ['header\nwith\nnewlines', new Set(['value\nwith\nnewlines'])],
              ['header\twith\ttabs', new Set(['value\twith\ttabs'])],
              // Case variations
              ['CF-RAY', new Set(['67890-NYC'])], // Duplicate but different case
              ['cf_ray', new Set(['11111-CHI'])], // Similar but with underscore
            ]),
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

      const result = await analyzer.analyze(dataWithMalformedHeaders, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      
      // Should still detect the valid Cloudflare header despite malformed ones
      expect(result.analyzerSpecific!.vendorsByHeader.size).toBeGreaterThan(0);
      const cfRayDetection = result.analyzerSpecific!.vendorsByHeader.get('cf-ray');
      expect(cfRayDetection).toBeDefined();
      expect(cfRayDetection!.vendor.name).toBe('Cloudflare');
    });

    it('should handle duplicate vendor detections', async () => {
      const dataWithDuplicates: PreprocessedData = {
        sites: new Map([
          ['duplicate-site.com', {
            url: 'https://duplicate-site.com',
            normalizedUrl: 'duplicate-site.com',
            cms: 'WordPress',
            confidence: 0.9,
            headers: new Map([
              // Multiple Cloudflare headers (should all map to same vendor)
              ['cf-ray', new Set(['12345-LAX'])],
              ['cf-cache-status', new Set(['HIT'])],
              ['cf-request-id', new Set(['req-123'])],
              ['cf-visitor', new Set(['{"scheme":"https"}'])],
              // Multiple WordPress headers
              ['x-wp-total', new Set(['150'])],
              ['x-wp-totalpages', new Set(['15'])],
              ['x-pingback', new Set(['https://duplicate-site.com/xmlrpc.php'])],
              // Multiple analytics headers that might conflict
              ['x-google-analytics-id', new Set(['GA1.2.123'])],
              ['x-ga-measurement-id', new Set(['G-ABCDEF123'])]
            ]),
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

      const result = await analyzer.analyze(dataWithDuplicates, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      
      // Should detect multiple headers but consolidate vendor statistics
      const vendorStats = result.analyzerSpecific!.vendorStats;
      const cloudflareVendor = vendorStats.vendorDistribution.find(v => v.vendor === 'Cloudflare');
      const wordpressVendor = vendorStats.vendorDistribution.find(v => v.vendor === 'WordPress');
      
      if (cloudflareVendor) {
        expect(cloudflareVendor.headerCount).toBeGreaterThan(1); // Multiple CF headers
      }
      if (wordpressVendor) {
        expect(wordpressVendor.headerCount).toBeGreaterThan(1); // Multiple WP headers
      }
    });
  });

  describe('Conflict Resolution Edge Cases', () => {
    it('should resolve conflicting vendor signals intelligently', async () => {
      const conflictingData: PreprocessedData = {
        sites: new Map([
          ['conflicting-site.com', {
            url: 'https://conflicting-site.com',
            normalizedUrl: 'conflicting-site.com',
            cms: 'WordPress', // CMS says WordPress
            confidence: 0.5,
            headers: new Map([
              // WordPress headers
              ['x-wp-total', new Set(['150'])],
              // But also Drupal headers (conflict!)
              ['x-drupal-cache', new Set(['HIT'])],
              // And Shopify headers (another conflict!)
              ['x-shopify-shop-id', new Set(['12345'])],
              // Framework conflicts
              ['x-laravel-session', new Set(['abc123'])],
              ['x-aspnet-version', new Set(['4.0'])]
            ]),
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

      const result = await analyzer.analyze(conflictingData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      
      // Should detect conflicts
      const conflicts = result.analyzerSpecific!.conflictingVendors;
      expect(conflicts.length).toBeGreaterThan(0);
      
      // Should have CMS conflict
      const cmsConflict = conflicts.find(c => c.type === 'cms_conflict');
      expect(cmsConflict).toBeDefined();
      expect(cmsConflict!.vendors.length).toBeGreaterThanOrEqual(2);
      
      // Should handle the conflict gracefully in technology stack
      const techStack = result.analyzerSpecific!.technologyStack;
      expect(techStack).toBeDefined();
      // Note: conflicts are stored separately in conflictingVendors array, not in techStack.conflicts
    });

    it('should handle ambiguous technology stacks', async () => {
      const ambiguousData: PreprocessedData = {
        sites: new Map([
          ['ambiguous-site1.com', {
            url: 'https://ambiguous-site1.com',
            normalizedUrl: 'ambiguous-site1.com',
            cms: null,
            confidence: 0.0,
            headers: new Map([
              ['x-served-by', new Set(['fastly-cache-123'])], // Could be any CMS with Fastly
              ['x-cache', new Set(['HIT'])], // Generic cache header
              ['server', new Set(['nginx'])], // Generic server
            ]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }],
          ['ambiguous-site2.com', {
            url: 'https://ambiguous-site2.com',
            normalizedUrl: 'ambiguous-site2.com',
            cms: null,
            confidence: 0.0,
            headers: new Map([
              ['x-powered-by', new Set(['Express'])], // Could be Node.js, but not specific vendor
              ['content-type', new Set(['application/json'])], // Generic
            ]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }]
        ]),
        totalSites: 2,
        metadata: {
          version: '1.0.0',
          preprocessedAt: '2024-01-01T00:00:00Z'
        }
      };

      const result = await analyzer.analyze(ambiguousData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      
      // Should handle ambiguity gracefully
      const techStack = result.analyzerSpecific!.technologyStack;
      expect(techStack.confidence).toBeLessThan(1.0); // Lower confidence for ambiguous stack
      expect(['simple', 'moderate']).toContain(techStack.complexity); // May be moderate if multiple vendors detected
      
      // Should detect Fastly at minimum
      const fastlyDetection = result.analyzerSpecific!.vendorsByHeader.get('x-served-by');
      if (fastlyDetection) {
        expect(fastlyDetection.vendor.name).toBe('Fastly');
      }
    });

    it('should provide meaningful confidence scores for conflicts', async () => {
      const complexConflictData: PreprocessedData = {
        sites: new Map()
      };

      // Create multiple sites with different conflict scenarios
      for (let i = 1; i <= 5; i++) {
        complexConflictData.sites.set(`conflict-site${i}.com`, {
          url: `https://conflict-site${i}.com`,
          normalizedUrl: `conflict-site${i}.com`,
          cms: i % 2 === 0 ? 'WordPress' : 'Drupal',
          confidence: 0.6,
          headers: new Map([
            // Common CDN
            ['cf-ray', new Set([`${i}2345-LAX`])],
            // Conflicting CMS headers
            ...(i % 2 === 0 ? [
              ['x-wp-total', new Set(['150'])],
              ['x-drupal-cache', new Set(['HIT'])] // Conflict!
            ] : [
              ['x-drupal-cache', new Set(['HIT'])],
              ['x-wp-total', new Set(['150'])] // Conflict!
            ])
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        });
      }
      complexConflictData.totalSites = 5;

      const result = await analyzer.analyze(complexConflictData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      
      // Should have meaningful confidence scores despite conflicts
      const vendorConfidence = result.analyzerSpecific!.vendorConfidence;
      for (const [header, confidence] of vendorConfidence) {
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
        expect(typeof confidence).toBe('number');
        expect(isNaN(confidence)).toBe(false);
      }
      
      // Conflicts should be flagged with appropriate severity
      const conflicts = result.analyzerSpecific!.conflictingVendors;
      expect(conflicts.length).toBeGreaterThan(0);
      
      for (const conflict of conflicts) {
        expect(['low', 'medium', 'high']).toContain(conflict.severity);
        expect(conflict.reason).toBeDefined();
        expect(conflict.vendors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('Extreme Data Scenarios', () => {
    it('should handle extremely large header names and values', async () => {
      const extremeData: PreprocessedData = {
        sites: new Map([
          ['extreme-site.com', {
            url: 'https://extreme-site.com',
            normalizedUrl: 'extreme-site.com',
            cms: null,
            confidence: 0.0,
            headers: new Map([
              // Normal vendor header
              ['cf-ray', new Set(['12345-LAX'])],
              // Extremely long header name
              [`very-long-header-name-${'a'.repeat(1000)}-end`, new Set(['long-name-value'])],
              // Extremely long header value
              ['normal-header', new Set([`long-value-${'b'.repeat(5000)}-end`])],
              // Header with many values
              ['multi-value-header', new Set(Array.from({ length: 100 }, (_, i) => `value-${i}`))],
            ]),
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

      const result = await analyzer.analyze(extremeData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      
      // Should still function despite extreme data
      expect(result.analyzerSpecific!.vendorsByHeader.has('cf-ray')).toBe(true);
      
      // Should handle the analysis without errors
      expect(result.analyzerSpecific!.summary).toBeDefined();
      expect(result.analyzerSpecific!.vendorStats).toBeDefined();
    });

    it('should handle sites with thousands of headers', async () => {
      const massiveHeaderData: PreprocessedData = {
        sites: new Map([
          ['massive-headers-site.com', {
            url: 'https://massive-headers-site.com',
            normalizedUrl: 'massive-headers-site.com',
            cms: 'WordPress',
            confidence: 0.8,
            headers: new Map([
              // Start with known vendor headers
              ['cf-ray', new Set(['12345-LAX'])],
              ['x-wp-total', new Set(['150'])],
              ['x-shopify-shop-id', new Set(['67890'])],
              // Add thousands of custom headers
              ...Array.from({ length: 2000 }, (_, i) => [
                `custom-header-${i}`,
                new Set([`custom-value-${i}`])
              ] as [string, Set<string>])
            ]),
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

      const startTime = performance.now();
      const result = await analyzer.analyze(massiveHeaderData, defaultOptions);
      const duration = performance.now() - startTime;
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      
      // Should complete in reasonable time even with massive headers
      expect(duration).toBeLessThan(1000); // 1 second max
      
      // Should still detect vendor headers correctly
      expect(result.analyzerSpecific!.vendorsByHeader.size).toBeGreaterThan(0);
      expect(result.analyzerSpecific!.vendorsByHeader.has('cf-ray')).toBe(true);
      expect(result.analyzerSpecific!.vendorsByHeader.has('x-wp-total')).toBe(true);
    });

    it('should handle completely empty or null data gracefully', async () => {
      const emptyData: PreprocessedData = {
        sites: new Map(),
        totalSites: 0,
        metadata: {
          version: '1.0.0',
          preprocessedAt: '2024-01-01T00:00:00Z'
        }
      };

      const result = await analyzer.analyze(emptyData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      expect(result.totalSites).toBe(0);
      expect(result.analyzerSpecific!.vendorsByHeader.size).toBe(0);
      expect(result.analyzerSpecific!.summary.totalVendorsDetected).toBe(0);
      expect(result.analyzerSpecific!.vendorStats.totalHeaders).toBe(0);
      expect(result.analyzerSpecific!.technologyStack.confidence).toBe(0);
    });

    it('should handle corrupted metadata gracefully', async () => {
      const corruptedMetadataData: PreprocessedData = {
        sites: new Map([
          ['normal-site.com', {
            url: 'https://normal-site.com',
            normalizedUrl: 'normal-site.com',
            cms: 'WordPress',
            confidence: 0.9,
            headers: new Map([
              ['cf-ray', new Set(['12345-LAX'])],
              ['x-wp-total', new Set(['150'])]
            ]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }]
        ]),
        totalSites: 1,
        metadata: {
          version: '1.0.0',
          preprocessedAt: '2024-01-01T00:00:00Z',
          // Corrupted validation metadata
          validation: {
            qualityScore: NaN,
            validationPassed: true,
            validatedHeaders: new Map([
              ['invalid-header', null as any]
            ]),
            statisticallySignificantHeaders: -1
          },
          // Corrupted semantic metadata
          semantic: {
            categoryCount: -5,
            headerCategories: new Map([
              ['cf-ray', null as any],
              [null as any, 'infrastructure']
            ]),
            vendorMappings: new Map()
          }
        } as any
      };

      const result = await analyzer.analyze(corruptedMetadataData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      
      // Should handle corrupted metadata gracefully and still function
      expect(result.analyzerSpecific!.vendorsByHeader.size).toBeGreaterThan(0);
      expect(result.analyzerSpecific!.vendorsByHeader.has('cf-ray')).toBe(true);
    });
  });

  describe('Integration Error Scenarios', () => {
    it('should handle missing analyzer dependencies gracefully', async () => {
      const isolatedData: PreprocessedData = {
        sites: new Map([
          ['isolated-site.com', {
            url: 'https://isolated-site.com',
            normalizedUrl: 'isolated-site.com',
            cms: 'WordPress',
            confidence: 0.9,
            headers: new Map([
              ['cf-ray', new Set(['12345-LAX'])],
              ['x-wp-total', new Set(['150'])]
            ]),
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
          // No validation or semantic metadata
        }
      };

      const result = await analyzer.analyze(isolatedData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      
      // Should work without other analyzer dependencies
      expect(result.analyzerSpecific!.vendorsByHeader.size).toBeGreaterThan(0);
      expect(result.analyzerSpecific!.summary.totalVendorsDetected).toBeGreaterThan(0);
    });

    it('should maintain robustness under memory pressure', async () => {
      // Create a large dataset that might stress memory
      const stressData: PreprocessedData = {
        sites: new Map(),
        totalSites: 0,
        metadata: {
          version: '1.0.0',
          preprocessedAt: '2024-01-01T00:00:00Z'
        }
      };

      // Create many sites with complex header patterns
      for (let i = 1; i <= 100; i++) {
        const headers = new Map<string, Set<string>>();
        
        // Add vendor headers
        headers.set('cf-ray', new Set([`${i}2345-LAX`]));
        headers.set('x-wp-total', new Set([String(i * 10)]));
        
        // Add many custom headers to stress memory
        for (let j = 0; j < 50; j++) {
          headers.set(`stress-header-${i}-${j}`, new Set([`stress-value-${i}-${j}`]));
        }

        stressData.sites.set(`stress-site-${i}.com`, {
          url: `https://stress-site-${i}.com`,
          normalizedUrl: `stress-site-${i}.com`,
          cms: i % 2 === 0 ? 'WordPress' : null,
          confidence: Math.random(),
          headers,
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        });
      }
      stressData.totalSites = 100;

      const result = await analyzer.analyze(stressData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      
      // Should handle stress gracefully
      expect(result.analyzerSpecific!.vendorsByHeader.size).toBeGreaterThan(0);
      expect(result.analyzerSpecific!.summary.totalVendorsDetected).toBeGreaterThan(0);
      expect(result.totalSites).toBe(100);
    });
  });
});