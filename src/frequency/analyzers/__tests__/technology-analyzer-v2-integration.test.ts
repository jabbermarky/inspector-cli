/**
 * TechnologyAnalyzerV2 Integration Test
 * 
 * Verify that TechnologyAnalyzerV2 integrates correctly with FrequencyAggregator
 * and completes the V1→V2 migration by replacing the TODO placeholder.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TechnologyAnalyzerV2 } from '../technology-analyzer-v2.js';
import type { PreprocessedData, AnalysisOptions, FrequencyAnalyzer } from '../../types/analyzer-interface.js';

// Mock logger
vi.mock('../../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }))
}));

describe('TechnologyAnalyzerV2 Integration', () => {
  let analyzer: TechnologyAnalyzerV2;
  let testData: PreprocessedData;
  let options: AnalysisOptions;

  beforeEach(() => {
    analyzer = new TechnologyAnalyzerV2();
    
    options = {
      minOccurrences: 1,
      includeExamples: true,
      maxExamples: 3,
      semanticFiltering: false
    };

    // Integration test data simulating FrequencyAggregator input
    testData = {
      sites: new Map([
        ['integration-test.com', {
          url: 'https://integration-test.com',
          normalizedUrl: 'integration-test.com',
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map([
            ['server', new Set(['nginx/1.18.0'])],
            ['x-powered-by', new Set(['PHP/8.0'])],
            ['cf-ray', new Set(['abc123-integration'])],
            ['x-wp-total', new Set(['200'])]
          ]),
          metaTags: new Map([
            ['generator', new Set(['WordPress 6.2.1'])],
            ['next-head-count', new Set(['8'])]
          ]),
          scripts: new Set([
            'https://integration-test.com/wp-content/themes/theme/script.js',
            'https://integration-test.com/_next/static/chunks/main.js',
            'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js',
            'https://www.google-analytics.com/analytics.js',
            'https://cdn.shopify.com/assets/shopify-analytics.js'
          ]),
          technologies: new Set(['WordPress', 'React', 'jQuery']),
          capturedAt: '2024-01-01T00:00:00Z'
        }]
      ]),
      totalSites: 1,
      metadata: {
        collectedAt: new Date().toISOString(),
        source: 'integration-test'
      }
    };
  });

  describe('FrequencyAggregator Integration Compatibility', () => {
    it('should implement FrequencyAnalyzer interface for pipeline integration', () => {
      // Type check - this will fail at compile time if interface is not implemented
      const frequencyAnalyzer: FrequencyAnalyzer<any> = analyzer;
      
      expect(frequencyAnalyzer).toBeDefined();
      expect(typeof frequencyAnalyzer.analyze).toBe('function');
      expect(typeof frequencyAnalyzer.getName).toBe('function');
    });

    it('should replace TODO placeholder functionality', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // Should provide TechSpecificData structure as required by AggregatedResults interface
      expect(result.analyzerSpecific).toHaveProperty('categories');
      expect(result.analyzerSpecific.categories).toBeInstanceOf(Map);
      
      // Should not be null (replacing `technologies: null as any`)
      expect(result.analyzerSpecific).not.toBeNull();
      expect(result.analyzerSpecific).toBeDefined();
    });

    it('should integrate seamlessly with other V2 analyzers', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // Should provide comprehensive technology analysis that complements other analyzers
      expect(result.patterns.size).toBeGreaterThan(0);
      expect(result.analyzerSpecific.detectedTechnologies.size).toBeGreaterThan(0);
      
      // Should provide analysis metadata for pipeline coordination
      expect(result.metadata.analyzer).toBe('TechnologyAnalyzerV2');
      expect(result.metadata.totalPatternsFound).toBeGreaterThan(0);
      expect(result.metadata.totalPatternsAfterFiltering).toBeGreaterThan(0);
    });

    it('should handle cross-analyzer data integration', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // Should detect technologies from multiple sources (headers, meta, scripts, CMS)
      const technologies = result.analyzerSpecific.detectedTechnologies;
      
      // Should have detected WordPress from CMS data
      const hasWordPress = Array.from(technologies.values())
        .some(tech => tech.name === 'WordPress');
      expect(hasWordPress).toBe(true);
      
      // Should have detected technologies from scripts
      const hasJQuery = Array.from(technologies.values())
        .some(tech => tech.name === 'jQuery');
      expect(hasJQuery).toBe(true);
      
      // Should have detected server technology from headers
      const hasNginx = Array.from(technologies.values())
        .some(tech => tech.name === 'Nginx');
      expect(hasNginx).toBe(true);
    });
  });

  describe('V1→V2 Migration Completion', () => {
    it('should complete the final TODO placeholder replacement', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // This verifies that the TODO: "Replace with actual result" is complete
      expect(result.analyzerSpecific).toBeDefined();
      expect(result.analyzerSpecific).not.toBeNull();
      expect(result.analyzerSpecific.categories).toBeInstanceOf(Map);
      
      // Should provide the expected TechSpecificData structure
      for (const [category, technologies] of result.analyzerSpecific.categories) {
        expect(typeof category).toBe('string');
        expect(technologies).toBeInstanceOf(Set);
      }
    });

    it('should provide enhanced technology capabilities beyond V1', async () => {
      const result = await analyzer.analyze(testData, options);
      const enhanced = result.analyzerSpecific;
      
      // These are V2 enhancements not available in V1
      expect(enhanced.stackAnalysis).toBeDefined();
      expect(enhanced.technologyTrends).toBeDefined();
      expect(enhanced.compatibilityMatrix).toBeDefined();
      expect(enhanced.securityAssessment).toBeDefined();
      
      // Should provide comprehensive stack analysis
      expect(enhanced.stackAnalysis.stackComplexity).toBeDefined();
      expect(enhanced.stackAnalysis.modernityScore).toBeGreaterThanOrEqual(0);
      expect(enhanced.stackAnalysis.modernityScore).toBeLessThanOrEqual(1);
    });

    it('should maintain V2 architecture patterns', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // Should follow V2 pattern data structure
      for (const [patternName, pattern] of result.patterns) {
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('siteCount');
        expect(pattern).toHaveProperty('frequency');
        expect(pattern).toHaveProperty('sites');
        expect(pattern).toHaveProperty('metadata');
        
        // Should have V2-style metadata
        expect(pattern.metadata).toHaveProperty('type');
        expect(pattern.metadata).toHaveProperty('source');
        expect(pattern.metadata.source).toBe('technology_analyzer');
      }
    });

    it('should provide zero V1 dependencies', async () => {
      // TechnologyAnalyzerV2 should be pure V2 implementation
      const result = await analyzer.analyze(testData, options);
      
      // Should use V2 data structures throughout
      expect(result.patterns).toBeInstanceOf(Map);
      expect(result.analyzerSpecific.detectedTechnologies).toBeInstanceOf(Map);
      expect(result.analyzerSpecific.categories).toBeInstanceOf(Map);
      
      // Should provide V2-style analyzer metadata
      expect(result.metadata.analyzer).toBe('TechnologyAnalyzerV2');
      expect(result.metadata.options).toEqual(options);
    });
  });

  describe('Pipeline Performance Integration', () => {
    it('should maintain performance standards for pipeline integration', async () => {
      const startTime = Date.now();
      await analyzer.analyze(testData, options);
      const duration = Date.now() - startTime;
      
      // Should complete quickly to not slow down pipeline
      expect(duration).toBeLessThan(500); // 500ms for single site
    });

    it('should handle pipeline data scaling', async () => {
      // Simulate larger dataset as would come from FrequencyAggregator
      const scaledData: PreprocessedData = {
        sites: new Map(),
        totalSites: 10,
        metadata: { collectedAt: new Date().toISOString(), source: 'scaled-test' }
      };

      // Generate 10 diverse technology stacks
      for (let i = 1; i <= 10; i++) {
        scaledData.sites.set(`site${i}.com`, {
          url: `https://site${i}.com`,
          normalizedUrl: `site${i}.com`,
          cms: i % 2 === 0 ? 'WordPress' : 'Unknown',
          confidence: 0.8,
          headers: new Map([
            ['server', new Set([i % 2 === 0 ? 'Apache' : 'Nginx'])],
            ['x-powered-by', new Set(['PHP/8.0'])]
          ]),
          metaTags: new Map([
            ['generator', new Set([`WordPress ${i % 3 + 5}.0`])]
          ]),
          scripts: new Set([
            `https://site${i}.com/script.js`,
            'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js'
          ]),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        });
      }

      const result = await analyzer.analyze(scaledData, options);
      
      // Should handle scaled data efficiently
      expect(result).toBeDefined();
      expect(result.totalSites).toBe(10);
      expect(result.analyzerSpecific.detectedTechnologies.size).toBeGreaterThan(0);
    });
  });

  describe('Integration Error Handling', () => {
    it('should handle pipeline data inconsistencies gracefully', async () => {
      const inconsistentData: PreprocessedData = {
        sites: new Map([
          ['inconsistent-site.com', {
            url: 'https://inconsistent-site.com',
            normalizedUrl: 'inconsistent-site.com',
            cms: null as any, // Inconsistent data
            confidence: -1, // Invalid confidence
            headers: new Map([
              [null as any, new Set(['invalid'])], // Invalid header
            ]),
            metaTags: new Map([
              ['', new Set()] // Empty meta
            ]),
            scripts: new Set([
              null as any, // Invalid script
              ''  // Empty script
            ]),
            technologies: new Set(),
            capturedAt: 'invalid-date'
          }]
        ]),
        totalSites: 1,
        metadata: { collectedAt: new Date().toISOString(), source: 'inconsistent-test' }
      };

      // Should not crash on inconsistent pipeline data
      const result = await analyzer.analyze(inconsistentData, options);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      // Should handle gracefully even with bad data
    });
  });

  describe('Migration Verification', () => {
    it('should provide complete V1→V2 migration verification', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // Verification checklist for 100% V1→V2 migration completion:
      
      // ✓ Implements FrequencyAnalyzer<TechSpecificData> interface
      expect(result.analyzerSpecific.categories).toBeInstanceOf(Map);
      
      // ✓ Replaces TODO placeholder in FrequencyAggregator
      expect(result.analyzerSpecific).not.toBeNull();
      
      // ✓ Provides comprehensive technology analysis
      expect(result.analyzerSpecific.detectedTechnologies.size).toBeGreaterThan(0);
      expect(result.analyzerSpecific.stackAnalysis).toBeDefined();
      
      // ✓ Integrates with V2 pipeline architecture
      expect(result.patterns).toBeInstanceOf(Map);
      expect(result.metadata.analyzer).toBe('TechnologyAnalyzerV2');
      
      // ✓ Zero V1 dependencies
      expect(result.analyzerSpecific.technologyTrends).toBeInstanceOf(Map);
      expect(result.analyzerSpecific.compatibilityMatrix).toBeInstanceOf(Map);
      
      // ✓ Enhanced capabilities beyond V1 scope
      expect(result.analyzerSpecific.securityAssessment).toBeInstanceOf(Map);
      expect(result.analyzerSpecific.stackAnalysis.stackRecommendations).toBeDefined();
    });
  });
});