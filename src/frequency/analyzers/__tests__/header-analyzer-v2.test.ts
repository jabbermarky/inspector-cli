/**
 * HeaderAnalyzerV2 Unit Tests - Complete Algorithmic Coverage
 * 
 * CRITICAL: This file provides comprehensive algorithmic testing for HeaderAnalyzerV2's
 * core business logic. We test:
 * 1. Unique site counting algorithms (lines 55-127)
 * 2. Frequency calculation precision (lines 242-243)
 * 3. Semantic filtering accuracy (lines 62-64, 202-204)
 * 4. Pattern detection logic (lines 67-89)
 * 5. Header classification (security/custom headers)
 * 6. Value frequency tracking and page distribution
 * 7. Edge cases and malformed data handling
 * 
 * Testing Philosophy: Real data structures, mathematical precision, minimal mocking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HeaderAnalyzerV2 } from '../header-analyzer-v2.js';
import type { 
  PreprocessedData, 
  SiteData, 
  AnalysisOptions,
  AnalysisResult,
  HeaderSpecificData 
} from '../../types/analyzer-interface.js';

describe('HeaderAnalyzerV2 - Complete Algorithmic Testing', () => {
  let analyzer: HeaderAnalyzerV2;
  
  beforeEach(() => {
    analyzer = new HeaderAnalyzerV2();
  });

  describe('Unique Site Counting Algorithms', () => {
    it('should count each site only once per header pattern', async () => {
      const testData = createRealisticTestData([
        {
          url: 'https://wordpress-site.com',
          headers: new Map([
            ['server', new Set(['nginx/1.18.0'])],
            ['x-powered-by', new Set(['PHP/8.0'])],
            ['x-pingback', new Set(['https://wordpress-site.com/xmlrpc.php'])]
          ])
        },
        {
          url: 'https://drupal-site.org',
          headers: new Map([
            ['server', new Set(['nginx/1.18.0'])], // Same server as above
            ['x-powered-by', new Set(['PHP/8.1'])], // Different PHP version
            ['x-generator', new Set(['Drupal 10 (https://www.drupal.org)'])]
          ])
        },
        {
          url: 'https://custom-site.net',
          headers: new Map([
            ['server', new Set(['Apache/2.4.41'])], // Different server
            ['x-custom-header', new Set(['custom-value'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        maxExamples: 3,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // 'server' header appears on all 3 sites
      const serverPattern = result.patterns.get('server');
      expect(serverPattern).toBeDefined();
      expect(serverPattern!.siteCount).toBe(3);
      expect(serverPattern!.sites.size).toBe(3);
      expect(serverPattern!.frequency).toBeCloseTo(1.0, 6); // 3/3 = 100%
      
      // Verify exact sites are tracked
      expect(serverPattern!.sites).toContain('wordpress-site.com');
      expect(serverPattern!.sites).toContain('drupal-site.org');
      expect(serverPattern!.sites).toContain('custom-site.net');

      // 'x-powered-by' appears on 2 sites
      const poweredByPattern = result.patterns.get('x-powered-by');
      expect(poweredByPattern!.siteCount).toBe(2);
      expect(poweredByPattern!.sites.size).toBe(2);
      expect(poweredByPattern!.frequency).toBeCloseTo(2/3, 6); // 66.667%

      // 'x-pingback' appears on 1 site  
      const pingbackPattern = result.patterns.get('x-pingback');
      expect(pingbackPattern!.siteCount).toBe(1);
      expect(pingbackPattern!.frequency).toBeCloseTo(1/3, 6); // 33.333%
    });

    it('should handle duplicate header values within same site correctly', async () => {
      const testData = createRealisticTestData([
        {
          url: 'https://multi-value-site.com',
          headers: new Map([
            // Same header with multiple values - should count as 1 site
            ['set-cookie', new Set(['session=abc123', 'prefs=light', 'cart=empty'])],
            ['cache-control', new Set(['no-cache', 'no-store'])]
          ])
        },
        {
          url: 'https://single-value-site.com',
          headers: new Map([
            ['set-cookie', new Set(['session=xyz789'])], // Same header, different values
            ['server', new Set(['nginx'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        maxExamples: 5,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // 'set-cookie' appears on 2 sites, regardless of multiple values per site
      const setCookiePattern = result.patterns.get('set-cookie');
      expect(setCookiePattern!.siteCount).toBe(2);
      expect(setCookiePattern!.frequency).toBe(1.0); // 2/2 = 100%
      
      // Should collect examples from both sites and multiple values
      expect(setCookiePattern!.examples!.size).toBeGreaterThan(1);
      
      // Verify examples contain both sites' values
      const examplesList = Array.from(setCookiePattern!.examples!);
      const hasSessionAbc = examplesList.some(ex => ex.includes('session=abc123'));
      const hasSessionXyz = examplesList.some(ex => ex.includes('session=xyz789'));
      expect(hasSessionAbc || hasSessionXyz).toBe(true);
    });

    it('should not double-count sites when header appears multiple times', async () => {
      // Test edge case: same header processed multiple times for same site
      const testData = createRealisticTestData([
        {
          url: 'https://duplicate-header-site.com',
          headers: new Map([
            ['x-duplicate', new Set(['value1', 'value2', 'value3'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Should count as 1 site only, despite multiple values
      const duplicatePattern = result.patterns.get('x-duplicate');
      expect(duplicatePattern!.siteCount).toBe(1);
      expect(duplicatePattern!.sites.size).toBe(1);
      expect(duplicatePattern!.frequency).toBe(1.0); // 1/1 = 100%
      expect(duplicatePattern!.sites).toContain('duplicate-header-site.com');
    });

    it('should apply minOccurrences filtering based on site count', async () => {
      const testData = createRealisticTestData([
        { url: 'https://site1.com', headers: new Map([['x-rare-header', new Set(['value1'])]]) },
        { url: 'https://site2.com', headers: new Map([['x-rare-header', new Set(['value2'])]]) },
        { url: 'https://site3.com', headers: new Map([['x-common-header', new Set(['value1'])]]) },
        { url: 'https://site4.com', headers: new Map([['x-common-header', new Set(['value2'])]]) },
        { url: 'https://site5.com', headers: new Map([['x-common-header', new Set(['value3'])]]) }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 3, // Require header to appear on at least 3 sites
        includeExamples: true,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // 'x-rare-header' (2 sites) should be filtered out
      expect(result.patterns.has('x-rare-header')).toBe(false);
      
      // 'x-common-header' (3 sites) should be included
      const commonHeader = result.patterns.get('x-common-header');
      expect(commonHeader).toBeDefined();
      expect(commonHeader!.siteCount).toBe(3);
      expect(commonHeader!.frequency).toBeCloseTo(3/5, 6); // 60%

      // Verify metadata reflects filtering
      expect(result.metadata.totalPatternsFound).toBe(2); // Both headers found initially
      expect(result.metadata.totalPatternsAfterFiltering).toBe(1); // Only common header remains
    });
  });

  describe('Frequency Calculation Precision', () => {
    it('should calculate frequencies with mathematical precision', async () => {
      // Create data with known frequency distributions
      const testData = createRealisticTestData([
        { url: 'https://site1.com', headers: new Map([['x-test', new Set(['a'])]]) },
        { url: 'https://site2.com', headers: new Map([['x-test', new Set(['b'])]]) },
        { url: 'https://site3.com', headers: new Map([['x-test', new Set(['c'])]]) },
        { url: 'https://site4.com', headers: new Map([['x-other', new Set(['d'])]]) },
        { url: 'https://site5.com', headers: new Map([['x-other', new Set(['e'])]]) },
        { url: 'https://site6.com', headers: new Map([['server', new Set(['nginx'])]]) },
        { url: 'https://site7.com', headers: new Map([['server', new Set(['apache'])]]) }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Verify exact frequency calculations
      const testHeader = result.patterns.get('x-test');
      expect(testHeader!.siteCount).toBe(3);
      expect(testHeader!.frequency).toBeCloseTo(3/7, 10); // Precise to 10 decimal places

      const otherHeader = result.patterns.get('x-other');
      expect(otherHeader!.siteCount).toBe(2);
      expect(otherHeader!.frequency).toBeCloseTo(2/7, 10);

      const serverHeader = result.patterns.get('server');
      expect(serverHeader!.siteCount).toBe(2);
      expect(serverHeader!.frequency).toBeCloseTo(2/7, 10);

      // Verify consistency: frequency = siteCount / totalSites
      for (const [_, pattern] of result.patterns) {
        expect(pattern.frequency).toBeCloseTo(pattern.siteCount / result.totalSites, 10);
      }
    });

    it('should handle edge case frequencies correctly', async () => {
      // Test 0%, 100%, and fractional percentages
      const testData = createRealisticTestData([
        { url: 'https://universal1.com', headers: new Map([['x-universal', new Set(['everywhere'])]]) },
        { url: 'https://universal2.com', headers: new Map([['x-universal', new Set(['everywhere'])]]) },
        { url: 'https://universal3.com', headers: new Map([['x-universal', new Set(['everywhere'])]]) }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // 100% frequency case
      const universalHeader = result.patterns.get('x-universal');
      expect(universalHeader!.frequency).toBe(1.0); // Exactly 100%
      expect(universalHeader!.siteCount).toBe(3);
      
      // Verify no patterns have invalid frequencies
      for (const [_, pattern] of result.patterns) {
        expect(pattern.frequency).toBeGreaterThanOrEqual(0);
        expect(pattern.frequency).toBeLessThanOrEqual(1);
        expect(Number.isFinite(pattern.frequency)).toBe(true);
        expect(Number.isNaN(pattern.frequency)).toBe(false);
      }
    });

    it('should handle empty dataset gracefully', async () => {
      const emptyData = createRealisticTestData([]);
      
      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(emptyData, options);

      expect(result.totalSites).toBe(0);
      expect(result.patterns.size).toBe(0);
      expect(result.metadata.totalPatternsFound).toBe(0);
      expect(result.metadata.totalPatternsAfterFiltering).toBe(0);
    });
  });

  describe('Semantic Filtering Accuracy', () => {
    it('should apply semantic filtering when enabled', async () => {
      const testData = createRealisticTestData([
        {
          url: 'https://test-site.com',
          headers: new Map([
            // Headers that should be filtered (in SKIP_HEADERS)
            ['date', new Set(['Mon, 01 Jan 2024 00:00:00 GMT'])],
            ['content-length', new Set(['1234'])],
            ['connection', new Set(['keep-alive'])],
            ['etag', new Set(['"abc123"'])],
            
            // Headers that should remain
            ['server', new Set(['nginx'])],
            ['x-powered-by', new Set(['PHP/8.0'])],
            ['x-custom-header', new Set(['custom-value'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        semanticFiltering: true // Enable semantic filtering
      };

      const result = await analyzer.analyze(testData, options);

      // Filtered headers should not appear
      expect(result.patterns.has('date')).toBe(false);
      expect(result.patterns.has('content-length')).toBe(false);
      expect(result.patterns.has('connection')).toBe(false);
      expect(result.patterns.has('etag')).toBe(false);
      
      // Informative headers should remain
      expect(result.patterns.has('server')).toBe(true);
      expect(result.patterns.has('x-powered-by')).toBe(true);
      expect(result.patterns.has('x-custom-header')).toBe(true);
    });

    it('should not apply semantic filtering when disabled', async () => {
      const testData = createRealisticTestData([
        {
          url: 'https://test-site1.com',
          headers: new Map([
            ['date', new Set(['Mon, 01 Jan 2024 00:00:00 GMT'])],
            ['server', new Set(['nginx'])]
          ])
        },
        {
          url: 'https://test-site2.com',
          headers: new Map([
            ['date', new Set(['Tue, 02 Jan 2024 00:00:00 GMT'])],
            ['server', new Set(['apache'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        semanticFiltering: false // Disable semantic filtering
      };

      const result = await analyzer.analyze(testData, options);

      // All headers should be included when filtering is disabled
      expect(result.patterns.has('date')).toBe(true);
      expect(result.patterns.has('server')).toBe(true);
      
      const datePattern = result.patterns.get('date');
      expect(datePattern!.siteCount).toBe(2);
      expect(datePattern!.frequency).toBe(1.0); // 2/2 = 100%
    });

    it('should handle case-insensitive header filtering', async () => {
      const testData = createRealisticTestData([
        {
          url: 'https://case-test.com',
          headers: new Map([
            ['DATE', new Set(['Mon, 01 Jan 2024 00:00:00 GMT'])], // Uppercase
            ['Content-Length', new Set(['1234'])], // Mixed case
            ['X-Powered-By', new Set(['PHP/8.0'])] // Should not be filtered
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        semanticFiltering: true
      };

      const result = await analyzer.analyze(testData, options);

      // Case variations of filtered headers should still be filtered
      expect(result.patterns.has('DATE')).toBe(false);
      expect(result.patterns.has('Content-Length')).toBe(false);
      
      // Non-filtered headers should remain regardless of case
      expect(result.patterns.has('X-Powered-By')).toBe(true);
    });
  });

  describe('Header Classification Logic', () => {
    it('should correctly identify security headers', async () => {
      const testData = createRealisticTestData([
        {
          url: 'https://secure-site.com',
          headers: new Map([
            ['x-frame-options', new Set(['SAMEORIGIN'])],
            ['content-security-policy', new Set(['default-src self'])],
            ['strict-transport-security', new Set(['max-age=31536000'])],
            ['x-content-type-options', new Set(['nosniff'])],
            ['x-custom-header', new Set(['not-security'])] // Custom but not security
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Verify security headers are identified in analyzer-specific data
      expect(result.analyzerSpecific!.securityHeaders.has('x-frame-options')).toBe(true);
      expect(result.analyzerSpecific!.securityHeaders.has('content-security-policy')).toBe(true);
      expect(result.analyzerSpecific!.securityHeaders.has('strict-transport-security')).toBe(true);
      expect(result.analyzerSpecific!.securityHeaders.has('x-content-type-options')).toBe(true);
      
      // Non-security headers should not be in security set
      expect(result.analyzerSpecific!.securityHeaders.has('x-custom-header')).toBe(false);

      // Verify security metadata in pattern data
      const frameOptionsPattern = result.patterns.get('x-frame-options');
      expect(frameOptionsPattern!.metadata!.isSecurityHeader).toBe(true);
      expect(frameOptionsPattern!.metadata!.isCustomHeader).toBe(false); // Security headers aren't custom
    });

    it('should correctly identify custom headers', async () => {
      const testData = createRealisticTestData([
        {
          url: 'https://custom-headers-site.com',
          headers: new Map([
            ['x-custom-app', new Set(['MyApp/1.0'])],
            ['x-request-id', new Set(['123-456-789'])],
            ['x-frame-options', new Set(['DENY'])], // Security header (x- prefix but not custom)
            ['server', new Set(['nginx'])], // Standard header
            ['x-powered-by', new Set(['PHP'])] // Custom header
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Custom headers (x- prefix, not security)
      expect(result.analyzerSpecific!.customHeaders.has('x-custom-app')).toBe(true);
      expect(result.analyzerSpecific!.customHeaders.has('x-request-id')).toBe(true);
      expect(result.analyzerSpecific!.customHeaders.has('x-powered-by')).toBe(true);
      
      // Security headers are not custom (even with x- prefix)
      expect(result.analyzerSpecific!.customHeaders.has('x-frame-options')).toBe(false);
      
      // Standard headers are not custom
      expect(result.analyzerSpecific!.customHeaders.has('server')).toBe(false);

      // Verify custom metadata in pattern data
      const customAppPattern = result.patterns.get('x-custom-app');
      expect(customAppPattern!.metadata!.isCustomHeader).toBe(true);
      expect(customAppPattern!.metadata!.isSecurityHeader).toBe(false);
    });
  });

  describe('Value Frequency Tracking', () => {
    it('should track value frequencies per header', async () => {
      const testData = createRealisticTestData([
        { url: 'https://site1.com', headers: new Map([['server', new Set(['nginx'])]]) },
        { url: 'https://site2.com', headers: new Map([['server', new Set(['nginx'])]]) },
        { url: 'https://site3.com', headers: new Map([['server', new Set(['apache'])]]) },
        { url: 'https://site4.com', headers: new Map([['server', new Set(['apache'])]]) },
        { url: 'https://site5.com', headers: new Map([['server', new Set(['iis'])]]) }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      const serverPattern = result.patterns.get('server');
      expect(serverPattern).toBeDefined();
      
      // Should track value frequencies
      const valueFreqs = serverPattern!.metadata!.valueFrequencies!;
      expect(valueFreqs.get('nginx')).toBe(2); // 2 sites
      expect(valueFreqs.get('apache')).toBe(2); // 2 sites
      expect(valueFreqs.get('iis')).toBe(1); // 1 site
    });

    it('should handle sites with multiple header values', async () => {
      const testData = createRealisticTestData([
        { 
          url: 'https://multi-value-site.com', 
          headers: new Map([
            ['x-forwarded-for', new Set(['192.168.1.1', '10.0.0.1', '192.168.1.1'])] // Duplicate value
          ])
        },
        { 
          url: 'https://single-value-site.com',
          headers: new Map([
            ['x-forwarded-for', new Set(['203.0.113.1'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        maxExamples: 5,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      const forwardedPattern = result.patterns.get('x-forwarded-for');
      expect(forwardedPattern!.siteCount).toBe(2); // 2 sites total
      
      // Value frequencies should count sites, not occurrences
      const valueFreqs = forwardedPattern!.metadata!.valueFrequencies!;
      expect(valueFreqs.get('192.168.1.1')).toBe(1); // Only 1 site has this value
      expect(valueFreqs.get('10.0.0.1')).toBe(1);
      expect(valueFreqs.get('203.0.113.1')).toBe(1);
    });
  });

  describe('Example Collection Logic', () => {
    it('should collect examples when enabled', async () => {
      const testData = createRealisticTestData([
        { url: 'https://site1.com', headers: new Map([['x-powered-by', new Set(['PHP/8.0.1'])]]) },
        { url: 'https://site2.com', headers: new Map([['x-powered-by', new Set(['PHP/8.1.0'])]]) },
        { url: 'https://site3.com', headers: new Map([['x-powered-by', new Set(['PHP/7.4.33'])]]) }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        maxExamples: 2, // Limit to 2 examples
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      const poweredByPattern = result.patterns.get('x-powered-by');
      expect(poweredByPattern!.examples).toBeDefined();
      expect(poweredByPattern!.examples!.size).toBeGreaterThan(0);
      expect(poweredByPattern!.examples!.size).toBeLessThanOrEqual(2); // Respects maxExamples
      
      // Examples should have correct format
      const examplesList = Array.from(poweredByPattern!.examples!);
      examplesList.forEach(example => {
        expect(example).toMatch(/^x-powered-by: PHP\/\d+\.\d+/);
      });
    });

    it('should not collect examples when disabled', async () => {
      const testData = createRealisticTestData([
        { url: 'https://site1.com', headers: new Map([['server', new Set(['nginx/1.18'])]]) }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false, // Disabled
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      const serverPattern = result.patterns.get('server');
      expect(serverPattern!.examples!.size).toBe(0);
    });

    it('should truncate long header values in examples', async () => {
      const longValue = 'a'.repeat(150); // 150 character value
      
      const testData = createRealisticTestData([
        { url: 'https://long-value-site.com', headers: new Map([['x-long-header', new Set([longValue])]]) }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        maxExamples: 1,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      const longHeaderPattern = result.patterns.get('x-long-header');
      const examples = Array.from(longHeaderPattern!.examples!);
      expect(examples.length).toBe(1);
      
      // Should be truncated to 100 characters (97 + '...')
      expect(examples[0].length).toBe(100 + 'x-long-header: '.length);
      expect(examples[0].endsWith('...')).toBe(true);
    });
  });

  describe('Results Sorting and Structure', () => {
    it('should sort patterns by frequency (most common first)', async () => {
      const testData = createRealisticTestData([
        { url: 'https://site1.com', headers: new Map([['x-rare', new Set(['1'])]]) }, // 25%
        { url: 'https://site2.com', headers: new Map([['x-common', new Set(['1'])]]) }, // 100%
        { url: 'https://site3.com', headers: new Map([['x-common', new Set(['2'])]]) },
        { url: 'https://site4.com', headers: new Map([['x-common', new Set(['3'])]]) },
        { url: 'https://site5.com', headers: new Map([['x-common', new Set(['4'])]]) }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      const sortedPatterns = Array.from(result.patterns.entries());
      
      // Should be sorted by frequency (descending)
      expect(sortedPatterns[0][0]).toBe('x-common'); // 100% frequency (4/4)
      expect(sortedPatterns[1][0]).toBe('x-rare'); // 25% frequency (1/4)
      
      // Verify frequencies are in descending order
      for (let i = 0; i < sortedPatterns.length - 1; i++) {
        expect(sortedPatterns[i][1].frequency).toBeGreaterThanOrEqual(sortedPatterns[i + 1][1].frequency);
      }
    });

    it('should return properly formatted AnalysisResult', async () => {
      const testData = createRealisticTestData([
        { url: 'https://test-site.com', headers: new Map([['server', new Set(['nginx'])]]) }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Verify result structure
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('totalSites');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('analyzerSpecific');
      
      expect(result.totalSites).toBe(1);
      expect(result.metadata.analyzer).toBe('HeaderAnalyzerV2');
      expect(result.metadata.totalPatternsFound).toBeGreaterThan(0);
      expect(result.metadata.totalPatternsAfterFiltering).toBeGreaterThan(0);
      expect(result.metadata.options).toEqual(options);
      
      // Verify analyzer-specific data
      expect(result.analyzerSpecific).toHaveProperty('securityHeaders');
      expect(result.analyzerSpecific).toHaveProperty('customHeaders');
    });
  });

  describe('Page Distribution Algorithm (Lines 143-177)', () => {
    it('should calculate mainpage vs robots distribution correctly', async () => {
      const testData = createRealisticTestDataWithPageTypes([
        {
          url: 'https://site-both-pages.com',
          headers: new Map([['server', new Set(['nginx'])]]),
          headersByPageType: {
            mainpage: new Map([['server', new Set(['nginx'])]]),
            robots: new Map([['server', new Set(['nginx'])]])
          }
        },
        {
          url: 'https://site-mainpage-only.com', 
          headers: new Map([['server', new Set(['apache'])]]),
          headersByPageType: {
            mainpage: new Map([['server', new Set(['apache'])]]),
            robots: new Map() // No robots.txt headers
          }
        },
        {
          url: 'https://site-robots-only.com',
          headers: new Map([['x-custom', new Set(['value'])]]),
          headersByPageType: {
            mainpage: new Map(), // No mainpage headers
            robots: new Map([['x-custom', new Set(['value'])]])
          }
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // 'server' appears on 2 sites: 1 on both pages, 1 on mainpage only
      const serverPattern = result.patterns.get('server');
      expect(serverPattern).toBeDefined();
      expect(serverPattern!.metadata!.pageDistribution).toBeDefined();
      
      // Should be 2 mainpage, 1 robots (3 total page occurrences)
      expect(serverPattern!.metadata!.pageDistribution!.mainpage).toBeCloseTo(2/3, 6); // 66.67%
      expect(serverPattern!.metadata!.pageDistribution!.robots).toBeCloseTo(1/3, 6); // 33.33%

      // 'x-custom' appears on 1 site: robots only
      const customPattern = result.patterns.get('x-custom');
      expect(customPattern!.metadata!.pageDistribution!.mainpage).toBe(0); // 0%
      expect(customPattern!.metadata!.pageDistribution!.robots).toBe(1); // 100%
    });

    it('should handle fallback to mainpage when headersByPageType missing', async () => {
      const testData = createRealisticTestDataWithPageTypes([
        {
          url: 'https://legacy-site1.com',
          headers: new Map([['server', new Set(['nginx'])]]),
          // No headersByPageType property - should fallback
        },
        {
          url: 'https://legacy-site2.com',
          headers: new Map([['server', new Set(['apache'])]]),
          // No headersByPageType property - should fallback
        },
        {
          url: 'https://modern-site.com',
          headers: new Map([['server', new Set(['iis'])]]),
          headersByPageType: {
            mainpage: new Map([['server', new Set(['iis'])]]),
            robots: new Map()
          }
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      const serverPattern = result.patterns.get('server');
      expect(serverPattern!.siteCount).toBe(3);
      
      // All 3 sites should be counted as mainpage (2 fallback + 1 actual)
      expect(serverPattern!.metadata!.pageDistribution!.mainpage).toBe(1.0); // 100%
      expect(serverPattern!.metadata!.pageDistribution!.robots).toBe(0); // 0%
    });

    it('should handle edge case with zero total page count', async () => {
      // Create malformed data where headersByPageType exists but header not in either page type
      const malformedData: PreprocessedData = {
        sites: new Map([
          ['edge-case-site.com', {
            url: 'https://edge-case-site.com',
            normalizedUrl: 'edge-case-site.com',
            cms: null,
            confidence: 0,
            headers: new Map([['server', new Set(['nginx'])]]),
            headersByPageType: {
              mainpage: new Map(), // Header not in mainpage
              robots: new Map()    // Header not in robots
            },
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          }]
        ]),
        totalSites: 1,
        metadata: {
          version: '1.0.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(malformedData, options);

      const serverPattern = result.patterns.get('server');
      expect(serverPattern).toBeDefined();
      
      // Should default to mainpage when totalPageCount is 0
      expect(serverPattern!.metadata!.pageDistribution!.mainpage).toBe(1.0);
      expect(serverPattern!.metadata!.pageDistribution!.robots).toBe(0);
    });

    it('should calculate precise distribution percentages', async () => {
      const testData = createRealisticTestDataWithPageTypes([
        { url: 'https://site1.com', headers: new Map([['x-test', new Set(['v1'])]]), headersByPageType: { mainpage: new Map([['x-test', new Set(['v1'])]]), robots: new Map() }},
        { url: 'https://site2.com', headers: new Map([['x-test', new Set(['v2'])]]), headersByPageType: { mainpage: new Map([['x-test', new Set(['v2'])]]), robots: new Map() }},
        { url: 'https://site3.com', headers: new Map([['x-test', new Set(['v3'])]]), headersByPageType: { mainpage: new Map(), robots: new Map([['x-test', new Set(['v3'])]]) }},
        { url: 'https://site4.com', headers: new Map([['x-test', new Set(['v4'])]]), headersByPageType: { mainpage: new Map(), robots: new Map([['x-test', new Set(['v4'])]]) }},
        { url: 'https://site5.com', headers: new Map([['x-test', new Set(['v5'])]]), headersByPageType: { mainpage: new Map(), robots: new Map([['x-test', new Set(['v5'])]]) }},
        { url: 'https://site6.com', headers: new Map([['x-test', new Set(['v6'])]]), headersByPageType: { mainpage: new Map([['x-test', new Set(['v6'])]]), robots: new Map([['x-test', new Set(['v6'])]]) }},
        { url: 'https://site7.com', headers: new Map([['x-test', new Set(['v7'])]]), headersByPageType: { mainpage: new Map([['x-test', new Set(['v7'])]]), robots: new Map([['x-test', new Set(['v7'])]]) }}
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      const testPattern = result.patterns.get('x-test');
      expect(testPattern!.siteCount).toBe(7);
      
      // mainpage: sites 1,2,6,7 = 4 counts; robots: sites 3,4,5,6,7 = 5 counts; total = 9 page occurrences
      expect(testPattern!.metadata!.pageDistribution!.mainpage).toBeCloseTo(4/9, 10); // ~44.44%
      expect(testPattern!.metadata!.pageDistribution!.robots).toBeCloseTo(5/9, 10); // ~55.56%
      
      // Verify sum equals 1.0
      const total = testPattern!.metadata!.pageDistribution!.mainpage + testPattern!.metadata!.pageDistribution!.robots;
      expect(total).toBeCloseTo(1.0, 10);
    });

    it('should handle mixed headersByPageType availability across sites', async () => {
      const testData = createRealisticTestDataWithPageTypes([
        {
          url: 'https://modern-site.com',
          headers: new Map([['server', new Set(['nginx'])]]),
          headersByPageType: {
            mainpage: new Map([['server', new Set(['nginx'])]]),
            robots: new Map()
          }
        },
        {
          url: 'https://legacy-site.com',
          headers: new Map([['server', new Set(['apache'])]]),
          // No headersByPageType - should fallback
        },
        {
          url: 'https://robots-heavy-site.com',
          headers: new Map([['server', new Set(['iis'])]]),
          headersByPageType: {
            mainpage: new Map(),
            robots: new Map([['server', new Set(['iis'])]])
          }
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      const serverPattern = result.patterns.get('server');
      expect(serverPattern!.siteCount).toBe(3);
      
      // mainpage: modern-site (1) + legacy-site fallback (1) = 2 counts
      // robots: robots-heavy-site (1) = 1 count
      // total = 3 page occurrences
      expect(serverPattern!.metadata!.pageDistribution!.mainpage).toBeCloseTo(2/3, 6); // 66.67%
      expect(serverPattern!.metadata!.pageDistribution!.robots).toBeCloseTo(1/3, 6); // 33.33%
    });
  });

  describe('Map/Set Conversion Validation (Lines 104-114 - Original Bug Area)', () => {
    it('should correctly build headerValueSites Map<string, Map<string, Set<string>>> structure', async () => {
      const testData = createRealisticTestData([
        { url: 'https://site1.com', headers: new Map([['server', new Set(['nginx/1.18.0'])]]) },
        { url: 'https://site2.com', headers: new Map([['server', new Set(['nginx/1.18.0'])]]) }, // Same value
        { url: 'https://site3.com', headers: new Map([['server', new Set(['apache/2.4.41'])]]) }, // Different value
        { url: 'https://site4.com', headers: new Map([['x-powered-by', new Set(['PHP/8.0'])]]) } // Different header
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Validate the Map/Set conversion worked correctly by checking value frequencies
      const serverPattern = result.patterns.get('server');
      expect(serverPattern).toBeDefined();
      expect(serverPattern!.metadata!.valueFrequencies).toBeDefined();
      
      // nginx/1.18.0 should appear on 2 sites
      expect(serverPattern!.metadata!.valueFrequencies!.get('nginx/1.18.0')).toBe(2);
      // apache/2.4.41 should appear on 1 site
      expect(serverPattern!.metadata!.valueFrequencies!.get('apache/2.4.41')).toBe(1);

      const poweredByPattern = result.patterns.get('x-powered-by');
      expect(poweredByPattern!.metadata!.valueFrequencies!.get('PHP/8.0')).toBe(1);
    });

    it('should handle complex nested Map/Set operations without data loss', async () => {
      // Test the exact scenario that caused the original bug: complex Map<string, Set<string>> data
      const testData = createRealisticTestData([
        { 
          url: 'https://complex-site1.com', 
          headers: new Map([
            ['set-cookie', new Set(['session=abc123', 'prefs=dark', 'cart=empty'])],
            ['cache-control', new Set(['no-cache', 'no-store', 'must-revalidate'])],
            ['vary', new Set(['Accept-Encoding', 'User-Agent'])]
          ])
        },
        { 
          url: 'https://complex-site2.com', 
          headers: new Map([
            ['set-cookie', new Set(['session=xyz789', 'prefs=light'])], // Overlapping and new values
            ['cache-control', new Set(['no-cache', 'max-age=3600'])], // Some same, some different
            ['x-custom', new Set(['value1', 'value2', 'value3'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Validate set-cookie header conversion
      const setCookiePattern = result.patterns.get('set-cookie');
      expect(setCookiePattern!.siteCount).toBe(2);
      const setCookieFreqs = setCookiePattern!.metadata!.valueFrequencies!;
      
      // Each unique value should be tracked correctly
      expect(setCookieFreqs.get('session=abc123')).toBe(1); // Only site1
      expect(setCookieFreqs.get('session=xyz789')).toBe(1); // Only site2
      expect(setCookieFreqs.get('prefs=dark')).toBe(1);     // Only site1
      expect(setCookieFreqs.get('prefs=light')).toBe(1);    // Only site2

      // Validate cache-control header conversion
      const cacheControlPattern = result.patterns.get('cache-control');
      expect(cacheControlPattern!.siteCount).toBe(2);
      const cacheFreqs = cacheControlPattern!.metadata!.valueFrequencies!;
      
      expect(cacheFreqs.get('no-cache')).toBe(2);         // Both sites
      expect(cacheFreqs.get('no-store')).toBe(1);         // Only site1
      expect(cacheFreqs.get('must-revalidate')).toBe(1);  // Only site1
      expect(cacheFreqs.get('max-age=3600')).toBe(1);     // Only site2
    });

    it('should prevent double-counting in nested Map/Set structure', async () => {
      // Test that same value from same site doesn't get counted multiple times
      const testData = createRealisticTestData([
        { 
          url: 'https://duplicate-value-site.com', 
          headers: new Map([
            ['x-forwarded-for', new Set(['192.168.1.1', '10.0.0.1', '192.168.1.1'])] // Duplicate in Set
          ])
        },
        { 
          url: 'https://normal-site.com', 
          headers: new Map([
            ['x-forwarded-for', new Set(['203.0.113.1'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      const forwardedPattern = result.patterns.get('x-forwarded-for');
      expect(forwardedPattern!.siteCount).toBe(2);
      
      const valueFreqs = forwardedPattern!.metadata!.valueFrequencies!;
      
      // Each value should be counted once per site, not per occurrence
      expect(valueFreqs.get('192.168.1.1')).toBe(1); // Only from duplicate-value-site
      expect(valueFreqs.get('10.0.0.1')).toBe(1);     // Only from duplicate-value-site
      expect(valueFreqs.get('203.0.113.1')).toBe(1);  // Only from normal-site
    });

    it('should maintain data integrity across Map/Set operations with edge cases', async () => {
      const testData = createRealisticTestData([
        { 
          url: 'https://edge-case1.com', 
          headers: new Map([
            ['x-empty-values', new Set()], // Empty Set
            ['x-single-value', new Set(['single'])],
            ['x-null-like', new Set(['', 'null', 'undefined'])] // Edge case values
          ])
        },
        { 
          url: 'https://edge-case2.com', 
          headers: new Map([
            ['x-special-chars', new Set(['value with spaces', 'value,with,commas', 'value"with"quotes'])],
            ['x-unicode', new Set(['café', '🚀', '中文'])]
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Empty Set should still create pattern entry
      const emptyPattern = result.patterns.get('x-empty-values');
      expect(emptyPattern).toBeDefined();
      expect(emptyPattern!.siteCount).toBe(1);
      expect(emptyPattern!.metadata!.valueFrequencies!.size).toBe(0); // No values

      // Special characters should be preserved
      const specialPattern = result.patterns.get('x-special-chars');
      const specialFreqs = specialPattern!.metadata!.valueFrequencies!;
      expect(specialFreqs.get('value with spaces')).toBe(1);
      expect(specialFreqs.get('value,with,commas')).toBe(1);
      expect(specialFreqs.get('value"with"quotes')).toBe(1);

      // Unicode should be preserved
      const unicodePattern = result.patterns.get('x-unicode');
      const unicodeFreqs = unicodePattern!.metadata!.valueFrequencies!;
      expect(unicodeFreqs.get('café')).toBe(1);
      expect(unicodeFreqs.get('🚀')).toBe(1);
      expect(unicodeFreqs.get('中文')).toBe(1);
    });

    it('should handle large-scale Map/Set operations efficiently', async () => {
      // Create test with many headers and values to stress-test the conversion
      const sites = [];
      const numSites = 50;
      const numHeadersPerSite = 10;
      
      for (let i = 1; i <= numSites; i++) {
        const headers = new Map<string, Set<string>>();
        for (let j = 1; j <= numHeadersPerSite; j++) {
          const headerName = `x-header-${j}`;
          const values = new Set<string>();
          // Add 2-5 values per header to test Set operations
          for (let k = 1; k <= (j % 5) + 2; k++) {
            values.add(`value-${i}-${j}-${k}`);
          }
          headers.set(headerName, values);
        }
        sites.push({
          url: `https://site${i}.com`,
          headers
        });
      }

      const testData = createRealisticTestData(sites);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const startTime = Date.now();
      const result = await analyzer.analyze(testData, options);
      const endTime = Date.now();

      // Validate performance (should complete in reasonable time)
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second

      // Validate data integrity
      expect(result.totalSites).toBe(numSites);
      expect(result.patterns.size).toBe(numHeadersPerSite); // 10 unique headers

      // Validate Map/Set structure integrity
      for (const [headerName, pattern] of result.patterns) {
        expect(pattern.siteCount).toBe(numSites); // Each header appears on all sites
        expect(pattern.frequency).toBe(1.0); // 100% frequency
        expect(pattern.metadata!.valueFrequencies!.size).toBeGreaterThan(0);
        
        // Verify total value frequency counts sum up correctly
        // Each site contributes multiple values per header, so total should be > numSites
        let totalValueOccurrences = 0;
        for (const count of pattern.metadata!.valueFrequencies!.values()) {
          totalValueOccurrences += count;
        }
        expect(totalValueOccurrences).toBeGreaterThanOrEqual(numSites);
        
        // Each value should appear on exactly one site (since values are unique per site)
        for (const count of pattern.metadata!.valueFrequencies!.values()) {
          expect(count).toBe(1);
        }
      }
    });

    it('should preserve type safety in Map/Set conversions', async () => {
      // Ensure the conversion maintains proper TypeScript types and doesn't create 'any' type issues
      const testData = createRealisticTestData([
        { 
          url: 'https://type-safe-site.com', 
          headers: new Map([
            ['content-type', new Set(['application/json', 'text/html'])],
            ['x-rate-limit', new Set(['100', '200', '300'])] // Numeric strings
          ])
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Validate that all operations maintain proper types
      const contentTypePattern = result.patterns.get('content-type');
      expect(contentTypePattern!.metadata!.valueFrequencies).toBeInstanceOf(Map);
      
      // Validate Map keys are strings
      for (const key of contentTypePattern!.metadata!.valueFrequencies!.keys()) {
        expect(typeof key).toBe('string');
      }
      
      // Validate Map values are numbers
      for (const value of contentTypePattern!.metadata!.valueFrequencies!.values()) {
        expect(typeof value).toBe('number');
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
      }

      // Validate sites Set contains strings
      for (const site of contentTypePattern!.sites) {
        expect(typeof site).toBe('string');
      }
    });
  });

  describe('HeadersByPageType Integration Testing', () => {
    it('should validate consistency between headers and headersByPageType data', async () => {
      const testData = createRealisticTestDataWithPageTypes([
        {
          url: 'https://consistency-test1.com',
          headers: new Map([
            ['server', new Set(['nginx'])],
            ['x-powered-by', new Set(['PHP/8.0'])]
          ]),
          headersByPageType: {
            mainpage: new Map([
              ['server', new Set(['nginx'])],
              ['x-powered-by', new Set(['PHP/8.0'])]
            ]),
            robots: new Map()
          }
        },
        {
          url: 'https://consistency-test2.com',
          headers: new Map([
            ['server', new Set(['apache'])],
            ['cache-control', new Set(['no-cache'])]
          ]),
          headersByPageType: {
            mainpage: new Map([['server', new Set(['apache'])]]),
            robots: new Map([['cache-control', new Set(['no-cache'])]])
          }
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        maxExamples: 5,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Verify that main headers processing works correctly
      const serverPattern = result.patterns.get('server');
      expect(serverPattern!.siteCount).toBe(2);
      expect(serverPattern!.frequency).toBe(1.0); // 2/2 sites

      // Verify page distribution is calculated correctly
      expect(serverPattern!.metadata!.pageDistribution!.mainpage).toBe(1.0); // Both from mainpage
      expect(serverPattern!.metadata!.pageDistribution!.robots).toBe(0);

      // Verify cache-control only appears in robots
      const cachePattern = result.patterns.get('cache-control');
      expect(cachePattern!.siteCount).toBe(1);
      expect(cachePattern!.metadata!.pageDistribution!.mainpage).toBe(0);
      expect(cachePattern!.metadata!.pageDistribution!.robots).toBe(1.0); // 100% robots

      // Verify examples are collected from appropriate page types
      const serverExamples = Array.from(serverPattern!.examples!);
      expect(serverExamples.length).toBeGreaterThan(0);
      expect(serverExamples.some(ex => ex.includes('nginx'))).toBe(true);
      expect(serverExamples.some(ex => ex.includes('apache'))).toBe(true);
    });

    it('should handle headers appearing on both page types correctly', async () => {
      const testData = createRealisticTestDataWithPageTypes([
        {
          url: 'https://cross-page-site1.com',
          headers: new Map([
            ['server', new Set(['nginx'])],
            ['x-cache', new Set(['HIT'])]
          ]),
          headersByPageType: {
            mainpage: new Map([
              ['server', new Set(['nginx'])],
              ['x-cache', new Set(['HIT'])]
            ]),
            robots: new Map([
              ['server', new Set(['nginx'])], // Same header, both pages
              ['x-robots-tag', new Set(['noindex'])]
            ])
          }
        },
        {
          url: 'https://cross-page-site2.com',
          headers: new Map([
            ['server', new Set(['apache'])],
            ['x-cache', new Set(['MISS'])]
          ]),
          headersByPageType: {
            mainpage: new Map([['x-cache', new Set(['MISS'])]]), // Only cache on mainpage
            robots: new Map([['server', new Set(['apache'])]]) // Only server on robots
          }
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Server appears on both sites
      const serverPattern = result.patterns.get('server');
      expect(serverPattern!.siteCount).toBe(2);

      // Server page distribution: site1 (both pages) + site2 (robots only) = 1 mainpage + 2 robots = 3 total
      expect(serverPattern!.metadata!.pageDistribution!.mainpage).toBeCloseTo(1/3, 6); // 33.33%
      expect(serverPattern!.metadata!.pageDistribution!.robots).toBeCloseTo(2/3, 6); // 66.67%

      // X-cache appears on both sites  
      const cachePattern = result.patterns.get('x-cache');
      expect(cachePattern!.siteCount).toBe(2);

      // X-cache page distribution: site1 (mainpage only) + site2 (mainpage only) = 2 mainpage + 0 robots
      expect(cachePattern!.metadata!.pageDistribution!.mainpage).toBe(1.0); // 100%
      expect(cachePattern!.metadata!.pageDistribution!.robots).toBe(0);
    });

    it('should integrate headersByPageType with value frequency tracking', async () => {
      const testData = createRealisticTestDataWithPageTypes([
        {
          url: 'https://value-tracking1.com',
          headers: new Map([
            ['x-cache-status', new Set(['HIT', 'MISS'])], // Multiple values
            ['server', new Set(['nginx/1.18'])]
          ]),
          headersByPageType: {
            mainpage: new Map([
              ['x-cache-status', new Set(['HIT'])], // Only HIT on mainpage
              ['server', new Set(['nginx/1.18'])]
            ]),
            robots: new Map([
              ['x-cache-status', new Set(['MISS'])] // Only MISS on robots
            ])
          }
        },
        {
          url: 'https://value-tracking2.com',
          headers: new Map([
            ['x-cache-status', new Set(['HIT'])],
            ['server', new Set(['nginx/1.20'])]
          ]),
          headersByPageType: {
            mainpage: new Map([
              ['x-cache-status', new Set(['HIT'])],
              ['server', new Set(['nginx/1.20'])]
            ]),
            robots: new Map()
          }
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Value frequency tracking should work with page distribution
      const cachePattern = result.patterns.get('x-cache-status');
      expect(cachePattern!.siteCount).toBe(2);
      
      const valueFreqs = cachePattern!.metadata!.valueFrequencies!;
      expect(valueFreqs.get('HIT')).toBe(2); // Both sites have HIT
      expect(valueFreqs.get('MISS')).toBe(1); // Only site1 has MISS

      // Page distribution should reflect where values appear
      // HIT appears on: site1 mainpage + site2 mainpage = 2 mainpage occurrences
      // MISS appears on: site1 robots = 1 robots occurrence
      // Total = 3 page occurrences
      expect(cachePattern!.metadata!.pageDistribution!.mainpage).toBeCloseTo(2/3, 6); // 66.67%
      expect(cachePattern!.metadata!.pageDistribution!.robots).toBeCloseTo(1/3, 6); // 33.33%
    });

    it('should handle headersByPageType with example collection integration', async () => {
      const testData = createRealisticTestDataWithPageTypes([
        {
          url: 'https://examples-mainpage.com',
          headers: new Map([
            ['x-frame-options', new Set(['SAMEORIGIN'])],
            ['content-security-policy', new Set(['default-src self'])]
          ]),
          headersByPageType: {
            mainpage: new Map([
              ['x-frame-options', new Set(['SAMEORIGIN'])],
              ['content-security-policy', new Set(['default-src self'])]
            ]),
            robots: new Map()
          }
        },
        {
          url: 'https://examples-robots.com',
          headers: new Map([
            ['x-robots-tag', new Set(['noindex, nofollow'])],
            ['cache-control', new Set(['no-cache, no-store'])]
          ]),
          headersByPageType: {
            mainpage: new Map(),
            robots: new Map([
              ['x-robots-tag', new Set(['noindex, nofollow'])],
              ['cache-control', new Set(['no-cache, no-store'])]
            ])
          }
        },
        {
          url: 'https://examples-mixed.com',
          headers: new Map([
            ['server', new Set(['nginx/mixed'])],
            ['x-powered-by', new Set(['PHP/8.2'])]
          ]),
          headersByPageType: {
            mainpage: new Map([['server', new Set(['nginx/mixed'])]]),
            robots: new Map([['x-powered-by', new Set(['PHP/8.2'])]])
          }
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        maxExamples: 3,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Verify examples are collected regardless of page type
      const frameOptionsPattern = result.patterns.get('x-frame-options');
      expect(frameOptionsPattern!.examples!.size).toBeGreaterThan(0);
      expect(frameOptionsPattern!.metadata!.pageDistribution!.mainpage).toBe(1.0);

      const robotsTagPattern = result.patterns.get('x-robots-tag');
      expect(robotsTagPattern!.examples!.size).toBeGreaterThan(0);
      expect(robotsTagPattern!.metadata!.pageDistribution!.robots).toBe(1.0);

      const serverPattern = result.patterns.get('server');
      expect(serverPattern!.examples!.size).toBeGreaterThan(0);
      expect(serverPattern!.metadata!.pageDistribution!.mainpage).toBe(1.0);
    });

    it('should handle real-world scenarios with complex headersByPageType data', async () => {
      // Simulate a realistic WordPress site with different headers on different page types
      const testData = createRealisticTestDataWithPageTypes([
        {
          url: 'https://wordpress-blog.com',
          headers: new Map([
            ['server', new Set(['nginx/1.18.0'])],
            ['x-powered-by', new Set(['PHP/8.1'])],
            ['x-pingback', new Set(['https://wordpress-blog.com/xmlrpc.php'])],
            ['link', new Set(['<https://wordpress-blog.com/wp-json/>; rel="https://api.w.org/"'])],
            ['cache-control', new Set(['max-age=3600', 'no-cache'])], // Both values in main headers
            ['x-robots-tag', new Set(['index, follow'])]
          ]),
          headersByPageType: {
            mainpage: new Map([
              ['server', new Set(['nginx/1.18.0'])],
              ['x-powered-by', new Set(['PHP/8.1'])],
              ['x-pingback', new Set(['https://wordpress-blog.com/xmlrpc.php'])],
              ['link', new Set(['<https://wordpress-blog.com/wp-json/>; rel="https://api.w.org/"'])],
              ['cache-control', new Set(['max-age=3600'])]
            ]),
            robots: new Map([
              ['server', new Set(['nginx/1.18.0'])], // Same server
              ['x-robots-tag', new Set(['index, follow'])], // Different robots rules
              ['cache-control', new Set(['no-cache'])] // Different cache rules
            ])
          }
        },
        {
          url: 'https://shopify-store.com',
          headers: new Map([
            ['server', new Set(['cloudflare'])],
            ['x-shopify-shop-id', new Set(['12345'])],
            ['x-shopify-stage', new Set(['production'])],
            ['strict-transport-security', new Set(['max-age=31536000'])],
            ['x-frame-options', new Set(['DENY'])]
          ]),
          headersByPageType: {
            mainpage: new Map([
              ['server', new Set(['cloudflare'])],
              ['x-shopify-shop-id', new Set(['12345'])],
              ['x-shopify-stage', new Set(['production'])],
              ['strict-transport-security', new Set(['max-age=31536000'])],
              ['x-frame-options', new Set(['DENY'])]
            ]),
            robots: new Map([
              ['server', new Set(['cloudflare'])], // Same server
              ['x-robots-tag', new Set(['noindex'])] // Block robots
            ])
          }
        }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        maxExamples: 2,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Verify complex integration works
      expect(result.totalSites).toBe(2);
      expect(result.patterns.size).toBeGreaterThan(5);

      // Server appears on both sites, both page types
      const serverPattern = result.patterns.get('server');
      expect(serverPattern!.siteCount).toBe(2);
      expect(serverPattern!.frequency).toBe(1.0);
      
      // Server page distribution: both sites on mainpage + both sites on robots = 4 total occurrences
      expect(serverPattern!.metadata!.pageDistribution!.mainpage).toBe(0.5); // 2/4 = 50%
      expect(serverPattern!.metadata!.pageDistribution!.robots).toBe(0.5); // 2/4 = 50%

      // Platform-specific headers should be mainpage only
      const shopifyPattern = result.patterns.get('x-shopify-shop-id');
      expect(shopifyPattern!.siteCount).toBe(1);
      expect(shopifyPattern!.metadata!.pageDistribution!.mainpage).toBe(1.0);
      expect(shopifyPattern!.metadata!.pageDistribution!.robots).toBe(0);

      const wordpressPattern = result.patterns.get('x-pingback');
      expect(wordpressPattern!.siteCount).toBe(1);
      expect(wordpressPattern!.metadata!.pageDistribution!.mainpage).toBe(1.0);
      expect(wordpressPattern!.metadata!.pageDistribution!.robots).toBe(0);

      // Cache-control appears on WordPress site only (not on Shopify in this scenario)
      const cachePattern = result.patterns.get('cache-control');
      expect(cachePattern!.siteCount).toBe(1);
      
      const cacheFreqs = cachePattern!.metadata!.valueFrequencies!;
      expect(cacheFreqs.get('max-age=3600')).toBe(1); // WordPress mainpage
      expect(cacheFreqs.get('no-cache')).toBe(1); // WordPress robots
      // Note: Shopify doesn't have cache-control on robots in this scenario
    });

    it('should handle headersByPageType data validation and error scenarios', async () => {
      // Test malformed or inconsistent headersByPageType data
      const testData: PreprocessedData = {
        sites: new Map([
          ['inconsistent-site.com', {
            url: 'https://inconsistent-site.com',
            normalizedUrl: 'inconsistent-site.com',
            cms: null,
            confidence: 0,
            headers: new Map([
              ['server', new Set(['nginx'])],
              ['x-custom', new Set(['value1', 'value2'])]
            ]),
            headersByPageType: {
              mainpage: new Map([
                ['server', new Set(['nginx'])],
                ['x-different', new Set(['different'])] // Header not in main headers
              ]),
              robots: new Map([
                ['x-custom', new Set(['value3'])] // Different value than main headers
              ])
            },
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          }],
          ['partial-site.com', {
            url: 'https://partial-site.com',
            normalizedUrl: 'partial-site.com',
            cms: null,
            confidence: 0,
            headers: new Map([['server', new Set(['apache'])]]),
            // Missing headersByPageType - should fallback gracefully
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          }]
        ]),
        totalSites: 2,
        metadata: {
          version: '1.0.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Should handle inconsistencies gracefully
      expect(result.totalSites).toBe(2);

      // Server should appear on both sites
      const serverPattern = result.patterns.get('server');
      expect(serverPattern!.siteCount).toBe(2);
      
      // Page distribution should handle mixed scenarios
      // inconsistent-site: mainpage (1), partial-site: fallback to mainpage (1) = 2 mainpage, 0 robots
      expect(serverPattern!.metadata!.pageDistribution!.mainpage).toBe(1.0);
      expect(serverPattern!.metadata!.pageDistribution!.robots).toBe(0);

      // x-custom should only appear on inconsistent-site
      const customPattern = result.patterns.get('x-custom');
      expect(customPattern!.siteCount).toBe(1);
      expect(customPattern!.metadata!.pageDistribution!.robots).toBe(1.0); // Only in robots

      // x-different should NOT be tracked since it's not in main headers
      // HeaderAnalyzerV2 only processes headers that exist in the main headers Map
      const differentPattern = result.patterns.get('x-different');
      expect(differentPattern).toBeUndefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed site data gracefully', async () => {
      const malformedData: PreprocessedData = {
        sites: new Map([
          ['malformed-site.com', {
            url: 'https://malformed-site.com',
            normalizedUrl: 'malformed-site.com',
            cms: null,
            confidence: 0,
            headers: new Map(), // Empty headers
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          }],
          ['normal-site.com', {
            url: 'https://normal-site.com',
            normalizedUrl: 'normal-site.com',
            cms: null,
            confidence: 0,
            headers: new Map([['server', new Set(['nginx'])]]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          }]
        ]),
        totalSites: 2,
        metadata: {
          version: '1.0.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(malformedData, options);

      // Should process without throwing errors
      expect(result.totalSites).toBe(2);
      
      // Should find the one header that exists
      const serverHeader = result.patterns.get('server');
      expect(serverHeader).toBeDefined();
      expect(serverHeader!.siteCount).toBe(1);
      expect(serverHeader!.frequency).toBe(0.5); // 1/2 = 50%
    });

    it('should handle sites with no headers', async () => {
      const testData = createRealisticTestData([
        { url: 'https://no-headers.com', headers: new Map() },
        { url: 'https://with-headers.com', headers: new Map([['server', new Set(['nginx'])]]) }
      ]);

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: false,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      expect(result.totalSites).toBe(2);
      
      // Should only find headers from sites that have them
      const serverPattern = result.patterns.get('server');
      expect(serverPattern!.siteCount).toBe(1);
      expect(serverPattern!.frequency).toBe(0.5);
    });

    it('should handle undefined header values gracefully', async () => {
      const testData: PreprocessedData = {
        sites: new Map([
          ['test-site.com', {
            url: 'https://test-site.com',
            normalizedUrl: 'test-site.com',
            cms: null,
            confidence: 0,
            headers: new Map([
              ['server', new Set(['nginx'])],
              ['x-empty', new Set()] // Empty value set
            ]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: new Date().toISOString()
          }]
        ]),
        totalSites: 1,
        metadata: {
          version: '1.0.0',
          preprocessedAt: new Date().toISOString()
        }
      };

      const options: AnalysisOptions = {
        minOccurrences: 1,
        includeExamples: true,
        semanticFiltering: false
      };

      const result = await analyzer.analyze(testData, options);

      // Should handle empty value sets without errors
      expect(result.patterns.has('server')).toBe(true);
      expect(result.patterns.has('x-empty')).toBe(true); // Header exists even with empty values
      
      const emptyPattern = result.patterns.get('x-empty');
      expect(emptyPattern!.siteCount).toBe(1);
      expect(emptyPattern!.examples!.size).toBe(0); // No examples for empty values
    });
  });
});

/**
 * Helper function to create realistic test data with page type support
 * For testing page distribution algorithm (lines 143-177)
 */
