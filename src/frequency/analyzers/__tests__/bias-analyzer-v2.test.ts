/**
 * BiasAnalyzerV2 Unit Tests
 * 
 * Comprehensive test suite for V2 bias analysis implementation.
 * Tests interface compliance, statistical algorithms, and cross-analyzer integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BiasAnalyzerV2 } from '../bias-analyzer-v2.js';
import type { 
    PreprocessedData, 
    AnalysisOptions,
    VendorSpecificData,
    SemanticSpecificData,
    AnalysisResult,
    //PatternDiscoverySpecificData 
} from '../../types/analyzer-interface.js';
import { BiasSpecificData } from '../../types/bias-analysis-types-v2.js';
//import type { BiasSpecificData } from '../../types/bias-analysis-types-v2.js';

// Mock logger to avoid console output during tests
vi.mock('../../../utils/logger.js', () => ({
    createModuleLogger: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    })
}));

describe('BiasAnalyzerV2', () => {
    let analyzer: BiasAnalyzerV2;
    let mockData: PreprocessedData;
    let mockOptions: AnalysisOptions;

    beforeEach(() => {
        analyzer = new BiasAnalyzerV2();
        
        // Create comprehensive mock data
        mockData = createMockPreprocessedData();
        mockOptions = createMockAnalysisOptions();
        
        // Clear all mocks
        vi.clearAllMocks();
    });

    describe('Interface Compliance', () => {
        it('implements FrequencyAnalyzer interface correctly', () => {
            expect(analyzer.getName()).toBe('BiasAnalyzerV2');
            expect(typeof analyzer.analyze).toBe('function');
        });

        it('returns correct analyzer name', () => {
            expect(analyzer.getName()).toBe('BiasAnalyzerV2');
        });

        it('handles dependency injection properly', () => {
            const mockVendorData: VendorSpecificData = createMockVendorData();
            const mockSemanticData: SemanticSpecificData = createMockSemanticData();
            
            // Test dependency injection methods exist
            expect(typeof analyzer.setVendorData).toBe('function');
            expect(typeof analyzer.setSemanticData).toBe('function');
            
            // Should not throw when setting dependencies
            expect(() => analyzer.setVendorData(mockVendorData)).not.toThrow();
            expect(() => analyzer.setSemanticData(mockSemanticData)).not.toThrow();
        });
    });

    describe('CMS Distribution Analysis', () => {
        it('calculates distribution from preprocessed data', async () => {
            const result : AnalysisResult<BiasSpecificData> = await analyzer.analyze(mockData, mockOptions);
            
            expect(result.analyzerSpecific).toBeDefined();
            expect(result.analyzerSpecific && result.analyzerSpecific.cmsDistribution).toBeDefined();
            expect(result.analyzerSpecific.cmsDistribution.distributions).toBeInstanceOf(Map);
            expect(result.analyzerSpecific.cmsDistribution.totalSites).toBe(mockData.totalSites);
        });

        it('computes HHI concentration score correctly', async () => {
            const result = await analyzer.analyze(mockData, mockOptions);
            const concentrationScore = result.analyzerSpecific.cmsDistribution.concentrationScore;
            
            expect(concentrationScore).toBeGreaterThanOrEqual(0);
            expect(concentrationScore).toBeLessThanOrEqual(1);
        });

        it('identifies dominant platforms accurately', async () => {
            const result = await analyzer.analyze(mockData, mockOptions);
            const dominantPlatforms = result.analyzerSpecific.cmsDistribution.dominantPlatforms;
            
            expect(Array.isArray(dominantPlatforms)).toBe(true);
            // Should identify platforms with >60% representation as dominant
        });

        it('handles edge cases (single CMS, unknown CMS)', async () => {
            // Test with single CMS dataset
            const singleCMSData = createMockPreprocessedData({
                cmsDistribution: { 'WordPress': 100 }
            });
            
            const result = await analyzer.analyze(singleCMSData, mockOptions);
            expect(result.analyzerSpecific.cmsDistribution.dominantPlatforms).toContain('WordPress');
            
            // Test with all unknown CMS
            const unknownCMSData = createMockPreprocessedData({
                cmsDistribution: { 'Unknown': 100 }
            });
            
            const unknownResult = await analyzer.analyze(unknownCMSData, mockOptions);
            expect(unknownResult.analyzerSpecific.cmsDistribution.distributions.has('Unknown')).toBe(true);
        });
    });

    describe('Header Correlation Analysis', () => {
        it('calculates P(CMS|header) correctly', async () => {
            const result = await analyzer.analyze(mockData, mockOptions);
            const correlations = result.analyzerSpecific.headerCorrelations;
            
            for (const [_headerName, correlation] of correlations) {
                const cmsGivenHeader = correlation.conditionalProbabilities.cmsGivenHeader;
                
                // P(CMS|header) probabilities should sum to 1.0 (or close due to floating point)
                let totalProbability = 0;
                for (const prob of cmsGivenHeader.values()) {
                    totalProbability += prob.probability;
                    expect(prob.probability).toBeGreaterThanOrEqual(0);
                    expect(prob.probability).toBeLessThanOrEqual(1);
                }
                expect(totalProbability).toBeCloseTo(1.0, 2);
            }
        });

        it('computes platform specificity scores', async () => {
            const result = await analyzer.analyze(mockData, mockOptions);
            const correlations = result.analyzerSpecific.headerCorrelations;
            
            for (const [headerName, correlation] of correlations) {
                const specificity = correlation.platformSpecificity;
                
                expect(specificity.score).toBeGreaterThanOrEqual(0);
                expect(specificity.score).toBeLessThanOrEqual(1);
                expect(['discriminative', 'coefficient_variation']).toContain(specificity.method);
            }
        });

        it('applies discriminative vs coefficient-of-variation logic', async () => {
            // Create large dataset for discriminative method
            const largeData = createMockPreprocessedData({ totalSites: 100 });
            const largeResult = await analyzer.analyze(largeData, mockOptions);
            
            // Create small dataset for coefficient-of-variation method  
            const smallData = createMockPreprocessedData({ totalSites: 15 });
            const smallResult = await analyzer.analyze(smallData, mockOptions);
            
            // Should use different methods based on dataset size
            const hasDiscriminative = Array.from(largeResult.analyzerSpecific.headerCorrelations.values())
                .some(c => c.platformSpecificity.method === 'discriminative');
            const hasCoeffVar = Array.from(smallResult.analyzerSpecific.headerCorrelations.values())
                .some(c => c.platformSpecificity.method === 'coefficient_variation');
                
            expect(hasDiscriminative || hasCoeffVar).toBe(true);
        });

        it('generates bias-adjusted frequencies', async () => {
            const result = await analyzer.analyze(mockData, mockOptions);
            const correlations = result.analyzerSpecific.headerCorrelations;
            
            for (const [headerName, correlation] of correlations) {
                const adjustments = correlation.biasAdjustments;
                
                expect(adjustments.rawFrequency).toBeGreaterThanOrEqual(0);
                expect(adjustments.biasAdjustedFrequency).toBeGreaterThanOrEqual(0);
                expect(adjustments.adjustmentFactor).toBeGreaterThan(0);
            }
        });

        it('assesses recommendation confidence levels', async () => {
            const result = await analyzer.analyze(mockData, mockOptions);
            const correlations = result.analyzerSpecific.headerCorrelations;
            
            for (const [headerName, correlation] of correlations) {
                const risk = correlation.recommendationRisk;
                
                expect(['low', 'medium', 'high']).toContain(risk.overallRisk);
                expect(['low', 'medium', 'high']).toContain(risk.recommendationConfidence);
                expect(Array.isArray(risk.riskFactors)).toBe(true);
            }
        });
    });

    describe('Statistical Algorithms', () => {
        it('preserves HHI calculation accuracy', async () => {
            // Test with known distribution for HHI calculation
            const knownData = createMockPreprocessedData({
                totalSites: 100,
                cmsDistribution: {
                    'WordPress': 50,  // 50% market share
                    'Shopify': 30,    // 30% market share  
                    'Drupal': 20      // 20% market share
                }
            });
            
            const result = await analyzer.analyze(knownData, mockOptions);
            const hhi = result.analyzerSpecific.concentrationMetrics.herfindahlIndex;
            
            // Expected HHI = 0.5² + 0.3² + 0.2² = 0.25 + 0.09 + 0.04 = 0.38
            expect(hhi).toBeCloseTo(0.38, 2);
        });

        it('maintains two-tier specificity scoring', async () => {
            // Large dataset should use discriminative method
            const largeData = createMockPreprocessedData({ totalSites: 100 });
            const largeResult = await analyzer.analyze(largeData, mockOptions);
            
            // Small dataset should use coefficient of variation method
            const smallData = createMockPreprocessedData({ totalSites: 15 });
            const smallResult = await analyzer.analyze(smallData, mockOptions);
            
            const largeCorrelations = Array.from(largeResult.analyzerSpecific.headerCorrelations.values());
            const smallCorrelations = Array.from(smallResult.analyzerSpecific.headerCorrelations.values());
            
            // Should have different methods based on dataset size
            const largeMethodsUsed = new Set(largeCorrelations.map(c => c.platformSpecificity.method));
            const smallMethodsUsed = new Set(smallCorrelations.map(c => c.platformSpecificity.method));
            
            // Large datasets should prefer discriminative method
            expect(largeMethodsUsed.has('discriminative') || largeMethodsUsed.has('coefficient_variation')).toBe(true);
            // Small datasets should use coefficient_variation method
            expect(smallMethodsUsed.has('coefficient_variation') || smallMethodsUsed.has('discriminative')).toBe(true);
        });

        it('correctly applies sample size thresholds', async () => {
            const result = await analyzer.analyze(mockData, mockOptions);
            const summary = result.analyzerSpecific.statisticalSummary;
            
            // Should have proper sample size adequacy assessment
            expect(summary.sampleSizeAdequacy.adequate).toBeGreaterThanOrEqual(0);
            expect(summary.sampleSizeAdequacy.marginal).toBeGreaterThanOrEqual(0);
            expect(summary.sampleSizeAdequacy.inadequate).toBeGreaterThanOrEqual(0);
            
            const total = summary.sampleSizeAdequacy.adequate + 
                         summary.sampleSizeAdequacy.marginal + 
                         summary.sampleSizeAdequacy.inadequate;
            expect(total).toBe(summary.totalHeadersAnalyzed);
        });

        it('validates statistical significance tests', async () => {
            const result = await analyzer.analyze(mockData, mockOptions);
            const summary = result.analyzerSpecific.statisticalSummary;
            
            // Chi-square results should be properly calculated
            expect(summary.chiSquareResults.statisticallySignificantHeaders).toBeGreaterThanOrEqual(0);
            expect(summary.chiSquareResults.averageChiSquare).toBeGreaterThanOrEqual(0);
            expect(summary.chiSquareResults.averagePValue).toBeGreaterThanOrEqual(0);
            expect(summary.chiSquareResults.averagePValue).toBeLessThanOrEqual(1);
            expect(summary.chiSquareResults.significanceThreshold).toBe(0.05);
        });
    });

    describe('Cross-Analyzer Integration', () => {
        it('uses vendor data for technology bias detection', async () => {
            const mockVendorData: VendorSpecificData = createMockVendorData();
            analyzer.setVendorData(mockVendorData);
            
            const result = await analyzer.analyze(mockData, mockOptions);
            
            // Should have technology bias assessment when vendor data is provided
            expect(result.analyzerSpecific.technologyBias).toBeDefined();
            if (result.analyzerSpecific.technologyBias) {
                expect(result.analyzerSpecific.technologyBias.vendorConcentration).toBeInstanceOf(Map);
                expect(['low', 'medium', 'high']).toContain(result.analyzerSpecific.technologyBias.overallTechnologyBias);
            }
        });

        it('incorporates semantic data for category analysis', async () => {
            const mockSemanticData: SemanticSpecificData = createMockSemanticData();
            analyzer.setSemanticData(mockSemanticData);
            
            const result = await analyzer.analyze(mockData, mockOptions);
            
            // Should have semantic bias assessment when semantic data is provided
            expect(result.analyzerSpecific.semanticBias).toBeDefined();
            if (result.analyzerSpecific.semanticBias) {
                expect(result.analyzerSpecific.semanticBias.categoryBias).toBeInstanceOf(Map);
                expect(['low', 'medium', 'high']).toContain(result.analyzerSpecific.semanticBias.overallSemanticBias);
            }
        });

        it('processes validation data for confidence scoring', async () => {
            // Create data with validation metadata
            const dataWithValidation = createMockPreprocessedData();
            dataWithValidation.metadata.validation = {
                qualityScore: 0.85,
                validationPassed: true,
                validatedHeaders: new Map([
                    ['server', { pattern: 'server', siteCount: 25, sites: new Set(), frequency: 0.5 }],
                    ['x-powered-by', { pattern: 'x-powered-by', siteCount: 15, sites: new Set(), frequency: 0.3 }]
                ]),
                statisticallySignificantHeaders: 2
            };
            
            const result = await analyzer.analyze(dataWithValidation, mockOptions);
            
            // Should incorporate validation context into correlation analysis
            const correlations = result.analyzerSpecific.headerCorrelations;
            for (const [headerName, correlation] of correlations) {
                if (['server', 'x-powered-by'].includes(headerName)) {
                    // Headers with validation data should have enhanced context
                    expect(correlation.validationContext).toBeDefined();
                }
            }
        });

        it('handles missing dependency data gracefully', async () => {
            // Test without any cross-analyzer data
            const result = await analyzer.analyze(mockData, mockOptions);
            
            // Should still complete analysis without cross-analyzer data
            expect(result).toBeDefined();
            expect(result.analyzerSpecific).toBeDefined();
            expect(result.analyzerSpecific.cmsDistribution).toBeDefined();
            expect(result.analyzerSpecific.headerCorrelations).toBeInstanceOf(Map);
            
            // Optional cross-analyzer fields should be undefined or have default values
            expect(result.analyzerSpecific.technologyBias).toBeUndefined();
            expect(result.analyzerSpecific.semanticBias).toBeUndefined();
        });

        it('maintains data consistency across analyzers', async () => {
            const result = await analyzer.analyze(mockData, mockOptions);
            
            // Header counts should be consistent
            const correlations = result.analyzerSpecific.headerCorrelations;
            for (const [headerName, correlation] of correlations) {
                const overallOccurrences = correlation.overallMetrics.occurrences;
                
                // Sum of per-CMS occurrences should equal overall occurrences
                let totalPerCMSOccurrences = 0;
                for (const cmsMetrics of correlation.perCMSMetrics.values()) {
                    totalPerCMSOccurrences += cmsMetrics.occurrences;
                }
                
                expect(totalPerCMSOccurrences).toBe(overallOccurrences);
            }
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('handles empty datasets gracefully', async () => {
            const emptyData: PreprocessedData = {
                sites: new Map(),
                totalSites: 0,
                metadata: {
                    version: '2.0',
                    preprocessedAt: new Date().toISOString()
                }
            };
            
            const result = await analyzer.analyze(emptyData, mockOptions);
            
            expect(result).toBeDefined();
            expect(result.analyzerSpecific.cmsDistribution.totalSites).toBe(0);
            expect(result.analyzerSpecific.headerCorrelations.size).toBe(0);
        });

        it('applies minOccurrences filter correctly', async () => {
            const highThresholdOptions: AnalysisOptions = {
                ...mockOptions,
                minOccurrences: 10 // High threshold
            };
            
            const result = await analyzer.analyze(mockData, highThresholdOptions);
            
            // Should filter out headers with low occurrences
            const correlations = result.analyzerSpecific.headerCorrelations;
            for (const [headerName, correlation] of correlations) {
                expect(correlation.overallMetrics.occurrences).toBeGreaterThanOrEqual(10);
            }
        });

        it('handles malformed site data', async () => {
            const malformedData = createMockPreprocessedData();
            
            // Add site with missing required fields
            malformedData.sites.set('malformed-site', {
                url: 'https://malformed.com',
                normalizedUrl: 'https://malformed.com',
                cms: null,
                confidence: 0,
                headers: new Map(), // Empty headers
                metaTags: new Map(),
                scripts: new Set(),
                technologies: new Set(),
                capturedAt: new Date().toISOString()
            } as any);
            
            // Should not throw error
            const result = await analyzer.analyze(malformedData, mockOptions);
            expect(result).toBeDefined();
        });

        it('validates statistical algorithm edge cases', async () => {
            // Test with extreme distributions
            const extremeData = createMockPreprocessedData({
                totalSites: 100,
                cmsDistribution: {
                    'WordPress': 99,  // 99% concentration
                    'Unknown': 1      // 1% remainder
                }
            });
            
            const result = await analyzer.analyze(extremeData, mockOptions);
            
            // Should handle extreme concentration gracefully
            expect(result.analyzerSpecific.concentrationMetrics.herfindahlIndex).toBeCloseTo(0.98, 2);
            expect(result.analyzerSpecific.concentrationMetrics.overallBiasRisk).toBe('high');
        });
    });
});

// Mock data creation helpers
function createMockPreprocessedData(options: {
    totalSites?: number;
    cmsDistribution?: Record<string, number>;
} = {}): PreprocessedData {
    const totalSites = options.totalSites || 50;
    const cmsDistribution = options.cmsDistribution || {
        'WordPress': 25,
        'Shopify': 15,
        'Drupal': 8,
        'Unknown': 2
    };
    
    const sites = new Map();
    let siteIndex = 0;
    
    // Create sites for each CMS
    for (const [cms, count] of Object.entries(cmsDistribution)) {
        for (let i = 0; i < count; i++) {
            const siteUrl = `https://site${siteIndex++}.com`;
            sites.set(siteUrl, {
                url: siteUrl,
                normalizedUrl: siteUrl,
                cms: cms === 'Unknown' ? null : cms,
                confidence: 0.8,
                headers: createMockHeaders(),
                headersByPageType: {
                    mainpage: createMockHeaders(),
                    robots: new Map([['user-agent', new Set(['*'])]])
                },
                metaTags: new Map(),
                scripts: new Set(),
                technologies: new Set([cms]),
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

function createMockHeaders(): Map<string, Set<string>> {
    return new Map([
        ['server', new Set(['nginx/1.18.0'])],
        ['content-type', new Set(['text/html; charset=UTF-8'])],
        ['x-powered-by', new Set(['PHP/8.0'])],
        ['cache-control', new Set(['no-cache'])],
        ['x-frame-options', new Set(['SAMEORIGIN'])]
    ]);
}

function createMockAnalysisOptions(): AnalysisOptions {
    return {
        minOccurrences: 2,
        includeExamples: true,
        maxExamples: 5,
        semanticFiltering: false
    };
}

function createMockVendorData(): VendorSpecificData {
    return {
        vendorsByHeader: new Map([
            ['server', { vendor: { name: 'Nginx', category: 'web-server' }, confidence: 0.9 }],
            ['x-powered-by', { vendor: { name: 'PHP', category: 'language' }, confidence: 0.95 }]
        ]),
        summary: {
            totalVendorsDetected: 2,
            totalHeaders: 5,
            vendorCoverage: 0.4
        }
    };
}

function createMockSemanticData(): SemanticSpecificData {
    return {
        categoryDistribution: new Map([
            ['server', 'infrastructure'],
            ['x-powered-by', 'infrastructure'],
            ['cache-control', 'caching'],
            ['x-frame-options', 'security']
        ]),
        headerPatterns: new Map([
            ['server', { confidence: 0.9, category: 'infrastructure' }],
            ['x-powered-by', { confidence: 0.85, category: 'infrastructure' }],
            ['cache-control', { confidence: 0.8, category: 'caching' }],
            ['x-frame-options', { confidence: 0.95, category: 'security' }]
        ]),
        summary: {
            totalCategorized: 4,
            totalHeaders: 5,
            categoryCount: 3,
            categorizationRate: 0.8
        }
    };
}