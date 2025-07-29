import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyzeHeaders } from '../header-analyzer-v1.js';
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

describe('Header Analyzer', () => {
  setupCommandTests();
  
  describe('Header Pattern Analysis', () => {
    it('should analyze header frequency across sites', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          httpHeaders: {
            'server': 'Apache',
            'x-powered-by': 'WordPress'
          }
        } as any,
        {
          url: 'https://site2.com',
          httpHeaders: {
            'server': 'nginx',
            'x-powered-by': 'WordPress'
          }
        } as any,
        {
          url: 'https://site3.com',
          httpHeaders: {
            'server': 'Apache'
          }
        } as any
      ];
      
      const result = await analyzeHeaders(dataPoints, {
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
      
      // Check server header analysis
      expect(result.has('server')).toBe(true);
      const serverPatterns = result.get('server')!;
      expect(serverPatterns).toHaveLength(2); // Apache and nginx
      
      const apachePattern = serverPatterns.find(p => p.pattern === 'server:Apache');
      expect(apachePattern).toBeDefined();
      expect(apachePattern!.frequency).toBeCloseTo(0.67, 1); // 2/3 sites
      expect(apachePattern!.confidence).toBeGreaterThan(0);
      
      const nginxPattern = serverPatterns.find(p => p.pattern === 'server:nginx');
      expect(nginxPattern).toBeDefined();
      expect(nginxPattern!.frequency).toBeCloseTo(0.33, 1); // 1/3 sites
      expect(nginxPattern!.examples).toHaveLength(1);
      
      // Check x-powered-by header analysis
      expect(result.has('x-powered-by')).toBe(true);
      const poweredByPatterns = result.get('x-powered-by')!;
      expect(poweredByPatterns).toHaveLength(1);
      expect(poweredByPatterns[0].pattern).toBe('x-powered-by:WordPress');
      expect(poweredByPatterns[0].frequency).toBeCloseTo(0.67, 1); // 2/3 sites
    });
    
    it('should normalize header names to lowercase', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          httpHeaders: {
            'Server': 'Apache',
            'X-Powered-By': 'PHP'
          }
        } as any,
        {
          url: 'https://site2.com',
          httpHeaders: {
            'SERVER': 'Apache',
            'x-powered-by': 'PHP'
          }
        } as any
      ];
      
      const result = await analyzeHeaders(dataPoints, {
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
      
      // All variations should be normalized to lowercase
      expect(result.has('server')).toBe(true);
      expect(result.has('Server')).toBe(false);
      expect(result.has('SERVER')).toBe(false);
      
      const serverPatterns = result.get('server')!;
      expect(serverPatterns[0].confidence).toBeGreaterThan(0); // Has confidence value
    });
    
    it('should handle empty header values', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          httpHeaders: {
            'x-custom': '',
            'x-another': null as any
          }
        } as any,
        {
          url: 'https://site2.com',
          httpHeaders: {
            'x-custom': undefined as any
          }
        } as any
      ];
      
      const result = await analyzeHeaders(dataPoints, {
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
      
      // Empty values should be tracked
      expect(result.has('x-custom')).toBe(true);
      const customPatterns = result.get('x-custom')!;
      expect(customPatterns).toHaveLength(1);
      expect(customPatterns[0].pattern).toBe('x-custom:<empty>');
    });
    
    it('should respect minimum occurrence threshold', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          httpHeaders: { 'common-header': 'value1' }
        } as any,
        {
          url: 'https://site2.com',
          httpHeaders: { 'common-header': 'value1' }
        } as any,
        {
          url: 'https://site3.com',
          httpHeaders: { 'rare-header': 'value2' }
        } as any
      ];
      
      const result = await analyzeHeaders(dataPoints, {
        dataSource: 'cms-analysis',
        dataDir: './data',
        minSites: 1,
        minOccurrences: 2, // Require at least 2 occurrences
        pageType: 'all',
        output: 'human',
        outputFile: '',
        includeRecommendations: false,
        includeCurrentFilters: false
      });
      
      // Only common-header should be included
      expect(result.has('common-header')).toBe(true);
      expect(result.has('rare-header')).toBe(false);
    });
    
    it('should handle sites with no headers', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          httpHeaders: {}
        } as any,
        {
          url: 'https://site2.com',
          httpHeaders: null as any
        } as any,
        {
          url: 'https://site3.com'
          // No headers property
        } as any
      ];
      
      const result = await analyzeHeaders(dataPoints, {
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
      
      // Should return empty map without errors
      expect(result.size).toBe(0);
    });
    
    it('should collect example values for each pattern', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          httpHeaders: { 'server': 'Apache/2.4.41' }
        } as any,
        {
          url: 'https://site2.com',
          httpHeaders: { 'server': 'Apache/2.4.43' }
        } as any,
        {
          url: 'https://site3.com',
          httpHeaders: { 'server': 'Apache/2.4.46' }
        } as any,
        {
          url: 'https://site4.com',
          httpHeaders: { 'server': 'Apache/2.4.48' }
        } as any
      ];
      
      const result = await analyzeHeaders(dataPoints, {
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
      
      const serverPatterns = result.get('server')!;
      // Should keep individual values
      expect(serverPatterns.length).toBeGreaterThanOrEqual(1);
      
      // Check that examples are collected
      serverPatterns.forEach(pattern => {
        expect(pattern.examples.length).toBeGreaterThan(0);
        expect(pattern.examples.length).toBeLessThanOrEqual(3); // Max 3 examples
      });
    });
  });
  
  describe('Special Header Handling', () => {
    it('should handle set-cookie headers properly', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          httpHeaders: {
            'set-cookie': 'sessionid=abc123; Path=/; HttpOnly'
          }
        } as any,
        {
          url: 'https://site2.com',
          httpHeaders: {
            'set-cookie': ['sessionid=def456; Path=/; HttpOnly', 'tracker=xyz; Path=/']
          } as any
        } as any
      ];
      
      const result = await analyzeHeaders(dataPoints, {
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
      
      expect(result.has('set-cookie')).toBe(true);
      const cookiePatterns = result.get('set-cookie')!;
      expect(cookiePatterns.length).toBeGreaterThan(0);
    });
  });
});