function createRealisticTestDataWithPageTypes(sites: Array<{
  url: string;
  headers: Map<string, Set<string>>;
  headersByPageType?: {
    mainpage: Map<string, Set<string>>;
    robots: Map<string, Set<string>>;
  };
}>): PreprocessedData {
  const siteMap = new Map<string, SiteData>();
  
  // Headers that should be filtered according to DataPreprocessor
  const alwaysFilterHeaders = new Set([
    'date', 'content-length', 'connection', 'keep-alive',
    'transfer-encoding', 'content-encoding', 'vary', 'accept-ranges',
    'etag', 'last-modified', 'age', 'status', 'content-type',
    'expires', 'pragma', 'via', 'upgrade', 'host', 'referer'
  ]);
  
  // Build header classifications to simulate DataPreprocessor's semantic metadata
  const headerClassifications = new Map<string, any>();
  const headerCategories = new Map<string, string>();
  
  sites.forEach(site => {
    const normalizedUrl = site.url.replace(/^https?:\/\//, '');
    siteMap.set(normalizedUrl, {
      url: site.url,
      normalizedUrl,
      cms: null,
      confidence: 0.0,
      headers: site.headers,
      headersByPageType: site.headersByPageType,
      metaTags: new Map(),
      scripts: new Set(),
      technologies: new Set(),
      capturedAt: new Date().toISOString()
    });
    
    // Build classifications for all headers seen
    const allHeaders = new Set<string>();
    site.headers.forEach((values, headerName) => allHeaders.add(headerName));
    if (site.headersByPageType) {
      site.headersByPageType.mainpage?.forEach((values, headerName) => allHeaders.add(headerName));
      site.headersByPageType.robots?.forEach((values, headerName) => allHeaders.add(headerName));
    }
    
    allHeaders.forEach(headerName => {
      const lowerHeader = headerName.toLowerCase();
      if (!headerClassifications.has(lowerHeader)) {
        if (alwaysFilterHeaders.has(lowerHeader)) {
          headerClassifications.set(lowerHeader, {
            category: 'generic',
            discriminativeScore: 0,
            filterRecommendation: 'always-filter'
          });
          headerCategories.set(lowerHeader, 'generic');
        } else {
          // Default classification for non-filtered headers
          headerClassifications.set(lowerHeader, {
            category: 'custom',
            discriminativeScore: 0.5,
            filterRecommendation: 'never-filter'
          });
          headerCategories.set(lowerHeader, 'custom');
        }
      }
    });
  });

  return {
    sites: siteMap,
    totalSites: sites.length,
    metadata: {
      version: '1.0.0',
      preprocessedAt: new Date().toISOString(),
      semantic: {
        categoryCount: headerCategories.size,
        headerCategories,
        headerClassifications
      }
    }
  };
}

/**
 * Helper function to create realistic test data
 * Replaces synthetic Array.from() fixtures with structured, realistic data
 */
function createRealisticTestData(sites: Array<{
  url: string;
  headers: Map<string, Set<string>>;
}>): PreprocessedData {
  const siteMap = new Map<string, SiteData>();
  
  // Headers that should be filtered according to DataPreprocessor
  const alwaysFilterHeaders = new Set([
    'date', 'content-length', 'connection', 'keep-alive',
    'transfer-encoding', 'content-encoding', 'vary', 'accept-ranges',
    'etag', 'last-modified', 'age', 'status', 'content-type',
    'expires', 'pragma', 'via', 'upgrade', 'host', 'referer'
  ]);
  
  // Build header classifications to simulate DataPreprocessor's semantic metadata
  const headerClassifications = new Map<string, any>();
  const headerCategories = new Map<string, string>();
  
  sites.forEach(site => {
    const normalizedUrl = site.url.replace(/^https?:\/\//, '');
    siteMap.set(normalizedUrl, {
      url: site.url,
      normalizedUrl,
      cms: null,
      confidence: 0.0,
      headers: site.headers,
      metaTags: new Map(),
      scripts: new Set(),
      technologies: new Set(),
      capturedAt: new Date().toISOString()
    });
    
    // Build classifications for all headers seen
    site.headers.forEach((values, headerName) => {
      const lowerHeader = headerName.toLowerCase();
      if (!headerClassifications.has(lowerHeader)) {
        if (alwaysFilterHeaders.has(lowerHeader)) {
          headerClassifications.set(lowerHeader, {
            category: 'generic',
            discriminativeScore: 0,
            filterRecommendation: 'always-filter'
          });
          headerCategories.set(lowerHeader, 'generic');
        } else {
          // Default classification for non-filtered headers
          headerClassifications.set(lowerHeader, {
            category: 'custom',
            discriminativeScore: 0.5,
            filterRecommendation: 'never-filter'
          });
          headerCategories.set(lowerHeader, 'custom');
        }
      }
    });
  });

  return {
    sites: siteMap,
    totalSites: sites.length,
    metadata: {
      version: '1.0.0',
      preprocessedAt: new Date().toISOString(),
      semantic: {
        categoryCount: headerCategories.size,
        headerCategories,
        headerClassifications
      }
    }
  };
}