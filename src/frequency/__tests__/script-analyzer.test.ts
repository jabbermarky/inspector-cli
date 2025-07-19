import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyzeScripts } from '../script-analyzer.js';
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

describe('Script Analyzer', () => {
  setupCommandTests();
  
  describe('Script Pattern Extraction', () => {
    it('should extract path patterns from script URLs', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          scripts: [
            { src: '/wp-content/themes/theme1/script.js' },
            { src: '/wp-includes/js/jquery.js' },
            { src: '/media/jui/js/bootstrap.js' }
          ]
        } as any,
        {
          url: 'https://site2.com',
          scripts: [
            { src: '/wp-content/plugins/plugin1/script.js' },
            { src: '/templates/template1/js/main.js' }
          ]
        } as any
      ];
      
      const result = await analyzeScripts(dataPoints, {
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
      
      // Check path patterns
      expect(result.has('paths')).toBe(true);
      const pathPatterns = result.get('paths')!;
      
      const wpContentPattern = pathPatterns.find(p => p.pattern === 'path:wp-content');
      expect(wpContentPattern).toBeDefined();
      expect(wpContentPattern!.occurrences).toBe(2); // Both sites have wp-content
      
      const wpIncludesPattern = pathPatterns.find(p => p.pattern === 'path:wp-includes');
      expect(wpIncludesPattern).toBeDefined();
      expect(wpIncludesPattern!.occurrences).toBe(1);
      
      const mediaPattern = pathPatterns.find(p => p.pattern === 'path:media');
      expect(mediaPattern).toBeDefined();
      expect(mediaPattern!.occurrences).toBe(1);
      
      const templatesPattern = pathPatterns.find(p => p.pattern === 'path:templates');
      expect(templatesPattern).toBeDefined();
      expect(templatesPattern!.occurrences).toBe(1);
    });
    
    it('should extract library patterns', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          scripts: [
            { src: '/assets/jquery.min.js' },
            { src: '/js/bootstrap.bundle.min.js' }
          ]
        } as any,
        {
          url: 'https://site2.com',
          scripts: [
            { src: 'https://code.jquery.com/jquery-3.6.0.min.js' },
            { src: '/vendor/angular.min.js' }
          ]
        } as any
      ];
      
      const result = await analyzeScripts(dataPoints, {
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
      
      expect(result.has('libraries')).toBe(true);
      const libraryPatterns = result.get('libraries')!;
      
      const jqueryPattern = libraryPatterns.find(p => p.pattern === 'library:jquery');
      expect(jqueryPattern).toBeDefined();
      expect(jqueryPattern!.occurrences).toBe(2);
      
      const bootstrapPattern = libraryPatterns.find(p => p.pattern === 'library:bootstrap');
      expect(bootstrapPattern).toBeDefined();
      expect(bootstrapPattern!.occurrences).toBe(1);
      
      const angularPattern = libraryPatterns.find(p => p.pattern === 'library:angular');
      expect(angularPattern).toBeDefined();
      expect(angularPattern!.occurrences).toBe(1);
    });
    
    it('should extract inline script patterns', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          scripts: [
            { content: 'jQuery(document).ready(function($) { })' },
            { content: 'window.dataLayer = window.dataLayer || [];' }
          ]
        } as any,
        {
          url: 'https://site2.com',
          scripts: [
            { content: 'Drupal.behaviors.myModule = { attach: function() {} }' },
            { inline: true, content: 'gtag("config", "GA_ID");' }
          ]
        } as any
      ];
      
      const result = await analyzeScripts(dataPoints, {
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
      
      expect(result.has('inline')).toBe(true);
      const inlinePatterns = result.get('inline')!;
      
      const jqueryInlinePattern = inlinePatterns.find(p => p.pattern === 'inline:jquery');
      expect(jqueryInlinePattern).toBeDefined();
      expect(jqueryInlinePattern!.occurrences).toBe(1);
      
      const drupalPattern = inlinePatterns.find(p => p.pattern === 'inline:drupal');
      expect(drupalPattern).toBeDefined();
      expect(drupalPattern!.occurrences).toBe(1);
      
      const gtagPattern = inlinePatterns.find(p => p.pattern === 'inline:google-analytics');
      expect(gtagPattern).toBeDefined();
      expect(gtagPattern!.occurrences).toBe(1);
      
      const dataLayerPattern = inlinePatterns.find(p => p.pattern === 'inline:google-tag-manager');
      expect(dataLayerPattern).toBeDefined();
      expect(dataLayerPattern!.occurrences).toBe(1);
    });
    
    it('should extract tracking patterns', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          scripts: [
            { src: 'https://www.googletagmanager.com/gtm.js?id=GTM-XXXX' },
            { src: 'https://www.google-analytics.com/analytics.js' }
          ]
        } as any,
        {
          url: 'https://site2.com',
          scripts: [
            { src: 'https://static.hotjar.com/c/hotjar-12345.js' },
            { src: 'https://connect.facebook.net/en_US/fbevents.js' }
          ]
        } as any
      ];
      
      const result = await analyzeScripts(dataPoints, {
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
      
      expect(result.has('tracking')).toBe(true);
      const trackingPatterns = result.get('tracking')!;
      
      expect(trackingPatterns.find(p => p.pattern === 'tracking:google-tag-manager')).toBeDefined();
      expect(trackingPatterns.find(p => p.pattern === 'tracking:google-analytics')).toBeDefined();
      expect(trackingPatterns.find(p => p.pattern === 'tracking:hotjar')).toBeDefined();
      expect(trackingPatterns.find(p => p.pattern === 'tracking:facebook')).toBeDefined();
    });
    
    it('should handle same-domain counting correctly', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          scripts: [
            { src: '/js/script.js' }, // Same domain - matches path:js
            { src: 'https://site1.com/wp-content/script.js' }, // Same domain - matches path:wp-content
            { src: 'https://cdn.example.com/jquery.min.js' } // External - matches library:jquery and domain:cdn
          ]
        } as any
      ];
      
      const result = await analyzeScripts(dataPoints, {
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
      
      // All patterns should be counted regardless of domain
      // The same-domain info is used later for detection recommendations
      const allPatterns = Array.from(result.values()).flat();
      expect(allPatterns.length).toBeGreaterThan(0);
    });
    
    it('should not count duplicate patterns per site', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          scripts: [
            { src: '/wp-content/script1.js' },
            { src: '/wp-content/script2.js' },
            { src: '/wp-content/script3.js' }
          ]
        } as any,
        {
          url: 'https://site2.com',
          scripts: [
            { src: '/wp-content/script4.js' }
          ]
        } as any
      ];
      
      const result = await analyzeScripts(dataPoints, {
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
      
      const pathPatterns = result.get('paths')!;
      const wpContentPattern = pathPatterns.find(p => p.pattern === 'path:wp-content');
      
      // Should count once per site, not once per script
      expect(wpContentPattern!.occurrences).toBe(2); // 2 sites, not 4 scripts
      expect(wpContentPattern!.frequency).toBeCloseTo(1.0); // 2/2 sites = 100%
    });
    
    it('should handle empty or missing scripts gracefully', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          scripts: []
        } as any,
        {
          url: 'https://site2.com',
          scripts: null as any
        } as any,
        {
          url: 'https://site3.com'
          // No scripts property
        } as any
      ];
      
      const result = await analyzeScripts(dataPoints, {
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
      
      // Should return empty results without errors
      expect(result.size).toBe(0);
    });
    
    it('should extract domain patterns', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          scripts: [
            { src: 'https://cdn.jsdelivr.net/npm/package@1.0.0/dist/script.js' },
            { src: 'https://unpkg.com/package@1.0.0/dist/script.js' },
            { src: 'https://irp.cdn-website.com/script.js' }
          ]
        } as any
      ];
      
      const result = await analyzeScripts(dataPoints, {
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
      
      expect(result.has('domains')).toBe(true);
      const domainPatterns = result.get('domains')!;
      
      expect(domainPatterns.find(p => p.pattern === 'domain:jsdelivr')).toBeDefined();
      expect(domainPatterns.find(p => p.pattern === 'domain:unpkg')).toBeDefined();
      expect(domainPatterns.find(p => p.pattern === 'domain:duda-cdn')).toBeDefined();
    });
    
    it('should respect minimum occurrence threshold', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          scripts: [{ src: '/js/common.js' }] // Generates path:js
        } as any,
        {
          url: 'https://site2.com',
          scripts: [{ src: '/js/common.js' }] // Generates path:js  
        } as any,
        {
          url: 'https://site3.com',
          scripts: [{ src: '/assets/rare.js' }] // Generates path:assets (only appears once)
        } as any
      ];
      
      const result = await analyzeScripts(dataPoints, {
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
      
      // Common pattern should be included
      const allPatterns = Array.from(result.values()).flat();
      expect(allPatterns.some(p => p.pattern.includes('js'))).toBe(true); // path:js from /common/ and /rare/
    });
  });
  
  describe('Pattern Classification', () => {
    it('should properly categorize patterns', async () => {
      const dataPoints: DetectionDataPoint[] = [
        {
          url: 'https://site1.com',
          scripts: [
            { src: '/wp-content/script.js' }, // path pattern
            { src: '/lib/jquery.min.js' }, // library pattern
            { src: 'https://cdn.example.com/script.js' }, // domain pattern
            { src: '/assets/bundle.min.js' }, // script characteristic
            { content: 'window.WordPress = {};' } // inline pattern
          ]
        } as any
      ];
      
      const result = await analyzeScripts(dataPoints, {
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
      
      // Should have multiple categories
      expect(result.has('paths')).toBe(true);
      expect(result.has('libraries')).toBe(true);
      expect(result.has('domains')).toBe(true);
      expect(result.has('scripts')).toBe(true);
      expect(result.has('inline')).toBe(true);
    });
  });
});