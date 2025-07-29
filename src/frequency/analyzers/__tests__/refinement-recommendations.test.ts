/**
 * Unit tests for RefinementRecommendationsGenerator
 * 
 * Focused tests for the refinement recommendation generation logic,
 * testing pattern refinement suggestions based on vendor data.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RefinementRecommendationsGenerator } from '../recommendations/generators/refinement-recommendations.js';
import type { 
  PreprocessedData, 
  AnalysisOptions,
  AggregatedResults,
  AnalysisResult,
  HeaderSpecificData,
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

describe('RefinementRecommendationsGenerator', () => {
  let generator: RefinementRecommendationsGenerator;
  let mockPreprocessedData: PreprocessedData;
  let mockAnalysisOptions: AnalysisOptions;
  let mockAggregatedResults: AggregatedResults;

  beforeEach(() => {
    generator = new RefinementRecommendationsGenerator();
    
    mockPreprocessedData = {
      sites: new Map([
        ['example.com', {
          url: 'https://example.com',
          normalizedUrl: 'example.com',
          cms: 'wordpress',
          confidence: 0.9,
          headers: new Map([
            ['x-powered-by', new Set(['PHP/7.4'])],
            ['server', new Set(['Apache/2.4'])],
            ['x-framework', new Set(['Laravel 9.0'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(['PHP', 'Apache', 'Laravel']),
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

    // Create mock aggregated results with refinement opportunities
    mockAggregatedResults = {
      headers: {
        patterns: new Map([
          // Header with vendor info and good frequency - suitable for refinement
          ['x-powered-by', {
            pattern: 'x-powered-by',
            siteCount: 50, // 50% frequency - good for refinement
            sites: new Set(['site1.com', 'site2.com']),
            frequency: 0.5,
            examples: new Set(['PHP/7.4', 'PHP/8.0', 'Node.js/16'])
          }],
          // Header with vendor info but low frequency - should not refine
          ['x-rare-vendor', {
            pattern: 'x-rare-vendor',
            siteCount: 8, // 8% frequency - too low for refinement
            sites: new Set(['site1.com']),
            frequency: 0.08,
            examples: new Set(['RareVendor/1.0'])
          }],
          // Header without vendor info - should not refine
          ['x-generic-header', {
            pattern: 'x-generic-header',
            siteCount: 40,
            sites: new Set(['site1.com']),
            frequency: 0.4,
            examples: new Set(['generic-value'])
          }],
          // Header below threshold - should be filtered out
          ['x-below-threshold', {
            pattern: 'x-below-threshold',
            siteCount: 3, // Below minOccurrences threshold
            sites: new Set(['site1.com']),
            frequency: 0.03,
            examples: new Set(['value'])
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
            ['x-powered-by', [
              { vendor: 'PHP', confidence: 0.9, category: 'language' },
              { vendor: 'Node.js', confidence: 0.8, category: 'runtime' }
            ]],
            ['x-rare-vendor', [
              { vendor: 'RareVendor', confidence: 0.85, category: 'custom' }
            ]]
            // x-generic-header has no vendor info
          ]),
          vendorStats: {},
          technologyStack: {},
          vendorConfidence: new Map(),
          technologySignatures: [],
          conflictingVendors: [],
          summary: {
            totalVendorsDetected: 3,
            highConfidenceVendors: 3,
            technologyCategories: ['Language', 'Runtime', 'Custom'],
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
      semantic: { patterns: new Map(), totalSites: 100, metadata: { analyzer: 'Semantic', analyzedAt: '2024-01-01T00:00:00Z', totalPatternsFound: 0, totalPatternsAfterFiltering: 0, options: mockAnalysisOptions } },
      correlations: { patterns: new Map(), totalSites: 100, metadata: { analyzer: 'Correlations', analyzedAt: '2024-01-01T00:00:00Z', totalPatternsFound: 0, totalPatternsAfterFiltering: 0, options: mockAnalysisOptions } },
      summary: {
        totalSitesAnalyzed: 100,
        totalPatternsFound: 4,
        analysisDate: '2024-01-01T00:00:00Z',
        topPatterns: {
          headers: [
            { pattern: 'x-powered-by', siteCount: 50, frequency: 0.5 },
            { pattern: 'x-generic-header', siteCount: 40, frequency: 0.4 }
          ],
          metaTags: [],
          scripts: [],
          technologies: []
        }
      }
    };
  });

  describe('Basic Generation', () => {
    it('should generate refinement recommendations for suitable patterns', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Should have recommendation for x-powered-by (has vendor info and good frequency)
      const refinementRec = result.find(r => r.pattern === 'x-powered-by');
      expect(refinementRec).toBeDefined();
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

  describe('Refinement Criteria', () => {
    it('should recommend refinement for headers with vendor info and good frequency', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      const refinementRec = result.find(r => r.pattern === 'x-powered-by');
      expect(refinementRec).toBeDefined();
      expect(refinementRec?.type).toBe('refine');
      expect(refinementRec?.action).toBe('refine_to_x-powered-by.*php');
      expect(refinementRec?.reasoning).toContain('PHP');
      expect(refinementRec?.reasoning).toContain('specificity');
    });

    it('should not recommend refinement for headers with low frequency', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      // x-rare-vendor has 8% frequency, below 10% threshold
      const lowFreqRec = result.find(r => r.pattern === 'x-rare-vendor');
      expect(lowFreqRec).toBeUndefined();
    });

    it('should not recommend refinement for headers without vendor info', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      // x-generic-header has no vendor info
      const genericRec = result.find(r => r.pattern === 'x-generic-header');
      expect(genericRec).toBeUndefined();
    });

    it('should filter out headers below minimum occurrence threshold', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      // x-below-threshold has siteCount: 3, but minOccurrences is 5
      const belowThresholdRec = result.find(r => r.pattern === 'x-below-threshold');
      expect(belowThresholdRec).toBeUndefined();
    });

    it('should use primary vendor for refinement suggestions', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      const refinementRec = result.find(r => r.pattern === 'x-powered-by');
      expect(refinementRec).toBeDefined();
      
      // Should use first vendor (PHP) for refinement suggestion
      expect(refinementRec?.action).toBe('refine_to_x-powered-by.*php');
      expect(refinementRec?.reasoning).toContain('PHP');
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

    it('should adjust confidence for refined patterns', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      const refinementRec = result.find(r => r.pattern === 'x-powered-by');
      expect(refinementRec).toBeDefined();
      
      // Confidence should be reasonable but account for refinement reducing frequency
      expect(refinementRec?.confidence.value).toBeGreaterThan(0);
      expect(refinementRec?.confidence.value).toBeLessThan(1);
    });
  });

  describe('Recommendation Structure', () => {
    it('should generate complete recommendation objects', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      for (const recommendation of result) {
        expect(recommendation).toHaveProperty('type', 'refine');
        expect(recommendation).toHaveProperty('pattern');
        expect(recommendation).toHaveProperty('action');
        expect(recommendation).toHaveProperty('confidence');
        expect(recommendation).toHaveProperty('reasoning');
        
        expect(typeof recommendation.pattern).toBe('string');
        expect(typeof recommendation.action).toBe('string');
        expect(typeof recommendation.reasoning).toBe('string');
        expect(recommendation.action).toMatch(/^refine_to_/);
      }
    });

    it('should provide meaningful reasoning for each recommendation', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      for (const recommendation of result) {
        expect(recommendation.reasoning).toBeTruthy();
        expect(recommendation.reasoning.length).toBeGreaterThan(10);
        
        // Should mention vendor and specificity
        expect(recommendation.reasoning).toMatch(/PHP|Node\.js|RareVendor/);
        expect(recommendation.reasoning).toContain('specificity');
      }
    });

    it('should create proper refined pattern suggestions', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      const refinementRec = result.find(r => r.pattern === 'x-powered-by');
      expect(refinementRec).toBeDefined();
      
      // Should create pattern with vendor name in lowercase
      expect(refinementRec?.action).toBe('refine_to_x-powered-by.*php');
      
      // Pattern should be based on original pattern name + vendor
      expect(refinementRec?.action).toContain(refinementRec!.pattern);
      expect(refinementRec?.action).toContain('.*php');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing vendor analysis gracefully', () => {
      const noVendorResults = {
        ...mockAggregatedResults,
        vendor: undefined
      };

      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, noVendorResults);

      // Should return empty array since vendor info is required for refinements
      expect(result).toEqual([]);
    });

    it('should handle empty vendor data gracefully', () => {
      const emptyVendorResults = {
        ...mockAggregatedResults,
        vendor: {
          ...mockAggregatedResults.vendor,
          analyzerSpecific: {
            ...mockAggregatedResults.vendor.analyzerSpecific,
            vendorsByHeader: new Map()
          }
        }
      };

      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, emptyVendorResults);

      // Should return empty array since no vendor data exists
      expect(result).toEqual([]);
    });

    it('should handle headers with empty vendor arrays', () => {
      const emptyVendorArrayResults = {
        ...mockAggregatedResults,
        vendor: {
          ...mockAggregatedResults.vendor,
          analyzerSpecific: {
            ...mockAggregatedResults.vendor.analyzerSpecific,
            vendorsByHeader: new Map([
              ['x-powered-by', []] // Empty vendor array
            ])
          }
        }
      };

      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, emptyVendorArrayResults);

      // Should not recommend refinement for headers with empty vendor arrays
      const refinementRec = result.find(r => r.pattern === 'x-powered-by');
      expect(refinementRec).toBeUndefined();
    });

    it('should handle vendor names with special characters', () => {
      const specialVendorResults = {
        ...mockAggregatedResults,
        vendor: {
          ...mockAggregatedResults.vendor,
          analyzerSpecific: {
            ...mockAggregatedResults.vendor.analyzerSpecific,
            vendorsByHeader: new Map([
              ['x-powered-by', [
                { vendor: 'Microsoft.NET', confidence: 0.9, category: 'framework' }
              ]]
            ])
          }
        }
      };

      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, specialVendorResults);

      const refinementRec = result.find(r => r.pattern === 'x-powered-by');
      expect(refinementRec).toBeDefined();
      
      // Should handle special characters in vendor names
      expect(refinementRec?.action).toBe('refine_to_x-powered-by.*microsoft.net');
      expect(refinementRec?.reasoning).toContain('Microsoft.NET');
    });
  });
});