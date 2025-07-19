import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { collectData } from '../collector.js';
import { DataStorage } from '../../utils/cms/analysis/storage.js';
import { AnalysisReporter } from '../../utils/cms/analysis/reports.js';
import { setupCommandTests } from '@test-utils';

// Mock dependencies
vi.mock('../../utils/cms/analysis/storage.js');
vi.mock('../../utils/cms/analysis/reports.js');
vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

describe('Frequency Collector', () => {
  setupCommandTests();
  
  let mockStorage: any;
  let mockReporter: any;
  
  beforeEach(() => {
    // Setup mock storage
    mockStorage = {
      initialize: vi.fn().mockResolvedValue(undefined),
      loadAll: vi.fn(),
      getAllDataPoints: vi.fn().mockResolvedValue([])
    };
    (DataStorage as any).mockImplementation(() => mockStorage);
    
    // Setup mock reporter
    mockReporter = {
      filterByDataQuality: vi.fn()
    };
    (AnalysisReporter as any).mockImplementation(() => mockReporter);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Data Collection', () => {
    it('should collect data from cms-analysis directory', async () => {
      const mockData = [
        {
          url: 'https://example.com',
          detectionResults: [{ cms: 'WordPress', confidence: 0.9 }],
          scripts: [],
          metaTags: [],
          httpHeaders: { 'server': 'Apache', 'content-type': 'text/html' },
          htmlContent: '<html><body>Sample WordPress site content with enough text to pass the 100 character minimum requirement for analysis.</body></html>',
          timestamp: '2024-01-01T00:00:00Z'
        }
      ];
      
      mockStorage.getAllDataPoints.mockResolvedValue(mockData);
      mockReporter.filterByDataQuality.mockReturnValue({
        validData: mockData,
        filteredData: [],
        filteringReport: {
          sitesFilteredOut: 0,
          filterReasons: {}
        }
      });
      
      const result = await collectData({
        dataSource: 'cms-analysis',
        dataDir: './data/cms-analysis',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      });
      
      expect(result.dataPoints).toHaveLength(1);
      expect(result.filteringReport.sitesFilteredOut).toBe(0);
      expect(mockStorage.getAllDataPoints).toHaveBeenCalled();
    });
    
    it('should handle empty data gracefully', async () => {
      mockStorage.getAllDataPoints.mockResolvedValue([]);
      mockReporter.filterByDataQuality.mockReturnValue({
        validData: [],
        filteredData: [],
        filteringReport: {
          sitesFilteredOut: 0,
          filterReasons: {}
        }
      });
      
      const result = await collectData({
        dataSource: 'cms-analysis',
        dataDir: './data/cms-analysis',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      });
      
      expect(result.dataPoints).toHaveLength(0);
      expect(result.filteringReport.sitesFilteredOut).toBe(0);
    });
    
    it('should filter out low-quality data', async () => {
      const mockData = [
        {
          url: 'https://good-site.com',
          detectionResults: [{ cms: 'WordPress', confidence: 0.9 }],
          scripts: [],
          metaTags: [],
          httpHeaders: { 'server': 'Apache', 'content-type': 'text/html' },
          htmlContent: '<html><body>Good WordPress site with sufficient content for analysis purposes and additional text to ensure we meet the 100 character minimum requirement for filtering.</body></html>',
          timestamp: '2024-01-01T00:00:00Z'
        },
        {
          url: 'https://bot-detected.com',
          detectionResults: [],
          scripts: [],
          metaTags: [],
          httpHeaders: {},
          htmlContent: 'cloudflare bot detection page',
          timestamp: '2024-01-01T01:00:00Z'
        }
      ];
      
      mockStorage.getAllDataPoints.mockResolvedValue(mockData);
      
      const result = await collectData({
        dataSource: 'cms-analysis',
        dataDir: './data/cms-analysis',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      });
      
      expect(result.dataPoints).toHaveLength(1);
      expect(result.dataPoints[0].url).toBe('https://good-site.com');
      expect(result.filteringReport.sitesFilteredOut).toBe(1);
      expect(result.filteringReport.filterReasons['bot-detection']).toBe(1);
    });
    
    it('should throw error if data source is not supported', async () => {
      await expect(collectData({
        dataSource: 'unsupported-source' as any,
        dataDir: './data/cms-analysis',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      })).rejects.toThrow('Data source unsupported-source not supported');
    });
  });
  
  describe('Deduplication', () => {
    it('should deduplicate by keeping latest capture per site', async () => {
      const mockData = [
        {
          url: 'https://example.com',
          timestamp: '2024-01-01T00:00:00Z',
          detectionResults: [{ cms: 'WordPress', confidence: 0.8 }],
          scripts: [],
          metaTags: [],
          httpHeaders: { 'server': 'Apache', 'content-type': 'text/html' },
          htmlContent: '<html><body>Older WordPress site content with sufficient text for analysis purposes and validation.</body></html>'
        },
        {
          url: 'https://example.com',
          timestamp: '2024-01-02T00:00:00Z', // Newer
          detectionResults: [{ cms: 'WordPress', confidence: 0.9 }],
          scripts: [],
          metaTags: [],
          httpHeaders: { 'server': 'nginx', 'content-type': 'text/html' },
          htmlContent: '<html><body>Newer WordPress site content with sufficient text for analysis purposes and validation.</body></html>'
        }
      ];
      
      mockStorage.getAllDataPoints.mockResolvedValue(mockData);
      mockReporter.filterByDataQuality.mockReturnValue({
        validData: mockData,
        filteredData: [],
        filteringReport: {
          sitesFilteredOut: 0,
          filterReasons: {}
        }
      });
      
      const result = await collectData({
        dataSource: 'cms-analysis',
        dataDir: './data/cms-analysis',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      });
      
      // Should return only 1 entry after deduplication (latest timestamp wins)
      expect(result.dataPoints).toHaveLength(1);
      expect(result.dataPoints[0].timestamp).toBe('2024-01-02T00:00:00Z');
      expect(result.dataPoints[0].httpHeaders['server']).toBe('nginx');
      expect(mockStorage.getAllDataPoints).toHaveBeenCalled();
    });
  });
})