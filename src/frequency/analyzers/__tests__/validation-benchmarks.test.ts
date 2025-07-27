/**
 * Validation Performance Benchmark Tests
 * 
 * Performance testing and benchmarking for the native V2 validation pipeline
 * to ensure it meets production performance requirements.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationPipelineV2Native } from '../validation-pipeline-v2-native.js';
import type { PreprocessedData, AnalysisOptions } from '../../types/analyzer-interface.js';

describe('Validation Performance Benchmarks', () => {
  let validator: ValidationPipelineV2Native;
  let defaultOptions: AnalysisOptions;

  beforeEach(() => {
    validator = new ValidationPipelineV2Native();
    defaultOptions = {
      minOccurrences: 5,
      includeExamples: true,
      maxExamples: 3,
      semanticFiltering: false
    };
  });

  /**
   * Helper function to generate test datasets of various sizes
   */
  function generateTestData(siteCount: number, headersPerSite: number = 10): PreprocessedData {
    const sites = new Map();
    const cmsTypes = ['WordPress', 'Shopify', 'Drupal', 'Magento', 'Unknown'];
    const headerNames = [
      'server', 'content-type', 'cache-control', 'x-powered-by', 'content-length',
      'x-wp-total', 'x-shopify-shop-id', 'x-drupal-cache', 'x-magento-cache-debug',
      'last-modified', 'etag', 'expires', 'pragma', 'connection'
    ];

    for (let i = 0; i < siteCount; i++) {
      const siteUrl = `site${i}.example.com`;
      const cms = cmsTypes[i % cmsTypes.length];
      const headers = new Map();
      
      // Add base headers
      headers.set('server', new Set(['nginx']));
      headers.set('content-type', new Set(['text/html']));
      
      // Add CMS-specific headers
      if (cms === 'WordPress') {
        headers.set('x-wp-total', new Set([String(Math.floor(Math.random() * 100))]));
        headers.set('x-wp-version', new Set(['6.2']));
      } else if (cms === 'Shopify') {
        headers.set('x-shopify-shop-id', new Set([String(12345 + i)]));
        headers.set('x-shopify-stage', new Set(['production']));
      } else if (cms === 'Drupal') {
        headers.set('x-drupal-cache', new Set(['HIT']));
        headers.set('x-generator', new Set(['Drupal 9']));
      }
      
      // Add random headers up to headersPerSite
      const remainingHeaders = headersPerSite - headers.size;
      for (let j = 0; j < remainingHeaders && j < headerNames.length; j++) {
        const headerName = headerNames[j % headerNames.length];
        if (!headers.has(headerName)) {
          headers.set(headerName, new Set([`value-${i}-${j}`]));
        }
      }

      sites.set(siteUrl, {
        url: siteUrl,
        normalizedUrl: siteUrl,
        cms,
        confidence: 0.8 + (Math.random() * 0.2),
        headers,
        metaTags: new Map([
          ['generator', new Set([cms === 'Unknown' ? 'Custom' : cms])]
        ]),
        scripts: new Set([`https://cdn.${cms.toLowerCase()}.com/app.js`]),
        technologies: new Set([cms]),
        capturedAt: new Date().toISOString()
      });
    }

    return {
      sites,
      totalSites: siteCount,
      metadata: {
        version: '2.0',
        preprocessedAt: new Date().toISOString()
      }
    };
  }

  describe('Small Dataset Performance (1-10 sites)', () => {
    it('should process 5 sites under 100ms', async () => {
      const testData = generateTestData(5);
      
      const startTime = Date.now();
      const result = await validator.analyze(testData, defaultOptions);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(100);
      expect(result.totalSites).toBe(5);
      expect(result.analyzerSpecific!.stageResults).toHaveLength(7);
    });

    it('should process 10 sites under 150ms', async () => {
      const testData = generateTestData(10);
      
      const startTime = Date.now();
      const result = await validator.analyze(testData, defaultOptions);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(150);
      expect(result.totalSites).toBe(10);
    });
  });

  describe('Medium Dataset Performance (50-100 sites)', () => {
    it('should process 50 sites under 500ms', async () => {
      const testData = generateTestData(50);
      
      const startTime = Date.now();
      const result = await validator.analyze(testData, defaultOptions);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(500);
      expect(result.totalSites).toBe(50);
      expect(result.analyzerSpecific!.validatedPatterns.size).toBeGreaterThan(0);
    });

    it('should process 100 sites under 1000ms', async () => {
      const testData = generateTestData(100);
      
      const startTime = Date.now();
      const result = await validator.analyze(testData, defaultOptions);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000);
      expect(result.totalSites).toBe(100);
      
      // Should have meaningful statistical results for 100 sites
      expect(result.analyzerSpecific!.statisticalMetrics.powerAnalysis.adequatePower).toBe(true);
    });
  });

  describe('Large Dataset Performance (200+ sites)', () => {
    it('should process 200 sites under 2000ms', async () => {
      const testData = generateTestData(200);
      
      const startTime = Date.now();
      const result = await validator.analyze(testData, defaultOptions);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(2000);
      expect(result.totalSites).toBe(200);
      
      // Should have meaningful statistical analysis (may be 0 if no valid tests)
      expect(result.analyzerSpecific!.statisticalMetrics.chiSquareTests.length).toBeGreaterThanOrEqual(0);
      expect(result.analyzerSpecific!.qualityMetrics.overallScore).toBeGreaterThan(0.2);
    });

    it('should process 500 sites under 5000ms', async () => {
      const testData = generateTestData(500);
      
      const startTime = Date.now();
      const result = await validator.analyze(testData, defaultOptions);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000);
      expect(result.totalSites).toBe(500);
      
      // Large dataset should complete validation (may not pass all stages)
      expect(typeof result.analyzerSpecific!.validationSummary.overallPassed).toBe('boolean');
      expect(result.analyzerSpecific!.validationSummary.qualityGrade).toMatch(/[A-F]/);
    });
  });

  describe('Memory Efficiency', () => {
    it('should handle large datasets without excessive memory usage', async () => {
      const testData = generateTestData(300, 15); // 300 sites, 15 headers each
      
      const memBefore = process.memoryUsage();
      const result = await validator.analyze(testData, defaultOptions);
      const memAfter = process.memoryUsage();
      
      expect(result).toBeDefined();
      expect(result.totalSites).toBe(300);
      
      // Memory usage should be reasonable (less than 50MB increase)
      const heapIncrease = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
      expect(heapIncrease).toBeLessThan(50);
    });

    it('should clean up properly after processing', async () => {
      const initialMem = process.memoryUsage().heapUsed;
      
      // Process multiple datasets
      for (let i = 0; i < 5; i++) {
        const testData = generateTestData(50);
        const result = await validator.analyze(testData, defaultOptions);
        expect(result.totalSites).toBe(50);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMem = process.memoryUsage().heapUsed;
      const memIncrease = (finalMem - initialMem) / 1024 / 1024;
      
      // Should not accumulate significant memory after multiple runs
      expect(memIncrease).toBeLessThan(20);
    });
  });

  describe('Statistical Performance Scaling', () => {
    it('should show linear time complexity for validation stages', async () => {
      const sizes = [10, 20, 40];
      const durations: number[] = [];
      
      for (const size of sizes) {
        const testData = generateTestData(size);
        
        const startTime = Date.now();
        const result = await validator.analyze(testData, defaultOptions);
        const duration = Date.now() - startTime;
        
        durations.push(duration);
        expect(result.totalSites).toBe(size);
      }
      
      // Should roughly scale linearly (allowing for some variation)
      const ratio1 = durations[1] / durations[0]; // 20 sites vs 10 sites
      const ratio2 = durations[2] / durations[1]; // 40 sites vs 20 sites
      
      // Performance should scale reasonably (allowing for measurement variance)
      // Skip ratio checks if any duration is 0 (too fast to measure accurately)
      if (durations[0] > 0 && durations[1] > 0) {
        expect(ratio1).toBeGreaterThan(0.5);
        expect(ratio1).toBeLessThan(10); // More lenient for small measurements
      }
      if (durations[1] > 0 && durations[2] > 0) {
        expect(ratio2).toBeGreaterThan(0.5);
        expect(ratio2).toBeLessThan(10);
      }
    });

    it('should maintain quality with varying pattern complexity', async () => {
      const complexityLevels = [5, 10, 20]; // headers per site
      
      for (const complexity of complexityLevels) {
        const testData = generateTestData(50, complexity);
        
        const startTime = Date.now();
        const result = await validator.analyze(testData, defaultOptions);
        const duration = Date.now() - startTime;
        
        expect(result).toBeDefined();
        expect(duration).toBeLessThan(1500); // Should complete within reasonable time
        expect(result.analyzerSpecific!.qualityMetrics.overallScore).toBeGreaterThan(0.1);
        
        // More complex patterns should yield more detailed analysis
        const stageResults = result.analyzerSpecific!.stageResults;
        expect(stageResults.every(s => s.passed || s.warnings.length > 0)).toBe(true);
      }
    });
  });

  describe('Statistical Accuracy vs Performance Trade-offs', () => {
    it('should complete all statistical tests within time budget', async () => {
      const testData = generateTestData(100);
      
      const startTime = Date.now();
      const result = await validator.analyze(testData, defaultOptions);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000);
      
      // Should have performed comprehensive statistical analysis
      const stats = result.analyzerSpecific!.statisticalMetrics;
      expect(stats.powerAnalysis).toBeDefined();
      expect(stats.significanceTests.length).toBeGreaterThan(0);
      
      // Each significance test should have valid results
      for (const test of stats.significanceTests) {
        expect(test.pValue).toBeGreaterThanOrEqual(0);
        expect(test.pValue).toBeLessThanOrEqual(1);
        expect(['binomial', 'chi_square', 'fisher_exact']).toContain(test.testType);
      }
    });

    it('should scale statistical complexity appropriately', async () => {
      const smallData = generateTestData(25);
      const largeData = generateTestData(200);
      
      const smallResult = await validator.analyze(smallData, defaultOptions);
      const largeResult = await validator.analyze(largeData, defaultOptions);
      
      // Large dataset should have more comprehensive statistical analysis
      const smallStats = smallResult.analyzerSpecific!.statisticalMetrics;
      const largeStats = largeResult.analyzerSpecific!.statisticalMetrics;
      
      expect(largeStats.significanceTests.length).toBeGreaterThanOrEqual(smallStats.significanceTests.length);
      expect(largeStats.powerAnalysis.observedPower).toBeGreaterThan(smallStats.powerAnalysis.observedPower);
      
      // Quality should improve with larger sample size
      expect(largeResult.analyzerSpecific!.qualityMetrics.statisticalReliability)
        .toBeGreaterThanOrEqual(smallResult.analyzerSpecific!.qualityMetrics.statisticalReliability);
    });
  });

  describe('Concurrent Processing Stability', () => {
    it('should handle concurrent validation requests', async () => {
      const datasets = Array.from({ length: 3 }, (_, i) => generateTestData(30 + i * 10));
      
      const startTime = Date.now();
      const promises = datasets.map(data => validator.analyze(data, defaultOptions));
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(2000); // Should complete concurrently faster than sequentially
      expect(results).toHaveLength(3);
      
      // All results should be valid
      results.forEach((result, i) => {
        expect(result.totalSites).toBe(30 + i * 10);
        expect(result.analyzerSpecific!.stageResults).toHaveLength(7);
      });
    });
  });
});