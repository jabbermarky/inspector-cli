import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateRecommendations, type RecommendationInput } from '../recommender.js';
import type { DetectionDataPoint, FrequencyOptionsWithDefaults } from '../types.js';
import type { HeaderPattern } from '../header-analyzer.js';
import type { DatasetBiasAnalysis, HeaderCMSCorrelation } from '../bias-detector.js';
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

describe('Bias-Aware Recommendation Logic', () => {
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

  describe('CMS Correlation Based Recommendations', () => {
    it('should NOT recommend filtering headers with strong CMS correlation', async () => {
      // Create bias analysis with strong CMS correlations
      const biasAnalysis: DatasetBiasAnalysis = {
        cmsDistribution: {
          'Joomla': { count: 40, percentage: 40, sites: [] },
          'WordPress': { count: 30, percentage: 30, sites: [] },
          'Drupal': { count: 30, percentage: 30, sites: [] }
        },
        totalSites: 100,
        concentrationScore: 0.34, // Balanced dataset
        biasWarnings: [],
        headerCorrelations: new Map([
          ['set-cookie', {
            headerName: 'set-cookie',
            overallFrequency: 0.6,
            overallOccurrences: 60,
            perCMSFrequency: {
              'Joomla': { frequency: 0.88, occurrences: 35, totalSitesForCMS: 40 },
              'WordPress': { frequency: 0.40, occurrences: 12, totalSitesForCMS: 30 },
              'Drupal': { frequency: 0.43, occurrences: 13, totalSitesForCMS: 30 }
            },
            platformSpecificity: 0.75, // High specificity due to Joomla correlation
            biasAdjustedFrequency: 0.57,
            recommendationConfidence: 'high'
          }],
          ['connection', {
            headerName: 'connection',
            overallFrequency: 0.65,
            overallOccurrences: 65,
            perCMSFrequency: {
              'Joomla': { frequency: 0.87, occurrences: 35, totalSitesForCMS: 40 },
              'WordPress': { frequency: 0.50, occurrences: 15, totalSitesForCMS: 30 },
              'Drupal': { frequency: 0.50, occurrences: 15, totalSitesForCMS: 30 }
            },
            platformSpecificity: 0.72, // High specificity due to Joomla correlation
            biasAdjustedFrequency: 0.62,
            recommendationConfidence: 'high'
          }],
          ['strict-transport-security', {
            headerName: 'strict-transport-security',
            overallFrequency: 0.45,
            overallOccurrences: 45,
            perCMSFrequency: {
              'Duda': { frequency: 0.99, occurrences: 39, totalSitesForCMS: 40 },
              'WordPress': { frequency: 0.20, occurrences: 6, totalSitesForCMS: 30 },
              'Drupal': { frequency: 0.00, occurrences: 0, totalSitesForCMS: 30 }
            },
            platformSpecificity: 0.95, // Very high specificity
            biasAdjustedFrequency: 0.40,
            recommendationConfidence: 'high'
          }]
        ])
      };

      const headerPatterns = new Map<string, HeaderPattern[]>([
        ['set-cookie', [{
          pattern: 'set-cookie:JSESSIONID=...',
          frequency: 0.6,
          confidence: 0.8,
          examples: ['site1.com', 'site2.com'],
          cmsCorrelation: { 'Joomla': 0.88, 'WordPress': 0.40, 'Drupal': 0.43 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['connection', [{
          pattern: 'connection:keep-alive',
          frequency: 0.65,
          confidence: 0.7,
          examples: ['site1.com', 'site2.com'],
          cmsCorrelation: { 'Joomla': 0.87, 'WordPress': 0.50, 'Drupal': 0.50 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['strict-transport-security', [{
          pattern: 'strict-transport-security:max-age=31536000',
          frequency: 0.45,
          confidence: 0.9,
          examples: ['duda1.com', 'duda2.com'],
          cmsCorrelation: { 'Duda': 0.99, 'WordPress': 0.20, 'Drupal': 0.00 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]]
      ]);

      const input: RecommendationInput = {
        headerPatterns,
        metaPatterns: new Map(),
        scriptPatterns: new Map(),
        dataPoints: [], // Not used when biasAnalysis provided
        options: testOptions,
        biasAnalysis
      };

      const recommendations = await generateRecommendations(input);

      // These headers should NOT be recommended for filtering
      const filterRecommendations = recommendations.learn.recommendToFilter;
      const filterPatterns = filterRecommendations.map(r => r.pattern);
      
      expect(filterPatterns).not.toContain('set-cookie');
      expect(filterPatterns).not.toContain('connection');
      expect(filterPatterns).not.toContain('strict-transport-security');

      // These headers SHOULD be recommended to keep
      const keepRecommendations = recommendations.learn.recommendToKeep;
      const keepPatterns = keepRecommendations.map(r => r.pattern);
      
      expect(keepPatterns).toContain('set-cookie');
      expect(keepPatterns).toContain('connection');
      expect(keepPatterns).toContain('strict-transport-security');

      // Verify the reasons are helpful
      const setCookieKeep = keepRecommendations.find(r => r.pattern === 'set-cookie');
      expect(setCookieKeep?.reason).toContain('Strong correlation with Joomla');
      expect(setCookieKeep?.reason).toContain('88%');

      const connectionKeep = keepRecommendations.find(r => r.pattern === 'connection');
      expect(connectionKeep?.reason).toContain('Strong correlation with Joomla');
      expect(connectionKeep?.reason).toContain('87%');

      const stsKeep = keepRecommendations.find(r => r.pattern === 'strict-transport-security');
      expect(stsKeep?.reason).toContain('Strong correlation with Duda');
      expect(stsKeep?.reason).toContain('99%');
    });

    it('should NOT recommend keeping truly universal headers that are already filtered', async () => {
      const biasAnalysis: DatasetBiasAnalysis = {
        cmsDistribution: {
          'WordPress': { count: 33, percentage: 33, sites: [] },
          'Drupal': { count: 33, percentage: 33, sites: [] },
          'Joomla': { count: 34, percentage: 34, sites: [] }
        },
        totalSites: 100,
        concentrationScore: 0.33, // Very balanced
        biasWarnings: [],
        headerCorrelations: new Map([
          ['content-type', {
            headerName: 'content-type',
            overallFrequency: 0.98,
            overallOccurrences: 98,
            perCMSFrequency: {
              'WordPress': { frequency: 0.97, occurrences: 32, totalSitesForCMS: 33 },
              'Drupal': { frequency: 0.97, occurrences: 32, totalSitesForCMS: 33 },
              'Joomla': { frequency: 1.00, occurrences: 34, totalSitesForCMS: 34 }
            },
            platformSpecificity: 0.15, // Very low specificity - appears equally across platforms
            biasAdjustedFrequency: 0.98,
            recommendationConfidence: 'high'
          }],
          ['date', {
            headerName: 'date',
            overallFrequency: 0.95,
            overallOccurrences: 95,
            perCMSFrequency: {
              'WordPress': { frequency: 0.94, occurrences: 31, totalSitesForCMS: 33 },
              'Drupal': { frequency: 0.94, occurrences: 31, totalSitesForCMS: 33 },
              'Joomla': { frequency: 0.97, occurrences: 33, totalSitesForCMS: 34 }
            },
            platformSpecificity: 0.12, // Very low specificity
            biasAdjustedFrequency: 0.95,
            recommendationConfidence: 'high'
          }]
        ])
      };

      const headerPatterns = new Map<string, HeaderPattern[]>([
        ['content-type', [{
          pattern: 'content-type:text/html',
          frequency: 0.98,
          confidence: 0.1, // Low confidence for discrimination
          examples: ['site1.com', 'site2.com'],
          cmsCorrelation: { 'WordPress': 0.33, 'Drupal': 0.33, 'Joomla': 0.34 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['date', [{
          pattern: 'date:*',
          frequency: 0.95,
          confidence: 0.1,
          examples: ['site1.com', 'site2.com'],
          cmsCorrelation: { 'WordPress': 0.33, 'Drupal': 0.33, 'Joomla': 0.34 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]]
      ]);

      const input: RecommendationInput = {
        headerPatterns,
        metaPatterns: new Map(),
        scriptPatterns: new Map(),
        dataPoints: [],
        options: testOptions,
        biasAnalysis
      };

      const recommendations = await generateRecommendations(input);

      // These headers are already in GENERIC_HTTP_HEADERS and have low platform specificity
      // They should NOT be recommended to keep (unfilter) because they provide no discriminative value
      const keepRecommendations = recommendations.learn.recommendToKeep;
      const keepPatterns = keepRecommendations.map(r => r.pattern);
      
      expect(keepPatterns).not.toContain('content-type');
      expect(keepPatterns).not.toContain('date');

      // They also shouldn't appear in filterRecommendations since they're already filtered
      const filterRecommendations = recommendations.learn.recommendToFilter;
      const filterPatterns = filterRecommendations.map(r => r.pattern);
      
      expect(filterPatterns).not.toContain('content-type');
      expect(filterPatterns).not.toContain('date');
    });

    it('should handle enterprise infrastructure headers with CMS correlation correctly', async () => {
      const biasAnalysis: DatasetBiasAnalysis = {
        cmsDistribution: {
          'WordPress': { count: 40, percentage: 40, sites: [] },
          'Duda': { count: 35, percentage: 35, sites: [] },
          'Unknown': { count: 25, percentage: 25, sites: [] }
        },
        totalSites: 100,
        concentrationScore: 0.42,
        biasWarnings: [],
        headerCorrelations: new Map([
          ['x-frame-options', {
            headerName: 'x-frame-options',
            overallFrequency: 0.55,
            overallOccurrences: 55,
            perCMSFrequency: {
              'WordPress': { frequency: 0.20, occurrences: 8, totalSitesForCMS: 40 },
              'Duda': { frequency: 0.97, occurrences: 34, totalSitesForCMS: 35 }, // Strong Duda correlation
              'Unknown': { frequency: 0.52, occurrences: 13, totalSitesForCMS: 25 }
            },
            platformSpecificity: 0.85, // High specificity due to Duda correlation
            biasAdjustedFrequency: 0.56,
            recommendationConfidence: 'high'
          }],
          ['cache-control', {
            headerName: 'cache-control',
            overallFrequency: 0.88,
            overallOccurrences: 88,
            perCMSFrequency: {
              'WordPress': { frequency: 0.85, occurrences: 34, totalSitesForCMS: 40 },
              'Duda': { frequency: 0.89, occurrences: 31, totalSitesForCMS: 35 },
              'Unknown': { frequency: 0.92, occurrences: 23, totalSitesForCMS: 25 }
            },
            platformSpecificity: 0.18, // Low specificity - appears equally across platforms
            biasAdjustedFrequency: 0.89,
            recommendationConfidence: 'high'
          }]
        ])
      };

      const headerPatterns = new Map<string, HeaderPattern[]>([
        ['x-frame-options', [{
          pattern: 'x-frame-options:SAMEORIGIN',
          frequency: 0.55,
          confidence: 0.8,
          examples: ['duda1.com', 'duda2.com'],
          cmsCorrelation: { 'WordPress': 0.20, 'Duda': 0.97, 'Unknown': 0.52 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['cache-control', [{
          pattern: 'cache-control:max-age=3600',
          frequency: 0.88,
          confidence: 0.2,
          examples: ['site1.com', 'site2.com'],
          cmsCorrelation: { 'WordPress': 0.35, 'Duda': 0.32, 'Unknown': 0.33 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]]
      ]);

      const input: RecommendationInput = {
        headerPatterns,
        metaPatterns: new Map(),
        scriptPatterns: new Map(),
        dataPoints: [],
        options: testOptions,
        biasAnalysis
      };

      const recommendations = await generateRecommendations(input);

      const filterPatterns = recommendations.learn.recommendToFilter.map(r => r.pattern);
      const keepPatterns = recommendations.learn.recommendToKeep.map(r => r.pattern);

      // x-frame-options shows strong Duda correlation - should be kept, not filtered
      expect(filterPatterns).not.toContain('x-frame-options');
      expect(keepPatterns).toContain('x-frame-options');

      // cache-control is already filtered and is truly generic - should NOT be recommended to keep
      expect(keepPatterns).not.toContain('cache-control');
      // Also shouldn't be in filter recommendations since it's already filtered
      expect(filterPatterns).not.toContain('cache-control');

      // Verify reasoning for x-frame-options
      const xFrameKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'x-frame-options');
      expect(xFrameKeep?.reason).toContain('Strong correlation with Duda');
      expect(xFrameKeep?.reason).toContain('97%');
    });

    it('should prioritize platform specificity over frequency in recommendations', async () => {
      const biasAnalysis: DatasetBiasAnalysis = {
        cmsDistribution: {
          'WordPress': { count: 50, percentage: 50, sites: [] },
          'Drupal': { count: 30, percentage: 30, sites: [] },
          'Unknown': { count: 20, percentage: 20, sites: [] }
        },
        totalSites: 100,
        concentrationScore: 0.38,
        biasWarnings: [],
        headerCorrelations: new Map([
          ['x-pingback', {
            headerName: 'x-pingback',
            overallFrequency: 0.45, // Moderate frequency
            overallOccurrences: 45,
            perCMSFrequency: {
              'WordPress': { frequency: 0.90, occurrences: 45, totalSitesForCMS: 50 }, // Very high WordPress correlation
              'Drupal': { frequency: 0.00, occurrences: 0, totalSitesForCMS: 30 },
              'Unknown': { frequency: 0.00, occurrences: 0, totalSitesForCMS: 20 }
            },
            platformSpecificity: 0.95, // Very high specificity
            biasAdjustedFrequency: 0.30, // Lower when adjusted for WordPress bias
            recommendationConfidence: 'high'
          }],
          ['server', {
            headerName: 'server',
            overallFrequency: 0.99, // Very high frequency
            overallOccurrences: 99,
            perCMSFrequency: {
              'WordPress': { frequency: 0.98, occurrences: 49, totalSitesForCMS: 50 },
              'Drupal': { frequency: 1.00, occurrences: 30, totalSitesForCMS: 30 },
              'Unknown': { frequency: 1.00, occurrences: 20, totalSitesForCMS: 20 }
            },
            platformSpecificity: 0.08, // Very low specificity
            biasAdjustedFrequency: 0.99,
            recommendationConfidence: 'high'
          }]
        ])
      };

      const headerPatterns = new Map<string, HeaderPattern[]>([
        ['x-pingback', [{
          pattern: 'x-pingback:https://site.com/xmlrpc.php',
          frequency: 0.45,
          confidence: 0.95,
          examples: ['wp1.com', 'wp2.com'],
          cmsCorrelation: { 'WordPress': 0.90, 'Drupal': 0.00, 'Unknown': 0.00 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['server', [{
          pattern: 'server:Apache',
          frequency: 0.60,
          confidence: 0.1,
          examples: ['site1.com', 'site2.com'],
          cmsCorrelation: { 'WordPress': 0.35, 'Drupal': 0.32, 'Unknown': 0.33 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }, {
          pattern: 'server:nginx',
          frequency: 0.39,
          confidence: 0.1,
          examples: ['site3.com', 'site4.com'],
          cmsCorrelation: { 'WordPress': 0.33, 'Drupal': 0.34, 'Unknown': 0.33 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]]
      ]);

      const input: RecommendationInput = {
        headerPatterns,
        metaPatterns: new Map(),
        scriptPatterns: new Map(),
        dataPoints: [],
        options: testOptions,
        biasAnalysis
      };

      const recommendations = await generateRecommendations(input);

      const filterPatterns = recommendations.learn.recommendToFilter.map(r => r.pattern);
      const keepPatterns = recommendations.learn.recommendToKeep.map(r => r.pattern);

      // x-pingback has high platform specificity - should be kept despite moderate frequency
      expect(keepPatterns).toContain('x-pingback');
      expect(filterPatterns).not.toContain('x-pingback');

      // server is already filtered and has very low specificity - should NOT be recommended to keep
      expect(keepPatterns).not.toContain('server');
      // Also shouldn't be in filter recommendations since it's already filtered
      expect(filterPatterns).not.toContain('server');

      // Verify x-pingback keep reasoning emphasizes WordPress correlation
      const pingbackKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'x-pingback');
      expect(pingbackKeep?.reason).toContain('Strong correlation with WordPress');
      expect(pingbackKeep?.reason).toContain('90%');

      // Verify server is not recommended for either filtering or keeping due to being already filtered and having low discriminative value
    });
  });

  describe('Platform Prefix Pattern Recognition', () => {
    it('should recognize and preserve platform-specific header prefixes', async () => {
      const biasAnalysis: DatasetBiasAnalysis = {
        cmsDistribution: {
          'WordPress': { count: 30, percentage: 30, sites: [] },
          'Duda': { count: 25, percentage: 25, sites: [] },
          'Shopify': { count: 25, percentage: 25, sites: [] },
          'Unknown': { count: 20, percentage: 20, sites: [] }
        },
        totalSites: 100,
        concentrationScore: 0.32,
        biasWarnings: [],
        headerCorrelations: new Map([
          ['x-wp-total', {
            headerName: 'x-wp-total',
            overallFrequency: 0.25,
            overallOccurrences: 25,
            perCMSFrequency: {
              'WordPress': { frequency: 0.83, occurrences: 25, totalSitesForCMS: 30 },
              'Duda': { frequency: 0.00, occurrences: 0, totalSitesForCMS: 25 },
              'Shopify': { frequency: 0.00, occurrences: 0, totalSitesForCMS: 25 },
              'Unknown': { frequency: 0.00, occurrences: 0, totalSitesForCMS: 20 }
            },
            platformSpecificity: 0.92,
            biasAdjustedFrequency: 0.21,
            recommendationConfidence: 'high'
          }],
          ['d-geo', {
            headerName: 'd-geo',
            overallFrequency: 0.20,
            overallOccurrences: 20,
            perCMSFrequency: {
              'WordPress': { frequency: 0.00, occurrences: 0, totalSitesForCMS: 30 },
              'Duda': { frequency: 0.80, occurrences: 20, totalSitesForCMS: 25 },
              'Shopify': { frequency: 0.00, occurrences: 0, totalSitesForCMS: 25 },
              'Unknown': { frequency: 0.00, occurrences: 0, totalSitesForCMS: 20 }
            },
            platformSpecificity: 0.95,
            biasAdjustedFrequency: 0.20,
            recommendationConfidence: 'high'
          }],
          ['x-shopify-shop-id', {
            headerName: 'x-shopify-shop-id',
            overallFrequency: 0.22,
            overallOccurrences: 22,
            perCMSFrequency: {
              'WordPress': { frequency: 0.00, occurrences: 0, totalSitesForCMS: 30 },
              'Duda': { frequency: 0.00, occurrences: 0, totalSitesForCMS: 25 },
              'Shopify': { frequency: 0.88, occurrences: 22, totalSitesForCMS: 25 },
              'Unknown': { frequency: 0.00, occurrences: 0, totalSitesForCMS: 20 }
            },
            platformSpecificity: 0.94,
            biasAdjustedFrequency: 0.22,
            recommendationConfidence: 'high'
          }]
        ])
      };

      const headerPatterns = new Map<string, HeaderPattern[]>([
        ['x-wp-total', [{
          pattern: 'x-wp-total:150',
          frequency: 0.25,
          confidence: 0.9,
          examples: ['wp1.com', 'wp2.com'],
          cmsCorrelation: { 'WordPress': 0.83, 'Duda': 0.00, 'Shopify': 0.00, 'Unknown': 0.00 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['d-geo', [{
          pattern: 'd-geo:US',
          frequency: 0.20,
          confidence: 0.85,
          examples: ['duda1.com', 'duda2.com'],
          cmsCorrelation: { 'WordPress': 0.00, 'Duda': 0.80, 'Shopify': 0.00, 'Unknown': 0.00 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['x-shopify-shop-id', [{
          pattern: 'x-shopify-shop-id:12345',
          frequency: 0.22,
          confidence: 0.9,
          examples: ['shop1.myshopify.com', 'shop2.myshopify.com'],
          cmsCorrelation: { 'WordPress': 0.00, 'Duda': 0.00, 'Shopify': 0.88, 'Unknown': 0.00 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]]
      ]);

      const input: RecommendationInput = {
        headerPatterns,
        metaPatterns: new Map(),
        scriptPatterns: new Map(),
        dataPoints: [],
        options: testOptions,
        biasAnalysis
      };

      const recommendations = await generateRecommendations(input);

      const keepPatterns = recommendations.learn.recommendToKeep.map(r => r.pattern);
      const filterPatterns = recommendations.learn.recommendToFilter.map(r => r.pattern);

      // All platform-specific headers should be recommended to keep
      expect(keepPatterns).toContain('x-wp-total');
      expect(keepPatterns).toContain('d-geo');
      expect(keepPatterns).toContain('x-shopify-shop-id');

      // None should be recommended for filtering
      expect(filterPatterns).not.toContain('x-wp-total');
      expect(filterPatterns).not.toContain('d-geo');
      expect(filterPatterns).not.toContain('x-shopify-shop-id');

      // Verify the reasoning mentions platform specificity
      const wpKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'x-wp-total');
      expect(wpKeep?.reason).toContain('Strong correlation with WordPress');

      const dudaKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'd-geo');
      expect(dudaKeep?.reason).toContain('Strong correlation with Duda');

      const shopifyKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'x-shopify-shop-id');
      expect(shopifyKeep?.reason).toContain('Strong correlation with Shopify');
    });
  });
});