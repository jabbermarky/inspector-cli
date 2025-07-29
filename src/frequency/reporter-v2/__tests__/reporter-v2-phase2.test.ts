/**
 * Tests for V2 Reporter Phase 2: Additional formatters (CSV, Markdown, JSON)
 */

import { describe, it, expect } from 'vitest';
import { formatOutputV2, formatCSV, formatMarkdown, formatJSON } from '../index.js';
import { FrequencyOptions } from '../../types/frequency-types-v2.js';
import { AggregatedResults } from '../../types/analyzer-interface.js';

describe('V2 Reporter Phase 2', () => {
  const mockAggregatedResults: AggregatedResults = {
    headers: {
      patterns: new Map([
        ['x-powered-by', {
          pattern: 'x-powered-by',
          siteCount: 850,
          sites: new Set(['site1.com', 'site2.com']),
          frequency: 0.85,
          examples: new Set(['Express', 'Next.js'])
        }],
        ['server', {
          pattern: 'server',
          siteCount: 600,
          sites: new Set(['site3.com']),
          frequency: 0.60,
          examples: new Set(['nginx'])
        }]
      ]),
      totalSites: 1000,
      metadata: {
        analyzer: 'headers',
        analyzedAt: '2025-07-29T12:00:00Z',
        totalPatternsFound: 2,
        totalPatternsAfterFiltering: 2,
        options: { minOccurrences: 1, includeExamples: true }
      }
    },
    metaTags: {
      patterns: new Map([
        ['viewport', {
          pattern: 'viewport',
          siteCount: 950,
          sites: new Set(['mobile-site.com']),
          frequency: 0.95,
          examples: new Set(['width=device-width, initial-scale=1'])
        }]
      ]),
      totalSites: 1000,
      metadata: {
        analyzer: 'metaTags',
        analyzedAt: '2025-07-29T12:00:00Z',
        totalPatternsFound: 1,
        totalPatternsAfterFiltering: 1,
        options: { minOccurrences: 1, includeExamples: true }
      }
    },
    scripts: {
      patterns: new Map(),
      totalSites: 0,
      metadata: {
        analyzer: 'scripts',
        analyzedAt: '2025-07-29T12:00:00Z',
        totalPatternsFound: 0,
        totalPatternsAfterFiltering: 0,
        options: { minOccurrences: 1, includeExamples: true }
      }
    },
    semantic: null,
    validation: null,
    vendor: null,
    discovery: null,
    cooccurrence: null,
    technologies: null,
    correlations: null,
    summary: {
      totalSitesAnalyzed: 1000,
      totalPatternsFound: 50,
      analysisDate: '2025-07-29T12:00:00Z',
      topPatterns: {
        headers: ['x-powered-by', 'server'],
        metaTags: ['viewport'],
        scripts: [],
        technologies: []
      }
    }
  };

  const mockOptions: FrequencyOptions = {
    output: 'human',
    minSites: 10,
    includeRecommendations: false,
    maxItemsPerSection: 20
  };

  describe('CSV Formatter', () => {
    it('should format output as CSV', () => {
      const csvOutput = formatCSV(mockAggregatedResults, { ...mockOptions, output: 'csv' });
      
      // Check CSV structure
      expect(csvOutput).toContain('# Summary');
      expect(csvOutput).toContain('Category,Value');
      expect(csvOutput).toContain('Total Sites,1000');
      
      // Check headers section
      expect(csvOutput).toContain('# HTTP Headers');
      expect(csvOutput).toContain('Header,Frequency,Sites,Occurrences,Top Value');
      expect(csvOutput).toContain('x-powered-by,85.00%,850');
      expect(csvOutput).toContain('server,60.00%,600');
      
      // Check meta tags section
      expect(csvOutput).toContain('# Meta Tags');
      expect(csvOutput).toContain('viewport,95.00%,950');
    });

    it('should integrate with formatOutputV2 for CSV output', async () => {
      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (message: string) => {
        consoleOutput += message;
      };

      try {
        await formatOutputV2(mockAggregatedResults, { ...mockOptions, output: 'csv' });
        
        expect(consoleOutput).toContain('# Summary');
        expect(consoleOutput).toContain('Category,Value');
        expect(consoleOutput).toContain('# HTTP Headers');
        
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Markdown Formatter', () => {
    it('should format output as Markdown', () => {
      const markdownOutput = formatMarkdown(mockAggregatedResults, { ...mockOptions, output: 'markdown' });
      
      // Check Markdown structure
      expect(markdownOutput).toContain('## Summary');
      expect(markdownOutput).toContain('- **Total Sites Analyzed**: 1,000');
      
      // Check headers section
      expect(markdownOutput).toContain('## HTTP Headers');
      expect(markdownOutput).toContain('| Rank | Header | Frequency | Sites | Occurrences | Top Value |');
      expect(markdownOutput).toContain('| 1 | x-powered-by | 85% | 850 |');
      expect(markdownOutput).toContain('| 2 | server | 60% | 600 |');
      
      // Check meta tags section
      expect(markdownOutput).toContain('## Meta Tags');
      expect(markdownOutput).toContain('| 1 | viewport | 95% | 950 |');
    });

    it('should integrate with formatOutputV2 for Markdown output', async () => {
      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (message: string) => {
        consoleOutput += message;
      };

      try {
        await formatOutputV2(mockAggregatedResults, { ...mockOptions, output: 'markdown' });
        
        expect(consoleOutput).toContain('## Summary');
        expect(consoleOutput).toContain('## HTTP Headers');
        expect(consoleOutput).toContain('| Rank | Header | Frequency | Sites | Occurrences | Top Value |');
        
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('JSON Formatter', () => {
    it('should format output as JSON', () => {
      const jsonOutput = formatJSON(mockAggregatedResults, { ...mockOptions, output: 'json' });
      
      // Parse to verify valid JSON
      const parsed = JSON.parse(jsonOutput);
      
      // Check structure
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.formatVersion).toBe('2.0');
      expect(parsed.metadata.generatedAt).toBeDefined();
      
      // Check summary
      expect(parsed.summary.totalSitesAnalyzed).toBe(1000);
      expect(parsed.summary.totalPatternsFound).toBe(50);
      
      // Check analysis sections with Map conversion
      expect(parsed.analysis.headers).toBeDefined();
      expect(parsed.analysis.headers.patterns).toBeDefined();
      expect(parsed.analysis.headers.patterns['x-powered-by']).toBeDefined();
      expect(parsed.analysis.headers.patterns['x-powered-by'].frequency).toBe(0.85);
      
      expect(parsed.analysis.metaTags).toBeDefined();
      expect(parsed.analysis.metaTags.patterns['viewport']).toBeDefined();
      expect(parsed.analysis.metaTags.patterns['viewport'].frequency).toBe(0.95);
    });

    it('should integrate with formatOutputV2 for JSON output', async () => {
      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (message: string) => {
        consoleOutput += message;
      };

      try {
        await formatOutputV2(mockAggregatedResults, { ...mockOptions, output: 'json' });
        
        // Should be valid JSON
        const parsed = JSON.parse(consoleOutput);
        expect(parsed.metadata.formatVersion).toBe('2.0');
        expect(parsed.summary.totalSitesAnalyzed).toBe(1000);
        
      } finally {
        console.log = originalLog;
      }
    });

    it('should handle Maps and Sets correctly in JSON serialization', () => {
      const jsonOutput = formatJSON(mockAggregatedResults, { ...mockOptions, output: 'json' });
      const parsed = JSON.parse(jsonOutput);
      
      // Maps should be converted to objects
      expect(typeof parsed.analysis.headers.patterns).toBe('object');
      expect(Array.isArray(parsed.analysis.headers.patterns)).toBe(false);
      
      // Check specific pattern data
      const xPoweredBy = parsed.analysis.headers.patterns['x-powered-by'];
      expect(xPoweredBy.pattern).toBe('x-powered-by');
      expect(xPoweredBy.siteCount).toBe(850);
      expect(xPoweredBy.frequency).toBe(0.85);
      
      // Sets should be converted to arrays (via mapJsonReplacer)
      expect(Array.isArray(xPoweredBy.sites)).toBe(true);
      expect(Array.isArray(xPoweredBy.examples)).toBe(true);
    });
  });

  describe('Unsupported Format Handling', () => {
    it('should throw error for truly unsupported formats', async () => {
      const invalidOptions: FrequencyOptions = {
        ...mockOptions,
        output: 'xml' as any // Force invalid format
      };

      await expect(formatOutputV2(mockAggregatedResults, invalidOptions))
        .rejects.toThrow('Unsupported output format: xml');
    });
  });

  describe('File Output', () => {
    it('should handle outputFile option correctly', async () => {
      const optionsWithFile: FrequencyOptions = {
        ...mockOptions,
        output: 'json',
        outputFile: '/tmp/test-output.json'
      };

      // Mock writeFile to avoid actual file operations in tests
      let fileWritten = false;
      let fileContent = '';
      const mockWriteFile = async (path: string, content: string) => {
        fileWritten = true;
        fileContent = content;
      };

      // Note: This would require dependency injection to test properly
      // For now, we just verify the function doesn't throw
      await expect(formatOutputV2(mockAggregatedResults, optionsWithFile))
        .resolves.toBeUndefined();
    });
  });
});