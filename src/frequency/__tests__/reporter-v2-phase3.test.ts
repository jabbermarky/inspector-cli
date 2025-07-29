/**
 * Phase 3 Tests: Meta Tags Analysis
 * 
 * Tests the formatMetaTagsSection function and its integration
 * with all output formats (human, markdown, csv).
 */

import { describe, it, expect } from 'vitest';
import type { FrequencyResult } from '../types/frequency-types-v2.js';

// Import the functions we need to test
import { formatOutputV2 } from '../simple-reporter-v2.js';

/**
 * Create mock FrequencyResult with comprehensive meta tag data for testing
 */
function createMockFrequencyResultWithMetaTags(): FrequencyResult {
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
            totalPatternsFound: 4,
            analysisDate: '2024-01-15T10:30:00Z'
        },
        headers: {},
        metaTags: {
            'viewport': {
                frequency: 0.87,
                occurrences: 3978,
                totalSites: 4569,
                values: [
                    {
                        value: 'width=device-width, initial-scale=1',
                        frequency: 0.76,
                        occurrences: 3024,
                        examples: ['https://example1.com', 'https://example2.com']
                    },
                    {
                        value: 'width=device-width',
                        frequency: 0.08,
                        occurrences: 312,
                        examples: ['https://example3.com']
                    },
                    {
                        value: 'width=device-width, initial-scale=1.0',
                        frequency: 0.03,
                        occurrences: 123,
                        examples: ['https://example4.com']
                    }
                ]
            },
            'description': {
                frequency: 0.72,
                occurrences: 3289,
                totalSites: 4569,
                values: [
                    {
                        value: 'A comprehensive website for all your needs',
                        frequency: 0.12,
                        occurrences: 548,
                        examples: ['https://example5.com']
                    },
                    {
                        value: 'Welcome to our amazing site',
                        frequency: 0.08,
                        occurrences: 365,
                        examples: ['https://example6.com']
                    }
                ]
            },
            'charset': {
                frequency: 0.45,
                occurrences: 2056,
                totalSites: 4569,
                values: [
                    {
                        value: 'UTF-8',
                        frequency: 0.44,
                        occurrences: 2010,
                        examples: ['https://example7.com']
                    },
                    {
                        value: 'utf-8',
                        frequency: 0.01,
                        occurrences: 46,
                        examples: ['https://example8.com']
                    }
                ]
            },
            'robots': {
                frequency: 0.23,
                occurrences: 1051,
                totalSites: 4569,
                values: [
                    {
                        value: 'index, follow',
                        frequency: 0.15,
                        occurrences: 685,
                        examples: ['https://example9.com']
                    },
                    {
                        value: 'noindex, nofollow',
                        frequency: 0.05,
                        occurrences: 228,
                        examples: ['https://example10.com']
                    },
                    {
                        value: 'index, nofollow',
                        frequency: 0.03,
                        occurrences: 138,
                        examples: ['https://example11.com']
                    }
                ]
            }
        },
        scripts: {},
        biasAnalysis: undefined
    };
}

/**
 * Create mock FrequencyResult without meta tags
 */
function createMockFrequencyResultWithoutMetaTags(): FrequencyResult {
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
        headers: {},
        metaTags: {}, // Empty meta tags
        scripts: {},
        biasAnalysis: undefined
    };
}

