/**
 * Integration test to verify V2 reporter is properly integrated
 * Tests that the frequency command uses the new V2 reporter
 */

import { describe, it, expect } from 'vitest';

describe('V2 Reporter Integration', () => {
  it('should be importable from the correct path', async () => {
    // This is the same import path used in frequency.ts
    const { formatOutputV2 } = await import('../index.js');
    
    expect(formatOutputV2).toBeDefined();
    expect(typeof formatOutputV2).toBe('function');
  });

  it('should export all expected functions', async () => {
    const module = await import('../index.js');
    
    // Main entry point
    expect(module.formatOutputV2).toBeDefined();
    
    // Individual formatters (for testing)
    expect(module.formatHuman).toBeDefined();
    
    // Section formatters (for testing)
    expect(module.summarySection).toBeDefined();
    expect(module.headersSection).toBeDefined();
    expect(module.metaSection).toBeDefined();
    expect(module.scriptsSection).toBeDefined();
    expect(module.biasSection).toBeDefined();
  });

  it('should have proper function signature for formatOutputV2', async () => {
    const v2Reporter = await import('../index.js');
    
    // Should have formatOutputV2 function with expected parameter count
    expect(v2Reporter.formatOutputV2).toBeDefined();
    expect(typeof v2Reporter.formatOutputV2).toBe('function');
    expect(v2Reporter.formatOutputV2.length).toBe(2); // result, options
  });

  it('should work with FrequencyOptions from frequency command', async () => {
    // Create options similar to what frequency command would pass
    const mockOptions = {
      output: 'human' as const,
      minSites: 10,
      includeRecommendations: false
    };

    const mockResult = {
      headers: {
        patterns: new Map([
          ['x-powered-by', {
            pattern: 'x-powered-by',
            siteCount: 5,
            sites: new Set(['site1.com']),
            frequency: 0.5,
            examples: new Set(['Express'])
          }]
        ]),
        totalSites: 10,
        metadata: {
          analyzer: 'headers',
          analyzedAt: '2024-01-01T10:00:00Z',
          totalPatternsFound: 1,
          totalPatternsAfterFiltering: 1,
          options: { minOccurrences: 1, includeExamples: true }
        }
      },
      metaTags: {
        patterns: new Map(),
        totalSites: 0,
        metadata: {
          analyzer: 'metaTags',
          analyzedAt: '2024-01-01T10:00:00Z',
          totalPatternsFound: 0,
          totalPatternsAfterFiltering: 0,
          options: { minOccurrences: 1, includeExamples: true }
        }
      },
      scripts: {
        patterns: new Map(),
        totalSites: 0,
        metadata: {
          analyzer: 'scripts',
          analyzedAt: '2024-01-01T10:00:00Z',
          totalPatternsFound: 0,
          totalPatternsAfterFiltering: 0,
          options: { minOccurrences: 1, includeExamples: true }
        }
      },
      semantic: null as any,
      validation: null as any,
      vendor: null as any,
      discovery: null as any,
      cooccurrence: null as any,
      technologies: null as any,
      correlations: null as any,
      summary: {
        totalSitesAnalyzed: 10,
        totalPatternsFound: 1,
        analysisDate: '2024-01-01T10:00:00Z',
        topPatterns: {
          headers: [],
          metaTags: [],
          scripts: [],
          technologies: []
        }
      }
    };

    const { formatOutputV2 } = await import('../index.js');

    // Should not throw when called with realistic data
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message: string) => {
      consoleOutput += message;
    };

    try {
      await formatOutputV2(mockResult, mockOptions);
      
      // Should generate expected V2 output format
      expect(consoleOutput).toContain('FREQUENCY ANALYSIS RESULTS');
      expect(consoleOutput).toContain('HTTP HEADERS');
      expect(consoleOutput).toContain('X-POWERED-BY');
      
      // Should NOT contain simple reporter format markers
      expect(consoleOutput).not.toContain('HEADER PATTERNS:'); // Simple reporter format
      expect(consoleOutput).not.toContain('Site Count:'); // Simple reporter uses different field names
      
    } finally {
      console.log = originalLog;
    }
  });
});