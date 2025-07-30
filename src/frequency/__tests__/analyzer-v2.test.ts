/**
 * Tests for Analyzer V2 - Simple integration test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeFrequencyV2 } from '../analyzer-v2.js';
import { FrequencyAggregator } from '../frequency-aggregator-v2.js';
import type { FrequencyOptions } from '../types/frequency-types-v2.js';

// Mock the FrequencyAggregator
vi.mock('../frequency-aggregator-v2.js');

describe('AnalyzerV2', () => {
  let mockResults: any;

  beforeEach(() => {
    // Create mock aggregated results
    mockResults = {
      headers: {
        patterns: new Map([
          ['x-powered-by', {
            pattern: 'x-powered-by',
            siteCount: 150,
            frequency: 0.75,
            sites: new Set(['site1.com', 'site2.com']),
            examples: new Set(['x-powered-by: PHP/7.4', 'x-powered-by: PHP/8.0'])
          }]
        ]),
        totalSites: 200,
        metadata: {
          analyzer: 'headers',
          analyzedAt: '2024-01-01T00:00:00Z',
          totalPatternsFound: 1,
          totalPatternsAfterFiltering: 1,
          options: { minOccurrences: 5, includeExamples: true }
        }
      },
      metaTags: { patterns: new Map(), totalSites: 200, metadata: {} },
      scripts: { patterns: new Map(), totalSites: 200, metadata: {} },
      summary: {
        totalSitesAnalyzed: 200,
        totalPatternsFound: 1,
        analysisDate: '2024-01-01T00:00:00Z'
      }
    };

    // Mock FrequencyAggregator constructor and analyze method
    vi.mocked(FrequencyAggregator).mockImplementation(() => ({
      analyze: vi.fn().mockResolvedValue(mockResults)
    } as any));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeFrequencyV2', () => {
    it('should use FrequencyAggregator and return aggregated results', async () => {
      const options: FrequencyOptions = {
        minSites: 10,
        dataDir: './data/cms-analysis'
      };

      const result = await analyzeFrequencyV2(options);

      // Verify FrequencyAggregator was called
      expect(FrequencyAggregator).toHaveBeenCalledWith(options.dataDir);
      
      // Verify the result is the aggregated results
      expect(result).toBe(mockResults);
      expect(result.headers.patterns.size).toBe(1);
      expect(result.summary.totalSitesAnalyzed).toBe(200);
    });

    it('should apply default options', async () => {
      const result = await analyzeFrequencyV2();

      // Should still work with no options
      expect(FrequencyAggregator).toHaveBeenCalledWith(undefined);
      expect(result).toBe(mockResults);
    });

    it('should propagate aggregator errors', async () => {
      const error = new Error('Aggregator failed');
      
      vi.mocked(FrequencyAggregator).mockImplementation(() => ({
        analyze: vi.fn().mockRejectedValue(error)
      } as any));

      await expect(analyzeFrequencyV2()).rejects.toThrow('Aggregator failed');
    });
  });
});