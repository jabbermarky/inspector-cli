/**
 * Tests for V2 Reporter Phase 3: Enhanced bias analysis and validation scoring
 */

import { describe, it, expect } from 'vitest';
import { formatOutputV2, formatHuman } from '../index.js';
import { FrequencyOptions } from '../../types/frequency-types-v2.js';
import { AggregatedResults } from '../../types/analyzer-interface.js';
import { calculateValidationScore, calculateValidationScores, getValidationSummary } from '../utils/validation-utils.js';

describe('V2 Reporter Phase 3', () => {
  const mockAggregatedResults: AggregatedResults = {
    headers: {
      patterns: new Map([
        ['x-powered-by', {
          pattern: 'x-powered-by',
          siteCount: 850,
          sites: new Set(['site1.com', 'site2.com']),
          frequency: 0.85,
          examples: new Set(['Express', 'Next.js', 'ASP.NET'])
        }],
        ['server', {
          pattern: 'server',
          siteCount: 600,
          sites: new Set(['site3.com']),
          frequency: 0.60,
          examples: new Set(['nginx', 'Apache'])
        }],
        ['rare-header', {
          pattern: 'rare-header',
          siteCount: 5,
          sites: new Set(['rare-site.com']),
          frequency: 0.005,
          examples: new Set(['rare-value'])
        }]
      ]),
      totalSites: 1000,
      metadata: {
        analyzer: 'headers',
        analyzedAt: '2025-07-29T12:00:00Z',
        totalPatternsFound: 3,
        totalPatternsAfterFiltering: 3,
        options: { minOccurrences: 1, includeExamples: true }
      }
    },
    metaTags: {
      patterns: new Map(),
      totalSites: 0,
      metadata: {
        analyzer: 'metaTags',
        analyzedAt: '2025-07-29T12:00:00Z',
        totalPatternsFound: 0,
        totalPatternsAfterFiltering: 0,
        options: { minOccurrences: 1, includeExamples: true }
      }
    },
    scripts: {
      patterns: new Map([
        ['inline-script', {
          pattern: 'inline-script',
          siteCount: 300,
          sites: new Set(['script-site.com']),
          frequency: 0.30,
          examples: new Set(['<script>alert("test")</script>', 'function() { return true; }'])
        }]
      ]),
      totalSites: 1000,
      metadata: {
        analyzer: 'scripts',
        analyzedAt: '2025-07-29T12:00:00Z',
        totalPatternsFound: 1,
        totalPatternsAfterFiltering: 1,
        options: { minOccurrences: 1, includeExamples: true }
      }
    },
    semantic: null,
    validation: null,
    vendor: null,
    discovery: null,
    cooccurrence: null,
    technologies: null,
    correlations: {
      patterns: new Map(),
      totalSites: 1000,
      metadata: {
        analyzer: 'correlations',
        analyzedAt: '2025-07-29T12:00:00Z',
        totalPatternsFound: 0,
        totalPatternsAfterFiltering: 0,
        options: { minOccurrences: 1, includeExamples: true }
      },
      analyzerSpecific: {
        cmsDistribution: {
          distributions: new Map([
            ['WordPress', { count: 400, percentage: 40, sites: new Set(['wp1.com']), averageConfidence: 0.9 }],
            ['Drupal', { count: 300, percentage: 30, sites: new Set(['drupal1.com']), averageConfidence: 0.8 }],
            ['Unknown', { count: 300, percentage: 30, sites: new Set(['unknown1.com']), averageConfidence: 0.5 }]
          ]),
          totalSites: 1000,
          concentrationScore: 0.34,
          dominantPlatforms: [],
          diversityIndex: 1.58,
          enterpriseSites: 100,
          unknownSites: 300,
          siteCategories: { cms: 700, enterprise: 100, cdn: 0, unknown: 200 }
        },
        concentrationMetrics: {
          herfindahlIndex: 0.34,
          shannonDiversity: 1.58,
          effectiveNumberOfPlatforms: 4.9,
          dominanceRatio: 1.33,
          concentrationRisk: 'medium',
          diversityRisk: 'low',
          overallBiasRisk: 'medium'
        },
        headerCorrelations: new Map([
          ['x-powered-by', {
            headerName: 'x-powered-by',
            overallMetrics: { frequency: 0.85, occurrences: 850, sampleSize: 1000 },
            perCMSMetrics: new Map([
              ['WordPress', { frequency: 0.9, occurrences: 360, isStatisticallySignificant: true }],
              ['Unknown', { frequency: 0.6, occurrences: 180, isStatisticallySignificant: false }]
            ]),
            conditionalProbabilities: {
              cmsGivenHeader: new Map([
                ['WordPress', { probability: 0.45, confidence: 0.9 }],
                ['Unknown', { probability: 0.35, confidence: 0.7 }]
              ]),
              headerGivenCms: new Map([
                ['WordPress', { probability: 0.9, confidence: 0.9 }],
                ['Unknown', { probability: 0.6, confidence: 0.7 }]
              ])
            },
            platformSpecificity: {
              score: 0.85,
              method: 'discriminative',
              discriminativeDetails: {
                topCMS: 'WordPress',
                topCMSProbability: 0.45,
                concentrationScore: 0.7,
                sampleSizeScore: 0.95,
                backgroundContrast: 0.8
              }
            }
          }],
          ['server', {
            headerName: 'server',
            overallMetrics: { frequency: 0.60, occurrences: 600, sampleSize: 1000 },
            perCMSMetrics: new Map([
              ['WordPress', { frequency: 0.5, occurrences: 200, isStatisticallySignificant: false }],
              ['Unknown', { frequency: 0.7, occurrences: 210, isStatisticallySignificant: true }]
            ]),
            conditionalProbabilities: {
              cmsGivenHeader: new Map([
                ['WordPress', { probability: 0.33, confidence: 0.6 }],
                ['Unknown', { probability: 0.35, confidence: 0.7 }]
              ]),
              headerGivenCms: new Map([
                ['WordPress', { probability: 0.5, confidence: 0.6 }],
                ['Unknown', { probability: 0.7, confidence: 0.7 }]
              ])
            },
            platformSpecificity: {
              score: 0.65,
              method: 'discriminative'
            }
          }]
        ]),
        biasWarnings: [
          {
            type: 'platform_dominance',
            severity: 'warning',
            message: 'WordPress platform shows moderate dominance in dataset',
            affectedHeaders: ['x-powered-by'],
            affectedPlatforms: ['WordPress'],
            metricValue: 0.4,
            threshold: 0.35,
            recommendation: 'Consider balancing dataset with more diverse platforms'
          }
        ],
        platformSpecificityScores: new Map([
          ['x-powered-by', 0.85],
          ['server', 0.65],
          ['rare-header', 0.95]
        ]),
        statisticalSummary: {
          totalHeadersAnalyzed: 3,
          headersWithBias: 1,
          averagePlatformSpecificity: 0.75,
          averageBiasAdjustment: 1.1,
          confidenceDistribution: { high: 2, medium: 1, low: 0 },
          chiSquareResults: {
            statisticallySignificantHeaders: 2,
            averageChiSquare: 15.2,
            averagePValue: 0.02,
            significanceThreshold: 0.05
          },
          sampleSizeAdequacy: { adequate: 2, marginal: 1, inadequate: 0 },
          datasetQualityScore: 0.8,
          biasRiskScore: 0.3,
          recommendationReliabilityScore: 0.85
        }
      }
    },
    summary: {
      totalSitesAnalyzed: 1000,
      totalPatternsFound: 50,
      analysisDate: '2025-07-29T12:00:00Z',
      topPatterns: {
        headers: ['x-powered-by', 'server'],
        metaTags: [],
        scripts: ['inline-script'],
        technologies: []
      }
    }
  };

  describe('Validation Scoring', () => {
    it('should calculate validation scores for patterns', () => {
      const pattern = {
        pattern: 'x-powered-by',
        siteCount: 850,
        sites: new Set(['site1.com', 'site2.com']),
        frequency: 0.85,
        examples: new Set(['Express', 'Next.js', 'ASP.NET'])
      };

      const score = calculateValidationScore(pattern, 1000);
      
      expect(score).toBeDefined();
      expect(score.confidence).toBeOneOf(['high', 'medium', 'low']);
      expect(score.score).toBeGreaterThan(0);
      expect(score.score).toBeLessThanOrEqual(1);
      expect(score.factors).toHaveLength(5);
      expect(score.recommendation).toBeDefined();
      
      // High frequency, good sample size should get good score
      expect(score.confidence).toBe('high');
      expect(score.score).toBeGreaterThan(0.7);
    });

    it('should give lower scores to rare patterns', () => {
      const rarePattern = {
        pattern: 'rare-header',
        siteCount: 5,
        sites: new Set(['rare-site.com']),
        frequency: 0.005,
        examples: new Set(['rare-value'])
      };

      const score = calculateValidationScore(rarePattern, 1000);
      
      expect(score.confidence).toBe('low');
      expect(score.score).toBeLessThan(0.5);
      expect(score.recommendation).toContain('Low confidence');
    });

    it('should calculate validation scores for multiple patterns', () => {
      const patterns = new Map([
        ['good-pattern', {
          pattern: 'good-pattern',
          siteCount: 500,
          sites: new Set(['site1.com']),
          frequency: 0.5,
          examples: new Set(['value1', 'value2', 'value3'])
        }],
        ['poor-pattern', {
          pattern: 'poor-pattern',
          siteCount: 2,
          sites: new Set(['site2.com']),
          frequency: 0.002,
          examples: new Set(['single-value'])
        }]
      ]);

      const scores = calculateValidationScores(patterns, 1000);
      
      expect(scores.size).toBe(2);
      expect(scores.get('good-pattern')?.confidence).toBeOneOf(['high', 'medium']);
      expect(scores.get('poor-pattern')?.confidence).toBe('low');
    });

    it('should generate validation summary', () => {
      const scores = new Map([
        ['high-conf', { confidence: 'high' as const, score: 0.9, factors: [], recommendation: '' }],
        ['med-conf', { confidence: 'medium' as const, score: 0.6, factors: [], recommendation: '' }],
        ['low-conf', { confidence: 'low' as const, score: 0.3, factors: [], recommendation: '' }]
      ]);

      const summary = getValidationSummary(scores);
      
      expect(summary.totalPatterns).toBe(3);
      expect(summary.highConfidence).toBe(1);
      expect(summary.mediumConfidence).toBe(1);
      expect(summary.lowConfidence).toBe(1);
      expect(summary.averageScore).toBeCloseTo(0.6);
      expect(summary.confidenceDistribution.high).toBeCloseTo(33.33, 1);
    });
  });

  describe('Enhanced Bias Analysis', () => {
    it('should format enhanced bias analysis for human output', () => {
      const output = formatHuman(mockAggregatedResults, {
        output: 'human',
        includeRecommendations: true,
        maxItemsPerSection: 20
      });
      
      expect(output).toContain('ENHANCED BIAS ANALYSIS');
      expect(output).toContain('Dataset Quality Assessment');
      expect(output).toContain('Concentration Risk Assessment');
      expect(output).toContain('Platform Specificity Scores');
      expect(output).toContain('Bias Warnings');
      
      // Check specific metrics
      expect(output).toContain('Dataset quality score: 80.0%');
      expect(output).toContain('Bias risk score: 30.0%');
      expect(output).toContain('Recommendation reliability: 85.0%');
      expect(output).toContain('Overall bias risk: MEDIUM');
    });

    it('should include statistical significance data', () => {
      const output = formatHuman(mockAggregatedResults, {
        output: 'human',
        includeRecommendations: true
      });
      
      expect(output).toContain('Statistical Significance');
      expect(output).toContain('Statistically significant headers: 2');
      expect(output).toContain('Average chi-square value: 15.20');
      expect(output).toContain('Average p-value: 0.0200');
    });

    it('should show bias warnings with recommendations', () => {
      const output = formatHuman(mockAggregatedResults, {
        output: 'human',
        includeRecommendations: true
      });
      
      expect(output).toContain('Bias Warnings');
      expect(output).toContain('[WARNING] WordPress platform shows moderate dominance');
      expect(output).toContain('→ Recommendation: Consider balancing dataset');
    });
  });

  describe('Validation Integration', () => {
    it('should include validation scores when enabled', async () => {
      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (message: string) => {
        consoleOutput += message;
      };

      try {
        await formatOutputV2(mockAggregatedResults, {
          output: 'human',
          includeValidation: true,
          maxItemsPerSection: 20
        });
        
        expect(consoleOutput).toContain('VALIDATION SUMMARY');
        expect(consoleOutput).toContain('Average confidence score');
        expect(consoleOutput).toContain('High confidence:');
        expect(consoleOutput).toContain('Medium confidence:');
        expect(consoleOutput).toContain('Low confidence:');
        
        // Should show validation for individual headers
        expect(consoleOutput).toContain('Validation:');
        expect(consoleOutput).toMatch(/🟢|🟡|🔴/); // Should contain confidence emoji
        expect(consoleOutput).toContain('confidence');
        
      } finally {
        console.log = originalLog;
      }
    });

    it('should not include validation scores when disabled', async () => {
      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (message: string) => {
        consoleOutput += message;
      };

      try {
        await formatOutputV2(mockAggregatedResults, {
          output: 'human',
          includeValidation: false,
          maxItemsPerSection: 20
        });
        
        expect(consoleOutput).not.toContain('VALIDATION SUMMARY');
        expect(consoleOutput).not.toContain('Validation:');
        
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Markdown Format Bug Fix', () => {
    it('should wrap script values in code blocks in markdown format', async () => {
      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (message: string) => {
        consoleOutput += message;
      };

      try {
        await formatOutputV2(mockAggregatedResults, {
          output: 'markdown',
          maxItemsPerSection: 20
        });
        
        // Should wrap script content in backticks to prevent markdown disruption
        expect(consoleOutput).toContain('`<script>alert("test")</script>`');
        // Note: Only the first example is shown as "Top Source" in markdown format
        
        // Verify table structure is preserved
        expect(consoleOutput).toContain('| Rank | Pattern | Frequency | Sites | Occurrences | Top Source |');
        
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('CSV and JSON Format Enhancements', () => {
    it('should include enhanced bias data in CSV format', async () => {
      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (message: string) => {
        consoleOutput += message;
      };

      try {
        await formatOutputV2(mockAggregatedResults, {
          output: 'csv',
          includeRecommendations: true
        });
        
        expect(consoleOutput).toContain('Bias Metric,Value,Category');
        expect(consoleOutput).toContain('Dataset Quality Score,80.0%,Statistical Summary');
        expect(consoleOutput).toContain('Concentration Risk,medium,Risk Assessment');
        expect(consoleOutput).toContain('x-powered-by Specificity,85.0%,Platform Specificity');
        
      } finally {
        console.log = originalLog;
      }
    });

    it('should include enhanced bias data in JSON format', async () => {
      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (message: string) => {
        consoleOutput += message;
      };

      try {
        await formatOutputV2(mockAggregatedResults, {
          output: 'json',
          includeRecommendations: true
        });
        
        const parsed = JSON.parse(consoleOutput);
        
        // Check that bias analysis is properly serialized
        expect(parsed.metadata.formatVersion).toBe('2.0');
        expect(parsed.analysis.correlations).toBeDefined();
        expect(parsed.analysis.correlations.analyzerSpecific).toBeDefined();
        
        // Maps should be converted to objects
        expect(typeof parsed.analysis.correlations.analyzerSpecific.cmsDistribution.distributions).toBe('object');
        
      } finally {
        console.log = originalLog;
      }
    });
  });
});