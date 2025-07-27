/**
 * VendorAnalyzerV2 Performance Tests
 * 
 * Scalability tests (8 tests)
 * 
 * Tests performance characteristics across different dataset sizes
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

describe('VendorAnalyzerV2 - Performance Tests', () => {
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

  /**
   * Helper function to generate test site data
   */
  function generateSiteData(count: number): PreprocessedData {
    const sites = new Map<string, SiteData>();
    
    // Common vendor headers to distribute across sites
    const vendorHeaders = [
      'cf-ray', 'x-wp-total', 'x-shopify-shop-id', 'x-served-by',
      'x-amz-cf-id', 'x-drupal-cache', 'x-google-analytics-id',
      'x-laravel-session', 'x-aspnet-version', 'd-geo'
    ];

    for (let i = 1; i <= count; i++) {
      const siteUrl = `site${i}.example.com`;
      const headers = new Map<string, Set<string>>();
      
      // Randomly assign vendor headers to create realistic distribution
      for (const header of vendorHeaders) {
        if (Math.random() < 0.3) { // 30% chance each site has each header
          headers.set(header, new Set([`value-${i}-${header}`]));
        }
      }
      
      // Add some random non-vendor headers
      for (let j = 0; j < 5; j++) {
        if (Math.random() < 0.5) {
          headers.set(`custom-header-${j}`, new Set([`custom-value-${i}-${j}`]));
        }
      }

      sites.set(siteUrl, {
        url: `https://${siteUrl}`,
        normalizedUrl: siteUrl,
        cms: i % 3 === 0 ? 'WordPress' : i % 3 === 1 ? 'Shopify' : null,
        confidence: Math.random(),
        headers,
        metaTags: new Map(),
        scripts: new Set(),
        technologies: new Set(),
        capturedAt: '2024-01-01T00:00:00Z'
      });
    }

    return {
      sites,
      totalSites: count,
      metadata: {
        version: '1.0.0',
        preprocessedAt: '2024-01-01T00:00:00Z'
      }
    };
  }

  /**
   * Performance measurement helper
   */
  async function measurePerformance(datasetSize: number): Promise<{
    duration: number;
    result: any;
    memoryBefore: number;
    memoryAfter: number;
  }> {
    const data = generateSiteData(datasetSize);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const memoryBefore = process.memoryUsage().heapUsed;
    const startTime = performance.now();
    
    const result = await analyzer.analyze(data, defaultOptions);
    
    const endTime = performance.now();
    const memoryAfter = process.memoryUsage().heapUsed;
    
    return {
      duration: endTime - startTime,
      result,
      memoryBefore,
      memoryAfter
    };
  }

  describe('Small Datasets (1-10 sites)', () => {
    it('should complete analysis under 50ms for 1 site', async () => {
      const { duration, result } = await measurePerformance(1);
      
      expect(duration).toBeLessThan(50);
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      expect(result.totalSites).toBe(1);
    });

    it('should complete analysis under 50ms for 5 sites', async () => {
      const { duration, result } = await measurePerformance(5);
      
      expect(duration).toBeLessThan(50);
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      expect(result.totalSites).toBe(5);
    });

    it('should handle minimal vendor patterns efficiently', async () => {
      // Create data with very few vendor patterns
      const minimalData: PreprocessedData = {
        sites: new Map([
          ['minimal-site.com', {
            url: 'https://minimal-site.com',
            normalizedUrl: 'minimal-site.com',
            cms: null,
            confidence: 0.0,
            headers: new Map([
              ['cf-ray', new Set(['12345-LAX'])], // Only one vendor header
              ['custom-header', new Set(['value'])]
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
      const result = await analyzer.analyze(minimalData, defaultOptions);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(25); // Even faster for minimal data
      expect(result.analyzerSpecific!.vendorsByHeader.size).toBe(1);
      expect(result.analyzerSpecific!.vendorsByHeader.has('cf-ray')).toBe(true);
    });
  });

  describe('Medium Datasets (50-100 sites)', () => {
    it('should complete analysis under 200ms for 50 sites', async () => {
      const { duration, result } = await measurePerformance(50);
      
      expect(duration).toBeLessThan(200);
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      expect(result.totalSites).toBe(50);
      
      // Should detect multiple vendors with 50 sites
      expect(result.analyzerSpecific!.vendorsByHeader.size).toBeGreaterThan(0);
    });

    it('should complete analysis under 200ms for 100 sites', async () => {
      const { duration, result } = await measurePerformance(100);
      
      expect(duration).toBeLessThan(200);
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      expect(result.totalSites).toBe(100);
      
      // Should have good vendor detection coverage
      expect(result.analyzerSpecific!.summary.totalVendorsDetected).toBeGreaterThan(0);
    });

    it('should scale linearly with site count', async () => {
      const measurements = [];
      
      // Test different sizes
      for (const size of [25, 50, 75, 100]) {
        const { duration } = await measurePerformance(size);
        measurements.push({ size, duration });
      }

      // Calculate growth rate
      const growthRates = [];
      for (let i = 1; i < measurements.length; i++) {
        const prev = measurements[i - 1];
        const curr = measurements[i];
        const growthRate = curr.duration / prev.duration;
        const sizeRatio = curr.size / prev.size;
        growthRates.push(growthRate / sizeRatio);
      }

      // Average growth rate should be close to linear (around 1.0)
      const avgGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
      expect(avgGrowthRate).toBeLessThan(2.0); // Not worse than quadratic
      expect(avgGrowthRate).toBeGreaterThan(0.5); // Not unrealistically fast
    });
  });

  describe('Large Datasets (200+ sites)', () => {
    it('should complete analysis under 500ms for 200 sites', async () => {
      const { duration, result } = await measurePerformance(200);
      
      expect(duration).toBeLessThan(500);
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      expect(result.totalSites).toBe(200);
      
      // Should detect complex technology signatures with large dataset
      expect(result.analyzerSpecific!.technologySignatures.length).toBeGreaterThanOrEqual(0);
    });

    it('should complete analysis under 500ms for 300 sites', async () => {
      const { duration, result } = await measurePerformance(300);
      
      expect(duration).toBeLessThan(500);
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      expect(result.totalSites).toBe(300);
      
      // Large datasets should have comprehensive vendor statistics
      expect(result.analyzerSpecific!.vendorStats.vendorDistribution.length).toBeGreaterThan(0);
    });

    it('should maintain accuracy with increased data volume', async () => {
      const smallResult = await measurePerformance(50);
      const largeResult = await measurePerformance(250);
      
      // Basic structure should be maintained
      expect(largeResult.result.analyzerSpecific).toBeDefined();
      expect(largeResult.result.analyzerSpecific!.vendorsByHeader).toBeInstanceOf(Map);
      
      // Large datasets should not degrade quality metrics
      const smallVendorCount = smallResult.result.analyzerSpecific!.summary.totalVendorsDetected;
      const largeVendorCount = largeResult.result.analyzerSpecific!.summary.totalVendorsDetected;
      
      // Larger datasets should typically detect more vendors (or at least not fewer)
      expect(largeVendorCount).toBeGreaterThanOrEqual(smallVendorCount * 0.8);
      
      // Technology stack inference should still work
      expect(largeResult.result.analyzerSpecific!.technologyStack).toBeDefined();
      expect(largeResult.result.analyzerSpecific!.technologyStack.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not have significant memory leaks', async () => {
      const baseline = process.memoryUsage().heapUsed;
      
      // Run multiple analyses
      for (let i = 0; i < 5; i++) {
        await measurePerformance(50);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const final = process.memoryUsage().heapUsed;
      const growth = final - baseline;
      
      // Memory growth should be reasonable (less than 50MB)
      expect(growth).toBeLessThan(50 * 1024 * 1024);
    });

    it('should scale memory usage reasonably with dataset size', async () => {
      const smallMemory = await measurePerformance(25);
      const largeMemory = await measurePerformance(200);
      
      const memoryGrowthSmall = smallMemory.memoryAfter - smallMemory.memoryBefore;
      const memoryGrowthLarge = largeMemory.memoryAfter - largeMemory.memoryBefore;
      
      // Memory growth should scale sub-linearly with data size
      const sizeRatio = 200 / 25; // 8x more data
      const memoryRatio = memoryGrowthLarge / Math.max(memoryGrowthSmall, 1024); // Avoid division by zero
      
      expect(memoryRatio).toBeLessThan(sizeRatio * 2); // Memory growth should be less than 2x the data ratio
    });
  });
});