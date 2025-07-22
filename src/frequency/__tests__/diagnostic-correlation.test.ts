import { describe, it, expect } from 'vitest';
import { analyzeDatasetBias } from '../bias-detector.js';
import type { DetectionDataPoint, FrequencyOptionsWithDefaults } from '../types.js';

describe('Diagnostic: Set-Cookie Correlation Issue', () => {
  it('should calculate correct correlation for set-cookie example', async () => {
    // Replicate the exact scenario from the frequency report
    const dataPoints: DetectionDataPoint[] = [
      // 2 Joomla sites with set-cookie
      {
        url: 'http://joomla1.com',
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Joomla', confidence: 0.9 }],
        httpHeaders: { 'set-cookie': 'dps_site_id=us-east-1; path=/; secure' },
        meta: {},
        scripts: []
      },
      {
        url: 'http://joomla2.com',
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Joomla', confidence: 0.9 }],
        httpHeaders: { 'set-cookie': 'dps_site_id=us-east-1; path=/; secure' },
        meta: {},
        scripts: []
      },
      // 35 Unknown sites with set-cookie
      ...Array.from({ length: 35 }, (_, i) => ({
        url: `http://unknown${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Unknown', confidence: 0.1 }],
        httpHeaders: { 'set-cookie': 'dps_site_id=us-east-1; path=/; secure' },
        meta: {},
        scripts: []
      })),
      // Additional sites without set-cookie to simulate dataset
      ...Array.from({ length: 963 }, (_, i) => ({
        url: `http://other${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Unknown', confidence: 0.1 }],
        httpHeaders: {},
        meta: {},
        scripts: []
      }))
    ];

    // Options for analysis
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

    // Run the full bias analysis
    const biasAnalysis = await analyzeDatasetBias(dataPoints, options);
    const correlations = biasAnalysis.headerCorrelations;
    
    const setCookieCorrelation = correlations.get('set-cookie');
    
    expect(setCookieCorrelation).toBeDefined();
    if (setCookieCorrelation) {
      // Log the actual calculations
      console.log('Set-Cookie Correlation Analysis:');
      console.log('Overall occurrences:', setCookieCorrelation.overallOccurrences);
      console.log('Overall frequency:', (setCookieCorrelation.overallFrequency * 100).toFixed(1) + '%');
      console.log('Platform specificity:', setCookieCorrelation.platformSpecificity.toFixed(3));
      
      console.log('\nPer-CMS breakdown:');
      Object.entries(setCookieCorrelation.perCMSFrequency).forEach(([cms, stats]) => {
        console.log(`${cms}:`, {
          occurrences: stats.occurrences,
          totalSitesForCMS: stats.totalSitesForCMS,
          frequency: (stats.frequency * 100).toFixed(1) + '%'
        });
      });

      // The actual correlation should be:
      // - 2 Joomla sites out of 37 total sites with set-cookie = 5.4%
      // - 35 Unknown sites out of 37 total sites with set-cookie = 94.6%
      
      // But perCMSFrequency shows frequency WITHIN each CMS:
      // - 2 Joomla sites out of 2 total Joomla sites = 100%
      // - 35 Unknown sites out of 998 total Unknown sites = 3.5%
      
      expect(setCookieCorrelation.perCMSFrequency['Joomla'].frequency).toBeCloseTo(1.0, 2); // 100% of Joomla sites
      expect(setCookieCorrelation.perCMSFrequency['Unknown'].frequency).toBeCloseTo(0.035, 3); // 3.5% of Unknown sites
      
      // This demonstrates the issue: The system reports "100% of Joomla sites have set-cookie"
      // which gets misinterpreted as "100% correlation with Joomla" in the recommendations
    }
  });

  it('should demonstrate correct correlation calculation', () => {
    // What the correlation SHOULD calculate
    const sitesWithSetCookie = 37;
    const joomlaSitesWithSetCookie = 2;
    const unknownSitesWithSetCookie = 35;
    
    const correctJoomlaCorrelation = (joomlaSitesWithSetCookie / sitesWithSetCookie) * 100;
    const correctUnknownCorrelation = (unknownSitesWithSetCookie / sitesWithSetCookie) * 100;
    
    expect(correctJoomlaCorrelation).toBeCloseTo(5.4, 1);
    expect(correctUnknownCorrelation).toBeCloseTo(94.6, 1);
    
    console.log('\nCorrect correlation calculation:');
    console.log(`Joomla: ${joomlaSitesWithSetCookie}/${sitesWithSetCookie} = ${correctJoomlaCorrelation.toFixed(1)}%`);
    console.log(`Unknown: ${unknownSitesWithSetCookie}/${sitesWithSetCookie} = ${correctUnknownCorrelation.toFixed(1)}%`);
  });
});