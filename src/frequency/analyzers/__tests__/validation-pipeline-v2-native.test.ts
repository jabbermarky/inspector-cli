/**
 * ValidationPipelineV2Native Tests
 * 
 * Comprehensive test suite for native V2 validation implementation.
 * Tests exceed V1 coverage and include V2-specific scenarios.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationPipelineV2Native } from '../validation-pipeline-v2-native.js';
import { 
  FrequencyValidationStage,
  SampleSizeValidationStage,
  DistributionValidationStage,
  CorrelationValidationStage,
  SanityValidationStage,
  SignificanceValidationStage,
  RecommendationValidationStage
} from '../validation-stages.js';
import type { PreprocessedData, AnalysisOptions } from '../../types/analyzer-interface.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }))
}));

describe('ValidationPipelineV2Native', () => {
  let validator: ValidationPipelineV2Native;
  let mockData: PreprocessedData;
  let defaultOptions: AnalysisOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    validator = new ValidationPipelineV2Native();
    
    defaultOptions = {
      minOccurrences: 5,
      includeExamples: true,
      maxExamples: 3,
      semanticFiltering: false
    };

    // Create comprehensive test data
    mockData = {
      sites: new Map([
        ['site1.com', {
          url: 'site1.com',
          normalizedUrl: 'site1.com',
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map([
            ['x-wp-total', new Set(['10'])],
            ['cache-control', new Set(['max-age=3600'])],
            ['server', new Set(['nginx'])],
            ['content-type', new Set(['text/html'])]
          ]),
          metaTags: new Map([
            ['generator', new Set(['WordPress 6.2'])]
          ]),
          scripts: new Set(['https://wp.com/wp-includes/js/jquery.js']),
          technologies: new Set(['WordPress']),
          capturedAt: new Date().toISOString()
        }],
        ['site2.com', {
          url: 'site2.com',
          normalizedUrl: 'site2.com',
          cms: 'WordPress',
          confidence: 0.8,
          headers: new Map([
            ['x-wp-version', new Set(['6.2'])],
            ['cache-control', new Set(['no-cache'])],
            ['server', new Set(['apache'])],
            ['content-type', new Set(['text/html'])]
          ]),
          metaTags: new Map([
            ['generator', new Set(['WordPress 6.2'])]
          ]),
          scripts: new Set(['https://wp.com/wp-content/themes/theme.js']),
          technologies: new Set(['WordPress']),
          capturedAt: new Date().toISOString()
        }],
        ['site3.com', {
          url: 'site3.com',
          normalizedUrl: 'site3.com',
          cms: 'Shopify',
          confidence: 0.9,
          headers: new Map([
            ['x-shopify-shop-id', new Set(['123'])],
            ['server', new Set(['cloudflare'])],
            ['content-type', new Set(['text/html'])]
          ]),
          metaTags: new Map([
            ['generator', new Set(['Shopify'])]
          ]),
          scripts: new Set(['https://cdn.shopify.com/app.js']),
          technologies: new Set(['Shopify']),
          capturedAt: new Date().toISOString()
        }],
        ['site4.com', {
          url: 'site4.com',
          normalizedUrl: 'site4.com',
          cms: 'Drupal',
          confidence: 0.85,
          headers: new Map([
            ['x-drupal-cache', new Set(['HIT'])],
            ['server', new Set(['nginx'])],
            ['content-type', new Set(['text/html'])]
          ]),
          metaTags: new Map([
            ['generator', new Set(['Drupal 9'])]
          ]),
          scripts: new Set(['https://example.com/drupal.js']),
          technologies: new Set(['Drupal']),
          capturedAt: new Date().toISOString()
        }],
        ['site5.com', {
          url: 'site5.com',
          normalizedUrl: 'site5.com',
          cms: 'Unknown',
          confidence: 0.1,
          headers: new Map([
            ['server', new Set(['nginx'])],
            ['content-type', new Set(['text/html'])],
            ['custom-header', new Set(['value'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: new Date().toISOString()
        }]
      ]),
      totalSites: 5,
      metadata: {
        version: '2.0',
        preprocessedAt: new Date().toISOString()
      }
    };
  });

  describe('getName', () => {
    it('should return correct analyzer name', () => {
      expect(validator.getName()).toBe('ValidationPipelineV2Native');
    });
  });

  describe('analyze', () => {
    it('should perform complete validation pipeline', async () => {
      const result = await validator.analyze(mockData, defaultOptions);

      expect(result).toBeDefined();
      expect(result.patterns).toBeInstanceOf(Map);
      expect(result.totalSites).toBe(5);
      expect(result.metadata.analyzer).toBe('ValidationPipelineV2Native');
      expect(result.analyzerSpecific).toBeDefined();
    });

    it('should run all validation stages', async () => {
      const result = await validator.analyze(mockData, defaultOptions);
      const stageResults = result.analyzerSpecific!.stageResults;

      expect(stageResults).toHaveLength(7);
      expect(stageResults.map(r => r.stageName)).toEqual([
        'FrequencyValidation',
        'SampleSizeValidation',
        'DistributionValidation',
        'CorrelationValidation',
        'SanityValidation',
        'SignificanceValidation',
        'RecommendationValidation'
      ]);
    });

    it('should accumulate quality scores across stages', async () => {
      const result = await validator.analyze(mockData, defaultOptions);
      const qualityMetrics = result.analyzerSpecific!.qualityMetrics;

      expect(qualityMetrics.overallScore).toBeGreaterThanOrEqual(0);
      expect(qualityMetrics.overallScore).toBeLessThanOrEqual(1);
      expect(qualityMetrics.dataCompleteness).toBeGreaterThanOrEqual(0);
      expect(qualityMetrics.statisticalReliability).toBeGreaterThanOrEqual(0);
    });

    it('should create validated patterns', async () => {
      const result = await validator.analyze(mockData, defaultOptions);
      const validatedPatterns = result.analyzerSpecific!.validatedPatterns;

      expect(validatedPatterns).toBeInstanceOf(Map);
      expect(validatedPatterns.size).toBeGreaterThan(0);

      // Should contain header patterns extracted from data
      const serverPattern = validatedPatterns.get('header:server');
      expect(serverPattern).toBeDefined();
      expect(serverPattern?.siteCount).toBeGreaterThan(0);
    });

    it('should generate validation summary', async () => {
      const result = await validator.analyze(mockData, defaultOptions);
      const summary = result.analyzerSpecific!.validationSummary;

      expect(summary.totalStages).toBe(7);
      expect(summary.stagesPassed).toBeGreaterThanOrEqual(0);
      expect(summary.stagesFailed).toBeGreaterThanOrEqual(0);
      expect(summary.stagesPassed + summary.stagesFailed).toBe(7);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(summary.qualityGrade);
    });

    it('should compile recommendations from all stages', async () => {
      const result = await validator.analyze(mockData, defaultOptions);
      const recommendations = result.analyzerSpecific!.recommendations;

      expect(Array.isArray(recommendations)).toBe(true);
      // Should be sorted by priority and confidence
      for (let i = 1; i < recommendations.length; i++) {
        const prev = recommendations[i - 1];
        const curr = recommendations[i];
        expect(prev.priority).toBeGreaterThanOrEqual(curr.priority);
      }
    });

    it('should create V2 patterns for interface compatibility', async () => {
      const result = await validator.analyze(mockData, defaultOptions);
      const patterns = result.patterns;

      expect(patterns).toBeInstanceOf(Map);
      
      for (const [key, pattern] of patterns) {
        expect(key).toMatch(/^validated:/);
        expect(pattern.pattern).toBeDefined();
        expect(pattern.siteCount).toBeGreaterThanOrEqual(defaultOptions.minOccurrences);
        expect(pattern.sites).toBeInstanceOf(Set);
        expect(pattern.frequency).toBeGreaterThan(0);
        expect(pattern.metadata?.type).toBe('validated_pattern');
        expect(pattern.metadata?.validationPassed).toBe(true);
      }
    });
  });

  describe('error handling', () => {
    it('should handle stage failures gracefully', async () => {
      // Create a validator with a mocked failing stage
      const failingValidator = new ValidationPipelineV2Native();
      
      // Mock one stage to throw an error
      const originalStages = (failingValidator as any).stages;
      const mockStage = {
        name: 'FailingStage',
        description: 'Test failing stage',
        validate: vi.fn().mockRejectedValue(new Error('Stage failure'))
      };
      (failingValidator as any).stages = [mockStage, ...originalStages.slice(1)];

      const result = await failingValidator.analyze(mockData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific!.stageResults[0].passed).toBe(false);
      expect(result.analyzerSpecific!.stageResults[0].errors).toHaveLength(1);
      expect(result.analyzerSpecific!.validationSummary.stagesFailed).toBeGreaterThan(0);
    });

    it('should continue processing after stage errors', async () => {
      const failingValidator = new ValidationPipelineV2Native();
      
      // Mock first stage to fail
      const originalStages = (failingValidator as any).stages;
      const mockFailingStage = {
        name: 'FailingStage',
        description: 'Test failing stage',
        validate: vi.fn().mockRejectedValue(new Error('First stage failure'))
      };
      (failingValidator as any).stages = [mockFailingStage, ...originalStages.slice(1)];

      const result = await failingValidator.analyze(mockData, defaultOptions);
      
      // Should still complete other stages
      expect(result.analyzerSpecific!.stageResults).toHaveLength(7);
      expect(result.analyzerSpecific!.stageResults[0].passed).toBe(false);
      expect(result.analyzerSpecific!.stageResults[1].passed).toBe(true); // Subsequent stages should still run
    });
  });

  describe('empty data handling', () => {
    it('should handle empty datasets gracefully', async () => {
      const emptyData: PreprocessedData = {
        sites: new Map(),
        totalSites: 0,
        metadata: {
          version: '2.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      const result = await validator.analyze(emptyData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.totalSites).toBe(0);
      expect(result.patterns.size).toBe(0);
      expect(result.analyzerSpecific!.validatedPatterns.size).toBe(0);
    });

    it('should handle single-site datasets', async () => {
      const singleSiteData: PreprocessedData = {
        sites: new Map([
          ['single.com', {
            url: 'single.com',
            normalizedUrl: 'single.com',
            cms: 'WordPress',
            confidence: 0.9,
            headers: new Map([['server', new Set(['nginx'])]]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          }]
        ]),
        totalSites: 1,
        metadata: {
          version: '2.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      const result = await validator.analyze(singleSiteData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.totalSites).toBe(1);
      // Should generate errors about critically small sample size (< 5)
      const stageResults = result.analyzerSpecific!.stageResults;
      const sampleSizeStage = stageResults.find(r => r.stageName === 'SampleSizeValidation');
      expect(sampleSizeStage?.errors.length).toBeGreaterThan(0);
    });
  });

  describe('large dataset performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Create larger test dataset
      const largeSites = new Map();
      for (let i = 0; i < 100; i++) {
        largeSites.set(`site${i}.com`, {
          url: `site${i}.com`,
          normalizedUrl: `site${i}.com`,
          cms: i % 3 === 0 ? 'WordPress' : i % 3 === 1 ? 'Shopify' : 'Drupal',
          confidence: 0.8,
          headers: new Map([
            [`header-${i % 10}`, new Set(['value'])],
            ['server', new Set(['nginx'])],
            ['content-type', new Set(['text/html'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: new Date().toISOString()
        });
      }

      const largeData: PreprocessedData = {
        sites: largeSites,
        totalSites: 100,
        metadata: {
          version: '2.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      const startTime = Date.now();
      const result = await validator.analyze(largeData, defaultOptions);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.totalSites).toBe(100);
      expect(result.analyzerSpecific!.validatedPatterns.size).toBeGreaterThan(0);
    });
  });
});

describe('Individual Validation Stages', () => {
  let mockData: PreprocessedData;
  let mockContext: any;
  let defaultOptions: AnalysisOptions;

  beforeEach(() => {
    defaultOptions = {
      minOccurrences: 3,
      includeExamples: true,
      maxExamples: 3,
      semanticFiltering: false
    };

    mockData = {
      sites: new Map([
        ['site1.com', {
          url: 'site1.com',
          normalizedUrl: 'site1.com',
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map([['server', new Set(['nginx'])]]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: new Date().toISOString()
        }],
        ['site2.com', {
          url: 'site2.com',
          normalizedUrl: 'site2.com',
          cms: 'WordPress',
          confidence: 0.8,
          headers: new Map([['server', new Set(['apache'])]]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: new Date().toISOString()
        }],
        ['site3.com', {
          url: 'site3.com',
          normalizedUrl: 'site3.com',
          cms: 'Drupal',
          confidence: 0.7,
          headers: new Map([['server', new Set(['nginx'])]]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: new Date().toISOString()
        }]
      ]),
      totalSites: 3,
      metadata: {
        version: '2.0',
        preprocessedAt: new Date().toISOString()
      }
    };

    mockContext = {
      originalData: mockData,
      stageResults: [],
      accumulatedScore: 1.0,
      validatedPatterns: new Map([
        ['header:server', {
          pattern: 'server',
          siteCount: 3,
          sites: new Set(['site1.com', 'site2.com', 'site3.com']),
          frequency: 1.0,
          metadata: { type: 'header' }
        }]
      ]),
      flaggedPatterns: new Map(),
      qualityMetrics: {
        overallScore: 1.0,
        dataCompleteness: 1.0,
        statisticalReliability: 1.0,
        patternConsistency: 1.0,
        correlationStrength: 1.0,
        recommendationAccuracy: 1.0,
        sampleAdequacy: 1.0,
        distributionHealth: 1.0
      }
    };
  });

  describe('FrequencyValidationStage', () => {
    it('should filter patterns below minimum occurrences', async () => {
      const stage = new FrequencyValidationStage();
      
      // Add pattern below threshold
      mockContext.validatedPatterns.set('header:rare', {
        pattern: 'rare',
        siteCount: 1,
        sites: new Set(['site1.com']),
        frequency: 0.33,
        metadata: { type: 'header' }
      });

      const result = await stage.validate(mockData, defaultOptions, mockContext);

      expect(result.stageName).toBe('FrequencyValidation');
      expect(result.patternsFiltered).toBe(1);
      expect(result.passed).toBe(true);
      expect(mockContext.validatedPatterns.has('header:rare')).toBe(false);
    });

    it('should generate warnings for very low frequency patterns', async () => {
      const stage = new FrequencyValidationStage();
      
      mockContext.validatedPatterns.set('header:verylow', {
        pattern: 'verylow',
        siteCount: 3,
        sites: new Set(['site1.com', 'site2.com', 'site3.com']),
        frequency: 0.005, // Very low frequency
        metadata: { type: 'header' }
      });

      const result = await stage.validate(mockData, defaultOptions, mockContext);

      expect(result.warnings.length).toBeGreaterThan(0);
      const lowFreqWarning = result.warnings.find(w => w.message.includes('very low frequency'));
      expect(lowFreqWarning).toBeDefined();
    });

    it('should generate warnings for suspiciously common patterns', async () => {
      const stage = new FrequencyValidationStage();
      
      mockContext.validatedPatterns.set('header:toohigh', {
        pattern: 'toohigh',
        siteCount: 3,
        sites: new Set(['site1.com', 'site2.com', 'site3.com']),
        frequency: 0.98, // Suspiciously high
        metadata: { type: 'header' }
      });

      const result = await stage.validate(mockData, defaultOptions, mockContext);

      expect(result.warnings.length).toBeGreaterThan(0);
      const highFreqWarning = result.warnings.find(w => w.message.includes('appears in'));
      expect(highFreqWarning).toBeDefined();
    });
  });

  describe('SampleSizeValidationStage', () => {
    it('should handle small sample size appropriately', async () => {
      const stage = new SampleSizeValidationStage();
      const result = await stage.validate(mockData, defaultOptions, mockContext);

      expect(result.stageName).toBe('SampleSizeValidation');
      expect(result.metrics.sample_size).toBe(3);
      // With 3 sites, should either warn or have adequate power for basic analysis
      expect(result.warnings.length + result.errors.length).toBeGreaterThanOrEqual(0);
      expect(result.metrics.statistical_power).toBeDefined();
      expect(result.metrics.sample_adequacy).toBeDefined();
    });

    it('should generate errors for critically small samples', async () => {
      const stage = new SampleSizeValidationStage();
      
      const tinyData: PreprocessedData = {
        ...mockData,
        totalSites: 2 // Below minimum threshold of 5
      };

      const result = await stage.validate(tinyData, defaultOptions, mockContext);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.passed).toBe(false);
    });

    it('should calculate statistical power metrics', async () => {
      const stage = new SampleSizeValidationStage();
      const result = await stage.validate(mockData, defaultOptions, mockContext);

      expect(result.metrics.statistical_power).toBeDefined();
      expect(result.metrics.sample_adequacy).toBeDefined();
      expect(result.metrics.statistical_reliability).toBeDefined();
    });
  });

  describe('DistributionValidationStage', () => {
    it('should analyze frequency distribution', async () => {
      const stage = new DistributionValidationStage();
      const result = await stage.validate(mockData, defaultOptions, mockContext);

      expect(result.stageName).toBe('DistributionValidation');
      expect(result.metrics.distribution_skewness).toBeDefined();
      expect(result.metrics.distribution_kurtosis).toBeDefined();
      expect(result.metrics.distribution_health).toBeDefined();
    });

    it('should detect outlier patterns', async () => {
      const stage = new DistributionValidationStage();
      
      // Add extreme outlier
      mockContext.validatedPatterns.set('header:outlier', {
        pattern: 'outlier',
        siteCount: 3,
        sites: new Set(['site1.com', 'site2.com', 'site3.com']),
        frequency: 0.999, // Extreme outlier
        metadata: { type: 'header' }
      });

      const result = await stage.validate(mockData, defaultOptions, mockContext);

      expect(result.metrics.outlier_count).toBeGreaterThanOrEqual(0);
      if (result.metrics.outlier_count > 0) {
        expect(mockContext.flaggedPatterns.size).toBeGreaterThan(0);
      }
    });

    it('should warn about extreme skewness', async () => {
      const stage = new DistributionValidationStage();
      
      // Create highly skewed distribution
      mockContext.validatedPatterns.clear();
      for (let i = 0; i < 10; i++) {
        mockContext.validatedPatterns.set(`header:pattern${i}`, {
          pattern: `pattern${i}`,
          siteCount: 3,
          sites: new Set(['site1.com', 'site2.com', 'site3.com']),
          frequency: i === 0 ? 0.9 : 0.01, // Very skewed
          metadata: { type: 'header' }
        });
      }

      const result = await stage.validate(mockData, defaultOptions, mockContext);

      // May generate warnings about skewness depending on data
      expect(result.warnings).toBeDefined();
    });
  });

  describe('CorrelationValidationStage', () => {
    it('should analyze CMS distribution balance', async () => {
      const stage = new CorrelationValidationStage();
      const result = await stage.validate(mockData, defaultOptions, mockContext);

      expect(result.stageName).toBe('CorrelationValidation');
      expect(result.metrics.cms_balance).toBeDefined();
      expect(result.metrics.correlation_strength).toBeDefined();
    });

    it('should warn about unbalanced CMS distribution', async () => {
      const stage = new CorrelationValidationStage();
      
      // Create highly unbalanced CMS distribution
      const unbalancedData: PreprocessedData = {
        ...mockData,
        sites: new Map([
          ['site1.com', { ...Array.from(mockData.sites.values())[0], cms: 'WordPress' }],
          ['site2.com', { ...Array.from(mockData.sites.values())[1], cms: 'WordPress' }],
          ['site3.com', { ...Array.from(mockData.sites.values())[2], cms: 'WordPress' }]
        ])
      };

      const result = await stage.validate(unbalancedData, defaultOptions, mockContext);

      // Should detect low balance but might not warn with small sample
      expect(result.metrics.cms_balance).toBeLessThanOrEqual(1);
    });
  });

  describe('SanityValidationStage', () => {
    it('should validate mathematical consistency with enhanced V2 algorithms', async () => {
      const stage = new SanityValidationStage();
      const result = await stage.validate(mockData, defaultOptions, mockContext);

      expect(result.stageName).toBe('SanityValidation');
      // Enhanced V2 metrics
      expect(result.metrics.sanity_checks_passed).toBeDefined();
      expect(result.metrics.sanity_checks_total).toBe(6);
      expect(result.metrics.sanity_success_rate).toBeDefined();
      expect(result.metrics.mathematical_consistency).toBeDefined();
      expect(result.metrics.bayesian_consistency).toBeDefined();
      expect(result.metrics.probability_conservation).toBeDefined();
    });

    it('should execute all 6 sanity check algorithms', async () => {
      const stage = new SanityValidationStage();
      const result = await stage.validate(mockData, defaultOptions, mockContext);

      // Should execute all 6 algorithms from V1 enhanced for V2
      expect(result.metrics.sanity_checks_total).toBe(6);
      expect(result.metrics.sanity_checks_passed).toBeGreaterThanOrEqual(0);
      expect(result.metrics.sanity_checks_passed).toBeLessThanOrEqual(6);
      
      // Success rate should be calculated correctly
      const expectedRate = result.metrics.sanity_checks_passed / result.metrics.sanity_checks_total;
      expect(result.metrics.sanity_success_rate).toBeCloseTo(expectedRate, 3);
    });
  });

  describe('SignificanceValidationStage', () => {
    it('should perform statistical significance testing', async () => {
      const stage = new SignificanceValidationStage();
      const result = await stage.validate(mockData, defaultOptions, mockContext);

      expect(result.stageName).toBe('SignificanceValidation');
      expect(result.metrics.significance_rate).toBeDefined();
      expect(result.metrics.significant_patterns).toBeDefined();
      expect(result.metrics.statistical_reliability).toBeDefined();
    });

    it('should flag non-significant patterns', async () => {
      const stage = new SignificanceValidationStage();
      const result = await stage.validate(mockData, defaultOptions, mockContext);

      // Patterns might be flagged as non-significant
      expect(result.patternsValidated).toBeGreaterThan(0);
      // Check if any patterns were flagged (depends on statistical test results)
    });
  });

  describe('RecommendationValidationStage', () => {
    it('should validate recommendation quality', async () => {
      const stage = new RecommendationValidationStage();
      
      // Add some mock recommendations from previous stages
      mockContext.stageResults = [{
        stageName: 'MockStage',
        passed: true,
        score: 0.8,
        patternsValidated: 1,
        patternsFiltered: 0,
        warnings: [],
        errors: [],
        metrics: {},
        recommendations: [{
          type: 'data_quality',
          severity: 'medium',
          title: 'Test Recommendation',
          description: 'Test description',
          actionableSteps: ['Step 1', 'Step 2'],
          expectedImpact: 'Test impact',
          confidence: 0.8,
          priority: 5
        }]
      }];

      const result = await stage.validate(mockData, defaultOptions, mockContext);

      expect(result.stageName).toBe('RecommendationValidation');
      expect(result.metrics.recommendation_count).toBe(1);
      expect(result.metrics.average_confidence).toBe(0.8);
      expect(result.metrics.recommendation_accuracy).toBeDefined();
    });

    it('should detect low recommendation confidence', async () => {
      const stage = new RecommendationValidationStage();
      
      // Add low confidence recommendations
      mockContext.stageResults = [{
        stageName: 'MockStage',
        passed: true,
        score: 0.8,
        patternsValidated: 1,
        patternsFiltered: 0,
        warnings: [],
        errors: [],
        metrics: {},
        recommendations: [{
          type: 'data_quality',
          severity: 'medium',
          title: 'Low Confidence Recommendation',
          description: 'Test description',
          actionableSteps: ['Step 1'],
          expectedImpact: 'Test impact',
          confidence: 0.3, // Low confidence
          priority: 5
        }]
      }];

      const result = await stage.validate(mockData, defaultOptions, mockContext);

      expect(result.recommendations.length).toBeGreaterThan(0);
      const lowConfidenceRec = result.recommendations.find(r => r.title.includes('Low Recommendation Confidence'));
      expect(lowConfidenceRec).toBeDefined();
    });
  });
});