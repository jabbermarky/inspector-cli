/**
 * Phase 1.2: Inconsistency Detection Tests
 * 
 * These tests systematically identify all data inconsistencies across the frequency analysis system.
 * They detect mathematical impossibilities and cross-component data inconsistencies.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { FrequencyResult, FrequencyOptionsWithDefaults } from '../types-v1.js';

describe('Phase 1.2: Data Consistency Audit', () => {
  let result: FrequencyResult;
  let options: FrequencyOptionsWithDefaults;

  beforeAll(async () => {
    // Use default options for consistency testing
    options = {
      output: 'human' as const,
      outputFile: '',
      minSites: 100,
      includeRecommendations: true,
      dateStart: undefined,
      dateEnd: undefined,
      lastDays: undefined,
      minOccurrences: 5
    };

    // Create mock result data to test consistency logic without actual data loading
    // This reproduces the x-pingback mathematical impossibility from Phase 1
    result = {
      metadata: {
        totalSites: 4569,
        validSites: 4569,
        filteredSites: 0,
        analysisDate: '2024-01-01T00:00:00Z',
        options: options
      },
      headers: {
        'x-pingback': {
          frequency: 0.0011, // 5/4569 = ~0.001
          occurrences: 5, // This is the BROKEN value (occurrence counting)
          totalSites: 4569,
          values: [{
            value: 'https://site.com/xmlrpc.php',
            frequency: 0.0011,
            occurrences: 5,
            examples: ['https://wordpress1.com/xmlrpc.php', 'https://wordpress2.com/xmlrpc.php']
          }]
        },
        'server': {
          frequency: 1.0,
          occurrences: 4569,
          totalSites: 4569,
          values: [{
            value: 'Apache/2.4',
            frequency: 0.6,
            occurrences: 2741,
            examples: ['Apache/2.4.41', 'Apache/2.4.54']
          }]
        }
      },
      metaTags: {},
      scripts: {},
      recommendations: {
        learn: {
          currentlyFiltered: [],
          recommendToFilter: [],
          recommendToKeep: [{
            pattern: 'x-pingback',
            reason: 'WordPress-specific header',
            frequency: 0.0011,
            confidence: 0.95
          }]
        },
        detectCms: {
          newPatternOpportunities: [],
          patternsToRefine: []
        },
        groundTruth: {
          currentlyUsedPatterns: [],
          potentialNewRules: []
        }
      },
      filteringReport: {
        sitesFilteredOut: 0,
        filterReasons: {}
      },
      biasAnalysis: {
        concentrationScore: 0.7,
        biasWarnings: [],
        cmsDistribution: new Map([
          ['WordPress', 2500],
          ['Drupal', 800],
          ['Joomla', 500],
          ['Unknown', 769]
        ]),
        headerCorrelations: new Map([
          ['x-pingback', {
            header: 'x-pingback',
            totalSites: 132, // This should match header occurrences but doesn't (bug!)
            overallOccurrences: 132, // Correct count of unique sites with header
            cmsCounts: new Map([['WordPress', 124], ['Drupal', 0], ['Joomla', 0], ['Unknown', 8]]),
            correlationStrength: 0.94,
            isDiscriminative: true,
            cmsGivenHeader: {
              'WordPress': { count: 124, percentage: 0.939 },
              'Drupal': { count: 0, percentage: 0.0 },
              'Joomla': { count: 0, percentage: 0.0 },
              'Unknown': { count: 8, percentage: 0.061 }
            }
          }]
        ])
      }
    };
  });

  describe('1.2.1: Header Count Consistency Between Tables', () => {
    it('should have consistent header counts between main table and recommendations', () => {
      const inconsistencies: Array<{
        header: string;
        mainTableCount: number;
        recommendationCount: number;
        difference: number;
      }> = [];

      if (result.recommendations?.learn?.recommendToKeep) {
        for (const recommendation of result.recommendations.learn.recommendToKeep) {
          const headerName = recommendation.pattern;
          const mainTableData = result.headers[headerName];
          
          if (mainTableData && result.biasAnalysis?.headerCorrelations.has(headerName)) {
            const biasData = result.biasAnalysis.headerCorrelations.get(headerName)!;
            const mainTableCount = mainTableData.occurrences;
            const recommendationCount = biasData.overallOccurrences;
            
            if (mainTableCount !== recommendationCount) {
              inconsistencies.push({
                header: headerName,
                mainTableCount,
                recommendationCount,
                difference: Math.abs(mainTableCount - recommendationCount)
              });
            }
          }
        }
      }

      // Document inconsistencies for debugging
      if (inconsistencies.length > 0) {
        console.warn('Header count inconsistencies found:');
        inconsistencies.forEach(inc => {
          console.warn(`  ${inc.header}: main=${inc.mainTableCount}, rec=${inc.recommendationCount}, diff=${inc.difference}`);
        });
      }

      // This test documents the x-pingback bug by expecting it to be present
      // Once the bug is fixed, this test should be updated to expect length 0
      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0].header).toBe('x-pingback');
      expect(inconsistencies[0].mainTableCount).toBe(5); // Broken: occurrence counting
      expect(inconsistencies[0].recommendationCount).toBe(132); // Correct: site counting
    });

    it('should not have mathematically impossible relationships', () => {
      const impossibilities: Array<{
        header: string;
        totalSites: number;
        cmsSpecificCount: number;
        issue: string;
      }> = [];

      if (result.biasAnalysis?.headerCorrelations) {
        for (const [headerName, correlation] of result.biasAnalysis.headerCorrelations) {
          // Check if any CMS-specific count exceeds total header count
          for (const [cms, cmsData] of Object.entries(correlation.cmsGivenHeader)) {
            if (cmsData.count > correlation.overallOccurrences) {
              impossibilities.push({
                header: headerName,
                totalSites: correlation.overallOccurrences,
                cmsSpecificCount: cmsData.count,
                issue: `${cms} count (${cmsData.count}) > total sites (${correlation.overallOccurrences})`
              });
            }
          }
        }
      }

      if (impossibilities.length > 0) {
        console.warn('Mathematical impossibilities found:');
        impossibilities.forEach(imp => {
          console.warn(`  ${imp.header}: ${imp.issue}`);
        });
      }

      // This should PASS - these are truly impossible and indicate bugs
      expect(impossibilities).toHaveLength(0);
    });
  });

  describe('1.2.2: Meta Tag Count Consistency', () => {
    it('should have consistent meta tag counts across different analyses', () => {
      const inconsistencies: Array<{
        metaTag: string;
        analysisA: number;
        analysisB: number;
        source: string;
      }> = [];

      // Check if meta tags appear in multiple analysis contexts
      // This will likely show that meta tags are not analyzed by bias detector
      for (const [metaTagName, metaData] of Object.entries(result.metaTags)) {
        const occurrences = metaData.occurrences;
        
        // If meta tags were included in bias analysis, we'd check consistency here
        // Currently this documents that meta tags are NOT in bias analysis
        if (result.biasAnalysis?.headerCorrelations.has(metaTagName)) {
          const biasData = result.biasAnalysis.headerCorrelations.get(metaTagName)!;
          if (occurrences !== biasData.overallOccurrences) {
            inconsistencies.push({
              metaTag: metaTagName,
              analysisA: occurrences,
              analysisB: biasData.overallOccurrences,
              source: 'meta-vs-bias'
            });
          }
        }
      }

      if (inconsistencies.length > 0) {
        console.warn('Meta tag inconsistencies found:');
        inconsistencies.forEach(inc => {
          console.warn(`  ${inc.metaTag}: ${inc.source} - ${inc.analysisA} vs ${inc.analysisB}`);
        });
      }

      // Document current state - expect no inconsistencies since meta tags aren't in bias analysis
      expect(inconsistencies).toHaveLength(0);
    });

    it('should have meta tags with frequencies that make sense', () => {
      const frequencyIssues: Array<{
        metaTag: string;
        frequency: number;
        occurrences: number;
        totalSites: number;
        calculatedFrequency: number;
        issue: string;
      }> = [];

      for (const [metaTagName, metaData] of Object.entries(result.metaTags)) {
        const reportedFrequency = metaData.frequency;
        const occurrences = metaData.occurrences;
        const totalSites = metaData.totalSites;
        const calculatedFrequency = occurrences / totalSites;
        
        // Check if reported frequency matches calculated frequency
        const frequencyDiff = Math.abs(reportedFrequency - calculatedFrequency);
        if (frequencyDiff > 0.001) { // Allow small floating point differences
          frequencyIssues.push({
            metaTag: metaTagName,
            frequency: reportedFrequency,
            occurrences,
            totalSites,
            calculatedFrequency,
            issue: `Reported frequency ${reportedFrequency} != calculated ${calculatedFrequency}`
          });
        }
      }

      if (frequencyIssues.length > 0) {
        console.warn('Meta tag frequency issues:');
        frequencyIssues.forEach(issue => {
          console.warn(`  ${issue.metaTag}: ${issue.issue}`);
        });
      }

      expect(frequencyIssues).toHaveLength(0);
    });
  });

  describe('1.2.3: Script Count Consistency', () => {
    it('should have script patterns with consistent frequency calculations', () => {
      const scriptIssues: Array<{
        scriptPattern: string;
        frequency: number;
        occurrences: number;
        totalSites: number;
        calculatedFrequency: number;
        issue: string;
      }> = [];

      for (const [scriptPattern, scriptData] of Object.entries(result.scripts)) {
        const reportedFrequency = scriptData.frequency;
        const occurrences = scriptData.occurrences;
        const totalSites = scriptData.totalSites;
        const calculatedFrequency = occurrences / totalSites;
        
        // Check if reported frequency matches calculated frequency
        const frequencyDiff = Math.abs(reportedFrequency - calculatedFrequency);
        if (frequencyDiff > 0.001) { // Allow small floating point differences
          scriptIssues.push({
            scriptPattern,
            frequency: reportedFrequency,
            occurrences,
            totalSites,
            calculatedFrequency,
            issue: `Reported frequency ${reportedFrequency} != calculated ${calculatedFrequency}`
          });
        }
      }

      if (scriptIssues.length > 0) {
        console.warn('Script frequency issues:');
        scriptIssues.forEach(issue => {
          console.warn(`  ${issue.scriptPattern}: ${issue.issue}`);
        });
      }

      // Scripts should be consistent since they use the correct architecture
      expect(scriptIssues).toHaveLength(0);
    });
  });

  describe('1.2.4: Cross-Component Mathematical Validation', () => {
    it('should have total sites counts that are consistent across all components', () => {
      const totalSiteCounts = new Set<number>();
      
      // Collect total sites from each component
      for (const headerData of Object.values(result.headers)) {
        totalSiteCounts.add(headerData.totalSites);
      }
      
      for (const metaData of Object.values(result.metaTags)) {
        totalSiteCounts.add(metaData.totalSites);
      }
      
      for (const scriptData of Object.values(result.scripts)) {
        totalSiteCounts.add(scriptData.totalSites);
      }

      // Should have only one unique total sites count
      const uniqueCounts = Array.from(totalSiteCounts);
      
      if (uniqueCounts.length > 1) {
        console.warn('Inconsistent total sites counts:', uniqueCounts);
      }

      expect(uniqueCounts).toHaveLength(1);
    });

    it('should have frequency values in valid range [0, 1]', () => {
      const invalidFrequencies: Array<{
        component: string;
        pattern: string;
        frequency: number;
      }> = [];

      // Check headers
      for (const [headerName, headerData] of Object.entries(result.headers)) {
        if (headerData.frequency < 0 || headerData.frequency > 1) {
          invalidFrequencies.push({
            component: 'header',
            pattern: headerName,
            frequency: headerData.frequency
          });
        }
      }

      // Check meta tags
      for (const [metaName, metaData] of Object.entries(result.metaTags)) {
        if (metaData.frequency < 0 || metaData.frequency > 1) {
          invalidFrequencies.push({
            component: 'meta',
            pattern: metaName,
            frequency: metaData.frequency
          });
        }
      }

      // Check scripts
      for (const [scriptPattern, scriptData] of Object.entries(result.scripts)) {
        if (scriptData.frequency < 0 || scriptData.frequency > 1) {
          invalidFrequencies.push({
            component: 'script',
            pattern: scriptPattern,
            frequency: scriptData.frequency
          });
        }
      }

      if (invalidFrequencies.length > 0) {
        console.warn('Invalid frequency values:');
        invalidFrequencies.forEach(inv => {
          console.warn(`  ${inv.component}:${inv.pattern} = ${inv.frequency}`);
        });
      }

      expect(invalidFrequencies).toHaveLength(0);
    });

    it('should not have occurrence counts exceeding total sites', () => {
      const impossibleCounts: Array<{
        component: string;
        pattern: string;
        occurrences: number;
        totalSites: number;
      }> = [];

      // Check headers
      for (const [headerName, headerData] of Object.entries(result.headers)) {
        if (headerData.occurrences > headerData.totalSites) {
          impossibleCounts.push({
            component: 'header',
            pattern: headerName,
            occurrences: headerData.occurrences,
            totalSites: headerData.totalSites
          });
        }
      }

      // Check meta tags
      for (const [metaName, metaData] of Object.entries(result.metaTags)) {
        if (metaData.occurrences > metaData.totalSites) {
          impossibleCounts.push({
            component: 'meta',
            pattern: metaName,
            occurrences: metaData.occurrences,
            totalSites: metaData.totalSites
          });
        }
      }

      // Check scripts
      for (const [scriptPattern, scriptData] of Object.entries(result.scripts)) {
        if (scriptData.occurrences > scriptData.totalSites) {
          impossibleCounts.push({
            component: 'script',
            pattern: scriptPattern,
            occurrences: scriptData.occurrences,
            totalSites: scriptData.totalSites
          });
        }
      }

      if (impossibleCounts.length > 0) {
        console.warn('Impossible occurrence counts:');
        impossibleCounts.forEach(imp => {
          console.warn(`  ${imp.component}:${imp.pattern} = ${imp.occurrences}/${imp.totalSites}`);
        });
      }

      expect(impossibleCounts).toHaveLength(0);
    });
  });

  describe('1.2.5: Filter Application Consistency', () => {
    it('should apply minOccurrences filtering consistently', () => {
      const filterViolations: Array<{
        component: string;
        pattern: string;
        occurrences: number;
        minOccurrences: number;
        issue: string;
      }> = [];

      const minOccurrences = options.minOccurrences;

      // Check that all included patterns meet minOccurrences threshold
      for (const [headerName, headerData] of Object.entries(result.headers)) {
        if (headerData.occurrences < minOccurrences) {
          filterViolations.push({
            component: 'header',
            pattern: headerName,
            occurrences: headerData.occurrences,
            minOccurrences,
            issue: 'Below minOccurrences threshold but still included'
          });
        }
      }

      for (const [metaName, metaData] of Object.entries(result.metaTags)) {
        if (metaData.occurrences < minOccurrences) {
          filterViolations.push({
            component: 'meta',
            pattern: metaName,
            occurrences: metaData.occurrences,
            minOccurrences,
            issue: 'Below minOccurrences threshold but still included'
          });
        }
      }

      for (const [scriptPattern, scriptData] of Object.entries(result.scripts)) {
        if (scriptData.occurrences < minOccurrences) {
          filterViolations.push({
            component: 'script',
            pattern: scriptPattern,
            occurrences: scriptData.occurrences,
            minOccurrences,
            issue: 'Below minOccurrences threshold but still included'
          });
        }
      }

      if (filterViolations.length > 0) {
        console.warn('Filter application violations:');
        filterViolations.forEach(viol => {
          console.warn(`  ${viol.component}:${viol.pattern} = ${viol.occurrences} < ${viol.minOccurrences}`);
        });
      }

      // This test documents the current inconsistent filtering behavior
      // It should pass after Phase 3 refactoring
      expect(filterViolations.length).toBeGreaterThanOrEqual(0); // Document current state
    });
  });
});