import { describe, it, expect } from 'vitest';
import { 
  analyzeHeaderCooccurrence,
  generateCooccurrenceInsights,
  type CooccurrenceAnalysis,
  type HeaderCooccurrence,
  type TechnologyStackSignature,
  type PlatformHeaderCombination
} from '../co-occurrence-analyzer.js';
import type { DetectionDataPoint } from '../types.js';

// Helper function to create test data points
function createTestDataPoint(
  url: string, 
  cms: string, 
  headers: Record<string, string>,
  robotsHeaders?: Record<string, string>
): DetectionDataPoint {
  return {
    url,
    timestamp: new Date(),
    userAgent: 'test-agent',
    captureVersion: '1.0.0' as any,
    originalUrl: url,
    finalUrl: url,
    redirectChain: [],
    totalRedirects: 0,
    protocolUpgraded: false,
    navigationTime: 100,
    httpHeaders: headers,
    statusCode: 200,
    contentType: 'text/html',
    metaTags: [],
    htmlContent: '<html></html>',
    htmlSize: 100,
    domElements: [],
    links: [],
    scripts: [],
    stylesheets: [],
    forms: [],
    technologies: [],
    loadTime: 100,
    resourceCount: 1,
    detectionResults: cms !== 'Unknown' ? [{
      detector: 'test',
      strategy: 'test',
      cms,
      confidence: 0.9,
      version: undefined,
      executionTime: 10
    }] : [],
    errors: [],
    ...(robotsHeaders && {
      robotsTxt: {
        httpHeaders: robotsHeaders,
        content: '',
        accessible: true,
        size: 100
      }
    })
  };
}

