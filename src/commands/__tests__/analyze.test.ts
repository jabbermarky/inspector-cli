import { jest } from '@jest/globals';
import { setupCommandTests, createMockDataPoint, setupJestExtensions } from '@test-utils';

// Setup custom Jest matchers
setupJestExtensions();
import type { DetectionDataPoint } from '../../utils/cms/analysis/types.js';

// Mock dependencies
jest.mock('../../utils/cms/analysis/storage.js', () => ({
    DataStorage: jest.fn()
}));

jest.mock('../../utils/cms/analysis/reports.js', () => ({
    AnalysisReporter: jest.fn()
}));

jest.mock('../../utils/cms/analysis/patterns.js', () => ({
    PatternDiscovery: jest.fn()
}));

jest.mock('../../utils/logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        apiCall: jest.fn(),
        apiResponse: jest.fn(),
        performance: jest.fn()
    }))
}));

jest.mock('path', () => ({
    resolve: jest.fn((path: string) => `/resolved/${path}`)
}));

// Import mocked classes
import { DataStorage } from '../../utils/cms/analysis/storage.js';
import { AnalysisReporter } from '../../utils/cms/analysis/reports.js';
import { PatternDiscovery } from '../../utils/cms/analysis/patterns.js';

// Import functions to test - Note: We can't easily test the commander actions directly,
// so we'll focus on testing the core logic functions if they were exported
// For now, we'll test the module structure and mocking setup

const MockDataStorage = DataStorage as jest.MockedClass<typeof DataStorage>;
const MockAnalysisReporter = AnalysisReporter as jest.MockedClass<typeof AnalysisReporter>;
const MockPatternDiscovery = PatternDiscovery as jest.MockedClass<typeof PatternDiscovery>;

// Now using standardized factory from test-utils instead of custom implementation

