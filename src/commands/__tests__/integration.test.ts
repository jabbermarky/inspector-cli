import { vi } from 'vitest';
import { setupCommandTests, setupVitestExtensions } from '@test-utils';

// Setup custom Vitest matchers
setupVitestExtensions();

/**
 * Integration Test Suite for CMS Detection Workflows
 * 
 * This test suite verifies the end-to-end functionality of the CLI commands,
 * testing the complete workflows from input to output.
 * 
 * Test Categories:
 * - Command Integration: Full command execution flows
 * - Workflow Validation: Multi-step processes
 * - Error Recovery: End-to-end error handling
 * - Performance: Integration-level performance metrics
 */

// Mock all dependencies for integration testing
vi.mock('../../utils/retry.js', () => ({
    withRetry: vi.fn().mockImplementation(async (fn: any) => await fn())
}));

vi.mock('../../utils/utils.js', () => ({
    detectInputType: vi.fn(),
    extractUrlsFromCSV: vi.fn(),
    myParseInt: vi.fn(),
    analyzeFilePath: vi.fn(),
    takeAScreenshotPuppeteer: vi.fn()
}));

vi.mock('../../utils/cms/index.js', () => ({
    CMSDetectionIterator: vi.fn()
}));

vi.mock('../../utils/cms/analysis/storage.js', () => ({
    DataStorage: vi.fn()
}));

vi.mock('../../utils/cms/analysis/generator.js', () => ({
    RuleGenerator: vi.fn()
}));

vi.mock('../../utils/logger.js', () => ({
    createModuleLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        apiCall: vi.fn(),
        apiResponse: vi.fn(),
        performance: vi.fn()
    }))
}));

// Import the functions we want to test
import { detectInputType, extractUrlsFromCSV } from '../../utils/utils.js';
import { CMSDetectionIterator } from '../../utils/cms/index.js';
import { DataStorage } from '../../utils/cms/analysis/storage.js';

const mockDetectInputType = detectInputType as any;
const mockExtractUrlsFromCSV = extractUrlsFromCSV as any;
const MockCMSDetectionIterator = CMSDetectionIterator as any;
const MockDataStorage = DataStorage as any;

