import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateRecommendations } from '../recommender.js';
import { GENERIC_HTTP_HEADERS } from '../../learn/filtering.js';
import { setupCommandTests } from '@test-utils';

// Mock dependencies
vi.mock('../../learn/filtering.js', () => ({
  GENERIC_HTTP_HEADERS: new Set(['server', 'date', 'cache-control', 'content-type']),
  GENERIC_META_TAGS: new Set(['viewport', 'charset'])
}));

vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

describe('Frequency Recommender', () => {
  setupCommandTests();
  
  describe('Learn Command Recommendations', () => {
    it('should identify currently filtered headers', async () => {
      const headerPatterns = new Map([
        ['server', [{ pattern: 'server:Apache', frequency: 0.85, confidence: 0.6, occurrences: 85, examples: ['Apache'], cmsCorrelation: {} }]],
        ['x-custom', [{ pattern: 'x-custom:value', frequency: 0.1, confidence: 0.8, occurrences: 10, examples: ['value'], cmsCorrelation: {} }]]
      ]);
      
      const result = await generateRecommendations({
        headerPatterns,
        metaPatterns: new Map(),
        scriptPatterns: new Map(),
        dataPoints: [],
        options: {
          dataSource: 'cms-analysis',
          dataDir: './data',
          minSites: 100,
          minOccurrences: 1,
          pageType: 'all',
          output: 'human',
          outputFile: '',
          includeRecommendations: true,
          includeCurrentFilters: true,
          debugCalculations: false
        }
      });
      
      expect(result.learn.currentlyFiltered).toContain('server');
      expect(result.learn.currentlyFiltered).not.toContain('x-custom');
    });
    
    it('should recommend filtering high-frequency headers', async () => {
      const headerPatterns = new Map([
        ['x-request-id', [
          { pattern: 'x-request-id:123', frequency: 0.3, confidence: 0.2, occurrences: 30, examples: ['123'], cmsCorrelation: {} },
          { pattern: 'x-request-id:456', frequency: 0.3, confidence: 0.2, occurrences: 30, examples: ['456'], cmsCorrelation: {} },
          { pattern: 'x-request-id:789', frequency: 0.3, confidence: 0.2, occurrences: 30, examples: ['789'], cmsCorrelation: {} }
        ]]
      ]);
      
      const result = await generateRecommendations({
        headerPatterns,
        metaPatterns: new Map(),
        scriptPatterns: new Map(),
        dataPoints: [],
        options: {
          dataSource: 'cms-analysis',
          dataDir: './data',
          minSites: 100,
          minOccurrences: 1,
          pageType: 'all',
          output: 'human',
          outputFile: '',
          includeRecommendations: true,
          includeCurrentFilters: true,
          debugCalculations: false
        }
      });
      
      const requestIdRec = result.learn.recommendToFilter.find(r => r.pattern === 'x-request-id');
      expect(requestIdRec).toBeDefined();
      expect(requestIdRec!.reason).toContain('High frequency');
      expect(requestIdRec!.diversity).toBe(3);
    });
    
    it('should recommend keeping discriminative headers', async () => {
      const headerPatterns = new Map([
        ['x-powered-by', [
          { pattern: 'x-powered-by:WordPress', frequency: 0.15, confidence: 0.9, occurrences: 15, examples: ['WordPress'], cmsCorrelation: { 'WordPress': 0.95, 'Unknown': 0.05 } },
          { pattern: 'x-powered-by:Drupal', frequency: 0.10, confidence: 0.9, occurrences: 10, examples: ['Drupal'], cmsCorrelation: { 'Drupal': 0.95, 'Unknown': 0.05 } }
        ]]
      ]);
      
      const result = await generateRecommendations({
        headerPatterns,
        metaPatterns: new Map(),
        scriptPatterns: new Map(),
        dataPoints: [],
        options: {
          dataSource: 'cms-analysis',
          dataDir: './data',
          minSites: 100,
          minOccurrences: 1,
          pageType: 'all',
          output: 'human',
          outputFile: '',
          includeRecommendations: true,
          includeCurrentFilters: true,
          debugCalculations: false
        }
      });
      
      const poweredByRec = result.learn.recommendToKeep.find(r => r.pattern === 'x-powered-by');
      expect(poweredByRec).toBeDefined();
      expect(poweredByRec!.reason).toContain('Low frequency');
      expect(poweredByRec!.frequency).toBe(0.25); // Combined frequency
    });
  });
  
  describe('Detect-CMS Recommendations', () => {
    it('should identify new pattern opportunities', async () => {
      // Mock header patterns that the detect-CMS algorithm will analyze
      const headerPatterns = new Map([
        ['x-drupal-cache', [
          { pattern: 'x-drupal-cache:HIT', frequency: 0.25, confidence: 0.9, occurrences: 25, examples: ['HIT'] }
        ]]
      ]);
      
      const dataPoints = [] as any;
      
      // Mock bias analysis with the correlation we expect
      const mockBiasAnalysis = {
        totalSites: 100,
        concentrationScore: 0.3,
        cmsDistribution: {
          'Drupal': { count: 35, percentage: 35 },
          'WordPress': { count: 65, percentage: 65 }
        },
        headerCorrelations: new Map([
          ['x-drupal-cache', {
            headerName: 'x-drupal-cache',
            overallOccurrences: 25,
            overallFrequency: 0.25,
            platformSpecificity: 0.85, // High specificity
            recommendationConfidence: 'high' as const,
            cmsGivenHeader: {
              'Drupal': { count: 20, probability: 0.8 }, // 20/25 = 80%
              'Unknown': { count: 5, probability: 0.2 }
            },
            perCMSFrequency: {
              'Drupal': { count: 20, frequency: 0.8 }
            }
          }]
        ]),
        biasWarnings: []
      } as any;
      
      const result = await generateRecommendations({
        headerPatterns,
        metaPatterns: new Map(),
        scriptPatterns: new Map(),
        dataPoints,
        biasAnalysis: mockBiasAnalysis, // Provide the mock bias analysis
        options: {
          dataSource: 'cms-analysis',
          dataDir: './data',
          minSites: 100,
          minOccurrences: 1,
          pageType: 'all',
          output: 'human',
          outputFile: '',
          includeRecommendations: true,
          includeCurrentFilters: true,
          debugCalculations: false
        }
      });
      
      const drupalCacheOpp = result.detectCms.newPatternOpportunities.find(
        p => p.pattern === 'x-drupal-cache'
      );
      expect(drupalCacheOpp).toBeDefined();
      expect(drupalCacheOpp!.frequency).toBe(0.25); // 25/100 sites
      expect(drupalCacheOpp!.cmsCorrelation['Drupal']).toBeGreaterThan(0.75); // 28/35 = 80%
    });
    
    it('should identify patterns to refine', async () => {
      // Mock header patterns - this should be flagged as too generic
      const headerPatterns = new Map([
        ['x-powered-by', [
          { pattern: 'x-powered-by:PHP', frequency: 0.35, confidence: 0.3, occurrences: 35, examples: ['PHP/7.4'] }
        ]]
      ]);
      
      const dataPoints = [] as any;
      
      // Mock bias analysis showing poor discrimination (should be flagged to refine)
      const mockBiasAnalysis = {
        totalSites: 100,
        concentrationScore: 0.3,
        cmsDistribution: {
          'WordPress': { count: 40, percentage: 40 },
          'Drupal': { count: 30, percentage: 30 },
          'Unknown': { count: 30, percentage: 30 }
        },
        headerCorrelations: new Map([
          ['x-powered-by', {
            headerName: 'x-powered-by',
            overallOccurrences: 35,
            overallFrequency: 0.35,
            platformSpecificity: 0.15, // Low specificity (should trigger "too generic")
            recommendationConfidence: 'low' as const,
            cmsGivenHeader: {
              'WordPress': { count: 14, probability: 0.4 }, // 14/35 = 40%
              'Drupal': { count: 10, probability: 0.29 }, // 10/35 = 29%
              'Unknown': { count: 11, probability: 0.31 } // 11/35 = 31%
            },
            perCMSFrequency: {
              'WordPress': { count: 14, frequency: 0.4 }
            }
          }]
        ]),
        biasWarnings: []
      } as any;
      
      const result = await generateRecommendations({
        headerPatterns,
        metaPatterns: new Map(),
        scriptPatterns: new Map(),
        dataPoints,
        biasAnalysis: mockBiasAnalysis, // Provide the mock bias analysis
        options: {
          dataSource: 'cms-analysis',
          dataDir: './data',
          minSites: 100,
          minOccurrences: 1,
          pageType: 'all',
          output: 'human',
          outputFile: '',
          includeRecommendations: true,
          includeCurrentFilters: true,
          debugCalculations: false
        }
      });
      
      const phpRefine = result.detectCms.patternsToRefine.find(
        p => p.pattern === 'x-powered-by'
      );
      expect(phpRefine).toBeDefined();
      expect(phpRefine!.issue).toContain('Too generic');
      expect(phpRefine!.currentFrequency).toBe(0.35);
    });
  });
  
  describe('Ground-Truth Recommendations', () => {
    it('should suggest potential new rules', async () => {
      const metaPatterns = new Map([
        ['name:generator', [
          { pattern: 'generator:Joomla!', frequency: 0.12, confidence: 0.9, occurrences: 12, examples: ['Joomla! 4.0'], cmsCorrelation: { 'Joomla': 0.95, 'Unknown': 0.05 } }
        ]]
      ]);
      
      const dataPoints = [
        { url: 'site1.com', metaTags: [{ name: 'generator', content: 'Joomla!' }], detectionResults: [{ cms: 'Joomla', confidence: 0.9 }] }
      ] as any;
      
      const result = await generateRecommendations({
        headerPatterns: new Map(),
        metaPatterns,
        scriptPatterns: new Map(),
        dataPoints,
        options: {
          dataSource: 'cms-analysis',
          dataDir: './data',
          minSites: 100,
          minOccurrences: 1,
          pageType: 'all',
          output: 'human',
          outputFile: '',
          includeRecommendations: true,
          includeCurrentFilters: true,
          debugCalculations: false
        }
      });
      
      const joomlaRule = result.groundTruth.potentialNewRules.find(
        r => r.suggestedRule.includes('generator:Joomla!')
      );
      expect(joomlaRule).toBeDefined();
      expect(joomlaRule!.confidence).toBeGreaterThan(0.8);
    });
  });
  
  describe('CMS Correlation Calculation', () => {
    it('should calculate CMS correlations correctly', async () => {
      // Mock header patterns that should be a good CMS correlation opportunity
      const headerPatterns = new Map([
        ['x-generator', [
          { pattern: 'x-generator:WordPress', frequency: 0.2, confidence: 0.8, occurrences: 20, examples: ['WordPress'] }
        ]]
      ]);
      
      const dataPoints = [] as any;
      
      // Mock bias analysis showing strong WordPress correlation
      const mockBiasAnalysis = {
        totalSites: 100,
        concentrationScore: 0.3,
        cmsDistribution: {
          'WordPress': { count: 60, percentage: 60 },
          'Drupal': { count: 20, percentage: 20 },
          'Unknown': { count: 20, percentage: 20 }
        },
        headerCorrelations: new Map([
          ['x-generator', {
            headerName: 'x-generator',
            overallOccurrences: 20,
            overallFrequency: 0.2,
            platformSpecificity: 0.8, // High specificity
            recommendationConfidence: 'high' as const,
            cmsGivenHeader: {
              'WordPress': { count: 17, probability: 0.85 }, // 17/20 = 85%
              'Drupal': { count: 3, probability: 0.15 } // 3/20 = 15%
            },
            perCMSFrequency: {
              'WordPress': { count: 17, frequency: 0.85 }
            }
          }]
        ]),
        biasWarnings: []
      } as any;
      
      const result = await generateRecommendations({
        headerPatterns,
        metaPatterns: new Map(),
        scriptPatterns: new Map(),
        dataPoints,
        biasAnalysis: mockBiasAnalysis, // Provide the mock bias analysis
        options: {
          dataSource: 'cms-analysis',
          dataDir: './data',
          minSites: 100,
          minOccurrences: 1,
          pageType: 'all',
          output: 'human',
          outputFile: '',
          includeRecommendations: true,
          includeCurrentFilters: true,
          debugCalculations: false
        }
      });
      
      const wpGeneratorOpp = result.detectCms.newPatternOpportunities.find(
        p => p.pattern === 'x-generator'
      );
      expect(wpGeneratorOpp).toBeDefined();
      // Updated correlation to meet 0.8 threshold for newPatternOpportunities
      expect(wpGeneratorOpp!.cmsCorrelation['WordPress']).toBeCloseTo(0.85, 1);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty patterns gracefully', async () => {
      const result = await generateRecommendations({
        headerPatterns: new Map(),
        metaPatterns: new Map(),
        scriptPatterns: new Map(),
        dataPoints: [],
        options: {
          dataSource: 'cms-analysis',
          dataDir: './data',
          minSites: 100,
          minOccurrences: 1,
          pageType: 'all',
          output: 'human',
          outputFile: '',
          includeRecommendations: true,
          includeCurrentFilters: true,
          debugCalculations: false
        }
      });
      
      expect(result.learn.currentlyFiltered.length).toBeGreaterThan(0); // Should have default filters
      expect(result.learn.recommendToFilter).toEqual([]);
      expect(result.learn.recommendToKeep).toEqual([]);
      expect(result.detectCms.newPatternOpportunities).toEqual([]);
      expect(result.detectCms.patternsToRefine).toEqual([]);
      expect(result.groundTruth.potentialNewRules).toEqual([]);
    });
    
    it('should handle patterns with no CMS data', async () => {
      const headerPatterns = new Map([
        ['x-custom', [
          { pattern: 'x-custom:value', frequency: 0.1, confidence: 0.5, occurrences: 10, examples: ['value'], cmsCorrelation: {} }
        ]]
      ]);
      
      // Data points with no CMS detection results
      const dataPoints = [
        { url: 'site1.com', headers: { 'x-custom': 'value' }, detectionResults: [] }
      ] as any;
      
      const result = await generateRecommendations({
        headerPatterns,
        metaPatterns: new Map(),
        scriptPatterns: new Map(),
        dataPoints,
        options: {
          dataSource: 'cms-analysis',
          dataDir: './data',
          minSites: 100,
          minOccurrences: 1,
          pageType: 'all',
          output: 'human',
          outputFile: '',
          includeRecommendations: true,
          includeCurrentFilters: true,
          debugCalculations: false
        }
      });
      
      // Should not crash and should handle gracefully
      expect(result).toBeDefined();
    });
  });
});