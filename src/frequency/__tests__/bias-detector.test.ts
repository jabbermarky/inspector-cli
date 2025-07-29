import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    analyzeDatasetBiasV1 as analyzeDatasetBias,
    calculateWebsiteCategoryV1 as calculateWebsiteCategory,
//    type DatasetBiasAnalysis,
//    type CMSDistribution,
//    type HeaderCMSCorrelation,
} from '../bias-detector-v1.js';
import type { DetectionDataPoint, FrequencyOptionsWithDefaults } from '../types-v1.js';
import { setupCommandTests } from '@test-utils';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

describe('Bias Detector', () => {
  setupCommandTests();

  let testOptions: FrequencyOptionsWithDefaults;

  beforeEach(() => {
    vi.clearAllMocks();
    
    testOptions = {
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Dataset Bias Analysis', () => {
    it('should analyze balanced dataset correctly', async () => {
      // Create balanced dataset with equal representation
      const balancedDataPoints: DetectionDataPoint[] = [
        // WordPress sites (33%)
        {
          url: 'https://wp1.com',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'Apache', 'x-pingback': 'https://wp1.com/xmlrpc.php' },
          detectionResults: [{ cms: 'WordPress', confidence: 0.95 }]
        },
        {
          url: 'https://wp2.com',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'nginx', 'x-powered-by': 'PHP' },
          detectionResults: [{ cms: 'WordPress', confidence: 0.85 }]
        },
        {
          url: 'https://wp3.com',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'Apache', 'link': '<https://wp3.com/wp-json/>; rel="https://api.w.org/"' },
          detectionResults: [{ cms: 'WordPress', confidence: 0.90 }]
        },
        // Drupal sites (33%)
        {
          url: 'https://drupal1.org',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'nginx', 'x-generator': 'Drupal 9', 'x-drupal-cache': 'HIT' },
          detectionResults: [{ cms: 'Drupal', confidence: 0.90 }]
        },
        {
          url: 'https://drupal2.org',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'Apache', 'x-drupal-dynamic-cache': 'MISS' },
          detectionResults: [{ cms: 'Drupal', confidence: 0.88 }]
        },
        {
          url: 'https://drupal3.org',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'nginx', 'x-generator': 'Drupal 10' },
          detectionResults: [{ cms: 'Drupal', confidence: 0.92 }]
        },
        // Joomla sites (33%)
        {
          url: 'https://joomla1.net',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'Apache', 'x-joomla-version': '4.2.0' },
          detectionResults: [{ cms: 'Joomla', confidence: 0.85 }]
        },
        {
          url: 'https://joomla2.net',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'nginx', 'x-powered-by': 'PHP/8.1' },
          detectionResults: [{ cms: 'Joomla', confidence: 0.80 }]
        },
        {
          url: 'https://joomla3.net',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'Apache', 'generator': 'Joomla! 4.x' },
          detectionResults: [{ cms: 'Joomla', confidence: 0.88 }]
        }
      ];

      const result = await analyzeDatasetBias(balancedDataPoints, testOptions);

      // Verify basic structure
      expect(result).toBeDefined();
      expect(result.totalSites).toBe(9);
      expect(result.cmsDistribution).toBeDefined();
      expect(result.concentrationScore).toBeDefined();
      expect(result.biasWarnings).toBeDefined();
      expect(result.headerCorrelations).toBeDefined();

      // Verify CMS distribution
      expect(result.cmsDistribution['WordPress']).toBeDefined();
      expect(result.cmsDistribution['WordPress'].count).toBe(3);
      expect(result.cmsDistribution['WordPress'].percentage).toBeCloseTo(33.33, 1);

      expect(result.cmsDistribution['Drupal']).toBeDefined();
      expect(result.cmsDistribution['Drupal'].count).toBe(3);
      expect(result.cmsDistribution['Drupal'].percentage).toBeCloseTo(33.33, 1);

      expect(result.cmsDistribution['Joomla']).toBeDefined();
      expect(result.cmsDistribution['Joomla'].count).toBe(3);
      expect(result.cmsDistribution['Joomla'].percentage).toBeCloseTo(33.33, 1);

      // Verify low concentration score (balanced dataset)
      expect(result.concentrationScore).toBeLessThan(0.5);

      // Verify minimal bias warnings for balanced dataset
      expect(result.biasWarnings.length).toBe(0);

      // Verify header correlations were calculated
      expect(result.headerCorrelations.size).toBeGreaterThan(0);
      expect(result.headerCorrelations.has('x-generator')).toBe(true);

      // Verify x-generator header correlation (Drupal-specific, semantically valid)
      const generatorCorrelation = result.headerCorrelations.get('x-generator')!;
      expect(generatorCorrelation.overallFrequency).toBeCloseTo(0.22, 2); // Present in 2 out of 9 sites (Drupal only)
      expect(generatorCorrelation.platformSpecificity).toBeGreaterThan(0.5); // High specificity for Drupal
      expect(generatorCorrelation.recommendationConfidence).toBe('low'); // Low frequency but high specificity
    });

    it('should detect biased dataset with WordPress dominance', async () => {
      // Create heavily WordPress-biased dataset (80% WordPress)
      const biasedDataPoints: DetectionDataPoint[] = [
        // WordPress sites (80% - 8 out of 10)
        ...Array.from({ length: 8 }, (_, i) => ({
          url: `https://wp${i + 1}.com`,
          timestamp: new Date().toISOString(),
          httpHeaders: { 
            'server': 'Apache', 
            'x-pingback': `https://wp${i + 1}.com/xmlrpc.php`,
            'x-powered-by': 'PHP',
            'link': `<https://wp${i + 1}.com/wp-json/>; rel="https://api.w.org/"`
          },
          detectionResults: [{ cms: 'WordPress', confidence: 0.95 }]
        })),
        // Other CMS (20% - 2 out of 10)
        {
          url: 'https://drupal1.org',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'nginx', 'x-generator': 'Drupal 9' },
          detectionResults: [{ cms: 'Drupal', confidence: 0.90 }]
        },
        {
          url: 'https://joomla1.net',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'Apache', 'x-joomla-version': '4.2.0' },
          detectionResults: [{ cms: 'Joomla', confidence: 0.85 }]
        }
      ];

      const result = await analyzeDatasetBias(biasedDataPoints, testOptions);

      // Verify high concentration score
      expect(result.concentrationScore).toBeGreaterThan(0.6);

      // Verify WordPress dominance
      expect(result.cmsDistribution['WordPress'].percentage).toBe(80);

      // Verify bias warnings
      expect(result.biasWarnings.length).toBeGreaterThan(0);
      expect(result.biasWarnings.some(warning => 
        warning.includes('WordPress') && warning.includes('80%')
      )).toBe(true);
      expect(result.biasWarnings.some(warning => 
        warning.includes('High dataset concentration')
      )).toBe(true);

      // Verify WordPress-specific headers have low confidence
      const pingbackCorrelation = result.headerCorrelations.get('x-pingback');
      expect(pingbackCorrelation).toBeDefined();
      expect(pingbackCorrelation!.platformSpecificity).toBeGreaterThan(0.5);
      expect(pingbackCorrelation!.recommendationConfidence).toBe('low');
      expect(pingbackCorrelation!.biasWarning).toBeDefined();
    });

    it('should handle dataset with high unknown percentage', async () => {
      const unknownHeavyDataPoints: DetectionDataPoint[] = [
        // Known CMS sites (30%)
        {
          url: 'https://wp1.com',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'Apache', 'x-pingback': 'https://wp1.com/xmlrpc.php' },
          detectionResults: [{ cms: 'WordPress', confidence: 0.95 }]
        },
        {
          url: 'https://drupal1.org',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'nginx', 'x-generator': 'Drupal 9' },
          detectionResults: [{ cms: 'Drupal', confidence: 0.90 }]
        },
        {
          url: 'https://joomla1.net',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'Apache', 'x-joomla-version': '4.2.0' },
          detectionResults: [{ cms: 'Joomla', confidence: 0.85 }]
        },
        // Unknown sites (70%)
        ...Array.from({ length: 7 }, (_, i) => ({
          url: `https://unknown${i + 1}.com`,
          timestamp: new Date().toISOString(),
          httpHeaders: { 
            'server': 'nginx',
            'content-type': 'text/html',
            'cache-control': 'max-age=3600'
          },
          detectionResults: []
        }))
      ];

      const result = await analyzeDatasetBias(unknownHeavyDataPoints, testOptions);

      // Verify high unknown percentage
      expect(result.cmsDistribution['Unknown'].percentage).toBe(70);

      // Verify unknown sites warning
      expect(result.biasWarnings.some(warning => 
        warning.includes('High percentage of unidentified sites') && warning.includes('70%')
      )).toBe(true);

      // With 4 CMS types (WordPress, Drupal, Joomla, Unknown), should not have low diversity warning
      expect(result.biasWarnings.some(warning => 
        warning.includes('Low CMS diversity')
      )).toBe(false);
    });

    it('should calculate enterprise categorization correctly', async () => {
      const enterpriseDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://enterprise1.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'nginx/1.18.0',
            'strict-transport-security': 'max-age=31536000; includeSubDomains',
            'content-security-policy': "default-src 'self'",
            'x-frame-options': 'DENY',
            'x-content-type-options': 'nosniff',
            'cf-ray': '7d4b1c2a3b4c5d6e-DFW',
            'cf-cache-status': 'HIT'
          },
          detectionResults: []
        },
        {
          url: 'https://enterprise2.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'Apache/2.4.41',
            'x-amz-cf-id': 'EXAMPLE123456789',
            'x-amz-cf-pop': 'IAD79-C1',
            'via': '1.1 example.cloudfront.net (CloudFront)',
            'x-cache': 'Hit from cloudfront',
            'age': '3600'
          },
          detectionResults: []
        }
      ];

      const result = await analyzeDatasetBias(enterpriseDataPoints, testOptions);

      // Should categorize as Enterprise, not Unknown
      expect(result.cmsDistribution['Enterprise']).toBeDefined();
      expect(result.cmsDistribution['Enterprise'].count).toBe(2);
      expect(result.cmsDistribution['Enterprise'].percentage).toBe(100);

      // Should not have unknown sites warning
      expect(result.biasWarnings.some(warning => 
        warning.includes('High percentage of unidentified sites')
      )).toBe(false);
    });

    it('should analyze header-CMS correlations correctly', async () => {
      const correlationTestData: DetectionDataPoint[] = [
        // WordPress sites with specific headers
        {
          url: 'https://wp1.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'Apache',
            'x-pingback': 'https://wp1.com/xmlrpc.php',
            'x-powered-by': 'PHP',
            'content-type': 'text/html'
          },
          detectionResults: [{ cms: 'WordPress', confidence: 0.95 }]
        },
        {
          url: 'https://wp2.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'nginx',
            'x-pingback': 'https://wp2.com/xmlrpc.php',
            'content-type': 'text/html'
          },
          detectionResults: [{ cms: 'WordPress', confidence: 0.90 }]
        },
        // Drupal sites without WordPress-specific headers
        {
          url: 'https://drupal1.org',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'nginx',
            'x-generator': 'Drupal 9',
            'content-type': 'text/html'
          },
          detectionResults: [{ cms: 'Drupal', confidence: 0.90 }]
        },
        {
          url: 'https://drupal2.org',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'Apache',
            'x-drupal-cache': 'HIT',
            'content-type': 'text/html'
          },
          detectionResults: [{ cms: 'Drupal', confidence: 0.88 }]
        }
      ];

      const result = await analyzeDatasetBias(correlationTestData, testOptions);

      // Check x-pingback correlation (WordPress-specific)
      const pingbackCorr = result.headerCorrelations.get('x-pingback')!;
      expect(pingbackCorr).toBeDefined();
      expect(pingbackCorr.overallFrequency).toBe(0.5); // 2 out of 4 sites
      expect(pingbackCorr.perCMSFrequency['WordPress'].frequency).toBe(1.0); // 100% of WordPress sites
      expect(pingbackCorr.perCMSFrequency['Drupal'].frequency).toBe(0.0); // 0% of Drupal sites
      expect(pingbackCorr.platformSpecificity).toBeGreaterThan(0.5); // High specificity
      
      // Check x-powered-by correlation (appears in WordPress but not Drupal in this test)
      const poweredByCorr = result.headerCorrelations.get('x-powered-by')!;
      expect(poweredByCorr).toBeDefined();
      expect(poweredByCorr.overallFrequency).toBe(0.25); // 1 out of 4 sites
      expect(poweredByCorr.perCMSFrequency['WordPress'].frequency).toBe(0.5); // 50% of WordPress sites
      expect(poweredByCorr.perCMSFrequency['Drupal'].frequency).toBe(0.0); // 0% of Drupal sites
      expect(poweredByCorr.platformSpecificity).toBeGreaterThan(0.5); // High specificity
    });

    it('should handle robots.txt headers in correlation analysis', async () => {
      const robotsTestData: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {
            'server': 'Apache',
            'content-type': 'text/html',
            'x-custom-header': 'mainpage-value'
          },
          robotsTxt: {
            httpHeaders: {
              'server': 'Apache',
              'content-type': 'text/plain',
              'cache-control': 'max-age=86400',
              'x-robots-tag': 'noindex'
            }
          },
          detectionResults: [{ cms: 'WordPress', confidence: 0.95 }]
        }
      ];

      const result = await analyzeDatasetBias(robotsTestData, testOptions);

      // Should include headers from both mainpage and robots.txt (semantically valid ones)
      expect(result.headerCorrelations.has('x-robots-tag')).toBe(true);
      expect(result.headerCorrelations.has('x-custom-header')).toBe(true);
      
      // Should not double-count headers that appear in both (check with a custom header)
      const robotsTagCorr = result.headerCorrelations.get('x-robots-tag')!;
      expect(robotsTagCorr.overallOccurrences).toBe(1); // Only counted once per site
    });
  });

  describe('Enterprise Infrastructure Detection', () => {
    it('should identify enterprise infrastructure headers', () => {
      const enterpriseHeaders = [
        'strict-transport-security',
        'content-security-policy',
        'x-frame-options',
        'x-content-type-options',
        'cf-ray',
        'x-amz-cf-id',
        'via',
        'x-cache'
      ];

      for (const header of enterpriseHeaders) {
        expect(isEnterpriseInfrastructureHeader(header)).toBe(true);
      }
    });

    it('should not identify CMS-specific headers as enterprise', () => {
      const cmsHeaders = [
        'x-pingback',
        'x-wp-total',
        'x-generator',
        'x-drupal-cache',
        'x-joomla-version'
      ];

      for (const header of cmsHeaders) {
        expect(isEnterpriseInfrastructureHeader(header)).toBe(false);
      }
    });

    it('should handle header name variations', () => {
      // Should handle case variations
      expect(isEnterpriseInfrastructureHeader('STRICT-TRANSPORT-SECURITY')).toBe(true);
      expect(isEnterpriseInfrastructureHeader('Content-Security-Policy')).toBe(true);

      // Should handle whitespace
      expect(isEnterpriseInfrastructureHeader(' cf-ray ')).toBe(true);
      expect(isEnterpriseInfrastructureHeader('  x-cache  ')).toBe(true);
    });
  });

  describe('Website Category Calculation', () => {
    it('should categorize CMS sites correctly', () => {
      const cmsHeaders = { 'server': 'Apache', 'x-pingback': 'https://site.com/xmlrpc.php' };
      const cmsDetection = [{ cms: 'WordPress', confidence: 0.95 }];
      
      const category = calculateWebsiteCategory(cmsHeaders, cmsDetection);
      expect(category).toBe('cms');
    });

    it('should categorize enterprise sites by CDN headers', () => {
      const enterpriseHeaders = {
        'server': 'nginx',
        'cf-ray': '7d4b1c2a3b4c5d6e-DFW',
        'x-served-by': 'cache-lhr1-LHR',
        'strict-transport-security': 'max-age=31536000'
      };
      
      const category = calculateWebsiteCategory(enterpriseHeaders, []);
      expect(category).toBe('enterprise');
    });

    it('should categorize enterprise sites by security headers', () => {
      const securityHeaders = {
        'server': 'Apache',
        'x-frame-options': 'DENY',
        'content-security-policy': "default-src 'self'",
        'x-content-type-options': 'nosniff'
      };
      
      const category = calculateWebsiteCategory(securityHeaders, []);
      expect(category).toBe('enterprise');
    });

    it('should categorize unknown sites with minimal headers', () => {
      const minimalHeaders = {
        'server': 'nginx',
        'content-type': 'text/html'
      };
      
      const category = calculateWebsiteCategory(minimalHeaders, []);
      expect(category).toBe('unknown');
    });

    it('should handle missing headers gracefully', () => {
      const category1 = calculateWebsiteCategory(undefined, []);
      expect(category1).toBe('unknown');

      const category2 = calculateWebsiteCategory({}, []);
      expect(category2).toBe('unknown');
    });

    it('should prefer high-confidence CMS detection over header analysis', () => {
      // Headers suggest enterprise but CMS detection is confident
      const enterpriseHeaders = {
        'server': 'nginx',
        'cf-ray': '7d4b1c2a3b4c5d6e-DFW',
        'cf-cache-status': 'HIT'
      };
      const confidentDetection = [{ cms: 'WordPress', confidence: 0.90 }];
      
      const category = calculateWebsiteCategory(enterpriseHeaders, confidentDetection);
      expect(category).toBe('cms');
    });

    it('should fall back to header analysis for low-confidence detection', () => {
      const enterpriseHeaders = {
        'server': 'nginx',
        'cf-ray': '7d4b1c2a3b4c5d6e-DFW',
        'x-served-by': 'cache-lhr1-LHR'
      };
      const lowConfidenceDetection = [{ cms: 'WordPress', confidence: 0.20 }];
      
      const category = calculateWebsiteCategory(enterpriseHeaders, lowConfidenceDetection);
      expect(category).toBe('enterprise');
    });
  });

  describe('Consistent Filtering with Header Analyzer', () => {
    it('should apply same minOccurrences filtering as header analyzer', async () => {
      // Create test data where some headers are below minOccurrences threshold
      const testData: DetectionDataPoint[] = [
        // Header with exactly minOccurrences (5) - should be included
        ...Array(5).fill(null).map((_, i) => ({
          url: `https://site${i}.com`,
          httpHeaders: { 'x-header-threshold': 'value' },
          detectionResults: [{ cms: 'WordPress', confidence: 0.9, patterns: [] }]
        })),
        // Header with below minOccurrences (3) - should be excluded
        ...Array(3).fill(null).map((_, i) => ({
          url: `https://site${i+10}.com`,
          httpHeaders: { 'x-header-below': 'value' },
          detectionResults: [{ cms: 'WordPress', confidence: 0.9, patterns: [] }]
        })),
        // Fill remaining sites with other data
        ...Array(10).fill(null).map((_, i) => ({
          url: `https://site${i+20}.com`,
          httpHeaders: { 'server': 'nginx' },
          detectionResults: [{ cms: 'Drupal', confidence: 0.8, patterns: [] }]
        }))
      ];

      const options: FrequencyOptionsWithDefaults = {
        dataSource: 'cms-analysis',
        dataDir: './data/cms-analysis',
        minSites: 1,
        minOccurrences: 5, // Headers with <5 occurrences should be filtered out
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false,
        debugCalculations: false
      };

      const result = await analyzeDatasetBias(testData, options);

      // Verify consistent filtering: headers with <5 occurrences should be excluded
      expect(result.headerCorrelations.has('x-header-threshold')).toBe(true); // 5 occurrences - included
      expect(result.headerCorrelations.has('x-header-below')).toBe(false); // 3 occurrences - excluded
      
      // Verify the included header has correct count
      const thresholdHeader = result.headerCorrelations.get('x-header-threshold');
      expect(thresholdHeader?.overallOccurrences).toBe(5);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty dataset', async () => {
      const emptyDataPoints: DetectionDataPoint[] = [];
      
      const result = await analyzeDatasetBias(emptyDataPoints, testOptions);
      
      expect(result.totalSites).toBe(0);
      expect(result.concentrationScore).toBe(0);
      // Empty dataset might trigger low CMS diversity warning
      expect(result.biasWarnings.length).toBeGreaterThanOrEqual(0);
      expect(result.headerCorrelations.size).toBe(0);
      expect(Object.keys(result.cmsDistribution).length).toBe(0);
    });

    it('should handle single site dataset', async () => {
      const singleSiteData: DetectionDataPoint[] = [
        {
          url: 'https://only-site.com',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'Apache' },
          detectionResults: [{ cms: 'WordPress', confidence: 0.95 }]
        }
      ];

      const result = await analyzeDatasetBias(singleSiteData, testOptions);

      expect(result.totalSites).toBe(1);
      expect(result.concentrationScore).toBe(1); // Maximum concentration
      expect(result.cmsDistribution['WordPress'].percentage).toBe(100);
      expect(result.biasWarnings.length).toBeGreaterThan(0);
    });

    it('should handle malformed detection results', async () => {
      const malformedData: DetectionDataPoint[] = [
        {
          url: 'https://malformed1.com',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'Apache' },
          detectionResults: undefined as any
        },
        {
          url: 'https://malformed2.com',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'nginx' },
          detectionResults: [] as any
        },
        {
          url: 'https://malformed3.com',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'nginx' },
          detectionResults: [{ cms: undefined, confidence: undefined }] as any
        }
      ];

      const result = await analyzeDatasetBias(malformedData, testOptions);

      expect(result.totalSites).toBe(3);
      expect(result.cmsDistribution['Unknown']).toBeDefined();
      expect(result.cmsDistribution['Unknown'].count).toBe(3);
    });

    it('should handle missing headers gracefully', async () => {
      const missingHeadersData: DetectionDataPoint[] = [
        {
          url: 'https://no-headers1.com',
          timestamp: new Date().toISOString(),
          httpHeaders: undefined as any,
          detectionResults: [{ cms: 'WordPress', confidence: 0.95 }]
        },
        {
          url: 'https://empty-headers2.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          detectionResults: [{ cms: 'Drupal', confidence: 0.90 }]
        }
      ];

      const result = await analyzeDatasetBias(missingHeadersData, testOptions);

      expect(result.totalSites).toBe(2);
      // Should still analyze CMS distribution based on detection results
      expect(result.cmsDistribution['WordPress']).toBeDefined();
      expect(result.cmsDistribution['Drupal']).toBeDefined();
      // Should have minimal header correlations
      expect(result.headerCorrelations.size).toBe(0);
    });

    it('should calculate bias-adjusted frequency correctly', async () => {
      // Create dataset where one CMS has high frequency for a header, others have low
      const biasTestData: DetectionDataPoint[] = [
        // WordPress sites (80%) all have x-pingback
        ...Array.from({ length: 8 }, (_, i) => ({
          url: `https://wp${i + 1}.com`,
          timestamp: new Date().toISOString(),
          httpHeaders: { 
            'server': 'Apache',
            'x-pingback': `https://wp${i + 1}.com/xmlrpc.php`
          },
          detectionResults: [{ cms: 'WordPress', confidence: 0.95 }]
        })),
        // Other CMS (20%) don't have x-pingback
        {
          url: 'https://drupal1.org',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'nginx' },
          detectionResults: [{ cms: 'Drupal', confidence: 0.90 }]
        },
        {
          url: 'https://joomla1.net',
          timestamp: new Date().toISOString(),
          httpHeaders: { 'server': 'Apache' },
          detectionResults: [{ cms: 'Joomla', confidence: 0.85 }]
        }
      ];

      const result = await analyzeDatasetBias(biasTestData, testOptions);

      const pingbackCorr = result.headerCorrelations.get('x-pingback')!;
      expect(pingbackCorr).toBeDefined();
      
      // Overall frequency should be high (80%)
      expect(pingbackCorr.overallFrequency).toBe(0.8);
      
      // Bias-adjusted frequency should be lower (adjusting for dataset composition)
      expect(pingbackCorr.biasAdjustedFrequency).toBeLessThan(pingbackCorr.overallFrequency);
      
      // Should have low confidence due to bias
      expect(pingbackCorr.recommendationConfidence).toBe('low');
      expect(pingbackCorr.biasWarning).toBeDefined();
    });
  });
});