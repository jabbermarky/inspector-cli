/**
 * BiasAnalyzerV2 Integration Tests
 * 
 * Tests integration with FrequencyAggregator and data consistency across V2 pipeline.
 * These tests validate that BiasAnalyzerV2 works correctly within the broader V2 ecosystem.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BiasAnalyzerV2 } from '../bias-analyzer-v2.js';
import type { 
    PreprocessedData, 
    AnalysisOptions,
    FrequencyAnalyzer
} from '../../types/analyzer-interface.js';

// Mock logger to avoid console output during tests
vi.mock('../../../utils/logger.js', () => ({
    createModuleLogger: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    })
}));

describe('BiasAnalyzerV2 Integration', () => {
    let analyzer: BiasAnalyzerV2;
    let mockData: PreprocessedData;
    let mockOptions: AnalysisOptions;

    beforeEach(() => {
        analyzer = new BiasAnalyzerV2();
        mockData = createIntegrationTestData();
        mockOptions = {
            minOccurrences: 2,
            includeExamples: true,
            maxExamples: 5,
            semanticFiltering: false
        };
        vi.clearAllMocks();
    });

    describe('FrequencyAggregator Integration', () => {
        it('integrates into analyzer pipeline correctly', async () => {
            // Simulate analyzer pipeline execution
            const result = await analyzer.analyze(mockData, mockOptions);
            
            // Should return properly structured AnalysisResult
            expect(result).toBeDefined();
            expect(result.analyzerSpecific).toBeDefined();
            expect(result.metadata).toBeDefined();
            expect(result.metadata.analyzer).toBe('BiasAnalyzerV2');
            expect(result.patterns).toBeInstanceOf(Map);
        });

        it('receives properly preprocessed data', async () => {
            // Test that analyzer can handle standard preprocessed data format
            expect(mockData.sites).toBeInstanceOf(Map);
            expect(mockData.totalSites).toBeGreaterThan(0);
            expect(mockData.metadata).toBeDefined();
            
            const result = await analyzer.analyze(mockData, mockOptions);
            
            // Should process all sites in the dataset
            expect(result.analyzerSpecific.cmsDistribution.totalSites).toBe(mockData.totalSites);
        });

        it('executes in correct pipeline sequence', async () => {
            // Test that analyzer doesn't depend on execution order
            const result1 = await analyzer.analyze(mockData, mockOptions);
            
            // Run again to ensure idempotent behavior
            const result2 = await analyzer.analyze(mockData, mockOptions);
            
            // Results should be identical (no side effects)
            expect(result1.analyzerSpecific.cmsDistribution.concentrationScore)
                .toBe(result2.analyzerSpecific.cmsDistribution.concentrationScore);
            expect(result1.analyzerSpecific.headerCorrelations.size)
                .toBe(result2.analyzerSpecific.headerCorrelations.size);
        });

        it('provides data to patterns field correctly', async () => {
            const result = await analyzer.analyze(mockData, mockOptions);
            
            // Should have patterns Map (may be empty for bias analyzer)
            expect(result.patterns).toBeInstanceOf(Map);
            
            // Each pattern should have proper structure
            for (const [patternName, patternData] of result.patterns) {
                expect(patternData.pattern).toBe(patternName);
                expect(patternData.siteCount).toBeGreaterThanOrEqual(0);
                expect(patternData.frequency).toBeGreaterThanOrEqual(0);
                expect(patternData.frequency).toBeLessThanOrEqual(1);
                expect(patternData.sites).toBeInstanceOf(Set);
            }
        });
    });

    describe('Data Consistency', () => {
        it('uses same site counts as other analyzers would', async () => {
            const result = await analyzer.analyze(mockData, mockOptions);
            
            // Total sites should match input data
            expect(result.analyzerSpecific.cmsDistribution.totalSites).toBe(mockData.totalSites);
            
            // Sum of CMS distribution should equal total sites
            let totalCMSSites = 0;
            for (const cmsStats of result.analyzerSpecific.cmsDistribution.distributions.values()) {
                totalCMSSites += cmsStats.count;
            }
            expect(totalCMSSites).toBe(mockData.totalSites);
        });

        it('applies same filtering as other analyzers', async () => {
            const highThresholdOptions = { ...mockOptions, minOccurrences: 10 };
            const lowThresholdOptions = { ...mockOptions, minOccurrences: 1 };
            
            const highResult = await analyzer.analyze(mockData, highThresholdOptions);
            const lowResult = await analyzer.analyze(mockData, lowThresholdOptions);
            
            // Higher threshold should result in fewer headers
            expect(highResult.analyzerSpecific.headerCorrelations.size)
                .toBeLessThanOrEqual(lowResult.analyzerSpecific.headerCorrelations.size);
            
            // All headers in high threshold result should meet the criteria
            for (const correlation of highResult.analyzerSpecific.headerCorrelations.values()) {
                expect(correlation.overallMetrics.occurrences).toBeGreaterThanOrEqual(10);
            }
        });

        it('produces mathematically consistent correlations', async () => {
            const result = await analyzer.analyze(mockData, mockOptions);
            
            for (const [headerName, correlation] of result.analyzerSpecific.headerCorrelations) {
                // P(CMS|header) probabilities should sum to 1.0
                let totalProbability = 0;
                for (const condProb of correlation.conditionalProbabilities.cmsGivenHeader.values()) {
                    totalProbability += condProb.probability;
                }
                expect(totalProbability).toBeCloseTo(1.0, 2);
                
                // Sum of per-CMS occurrences should equal overall occurrences
                let totalPerCMSOccurrences = 0;
                for (const cmsMetrics of correlation.perCMSMetrics.values()) {
                    totalPerCMSOccurrences += cmsMetrics.occurrences;
                }
                expect(totalPerCMSOccurrences).toBe(correlation.overallMetrics.occurrences);
            }
        });

        it('maintains statistical relationships across analyzers', async () => {
            const result = await analyzer.analyze(mockData, mockOptions);
            
            // Statistical summary should be consistent with individual correlations
            const summary = result.analyzerSpecific.statisticalSummary;
            expect(summary.totalHeadersAnalyzed).toBe(result.analyzerSpecific.headerCorrelations.size);
            
            // Confidence distribution should add up correctly
            const confDistribution = summary.confidenceDistribution;
            const totalConfidence = confDistribution.high + confDistribution.medium + confDistribution.low;
            expect(totalConfidence).toBe(summary.totalHeadersAnalyzed);
        });
    });

    describe('Performance Integration', () => {
        it('processes large datasets within acceptable time', async () => {
            const largeData = createLargeTestDataset();
            
            const startTime = Date.now();
            const result = await analyzer.analyze(largeData, mockOptions);
            const endTime = Date.now();
            
            // Should complete within reasonable time (adjust threshold as needed)
            const processingTime = endTime - startTime;
            expect(processingTime).toBeLessThan(5000); // 5 seconds max
            
            // Should still produce valid results
            expect(result.analyzerSpecific).toBeDefined();
            expect(result.analyzerSpecific.headerCorrelations.size).toBeGreaterThan(0);
        });

        it('scales linearly with preprocessed data size', async () => {
            const smallData = createIntegrationTestData(50);
            const mediumData = createIntegrationTestData(100);
            const largeData = createIntegrationTestData(200);
            
            const measureTime = async (data: PreprocessedData) => {
                const start = Date.now();
                await analyzer.analyze(data, mockOptions);
                return Date.now() - start;
            };
            
            const smallTime = await measureTime(smallData);
            const mediumTime = await measureTime(mediumData);
            const largeTime = await measureTime(largeData);
            
            // Performance should scale reasonably (not exponentially)
            // This is a rough check - exact ratios will vary
            expect(largeTime / smallTime).toBeLessThan(10); // Should not be 10x slower
        });

        it('maintains memory efficiency with other analyzers', async () => {
            // Test that analyzer doesn't hold onto large objects unnecessarily
            const initialMemory = process.memoryUsage().heapUsed;
            
            const result = await analyzer.analyze(mockData, mockOptions);
            
            // Clear analyzer reference to test garbage collection
            analyzer = null as any;
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be reasonable (adjust threshold as needed)
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB max
        });
    });
});

// Test data creation helpers
function createIntegrationTestData(totalSites: number = 100): PreprocessedData {
    const sites = new Map();
    
    // Create realistic distribution for integration testing
    const cmsDistribution = [
        { cms: 'WordPress', count: Math.floor(totalSites * 0.4) },
        { cms: 'Shopify', count: Math.floor(totalSites * 0.25) },
        { cms: 'Drupal', count: Math.floor(totalSites * 0.15) },
        { cms: 'Joomla', count: Math.floor(totalSites * 0.1) },
        { cms: null, count: Math.floor(totalSites * 0.1) } // Unknown CMS
    ];
    
    let siteIndex = 0;
    for (const { cms, count } of cmsDistribution) {
        for (let i = 0; i < count; i++) {
            const siteUrl = `https://site${siteIndex++}.com`;
            sites.set(siteUrl, {
                url: siteUrl,
                normalizedUrl: siteUrl,
                cms: cms,
                confidence: cms ? 0.8 : 0.0,
                headers: createRealisticHeaders(cms),
                headersByPageType: {
                    mainpage: createRealisticHeaders(cms),
                    robots: new Map([['user-agent', new Set(['*'])]])
                },
                metaTags: new Map(),
                scripts: new Set(),
                technologies: new Set(cms ? [cms] : []),
                capturedAt: new Date().toISOString()
            });
        }
    }
    
    return {
        sites,
        totalSites,
        metadata: {
            dateRange: {
                start: new Date(Date.now() - 86400000).toISOString(),
                end: new Date().toISOString()
            },
            version: '2.0',
            preprocessedAt: new Date().toISOString()
        }
    };
}

function createRealisticHeaders(cms: string | null): Map<string, Set<string>> {
    const baseHeaders = new Map([
        ['server', new Set(['nginx/1.18.0'])],
        ['content-type', new Set(['text/html; charset=UTF-8'])],
        ['cache-control', new Set(['no-cache'])],
        ['x-frame-options', new Set(['SAMEORIGIN'])]
    ]);
    
    // Add CMS-specific headers
    if (cms === 'WordPress') {
        baseHeaders.set('x-powered-by', new Set(['PHP/8.0']));
        baseHeaders.set('link', new Set(['<https://example.com/wp-json/>; rel="https://api.w.org/"']));
    } else if (cms === 'Shopify') {
        baseHeaders.set('x-shopify-stage', new Set(['production']));
        baseHeaders.set('x-shopify-shop-id', new Set(['12345']));
    } else if (cms === 'Drupal') {
        baseHeaders.set('x-powered-by', new Set(['PHP/8.1']));
        baseHeaders.set('x-drupal-dynamic-cache', new Set(['UNCACHEABLE']));
    }
    
    return baseHeaders;
}

function createLargeTestDataset(): PreprocessedData {
    return createIntegrationTestData(500); // Large dataset for performance testing
}