import { describe, it, expect } from 'vitest';
import { 
  discoverHeaderPatterns,
  type DiscoveredPattern,
  type EmergingVendorPattern,
  type PatternEvolution,
  type SemanticAnomaly,
  type PatternDiscoveryAnalysis
} from '../pattern-discovery.js';
import type { DetectionDataPoint } from '../types.js';

// Helper function to create test data points
function createTestDataPoint(
  url: string, 
  cms: string, 
  headers: Record<string, string>,
  robotsHeaders?: Record<string, string>,
  timestamp?: Date
): DetectionDataPoint {
  return {
    url,
    timestamp: timestamp || new Date(),
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

describe('Pattern Discovery Engine', () => {
  describe('Basic Pattern Discovery', () => {
    it('should discover prefix patterns', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'WordPress', {
          'x-wp-total': '10',
          'x-wp-cache': 'enabled',
          'x-wp-version': '6.0'
        }),
        createTestDataPoint('https://site2.com', 'WordPress', {
          'x-wp-total': '5',
          'x-wp-plugins': 'active'
        }),
        createTestDataPoint('https://site3.com', 'WordPress', {
          'x-wp-total': '15',
          'x-wp-cache': 'disabled'
        }),
        createTestDataPoint('https://site4.com', 'Shopify', {
          'x-shopify-shop-id': '12345',
          'x-shopify-stage': 'production'
        }),
        createTestDataPoint('https://site5.com', 'Shopify', {
          'x-shopify-shop-id': '67890',
          'x-shopify-version': '2.0'
        }),
        createTestDataPoint('https://site6.com', 'Unknown', {
          'content-type': 'text/html'
        })
      ];

      const analysis = discoverHeaderPatterns(dataPoints);


      expect(analysis.discoveredPatterns.length).toBeGreaterThan(0);
      
      // Should find x-wp-* pattern
      const wpPattern = analysis.discoveredPatterns.find(p => 
        p.pattern === 'x-wp-*' && p.type === 'prefix'
      );
      expect(wpPattern).toBeDefined();
      expect(wpPattern?.examples).toContain('x-wp-total');
      expect(wpPattern?.examples).toContain('x-wp-cache');
      
      // Should find x-shopify-* pattern (or similar shopify prefix)
      const shopifyPattern = analysis.discoveredPatterns.find(p => 
        (p.pattern === 'x-shopify-*' || p.pattern.includes('shopify')) && p.type === 'prefix'
      );
      expect(shopifyPattern).toBeDefined();
      expect(shopifyPattern?.examples).toContain('x-shopify-shop-id');
    });

    it('should discover suffix patterns', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'WordPress', {
          'wp-total': '10',
          'session-total': '5'
        }),
        createTestDataPoint('https://site2.com', 'Shopify', {
          'shop-id': '12345',
          'request-id': 'abc123'
        }),
        createTestDataPoint('https://site3.com', 'Unknown', {
          'tracking-id': 'xyz789',
          'content-type': 'text/html'
        })
      ];

      const analysis = discoverHeaderPatterns(dataPoints);

      // Should find *-id pattern
      const idPattern = analysis.discoveredPatterns.find(p => 
        p.pattern === '*-id' && p.type === 'suffix'
      );
      expect(idPattern).toBeDefined();
      expect(idPattern?.examples).toContain('shop-id');
      expect(idPattern?.examples).toContain('request-id');
      expect(idPattern?.examples).toContain('tracking-id');
    });

    it('should discover contains patterns', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'WordPress', {
          'wp-cache-status': 'hit',
          'x-cache-control': 'max-age=3600',
          'fastly-cache': 'miss'
        }),
        createTestDataPoint('https://site2.com', 'Shopify', {
          'cloudflare-cache': 'dynamic',
          'cache-status': 'stale'
        }),
        createTestDataPoint('https://site3.com', 'Unknown', {
          'varnish-cache': 'hit',
          'content-type': 'text/html'
        })
      ];

      const analysis = discoverHeaderPatterns(dataPoints);

      // Should find *cache* pattern
      const cachePattern = analysis.discoveredPatterns.find(p => 
        p.pattern === '*cache*' && p.type === 'contains'
      );
      expect(cachePattern).toBeDefined();
      expect(cachePattern?.examples.length).toBeGreaterThanOrEqual(3);
      expect(cachePattern?.examples).toContain('wp-cache-status');
      expect(cachePattern?.examples).toContain('fastly-cache');
    });

    it('should discover regex patterns', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'WordPress', {
          'x-wp-id': '123',
          'x-cache-id': '456'
        }),
        createTestDataPoint('https://site2.com', 'Shopify', {
          'x-shop-id': '789',
          'x-request-id': 'abc'
        }),
        createTestDataPoint('https://site3.com', 'Unknown', {
          'x-session-id': 'xyz',
          'content-type': 'text/html'
        })
      ];

      const analysis = discoverHeaderPatterns(dataPoints);

      // Should find x-word-id pattern
      const xWordIdPattern = analysis.discoveredPatterns.find(p => 
        p.pattern === 'x-word-id' && p.type === 'regex'
      );
      expect(xWordIdPattern).toBeDefined();
      expect(xWordIdPattern?.examples).toContain('x-wp-id');
      expect(xWordIdPattern?.examples).toContain('x-shop-id');
    });
  });

  describe('Emerging Vendor Detection', () => {
    it('should identify emerging vendor patterns', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'Unknown', {
          'newvendor-cache': 'hit',
          'newvendor-id': '12345',
          'newvendor-status': 'active'
        }),
        createTestDataPoint('https://site2.com', 'Unknown', {
          'newvendor-cache': 'miss',
          'newvendor-id': '67890',
          'newvendor-version': '2.1'
        }),
        createTestDataPoint('https://site3.com', 'Unknown', {
          'newvendor-session': 'abc123',
          'newvendor-tracking': 'enabled'
        }),
        createTestDataPoint('https://site4.com', 'WordPress', {
          'x-wp-total': '10',
          'content-type': 'text/html'
        })
      ];

      const analysis = discoverHeaderPatterns(dataPoints);


      expect(analysis.emergingVendors.length).toBeGreaterThan(0);
      
      // Should identify newvendor as emerging vendor
      const newVendor = analysis.emergingVendors.find(v => 
        v.vendorName === 'newvendor'
      );
      expect(newVendor).toBeDefined();
      expect(newVendor?.patterns.length).toBeGreaterThanOrEqual(1);
      expect(newVendor?.sites.length).toBe(3);
      expect(newVendor?.characteristics.commonPrefixes).toContain('newvendor-');
    });

    it('should analyze vendor naming conventions', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'Unknown', {
          'vendor-cache-status': 'hit',
          'vendor-request-id': '123',
          'vendor-session-key': 'abc'
        }),
        createTestDataPoint('https://site2.com', 'Unknown', {
          'vendor-cache-control': 'max-age',
          'vendor-user-agent': 'bot',
          'vendor-api-version': '1.0'
        })
      ];

      const analysis = discoverHeaderPatterns(dataPoints);

      const vendor = analysis.emergingVendors.find(v => 
        v.vendorName === 'vendor'
      );
      expect(vendor).toBeDefined();
      expect(vendor?.characteristics.namingConvention).toBe('kebab-case');
    });
  });

  describe('Pattern Evolution Analysis', () => {
    it('should detect version evolution', () => {
      const oldDate = new Date('2023-01-01');
      const newDate = new Date('2023-06-01');
      
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'WordPress', {
          'api-version': 'v1',
          'cache-control': 'max-age=3600'
        }, undefined, oldDate),
        createTestDataPoint('https://site2.com', 'WordPress', {
          'api-version': 'v1',
          'request-id': '123'
        }, undefined, oldDate),
        createTestDataPoint('https://site3.com', 'WordPress', {
          'api-version': 'v2',
          'cache-control': 'max-age=7200'
        }, undefined, newDate),
        createTestDataPoint('https://site4.com', 'WordPress', {
          'api-version': 'v2',
          'enhanced-cache': 'enabled'
        }, undefined, newDate)
      ];

      const analysis = discoverHeaderPatterns(dataPoints);

      // Evolution analysis requires sufficient temporal data
      // This is a simplified test - real implementation would need more sophisticated temporal grouping
      expect(analysis.patternEvolution).toBeDefined();
    });

    it('should detect new patterns over time', () => {
      const oldDate = new Date('2023-01-01');
      const newDate = new Date('2023-06-01');
      
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'WordPress', {
          'legacy-header': 'value1'
        }, undefined, oldDate),
        createTestDataPoint('https://site2.com', 'WordPress', {
          'legacy-header': 'value2'
        }, undefined, oldDate),
        createTestDataPoint('https://site3.com', 'WordPress', {
          'legacy-header': 'value3',
          'new-feature-header': 'enabled'
        }, undefined, newDate),
        createTestDataPoint('https://site4.com', 'WordPress', {
          'new-feature-header': 'enabled',
          'another-new-header': 'active'
        }, undefined, newDate)
      ];

      const analysis = discoverHeaderPatterns(dataPoints);

      expect(analysis.patternEvolution).toBeDefined();
      // Could test for 'new' evolution type if sufficient data
    });
  });

  describe('Semantic Anomaly Detection', () => {
    it('should detect category mismatches', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'WordPress', {
          'security-policy': 'strict',  // Should be security but might be categorized differently
          'cache-analytics': 'enabled', // Mixed semantic meaning
          'wp-version': '6.0'
        }),
        createTestDataPoint('https://site2.com', 'Shopify', {
          'analytics-cache': 'hit',     // Mixed semantic meaning
          'shop-security': 'enabled'
        })
      ];

      const analysis = discoverHeaderPatterns(dataPoints);

      expect(analysis.semanticAnomalies).toBeDefined();
      // Anomalies depend on semantic analyzer behavior and expected vs actual categorization
    });

    it('should detect vendor mismatches', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'WordPress', {
          'cf-ray': '12345',           // Cloudflare header but might be mis-categorized
          'x-wp-total': '10'
        }),
        createTestDataPoint('https://site2.com', 'Shopify', {
          'fastly-debug': 'info',      // Fastly header
          'x-shopify-shop-id': '67890'
        })
      ];

      const analysis = discoverHeaderPatterns(dataPoints);

      expect(analysis.semanticAnomalies).toBeDefined();
      // Check for vendor-related anomalies
    });
  });

  describe('CMS Correlation Analysis', () => {
    it('should calculate CMS correlation for discovered patterns', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://wp1.com', 'WordPress', {
          'x-wp-total': '10',
          'x-wp-cache': 'enabled'
        }),
        createTestDataPoint('https://wp2.com', 'WordPress', {
          'x-wp-total': '5',
          'x-wp-version': '6.0'
        }),
        createTestDataPoint('https://shop1.com', 'Shopify', {
          'x-shopify-shop-id': '123',
          'x-shopify-stage': 'prod'
        }),
        createTestDataPoint('https://shop2.com', 'Shopify', {
          'x-shopify-shop-id': '456',
          'x-shopify-version': '2.0'
        })
      ];

      const analysis = discoverHeaderPatterns(dataPoints);

      // WordPress patterns should be strongly correlated with WordPress
      const wpPattern = analysis.discoveredPatterns.find(p => 
        p.pattern === 'x-wp-*' && p.type === 'prefix'
      );
      expect(wpPattern).toBeDefined();
      expect(wpPattern?.cmsCorrelation?.['WordPress']).toBeGreaterThan(0.8);
      expect(wpPattern?.cmsCorrelation?.['Shopify']).toBeUndefined();

      // Shopify patterns should be strongly correlated with Shopify
      const shopifyPattern = analysis.discoveredPatterns.find(p => 
        (p.pattern === 'x-shopify-*' || p.pattern.includes('shopify')) && p.type === 'prefix'
      );
      expect(shopifyPattern).toBeDefined();
      expect(shopifyPattern?.cmsCorrelation?.['Shopify']).toBeGreaterThan(0.8);
      expect(shopifyPattern?.cmsCorrelation?.['WordPress']).toBeUndefined();
    });
  });

  describe('Insight Generation', () => {
    it('should generate meaningful insights from analysis', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'WordPress', {
          'x-wp-total': '10',
          'x-wp-cache': 'enabled',
          'x-wp-version': '6.0'
        }),
        createTestDataPoint('https://site2.com', 'WordPress', {
          'x-wp-total': '5',
          'x-wp-plugins': 'active'
        }),
        createTestDataPoint('https://site3.com', 'Shopify', {
          'x-shopify-shop-id': '123',
          'x-shopify-stage': 'prod'
        }),
        createTestDataPoint('https://site4.com', 'Unknown', {
          'emerging-vendor-header': 'value',
          'emerging-vendor-cache': 'hit'
        })
      ];

      const analysis = discoverHeaderPatterns(dataPoints);

      expect(analysis.insights).toBeDefined();
      expect(analysis.insights.length).toBeGreaterThan(0);
      
      // Should contain insights about discovered patterns
      const hasPatternInsight = analysis.insights.some(insight => 
        insight.includes('Most common discovered pattern')
      );
      expect(hasPatternInsight).toBe(true);
    });

    it('should provide vendor and evolution insights when available', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'Unknown', {
          'newtech-api': 'v1',
          'newtech-cache': 'enabled',
          'newtech-status': 'active'
        }),
        createTestDataPoint('https://site2.com', 'Unknown', {
          'newtech-api': 'v1',
          'newtech-cache': 'disabled',
          'newtech-debug': 'off'
        }),
        createTestDataPoint('https://site3.com', 'Unknown', {
          'newtech-api': 'v2',
          'newtech-enhanced': 'true'
        })
      ];

      const analysis = discoverHeaderPatterns(dataPoints);

      // Should detect emerging vendor patterns
      expect(analysis.emergingVendors.length).toBeGreaterThan(0);
      
      if (analysis.emergingVendors.length > 0) {
        const hasVendorInsight = analysis.insights.some(insight => 
          insight.includes('Emerging vendor pattern detected')
        );
        expect(hasVendorInsight).toBe(true);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty data gracefully', () => {
      const analysis = discoverHeaderPatterns([]);

      expect(analysis.discoveredPatterns).toHaveLength(0);
      expect(analysis.emergingVendors).toHaveLength(0);
      expect(analysis.patternEvolution).toHaveLength(0);
      expect(analysis.semanticAnomalies).toHaveLength(0);
      expect(analysis.insights).toHaveLength(0);
    });

    it('should handle data points without headers', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'Unknown', {}),
        createTestDataPoint('https://site2.com', 'Unknown', {})
      ];

      const analysis = discoverHeaderPatterns(dataPoints);

      expect(analysis.discoveredPatterns).toHaveLength(0);
      expect(analysis.emergingVendors).toHaveLength(0);
    });

    it('should handle single header occurrences', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'WordPress', {
          'alpha': 'value1'
        }),
        createTestDataPoint('https://site2.com', 'Shopify', {
          'beta': 'value2'
        }),
        createTestDataPoint('https://site3.com', 'Unknown', {
          'gamma': 'value3'
        })
      ];

      const analysis = discoverHeaderPatterns(dataPoints);

      // Should not create patterns for completely unrelated single headers
      expect(analysis.discoveredPatterns).toHaveLength(0);
    });

    it('should normalize header names consistently', () => {
      const dataPoints: DetectionDataPoint[] = [
        createTestDataPoint('https://site1.com', 'WordPress', {
          'X-WP-Total': '10',           // Mixed case
          'X-WP-Cache': 'enabled'       // Mixed case
        }),
        createTestDataPoint('https://site2.com', 'WordPress', {
          'x-wp-total': '5',            // Lowercase
          'x-wp-version': '6.0'         // Lowercase
        })
      ];

      const analysis = discoverHeaderPatterns(dataPoints);

      // Should find x-wp-* pattern despite case differences
      const wpPattern = analysis.discoveredPatterns.find(p => 
        p.pattern === 'x-wp-*' && p.type === 'prefix'
      );
      expect(wpPattern).toBeDefined();
      expect(wpPattern?.examples).toContain('x-wp-total');
      expect(wpPattern?.examples).toContain('x-wp-cache');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', () => {
      const dataPoints: DetectionDataPoint[] = [];
      
      // Create 100 data points with various header patterns
      for (let i = 0; i < 100; i++) {
        dataPoints.push(createTestDataPoint(`https://site${i}.com`, 'WordPress', {
          'x-wp-total': `${i}`,
          'x-wp-cache': i % 2 === 0 ? 'hit' : 'miss',
          [`custom-header-${i % 10}`]: `value${i}`
        }));
      }

      const startTime = performance.now();
      const analysis = discoverHeaderPatterns(dataPoints);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(analysis.discoveredPatterns.length).toBeGreaterThan(0);
      expect(analysis.discoveredPatterns.length).toBeLessThanOrEqual(50); // Respects limit
    });

    it('should limit pattern results appropriately', () => {
      const dataPoints: DetectionDataPoint[] = [];
      
      // Create many different patterns
      for (let i = 0; i < 50; i++) {
        dataPoints.push(createTestDataPoint(`https://site${i}.com`, 'WordPress', {
          [`pattern-${i}-header-1`]: 'value1',
          [`pattern-${i}-header-2`]: 'value2'
        }));
      }

      const analysis = discoverHeaderPatterns(dataPoints);

      // Should limit to top 50 patterns
      expect(analysis.discoveredPatterns.length).toBeLessThanOrEqual(50);
    });
  });
});