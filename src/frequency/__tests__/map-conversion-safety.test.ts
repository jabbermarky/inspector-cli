/**
 * Map Conversion Safety Tests
 * Ensures all Map variables in frequency analysis are properly converted
 * when crossing type boundaries (especially to DetectionDataPoint format)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataPreprocessor } from '../data-preprocessor.js';
import type { SiteData } from '../types/analyzer-interface.js';

describe('Map Conversion Safety', () => {
  let mockSiteData: SiteData;

  beforeEach(() => {
    // Create realistic SiteData with Map types
    mockSiteData = {
      url: 'https://example.com',
      normalizedUrl: 'example.com',
      cms: 'WordPress',
      confidence: 0.85,
      headers: new Map([
        ['content-type', new Set(['text/html'])],
        ['server', new Set(['nginx'])],
        ['set-cookie', new Set(['session=abc123', 'theme=dark'])] // Multiple values
      ]),
      headersByPageType: {
        mainpage: new Map([
          ['content-type', new Set(['text/html'])],
          ['server', new Set(['nginx'])]
        ]),
        robots: new Map([
          ['content-type', new Set(['text/plain'])],
          ['server', new Set(['nginx'])]
        ])
      },
      metaTags: new Map([
        ['description', new Set(['Test description'])],
        ['keywords', new Set(['test', 'example'])] // Multiple values
      ]),
      scripts: new Set(['https://cdn.example.com/script.js']),
      technologies: new Set(['JavaScript', 'HTML5']),
      capturedAt: '2025-07-24T12:00:00Z'
    };
  });

  describe('Header Map Conversion', () => {
    it('should convert headers Map to plain object correctly', () => {
      // Test the conversion logic from analyzer-v2.ts
      const converted = mockSiteData.headers ? Object.fromEntries(
        Array.from(mockSiteData.headers.entries()).map((entry) => {
          const [name, valueSet] = entry as [string, Set<string>];
          return [name, Array.from(valueSet).join(', ')];
        })
      ) : {};

      expect(converted).toEqual({
        'content-type': 'text/html',
        'server': 'nginx',
        'set-cookie': 'session=abc123, theme=dark' // Properly joined
      });
      
      // Ensure it's a plain object, not a Map
      expect(converted.constructor).toBe(Object);
      expect(converted instanceof Map).toBe(false);
    });

    it('should handle empty headers Map', () => {
      const emptySite = { ...mockSiteData, headers: new Map() };
      
      const converted = emptySite.headers ? Object.fromEntries(
        Array.from(emptySite.headers.entries()).map((entry) => {
          const [name, valueSet] = entry as [string, Set<string>];
          return [name, Array.from(valueSet).join(', ')];
        })
      ) : {};

      expect(converted).toEqual({});
      expect(Object.keys(converted)).toHaveLength(0);
    });

    it('should handle null/undefined headers', () => {
      const nullSite = { ...mockSiteData, headers: null as any };
      
      const converted = nullSite.headers ? Object.fromEntries(
        Array.from(nullSite.headers.entries()).map((entry) => {
          const [name, valueSet] = entry as [string, Set<string>];
          return [name, Array.from(valueSet).join(', ')];
        })
      ) : {};

      expect(converted).toEqual({});
    });
  });

  describe('MetaTags Map Conversion', () => {
    it('should identify the current metaTags conversion bug', () => {
      // Current code in analyzer-v2.ts:57 that will FAIL
      // Object.entries(site.metaTags || {})
      
      // This will return [] because Map is not a plain object
      const buggyConversion = Object.entries(mockSiteData.metaTags || {});
      expect(buggyConversion).toEqual([]); // BUG: Should not be empty!
      
      // Correct conversion should be:
      const correctConversion = mockSiteData.metaTags ? 
        Array.from(mockSiteData.metaTags.entries()).map(([name, valueSet]) => ({
          name, 
          content: Array.from(valueSet).join(', ')
        })) : [];
      
      expect(correctConversion).toEqual([
        { name: 'description', content: 'Test description' },
        { name: 'keywords', content: 'test, example' }
      ]);
    });

    it('should provide correct metaTags conversion', () => {
      const converted = mockSiteData.metaTags ? 
        Array.from(mockSiteData.metaTags.entries()).map(([name, valueSet]) => ({
          name, 
          content: Array.from(valueSet).join(', ')
        })) : [];

      expect(converted).toHaveLength(2);
      expect(converted[0]).toHaveProperty('name');
      expect(converted[0]).toHaveProperty('content');
      expect(typeof converted[0].content).toBe('string');
    });
  });

  describe('DetectionDataPoint Conversion Integration', () => {
    it('should simulate complete DetectionDataPoint conversion', () => {
      // Simulate the full conversion from analyzer-v2.ts
      const detectionDataPoint = {
        url: mockSiteData.url,
        timestamp: new Date(mockSiteData.capturedAt),
        userAgent: '',
        captureVersion: 'v2' as any,
        originalUrl: mockSiteData.url,
        finalUrl: mockSiteData.url,
        redirectChain: [],
        totalRedirects: 0,
        protocolUpgraded: false,
        navigationTime: 0,
        
        // CRITICAL: Headers conversion
        httpHeaders: mockSiteData.headers ? Object.fromEntries(
          Array.from(mockSiteData.headers.entries()).map((entry) => {
            const [name, valueSet] = entry as [string, Set<string>];
            return [name, Array.from(valueSet).join(', ')];
          })
        ) : {},
        
        statusCode: 200,
        contentType: 'text/html',
        
        // FIXED: MetaTags conversion (currently buggy in analyzer-v2.ts)
        metaTags: mockSiteData.metaTags ? 
          Array.from(mockSiteData.metaTags.entries()).map(([name, valueSet]) => ({
            name, 
            content: Array.from(valueSet).join(', ')
          })) : [],
        
        htmlContent: '',
        htmlSize: 0,
        domElements: [],
        links: [],
        scripts: [],
        stylesheets: [],
        forms: [],
        technologies: [],
        loadTime: 0,
        resourceCount: 0,
        
        detectionResults: mockSiteData.cms ? [{
          detector: 'cms-detection',
          strategy: 'auto',
          cms: mockSiteData.cms,
          confidence: mockSiteData.confidence || 1.0,
          executionTime: 0
        }] : [],
        
        errors: []
      };

      // Verify all conversions worked
      expect(detectionDataPoint.httpHeaders).toEqual({
        'content-type': 'text/html',
        'server': 'nginx',
        'set-cookie': 'session=abc123, theme=dark'
      });
      
      expect(detectionDataPoint.metaTags).toEqual([
        { name: 'description', content: 'Test description' },
        { name: 'keywords', content: 'test, example' }
      ]);

      expect(detectionDataPoint.detectionResults).toHaveLength(1);
      expect(detectionDataPoint.detectionResults[0].cms).toBe('WordPress');
    });
  });

  describe('Boundary Type Safety', () => {
    it('should detect when Maps are passed where objects are expected', () => {
      const testMap = new Map([['key', 'value']]);
      
      // This is the bug pattern - Map used where object expected  
      const keys = Object.keys(testMap);
      expect(keys).toEqual([]); // Maps have no enumerable properties
      
      // Correct approach
      const correctKeys = Array.from(testMap.keys());
      expect(correctKeys).toEqual(['key']);
    });

    it('should verify JSON serialization safety', () => {
      const testMap = new Map([['key', 'value']]);
      
      // Without custom replacer - loses data
      const badJson = JSON.stringify({ data: testMap });
      expect(badJson).toBe('{"data":{}}'); // Empty object!
      
      // With custom replacer (from reporter.ts)
      const mapReplacer = (key: string, value: any) => {
        if (value instanceof Map) {
          return Object.fromEntries(value);
        }
        return value;
      };
      
      const goodJson = JSON.stringify({ data: testMap }, mapReplacer);
      expect(goodJson).toBe('{"data":{"key":"value"}}'); // Correct!
    });
  });

  describe('Error Scenarios', () => {
    it('should handle corrupted Map data gracefully', () => {
      const corruptedSite = {
        ...mockSiteData,
        headers: { notAMap: true } as any // Wrong type
      };
      
      // Conversion should handle gracefully
      const converted = corruptedSite.headers && corruptedSite.headers instanceof Map ? 
        Object.fromEntries(
          Array.from(corruptedSite.headers.entries()).map((entry) => {
            const [name, valueSet] = entry as [string, Set<string>];
            return [name, Array.from(valueSet).join(', ')];
          })
        ) : {};

      expect(converted).toEqual({});
    });

    it('should handle Set values that are not Sets', () => {
      const badSite = {
        ...mockSiteData,
        headers: new Map([
          ['header1', ['not', 'a', 'set'] as any] // Array instead of Set
        ])
      };

      // Conversion should handle gracefully
      const converted = badSite.headers ? Object.fromEntries(
        Array.from(badSite.headers.entries()).map((entry) => {
          const [name, valueSet] = entry as [string, Set<string>];
          // Safely handle if valueSet is not a Set
          const values = valueSet instanceof Set ? 
            Array.from(valueSet) : 
            Array.isArray(valueSet) ? valueSet : [String(valueSet)];
          return [name, values.join(', ')];
        })
      ) : {};

      expect(converted).toEqual({
        'header1': 'not, a, set'
      });
    });
  });
});