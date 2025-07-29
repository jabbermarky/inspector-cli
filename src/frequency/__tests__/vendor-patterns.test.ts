import { describe, it, expect } from 'vitest';
import { 
  VENDOR_PATTERNS,
  findVendorByHeader,
  getVendorsByCategory,
  analyzeVendorPresence,
  inferTechnologyStack
} from '../vendor-patterns-v1.js';

describe('Vendor Patterns', () => {
  describe('Vendor Database', () => {
    it('should have comprehensive vendor patterns', () => {
      expect(VENDOR_PATTERNS.length).toBeGreaterThan(20);
      
      // Check for major categories
      const categories = new Set(VENDOR_PATTERNS.map(v => v.category));
      expect(categories).toContain('cdn');
      expect(categories).toContain('cms');
      expect(categories).toContain('ecommerce');
      expect(categories).toContain('analytics');
      expect(categories).toContain('security');
      expect(categories).toContain('framework');
      expect(categories).toContain('hosting');
    });

    it('should have proper vendor structure', () => {
      for (const vendor of VENDOR_PATTERNS) {
        expect(vendor.name).toBeDefined();
        expect(vendor.category).toBeDefined();
        expect(vendor.headerPatterns).toBeInstanceOf(Array);
        expect(vendor.headerPatterns.length).toBeGreaterThan(0);
        expect(vendor.description).toBeDefined();
      }
    });

    it('should include major CDN providers', () => {
      const cdnVendors = getVendorsByCategory('cdn');
      const vendorNames = cdnVendors.map(v => v.name);
      
      expect(vendorNames).toContain('Cloudflare');
      expect(vendorNames).toContain('AWS CloudFront');
      expect(vendorNames).toContain('Fastly');
      expect(vendorNames).toContain('Akamai');
    });

    it('should include major CMS platforms', () => {
      const cmsVendors = getVendorsByCategory('cms');
      const vendorNames = cmsVendors.map(v => v.name);
      
      expect(vendorNames).toContain('WordPress');
      expect(vendorNames).toContain('Drupal');
      expect(vendorNames).toContain('Duda');
      expect(vendorNames).toContain('Wix');
    });

    it('should include major e-commerce platforms', () => {
      const ecommerceVendors = getVendorsByCategory('ecommerce');
      const vendorNames = ecommerceVendors.map(v => v.name);
      
      expect(vendorNames).toContain('Shopify');
      expect(vendorNames).toContain('WooCommerce');
      expect(vendorNames).toContain('Magento');
    });
  });

  describe('Vendor Detection', () => {
    it('should find Cloudflare by header', () => {
      const vendor = findVendorByHeader('cf-ray');
      expect(vendor?.name).toBe('Cloudflare');
      expect(vendor?.category).toBe('cdn');
    });

    it('should find WordPress by header', () => {
      const vendor = findVendorByHeader('x-wp-total');
      expect(vendor?.name).toBe('WordPress');
      expect(vendor?.category).toBe('cms');
    });

    it('should find Shopify by header', () => {
      const vendor = findVendorByHeader('x-shopify-shop-id');
      expect(vendor?.name).toBe('Shopify');
      expect(vendor?.category).toBe('ecommerce');
    });

    it('should handle case insensitivity', () => {
      const vendor1 = findVendorByHeader('CF-RAY');
      const vendor2 = findVendorByHeader('cf-ray');
      expect(vendor1?.name).toBe(vendor2?.name);
    });

    it('should handle partial matches', () => {
      const vendor = findVendorByHeader('x-shopify-request-id');
      expect(vendor?.name).toBe('Shopify');
    });

    it('should return undefined for unknown headers', () => {
      const vendor = findVendorByHeader('x-completely-unknown-header');
      expect(vendor).toBeUndefined();
    });
  });

  describe('Vendor Presence Analysis', () => {
    it('should analyze vendor presence correctly', () => {
      const headers = [
        'cf-ray',
        'cf-cache-status',
        'x-wp-total',
        'x-shopify-shop-id',
        'content-type',
        'x-unknown-header'
      ];

      const stats = analyzeVendorPresence(headers);

      expect(stats.totalHeaders).toBe(6);
      expect(stats.vendorHeaders).toBe(4); // cf-ray, cf-cache-status, x-wp-total, x-shopify-shop-id
      expect(stats.vendorCoverage).toBeCloseTo(66.67, 1); // 4/6 ≈ 66.67%

      expect(stats.vendorDistribution).toHaveLength(3); // Cloudflare, WordPress, Shopify
      expect(stats.vendorDistribution[0].vendor).toBe('Cloudflare'); // Should be first (2 headers)
      expect(stats.vendorDistribution[0].headerCount).toBe(2);
    });

    it('should calculate correct percentages', () => {
      const headers = ['cf-ray', 'cf-cache-status', 'x-wp-total', 'content-type'];
      const stats = analyzeVendorPresence(headers);

      const cloudflareVendor = stats.vendorDistribution.find(v => v.vendor === 'Cloudflare');
      expect(cloudflareVendor?.percentage).toBe(50); // 2/4 = 50%

      const wpVendor = stats.vendorDistribution.find(v => v.vendor === 'WordPress');
      expect(wpVendor?.percentage).toBe(25); // 1/4 = 25%
    });

    it('should group by category correctly', () => {
      const headers = ['cf-ray', 'x-wp-total', 'x-shopify-shop-id'];
      const stats = analyzeVendorPresence(headers);

      expect(stats.categoryDistribution['cdn']).toBe(1);
      expect(stats.categoryDistribution['cms']).toBe(1);
      expect(stats.categoryDistribution['ecommerce']).toBe(1);
    });

    it('should handle empty header list', () => {
      const stats = analyzeVendorPresence([]);
      expect(stats.totalHeaders).toBe(0);
      expect(stats.vendorHeaders).toBe(0);
      expect(stats.vendorCoverage).toBe(0);
      expect(stats.vendorDistribution).toHaveLength(0);
    });
  });

  describe('Technology Stack Inference', () => {
    it('should infer WordPress + Cloudflare stack', () => {
      const headers = [
        'cf-ray',
        'cf-cache-status',
        'x-wp-total',
        'x-pingback',
        'content-type'
      ];

      const stack = inferTechnologyStack(headers);

      expect(stack.cms).toBe('WordPress');
      expect(stack.cdn).toContain('Cloudflare');
      expect(stack.confidence).toBeGreaterThan(0.5);
    });

    it('should infer Shopify + multiple services stack', () => {
      const headers = [
        'x-shopify-shop-id',
        'cf-ray',
        'x-google-analytics-id',
        'x-fastly-request-id'
      ];

      const stack = inferTechnologyStack(headers);

      expect(stack.ecommerce).toBe('Shopify');
      expect(stack.cdn).toContain('Cloudflare');
      expect(stack.cdn).toContain('Fastly');
      expect(stack.analytics).toContain('Google Analytics');
    });

    it('should handle mixed technology stack', () => {
      const headers = [
        'x-wp-total', // WordPress CMS
        'x-woocommerce-api', // WooCommerce e-commerce
        'cf-ray', // Cloudflare CDN
        'x-laravel-session', // Laravel framework
        'x-nf-request-id' // Netlify hosting
      ];

      const stack = inferTechnologyStack(headers);

      expect(stack.cms).toBe('WordPress');
      expect(stack.ecommerce).toBe('WooCommerce');
      expect(stack.framework).toBe('Laravel');
      expect(stack.hosting).toBe('Netlify');
      expect(stack.cdn).toContain('Cloudflare');
    });

    it('should calculate confidence based on vendor coverage', () => {
      const highCoverageHeaders = ['cf-ray', 'x-wp-total', 'x-shopify-shop-id'];
      const lowCoverageHeaders = ['cf-ray', 'unknown1', 'unknown2', 'unknown3'];

      const highStack = inferTechnologyStack(highCoverageHeaders);
      const lowStack = inferTechnologyStack(lowCoverageHeaders);

      expect(highStack.confidence).toBeGreaterThan(lowStack.confidence);
    });

    it('should handle no vendor headers', () => {
      const headers = ['content-type', 'content-length', 'unknown-header'];
      const stack = inferTechnologyStack(headers);

      expect(stack.cms).toBeUndefined();
      expect(stack.ecommerce).toBeUndefined();
      expect(stack.cdn).toBeUndefined();
      expect(stack.confidence).toBe(0);
    });
  });

  describe('Category Filtering', () => {
    it('should get vendors by category', () => {
      const cdnVendors = getVendorsByCategory('cdn');
      expect(cdnVendors.length).toBeGreaterThan(0);
      expect(cdnVendors.every(v => v.category === 'cdn')).toBe(true);

      const cmsVendors = getVendorsByCategory('cms');
      expect(cmsVendors.length).toBeGreaterThan(0);
      expect(cmsVendors.every(v => v.category === 'cms')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const unknownVendors = getVendorsByCategory('unknown' as any);
      expect(unknownVendors).toHaveLength(0);
    });
  });

  describe('Header Pattern Matching', () => {
    it('should match exact header patterns', () => {
      const cloudflareVendor = VENDOR_PATTERNS.find(v => v.name === 'Cloudflare');
      expect(cloudflareVendor?.headerPatterns).toContain('cf-ray');
      expect(cloudflareVendor?.headerPatterns).toContain('cf-cache-status');
    });

    it('should match AWS CloudFront patterns', () => {
      const awsVendor = VENDOR_PATTERNS.find(v => v.name === 'AWS CloudFront');
      expect(awsVendor?.headerPatterns).toContain('x-amz-cf-id');
      expect(awsVendor?.headerPatterns).toContain('x-amz-cf-pop');
    });

    it('should match Duda patterns', () => {
      const dudaVendor = VENDOR_PATTERNS.find(v => v.name === 'Duda');
      expect(dudaVendor?.headerPatterns).toContain('d-geo');
      expect(dudaVendor?.headerPatterns).toContain('d-cache');
    });
  });

  describe('Vendor Information Quality', () => {
    it('should have meaningful descriptions', () => {
      for (const vendor of VENDOR_PATTERNS) {
        expect(vendor.description.length).toBeGreaterThan(10);
        // For multi-word vendor names, check if description contains key parts
        const vendorWords = vendor.name.split(' ').filter(word => word.length > 2);
        const hasVendorReference = vendorWords.some(word => 
          vendor.description.toLowerCase().includes(word.toLowerCase())
        );
        expect(hasVendorReference).toBe(true);
      }
    });

    it('should have valid websites for major vendors', () => {
      const majorVendors = ['Cloudflare', 'WordPress', 'Shopify', 'AWS CloudFront'];
      
      for (const vendorName of majorVendors) {
        const vendor = VENDOR_PATTERNS.find(v => v.name === vendorName);
        expect(vendor?.website).toBeDefined();
        expect(vendor?.website).toMatch(/^https?:\/\//);
      }
    });
  });
});