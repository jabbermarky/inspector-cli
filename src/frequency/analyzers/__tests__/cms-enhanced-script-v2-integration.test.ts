/**
 * CMSEnhancedScriptV2 Integration Test
 * 
 * Verify that CMSEnhancedScriptV2 can properly replace ScriptAnalyzerV2 
 * in the FrequencyAggregator pipeline.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CMSEnhancedScriptV2 } from '../cms-enhanced-script-v2.js';
import { ScriptAnalyzerV2 } from '../script-analyzer-v2.js';
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

describe('CMSEnhancedScriptV2 Integration', () => {
  let enhancedAnalyzer: CMSEnhancedScriptV2;
  let baseAnalyzer: ScriptAnalyzerV2;
  let testData: PreprocessedData;
  let options: AnalysisOptions;

  beforeEach(() => {
    enhancedAnalyzer = new CMSEnhancedScriptV2();
    baseAnalyzer = new ScriptAnalyzerV2();
    
    options = {
      minOccurrences: 1,
      includeExamples: true,
      maxExamples: 3,
      semanticFiltering: false
    };

    // Simple test data for integration testing
    testData = {
      sites: new Map([
        ['test-site.com', {
          url: 'https://test-site.com',
          normalizedUrl: 'test-site.com',
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map(),
          metaTags: new Map(),
          scripts: new Set([
            'https://test-site.com/wp-content/themes/theme/script.js',
            'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js'
          ]),
          technologies: new Set(),
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

  describe('FrequencyAnalyzer Interface Compliance', () => {
    it('should implement the FrequencyAnalyzer interface', () => {
      // Type check - this will fail at compile time if interface is not implemented
      const analyzer: FrequencyAnalyzer<any> = enhancedAnalyzer;
      
      expect(analyzer).toBeDefined();
      expect(typeof analyzer.analyze).toBe('function');
      expect(typeof analyzer.getName).toBe('function');
    });

    it('should have correct analyzer name', () => {
      expect(enhancedAnalyzer.getName()).toBe('CMSEnhancedScriptV2');
      expect(baseAnalyzer.getName()).toBe('ScriptAnalyzerV2');
    });

    it('should return compatible result structure', async () => {
      const result = await enhancedAnalyzer.analyze(testData, options);
      
      // Should have all required fields from AnalysisResult interface
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('totalSites');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('analyzerSpecific');
      
      // Patterns should be a Map
      expect(result.patterns).toBeInstanceOf(Map);
      expect(result.totalSites).toBe(testData.totalSites);
      expect(result.metadata.analyzer).toBe('CMSEnhancedScriptV2');
    });

    it('should extend base analyzer capabilities', async () => {
      const baseResult = await baseAnalyzer.analyze(testData, options);
      const enhancedResult = await enhancedAnalyzer.analyze(testData, options);
      
      // Enhanced analyzer should have at least as many patterns
      expect(enhancedResult.patterns.size).toBeGreaterThanOrEqual(baseResult.patterns.size);
      
      // Should have additional analyzer-specific data
      expect(enhancedResult.analyzerSpecific).toBeDefined();
      expect(enhancedResult.analyzerSpecific).toHaveProperty('detectedPlatforms');
      expect(enhancedResult.analyzerSpecific).toHaveProperty('technologyStack');
      expect(enhancedResult.analyzerSpecific).toHaveProperty('cmsInsights');
    });
  });

  describe('Pipeline Integration Compatibility', () => {
    it('should handle preprocessed data format correctly', async () => {
      const result = await enhancedAnalyzer.analyze(testData, options);
      
      // Should process all sites
      expect(result.totalSites).toBe(testData.totalSites);
      
      // Should process script data
      expect(result.patterns.size).toBeGreaterThan(0);
      
      // All patterns should have proper structure
      for (const pattern of result.patterns.values()) {
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('siteCount');
        expect(pattern).toHaveProperty('frequency');
        expect(pattern).toHaveProperty('sites');
        expect(pattern.siteCount).toBeGreaterThan(0);
        expect(pattern.frequency).toBeGreaterThan(0);
        expect(pattern.sites.size).toBe(pattern.siteCount);
      }
    });

    it('should respect analysis options', async () => {
      const highThresholdOptions = { ...options, minOccurrences: 5 };
      const result = await enhancedAnalyzer.analyze(testData, highThresholdOptions);
      
      // With only 1 site, no patterns should meet threshold of 5
      expect(result.patterns.size).toBe(0);
    });

    it('should provide metadata for pipeline tracking', async () => {
      const result = await enhancedAnalyzer.analyze(testData, options);
      
      expect(result.metadata).toHaveProperty('analyzer');
      expect(result.metadata).toHaveProperty('analyzedAt');
      expect(result.metadata).toHaveProperty('totalPatternsFound');
      expect(result.metadata).toHaveProperty('totalPatternsAfterFiltering');
      expect(result.metadata).toHaveProperty('options');
      
      expect(result.metadata.analyzer).toBe('CMSEnhancedScriptV2');
      expect(typeof result.metadata.analyzedAt).toBe('string');
      expect(typeof result.metadata.totalPatternsFound).toBe('number');
      expect(typeof result.metadata.totalPatternsAfterFiltering).toBe('number');
    });
  });

  describe('Drop-in Replacement Verification', () => {
    it('should be usable as a drop-in replacement for ScriptAnalyzerV2', async () => {
      // This simulates how FrequencyAggregator would use the analyzer
      const analyzers = new Map<string, FrequencyAnalyzer<any>>();
      
      // Can add either analyzer to the same map
      analyzers.set('scripts', baseAnalyzer);
      analyzers.set('scriptsEnhanced', enhancedAnalyzer);
      
      // Both should work the same way
      const baseResult = await analyzers.get('scripts')!.analyze(testData, options);
      const enhancedResult = await analyzers.get('scriptsEnhanced')!.analyze(testData, options);
      
      // Both should return valid results
      expect(baseResult).toBeDefined();
      expect(enhancedResult).toBeDefined();
      
      // Enhanced should have additional capabilities
      expect(enhancedResult.analyzerSpecific).toHaveProperty('detectedPlatforms');
      expect(baseResult.analyzerSpecific).not.toHaveProperty('detectedPlatforms');
    });

    it('should maintain backward compatibility with existing pipeline', async () => {
      const result = await enhancedAnalyzer.analyze(testData, options);
      
      // Should still provide base script-specific data
      expect(result.analyzerSpecific).toHaveProperty('cdnUsage');
      expect(result.analyzerSpecific).toHaveProperty('scriptTypes');
      
      // CDN usage and script types should be Maps as expected
      expect(result.analyzerSpecific.cdnUsage).toBeInstanceOf(Map);
      expect(result.analyzerSpecific.scriptTypes).toBeInstanceOf(Map);
    });
  });

  describe('Enhanced Features Verification', () => {
    it('should detect CMS-specific patterns', async () => {
      const result = await enhancedAnalyzer.analyze(testData, options);
      
      // Should detect WordPress patterns from test data
      const detectedPlatforms = result.analyzerSpecific.detectedPlatforms;
      expect(detectedPlatforms.size).toBeGreaterThan(0);
      
      // Should have WordPress detection
      const wordpressPlatforms = Array.from(detectedPlatforms.values())
        .filter(p => p.platform.toLowerCase().includes('wordpress'));
      expect(wordpressPlatforms.length).toBeGreaterThan(0);
    });

    it('should provide comprehensive technology stack analysis', async () => {
      const result = await enhancedAnalyzer.analyze(testData, options);
      
      const techStack = result.analyzerSpecific.technologyStack;
      expect(techStack).toBeDefined();
      expect(techStack).toHaveProperty('frontend');
      expect(techStack).toHaveProperty('backend');
      expect(techStack).toHaveProperty('cms');
      expect(techStack).toHaveProperty('complexity');
      expect(techStack).toHaveProperty('modernityScore');
      
      // Should identify WordPress as CMS
      expect(techStack.cms.length).toBeGreaterThan(0);
    });

    it('should provide CMS insights and deployment analysis', async () => {
      const result = await enhancedAnalyzer.analyze(testData, options);
      
      expect(result.analyzerSpecific).toHaveProperty('cmsInsights');
      expect(result.analyzerSpecific).toHaveProperty('deploymentAnalysis');
      expect(result.analyzerSpecific).toHaveProperty('securityAnalysis');
      
      const insights = result.analyzerSpecific.cmsInsights;
      expect(insights).toHaveProperty('primaryCMS');
      expect(insights).toHaveProperty('cmsConfidence');
      expect(insights).toHaveProperty('multiCMSDetected');
    });
  });
});