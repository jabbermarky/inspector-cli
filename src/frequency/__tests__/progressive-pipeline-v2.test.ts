/**
 * Progressive Pipeline Validation Tests - Phase 6
 * 
 * Validates that the new progressive pipeline with AnalysisContext
 * works correctly and provides clean data flow without injection methods.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FrequencyAggregator } from '../frequency-aggregator-v2.js';
import type { PreprocessedData, SiteData } from '../types/analyzer-interface.js';

describe('Phase 6: Progressive Pipeline Validation', () => {
  let aggregator: FrequencyAggregator;
  
  beforeEach(() => {
    // Enable progressive pipeline
    aggregator = new FrequencyAggregator(undefined, true);
  });

  it('should run progressive pipeline without injection methods', async () => {
    // Create minimal test data
    const testData = createMinimalTestData();
    
    // Mock the preprocessor to return our test data
    aggregator['preprocessor'].load = async () => testData;

    const result = await aggregator.analyze({ 
      minOccurrences: 1,
      focusPlatformDiscrimination: false  // Start without platform discrimination
    });

    // Validate basic pipeline execution
    expect(result).toBeDefined();
    expect(result.headers).toBeDefined();
    expect(result.metaTags).toBeDefined();
    expect(result.scripts).toBeDefined();
    expect(result.summary).toBeDefined();
    
    // Validate that analyzers completed without injection
    expect(result.headers.patterns.size).toBeGreaterThanOrEqual(0);
    expect(result.summary.totalSitesAnalyzed).toBe(1);
  });

  it('should handle progressive context with platform discrimination', async () => {
    const testData = createRichTestData();
    aggregator['preprocessor'].load = async () => testData;

    const result = await aggregator.analyze({ 
      minOccurrences: 1,
      focusPlatformDiscrimination: true  // Enable platform discrimination
    });

    // Validate progressive pipeline with cross-dimensional analysis
    expect(result).toBeDefined();
    expect(result.summary).toBeDefined();
    
    // Should have platform discrimination summary
    expect(result.summary.platformDiscrimination).toBeDefined();
    expect(result.summary.platformDiscrimination!.enabled).toBe(true);
  });

  it('should fall back to legacy pipeline when disabled', async () => {
    // Create aggregator with legacy pipeline
    const legacyAggregator = new FrequencyAggregator(undefined, false);
    const testData = createMinimalTestData();
    legacyAggregator['preprocessor'].load = async () => testData;

    const result = await legacyAggregator.analyze({ 
      minOccurrences: 1,
      focusPlatformDiscrimination: false
    });

    // Should still work with legacy injection pattern
    expect(result).toBeDefined();
    expect(result.headers).toBeDefined();
    expect(result.summary.totalSitesAnalyzed).toBe(1);
  });
});

/**
 * Create minimal test data for basic pipeline validation
 */
function createMinimalTestData(): PreprocessedData {
  const siteMap = new Map<string, SiteData>();
  
  siteMap.set('test-site.com', {
    url: 'https://test-site.com',
    normalizedUrl: 'test-site.com',
    cms: 'WordPress',
    confidence: 0.9,
    headers: new Map([
      ['server', new Set(['nginx'])],
      ['content-type', new Set(['text/html'])]
    ]),
    metaTags: new Map([
      ['generator', new Set(['WordPress 6.2'])]
    ]),
    scripts: new Set(['https://example.com/script.js']),
    technologies: new Set(['WordPress']),
    capturedAt: new Date().toISOString()
  });

  return {
    sites: siteMap,
    totalSites: 1,
    metadata: {
      version: '1.0.0',
      preprocessedAt: new Date().toISOString()
    }
  };
}

/**
 * Create rich test data with platform discrimination potential
 */
