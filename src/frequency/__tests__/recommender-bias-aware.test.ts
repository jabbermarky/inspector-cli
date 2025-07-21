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

    it('should detect CMS names in header values and recommend keeping them', async () => {
      const biasAnalysis: DatasetBiasAnalysis = {
        cmsDistribution: {
          'WordPress': { count: 30, percentage: 30, sites: [] },
          'Shopify': { count: 25, percentage: 25, sites: [] },
          'Drupal': { count: 25, percentage: 25, sites: [] },
          'Unknown': { count: 20, percentage: 20, sites: [] }
        },
        totalSites: 100,
        concentrationScore: 0.32,
        biasWarnings: [],
        headerCorrelations: new Map([
          // Headers that contain CMS names in their values
          ['powered-by', createRealisticCorrelation('powered-by', {
            'WordPress': 0.20,  // Some WordPress sites have "powered-by: PHP"
            'Shopify': 0.88,    // Shopify sites have "powered-by: Shopify"
            'Drupal': 0.15,     // Some Drupal sites have "powered-by: PHP"
            'Unknown': 0.05
          }, {
            'WordPress': { count: 30, percentage: 30, sites: [] },
            'Shopify': { count: 25, percentage: 25, sites: [] },
            'Drupal': { count: 25, percentage: 25, sites: [] },
            'Unknown': { count: 20, percentage: 20, sites: [] }
          })],
          ['server', createRealisticCorrelation('server', {
            'WordPress': 0.95,  // WordPress sites might have "server: Apache" or "server: nginx"
            'Shopify': 0.20,    // Some Shopify might show server info
            'Drupal': 0.90,     // Drupal sites might have "server: Apache/Drupal"
            'Unknown': 0.85     // Most sites have server headers
          }, {
            'WordPress': { count: 30, percentage: 30, sites: [] },
            'Shopify': { count: 25, percentage: 25, sites: [] },
            'Drupal': { count: 25, percentage: 25, sites: [] },
            'Unknown': { count: 20, percentage: 20, sites: [] }
          })],
          ['x-generator', createRealisticCorrelation('x-generator', {
            'WordPress': 0.15,  // Some WordPress themes/plugins add x-generator
            'Shopify': 0.00,    // Shopify doesn't typically use x-generator
            'Drupal': 0.82,     // Drupal sites often have "x-generator: Drupal 9"
            'Unknown': 0.05
          }, {
            'WordPress': { count: 30, percentage: 30, sites: [] },
            'Shopify': { count: 25, percentage: 25, sites: [] },
            'Drupal': { count: 25, percentage: 25, sites: [] },
            'Unknown': { count: 20, percentage: 20, sites: [] }
          })]
        ])
      };

      const headerPatterns = new Map<string, HeaderPattern[]>([
        ['powered-by', [{
          pattern: 'powered-by:Shopify',
          frequency: 0.35,
          confidence: 0.9,
          examples: ['shop1.myshopify.com', 'shop2.com'],
          cmsCorrelation: { 'WordPress': 0.20, 'Shopify': 0.88, 'Drupal': 0.15, 'Unknown': 0.05 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['server', [{
          pattern: 'server:Apache',
          frequency: 0.60,
          confidence: 0.3,  // Low confidence for discrimination
          examples: ['site1.com', 'site2.com'],
          cmsCorrelation: { 'WordPress': 0.40, 'Shopify': 0.10, 'Drupal': 0.35, 'Unknown': 0.35 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['x-generator', [{
          pattern: 'x-generator:Drupal 9',
          frequency: 0.25,
          confidence: 0.9,
          examples: ['drupal1.org', 'drupal2.org'],
          cmsCorrelation: { 'WordPress': 0.15, 'Shopify': 0.00, 'Drupal': 0.82, 'Unknown': 0.05 },
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

      // powered-by shows strong Shopify correlation - should be kept
      expect(keepPatterns).toContain('powered-by');
      expect(filterPatterns).not.toContain('powered-by');

      // x-generator shows strong Drupal correlation - should be kept
      expect(keepPatterns).toContain('x-generator');
      expect(filterPatterns).not.toContain('x-generator');

      // server header is already in GENERIC_HTTP_HEADERS so won't appear in recommendations
      // (it's filtered out by semantic filtering)
      expect(keepPatterns).not.toContain('server');
      expect(filterPatterns).not.toContain('server');

      // Verify reasoning emphasizes CMS correlation
      const poweredByKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'powered-by');
      expect(poweredByKeep?.reason).toContain('Strong correlation with Shopify');
      expect(poweredByKeep?.reason).toContain('88%');

      const generatorKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'x-generator');
      expect(generatorKeep?.reason).toContain('Strong correlation with Drupal');
      expect(generatorKeep?.reason).toContain('82%');
    });

    it('should detect specific Shopify headers mentioned in the issue report', async () => {
      const biasAnalysis: DatasetBiasAnalysis = {
        cmsDistribution: {
          'Shopify': { count: 50, percentage: 50, sites: [] },
          'WordPress': { count: 30, percentage: 30, sites: [] },
          'Unknown': { count: 20, percentage: 20, sites: [] }
        },
        totalSites: 100,
        concentrationScore: 0.42,
        biasWarnings: [],
        headerCorrelations: new Map([
          // The specific headers mentioned as missing in the issue
          ['shopify-edge-ip', createRealisticCorrelation('shopify-edge-ip', {
            'Shopify': 0.95,    // Very high Shopify correlation
            'WordPress': 0.00,   // Never appears in WordPress
            'Unknown': 0.00      // Never appears in other platforms
          }, {
            'Shopify': { count: 50, percentage: 50, sites: [] },
            'WordPress': { count: 30, percentage: 30, sites: [] },
            'Unknown': { count: 20, percentage: 20, sites: [] }
          })],
          ['shopify-complexity-score', createRealisticCorrelation('shopify-complexity-score', {
            'Shopify': 0.88,    // Very high Shopify correlation
            'WordPress': 0.00,   // Never appears in WordPress
            'Unknown': 0.00      // Never appears in other platforms
          }, {
            'Shopify': { count: 50, percentage: 50, sites: [] },
            'WordPress': { count: 30, percentage: 30, sites: [] },
            'Unknown': { count: 20, percentage: 20, sites: [] }
          })],
          // Test powered-by header with Shopify value
          ['powered-by', createRealisticCorrelation('powered-by', {
            'Shopify': 0.92,    // Shopify sites often have "powered-by: Shopify"
            'WordPress': 0.15,   // WordPress might have "powered-by: PHP"
            'Unknown': 0.05      // Minimal appearance elsewhere
          }, {
            'Shopify': { count: 50, percentage: 50, sites: [] },
            'WordPress': { count: 30, percentage: 30, sites: [] },
            'Unknown': { count: 20, percentage: 20, sites: [] }
          })]
        ])
      };

      const headerPatterns = new Map<string, HeaderPattern[]>([
        ['shopify-edge-ip', [{
          pattern: 'shopify-edge-ip:192.168.1.1',
          frequency: 0.48,
          confidence: 0.95,
          examples: ['store1.myshopify.com', 'store2.com'],
          cmsCorrelation: { 'Shopify': 0.95, 'WordPress': 0.00, 'Unknown': 0.00 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['shopify-complexity-score', [{
          pattern: 'shopify-complexity-score:high',
          frequency: 0.44,
          confidence: 0.88,
          examples: ['shop1.myshopify.com', 'shop2.com'],
          cmsCorrelation: { 'Shopify': 0.88, 'WordPress': 0.00, 'Unknown': 0.00 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['powered-by', [{
          pattern: 'powered-by:Shopify',
          frequency: 0.52,
          confidence: 0.92,
          examples: ['store1.myshopify.com', 'store2.com'],
          cmsCorrelation: { 'Shopify': 0.92, 'WordPress': 0.15, 'Unknown': 0.05 },
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

      // All Shopify-specific headers should be recommended to keep
      expect(keepPatterns).toContain('shopify-edge-ip');
      expect(keepPatterns).toContain('shopify-complexity-score'); 
      expect(keepPatterns).toContain('powered-by');

      // None should be recommended for filtering
      expect(filterPatterns).not.toContain('shopify-edge-ip');
      expect(filterPatterns).not.toContain('shopify-complexity-score');
      expect(filterPatterns).not.toContain('powered-by');

      // Verify the reasoning emphasizes Shopify correlation
      const edgeIpKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'shopify-edge-ip');
      expect(edgeIpKeep?.reason).toContain('Strong correlation with Shopify');
      expect(edgeIpKeep?.reason).toContain('95%');

      const complexityKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'shopify-complexity-score');
      expect(complexityKeep?.reason).toContain('Strong correlation with Shopify');
      expect(complexityKeep?.reason).toContain('88%');

      const poweredByKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'powered-by');
      expect(poweredByKeep?.reason).toContain('Strong correlation with Shopify');
      expect(poweredByKeep?.reason).toContain('92%');
    });

    it('should detect Drupal headers with and without x- prefix', async () => {
      const biasAnalysis: DatasetBiasAnalysis = {
        cmsDistribution: {
          'Drupal': { count: 50, percentage: 50, sites: [] },
          'WordPress': { count: 30, percentage: 30, sites: [] },
          'Unknown': { count: 20, percentage: 20, sites: [] }
        },
        totalSites: 100,
        concentrationScore: 0.42,
        biasWarnings: [],
        headerCorrelations: new Map([
          // Drupal headers with x- prefix (should already work)
          ['x-drupal-cache', createRealisticCorrelation('x-drupal-cache', {
            'Drupal': 0.90,    // Very high Drupal correlation
            'WordPress': 0.00,   // Never appears in WordPress
            'Unknown': 0.00      // Never appears in other platforms
          }, {
            'Drupal': { count: 50, percentage: 50, sites: [] },
            'WordPress': { count: 30, percentage: 30, sites: [] },
            'Unknown': { count: 20, percentage: 20, sites: [] }
          })],
          ['x-drupal-dynamic-cache', createRealisticCorrelation('x-drupal-dynamic-cache', {
            'Drupal': 0.85,    // Very high Drupal correlation
            'WordPress': 0.00,   // Never appears in WordPress
            'Unknown': 0.00      // Never appears in other platforms
          }, {
            'Drupal': { count: 50, percentage: 50, sites: [] },
            'WordPress': { count: 30, percentage: 30, sites: [] },
            'Unknown': { count: 20, percentage: 20, sites: [] }
          })],
          // Drupal headers WITHOUT x- prefix (the ones being missed)
          ['drupal-cache', createRealisticCorrelation('drupal-cache', {
            'Drupal': 0.88,    // Very high Drupal correlation
            'WordPress': 0.00,   // Never appears in WordPress
            'Unknown': 0.00      // Never appears in other platforms
          }, {
            'Drupal': { count: 50, percentage: 50, sites: [] },
            'WordPress': { count: 30, percentage: 30, sites: [] },
            'Unknown': { count: 20, percentage: 20, sites: [] }
          })],
          ['drupal-dynamic-cache', createRealisticCorrelation('drupal-dynamic-cache', {
            'Drupal': 0.82,    // Very high Drupal correlation
            'WordPress': 0.00,   // Never appears in WordPress
            'Unknown': 0.00      // Never appears in other platforms
          }, {
            'Drupal': { count: 50, percentage: 50, sites: [] },
            'WordPress': { count: 30, percentage: 30, sites: [] },
            'Unknown': { count: 20, percentage: 20, sites: [] }
          })],
          ['drupal-page-cache', createRealisticCorrelation('drupal-page-cache', {
            'Drupal': 0.75,    // High Drupal correlation
            'WordPress': 0.00,   // Never appears in WordPress
            'Unknown': 0.00      // Never appears in other platforms
          }, {
            'Drupal': { count: 50, percentage: 50, sites: [] },
            'WordPress': { count: 30, percentage: 30, sites: [] },
            'Unknown': { count: 20, percentage: 20, sites: [] }
          })]
        ])
      };

      const headerPatterns = new Map<string, HeaderPattern[]>([
        // Headers with x-drupal- prefix
        ['x-drupal-cache', [{
          pattern: 'x-drupal-cache:HIT',
          frequency: 0.45,
          confidence: 0.90,
          examples: ['drupal1.org', 'drupal2.org'],
          cmsCorrelation: { 'Drupal': 0.90, 'WordPress': 0.00, 'Unknown': 0.00 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['x-drupal-dynamic-cache', [{
          pattern: 'x-drupal-dynamic-cache:MISS',
          frequency: 0.42,
          confidence: 0.85,
          examples: ['drupal3.org', 'drupal4.org'],
          cmsCorrelation: { 'Drupal': 0.85, 'WordPress': 0.00, 'Unknown': 0.00 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        // Headers with drupal- prefix (without x-)
        ['drupal-cache', [{
          pattern: 'drupal-cache:HIT',
          frequency: 0.44,
          confidence: 0.88,
          examples: ['drupal5.org', 'drupal6.org'],
          cmsCorrelation: { 'Drupal': 0.88, 'WordPress': 0.00, 'Unknown': 0.00 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['drupal-dynamic-cache', [{
          pattern: 'drupal-dynamic-cache:MISS',
          frequency: 0.41,
          confidence: 0.82,
          examples: ['drupal7.org', 'drupal8.org'],
          cmsCorrelation: { 'Drupal': 0.82, 'WordPress': 0.00, 'Unknown': 0.00 },
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]],
        ['drupal-page-cache', [{
          pattern: 'drupal-page-cache:HIT',
          frequency: 0.38,
          confidence: 0.75,
          examples: ['drupal9.org', 'drupal10.org'],
          cmsCorrelation: { 'Drupal': 0.75, 'WordPress': 0.00, 'Unknown': 0.00 },
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

      // ALL Drupal-specific headers should be recommended to keep (both with and without x- prefix)
      expect(keepPatterns).toContain('x-drupal-cache');
      expect(keepPatterns).toContain('x-drupal-dynamic-cache');
      expect(keepPatterns).toContain('drupal-cache');  // This was being missed before the fix
      expect(keepPatterns).toContain('drupal-dynamic-cache');  // This was being missed before the fix  
      expect(keepPatterns).toContain('drupal-page-cache');  // This was being missed before the fix

      // None should be recommended for filtering
      expect(filterPatterns).not.toContain('x-drupal-cache');
      expect(filterPatterns).not.toContain('x-drupal-dynamic-cache');
      expect(filterPatterns).not.toContain('drupal-cache');
      expect(filterPatterns).not.toContain('drupal-dynamic-cache');
      expect(filterPatterns).not.toContain('drupal-page-cache');

      // Verify the reasoning emphasizes Drupal correlation for both prefix types
      const xDrupalCacheKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'x-drupal-cache');
      expect(xDrupalCacheKeep?.reason).toContain('Strong correlation with Drupal');
      expect(xDrupalCacheKeep?.reason).toContain('90%');

      const drupalCacheKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'drupal-cache');
      expect(drupalCacheKeep?.reason).toContain('Strong correlation with Drupal');
      expect(drupalCacheKeep?.reason).toContain('88%');

      const drupalPageCacheKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'drupal-page-cache');
      expect(drupalPageCacheKeep?.reason).toContain('Strong correlation with Drupal');
      expect(drupalPageCacheKeep?.reason).toContain('75%');
    });

    it('should include all platform-specific headers even when exceeding normal top 10 limit', async () => {
      const biasAnalysis: DatasetBiasAnalysis = {
        cmsDistribution: {
          'Drupal': { count: 50, percentage: 50, sites: [] },
          'WordPress': { count: 30, percentage: 30, sites: [] },
          'Shopify': { count: 20, percentage: 20, sites: [] }
        },
        totalSites: 100,
        concentrationScore: 0.42,
        biasWarnings: [],
        headerCorrelations: new Map([
          // Create 12 Drupal platform headers (exceeds normal 10 limit)
          ['x-drupal-cache', createRealisticCorrelation('x-drupal-cache', {
            'Drupal': 0.90, 'WordPress': 0.00, 'Shopify': 0.00
          })],
          ['x-drupal-dynamic-cache', createRealisticCorrelation('x-drupal-dynamic-cache', {
            'Drupal': 0.85, 'WordPress': 0.00, 'Shopify': 0.00
          })],
          ['x-drupal-cache-contexts', createRealisticCorrelation('x-drupal-cache-contexts', {
            'Drupal': 0.82, 'WordPress': 0.00, 'Shopify': 0.00
          })],
          ['x-drupal-cache-tags', createRealisticCorrelation('x-drupal-cache-tags', {
            'Drupal': 0.80, 'WordPress': 0.00, 'Shopify': 0.00
          })],
          ['x-drupal-cache-max-age', createRealisticCorrelation('x-drupal-cache-max-age', {
            'Drupal': 0.78, 'WordPress': 0.00, 'Shopify': 0.00
          })],
          ['drupal-cache', createRealisticCorrelation('drupal-cache', {
            'Drupal': 0.75, 'WordPress': 0.00, 'Shopify': 0.00
          })],
          ['drupal-dynamic-cache', createRealisticCorrelation('drupal-dynamic-cache', {
            'Drupal': 0.73, 'WordPress': 0.00, 'Shopify': 0.00
          })],
          ['x-wp-total', createRealisticCorrelation('x-wp-total', {
            'Drupal': 0.00, 'WordPress': 0.85, 'Shopify': 0.00
          })],
          ['shopify-complexity-score', createRealisticCorrelation('shopify-complexity-score', {
            'Drupal': 0.00, 'WordPress': 0.00, 'Shopify': 0.88
          })],
          ['shopify-edge-ip', createRealisticCorrelation('shopify-edge-ip', {
            'Drupal': 0.00, 'WordPress': 0.00, 'Shopify': 0.90
          })],
          // Add some non-platform-specific headers to compete for spots
          ['x-cache-override', createRealisticCorrelation('x-cache-override', {
            'Drupal': 0.60, 'WordPress': 0.30, 'Shopify': 0.10
          })],
          ['x-generator', createRealisticCorrelation('x-generator', {
            'Drupal': 0.70, 'WordPress': 0.20, 'Shopify': 0.10
          })]
        ])
      };

      const headerPatterns = new Map<string, HeaderPattern[]>();
      
      // Create patterns for all headers in the correlation map
      for (const [headerName, correlation] of biasAnalysis.headerCorrelations.entries()) {
        headerPatterns.set(headerName, [{
          pattern: `${headerName}:test-value`,
          frequency: correlation.overallFrequency,
          confidence: 0.85,
          examples: ['test1.org', 'test2.org'],
          cmsCorrelation: {}, // Simplified for test
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }]);
      }

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

      // Debug: Check which headers are considered platform-specific
      console.log('Keep patterns:', keepPatterns.length, keepPatterns);
      console.log('Expected platform headers:', [
        'x-drupal-cache', 'x-drupal-dynamic-cache', 'x-drupal-cache-contexts',
        'x-drupal-cache-tags', 'x-drupal-cache-max-age', 'drupal-cache', 
        'drupal-dynamic-cache', 'x-wp-total', 'shopify-complexity-score', 'shopify-edge-ip'
      ]);

      // ALL platform-specific headers should be included, even though there are more than 10
      const platformSpecificHeaders = [
        'x-drupal-cache', 'x-drupal-dynamic-cache', 'x-drupal-cache-contexts',
        'x-drupal-cache-tags', 'x-drupal-cache-max-age', 'drupal-cache', 
        'drupal-dynamic-cache', 'x-wp-total', 'shopify-complexity-score', 'shopify-edge-ip'
      ];
      
      for (const platformHeader of platformSpecificHeaders) {
        expect(keepPatterns).toContain(platformHeader);
      }
      
      // Should have more than 10 recommendations due to platform-specific inclusion
      expect(keepPatterns.length).toBeGreaterThan(10);
      
      // Verify that platform-specific headers appear first in the list
      const platformHeaderIndices = platformSpecificHeaders.map(h => keepPatterns.indexOf(h));
      const nonPlatformHeaderIndices = keepPatterns
        .filter(h => !platformSpecificHeaders.includes(h))
        .map(h => keepPatterns.indexOf(h));
      
      // All platform headers should appear before non-platform headers
      if (nonPlatformHeaderIndices.length > 0) {
        expect(Math.max(...platformHeaderIndices)).toBeLessThan(Math.min(...nonPlatformHeaderIndices));
      }
    });
  });
});