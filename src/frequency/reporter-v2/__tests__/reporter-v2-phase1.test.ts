/**
 * Phase 1 V2 Reporter Tests - Core structure and human formatter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { formatOutputV2, formatHuman } from '../index.js';
import { AggregatedResults, FrequencySummary, PatternData, AnalysisResult } from '../../types/analyzer-interface.js';
import { FrequencyOptions } from '../../types/frequency-types-v2.js';

describe('V2 Reporter Phase 1', () => {
  let mockAggregatedResults: AggregatedResults;
  let mockOptions: FrequencyOptions;

  beforeEach(() => {
    // Create mock pattern data
    const mockPattern: PatternData = {
      pattern: 'x-powered-by',
      siteCount: 850,
      sites: new Set(['example1.com', 'example2.com']),
      frequency: 0.85,
      examples: new Set(['Express', 'PHP/7.4.0', 'ASP.NET']),
      occurrenceCount: 1200,
      metadata: { occurrences: 1200 }
    };

    const mockHeadersResult: AnalysisResult<any> = {
      patterns: new Map([['x-powered-by', mockPattern]]),
      totalSites: 1000,
      metadata: {
        analyzer: 'headers',
        analyzedAt: '2024-01-01T10:00:00Z',
        totalPatternsFound: 1,
        totalPatternsAfterFiltering: 1,
        options: { minOccurrences: 1, includeExamples: true }
      }
    };

    const mockSummary: FrequencySummary = {
      totalSitesAnalyzed: 1000,
      totalPatternsFound: 50,
      analysisDate: '2024-01-01T10:00:00Z',
      topPatterns: {
        headers: [{ pattern: 'x-powered-by', siteCount: 850, frequency: 0.85 }],
        metaTags: [],
        scripts: [],
        technologies: []
      }
    };

    mockAggregatedResults = {
      headers: mockHeadersResult,
      metaTags: mockHeadersResult, // Use same structure for simplicity
      scripts: mockHeadersResult,
      semantic: mockHeadersResult,
      validation: mockHeadersResult,
      vendor: mockHeadersResult,
      discovery: mockHeadersResult,
      cooccurrence: mockHeadersResult,
      technologies: mockHeadersResult,
      correlations: mockHeadersResult,
      summary: mockSummary
    };

    mockOptions = {
      output: 'human',
      includeRecommendations: false
    };
  });

  describe('formatHuman', () => {
    it('should generate human-readable output with all sections', () => {
      const output = formatHuman(mockAggregatedResults, {
        ...mockOptions,
        maxItemsPerSection: 20,
        includeRecommendations: false
      });

      expect(output).toContain('FREQUENCY ANALYSIS RESULTS');
      expect(output).toContain('Total Sites Analyzed: 1,000');
      expect(output).toContain('Total Patterns Found: 50');
      expect(output).toContain('HTTP HEADERS');
      expect(output).toContain('x-powered-by');
      expect(output).toContain('Frequency: 85%');
      expect(output).toContain('Sites: 850/1,000 sites');
    });

    it('should handle empty results gracefully', () => {
      const emptyResults: AggregatedResults = {
        ...mockAggregatedResults,
        headers: {
          patterns: new Map(),
          totalSites: 0,
          metadata: {
            analyzer: 'headers',
            analyzedAt: '2024-01-01T10:00:00Z',
            totalPatternsFound: 0,
            totalPatternsAfterFiltering: 0,
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
        }
      };

      const output = formatHuman(emptyResults, {
        ...mockOptions,
        maxItemsPerSection: 20
      });

      expect(output).toContain('FREQUENCY ANALYSIS RESULTS');
      expect(output).not.toContain('HTTP HEADERS');
      expect(output).not.toContain('META TAGS');
    });

    it('should respect maxItemsPerSection option', () => {
      // Create more patterns
      const manyPatterns = new Map<string, PatternData>();
      for (let i = 0; i < 50; i++) {
        manyPatterns.set(`header-${i}`, {
          pattern: `header-${i}`,
          siteCount: 100 - i,
          sites: new Set([`site${i}.com`]),
          frequency: (100 - i) / 1000,
          examples: new Set([`value-${i}`]),
          occurrenceCount: 100 - i
        });
      }

      const resultsWithManyPatterns: AggregatedResults = {
        ...mockAggregatedResults,
        headers: {
          ...mockAggregatedResults.headers,
          patterns: manyPatterns
        }
      };

      const output = formatHuman(resultsWithManyPatterns, {
        ...mockOptions,
        maxItemsPerSection: 5
      });

      // Should only contain first 5 headers (uppercase in output)
      expect(output).toContain('HEADER-0');
      expect(output).toContain('HEADER-4');
      expect(output).not.toContain('HEADER-10');
    });
  });

  describe('formatOutputV2', () => {
    it('should output to console when no output file specified', async () => {
      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (message: string) => {
        consoleOutput += message;
      };

      try {
        await formatOutputV2(mockAggregatedResults, mockOptions);
        expect(consoleOutput).toContain('FREQUENCY ANALYSIS RESULTS');
        expect(consoleOutput).toContain('HTTP HEADERS');
      } finally {
        console.log = originalLog;
      }
    });

    it('should support CSV output format', async () => {
      const csvOptions: FrequencyOptions = {
        ...mockOptions,
        output: 'csv'
      };

      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (message: string) => {
        consoleOutput += message;
      };

      try {
        await formatOutputV2(mockAggregatedResults, csvOptions);
        
        // Should generate CSV format output
        expect(consoleOutput).toContain('# Summary');
        expect(consoleOutput).toContain('Category,Value');
        expect(consoleOutput).toContain('# HTTP Headers');
        expect(consoleOutput).toContain('Header,Frequency,Sites,Occurrences,Top Value');
        
      } finally {
        console.log = originalLog;
      }
    });

    it('should use default options when not provided', async () => {
      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (message: string) => {
        consoleOutput += message;
      };

      try {
        await formatOutputV2(mockAggregatedResults, {});
        expect(consoleOutput).toContain('FREQUENCY ANALYSIS RESULTS');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Pattern utility functions', () => {
    it('should format frequency correctly', async () => {
      const { formatFrequency } = await import('../utils/formatting.js');
      
      expect(formatFrequency(0.851)).toBe('85%');
      expect(formatFrequency(0.056)).toBe('5.6%');
      expect(formatFrequency(0.005)).toBe('0.5%');
      expect(formatFrequency(0.0005)).toBe('<0.1%');
      expect(formatFrequency(0)).toBe('0%');
    });

    it('should extract top patterns correctly', async () => {
      const { getTopPatterns } = await import('../utils/pattern-utils.js');
      
      const patterns = new Map<string, PatternData>();
      patterns.set('high', { pattern: 'high', frequency: 0.9, siteCount: 900, sites: new Set() });
      patterns.set('medium', { pattern: 'medium', frequency: 0.5, siteCount: 500, sites: new Set() });
      patterns.set('low', { pattern: 'low', frequency: 0.1, siteCount: 100, sites: new Set() });

      const top2 = getTopPatterns(patterns, 2);
      expect(top2).toHaveLength(2);
      expect(top2[0][0]).toBe('high');
      expect(top2[1][0]).toBe('medium');
    });
  });
});