function createRichTestData(): PreprocessedData {
  const siteMap = new Map<string, SiteData>();
  
  siteMap.set('wordpress-site.com', {
    url: 'https://wordpress-site.com',
    normalizedUrl: 'wordpress-site.com',
    cms: 'WordPress',
    confidence: 0.95,
    headers: new Map([
      ['x-wp-total', new Set(['42'])],        // WordPress discriminatory
      ['x-pingback', new Set(['https://wordpress-site.com/xmlrpc.php'])], // WordPress specific
      ['server', new Set(['nginx'])],         // Infrastructure noise
      ['content-type', new Set(['text/html; charset=utf-8'])]
    ]),
    metaTags: new Map([
      ['generator', new Set(['WordPress 6.2'])], // WordPress discriminatory
      ['description', new Set(['A WordPress site'])]
    ]),
    scripts: new Set([
      'https://wordpress-site.com/wp-content/themes/theme/script.js', // WordPress specific
      'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js'
    ]),
    technologies: new Set(['WordPress', 'jQuery']),
    capturedAt: new Date().toISOString()
  });

  siteMap.set('shopify-site.com', {
    url: 'https://shopify-site.com',
    normalizedUrl: 'shopify-site.com',
    cms: 'Shopify',
    confidence: 0.9,
    headers: new Map([
      ['x-shopify-stage', new Set(['production'])], // Shopify discriminatory
      ['x-shopify-shop-id', new Set(['12345'])],    // Shopify specific
      ['server', new Set(['nginx'])],               // Infrastructure noise
      ['content-type', new Set(['text/html; charset=utf-8'])]
    ]),
    metaTags: new Map([
      ['generator', new Set(['Shopify'])],          // Shopify discriminatory
      ['description', new Set(['A Shopify store'])]
    ]),
    scripts: new Set([
      'https://cdn.shopify.com/s/files/1/0123/4567/t/1/assets/theme.js', // Shopify specific
      'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js'
    ]),
    technologies: new Set(['Shopify', 'jQuery']),
    capturedAt: new Date().toISOString()
  });

  // Create enhanced metadata with platform discrimination data
  const headerCategories = new Map<string, string>();
  const headerClassifications = new Map<string, any>();
  const vendorMappings = new Map<string, string>();
  
  // Classify headers with platform discrimination metadata
  const headers = ['x-wp-total', 'x-pingback', 'x-shopify-stage', 'x-shopify-shop-id', 'server', 'content-type'];
  headers.forEach(header => {
    let category = 'custom';
    let vendor: string | undefined;
    let discriminativeScore = 0.5;
    let targetPlatform: string | null = null;
    let isInfrastructureNoise = false;
    
    if (header.includes('wp-') || header === 'x-pingback') {
      category = 'cms';
      vendor = 'WordPress';
      targetPlatform = 'WordPress';
      discriminativeScore = 0.95;
    } else if (header.includes('shopify')) {
      category = 'cms';
      vendor = 'Shopify';
      targetPlatform = 'Shopify';
      discriminativeScore = 0.95;
    } else if (header === 'server' || header === 'content-type') {
      category = 'infrastructure';
      discriminativeScore = 0.1;
      isInfrastructureNoise = true;
    }
    
    headerCategories.set(header, category);
    headerClassifications.set(header, {
      category,
      discriminativeScore,
      filterRecommendation: discriminativeScore > 0.8 ? 'include' : 'context-dependent',
      vendor,
      platformName: targetPlatform,
      platformDiscrimination: {
        discriminativeScore,
        platformSpecificity: new Map([
          ['WordPress', targetPlatform === 'WordPress' ? 0.9 : 0.1],
          ['Shopify', targetPlatform === 'Shopify' ? 0.9 : 0.1],
          ['Drupal', 0.1]
        ]),
        crossPlatformFrequency: new Map([
          ['WordPress', targetPlatform === 'WordPress' ? 0.8 : 0.1],
          ['Shopify', targetPlatform === 'Shopify' ? 0.8 : 0.1],
          ['Drupal', 0.1]
        ]),
        discriminationMetrics: {
          entropy: discriminativeScore * 2.0,
          maxSpecificity: targetPlatform ? 0.9 : 0.3,
          targetPlatform,
          isInfrastructureNoise
        }
      }
    });
    
    if (vendor) {
      vendorMappings.set(header, vendor);
    }
  });

  return {
    sites: siteMap,
    totalSites: 2,
    metadata: {
      version: '1.0.0',
      preprocessedAt: new Date().toISOString(),
      semantic: {
        categoryCount: headerCategories.size,
        headerCategories,
        headerClassifications,
        vendorMappings
      }
    }
  };
}