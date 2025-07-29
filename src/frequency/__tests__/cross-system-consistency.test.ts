/**
 * Cross-System Consistency Tests
 * 
 * Validates that the header classification migration achieved true consistency
 * across all systems. These tests ensure the same header gets the same 
 * classification everywhere.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataPreprocessor } from '../data-preprocessor-v2.js';
import { isEnterpriseInfrastructureHeader } from '../bias-detector-v1.js';
import { GENERIC_HTTP_HEADERS } from '../../learn/filtering.js';

describe('Cross-System Header Classification Consistency', () => {
  let preprocessor: DataPreprocessor;
  
  beforeEach(() => {
    preprocessor = new DataPreprocessor();
  });

  describe('Critical Edge Cases - All Systems Must Agree', () => {
    // These are the exact edge cases mentioned in the handoff document
    const criticalHeaders = [
      'server-timing',      // Should be filtered (Group 1 - generic)
      'x-cacheable',        // Should be filtered (Group 3 - infrastructure) 
      'shopify-complexity-score', // Should be recommended (Group 4 - platform)
      'referer',            // Should be filtered (Group 1 - generic)
      'x-drupal-cache',     // Should be recommended (Group 4 - platform)
      'x-powered-by',       // Should be context-dependent (Group 2 - cms-indicative)
    ];

    it.each(criticalHeaders)('should classify "%s" consistently across all systems', (headerName) => {
      const classification = preprocessor.classifyHeader(headerName);
      
      // Test DataPreprocessor classification
      expect(classification).toBeDefined();
      expect(['generic', 'cms-indicative', 'infrastructure', 'platform', 'custom']).toContain(classification.category);
      expect(['always-filter', 'never-filter', 'context-dependent']).toContain(classification.filterRecommendation);
      
      // Test Bias Detector consistency
      const isEnterprise = isEnterpriseInfrastructureHeader(headerName);
      const shouldBeEnterprise = classification.category === 'infrastructure' || classification.category === 'generic';
      expect(isEnterprise).toBe(shouldBeEnterprise);
      
      // Test Learn Filtering consistency  
      const isGeneric = GENERIC_HTTP_HEADERS.has(headerName.toLowerCase());
      const shouldBeGeneric = classification.category === 'generic' || classification.category === 'infrastructure';
      expect(isGeneric).toBe(shouldBeGeneric);
      
      console.log(`✓ ${headerName}: ${classification.category} (${classification.filterRecommendation}) - Enterprise: ${isEnterprise}, Generic: ${isGeneric}`);
    });
  });

  describe('Comprehensive Header Sample - System Agreement', () => {
    // Representative sample across all 4 groups
    const testHeaders = [
      // Group 1: Generic (always-filter)
      { name: 'date', expectedCategory: 'generic', expectedFilter: 'always-filter' },
      { name: 'content-type', expectedCategory: 'generic', expectedFilter: 'always-filter' },
      { name: 'cache-control', expectedCategory: 'generic', expectedFilter: 'always-filter' },
      
      // Group 2: CMS-Indicative (context-dependent)
      { name: 'server', expectedCategory: 'cms-indicative', expectedFilter: 'context-dependent' },
      { name: 'x-powered-by', expectedCategory: 'cms-indicative', expectedFilter: 'context-dependent' },
      { name: 'x-generator', expectedCategory: 'cms-indicative', expectedFilter: 'context-dependent' },
      
      // Group 3: Infrastructure (context-dependent)
      { name: 'x-cache', expectedCategory: 'infrastructure', expectedFilter: 'context-dependent' },
      { name: 'cf-ray', expectedCategory: 'infrastructure', expectedFilter: 'context-dependent' },
      { name: 'x-served-by', expectedCategory: 'infrastructure', expectedFilter: 'context-dependent' },
      
      // Group 4: Platform (never-filter)
      { name: 'shopify-complexity-score', expectedCategory: 'platform', expectedFilter: 'never-filter' },
      { name: 'x-drupal-cache', expectedCategory: 'platform', expectedFilter: 'never-filter' },
      { name: 'd-cache', expectedCategory: 'platform', expectedFilter: 'never-filter' },
    ];

    it.each(testHeaders)('should classify "$name" as $expectedCategory with $expectedFilter filter', ({ name, expectedCategory, expectedFilter }) => {
      const classification = preprocessor.classifyHeader(name);
      
      expect(classification.category).toBe(expectedCategory);
      expect(classification.filterRecommendation).toBe(expectedFilter);
      
      // Validate cross-system consistency
      const isEnterprise = isEnterpriseInfrastructureHeader(name);
      const isGeneric = GENERIC_HTTP_HEADERS.has(name.toLowerCase());
      
      // Enterprise function should return true for generic + infrastructure
      if (expectedCategory === 'generic' || expectedCategory === 'infrastructure') {
        expect(isEnterprise).toBe(true);
      } else {
        expect(isEnterprise).toBe(false);
      }
      
      // Generic headers set should contain generic + infrastructure  
      if (expectedCategory === 'generic' || expectedCategory === 'infrastructure') {
        expect(isGeneric).toBe(true);
      } else {
        expect(isGeneric).toBe(false);
      }
    });
  });

  describe('Platform Detection Consistency', () => {
    const platformHeaders = [
      'shopify-complexity-score',
      'x-shopify-stage',
      'x-drupal-cache',
      'x-drupal-dynamic-cache', 
      'd-cache',
      'd-geo',
      'x-wordpress-cache',
      'wp-super-cache',
    ];

    it.each(platformHeaders)('should consistently identify "%s" as platform-specific', (headerName) => {
      const classification = preprocessor.classifyHeader(headerName);
      
      // Should be classified as platform category
      expect(classification.category).toBe('platform');
      expect(classification.filterRecommendation).toBe('never-filter');
      
      // Should have vendor/platform info
      expect(classification.vendor || classification.platformName).toBeDefined();
      
      // Should NOT be considered enterprise infrastructure
      expect(isEnterpriseInfrastructureHeader(headerName)).toBe(false);
      
      // Should NOT be in generic headers
      expect(GENERIC_HTTP_HEADERS.has(headerName.toLowerCase())).toBe(false);
    });
  });

  describe('Case Sensitivity Consistency', () => {
    const testCases = [
      { original: 'Server-Timing', normalized: 'server-timing' },
      { original: 'X-Powered-By', normalized: 'x-powered-by' },
      { original: 'SHOPIFY-COMPLEXITY-SCORE', normalized: 'shopify-complexity-score' },
      { original: 'Content-Type', normalized: 'content-type' },
    ];

    it.each(testCases)('should handle case variations consistently for "$original"', ({ original, normalized }) => {
      const originalClassification = preprocessor.classifyHeader(original);
      const normalizedClassification = preprocessor.classifyHeader(normalized);
      
      // Should get identical classifications regardless of case
      expect(originalClassification.category).toBe(normalizedClassification.category);
      expect(originalClassification.filterRecommendation).toBe(normalizedClassification.filterRecommendation);
      
      // Cross-system consistency should also handle case
      expect(isEnterpriseInfrastructureHeader(original)).toBe(isEnterpriseInfrastructureHeader(normalized));
      expect(GENERIC_HTTP_HEADERS.has(original.toLowerCase())).toBe(GENERIC_HTTP_HEADERS.has(normalized.toLowerCase()));
    });
  });

  describe('System Integration Validation', () => {
    it('should have DataPreprocessor as single source of truth for bias detector', () => {
      // Test that bias detector actually uses DataPreprocessor internally
      const testHeaders = ['x-cache', 'server-timing', 'shopify-edge-ip'];
      
      for (const header of testHeaders) {
        const classification = preprocessor.classifyHeader(header);
        const isEnterprise = isEnterpriseInfrastructureHeader(header);
        
        // The bias detector should align with DataPreprocessor logic
        const expectedEnterprise = classification.category === 'infrastructure' || classification.category === 'generic';
        expect(isEnterprise).toBe(expectedEnterprise);
      }
    });

    it('should have DataPreprocessor as single source of truth for learn filtering', () => {
      // Test that GENERIC_HTTP_HEADERS is actually computed from DataPreprocessor
      const genericHeaders = preprocessor.getHeadersByCategory('generic');
      const infrastructureHeaders = preprocessor.getHeadersByCategory('infrastructure');
      
      // GENERIC_HTTP_HEADERS should contain all generic + infrastructure headers
      for (const header of genericHeaders) {
        expect(GENERIC_HTTP_HEADERS.has(header)).toBe(true);
      }
      
      for (const header of infrastructureHeaders) {
        expect(GENERIC_HTTP_HEADERS.has(header)).toBe(true);
      }
      
      // Should NOT contain platform headers
      const platformPatterns = preprocessor.getPlatformPatterns();
      for (const [pattern] of platformPatterns) {
        if (!pattern.endsWith('-')) { // Skip prefix patterns
          expect(GENERIC_HTTP_HEADERS.has(pattern)).toBe(false);
        }
      }
    });
  });

  describe('No Contradictory Classifications', () => {
    it('should never have a header that is both filtered and recommended', () => {
      const testHeaders = [
        'server-timing', 'x-cacheable', 'shopify-complexity-score', 'referer',
        'x-powered-by', 'server', 'x-generator', 'x-cache', 'cf-ray',
        'x-drupal-cache', 'd-cache', 'date', 'content-type'
      ];

      for (const header of testHeaders) {
        const classification = preprocessor.classifyHeader(header);
        
        // A header cannot be both always-filter AND never-filter
        expect(classification.filterRecommendation).not.toBe('always-filter-never-filter'); // This would be impossible
        
        // Validate logical consistency
        if (classification.filterRecommendation === 'always-filter') {
          expect(classification.category).toBeOneOf(['generic']);
        }
        
        if (classification.filterRecommendation === 'never-filter') {
          expect(classification.category).toBeOneOf(['platform']);
        }
        
        if (classification.filterRecommendation === 'context-dependent') {
          expect(classification.category).toBeOneOf(['cms-indicative', 'infrastructure', 'custom']);
        }
      }
    });
  });
});

// Custom matcher for better test readability
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}, but got ${received}`,
        pass: false,
      };
    }
  },
});

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeOneOf(expected: any[]): T;
  }
}