import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeFrequency } from '../analyzer-v1.js';
import type { DetectionDataPoint } from '../types-v1.js';

// Mock the modules to avoid file system dependencies in tests
vi.mock('../collector.js');
vi.mock('../header-analyzer.js');
vi.mock('../recommender.js');
vi.mock('../reporter.js');

function createMockDataPoints(): DetectionDataPoint[] {
  return [
    {
      url: 'https://wordpress-site.com',
      timestamp: '2025-07-19T00:00:00Z',
      htmlContent: '<html><head><meta name="generator" content="WordPress 6.0"></head></html>',
      httpHeaders: {
        'x-powered-by': 'WordPress',
        'server': 'Apache/2.4.41',
        'content-type': 'text/html; charset=UTF-8'
      },
      metaTags: [
        { name: 'generator', content: 'WordPress 6.0' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      scripts: [
        { src: '/wp-content/themes/theme/script.js' }
      ],
      cmsDetection: { name: 'WordPress', confidence: 0.95 },
      plugins: [],
      version: '6.0',
      theme: 'default'
    },
    {
      url: 'https://drupal-site.com',
      timestamp: '2025-07-19T00:00:00Z',
      htmlContent: '<html><head><meta name="generator" content="Drupal 9"></head></html>',
      httpHeaders: {
        'x-generator': 'Drupal 9',
        'server': 'nginx/1.18.0',
        'content-type': 'text/html; charset=UTF-8'
      },
      metaTags: [
        { name: 'generator', content: 'Drupal 9' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      scripts: [
        { src: '/sites/default/files/js/script.js' }
      ],
      cmsDetection: { name: 'Drupal', confidence: 0.90 },
      plugins: [],
      version: '9.0',
      theme: 'default'
    },
    {
      url: 'https://shopify-site.com',
      timestamp: '2025-07-19T00:00:00Z',
      htmlContent: '<html><head><meta name="generator" content="Shopify"></head></html>',
      httpHeaders: {
        'powered-by': 'Shopify',
        'server': 'nginx',
        'x-shopid': '12345',
        'content-type': 'text/html; charset=UTF-8'
      },
      metaTags: [
        { name: 'generator', content: 'Shopify' },
        { name: 'shopify-checkout-api-token', content: 'abc123' }
      ],
      scripts: [
        { src: 'https://cdn.shopify.com/s/files/1/script.js' }
      ],
      cmsDetection: { name: 'Shopify', confidence: 0.98 },
      plugins: [],
      version: 'latest',
      theme: 'default'
    },
    {
      url: 'https://generic-site.com',
      timestamp: '2025-07-19T00:00:00Z',
      htmlContent: '<html><head><title>Generic Site</title></head></html>',
      httpHeaders: {
        'server': 'Apache/2.4.41',
        'content-type': 'text/html; charset=UTF-8',
        'cache-control': 'no-cache'
      },
      metaTags: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      scripts: [
        { src: '/js/jquery.min.js' }
      ],
      cmsDetection: { name: 'Unknown', confidence: 0.1 },
      plugins: [],
      version: undefined,
      theme: undefined
    },
    {
      url: 'https://another-wordpress.com',
      timestamp: '2025-07-19T00:00:00Z',
      htmlContent: '<html><head><meta name="generator" content="WordPress 5.8"></head></html>',
      httpHeaders: {
        'x-powered-by': 'WordPress',
        'server': 'Apache/2.4.52',
        'content-type': 'text/html; charset=UTF-8'
      },
      metaTags: [
        { name: 'generator', content: 'WordPress 5.8' }
      ],
      scripts: [
        { src: '/wp-includes/js/jquery/jquery.min.js' }
      ],
      cmsDetection: { name: 'WordPress', confidence: 0.93 },
      plugins: [],
      version: '5.8',
      theme: 'twentytwentyone'
    }
  ];
}

describe('Frequency Analysis Prototype', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should analyze frequency patterns from mock data', async () => {
    // Setup mocks with proper module imports
    const { collectData } = await import('../collector.js');
    const { analyzeHeaders } = await import('../header-analyzer.js');
    const { generateRecommendations } = await import('../recommender.js');
    
    vi.mocked(collectData).mockResolvedValue({
      dataPoints: createMockDataPoints(),
      filteringReport: {
        sitesFilteredOut: 5,
        filterReasons: {
          'bot-detection': 2,
          'error-page': 1,
          'insufficient-data': 2,
          'invalid-url': 0
        }
      }
    });
    
    vi.mocked(analyzeHeaders).mockResolvedValue(new Map([
      ['x-powered-by', [{
        pattern: 'x-powered-by:WordPress',
        frequency: 0.4,
        confidence: 0.8,
        examples: ['https://wordpress-site.com'],
        cmsCorrelation: { 'WordPress': 1.0 }
      }]],
      ['server', [{
        pattern: 'server:Apache/2.4.41',
        frequency: 0.8,
        confidence: 0.2,
        examples: ['https://site1.com', 'https://site2.com'],
        cmsCorrelation: { 'WordPress': 0.5, 'Drupal': 0.3, 'Unknown': 0.2 }
      }]],
      ['powered-by', [{
        pattern: 'powered-by:Shopify',
        frequency: 0.2,
        confidence: 0.9,
        examples: ['https://shopify-site.com'],
        cmsCorrelation: { 'Shopify': 1.0 }
      }]]
    ]));
    
    vi.mocked(generateRecommendations).mockResolvedValue({
      learn: {
        currentlyFiltered: ['server', 'content-type'],
        recommendToFilter: [{
          pattern: 'cache-control',
          reason: 'Universal header (95% of sites)',
          frequency: 0.95,
          diversity: 3
        }],
        recommendToKeep: [{
          pattern: 'x-powered-by',
          reason: 'Low frequency (40%) suggests discriminative value',
          frequency: 0.4,
          diversity: 5
        }]
      },
      detectCms: {
        newPatternOpportunities: [{
          pattern: 'x-powered-by:WordPress',
          frequency: 0.4,
          confidence: 0.8,
          cmsCorrelation: { 'WordPress': 1.0 }
        }],
        patternsToRefine: []
      },
      groundTruth: {
        currentlyUsedPatterns: ['x-powered-by'],
        potentialNewRules: []
      }
    });
    
    const result = await analyzeFrequency({
      minSites: 3,
      minOccurrences: 1,
      output: 'json',
      includeRecommendations: true
    });
    
    // Verify basic structure
    expect(result).toHaveProperty('metadata');
    expect(result).toHaveProperty('headers');
    expect(result).toHaveProperty('metaTags');
    expect(result).toHaveProperty('scripts');
    expect(result).toHaveProperty('recommendations');
    
    // Verify metadata
    expect(result.metadata.validSites).toBe(5);
    expect(result.metadata.filteredSites).toBe(5);
    
    // Verify headers analysis - check what headers actually exist
    expect(result.headers).toHaveProperty('server');
    expect(result.headers).toHaveProperty('x-powered-by');
    expect(result.headers).toHaveProperty('powered-by');
    
    // Check frequency calculations
    const serverHeader = result.headers['server'];
    expect(serverHeader.frequency).toBeGreaterThan(0);
    expect(serverHeader.values).toBeInstanceOf(Array);
    
    // Verify recommendations structure
    expect(result.recommendations).toHaveProperty('learn');
    expect(result.recommendations).toHaveProperty('detectCms');
    expect(result.recommendations).toHaveProperty('groundTruth');
    
    // Check learn recommendations
    expect(result.recommendations.learn).toHaveProperty('currentlyFiltered');
    expect(result.recommendations.learn).toHaveProperty('recommendToFilter');
    expect(result.recommendations.learn).toHaveProperty('recommendToKeep');
    
    console.log('Prototype test passed! Sample results:');
    console.log('Headers found:', Object.keys(result.headers).length);
    console.log('Meta tags found:', Object.keys(result.metaTags).length);
    console.log('Scripts found:', Object.keys(result.scripts).length);
    console.log('Recommendations generated:', !!result.recommendations);
  });
  
  it('should generate meaningful recommendations', async () => {
    // Setup mocks again for this test
    const { collectData } = await import('../collector.js');
    const { analyzeHeaders } = await import('../header-analyzer.js');
    const { generateRecommendations } = await import('../recommender.js');
    
    vi.mocked(collectData).mockResolvedValue({
      dataPoints: createMockDataPoints(),
      filteringReport: {
        sitesFilteredOut: 5,
        filterReasons: {
          'bot-detection': 2,
          'error-page': 1,
          'insufficient-data': 2,
          'invalid-url': 0
        }
      }
    });
    
    vi.mocked(analyzeHeaders).mockResolvedValue(new Map([
      ['x-powered-by', [{
        pattern: 'x-powered-by:WordPress',
        frequency: 0.4,
        confidence: 0.8,
        examples: ['https://wordpress-site.com'],
        cmsCorrelation: { 'WordPress': 1.0 }
      }]],
      ['powered-by', [{
        pattern: 'powered-by:Shopify',
        frequency: 0.2,
        confidence: 0.9,
        examples: ['https://shopify-site.com'],
        cmsCorrelation: { 'Shopify': 1.0 }
      }]]
    ]));
    
    vi.mocked(generateRecommendations).mockResolvedValue({
      learn: {
        currentlyFiltered: ['server', 'content-type'],
        recommendToFilter: [{
          pattern: 'cache-control',
          reason: 'Universal header (95% of sites)',
          frequency: 0.95,
          diversity: 3
        }],
        recommendToKeep: [{
          pattern: 'x-powered-by',
          reason: 'Low frequency (40%) suggests discriminative value',
          frequency: 0.4,
          diversity: 5
        }]
      },
      detectCms: {
        newPatternOpportunities: [{
          pattern: 'x-powered-by:WordPress',
          frequency: 0.4,
          confidence: 0.8,
          cmsCorrelation: { 'WordPress': 1.0 }
        }],
        patternsToRefine: []
      },
      groundTruth: {
        currentlyUsedPatterns: ['x-powered-by'],
        potentialNewRules: []
      }
    });
    
    const result = await analyzeFrequency({
      minSites: 3,
      minOccurrences: 1,
      includeRecommendations: true
    });
    
    const { learn, detectCms } = result.recommendations!;
    
    // Learn recommendations should identify generic vs discriminative headers
    expect(learn.currentlyFiltered).toContain('server'); // Should be in current filters
    expect(learn.currentlyFiltered).toContain('content-type'); // Should be in current filters
    
    // Should recommend keeping discriminative headers
    const discriminativePatterns = ['x-powered-by', 'powered-by', 'x-generator'];
    const keepRecommendations = learn.recommendToKeep.map(r => r.pattern);
    
    // At least some discriminative patterns should be recommended to keep
    expect(keepRecommendations.some(p => 
      discriminativePatterns.some(dp => p.includes(dp))
    )).toBe(true);
    
    // Detect-CMS should find pattern opportunities
    expect(detectCms.newPatternOpportunities.length).toBeGreaterThan(0);
    
    console.log('Recommendations test passed!');
    console.log('Learn - To Filter:', learn.recommendToFilter.length);
    console.log('Learn - To Keep:', learn.recommendToKeep.length);
    console.log('Detect-CMS - New Opportunities:', detectCms.newPatternOpportunities.length);
  });
});