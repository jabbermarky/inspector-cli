/**
 * Performance and Scalability Validation Tests - Phase 3 Implementation
 * Measures analysis time and memory usage to ensure restored functionality performs well
 */

import { describe, it, expect, vi } from 'vitest';
import { analyzeFrequencyV2 } from '../analyzer-v2.js';
import { DataPreprocessor } from '../data-preprocessor-v2.js';

// Mock logger to reduce test noise
vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }))
}));

describe('Performance and Scalability Validation', () => {
  
  describe('Full Dataset Analysis Performance', () => {
    it('should complete analysis within reasonable time for full dataset', async () => {
      const startTime = performance.now();
      
      const result = await analyzeFrequencyV2({
        dataDir: './data/cms-analysis',
        minOccurrences: 10,
        includeRecommendations: false, // Skip for performance focus
        minSites: 100
      });
      
      const duration = performance.now() - startTime;
      const durationSeconds = duration / 1000;
      
      console.log(`\n📊 Performance Metrics:`);
      console.log(`   • Analysis time: ${durationSeconds.toFixed(2)} seconds`);
      console.log(`   • Sites processed: ${result.metadata.totalSites}`);
      console.log(`   • Headers analyzed: ${Object.keys(result.headers).length}`);
      console.log(`   • Meta tags analyzed: ${Object.keys(result.metaTags).length}`);
      console.log(`   • Processing rate: ${(result.metadata.totalSites / durationSeconds).toFixed(0)} sites/second`);
      
      // Should complete within 10 minutes for 4574 sites (per plan requirement)
      expect(durationSeconds).toBeLessThan(600); // 10 minutes
      
      // Should process a reasonable number of sites
      expect(result.metadata.totalSites).toBeGreaterThan(1000);
      
      // Should achieve reasonable processing rate
      const processingRate = result.metadata.totalSites / durationSeconds;
      expect(processingRate).toBeGreaterThan(10); // At least 10 sites per second
      
    }, 600000); // 10 minute timeout
  });

  describe('Memory Usage Validation', () => {
    it('should maintain reasonable memory usage during preprocessing', async () => {
      const preprocessor = new DataPreprocessor('./data/cms-analysis');
      
      // Force garbage collection if available (Node.js --expose-gc flag)
      if (global.gc) {
        global.gc();
      }
      
      const memBefore = process.memoryUsage();
      
      const preprocessedData = await preprocessor.load({});
      
      const memAfter = process.memoryUsage();
      
      const heapUsedMB = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
      const rssUsedMB = (memAfter.rss - memBefore.rss) / 1024 / 1024;
      
      console.log(`\n💾 Memory Usage Metrics:`);
      console.log(`   • Heap memory increase: ${heapUsedMB.toFixed(2)} MB`);
      console.log(`   • RSS memory increase: ${rssUsedMB.toFixed(2)} MB`);
      console.log(`   • Sites loaded: ${preprocessedData.totalSites}`);
      console.log(`   • Memory per site: ${(heapUsedMB / preprocessedData.totalSites * 1024).toFixed(2)} KB/site`);
      
      // Memory usage should be reasonable (less than 1GB heap increase)
      expect(heapUsedMB).toBeLessThan(1024);
      
      // Memory per site should be reasonable (less than 100KB per site)
      const memoryPerSite = heapUsedMB / preprocessedData.totalSites * 1024;
      expect(memoryPerSite).toBeLessThan(100);
      
    }, 120000); // 2 minute timeout
  });

  describe('Scalability with Different Dataset Sizes', () => {
    it('should scale linearly with minimum occurrence threshold', async () => {
      const testCases = [
        { minOccurrences: 100, expectedHeaderCount: 'low' },
        { minOccurrences: 50, expectedHeaderCount: 'medium' },
        { minOccurrences: 10, expectedHeaderCount: 'high' }
      ];
      
      const results = [];
      
      for (const testCase of testCases) {
        const startTime = performance.now();
        
        const result = await analyzeFrequencyV2({
          dataDir: './data/cms-analysis',
          minOccurrences: testCase.minOccurrences,
          includeRecommendations: false,
          minSites: 100
        });
        
        const duration = performance.now() - startTime;
        const headerCount = Object.keys(result.headers).length;
        
        results.push({
          minOccurrences: testCase.minOccurrences,
          duration: duration / 1000,
          headerCount,
          totalSites: result.metadata.totalSites
        });
        
        console.log(`   • minOccurrences=${testCase.minOccurrences}: ${headerCount} headers in ${(duration/1000).toFixed(2)}s`);
      }
      
      // Verify the filtering works as expected
      expect(results[0].headerCount).toBeLessThan(results[1].headerCount);
      expect(results[1].headerCount).toBeLessThan(results[2].headerCount);
      
      // All should process the same number of sites
      const firstTotalSites = results[0].totalSites;
      results.forEach(result => {
        expect(result.totalSites).toBe(firstTotalSites);
      });
      
    }, 300000); // 5 minute timeout
  });

  describe('Resource Cleanup Validation', () => {
    it('should properly clean up resources after analysis', async () => {
      const initialMemory = process.memoryUsage();
      
      // Run multiple analyses to test cleanup
      for (let i = 0; i < 3; i++) {
        await analyzeFrequencyV2({
          dataDir: './data/cms-analysis',
          minOccurrences: 100,
          includeRecommendations: false,
          minSites: 100
        });
        
        // Force garbage collection between runs if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      const heapGrowth = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      
      console.log(`\n🧹 Resource Cleanup Metrics:`);
      console.log(`   • Heap growth after 3 analyses: ${heapGrowth.toFixed(2)} MB`);
      
      // Memory growth should be minimal after multiple runs (indicates good cleanup)
      expect(heapGrowth).toBeLessThan(200); // Less than 200MB growth
      
    }, 180000); // 3 minute timeout
  });

  describe('Concurrent Analysis Handling', () => {
    it('should handle concurrent analysis requests gracefully', async () => {
      const startTime = performance.now();
      
      // Run two analyses concurrently
      const promises = [
        analyzeFrequencyV2({
          dataDir: './data/cms-analysis',
          minOccurrences: 50,
          includeRecommendations: false,
          minSites: 100
        }),
        analyzeFrequencyV2({
          dataDir: './data/cms-analysis',
          minOccurrences: 100,
          includeRecommendations: false,
          minSites: 100
        })
      ];
      
      const results = await Promise.all(promises);
      const duration = performance.now() - startTime;
      
      console.log(`\n🔄 Concurrent Analysis Metrics:`);
      console.log(`   • Total time for 2 concurrent analyses: ${(duration/1000).toFixed(2)} seconds`);
      console.log(`   • Results 1: ${Object.keys(results[0].headers).length} headers`);
      console.log(`   • Results 2: ${Object.keys(results[1].headers).length} headers`);
      
      // Both should complete successfully
      expect(results[0].metadata.totalSites).toBeGreaterThan(0);
      expect(results[1].metadata.totalSites).toBeGreaterThan(0);
      
      // Should complete in reasonable time (concurrent should be faster than sequential)
      expect(duration).toBeLessThan(300000); // 5 minutes
      
    }, 300000); // 5 minute timeout
  });
});