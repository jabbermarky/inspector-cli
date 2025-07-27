/**
 * CMSEnhancedScriptV2 Tests
 * 
 * Comprehensive test suite for enhanced CMS script analysis covering:
 * - 8+ platform categories (CMS, E-commerce, Frameworks, Builders, etc.)
 * - Pattern detection and confidence scoring
 * - Technology stack analysis
 * - Cross-platform pattern recognition
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CMSEnhancedScriptV2 } from '../cms-enhanced-script-v2.js';
import type { PreprocessedData, AnalysisOptions } from '../../types/analyzer-interface.js';

// Mock logger
vi.mock('../../../utils/logger.js', () => ({
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }))
}));

describe('CMSEnhancedScriptV2', () => {
  let analyzer: CMSEnhancedScriptV2;
  let testData: PreprocessedData;
  let options: AnalysisOptions;

  beforeEach(() => {
    analyzer = new CMSEnhancedScriptV2();
    options = {
      minOccurrences: 1,
      includeExamples: true,
      maxExamples: 3,
      semanticFiltering: false
    };

    // Create comprehensive test data covering multiple platform categories
    testData = {
      sites: new Map([
        ['wordpress-site.com', {
          url: 'https://wordpress-site.com',
          normalizedUrl: 'wordpress-site.com',
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map(),
          metaTags: new Map(),
          scripts: new Set([
            'https://wordpress-site.com/wp-content/themes/twentytwentythree/assets/js/navigation.js',
            'https://wordpress-site.com/wp-content/plugins/woocommerce/assets/js/frontend/woocommerce.min.js',
            'https://wordpress-site.com/wp-includes/js/jquery/jquery.min.js',
            'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js',
            'https://www.google-analytics.com/analytics.js'
          ]),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }],
        ['shopify-store.com', {
          url: 'https://shopify-store.com',
          normalizedUrl: 'shopify-store.com',
          cms: 'Unknown',
          confidence: 0.0,
          headers: new Map(),
          metaTags: new Map(),
          scripts: new Set([
            'https://cdn.shopify.com/s/files/1/0123/4567/t/1/assets/theme.js',
            'https://shopifycloud.com/checkout/assets/checkout.js',
            'https://monorail-edge.shopifysvc.com/v1/produce',
            'https://cdn.shopify.com/shopifycloud/shopify-analytics/analytics.js'
          ]),
          technologies: new Set(),
          capturedAt: '2024-01-02T00:00:00Z'
        }],
        ['react-app.com', {
          url: 'https://react-app.com',
          normalizedUrl: 'react-app.com',
          cms: 'Unknown',
          confidence: 0.0,
          headers: new Map(),
          metaTags: new Map(),
          scripts: new Set([
            'https://react-app.com/_next/static/chunks/webpack-8fa1640cc84ba8fe.js',
            'https://react-app.com/_next/static/chunks/framework-2c79e2a64abdb08b.js',
            'https://unpkg.com/react@18/umd/react.production.min.js',
            'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
            'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID'
          ]),
          technologies: new Set(),
          capturedAt: '2024-01-03T00:00:00Z'
        }],
        ['drupal-site.com', {
          url: 'https://drupal-site.com',
          normalizedUrl: 'drupal-site.com',
          cms: 'Drupal',
          confidence: 0.85,
          headers: new Map(),
          metaTags: new Map(),
          scripts: new Set([
            'https://drupal-site.com/core/misc/drupal.js',
            'https://drupal-site.com/modules/contrib/views/js/views.js',
            'https://drupal-site.com/themes/contrib/bootstrap/js/bootstrap.min.js',
            'https://drupal-site.com/sites/default/files/js/js_abc123.js'
          ]),
          technologies: new Set(),
          capturedAt: '2024-01-04T00:00:00Z'
        }],
        ['wix-site.com', {
          url: 'https://wix-site.com',
          normalizedUrl: 'wix-site.com',
          cms: 'Unknown',
          confidence: 0.0,
          headers: new Map(),
          metaTags: new Map(),
          scripts: new Set([
            'https://static.wixstatic.com/services/web-api/js/wix-web-api.min.js',
            'https://static.parastorage.com/services/wix-code-viewer-app/1.2345.0/viewerScript.bundle.min.js',
            'https://static.wixstatic.com/site-analytics/analytics.js'
          ]),
          technologies: new Set(),
          capturedAt: '2024-01-05T00:00:00Z'
        }],
        ['angular-app.com', {
          url: 'https://angular-app.com',
          normalizedUrl: 'angular-app.com',
          cms: 'Unknown',
          confidence: 0.0,
          headers: new Map(),
          metaTags: new Map(),
          scripts: new Set([
            'https://angular-app.com/runtime.js',
            'https://angular-app.com/polyfills.js',
            'https://angular-app.com/main.js',
            'https://cdn.jsdelivr.net/npm/@angular/core@15/bundles/core.umd.min.js'
          ]),
          technologies: new Set(),
          capturedAt: '2024-01-06T00:00:00Z'
        }]
      ]),
      totalSites: 6,
      metadata: {
        collectedAt: new Date().toISOString(),
        source: 'test-data'
      }
    };
  });

  describe('Basic Functionality', () => {
    it('should have correct analyzer name', () => {
      expect(analyzer.getName()).toBe('CMSEnhancedScriptV2');
    });

    it('should extend ScriptAnalyzerV2 functionality', async () => {
      const result = await analyzer.analyze(testData, options);
      
      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      expect(result.metadata.analyzer).toBe('CMSEnhancedScriptV2');
    });

    it('should provide enhanced script analysis data', async () => {
      const result = await analyzer.analyze(testData, options);
      const enhanced = result.analyzerSpecific!;
      
      // Enhanced CMS-specific data
      expect(enhanced.detectedPlatforms).toBeDefined();
      expect(enhanced.technologyStack).toBeDefined();
      expect(enhanced.cmsInsights).toBeDefined();
      expect(enhanced.deploymentAnalysis).toBeDefined();
      expect(enhanced.securityAnalysis).toBeDefined();
    });
  });

  describe('CMS Platform Detection', () => {
    it('should detect WordPress from wp-content patterns', async () => {
      const result = await analyzer.analyze(testData, options);
      const platforms = result.analyzerSpecific!.detectedPlatforms;
      
      const wordPressPlatforms = Array.from(platforms.values())
        .filter(p => p.platform.toLowerCase().includes('wordpress'));
      
      expect(wordPressPlatforms.length).toBeGreaterThan(0);
      expect(wordPressPlatforms[0].category).toBe('cms');
      expect(wordPressPlatforms[0].confidence).toBeGreaterThan(0.5);
    });

    it('should detect Shopify e-commerce platform', async () => {
      const result = await analyzer.analyze(testData, options);
      const platforms = result.analyzerSpecific!.detectedPlatforms;
      
      const shopifyPlatforms = Array.from(platforms.values())
        .filter(p => p.platform.toLowerCase().includes('shopify'));
      
      expect(shopifyPlatforms.length).toBeGreaterThan(0);
      expect(shopifyPlatforms[0].category).toBe('ecommerce');
      expect(shopifyPlatforms[0].confidence).toBeGreaterThan(0.7);
    });

    it('should detect Drupal CMS patterns', async () => {
      const result = await analyzer.analyze(testData, options);
      const platforms = result.analyzerSpecific!.detectedPlatforms;
      
      const drupalPlatforms = Array.from(platforms.values())
        .filter(p => p.platform.toLowerCase().includes('drupal'));
      
      expect(drupalPlatforms.length).toBeGreaterThan(0);
      expect(drupalPlatforms[0].category).toBe('cms');
    });

    it('should detect Wix website builder', async () => {
      const result = await analyzer.analyze(testData, options);
      const platforms = result.analyzerSpecific!.detectedPlatforms;
      
      const wixPlatforms = Array.from(platforms.values())
        .filter(p => p.platform.toLowerCase().includes('wix'));
      
      expect(wixPlatforms.length).toBeGreaterThan(0);
      expect(wixPlatforms[0].category).toBe('builder');
    });
  });

  describe('JavaScript Framework Detection', () => {
    it('should detect React/Next.js framework patterns', async () => {
      const result = await analyzer.analyze(testData, options);
      const platforms = result.analyzerSpecific!.detectedPlatforms;
      
      const reactPlatforms = Array.from(platforms.values())
        .filter(p => p.platform.toLowerCase().includes('react') || p.platform.toLowerCase().includes('next'));
      
      expect(reactPlatforms.length).toBeGreaterThan(0);
      
      const reactPlatform = reactPlatforms.find(p => p.platform.toLowerCase().includes('react'));
      if (reactPlatform) {
        expect(reactPlatform.category).toBe('framework');
        expect(reactPlatform.confidence).toBeGreaterThan(0.6);
      }
    });

    it('should detect Angular framework patterns', async () => {
      const result = await analyzer.analyze(testData, options);
      const platforms = result.analyzerSpecific!.detectedPlatforms;
      
      const angularPlatforms = Array.from(platforms.values())
        .filter(p => p.platform.toLowerCase().includes('angular'));
      
      expect(angularPlatforms.length).toBeGreaterThan(0);
      expect(angularPlatforms[0].category).toBe('framework');
    });

    it('should include framework evidence patterns', async () => {
      const result = await analyzer.analyze(testData, options);
      const platforms = result.analyzerSpecific!.detectedPlatforms;
      
      for (const platform of platforms.values()) {
        if (platform.category === 'framework') {
          expect(platform.evidencePatterns.length).toBeGreaterThan(0);
          expect(Array.isArray(platform.evidencePatterns)).toBe(true);
        }
      }
    });
  });

  describe('Technology Stack Analysis', () => {
    it('should analyze comprehensive technology stack', async () => {
      const result = await analyzer.analyze(testData, options);
      const techStack = result.analyzerSpecific!.technologyStack;
      
      expect(techStack.frontend).toBeDefined();
      expect(techStack.backend).toBeDefined();
      expect(techStack.cms).toBeDefined();
      expect(techStack.ecommerce).toBeDefined();
      expect(techStack.analytics).toBeDefined();
      expect(techStack.libraries).toBeDefined();
      expect(techStack.frameworks).toBeDefined();
      expect(techStack.complexity).toBeDefined();
      expect(techStack.modernityScore).toBeDefined();
    });

    it('should identify CMS technologies', async () => {
      const result = await analyzer.analyze(testData, options);
      const techStack = result.analyzerSpecific!.technologyStack;
      
      expect(techStack.cms.length).toBeGreaterThan(0);
      expect(techStack.cms).toEqual(expect.arrayContaining([
        expect.stringMatching(/wordpress|drupal/i)
      ]));
    });

    it('should identify e-commerce platforms', async () => {
      const result = await analyzer.analyze(testData, options);
      const techStack = result.analyzerSpecific!.technologyStack;
      
      expect(techStack.ecommerce.length).toBeGreaterThan(0);
      expect(techStack.ecommerce).toEqual(expect.arrayContaining([
        expect.stringMatching(/shopify|woocommerce/i)
      ]));
    });

    it('should identify frontend frameworks', async () => {
      const result = await analyzer.analyze(testData, options);
      const techStack = result.analyzerSpecific!.technologyStack;
      
      expect(techStack.frontend.length).toBeGreaterThan(0);
      expect(techStack.frameworks.length).toBeGreaterThan(0);
    });

    it('should calculate complexity correctly', async () => {
      const result = await analyzer.analyze(testData, options);
      const techStack = result.analyzerSpecific!.technologyStack;
      
      expect(['simple', 'moderate', 'complex', 'enterprise']).toContain(techStack.complexity);
      
      // With our diverse test data, should be at least moderate
      expect(['moderate', 'complex', 'enterprise']).toContain(techStack.complexity);
    });

    it('should calculate modernity score', async () => {
      const result = await analyzer.analyze(testData, options);
      const techStack = result.analyzerSpecific!.technologyStack;
      
      expect(techStack.modernityScore).toBeGreaterThanOrEqual(0);
      expect(techStack.modernityScore).toBeLessThanOrEqual(1);
      
      // Should have some modern patterns (React, Angular)
      expect(techStack.modernityScore).toBeGreaterThan(0);
    });
  });

  describe('CMS Insights Generation', () => {
    it('should generate comprehensive CMS insights', async () => {
      const result = await analyzer.analyze(testData, options);
      const insights = result.analyzerSpecific!.cmsInsights;
      
      expect(insights.primaryCMS).toBeDefined();
      expect(insights.cmsConfidence).toBeGreaterThanOrEqual(0);
      expect(insights.cmsConfidence).toBeLessThanOrEqual(1);
      expect(typeof insights.multiCMSDetected).toBe('boolean');
      expect(Array.isArray(insights.migrationPatterns)).toBe(true);
      expect(Array.isArray(insights.customizations)).toBe(true);
      expect(insights.pluginEcosystem).toBeDefined();
    });

    it('should detect primary CMS correctly', async () => {
      const result = await analyzer.analyze(testData, options);
      const insights = result.analyzerSpecific!.cmsInsights;
      
      // Should detect WordPress as primary (highest confidence)
      expect(insights.primaryCMS).toBeDefined();
      expect(insights.cmsConfidence).toBeGreaterThan(0.5);
    });

    it('should detect multi-CMS scenarios', async () => {
      const result = await analyzer.analyze(testData, options);
      const insights = result.analyzerSpecific!.cmsInsights;
      
      // With WordPress and Drupal in test data
      expect(insights.multiCMSDetected).toBe(true);
    });

    it('should initialize plugin ecosystem', async () => {
      const result = await analyzer.analyze(testData, options);
      const ecosystem = result.analyzerSpecific!.cmsInsights.pluginEcosystem;
      
      expect(Array.isArray(ecosystem.detectedPlugins)).toBe(true);
      expect(Array.isArray(ecosystem.commercialPlugins)).toBe(true);
      expect(Array.isArray(ecosystem.securityPlugins)).toBe(true);
      expect(Array.isArray(ecosystem.performancePlugins)).toBe(true);
      expect(typeof ecosystem.totalPluginCount).toBe('number');
    });
  });

  describe('Deployment Analysis', () => {
    it('should analyze deployment environment', async () => {
      const result = await analyzer.analyze(testData, options);
      const deployment = result.analyzerSpecific!.deploymentAnalysis;
      
      expect(['development', 'staging', 'production', 'mixed']).toContain(deployment.environment);
      expect(deployment.minificationLevel).toBeGreaterThanOrEqual(0);
      expect(deployment.minificationLevel).toBeLessThanOrEqual(1);
      expect(Array.isArray(deployment.cachingStrategy)).toBe(true);
      expect(typeof deployment.bundlingDetected).toBe('boolean');
      expect(typeof deployment.sourceMapDetected).toBe('boolean');
    });

    it('should detect minification level', async () => {
      const result = await analyzer.analyze(testData, options);
      const deployment = result.analyzerSpecific!.deploymentAnalysis;
      
      // Test data includes .min.js files, so should detect minification
      expect(deployment.minificationLevel).toBeGreaterThan(0);
    });

    it('should detect CDN usage in caching strategy', async () => {
      const result = await analyzer.analyze(testData, options);
      const deployment = result.analyzerSpecific!.deploymentAnalysis;
      
      // Test data includes CDN scripts
      expect(deployment.cachingStrategy).toContain('cdn');
    });

    it('should detect bundling patterns', async () => {
      const result = await analyzer.analyze(testData, options);
      const deployment = result.analyzerSpecific!.deploymentAnalysis;
      
      // Next.js uses webpack bundling
      expect(deployment.bundlingDetected).toBe(true);
    });
  });

  describe('Security Analysis', () => {
    it('should analyze security patterns', async () => {
      const result = await analyzer.analyze(testData, options);
      const security = result.analyzerSpecific!.securityAnalysis;
      
      expect(Array.isArray(security.securityHeaders)).toBe(true);
      expect(['low', 'moderate', 'high', 'aggressive']).toContain(security.trackingIntensity);
      expect(Array.isArray(security.privacyCompliance)).toBe(true);
      expect(Array.isArray(security.vulnerabilityIndicators)).toBe(true);
      expect(typeof security.contentSecurityPolicy).toBe('boolean');
    });

    it('should detect tracking intensity', async () => {
      const result = await analyzer.analyze(testData, options);
      const security = result.analyzerSpecific!.securityAnalysis;
      
      // Test data includes Google Analytics, so should detect tracking
      expect(['moderate', 'high', 'aggressive']).toContain(security.trackingIntensity);
    });
  });

  describe('Pattern Enhancement', () => {
    it('should enhance base patterns with CMS intelligence', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // Should have more patterns than base ScriptAnalyzerV2
      expect(result.patterns.size).toBeGreaterThan(5);
      
      // Check for CMS-enhanced patterns
      const cmsPatterns = Array.from(result.patterns.keys())
        .filter(p => p.includes('cms:') || p.includes('ecommerce:') || p.includes('framework:'));
      
      expect(cmsPatterns.length).toBeGreaterThan(0);
    });

    it('should include pattern metadata', async () => {
      const result = await analyzer.analyze(testData, options);
      
      for (const pattern of result.patterns.values()) {
        expect(pattern.metadata).toBeDefined();
        if (pattern.metadata?.source === 'cms_intelligence') {
          expect(pattern.metadata.type).toBe('cms_enhanced');
          expect(pattern.metadata.category).toBeDefined();
        }
      }
    });

    it('should calculate accurate frequencies', async () => {
      const result = await analyzer.analyze(testData, options);
      
      for (const pattern of result.patterns.values()) {
        expect(pattern.frequency).toBe(pattern.siteCount / testData.totalSites);
        expect(pattern.frequency).toBeGreaterThanOrEqual(0);
        expect(pattern.frequency).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Confidence Scoring', () => {
    it('should assign appropriate confidence scores', async () => {
      const result = await analyzer.analyze(testData, options);
      const platforms = result.analyzerSpecific!.detectedPlatforms;
      
      for (const platform of platforms.values()) {
        expect(platform.confidence).toBeGreaterThanOrEqual(0);
        expect(platform.confidence).toBeLessThanOrEqual(1);
        
        // High-specificity patterns should have higher confidence
        if (platform.evidencePatterns.some(p => p.includes('wp-admin') || p.includes('shopify'))) {
          expect(platform.confidence).toBeGreaterThan(0.7);
        }
      }
    });

    it('should boost confidence for CMS context matches', async () => {
      const result = await analyzer.analyze(testData, options);
      const platforms = result.analyzerSpecific!.detectedPlatforms;
      
      // WordPress patterns should have high confidence when detected on WordPress site
      const wordPressPlatforms = Array.from(platforms.values())
        .filter(p => p.platform.toLowerCase().includes('wordpress'));
      
      if (wordPressPlatforms.length > 0) {
        expect(wordPressPlatforms[0].confidence).toBeGreaterThan(0.6);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty script data gracefully', async () => {
      const emptyData: PreprocessedData = {
        sites: new Map([
          ['empty-site.com', {
            url: 'https://empty-site.com',
            normalizedUrl: 'empty-site.com',
            cms: 'Unknown',
            confidence: 0.0,
            headers: new Map(),
            metaTags: new Map(),
            scripts: new Set(),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }]
        ]),
        totalSites: 1,
        metadata: { collectedAt: new Date().toISOString(), source: 'test' }
      };

      const result = await analyzer.analyze(emptyData, options);
      
      expect(result).toBeDefined();
      expect(result.analyzerSpecific.detectedPlatforms.size).toBe(0);
      expect(result.analyzerSpecific.technologyStack.complexity).toBe('simple');
    });

    it('should handle malformed script URLs', async () => {
      const malformedData: PreprocessedData = {
        sites: new Map([
          ['malformed-site.com', {
            url: 'https://malformed-site.com',
            normalizedUrl: 'malformed-site.com',
            cms: 'Unknown',
            confidence: 0.0,
            headers: new Map(),
            metaTags: new Map(),
            scripts: new Set([
              'not-a-url',
              'file:///local/file.js',
              'javascript:void(0)',
              'inline:console.log("test");'
            ]),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }]
        ]),
        totalSites: 1,
        metadata: { collectedAt: new Date().toISOString(), source: 'test' }
      };

      const result = await analyzer.analyze(malformedData, options);
      
      expect(result).toBeDefined();
      // Should not crash and should handle gracefully
      expect(result.analyzerSpecific).toBeDefined();
    });

    it('should filter patterns by minimum occurrences', async () => {
      const highThresholdOptions = { ...options, minOccurrences: 3 };
      const result = await analyzer.analyze(testData, highThresholdOptions);
      
      // With high threshold, fewer patterns should be returned
      for (const pattern of result.patterns.values()) {
        expect(pattern.siteCount).toBeGreaterThanOrEqual(highThresholdOptions.minOccurrences);
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();
      await analyzer.analyze(testData, options);
      const duration = Date.now() - startTime;
      
      // Should complete within 1 second for test dataset
      expect(duration).toBeLessThan(1000);
    });

    it('should handle larger datasets efficiently', async () => {
      // Create larger dataset
      const largeData: PreprocessedData = {
        sites: new Map(),
        totalSites: 20,
        metadata: { collectedAt: new Date().toISOString(), source: 'test' }
      };

      // Generate 20 test sites
      for (let i = 1; i <= 20; i++) {
        largeData.sites.set(`site${i}.com`, {
          url: `https://site${i}.com`,
          normalizedUrl: `site${i}.com`,
          cms: i % 3 === 0 ? 'WordPress' : i % 3 === 1 ? 'Drupal' : 'Unknown',
          confidence: 0.8,
          headers: new Map(),
          metaTags: new Map(),
          scripts: new Set([
            `https://site${i}.com/assets/js/main.js`,
            'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js'
          ]),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        });
      }

      const startTime = Date.now();
      const result = await analyzer.analyze(largeData, options);
      const duration = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});