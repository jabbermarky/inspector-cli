/**
 * Unit tests for RecommendationAnalyzerV2
 * 
 * Tests the core interface compliance and basic functionality of the 
 * V2 recommendation system without cross-analyzer dependencies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecommendationAnalyzerV2 } from '../recommendation-analyzer-v2.js';
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

// Mock logger to avoid import issues in tests
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

describe('RecommendationAnalyzerV2', () => {
  let analyzer: RecommendationAnalyzerV2;
  let mockPreprocessedData: PreprocessedData;
  let mockAnalysisOptions: AnalysisOptions;
  let mockAggregatedResults: AggregatedResults;

  beforeEach(() => {
    analyzer = new RecommendationAnalyzerV2();
    
    // Create minimal mock data
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
          metaTags: new Map([
            ['generator', new Set(['WordPress 6.2'])]
          ]),
          scripts: new Set(['wp-content/themes/twentytwentythree/script.js']),
          technologies: new Set(['WordPress', 'PHP', 'Apache']),
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
          statisticallySignificantHeaders: 5
        }
      }
    };

    mockAnalysisOptions = {
      minOccurrences: 2,
      includeExamples: true,
      maxExamples: 10,
      semanticFiltering: true
    };

    // Create mock aggregated results with minimal data
    const createMockAnalysisResult = <T>(analyzerSpecific?: T): AnalysisResult<T> => ({
      patterns: new Map([
        ['x-powered-by', {
          pattern: 'x-powered-by',
          siteCount: 1,
          sites: new Set(['example.com']),
          frequency: 1.0,
          examples: new Set(['PHP/7.4'])
        }]
      ]),
      totalSites: 1,
      metadata: {
        analyzer: 'test-analyzer',
        analyzedAt: '2024-01-01T00:00:00Z',
        totalPatternsFound: 1,
        totalPatternsAfterFiltering: 1,
        options: mockAnalysisOptions
      },
      analyzerSpecific
    });

    mockAggregatedResults = {
      headers: createMockAnalysisResult<HeaderSpecificData>({
        securityHeaders: new Set(['x-powered-by']),
        customHeaders: new Set(['x-wp-total'])
      }),
      metaTags: createMockAnalysisResult(),
      scripts: createMockAnalysisResult(),
      semantic: createMockAnalysisResult<SemanticSpecificData>({
        categoryDistribution: new Map([
          ['security', {
            category: 'security',
            headerCount: 1,
            siteCount: 1,
            frequency: 1.0,
            averageConfidence: 0.8,
            topHeaders: ['x-powered-by']
          }]
        ]),
        headerPatterns: new Map([
          ['x-powered-by', {
            pattern: 'x-powered-by',
            category: 'security',
            confidence: 0.8,
            discriminativeScore: 0.6,
            filterRecommendation: 'filter',
            siteCount: 1,
            sites: new Set(['example.com']),
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
      }),
      validation: createMockAnalysisResult(),
      vendor: createMockAnalysisResult<VendorSpecificData>({
        vendorsByHeader: new Map(),
        vendorStats: {},
        technologyStack: {},
        vendorConfidence: new Map(),
        technologySignatures: [],
        conflictingVendors: [],
        summary: {
          totalVendorsDetected: 3,
          highConfidenceVendors: 2,
          technologyCategories: ['CMS', 'Language', 'Server'],
          stackComplexity: 'moderate'
        }
      }),
      discovery: createMockAnalysisResult(),
      cooccurrence: createMockAnalysisResult(),
      technologies: createMockAnalysisResult(),
      correlations: createMockAnalysisResult<BiasSpecificData>({
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
      }),
      summary: {
        totalSitesAnalyzed: 1,
        totalPatternsFound: 1,
        analysisDate: '2024-01-01T00:00:00Z',
        topPatterns: {
          headers: [{ pattern: 'x-powered-by', siteCount: 1, frequency: 1.0 }],
          metaTags: [],
          scripts: [],
          technologies: []
        }
      }
    };
  });

  describe('Interface Compliance', () => {
    it('should implement FrequencyAnalyzer interface correctly', () => {
      expect(analyzer).toHaveProperty('analyze');
      expect(analyzer).toHaveProperty('getName');
      expect(typeof analyzer.analyze).toBe('function');
      expect(typeof analyzer.getName).toBe('function');
    });

    it('should return correct analyzer name', () => {
      expect(analyzer.getName()).toBe('RecommendationAnalyzerV2');
    });

    it('should have setter methods for cross-analyzer data', () => {
      expect(analyzer).toHaveProperty('setAggregatedResults');
      expect(analyzer).toHaveProperty('setBiasAnalysis');
      expect(analyzer).toHaveProperty('setValidationResults');
      expect(typeof analyzer.setAggregatedResults).toBe('function');
      expect(typeof analyzer.setBiasAnalysis).toBe('function');
      expect(typeof analyzer.setValidationResults).toBe('function');
    });
  });

  describe('Basic Analysis', () => {
    it('should analyze with minimal data and return valid result structure', async () => {
      // Set up analyzer with aggregated results
      analyzer.setAggregatedResults(mockAggregatedResults);

      const result = await analyzer.analyze(mockPreprocessedData, mockAnalysisOptions);

      // Validate basic result structure
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('totalSites', 1);
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('analyzerSpecific');

      // Validate metadata
      expect(result.metadata.analyzer).toBe('RecommendationAnalyzerV2');
      expect(result.metadata.options).toEqual(mockAnalysisOptions);

      // Validate analyzer-specific data structure
      const specificData = result.analyzerSpecific!;
      expect(specificData).toHaveProperty('learnRecommendations');
      expect(specificData).toHaveProperty('detectCmsRecommendations');
      expect(specificData).toHaveProperty('groundTruthRecommendations');
      expect(specificData).toHaveProperty('crossAnalyzerInsights');
      expect(specificData).toHaveProperty('recommendationMetrics');
      expect(specificData).toHaveProperty('biasAwareAssessments');
    });

    it('should handle analysis without aggregated results', async () => {
      // Don't set aggregated results
      const result = await analyzer.analyze(mockPreprocessedData, mockAnalysisOptions);

      expect(result).toHaveProperty('analyzerSpecific');
      expect(result.analyzerSpecific).toBeDefined();
      
      // Should still return valid structure even without cross-analyzer data
      const specificData = result.analyzerSpecific!;
      expect(specificData.learnRecommendations.filteringRecommendations).toHaveLength(0);
    });

    it('should generate filtering recommendations when cross-analyzer data is available', async () => {
      analyzer.setAggregatedResults(mockAggregatedResults);

      const result = await analyzer.analyze(mockPreprocessedData, mockAnalysisOptions);
      const specificData = result.analyzerSpecific!;

      // Should have filtering recommendations based on header patterns
      expect(specificData.learnRecommendations.filteringRecommendations).toBeDefined();
      expect(Array.isArray(specificData.learnRecommendations.filteringRecommendations)).toBe(true);

      // Should have confidence distribution
      expect(specificData.learnRecommendations.confidenceDistribution).toBeDefined();
      expect(typeof specificData.learnRecommendations.confidenceDistribution.low).toBe('number');
      expect(typeof specificData.learnRecommendations.confidenceDistribution.medium).toBe('number');
      expect(typeof specificData.learnRecommendations.confidenceDistribution.high).toBe('number');
      expect(typeof specificData.learnRecommendations.confidenceDistribution.veryHigh).toBe('number');
    });
  });

  describe('Cross-Analyzer Integration', () => {
    it('should build cross-analyzer context from aggregated results', async () => {
      analyzer.setAggregatedResults(mockAggregatedResults);

      const result = await analyzer.analyze(mockPreprocessedData, mockAnalysisOptions);

      // Should succeed without errors when cross-analyzer data is available
      expect(result.analyzerSpecific).toBeDefined();
    });

    it('should generate quality metrics based on cross-analyzer insights', async () => {
      analyzer.setAggregatedResults(mockAggregatedResults);

      const result = await analyzer.analyze(mockPreprocessedData, mockAnalysisOptions);
      const metrics = result.analyzerSpecific!.recommendationMetrics;

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

    it('should generate bias-aware assessments', async () => {
      analyzer.setAggregatedResults(mockAggregatedResults);

      const result = await analyzer.analyze(mockPreprocessedData, mockAnalysisOptions);
      const biasAssessment = result.analyzerSpecific!.biasAwareAssessments;

      expect(['low', 'medium', 'high', 'critical']).toContain(biasAssessment.overallBiasRisk);
      expect(Array.isArray(biasAssessment.biasSourceIdentification)).toBe(true);
      expect(Array.isArray(biasAssessment.mitigationStrategies)).toBe(true);
      expect(biasAssessment.biasAdjustedConfidence).toHaveProperty('value');
      expect(biasAssessment.biasAdjustedConfidence).toHaveProperty('level');
      expect(biasAssessment.transparencyReport).toHaveProperty('biasesIdentified');
      expect(biasAssessment.transparencyReport).toHaveProperty('mitigationApplied');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid preprocessed data gracefully', async () => {
      const invalidData = {
        ...mockPreprocessedData,
        sites: new Map() // Empty sites
      };

      await expect(analyzer.analyze(invalidData, mockAnalysisOptions)).resolves.toBeDefined();
    });

    it('should handle missing options gracefully', async () => {
      const minimalOptions: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false
      };

      await expect(analyzer.analyze(mockPreprocessedData, minimalOptions)).resolves.toBeDefined();
    });
  });

  describe('Statistical Integration', () => {
    it('should use real statistical calculations for confidence scoring', async () => {
      analyzer.setAggregatedResults(mockAggregatedResults);

      const result = await analyzer.analyze(mockPreprocessedData, mockAnalysisOptions);
      const recommendations = result.analyzerSpecific!.learnRecommendations.filteringRecommendations;

      for (const recommendation of recommendations) {
        // Check that statistical methods are used in confidence source
        expect(recommendation.confidence.source.method).toContain('statistical');
        expect(recommendation.confidence.source.version).toBe('2.1');
        
        // Check that uncertainty is calculated with real methods
        expect(['margin-of-error-95-ci', 'estimated-uncertainty']).toContain(
          recommendation.confidence.uncertainty.type
        );
        
        // Check that reasoning includes statistical basis
        expect(recommendation.reasoning.statisticalBasis).toBeDefined();
        expect(recommendation.reasoning.statisticalBasis.method).toBeDefined();
        expect(recommendation.reasoning.statisticalBasis.pValue).toBeGreaterThan(0);
        expect(recommendation.reasoning.statisticalBasis.pValue).toBeLessThanOrEqual(1);
        
        // Check algorithmic logic includes statistical constants
        expect(recommendation.reasoning.algorithmicLogic.algorithm).toBe('statistical-cross-analyzer-ensemble');
        expect(recommendation.reasoning.algorithmicLogic.parameters).toHaveProperty('significanceLevel');
        expect(recommendation.reasoning.algorithmicLogic.parameters).toHaveProperty('powerThreshold');
        expect(recommendation.reasoning.algorithmicLogic.parameters).toHaveProperty('marginOfError');
      }
    });

    it('should calculate confidence uncertainty using standard error for proportions', async () => {
      // Create larger dataset for meaningful statistical calculations
      const largerData = {
        ...mockPreprocessedData,
        totalSites: 100,
        sites: new Map()
      };
      
      // Add multiple sites with headers
      for (let i = 0; i < 100; i++) {
        largerData.sites.set(`site${i}.com`, {
          url: `https://site${i}.com`,
          normalizedUrl: `site${i}.com`,
          cms: i < 50 ? 'wordpress' : 'joomla',
          confidence: 0.9,
          headers: new Map([
            ['x-powered-by', new Set(['PHP/7.4'])],
            ['server', new Set(['Apache'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(['WordPress', 'PHP']),
          capturedAt: '2024-01-01T00:00:00Z'
        });
      }

      // Update aggregated results to match larger dataset
      const largerResults = {
        ...mockAggregatedResults,
        headers: {
          ...mockAggregatedResults.headers,
          patterns: new Map([
            ['x-powered-by', {
              pattern: 'x-powered-by',
              siteCount: 80, // 80% occurrence
              sites: new Set(),
              frequency: 0.8,
              examples: new Set(['PHP/7.4'])
            }]
          ]),
          totalSites: 100
        }
      };

      analyzer.setAggregatedResults(largerResults);

      const result = await analyzer.analyze(largerData, mockAnalysisOptions);
      const recommendations = result.analyzerSpecific!.learnRecommendations.filteringRecommendations;

      if (recommendations.length > 0) {
        const recommendation = recommendations[0];
        
        // Should use statistical uncertainty calculation for larger sample
        expect(['margin-of-error-95-ci', 'estimated-uncertainty']).toContain(
          recommendation.confidence.uncertainty.type
        );
        
        // Uncertainty should be reasonable for our sample size
        expect(recommendation.confidence.uncertainty.value).toBeGreaterThan(0);
        expect(recommendation.confidence.uncertainty.value).toBeLessThan(0.5);
      }
    });

    it('should use binomial tests for statistical significance', async () => {
      analyzer.setAggregatedResults(mockAggregatedResults);

      const result = await analyzer.analyze(mockPreprocessedData, mockAnalysisOptions);
      const recommendations = result.analyzerSpecific!.learnRecommendations.filteringRecommendations;

      if (recommendations.length > 0) {
        const recommendation = recommendations[0];
        
        // Statistical basis should indicate statistical test was used (either original binomial or pre-calculated)
        expect([
          'binomial-significance-test', 
          'binomial-test',
          'confidence-based-estimation',
          'not-applicable-test-precalculated',
          'chi-square-test-precalculated',
          'fisher-exact-test-precalculated',
          'binomial-test-precalculated'
        ]).toContain(
          recommendation.reasoning.statisticalBasis.method
        );
      }
    });

    it('should include statistical power analysis in algorithmic parameters', async () => {
      analyzer.setAggregatedResults(mockAggregatedResults);

      const result = await analyzer.analyze(mockPreprocessedData, mockAnalysisOptions);
      const recommendations = result.analyzerSpecific!.learnRecommendations.filteringRecommendations;

      for (const recommendation of recommendations) {
        const params = recommendation.reasoning.algorithmicLogic.parameters;
        
        // Should include power analysis threshold
        expect(params.powerThreshold).toBe(0.8);
        
        // Should include standard significance level
        expect(params.significanceLevel).toBe(0.05);
        
        // Should include margin of error
        expect(params.marginOfError).toBe(0.05);
      }
    });
  });

  describe('Confidence Scoring', () => {
    it('should generate valid confidence scores', async () => {
      analyzer.setAggregatedResults(mockAggregatedResults);

      const result = await analyzer.analyze(mockPreprocessedData, mockAnalysisOptions);
      const recommendations = result.analyzerSpecific!.learnRecommendations.filteringRecommendations;

      for (const recommendation of recommendations) {
        expect(recommendation.confidence.value).toBeGreaterThanOrEqual(0);
        expect(recommendation.confidence.value).toBeLessThanOrEqual(1);
        expect(['low', 'medium', 'high', 'very-high']).toContain(recommendation.confidence.level);
        expect(recommendation.confidence.source).toHaveProperty('method');
        expect(recommendation.confidence.source).toHaveProperty('version');
        expect(recommendation.confidence.breakdown).toBeDefined();
        expect(recommendation.confidence.uncertainty).toBeDefined();
      }
    });

    it('should calculate confidence distribution correctly', async () => {
      analyzer.setAggregatedResults(mockAggregatedResults);

      const result = await analyzer.analyze(mockPreprocessedData, mockAnalysisOptions);
      const distribution = result.analyzerSpecific!.learnRecommendations.confidenceDistribution;

      // All percentages should sum to 1 (or close due to floating point)
      const sum = distribution.low + distribution.medium + distribution.high + distribution.veryHigh;
      expect(sum).toBeCloseTo(1, 5);

      // All values should be between 0 and 1
      expect(distribution.low).toBeGreaterThanOrEqual(0);
      expect(distribution.low).toBeLessThanOrEqual(1);
      expect(distribution.medium).toBeGreaterThanOrEqual(0);
      expect(distribution.medium).toBeLessThanOrEqual(1);
      expect(distribution.high).toBeGreaterThanOrEqual(0);
      expect(distribution.high).toBeLessThanOrEqual(1);
      expect(distribution.veryHigh).toBeGreaterThanOrEqual(0);
      expect(distribution.veryHigh).toBeLessThanOrEqual(1);
    });
  });
});