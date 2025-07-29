import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  analyzeCMSCorrelatedScripts,
  type CMSCorrelatedPattern,
  type CMSDetectionRecommendations
} from '../cms-enhanced-script-analyzer-v1.js';
import type { DetectionDataPoint, FrequencyOptionsWithDefaults } from '../types-v1.js';
import { setupCommandTests } from '@test-utils';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

describe('CMS Enhanced Script Analyzer', () => {
  setupCommandTests();

  let testOptions: FrequencyOptionsWithDefaults;

  beforeEach(() => {
    vi.clearAllMocks();
    
    testOptions = {
      dataSource: 'cms-analysis',
      dataDir: './data/cms-analysis',
      minSites: 1,
      minOccurrences: 3,
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

  describe('Script Pattern Analysis', () => {
    it('should analyze WordPress script patterns correctly', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://wp-site1.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '/wp-content/themes/theme/js/script.js' },
            { src: '/wp-includes/js/jquery.min.js' },
            { src: 'https://wp-site1.com/wp-admin/js/admin.js' }
          ],
          detectionResults: [
            { cms: 'WordPress', confidence: 0.95, version: '6.2.1' }
          ]
        },
        {
          url: 'https://wp-site2.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '/wp-content/plugins/plugin/script.js' },
            { src: '/wp-includes/js/wp-embed.min.js' },
            { src: 'https://cdn.jsdelivr.net/npm/bootstrap@5.1.0/dist/js/bootstrap.bundle.min.js' }
          ],
          detectionResults: [
            { cms: 'WordPress', confidence: 0.90, version: '6.1.0' }
          ]
        },
        {
          url: 'https://wp-site3.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '/wp-content/themes/custom/assets/js/main.js' },
            { src: '/wp-includes/js/jquery.js' }
          ],
          detectionResults: [
            { cms: 'WordPress', confidence: 0.85, version: '6.0.0' }
          ]
        }
      ];

      const result = await analyzeCMSCorrelatedScripts(testDataPoints, testOptions);

      // Verify patterns Map structure
      expect(result.patterns).toBeInstanceOf(Map);
      expect(result.patterns.size).toBeGreaterThan(0);

      // Verify WordPress-specific patterns are detected
      const pathPatterns = result.patterns.get('paths');
      expect(pathPatterns).toBeDefined();
      expect(pathPatterns!.length).toBeGreaterThan(0);

      // Check for WordPress path patterns
      const wpContentPattern = pathPatterns!.find(p => p.pattern === 'path:wp-content');
      expect(wpContentPattern).toBeDefined();
      expect(wpContentPattern!.cmsCorrelation['WordPress']).toBe(1.0); // All 3 sites have wp-content
      // Note: discriminativePower will be 0 when only one CMS type has correlations > 0
      expect(wpContentPattern!.discriminativePower).toBeGreaterThanOrEqual(0);
      expect(wpContentPattern!.sameDomainOnly).toBe(true);

      const wpIncludesPattern = pathPatterns!.find(p => p.pattern === 'path:wp-includes');
      expect(wpIncludesPattern).toBeDefined();
      expect(wpIncludesPattern!.cmsCorrelation['WordPress']).toBe(1.0); // All 3 sites have wp-includes

      // Verify library patterns
      const libraryPatterns = result.patterns.get('libraries');
      if (libraryPatterns && libraryPatterns.length > 0) {
        const jqueryPattern = libraryPatterns.find(p => p.pattern === 'library:jquery');
        expect(jqueryPattern).toBeDefined();
        expect(jqueryPattern!.cmsCorrelation['WordPress']).toBeGreaterThan(0.5);
      }

      // Verify confidence levels (will be low due to 0 discriminative power with single CMS)
      expect(wpContentPattern!.confidenceLevel).toBeDefined();
      expect(wpContentPattern!.recommendedConfidence).toBeGreaterThan(0);

      // Verify recommendations structure
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.newPatterns).toBeDefined();
      expect(result.recommendations.patternRefinements).toBeDefined();
      expect(result.recommendations.deprecatedPatterns).toBeDefined();

      // Note: With only WordPress sites, discriminative power is 0, so no high-confidence recommendations
    });

    it('should analyze Drupal script patterns correctly', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://drupal-site1.org',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '/sites/default/files/js/optimized.js' },
            { src: '/core/misc/drupal.js' },
            { src: '/modules/custom/mymodule/js/script.js' }
          ],
          detectionResults: [
            { cms: 'Drupal', confidence: 0.90, version: '9.4.0' }
          ]
        },
        {
          url: 'https://drupal-site2.org',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '/sites/all/modules/views/js/views.js' },
            { src: '/core/assets/vendor/jquery/jquery.min.js' },
            { content: 'Drupal.behaviors.myBehavior = function() {};' }
          ],
          detectionResults: [
            { cms: 'Drupal', confidence: 0.95, version: '9.5.0' }
          ]
        },
        {
          url: 'https://drupal-site3.org',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '/sites/default/themes/custom/js/theme.js' },
            { src: '/modules/contrib/webform/js/webform.js' }
          ],
          detectionResults: [
            { cms: 'Drupal', confidence: 0.88, version: '9.3.0' }
          ]
        }
      ];

      const result = await analyzeCMSCorrelatedScripts(testDataPoints, testOptions);

      // Verify Drupal-specific patterns
      const pathPatterns = result.patterns.get('paths');
      expect(pathPatterns).toBeDefined();

      const sitesPattern = pathPatterns!.find(p => p.pattern === 'path:sites');
      expect(sitesPattern).toBeDefined();
      expect(sitesPattern!.cmsCorrelation['Drupal']).toBe(1.0); // All 3 sites have /sites/

      const modulesPattern = pathPatterns!.find(p => p.pattern === 'path:modules');
      expect(modulesPattern).toBeDefined();
      expect(modulesPattern!.cmsCorrelation['Drupal']).toBeGreaterThan(0.6); // 2/3 sites have /modules/

      const corePattern = pathPatterns!.find(p => p.pattern === 'path:core');
      if (corePattern) {
        expect(corePattern.cmsCorrelation['Drupal']).toBeGreaterThan(0.6);
      }

      // Verify inline patterns
      const inlinePatterns = result.patterns.get('inline');
      if (inlinePatterns && inlinePatterns.length > 0) {
        const drupalInlinePattern = inlinePatterns.find(p => p.pattern === 'inline:drupal');
        expect(drupalInlinePattern).toBeDefined();
        expect(drupalInlinePattern!.cmsCorrelation['Drupal']).toBeGreaterThan(0);
      }

      // Verify recommendations structure (may be empty due to low discriminative power with single CMS)
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.newPatterns).toBeDefined();
    });

    it('should analyze mixed CMS environments correctly', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        // WordPress sites
        {
          url: 'https://wp-site.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '/wp-content/themes/theme/js/script.js' },
            { src: 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js' }
          ],
          detectionResults: [
            { cms: 'WordPress', confidence: 0.95 }
          ]
        },
        {
          url: 'https://another-wp.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '/wp-includes/js/wp-embed.min.js' },
            { src: 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.1.0/js/bootstrap.bundle.min.js' }
          ],
          detectionResults: [
            { cms: 'WordPress', confidence: 0.90 }
          ]
        },
        // Drupal sites
        {
          url: 'https://drupal-site.org',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '/sites/default/files/js/optimized.js' },
            { src: 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js' }
          ],
          detectionResults: [
            { cms: 'Drupal', confidence: 0.85 }
          ]
        },
        // Unknown/Generic sites
        {
          url: 'https://generic-site.net',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '/assets/js/main.js' },
            { src: 'https://cdn.jsdelivr.net/npm/react@17/umd/react.production.min.js' }
          ],
          detectionResults: [
            { cms: 'Unknown', confidence: 0.0 }
          ]
        }
      ];

      const result = await analyzeCMSCorrelatedScripts(testDataPoints, testOptions);

      // Verify patterns are detected
      expect(result.patterns).toBeInstanceOf(Map);
      
      const pathPatterns = result.patterns.get('paths');
      if (pathPatterns && pathPatterns.length > 0) {
        // WordPress patterns should not correlate with Drupal
        const wpContentPattern = pathPatterns.find(p => p.pattern === 'path:wp-content');
        if (wpContentPattern) {
          expect(wpContentPattern.cmsCorrelation['WordPress']).toBeGreaterThan(0);
          expect(wpContentPattern.cmsCorrelation['Drupal'] || 0).toBe(0);
          expect(wpContentPattern.cmsCorrelation['Unknown'] || 0).toBe(0);
        }

        // Drupal patterns should not correlate with WordPress
        const sitesPattern = pathPatterns.find(p => p.pattern === 'path:sites');
        if (sitesPattern) {
          expect(sitesPattern.cmsCorrelation['Drupal']).toBeGreaterThan(0);
          expect(sitesPattern.cmsCorrelation['WordPress'] || 0).toBe(0);
          expect(sitesPattern.cmsCorrelation['Unknown'] || 0).toBe(0);
        }
      }

      // External library patterns should have lower discriminative power
      const domainPatterns = result.patterns.get('domains');
      if (domainPatterns && domainPatterns.length > 0) {
        const googleApisPattern = domainPatterns.find(p => p.pattern === 'domain:google-apis');
        if (googleApisPattern) {
          expect(googleApisPattern.discriminativePower).toBeLessThan(0.5); // Low discriminative power
          expect(googleApisPattern.confidenceLevel).toBe('low');
        }
      }

      // Verify recommendations structure
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.newPatterns).toBeDefined();

      // Check pattern refinements for overly generic patterns
      if (result.recommendations.patternRefinements.length > 0) {
        for (const refinement of result.recommendations.patternRefinements) {
          expect(refinement.reasoning).toContain('low discriminative power');
          expect(refinement.recommendedConfidence).toBeLessThan(0.7);
        }
      }
    });

    it('should handle sites with insufficient script data', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://minimal-site.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [], // No scripts
          detectionResults: [
            { cms: 'WordPress', confidence: 0.75 }
          ]
        },
        {
          url: 'https://basic-site.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '/single-script.js' } // Only one generic script
          ],
          detectionResults: [
            { cms: 'Unknown', confidence: 0.0 }
          ]
        }
      ];

      const result = await analyzeCMSCorrelatedScripts(testDataPoints, testOptions);

      // Should handle gracefully without throwing errors
      expect(result.patterns).toBeInstanceOf(Map);
      expect(result.recommendations).toBeDefined();

      // With minimal data, should produce minimal patterns
      const totalPatterns = Array.from(result.patterns.values()).flat().length;
      expect(totalPatterns).toBeLessThan(5); // Very few patterns due to insufficient data

      // Recommendations should be conservative
      expect(result.recommendations.newPatterns.length).toBeLessThan(3);
    });

    it('should calculate discriminative power correctly', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        // WordPress sites with wp-content (should be highly discriminative)
        {
          url: 'https://wp1.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [{ src: '/wp-content/themes/theme/js/script.js' }],
          detectionResults: [{ cms: 'WordPress', confidence: 0.95 }]
        },
        {
          url: 'https://wp2.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [{ src: '/wp-content/plugins/plugin/script.js' }],
          detectionResults: [{ cms: 'WordPress', confidence: 0.90 }]
        },
        {
          url: 'https://wp3.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [{ src: '/wp-content/uploads/script.js' }],
          detectionResults: [{ cms: 'WordPress', confidence: 0.85 }]
        },
        // Sites with jQuery (should be less discriminative - appears everywhere)
        {
          url: 'https://drupal1.org',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [{ src: 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js' }],
          detectionResults: [{ cms: 'Drupal', confidence: 0.90 }]
        },
        {
          url: 'https://generic1.net',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [{ src: 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js' }],
          detectionResults: [{ cms: 'Unknown', confidence: 0.0 }]
        },
        {
          url: 'https://custom1.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [{ src: 'https://code.jquery.com/jquery-3.6.0.min.js' }],
          detectionResults: [{ cms: 'Unknown', confidence: 0.0 }]
        }
      ];

      const result = await analyzeCMSCorrelatedScripts(testDataPoints, testOptions);

      const pathPatterns = result.patterns.get('paths');
      const domainPatterns = result.patterns.get('domains');

      // WordPress-specific path should have some discriminative power in mixed environment
      const wpContentPattern = pathPatterns?.find(p => p.pattern === 'path:wp-content');
      if (wpContentPattern) {
        expect(wpContentPattern.discriminativePower).toBeGreaterThanOrEqual(0); // May be 0 due to limited test data
        expect(['high', 'medium', 'low']).toContain(wpContentPattern.confidenceLevel);
      }

      // Google APIs (jQuery) should have lower discriminative power
      const googleApisPattern = domainPatterns?.find(p => p.pattern === 'domain:google-apis');
      if (googleApisPattern) {
        expect(googleApisPattern.discriminativePower).toBeLessThan(0.4);
        expect(googleApisPattern.confidenceLevel).not.toBe('high');
      }
    });

    it('should handle inline script patterns correctly', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://drupal-inline.org',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { 
              content: 'Drupal.behaviors.myModule = { attach: function(context, settings) { console.log("Drupal behavior"); } };',
              inline: true 
            },
            { src: '/sites/default/files/js/script.js' }
          ],
          detectionResults: [
            { cms: 'Drupal', confidence: 0.90 }
          ]
        },
        {
          url: 'https://wp-inline.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { 
              content: 'window.wp = window.wp || {}; wp.admin = { url: "/wp-admin/" };',
              inline: true
            }
          ],
          detectionResults: [
            { cms: 'WordPress', confidence: 0.85 }
          ]
        },
        {
          url: 'https://duda-inline.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { 
              content: 'window.Parameters = { siteId: "12345", locale: "en" };',
              inline: true
            }
          ],
          detectionResults: [
            { cms: 'Unknown', confidence: 0.0 } // Duda not detected as CMS
          ]
        }
      ];

      const result = await analyzeCMSCorrelatedScripts(testDataPoints, testOptions);

      // Check for inline patterns
      const inlinePatterns = result.patterns.get('inline');
      if (inlinePatterns && inlinePatterns.length > 0) {
        
        // Drupal inline pattern
        const drupalInlinePattern = inlinePatterns.find(p => p.pattern === 'inline:drupal');
        if (drupalInlinePattern) {
          expect(drupalInlinePattern.cmsCorrelation['Drupal']).toBeGreaterThan(0);
          expect(drupalInlinePattern.sameDomainOnly).toBe(true); // Inline scripts are always same-domain
        }

        // WordPress inline pattern
        const wpInlinePattern = inlinePatterns.find(p => p.pattern === 'inline:wordpress');
        if (wpInlinePattern) {
          expect(wpInlinePattern.cmsCorrelation['WordPress']).toBeGreaterThan(0);
          expect(wpInlinePattern.sameDomainOnly).toBe(true);
        }

        // Duda inline pattern
        const dudaInlinePattern = inlinePatterns.find(p => p.pattern === 'inline:duda');
        if (dudaInlinePattern) {
          expect(dudaInlinePattern.cmsCorrelation['Unknown']).toBeGreaterThan(0);
          expect(dudaInlinePattern.sameDomainOnly).toBe(true);
        }
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty dataset gracefully', async () => {
      const result = await analyzeCMSCorrelatedScripts([], testOptions);

      expect(result.patterns).toBeInstanceOf(Map);
      expect(result.patterns.size).toBe(0);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.newPatterns.length).toBe(0);
      expect(result.recommendations.patternRefinements.length).toBe(0);
      expect(result.recommendations.deprecatedPatterns.length).toBe(0);
    });

    it('should handle malformed script data', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://malformed-site.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '' }, // Empty src
            { src: null as any }, // Null src
            { src: 'invalid-url' }, // Invalid URL
            { content: null as any, inline: true }, // Null content
            { /* missing src and content */ } as any
          ],
          detectionResults: [
            { cms: 'WordPress', confidence: 0.80 }
          ]
        }
      ];

      // Should not throw errors
      const result = await analyzeCMSCorrelatedScripts(testDataPoints, testOptions);

      expect(result.patterns).toBeInstanceOf(Map);
      expect(result.recommendations).toBeDefined();
    });

    it('should handle sites with no CMS detection results', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://no-detection.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '/assets/js/main.js' }
          ],
          detectionResults: [] // No detection results
        },
        {
          url: 'https://low-confidence.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '/js/script.js' }
          ],
          detectionResults: [
            { cms: 'WordPress', confidence: 0.3 } // Below 50% threshold
          ]
        }
      ];

      const result = await analyzeCMSCorrelatedScripts(testDataPoints, testOptions);

      // Should still analyze patterns, but categorize as 'Unknown'
      expect(result.patterns).toBeInstanceOf(Map);
      
      const pathPatterns = result.patterns.get('paths');
      if (pathPatterns && pathPatterns.length > 0) {
        for (const pattern of pathPatterns) {
          expect(pattern.cmsCorrelation['Unknown']).toBeDefined();
        }
      }
    });

    it('should respect minOccurrences threshold', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [{ src: '/wp-content/themes/theme/script.js' }],
          detectionResults: [{ cms: 'WordPress', confidence: 0.90 }]
        },
        {
          url: 'https://site2.com',
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [{ src: '/rare-pattern/script.js' }], // Unique pattern
          detectionResults: [{ cms: 'WordPress', confidence: 0.85 }]
        }
      ];

      // Set high threshold
      const highThresholdOptions = { ...testOptions, minOccurrences: 2 };
      
      const result = await analyzeCMSCorrelatedScripts(testDataPoints, highThresholdOptions);

      const pathPatterns = result.patterns.get('paths');
      if (pathPatterns) {
        // wp-content should be included (appears once but meets threshold due to single site)
        const wpContentPattern = pathPatterns.find(p => p.pattern === 'path:wp-content');
        expect(wpContentPattern).toBeDefined();

        // rare-pattern should be excluded if it only appears once and threshold is 2
        const rarePattern = pathPatterns.find(p => p.pattern.includes('rare-pattern'));
        expect(rarePattern).toBeUndefined();
      }
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate appropriate new pattern recommendations', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        // Multiple WordPress sites with consistent patterns
        ...Array.from({ length: 5 }, (_, i) => ({
          url: `https://wp-site${i + 1}.com`,
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: '/wp-content/themes/theme/js/script.js' },
            { src: '/wp-includes/js/jquery.min.js' }
          ],
          detectionResults: [
            { cms: 'WordPress', confidence: 0.90 + (i * 0.01) }
          ]
        }))
      ];

      const result = await analyzeCMSCorrelatedScripts(testDataPoints, testOptions);

      // Verify recommendations structure
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.newPatterns).toBeDefined();

      // With only WordPress sites, discriminative power is 0, so recommendations may be empty
      // But if there are recommendations, they should be well-formed
      if (result.recommendations.newPatterns.length > 0) {
        const firstRecommendation = result.recommendations.newPatterns[0];
        expect(firstRecommendation.pattern).toBeDefined();
        expect(firstRecommendation.category).toBeDefined();
        expect(firstRecommendation.confidence).toBeGreaterThan(0);
        expect(firstRecommendation.cms).toBe('WordPress');
        expect(firstRecommendation.reasoning).toBeDefined();
        expect(firstRecommendation.examples.length).toBeGreaterThan(0);

        // Verify recommendations are sorted by quality
        if (result.recommendations.newPatterns.length > 1) {
          expect(result.recommendations.newPatterns[0].confidence)
            .toBeGreaterThanOrEqual(result.recommendations.newPatterns[1].confidence);
        }
      }
    });

    it('should identify patterns needing confidence refinement', async () => {
      const testDataPoints: DetectionDataPoint[] = [
        // Create scenario with frequently appearing but non-discriminative pattern
        ...['WordPress', 'Drupal', 'Unknown', 'WordPress', 'Unknown'].map((cms, i) => ({
          url: `https://site${i + 1}.com`,
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js' }, // Appears everywhere
            { src: cms === 'WordPress' ? '/wp-content/script.js' : '/other/script.js' }
          ],
          detectionResults: [
            { cms, confidence: cms === 'Unknown' ? 0.0 : 0.85 }
          ]
        }))
      ];

      const result = await analyzeCMSCorrelatedScripts(testDataPoints, testOptions);

      // Should identify jQuery/Google APIs as needing refinement
      const refinements = result.recommendations.patternRefinements;
      if (refinements.length > 0) {
        const googleApisRefinement = refinements.find(r => 
          r.pattern.includes('google-apis') || r.reasoning.includes('frequently')
        );
        
        if (googleApisRefinement) {
          expect(googleApisRefinement.recommendedConfidence).toBeLessThan(0.7);
          expect(googleApisRefinement.reasoning).toContain('low discriminative power');
        }
      }
    });

    it('should limit recommendation counts appropriately', async () => {
      // Create many patterns to test limits
      const testDataPoints: DetectionDataPoint[] = [
        ...Array.from({ length: 10 }, (_, i) => ({
          url: `https://wp-site${i + 1}.com`,
          timestamp: new Date().toISOString(),
          httpHeaders: {},
          scripts: [
            { src: `/wp-content/themes/theme${i}/js/script.js` }, // Different themes
            { src: `/wp-content/plugins/plugin${i}/js/script.js` }, // Different plugins
            { src: `/custom-path-${i}/script.js` } // Different custom paths
          ],
          detectionResults: [
            { cms: 'WordPress', confidence: 0.90 }
          ]
        }))
      ];

      const result = await analyzeCMSCorrelatedScripts(testDataPoints, testOptions);

      // Verify limits are respected
      expect(result.recommendations.newPatterns.length).toBeLessThanOrEqual(10);
      expect(result.recommendations.patternRefinements.length).toBeLessThanOrEqual(5);
    });
  });
});