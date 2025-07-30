/**
 * Phase 1 Tests: Data Quality & Filtering Report
 * 
 * Tests the formatFilteringReport function and its integration
 * with all output formats (human, markdown, csv).
 */

import { describe, it, expect } from 'vitest';
import type { FrequencyResult } from '../types/frequency-types-v2.js';

// Import the functions we need to test
// Note: These are internal functions, so we'll test them through the public API
import { formatOutputV2 as formatOutput } from '../reporter-v2/index.js';

/**
 * Create mock FrequencyResult with filtering data for testing
 */
function createMockFrequencyResultWithFiltering(): FrequencyResult {
    return {
        metadata: {
            totalSites: 4569,
            validSites: 4413,
            filteredSites: 156,
            analysisDate: '2024-01-15T10:30:00Z',
            options: {
                minSites: 100,
                minOccurrences: 5,
                output: 'human'
            }
        },
        summary: {
            totalSitesAnalyzed: 4413,
            totalPatternsFound: 245,
            analysisDate: '2024-01-15T10:30:00Z',
            filteringStats: {
                sitesBeforeFiltering: 4569,
                sitesAfterFiltering: 4413,
                sitesFiltered: 156,
                reasonsForFiltering: {
                    'Invalid URLs': 23,
                    'Network errors': 45,
                    'Empty responses': 88,
                    'Parse failures': 0, // Should be filtered out (zero count)
                    'Rate limiting': 0   // Should be filtered out (zero count)
                }
            }
        },
        headers: {
            'server': {
                frequency: 0.89,
                occurrences: 3928,
                totalSites: 4413,
                values: [
                    {
                        value: 'nginx/1.18.0',
                        frequency: 0.23,
                        occurrences: 1015,
                        examples: ['https://example1.com', 'https://example2.com']
                    }
                ]
            }
        },
        metaTags: {},
        scripts: {},
        biasAnalysis: undefined
    };
}

/**
 * Create mock FrequencyResult without filtering data
 */
function createMockFrequencyResultWithoutFiltering(): FrequencyResult {
    return {
        metadata: {
            totalSites: 4569,
            validSites: 4569,
            filteredSites: 0,
            analysisDate: '2024-01-15T10:30:00Z',
            options: {
                minSites: 100,
                output: 'human'
            }
        },
        summary: {
            totalSitesAnalyzed: 4569,
            totalPatternsFound: 245,
            analysisDate: '2024-01-15T10:30:00Z'
            // No filteringStats property - should result in no filtering section
        },
        headers: {},
        metaTags: {},
        scripts: {},
        biasAnalysis: undefined
    };
}

