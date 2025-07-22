import { describe, it, expect } from 'vitest';
import { analyzeDatasetBias } from '../bias-detector.js';
import { generateRecommendations } from '../recommender.js';
import type { DetectionDataPoint, FrequencyOptionsWithDefaults } from '../types.js';

describe('Correlation Fix: P(CMS|header) vs P(header|CMS)', () => {
  it('should NOT recommend set-cookie with only 5.4% Joomla correlation', async () => {
    // Create test data matching the real scenario
    const dataPoints: DetectionDataPoint[] = [
      // 2 Joomla sites with set-cookie (out of 830 total Joomla sites)
      ...Array.from({ length: 2 }, (_, i) => ({
        url: `http://joomla-with-cookie-${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Joomla', confidence: 0.9 }],
        httpHeaders: { 'set-cookie': 'dps_site_id=us-east-1; path=/; secure' },
        meta: {},
        scripts: []
      })),
      // 828 more Joomla sites WITHOUT set-cookie
      ...Array.from({ length: 828 }, (_, i) => ({
        url: `http://joomla-no-cookie-${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Joomla', confidence: 0.9 }],
        httpHeaders: {},
        meta: {},
        scripts: []
      })),
      // 35 Unknown sites with set-cookie
      ...Array.from({ length: 35 }, (_, i) => ({
        url: `http://unknown-with-cookie-${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Unknown', confidence: 0.1 }],
        httpHeaders: { 'set-cookie': 'dps_site_id=us-east-1; path=/; secure' },
        meta: {},
        scripts: []
      })),
      // Many more Unknown sites without set-cookie
      ...Array.from({ length: 3702 }, (_, i) => ({
        url: `http://unknown-no-cookie-${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Unknown', confidence: 0.1 }],
        httpHeaders: {},
        meta: {},
        scripts: []
      }))
    ];

    const options: FrequencyOptionsWithDefaults = {
      minOccurrences: 1,
      output: 'human',
      minSites: 10,
      includeRecommendations: true,
      lastDays: null,
      dateStart: null,
      dateEnd: null,
      outputFile: null
    };

    // Analyze bias
    const biasAnalysis = await analyzeDatasetBias(dataPoints, options);
    
    // Check the correlation data
    const setCookieCorrelation = biasAnalysis.headerCorrelations.get('set-cookie');
    expect(setCookieCorrelation).toBeDefined();
    
    if (setCookieCorrelation) {
      // Verify P(CMS|header) calculations
      expect(setCookieCorrelation.cmsGivenHeader['Joomla'].probability).toBeCloseTo(0.054, 2); // 2/37 = 5.4%
      expect(setCookieCorrelation.cmsGivenHeader['Unknown'].probability).toBeCloseTo(0.946, 2); // 35/37 = 94.6%
      
      // The old calculation P(header|CMS) should show different values
      expect(setCookieCorrelation.perCMSFrequency['Joomla'].frequency).toBeCloseTo(0.0024, 3); // 2/830 = 0.24%
      expect(setCookieCorrelation.perCMSFrequency['Unknown'].frequency).toBeCloseTo(0.0094, 3); // 35/3737 = 0.94%
    }

    // Generate recommendations using the bias analysis we already computed
    // The recommender uses headerPatterns just for basic info, the real analysis comes from biasAnalysis
    const headerPatterns = new Map([['set-cookie', [{ 
      headerName: 'set-cookie', 
      value: 'dps_site_id=us-east-1; path=/; secure',
      frequency: 0.0082, // 37/4569
      occurrences: 37,
      sites: [],
      pageDistribution: { mainpage: 0.5, robots: 0.5 }
    }]]]);
    
    const recommendations = await generateRecommendations({
      headerPatterns,
      metaPatterns: new Map(),
      scriptPatterns: new Map(),
      dataPoints,
      options,
      biasAnalysis
    });

    // The critical test: set-cookie should NOT be in recommendToKeep
    const setCookieInKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'set-cookie');
    expect(setCookieInKeep).toBeUndefined();
    
    // It might be in recommendToFilter or neither (which is fine)
    console.log('Recommendations for set-cookie:', {
      inKeep: setCookieInKeep !== undefined,
      inFilter: recommendations.learn.recommendToFilter.find(r => r.pattern === 'set-cookie') !== undefined
    });
  });

  it('should recommend headers with genuine high CMS correlation', async () => {
    // Create a header that genuinely correlates with a CMS
    const dataPoints: DetectionDataPoint[] = [
      // 50 Drupal sites with x-drupal-cache (out of 100 total Drupal sites)
      ...Array.from({ length: 50 }, (_, i) => ({
        url: `http://drupal-with-header-${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Drupal', confidence: 0.9 }],
        httpHeaders: { 'x-drupal-cache': 'HIT' },
        meta: {},
        scripts: []
      })),
      // 50 more Drupal sites WITHOUT the header
      ...Array.from({ length: 50 }, (_, i) => ({
        url: `http://drupal-no-header-${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Drupal', confidence: 0.9 }],
        httpHeaders: {},
        meta: {},
        scripts: []
      })),
      // Only 5 non-Drupal sites with the header
      ...Array.from({ length: 5 }, (_, i) => ({
        url: `http://other-with-header-${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Unknown', confidence: 0.1 }],
        httpHeaders: { 'x-drupal-cache': 'HIT' },
        meta: {},
        scripts: []
      })),
      // Many other sites without the header
      ...Array.from({ length: 400 }, (_, i) => ({
        url: `http://other-no-header-${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Unknown', confidence: 0.1 }],
        httpHeaders: {},
        meta: {},
        scripts: []
      }))
    ];

    const options: FrequencyOptionsWithDefaults = {
      minOccurrences: 1,
      output: 'human',
      minSites: 10,
      includeRecommendations: true,
      lastDays: null,
      dateStart: null,
      dateEnd: null,
      outputFile: null
    };

    const biasAnalysis = await analyzeDatasetBias(dataPoints, options);
    const drupalCacheCorrelation = biasAnalysis.headerCorrelations.get('x-drupal-cache');
    
    expect(drupalCacheCorrelation).toBeDefined();
    if (drupalCacheCorrelation) {
      // P(Drupal|x-drupal-cache) = 50/55 = 90.9%
      expect(drupalCacheCorrelation.cmsGivenHeader['Drupal'].probability).toBeCloseTo(0.909, 2);
      expect(drupalCacheCorrelation.cmsGivenHeader['Drupal'].count).toBe(50);
    }

    // This header SHOULD be recommended to keep
    const headerPatterns = new Map([['x-drupal-cache', [{ 
      headerName: 'x-drupal-cache', 
      value: 'HIT',
      frequency: 0.11, // 55/505
      occurrences: 55,
      sites: [],
      pageDistribution: { mainpage: 0.8, robots: 0.2 }
    }]]]);
    
    const recommendations = await generateRecommendations({
      headerPatterns,
      metaPatterns: new Map(),
      scriptPatterns: new Map(),
      dataPoints,
      options,
      biasAnalysis
    });

    const drupalCacheInKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'x-drupal-cache');
    expect(drupalCacheInKeep).toBeDefined();
    expect(drupalCacheInKeep?.reason).toContain('91%'); // Should show ~91% of sites are Drupal
  });
});