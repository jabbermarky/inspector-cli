import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { analyzeFrequency } from '../analyzer.js';
import type { FrequencyOptionsWithDefaults } from '../types.js';
import { setupCommandTests } from '@test-utils';

// Mock all dependencies
vi.mock('../collector.js');
vi.mock('../header-analyzer.js');
vi.mock('../meta-analyzer.js');
vi.mock('../script-analyzer.js');
vi.mock('../recommender.js');
vi.mock('../reporter.js');
vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

describe('Frequency Analyzer', () => {
  setupCommandTests();
  
  let mockCollectData: any;
  let mockAnalyzeHeaders: any;
  let mockAnalyzeMetaTags: any;
  let mockAnalyzeScripts: any;
  let mockGenerateRecommendations: any;
  let mockFormatOutput: any;
  
  beforeEach(async () => {
    // Import mocked functions
    const collector = await import('../collector.js');
    const headerAnalyzer = await import('../header-analyzer.js');
    const metaAnalyzer = await import('../meta-analyzer.js');
    const scriptAnalyzer = await import('../script-analyzer.js');
    const recommender = await import('../recommender.js');
    const reporter = await import('../reporter.js');
    
    mockCollectData = vi.mocked(collector.collectData);
    mockAnalyzeHeaders = vi.mocked(headerAnalyzer.analyzeHeaders);
    mockAnalyzeMetaTags = vi.mocked(metaAnalyzer.analyzeMetaTags);
    mockAnalyzeScripts = vi.mocked(scriptAnalyzer.analyzeScripts);
    mockGenerateRecommendations = vi.mocked(recommender.generateRecommendations);
    mockFormatOutput = vi.mocked(reporter.formatOutput);
    
    // Setup default mock returns
    mockCollectData.mockResolvedValue({
      dataPoints: [
        {
          url: 'https://site1.com',
          headers: { 'server': 'Apache' },
          metaTags: [{ name: 'generator', content: 'WordPress' }],
          scripts: [{ src: '/wp-content/script.js' }]
        }
      ],
      filteringReport: {
        sitesFilteredOut: 0,
        filterReasons: {}
      }
    });
    
    mockAnalyzeHeaders.mockResolvedValue(new Map([
      ['server', [{ pattern: 'server:Apache', frequency: 1.0, occurrences: 1, examples: ['Apache'] }]]
    ]));
    
    mockAnalyzeMetaTags.mockResolvedValue(new Map([
      ['name:generator', [{ pattern: 'generator:WordPress', frequency: 1.0, occurrences: 1, examples: ['WordPress'] }]]
    ]));
    
    mockAnalyzeScripts.mockResolvedValue(new Map([
      ['paths', [{ pattern: 'path:wp-content', frequency: 1.0, occurrences: 1, examples: ['/wp-content/script.js'] }]]
    ]));
    
    mockGenerateRecommendations.mockResolvedValue({
      learn: {
        currentlyFiltered: ['server'],
        recommendToFilter: [],
        recommendToKeep: []
      },
      detectCms: {
        newPatternOpportunities: [],
        patternsToRefine: []
      },
      groundTruth: {
        potentialNewRules: []
      }
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Full Analysis Pipeline', () => {
    it('should orchestrate complete frequency analysis', async () => {
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
      
      // Verify all components were called
      expect(mockCollectData).toHaveBeenCalledWith(options);
      expect(mockAnalyzeHeaders).toHaveBeenCalledWith(
        expect.any(Array),
        options
      );
      expect(mockAnalyzeMetaTags).toHaveBeenCalledWith(
        expect.any(Array),
        options
      );
      expect(mockAnalyzeScripts).toHaveBeenCalledWith(
        expect.any(Array),
        options
      );
      expect(mockGenerateRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          headerPatterns: expect.any(Map),
          metaPatterns: expect.any(Map),
          scriptPatterns: expect.any(Map),
          dataPoints: expect.any(Array),
          options: options
        })
      );
      
      // Verify result structure
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('metaTags');
      expect(result).toHaveProperty('scripts');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('filteringReport');
      
      // Verify metadata
      expect(result.metadata.totalSites).toBe(1);
      expect(result.metadata.validSites).toBe(1);
      expect(result.metadata.filteredSites).toBe(0);
      expect(result.metadata.options).toEqual(options);
    });
    
    it('should handle insufficient data error', async () => {
      mockCollectData.mockResolvedValue({
        dataPoints: [],
        filteringReport: {
          sitesFilteredOut: 0,
          filterReasons: {}
        }
      });
      
      const options: FrequencyOptionsWithDefaults = {
        dataSource: 'cms-analysis',
        dataDir: './data/cms-analysis',
        minSites: 10,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      };
      
      await expect(analyzeFrequency(options)).rejects.toThrow('Insufficient data: found 0 sites, minimum required: 10');
    });
    
    it('should skip recommendations when not requested', async () => {
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
      
      expect(mockGenerateRecommendations).not.toHaveBeenCalled();
      expect(result.recommendations).toBeUndefined();
    });
    
    it('should format output when file specified', async () => {
      const options: FrequencyOptionsWithDefaults = {
        dataSource: 'cms-analysis',
        dataDir: './data/cms-analysis',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'json',
        outputFile: 'frequency.json',
        includeRecommendations: false,
        includeCurrentFilters: false
      };
      
      await analyzeFrequency(options);
      
      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.any(Object),
        options
      );
    });
    
    it('should handle errors gracefully', async () => {
      mockCollectData.mockRejectedValue(new Error('Collection failed'));
      
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
      
      await expect(analyzeFrequency(options)).rejects.toThrow('Collection failed');
    });
  });
  
  describe('Data Formatting', () => {
    it('should format header data correctly', async () => {
      // Set up collector to return 5 data points to match frequency calculations
      mockCollectData.mockResolvedValue({
        dataPoints: Array(5).fill(null).map((_, i) => ({
          url: `https://site${i+1}.com`,
          headers: { 'server': 'Apache' },
          metaTags: [],
          scripts: []
        })),
        filteringReport: {
          sitesFilteredOut: 0,
          filterReasons: {}
        }
      });
      
      const mockHeaderPatterns = new Map([
        ['server', [
          { pattern: 'server:Apache', frequency: 0.6, occurrences: 3, examples: ['site1.com', 'site2.com', 'site3.com'] }
        ]],
        ['x-powered-by', [
          { pattern: 'x-powered-by:PHP', frequency: 0.8, occurrences: 4, examples: ['site2.com', 'site3.com', 'site4.com', 'site5.com'] }
        ]]
      ]);
      
      mockAnalyzeHeaders.mockResolvedValue(mockHeaderPatterns);
      
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
      
      // Verify header formatting
      expect(result.headers['server']).toEqual({
        frequency: 0.6,
        occurrences: 3,
        totalSites: 5,
        values: [
          { value: 'Apache', frequency: 0.6, occurrences: 3, examples: ['site1.com', 'site2.com', 'site3.com'] }
        ]
      });
      
      expect(result.headers['x-powered-by']).toEqual({
        frequency: 0.6,
        occurrences: 3,
        totalSites: 5,
        values: [
          { value: 'PHP', frequency: 0.8, occurrences: 4, examples: ['site2.com', 'site3.com', 'site4.com'] }
        ]
      });
    });
    
    it('should format meta tag data correctly', async () => {
      // Set up collector to return 20 data points for meta tag calculations
      mockCollectData.mockResolvedValue({
        dataPoints: Array(20).fill(null).map((_, i) => ({
          url: `https://site${i+1}.com`,
          headers: {},
          metaTags: [],
          scripts: []
        })),
        filteringReport: {
          sitesFilteredOut: 0,
          filterReasons: {}
        }
      });
      
      const mockMetaPatterns = new Map([
        ['name:generator', [
          { pattern: 'generator:WordPress', frequency: 0.5, occurrences: 10, examples: Array(10).fill(null).map((_, i) => `site${i+1}.com`) },
          { pattern: 'generator:Drupal', frequency: 0.3, occurrences: 6, examples: Array(6).fill(null).map((_, i) => `site${i+11}.com`) }
        ]]
      ]);
      
      mockAnalyzeMetaTags.mockResolvedValue(mockMetaPatterns);
      
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
      
      // Verify meta tag formatting
      expect(result.metaTags['name:generator']).toEqual({
        frequency: 0.8, // 16 unique sites / 20 total sites
        occurrences: 16, // 10 + 6 unique sites
        totalSites: 20,
        values: [
          { value: 'WordPress', frequency: 0.5, occurrences: 10, examples: Array(3).fill(null).map((_, i) => `site${i+1}.com`) },
          { value: 'Drupal', frequency: 0.3, occurrences: 6, examples: Array(3).fill(null).map((_, i) => `site${i+11}.com`) }
        ]
      });
    });
    
    it('should format script data correctly', async () => {
      // Set up collector to return 20 data points for script calculations  
      mockCollectData.mockResolvedValue({
        dataPoints: Array(20).fill(null).map((_, i) => ({
          url: `https://site${i+1}.com`,
          headers: {},
          metaTags: [],
          scripts: []
        })),
        filteringReport: {
          sitesFilteredOut: 0,
          filterReasons: {}
        }
      });
      
      const mockScriptPatterns = new Map([
        ['paths', [
          { pattern: 'path:wp-content', frequency: 0.7, occurrences: 14, examples: ['/wp-content/script.js'] }
        ]],
        ['libraries', [
          { pattern: 'library:jquery', frequency: 0.9, occurrences: 18, examples: ['jquery.min.js'] }
        ]]
      ]);
      
      mockAnalyzeScripts.mockResolvedValue(mockScriptPatterns);
      
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
      
      // Verify script formatting
      expect(result.scripts['path:wp-content']).toEqual({
        frequency: 0.7,
        occurrences: 14,
        totalSites: 20,
        examples: ['/wp-content/script.js']
      });
      
      expect(result.scripts['library:jquery']).toEqual({
        frequency: 0.9,
        occurrences: 18,
        totalSites: 20,
        examples: ['jquery.min.js']
      });
    });
  });
  
  describe('Performance Tracking', () => {
    it('should track execution time', async () => {
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
      
      const startTime = performance.now();
      await analyzeFrequency(options);
      const endTime = performance.now();
      
      // Should complete reasonably quickly for small datasets
      expect(endTime - startTime).toBeLessThan(1000); // 1 second max for unit test
    });
  });
});