describe('Phase 1: Data Quality & Filtering Report', () => {
    describe('Human Format Output', () => {
        it('should include comprehensive filtering report when filtering occurred', async () => {
            const result = createMockFrequencyResultWithFiltering();
            
            // Capture output instead of writing to file
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutput(result, { output: 'human' });
                
                // Verify filtering section is present
                expect(capturedOutput).toContain('DATA QUALITY FILTERING:');
                expect(capturedOutput).toContain('Sites filtered out: 156');
                expect(capturedOutput).toContain('Sites before filtering: 4,569');
                expect(capturedOutput).toContain('Sites after filtering: 4,413');
                expect(capturedOutput).toContain('Filter Reasons:');
                
                // Verify reasons are sorted by count (highest first)
                expect(capturedOutput).toContain('Empty responses: 88 sites');
                expect(capturedOutput).toContain('Network errors: 45 sites');
                expect(capturedOutput).toContain('Invalid URLs: 23 sites');
                
                // Verify zero-count reasons are not shown
                expect(capturedOutput).not.toContain('Parse failures');
                expect(capturedOutput).not.toContain('Rate limiting');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should not include filtering section when no filtering occurred', async () => {
            const result = createMockFrequencyResultWithoutFiltering();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutput(result, { output: 'human' });
                
                // Verify filtering section is not present
                expect(capturedOutput).not.toContain('DATA QUALITY FILTERING:');
                expect(capturedOutput).not.toContain('Sites filtered out');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('Markdown Format Output', () => {
        it('should include markdown filtering report with table formatting', async () => {
            const result = createMockFrequencyResultWithFiltering();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutput(result, { output: 'markdown' });
                
                // Verify markdown formatting
                expect(capturedOutput).toContain('## Data Quality Filtering');
                expect(capturedOutput).toContain('**Sites filtered out**: 156');
                expect(capturedOutput).toContain('**Sites before filtering**: 4,569');
                expect(capturedOutput).toContain('**Sites after filtering**: 4,413');
                
                // Verify markdown table structure
                expect(capturedOutput).toContain('### Filter Reasons');
                expect(capturedOutput).toContain('| Reason | Sites Filtered |');
                expect(capturedOutput).toContain('|--------|----------------|');
                expect(capturedOutput).toContain('| Empty responses | 88 |');
                expect(capturedOutput).toContain('| Network errors | 45 |');
                expect(capturedOutput).toContain('| Invalid URLs | 23 |');
                
                // Verify zero-count reasons are not shown
                expect(capturedOutput).not.toContain('| Parse failures |');
                expect(capturedOutput).not.toContain('| Rate limiting |');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('CSV Format Output', () => {
        it('should include CSV filtering statistics with proper escaping', async () => {
            const result = createMockFrequencyResultWithFiltering();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutput(result, { output: 'csv' });
                
                // Verify CSV structure
                expect(capturedOutput).toContain('# Data Quality Filtering Statistics');
                expect(capturedOutput).toContain('FilteringStatistic,Value,TotalSites');
                expect(capturedOutput).toContain('SitesFiltered,156,TotalAfterFiltering');
                expect(capturedOutput).toContain('SitesBeforeFiltering,4569,TotalBeforeFiltering');
                expect(capturedOutput).toContain('SitesAfterFiltering,4413,TotalAfterFiltering');
                
                // Verify filter reasons CSV section
                expect(capturedOutput).toContain('Empty responses,88,FilterReason');
                expect(capturedOutput).toContain('Network errors,45,FilterReason');
                expect(capturedOutput).toContain('Invalid URLs,23,FilterReason');
                
                // Verify zero-count reasons are not shown
                expect(capturedOutput).not.toContain('Parse failures');
                expect(capturedOutput).not.toContain('Rate limiting');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('Edge Cases', () => {
        it('should handle filtering data with special characters in reasons', async () => {
            const result = createMockFrequencyResultWithFiltering();
            // Add a reason with special characters that need CSV escaping
            result.summary.filteringStats!.reasonsForFiltering = {
                ...result.summary.filteringStats!.reasonsForFiltering,
                'SSL "certificate" errors': 12,
                'Timeout (>30s)': 8
            };
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutput(result, { output: 'csv' });
                
                // Verify proper CSV escaping of special characters
                expect(capturedOutput).toContain('"SSL ""certificate"" errors",12,FilterReason');
                expect(capturedOutput).toContain('Timeout (>30s),8,FilterReason');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should handle empty filtering reasons gracefully', async () => {
            const result = createMockFrequencyResultWithFiltering();
            result.summary.filteringStats!.reasonsForFiltering = {};
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutput(result, { output: 'human' });
                
                // Should still show basic filtering stats but no reasons
                expect(capturedOutput).toContain('DATA QUALITY FILTERING:');
                expect(capturedOutput).toContain('Sites filtered out: 156');
                // Filter Reasons section should not appear when there are no reasons
                expect(capturedOutput).not.toContain('Filter Reasons:');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should handle zero sites filtered gracefully', async () => {
            const result = createMockFrequencyResultWithFiltering();
            result.summary.filteringStats!.sitesFiltered = 0;
            result.summary.filteringStats!.reasonsForFiltering = {};
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutput(result, { output: 'human' });
                
                // Should not show filtering section when no sites were filtered
                expect(capturedOutput).not.toContain('DATA QUALITY FILTERING:');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('Sorting and Display Logic', () => {
        it('should sort filtering reasons by count in descending order', async () => {
            const result = createMockFrequencyResultWithFiltering();
            result.summary.filteringStats!.reasonsForFiltering = {
                'Low count reason': 5,
                'High count reason': 95,  
                'Medium count reason': 30,
                'Zero count reason': 0
            };
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutput(result, { output: 'human' });
                
                // Find positions of each reason in the output
                const highPos = capturedOutput.indexOf('High count reason: 95');
                const mediumPos = capturedOutput.indexOf('Medium count reason: 30');
                const lowPos = capturedOutput.indexOf('Low count reason: 5');
                const zeroPos = capturedOutput.indexOf('Zero count reason');
                
                // Verify sorting order (high > medium > low)
                expect(highPos).toBeGreaterThan(-1);
                expect(mediumPos).toBeGreaterThan(-1);
                expect(lowPos).toBeGreaterThan(-1);
                expect(zeroPos).toBe(-1); // Should not appear
                
                expect(highPos).toBeLessThan(mediumPos);
                expect(mediumPos).toBeLessThan(lowPos);
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });
});