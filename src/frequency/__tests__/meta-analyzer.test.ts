import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyzeMetaTags } from '../meta-analyzer-v1.js';
import { DetectionDataPoint } from '../../utils/cms/analysis/types.js';
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

describe('Meta Tag Analyzer', () => {
  setupCommandTests();
  
  describe('Meta Tag Pattern Analysis', () => {
    it('should analyze meta tags by type and content', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          metaTags: [
            { name: 'generator', content: 'WordPress 6.0' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' }
          ]
        } as any,
        {
          url: 'https://site2.com',
          metaTags: [
            { name: 'generator', content: 'WordPress 6.1' },
            { property: 'og:type', content: 'website' }
          ]
        } as any,
        {
          url: 'https://site3.com',
          metaTags: [
            { name: 'viewport', content: 'width=device-width, initial-scale=1' }
          ]
        } as any
      ];
      
      const result = await analyzeMetaTags(dataPoints, {
        dataSource: 'cms-analysis',
        dataDir: './data',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      });
      
      // Check generator meta tag
      expect(result.has('name:generator')).toBe(true);
      const generatorPatterns = result.get('name:generator')!;
      expect(generatorPatterns).toHaveLength(2); // WordPress 6.0 and 6.1
      
      // Check viewport meta tag
      expect(result.has('name:viewport')).toBe(true);
      const viewportPatterns = result.get('name:viewport')!;
      expect(viewportPatterns).toHaveLength(1);
      expect(viewportPatterns[0].frequency).toBeCloseTo(0.67, 1); // 2/3 sites
      
      // Check og:type property
      expect(result.has('property:og:type')).toBe(true);
      const ogTypePatterns = result.get('property:og:type')!;
      expect(ogTypePatterns).toHaveLength(1);
      expect(ogTypePatterns[0].frequency).toBeCloseTo(0.33, 1); // 1/3 sites
    });
    
    it('should handle different meta tag attributes', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          metaTags: [
            { name: 'description', content: 'Site description' },
            { property: 'og:description', content: 'OG description' },
            { httpEquiv: 'content-type', content: 'text/html; charset=utf-8' },
            { charset: 'utf-8' }
          ]
        } as any
      ];
      
      const result = await analyzeMetaTags(dataPoints, {
        dataSource: 'cms-analysis',
        dataDir: './data',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      });
      
      expect(result.has('name:description')).toBe(true);
      expect(result.has('property:og:description')).toBe(true);
      expect(result.has('http-equiv:content-type')).toBe(true);
      expect(result.has('unknown')).toBe(true); // charset doesn't fit standard patterns
    });
    
    it('should handle empty meta tag content', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          metaTags: [
            { name: 'keywords', content: '' },
            { name: 'author', content: null as any },
            { name: 'robots' } // No content attribute
          ]
        } as any
      ];
      
      const result = await analyzeMetaTags(dataPoints, {
        dataSource: 'cms-analysis',
        dataDir: './data',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      });
      
      const keywordsPatterns = result.get('name:keywords')!;
      expect(keywordsPatterns[0].pattern).toBe('name:keywords:no-content');
      
      const authorPatterns = result.get('name:author')!;
      expect(authorPatterns[0].pattern).toBe('name:author:no-content');
      
      const robotsPatterns = result.get('name:robots')!;
      expect(robotsPatterns[0].pattern).toBe('name:robots:no-content');
    });
    
    it('should respect minimum occurrence threshold', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          metaTags: [{ name: 'common', content: 'value' }]
        } as any,
        {
          url: 'https://site2.com',
          metaTags: [{ name: 'common', content: 'value' }]
        } as any,
        {
          url: 'https://site3.com',
          metaTags: [{ name: 'rare', content: 'value' }]
        } as any
      ];
      
      const result = await analyzeMetaTags(dataPoints, {
        dataSource: 'cms-analysis',
        dataDir: './data',
        minSites: 1,
        minOccurrences: 2,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      });
      
      expect(result.has('name:common')).toBe(true);
      expect(result.has('name:rare')).toBe(false);
    });
    
    it('should handle sites with no meta tags', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          metaTags: []
        } as any,
        {
          url: 'https://site2.com',
          metaTags: null as any
        } as any,
        {
          url: 'https://site3.com'
          // No metaTags property
        } as any
      ];
      
      const result = await analyzeMetaTags(dataPoints, {
        dataSource: 'cms-analysis',
        dataDir: './data',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      });
      
      expect(result.size).toBe(0);
    });
    
    it('should collect proper examples', async () => {
      const dataPoints: DetectionDataPoint[] = [];
      
      // Create many sites with same meta tag
      for (let i = 0; i < 10; i++) {
        dataPoints.push({
          url: `https://site${i}.com`,
          metaTags: [
            { name: 'generator', content: `WordPress ${i}.0` }
          ]
        } as any);
      }
      
      const result = await analyzeMetaTags(dataPoints, {
        dataSource: 'cms-analysis',
        dataDir: './data',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      });
      
      const generatorPatterns = result.get('name:generator')!;
      generatorPatterns.forEach(pattern => {
        expect(pattern.examples.length).toBeGreaterThan(0);
        expect(pattern.examples.length).toBeLessThanOrEqual(3); // Max 3 examples
        pattern.examples.forEach(example => {
          expect(example).toMatch(/WordPress \d+\.0/);
        });
      });
    });
    
    it('should handle malformed meta tags gracefully', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          metaTags: [
            { name: 'valid', content: 'content' },
            {} as any, // Empty object
            { weird: 'attribute' } as any, // Non-standard attribute
            null as any, // Null entry
            { name: 123, content: 'number name' } as any // Invalid type
          ]
        } as any
      ];
      
      const result = await analyzeMetaTags(dataPoints, {
        dataSource: 'cms-analysis',
        dataDir: './data',
        minSites: 1,
        minOccurrences: 1,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      });
      
      // Should handle gracefully and still process valid tags
      expect(result.has('name:valid')).toBe(true);
      expect(result.get('name:valid')![0].pattern).toBe('name:valid:content');
    });
  });
  
  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const dataPoints: DetectionDataPoint[] = [];
      
      // Create 1000 sites with various meta tags
      for (let i = 0; i < 1000; i++) {
        dataPoints.push({
          url: `https://site${i}.com`,
          metaTags: [
            { name: 'generator', content: `CMS ${i % 10}` },
            { name: 'viewport', content: 'width=device-width' },
            { property: 'og:type', content: i % 2 === 0 ? 'website' : 'article' }
          ]
        } as any);
      }
      
      const startTime = Date.now();
      const result = await analyzeMetaTags(dataPoints, {
        dataSource: 'cms-analysis',
        dataDir: './data',
        minSites: 1,
        minOccurrences: 10,
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      });
      const duration = Date.now() - startTime;
      
      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max
      
      // Should produce correct results
      expect(result.has('name:generator')).toBe(true);
      expect(result.has('name:viewport')).toBe(true);
      expect(result.has('property:og:type')).toBe(true);
    });
  });
});