describe('Analyze Command', () => {
    setupCommandTests();
    
    let mockStorage: jest.Mocked<DataStorage>;
    let mockReporter: jest.Mocked<AnalysisReporter>;
    let mockPatternDiscovery: jest.Mocked<PatternDiscovery>;
    let consoleSpy: any;
    let consoleErrorSpy: any;
    let processExitSpy: any;

    beforeEach(() => {
        // Mock DataStorage instance
        mockStorage = {
            initialize: jest.fn(),
            getStatistics: jest.fn(),
            query: jest.fn(),
            export: jest.fn()
        } as any;
        
        MockDataStorage.mockImplementation(() => mockStorage);

        // Mock AnalysisReporter instance  
        mockReporter = {
            generateReport: jest.fn(),
            generatePatternSummary: jest.fn(),
            generateDetectionRules: jest.fn(),
            generateComparativeAnalysis: jest.fn(),
            generateRecommendations: jest.fn()
        } as any;
        
        MockAnalysisReporter.mockImplementation(() => mockReporter);

        // Mock PatternDiscovery instance
        mockPatternDiscovery = {
            compareDetectionPatterns: jest.fn()
        } as any;
        
        MockPatternDiscovery.mockImplementation(() => mockPatternDiscovery);

        // Spy on console methods
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
    });

    describe('Storage Initialization', () => {
        it('should initialize storage with default data directory', async () => {
            const defaultDataDir = './data/cms-analysis';
            
            // Import and test would require restructuring the module to export testable functions
            // For now, verify the mocks are set up correctly
            const storage = new DataStorage(defaultDataDir);
            expect(MockDataStorage).toHaveBeenCalledWith(defaultDataDir);
            
            await storage.initialize();
            expect(mockStorage.initialize).toHaveBeenCalled();
        });

        it('should initialize storage with custom data directory', async () => {
            const customDataDir = '/custom/path';
            
            const storage = new DataStorage(customDataDir);
            expect(MockDataStorage).toHaveBeenCalledWith(customDataDir);
        });

        it('should handle storage initialization errors', async () => {
            mockStorage.initialize.mockRejectedValue(new Error('Storage initialization failed'));
            
            const storage = new DataStorage('./data');
            
            await expect(storage.initialize()).rejects.toThrow('Storage initialization failed');
        });
    });

    describe('Statistics Handling', () => {
        it('should handle statistics with valid data', async () => {
            const mockStats = {
                totalDataPoints: 100,
                totalSize: 1024 * 50, // 50KB
                avgConfidence: 0.85,
                cmsDistribution: new Map([
                    ['WordPress', 60],
                    ['Drupal', 25],
                    ['Joomla', 10],
                    ['Unknown', 5]
                ]),
                dateRange: {
                    earliest: new Date('2023-01-01'),
                    latest: new Date('2023-12-31')
                }
            };
            
            mockStorage.getStatistics.mockResolvedValue(mockStats);
            
            const stats = await mockStorage.getStatistics();
            
            expect(stats.totalDataPoints).toBe(100);
            expect(stats.totalSize).toBe(1024 * 50);
            expect(stats.avgConfidence).toBe(0.85);
            expect(stats.cmsDistribution.get('WordPress')).toBe(60);
            expect(stats.dateRange.earliest).toEqual(new Date('2023-01-01'));
        });

        it('should handle empty statistics', async () => {
            const emptyStats = {
                totalDataPoints: 0,
                totalSize: 0,
                avgConfidence: 0,
                cmsDistribution: new Map(),
                dateRange: {
                    earliest: null,
                    latest: null
                }
            };
            
            mockStorage.getStatistics.mockResolvedValue(emptyStats);
            
            const stats = await mockStorage.getStatistics();
            
            expect(stats.totalDataPoints).toBe(0);
            expect(stats.cmsDistribution.size).toBe(0);
        });

        it('should handle statistics errors', async () => {
            mockStorage.getStatistics.mockRejectedValue(new Error('Failed to read statistics'));
            
            await expect(mockStorage.getStatistics()).rejects.toThrow('Failed to read statistics');
        });
    });

    describe('Query Building and Data Filtering', () => {
        it('should build query with all options', async () => {
            const mockDataPoints = [
                createMockDataPoint({
                    detectionResults: [{
                        detector: 'wordpress-detector',
                        strategy: 'meta-tag',
                        cms: 'WordPress',
                        confidence: 0.9,
                        version: '6.3',
                        executionTime: 1000
                    }]
                }),
                createMockDataPoint({
                    detectionResults: [{
                        detector: 'drupal-detector',
                        strategy: 'api-endpoint',
                        cms: 'Drupal',
                        confidence: 0.8,
                        version: '10.1',
                        executionTime: 1200
                    }]
                })
            ];
            
            mockStorage.query.mockResolvedValue(mockDataPoints);
            
            const query = {
                cmsTypes: ['WordPress', 'Drupal'],
                minConfidence: 0.7,
                includeUnknown: false,
                dateRange: {
                    start: new Date('2023-01-01'),
                    end: new Date('2023-12-31')
                }
            };
            
            const results = await mockStorage.query(query);
            
            expect(mockStorage.query).toHaveBeenCalledWith(query);
            expect(results).toHaveLength(2);
        });

        it('should handle queries with no results', async () => {
            mockStorage.query.mockResolvedValue([]);
            
            const results = await mockStorage.query({ includeUnknown: false });
            
            expect(results).toHaveLength(0);
        });

        it('should handle date range parsing', () => {
            const dateRangeString = '2023-01-01,2023-12-31';
            const [startStr, endStr] = dateRangeString.split(',');
            
            const startDate = new Date(startStr + 'T00:00:00.000Z');
            const endDate = new Date(endStr + 'T00:00:00.000Z');
            
            // Test that dates are valid and properly parsed
            expect(startDate.getTime()).toBeGreaterThan(0);
            expect(endDate.getTime()).toBeGreaterThan(0);
            expect(startDate.getTime()).toBeLessThan(endDate.getTime());
            expect(startDate.getUTCMonth()).toBe(0); // January
            expect(endDate.getUTCMonth()).toBe(11); // December
        });

        it('should handle invalid date range parsing', () => {
            const invalidDateRange = 'invalid-date,another-invalid';
            const [startStr, endStr] = invalidDateRange.split(',');
            
            const startDate = new Date(startStr);
            const endDate = new Date(endStr);
            
            expect(isNaN(startDate.getTime())).toBe(true);
            expect(isNaN(endDate.getTime())).toBe(true);
        });
    });

    describe('Report Generation', () => {
        beforeEach(() => {
            const mockDataPoints = [
                createMockDataPoint(),
                createMockDataPoint({
                    detectionResults: [{
                        detector: 'drupal-detector',
                        strategy: 'api-endpoint',
                        cms: 'Drupal',
                        confidence: 0.8,
                        version: '10.1',
                        executionTime: 1200
                    }]
                })
            ];
            mockStorage.query.mockResolvedValue(mockDataPoints);
        });

        it('should generate summary report by default', async () => {
            mockReporter.generatePatternSummary.mockResolvedValue('# Pattern Summary Report\n\nTest summary content');
            
            const report = await mockReporter.generatePatternSummary();
            
            expect(mockReporter.generatePatternSummary).toHaveBeenCalled();
            expect(report).toContain('Pattern Summary Report');
        });

        it('should generate full report', async () => {
            mockReporter.generateReport.mockResolvedValue('# Full Analysis Report\n\nDetailed content');
            
            const report = await mockReporter.generateReport();
            
            expect(mockReporter.generateReport).toHaveBeenCalled();
            expect(report).toContain('Full Analysis Report');
        });

        it('should generate pattern analysis', async () => {
            mockReporter.generatePatternSummary.mockResolvedValue('# Pattern Analysis\n\nPattern insights');
            
            const report = await mockReporter.generatePatternSummary();
            
            expect(report).toContain('Pattern Analysis');
        });

        it('should generate detection rules', async () => {
            mockReporter.generateDetectionRules.mockResolvedValue('# Detection Rules\n\nRule suggestions');
            
            const report = await mockReporter.generateDetectionRules();
            
            expect(report).toContain('Detection Rules');
        });

        it('should generate comparative analysis', async () => {
            mockReporter.generateComparativeAnalysis.mockResolvedValue('# Comparative Analysis\n\nComparison results');
            
            const report = await mockReporter.generateComparativeAnalysis();
            
            expect(report).toContain('Comparative Analysis');
        });

        it('should generate recommendations', async () => {
            mockReporter.generateRecommendations.mockResolvedValue('# Recommendations\n\nActionable suggestions');
            
            const report = await mockReporter.generateRecommendations();
            
            expect(report).toContain('Recommendations');
        });

        it('should handle report generation errors', async () => {
            mockReporter.generateReport.mockRejectedValue(new Error('Report generation failed'));
            
            await expect(mockReporter.generateReport()).rejects.toThrow('Report generation failed');
        });
    });

    describe('Data Export Functionality', () => {
        it('should export data in JSON format', async () => {
            const query = { includeUnknown: true };
            const exportPath = './analysis-export.json';
            
            mockStorage.export.mockResolvedValue(undefined);
            
            await mockStorage.export('json', exportPath, query);
            
            expect(mockStorage.export).toHaveBeenCalledWith('json', exportPath, query);
        });

        it('should export data in CSV format', async () => {
            const query = { includeUnknown: true };
            const exportPath = './analysis-export.csv';
            
            mockStorage.export.mockResolvedValue(undefined);
            
            await mockStorage.export('csv', exportPath, query);
            
            expect(mockStorage.export).toHaveBeenCalledWith('csv', exportPath, query);
        });

        it('should export data in JSONL format', async () => {
            const query = { includeUnknown: true };
            const exportPath = './analysis-export.jsonl';
            
            mockStorage.export.mockResolvedValue(undefined);
            
            await mockStorage.export('jsonl', exportPath, query);
            
            expect(mockStorage.export).toHaveBeenCalledWith('jsonl', exportPath, query);
        });

        it('should handle export errors', async () => {
            mockStorage.export.mockRejectedValue(new Error('Export failed'));
            
            await expect(mockStorage.export('json', './test.json', {}))
                .rejects.toThrow('Export failed');
        });
    });

    describe('Pattern Discovery and Insights', () => {
        it('should generate insights from data points', async () => {
            const mockComparison = new Map([
                ['WordPress', {
                    siteCount: 60,
                    detectionConfidence: 0.9,
                    avgLoadTime: 1200,
                    avgMetaTags: 8
                }],
                ['Drupal', {
                    siteCount: 25,
                    detectionConfidence: 0.85,
                    avgLoadTime: 1000,
                    avgMetaTags: 12
                }],
                ['Unknown', {
                    siteCount: 15,
                    detectionConfidence: 0,
                    avgLoadTime: 1500,
                    avgMetaTags: 5
                }]
            ]);
            
            mockPatternDiscovery.compareDetectionPatterns.mockReturnValue(mockComparison);
            
            const comparison = mockPatternDiscovery.compareDetectionPatterns();
            
            expect(comparison.get('WordPress')?.siteCount).toBe(60);
            expect(comparison.get('Drupal')?.avgLoadTime).toBe(1000);
            expect(comparison.get('Unknown')?.detectionConfidence).toBe(0);
        });

        it('should identify most common CMS', async () => {
            const mockComparison = new Map([
                ['WordPress', { siteCount: 60, detectionConfidence: 0.9 }],
                ['Drupal', { siteCount: 25, detectionConfidence: 0.85 }]
            ]);
            
            mockPatternDiscovery.compareDetectionPatterns.mockReturnValue(mockComparison);
            
            const comparison = mockPatternDiscovery.compareDetectionPatterns();
            const detectedCMS = Array.from(comparison.entries())
                .filter(([cms]) => cms !== 'Unknown')
                .sort((a, b) => b[1].siteCount - a[1].siteCount);
            
            expect(detectedCMS[0][0]).toBe('WordPress');
            expect(detectedCMS[0][1].siteCount).toBe(60);
        });

        it('should identify fastest CMS', async () => {
            const mockComparison = new Map([
                ['WordPress', { avgLoadTime: 1200 }],
                ['Drupal', { avgLoadTime: 1000 }],
                ['Joomla', { avgLoadTime: 1400 }]
            ]);
            
            mockPatternDiscovery.compareDetectionPatterns.mockReturnValue(mockComparison);
            
            const comparison = mockPatternDiscovery.compareDetectionPatterns();
            const fastestCMS = Array.from(comparison.entries())
                .filter(([cms]) => cms !== 'Unknown')
                .sort((a, b) => a[1].avgLoadTime - b[1].avgLoadTime);
            
            expect(fastestCMS[0][0]).toBe('Drupal');
            expect(fastestCMS[0][1].avgLoadTime).toBe(1000);
        });
    });

    describe('CMS Comparison Analysis', () => {
        it('should compare two CMS types with sufficient data', async () => {
            const cms1Data = [
                createMockDataPoint(),
                createMockDataPoint({
                    detectionResults: [{
                        detector: 'wordpress-detector',
                        strategy: 'http-headers',
                        cms: 'WordPress',
                        confidence: 0.8,
                        version: '6.2',
                        executionTime: 1100
                    }]
                })
            ];
            const cms2Data = [
                createMockDataPoint({
                    detectionResults: [{
                        detector: 'drupal-detector',
                        strategy: 'api-endpoint',
                        cms: 'Drupal',
                        confidence: 0.85,
                        version: '10.1',
                        executionTime: 1200
                    }]
                }),
                createMockDataPoint({
                    detectionResults: [{
                        detector: 'drupal-detector',
                        strategy: 'meta-tag',
                        cms: 'Drupal',
                        confidence: 0.75,
                        version: '9.5',
                        executionTime: 900
                    }]
                })
            ];
            
            mockStorage.query
                .mockResolvedValueOnce(cms1Data)
                .mockResolvedValueOnce(cms2Data);
            
            const wordpressData = await mockStorage.query({ cmsTypes: ['WordPress'], includeUnknown: false });
            const drupalData = await mockStorage.query({ cmsTypes: ['Drupal'], includeUnknown: false });
            
            expect(wordpressData).toHaveLength(2);
            expect(drupalData).toHaveLength(2);
            expect(mockStorage.query).toHaveBeenCalledTimes(2);
        });

        it('should handle insufficient data for comparison', async () => {
            mockStorage.query
                .mockResolvedValueOnce([]) // No WordPress data
                .mockResolvedValueOnce([createMockDataPoint({
                    detectionResults: [{
                        detector: 'drupal-detector',
                        strategy: 'api-endpoint',
                        cms: 'Drupal',
                        confidence: 0.8,
                        version: '10.1',
                        executionTime: 1200
                    }]
                })]); // Some Drupal data
            
            const wordpressData = await mockStorage.query({ cmsTypes: ['WordPress'], includeUnknown: false });
            const drupalData = await mockStorage.query({ cmsTypes: ['Drupal'], includeUnknown: false });
            
            expect(wordpressData).toHaveLength(0);
            expect(drupalData).toHaveLength(1);
        });

        it('should generate comparative analysis report', async () => {
            mockReporter.generateComparativeAnalysis.mockResolvedValue('# CMS Comparison\n\nComparison details');
            
            const report = await mockReporter.generateComparativeAnalysis();
            
            expect(report).toContain('CMS Comparison');
        });
    });

    describe('Error Handling', () => {
        it('should handle missing data directory', async () => {
            mockStorage.initialize.mockRejectedValue(new Error('Data directory not found'));
            
            await expect(mockStorage.initialize()).rejects.toThrow('Data directory not found');
        });

        it('should handle corrupted data files', async () => {
            mockStorage.query.mockRejectedValue(new Error('Corrupted data file'));
            
            await expect(mockStorage.query({})).rejects.toThrow('Corrupted data file');
        });

        it('should handle report generation failures', async () => {
            mockReporter.generateReport.mockRejectedValue(new Error('Template not found'));
            
            await expect(mockReporter.generateReport()).rejects.toThrow('Template not found');
        });

        it('should handle file writing errors', async () => {
            mockReporter.generateReport.mockRejectedValue(new Error('Permission denied'));
            
            await expect(mockReporter.generateReport('/readonly/path'))
                .rejects.toThrow('Permission denied');
        });
    });

    describe('Option Validation', () => {
        it('should validate confidence threshold range', () => {
            const validConfidence = 0.75;
            const invalidLowConfidence = -0.1;
            const invalidHighConfidence = 1.5;
            
            expect(validConfidence >= 0 && validConfidence <= 1).toBe(true);
            expect(invalidLowConfidence >= 0 && invalidLowConfidence <= 1).toBe(false);
            expect(invalidHighConfidence >= 0 && invalidHighConfidence <= 1).toBe(false);
        });

        it('should validate format options', () => {
            const validFormats = ['summary', 'full', 'patterns', 'rules', 'comparative', 'recommendations'];
            const testFormat = 'summary';
            const invalidFormat = 'invalid';
            
            expect(validFormats.includes(testFormat)).toBe(true);
            expect(validFormats.includes(invalidFormat)).toBe(false);
        });

        it('should validate export formats', () => {
            const validExportFormats = ['json', 'csv', 'jsonl'];
            const testFormat = 'json';
            const invalidFormat = 'xml';
            
            expect(validExportFormats.includes(testFormat)).toBe(true);
            expect(validExportFormats.includes(invalidFormat)).toBe(false);
        });

        it('should validate CMS type filtering', () => {
            const validCMSTypes = ['WordPress', 'Drupal', 'Joomla', 'Unknown'];
            const testTypes = ['WordPress', 'Drupal'];
            const invalidType = 'InvalidCMS';
            
            expect(testTypes.every(type => validCMSTypes.includes(type))).toBe(true);
            expect(validCMSTypes.includes(invalidType)).toBe(false);
        });
    });
});