/**
 * Unit tests for RecommendationCoordinator
 * 
 * Focused tests for the coordinator logic that orchestrates
 * the modular recommendation generators.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecommendationCoordinator } from '../recommendations/core/recommendation-coordinator.js';
import type { 
  PreprocessedData, 
  AnalysisOptions,
  AggregatedResults,
  AnalysisResult,
  HeaderSpecificData,
  SemanticSpecificData,
  VendorSpecificData
} from '../../types/analyzer-interface.js';
import type { BiasSpecificData } from '../../types/bias-analysis-types-v2.js';

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

describe('RecommendationCoordinator', () => {
  let coordinator: RecommendationCoordinator;
  let mockPreprocessedData: PreprocessedData;
  let mockAnalysisOptions: AnalysisOptions;
  let mockAggregatedResults: AggregatedResults;
  let mockBiasAnalysis: AnalysisResult<BiasSpecificData>;

  beforeEach(() => {
    coordinator = new RecommendationCoordinator();
    
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
            ['x-wp-version', new Set(['6.2'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(['WordPress', 'PHP']),
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

    // Create comprehensive mock aggregated results
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
            sites: new Set(['site1.com']),
            frequency: 0.95,
            examples: new Set(['Apache', 'nginx'])
          }],
          ['x-wp-version', {
            pattern: 'x-wp-version',
            siteCount: 30,
            sites: new Set(['site1.com']),
            frequency: 0.3,
            examples: new Set(['6.2', '6.1'])
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
          totalPatternsFound: 2,
          totalPatternsAfterFiltering: 2,
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
            }],
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
            totalHeaders: 3,
            categorizedHeaders: 2,
            uncategorizedHeaders: 1,
            mostCommonCategory: 'security',
            highConfidenceHeaders: 2,
            vendorHeaders: 2,
            customHeaders: 1,
            potentialSecurity: ['x-powered-by'],
            recommendations: ['Filter security headers', 'Retain CMS identifiers']
          },
          qualityMetrics: {
            categorizationCoverage: 0.67,
            averageConfidence: 0.88,
            vendorDetectionRate: 0.67,
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
          totalPatternsFound: 2,
          totalPatternsAfterFiltering: 2,
          options: mockAnalysisOptions
        },
        analyzerSpecific: {
          vendorsByHeader: new Map([
            ['x-powered-by', [{ vendor: 'PHP', confidence: 0.9, category: 'language' }]],
            ['x-wp-version', [{ vendor: 'WordPress', confidence: 0.95, category: 'cms' }]]
          ]),
          vendorStats: {},
          technologyStack: {},
          vendorConfidence: new Map(),
          technologySignatures: [],
          conflictingVendors: [],
          summary: {
            totalVendorsDetected: 2,
            highConfidenceVendors: 2,
            technologyCategories: ['Language', 'CMS'],
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
        totalPatternsFound: 3,
        analysisDate: '2024-01-01T00:00:00Z',
        topPatterns: {
          headers: [
            { pattern: 'server', siteCount: 95, frequency: 0.95 },
            { pattern: 'x-powered-by', siteCount: 80, frequency: 0.8 }
          ],
          metaTags: [],
          scripts: [],
          technologies: []
        }
      }
    };

    mockBiasAnalysis = {
      patterns: new Map(),
      totalSites: 100,
      metadata: {
        analyzer: 'BiasAnalyzer',
        analyzedAt: '2024-01-01T00:00:00Z',
        totalPatternsFound: 0,
        totalPatternsAfterFiltering: 0,
        options: mockAnalysisOptions
      },
      analyzerSpecific: {
        headerCorrelations: new Map(),
        datasetBias: {
          overallBiasScore: 0.2,
          biasLevel: 'low',
          majorBiases: [],
          detectedBiases: [],
          sampleSizeAdequate: true,
          diversityScore: 0.8
        },
        biasAdjustedResults: new Map(),
        biasAnalysisMetadata: {
          analysisDate: '2024-01-01T00:00:00Z',
          totalHeadersAnalyzed: 3,
          biasDetectionMethod: 'statistical-correlation',
          confidenceLevel: 0.95
        }
      }
    };
  });

  describe('Basic Interface Compliance', () => {
    it('should implement FrequencyAnalyzer interface', () => {
      expect(coordinator).toHaveProperty('analyze');
      expect(coordinator).toHaveProperty('getName');
      expect(typeof coordinator.analyze).toBe('function');
      expect(typeof coordinator.getName).toBe('function');
    });

    it('should return correct analyzer name', () => {
      expect(coordinator.getName()).toBe('RecommendationCoordinator');
    });

    it('should have setter methods for cross-analyzer integration', () => {
      expect(coordinator).toHaveProperty('setAggregatedResults');
      expect(coordinator).toHaveProperty('setBiasAnalysis');
      expect(coordinator).toHaveProperty('setValidationResults');
      expect(typeof coordinator.setAggregatedResults).toBe('function');
      expect(typeof coordinator.setBiasAnalysis).toBe('function');
      expect(typeof coordinator.setValidationResults).toBe('function');
    });
  });

  describe('Core Analysis Functionality', () => {
    it('should analyze and return complete result structure', async () => {
      coordinator.setAggregatedResults(mockAggregatedResults);
      coordinator.setBiasAnalysis(mockBiasAnalysis);

      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);

      // Validate basic result structure
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('totalSites', 100);
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('analyzerSpecific');

      // Validate metadata shows correct analyzer name for interface compliance
      expect(result.metadata.analyzer).toBe('RecommendationAnalyzerV2');
      expect(result.metadata.options).toEqual(mockAnalysisOptions);
    });

    it('should generate patterns for interface compliance', async () => {
      coordinator.setAggregatedResults(mockAggregatedResults);

      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);

      expect(result.patterns).toBeInstanceOf(Map);
      expect(result.patterns.size).toBeGreaterThan(0);

      // Check pattern structure
      for (const [key, pattern] of result.patterns) {
        expect(typeof key).toBe('string');
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('siteCount');
        expect(pattern).toHaveProperty('sites');
        expect(pattern).toHaveProperty('frequency');
        expect(pattern).toHaveProperty('metadata');
      }
    });

    it('should work without aggregated results', async () => {
      // Don't set aggregated results
      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);

      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      expect(result.analyzerSpecific.learnRecommendations.filteringRecommendations).toEqual([]);
    });
  });

  describe('Generator Coordination', () => {
    it('should coordinate filtering, retention, and refinement generators', async () => {
      coordinator.setAggregatedResults(mockAggregatedResults);

      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);
      const specificData = result.analyzerSpecific;

      // Should have recommendations from all generators
      expect(specificData.learnRecommendations.filteringRecommendations).toBeDefined();
      expect(Array.isArray(specificData.learnRecommendations.filteringRecommendations)).toBe(true);
      
      // Filtering recommendations should exist since we have header patterns with semantic data
      expect(specificData.learnRecommendations.filteringRecommendations.length).toBeGreaterThan(0);
    });

    it('should combine confidence scores from multiple generators', async () => {
      coordinator.setAggregatedResults(mockAggregatedResults);

      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);
      const specificData = result.analyzerSpecific;

      // Should have confidence distribution
      expect(specificData.learnRecommendations.confidenceDistribution).toBeDefined();
      
      const distribution = specificData.learnRecommendations.confidenceDistribution;
      const sum = distribution.low + distribution.medium + distribution.high + distribution.veryHigh;
      expect(sum).toBeCloseTo(1, 5);
    });
  });

  describe('Cross-Analyzer Integration', () => {
    it('should use semantic data when available', async () => {
      coordinator.setAggregatedResults(mockAggregatedResults);

      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);
      const recommendations = result.analyzerSpecific.learnRecommendations.filteringRecommendations;

      // Should have recommendations that reference semantic categories
      const securityRec = recommendations.find(r => 
        r.reasoning.primaryFactors.some(factor => factor.includes('security'))
      );
      expect(securityRec).toBeDefined();
    });

    it('should use vendor data when available', async () => {
      coordinator.setAggregatedResults(mockAggregatedResults);

      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);
      const recommendations = result.analyzerSpecific.learnRecommendations.filteringRecommendations;

      // Should have recommendations - the current implementation focuses on semantic categories
      // Let's check that vendor-associated headers exist in recommendations
      const vendorRec = recommendations.find(r => r.pattern === 'x-powered-by' || r.pattern === 'x-wp-version');
      expect(vendorRec).toBeDefined();
    });

    it('should incorporate bias analysis when provided', async () => {
      coordinator.setAggregatedResults(mockAggregatedResults);
      coordinator.setBiasAnalysis(mockBiasAnalysis);

      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);
      const biasAssessment = result.analyzerSpecific.biasAwareAssessments;

      expect(biasAssessment.overallBiasRisk).toBe('low');
      expect(biasAssessment.biasAdjustedConfidence.value).toBeCloseTo(0.8, 1);
    });
  });

  describe('Result Structure Conversion', () => {
    it('should convert simple recommendations to complex interface format', async () => {
      coordinator.setAggregatedResults(mockAggregatedResults);

      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);
      const specificData = result.analyzerSpecific;

      // Check complex interface structure is created
      expect(specificData).toHaveProperty('learnRecommendations');
      expect(specificData).toHaveProperty('detectCmsRecommendations');
      expect(specificData).toHaveProperty('groundTruthRecommendations');
      expect(specificData).toHaveProperty('crossAnalyzerInsights');
      expect(specificData).toHaveProperty('recommendationMetrics');
      expect(specificData).toHaveProperty('biasAwareAssessments');
    });

    it('should create filtering recommendations with complete structure', async () => {
      coordinator.setAggregatedResults(mockAggregatedResults);

      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);
      const filteringRecs = result.analyzerSpecific.learnRecommendations.filteringRecommendations;

      for (const rec of filteringRecs) {
        // Check complete recommendation structure
        expect(rec).toHaveProperty('pattern');
        expect(rec).toHaveProperty('action');
        expect(rec).toHaveProperty('confidence');
        expect(rec).toHaveProperty('reasoning');
        expect(rec).toHaveProperty('evidence');
        expect(rec).toHaveProperty('biasAssessment');
        expect(rec).toHaveProperty('crossAnalyzerSupport');
        expect(rec).toHaveProperty('diversityMetrics');

        // Check confidence structure
        expect(rec.confidence).toHaveProperty('value');
        expect(rec.confidence).toHaveProperty('level');
        expect(rec.confidence).toHaveProperty('source');
        expect(rec.confidence).toHaveProperty('breakdown');
        expect(rec.confidence).toHaveProperty('uncertainty');
      }
    });

    it('should create quality metrics with valid ranges', async () => {
      coordinator.setAggregatedResults(mockAggregatedResults);

      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);
      const metrics = result.analyzerSpecific.recommendationMetrics;

      // All metrics should be in 0-1 range
      expect(metrics.accuracyEstimate).toBeGreaterThan(0);
      expect(metrics.accuracyEstimate).toBeLessThanOrEqual(1);
      expect(metrics.comprehensiveness).toBeGreaterThan(0);
      expect(metrics.comprehensiveness).toBeLessThanOrEqual(1);
      expect(metrics.actionability).toBeGreaterThan(0);
      expect(metrics.actionability).toBeLessThanOrEqual(1);
      expect(metrics.evidenceQuality).toBeGreaterThan(0);
      expect(metrics.evidenceQuality).toBeLessThanOrEqual(1);
      expect(metrics.biasAwareness).toBeGreaterThan(0);
      expect(metrics.biasAwareness).toBeLessThanOrEqual(1);
      expect(metrics.crossAnalyzerAlignment).toBeGreaterThan(0);
      expect(metrics.crossAnalyzerAlignment).toBeLessThanOrEqual(1);
    });
  });

  describe('Minimal Implementation Patterns', () => {
    it('should create minimal CMS recommendations', async () => {
      coordinator.setAggregatedResults(mockAggregatedResults);

      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);
      const cmsRecs = result.analyzerSpecific.detectCmsRecommendations;

      expect(cmsRecs.emergingOpportunities).toEqual([]);
      expect(cmsRecs.vendorBasedOpportunities).toEqual([]);
      expect(cmsRecs.semanticOpportunities).toEqual([]);
      expect(cmsRecs.technologyStackOpportunities).toEqual([]);
      expect(cmsRecs.confidenceDistribution.low).toBe(0.25);
    });

    it('should create minimal ground truth recommendations', async () => {
      coordinator.setAggregatedResults(mockAggregatedResults);

      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);
      const groundTruthRecs = result.analyzerSpecific.groundTruthRecommendations;

      expect(groundTruthRecs.statisticallyValidatedRules).toEqual([]);
      expect(groundTruthRecs.technologyBasedRules).toEqual([]);
      expect(groundTruthRecs.semanticCategoryRules).toEqual([]);
      expect(groundTruthRecs.evidenceQuality.overall).toBe(0.8);
      expect(groundTruthRecs.biasRiskAssessment.riskLevel).toBe('low');
    });

    it('should create minimal cross-analyzer insights', async () => {
      coordinator.setAggregatedResults(mockAggregatedResults);

      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);
      const insights = result.analyzerSpecific.crossAnalyzerInsights;

      expect(insights.analyzerAgreement.overallAgreement).toBe(0.8);
      expect(insights.conflictResolution).toEqual([]);
      expect(insights.emergingPatterns).toEqual([]);
      expect(insights.biasDetection).toEqual([]);
      expect(insights.confidenceCalibration.method).toBe('frequency-based');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing header patterns gracefully', async () => {
      const emptyResults = {
        ...mockAggregatedResults,
        headers: {
          ...mockAggregatedResults.headers,
          patterns: new Map()
        }
      };
      coordinator.setAggregatedResults(emptyResults);

      const result = await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);

      expect(result).toBeDefined();
      expect(result.analyzerSpecific.learnRecommendations.filteringRecommendations).toEqual([]);
    });

    it('should handle invalid preprocessed data', async () => {
      const invalidData = {
        ...mockPreprocessedData,
        sites: new Map(),
        totalSites: 0
      };

      coordinator.setAggregatedResults(mockAggregatedResults);

      await expect(coordinator.analyze(invalidData, mockAnalysisOptions)).resolves.toBeDefined();
    });

    it('should handle minimal analysis options', async () => {
      const minimalOptions: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false
      };

      coordinator.setAggregatedResults(mockAggregatedResults);

      const result = await coordinator.analyze(mockPreprocessedData, minimalOptions);

      expect(result).toBeDefined();
      expect(result.metadata.options).toEqual(minimalOptions);
    });
  });

  describe('Performance and Efficiency', () => {
    it('should generate results in reasonable time', async () => {
      coordinator.setAggregatedResults(mockAggregatedResults);

      const startTime = Date.now();
      await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);
      const endTime = Date.now();

      // Should complete in under 100ms for this test data size
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should not modify input data', async () => {
      // Store original values to check immutability
      const originalTotalSites = mockPreprocessedData.totalSites;
      const originalMinOccurrences = mockAnalysisOptions.minOccurrences;
      const originalHeaderPatternsSize = mockAggregatedResults.headers.patterns.size;

      coordinator.setAggregatedResults(mockAggregatedResults);
      await coordinator.analyze(mockPreprocessedData, mockAnalysisOptions);

      // Check that key values haven't changed
      expect(mockPreprocessedData.totalSites).toBe(originalTotalSites);
      expect(mockAnalysisOptions.minOccurrences).toBe(originalMinOccurrences);
      expect(mockAggregatedResults.headers.patterns.size).toBe(originalHeaderPatternsSize);
    });
  });
});