/**
 * Map Safety Tests for V2 Reporter
 * Tests that the reporter handles invalid Map/Set data gracefully
 */

import { describe, it, expect } from 'vitest';
import { formatHuman } from '../index.js';
import { AggregatedResults, FrequencySummary, AnalysisResult } from '../../types/analyzer-interface.js';
import { hasValidPatterns, getPatternCount, validatePatternData } from '../utils/safe-map-utils.js';

describe('V2 Reporter Map Safety', () => {
  describe('Safe map utilities', () => {
    it('should detect invalid patterns Map', () => {
      const invalidResult = {
        patterns: null, // Invalid - should be Map
        totalSites: 100,
        metadata: {
          analyzer: 'test',
          analyzedAt: '2024-01-01T10:00:00Z',
          totalPatternsFound: 0,
          totalPatternsAfterFiltering: 0,
          options: { minOccurrences: 1, includeExamples: true }
        }
      } as any;

      expect(hasValidPatterns(invalidResult)).toBe(false);
      expect(getPatternCount(invalidResult)).toBe(0);
    });

    it('should detect empty patterns Map', () => {
      const emptyResult: AnalysisResult<any> = {
        patterns: new Map(),
        totalSites: 100,
        metadata: {
          analyzer: 'test',
          analyzedAt: '2024-01-01T10:00:00Z',
          totalPatternsFound: 0,
          totalPatternsAfterFiltering: 0,
          options: { minOccurrences: 1, includeExamples: true }
        }
      };

      expect(hasValidPatterns(emptyResult)).toBe(false);
      expect(getPatternCount(emptyResult)).toBe(0);
    });

    it('should validate pattern data correctly', () => {
      const validPattern = {
        pattern: 'test-header',
        siteCount: 100,
        sites: new Set(['site1.com']),
        frequency: 0.8,
        examples: new Set(['value1', 'value2'])
      };

      const validation = validatePatternData(validPattern);
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should catch invalid pattern data', () => {
      const invalidPattern = {
        pattern: 'test-header',
        siteCount: -1, // Invalid
        sites: ['not-a-set'], // Invalid - should be Set
        frequency: 1.5, // Invalid - should be 0-1
        examples: 'not-a-set' // Invalid - should be Set
      } as any;

      const validation = validatePatternData(invalidPattern);
      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Reporter resilience with invalid data', () => {
    const mockSummary: FrequencySummary = {
      totalSitesAnalyzed: 1000,
      totalPatternsFound: 50,
      analysisDate: '2024-01-01T10:00:00Z',
      topPatterns: {
        headers: [],
        metaTags: [],
        scripts: [],
        technologies: []
      }
    };

    it('should handle null/undefined analysis results', () => {
      const resultsWithNulls: AggregatedResults = {
        headers: null as any,
        metaTags: undefined as any,
        scripts: {
          patterns: new Map(),
          totalSites: 0,
          metadata: {
            analyzer: 'scripts',
            analyzedAt: '2024-01-01T10:00:00Z',
            totalPatternsFound: 0,
            totalPatternsAfterFiltering: 0,
            options: { minOccurrences: 1, includeExamples: true }
          }
        },
        semantic: null as any,
        validation: null as any,
        vendor: null as any,
        discovery: null as any,
        cooccurrence: null as any,
        technologies: null as any,
        correlations: null as any,
        summary: mockSummary
      };

      const output = formatHuman(resultsWithNulls, {
        maxItemsPerSection: 10,
        includeRecommendations: false
      });

      // Should still generate summary section but skip others
      expect(output).toContain('FREQUENCY ANALYSIS RESULTS');
      expect(output).not.toContain('HTTP HEADERS');
      expect(output).not.toContain('META TAGS');
    });

    it('should handle non-Map patterns field', () => {
      const resultsWithInvalidMaps: AggregatedResults = {
        headers: {
          patterns: {} as any, // Plain object instead of Map
          totalSites: 100,
          metadata: {
            analyzer: 'headers',
            analyzedAt: '2024-01-01T10:00:00Z',
            totalPatternsFound: 1,
            totalPatternsAfterFiltering: 1,
            options: { minOccurrences: 1, includeExamples: true }
          }
        },
        metaTags: {
          patterns: [] as any, // Array instead of Map
          totalSites: 100,
          metadata: {
            analyzer: 'metaTags',
            analyzedAt: '2024-01-01T10:00:00Z',
            totalPatternsFound: 1,
            totalPatternsAfterFiltering: 1,
            options: { minOccurrences: 1, includeExamples: true }
          }
        },
        scripts: {
          patterns: new Map(),
          totalSites: 0,
          metadata: {
            analyzer: 'scripts',
            analyzedAt: '2024-01-01T10:00:00Z',
            totalPatternsFound: 0,
            totalPatternsAfterFiltering: 0,
            options: { minOccurrences: 1, includeExamples: true }
          }
        },
        semantic: null as any,
        validation: null as any,
        vendor: null as any,
        discovery: null as any,
        cooccurrence: null as any,
        technologies: null as any,
        correlations: null as any,
        summary: mockSummary
      };

      // Should not throw and should skip invalid sections
      expect(() => {
        const output = formatHuman(resultsWithInvalidMaps, {
          maxItemsPerSection: 10,
          includeRecommendations: false
        });
        expect(output).toContain('FREQUENCY ANALYSIS RESULTS');
        expect(output).not.toContain('HTTP HEADERS');
        expect(output).not.toContain('META TAGS');
      }).not.toThrow();
    });

    it('should handle patterns with invalid examples field', () => {
      const invalidPattern = {
        pattern: 'test-header',
        siteCount: 100,
        sites: new Set(['site1.com']),
        frequency: 0.8,
        examples: 'not-a-set' as any // Invalid - should be Set
      };

      const resultsWithInvalidExamples: AggregatedResults = {
        headers: {
          patterns: new Map([['test-header', invalidPattern]]),
          totalSites: 100,
          metadata: {
            analyzer: 'headers',
            analyzedAt: '2024-01-01T10:00:00Z',
            totalPatternsFound: 1,
            totalPatternsAfterFiltering: 1,
            options: { minOccurrences: 1, includeExamples: true }
          }
        },
        metaTags: {
          patterns: new Map(),
          totalSites: 0,
          metadata: {
            analyzer: 'metaTags',
            analyzedAt: '2024-01-01T10:00:00Z',
            totalPatternsFound: 0,
            totalPatternsAfterFiltering: 0,
            options: { minOccurrences: 1, includeExamples: true }
          }
        },
        scripts: {
          patterns: new Map(),
          totalSites: 0,
          metadata: {
            analyzer: 'scripts',
            analyzedAt: '2024-01-01T10:00:00Z',
            totalPatternsFound: 0,
            totalPatternsAfterFiltering: 0,
            options: { minOccurrences: 1, includeExamples: true }
          }
        },
        semantic: null as any,
        validation: null as any,
        vendor: null as any,
        discovery: null as any,
        cooccurrence: null as any,
        technologies: null as any,
        correlations: null as any,
        summary: mockSummary
      };

      // Should not throw and should handle gracefully
      expect(() => {
        const output = formatHuman(resultsWithInvalidExamples, {
          maxItemsPerSection: 10,
          includeRecommendations: false
        });
        expect(output).toContain('FREQUENCY ANALYSIS RESULTS');
        expect(output).toContain('HTTP HEADERS');
        expect(output).toContain('TEST-HEADER'); // Should still show the header
      }).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle extremely large Maps', () => {
      const largeMap = new Map();
      for (let i = 0; i < 10000; i++) {
        largeMap.set(`header-${i}`, {
          pattern: `header-${i}`,
          siteCount: Math.floor(Math.random() * 1000),
          sites: new Set([`site${i}.com`]),
          frequency: Math.random(),
          examples: new Set([`value-${i}`])
        });
      }

      const resultWithLargeMap: AnalysisResult<any> = {
        patterns: largeMap,
        totalSites: 1000,
        metadata: {
          analyzer: 'headers',
          analyzedAt: '2024-01-01T10:00:00Z',
          totalPatternsFound: 10000,
          totalPatternsAfterFiltering: 10000,
          options: { minOccurrences: 1, includeExamples: true }
        }
      };

      expect(hasValidPatterns(resultWithLargeMap)).toBe(true);
      expect(getPatternCount(resultWithLargeMap)).toBe(10000);
    });

    it('should handle Maps with undefined/null values', () => {
      const mapWithNulls = new Map();
      mapWithNulls.set('valid-header', {
        pattern: 'valid-header',
        siteCount: 100,
        sites: new Set(['site1.com']),
        frequency: 0.8,
        examples: new Set(['value1'])
      });
      mapWithNulls.set('null-header', null);
      mapWithNulls.set('undefined-header', undefined);

      const resultWithNulls: AnalysisResult<any> = {
        patterns: mapWithNulls,
        totalSites: 100,
        metadata: {
          analyzer: 'headers',
          analyzedAt: '2024-01-01T10:00:00Z',
          totalPatternsFound: 3,
          totalPatternsAfterFiltering: 1,
          options: { minOccurrences: 1, includeExamples: true }
        }
      };

      expect(hasValidPatterns(resultWithNulls)).toBe(true);
      expect(getPatternCount(resultWithNulls)).toBe(3);
    });
  });
});