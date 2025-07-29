/**
 * ValidationPipelineV2 Unit Tests - Comprehensive Validation Testing
 * 
 * Testing Philosophy: Validate V1 pipeline integration, quality scoring, 
 * and architectural positioning as post-processor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationPipelineV2Native as ValidationPipelineV2 } from '../validation-pipeline-v2-native.js';
import type { PreprocessedData, AnalysisOptions } from '../../types/analyzer-interface.js';

describe('ValidationPipelineV2', () => {
  let validator: ValidationPipelineV2;
  let testData: PreprocessedData;
  let options: AnalysisOptions;

  beforeEach(() => {
    validator = new ValidationPipelineV2();
    options = {
      minOccurrences: 2,
      includeExamples: true,
      maxExamples: 3,
      semanticFiltering: false
    };

    // Create test data with headers that should trigger validation
    testData = {
      sites: new Map([
        ['site1.com', {
          url: 'https://site1.com',
          normalizedUrl: 'site1.com',
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map([
            ['server', new Set(['nginx/1.18.0'])],
            ['x-wp-total', new Set(['42'])],
            ['content-type', new Set(['text/html; charset=utf-8'])],
            ['content-security-policy', new Set(['default-src \'self\''])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }],
        ['site2.com', {
          url: 'https://site2.com',
          normalizedUrl: 'site2.com',
          cms: 'Drupal',
          confidence: 0.85,
          headers: new Map([
            ['server', new Set(['Apache/2.4.41'])],
            ['x-drupal-cache', new Set(['HIT'])],
            ['content-type', new Set(['text/html; charset=utf-8'])],
            ['x-frame-options', new Set(['SAMEORIGIN'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-02T00:00:00Z'
        }],
        ['site3.com', {
          url: 'https://site3.com',
          normalizedUrl: 'site3.com',
          cms: 'Unknown',
          confidence: 0.0,
          headers: new Map([
            ['server', new Set(['nginx/1.20.0'])],
            ['content-type', new Set(['text/html; charset=utf-8'])],
            ['x-custom-header', new Set(['custom-value'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-03T00:00:00Z'
        }]
      ]),
      totalSites: 3,
      metadata: {
        version: '1.0.0',
        preprocessedAt: '2024-01-01T00:00:00Z'
      }
    };
  });

  describe('Core Validation Pipeline Integration', () => {
    it('should implement FrequencyAnalyzer interface correctly', () => {
      expect(validator.getName()).toBe('ValidationPipelineV2');
      expect(typeof validator.analyze).toBe('function');
    });

    it('should run V1 validation pipeline and return results', async () => {
      const result = await validator.analyze(testData, options);
      
      // Verify basic result structure
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('totalSites', 3);
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('analyzerSpecific');
      
      // Verify metadata
      expect(result.metadata.analyzer).toBe('ValidationPipelineV2');
      expect(result.metadata.totalPatternsFound).toBeGreaterThanOrEqual(0);
      
      // Verify analyzer-specific validation data
      const specific = result.analyzerSpecific!;
      expect(specific).toHaveProperty('qualityScore');
      expect(specific).toHaveProperty('validationPassed');
      expect(specific).toHaveProperty('sanityChecksPassed');
      expect(specific).toHaveProperty('biasAnalysis');
      expect(specific).toHaveProperty('validatedPatterns');
      expect(specific).toHaveProperty('stages');
    });

    it('should perform dataset bias analysis', async () => {
      const result = await validator.analyze(testData, options);
      
      const biasAnalysis = result.analyzerSpecific!.biasAnalysis;
      expect(biasAnalysis).toBeDefined();
      expect(biasAnalysis.totalSites).toBe(3);
      expect(biasAnalysis.cmsDistribution).toBeDefined();
      expect(biasAnalysis.headerCorrelations).toBeDefined();
      
      // Should detect CMS distribution
      expect(Object.keys(biasAnalysis.cmsDistribution).length).toBeGreaterThan(0);
      expect(biasAnalysis.cmsDistribution).toHaveProperty('WordPress');
      expect(biasAnalysis.cmsDistribution).toHaveProperty('Drupal');
    });

    it('should run 7-stage validation pipeline when data available', async () => {
      const result = await validator.analyze(testData, options);
      
      const stages = result.analyzerSpecific!.stages;
      expect(stages).toHaveProperty('frequencyFilter');
      expect(stages).toHaveProperty('sampleSizeFilter');
      expect(stages).toHaveProperty('distributionAnalysis');
      expect(stages).toHaveProperty('correlationValidation');
      expect(stages).toHaveProperty('sanityChecks');
      expect(stages).toHaveProperty('significanceTesting');
      expect(stages).toHaveProperty('recommendationValidation');
      
      // Each stage should have meaningful data
      expect(typeof stages.frequencyFilter.filtered).toBe('number');
      expect(typeof stages.frequencyFilter.passed).toBe('number');
    });

    it('should provide quality scoring', async () => {
      const result = await validator.analyze(testData, options);
      
      const qualityScore = result.analyzerSpecific!.qualityScore;
      expect(typeof qualityScore).toBe('number');
      expect(qualityScore).toBeGreaterThanOrEqual(0);
      expect(qualityScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Data Format Conversion', () => {
    it('should convert PreprocessedData to DetectionDataPoint format', async () => {
      const result = await validator.analyze(testData, options);
      
      // If bias analysis worked, conversion was successful
      const biasAnalysis = result.analyzerSpecific!.biasAnalysis;
      expect(biasAnalysis.totalSites).toBe(3);
      
      // Should have CMS data from conversion
      expect(biasAnalysis.cmsDistribution).toHaveProperty('WordPress');
      expect(biasAnalysis.cmsDistribution).toHaveProperty('Drupal');
      expect(biasAnalysis.cmsDistribution).toHaveProperty('Unknown');
    });

    it('should extract header patterns for validation', async () => {
      const result = await validator.analyze(testData, options);
      
      // Should have created patterns for validation
      expect(result.patterns.size).toBeGreaterThanOrEqual(0);
      
      // Check for validation-specific patterns
      const patterns = Array.from(result.patterns.keys());
      const validationPatterns = patterns.filter(p => p.startsWith('validation:'));
      expect(validationPatterns.length).toBeGreaterThan(0);
    });

    it('should preserve CMS information in conversion', async () => {
      const result = await validator.analyze(testData, options);
      
      const biasAnalysis = result.analyzerSpecific!.biasAnalysis;
      const cmsDistribution = biasAnalysis.cmsDistribution;
      
      // Verify CMS counts
      expect(cmsDistribution.WordPress.count).toBe(1);
      expect(cmsDistribution.Drupal.count).toBe(1);
      expect(cmsDistribution.Unknown.count).toBe(1);
      
      // Verify percentages (bias detector uses percentages 0-100, not decimals 0-1)
      expect(cmsDistribution.WordPress.percentage).toBeCloseTo(33.33, 1);
      expect(cmsDistribution.Drupal.percentage).toBeCloseTo(33.33, 1);
      expect(cmsDistribution.Unknown.percentage).toBeCloseTo(33.33, 1);
    });
  });

  describe('Validated Pattern Creation', () => {
    it('should create validated header patterns', async () => {
      const result = await validator.analyze(testData, options);
      
      const validatedPatterns = result.analyzerSpecific!.validatedPatterns;
      expect(validatedPatterns.headers).toBeDefined();
      expect(validatedPatterns.correlations).toBeDefined();
      
      // Validated patterns should be Map objects
      expect(validatedPatterns.headers instanceof Map).toBe(true);
      expect(validatedPatterns.correlations instanceof Map).toBe(true);
    });

    it('should include validation metadata in patterns', async () => {
      const result = await validator.analyze(testData, options);
      
      // Check for validation patterns with metadata
      const validationOverall = result.patterns.get('validation:overall');
      if (validationOverall) {
        expect(validationOverall.metadata).toHaveProperty('validationType', 'overall');
        expect(validationOverall.metadata).toHaveProperty('passed');
      }
      
      const qualityScore = result.patterns.get('validation:quality-score');
      if (qualityScore) {
        expect(qualityScore.metadata).toHaveProperty('validationType', 'quality');
        expect(qualityScore.metadata).toHaveProperty('score');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty dataset gracefully', async () => {
      const emptyData: PreprocessedData = {
        sites: new Map(),
        totalSites: 0,
        metadata: {
          version: '1.0.0',
          preprocessedAt: '2024-01-01T00:00:00Z'
        }
      };

      const result = await validator.analyze(emptyData, options);
      
      expect(result.totalSites).toBe(0);
      expect(result.analyzerSpecific!.validationPassed).toBe(false);
      expect(result.analyzerSpecific!.qualityScore).toBe(0);
      
      // Should have empty but valid structures
      expect(result.analyzerSpecific!.stages).toBeDefined();
      expect(result.analyzerSpecific!.biasAnalysis).toBeDefined();
    });

    it('should provide meaningful error information on failure', async () => {
      const result = await validator.analyze(testData, options);
      
      // Even on success, should have bias warnings structure
      expect(result.analyzerSpecific!.biasAnalysis.biasWarnings).toBeDefined();
      expect(Array.isArray(result.analyzerSpecific!.biasAnalysis.biasWarnings)).toBe(true);
    });
  });

  describe('Pipeline Positioning Architecture', () => {
    it('should work as post-processor (not depend on other analyzers)', async () => {
      // ValidationPipelineV2 should work independently with just PreprocessedData
      const result = await validator.analyze(testData, options);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific!.biasAnalysis).toBeDefined();
      
      // Should extract its own patterns from preprocessed data for validation
      expect(result.patterns.size).toBeGreaterThanOrEqual(0);
    });

    it('should provide quality metrics for downstream analyzers', async () => {
      const result = await validator.analyze(testData, options);
      
      const specific = result.analyzerSpecific!;
      
      // Quality metrics that semantic analysis can use
      expect(specific.qualityScore).toBeDefined();
      expect(specific.validationPassed).toBeDefined();
      expect(specific.statisticallySignificantHeaders).toBeDefined();
      
      // Validated patterns that semantic analysis should use
      expect(specific.validatedPatterns.headers instanceof Map).toBe(true);
      expect(specific.validatedPatterns.correlations instanceof Map).toBe(true);
    });
  });

  describe('V1 Feature Parity', () => {
    it('should provide same validation capabilities as V1', async () => {
      const result = await validator.analyze(testData, options);
      
      const specific = result.analyzerSpecific!;
      
      // V1 validation features
      expect(specific.pipelineResult).toBeDefined(); // V1 PipelineResult
      expect(specific.sanityChecksPassed).toBeDefined(); // V1 sanity checks
      expect(specific.statisticallySignificantHeaders).toBeDefined(); // V1 statistical testing
      expect(specific.stages.significanceTesting).toBeDefined(); // V1 significance testing
      expect(specific.stages.sanityChecks).toBeDefined(); // V1 sanity check stage
    });

    it('should maintain V1 quality scoring methodology', async () => {
      const result = await validator.analyze(testData, options);
      
      const qualityScore = result.analyzerSpecific!.qualityScore;
      
      // V1 quality score characteristics
      expect(qualityScore).toBeGreaterThanOrEqual(0);
      expect(qualityScore).toBeLessThanOrEqual(1);
      
      // Should be numeric and meaningful
      expect(typeof qualityScore).toBe('number');
      expect(isNaN(qualityScore)).toBe(false);
    });
  });
});

/**
 * Helper function to create test data with specific patterns
 */
function createValidationTestData(headers: Array<{
  site: string;
  cms: string;
  headers: Record<string, string>;
}>): PreprocessedData {
  const sites = new Map();
  
  headers.forEach(({ site, cms, headers: headerData }) => {
    const headerMap = new Map();
    Object.entries(headerData).forEach(([name, value]) => {
      headerMap.set(name, new Set([value]));
    });
    
    sites.set(site, {
      url: `https://${site}`,
      normalizedUrl: site,
      cms,
      confidence: cms !== 'Unknown' ? 0.9 : 0.0,
      headers: headerMap,
      metaTags: new Map(),
      scripts: new Set(),
      technologies: new Set(),
      capturedAt: new Date().toISOString()
    });
  });
  
  return {
    sites,
    totalSites: headers.length,
    metadata: {
      version: '1.0.0',
      preprocessedAt: new Date().toISOString()
    }
  };
}