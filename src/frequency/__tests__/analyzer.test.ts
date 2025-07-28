import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { analyzeFrequencyV2 } from '../analyzer-v2.js';
import type { FrequencyOptionsWithDefaults } from '../types-v1.js';
import { setupCommandTests } from '@test-utils';

// Mock all dependencies
vi.mock('../collector.js');
vi.mock('../header-analyzer.js');
vi.mock('../meta-analyzer.js');
vi.mock('../script-analyzer.js');
vi.mock('../recommender.js');
vi.mock('../reporter.js');
vi.mock('../../utils/logger.js', () => ({
    createModuleLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    })),
}));

describe('Frequency Analyzer', () => {
    setupCommandTests();

    let mockCollectData: any;
    let mockAnalyzeHeaders: any;
    let mockAnalyzeMetaTags: any;
    let mockAnalyzeScripts: any;
    let mockGenerateRecommendations: any;
    let mockFormatOutput: any;

    beforeEach(async () => {
        // Import mocked functions
        const collector = await import('../collector.js');
        const headerAnalyzer = await import('../header-analyzer-v1.js');
        const metaAnalyzer = await import('../meta-analyzer-v1.js');
        const scriptAnalyzer = await import('../script-analyzer-v1.js');
        const recommender = await import('../recommender.js');
        const reporter = await import('../reporter.js');

        mockCollectData = vi.mocked(collector.collectData);
        mockAnalyzeHeaders = vi.mocked(headerAnalyzer.analyzeHeaders);
        mockAnalyzeMetaTags = vi.mocked(metaAnalyzer.analyzeMetaTags);
        mockAnalyzeScripts = vi.mocked(scriptAnalyzer.analyzeScripts);
        mockGenerateRecommendations = vi.mocked(recommender.generateRecommendations);
        mockFormatOutput = vi.mocked(reporter.formatOutput);

        // Setup default mock returns
        mockCollectData.mockResolvedValue({
            dataPoints: [
                {
                    url: 'https://site1.com',
                    headers: { server: 'Apache' },
                    metaTags: [{ name: 'generator', content: 'WordPress' }],
                    scripts: [{ src: '/wp-content/script.js' }],
                },
            ],
            filteringReport: {
                sitesFilteredOut: 0,
                filterReasons: {},
            },
        });

        mockAnalyzeHeaders.mockResolvedValue(
            new Map([
                [
                    'server',
                    [
                        {
                            pattern: 'server:Apache',
                            frequency: 1.0,
                            occurrences: 1,
                            examples: ['Apache'],
                        },
                    ],
                ],
            ])
        );

        mockAnalyzeMetaTags.mockResolvedValue(
            new Map([
                [
                    'name:generator',
                    [
                        {
                            pattern: 'generator:WordPress',
                            frequency: 1.0,
                            occurrences: 1,
                            examples: ['WordPress'],
                        },
                    ],
                ],
            ])
        );

        mockAnalyzeScripts.mockResolvedValue(
            new Map([
                [
                    'paths',
                    [
                        {
                            pattern: 'path:wp-content',
                            frequency: 1.0,
                            occurrences: 1,
                            examples: ['/wp-content/script.js'],
                        },
                    ],
                ],
            ])
        );

        mockGenerateRecommendations.mockResolvedValue({
            learn: {
                currentlyFiltered: ['server'],
                recommendToFilter: [],
                recommendToKeep: [],
            },
            detectCms: {
                newPatternOpportunities: [],
                patternsToRefine: [],
            },
            groundTruth: {
                potentialNewRules: [],
            },
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Full Analysis Pipeline', () => {
        it('should orchestrate complete frequency analysis', async () => {
            const options: FrequencyOptionsWithDefaults = {
                dataSource: 'cms-analysis',
                dataDir: './data/cms-analysis',
                minSites: 1,
                minOccurrences: 1,
                pageType: 'all',
                output: 'human',
                outputFile: '',
                includeRecommendations: true,
                includeCurrentFilters: true,
                debugCalculations: false,
                enableValidation: true,
                skipStatisticalTests: false,
                validationStopOnError: false,
                validationDebugMode: false,
            };

            const result = await analyzeFrequencyV2(options);

            // Verify all components were called with new validation options
            expect(mockCollectData).toHaveBeenCalledWith(
                expect.objectContaining({
                    dataSource: 'cms-analysis',
                    dataDir: './data/cms-analysis',
                    minSites: 1,
                    minOccurrences: 1,
                    pageType: 'all',
                    output: 'human',
                    outputFile: '',
                    includeRecommendations: true,
                    includeCurrentFilters: true,
                    debugCalculations: false,
                    enableValidation: true,
                    skipStatisticalTests: false,
                    validationStopOnError: false,
                    validationDebugMode: false,
                })
            );
            expect(mockAnalyzeHeaders).toHaveBeenCalledWith(
                expect.any(Array),
                expect.objectContaining(options)
            );
            expect(mockAnalyzeMetaTags).toHaveBeenCalledWith(expect.any(Array), options);
            expect(mockAnalyzeScripts).toHaveBeenCalledWith(expect.any(Array), options);
            expect(mockGenerateRecommendations).toHaveBeenCalledWith(
                expect.objectContaining({
                    headerPatterns: expect.any(Map),
                    metaPatterns: expect.any(Map),
                    scriptPatterns: expect.any(Map),
                    dataPoints: expect.any(Array),
                    options: options,
                })
            );

            // Verify result structure
            expect(result).toHaveProperty('metadata');
            expect(result).toHaveProperty('headers');
            expect(result).toHaveProperty('metaTags');
            expect(result).toHaveProperty('scripts');
            expect(result).toHaveProperty('recommendations');
            expect(result).toHaveProperty('filteringReport');

            // Verify metadata
            expect(result.metadata.totalSites).toBe(1);
            expect(result.metadata.validSites).toBe(1);
            expect(result.metadata.filteredSites).toBe(0);
            expect(result.metadata.options).toEqual(options);
        });

        it('should handle insufficient data error', async () => {
            mockCollectData.mockResolvedValue({
                dataPoints: [],
                filteringReport: {
                    sitesFilteredOut: 0,
                    filterReasons: {},
                },
            });

            const options: FrequencyOptionsWithDefaults = {
                dataSource: 'cms-analysis',
                dataDir: './data/cms-analysis',
                minSites: 10,
                minOccurrences: 1,
                pageType: 'all',
                output: 'human',
                outputFile: '',
                includeRecommendations: false,
                includeCurrentFilters: false,
                debugCalculations: false,
                enableValidation: true,
                skipStatisticalTests: false,
                validationStopOnError: false,
                validationDebugMode: false,
            };

            await expect(analyzeFrequencyV2(options)).rejects.toThrow(
                'Insufficient data: found 0 sites, minimum required: 10'
            );
        });

        it('should skip recommendations when not requested', async () => {
            const options: FrequencyOptionsWithDefaults = {
                dataSource: 'cms-analysis',
                dataDir: './data/cms-analysis',
                minSites: 1,
                minOccurrences: 1,
                pageType: 'all',
                output: 'human',
                outputFile: '',
                includeRecommendations: false,
                includeCurrentFilters: false,
                debugCalculations: false,
                enableValidation: true,
                skipStatisticalTests: false,
                validationStopOnError: false,
                validationDebugMode: false,
            };

            const result = await analyzeFrequencyV2(options);

            expect(mockGenerateRecommendations).not.toHaveBeenCalled();
            expect(result.recommendations).toBeUndefined();
        });

        it('should format output when file specified', async () => {
            const options: FrequencyOptionsWithDefaults = {
                dataSource: 'cms-analysis',
                dataDir: './data/cms-analysis',
                minSites: 1,
                minOccurrences: 1,
                pageType: 'all',
                output: 'json',
                outputFile: 'frequency.json',
                includeRecommendations: false,
                includeCurrentFilters: false,
                debugCalculations: false,
                enableValidation: true,
                skipStatisticalTests: false,
                validationStopOnError: false,
                validationDebugMode: false,
            };

            await analyzeFrequencyV2(options);

            expect(mockFormatOutput).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining(options)
            );
        });

        it('should handle errors gracefully', async () => {
            mockCollectData.mockRejectedValue(new Error('Collection failed'));

            const options: FrequencyOptionsWithDefaults = {
                dataSource: 'cms-analysis',
                dataDir: './data/cms-analysis',
                minSites: 1,
                minOccurrences: 1,
                pageType: 'all',
                output: 'human',
                outputFile: '',
                includeRecommendations: false,
                includeCurrentFilters: false,
                debugCalculations: false,
                enableValidation: true,
                skipStatisticalTests: false,
                validationStopOnError: false,
                validationDebugMode: false,
            };

            await expect(analyzeFrequencyV2(options)).rejects.toThrow('Collection failed');
        });
    });

    describe('Data Formatting', () => {
        it('should format header data correctly', async () => {
            // Set up collector to return 5 data points to match frequency calculations
            mockCollectData.mockResolvedValue({
                dataPoints: Array(5)
                    .fill(null)
                    .map((_, i) => ({
                        url: `https://site${i + 1}.com`,
                        headers: { server: 'Apache' },
                        metaTags: [],
                        scripts: [],
                    })),
                filteringReport: {
                    sitesFilteredOut: 0,
                    filterReasons: {},
                },
            });

            const mockHeaderPatterns = new Map([
                [
                    'server',
                    [
                        {
                            pattern: 'server:Apache',
                            frequency: 0.6,
                            occurrences: 3,
                            examples: ['site1.com', 'site2.com', 'site3.com'],
                        },
                    ],
                ],
                [
                    'x-powered-by',
                    [
                        {
                            pattern: 'x-powered-by:PHP',
                            frequency: 0.8,
                            occurrences: 4,
                            examples: ['site2.com', 'site3.com', 'site4.com', 'site5.com'],
                        },
                    ],
                ],
            ]);

            mockAnalyzeHeaders.mockResolvedValue(mockHeaderPatterns);

            const options: FrequencyOptionsWithDefaults = {
                dataSource: 'cms-analysis',
                dataDir: './data/cms-analysis',
                minSites: 1,
                minOccurrences: 1,
                pageType: 'all',
                output: 'human',
                outputFile: '',
                includeRecommendations: false,
                includeCurrentFilters: false,
                debugCalculations: false,
            };

            const result = await analyzeFrequencyV2(options);

            // Verify header formatting (FIXED: now uses correct occurrence counts from examples)
            expect(result.headers['server']).toEqual({
                frequency: 0.6,
                occurrences: 3, // Uses all examples from the pattern, not truncated
                totalSites: 5,
                values: [
                    {
                        value: 'Apache',
                        frequency: 0.6,
                        occurrences: 3,
                        examples: ['site1.com', 'site2.com', 'site3.com'],
                    },
                ],
            });

            expect(result.headers['x-powered-by']).toEqual({
                frequency: 0.8, // FIXED: 4 unique sites / 5 total = 0.8 (was incorrectly 0.6)
                occurrences: 4, // FIXED: Now correctly shows 4 occurrences from examples
                totalSites: 5,
                values: [
                    {
                        value: 'PHP',
                        frequency: 0.8,
                        occurrences: 4,
                        examples: ['site2.com', 'site3.com', 'site4.com'],
                    },
                ],
            });
        });

        it('should format meta tag data correctly', async () => {
            // Set up collector to return 20 data points for meta tag calculations
            mockCollectData.mockResolvedValue({
                dataPoints: Array(20)
                    .fill(null)
                    .map((_, i) => ({
                        url: `https://site${i + 1}.com`,
                        headers: {},
                        metaTags: [],
                        scripts: [],
                    })),
                filteringReport: {
                    sitesFilteredOut: 0,
                    filterReasons: {},
                },
            });

            const mockMetaPatterns = new Map([
                [
                    'name:generator',
                    [
                        {
                            pattern: 'generator:WordPress',
                            frequency: 0.5,
                            occurrences: 10,
                            examples: Array(10)
                                .fill(null)
                                .map((_, i) => `site${i + 1}.com`),
                        },
                        {
                            pattern: 'generator:Drupal',
                            frequency: 0.3,
                            occurrences: 6,
                            examples: Array(6)
                                .fill(null)
                                .map((_, i) => `site${i + 11}.com`),
                        },
                    ],
                ],
            ]);

            mockAnalyzeMetaTags.mockResolvedValue(mockMetaPatterns);

            const options: FrequencyOptionsWithDefaults = {
                dataSource: 'cms-analysis',
                dataDir: './data/cms-analysis',
                minSites: 1,
                minOccurrences: 1,
                pageType: 'all',
                output: 'human',
                outputFile: '',
                includeRecommendations: false,
                includeCurrentFilters: false,
                debugCalculations: false,
            };

            const result = await analyzeFrequencyV2(options);

            // Verify meta tag formatting
            expect(result.metaTags['name:generator']).toEqual({
                frequency: 0.8, // 16 unique sites / 20 total sites
                occurrences: 16, // 10 + 6 unique sites
                totalSites: 20,
                values: [
                    {
                        value: 'WordPress',
                        frequency: 0.5,
                        occurrences: 10,
                        examples: Array(3)
                            .fill(null)
                            .map((_, i) => `site${i + 1}.com`),
                    },
                    {
                        value: 'Drupal',
                        frequency: 0.3,
                        occurrences: 6,
                        examples: Array(3)
                            .fill(null)
                            .map((_, i) => `site${i + 11}.com`),
                    },
                ],
            });
        });

        it('should format script data correctly', async () => {
            // Set up collector to return 20 data points for script calculations
            mockCollectData.mockResolvedValue({
                dataPoints: Array(20)
                    .fill(null)
                    .map((_, i) => ({
                        url: `https://site${i + 1}.com`,
                        headers: {},
                        metaTags: [],
                        scripts: [],
                    })),
                filteringReport: {
                    sitesFilteredOut: 0,
                    filterReasons: {},
                },
            });

            const mockScriptPatterns = new Map([
                [
                    'paths',
                    [
                        {
                            pattern: 'path:wp-content',
                            frequency: 0.7,
                            occurrences: 14,
                            examples: ['/wp-content/script.js'],
                        },
                    ],
                ],
                [
                    'libraries',
                    [
                        {
                            pattern: 'library:jquery',
                            frequency: 0.9,
                            occurrences: 18,
                            examples: ['jquery.min.js'],
                        },
                    ],
                ],
            ]);

            mockAnalyzeScripts.mockResolvedValue(mockScriptPatterns);

            const options: FrequencyOptionsWithDefaults = {
                dataSource: 'cms-analysis',
                dataDir: './data/cms-analysis',
                minSites: 1,
                minOccurrences: 1,
                pageType: 'all',
                output: 'human',
                outputFile: '',
                includeRecommendations: false,
                includeCurrentFilters: false,
                debugCalculations: false,
            };

            const result = await analyzeFrequencyV2(options);

            // Verify script formatting
            expect(result.scripts['path:wp-content']).toEqual({
                frequency: 0.7,
                occurrences: 14,
                totalSites: 20,
                examples: ['/wp-content/script.js'],
            });

            expect(result.scripts['library:jquery']).toEqual({
                frequency: 0.9,
                occurrences: 18,
                totalSites: 20,
                examples: ['jquery.min.js'],
            });
        });
    });

    describe('Bug Fix: Occurrence Count Calculation', () => {
        it('should correctly count occurrences from all pattern examples, not truncated display examples', async () => {
            // Test the specific bug: headers with many occurrences showing as only 3 sites
            // This simulates the x-cache-group issue where 124+ sites showed as 3

            mockCollectData.mockResolvedValue({
                dataPoints: Array(200)
                    .fill(null)
                    .map((_, i) => ({
                        url: `https://site${i + 1}.com`,
                        headers: { 'x-cache-group': 'cache-value' },
                        metaTags: [],
                        scripts: [],
                    })),
                filteringReport: {
                    sitesFilteredOut: 0,
                    filterReasons: {},
                },
            });

            // Mock analyzer returning pattern with many examples (simulating real data)
            const mockHeaderPatterns = new Map([
                [
                    'x-cache-group',
                    [
                        {
                            pattern: 'x-cache-group:cache-value',
                            frequency: 0.65, // 130 out of 200 sites
                            occurrences: 130,
                            examples: Array(130)
                                .fill(null)
                                .map((_, i) => `site${i + 1}.com`), // Full example list
                        },
                    ],
                ],
            ]);

            mockAnalyzeHeaders.mockResolvedValue(mockHeaderPatterns);

            const options: FrequencyOptionsWithDefaults = {
                dataSource: 'cms-analysis',
                dataDir: './data/cms-analysis',
                minSites: 1,
                minOccurrences: 5,
                pageType: 'all',
                output: 'human',
                outputFile: '',
                includeRecommendations: false,
                includeCurrentFilters: false,
                debugCalculations: false,
            };

            const result = await analyzeFrequencyV2(options);

            // FIXED: Should now correctly show 130 occurrences using frequency calculation
            expect(result.headers['x-cache-group']).toEqual({
                frequency: 0.65, // 130 sites / 200 total (based on pattern frequency)
                occurrences: 130, // FIXED: Calculated from pattern frequency, not limited examples
                totalSites: 200,
                values: [
                    {
                        value: 'cache-value',
                        frequency: 0.65,
                        occurrences: 130,
                        examples: ['site1.com', 'site2.com', 'site3.com'], // Display examples limited to 3
                    },
                ],
            });

            // Verify the bug is fixed: occurrences calculated from frequency, not examples
            expect(result.headers['x-cache-group'].occurrences).toBe(130);
            expect(result.headers['x-cache-group'].values[0].examples.length).toBe(3); // Display examples still limited
        });
    });

    describe('Performance Tracking', () => {
        it('should track execution time', async () => {
            const options: FrequencyOptionsWithDefaults = {
                dataSource: 'cms-analysis',
                dataDir: './data/cms-analysis',
                minSites: 1,
                minOccurrences: 1,
                pageType: 'all',
                output: 'human',
                outputFile: '',
                includeRecommendations: false,
                includeCurrentFilters: false,
                debugCalculations: false,
            };

            const startTime = performance.now();
            await analyzeFrequencyV2(options);
            const endTime = performance.now();

            // Should complete reasonably quickly for small datasets
            expect(endTime - startTime).toBeLessThan(1000); // 1 second max for unit test
        });
    });
});
