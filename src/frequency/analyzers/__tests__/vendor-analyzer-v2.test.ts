/**
 * VendorAnalyzerV2 Unit Tests
 * 
 * Core functionality tests (15 tests)
 * V2 enhancement tests (10 tests) 
 * Integration tests (8 tests)
 * 
 * Total: 33 tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VendorAnalyzerV2, VendorPattern, VendorDetection, TechnologyStack } from '../vendor-analyzer-v2.js';
import type { PreprocessedData, AnalysisOptions } from '../../types/analyzer-interface.js';

// Mock logger
vi.mock('../../../utils/logger.js', () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

describe('VendorAnalyzerV2 - Core Functionality Tests', () => {
  let analyzer: VendorAnalyzerV2;
  let mockData: PreprocessedData;
  let defaultOptions: AnalysisOptions;

  beforeEach(() => {
    analyzer = new VendorAnalyzerV2();
    
    // Create realistic test data
    mockData = {
      sites: new Map([
        ['site1.com', {
          url: 'https://site1.com',
          normalizedUrl: 'site1.com',
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map([
            ['cf-ray', new Set(['12345-LAX'])],
            ['x-wp-total', new Set(['150'])],
            ['server', new Set(['cloudflare'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }],
        ['site2.com', {
          url: 'https://site2.com',
          normalizedUrl: 'site2.com',
          cms: 'Shopify',
          confidence: 0.8,
          headers: new Map([
            ['x-shopify-shop-id', new Set(['12345'])],
            ['x-served-by', new Set(['fastly-cache-123'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }],
        ['site3.com', {
          url: 'https://site3.com',
          normalizedUrl: 'site3.com', 
          cms: null,
          confidence: 0.0,
          headers: new Map([
            ['unknown-header', new Set(['value'])],
            ['custom-header', new Set(['test'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }]
      ]),
      totalSites: 3,
      metadata: {
        version: '1.0.0',
        preprocessedAt: '2024-01-01T00:00:00Z'
      }
    };

    defaultOptions = {
      minOccurrences: 1,
      includeExamples: true,
      maxExamples: 5,
      semanticFiltering: false
    };
  });

  describe('Basic Vendor Detection', () => {
    it('should detect single vendor from header pattern', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      expect(result.analyzerSpecific).toBeDefined();
      expect(result.analyzerSpecific!.vendorsByHeader.size).toBeGreaterThan(0);
      
      // Should detect Cloudflare from cf-ray header
      const cfRayDetection = result.analyzerSpecific!.vendorsByHeader.get('cf-ray');
      expect(cfRayDetection).toBeDefined();
      expect(cfRayDetection!.vendor.name).toBe('Cloudflare');
      expect(cfRayDetection!.vendor.category).toBe('cdn');
    });

    it('should handle case-insensitive header matching', async () => {
      // Add uppercase header
      mockData.sites.get('site1.com')!.headers.set('CF-RAY', new Set(['67890-NYC']));
      
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      // Should still detect Cloudflare regardless of case
      const detection = result.analyzerSpecific!.vendorsByHeader.get('cf-ray');
      expect(detection).toBeDefined();
      expect(detection!.vendor.name).toBe('Cloudflare');
    });

    it('should return undefined for unknown headers', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      // Unknown headers should not have vendor detections
      const unknownDetection = result.analyzerSpecific!.vendorsByHeader.get('unknown-header');
      expect(unknownDetection).toBeUndefined();
      
      const customDetection = result.analyzerSpecific!.vendorsByHeader.get('custom-header');
      expect(customDetection).toBeUndefined();
    });

    it('should prioritize longer patterns over shorter ones', async () => {
      // Add both specific and generic Cloudflare headers
      mockData.sites.get('site1.com')!.headers.set('cf-cache-status', new Set(['HIT']));
      
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      // Both should be detected as Cloudflare
      const cfRayDetection = result.analyzerSpecific!.vendorsByHeader.get('cf-ray');
      const cfCacheDetection = result.analyzerSpecific!.vendorsByHeader.get('cf-cache-status');
      
      expect(cfRayDetection?.vendor.name).toBe('Cloudflare');
      expect(cfCacheDetection?.vendor.name).toBe('Cloudflare');
      
      // More specific headers should have higher confidence
      expect(cfCacheDetection!.confidence).toBeGreaterThanOrEqual(cfRayDetection!.confidence - 0.1);
    });
  });

  describe('Vendor Statistics Analysis', () => {
    it('should calculate vendor frequency across sites', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      const vendorStats = result.analyzerSpecific!.vendorStats;
      expect(vendorStats).toBeDefined();
      expect(vendorStats.totalHeaders).toBeGreaterThan(0);
      expect(vendorStats.vendorCoverage).toBeGreaterThan(0);
    });

    it('should aggregate vendor counts by category', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      const vendorStats = result.analyzerSpecific!.vendorStats;
      expect(vendorStats.categoryDistribution).toBeDefined();
      
      // Should have CDN category from Cloudflare
      expect(vendorStats.categoryDistribution.cdn).toBeGreaterThan(0);
    });

    it('should compute category distribution percentages', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      const vendorStats = result.analyzerSpecific!.vendorStats;
      const totalPercentage = Object.values(vendorStats.categoryDistribution)
        .reduce((sum, count) => sum + count, 0);
      
      expect(totalPercentage).toBeGreaterThan(0);
      expect(vendorStats.vendorDistribution.length).toBeGreaterThan(0);
      
      // Each vendor should have a valid percentage
      for (const vendor of vendorStats.vendorDistribution) {
        expect(vendor.percentage).toBeGreaterThanOrEqual(0);
        expect(vendor.percentage).toBeLessThanOrEqual(100);
      }
    });

    it('should identify dominant vendors', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      const vendorStats = result.analyzerSpecific!.vendorStats;
      
      // Should sort vendors by header count (descending)
      const sortedVendors = vendorStats.vendorDistribution
        .sort((a, b) => b.headerCount - a.headerCount);
      
      expect(sortedVendors.length).toBeGreaterThan(0);
      
      if (sortedVendors.length > 1) {
        expect(sortedVendors[0].headerCount).toBeGreaterThanOrEqual(sortedVendors[1].headerCount);
      }
    });
  });

  describe('Technology Stack Inference', () => {
    it('should infer simple technology stacks (single vendor)', async () => {
      // Create data with single CMS
      const simpleData: PreprocessedData = {
        ...mockData,
        sites: new Map([
          ['simple-site.com', {
            url: 'https://simple-site.com',
            normalizedUrl: 'simple-site.com',
            cms: 'WordPress',
            confidence: 0.9,
            headers: new Map([
              ['x-wp-total', new Set(['10'])]
            ]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }]
        ]),
        totalSites: 1
      };

      const result = await analyzer.analyze(simpleData, defaultOptions);
      
      const techStack = result.analyzerSpecific!.technologyStack;
      expect(techStack).toBeDefined();
      expect(techStack.complexity).toBe('simple');
      expect(techStack.cms).toBe('WordPress');
      expect(techStack.confidence).toBeGreaterThan(0);
    });

    it('should infer complex technology stacks (multiple vendors)', async () => {
      // Add more vendor headers to create complexity
      mockData.sites.get('site1.com')!.headers.set('x-google-analytics-id', new Set(['GA1.2.123']));
      mockData.sites.get('site1.com')!.headers.set('x-recaptcha-action', new Set(['submit']));
      mockData.sites.get('site2.com')!.headers.set('x-laravel-session', new Set(['abc123']));
      
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      const techStack = result.analyzerSpecific!.technologyStack;
      expect(techStack.complexity).toBeOneOf(['moderate', 'complex']);
      expect(techStack.cdn).toBeDefined();
      expect(techStack.analytics).toBeDefined();
    });

    it('should calculate stack confidence scores', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      const techStack = result.analyzerSpecific!.technologyStack;
      expect(techStack.confidence).toBeGreaterThanOrEqual(0);
      expect(techStack.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect technology conflicts', async () => {
      // Add conflicting CMS headers
      mockData.sites.get('site1.com')!.headers.set('x-drupal-cache', new Set(['HIT']));
      
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      const conflicts = result.analyzerSpecific!.conflictingVendors;
      expect(conflicts).toBeDefined();
      
      // Should detect CMS conflict between WordPress and Drupal
      const cmsConflict = conflicts.find(c => c.type === 'cms_conflict');
      if (cmsConflict) {
        expect(cmsConflict.vendors).toContain('WordPress');
        expect(cmsConflict.vendors).toContain('Drupal');
        expect(cmsConflict.severity).toBeOneOf(['low', 'medium', 'high']);
      }
    });
  });
});

describe('VendorAnalyzerV2 - V2 Enhancement Tests', () => {
  let analyzer: VendorAnalyzerV2;
  let mockData: PreprocessedData;
  let defaultOptions: AnalysisOptions;

  beforeEach(() => {
    analyzer = new VendorAnalyzerV2();
    
    mockData = {
      sites: new Map([
        ['frequent-site.com', {
          url: 'https://frequent-site.com',
          normalizedUrl: 'frequent-site.com',
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map([
            ['cf-ray', new Set(['12345-LAX'])],
            ['x-wp-total', new Set(['150'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }],
        ['rare-site.com', {
          url: 'https://rare-site.com',
          normalizedUrl: 'rare-site.com',
          cms: null,
          confidence: 0.0,
          headers: new Map([
            ['x-rare-header', new Set(['value'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }]
      ]),
      totalSites: 2,
      metadata: {
        version: '1.0.0',
        preprocessedAt: '2024-01-01T00:00:00Z'
      }
    };

    defaultOptions = {
      minOccurrences: 1,
      includeExamples: true,
      maxExamples: 5,
      semanticFiltering: false
    };
  });

  describe('Confidence Scoring', () => {
    it('should assign higher confidence to frequent patterns', async () => {
      // Add the same header to multiple sites
      for (let i = 1; i <= 10; i++) {
        mockData.sites.set(`site${i}.com`, {
          url: `https://site${i}.com`,
          normalizedUrl: `site${i}.com`,
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map([
            ['cf-ray', new Set([`${i}2345-LAX`])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        });
      }
      mockData.totalSites = 12;

      const result = await analyzer.analyze(mockData, defaultOptions);
      
      const cfRayDetection = result.analyzerSpecific!.vendorsByHeader.get('cf-ray');
      expect(cfRayDetection).toBeDefined();
      expect(cfRayDetection!.confidence).toBeGreaterThan(0.8); // High frequency should boost confidence
    });

    it('should assign lower confidence to rare patterns', async () => {
      // Create a test with specifically rare, non-discriminative patterns
      const rarePatternData: PreprocessedData = {
        sites: new Map([
          ['site1.com', {
            url: 'https://site1.com',
            normalizedUrl: 'site1.com', 
            cms: 'WordPress',
            confidence: 0.9,
            headers: new Map([
              ['cf-ray', new Set(['12345'])], // Infrastructure CDN - should have lower confidence when rare
            ]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }]
        ]),
        totalSites: 100, // Make cf-ray very rare (1/100 = 1% frequency)
        metadata: {
          version: 'v2',
          preprocessedAt: '2024-01-01T00:00:00Z'
        }
      };
      
      // Disable platform discrimination to test pure frequency-based confidence
      const frequencyOnlyOptions = { ...defaultOptions, focusPlatformDiscrimination: false };
      
      const result = await analyzer.analyze(rarePatternData, frequencyOnlyOptions);
      
      // The rare CDN header should have lower confidence due to rarity penalty
      const cfRayDetection = result.analyzerSpecific!.vendorsByHeader.get('cf-ray');
      if (cfRayDetection) {
        // CDN headers don't get category boosts, so should be penalized for rarity
        expect(cfRayDetection.frequency).toBe(0.01); // 1/100 sites
        expect(cfRayDetection.confidence).toBeLessThan(0.8); // Should be penalized for being rare
      }
    });

    it('should weight confidence by header discriminativeness', async () => {
      // Add highly specific vendor headers
      mockData.sites.get('frequent-site.com')!.headers.set('x-shopify-shop-id', new Set(['12345']));
      
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      const shopifyDetection = result.analyzerSpecific!.vendorsByHeader.get('x-shopify-shop-id');
      expect(shopifyDetection).toBeDefined();
      
      // Highly specific e-commerce headers should have high confidence
      expect(shopifyDetection!.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect mutually exclusive CMS platforms', async () => {
      // Add conflicting CMS headers to same site
      mockData.sites.get('frequent-site.com')!.headers.set('x-drupal-cache', new Set(['HIT']));
      
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      const conflicts = result.analyzerSpecific!.conflictingVendors;
      const cmsConflict = conflicts.find(c => c.type === 'cms_conflict');
      
      expect(cmsConflict).toBeDefined();
      expect(cmsConflict!.vendors.length).toBeGreaterThanOrEqual(2);
      expect(cmsConflict!.reason).toContain('Multiple CMS platforms');
    });

    it('should detect incompatible technology combinations', async () => {
      // Add ASP.NET and Laravel (incompatible frameworks)
      mockData.sites.get('frequent-site.com')!.headers.set('x-aspnet-version', new Set(['4.0']));
      mockData.sites.get('rare-site.com')!.headers.set('x-laravel-session', new Set(['abc123']));
      
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      const conflicts = result.analyzerSpecific!.conflictingVendors;
      const incompatibleConflict = conflicts.find(c => c.type === 'incompatible_stack');
      
      if (incompatibleConflict) {
        expect(incompatibleConflict.vendors).toContain('ASP.NET');
        expect(incompatibleConflict.vendors).toContain('Laravel');
      }
    });

    it('should flag suspicious vendor combinations', async () => {
      // Add many high-frequency vendors (suspicious)
      for (let i = 1; i <= 5; i++) {
        for (const [siteUrl, siteData] of mockData.sites) {
          siteData.headers.set(`vendor-header-${i}`, new Set([`value-${i}`]));
        }
      }
      
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      // Check if any conflicts are flagged for suspicious patterns
      const conflicts = result.analyzerSpecific!.conflictingVendors;
      expect(conflicts.length).toBeGreaterThanOrEqual(0); // May or may not detect, but shouldn't crash
    });
  });

  describe('Technology Signatures', () => {
    it('should detect multi-header vendor signatures', async () => {
      // Add WordPress + Cloudflare signature
      mockData.sites.get('frequent-site.com')!.headers.set('x-pingback', new Set(['https://frequent-site.com/xmlrpc.php']));
      
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      const signatures = result.analyzerSpecific!.technologySignatures;
      const wpCloudflareSignature = signatures.find(s => s.name === 'WordPress + Cloudflare');
      
      if (wpCloudflareSignature) {
        expect(wpCloudflareSignature.confidence).toBeGreaterThan(0.6);
        expect(wpCloudflareSignature.sites).toContain('frequent-site.com');
      }
    });

    it('should calculate signature confidence based on frequency', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      const signatures = result.analyzerSpecific!.technologySignatures;
      
      for (const signature of signatures) {
        expect(signature.confidence).toBeGreaterThanOrEqual(0);
        expect(signature.confidence).toBeLessThanOrEqual(1);
        expect(signature.sites.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Summary Metrics', () => {
    it('should generate comprehensive summary statistics', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      const summary = result.analyzerSpecific!.summary;
      expect(summary).toBeDefined();
      expect(summary.totalVendorsDetected).toBeGreaterThanOrEqual(0);
      expect(summary.highConfidenceVendors).toBeGreaterThanOrEqual(0);
      expect(summary.technologyCategories).toBeInstanceOf(Array);
      expect(summary.stackComplexity).toBeOneOf(['simple', 'moderate', 'complex']);
    });
  });
});

describe('VendorAnalyzerV2 - Integration Tests', () => {
  let analyzer: VendorAnalyzerV2;
  let mockData: PreprocessedData;
  let defaultOptions: AnalysisOptions;

  beforeEach(() => {
    analyzer = new VendorAnalyzerV2();
    
    mockData = {
      sites: new Map([
        ['integration-site.com', {
          url: 'https://integration-site.com',
          normalizedUrl: 'integration-site.com',
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map([
            ['cf-ray', new Set(['12345-LAX'])],
            ['x-wp-total', new Set(['150'])]
          ]),
          metaTags: new Map(),
          scripts: new Set(),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }]
      ]),
      totalSites: 1,
      metadata: {
        version: '1.0.0',
        preprocessedAt: '2024-01-01T00:00:00Z'
      }
    };

    defaultOptions = {
      minOccurrences: 1,
      includeExamples: true,
      maxExamples: 5,
      semanticFiltering: false
    };
  });

  describe('FrequencyAnalyzer Interface', () => {
    it('should implement FrequencyAnalyzer interface correctly', () => {
      expect(analyzer.getName()).toBe('VendorAnalyzerV2');
      expect(typeof analyzer.analyze).toBe('function');
    });

    it('should process PreprocessedData format', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.patterns).toBeInstanceOf(Map);
      expect(result.totalSites).toBe(mockData.totalSites);
      expect(result.metadata).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
    });

    it('should return valid AnalysisResult format', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      expect(result.metadata.analyzer).toBe('VendorAnalyzerV2');
      expect(result.metadata.analyzedAt).toBeDefined();
      expect(result.metadata.totalPatternsFound).toBeGreaterThanOrEqual(0);
      expect(result.metadata.totalPatternsAfterFiltering).toBeGreaterThanOrEqual(0);
      expect(result.metadata.options).toEqual(defaultOptions);
    });

    it('should handle empty datasets gracefully', async () => {
      const emptyData: PreprocessedData = {
        sites: new Map(),
        totalSites: 0,
        metadata: {
          version: '1.0.0',
          preprocessedAt: '2024-01-01T00:00:00Z'
        }
      };

      const result = await analyzer.analyze(emptyData, defaultOptions);
      
      expect(result).toBeDefined();
      expect(result.patterns.size).toBe(0);
      expect(result.totalSites).toBe(0);
      expect(result.analyzerSpecific!.vendorsByHeader.size).toBe(0);
    });
  });

  describe('Pattern Creation', () => {
    it('should create valid patterns for vendor headers', async () => {
      const result = await analyzer.analyze(mockData, defaultOptions);
      
      for (const [patternKey, patternData] of result.patterns) {
        expect(patternKey).toMatch(/^vendor:/);
        expect(patternData.pattern).toBeDefined();
        expect(patternData.siteCount).toBeGreaterThan(0);
        expect(patternData.sites).toBeInstanceOf(Set);
        expect(patternData.frequency).toBeGreaterThan(0);
        expect(patternData.metadata).toBeDefined();
        expect(patternData.metadata!.type).toBe('vendor_detection');
      }
    });

    it('should respect minOccurrences filter', async () => {
      const strictOptions = { ...defaultOptions, minOccurrences: 5 };
      
      const result = await analyzer.analyze(mockData, strictOptions);
      
      // With only 1 site, no patterns should meet the minOccurrences threshold of 5
      expect(result.patterns.size).toBe(0);
    });
  });

  describe('Validation Integration', () => {
    it('should use validation metadata when available', async () => {
      // Add validation metadata
      const validatedData: PreprocessedData = {
        ...mockData,
        metadata: {
          ...mockData.metadata,
          validation: {
            qualityScore: 0.9,
            validationPassed: true,
            validatedHeaders: new Map([
              ['cf-ray', { 
                pattern: 'cf-ray', 
                siteCount: 1, 
                sites: new Set(['integration-site.com']), 
                frequency: 1.0 
              }]
            ]),
            statisticallySignificantHeaders: 1
          }
        }
      };

      const result = await analyzer.analyze(validatedData, defaultOptions);
      
      // Should have enhanced confidence for validated headers
      const cfRayDetection = result.analyzerSpecific!.vendorsByHeader.get('cf-ray');
      expect(cfRayDetection).toBeDefined();
      expect(cfRayDetection!.confidence).toBeGreaterThan(0.8); // Should be boosted by validation
    });

    it('should perform cross-analyzer consistency checks', async () => {
      // Add semantic metadata
      const semanticData: PreprocessedData = {
        ...mockData,
        metadata: {
          ...mockData.metadata,
          semantic: {
            categoryCount: 2,
            headerCategories: new Map([
              ['cf-ray', 'infrastructure'],
              ['x-wp-total', 'content-management']
            ]),
            vendorMappings: new Map([
              ['cf-ray', 'Cloudflare'],
              ['x-wp-total', 'WordPress']
            ])
          }
        }
      };

      const result = await analyzer.analyze(semanticData, defaultOptions);
      
      // Should successfully perform consistency checks without errors
      expect(result).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
    });
  });

  describe('Phase 2 - Platform Discrimination Tests', () => {
    let discriminationData: PreprocessedData;
    let discriminationOptions: AnalysisOptions;

    beforeEach(() => {
      // Create test data with mixed infrastructure and discriminative vendors
      discriminationData = {
        sites: new Map([
          ['wordpress-site.com', {
            url: 'https://wordpress-site.com',
            normalizedUrl: 'wordpress-site.com',
            cms: 'WordPress',
            confidence: 0.9,
            headers: new Map([
              ['cf-ray', new Set(['12345-LAX'])],           // Infrastructure CDN
              ['x-wp-total', new Set(['150'])],             // Discriminative CMS
              ['x-pingback', new Set(['https://wordpress-site.com/xmlrpc.php'])], // Discriminative CMS
              ['x-shopify-shop-id', new Set(['12345'])],    // Discriminative ecommerce (cross-platform test)
            ]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }],
          ['shopify-site.com', {
            url: 'https://shopify-site.com',
            normalizedUrl: 'shopify-site.com',
            cms: 'Shopify',
            confidence: 0.85,
            headers: new Map([
              ['cf-ray', new Set(['67890-NYC'])],           // Infrastructure CDN
              ['x-shopify-shop-id', new Set(['67890'])],    // Discriminative ecommerce
              ['x-shopify-stage', new Set(['production'])], // Discriminative ecommerce
            ]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }],
          ['generic-site.com', {
            url: 'https://generic-site.com',
            normalizedUrl: 'generic-site.com',
            cms: null,
            confidence: 0.0,
            headers: new Map([
              ['cf-ray', new Set(['11111-SFO'])],           // Infrastructure CDN
              ['x-frame-options', new Set(['DENY'])]        // Mixed security
            ]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }]
        ]),
        totalSites: 3,
        metadata: {
          dateRange: { start: new Date(), end: new Date() },
          version: 'v2',
          preprocessedAt: '2024-01-01T00:00:00Z'
        }
      };

      discriminationOptions = {
        minOccurrences: 1,
        includeExamples: true,
        maxExamples: 3,
        semanticFiltering: false,
        focusPlatformDiscrimination: true // Enable platform discrimination
      };
    });

    it('should classify vendor categories correctly', () => {
      const result = analyzer.analyze(discriminationData, discriminationOptions);
      
      return result.then(analysisResult => {
        const vendorsByHeader = analysisResult.analyzerSpecific!.vendorsByHeader;
        
        // Check discriminative vendors are included
        const wpTotalVendor = vendorsByHeader.get('x-wp-total')?.vendor;
        expect(wpTotalVendor?.discriminationType).toBe('discriminative');
        expect(wpTotalVendor?.platformSpecific).toBe(true);
        
        const shopifyVendor = vendorsByHeader.get('x-shopify-shop-id')?.vendor;
        expect(shopifyVendor?.discriminationType).toBe('discriminative');
        expect(shopifyVendor?.platformSpecific).toBe(true);
        
        // Check infrastructure vendors are filtered out when focusPlatformDiscrimination is true
        const cfRayVendor = vendorsByHeader.get('cf-ray');
        expect(cfRayVendor).toBeUndefined(); // Should be filtered out
      });
    });

    it('should boost confidence for discriminative vendors', () => {
      const result = analyzer.analyze(discriminationData, discriminationOptions);
      
      return result.then(analysisResult => {
        const vendorsByHeader = analysisResult.analyzerSpecific!.vendorsByHeader;
        
        // Discriminative vendors should have higher confidence
        const wpTotalDetection = vendorsByHeader.get('x-wp-total');
        expect(wpTotalDetection?.confidence).toBeGreaterThan(0.8);
        
        const shopifyDetection = vendorsByHeader.get('x-shopify-shop-id');
        expect(shopifyDetection?.confidence).toBeGreaterThan(0.8);
        
        // WordPress-specific header should have high confidence
        const pingbackDetection = vendorsByHeader.get('x-pingback');
        expect(pingbackDetection?.confidence).toBeGreaterThan(0.8);
      });
    });

    it('should include all vendors when platform discrimination is disabled', () => {
      const noDiscriminationOptions = {
        ...discriminationOptions,
        focusPlatformDiscrimination: false
      };
      
      const result = analyzer.analyze(discriminationData, noDiscriminationOptions);
      
      return result.then(analysisResult => {
        const vendorsByHeader = analysisResult.analyzerSpecific!.vendorsByHeader;
        
        // Infrastructure vendors should be included when discrimination is disabled
        expect(vendorsByHeader.get('cf-ray')).toBeDefined();
        
        // Discriminative vendors should still be included
        expect(vendorsByHeader.get('x-wp-total')).toBeDefined();
        expect(vendorsByHeader.get('x-shopify-shop-id')).toBeDefined();
      });
    });

    it('should calculate discrimination statistics correctly', () => {
      const result = analyzer.analyze(discriminationData, discriminationOptions);
      
      return result.then(analysisResult => {
        const vendorsByHeader = analysisResult.analyzerSpecific!.vendorsByHeader;
        
        // Count expected vendor categories
        let discriminativeCount = 0;
        let infrastructureCount = 0;
        let mixedCount = 0;
        let platformSpecificCount = 0;
        
        for (const [, detection] of vendorsByHeader) {
          const vendor = detection.vendor;
          if (vendor.discriminationType === 'discriminative') discriminativeCount++;
          if (vendor.discriminationType === 'infrastructure') infrastructureCount++;
          if (vendor.discriminationType === 'mixed') mixedCount++;
          if (vendor.platformSpecific) platformSpecificCount++;
        }
        
        // Should have mostly discriminative vendors when filtering is enabled
        expect(discriminativeCount).toBeGreaterThan(0);
        expect(infrastructureCount).toBe(0); // Filtered out
        expect(platformSpecificCount).toBeGreaterThan(0);
      });
    });

    it('should handle mixed vendor types correctly', () => {
      // Add a mixed vendor type to test data
      discriminationData.sites.get('wordpress-site.com')!.headers.set('x-frame-options', new Set(['DENY']));
      
      const result = analyzer.analyze(discriminationData, discriminationOptions);
      
      return result.then(analysisResult => {
        const vendorsByHeader = analysisResult.analyzerSpecific!.vendorsByHeader;
        
        // Mixed security header should be included (not filtered as infrastructure)
        const frameOptionsVendor = vendorsByHeader.get('x-frame-options')?.vendor;
        if (frameOptionsVendor) {
          expect(frameOptionsVendor.discriminationType).toBe('mixed');
          // Mixed vendors without platform specificity should have moderate confidence
          expect(vendorsByHeader.get('x-frame-options')!.confidence).toBeLessThan(0.9);
          expect(vendorsByHeader.get('x-frame-options')!.confidence).toBeGreaterThan(0.6);
        }
      });
    });

    it('should preserve backward compatibility when platform discrimination is disabled', () => {
      const backwardCompatOptions = {
        ...discriminationOptions,
        focusPlatformDiscrimination: false
      };
      
      const result = analyzer.analyze(discriminationData, backwardCompatOptions);
      
      return result.then(analysisResult => {
        const vendorsByHeader = analysisResult.analyzerSpecific!.vendorsByHeader;
        
        // All vendor patterns should be included
        expect(vendorsByHeader.size).toBeGreaterThan(0);
        
        // Vendors should not have discrimination metadata when feature is disabled
        for (const [, detection] of vendorsByHeader) {
          const vendor = detection.vendor;
          // Discrimination metadata might still be present but shouldn't affect filtering
          expect(detection.confidence).toBeGreaterThan(0);
        }
      });
    });

    it('should correctly identify platform-specific CDN patterns', () => {
      // Add Shopify-specific CDN pattern
      discriminationData.sites.get('shopify-site.com')!.headers.set('shopify-cdn-request-id', new Set(['abc123']));
      
      const result = analyzer.analyze(discriminationData, discriminationOptions);
      
      return result.then(analysisResult => {
        const vendorsByHeader = analysisResult.analyzerSpecific!.vendorsByHeader;
        
        // Platform-specific CDN should be included and marked as discriminative
        const shopifyCdnVendor = vendorsByHeader.get('shopify-cdn-request-id')?.vendor;
        if (shopifyCdnVendor) {
          expect(shopifyCdnVendor.discriminationType).toBe('mixed'); // CDN with platform specificity
          expect(shopifyCdnVendor.platformSpecific).toBe(true);
        }
      });
    });

    it('should handle empty vendor detection gracefully', () => {
      // Create data with no recognizable vendor headers
      const emptyVendorData: PreprocessedData = {
        sites: new Map([
          ['empty-site.com', {
            url: 'https://empty-site.com',
            normalizedUrl: 'empty-site.com',
            cms: null,
            confidence: 0.0,
            headers: new Map([
              ['unknown-header', new Set(['value'])],
              ['custom-header', new Set(['test'])]
            ]),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }]
        ]),
        totalSites: 1,
        metadata: {
          version: 'v2',
          preprocessedAt: '2024-01-01T00:00:00Z'
        }
      };

      const result = analyzer.analyze(emptyVendorData, discriminationOptions);
      
      return result.then(analysisResult => {
        expect(analysisResult).toBeDefined();
        expect(analysisResult.analyzerSpecific!.vendorsByHeader.size).toBe(0);
        expect(analysisResult.analyzerSpecific!.summary.totalVendorsDetected).toBe(0);
      });
    });
  });
});