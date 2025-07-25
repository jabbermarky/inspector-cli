import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { analyzeFrequency } from '../analyzer.js';
import type { FrequencyOptionsWithDefaults, DetectionDataPoint } from '../types.js';
import { setupCommandTests } from '@test-utils';

// Only mock external dependencies - keep all business logic real
vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

// Mock filesystem operations but keep all analysis logic real
vi.mock('../collector.js', () => ({
  collectData: vi.fn()
}));

// Mock output formatting to avoid file writes
vi.mock('../reporter.js', () => ({
  formatOutput: vi.fn()
}));

describe('Analyzer Integration Tests', () => {
  setupCommandTests();
  
  let mockCollectData: any;
  let mockFormatOutput: any;
  
  beforeEach(async () => {
    const collector = await import('../collector.js');
    const reporter = await import('../reporter.js');
    
    mockCollectData = vi.mocked(collector.collectData);
    mockFormatOutput = vi.mocked(reporter.formatOutput);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Real Data Flow Integration', () => {
    it('should perform complete semantic analysis with real data', async () => {
      // Create realistic test data that would trigger the production bug
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://wordpress-site.com',
          timestamp: new Date('2024-01-15').toISOString(),
          httpHeaders: {
            'server': 'Apache/2.4.41',
            'x-powered-by': 'PHP/8.1.0',
            'x-pingback': 'https://wordpress-site.com/xmlrpc.php',
            'link': '<https://wordpress-site.com/wp-json/>; rel="https://api.w.org/"'
          },
          detectionResults: [
            { cms: 'WordPress', confidence: 0.95, version: '6.2.1' }
          ]
        },
        {
          url: 'https://drupal-site.com',
          timestamp: new Date('2024-01-16').toISOString(),
          httpHeaders: {
            'server': 'nginx/1.18.0',
            'x-generator': 'Drupal 9 (https://www.drupal.org)',
            'x-drupal-cache': 'HIT'
          },
          detectionResults: [
            { cms: 'Drupal', confidence: 0.90, version: '9.4.0' }
          ]
        },
        {
          url: 'https://cloudflare-site.com',
          timestamp: new Date('2024-01-17').toISOString(),
          httpHeaders: {
            'server': 'cloudflare',
            'cf-ray': '7d4b1c2a3b4c5d6e-DFW',
            'cf-cache-status': 'HIT'
          },
          detectionResults: [
            { cms: 'Unknown', confidence: 0.0 }
          ]
        }
      ];

      mockCollectData.mockResolvedValue({
        dataPoints: testDataPoints,
        filteringReport: {
          sitesFilteredOut: 0,
          filterReasons: {}
        }
      });

      const options: FrequencyOptionsWithDefaults = {
        dataSource: 'cms-analysis',
        dataDir: './data/cms-analysis',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: true,
        includeCurrentFilters: true
      };

      const result = await analyzeFrequency(options);

      // Critical test: Verify semantic analysis was populated (the production bug)
      expect(result.semanticAnalysis).toBeDefined();
      expect(result.semanticAnalysis.headerAnalyses).toBeDefined();
      expect(result.semanticAnalysis.headerAnalyses instanceof Map).toBe(true);
      expect(result.semanticAnalysis.headerAnalyses.size).toBeGreaterThan(0);

      // Verify specific headers were analyzed
      const headerNames = Array.from(result.semanticAnalysis.headerAnalyses.keys());
      expect(headerNames).toContain('server');
      expect(headerNames).toContain('x-powered-by');
      expect(headerNames).toContain('cf-ray');

      // Verify semantic insights were generated
      expect(result.semanticAnalysis.insights).toBeDefined();
      expect(result.semanticAnalysis.insights.categoryDistribution).toBeDefined();
      expect(Object.values(result.semanticAnalysis.insights.categoryDistribution)
        .reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0);

      // Verify vendor analysis worked
      expect(result.semanticAnalysis.vendorStats).toBeDefined();
      expect(result.semanticAnalysis.vendorStats.totalHeaders).toBeGreaterThan(0);

      // Verify technology stack inference
      expect(result.semanticAnalysis.technologyStack).toBeDefined();
    });

    it('should properly handle Map objects in data pipeline', async () => {
      // This test specifically checks the Map handling bug that caused "0 headers"
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://test-site.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'Apache',
            'content-type': 'text/html; charset=UTF-8',
            'cache-control': 'max-age=3600'
          },
          detectionResults: [
            { cms: 'WordPress', confidence: 0.80 }
          ]
        }
      ];

      mockCollectData.mockResolvedValue({
        dataPoints: testDataPoints,
        filteringReport: { sitesFilteredOut: 0, filterReasons: {} }
      });

      const options: FrequencyOptionsWithDefaults = {
        dataSource: 'cms-analysis',
        dataDir: './data/cms-analysis',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      };

      const result = await analyzeFrequency(options);

      // Test the specific fix: analyzer.ts:72 should use Array.from(headerPatterns.keys())
      // not Object.keys(headerPatterns)
      const uniqueHeaders = Array.from(result.semanticAnalysis.headerAnalyses.keys());
      expect(uniqueHeaders.length).toBeGreaterThan(0);
      expect(uniqueHeaders).toContain('server');
      expect(uniqueHeaders).toContain('content-type');
      expect(uniqueHeaders).toContain('cache-control');

      // Verify the semantic analysis actually processed these headers
      const serverAnalysis = result.semanticAnalysis.headerAnalyses.get('server');
      expect(serverAnalysis).toBeDefined();
      expect(serverAnalysis!.headerName).toBe('server');
      expect(serverAnalysis!.category.primary).toBe('cms');

      const cacheAnalysis = result.semanticAnalysis.headerAnalyses.get('cache-control');
      expect(cacheAnalysis).toBeDefined();
      expect(cacheAnalysis!.headerName).toBe('cache-control');
      expect(cacheAnalysis!.category.primary).toBe('caching');
    });

    it('should handle various data volumes correctly', async () => {
      // Test with different scales to verify percentage calculations
      const createDataPoints = (count: number): DetectionDataPoint[] => {
        return Array.from({ length: count }, (_, i) => ({
          url: `https://site${i + 1}.com`,
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': i % 2 === 0 ? 'Apache' : 'nginx',
            'x-powered-by': i % 3 === 0 ? 'PHP' : 'Express'
          },
          detectionResults: [
            { cms: i % 4 === 0 ? 'WordPress' : 'Unknown', confidence: 0.75 }
          ]
        }));
      };

      // Test with 10 sites
      mockCollectData.mockResolvedValue({
        dataPoints: createDataPoints(10),
        filteringReport: { sitesFilteredOut: 0, filterReasons: {} }
      });

      const options: FrequencyOptionsWithDefaults = {
        dataSource: 'cms-analysis',
        dataDir: './data/cms-analysis',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      };

      const result = await analyzeFrequency(options);

      // Verify semantic analysis scaled properly
      expect(result.semanticAnalysis.headerAnalyses.size).toBe(2); // server, x-powered-by
      
      // Verify percentage calculations are correct for 10 sites
      const insights = result.semanticAnalysis.insights;
      const totalCategories = Object.values(insights.categoryDistribution)
        .reduce((sum, count) => sum + count, 0);
      expect(totalCategories).toBe(2); // Only 2 unique headers

      // Verify naming convention percentages add up correctly
      const totalConventions = Object.values(insights.namingConventions)
        .reduce((sum, count) => sum + count, 0);
      expect(totalConventions).toBe(2); // Same 2 headers

      // Verify vendor stats are calculated correctly
      expect(result.semanticAnalysis.vendorStats.totalHeaders).toBe(2);
    });

    it('should handle empty datasets gracefully', async () => {
      mockCollectData.mockResolvedValue({
        dataPoints: [],
        filteringReport: { sitesFilteredOut: 5, filterReasons: { 'dateFilter': 5 } }
      });

      const options: FrequencyOptionsWithDefaults = {
        dataSource: 'cms-analysis',
        dataDir: './data/cms-analysis',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      };

      // Should throw insufficient data error
      await expect(analyzeFrequency(options)).rejects.toThrow('Insufficient data: found 0 sites, minimum required: 1');
    });

    it('should integrate all analysis modules correctly', async () => {
      // Test the complete integration pipeline with realistic data
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://full-integration-test.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'Apache/2.4.41',
            'x-powered-by': 'PHP/8.1.0',
            'content-type': 'text/html; charset=UTF-8',
            'x-pingback': 'https://full-integration-test.com/xmlrpc.php',
            'cf-ray': '7d4b1c2a3b4c5d6e-DFW',
            'cf-cache-status': 'HIT'
          },
          metaTags: [
            { name: 'generator', content: 'WordPress 6.2.1' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' }
          ],
          scripts: [
            { src: '/wp-content/themes/theme/js/script.js' },
            { src: 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js' }
          ],
          detectionResults: [
            { cms: 'WordPress', confidence: 0.95, version: '6.2.1' }
          ],
          robotsTxt: {
            httpHeaders: {
              'server': 'Apache/2.4.41',
              'content-type': 'text/plain'
            }
          }
        }
      ];

      mockCollectData.mockResolvedValue({
        dataPoints: testDataPoints,
        filteringReport: { sitesFilteredOut: 0, filterReasons: {} }
      });

      const options: FrequencyOptionsWithDefaults = {
        dataSource: 'cms-analysis',
        dataDir: './data/cms-analysis',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: true,
        includeCurrentFilters: true
      };

      const result = await analyzeFrequency(options);

      // Verify all analysis components are present and populated
      expect(result.headers).toBeDefined();
      expect(Object.keys(result.headers).length).toBeGreaterThan(0);

      expect(result.metaTags).toBeDefined();
      expect(Object.keys(result.metaTags).length).toBeGreaterThan(0);

      expect(result.scripts).toBeDefined();
      expect(Object.keys(result.scripts).length).toBeGreaterThan(0);

      expect(result.semanticAnalysis).toBeDefined();
      expect(result.semanticAnalysis.headerAnalyses.size).toBeGreaterThan(0);

      expect(result.cooccurrenceAnalysis).toBeDefined();
      expect(result.cooccurrenceAnalysis.cooccurrences.length).toBeGreaterThan(0);

      expect(result.patternDiscoveryAnalysis).toBeDefined();
      expect(result.patternDiscoveryAnalysis.discoveredPatterns.length).toBeGreaterThan(0);

      expect(result.biasAnalysis).toBeDefined();

      expect(result.recommendations).toBeDefined();

      // Verify metadata consistency
      expect(result.metadata.validSites).toBe(1);
      expect(result.metadata.totalSites).toBe(1);
      expect(result.metadata.filteredSites).toBe(0);

      // Verify temporal range calculation
      expect(result.metadata.temporalRange).toBeDefined();
      expect(result.metadata.temporalRange!.earliestCapture).toBeDefined();
      expect(result.metadata.temporalRange!.latestCapture).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle analysis module failures gracefully', async () => {
      // Test with malformed data that might cause analysis failures
      const malformedDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://malformed-site.com',
          timestamp: 'invalid-date',
          httpHeaders: {
            'malformed-header': '\x00\x01\x02', // Binary data
            'empty-header': '',
            'extremely-long-header': 'x'.repeat(10000)
          },
          metaTags: [
            { name: '', content: '' }, // Empty meta tag
            { name: 'malformed', content: '\x00\x01\x02' }
          ],
          scripts: [
            { src: '' }, // Empty script
            { src: 'javascript:alert("xss")' } // Potentially malicious script
          ],
          detectionResults: [] // No detection results
        }
      ];

      mockCollectData.mockResolvedValue({
        dataPoints: malformedDataPoints,
        filteringReport: { sitesFilteredOut: 0, filterReasons: {} }
      });

      const options: FrequencyOptionsWithDefaults = {
        dataSource: 'cms-analysis',
        dataDir: './data/cms-analysis',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      };

      // Should not throw errors, but handle malformed data gracefully
      const result = await analyzeFrequency(options);

      expect(result).toBeDefined();
      expect(result.metadata.validSites).toBe(1);
      
      // Should still produce some analysis results even with malformed data
      expect(result.semanticAnalysis).toBeDefined();
      expect(result.semanticAnalysis.headerAnalyses).toBeDefined();
    });

    it('should handle collection failures properly', async () => {
      mockCollectData.mockRejectedValue(new Error('Data collection failed'));

      const options: FrequencyOptionsWithDefaults = {
        dataSource: 'cms-analysis',
        dataDir: './data/cms-analysis',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      };

      await expect(analyzeFrequency(options)).rejects.toThrow('Data collection failed');
    });
  });
});