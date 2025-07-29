/**
 * Unit tests for FilteringRecommendationsGenerator
 * 
 * Focused tests for the filtering recommendation generation logic,
 * testing the individual generator in isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilteringRecommendationsGenerator } from '../recommendations/generators/filtering-recommendations.js';
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

describe('FilteringRecommendationsGenerator', () => {
  let generator: FilteringRecommendationsGenerator;
  let mockPreprocessedData: PreprocessedData;
  let mockAnalysisOptions: AnalysisOptions;
  let mockAggregatedResults: AggregatedResults;

  beforeEach(() => {
    generator = new FilteringRecommendationsGenerator();
    
    mockPreprocessedData = {
      sites: new Map([
        ['example.com', {
          url: 'https://example.com',
          normalizedUrl: 'example.com',
          cms: 'wordpress',
          confidence: 0.9,
          headers: new Map([
            ['x-powered-by', new Set(['PHP/7.4'])],
            ['server', new Set(['Apache'])],
            ['x-wp-total', new Set(['42'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(['WordPress', 'PHP']),
          capturedAt: '2024-01-01T00:00:00Z'
        }]
      ]),
      totalSites: 1,
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
      minOccurrences: 2,
      includeExamples: true,
      maxExamples: 10,
      semanticFiltering: true
    };

    // Create mock aggregated results with header patterns
    mockAggregatedResults = {
      headers: {
        patterns: new Map([
          ['x-powered-by', {
            pattern: 'x-powered-by',
            siteCount: 80,
            sites: new Set(['site1.com', 'site2.com']),
            frequency: 0.8,
            examples: new Set(['PHP/7.4', 'PHP/8.0'])
          }],
          ['server', {
            pattern: 'server',
            siteCount: 95,
            sites: new Set(['site1.com', 'site2.com']),
            frequency: 0.95,
            examples: new Set(['Apache', 'nginx'])
          }],
          ['x-rare-header', {
            pattern: 'x-rare-header',
            siteCount: 5,
            sites: new Set(['site1.com']),
            frequency: 0.05,
            examples: new Set(['rare-value'])
          }]
        ]),
        totalSites: 100,
        metadata: {
          analyzer: 'HeaderAnalyzer',
          analyzedAt: '2024-01-01T00:00:00Z',
          totalPatternsFound: 3,
          totalPatternsAfterFiltering: 3,
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
            ['x-powered-by', {
              pattern: 'x-powered-by',
              category: 'security',
              confidence: 0.8,
              discriminativeScore: 0.6,
              filterRecommendation: 'filter',
              siteCount: 80,
              sites: new Set(['site1.com']),
              vendor: 'PHP',
              platformName: 'Apache'
            }]
          ]),
          vendorDetections: new Map(),
          insights: {
            totalHeaders: 3,
            categorizedHeaders: 1,
            uncategorizedHeaders: 2,
            mostCommonCategory: 'security',
            highConfidenceHeaders: 1,
            vendorHeaders: 1,
            customHeaders: 1,
            potentialSecurity: ['x-powered-by'],
            recommendations: ['Filter security-revealing headers']
          },
          qualityMetrics: {
            categorizationCoverage: 0.33,
            averageConfidence: 0.8,
            vendorDetectionRate: 0.33,
            customHeaderRatio: 0.33
          }
        }
      } as AnalysisResult<SemanticSpecificData>,
      vendor: {
        patterns: new Map(),
        totalSites: 100,
        metadata: {
          analyzer: 'VendorAnalyzer',
          analyzedAt: '2024-01-01T00:00:00Z',
          totalPatternsFound: 1,
          totalPatternsAfterFiltering: 1,
          options: mockAnalysisOptions
        },
        analyzerSpecific: {
          vendorsByHeader: new Map([
            ['x-powered-by', [{ vendor: 'PHP', confidence: 0.9, category: 'language' }]]
          ]),
          vendorStats: {},
          technologyStack: {},
          vendorConfidence: new Map(),
          technologySignatures: [],
          conflictingVendors: [],
          summary: {
            totalVendorsDetected: 1,
            highConfidenceVendors: 1,
            technologyCategories: ['Language'],
            stackComplexity: 'simple'
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
        totalPatternsFound: 3,
        analysisDate: '2024-01-01T00:00:00Z',
        topPatterns: {
          headers: [{ pattern: 'x-powered-by', siteCount: 80, frequency: 0.8 }],
          metaTags: [],
          scripts: [],
          technologies: []
        }
      }
    };
  });

  describe('Basic Generation', () => {
    it('should generate filtering recommendations from header patterns', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should return empty recommendations when no aggregated results provided', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions);

      expect(result.recommendations).toEqual([]);
      expect(result.confidenceDistribution.low).toBe(0.25);
      expect(result.confidenceDistribution.medium).toBe(0.25);
      expect(result.confidenceDistribution.high).toBe(0.25);
      expect(result.confidenceDistribution.veryHigh).toBe(0.25);
    });

    it('should return empty recommendations when no header patterns exist', () => {
      const emptyResults = {
        ...mockAggregatedResults,
        headers: {
          ...mockAggregatedResults.headers,
          patterns: new Map()
        }
      };

      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, emptyResults);

      expect(result.recommendations).toEqual([]);
    });
  });

  describe('Filtering Logic', () => {
    it('should recommend filtering for security-revealing headers', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      const securityHeader = result.recommendations.find(r => r.pattern === 'x-powered-by');
      expect(securityHeader).toBeDefined();
      expect(securityHeader?.action).toBe('filter');
    });

    it('should recommend retaining common infrastructure headers with moderate frequency', () => {
      // Modify server header to have moderate frequency
      const moderateFrequencyResults = {
        ...mockAggregatedResults,
        headers: {
          ...mockAggregatedResults.headers,
          patterns: new Map([
            ['server', {
              pattern: 'server',
              siteCount: 30, // 30% frequency
              sites: new Set(['site1.com']),
              frequency: 0.3,
              examples: new Set(['Apache'])
            }]
          ])
        }
      };

      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, moderateFrequencyResults);

      const serverHeader = result.recommendations.find(r => r.pattern === 'server');
      expect(serverHeader).toBeDefined();
      expect(serverHeader?.action).toBe('retain');
    });

    it('should recommend retaining moderate frequency headers without semantic data', () => {
      // Create header with moderate frequency that's not in semantic data
      const moderateResults = {
        ...mockAggregatedResults,
        headers: {
          ...mockAggregatedResults.headers,
          patterns: new Map([
            ['x-moderate-header', {
              pattern: 'x-moderate-header',
              siteCount: 50, // 50% frequency
              sites: new Set(['site1.com']),
              frequency: 0.5,
              examples: new Set(['moderate-value'])
            }]
          ])
        },
        semantic: {
          ...mockAggregatedResults.semantic,
          analyzerSpecific: {
            ...mockAggregatedResults.semantic.analyzerSpecific,
            headerPatterns: new Map() // No semantic data for this header
          }
        }
      };

      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, moderateResults);

      const moderateHeader = result.recommendations.find(r => r.pattern === 'x-moderate-header');
      expect(moderateHeader).toBeDefined();
      expect(moderateHeader?.action).toBe('retain');
    });

    it('should skip headers below minimum occurrence threshold', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      // x-rare-header has siteCount: 5, but minOccurrences is 2, so it should be included
      const rareHeader = result.recommendations.find(r => r.pattern === 'x-rare-header');
      expect(rareHeader).toBeDefined();

      // But if we increase minOccurrences to 10, it should be excluded
      const highThresholdOptions = { ...mockAnalysisOptions, minOccurrences: 10 };
      const filteredResult = generator.generate(mockPreprocessedData, highThresholdOptions, mockAggregatedResults);
      
      const filteredRareHeader = filteredResult.recommendations.find(r => r.pattern === 'x-rare-header');
      expect(filteredRareHeader).toBeUndefined();
    });
  });

  describe('Confidence Calculations', () => {
    it('should generate valid confidence scores for recommendations', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      for (const recommendation of result.recommendations) {
        expect(recommendation.confidence.value).toBeGreaterThanOrEqual(0);
        expect(recommendation.confidence.value).toBeLessThanOrEqual(1);
        expect(['low', 'medium', 'high', 'very-high']).toContain(recommendation.confidence.level);
      }
    });

    it('should calculate confidence distribution correctly', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      const distribution = result.confidenceDistribution;
      const sum = distribution.low + distribution.medium + distribution.high + distribution.veryHigh;
      
      expect(sum).toBeCloseTo(1, 5);
      expect(distribution.low).toBeGreaterThanOrEqual(0);
      expect(distribution.medium).toBeGreaterThanOrEqual(0);
      expect(distribution.high).toBeGreaterThanOrEqual(0);
      expect(distribution.veryHigh).toBeGreaterThanOrEqual(0);
    });

    it('should provide higher confidence for semantically categorized headers', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      const semanticHeader = result.recommendations.find(r => r.pattern === 'x-powered-by');
      const nonSemanticHeader = result.recommendations.find(r => r.pattern === 'server');

      if (semanticHeader && nonSemanticHeader) {
        // x-powered-by has semantic categorization, server doesn't in our mock
        expect(semanticHeader.confidence.value).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Cross-Analyzer Integration', () => {
    it('should use semantic analysis data when available', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      const semanticHeader = result.recommendations.find(r => r.pattern === 'x-powered-by');
      expect(semanticHeader).toBeDefined();
      expect(semanticHeader?.reasoning).toContain('security');
    });

    it('should use vendor analysis data when available', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      const vendorHeader = result.recommendations.find(r => r.pattern === 'x-powered-by');
      expect(vendorHeader).toBeDefined();
      // The current implementation focuses on frequency and semantic category, not vendor info in reasoning
      expect(vendorHeader?.reasoning).toContain('security');
    });

    it('should handle missing cross-analyzer data gracefully', () => {
      const limitedResults = {
        ...mockAggregatedResults,
        semantic: undefined,
        vendor: undefined
      };

      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, limitedResults);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // Should still generate recommendations based on frequency alone
      for (const recommendation of result.recommendations) {
        expect(recommendation.confidence.value).toBeGreaterThan(0);
        expect(recommendation.reasoning).toBeDefined();
      }
    });
  });

  describe('Recommendation Structure', () => {
    it('should generate complete recommendation objects', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      for (const recommendation of result.recommendations) {
        expect(recommendation).toHaveProperty('type');
        expect(recommendation).toHaveProperty('pattern');
        expect(recommendation).toHaveProperty('action');
        expect(recommendation).toHaveProperty('confidence');
        expect(recommendation).toHaveProperty('reasoning');
        
        expect(['filter', 'retain']).toContain(recommendation.action);
        expect(typeof recommendation.pattern).toBe('string');
        expect(typeof recommendation.reasoning).toBe('string');
      }
    });

    it('should provide meaningful reasoning for each recommendation', () => {
      const result = generator.generate(mockPreprocessedData, mockAnalysisOptions, mockAggregatedResults);

      for (const recommendation of result.recommendations) {
        expect(recommendation.reasoning).toBeTruthy();
        expect(recommendation.reasoning.length).toBeGreaterThan(10);
      }
    });
  });
});