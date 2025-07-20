import { describe, it, expect } from 'vitest';
import { 
  analyzeHeaderSemantics, 
  batchAnalyzeHeaders, 
  generateSemanticInsights,
  type HeaderPrimaryCategory 
} from '../semantic-analyzer.js';

describe('Semantic Analyzer', () => {
  describe('Header Semantic Analysis', () => {
    it('should categorize security headers correctly', () => {
      const analysis = analyzeHeaderSemantics('content-security-policy');
      
      expect(analysis.category.primary).toBe('security');
      expect(analysis.category.confidence).toBeGreaterThan(0.9);
      expect(analysis.namingConvention).toBe('kebab-case');
      expect(analysis.patternType).toBe('standard');
    });

    it('should categorize Cloudflare caching headers', () => {
      const analysis = analyzeHeaderSemantics('cf-ray');
      
      expect(analysis.category.primary).toBe('caching');
      expect(analysis.category.vendor).toBe('Cloudflare');
      expect(analysis.category.confidence).toBeGreaterThan(0.8);
      expect(analysis.patternType).toBe('vendor-specific');
      expect(analysis.namespace).toBe('cf');
    });

    it('should categorize CMS-specific headers', () => {
      const analysis = analyzeHeaderSemantics('x-wp-total');
      
      expect(analysis.category.primary).toBe('cms');
      expect(analysis.category.vendor).toBe('WordPress');
      expect(analysis.namespace).toBe('x-wp');
      expect(analysis.hierarchyLevel).toBe(1);
    });

    it('should categorize e-commerce headers', () => {
      const analysis = analyzeHeaderSemantics('x-shopify-shop-id');
      
      expect(analysis.category.primary).toBe('ecommerce');
      expect(analysis.category.vendor).toBe('Shopify');
      expect(analysis.namespace).toBe('x-shopify');
    });

    it('should categorize framework headers', () => {
      const analysis = analyzeHeaderSemantics('x-laravel-session');
      
      expect(analysis.category.primary).toBe('framework');
      expect(analysis.category.vendor).toBe('Laravel');
    });

    it('should categorize infrastructure headers', () => {
      const analysis = analyzeHeaderSemantics('content-type');
      
      expect(analysis.category.primary).toBe('infrastructure');
      expect(analysis.patternType).toBe('standard');
      expect(analysis.namingConvention).toBe('kebab-case');
    });

    it('should categorize custom headers', () => {
      const analysis = analyzeHeaderSemantics('x-custom-app-header');
      
      expect(analysis.category.primary).toBe('custom');
      expect(analysis.category.confidence).toBeLessThan(0.8);
      expect(analysis.patternType).toBe('custom');
    });
  });

  describe('Naming Convention Detection', () => {
    it('should detect kebab-case correctly', () => {
      const analysis = analyzeHeaderSemantics('content-security-policy');
      expect(analysis.namingConvention).toBe('kebab-case');
    });

    it('should detect underscore_case correctly', () => {
      const analysis = analyzeHeaderSemantics('x_custom_header');
      expect(analysis.namingConvention).toBe('underscore_case');
    });

    it('should detect UPPER_CASE correctly', () => {
      const analysis = analyzeHeaderSemantics('CUSTOM_HEADER_NAME');
      expect(analysis.namingConvention).toBe('UPPER_CASE');
    });

    it('should detect mixed conventions', () => {
      const analysis = analyzeHeaderSemantics('x-Custom_Mixed-Header');
      expect(analysis.namingConvention).toBe('mixed');
    });

    it('should detect non-standard conventions', () => {
      const analysis = analyzeHeaderSemantics('X123-weird@header!');
      expect(analysis.namingConvention).toBe('non-standard');
    });
  });

  describe('Semantic Word Extraction', () => {
    it('should extract CMS-related words', () => {
      const analysis = analyzeHeaderSemantics('x-wp-totalpages');
      expect(analysis.semanticWords).toContain('wp');
      expect(analysis.semanticWords).toContain('totalpages');
    });

    it('should extract vendor-related words', () => {
      const analysis = analyzeHeaderSemantics('x-google-analytics-id');
      expect(analysis.semanticWords).toContain('google');
      expect(analysis.semanticWords).toContain('analytics');
    });

    it('should extract function-related words', () => {
      const analysis = analyzeHeaderSemantics('x-authentication-token');
      expect(analysis.semanticWords).toContain('authentication');
      expect(analysis.semanticWords).toContain('token');
    });
  });

  describe('Hierarchy Analysis', () => {
    it('should detect namespace and hierarchy level', () => {
      const analysis = analyzeHeaderSemantics('x-wp-total-pages');
      expect(analysis.namespace).toBe('x-wp');
      expect(analysis.hierarchyLevel).toBe(2); // x-wp- + total-pages
    });

    it('should handle headers without namespace', () => {
      const analysis = analyzeHeaderSemantics('content-type');
      expect(analysis.namespace).toBeUndefined();
      expect(analysis.hierarchyLevel).toBe(1); // content-type has one separator
    });

    it('should detect Cloudflare namespace', () => {
      const analysis = analyzeHeaderSemantics('cf-cache-status');
      expect(analysis.namespace).toBe('cf');
      expect(analysis.hierarchyLevel).toBe(2);
    });

    it('should detect Duda namespace', () => {
      const analysis = analyzeHeaderSemantics('d-geo');
      expect(analysis.namespace).toBe('d');
      expect(analysis.hierarchyLevel).toBe(1);
    });
  });

  describe('Batch Analysis', () => {
    it('should analyze multiple headers efficiently', () => {
      const headers = [
        'content-security-policy',
        'cf-ray',
        'x-wp-total',
        'x-shopify-shop-id',
        'content-type'
      ];

      const results = batchAnalyzeHeaders(headers);

      expect(results.size).toBe(5);
      expect(results.get('content-security-policy')?.category.primary).toBe('security');
      expect(results.get('cf-ray')?.category.vendor).toBe('Cloudflare');
      expect(results.get('x-wp-total')?.category.vendor).toBe('WordPress');
      expect(results.get('x-shopify-shop-id')?.category.vendor).toBe('Shopify');
      expect(results.get('content-type')?.category.primary).toBe('infrastructure');
    });

    it('should handle errors gracefully', () => {
      const headers = ['valid-header', '', null as any, undefined as any];
      const results = batchAnalyzeHeaders(headers.filter(h => h));

      expect(results.size).toBe(1);
      expect(results.has('valid-header')).toBe(true);
    });
  });

  describe('Semantic Insights Generation', () => {
    it('should generate category distribution insights', () => {
      const analyses = new Map([
        ['content-security-policy', analyzeHeaderSemantics('content-security-policy')],
        ['cf-ray', analyzeHeaderSemantics('cf-ray')],
        ['x-wp-total', analyzeHeaderSemantics('x-wp-total')],
        ['content-type', analyzeHeaderSemantics('content-type')]
      ]);

      const insights = generateSemanticInsights(analyses);

      expect(insights.categoryDistribution.security).toBe(1);
      expect(insights.categoryDistribution.caching).toBe(1);
      expect(insights.categoryDistribution.cms).toBe(1);
      expect(insights.categoryDistribution.infrastructure).toBe(1);

      expect(insights.topCategories).toHaveLength(8); // All categories
      expect(insights.topVendors.length).toBeGreaterThan(0);
      expect(insights.vendorDistribution['Cloudflare']).toBe(1);
      expect(insights.vendorDistribution['WordPress']).toBe(1);
    });

    it('should calculate correct percentages', () => {
      const analyses = new Map([
        ['header1', analyzeHeaderSemantics('content-security-policy')], // security
        ['header2', analyzeHeaderSemantics('strict-transport-security')], // security
        ['header3', analyzeHeaderSemantics('cf-ray')], // caching
        ['header4', analyzeHeaderSemantics('content-type')] // infrastructure
      ]);

      const insights = generateSemanticInsights(analyses);

      expect(insights.categoryDistribution.security).toBe(2);
      expect(insights.categoryDistribution.caching).toBe(1);
      expect(insights.categoryDistribution.infrastructure).toBe(1);

      const securityCategory = insights.topCategories.find(c => c.category === 'security');
      expect(securityCategory?.percentage).toBe(50); // 2/4 = 50%
    });
  });

  describe('Platform Pattern Detection', () => {
    it('should detect WordPress patterns correctly', () => {
      const wpHeaders = [
        'x-wp-total',
        'x-pingback',
        'x-wp-totalpages'
      ];

      for (const header of wpHeaders) {
        const analysis = analyzeHeaderSemantics(header);
        expect(analysis.category.primary).toBe('cms');
        expect(analysis.category.vendor).toBe('WordPress');
      }
    });

    it('should detect Duda patterns correctly', () => {
      const dudaHeaders = [
        'd-geo',
        'd-cache',
        'd-sid'
      ];

      for (const header of dudaHeaders) {
        const analysis = analyzeHeaderSemantics(header);
        expect(analysis.category.primary).toBe('cms');
        expect(analysis.category.vendor).toBe('Duda');
      }
    });

    it('should detect Shopify patterns correctly', () => {
      const shopifyHeaders = [
        'x-shopify-shop-id',
        'x-shopid',
        'x-shardid'
      ];

      for (const header of shopifyHeaders) {
        const analysis = analyzeHeaderSemantics(header);
        expect(analysis.category.primary).toBe('ecommerce');
        expect(analysis.category.vendor).toBe('Shopify');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty header names', () => {
      const analysis = analyzeHeaderSemantics('');
      expect(analysis.category.primary).toBe('custom');
      expect(analysis.semanticWords).toHaveLength(0);
    });

    it('should handle single character headers', () => {
      const analysis = analyzeHeaderSemantics('x');
      expect(analysis.category.primary).toBe('custom');
      expect(analysis.namingConvention).toBe('kebab-case');
    });

    it('should handle headers with numbers', () => {
      const analysis = analyzeHeaderSemantics('x-version-123');
      expect(analysis.namingConvention).toBe('kebab-case');
      expect(analysis.semanticWords).toContain('version');
    });

    it('should handle headers with special characters', () => {
      const analysis = analyzeHeaderSemantics('x-test_header-name');
      expect(analysis.namingConvention).toBe('mixed');
    });
  });

  describe('Confidence Scoring', () => {
    it('should assign high confidence to well-known security headers', () => {
      const analysis = analyzeHeaderSemantics('content-security-policy');
      expect(analysis.category.confidence).toBeGreaterThan(0.9);
    });

    it('should assign medium confidence to custom vendor headers', () => {
      const analysis = analyzeHeaderSemantics('x-unknown-vendor-header');
      expect(analysis.category.confidence).toBeLessThan(0.8);
    });

    it('should assign appropriate confidence based on category', () => {
      const securityHeader = analyzeHeaderSemantics('strict-transport-security');
      const customHeader = analyzeHeaderSemantics('x-random-custom-header');
      
      expect(securityHeader.category.confidence).toBeGreaterThan(customHeader.category.confidence);
    });
  });
});