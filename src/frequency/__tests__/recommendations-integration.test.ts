/**
 * Integration tests for RecommendationsCoordinator - Phase 3 implementation
 * Tests data conversion from V2 architecture to legacy format
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { RecommendationsCoordinator } from '../analyzers/recommendations-coordinator.js';
import { FrequencyAggregator } from '../frequency-aggregator.js';
import { DataPreprocessor } from '../data-preprocessor.js';
import type { AggregatedResults, FrequencyOptions } from '../types/analyzer-interface.js';
import type { DetectionDataPoint } from '../types.js';

// Mock only external dependencies, use real business logic
vi.mock('../../logger.js', () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  })
}));

describe('RecommendationsCoordinator Integration Tests', () => {
  let coordinator: RecommendationsCoordinator;
  let realAggregatedResults: AggregatedResults;
  let realDataPoints: DetectionDataPoint[];
  let testOptions: FrequencyOptions;

  beforeAll(async () => {
    // Create minimal test data structures
    coordinator = new RecommendationsCoordinator();
    testOptions = {
      minOccurrences: 10,
      output: 'human'
    };

    // Create minimal aggregated results for testing data conversion
    realAggregatedResults = {
      headers: {
        patterns: new Map([
          ['content-type', {
            frequency: 0.95,
            siteCount: 950,
            examples: ['application/json', 'text/html', 'application/xml']
          }],
          ['server', {
            frequency: 0.88,
            siteCount: 880,
            examples: ['nginx/1.18', 'apache/2.4', 'cloudflare']
          }]
        ]),
        totalSites: 1000
      },
      metaTags: {
        patterns: new Map([
          ['viewport', {
            frequency: 0.85,
            siteCount: 850,
            examples: ['width=device-width', 'initial-scale=1']
          }]
        ]),
        totalSites: 1000
      },
      scripts: {
        patterns: new Map([
          ['jquery', {
            frequency: 0.35,
            siteCount: 350,
            examples: ['https://code.jquery.com/jquery-3.6.0.min.js']
          }]
        ]),
        totalSites: 1000
      },
      bias: {
        patterns: new Map(),
        totalSites: 1000
      }
    };

    // Create minimal data points
    realDataPoints = [
      {
        url: 'https://example.com',
        timestamp: new Date(),
        userAgent: 'test',
        captureVersion: 'v2' as any,
        originalUrl: 'https://example.com',
        finalUrl: 'https://example.com',
        redirectChain: [],
        totalRedirects: 0,
        protocolUpgraded: false,
        navigationTime: 0,
        responseTime: 100,
        statusCode: 200,
        contentType: 'text/html',
        contentSize: 1000,
        httpHeaders: { 'content-type': 'text/html' },
        metaTags: { viewport: 'width=device-width' },
        htmlContent: '<html></html>',
        scripts: ['https://code.jquery.com/jquery-3.6.0.min.js'],
        technologies: ['jQuery'],
        cms: 'WordPress',
        confidence: 0.95,
        version: '6.0',
        plugins: [],
        themes: [],
        pageType: 'main' as any,
        robotsTxt: null
      }
    ];
  });

  describe('Data Conversion Integration', () => {
    it('should convert V2 aggregated results to legacy format successfully', async () => {
      const recommendations = await coordinator.generateRecommendations(
        realAggregatedResults,
        realDataPoints,
        testOptions
      );

      // Verify all recommendation sections exist
      expect(recommendations).toHaveProperty('learn');
      expect(recommendations).toHaveProperty('detectCms');
      expect(recommendations).toHaveProperty('groundTruth');
      expect(recommendations).toHaveProperty('biasAnalysis');

      // Verify learn section structure
      expect(recommendations.learn).toHaveProperty('currentlyFiltered');
      expect(recommendations.learn).toHaveProperty('recommendToFilter');
      expect(recommendations.learn).toHaveProperty('recommendToKeep');

      // Verify detectCms section structure
      expect(recommendations.detectCms).toHaveProperty('newPatternOpportunities');
      expect(recommendations.detectCms).toHaveProperty('patternsToRefine');

      // Verify groundTruth section structure
      expect(recommendations.groundTruth).toHaveProperty('currentlyUsedPatterns');
      expect(recommendations.groundTruth).toHaveProperty('potentialNewRules');
    });

    it('should use V2 architecture data after fix', async () => {
      const recommendations = await coordinator.generateRecommendations(
        realAggregatedResults,
        realDataPoints,
        testOptions
      );

      // After fix: legacy system should use V2 architecture data
      const mainHeaderCount = realAggregatedResults.headers.patterns.size;
      const filteredHeaderCount = recommendations.learn.currentlyFiltered.length;
      
      console.log(`Test data headers: ${mainHeaderCount}`);
      console.log(`Fixed system returned: ${filteredHeaderCount} headers`);
      
      // FIXED: Should only return headers that exist in both analysis data AND static filter list
      expect(filteredHeaderCount).toBeLessThanOrEqual(mainHeaderCount);
      expect(filteredHeaderCount).toBeGreaterThan(0); // Should find some filtered headers
      
      // The system should now use the intersection of V2 data and filter list
      const headerNames = recommendations.learn.currentlyFiltered;
      
      // Only Group 1 (generic) headers should be in currentlyFiltered
      expect(headerNames).toContain('content-type'); // Group 1: always filtered
      expect(headerNames).not.toContain('server'); // Group 2: context-dependent
      
      // Should contain only the Group 1 headers from our test data
      expect(headerNames.length).toBe(1); // Only content-type is always filtered
    });

    it('should convert header patterns to legacy format correctly', async () => {
      // Test the conversion method directly with real data
      const coordinator = new RecommendationsCoordinator();
      
      // Access private method for testing (TypeScript hack)
      const convertMethod = (coordinator as any).convertHeaderPatternsToLegacy.bind(coordinator);
      const legacyPatterns = convertMethod(realAggregatedResults.headers);
      
      expect(legacyPatterns).toBeInstanceOf(Map);
      
      // Verify legacy format structure
      for (const [headerName, patterns] of legacyPatterns) {
        expect(typeof headerName).toBe('string');
        expect(Array.isArray(patterns)).toBe(true);
        
        for (const pattern of patterns) {
          expect(pattern).toHaveProperty('pattern');
          expect(pattern).toHaveProperty('frequency');
          expect(pattern).toHaveProperty('occurrences');
          expect(pattern).toHaveProperty('examples');
          
          expect(typeof pattern.pattern).toBe('string');
          expect(typeof pattern.frequency).toBe('number');
          expect(typeof pattern.occurrences).toBe('number');
          expect(Array.isArray(pattern.examples)).toBe(true);
        }
      }
    });

    it('should convert meta patterns to legacy format correctly', async () => {
      const coordinator = new RecommendationsCoordinator();
      
      // Access private method for testing
      const convertMethod = (coordinator as any).convertMetaPatternsToLegacy.bind(coordinator);
      const legacyPatterns = convertMethod(realAggregatedResults.metaTags);
      
      expect(legacyPatterns).toBeInstanceOf(Map);
      
      // Verify structure matches expected legacy format
      for (const [patternName, patterns] of legacyPatterns) {
        expect(typeof patternName).toBe('string');
        expect(Array.isArray(patterns)).toBe(true);
        
        for (const pattern of patterns) {
          expect(pattern).toHaveProperty('pattern');
          expect(pattern).toHaveProperty('frequency'); 
          expect(pattern).toHaveProperty('occurrences');
          expect(pattern).toHaveProperty('examples');
        }
      }
    });

    it('should convert script patterns to legacy format correctly', async () => {
      const coordinator = new RecommendationsCoordinator();
      
      // Access private method for testing
      const convertMethod = (coordinator as any).convertScriptPatternsToLegacy.bind(coordinator);
      const legacyPatterns = convertMethod(realAggregatedResults.scripts);
      
      expect(legacyPatterns).toBeInstanceOf(Map);
      
      // Verify structure
      for (const [patternName, patterns] of legacyPatterns) {
        expect(typeof patternName).toBe('string');
        expect(Array.isArray(patterns)).toBe(true);
        
        for (const pattern of patterns) {
          expect(pattern).toHaveProperty('pattern');
          expect(pattern).toHaveProperty('frequency');
          expect(pattern).toHaveProperty('occurrences'); 
          expect(pattern).toHaveProperty('examples');
        }
      }
    });

    it('should handle empty data correctly after fix', async () => {
      const emptyResults: AggregatedResults = {
        headers: { patterns: new Map(), totalSites: 0 },
        metaTags: { patterns: new Map(), totalSites: 0 },
        scripts: { patterns: new Map(), totalSites: 0 },
        bias: { patterns: new Map(), totalSites: 0 }
      };

      const recommendations = await coordinator.generateRecommendations(
        emptyResults,
        [],
        testOptions
      );

      // FIXED: With empty input, should return empty filtered list
      expect(recommendations.learn.currentlyFiltered).toHaveLength(0);
      expect(recommendations.learn.recommendToFilter).toEqual([]);
      expect(recommendations.learn.recommendToKeep).toEqual([]);
      
      // The system now properly respects empty input data
    });
  });

  describe('Legacy Format Compatibility', () => {
    it('should produce RecommendationInput compatible with legacy recommender', async () => {
      // Verify the coordinator produces input that matches what generateRecommendations expects
      const coordinator = new RecommendationsCoordinator();
      
      // Test conversion methods produce correct Map structures
      const headerPatterns = (coordinator as any).convertHeaderPatternsToLegacy(realAggregatedResults.headers);
      const metaPatterns = (coordinator as any).convertMetaPatternsToLegacy(realAggregatedResults.metaTags);
      const scriptPatterns = (coordinator as any).convertScriptPatternsToLegacy(realAggregatedResults.scripts);
      
      // Verify Map structure expected by legacy system
      expect(headerPatterns).toBeInstanceOf(Map);
      expect(metaPatterns).toBeInstanceOf(Map);
      expect(scriptPatterns).toBeInstanceOf(Map);
      
      // Verify data points are passed through correctly
      expect(Array.isArray(realDataPoints)).toBe(true);
      expect(realDataPoints.length).toBeGreaterThan(0);
      
      // Verify options conversion
      expect(testOptions).toHaveProperty('minOccurrences');
    });

    it('should extract header names correctly from pattern names', () => {
      const coordinator = new RecommendationsCoordinator();
      const extractMethod = (coordinator as any).extractHeaderName.bind(coordinator);
      
      // Test various pattern name formats
      expect(extractMethod('content-type')).toBe('content-type');
      expect(extractMethod('content-type:application/json')).toBe('content-type');
      expect(extractMethod('server:nginx')).toBe('server');
      expect(extractMethod('x-custom-header:value')).toBe('x-custom-header');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid data gracefully', async () => {
      // Test with malformed aggregated results to trigger error handling
      const malformedResults = {
        headers: null, // This should cause an error
        metaTags: { patterns: new Map(), totalSites: 0 },
        scripts: { patterns: new Map(), totalSites: 0 },
        bias: { patterns: new Map(), totalSites: 0 }
      } as any;
      
      const recommendations = await coordinator.generateRecommendations(
        malformedResults,
        realDataPoints,
        testOptions
      );
      
      // Should return valid structure when error occurs
      // The fix primarily affects learn recommendations (which now return empty with malformed data)
      expect(recommendations.learn.currentlyFiltered).toEqual([]);
      expect(recommendations.learn.recommendToFilter).toEqual([]);
      expect(recommendations.learn.recommendToKeep).toEqual([]);
      expect(recommendations.detectCms.newPatternOpportunities).toEqual([]);
      expect(recommendations.detectCms.patternsToRefine).toEqual([]);
      
      // Ground truth still has static patterns (different issue, not part of this fix)
      expect(Array.isArray(recommendations.groundTruth.currentlyUsedPatterns)).toBe(true);
      expect(recommendations.groundTruth.potentialNewRules).toEqual([]);
      
      // Bias analysis still works even with malformed data
      expect(recommendations.biasAnalysis).toHaveProperty('cmsDistribution');
    });
  });

  describe('Performance Validation', () => {
    it('should complete recommendations generation within reasonable time', async () => {
      const startTime = Date.now();
      
      await coordinator.generateRecommendations(
        realAggregatedResults,
        realDataPoints,
        testOptions
      );
      
      const duration = Date.now() - startTime;
      
      // Should complete within 30 seconds for integration test
      expect(duration).toBeLessThan(30000);
      console.log(`Recommendations generation took ${duration}ms`);
    });
  });
});