import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatOutput } from '../reporter.js';
import { writeFile } from 'fs/promises';
import type { FrequencyResult, FrequencyOptions } from '../types.js';
import { setupCommandTests } from '@test-utils';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

describe('Frequency Reporter', () => {
  setupCommandTests();
  
  let consoleSpy: any;
  let mockWriteFile: any;
  
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockWriteFile = vi.mocked(writeFile);
    mockWriteFile.mockResolvedValue(undefined);
  });
  
  afterEach(() => {
    consoleSpy.mockRestore();
  });
  
  const createTestResult = (): FrequencyResult => ({
    metadata: {
      totalSites: 100,
      validSites: 81,
      filteredSites: 19,
      analysisDate: '2024-01-01T00:00:00Z',
      options: {
        dataSource: 'cms-analysis',
        dataDir: './data',
        minSites: 10,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: true,
        includeCurrentFilters: true
      }
    },
    headers: {
      'server:Apache': {
        frequency: 0.6,
        occurrences: 48,
        totalSites: 81,
        values: [
          { value: 'Apache', frequency: 0.6, occurrences: 48, examples: ['Apache/2.4'] }
        ]
      },
      'x-powered-by:WordPress': {
        frequency: 0.2,
        occurrences: 16,
        totalSites: 81,
        values: [
          { value: 'WordPress', frequency: 0.2, occurrences: 16, examples: ['WordPress'] }
        ]
      }
    },
    metaTags: {
      'name:generator': {
        frequency: 0.3,
        occurrences: 24,
        totalSites: 81,
        values: [
          { value: 'WordPress 6.0', frequency: 0.15, occurrences: 12, examples: ['WordPress 6.0'] },
          { value: 'Drupal 10', frequency: 0.15, occurrences: 12, examples: ['Drupal 10'] }
        ]
      }
    },
    scripts: {
      'path:wp-content': {
        frequency: 0.25,
        occurrences: 20,
        totalSites: 81,
        examples: ['/wp-content/themes/theme1/script.js']
      },
      'library:jquery': {
        frequency: 0.8,
        occurrences: 65,
        totalSites: 81,
        examples: ['jquery-3.6.0.min.js']
      }
    },
    filteringReport: {
      sitesFilteredOut: 19,
      filterReasons: {
        'bot-detection': 10,
        'error-page': 9
      }
    },
    recommendations: {
      learn: {
        currentlyFiltered: ['server', 'date'],
        recommendToFilter: [
          {
            pattern: 'x-request-id',
            frequency: 0.9,
            diversity: 100,
            reason: 'High frequency (90%) with high diversity'
          }
        ],
        recommendToKeep: [
          {
            pattern: 'x-powered-by',
            frequency: 0.2,
            diversity: 5,
            reason: 'Low frequency (20%) suggests discriminative value'
          }
        ]
      },
      detectCms: {
        newPatternOpportunities: [
          {
            pattern: 'x-drupal-cache:HIT',
            frequency: 0.1,
            cmsCorrelation: { 'Drupal': 0.95, 'Unknown': 0.05 }
          }
        ],
        patternsToRefine: [
          {
            pattern: 'x-powered-by:PHP',
            currentFrequency: 0.45,
            issue: 'Too generic - appears in 45% of sites'
          }
        ]
      },
      groundTruth: {
        potentialNewRules: [
          {
            suggestedRule: 'Sites with "x-drupal-cache" header are likely Drupal',
            confidence: 0.95
          }
        ]
      }
    }
  });
  
  const createTestOptions = (overrides: Partial<FrequencyOptions> = {}): Required<FrequencyOptions> => ({
    dataSource: 'cms-analysis',
    dataDir: './data',
    minSites: 10,
    minOccurrences: 1,
    pageType: 'all',
    output: 'human',
    outputFile: '',
    includeRecommendations: true,
    includeCurrentFilters: true,
    ...overrides
  });
  
  describe('Human-Readable Format', () => {
    it('should format output as human-readable text', async () => {
      const result = createTestResult();
      const options = createTestOptions();
      
      await formatOutput(result, options);
      
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      
      // Check for key sections
      expect(output).toContain('# Frequency Analysis Report');
      expect(output).toContain('## Summary');
      expect(output).toContain('Total Sites Analyzed: 100');
      expect(output).toContain('Valid Sites: 81');
      expect(output).toContain('## HTTP Headers');
      expect(output).toContain('## Meta Tags');
      expect(output).toContain('## Script Patterns');
      expect(output).toContain('## Recommendations');
    });
    
    it('should include filtering report when present', async () => {
      const result = createTestResult();
      const options = createTestOptions();
      
      await formatOutput(result, options);
      
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('## Data Quality Filtering');
      expect(output).toContain('Sites filtered out: 19');
      expect(output).toContain('bot-detection: 10 sites');
      expect(output).toContain('error-page: 9 sites');
    });
    
    it('should skip recommendations when not included', async () => {
      const result = createTestResult();
      delete result.recommendations;
      const options = createTestOptions();
      
      await formatOutput(result, options);
      
      const output = consoleSpy.mock.calls[0][0];
      expect(output).not.toContain('## Recommendations');
    });
  });
  
  describe('Markdown Format', () => {
    it('should format output as markdown with tables', async () => {
      const result = createTestResult();
      const options = createTestOptions({ output: 'markdown' });
      
      await formatOutput(result, options);
      
      const output = consoleSpy.mock.calls[0][0];
      
      // Check for markdown tables
      expect(output).toContain('| Header | Frequency | Sites Using |');
      expect(output).toContain('|--------|-----------|-------------|');
      expect(output).toContain('| `server` | 60% | 48/81 |');
      
      // Check script pattern classification
      expect(output).toContain('### Path Patterns');
      expect(output).toContain('### JavaScript Libraries');
      
      // Check proper escaping
      expect(output).toContain('`wp-content`');
      expect(output).toContain('`jquery`');
    });
    
    it('should handle HTML comments in script examples', async () => {
      const result = createTestResult();
      result.scripts['inline:drupal'] = {
        frequency: 0.1,
        occurrences: 8,
        totalSites: 81,
        examples: ['<!--//--><![CDATA[//><!-- Drupal.behaviors...']
      };
      const options = createTestOptions({ output: 'markdown' });
      
      await formatOutput(result, options);
      
      const output = consoleSpy.mock.calls[0][0];
      // HTML comments should be wrapped in code blocks
      expect(output).toContain('(inline code)');
    });
  });
  
  describe('JSON Format', () => {
    it('should format output as JSON', async () => {
      const result = createTestResult();
      const options = createTestOptions({ output: 'json' });
      
      await formatOutput(result, options);
      
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      
      expect(parsed).toEqual(result);
      expect(parsed.metadata.totalSites).toBe(100);
      expect(parsed.headers['server:Apache'].frequency).toBe(0.6);
    });
  });
  
  describe('CSV Format', () => {
    it('should format output as CSV', async () => {
      const result = createTestResult();
      const options = createTestOptions({ output: 'csv' });
      
      await formatOutput(result, options);
      
      const output = consoleSpy.mock.calls[0][0];
      
      // Check CSV headers
      expect(output).toContain('Type,Pattern,Frequency,Occurrences,TotalSites,Examples');
      
      // Check data rows
      expect(output).toContain('Header,"server:Apache",0.6,48,81,"Apache/2.4"');
      expect(output).toContain('MetaTag,"name:generator:WordPress 6.0",0.15,12,81,"WordPress 6.0"');
      expect(output).toContain('Script,"path:wp-content",0.25,20,81,"/wp-content/themes/theme1/script.js"');
    });
    
    it('should escape CSV values properly', async () => {
      const result = createTestResult();
      result.headers['test:header'] = {
        frequency: 0.1,
        occurrences: 8,
        totalSites: 81,
        values: [
          { value: 'value with, comma', frequency: 0.1, occurrences: 8, examples: ['example "quoted"'] }
        ]
      };
      const options = createTestOptions({ output: 'csv' });
      
      await formatOutput(result, options);
      
      const output = consoleSpy.mock.calls[0][0];
      // Values with commas and quotes should be properly escaped
      expect(output).toContain('"test:header:value with, comma"');
      expect(output).toContain('"example ""quoted"""');
    });
  });
  
  describe('File Output', () => {
    it('should write to file when outputFile specified', async () => {
      const result = createTestResult();
      const options = createTestOptions({ outputFile: 'frequency.txt' });
      
      await formatOutput(result, options);
      
      expect(mockWriteFile).toHaveBeenCalledWith(
        'frequency.txt',
        expect.any(String),
        'utf-8'
      );
      expect(consoleSpy).not.toHaveBeenCalled(); // Should not log to console
    });
    
    it('should handle file write errors', async () => {
      mockWriteFile.mockRejectedValue(new Error('Write failed'));
      
      const result = createTestResult();
      const options = createTestOptions({ outputFile: 'frequency.txt' });
      
      await expect(formatOutput(result, options)).rejects.toThrow('Write failed');
    });
  });
  
  describe('Script Pattern Classification', () => {
    it('should organize scripts by classification in markdown', async () => {
      const result = createTestResult();
      // Add more script patterns for different categories
      result.scripts = {
        'path:wp-content': { frequency: 0.25, occurrences: 20, totalSites: 81, examples: ['/wp-content/script.js'] },
        'path:media': { frequency: 0.20, occurrences: 16, totalSites: 81, examples: ['/media/script.js'] },
        'library:jquery': { frequency: 0.8, occurrences: 65, totalSites: 81, examples: ['jquery.min.js'] },
        'library:bootstrap': { frequency: 0.3, occurrences: 24, totalSites: 81, examples: ['bootstrap.js'] },
        'tracking:google-analytics': { frequency: 0.4, occurrences: 32, totalSites: 81, examples: ['gtag.js'] },
        'inline:drupal': { frequency: 0.1, occurrences: 8, totalSites: 81, examples: ['Drupal.behaviors'] },
        'domain:cdn': { frequency: 0.5, occurrences: 40, totalSites: 81, examples: ['https://cdn.example.com/script.js'] }
      };
      
      const options = createTestOptions({ output: 'markdown' });
      
      await formatOutput(result, options);
      
      const output = consoleSpy.mock.calls[0][0];
      
      // Check for all classification sections
      expect(output).toContain('### Path Patterns');
      expect(output).toContain('Script locations that indicate CMS structure');
      expect(output).toContain('### JavaScript Libraries');
      expect(output).toContain('Popular JavaScript libraries and frameworks');
      expect(output).toContain('### Analytics & Tracking');
      expect(output).toContain('Analytics platforms, marketing pixels');
      expect(output).toContain('### Inline Script Patterns');
      expect(output).toContain('Common patterns found in inline JavaScript');
      expect(output).toContain('### CDN & External Domains');
      expect(output).toContain('Content delivery networks');
      
      // Check summary
      expect(output).toContain('**Summary:** 7 total patterns across 5 categories analyzed');
    });
  });
  
  describe('Large Dataset Formatting', () => {
    it('should handle large datasets efficiently', async () => {
      const result = createTestResult();
      
      // Add many headers
      for (let i = 0; i < 100; i++) {
        result.headers[`x-custom-${i}`] = {
          frequency: 0.01,
          occurrences: 1,
          totalSites: 81,
          values: [{ value: `value-${i}`, frequency: 0.01, occurrences: 1, examples: [`example-${i}`] }]
        };
      }
      
      const options = createTestOptions({ output: 'json' });
      const startTime = Date.now();
      
      await formatOutput(result, options);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should format quickly
      
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(Object.keys(parsed.headers).length).toBeGreaterThan(100);
    });
  });
});