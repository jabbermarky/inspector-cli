import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateRecommendations, type RecommendationInput } from '../recommender.js';
import type { DetectionDataPoint, FrequencyOptionsWithDefaults } from '../types.js';
import type { HeaderPattern } from '../header-analyzer.js';
import type { DatasetBiasAnalysis, HeaderCMSCorrelation, CMSDistribution } from '../bias-detector.js';
import { setupCommandTests } from '@test-utils';
import { WEB_TECH_SURVEY_DATA, REALISTIC_FREQUENCY_PATTERNS } from './fixtures/ground-truth.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

// Test helper function to create realistic correlation data with calculated platform specificity
function createRealisticCorrelation(
  headerName: string, 
  perCMSData: Record<string, number>,
  cmsDistribution: CMSDistribution = {
    'WordPress': { count: 30, percentage: 30, sites: [] },
    'Drupal': { count: 30, percentage: 30, sites: [] },
    'Joomla': { count: 40, percentage: 40, sites: [] }
  }
): HeaderCMSCorrelation {
  // Create perCMSFrequency with realistic occurrences
  const perCMSFrequency = Object.entries(perCMSData).reduce((acc, [cms, freq]) => {
    const totalSitesForCMS = cmsDistribution[cms]?.count || 30;
    acc[cms] = { 
      frequency: freq, 
      occurrences: Math.round(freq * totalSitesForCMS),
      totalSitesForCMS 
    };
    return acc;
  }, {} as Record<string, { frequency: number; occurrences: number; totalSitesForCMS: number }>);
  
  // Calculate platform specificity using the real mathematical formula
  const frequencies = Object.values(perCMSData);
  const mean = frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
  const variance = frequencies.reduce((sum, freq) => sum + Math.pow(freq - mean, 2), 0) / frequencies.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
  const platformSpecificity = Math.min(1, coefficientOfVariation);
  
  // Calculate overall frequency and occurrences
  const totalSites = Object.values(cmsDistribution).reduce((sum, dist) => sum + dist.count, 0);
  const overallOccurrences = Object.values(perCMSFrequency).reduce((sum, data) => sum + data.occurrences, 0);
  const overallFrequency = totalSites > 0 ? overallOccurrences / totalSites : 0;
  
  // Calculate bias-adjusted frequency (weighted average assuming equal representation)
  const biasAdjustedFrequency = frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
  
  return {
    headerName,
    overallFrequency,
    overallOccurrences,
    perCMSFrequency,
    platformSpecificity, // CALCULATED VALUE - never hardcoded
    biasAdjustedFrequency,
    recommendationConfidence: platformSpecificity > 0.7 ? 'low' : 
                             platformSpecificity > 0.4 ? 'medium' : 'high'
  };
}

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
      // Create bias analysis with strong CMS correlations using REAL calculated values
      const cmsDistribution: CMSDistribution = {
        'Joomla': { count: 40, percentage: 40, sites: [] },
        'WordPress': { count: 30, percentage: 30, sites: [] },
        'Drupal': { count: 30, percentage: 30, sites: [] },
        'Duda': { count: 40, percentage: 40, sites: [] }, // Add missing platforms
        'Shopify': { count: 25, percentage: 25, sites: [] },
        'Unknown': { count: 20, percentage: 20, sites: [] }
      };
      
      const biasAnalysis: DatasetBiasAnalysis = {
        cmsDistribution,
        totalSites: 185, // Sum of all platform counts: 40+30+30+40+25+20
        concentrationScore: 0.34, // Balanced dataset
        biasWarnings: [],
        headerCorrelations: new Map([
          ['x-pingback', createRealisticCorrelation('x-pingback', {
            'Joomla': 0.00,
            'WordPress': 0.88, // WordPress-specific pingback header
            'Drupal': 0.00
          }, cmsDistribution)],
          ['x-wp-total', createRealisticCorrelation('x-wp-total', {
            'Joomla': 0.00,
            'WordPress': 0.85, // WordPress API header
            'Drupal': 0.00,
            'Duda': 0.00,
            'Shopify': 0.00,
            'Unknown': 0.00
          }, cmsDistribution)],
          ['d-geo', createRealisticCorrelation('d-geo', {
            'Joomla': 0.00,
            'WordPress': 0.00,
            'Drupal': 0.00,
            'Duda': 0.99, // Duda-specific geolocation header
            'Shopify': 0.00,
            'Unknown': 0.00
          }, cmsDistribution)]
        ])
      };

      const headerPatterns = new Map<string, HeaderPattern[]>([
        ['x-pingback', [{
          pattern: 'x-pingback:https://site.com/xmlrpc.php',
          frequency: 0.35,
          confidence: 0.9,
          examples: ['wordpress-site1.com', 'wordpress-site2.com'],
          cmsCorrelation: { 'WordPress': 0.88, 'Joomla': 0.00, 'Drupal': 0.00 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['x-wp-total', [{
          pattern: 'x-wp-total:150',
          frequency: 0.25,
          confidence: 0.85,
          examples: ['wp-site1.com', 'wp-site2.com'],
          cmsCorrelation: { 'WordPress': 0.85, 'Joomla': 0.00, 'Drupal': 0.00 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['d-geo', [{
          pattern: 'd-geo:US',
          frequency: 0.20,
          confidence: 0.95,
          examples: ['duda-site1.com', 'duda-site2.com'],
          cmsCorrelation: { 'Duda': 0.99, 'WordPress': 0.00, 'Drupal': 0.00 },
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

      // Verify semantic filtering is working correctly

      // Check recommendations based on semantically valid discriminative headers
      const filterRecommendations = recommendations.learn.recommendToFilter;
      const filterPatterns = filterRecommendations.map(r => r.pattern);
      const keepRecommendations = recommendations.learn.recommendToKeep;
      const keepPatterns = keepRecommendations.map(r => r.pattern);
      
      // x-pingback: WordPress-specific header - SHOULD be kept (high platform specificity)
      expect(keepPatterns).toContain('x-pingback');
      expect(filterPatterns).not.toContain('x-pingback');
      
      // x-wp-total: WordPress API header - SHOULD be kept (high platform specificity)
      expect(keepPatterns).toContain('x-wp-total');
      expect(filterPatterns).not.toContain('x-wp-total');
      
      // d-geo: Duda-specific geolocation header - SHOULD be kept (maximum platform specificity)
      expect(keepPatterns).toContain('d-geo');
      expect(filterPatterns).not.toContain('d-geo');

      // Verify the reasoning for platform-specific headers
      const pingbackKeep = keepRecommendations.find(r => r.pattern === 'x-pingback');
      expect(pingbackKeep?.reason).toContain('Strong correlation with WordPress');
      expect(pingbackKeep?.reason).toContain('88%');
      
      const geoKeep = keepRecommendations.find(r => r.pattern === 'd-geo');
      expect(geoKeep?.reason).toContain('Strong correlation with Duda');
      expect(geoKeep?.reason).toContain('99%');
      
      // Log the corrected semantic approach
      console.log('✅ SEMANTIC FILTERING WORKING:');
      console.log('  x-pingback: WordPress-specific (semantically valid for discrimination)');
      console.log('  x-wp-total: WordPress API (semantically valid for discrimination)');  
      console.log('  d-geo: Duda-specific (semantically valid for discrimination)');
    });

    it('should automatically exclude GENERIC_HTTP_HEADERS from analysis via semantic filtering', async () => {
      const cmsDistribution: CMSDistribution = {
        'WordPress': { count: 33, percentage: 33, sites: [] },
        'Drupal': { count: 33, percentage: 33, sites: [] },
        'Joomla': { count: 34, percentage: 34, sites: [] }
      };
      
      const biasAnalysis: DatasetBiasAnalysis = {
        cmsDistribution,
        totalSites: 100,
        concentrationScore: 0.33, // Very balanced
        biasWarnings: [],
        headerCorrelations: new Map([
          ['content-type', createRealisticCorrelation('content-type', {
            'WordPress': 0.97,
            'Drupal': 0.97,
            'Joomla': 1.00
          }, cmsDistribution)],
          ['date', createRealisticCorrelation('date', {
            'WordPress': 0.94,
            'Drupal': 0.94,
            'Joomla': 0.97
          }, cmsDistribution)]
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
      const cmsDistribution: CMSDistribution = {
        'WordPress': { count: 40, percentage: 40, sites: [] },
        'Duda': { count: 35, percentage: 35, sites: [] },
        'Unknown': { count: 25, percentage: 25, sites: [] }
      };
      
      const biasAnalysis: DatasetBiasAnalysis = {
        cmsDistribution,
        totalSites: 100,
        concentrationScore: 0.42,
        biasWarnings: [],
        headerCorrelations: new Map([
          ['x-duda-feature', createRealisticCorrelation('x-duda-feature', {
            'WordPress': 0.00,
            'Duda': 0.97, // Duda-specific feature header
            'Unknown': 0.00
          }, cmsDistribution)],
          ['x-enterprise-cache', createRealisticCorrelation('x-enterprise-cache', {
            'WordPress': 0.15,
            'Duda': 0.45, // Some enterprise hosting correlation
            'Unknown': 0.88 // Higher in enterprise/unknown sites
          }, cmsDistribution)]
        ])
      };

      const headerPatterns = new Map<string, HeaderPattern[]>([
        ['x-duda-feature', [{
          pattern: 'x-duda-feature:enabled',
          frequency: 0.35,
          confidence: 0.9,
          examples: ['duda1.com', 'duda2.com'],
          cmsCorrelation: { 'WordPress': 0.00, 'Duda': 0.97, 'Unknown': 0.00 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['x-enterprise-cache', [{
          pattern: 'x-enterprise-cache:distributed',
          frequency: 0.48,
          confidence: 0.3,
          examples: ['enterprise1.com', 'enterprise2.com'],
          cmsCorrelation: { 'WordPress': 0.15, 'Duda': 0.45, 'Unknown': 0.88 },
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

      // x-duda-feature shows strong Duda correlation - should be kept, not filtered
      expect(filterPatterns).not.toContain('x-duda-feature');
      expect(keepPatterns).toContain('x-duda-feature');

      // x-enterprise-cache has mathematical platform specificity due to high frequency in Unknown/Enterprise vs WordPress
      // Even though distributed across platforms, the mathematical variance makes it somewhat discriminative
      expect(keepPatterns).toContain('x-enterprise-cache');

      // Verify reasoning for x-duda-feature
      const dudaFeatureKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'x-duda-feature');
      expect(dudaFeatureKeep?.reason).toContain('Strong correlation with Duda');
      expect(dudaFeatureKeep?.reason).toContain('97%');
    });

    it('should prioritize platform specificity over frequency in recommendations', async () => {
      const cmsDistribution: CMSDistribution = {
        'WordPress': { count: 50, percentage: 50, sites: [] },
        'Drupal': { count: 30, percentage: 30, sites: [] },
        'Unknown': { count: 20, percentage: 20, sites: [] }
      };
      
      const biasAnalysis: DatasetBiasAnalysis = {
        cmsDistribution,
        totalSites: 100,
        concentrationScore: 0.38,
        biasWarnings: [],
        headerCorrelations: new Map([
          ['x-pingback', createRealisticCorrelation('x-pingback', {
            'WordPress': 0.90, // Very high WordPress correlation - genuinely platform-specific
            'Drupal': 0.00,
            'Unknown': 0.00
          }, cmsDistribution)],
          ['server', createRealisticCorrelation('server', {
            'WordPress': 0.98, // Universal header - appears on all platforms
            'Drupal': 1.00,
            'Unknown': 1.00
          }, cmsDistribution)]
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
          ['x-wp-total', createRealisticCorrelation('x-wp-total', {
            'WordPress': 0.83,
            'Duda': 0.00,
            'Shopify': 0.00,
            'Unknown': 0.00
          }, {
            'WordPress': { count: 30, percentage: 30, sites: [] },
            'Duda': { count: 25, percentage: 25, sites: [] },
            'Shopify': { count: 25, percentage: 25, sites: [] },
            'Unknown': { count: 20, percentage: 20, sites: [] }
          })],
          ['d-geo', createRealisticCorrelation('d-geo', {
            'WordPress': 0.00,
            'Duda': 0.80,
            'Shopify': 0.00,
            'Unknown': 0.00
          }, {
            'WordPress': { count: 30, percentage: 30, sites: [] },
            'Duda': { count: 25, percentage: 25, sites: [] },
            'Shopify': { count: 25, percentage: 25, sites: [] },
            'Unknown': { count: 20, percentage: 20, sites: [] }
          })],
          ['x-shopify-shop-id', createRealisticCorrelation('x-shopify-shop-id', {
            'WordPress': 0.00,
            'Duda': 0.00,
            'Shopify': 0.88,
            'Unknown': 0.00
          }, {
            'WordPress': { count: 30, percentage: 30, sites: [] },
            'Duda': { count: 25, percentage: 25, sites: [] },
            'Shopify': { count: 25, percentage: 25, sites: [] },
            'Unknown': { count: 20, percentage: 20, sites: [] }
          })]
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