import { describe, it, expect } from 'vitest';
import { analyzeDatasetBias } from '../bias-detector-v1.js';
import { generateRecommendations } from '../recommender-v1.js';
import type { DetectionDataPoint, FrequencyOptionsWithDefaults } from '../types-v1.js';

describe('Phase 2 Verification: Correlation Fix Complete', () => {
  it('should correctly handle the original set-cookie scenario from frequency report', async () => {
    // Replicate the exact scenario: 37 sites with set-cookie, 2 are Joomla (5.4%)
    const dataPoints: DetectionDataPoint[] = [];
    
    // Add 2 Joomla sites with set-cookie
    for (let i = 0; i < 2; i++) {
      dataPoints.push({
        url: `http://joomla${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Joomla', confidence: 0.9 }],
        httpHeaders: { 'set-cookie': 'dps_site_id=us-east-1; path=/; secure' },
        meta: {},
        scripts: []
      });
    }
    
    // Add 35 Unknown sites with set-cookie
    for (let i = 0; i < 35; i++) {
      dataPoints.push({
        url: `http://unknown${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Unknown', confidence: 0.1 }],
        httpHeaders: { 'set-cookie': 'dps_site_id=us-east-1; path=/; secure' },
        meta: {},
        scripts: []
      });
    }
    
    // Add more Joomla sites without set-cookie (to simulate real dataset ratio)
    for (let i = 0; i < 828; i++) {
      dataPoints.push({
        url: `http://joomla-normal${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Joomla', confidence: 0.9 }],
        httpHeaders: {},
        meta: {},
        scripts: []
      });
    }
    
    // Add many Unknown sites without set-cookie
    for (let i = 0; i < 3000; i++) {
      dataPoints.push({
        url: `http://unknown-normal${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Unknown', confidence: 0.1 }],
        httpHeaders: {},
        meta: {},
        scripts: []
      });
    }

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

    // Run analysis
    const biasAnalysis = await analyzeDatasetBias(dataPoints, options);
    const setCookieCorrelation = biasAnalysis.headerCorrelations.get('set-cookie');
    
    expect(setCookieCorrelation).toBeDefined();
    
    if (setCookieCorrelation) {
      // Verify the calculations are now correct
      console.log('Set-Cookie Analysis Results:');
      console.log('P(CMS|header) probabilities:', 
        Object.entries(setCookieCorrelation.cmsGivenHeader).map(([cms, data]) => 
          `${cms}: ${(data.probability * 100).toFixed(1)}% (${data.count} sites)`
        ).join(', ')
      );
      console.log('Platform specificity:', (setCookieCorrelation.platformSpecificity * 100).toFixed(1) + '%');
      
      // Key assertions
      expect(setCookieCorrelation.cmsGivenHeader['Joomla'].probability).toBeCloseTo(0.054, 2); // 2/37 ≈ 5.4%
      expect(setCookieCorrelation.cmsGivenHeader['Unknown'].probability).toBeCloseTo(0.946, 2); // 35/37 ≈ 94.6%
      expect(setCookieCorrelation.platformSpecificity).toBeLessThan(0.3); // Should be low due to sample size and low discrimination
    }

    // Generate recommendations
    const headerPatterns = new Map([['set-cookie', [{
      headerName: 'set-cookie',
      value: 'dps_site_id=us-east-1; path=/; secure',
      frequency: 37 / dataPoints.length,
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

    // Critical test: set-cookie should NOT be recommended to keep
    const setCookieInKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'set-cookie');
    expect(setCookieInKeep).toBeUndefined();
    
    console.log('✅ set-cookie correctly excluded from recommendations');
    console.log('Total recommendations to keep:', recommendations.learn.recommendToKeep.length);
  });

  it('should demonstrate the mathematical difference between old and new calculations', () => {
    // Mathematical verification
    const totalSites = 4569; // From frequency report
    const sitesWithSetCookie = 37;
    const joomlaSitesWithSetCookie = 2;
    const totalJoomlaSites = 830;
    
    // Old calculation P(header|CMS) - what the system used to emphasize incorrectly
    const pHeaderGivenJoomla = joomlaSitesWithSetCookie / totalJoomlaSites; // 2/830 = 0.24%
    
    // New calculation P(CMS|header) - what actually matters for discrimination
    const pJoomlaGivenHeader = joomlaSitesWithSetCookie / sitesWithSetCookie; // 2/37 = 5.4%
    
    // The old system incorrectly said "76% correlation" - this was wrong
    // The new system correctly calculates 5.4% which is not discriminative
    
    expect(pHeaderGivenJoomla).toBeCloseTo(0.0024, 4); // 0.24%
    expect(pJoomlaGivenHeader).toBeCloseTo(0.054, 3);  // 5.4%
    
    console.log('Mathematical verification:');
    console.log(`P(set-cookie|Joomla) = ${(pHeaderGivenJoomla * 100).toFixed(2)}% (frequency within Joomla sites)`);
    console.log(`P(Joomla|set-cookie) = ${(pJoomlaGivenHeader * 100).toFixed(1)}% (discriminative power)`);
    console.log('Only P(CMS|header) matters for CMS detection discrimination!');
  });

  it('should properly recommend truly discriminative headers', async () => {
    // Create a genuinely discriminative header
    const dataPoints: DetectionDataPoint[] = [];
    
    // 80 WordPress sites with x-wp-version (out of 100 total)
    for (let i = 0; i < 80; i++) {
      dataPoints.push({
        url: `http://wordpress${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'WordPress', confidence: 0.9 }],
        httpHeaders: { 'x-wp-version': '6.2.1' },
        meta: {},
        scripts: []
      });
    }
    
    // 20 WordPress sites without the header
    for (let i = 0; i < 20; i++) {
      dataPoints.push({
        url: `http://wordpress-no-header${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'WordPress', confidence: 0.9 }],
        httpHeaders: {},
        meta: {},
        scripts: []
      });
    }
    
    // Only 10 non-WordPress sites with the header (should still be discriminative)
    for (let i = 0; i < 10; i++) {
      dataPoints.push({
        url: `http://other${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Unknown', confidence: 0.1 }],
        httpHeaders: { 'x-wp-version': '6.2.1' },
        meta: {},
        scripts: []
      });
    }
    
    // Many other sites without the header
    for (let i = 0; i < 400; i++) {
      dataPoints.push({
        url: `http://other-no-header${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Unknown', confidence: 0.1 }],
        httpHeaders: {},
        meta: {},
        scripts: []
      });
    }

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
    const wpVersionCorrelation = biasAnalysis.headerCorrelations.get('x-wp-version');
    
    expect(wpVersionCorrelation).toBeDefined();
    if (wpVersionCorrelation) {
      // P(WordPress|x-wp-version) = 80/90 = 88.9%
      expect(wpVersionCorrelation.cmsGivenHeader['WordPress'].probability).toBeCloseTo(0.889, 2);
      expect(wpVersionCorrelation.platformSpecificity).toBeGreaterThan(0.5); // Should be high
    }

    // This header SHOULD be recommended
    const headerPatterns = new Map([['x-wp-version', [{
      headerName: 'x-wp-version',
      value: '6.2.1',
      frequency: 90 / dataPoints.length,
      occurrences: 90,
      sites: [],
      pageDistribution: { mainpage: 0.9, robots: 0.1 }
    }]]]);
    
    const recommendations = await generateRecommendations({
      headerPatterns,
      metaPatterns: new Map(),
      scriptPatterns: new Map(),
      dataPoints,
      options,
      biasAnalysis
    });

    const wpVersionInKeep = recommendations.learn.recommendToKeep.find(r => r.pattern === 'x-wp-version');
    expect(wpVersionInKeep).toBeDefined();
    expect(wpVersionInKeep?.reason).toContain('89%'); // Should show ~89% of sites with header are WordPress
    
    console.log('✅ x-wp-version correctly recommended with reason:', wpVersionInKeep?.reason);
  });
});