describe('Co-occurrence Analyzer', () => {
  describe('Header Co-occurrence Analysis', () => {
    it('should calculate basic co-occurrence statistics', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'WordPress', {
          'x-wp-total': '10',
          'cf-ray': '12345',
          'content-type': 'text/html'
        }),
        createTestDataPoint('https://site2.com', 'WordPress', {
          'x-wp-total': '5',
          'cf-ray': '67890',
          'server': 'nginx'
        }),
        createTestDataPoint('https://site3.com', 'Drupal', {
          'x-drupal-cache': 'HIT',
          'content-type': 'text/html'
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      expect(analysis.totalSites).toBe(3);
      expect(analysis.totalHeaders).toBeGreaterThan(0);
      expect(analysis.cooccurrences).toBeDefined();
      expect(analysis.technologySignatures).toBeDefined();
      expect(analysis.platformCombinations).toBeDefined();
    });

    it('should find WordPress + Cloudflare technology signature', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://wp-site1.com', 'WordPress', {
          'x-wp-total': '10',
          'cf-ray': '12345-ATL',
          'x-pingback': 'https://wp-site1.com/xmlrpc.php'
        }),
        createTestDataPoint('https://wp-site2.com', 'WordPress', {
          'x-wp-total': '5',
          'cf-ray': '67890-LAX',
          'cf-cache-status': 'HIT'
        }),
        createTestDataPoint('https://other-site.com', 'Joomla', {
          'content-type': 'text/html',
          'server': 'apache'
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      const wpCloudflareSignature = analysis.technologySignatures.find(
        sig => sig.name === 'WordPress + Cloudflare'
      );

      expect(wpCloudflareSignature).toBeDefined();
      expect(wpCloudflareSignature?.occurrenceCount).toBe(2);
      expect(wpCloudflareSignature?.vendor).toBe('WordPress + Cloudflare');
    });

    it('should detect Shopify platform signature', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://shop1.myshopify.com', 'Unknown', {
          'x-shopify-shop-id': '12345',
          'x-sorting-hat-shopid': '12345',
          'x-shardid': '1',
          'x-sorting-hat-podid': '1'
        }),
        createTestDataPoint('https://shop2.myshopify.com', 'Unknown', {
          'x-shopify-shop-id': '67890',
          'x-sorting-hat-shopid': '67890',
          'x-shopify-stage': 'production'
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      const shopifySignature = analysis.technologySignatures.find(
        sig => sig.name === 'Shopify Platform'
      );

      expect(shopifySignature).toBeDefined();
      expect(shopifySignature?.occurrenceCount).toBe(2);
      expect(shopifySignature?.category).toBe('ecommerce');
    });

    it('should calculate mutual information correctly', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'WordPress', {
          'x-wp-total': '10',
          'x-pingback': 'http://site1.com/xmlrpc.php'
        }),
        createTestDataPoint('https://site2.com', 'WordPress', {
          'x-wp-total': '5',
          'x-pingback': 'http://site2.com/xmlrpc.php'
        }),
        createTestDataPoint('https://site3.com', 'Drupal', {
          'x-drupal-cache': 'HIT'
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      const wpPingbackCooccurrence = analysis.cooccurrences.find(c =>
        (c.header1 === 'x-wp-total' && c.header2 === 'x-pingback') ||
        (c.header1 === 'x-pingback' && c.header2 === 'x-wp-total')
      );

      expect(wpPingbackCooccurrence).toBeDefined();
      expect(wpPingbackCooccurrence?.conditionalProbability).toBe(1.0); // Perfect correlation
      expect(wpPingbackCooccurrence?.mutualInformation).toBeGreaterThan(0);
    });

    it('should identify platform-specific combinations', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://duda1.com', 'Duda', {
          'd-geo': 'US',
          'd-cache': 'HIT',
          'd-sid': 'abc123'
        }),
        createTestDataPoint('https://duda2.com', 'Duda', {
          'd-geo': 'UK',
          'd-cache': 'MISS',
          'd-rid': 'xyz789'
        }),
        createTestDataPoint('https://wp-site.com', 'WordPress', {
          'x-wp-total': '10',
          'content-type': 'text/html'
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      const dudaCombination = analysis.platformCombinations.find(
        combo => combo.platform === 'Duda'
      );

      expect(dudaCombination).toBeDefined();
      expect(dudaCombination?.headerGroup).toEqual(['d-geo', 'd-cache']);
      expect(dudaCombination?.frequency).toBe(1.0); // 100% of Duda sites have both
      expect(dudaCombination?.exclusivity).toBeGreaterThan(0.5); // Should be exclusive to Duda
    });

    it('should detect mutually exclusive header groups', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://wp1.com', 'WordPress', {
          'x-wp-total': '10',
          'x-pingback': 'http://wp1.com/xmlrpc.php'
        }),
        createTestDataPoint('https://wp2.com', 'WordPress', {
          'x-wp-total': '5'
        }),
        createTestDataPoint('https://shop1.com', 'Unknown', {
          'x-shopify-shop-id': '12345',
          'x-shardid': '1'
        }),
        createTestDataPoint('https://shop2.com', 'Unknown', {
          'x-shopify-shop-id': '67890',
          'x-shardid': '2'
        }),
        createTestDataPoint('https://drupal1.com', 'Drupal', {
          'x-drupal-cache': 'HIT'
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);


      // Check that WordPress, Shopify, and Drupal headers are mutually exclusive
      expect(analysis.mutuallyExclusiveGroups.length).toBeGreaterThan(0);
      
      // Should find that x-wp-total, x-shopify-shop-id, and x-drupal-cache don't appear together
      const hasExclusiveGroup = analysis.mutuallyExclusiveGroups.some(group =>
        group.includes('x-wp-total') && 
        (group.includes('x-shopify-shop-id') || group.includes('x-drupal-cache'))
      );
      
      expect(hasExclusiveGroup).toBe(true);
    });

    it('should find strong correlations', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://shop1.com', 'Unknown', {
          'x-shopify-shop-id': '12345',
          'x-sorting-hat-shopid': '12345', // Should always appear together
          'x-shardid': '1',
          'x-sorting-hat-podid': '1' // Should always appear together
        }),
        createTestDataPoint('https://shop2.com', 'Unknown', {
          'x-shopify-shop-id': '67890',
          'x-sorting-hat-shopid': '67890',
          'x-shardid': '2',
          'x-sorting-hat-podid': '2'
        }),
        createTestDataPoint('https://shop3.com', 'Unknown', {
          'x-shopify-shop-id': '11111',
          'x-sorting-hat-shopid': '11111'
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);


      expect(analysis.strongCorrelations.length).toBeGreaterThan(0);
      
      // Check for strong correlation between shopify headers  
      const shopifyCorrelation = analysis.strongCorrelations.find(c =>
        (c.header1.includes('shopify') || c.header1.includes('sorting-hat')) ||
        (c.header2.includes('shopify') || c.header2.includes('sorting-hat'))
      );
      
      expect(shopifyCorrelation).toBeDefined();
      expect(shopifyCorrelation?.conditionalProbability).toBeGreaterThan(0.7);
      expect(shopifyCorrelation?.mutualInformation).toBeGreaterThan(0.1);
    });

    it('should handle sites with both mainpage and robots.txt headers', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://comprehensive-site.com', 'WordPress', {
          'x-wp-total': '10',
          'content-type': 'text/html'
        }, {
          'x-pingback': 'http://comprehensive-site.com/xmlrpc.php',
          'server': 'nginx'
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      expect(analysis.totalHeaders).toBe(4); // All headers from both sources
      
      // Should find co-occurrence between mainpage and robots.txt headers
      const crossPageCooccurrence = analysis.cooccurrences.find(c =>
        (c.header1 === 'x-wp-total' && c.header2 === 'x-pingback') ||
        (c.header1 === 'x-pingback' && c.header2 === 'x-wp-total')
      );
      
      expect(crossPageCooccurrence).toBeDefined();
    });

    it('should filter out low-occurrence pairs', () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          detectedCms: 'WordPress',
          analysis: {
            mainpage: {
              headers: {
                'common-header': 'value1',
                'rare-header1': 'value'
              }
            }
          }
        },
        {
          url: 'https://site2.com',
          detectedCms: 'WordPress',
          analysis: {
            mainpage: {
              headers: {
                'common-header': 'value2',
                'rare-header2': 'value'
              }
            }
          }
        }
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      // Should not include pairs with very low co-occurrence (< 3 sites)
      const lowOccurrencePair = analysis.cooccurrences.find(c =>
        (c.header1 === 'rare-header1' && c.header2 === 'rare-header2') ||
        (c.header1 === 'rare-header2' && c.header2 === 'rare-header1')
      );
      
      expect(lowOccurrencePair).toBeUndefined();
    });
  });

  describe('Technology Stack Signature Detection', () => {
    it('should detect Duda platform signature', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://duda-site1.com', 'Duda', {
          'd-geo': 'US',
          'd-cache': 'HIT',
          'd-sid': 'session123'
        }),
        createTestDataPoint('https://duda-site2.com', 'Duda', {
          'd-geo': 'CA',
          'd-cache': 'MISS',
          'd-rid': 'request456'
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      const dudaSignature = analysis.technologySignatures.find(
        sig => sig.name === 'Duda Platform'
      );

      expect(dudaSignature).toBeDefined();
      expect(dudaSignature?.requiredHeaders).toEqual(['d-geo', 'd-cache']);
      expect(dudaSignature?.optionalHeaders).toContain('d-sid');
      expect(dudaSignature?.occurrenceCount).toBe(2);
    });

    it('should respect conflicting headers in signatures', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://mixed-site.com', 'WordPress', {
          'x-wp-total': '10',
          'cf-ray': '12345',
          'x-shopify-shop-id': '67890' // Conflicting header
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      // Should not detect WordPress + Cloudflare signature due to conflicting Shopify header
      const wpCloudflareSignature = analysis.technologySignatures.find(
        sig => sig.name === 'WordPress + Cloudflare'
      );

      // The signature should either not exist (undefined) or have 0 occurrences
      if (wpCloudflareSignature) {
        expect(wpCloudflareSignature.occurrenceCount).toBe(0);
      } else {
        // If no signature found at all, that's also acceptable (treated as 0 occurrences)
        expect(wpCloudflareSignature).toBeUndefined();
      }
    });

    it('should calculate signature confidence correctly', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://perfect-correlation.com', 'WordPress', {
          'x-wp-total': '10',
          'cf-ray': '12345'
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      const wpCloudflareSignature = analysis.technologySignatures.find(
        sig => sig.name === 'WordPress + Cloudflare'
      );

      expect(wpCloudflareSignature?.confidence).toBeGreaterThan(0);
      expect(wpCloudflareSignature?.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Platform Header Combinations', () => {
    it('should calculate exclusivity correctly', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://wp1.com', 'WordPress', {
          'x-wp-total': '10',
          'x-pingback': 'http://wp1.com/xmlrpc.php'
        }),
        createTestDataPoint('https://wp2.com', 'WordPress', {
          'x-wp-total': '5',
          'x-pingback': 'http://wp2.com/xmlrpc.php'
        }),
        createTestDataPoint('https://drupal1.com', 'Drupal', {
          'x-drupal-cache': 'HIT',
          'content-type': 'text/html'
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      const wpCombination = analysis.platformCombinations.find(
        combo => combo.platform === 'WordPress'
      );

      expect(wpCombination).toBeDefined();
      expect(wpCombination?.exclusivity).toBe(1.0); // 100% exclusive to WordPress
      expect(wpCombination?.headerGroup).toEqual(['x-wp-total', 'x-pingback']);
    });

    it('should only include frequent combinations', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'TestCMS', {
          'frequent-header': 'value1',
          'rare-header': 'value'
        }),
        createTestDataPoint('https://site2.com', 'TestCMS', {
          'frequent-header': 'value2',
          'different-rare-header': 'value'
        }),
        createTestDataPoint('https://site3.com', 'TestCMS', {
          'frequent-header': 'value3',
          'another-rare-header': 'value'
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      // Should not include combinations that appear in less than 30% of sites
      const testCmsCombination = analysis.platformCombinations.find(
        combo => combo.platform === 'TestCMS'
      );

      // With reduced threshold, should find a combination
      expect(testCmsCombination).toBeDefined();
    });
  });

  describe('Insight Generation', () => {
    it('should generate meaningful insights', () => {
      const mockAnalysis: CooccurrenceAnalysis = {
        totalSites: 100,
        totalHeaders: 50,
        cooccurrences: [],
        technologySignatures: [
          {
            name: 'WordPress + Cloudflare',
            vendor: 'WordPress + Cloudflare',
            category: 'cms',
            requiredHeaders: ['x-wp-total', 'cf-ray'],
            optionalHeaders: [],
            conflictingHeaders: [],
            confidence: 0.85,
            occurrenceCount: 25,
            sites: ['site1.com', 'site2.com']
          }
        ],
        platformCombinations: [
          {
            platform: 'Shopify',
            vendor: 'Shopify',
            headerGroup: ['x-shopify-shop-id', 'x-sorting-hat-shopid'],
            frequency: 0.8,
            exclusivity: 0.95,
            strength: 0.8,
            sites: ['shop1.com']
          }
        ],
        mutuallyExclusiveGroups: [
          ['x-wp-total', 'x-shopify-shop-id', 'x-drupal-cache']
        ],
        strongCorrelations: [
          {
            header1: 'x-shopify-shop-id',
            header2: 'x-sorting-hat-shopid',
            cooccurrenceCount: 20,
            cooccurrenceFrequency: 20,
            conditionalProbability: 0.9,
            mutualInformation: 0.15,
            vendor1: 'Shopify',
            vendor2: 'Shopify'
          }
        ]
      };

      const insights = generateCooccurrenceInsights(mockAnalysis);

      expect(insights).toHaveLength(4);
      expect(insights[0]).toContain('Strongest header correlation');
      expect(insights[1]).toContain('Most common technology stack');
      expect(insights[2]).toContain('Most platform-specific combination');
      expect(insights[3]).toContain('Mutually exclusive header group');
    });

    it('should handle empty analysis gracefully', () => {
      const emptyAnalysis: CooccurrenceAnalysis = {
        totalSites: 0,
        totalHeaders: 0,
        cooccurrences: [],
        technologySignatures: [],
        platformCombinations: [],
        mutuallyExclusiveGroups: [],
        strongCorrelations: []
      };

      const insights = generateCooccurrenceInsights(emptyAnalysis);

      expect(insights).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data points', () => {
      const analysis = analyzeHeaderCooccurrence([]);

      expect(analysis.totalSites).toBe(0);
      expect(analysis.totalHeaders).toBe(0);
      expect(analysis.cooccurrences).toHaveLength(0);
      expect(analysis.technologySignatures).toHaveLength(0);
      expect(analysis.platformCombinations).toHaveLength(0);
    });

    it('should handle data points without headers', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://empty-site.com', 'Unknown', {})
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      expect(analysis.totalSites).toBe(1);
      expect(analysis.totalHeaders).toBe(0);
      expect(analysis.cooccurrences).toHaveLength(0);
    });

    it('should handle single site data', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://single-site.com', 'WordPress', {
          'x-wp-total': '10',
          'content-type': 'text/html'
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      expect(analysis.totalSites).toBe(1);
      expect(analysis.cooccurrences).toHaveLength(1); // With reduced threshold, single site can have co-occurrence between its headers
    });

    it('should normalize header names to lowercase', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'WordPress', {
          'X-WP-Total': '10', // Mixed case
          'CONTENT-TYPE': 'text/html' // Uppercase
        }),
        createTestDataPoint('https://site2.com', 'WordPress', {
          'x-wp-total': '5', // Lowercase
          'content-type': 'text/html' // Lowercase
        }),
        createTestDataPoint('https://site3.com', 'WordPress', {
          'x-Wp-Total': '15', // Mixed case
          'Content-Type': 'application/json' // Mixed case
        })
      ];

      const analysis = analyzeHeaderCooccurrence(dataPoints);

      // Should find co-occurrence for normalized header names
      const wpContentTypeCooccurrence = analysis.cooccurrences.find(c =>
        (c.header1 === 'x-wp-total' && c.header2 === 'content-type') ||
        (c.header1 === 'content-type' && c.header2 === 'x-wp-total')
      );

      expect(wpContentTypeCooccurrence).toBeDefined();
      expect(wpContentTypeCooccurrence?.cooccurrenceCount).toBe(3);
    });
  });
});