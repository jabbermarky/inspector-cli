/**
 * Phase 2 Tests: Enhanced Header Analysis
 * 
 * Tests the formatHeadersSection function and its integration
 * with all output formats (human, markdown, csv).
 */

import { describe, it, expect } from 'vitest';
import type { FrequencyResult } from '../types/frequency-types-v2.js';

// Import the functions we need to test
import { formatOutputV2 } from '../simple-reporter-v2.js';

/**
 * Create mock FrequencyResult with comprehensive header data for testing
 */
function createMockFrequencyResultWithHeaders(): FrequencyResult {
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
        },
        headers: {
            'server:nginx/1.18.0': {
                frequency: 0.89,
                occurrences: 4067,
                totalSites: 4569,
                values: [
                    {
                        value: 'nginx/1.18.0',
                        frequency: 0.234, // 23.4% -> should round to 23%
                        occurrences: 1015,
                        examples: ['https://example1.com', 'https://example2.com']
                    },
                    {
                        value: 'nginx/1.16.1',
                        frequency: 0.156,
                        occurrences: 678,
                        examples: ['https://example3.com']
                    }
                ],
                pageDistribution: {
                    mainpage: 0.95,
                    robots: 0.05
                }
            },
            'content-type:text/html': {
                frequency: 0.72,
                occurrences: 3289,
                totalSites: 4569,
                values: [
                    {
                        value: 'text/html; charset=UTF-8',
                        frequency: 0.0089, // 0.89% -> should show as 0.9%
                        occurrences: 41,
                        examples: ['https://example4.com']
                    }
                ],
                pageDistribution: {
                    mainpage: 0.88,
                    robots: 0.12
                }
            },
            'x-custom-header:special': {
                frequency: 0.02,
                occurrences: 91,
                totalSites: 4569,
                values: [
                    {
                        value: 'special-value "with quotes"',
                        frequency: 0.0005, // 0.05% -> should show as <0.1%
                        occurrences: 2,
                        examples: ['https://example5.com']
                    }
                ]
                // No pageDistribution - should show N/A
            }
        },
        metaTags: {},
        scripts: {},
        biasAnalysis: undefined
    };
}

/**
 * Create mock FrequencyResult without headers
 */
function createMockFrequencyResultWithoutHeaders(): FrequencyResult {
    return {
        metadata: {
            totalSites: 4569,
            validSites: 4569,
            filteredSites: 0,
            analysisDate: '2024-01-15T10:30:00Z',
            options: {
                output: 'human'
            }
        },
        summary: {
            totalSitesAnalyzed: 4569,
            totalPatternsFound: 0,
            analysisDate: '2024-01-15T10:30:00Z'
        },
        headers: {}, // Empty headers
        metaTags: {},
        scripts: {},
        biasAnalysis: undefined
    };
}

