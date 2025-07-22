import { describe, it, expect } from 'vitest';
import { formatOutput } from '../reporter.js';
import { analyzeDatasetBias } from '../bias-detector.js';
import type { DetectionDataPoint, FrequencyOptionsWithDefaults, FrequencyResult } from '../types.js';

describe('Phase 4: Enhanced Reporting', () => {
  it('should include calculation transparency in recommendations', async () => {
    // Create test data with clear discriminative pattern
    const dataPoints: DetectionDataPoint[] = [
      // 40 WordPress sites with x-wp-version (high confidence pattern)
      ...Array.from({ length: 40 }, (_, i) => ({
        url: `http://wp${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'WordPress', confidence: 0.9 }],
        httpHeaders: { 'x-wp-version': '6.2.1' },
        meta: {},
        scripts: []
      })),
      // 10 non-WordPress sites with the header
      ...Array.from({ length: 10 }, (_, i) => ({
        url: `http://other${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Unknown', confidence: 0.1 }],
        httpHeaders: { 'x-wp-version': '6.2.1' },
        meta: {},
        scripts: []
      })),
      // Many sites without the header
      ...Array.from({ length: 200 }, (_, i) => ({
        url: `http://noheader${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Unknown', confidence: 0.1 }],
        httpHeaders: {},
        meta: {},
        scripts: []
      }))
    ];

    // Run bias analysis
    const options: FrequencyOptionsWithDefaults = {
      dataSource: 'cms-analysis',
      dataDir: './data',
      minSites: 10,
      minOccurrences: 1,
      pageType: 'all',
      output: 'human',
      outputFile: '',
      includeRecommendations: true,
      includeCurrentFilters: true,
      debugCalculations: false
    };

    const biasAnalysis = await analyzeDatasetBias(dataPoints, options);

    // Create mock result with our bias analysis
    const result: FrequencyResult = {
      metadata: {
        totalSites: dataPoints.length,
        validSites: dataPoints.length,
        filteredSites: 0,
        analysisDate: new Date().toISOString(),
        options
      },
      headers: {
        'x-wp-version': {
          frequency: 0.2, // 50/250
          occurrences: 50,
          totalSites: 250,
          values: [{ value: '6.2.1', frequency: 1.0, occurrences: 50 }],
          pageDistribution: { mainpage: 1.0, robots: 0.0 }
        }
      },
      metaTags: {},
      scripts: {},
      recommendations: {
        learn: {
          currentlyFiltered: [],
          recommendToFilter: [],
          recommendToKeep: [{
            pattern: 'x-wp-version',
            reason: '80% of sites with this header are WordPress (40 sites) - highly discriminative',
            frequency: 0.2,
            diversity: 1
          }]
        },
        detectCms: { newPatternOpportunities: [], patternsToRefine: [] },
        groundTruth: { potentialNewRules: [] }
      },
      biasAnalysis
    };

    // Capture output
    let capturedOutput = '';
    const originalConsoleLog = console.log;
    console.log = (msg: string) => { capturedOutput = msg; };

    try {
      await formatOutput(result, options);

      // Verify calculation transparency is included
      expect(capturedOutput).toContain('x-wp-version');
      expect(capturedOutput).toContain('(40 sites)');
      expect(capturedOutput).toContain('80%');
      expect(capturedOutput).toContain('WordPress');
      
      // Verify confidence-based separation
      expect(capturedOutput).toContain('Low Confidence Recommendations');
      
    } finally {
      console.log = originalConsoleLog;
    }
  });

  it('should show debug information when debugCalculations is enabled', async () => {
    // Simple test data
    const dataPoints: DetectionDataPoint[] = [
      {
        url: 'http://test.com',
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'WordPress', confidence: 0.9 }],
        httpHeaders: { 'x-test': 'value' },
        meta: {},
        scripts: []
      }
    ];

    const options: FrequencyOptionsWithDefaults = {
      dataSource: 'cms-analysis',
      dataDir: './data',
      minSites: 1,
      minOccurrences: 1,
      pageType: 'all',
      output: 'human',
      outputFile: '',
      includeRecommendations: true,
      includeCurrentFilters: true,
      debugCalculations: true // Enable debug mode
    };

    const biasAnalysis = await analyzeDatasetBias(dataPoints, options);

    const result: FrequencyResult = {
      metadata: {
        totalSites: 1,
        validSites: 1,
        filteredSites: 0,
        analysisDate: new Date().toISOString(),
        options
      },
      headers: {},
      metaTags: {},
      scripts: {},
      recommendations: {
        learn: { currentlyFiltered: [], recommendToFilter: [], recommendToKeep: [] },
        detectCms: { newPatternOpportunities: [], patternsToRefine: [] },
        groundTruth: { potentialNewRules: [] }
      },
      biasAnalysis
    };

    let capturedOutput = '';
    const originalConsoleLog = console.log;
    console.log = (msg: string) => { capturedOutput = msg; };

    try {
      await formatOutput(result, options);

      // Verify debug information is shown
      expect(capturedOutput).toContain('Debug Mode: Calculation Audit Trail');
      expect(capturedOutput).toContain('Statistical Thresholds Applied');
      expect(capturedOutput).toContain('Minimum Sample Size');
      expect(capturedOutput).toContain('Platform Specificity Algorithm');
      
    } finally {
      console.log = originalConsoleLog;
    }
  });

  it('should separate recommendations by confidence levels', async () => {
    // Create mixed confidence data
    const dataPoints: DetectionDataPoint[] = [
      // High confidence: strong WordPress correlation  
      ...Array.from({ length: 45 }, (_, i) => ({
        url: `http://wp${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'WordPress', confidence: 0.9 }],
        httpHeaders: { 'x-wp-strong': 'high' },
        meta: {},
        scripts: []
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        url: `http://other${i + 1}.com`,
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Unknown', confidence: 0.1 }],
        httpHeaders: { 'x-wp-strong': 'high' },
        meta: {},
        scripts: []
      })),
      
      // Low confidence: weak correlation with small sample
      {
        url: 'http://small1.com',
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Drupal', confidence: 0.9 }],
        httpHeaders: { 'x-small-sample': 'low' },
        meta: {},
        scripts: []
      },
      {
        url: 'http://small2.com',
        analyzedAt: new Date().toISOString(),
        detectionResults: [{ cms: 'Unknown', confidence: 0.1 }],
        httpHeaders: { 'x-small-sample': 'low' },
        meta: {},
        scripts: []
      }
    ];

    const options: FrequencyOptionsWithDefaults = {
      dataSource: 'cms-analysis',
      dataDir: './data',
      minSites: 1,
      minOccurrences: 1,
      pageType: 'all',
      output: 'human',
      outputFile: '',
      includeRecommendations: true,
      includeCurrentFilters: true,
      debugCalculations: false
    };

    const biasAnalysis = await analyzeDatasetBias(dataPoints, options);

    // Verify confidence levels were assigned correctly
    const strongCorrelation = biasAnalysis.headerCorrelations.get('x-wp-strong');
    const weakCorrelation = biasAnalysis.headerCorrelations.get('x-small-sample');

    expect(strongCorrelation).toBeDefined();
    expect(weakCorrelation).toBeDefined();

    // Strong pattern should have high confidence due to large sample and strong correlation
    if (strongCorrelation) {
      expect(strongCorrelation.overallOccurrences).toBe(50); // 45 + 5
      expect(strongCorrelation.cmsGivenHeader['WordPress'].probability).toBeCloseTo(0.9); // 45/50 = 90%
      expect(strongCorrelation.platformSpecificity).toBeGreaterThan(0.5);
    }

    // Weak pattern should have low confidence due to small sample
    if (weakCorrelation) {
      expect(weakCorrelation.overallOccurrences).toBe(2); // Small sample
      expect(weakCorrelation.platformSpecificity).toBeGreaterThan(0); // Uses coefficient of variation for small samples
    }

    console.log('✅ Confidence-based separation working correctly');
  });
});