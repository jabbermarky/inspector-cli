/**
 * TechnologyAnalyzerV2 Tests
 * 
 * Comprehensive test suite covering:
 * - Cross-analyzer technology detection (headers, meta, scripts)
 * - Technology stack categorization and analysis
 * - Version analysis and trend detection
 * - FrequencyAggregator integration compatibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TechnologyAnalyzerV2 } from '../technology-analyzer-v2.js';
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

describe('TechnologyAnalyzerV2', () => {
  let analyzer: TechnologyAnalyzerV2;
  let testData: PreprocessedData;
  let options: AnalysisOptions;

  beforeEach(() => {
    analyzer = new TechnologyAnalyzerV2();
    options = {
      minOccurrences: 1,
      includeExamples: true,
      maxExamples: 3,
      semanticFiltering: false
    };

    // Create comprehensive test data covering multiple technology categories
    testData = {
      sites: new Map([
        ['react-app.com', {
          url: 'https://react-app.com',
          normalizedUrl: 'react-app.com',
          cms: 'Unknown',
          confidence: 0.0,
          headers: new Map([
            ['server', new Set(['nginx/1.18.0'])],
            ['x-powered-by', new Set(['Express'])],
            ['cf-ray', new Set(['abc123-DEF'])],
            ['strict-transport-security', new Set(['max-age=31536000'])]
          ]),
          metaTags: new Map([
            ['next-head-count', new Set(['5'])],
            ['viewport', new Set(['width=device-width, initial-scale=1'])]
          ]),
          scripts: new Set([
            'https://react-app.com/_next/static/chunks/webpack-8fa1640cc84ba8fe.js',
            'https://react-app.com/_next/static/chunks/framework-2c79e2a64abdb08b.js',
            'https://unpkg.com/react@18/umd/react.production.min.js',
            'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID',
            'https://cdn.jsdelivr.net/npm/webpack@5.0.0/dist/webpack.min.js'
          ]),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        }],
        ['wordpress-site.com', {
          url: 'https://wordpress-site.com',
          normalizedUrl: 'wordpress-site.com',
          cms: 'WordPress',
          confidence: 0.9,
          headers: new Map([
            ['server', new Set(['Apache/2.4.41'])],
            ['x-powered-by', new Set(['PHP/8.0.0'])],
            ['x-wp-total', new Set(['150'])],
            ['x-wp-totalpages', new Set(['15'])]
          ]),
          metaTags: new Map([
            ['generator', new Set(['WordPress 6.2.1'])],
            ['og:site_name', new Set(['My WordPress Site'])]
          ]),
          scripts: new Set([
            'https://wordpress-site.com/wp-content/themes/twentytwentythree/assets/js/navigation.js',
            'https://wordpress-site.com/wp-content/plugins/woocommerce/assets/js/frontend/woocommerce.min.js',
            'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js',
            'https://www.google-analytics.com/analytics.js'
          ]),
          technologies: new Set(),
          capturedAt: '2024-01-02T00:00:00Z'
        }],
        ['shopify-store.com', {
          url: 'https://shopify-store.com',
          normalizedUrl: 'shopify-store.com',
          cms: 'Unknown',
          confidence: 0.0,
          headers: new Map([
            ['server', new Set(['nginx'])],
            ['x-shopify-shop-id', new Set(['12345'])],
            ['x-amz-cf-id', new Set(['CloudFront123'])],
            ['x-amz-cf-pop', new Set(['LAX1-C1'])]
          ]),
          metaTags: new Map([
            ['shopify-checkout-api-token', new Set(['abc123'])],
            ['og:type', new Set(['website'])]
          ]),
          scripts: new Set([
            'https://cdn.shopify.com/s/files/1/0123/4567/t/1/assets/theme.js',
            'https://shopifycloud.com/checkout/assets/checkout.js',
            'https://cdn.shopify.com/shopifycloud/shopify-analytics/analytics.js'
          ]),
          technologies: new Set(),
          capturedAt: '2024-01-03T00:00:00Z'
        }],
        ['angular-app.com', {
          url: 'https://angular-app.com',
          normalizedUrl: 'angular-app.com',
          cms: 'Unknown',
          confidence: 0.0,
          headers: new Map([
            ['server', new Set(['nginx/1.20.1'])],
            ['x-powered-by', new Set(['Express'])]
          ]),
          metaTags: new Map([
            ['ng-version', new Set(['15.2.0'])],
            ['viewport', new Set(['width=device-width, initial-scale=1'])]
          ]),
          scripts: new Set([
            'https://angular-app.com/runtime.js',
            'https://angular-app.com/polyfills.js',
            'https://angular-app.com/main.js',
            'https://cdn.jsdelivr.net/npm/@angular/core@15/bundles/core.umd.min.js'
          ]),
          technologies: new Set(),
          capturedAt: '2024-01-04T00:00:00Z'
        }],
        ['vue-app.com', {
          url: 'https://vue-app.com',
          normalizedUrl: 'vue-app.com',
          cms: 'Unknown',
          confidence: 0.0,
          headers: new Map([
            ['server', new Set(['nginx/1.19.0'])],
            ['x-powered-by', new Set(['Node.js'])]
          ]),
          metaTags: new Map([
            ['generator', new Set(['Nuxt.js'])],
            ['description', new Set(['Vue.js Application'])]
          ]),
          scripts: new Set([
            'https://vue-app.com/_nuxt/app.js',
            'https://unpkg.com/vue@3/dist/vue.global.js',
            'https://unpkg.com/vuex@4/dist/vuex.global.js'
          ]),
          technologies: new Set(),
          capturedAt: '2024-01-05T00:00:00Z'
        }],
        ['drupal-site.com', {
          url: 'https://drupal-site.com',
          normalizedUrl: 'drupal-site.com',
          cms: 'Drupal',
          confidence: 0.85,
          headers: new Map([
            ['server', new Set(['Apache/2.4.52'])],
            ['x-powered-by', new Set(['PHP/8.1.0'])],
            ['x-drupal-cache', new Set(['HIT'])]
          ]),
          metaTags: new Map([
            ['generator', new Set(['Drupal 9.4.0'])],
            ['og:site_name', new Set(['Drupal Site'])]
          ]),
          scripts: new Set([
            'https://drupal-site.com/core/misc/drupal.js',
            'https://drupal-site.com/modules/contrib/views/js/views.js',
            'https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js'
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
      expect(analyzer.getName()).toBe('TechnologyAnalyzerV2');
    });

    it('should implement FrequencyAnalyzer interface', async () => {
      const result = await analyzer.analyze(testData, options);
      
      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.analyzerSpecific).toBeDefined();
      expect(result.metadata.analyzer).toBe('TechnologyAnalyzerV2');
    });

    it('should provide enhanced technology analysis data', async () => {
      const result = await analyzer.analyze(testData, options);
      const enhanced = result.analyzerSpecific!;
      
      // Enhanced technology-specific data
      expect(enhanced.detectedTechnologies).toBeDefined();
      expect(enhanced.stackAnalysis).toBeDefined();
      expect(enhanced.categoryDistribution).toBeDefined();
      expect(enhanced.technologyTrends).toBeDefined();
      expect(enhanced.compatibilityMatrix).toBeDefined();
      expect(enhanced.securityAssessment).toBeDefined();
    });
  });

  describe('Cross-Analyzer Technology Detection', () => {
    it('should detect technologies from HTTP headers', async () => {
      const result = await analyzer.analyze(testData, options);
      const technologies = result.analyzerSpecific!.detectedTechnologies;
      
      // Should detect web servers
      const servers = Array.from(technologies.values())
        .filter(tech => tech.category === 'server');
      expect(servers.length).toBeGreaterThan(0);
      
      // Should detect Nginx and Apache
      const serverNames = servers.map(s => s.name);
      expect(serverNames).toEqual(expect.arrayContaining(['Nginx', 'Apache']));
    });

    it('should detect technologies from meta tags', async () => {
      const result = await analyzer.analyze(testData, options);
      const technologies = result.analyzerSpecific!.detectedTechnologies;
      
      // Should detect frameworks from meta tags
      const hasAngular = Array.from(technologies.values())
        .some(tech => tech.name === 'Angular');
      expect(hasAngular).toBe(true);
      
      // Should detect CMS from generator meta
      const hasWordPress = Array.from(technologies.values())
        .some(tech => tech.name === 'WordPress');
      expect(hasWordPress).toBe(true);
    });

    it('should detect technologies from script sources', async () => {
      const result = await analyzer.analyze(testData, options);
      const technologies = result.analyzerSpecific!.detectedTechnologies;
      
      // Should detect React from Next.js scripts
      const hasReact = Array.from(technologies.values())
        .some(tech => tech.name === 'React');
      expect(hasReact).toBe(true);
      
      // Should detect jQuery
      const hasJQuery = Array.from(technologies.values())
        .some(tech => tech.name === 'jQuery');
      expect(hasJQuery).toBe(true);
      
      // Should detect Google Analytics
      const hasGA = Array.from(technologies.values())
        .some(tech => tech.name === 'Google Analytics');
      expect(hasGA).toBe(true);
    });

    it('should integrate CMS detection data', async () => {
      const result = await analyzer.analyze(testData, options);
      const technologies = result.analyzerSpecific!.detectedTechnologies;
      
      // Should detect WordPress from CMS data
      const wpTech = Array.from(technologies.values())
        .find(tech => tech.name === 'WordPress');
      expect(wpTech).toBeDefined();
      expect(wpTech!.category).toBe('cms');
      
      // Should detect Drupal from CMS data
      const drupalTech = Array.from(technologies.values())
        .find(tech => tech.name === 'Drupal');
      expect(drupalTech).toBeDefined();
      expect(drupalTech!.category).toBe('cms');
    });
  });

  describe('Technology Stack Analysis', () => {
    it('should categorize technologies correctly', async () => {
      const result = await analyzer.analyze(testData, options);
      const categoryDist = result.analyzerSpecific!.categoryDistribution;
      
      // Should have multiple categories
      expect(categoryDist.size).toBeGreaterThan(3);
      
      // Should categorize frontend technologies
      const frontendTechs = categoryDist.get('frontend');
      expect(frontendTechs).toBeDefined();
      expect(frontendTechs!.size).toBeGreaterThan(0);
      
      // Should categorize server technologies
      const serverTechs = categoryDist.get('server');
      expect(serverTechs).toBeDefined();
      expect(serverTechs!.size).toBeGreaterThan(0);
      
      // Should categorize CMS technologies
      const cmsTechs = categoryDist.get('cms');
      expect(cmsTechs).toBeDefined();
      expect(cmsTechs!.size).toBeGreaterThan(0);
    });

    it('should analyze stack complexity correctly', async () => {
      const result = await analyzer.analyze(testData, options);
      const stackAnalysis = result.analyzerSpecific!.stackAnalysis;
      
      expect(stackAnalysis.stackComplexity).toBeDefined();
      expect(['simple', 'moderate', 'complex', 'enterprise']).toContain(stackAnalysis.stackComplexity);
      
      // With diverse test data, should be at least moderate
      expect(['moderate', 'complex', 'enterprise']).toContain(stackAnalysis.stackComplexity);
    });

    it('should calculate modernity score', async () => {
      const result = await analyzer.analyze(testData, options);
      const stackAnalysis = result.analyzerSpecific!.stackAnalysis;
      
      expect(stackAnalysis.modernityScore).toBeGreaterThanOrEqual(0);
      expect(stackAnalysis.modernityScore).toBeLessThanOrEqual(1);
      
      // Should have some modern technologies (React, Angular, Vue)
      expect(stackAnalysis.modernityScore).toBeGreaterThan(0);
    });

    it('should identify primary technology stack', async () => {
      const result = await analyzer.analyze(testData, options);
      const stackAnalysis = result.analyzerSpecific!.stackAnalysis;
      
      expect(Array.isArray(stackAnalysis.primaryStack)).toBe(true);
      expect(stackAnalysis.primaryStack.length).toBeGreaterThan(0);
      
      // Should include high-confidence technologies
      const hasHighConfidenceTech = stackAnalysis.primaryStack.some(tech => 
        ['React', 'WordPress', 'Nginx', 'Angular'].includes(tech)
      );
      expect(hasHighConfidenceTech).toBe(true);
    });

    it('should provide adoption trends', async () => {
      const result = await analyzer.analyze(testData, options);
      const stackAnalysis = result.analyzerSpecific!.stackAnalysis;
      
      expect(stackAnalysis.adoptionTrends).toBeInstanceOf(Map);
      expect(stackAnalysis.adoptionTrends.size).toBeGreaterThan(0);
      
      // Should track trends for detected technologies
      for (const [tech, trend] of stackAnalysis.adoptionTrends) {
        expect(['rising', 'stable', 'declining']).toContain(trend);
      }
    });
  });

  describe('Technology Trends Analysis', () => {
    it('should analyze technology adoption rates', async () => {
      const result = await analyzer.analyze(testData, options);
      const trends = result.analyzerSpecific!.technologyTrends;
      
      expect(trends).toBeInstanceOf(Map);
      expect(trends.size).toBeGreaterThan(0);
      
      // Each trend should have adoption data
      for (const [tech, trendData] of trends) {
        expect(trendData).toHaveProperty('adoptionRate');
        expect(trendData).toHaveProperty('trend');
        expect(trendData).toHaveProperty('category');
        expect(trendData).toHaveProperty('confidence');
        
        expect(trendData.adoptionRate).toBeGreaterThanOrEqual(0);
        expect(trendData.adoptionRate).toBeLessThanOrEqual(1);
      }
    });

    it('should track technology popularity trends', async () => {
      const result = await analyzer.analyze(testData, options);
      const trends = result.analyzerSpecific!.technologyTrends;
      
      // Should identify rising technologies (React, Vue, Angular)
      const risingTechs = Array.from(trends.entries())
        .filter(([tech, data]) => data.trend === 'rising')
        .map(([tech, data]) => tech);
      
      expect(risingTechs.length).toBeGreaterThan(0);
      
      // Should identify declining technologies (jQuery)
      const decliningTechs = Array.from(trends.entries())
        .filter(([tech, data]) => data.trend === 'declining')
        .map(([tech, data]) => tech);
      
      expect(decliningTechs.length).toBeGreaterThan(0);
    });
  });

  describe('Compatibility Analysis', () => {
    it('should generate technology compatibility matrix', async () => {
      const result = await analyzer.analyze(testData, options);
      const compatibility = result.analyzerSpecific!.compatibilityMatrix;
      
      expect(compatibility).toBeInstanceOf(Map);
      
      // Should have compatibility data for detected technologies
      for (const [tech, compatibleTechs] of compatibility) {
        expect(Array.isArray(compatibleTechs)).toBe(true);
        
        // Compatible technologies should also be detected
        for (const compatibleTech of compatibleTechs) {
          const isDetected = Array.from(result.analyzerSpecific!.detectedTechnologies.keys())
            .includes(compatibleTech);
          expect(isDetected).toBe(true);
        }
      }
    });

    it('should identify compatible technology combinations', async () => {
      const result = await analyzer.analyze(testData, options);
      const compatibility = result.analyzerSpecific!.compatibilityMatrix;
      
      // React should be compatible with Node.js and webpack when both are detected
      const reactCompatibility = compatibility.get('React');
      if (reactCompatibility) {
        const expectedCompatible = ['Node.js', 'webpack', 'Cloudflare'];
        const actualCompatible = reactCompatibility.filter(tech => 
          expectedCompatible.includes(tech)
        );
        expect(actualCompatible.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Security Assessment', () => {
    it('should perform technology security assessment', async () => {
      const result = await analyzer.analyze(testData, options);
      const security = result.analyzerSpecific!.securityAssessment;
      
      expect(security).toBeInstanceOf(Map);
      expect(security.size).toBeGreaterThan(0);
      
      // Each assessment should have security data
      for (const [tech, assessment] of security) {
        expect(assessment).toHaveProperty('securityScore');
        expect(assessment).toHaveProperty('risks');
        expect(assessment).toHaveProperty('recommendation');
        
        expect(assessment.securityScore).toBeGreaterThanOrEqual(0);
        expect(assessment.securityScore).toBeLessThanOrEqual(1);
        expect(Array.isArray(assessment.risks)).toBe(true);
      }
    });

    it('should identify security risks in technologies', async () => {
      const result = await analyzer.analyze(testData, options);
      const security = result.analyzerSpecific!.securityAssessment;
      
      // Should assess declining technologies as higher risk
      for (const [tech, assessment] of security) {
        const technologyData = result.analyzerSpecific!.detectedTechnologies.get(tech);
        if (technologyData?.popularity === 'declining') {
          expect(assessment.risks.length).toBeGreaterThan(0);
          expect(assessment.securityScore).toBeLessThan(0.8);
        }
      }
    });
  });

  describe('FrequencyAnalyzer Interface Compliance', () => {
    it('should return compatible pattern data structure', async () => {
      const result = await analyzer.analyze(testData, options);
      
      // Should have all required fields from AnalysisResult interface
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('totalSites');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('analyzerSpecific');
      
      // Patterns should be a Map with correct structure
      expect(result.patterns).toBeInstanceOf(Map);
      expect(result.totalSites).toBe(testData.totalSites);
      expect(result.metadata.analyzer).toBe('TechnologyAnalyzerV2');
    });

    it('should provide TechSpecificData structure', async () => {
      const result = await analyzer.analyze(testData, options);
      const specific = result.analyzerSpecific!;
      
      // Should have base TechSpecificData interface
      expect(specific).toHaveProperty('categories');
      expect(specific.categories).toBeInstanceOf(Map);
      
      // Categories should contain technology sets
      for (const [category, technologies] of specific.categories) {
        expect(technologies).toBeInstanceOf(Set);
        expect(technologies.size).toBeGreaterThan(0);
      }
    });

    it('should handle pattern filtering by minimum occurrences', async () => {
      const highThresholdOptions = { ...options, minOccurrences: 5 };
      const result = await analyzer.analyze(testData, highThresholdOptions);
      
      // With only 6 sites, technologies appearing on 5+ sites should be limited
      for (const pattern of result.patterns.values()) {
        expect(pattern.siteCount).toBeGreaterThanOrEqual(highThresholdOptions.minOccurrences);
      }
    });

    it('should provide metadata for pipeline tracking', async () => {
      const result = await analyzer.analyze(testData, options);
      
      expect(result.metadata).toHaveProperty('analyzer');
      expect(result.metadata).toHaveProperty('analyzedAt');
      expect(result.metadata).toHaveProperty('totalPatternsFound');
      expect(result.metadata).toHaveProperty('totalPatternsAfterFiltering');
      expect(result.metadata).toHaveProperty('options');
      
      expect(result.metadata.analyzer).toBe('TechnologyAnalyzerV2');
      expect(typeof result.metadata.analyzedAt).toBe('string');
      expect(typeof result.metadata.totalPatternsFound).toBe('number');
      expect(typeof result.metadata.totalPatternsAfterFiltering).toBe('number');
    });
  });

  describe('Stack Recommendations', () => {
    it('should generate actionable stack recommendations', async () => {
      const result = await analyzer.analyze(testData, options);
      const stackAnalysis = result.analyzerSpecific!.stackAnalysis;
      
      expect(Array.isArray(stackAnalysis.stackRecommendations)).toBe(true);
      
      // Should provide relevant recommendations based on detected stack
      for (const recommendation of stackAnalysis.stackRecommendations) {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(10); // Meaningful recommendations
      }
    });

    it('should recommend CDN when not detected', async () => {
      // Create test data without CDN
      const noCdnData = {
        ...testData,
        sites: new Map([
          ['simple-site.com', {
            url: 'https://simple-site.com',
            normalizedUrl: 'simple-site.com',
            cms: 'Unknown',
            confidence: 0.0,
            headers: new Map([['server', new Set(['Apache'])]]),
            metaTags: new Map(),
            scripts: new Set(['https://simple-site.com/script.js']),
            technologies: new Set(),
            capturedAt: '2024-01-01T00:00:00Z'
          }]
        ])
      };
      
      const result = await analyzer.analyze(noCdnData, options);
      const recommendations = result.analyzerSpecific!.stackAnalysis.stackRecommendations;
      
      const hasCdnRecommendation = recommendations.some(rec => 
        rec.toLowerCase().includes('cdn')
      );
      expect(hasCdnRecommendation).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty technology data gracefully', async () => {
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
      expect(result.analyzerSpecific.detectedTechnologies.size).toBe(0);
      expect(result.analyzerSpecific.stackAnalysis.stackComplexity).toBe('simple');
    });

    it('should handle malformed header and meta data', async () => {
      const malformedData: PreprocessedData = {
        sites: new Map([
          ['malformed-site.com', {
            url: 'https://malformed-site.com',
            normalizedUrl: 'malformed-site.com',
            cms: null as any,
            confidence: 0.0,
            headers: new Map([
              ['', new Set([''])], // Empty header name
              ['invalid-header', new Set([''])] // Empty header value
            ]),
            metaTags: new Map([
              ['', new Set([''])], // Empty meta name
              ['invalid-meta', new Set([])] // Empty meta values
            ]),
            scripts: new Set([
              '', // Empty script
              'invalid-url',
              'javascript:void(0)'
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

      // Generate 20 test sites with various technologies
      for (let i = 1; i <= 20; i++) {
        const techIndex = i % 4;
        const technologies = [
          { scripts: ['react.js', '_next/static/main.js'], cms: 'Unknown' },
          { scripts: ['wp-content/themes/script.js', 'jquery.min.js'], cms: 'WordPress' },
          { scripts: ['shopify.com/assets/theme.js'], cms: 'Unknown' },
          { scripts: ['angular.js', '@angular/core.js'], cms: 'Unknown' }
        ];
        
        const tech = technologies[techIndex];
        largeData.sites.set(`site${i}.com`, {
          url: `https://site${i}.com`,
          normalizedUrl: `site${i}.com`,
          cms: tech.cms,
          confidence: 0.8,
          headers: new Map([['server', new Set(['nginx'])]]),
          metaTags: new Map(),
          scripts: new Set(tech.scripts.map(s => `https://site${i}.com/${s}`)),
          technologies: new Set(),
          capturedAt: '2024-01-01T00:00:00Z'
        });
      }

      const startTime = Date.now();
      const result = await analyzer.analyze(largeData, options);
      const duration = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result.analyzerSpecific.detectedTechnologies.size).toBeGreaterThan(0);
    });
  });
});