describe('Phase 3: Meta Tags Analysis', () => {
    describe('Human Format Output', () => {
        it('should include comprehensive meta tag analysis with all V1 features', async () => {
            const result = createMockFrequencyResultWithMetaTags();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Verify meta tags section is present with count
                expect(capturedOutput).toContain('META TAGS (4 patterns):');
                
                // Verify meta tags are sorted by frequency (viewport 87% first)
                expect(capturedOutput).toContain('### viewport');
                expect(capturedOutput).toContain('- Frequency: 87% (3978/4569 sites)');
                expect(capturedOutput).toContain('- Unique Values: 3');
                expect(capturedOutput).toContain('Top Values:');
                
                // Verify top 5 values for viewport
                expect(capturedOutput).toContain('- `width=device-width, initial-scale=1`: 76% (3024 sites)');
                expect(capturedOutput).toContain('- `width=device-width`: 8% (312 sites)');
                expect(capturedOutput).toContain('- `width=device-width, initial-scale=1.0`: 3% (123 sites)');
                
                // Verify second meta tag (description)
                expect(capturedOutput).toContain('### description');
                expect(capturedOutput).toContain('- Frequency: 72% (3289/4569 sites)');
                expect(capturedOutput).toContain('- `A comprehensive website for all your needs`: 12% (548 sites)');
                
                // Verify third meta tag (charset)
                expect(capturedOutput).toContain('### charset');
                expect(capturedOutput).toContain('- `UTF-8`: 44% (2010 sites)');
                
                // Verify fourth meta tag (robots)
                expect(capturedOutput).toContain('### robots');
                expect(capturedOutput).toContain('- `index, follow`: 15% (685 sites)');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should handle meta tags without values', async () => {
            const result = createMockFrequencyResultWithMetaTags();
            // Add a meta tag with no values
            result.metaTags['empty-tag'] = {
                frequency: 0.05,
                occurrences: 228,
                totalSites: 4569,
                values: [] // Empty values array
            };
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Should show "No values available" for empty tag
                expect(capturedOutput).toContain('### empty-tag');
                expect(capturedOutput).toContain('- Unique Values: 0');
                expect(capturedOutput).toContain('- No values available');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should show top 15 meta tags only', async () => {
            const result = createMockFrequencyResultWithMetaTags();
            
            // Add many meta tags to test the limit
            for (let i = 5; i <= 20; i++) {
                result.metaTags[`meta-tag-${i}`] = {
                    frequency: 0.01 * (21 - i), // Decreasing frequency
                    occurrences: 45,
                    totalSites: 4569,
                    values: [
                        {
                            value: `value-${i}`,
                            frequency: 0.005,
                            occurrences: 23,
                            examples: [`https://example${i}.com`]
                        }
                    ]
                };
            }
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Should show meta-tag-15 (within top 15)
                expect(capturedOutput).toContain('### meta-tag-15');
                
                // Should NOT show meta-tag-16 and beyond (beyond top 15)
                expect(capturedOutput).not.toContain('### meta-tag-16');
                expect(capturedOutput).not.toContain('### meta-tag-20');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should not include meta tags section when no meta tags exist', async () => {
            const result = createMockFrequencyResultWithoutMetaTags();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Should not show meta tags section
                expect(capturedOutput).not.toContain('META TAGS');
                expect(capturedOutput).not.toContain('### viewport');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('Markdown Format Output', () => {
        it('should include comprehensive markdown table with all columns', async () => {
            const result = createMockFrequencyResultWithMetaTags();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'markdown' });
                
                // Verify markdown header section
                expect(capturedOutput).toContain('## Meta Tags (4 patterns)');
                expect(capturedOutput).toContain('*Each meta tag type may have multiple values. Table shows frequency of each type across all sites.*');
                
                // Verify table structure
                expect(capturedOutput).toContain('| Meta Tag | Frequency | Sites Using | Unique Values | Top Value | Top Value Usage |');
                expect(capturedOutput).toContain('|----------|-----------|-------------|---------------|-----------|-----------------|');
                
                // Verify first row (viewport - highest frequency)
                expect(capturedOutput).toContain('| `viewport` | 87.0% | 3978/4569 | 3 | `width=device-width, initial-scale=1` | 76% |');
                
                // Verify second row (description)
                expect(capturedOutput).toContain('| `description` | 72.0% | 3289/4569 | 2 | `A comprehensive website for all your needs` | 12% |');
                
                // Verify third row (charset)
                expect(capturedOutput).toContain('| `charset` | 45.0% | 2056/4569 | 2 | `UTF-8` | 44% |');
                
                // Verify fourth row (robots)
                expect(capturedOutput).toContain('| `robots` | 23.0% | 1051/4569 | 3 | `index, follow` | 15% |');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should properly escape markdown table cell content', async () => {
            const result = createMockFrequencyResultWithMetaTags();
            // Add a meta tag with special characters that need escaping
            result.metaTags['special-tag'] = {
                frequency: 0.01,
                occurrences: 45,
                totalSites: 4569,
                values: [
                    {
                        value: 'value|with|pipes|and|newlines\ntest',
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
                
                // Verify pipe characters are escaped and newlines removed
                expect(capturedOutput).toContain('`value\\|with\\|pipes\\|and\\|newlines test`');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('CSV Format Output', () => {
        it('should include comprehensive CSV with all meta tag data columns', async () => {
            const result = createMockFrequencyResultWithMetaTags();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'csv' });
                
                // Verify CSV structure
                expect(capturedOutput).toContain('# Meta Tags Analysis');
                expect(capturedOutput).toContain('MetaTag,Frequency,Occurrences,TotalSites,UniqueValues,TopValue,TopValueUsage');
                
                // Verify first row (viewport)
                expect(capturedOutput).toContain('"viewport",0.870000,3978,4569,3,"width=device-width, initial-scale=1",76.000');
                
                // Verify second row (description)
                expect(capturedOutput).toContain('"description",0.720000,3289,4569,2,"A comprehensive website for all your needs",12.000');
                
                // Verify third row (charset)
                expect(capturedOutput).toContain('"charset",0.450000,2056,4569,2,"UTF-8",44.000');
                
                // Verify fourth row (robots)
                expect(capturedOutput).toContain('"robots",0.230000,1051,4569,3,"index, follow",15.000');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should properly escape CSV special characters', async () => {
            const result = createMockFrequencyResultWithMetaTags();
            // Add meta tag with CSV special characters
            result.metaTags['csv-test'] = {
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
                expect(capturedOutput).toContain('"csv-test"'); // Tag name escaped
                expect(capturedOutput).toContain('"value,with,""quotes"",and,commas"'); // Value properly escaped
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('Sorting Logic', () => {
        it('should sort meta tags by frequency in descending order', async () => {
            const result = createMockFrequencyResultWithMetaTags();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'markdown' });
                
                // Find positions of each meta tag in the output to verify order
                const viewportPos = capturedOutput.indexOf('| `viewport` | 87.0%');
                const descriptionPos = capturedOutput.indexOf('| `description` | 72.0%');
                const charsetPos = capturedOutput.indexOf('| `charset` | 45.0%');
                const robotsPos = capturedOutput.indexOf('| `robots` | 23.0%');
                
                // Verify all are found
                expect(viewportPos).toBeGreaterThan(-1);
                expect(descriptionPos).toBeGreaterThan(-1);
                expect(charsetPos).toBeGreaterThan(-1);
                expect(robotsPos).toBeGreaterThan(-1);
                
                // Verify order (viewport 87% > description 72% > charset 45% > robots 23%)
                expect(viewportPos).toBeLessThan(descriptionPos);
                expect(descriptionPos).toBeLessThan(charsetPos);
                expect(charsetPos).toBeLessThan(robotsPos);
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('Top Values Display', () => {
        it('should show top 5 values for each meta tag', async () => {
            const result = createMockFrequencyResultWithMetaTags();
            // Add a meta tag with many values to test the limit
            result.metaTags['many-values'] = {
                frequency: 0.30,
                occurrences: 1371,
                totalSites: 4569,
                values: [
                    { value: 'value1', frequency: 0.10, occurrences: 457, examples: ['test1.com'] },
                    { value: 'value2', frequency: 0.08, occurrences: 365, examples: ['test2.com'] },
                    { value: 'value3', frequency: 0.06, occurrences: 274, examples: ['test3.com'] },
                    { value: 'value4', frequency: 0.04, occurrences: 183, examples: ['test4.com'] },
                    { value: 'value5', frequency: 0.02, occurrences: 91, examples: ['test5.com'] },
                    { value: 'value6', frequency: 0.01, occurrences: 46, examples: ['test6.com'] }, // Should not appear
                    { value: 'value7', frequency: 0.005, occurrences: 23, examples: ['test7.com'] } // Should not appear
                ]
            };
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Should show top 5 values
                expect(capturedOutput).toContain('- `value1`: 10% (457 sites)');
                expect(capturedOutput).toContain('- `value2`: 8% (365 sites)');
                expect(capturedOutput).toContain('- `value3`: 6% (274 sites)');
                expect(capturedOutput).toContain('- `value4`: 4% (183 sites)');
                expect(capturedOutput).toContain('- `value5`: 2% (91 sites)');
                
                // Should NOT show values beyond top 5
                expect(capturedOutput).not.toContain('- `value6`');
                expect(capturedOutput).not.toContain('- `value7`');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('Edge Cases', () => {
        it('should handle meta tags with undefined values gracefully', async () => {
            const result = createMockFrequencyResultWithMetaTags();
            // Add meta tag with undefined values
            result.metaTags['undefined-values'] = {
                frequency: 0.05,
                occurrences: 228,
                totalSites: 4569,
                values: undefined as any
            };
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Should handle undefined values gracefully
                expect(capturedOutput).toContain('### undefined-values');
                expect(capturedOutput).toContain('- Unique Values: 0');
                expect(capturedOutput).toContain('- No values available');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });
});