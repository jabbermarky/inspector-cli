import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { analyzeHeaders } from '../header-analyzer.js';
import { batchAnalyzeHeaders, generateSemanticInsights } from '../semantic-analyzer.js';
import { analyzeVendorPresence, inferTechnologyStack } from '../vendor-patterns.js';
import type { DetectionDataPoint, FrequencyOptionsWithDefaults } from '../types.js';
import { setupCommandTests } from '@test-utils';

// Only mock logger - keep all semantic analysis logic real
vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

describe('Semantic Analysis Integration Flow', () => {
  setupCommandTests();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Semantic Pipeline', () => {
    it('should analyze headers through complete semantic pipeline', async () => {
      // Test data that replicates the production environment
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://wordpress-blog.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'Apache/2.4.41 (Ubuntu)',
            'x-powered-by': 'PHP/8.1.0',
            'x-pingback': 'https://wordpress-blog.com/xmlrpc.php',
            'link': '<https://wordpress-blog.com/wp-json/>; rel="https://api.w.org/"',
            'content-type': 'text/html; charset=UTF-8',
            'cache-control': 'max-age=3600, must-revalidate',
            'x-frame-options': 'SAMEORIGIN',
            'x-content-type-options': 'nosniff'
          },
          detectionResults: [
            { cms: 'WordPress', confidence: 0.95, version: '6.2.1' }
          ]
        },
        {
          url: 'https://cloudflare-protected.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'cloudflare',
            'cf-ray': '7d4b1c2a3b4c5d6e-DFW',
            'cf-cache-status': 'HIT',
            'cf-request-id': '7d4b1c2a3b4c5d6e-DFW-12345',
            'content-security-policy': "default-src 'self'",
            'strict-transport-security': 'max-age=31536000; includeSubDomains',
            'x-frame-options': 'DENY'
          },
          detectionResults: [
            { cms: 'Unknown', confidence: 0.0 }
          ]
        },
        {
          url: 'https://drupal-site.org',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'nginx/1.18.0 (Ubuntu)',
            'x-generator': 'Drupal 9 (https://www.drupal.org)',
            'x-drupal-cache': 'HIT',
            'x-drupal-dynamic-cache': 'MISS',
            'vary': 'Accept-Encoding',
            'content-language': 'en'
          },
          detectionResults: [
            { cms: 'Drupal', confidence: 0.90, version: '9.4.0' }
          ]
        }
      ];

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

      // Step 1: Analyze headers to get patterns (this should return a Map)
      const headerPatterns = await analyzeHeaders(testDataPoints, options);
      
      // Critical check: Verify headerPatterns is a Map (the production bug)
      expect(headerPatterns instanceof Map).toBe(true);
      expect(headerPatterns.size).toBeGreaterThan(0);

      // Step 2: Extract unique headers for semantic analysis 
      // This is the line that was broken: Array.from(headerPatterns.keys())
      const uniqueHeaders = Array.from(headerPatterns.keys()).map(h => h.toLowerCase());
      
      // Verify we got header names, not undefined
      expect(uniqueHeaders.length).toBeGreaterThan(0);
      expect(uniqueHeaders).toContain('server');
      expect(uniqueHeaders).toContain('x-powered-by');
      expect(uniqueHeaders).toContain('cf-ray');
      expect(uniqueHeaders).toContain('x-generator');

      // Step 3: Perform semantic analysis on the headers
      const headerAnalyses = batchAnalyzeHeaders(uniqueHeaders);
      
      // Verify semantic analysis worked
      expect(headerAnalyses instanceof Map).toBe(true);
      expect(headerAnalyses.size).toBeGreaterThan(0);
      expect(headerAnalyses.size).toBe(uniqueHeaders.length);

      // Check specific header analyses
      const serverAnalysis = headerAnalyses.get('server');
      expect(serverAnalysis).toBeDefined();
      expect(serverAnalysis!.headerName).toBe('server');
      expect(serverAnalysis!.category.primary).toBe('cms');

      const wordpressAnalysis = headerAnalyses.get('x-pingback');
      expect(wordpressAnalysis).toBeDefined();
      expect(wordpressAnalysis!.headerName).toBe('x-pingback');
      expect(wordpressAnalysis!.category.primary).toBe('cms');
      expect(wordpressAnalysis!.category.vendor).toBe('WordPress');

      const cloudflareAnalysis = headerAnalyses.get('cf-ray');
      expect(cloudflareAnalysis).toBeDefined();
      expect(cloudflareAnalysis!.headerName).toBe('cf-ray');
      expect(cloudflareAnalysis!.category.primary).toBe('caching');
      expect(cloudflareAnalysis!.category.vendor).toBe('Cloudflare');

      // Step 4: Generate semantic insights
      const semanticInsights = generateSemanticInsights(headerAnalyses);
      
      // Verify insights were generated (this should not be empty)
      expect(semanticInsights).toBeDefined();
      expect(semanticInsights.categoryDistribution).toBeDefined();
      
      const totalCategories = Object.values(semanticInsights.categoryDistribution)
        .reduce((sum, count) => sum + count, 0);
      expect(totalCategories).toBeGreaterThan(0);
      expect(totalCategories).toBe(headerAnalyses.size);

      // Verify specific category counts
      expect(semanticInsights.categoryDistribution.infrastructure).toBeGreaterThan(0);
      expect(semanticInsights.categoryDistribution.caching).toBeGreaterThan(0);
      expect(semanticInsights.categoryDistribution.cms).toBeGreaterThan(0);
      expect(semanticInsights.categoryDistribution.security).toBeGreaterThan(0);

      // Verify vendor distribution
      expect(semanticInsights.vendorDistribution).toBeDefined();
      expect(semanticInsights.vendorDistribution['WordPress']).toBeGreaterThan(0);
      expect(semanticInsights.vendorDistribution['Cloudflare']).toBeGreaterThan(0);

      // Verify naming conventions analysis
      expect(semanticInsights.namingConventions).toBeDefined();
      expect(semanticInsights.namingConventions['kebab-case']).toBeGreaterThan(0);

      // Step 5: Analyze vendor presence  
      const vendorStats = analyzeVendorPresence(uniqueHeaders);
      
      expect(vendorStats).toBeDefined();
      expect(vendorStats.totalHeaders).toBe(uniqueHeaders.length);
      expect(vendorStats.vendorHeaders).toBeGreaterThan(0);
      expect(vendorStats.vendorCoverage).toBeGreaterThan(0);
      expect(vendorStats.vendorDistribution.length).toBeGreaterThan(0);

      // Step 6: Infer technology stack
      const technologyStack = inferTechnologyStack(uniqueHeaders);
      
      expect(technologyStack).toBeDefined();
      expect(technologyStack.confidence).toBeGreaterThan(0);
      
      // Should detect CMS from headers (most likely WordPress or Drupal based on header count)
      expect(technologyStack.cms).toBeDefined();
      
      // Should detect Cloudflare from cf-* headers
      expect(technologyStack.cdn).toContain('Cloudflare');
    });

    it('should handle vendor detection through complete analysis chain', async () => {
      // Test specific vendor patterns that should be detected
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://shopify-store.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'nginx',
            'x-shopify-shop': 'test-shop.myshopify.com',
            'x-shopid': '12345',
            'x-shardid': 'shard-67890',
            'x-dc': 'gcp-us-east1',
            'powered-by': 'Shopify'
          },
          detectionResults: [
            { cms: 'Unknown', confidence: 0.0 }
          ]
        },
        {
          url: 'https://azure-app.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'Microsoft-IIS/10.0',
            'x-aspnet-version': '4.0.30319',
            'x-aspnetmvc-version': '5.2',
            'x-azure-ref': '0123456789ABCDEF',
            'x-ms-request-id': 'abc-def-ghi-jkl'
          },
          detectionResults: [
            { cms: 'Unknown', confidence: 0.0 }
          ]
        }
      ];

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

      // Analyze through complete chain
      const headerPatterns = await analyzeHeaders(testDataPoints, options);
      const uniqueHeaders = Array.from(headerPatterns.keys()).map(h => h.toLowerCase());
      const headerAnalyses = batchAnalyzeHeaders(uniqueHeaders);
      const semanticInsights = generateSemanticInsights(headerAnalyses);

      // Verify Shopify vendor detection
      const shopifyHeaders = ['x-shopify-shop', 'x-shopid', 'x-shardid'];
      for (const header of shopifyHeaders) {
        const analysis = headerAnalyses.get(header);
        expect(analysis).toBeDefined();
        expect(analysis!.category.vendor).toBe('Shopify');
        expect(analysis!.category.primary).toBe('ecommerce');
      }

      // Verify Azure/ASP.NET vendor detection  
      const azureHeaders = ['x-aspnet-version', 'x-aspnetmvc-version', 'x-azure-ref'];
      for (const header of azureHeaders) {
        const analysis = headerAnalyses.get(header);
        expect(analysis).toBeDefined();
        if (header.includes('aspnet')) {
          expect(analysis!.category.vendor).toBe('ASP.NET');
          expect(analysis!.category.primary).toBe('framework');
        } else if (header.includes('azure')) {
          expect(analysis!.category.vendor).toBe('Microsoft Azure');
        }
      }

      // Verify vendor distribution includes detected vendors
      expect(semanticInsights.vendorDistribution['Shopify']).toBeGreaterThan(0);
      expect(semanticInsights.vendorDistribution['ASP.NET']).toBeGreaterThan(0);
      expect(semanticInsights.vendorDistribution['Microsoft Azure']).toBeGreaterThan(0);

      // Verify technology stack inference
      const technologyStack = inferTechnologyStack(uniqueHeaders);
      expect(technologyStack.framework).toBe('ASP.NET');
      expect(technologyStack.confidence).toBeGreaterThan(0);
    });

    it('should properly categorize security headers', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://security-focused.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'nginx/1.18.0',
            'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
            'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
            'x-frame-options': 'DENY',
            'x-content-type-options': 'nosniff',
            'x-xss-protection': '1; mode=block',
            'referrer-policy': 'strict-origin-when-cross-origin',
            'permissions-policy': 'geolocation=(), microphone=(), camera=()',
            'cross-origin-opener-policy': 'same-origin',
            'cross-origin-embedder-policy': 'require-corp'
          },
          detectionResults: [
            { cms: 'Unknown', confidence: 0.0 }
          ]
        }
      ];

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

      const headerPatterns = await analyzeHeaders(testDataPoints, options);
      const uniqueHeaders = Array.from(headerPatterns.keys()).map(h => h.toLowerCase());
      const headerAnalyses = batchAnalyzeHeaders(uniqueHeaders);
      const semanticInsights = generateSemanticInsights(headerAnalyses);

      // Verify all security headers are categorized correctly
      const securityHeaders = [
        'content-security-policy',
        'strict-transport-security', 
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'referrer-policy',
        'permissions-policy',
        'cross-origin-opener-policy',
        'cross-origin-embedder-policy'
      ];

      for (const header of securityHeaders) {
        const analysis = headerAnalyses.get(header);
        expect(analysis).toBeDefined();
        expect(analysis!.category.primary).toBe('security');
        expect(analysis!.category.confidence).toBeGreaterThan(0.8);
      }

      // Verify security category has the expected count
      expect(semanticInsights.categoryDistribution.security).toBe(securityHeaders.length);
      
      // Verify infrastructure category (server is now cms, so should be 0)
      expect(semanticInsights.categoryDistribution.infrastructure).toBe(0);

      // Verify naming conventions (all should be kebab-case)
      expect(semanticInsights.namingConventions['kebab-case']).toBe(securityHeaders.length + 1); // +1 for server
    });

    it('should handle mixed CMS environments correctly', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        // WordPress site
        {
          url: 'https://wp-multisite.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'Apache/2.4.41',
            'x-powered-by': 'PHP/8.1.0',
            'x-pingback': 'https://wp-multisite.com/xmlrpc.php',
            'link': '<https://wp-multisite.com/wp-json/>; rel="https://api.w.org/"',
            'x-wp-total': '150'
          },
          detectionResults: [
            { cms: 'WordPress', confidence: 0.95 }
          ]
        },
        // Drupal site
        {
          url: 'https://drupal-enterprise.org',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'nginx/1.18.0',
            'x-generator': 'Drupal 9 (https://www.drupal.org)',
            'x-drupal-cache': 'HIT',
            'x-drupal-dynamic-cache': 'MISS'
          },
          detectionResults: [
            { cms: 'Drupal', confidence: 0.90 }
          ]
        },
        // Joomla site
        {
          url: 'https://joomla-community.net',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'Apache/2.4.41',
            'x-powered-by': 'PHP/7.4.0',
            'x-joomla-version': '4.2.0'
          },
          detectionResults: [
            { cms: 'Joomla', confidence: 0.85 }
          ]
        }
      ];

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

      const headerPatterns = await analyzeHeaders(testDataPoints, options);
      const uniqueHeaders = Array.from(headerPatterns.keys()).map(h => h.toLowerCase());
      const headerAnalyses = batchAnalyzeHeaders(uniqueHeaders);
      const semanticInsights = generateSemanticInsights(headerAnalyses);

      // Verify CMS-specific headers are detected
      const wpAnalysis = headerAnalyses.get('x-pingback');
      expect(wpAnalysis).toBeDefined();
      expect(wpAnalysis!.category.vendor).toBe('WordPress');

      const drupalAnalysis = headerAnalyses.get('x-generator');
      expect(drupalAnalysis).toBeDefined();
      expect(drupalAnalysis!.category.primary).toBe('cms');

      const joomlaAnalysis = headerAnalyses.get('x-joomla-version');
      expect(joomlaAnalysis).toBeDefined();
      expect(joomlaAnalysis!.category.vendor).toBe('Joomla');

      // Verify vendor distribution
      expect(semanticInsights.vendorDistribution['WordPress']).toBeGreaterThan(0);
      expect(semanticInsights.vendorDistribution['Drupal']).toBeGreaterThan(0);
      expect(semanticInsights.vendorDistribution['Joomla']).toBeGreaterThan(0);

      // Verify CMS category count
      expect(semanticInsights.categoryDistribution.cms).toBeGreaterThan(0);

      // Verify technology stack can't definitively identify a single CMS
      const technologyStack = inferTechnologyStack(uniqueHeaders);
      
      // Should detect multiple potential CMS platforms or pick the most confident one
      expect(technologyStack.confidence).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty header datasets', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://minimal-site.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          detectionResults: []
        }
      ];

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

      const headerPatterns = await analyzeHeaders(testDataPoints, options);
      
      // Should return empty Map, not undefined
      expect(headerPatterns instanceof Map).toBe(true);
      expect(headerPatterns.size).toBe(0);

      // Should handle empty unique headers gracefully
      const uniqueHeaders = Array.from(headerPatterns.keys()).map(h => h.toLowerCase());
      expect(uniqueHeaders.length).toBe(0);

      const headerAnalyses = batchAnalyzeHeaders(uniqueHeaders);
      expect(headerAnalyses instanceof Map).toBe(true);
      expect(headerAnalyses.size).toBe(0);

      const semanticInsights = generateSemanticInsights(headerAnalyses);
      expect(semanticInsights).toBeDefined();
      
      // All counts should be 0
      const totalCategories = Object.values(semanticInsights.categoryDistribution)
        .reduce((sum, count) => sum + count, 0);
      expect(totalCategories).toBe(0);
    });

    it('should handle malformed header names', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://malformed-headers.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            '': 'empty-header-name',
            'UPPER-CASE-HEADER': 'value',
            'mixed_Case-Header': 'value',
            'header-with-!@#$%^&*()': 'special-chars',
            'x-powered-by': 'PHP/8.1.0', // Valid header for comparison
          },
          detectionResults: []
        }
      ];

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

      const headerPatterns = await analyzeHeaders(testDataPoints, options);
      const uniqueHeaders = Array.from(headerPatterns.keys()).map(h => h.toLowerCase());
      const headerAnalyses = batchAnalyzeHeaders(uniqueHeaders);

      // Should handle all headers, even malformed ones
      expect(headerAnalyses.size).toBeGreaterThan(0);

      // Should still detect valid header
      const validAnalysis = headerAnalyses.get('x-powered-by');
      expect(validAnalysis).toBeDefined();
      expect(validAnalysis!.category.primary).toBe('cms');

      // Should handle malformed headers gracefully
      for (const [headerName, analysis] of headerAnalyses.entries()) {
        expect(analysis.headerName).toBeDefined();
        expect(analysis.category).toBeDefined();
        expect(analysis.namingConvention).toBeDefined();
        expect(analysis.patternType).toBeDefined();
      }
    });
  });
});