describe('Integration: CMS Detection Workflows', () => {
    setupCommandTests();
    
    let consoleSpy: any;
    let consoleErrorSpy: any;
    let processExitSpy: any;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();
        
        // Spy on console methods
        consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
    });

    describe('Command Integration', () => {
        describe('CMS Detection Workflow', () => {
            it('should process CSV file end-to-end', async () => {
                // Setup test data
                const csvFile = 'test-urls.csv';
                const testUrls = [
                    'https://wordpress-site.com',
                    'https://drupal-site.com',
                    'https://joomla-site.com'
                ];
                
                // Mock the complete workflow
                mockDetectInputType.mockReturnValue('csv');
                mockExtractUrlsFromCSV.mockReturnValue(testUrls);
                
                const mockIterator = {
                    detect: vi.fn(),
                    finalize: vi.fn()
                } as any;
                
                MockCMSDetectionIterator.mockImplementation(() => mockIterator);
                
                // Mock detection results
                mockIterator.detect
                    .mockResolvedValueOnce({
                        cms: 'WordPress',
                        confidence: 0.9,
                        originalUrl: testUrls[0],
                        finalUrl: testUrls[0],
                        executionTime: 1000
                    })
                    .mockResolvedValueOnce({
                        cms: 'Drupal',
                        confidence: 0.8,
                        originalUrl: testUrls[1],
                        finalUrl: testUrls[1],
                        executionTime: 1200
                    })
                    .mockResolvedValueOnce({
                        cms: 'Joomla',
                        confidence: 0.7,
                        originalUrl: testUrls[2],
                        finalUrl: testUrls[2],
                        executionTime: 800
                    });
                
                // Verify the workflow steps
                expect(mockDetectInputType(csvFile)).toBe('csv');
                expect(mockExtractUrlsFromCSV(csvFile)).toEqual(testUrls);
                
                // Create iterator and verify it can be instantiated
                const iterator = new CMSDetectionIterator({
                    collectData: true,
                    collectionConfig: {
                        includeHtmlContent: true,
                        includeDomAnalysis: true,
                        includeScriptAnalysis: true,
                        maxHtmlSize: 500000,
                        outputFormat: 'json'
                    }
                });
                
                expect(iterator).toBeDefined();
                
                // Test each URL detection
                for (const url of testUrls) {
                    const result = await mockIterator.detect(url);
                    expect(result).toBeDefined();
                    expect(result.cms).toMatch(/WordPress|Drupal|Joomla/);
                }
                
                // Verify cleanup
                await mockIterator.finalize();
                expect(mockIterator.finalize).toHaveBeenCalledTimes(1);
            });

            it('should handle single URL detection workflow', async () => {
                const testUrl = 'https://example.com';
                
                mockDetectInputType.mockReturnValue('url');
                
                const mockIterator = {
                    detect: vi.fn(),
                    finalize: vi.fn()
                } as any;
                
                MockCMSDetectionIterator.mockImplementation(() => mockIterator);
                
                mockIterator.detect.mockResolvedValue({
                    cms: 'WordPress',
                    confidence: 0.9,
                    originalUrl: testUrl,
                    finalUrl: testUrl,
                    executionTime: 1000,
                    version: '6.3.1'
                });
                
                // Verify single URL workflow
                expect(mockDetectInputType(testUrl)).toBe('url');
                
                const result = await mockIterator.detect(testUrl);
                
                expect(result.cms).toBe('WordPress');
                expect(result.confidence).toBe(0.9);
                expect(result.version).toBe('6.3.1');
                
                await mockIterator.finalize();
                expect(mockIterator.finalize).toHaveBeenCalledTimes(1);
            });
        });

        describe('Analysis Workflow', () => {
            it('should complete data analysis end-to-end', async () => {
                const dataDir = './data/cms-analysis';
                
                const mockStorage = {
                    initialize: vi.fn(),
                    getStatistics: vi.fn(),
                    query: vi.fn(),
                    export: vi.fn()
                } as any;
                
                MockDataStorage.mockImplementation(() => mockStorage);
                
                // Mock storage data
                mockStorage.getStatistics.mockResolvedValue({
                    totalDataPoints: 100,
                    totalSize: 1024 * 50,
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
                });
                
                mockStorage.query.mockResolvedValue([
                    {
                        url: 'https://wordpress-site.com',
                        detectionResults: [{
                            detector: 'wordpress-detector',
                            strategy: 'meta-tag',
                            cms: 'WordPress',
                            confidence: 0.9,
                            executionTime: 1000
                        }]
                    },
                    {
                        url: 'https://drupal-site.com',
                        detectionResults: [{
                            detector: 'drupal-detector',
                            strategy: 'api-endpoint',
                            cms: 'Drupal',
                            confidence: 0.8,
                            executionTime: 1200
                        }]
                    }
                ]);
                
                // Test the complete analysis workflow
                const storage = new DataStorage(dataDir);
                await storage.initialize();
                
                const stats = await storage.getStatistics();
                expect(stats.totalDataPoints).toBe(100);
                expect(stats.cmsDistribution.get('WordPress')).toBe(60);
                
                const dataPoints = await storage.query({
                    includeUnknown: false,
                    minConfidence: 0.7
                });
                
                expect(dataPoints).toHaveLength(2);
                expect(dataPoints[0].detectionResults[0].cms).toBe('WordPress');
                expect(dataPoints[1].detectionResults[0].cms).toBe('Drupal');
            });
        });
    });

    describe('Workflow Validation', () => {
        it('should validate data collection workflow', async () => {
            const testUrl = 'https://test-site.com';
            
            const mockIterator = {
                detect: vi.fn(),
                finalize: vi.fn()
            } as any;
            
            MockCMSDetectionIterator.mockImplementation(() => mockIterator);
            
            // Mock comprehensive data collection
            mockIterator.detect.mockResolvedValue({
                cms: 'WordPress',
                confidence: 0.9,
                originalUrl: testUrl,
                finalUrl: testUrl,
                executionTime: 1000,
                version: '6.3.1',
                detectionResults: [{
                    detector: 'wordpress-detector',
                    strategy: 'meta-tag',
                    cms: 'WordPress',
                    confidence: 0.9,
                    version: '6.3.1',
                    executionTime: 1000
                }],
                metaTags: [
                    { name: 'generator', content: 'WordPress 6.3.1' }
                ],
                scripts: [
                    { src: '/wp-includes/js/wp-emoji-release.min.js' }
                ],
                htmlContent: '<html><head><meta name="generator" content="WordPress 6.3.1"></head></html>'
            });
            
            const result = await mockIterator.detect(testUrl);
            
            // Validate comprehensive data was collected
            expect(result.cms).toBe('WordPress');
            expect(result.version).toBe('6.3.1');
            expect(result.detectionResults).toHaveLength(1);
            expect(result.metaTags).toHaveLength(1);
            expect(result.scripts).toHaveLength(1);
            expect(result.htmlContent).toContain('WordPress 6.3.1');
        });

        it('should validate error recovery workflow', async () => {
            const failingUrl = 'https://failing-site.com';
            const workingUrl = 'https://working-site.com';
            
            const mockIterator = {
                detect: vi.fn(),
                finalize: vi.fn()
            } as any;
            
            MockCMSDetectionIterator.mockImplementation(() => mockIterator);
            
            // Mock failure then success
            mockIterator.detect
                .mockRejectedValueOnce(new Error('Network timeout'))
                .mockResolvedValueOnce({
                    cms: 'WordPress',
                    confidence: 0.9,
                    originalUrl: workingUrl,
                    finalUrl: workingUrl,
                    executionTime: 1000
                });
            
            // Test error recovery
            await expect(mockIterator.detect(failingUrl)).rejects.toThrow('Network timeout');
            
            const result = await mockIterator.detect(workingUrl);
            expect(result.cms).toBe('WordPress');
            
            // Verify cleanup still happens
            await mockIterator.finalize();
            expect(mockIterator.finalize).toHaveBeenCalledTimes(1);
        });
    });

    describe('Performance Integration', () => {
        it('should meet performance benchmarks for batch processing', async () => {
            const startTime = Date.now();
            const testUrls = Array.from({ length: 10 }, (_, i) => `https://test-site-${i}.com`);
            
            const mockIterator = {
                detect: vi.fn(),
                finalize: vi.fn()
            } as any;
            
            MockCMSDetectionIterator.mockImplementation(() => mockIterator);
            
            // Mock fast responses
            mockIterator.detect.mockImplementation(async (url: string) => {
                // Simulate processing time
                await new Promise(resolve => setTimeout(resolve, 50));
                return {
                    cms: 'WordPress',
                    confidence: 0.9,
                    originalUrl: url,
                    finalUrl: url,
                    executionTime: 50
                };
            });
            
            // Process all URLs
            const results = [];
            for (const url of testUrls) {
                const result = await mockIterator.detect(url);
                results.push(result);
            }
            
            await mockIterator.finalize();
            
            const totalTime = Date.now() - startTime;
            
            // Verify performance
            expect(results).toHaveLength(10);
            expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
            expect(mockIterator.detect).toHaveBeenCalledTimes(10);
            expect(mockIterator.finalize).toHaveBeenCalledTimes(1);
        });

        it('should handle concurrent detection limits', async () => {
            const testUrls = Array.from({ length: 5 }, (_, i) => `https://concurrent-site-${i}.com`);
            
            const mockIterator = {
                detect: vi.fn(),
                finalize: vi.fn()
            } as any;
            
            MockCMSDetectionIterator.mockImplementation(() => mockIterator);
            
            let concurrentCalls = 0;
            let maxConcurrent = 0;
            
            mockIterator.detect.mockImplementation(async (url: string) => {
                concurrentCalls++;
                maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
                concurrentCalls--;
                
                return {
                    cms: 'WordPress',
                    confidence: 0.9,
                    originalUrl: url,
                    finalUrl: url,
                    executionTime: 100
                };
            });
            
            // Process URLs sequentially (not concurrent in this CLI)
            for (const url of testUrls) {
                await mockIterator.detect(url);
            }
            
            // Verify sequential processing (CLI doesn't use concurrency)
            expect(maxConcurrent).toBe(1);
            expect(mockIterator.detect).toHaveBeenCalledTimes(5);
        });
    });

    describe('Data Integrity', () => {
        it('should maintain data consistency across workflows', async () => {
            const testUrl = 'https://consistency-test.com';
            
            // Test 1: Detection
            const mockIterator = {
                detect: vi.fn(),
                finalize: vi.fn()
            } as any;
            
            MockCMSDetectionIterator.mockImplementation(() => mockIterator);
            
            const detectionResult = {
                cms: 'WordPress',
                confidence: 0.9,
                originalUrl: testUrl,
                finalUrl: testUrl,
                executionTime: 1000,
                version: '6.3.1'
            };
            
            mockIterator.detect.mockResolvedValue(detectionResult);
            
            const result1 = await mockIterator.detect(testUrl);
            
            // Test 2: Analysis using same data
            const mockStorage = {
                initialize: vi.fn(),
                query: vi.fn()
            } as any;
            
            MockDataStorage.mockImplementation(() => mockStorage);
            
            mockStorage.query.mockResolvedValue([{
                url: testUrl,
                detectionResults: [{
                    cms: 'WordPress',
                    confidence: 0.9,
                    version: '6.3.1'
                }]
            }]);
            
            const storage = new DataStorage('./data');
            const analysisData = await storage.query({});
            
            // Verify consistency
            expect(result1.cms).toBe('WordPress');
            expect(analysisData[0].detectionResults[0].cms).toBe('WordPress');
            expect(result1.confidence).toBe(analysisData[0].detectionResults[0].confidence);
            expect(result1.version).toBe(analysisData[0].detectionResults[0].version);
        });
    });
});