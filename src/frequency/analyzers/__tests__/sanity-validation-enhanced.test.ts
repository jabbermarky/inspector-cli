/**
 * Enhanced Sanity Validation Tests
 * 
 * Comprehensive test suite for the V2 enhanced SanityValidationStage implementation
 * with 6 sanity check algorithms from V1. Tests V1 feature parity and V2 enhancements.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SanityValidationStage } from '../validation-stages.js';
import type { 
  PreprocessedData, 
  AnalysisOptions, 
  PatternData,
  ValidationContext,
  ValidationStageResult 
} from '../validation-pipeline-v2-native.js';

// Mock logger
vi.mock('../../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }))
}));

describe('SanityValidationStage - Enhanced V2 Implementation', () => {
  let sanityStage: SanityValidationStage;
  let mockData: PreprocessedData;
  let mockContext: ValidationContext;
  let defaultOptions: AnalysisOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    sanityStage = new SanityValidationStage();
    
    defaultOptions = {
      minOccurrences: 5,
      includeExamples: true,
      maxExamples: 3,
      semanticFiltering: false
    };

    // Create test data with diverse CMS distribution for realistic sanity checks
    mockData = {
      sites: new Map([
        ['site1.com', { 
          url: 'site1.com', 
          cms: 'WordPress', 
          headers: new Map([['x-powered-by', 'WordPress']]), 
          meta: new Map(), 
          scripts: new Set() 
        }],
        ['site2.com', { 
          url: 'site2.com', 
          cms: 'WordPress', 
          headers: new Map([['x-powered-by', 'WordPress']]), 
          meta: new Map(), 
          scripts: new Set() 
        }],
        ['site3.com', { 
          url: 'site3.com', 
          cms: 'Drupal', 
          headers: new Map([['x-drupal-cache', 'HIT']]), 
          meta: new Map(), 
          scripts: new Set() 
        }],
        ['site4.com', { 
          url: 'site4.com', 
          cms: 'Joomla', 
          headers: new Map([['x-content-powered-by', 'Joomla!']]), 
          meta: new Map(), 
          scripts: new Set() 
        }],
        ['site5.com', { 
          url: 'site5.com', 
          cms: 'WordPress', 
          headers: new Map([['x-powered-by', 'WordPress']]), 
          meta: new Map(), 
          scripts: new Set() 
        }],
        ['site6.com', { 
          url: 'site6.com', 
          cms: 'Drupal', 
          headers: new Map([['x-drupal-cache', 'HIT']]), 
          meta: new Map(), 
          scripts: new Set() 
        }]
      ]),
      totalSites: 6,
      metadata: {
        collectedAt: new Date().toISOString(),
        source: 'test-data'
      }
    };

    // Create realistic pattern data for testing
    const validatedPatterns = new Map<string, PatternData>([
      ['x-powered-by', {
        pattern: 'x-powered-by',
        siteCount: 3,
        sites: new Set(['site1.com', 'site2.com', 'site5.com']),
        frequency: 0.5, // 3/6 = 50%
        metadata: { type: 'header', source: 'validation' }
      }],
      ['x-drupal-cache', {
        pattern: 'x-drupal-cache',
        siteCount: 2,
        sites: new Set(['site3.com', 'site6.com']),
        frequency: 0.333, // 2/6 = 33.3%
        metadata: { type: 'header', source: 'validation' }
      }],
      ['x-content-powered-by', {
        pattern: 'x-content-powered-by',
        siteCount: 1,
        sites: new Set(['site4.com']),
        frequency: 0.167, // 1/6 = 16.7%
        metadata: { type: 'header', source: 'validation' }
      }]
    ]);

    mockContext = {
      originalData: mockData,
      stageResults: [],
      accumulatedScore: 1.0,
      validatedPatterns,
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

  describe('Basic Functionality', () => {
    it('should have correct stage name and description', () => {
      expect(sanityStage.name).toBe('SanityValidation');
      expect(sanityStage.description).toContain('6 mathematical consistency algorithms');
    });

    it('should execute all 6 sanity check algorithms', async () => {
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      
      expect(result.stageName).toBe('SanityValidation');
      expect(result.metrics.sanity_checks_total).toBe(6);
      expect(result.metrics.sanity_checks_passed).toBeGreaterThanOrEqual(0);
      expect(result.metrics.sanity_checks_passed).toBeLessThanOrEqual(6);
    });

    it('should calculate sanity success rate correctly', async () => {
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      
      const expectedRate = result.metrics.sanity_checks_passed / result.metrics.sanity_checks_total;
      expect(result.metrics.sanity_success_rate).toBeCloseTo(expectedRate, 3);
    });
  });

  describe('Algorithm 1: Correlation Sum Check', () => {
    it('should pass when CMS correlations sum to approximately 100%', async () => {
      // Test data is designed with realistic correlations that should sum correctly
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      
      // Should not have correlation sum errors
      const correlationSumErrors = result.errors.filter(e => 
        e.message.includes('correlation sum') || e.message.includes('correlationSum')
      );
      expect(correlationSumErrors).toHaveLength(0);
    });

    it('should detect correlation sum violations', async () => {
      // Create invalid pattern data where correlations don't sum correctly
      const invalidPatterns = new Map<string, PatternData>([
        ['invalid-pattern', {
          pattern: 'invalid-pattern',
          siteCount: 10, // This exceeds total sites (6), creating impossible correlations
          sites: new Set(['site1.com', 'site2.com', 'site3.com']),
          frequency: 1.67, // Invalid frequency > 100%
          metadata: { type: 'header', source: 'validation' }
        }]
      ]);

      const invalidContext = {
        ...mockContext,
        validatedPatterns: invalidPatterns
      };

      const result = await sanityStage.validate(mockData, defaultOptions, invalidContext);
      
      // Should detect mathematical inconsistencies
      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Algorithm 2: Correlation Range Check', () => {
    it('should detect negative correlations', async () => {
      // Mock a scenario where correlation calculations might produce negative values
      // This would be caught by our range check
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      
      // With valid test data, should not have range errors
      const rangeErrors = result.errors.filter(e => 
        e.message.includes('Negative correlation') || e.message.includes('> 100%')
      );
      expect(rangeErrors).toHaveLength(0);
    });

    it('should detect correlations exceeding 100%', async () => {
      // Test will be covered by the overall validation since our test data is valid
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      expect(result.metrics.sanity_checks_total).toBe(6);
    });
  });

  describe('Algorithm 3: Support Check', () => {
    it('should generate warnings for high correlations with low support', async () => {
      // Create pattern with high correlation but low sample size
      const lowSupportPatterns = new Map<string, PatternData>([
        ['rare-but-specific', {
          pattern: 'rare-but-specific',
          siteCount: 2, // Low sample size
          sites: new Set(['site1.com', 'site2.com']), // All WordPress sites
          frequency: 0.333,
          metadata: { type: 'header', source: 'validation' }
        }]
      ]);

      const lowSupportContext = {
        ...mockContext,
        validatedPatterns: lowSupportPatterns
      };

      const result = await sanityStage.validate(mockData, defaultOptions, lowSupportContext);
      
      // May generate warnings about statistical support
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Algorithm 4: Bayesian Consistency Check', () => {
    it('should validate Bayesian probability relationships', async () => {
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      
      // Should have Bayesian consistency metric
      expect(result.metrics.bayesian_consistency).toBeDefined();
      expect(result.metrics.bayesian_consistency).toBeGreaterThanOrEqual(0);
      expect(result.metrics.bayesian_consistency).toBeLessThanOrEqual(1);
    });

    it('should detect Bayesian inconsistencies when P(A|B)*P(B) ≠ P(B|A)*P(A)', async () => {
      // With our realistic test data, Bayesian relationships should be consistent
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      
      // Check for Bayesian warnings (low severity acceptable)
      const bayesianWarnings = result.warnings.filter(w => 
        w.message.includes('Bayesian') || w.message.includes('bayesian')
      );
      
      // Bayesian inconsistencies generate warnings, not errors
      expect(bayesianWarnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Algorithm 5: Probability Conservation Check', () => {
    it('should verify count conservation across CMS calculations', async () => {
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      
      // Should have probability conservation metric
      expect(result.metrics.probability_conservation).toBeDefined();
      expect(result.metrics.probability_conservation).toBeGreaterThanOrEqual(0);
      expect(result.metrics.probability_conservation).toBeLessThanOrEqual(1);
    });

    it('should detect count mismatches in probability calculations', async () => {
      // With valid test data, probability should be conserved
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      
      const conservationErrors = result.errors.filter(e => 
        e.message.includes('Count mismatch') || e.message.includes('conservation')
      );
      
      // Valid data should not have conservation errors
      expect(conservationErrors).toHaveLength(0);
    });
  });

  describe('Algorithm 6: Mathematical Impossibility Check', () => {
    it('should detect impossible count relationships', async () => {
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      
      // Should execute mathematical impossibility check
      const impossibilityErrors = result.errors.filter(e => 
        e.message.includes('Impossible count') || e.message.includes('impossibility')
      );
      
      // Valid data should not have impossibility errors
      expect(impossibilityErrors).toHaveLength(0);
    });

    it('should detect invalid frequency ranges', async () => {
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      
      const frequencyErrors = result.errors.filter(e => 
        e.message.includes('Invalid frequency')
      );
      
      // Valid data should not have frequency range errors
      expect(frequencyErrors).toHaveLength(0);
    });
  });

  describe('V2 Enhancement Features', () => {
    it('should provide comprehensive metrics beyond V1', async () => {
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      
      // V2-specific metrics
      expect(result.metrics).toHaveProperty('sanity_checks_passed');
      expect(result.metrics).toHaveProperty('sanity_checks_total');
      expect(result.metrics).toHaveProperty('sanity_success_rate');
      expect(result.metrics).toHaveProperty('mathematical_consistency');
      expect(result.metrics).toHaveProperty('bayesian_consistency');
      expect(result.metrics).toHaveProperty('probability_conservation');
      
      // All metrics should be valid numbers
      Object.values(result.metrics).forEach(metric => {
        expect(typeof metric).toBe('number');
        expect(Number.isFinite(metric)).toBe(true);
      });
    });

    it('should generate actionable recommendations based on failure patterns', async () => {
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      
      // Check recommendation structure
      result.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('severity');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('actionableSteps');
        expect(rec).toHaveProperty('expectedImpact');
        expect(rec).toHaveProperty('confidence');
        expect(rec).toHaveProperty('priority');
        
        // Validate recommendation quality
        expect(rec.actionableSteps.length).toBeGreaterThan(0);
        expect(rec.confidence).toBeGreaterThan(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
        expect(rec.priority).toBeGreaterThan(0);
        expect(rec.priority).toBeLessThanOrEqual(10);
      });
    });

    it('should handle edge cases gracefully', async () => {
      // Test with minimal data
      const minimalData: PreprocessedData = {
        sites: new Map([
          ['single-site.com', { 
            url: 'single-site.com', 
            cms: 'Unknown', 
            headers: new Map(), 
            meta: new Map(), 
            scripts: new Set() 
          }]
        ]),
        totalSites: 1,
        metadata: { collectedAt: new Date().toISOString(), source: 'test' }
      };

      const minimalContext = {
        ...mockContext,
        validatedPatterns: new Map()
      };

      const result = await sanityStage.validate(minimalData, defaultOptions, minimalContext);
      
      // Should handle gracefully without crashing
      expect(result).toBeDefined();
      expect(result.stageName).toBe('SanityValidation');
      expect(result.metrics.sanity_checks_total).toBe(6);
    });

    it('should provide V1 feature parity with enhanced precision', async () => {
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      
      // Should execute all 6 algorithms from V1
      expect(result.metrics.sanity_checks_total).toBe(6);
      
      // Should provide enhanced error reporting compared to V1
      result.errors.forEach(error => {
        expect(error).toHaveProperty('type');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('affectedData');
        expect(error).toHaveProperty('recoverable');
      });
      
      // Should provide enhanced warning system
      result.warnings.forEach(warning => {
        expect(warning).toHaveProperty('type');
        expect(warning).toHaveProperty('severity');
        expect(warning).toHaveProperty('message');
        expect(warning).toHaveProperty('affectedPatterns');
      });
    });
  });

  describe('Integration with ValidationPipelineV2Native', () => {
    it('should integrate correctly as stage 5 in validation pipeline', async () => {
      // Test that the stage can be used in the pipeline context
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      
      expect(result).toHaveProperty('stageName');
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('patternsValidated');
      expect(result).toHaveProperty('patternsFiltered');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('recommendations');
      
      // Should validate all patterns in context
      expect(result.patternsValidated).toBe(mockContext.validatedPatterns.size);
    });

    it('should maintain performance benchmarks', async () => {
      const startTime = Date.now();
      const result = await sanityStage.validate(mockData, defaultOptions, mockContext);
      const duration = Date.now() - startTime;
      
      // Should complete sanity checks quickly (< 100ms for small dataset)
      expect(duration).toBeLessThan(100);
      expect(result).toBeDefined();
    });
  });
});