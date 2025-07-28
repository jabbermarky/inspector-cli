/**
 * Tests for Analyzer V2 - Backward compatibility and integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeFrequencyV2 } from '../analyzer-v2.js';
import { FrequencyAggregator } from '../frequency-aggregator.js';
import { DataPreprocessor } from '../data-preprocessor.js';
import { RecommendationsCoordinator } from '../analyzers/recommendations-coordinator.js';
import { formatOutput } from '../reporter.js';
import type { FrequencyOptions } from '../types-v1.js';

// Mock the FrequencyAggregator
vi.mock('../frequency-aggregator.js');

// Mock the DataPreprocessor
vi.mock('../data-preprocessor.js');

// Mock the RecommendationsCoordinator
vi.mock('../analyzers/recommendations-coordinator.js');

// Mock the reporter to prevent file output
vi.mock('../reporter.js');

describe('AnalyzerV2', () => {
  let mockAggregator: any;
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
          }],
          ['server', {
            pattern: 'server',
            siteCount: 200,
            frequency: 1.0,
            sites: new Set(['site1.com', 'site2.com', 'site3.com']),
            examples: new Set(['server: Apache/2.4', 'server: nginx/1.18'])
          }]
        ]),
        totalSites: 200,
        metadata: {
          analyzer: 'HeaderAnalyzerV2',
          totalPatternsFound: 10,
          totalPatternsAfterFiltering: 2
        }
      },
      metaTags: {
        patterns: new Map([
          ['name:generator', {
            pattern: 'name:generator',
            siteCount: 100,
            frequency: 0.5,
            sites: new Set(['site1.com']),
            examples: new Set(['name:generator="WordPress 5.8"'])
          }]
        ]),
        totalSites: 200,
        metadata: {
          analyzer: 'MetaAnalyzerV2',
          totalPatternsFound: 5,
          totalPatternsAfterFiltering: 1
        }
      },
      summary: {
        totalSitesAnalyzed: 200,
        totalPatternsFound: 15,
        analysisDate: '2024-01-01T00:00:00Z'
      }
    };

    // Mock aggregator
    mockAggregator = {
      analyze: vi.fn().mockResolvedValue(mockResults)
    };

    vi.mocked(FrequencyAggregator).mockImplementation(() => mockAggregator);

    // Mock DataPreprocessor
    vi.mocked(DataPreprocessor).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue({
        sites: new Map()
      })
    } as any));

    // Mock RecommendationsCoordinator
    vi.mocked(RecommendationsCoordinator).mockImplementation(() => ({
      generateRecommendations: vi.fn().mockResolvedValue({
        learn: {},
        detectCms: {},
        groundTruth: {},
        biasAnalysis: null
      })
    } as any));

    // Mock formatOutput to prevent file writes
    vi.mocked(formatOutput).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeFrequencyV2', () => {
    it('should use FrequencyAggregator and return legacy format', async () => {
      const options: FrequencyOptions = {
        minOccurrences: 5,
        dataDir: './test-data'
      };

      const result = await analyzeFrequencyV2(options);

      // Verify aggregator was used
      expect(FrequencyAggregator).toHaveBeenCalledWith('./test-data');
      expect(mockAggregator.analyze).toHaveBeenCalledWith(options);

      // Verify legacy format structure
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('metaTags');
      expect(result).toHaveProperty('scripts');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('filteringReport');
      expect(result).toHaveProperty('metadata');
    });

    it('should convert header patterns to legacy format', async () => {
      const result = await analyzeFrequencyV2();

      // Check headers conversion
      expect(result.headers['x-powered-by']).toBeDefined();
      expect(result.headers['server']).toBeDefined();

      const xPoweredBy = result.headers['x-powered-by'];
      expect(xPoweredBy.frequency).toBe(0.75);
      expect(xPoweredBy.occurrences).toBe(150); // siteCount mapped to occurrences
      expect(xPoweredBy.totalSites).toBe(200);
      expect(xPoweredBy.values).toBeDefined();
      expect(xPoweredBy.values[0].examples).toHaveLength(1);
    });

    it('should convert meta tag patterns to legacy format', async () => {
      const result = await analyzeFrequencyV2();

      // Check meta tags conversion
      expect(result.metaTags['name:generator']).toBeDefined();

      const generator = result.metaTags['name:generator'];
      expect(generator.frequency).toBe(0.5);
      expect(generator.occurrences).toBe(100);
      expect(generator.totalSites).toBe(200);
      expect(generator.values[0].examples).toHaveLength(1);
    });

    it('should create proper filtering report in legacy format', async () => {
      const result = await analyzeFrequencyV2();

      expect(result.metadata.totalSites).toBe(200);
      expect(result.metadata.validSites).toBe(200);
      expect(result.metadata.filteredSites).toBe(0);
      expect(result.filteringReport).toBeDefined();
      expect(result.filteringReport.sitesFilteredOut).toBe(0);
    });

    it('should include metadata with analysis info', async () => {
      const result = await analyzeFrequencyV2();

      expect(result.metadata.analysisDate).toBeDefined();
      expect(result.metadata.options).toBeDefined();
      expect(result.metadata.totalSites).toBe(200);
    });

    it('should apply default options', async () => {
      const result = await analyzeFrequencyV2({});

      expect(result.metadata.options.minOccurrences).toBe(10);
      expect(result.metadata.options.output).toBe('human');
      expect(result.metadata.options.includeRecommendations).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
  describe('Error Handling', () => {
    it('should propagate aggregator errors', async () => {
      const error = new Error('Aggregator failed');
      mockAggregator.analyze.mockRejectedValue(error);

      await expect(analyzeFrequencyV2()).rejects.toThrow('Aggregator failed');
    });

    it('should handle empty results gracefully', async () => {
      mockAggregator.analyze.mockResolvedValue({
        headers: { patterns: new Map(), totalSites: 0 },
        metaTags: { patterns: new Map(), totalSites: 0 },
        summary: { totalSitesAnalyzed: 0, totalPatternsFound: 0 }
      });

      const result = await analyzeFrequencyV2();

      expect(Object.keys(result.headers)).toHaveLength(0);
      expect(Object.keys(result.metaTags)).toHaveLength(0);
      expect(result.metadata.totalSites).toBe(0);
    });
  });
});