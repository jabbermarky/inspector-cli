import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatOutput } from '../reporter.js';
import { writeFile } from 'fs/promises';
import type { 
  FrequencyResult, 
  FrequencyOptionsWithDefaults,
  CooccurrenceAnalysis,
  PatternDiscoveryAnalysis,
  HeaderSemanticAnalysis,
  SemanticInsights,
  VendorStats,
  TechnologyStack
} from '../types.js';
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
    },
    // Add semantic analysis
    semanticAnalysis: {
      headerAnalyses: new Map<string, HeaderSemanticAnalysis>([
        ['server', {
          headerName: 'server',
          category: { primary: 'infrastructure', confidence: 0.95 },
          namingConvention: 'kebab-case',
          semanticWords: ['server'],
          patternType: 'standard',
          hierarchyLevel: 0
        }],
        ['x-powered-by', {
          headerName: 'x-powered-by',
          category: { primary: 'cms', vendor: 'WordPress', confidence: 0.90 },
          namingConvention: 'kebab-case',
          semanticWords: ['powered', 'by'],
          patternType: 'vendor-specific',
          hierarchyLevel: 1
        }]
      ]),
      insights: {
        categoryDistribution: {
          security: 5,
          caching: 10,
          analytics: 3,
          cms: 8,
          ecommerce: 2,
          framework: 4,
          infrastructure: 15,
          custom: 5
        },
        vendorDistribution: {
          'Cloudflare': 5,
          'WordPress': 8,
          'Apache': 10
        },
        namingConventions: {
          'kebab-case': 40,
          'underscore_case': 5,
          'camelCase': 2,
          'UPPER_CASE': 3,
          'mixed': 2,
          'non-standard': 0
        },
        patternTypes: {
          'standard': 20,
          'vendor-specific': 15,
          'platform-specific': 10,
          'custom': 7
        },
        topVendors: [
          { vendor: 'Apache', count: 10, percentage: 19.2 },
          { vendor: 'WordPress', count: 8, percentage: 15.4 },
          { vendor: 'Cloudflare', count: 5, percentage: 9.6 }
        ],
        topCategories: [
          { category: 'infrastructure', count: 15, percentage: 28.8 },
          { category: 'caching', count: 10, percentage: 19.2 },
          { category: 'cms', count: 8, percentage: 15.4 },
          { category: 'security', count: 5, percentage: 9.6 },
          { category: 'framework', count: 4, percentage: 7.7 },
          { category: 'analytics', count: 3, percentage: 5.8 },
          { category: 'ecommerce', count: 2, percentage: 3.8 },
          { category: 'custom', count: 5, percentage: 9.6 }
        ]
      } as SemanticInsights,
      vendorStats: {
        totalHeaders: 2,
        vendorHeaders: 1,
        vendorCoverage: 50.0,
        vendorDistribution: [
          { vendor: 'Apache', category: 'infrastructure', headerCount: 10, percentage: 19.2, headers: [] },
          { vendor: 'WordPress', category: 'cms', headerCount: 8, percentage: 15.4, headers: [] },
          { vendor: 'Cloudflare', category: 'cdn', headerCount: 5, percentage: 9.6, headers: [] }
        ],
        categoryDistribution: {}
      } as VendorStats,
      technologyStack: {
        cms: 'WordPress',
        cdn: ['Cloudflare', 'Fastly'],
        analytics: ['Google Analytics'],
        framework: 'Laravel',
        confidence: 0.85
      } as TechnologyStack
    },
    // Add co-occurrence analysis
    cooccurrenceAnalysis: {
      totalSites: 81,
      totalHeaders: 52,
      cooccurrences: [
        {
          header1: 'x-powered-by',
          header2: 'x-generator',
          cooccurrenceCount: 12,
          cooccurrenceFrequency: 0.148,
          conditionalProbability: 0.75,
          mutualInformation: 0.45
        },
        {
          header1: 'cf-ray',
          header2: 'cf-cache-status',
          cooccurrenceCount: 15,
          cooccurrenceFrequency: 0.185,
          conditionalProbability: 0.90,
          mutualInformation: 0.65
        }
      ],
      technologySignatures: [
        {
          name: 'WordPress Stack',
          vendor: 'WordPress',
          category: 'cms',
          requiredHeaders: ['x-powered-by', 'link'],
          optionalHeaders: ['x-pingback'],
          conflictingHeaders: [],
          confidence: 0.90,
          occurrenceCount: 16,
          sites: ['site1.com', 'site2.com']
        }
      ],
      platformCombinations: [
        {
          platform: 'WordPress',
          vendor: 'WordPress',
          headerGroup: ['x-powered-by', 'link', 'x-pingback'],
          frequency: 0.20,
          exclusivity: 0.85,
          strength: 0.75,
          sites: ['site1.com', 'site2.com']
        }
      ],
      mutuallyExclusiveGroups: [],
      strongCorrelations: []
    } as CooccurrenceAnalysis,
    // Add pattern discovery analysis
    patternDiscoveryAnalysis: {
      discoveredPatterns: [
        {
          pattern: 'x-wp-*',
          type: 'prefix',
          frequency: 0.15,
          sites: ['site1.com', 'site2.com', 'site3.com'],
          examples: ['x-wp-total', 'x-wp-cache', 'x-wp-version'],
          confidence: 0.85,
          potentialVendor: 'WordPress',
          cmsCorrelation: { 'WordPress': 0.95, 'Unknown': 0.05 }
        },
        {
          pattern: '*-id',
          type: 'suffix',
          frequency: 0.25,
          sites: ['site1.com', 'site2.com', 'site3.com', 'site4.com'],
          examples: ['request-id', 'session-id', 'trace-id'],
          confidence: 0.70
        }
      ],
      emergingVendors: [
        {
          vendorName: 'NewTech',
          patterns: [
            {
              pattern: 'newtech-*',
              type: 'prefix',
              frequency: 0.08,
              sites: ['site5.com', 'site6.com'],
              examples: ['newtech-version', 'newtech-api'],
              confidence: 0.60
            }
          ],
          confidence: 0.65,
          sites: ['site5.com', 'site6.com'],
          characteristics: {
            namingConvention: 'kebab-case',
            commonPrefixes: ['newtech-'],
            semanticCategories: ['custom', 'framework']
          }
        }
      ],
      patternEvolution: [
        {
          pattern: 'api-version',
          versions: [
            {
              pattern: 'api-version: v1',
              frequency: 0.10,
              timeRange: { start: new Date('2023-01-01'), end: new Date('2023-06-01') },
              examples: ['api-version: v1']
            },
            {
              pattern: 'api-version: v2',
              frequency: 0.15,
              timeRange: { start: new Date('2023-06-01'), end: new Date('2024-01-01') },
              examples: ['api-version: v2']
            }
          ],
          evolutionType: 'versioning',
          confidence: 0.80
        }
      ],
      semanticAnomalies: [
        {
          headerName: 'security-policy',
          expectedCategory: 'security',
          actualCategory: 'custom',
          confidence: 0.75,
          reason: 'Header name suggests security but categorized as custom',
          sites: ['site1.com', 'site2.com']
        }
      ],
      insights: [
        'Most common discovered pattern: x-wp-* found in 15% of sites with 3 variations',
        'Emerging vendor pattern detected: NewTech with 1 header patterns across 2 sites'
      ]
    } as PatternDiscoveryAnalysis
  });
  
  const createTestOptions = (overrides: Partial<FrequencyOptionsWithDefaults> = {}): FrequencyOptionsWithDefaults => ({
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
      
      // Check core structure and values
      expect(parsed.metadata.totalSites).toBe(100);
      expect(parsed.headers['server:Apache'].frequency).toBe(0.6);
      expect(parsed.semanticAnalysis).toBeDefined();
      expect(parsed.semanticAnalysis.headerAnalyses).toBeDefined();
      
      // Maps get converted to objects in JSON, so check the converted structure
      expect(parsed.semanticAnalysis.headerAnalyses.server).toBeDefined();
      expect(parsed.semanticAnalysis.headerAnalyses.server.headerName).toBe('server');
      expect(parsed.semanticAnalysis.headerAnalyses['x-powered-by']).toBeDefined();
      expect(parsed.semanticAnalysis.headerAnalyses['x-powered-by'].category.vendor).toBe('WordPress');
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

  describe('Semantic Analysis Reporting', () => {
    describe('Human-Readable Format', () => {
      it('should include semantic analysis section when present', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check for semantic analysis section
        expect(output).toContain('## Semantic Header Analysis');
        expect(output).toContain('**Headers Analyzed:** 2 headers with semantic classification');
      });
      
      it('should display header category distribution', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check category distribution
        expect(output).toContain('### Header Category Distribution');
        expect(output).toContain('**infrastructure**: 15 headers (29%)');
        expect(output).toContain('**caching**: 10 headers (19%)');
        expect(output).toContain('**cms**: 8 headers (15%)');
      });
      
      it('should display vendor distribution', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check vendor distribution
        expect(output).toContain('### Technology Vendor Distribution');
        expect(output).toContain('**Apache**: 10 headers (19%)');
        expect(output).toContain('**WordPress**: 8 headers (15%)');
        expect(output).toContain('**Cloudflare**: 5 headers (10%)');
      });
      
      it('should display naming convention analysis', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check naming conventions
        expect(output).toContain('### Naming Convention Compliance');
        expect(output).toContain('**kebab-case**: 40 headers (77%)');
        expect(output).toContain('**underscore_case**: 5 headers (10%)');
      });
      
      it('should display technology stack summary', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check technology stack
        expect(output).toContain('### Technology Stack Summary');
        expect(output).toContain('**CMS Platform:** WordPress');
        expect(output).toContain('**CDN Services:** Cloudflare, Fastly');
        expect(output).toContain('**Analytics Services:** Google Analytics');
        expect(output).toContain('**Framework:** Laravel');
        expect(output).toContain('**Stack Confidence:** 85%');
      });
      
      it('should display vendor statistics', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check vendor stats
        expect(output).toContain('### Vendor Analysis');
        expect(output).toContain('**Total Headers Analyzed**: 2');
        expect(output).toContain('**Headers with Vendor Detection**: 1');
        expect(output).toContain('**Vendor Coverage**: 50%');
        expect(output).toContain('**Top Vendors by Header Count:**');
      });
      
      it('should handle missing semantic analysis gracefully', async () => {
        const result = createTestResult();
        delete result.semanticAnalysis;
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Should not contain semantic analysis section
        expect(output).not.toContain('## Semantic Header Analysis');
        expect(output).not.toContain('### Header Category Distribution');
      });
    });
    
    describe('Markdown Format', () => {
      it('should format semantic analysis as markdown tables', async () => {
        const result = createTestResult();
        const options = createTestOptions({ output: 'markdown' });
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check for semantic analysis section
        expect(output).toContain('## Semantic Header Analysis');
        expect(output).toContain('Headers Analyzed:** 2 headers');
      });
      
      it('should display category distribution table', async () => {
        const result = createTestResult();
        const options = createTestOptions({ output: 'markdown' });
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check category table
        expect(output).toContain('### Header Category Distribution');
        expect(output).toContain('| Category | Headers | Percentage |');
        expect(output).toContain('|----------|---------|------------|');
        expect(output).toContain('| **infrastructure** | 15 | 29% |');
        expect(output).toContain('| **caching** | 10 | 19% |');
      });
      
      it('should display vendor distribution table', async () => {
        const result = createTestResult();
        const options = createTestOptions({ output: 'markdown' });
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check vendor table
        expect(output).toContain('### Technology Vendor Distribution');
        expect(output).toContain('| Vendor | Headers | Percentage |');
        expect(output).toContain('| **Apache** | 10 | 19% |');
        expect(output).toContain('| **WordPress** | 8 | 15% |');
      });
      
      it('should display technology stack table', async () => {
        const result = createTestResult();
        const options = createTestOptions({ output: 'markdown' });
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check technology stack table
        expect(output).toContain('### Technology Stack Summary');
        expect(output).toContain('| Technology Type | Technologies |');
        expect(output).toContain('| **CMS Platform** | WordPress |');
        expect(output).toContain('| **CDN Services** | Cloudflare, Fastly |');
        expect(output).toContain('| **Analytics Services** | Google Analytics |');
        expect(output).toContain('Stack Confidence:** 85%');
      });
      
      it('should display vendor statistics table', async () => {
        const result = createTestResult();
        const options = createTestOptions({ output: 'markdown' });
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check vendor stats table
        expect(output).toContain('### Vendor Analysis Statistics');
        expect(output).toContain('| Metric | Value |');
        expect(output).toContain('| Total Headers Analyzed | 2 |');
        expect(output).toContain('| Headers with Vendor Detection | 1 |');
        expect(output).toContain('| Vendor Coverage | 50% |');
        
        // Check top vendors table
        expect(output).toContain('#### Top Vendors by Header Count');
        expect(output).toContain('| Vendor | Header Count | Percentage |');
        expect(output).toContain('| **Apache** | 10 | 19% |');
      });
    });
  });

  describe('Co-occurrence Analysis Reporting', () => {
    describe('Human-Readable Format', () => {
      it('should include co-occurrence analytics section when present', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check for co-occurrence section
        expect(output).toContain('## Header Co-occurrence Analytics');
        expect(output).toContain('**Technology Stack Signatures:** 1 discovered');
      });
      
      it('should display technology stack signatures', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check technology signatures
        expect(output).toContain('### Technology Stack Signatures');
        expect(output).toContain('#### WordPress Stack Stack');
        expect(output).toContain('**Vendor**: WordPress');
        expect(output).toContain('**Category**: cms');
        expect(output).toContain('**Required Headers**: x-powered-by, link');
        expect(output).toContain('**Optional Headers**: x-pingback');
        expect(output).toContain('**Sites**: 2 sites');
        expect(output).toContain('**Confidence**: 90%');
      });
      
      it('should display platform header combinations', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check platform combinations
        expect(output).toContain('### Platform-Specific Header Combinations');
        expect(output).toContain('**WordPress**: x-powered-by + link + x-pingback');
        expect(output).toContain('(20%, Strength: 0.750)');
      });
      
      it('should display high correlation header pairs', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check high correlation pairs
        expect(output).toContain('### High Correlation Header Pairs');
        expect(output).toContain('Headers with strong co-occurrence patterns');
        expect(output).toContain('cf-ray** ↔ **cf-cache-status');
        expect(output).toContain('15 sites (19%, MI: 0.650)');
        expect(output).toContain('x-powered-by** ↔ **x-generator');
        expect(output).toContain('12 sites (15%, MI: 0.450)');
      });
      
      it('should display co-occurrence insights summary', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check summary
        expect(output).toContain('### Co-occurrence Insights');
        expect(output).toContain('**Total Header Pairs Analyzed**: 2');
        expect(output).toContain('**Technology Stacks Identified**: 1');
        expect(output).toContain('**Platform Combinations**: 1');
        expect(output).toContain('**High Correlation Pairs**: 2 (MI > 0.3)');
      });
      
      it('should handle missing co-occurrence analysis gracefully', async () => {
        const result = createTestResult();
        delete result.cooccurrenceAnalysis;
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Should not contain co-occurrence section
        expect(output).not.toContain('## Header Co-occurrence Analytics');
        expect(output).not.toContain('### Technology Stack Signatures');
      });
    });
    
    describe('Markdown Format', () => {
      it('should format co-occurrence analysis as markdown tables', async () => {
        const result = createTestResult();
        const options = createTestOptions({ output: 'markdown' });
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check for co-occurrence section
        expect(output).toContain('## Header Co-occurrence Analytics');
        expect(output).toContain('Technology Stack Signatures Discovered:** 1');
      });
      
      it('should display technology signatures table', async () => {
        const result = createTestResult();
        const options = createTestOptions({ output: 'markdown' });
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check technology signatures table
        expect(output).toContain('### Technology Stack Signatures');
        expect(output).toContain('| Name | Vendor | Category | Required Headers | Sites | Confidence |');
        expect(output).toContain('| WordPress Stack | WordPress | cms | x-powered-by, link | 2 | 90% |');
      });
      
      it('should display high correlation pairs table', async () => {
        const result = createTestResult();
        const options = createTestOptions({ output: 'markdown' });
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check correlation pairs table
        expect(output).toContain('### High Correlation Header Pairs');
        expect(output).toContain('| Header 1 | Header 2 | Co-occurrences | Frequency | Mutual Info |');
        expect(output).toContain('| cf-ray | cf-cache-status | 15 | 19% | 0.650 |');
        expect(output).toContain('| x-powered-by | x-generator | 12 | 15% | 0.450 |');
      });
      
      it('should display platform combinations table', async () => {
        const result = createTestResult();
        const options = createTestOptions({ output: 'markdown' });
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check platform combinations table
        expect(output).toContain('### Platform-Specific Header Combinations');
        expect(output).toContain('| Platform | Header Combination | Frequency | Strength |');
        expect(output).toContain('| WordPress | x-powered-by + link... (3) | 20% | 0.750 |');
      });
      
      it('should display co-occurrence summary table', async () => {
        const result = createTestResult();
        const options = createTestOptions({ output: 'markdown' });
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check summary table
        expect(output).toContain('### Co-occurrence Analysis Summary');
        expect(output).toContain('| Metric | Count |');
        expect(output).toContain('| Total Header Pairs Analyzed | 2 |');
        expect(output).toContain('| Technology Stacks Identified | 1 |');
        expect(output).toContain('| Platform Combinations | 1 |');
      });
    });
  });

  describe('Pattern Discovery Reporting', () => {
    describe('Human-Readable Format', () => {
      it('should include pattern discovery section when present', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check for pattern discovery section
        expect(output).toContain('## Pattern Discovery Analysis');
        expect(output).toContain('**Discovered Patterns:** 2 patterns found');
      });
      
      it('should display discovered header patterns', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check discovered patterns
        expect(output).toContain('### Discovered Header Patterns');
        expect(output).toContain('#### x-wp-* (prefix)');
        expect(output).toContain('**Frequency**: 15% (3 sites)');
        expect(output).toContain('**Confidence**: 85%');
        expect(output).toContain('**Examples**: x-wp-total, x-wp-cache, x-wp-version');
        expect(output).toContain('**Potential Vendor**: WordPress');
        expect(output).toContain('**CMS Correlation**: 95% WordPress');
        
        expect(output).toContain('#### *-id (suffix)');
        expect(output).toContain('**Frequency**: 25% (4 sites)');
        expect(output).toContain('**Examples**: request-id, session-id, trace-id');
      });
      
      it('should display emerging vendor patterns', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check emerging vendors
        expect(output).toContain('### Emerging Vendor Patterns');
        expect(output).toContain('#### NewTech');
        expect(output).toContain('**Patterns**: 1 discovered');
        expect(output).toContain('**Sites**: 2 sites');
        expect(output).toContain('**Confidence**: 65%');
        expect(output).toContain('**Naming Convention**: kebab-case');
        expect(output).toContain('**Common Prefixes**: newtech-');
        expect(output).toContain('**Categories**: custom, framework');
      });
      
      it('should display pattern evolution trends', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check pattern evolution
        expect(output).toContain('### Pattern Evolution Trends');
        expect(output).toContain('#### api-version');
        expect(output).toContain('**Evolution Type**: versioning');
        expect(output).toContain('**Confidence**: 80%');
        expect(output).toContain('**Versions**: 2 tracked');
        expect(output).toContain('**Latest Pattern**: api-version: v2');
        expect(output).toContain('**Latest Frequency**: 15%');
      });
      
      it('should display semantic anomalies', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check semantic anomalies
        expect(output).toContain('### Semantic Anomalies');
        expect(output).toContain('Headers with unexpected categorization patterns:');
        expect(output).toContain('security-policy**: Expected security, got custom (75% confidence)');
        expect(output).toContain('Reason: Header name suggests security but categorized as custom');
        expect(output).toContain('Sites: site1.com, site2.com');
      });
      
      it('should display pattern discovery insights', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check insights
        expect(output).toContain('### Pattern Discovery Insights');
        expect(output).toContain('Most common discovered pattern: x-wp-* found in 15% of sites with 3 variations');
        expect(output).toContain('Emerging vendor pattern detected: NewTech with 1 header patterns across 2 sites');
      });
      
      it('should display pattern discovery summary', async () => {
        const result = createTestResult();
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Check summary
        expect(output).toContain('### Pattern Discovery Summary');
        expect(output).toContain('**Total Patterns Discovered**: 2');
        expect(output).toContain('**Emerging Vendors Detected**: 1');
        expect(output).toContain('**Pattern Evolution Trends**: 1');
        expect(output).toContain('**Semantic Anomalies**: 1');
        expect(output).toContain('**Pattern Types**: 1 prefix, 1 suffix, 0 contains, 0 regex');
      });
      
      it('should handle missing pattern discovery analysis gracefully', async () => {
        const result = createTestResult();
        delete result.patternDiscoveryAnalysis;
        const options = createTestOptions();
        
        await formatOutput(result, options);
        
        const output = consoleSpy.mock.calls[0][0];
        
        // Should not contain pattern discovery section
        expect(output).not.toContain('## Pattern Discovery Analysis');
        expect(output).not.toContain('### Discovered Header Patterns');
      });
    });
  });
});