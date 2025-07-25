/**
 * Comprehensive test suite for 4-group header classification system
 * Tests the single source of truth implementation in DataPreprocessor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataPreprocessor, type HeaderClassification } from '../data-preprocessor.js';

describe('Header Classification System', () => {
  let preprocessor: DataPreprocessor;

  beforeEach(() => {
    preprocessor = new DataPreprocessor();
  });

  describe('Group 1: Generic/Never Discriminatory Headers', () => {
    const group1Headers = [
      // Core HTTP headers
      'date', 'content-type', 'content-length', 'content-encoding',
      'transfer-encoding', 'connection', 'keep-alive', 'accept-ranges',
      'etag', 'last-modified', 'expires', 'pragma', 'age', 'via', 'vary',
      'upgrade', 'host', 'referer',
      
      // Security headers
      'strict-transport-security', 'x-content-type-options', 'x-frame-options',
      'x-xss-protection', 'referrer-policy', 'content-security-policy',
      'feature-policy', 'permissions-policy',
      
      // CORS headers
      'access-control-allow-origin', 'access-control-allow-credentials',
      'access-control-allow-headers', 'access-control-allow-methods',
      'access-control-max-age', 'access-control-expose-headers',
      
      // Monitoring/reporting
      'nel', 'report-to', 'server-timing',
      
      // Tracing headers
      'x-request-id', 'x-correlation-id', 'x-trace-id',
      'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host'
    ];

    it.each(group1Headers)('should classify "%s" as generic with always-filter recommendation', (headerName) => {
      const classification = preprocessor.classifyHeader(headerName);
      
      expect(classification).toEqual({
        category: 'generic',
        discriminativeScore: 0,
        filterRecommendation: 'always-filter'
      });
    });

    it('should handle case insensitivity for Group 1 headers', () => {
      const testCases = [
        'Content-Type',
        'CACHE-CONTROL', 
        'X-Frame-Options',
        'Server-Timing'
      ];

      testCases.forEach(headerName => {
        const classification = preprocessor.classifyHeader(headerName);
        expect(classification.category).toBe('generic');
        expect(classification.filterRecommendation).toBe('always-filter');
      });
    });

    it('should filter Group 1 headers regardless of context', () => {
      const context = {
        frequency: 0.8,
        diversity: 100,
        maxFrequency: 0.9
      };

      group1Headers.forEach(headerName => {
        expect(preprocessor.shouldFilterHeader(headerName, context)).toBe(true);
      });
    });
  });

  describe('Group 2: Standard Headers with Potentially Discriminatory Values', () => {
    const group2Headers = [
      'server', 'x-powered-by', 'powered-by', 'x-generator', 'generator',
      'x-cms', 'x-framework', 'x-platform', 'x-application'
    ];

    it.each(group2Headers)('should classify "%s" as cms-indicative with context-dependent filtering', (headerName) => {
      const classification = preprocessor.classifyHeader(headerName);
      
      expect(classification).toEqual({
        category: 'cms-indicative',
        discriminativeScore: 0.6,
        filterRecommendation: 'context-dependent'
      });
    });

    it('should apply context-dependent filtering for Group 2 headers', () => {
      const lowFrequencyContext = { maxFrequency: 0.01 };
      const normalFrequencyContext = { maxFrequency: 0.05 };

      group2Headers.forEach(headerName => {
        // Very low frequency should be filtered
        expect(preprocessor.shouldFilterHeader(headerName, lowFrequencyContext)).toBe(true);
        
        // Normal frequency should not be filtered
        expect(preprocessor.shouldFilterHeader(headerName, normalFrequencyContext)).toBe(false);
      });
    });
  });

  describe('Group 3: Non-standard Headers with Potentially Discriminatory Values', () => {
    const group3Headers = [
      'x-cache', 'x-cache-status', 'x-cache-hit', 'x-cache-lookup',
      'x-varnish', 'x-cdn', 'x-edge-location', 'x-served-by',
      'x-backend-server', 'x-proxy-cache', 'x-fastly-request-id',
      'x-amz-cf-id', 'x-amz-cf-pop', 'x-amz-request-id',
      'cf-ray', 'cf-cache-status', 'cf-request-id',
      'x-azure-ref', 'x-ms-request-id', 'x-ms-routing-request-id'
    ];

    it.each(group3Headers)('should classify "%s" as infrastructure with context-dependent filtering', (headerName) => {
      const classification = preprocessor.classifyHeader(headerName);
      
      expect(classification).toEqual({
        category: 'infrastructure',
        discriminativeScore: 0.3,
        filterRecommendation: 'context-dependent'
      });
    });

    it('should apply context-dependent filtering for Group 3 headers', () => {
      const lowFrequencyContext = { maxFrequency: 0.015 };
      const normalFrequencyContext = { maxFrequency: 0.03 };

      group3Headers.forEach(headerName => {
        // Very low frequency should be filtered
        expect(preprocessor.shouldFilterHeader(headerName, lowFrequencyContext)).toBe(true);
        
        // Normal frequency should not be filtered
        expect(preprocessor.shouldFilterHeader(headerName, normalFrequencyContext)).toBe(false);
      });
    });
  });

  describe('Group 4: Headers with Platform/CMS Names', () => {
    const group4TestCases = [
      // CMS platforms
      { header: 'x-wordpress-version', expectedPlatform: 'WordPress' },
      { header: 'wp-super-cache', expectedPlatform: 'WordPress' },
      { header: 'x-drupal-cache', expectedPlatform: 'Drupal' },
      { header: 'joomla-session', expectedPlatform: 'Joomla' },
      { header: 'd-cache', expectedPlatform: 'Duda' },
      { header: 'd-geo', expectedPlatform: 'Duda' },
      
      // E-commerce platforms
      { header: 'shopify-complexity-score', expectedPlatform: 'Shopify' },
      { header: 'x-shopid', expectedPlatform: 'Shopify' },
      { header: 'magento-version', expectedPlatform: 'Magento' },
      { header: 'woocommerce-session', expectedPlatform: 'WooCommerce' },
      
      // Website builders
      { header: 'wix-published-date', expectedPlatform: 'Wix' },
      { header: 'squarespace-endpoint', expectedPlatform: 'Squarespace' },
      
      // Enterprise CMS
      { header: 'aem-instance-id', expectedPlatform: 'Adobe Experience Manager' },
      { header: 'sitecore-version', expectedPlatform: 'Sitecore' },
      
      // Development frameworks
      { header: 'nextjs-cache', expectedPlatform: 'Next.js' },
      { header: 'next-router', expectedPlatform: 'Next.js' },
      { header: 'nuxt-server', expectedPlatform: 'Nuxt.js' },
      
      // Hosting platforms
      { header: 'vercel-cache', expectedPlatform: 'Vercel' },
      { header: 'x-vercel-id', expectedPlatform: 'Vercel' },
      { header: 'netlify-vary', expectedPlatform: 'Netlify' },
      { header: 'cloudflare-custom-header', expectedPlatform: 'Cloudflare' },
      { header: 'x-amz-custom-header', expectedPlatform: 'AWS' }
    ];

    it.each(group4TestCases)('should classify "$header" as platform header for $expectedPlatform', ({ header, expectedPlatform }) => {
      const classification = preprocessor.classifyHeader(header);
      
      expect(classification.category).toBe('platform');
      expect(classification.vendor).toBe(expectedPlatform);
      expect(classification.platformName).toBe(expectedPlatform);
      expect(classification.discriminativeScore).toBe(0.8);
      expect(classification.filterRecommendation).toBe('never-filter');
    });

    it('should never filter Group 4 headers regardless of context', () => {
      const lowFrequencyContext = { maxFrequency: 0.001 };
      
      group4TestCases.forEach(({ header }) => {
        expect(preprocessor.shouldFilterHeader(header, lowFrequencyContext)).toBe(false);
      });
    });

    it('should handle case insensitivity for platform names', () => {
      const testCases = [
        { header: 'X-SHOPIFY-Shop-Id', expectedPlatform: 'Shopify' },
        { header: 'WordPress-Cache', expectedPlatform: 'WordPress' },
        { header: 'DRUPAL-Version', expectedPlatform: 'Drupal' }
      ];

      testCases.forEach(({ header, expectedPlatform }) => {
        const classification = preprocessor.classifyHeader(header);
        expect(classification.category).toBe('platform');
        expect(classification.vendor).toBe(expectedPlatform);
      });
    });
  });

  describe('Unknown/Custom Headers', () => {
    const customHeaders = [
      'x-custom-header', 'my-special-header', 'x-app-version', 
      'custom-middleware', 'x-internal-id', 'application-info'
    ];

    it.each(customHeaders)('should classify "%s" as custom with context-dependent filtering', (headerName) => {
      const classification = preprocessor.classifyHeader(headerName);
      
      expect(classification).toEqual({
        category: 'custom',
        discriminativeScore: 0.5,
        filterRecommendation: 'context-dependent'
      });
    });
  });

  describe('Edge Cases and Regression Tests', () => {
    it('should not misclassify x-cacheable as platform header', () => {
      // This was a previous bug where "cache" pattern was too broad
      const classification = preprocessor.classifyHeader('x-cacheable');
      expect(classification.category).toBe('infrastructure');
      expect(classification.filterRecommendation).toBe('context-dependent');
    });

    it('should correctly classify server-timing as generic', () => {
      // server-timing was appearing in detect-cms opportunities
      const classification = preprocessor.classifyHeader('server-timing');
      expect(classification.category).toBe('generic');
      expect(classification.filterRecommendation).toBe('always-filter');
    });

    it('should distinguish between similar header names', () => {
      const testCases = [
        { header: 'cache-control', expected: 'generic' },    // Group 1
        { header: 'x-cache', expected: 'infrastructure' },   // Group 3
        { header: 'x-cache-shopify', expected: 'platform' }  // Group 4 (contains shopify)
      ];

      testCases.forEach(({ header, expected }) => {
        const classification = preprocessor.classifyHeader(header);
        expect(classification.category).toBe(expected);
      });
    });

    it('should handle headers with multiple platform indicators', () => {
      // Header contains both "shopify" and "wp-" - longer pattern should win
      const classification = preprocessor.classifyHeader('shopify-wp-integration');
      expect(classification.category).toBe('platform');
      expect(classification.vendor).toBe('Shopify'); // Shopify is longer pattern, should win
    });

    it('should handle prefix patterns correctly', () => {
      const prefixTests = [
        { header: 'd-session', expected: 'Duda' },
        { header: 'd-geo', expected: 'Duda' },
        { header: 'wp-admin', expected: 'WordPress' },
        { header: 'cf-custom', expected: 'Cloudflare' }
      ];

      prefixTests.forEach(({ header, expected }) => {
        const classification = preprocessor.classifyHeader(header);
        expect(classification.category).toBe('platform');
        expect(classification.vendor).toBe(expected);
      });
    });
  });

  describe('Caching and Performance', () => {
    it('should cache classification results', () => {
      const headerName = 'x-test-header';
      
      // First call
      const classification1 = preprocessor.classifyHeader(headerName);
      
      // Second call should return same object reference (cached)
      const classification2 = preprocessor.classifyHeader(headerName);
      
      expect(classification1).toBe(classification2);
    });

    it('should clear cache when requested', () => {
      const headerName = 'x-test-header';
      
      // Populate cache
      preprocessor.classifyHeader(headerName);
      
      // Clear cache
      preprocessor.clearHeaderClassificationCache();
      
      // Verify cache is cleared by checking internal state
      expect(preprocessor.getCacheStats().entries).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    it('should return headers by category', () => {
      const genericHeaders = preprocessor.getHeadersByCategory('generic');
      expect(genericHeaders).toContain('date');
      expect(genericHeaders).toContain('content-type');
      expect(genericHeaders).toContain('server-timing');
      
      const cmsIndicativeHeaders = preprocessor.getHeadersByCategory('cms-indicative');
      expect(cmsIndicativeHeaders).toContain('server');
      expect(cmsIndicativeHeaders).toContain('x-powered-by');
      expect(cmsIndicativeHeaders).toContain('generator');
      
      const infrastructureHeaders = preprocessor.getHeadersByCategory('infrastructure');
      expect(infrastructureHeaders).toContain('x-cache');
      expect(infrastructureHeaders).toContain('cf-ray');
    });

    it('should return platform patterns', () => {
      const patterns = preprocessor.getPlatformPatterns();
      expect(patterns.get('shopify')).toBe('Shopify');
      expect(patterns.get('wordpress')).toBe('WordPress');
      expect(patterns.get('d-')).toBe('Duda');
    });
  });

  describe('Integration with Frequency Analysis', () => {
    it('should provide consistent filtering decisions for frequency reports', () => {
      // These headers should NEVER appear in "recommend to keep" regardless of correlation
      const alwaysFilteredHeaders = [
        'date', 'content-type', 'server-timing', 'referrer-policy',
        'x-frame-options', 'access-control-allow-origin'
      ];

      alwaysFilteredHeaders.forEach(header => {
        const classification = preprocessor.classifyHeader(header);
        expect(classification.filterRecommendation).toBe('always-filter');
        expect(preprocessor.shouldFilterHeader(header)).toBe(true);
      });
    });

    it('should provide consistent platform detection for frequency reports', () => {
      // These headers should ALWAYS be recommended due to platform names
      const alwaysRecommendedHeaders = [
        'shopify-complexity-score', 'x-drupal-cache', 'wp-super-cache',
        'd-cache', 'x-vercel-id', 'aem-instance-id'
      ];

      alwaysRecommendedHeaders.forEach(header => {
        const classification = preprocessor.classifyHeader(header);
        expect(classification.filterRecommendation).toBe('never-filter');
        expect(preprocessor.shouldFilterHeader(header)).toBe(false);
      });
    });
  });
});