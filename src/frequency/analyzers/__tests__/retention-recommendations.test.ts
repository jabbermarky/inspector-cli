/**
 * Unit tests for RetentionRecommendationsGenerator
 * 
 * Focused tests for the retention recommendation generation logic,
 * testing strategic value assessment and retention decisions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetentionRecommendationsGenerator } from '../recommendations/generators/retention-recommendations.js';
import type { 
  PreprocessedData, 
  AnalysisOptions,
  AggregatedResults,
  AnalysisResult,
  HeaderSpecificData,
  SemanticSpecificData,
  VendorSpecificData
} from '../../types/analyzer-interface.js';

// Mock logger to avoid import issues
vi.mock('../../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

describe('RetentionRecommendationsGenerator', () => {
  let generator: RetentionRecommendationsGenerator;
  let mockPreprocessedData: PreprocessedData;
  let mockAnalysisOptions: AnalysisOptions;
  let mockAggregatedResults: AggregatedResults;

  beforeEach(() => {
    generator = new RetentionRecommendationsGenerator();
    
    mockPreprocessedData = {
      sites: new Map([
        ['example.com', {
          url: 'https://example.com',
          normalizedUrl: 'example.com',
          cms: 'wordpress',
          confidence: 0.9,
          headers: new Map([
            ['x-wp-version', new Set(['6.2'])],
            ['x-vendor-specific', new Set(['custom-value'])],
            ['x-common-header', new Set(['standard'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(['WordPress']),
          capturedAt: '2024-01-01T00:00:00Z'
        }]
      ]),
      totalSites: 100,
      metadata: {
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-01-02') },
        version: '2.0',
        preprocessedAt: '2024-01-01T00:00:00Z',
        validation: {
          qualityScore: 0.95,
          validationPassed: true,
          validatedHeaders: new Map(),
          statisticallySignificantHeaders: 3
        }
      }
    };

    mockAnalysisOptions = {
      minOccurrences: 5,
      includeExamples: true,
      maxExamples: 10,
      semanticFiltering: true
    };

    // Create mock aggregated results with strategic value indicators
    mockAggregatedResults = {
      headers: {
        patterns: new Map([
          // Header with vendor info and good frequency - should recommend retention
          ['x-wp-version', {
            pattern: 'x-wp-version',
            siteCount: 30, // 30% frequency - optimal range
            sites: new Set(['site1.com', 'site2.com']),
            frequency: 0.3,
            examples: new Set(['6.2', '6.1', '5.9'])
          }],
          // Header with vendor info but very high frequency - should still recommend retention
          ['x-vendor-specific', {
            pattern: 'x-vendor-specific',
            siteCount: 90, // 90% frequency - very high
            sites: new Set(['site1.com']),
            frequency: 0.9,
            examples: new Set(['custom-value'])
          }],
          // Header without vendor or semantic info - should not recommend retention
          ['x-common-header', {
            pattern: 'x-common-header',
            siteCount: 20,
            sites: new Set(['site1.com']),
            frequency: 0.2,
            examples: new Set(['standard'])
          }],
          // Header below threshold - should be filtered out
          ['x-rare-header', {
            pattern: 'x-rare-header',
            siteCount: 2, // Below minOccurrences threshold
            sites: new Set(['site1.com']),
            frequency: 0.02,
            examples: new Set(['rare'])
          }]
        ]),
        totalSites: 100,
        metadata: {
          analyzer: 'HeaderAnalyzer',
          analyzedAt: '2024-01-01T00:00:00Z',
          totalPatternsFound: 4,
          totalPatternsAfterFiltering: 4,
          options: mockAnalysisOptions
        }
      } as AnalysisResult<HeaderSpecificData>,
      semantic: {
        patterns: new Map(),
        totalSites: 100,
        metadata: {
          analyzer: 'SemanticAnalyzer',
          analyzedAt: '2024-01-01T00:00:00Z',
          totalPatternsFound: 1,
          totalPatternsAfterFiltering: 1,
          options: mockAnalysisOptions
        },
        analyzerSpecific: {
          categoryDistribution: new Map(),
          headerPatterns: new Map([
            ['x-wp-version', {
              pattern: 'x-wp-version',
              category: 'cms-identification',
              confidence: 0.95,
              discriminativeScore: 0.8,
              filterRecommendation: 'keep',
              siteCount: 30,
              sites: new Set(['site1.com']),
              vendor: 'WordPress',
              platformName: 'WordPress'
            }]
          ]),
          vendorDetections: new Map(),
          insights: {
            totalHeaders: 4,
            categorizedHeaders: 1,
            uncategorizedHeaders: 3,
            mostCommonCategory: 'cms-identification',
            highConfidenceHeaders: 1,
            vendorHeaders: 2,
            customHeaders: 1,
            potentialSecurity: [],
            recommendations: ['Retain CMS identification headers']
          },
          qualityMetrics: {
            categorizationCoverage: 0.25,
            averageConfidence: 0.95,
            vendorDetectionRate: 0.5,
            customHeaderRatio: 0.25
          }
        }
      } as AnalysisResult<SemanticSpecificData>,
      vendor: {
        patterns: new Map(),
        totalSites: 100,
        metadata: {
          analyzer: 'VendorAnalyzer',
          analyzedAt: '2024-01-01T00:00:00Z',
          totalPatternsFound: 2,
          totalPatternsAfterFiltering: 2,
          options: mockAnalysisOptions
        },
        analyzerSpecific: {
          vendorsByHeader: new Map([
            ['x-wp-version', [{ vendor: 'WordPress', confidence: 0.95, category: 'cms' }]],
            ['x-vendor-specific', [{ vendor: 'CustomVendor', confidence: 0.8, category: 'custom' }]]
          ]),
          vendorStats: {},
          technologyStack: {},
          vendorConfidence: new Map(),
          technologySignatures: [],
          conflictingVendors: [],
          summary: {
            totalVendorsDetected: 2,
            highConfidenceVendors: 2,
            technologyCategories: ['CMS', 'Custom'],
            stackComplexity: 'moderate'
          }
        }
      } as AnalysisResult<VendorSpecificData>,
      metaTags: { patterns: new Map(), totalSites: 100, metadata: { analyzer: 'Meta', analyzedAt: '2024-01-01T00:00:00Z', totalPatternsFound: 0, totalPatternsAfterFiltering: 0, options: mockAnalysisOptions } },
      scripts: { patterns: new Map(), totalSites: 100, metadata: { analyzer: 'Scripts', analyzedAt: '2024-01-01T00:00:00Z', totalPatternsFound: 0, totalPatternsAfterFiltering: 0, options: mockAnalysisOptions } },
      validation: { patterns: new Map(), totalSites: 100, metadata: { analyzer: 'Validation', analyzedAt: '2024-01-01T00:00:00Z', totalPatternsFound: 0, totalPatternsAfterFiltering: 0, options: mockAnalysisOptions } },
      discovery: { patterns: new Map(), totalSites: 100, metadata: { analyzer: 'Discovery', analyzedAt: '2024-01-01T00:00:00Z', totalPatternsFound: 0, totalPatternsAfterFiltering: 0, options: mockAnalysisOptions } },
      cooccurrence: { patterns: new Map(), totalSites: 100, metadata: { analyzer: 'Cooccurrence', analyzedAt: '2024-01-01T00:00:00Z', totalPatternsFound: 0, totalPatternsAfterFiltering: 0, options: mockAnalysisOptions } },
      technologies: { patterns: new Map(), totalSites: 100, metadata: { analyzer: 'Technologies', analyzedAt: '2024-01-01T00:00:00Z', totalPatternsFound: 0, totalPatternsAfterFiltering: 0, options: mockAnalysisOptions } },
      correlations: { patterns: new Map(), totalSites: 100, metadata: { analyzer: 'Correlations', analyzedAt: '2024-01-01T00:00:00Z', totalPatternsFound: 0, totalPatternsAfterFiltering: 0, options: mockAnalysisOptions } },
      summary: {
        totalSitesAnalyzed: 100,
        totalPatternsFound: 4,
        analysisDate: '2024-01-01T00:00:00Z',
        topPatterns: {
          headers: [
            { pattern: 'x-vendor-specific', siteCount: 90, frequency: 0.9 },
            { pattern: 'x-wp-version', siteCount: 30, frequency: 0.3 }
          ],
          metaTags: [],
          scripts: [],
          technologies: []
        }
      }
    };
  });

  describe('Basic Generation', () => {
    it('should generate retention recommendations for strategically valuable headers', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Should have recommendations for headers with vendor info
      const wpVersionRec = result.find(r => r.pattern === 'x-wp-version');
      const vendorSpecificRec = result.find(r => r.pattern === 'x-vendor-specific');
      
      expect(wpVersionRec).toBeDefined();
      expect(vendorSpecificRec).toBeDefined();
    });

    it('should return empty array when no aggregated results provided', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions);

      expect(result).toEqual([]);
    });

    it('should return empty array when no header patterns exist', () => {
      const emptyResults = {
        ...mockAggregatedResults,
        headers: {
          ...mockAggregatedResults.headers,
          patterns: new Map()
        }
      };

      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, emptyResults);

      expect(result).toEqual([]);
    });
  });

  describe('Strategic Value Assessment', () => {
    it('should recommend retention for headers with vendor information', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      const vendorHeader = result.find(r => r.pattern === 'x-wp-version');
      expect(vendorHeader).toBeDefined();
      expect(vendorHeader?.action).toBe('retain_for_strategic_value');
      expect(vendorHeader?.reasoning).toContain('WordPress');
    });

    it('should recommend retention for semantically categorized headers', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      const semanticHeader = result.find(r => r.pattern === 'x-wp-version');
      expect(semanticHeader).toBeDefined();
      expect(semanticHeader?.reasoning).toContain('cms-identification');
    });

    it('should not recommend retention for headers without strategic value', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      // x-common-header has no vendor info or semantic categorization
      const commonHeader = result.find(r => r.pattern === 'x-common-header');
      expect(commonHeader).toBeUndefined();
    });

    it('should combine vendor and semantic reasoning when both are available', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      const combinedHeader = result.find(r => r.pattern === 'x-wp-version');
      expect(combinedHeader).toBeDefined();
      expect(combinedHeader?.reasoning).toContain('WordPress');
      expect(combinedHeader?.reasoning).toContain('cms-identification');
    });

    it('should filter out headers below minimum occurrence threshold', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      // x-rare-header has siteCount: 2, but minOccurrences is 5
      const rareHeader = result.find(r => r.pattern === 'x-rare-header');
      expect(rareHeader).toBeUndefined();
    });
  });

  describe('Confidence Calculations', () => {
    it('should generate valid confidence scores', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      for (const recommendation of result) {
        expect(recommendation.confidence.value).toBeGreaterThanOrEqual(0);
        expect(recommendation.confidence.value).toBeLessThanOrEqual(1);
        expect(['low', 'medium', 'high', 'very-high']).toContain(recommendation.confidence.level);
      }
    });

    it('should provide higher confidence for headers with both vendor and semantic data', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      const wpVersionRec = result.find(r => r.pattern === 'x-wp-version');
      const vendorOnlyRec = result.find(r => r.pattern === 'x-vendor-specific');

      if (wpVersionRec && vendorOnlyRec) {
        // x-wp-version has both vendor and semantic data, x-vendor-specific has only vendor
        expect(wpVersionRec.confidence.value).toBeGreaterThanOrEqual(vendorOnlyRec.confidence.value);
      }
    });

    it('should adjust confidence based on frequency optimality', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      const optimalFreqHeader = result.find(r => r.pattern === 'x-wp-version'); // 30% frequency
      const highFreqHeader = result.find(r => r.pattern === 'x-vendor-specific'); // 90% frequency

      if (optimalFreqHeader && highFreqHeader) {
        // Optimal frequency (30%) should have higher confidence than very high frequency (90%)
        expect(optimalFreqHeader.reasoning).toContain('optimal frequency');
        // Both should still have reasonable confidence since they have vendor info
        expect(optimalFreqHeader.confidence.value).toBeGreaterThan(0.5);
        expect(highFreqHeader.confidence.value).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Recommendation Structure', () => {
    it('should generate complete recommendation objects', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      for (const recommendation of result) {
        expect(recommendation).toHaveProperty('type', 'retain');
        expect(recommendation).toHaveProperty('pattern');
        expect(recommendation).toHaveProperty('action', 'retain_for_strategic_value');
        expect(recommendation).toHaveProperty('confidence');
        expect(recommendation).toHaveProperty('reasoning');
        
        expect(typeof recommendation.pattern).toBe('string');
        expect(typeof recommendation.reasoning).toBe('string');
        expect(recommendation.reasoning.length).toBeGreaterThan(0);
      }
    });

    it('should provide meaningful reasoning for each recommendation', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      for (const recommendation of result) {
        expect(recommendation.reasoning).toBeTruthy();
        expect(recommendation.reasoning.length).toBeGreaterThan(10);
        
        // Should mention specific strategic value factors
        const hasVendorReason = recommendation.reasoning.includes('vendor') || 
                               recommendation.reasoning.includes('WordPress') ||
                               recommendation.reasoning.includes('CustomVendor');
        const hasSemanticReason = recommendation.reasoning.includes('categorized') ||
                                 recommendation.reasoning.includes('cms-identification');
        const hasFrequencyReason = recommendation.reasoning.includes('frequency');
        
        // Should have at least one strategic value reason
        expect(hasVendorReason || hasSemanticReason || hasFrequencyReason).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing vendor analysis gracefully', () => {
      const noVendorResults = {
        ...mockAggregatedResults,
        vendor: undefined
      };

      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, noVendorResults);

      // Should still recommend retention for semantically categorized headers
      const semanticHeader = result.find(r => r.pattern === 'x-wp-version');
      expect(semanticHeader).toBeDefined();
      expect(semanticHeader?.reasoning).toContain('cms-identification');
    });

    it('should handle missing semantic analysis gracefully', () => {
      const noSemanticResults = {
        ...mockAggregatedResults,
        semantic: undefined
      };

      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, noSemanticResults);

      // Should still recommend retention for headers with vendor info
      const vendorHeaders = result.filter(r => 
        r.pattern === 'x-wp-version' || r.pattern === 'x-vendor-specific'
      );
      expect(vendorHeaders.length).toBeGreaterThan(0);
      
      for (const rec of vendorHeaders) {
        expect(rec.reasoning).toMatch(/WordPress|CustomVendor/);
      }
    });

    it('should handle missing both analyses gracefully', () => {
      const noAnalysisResults = {
        ...mockAggregatedResults,
        vendor: undefined,
        semantic: undefined
      };

      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, noAnalysisResults);

      // Should return empty array since no strategic value can be determined
      expect(result).toEqual([]);
    });

    it('should handle empty vendor or semantic data gracefully', () => {
      const emptyAnalysisResults = {
        ...mockAggregatedResults,
        vendor: {
          ...mockAggregatedResults.vendor,
          analyzerSpecific: {
            ...mockAggregatedResults.vendor.analyzerSpecific,
            vendorsByHeader: new Map()
          }
        },
        semantic: {
          ...mockAggregatedResults.semantic,
          analyzerSpecific: {
            ...mockAggregatedResults.semantic.analyzerSpecific,
            headerPatterns: new Map()
          }
        }
      };

      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, emptyAnalysisResults);

      // Should return empty array since no strategic value indicators exist
      expect(result).toEqual([]);
    });
  });
});