describe('Phase 2: Enhanced Header Analysis', () => {
    describe('Human Format Output', () => {
        it('should include comprehensive header analysis with all V1 features', async () => {
            const result = createMockFrequencyResultWithHeaders();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Verify header section is present with count
                expect(capturedOutput).toContain('HTTP HEADERS (3 patterns):');
                
                // Verify headers are sorted by frequency (server 89% first)
                expect(capturedOutput).toContain('### server');
                expect(capturedOutput).toContain('- Frequency: 89.0% (4067/4569 sites)');
                expect(capturedOutput).toContain('- Unique Values: 2');
                
                // Verify top value with proper percentage precision (23.4% -> 23%)
                expect(capturedOutput).toContain('- Top Value: `nginx/1.18.0` (23%)');
                
                // Verify page distribution
                expect(capturedOutput).toContain('- Page Distribution: 95% main, 5% robots');
                
                // Verify second header (content-type)
                expect(capturedOutput).toContain('### content-type');
                expect(capturedOutput).toContain('- Frequency: 72.0% (3289/4569 sites)');
                expect(capturedOutput).toContain('- Top Value: `text/html; charset=UTF-8` (0.9%)'); // 0.89% -> 0.9%
                
                // Verify third header with special handling
                expect(capturedOutput).toContain('### x-custom-header');
                expect(capturedOutput).toContain('- Top Value: `special-value "with quotes"` (<0.1%)'); // 0.05% -> <0.1%
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should handle headers without page distribution', async () => {
            const result = createMockFrequencyResultWithHeaders();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // x-custom-header has no pageDistribution, so should not show page distribution line
                const headerSection = capturedOutput.split('### x-custom-header')[1];
                expect(headerSection).not.toContain('Page Distribution:');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should not include header section when no headers exist', async () => {
            const result = createMockFrequencyResultWithoutHeaders();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Should not show headers section
                expect(capturedOutput).not.toContain('HTTP HEADERS');
                expect(capturedOutput).not.toContain('###');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('Markdown Format Output', () => {
        it('should include comprehensive markdown table with all columns', async () => {
            const result = createMockFrequencyResultWithHeaders();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'markdown' });
                
                // Verify markdown header section
                expect(capturedOutput).toContain('## HTTP Headers (3 patterns)');
                
                // Verify table structure
                expect(capturedOutput).toContain('| Header | Frequency | Sites Using | Unique Values | Top Value | Top Value Usage | Page Distribution |');
                expect(capturedOutput).toContain('|--------|-----------|-------------|---------------|-----------|-----------------|-------------------|');
                
                // Verify first row (server - highest frequency)
                expect(capturedOutput).toContain('| `server` | 89.0% | 4067/4569 | 2 | `nginx/1.18.0` | 23% | 95% main, 5% robots |');
                
                // Verify second row (content-type)
                expect(capturedOutput).toContain('| `content-type` | 72.0% | 3289/4569 | 1 | `text/html; charset=UTF-8` | 0.9% | 88% main, 12% robots |');
                
                // Verify third row with special characters and N/A page distribution
                expect(capturedOutput).toContain('| `x-custom-header` | 2.0% | 91/4569 | 1 | `special-value "with quotes"` | <0.1% | N/A |');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should properly escape markdown table cell content', async () => {
            const result = createMockFrequencyResultWithHeaders();
            // Add a header with pipe characters that need escaping
            result.headers['test-header:pipe|test'] = {
                frequency: 0.01,
                occurrences: 45,
                totalSites: 4569,
                values: [
                    {
                        value: 'value|with|pipes',
                        frequency: 0.005,
                        occurrences: 23,
                        examples: ['https://test.com']
                    }
                ]
            };
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'markdown' });
                
                // Verify pipe characters are escaped in table cells
                expect(capturedOutput).toContain('`value\\|with\\|pipes`');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('CSV Format Output', () => {
        it('should include comprehensive CSV with all header data columns', async () => {
            const result = createMockFrequencyResultWithHeaders();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'csv' });
                
                // Verify CSV structure
                expect(capturedOutput).toContain('# HTTP Headers Analysis');
                expect(capturedOutput).toContain('Header,Frequency,Occurrences,TotalSites,UniqueValues,TopValue,TopValueUsage,MainPagePercent,RobotsPercent');
                
                // Verify first row (server)
                expect(capturedOutput).toContain('"server",0.890000,4067,4569,2,"nginx/1.18.0",23.400,95.0,5.0');
                
                // Verify second row (content-type)  
                expect(capturedOutput).toContain('"content-type",0.720000,3289,4569,1,"text/html; charset=UTF-8",0.890,88.0,12.0');
                
                // Verify third row with special characters and empty page distribution
                expect(capturedOutput).toContain('"x-custom-header",0.020000,91,4569,1,"special-value ""with quotes""",0.050,,');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should properly escape CSV special characters', async () => {
            const result = createMockFrequencyResultWithHeaders();
            // Add header with CSV special characters
            result.headers['test-header:csv,"test"'] = {
                frequency: 0.01,
                occurrences: 45,
                totalSites: 4569,
                values: [
                    {
                        value: 'value,with,"quotes",and,commas',
                        frequency: 0.005,
                        occurrences: 23,
                        examples: ['https://test.com']
                    }
                ]
            };
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'csv' });
                
                // Verify CSV escaping of quotes and commas
                expect(capturedOutput).toContain('"test-header"'); // Header name escaped
                expect(capturedOutput).toContain('"value,with,""quotes"",and,commas"'); // Value properly escaped
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('Top Value Percentage Precision', () => {
        it('should handle different percentage ranges correctly', async () => {
            const result = createMockFrequencyResultWithHeaders();
            
            // Create headers with different percentage ranges
            result.headers = {
                'high-percent': {
                    frequency: 0.5,
                    occurrences: 2284,
                    totalSites: 4569,
                    values: [
                        {
                            value: 'high-value',
                            frequency: 0.456, // 45.6% -> should be 46%
                            occurrences: 2000,
                            examples: ['test.com']
                        }
                    ]
                },
                'medium-percent': {
                    frequency: 0.3,
                    occurrences: 1371,
                    totalSites: 4569,
                    values: [
                        {
                            value: 'medium-value',
                            frequency: 0.0067, // 0.67% -> should be 0.7%
                            occurrences: 30,
                            examples: ['test.com']
                        }
                    ]
                },
                'low-percent': {
                    frequency: 0.1,
                    occurrences: 457,
                    totalSites: 4569,
                    values: [
                        {
                            value: 'low-value',
                            frequency: 0.00045, // 0.045% -> should be <0.1%
                            occurrences: 2,
                            examples: ['test.com']
                        }
                    ]
                },
                'zero-percent': {
                    frequency: 0.05,
                    occurrences: 228,
                    totalSites: 4569,
                    values: [
                        {
                            value: 'zero-value',
                            frequency: 0, // 0% -> should be 0%
                            occurrences: 0,
                            examples: []
                        }
                    ]
                }
            };
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Verify percentage precision handling
                expect(capturedOutput).toContain('`high-value` (46%)'); // >=1% -> round to integer
                expect(capturedOutput).toContain('`medium-value` (0.7%)'); // 0.1%-1% -> one decimal  
                expect(capturedOutput).toContain('`low-value` (<0.1%)'); // <0.1% but >0 -> <0.1%
                expect(capturedOutput).toContain('`zero-value` (0%)'); // 0% -> 0%
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('Header Name Extraction', () => {
        it('should extract header name before colon for display', async () => {
            const result = createMockFrequencyResultWithHeaders();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Verify header names are extracted (before colon)
                expect(capturedOutput).toContain('### server'); // from 'server:nginx/1.18.0'
                expect(capturedOutput).toContain('### content-type'); // from 'content-type:text/html'
                expect(capturedOutput).toContain('### x-custom-header'); // from 'x-custom-header:special'
                
                // Should not show the full pattern with value
                expect(capturedOutput).not.toContain('### server:nginx/1.18.0');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('Sorting Logic', () => {
        it('should sort headers by frequency in descending order', async () => {
            const result = createMockFrequencyResultWithHeaders();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'markdown' });
                
                // Find positions of each header in the output to verify order
                const serverPos = capturedOutput.indexOf('| `server` | 89.0%');
                const contentTypePos = capturedOutput.indexOf('| `content-type` | 72.0%');
                const customHeaderPos = capturedOutput.indexOf('| `x-custom-header` | 2.0%');
                
                // Verify all are found
                expect(serverPos).toBeGreaterThan(-1);
                expect(contentTypePos).toBeGreaterThan(-1);
                expect(customHeaderPos).toBeGreaterThan(-1);
                
                // Verify order (server 89% > content-type 72% > x-custom-header 2%)
                expect(serverPos).toBeLessThan(contentTypePos);
                expect(contentTypePos).toBeLessThan(customHeaderPos);
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });
});