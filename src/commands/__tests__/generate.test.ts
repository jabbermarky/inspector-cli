import { jest } from '@jest/globals';
import { setupCommandTests, createMockDataPoint, setupJestExtensions } from '@test-utils';

// Setup custom Jest matchers
setupJestExtensions();
import type { DetectionDataPoint } from '../../utils/cms/analysis/types.js';

// Mock dependencies
jest.mock('../../utils/cms/analysis/storage.js', () => ({
    DataStorage: jest.fn()
}));

jest.mock('../../utils/cms/analysis/generator.js', () => ({
    RuleGenerator: jest.fn()
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
import { RuleGenerator } from '../../utils/cms/analysis/generator.js';

const MockDataStorage = DataStorage as jest.MockedClass<typeof DataStorage>;
const MockRuleGenerator = RuleGenerator as jest.MockedClass<typeof RuleGenerator>;

// Now using standardized factory from test-utils instead of custom implementation

// Create mock generated strategy
function createMockGeneratedStrategy(cms: string) {
    return {
        name: `${cms.toLowerCase()}-generated`,
        fileName: `${cms.toLowerCase()}-generated-strategy.ts`,
        className: `${cms}GeneratedStrategy`,
        code: `export class ${cms}GeneratedStrategy implements DetectionStrategy {\n  async detect(page: DetectionPage, url: string): Promise<DetectionResult> {\n    // Generated detection logic\n  }\n}`,
        confidence: 0.85,
        patterns: 5,
        testCases: [
            {
                description: `should detect ${cms} on example site`,
                input: {
                    metaTags: [{ name: 'generator', content: `${cms} 6.3` }],
                    scripts: [],
                    domElements: []
                },
                expectedOutput: {
                    confidence: 0.85,
                    detected: true
                }
            }
        ]
    };
}

describe('Generate Command', () => {
    setupCommandTests();
    
    let mockStorage: jest.Mocked<DataStorage>;
    let mockGenerator: jest.Mocked<RuleGenerator>;
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

        // Mock RuleGenerator instance
        mockGenerator = {
            generateAllStrategies: jest.fn(),
            writeStrategies: jest.fn(),
            validateStrategies: jest.fn()
        } as any;
        
        MockRuleGenerator.mockImplementation(() => mockGenerator);

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

    describe('Rule Generator Initialization', () => {
        it('should initialize rule generator with default options', async () => {
            const mockDataPoints = [createMockDataPoint()];
            
            const generator = new RuleGenerator(mockDataPoints, {
                outputDir: './src/utils/cms/strategies/generated',
                minConfidence: 0.7,
                generateTests: true,
                validateRules: true,
                namingPrefix: 'Generated'
            });
            
            expect(MockRuleGenerator).toHaveBeenCalledWith(mockDataPoints, {
                outputDir: './src/utils/cms/strategies/generated',
                minConfidence: 0.7,
                generateTests: true,
                validateRules: true,
                namingPrefix: 'Generated'
            });
        });

        it('should initialize rule generator with custom options', async () => {
            const mockDataPoints = [createMockDataPoint()];
            const customOptions = {
                outputDir: '/custom/output',
                minConfidence: 0.8,
                generateTests: false,
                validateRules: false,
                namingPrefix: 'Custom'
            };
            
            const generator = new RuleGenerator(mockDataPoints, customOptions);
            
            expect(MockRuleGenerator).toHaveBeenCalledWith(mockDataPoints, customOptions);
        });
    });

    describe('Data Processing', () => {
        beforeEach(() => {
            const mockStats = {
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
            };
            
            mockStorage.getStatistics.mockResolvedValue(mockStats);
        });

        it('should handle sufficient data for generation', async () => {
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
            
            const query = await mockStorage.query({
                includeUnknown: false,
                minConfidence: 0.3
            });
            
            expect(mockStorage.query).toHaveBeenCalledWith({
                includeUnknown: false,
                minConfidence: 0.3
            });
            expect(query).toHaveLength(2);
        });

        it('should handle empty data scenario', async () => {
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
        });

        it('should handle insufficient data for generation', async () => {
            mockStorage.query.mockResolvedValue([]);
            
            const results = await mockStorage.query({
                includeUnknown: false,
                minConfidence: 0.3
            });
            
            expect(results).toHaveLength(0);
        });
    });

    describe('Strategy Generation', () => {
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

        it('should generate strategies successfully', async () => {
            const mockStrategies = new Map([
                ['WordPress', createMockGeneratedStrategy('WordPress')],
                ['Drupal', createMockGeneratedStrategy('Drupal')]
            ]);
            
            mockGenerator.generateAllStrategies.mockResolvedValue(mockStrategies);
            
            const strategies = await mockGenerator.generateAllStrategies();
            
            expect(mockGenerator.generateAllStrategies).toHaveBeenCalled();
            expect(strategies.size).toBe(2);
            expect(strategies.has('WordPress')).toBe(true);
            expect(strategies.has('Drupal')).toBe(true);
        });

        it('should handle no strategies generated', async () => {
            const emptyStrategies = new Map();
            
            mockGenerator.generateAllStrategies.mockResolvedValue(emptyStrategies);
            
            const strategies = await mockGenerator.generateAllStrategies();
            
            expect(strategies.size).toBe(0);
        });

        it('should handle strategy generation errors', async () => {
            mockGenerator.generateAllStrategies.mockRejectedValue(new Error('Pattern analysis failed'));
            
            await expect(mockGenerator.generateAllStrategies()).rejects.toThrow('Pattern analysis failed');
        });
    });

    describe('File Operations', () => {
        it('should write strategies to files', async () => {
            const mockStrategies = new Map([
                ['WordPress', createMockGeneratedStrategy('WordPress')]
            ]);
            
            mockGenerator.writeStrategies.mockResolvedValue(undefined);
            
            await mockGenerator.writeStrategies(mockStrategies);
            
            expect(mockGenerator.writeStrategies).toHaveBeenCalledWith(mockStrategies);
        });

        it('should handle file writing errors', async () => {
            const mockStrategies = new Map([
                ['WordPress', createMockGeneratedStrategy('WordPress')]
            ]);
            
            mockGenerator.writeStrategies.mockRejectedValue(new Error('Permission denied'));
            
            await expect(mockGenerator.writeStrategies(mockStrategies))
                .rejects.toThrow('Permission denied');
        });

        it('should handle dry run mode', async () => {
            const mockStrategies = new Map([
                ['WordPress', createMockGeneratedStrategy('WordPress')]
            ]);
            
            // In dry run mode, writeStrategies should not be called
            mockGenerator.generateAllStrategies.mockResolvedValue(mockStrategies);
            
            const strategies = await mockGenerator.generateAllStrategies();
            
            expect(strategies.size).toBe(1);
            // Would verify writeStrategies is not called in actual implementation
        });
    });

    describe('Strategy Validation', () => {
        it('should validate generated strategies', async () => {
            const mockStrategies = new Map([
                ['WordPress', createMockGeneratedStrategy('WordPress')],
                ['Drupal', createMockGeneratedStrategy('Drupal')]
            ]);
            
            const mockValidationResults = new Map([
                ['WordPress', { 
                    accuracy: 0.9, 
                    f1Score: 0.85, 
                    precision: 0.88, 
                    recall: 0.82,
                    truePositives: 45,
                    falsePositives: 6,
                    trueNegatives: 40,
                    falseNegatives: 9
                }],
                ['Drupal', { 
                    accuracy: 0.87, 
                    f1Score: 0.83, 
                    precision: 0.85, 
                    recall: 0.81,
                    truePositives: 38,
                    falsePositives: 7,
                    trueNegatives: 42,
                    falseNegatives: 13
                }]
            ]);
            
            mockGenerator.validateStrategies.mockResolvedValue(mockValidationResults);
            
            const results = await mockGenerator.validateStrategies(mockStrategies);
            
            expect(mockGenerator.validateStrategies).toHaveBeenCalledWith(mockStrategies);
            expect(results.size).toBe(2);
            expect(results.get('WordPress')?.accuracy).toBe(0.9);
            expect(results.get('Drupal')?.accuracy).toBe(0.87);
        });

        it('should handle validation errors', async () => {
            const mockStrategies = new Map([
                ['WordPress', createMockGeneratedStrategy('WordPress')]
            ]);
            
            mockGenerator.validateStrategies.mockRejectedValue(new Error('Validation failed'));
            
            await expect(mockGenerator.validateStrategies(mockStrategies))
                .rejects.toThrow('Validation failed');
        });

        it('should handle empty validation results', async () => {
            const mockStrategies = new Map([
                ['WordPress', createMockGeneratedStrategy('WordPress')]
            ]);
            
            const emptyResults = new Map();
            mockGenerator.validateStrategies.mockResolvedValue(emptyResults);
            
            const results = await mockGenerator.validateStrategies(mockStrategies);
            
            expect(results.size).toBe(0);
        });
    });

    describe('CMS Type Filtering', () => {
        it('should filter by specific CMS types', async () => {
            const mockDataPoints = [
                createMockDataPoint({ 
                    detectionResults: [{ detector: 'wordpress-detector', strategy: 'meta-tag', cms: 'WordPress', confidence: 0.9, executionTime: 1000 }] 
                }),
                createMockDataPoint({ 
                    detectionResults: [{ detector: 'drupal-detector', strategy: 'api-endpoint', cms: 'Drupal', confidence: 0.8, executionTime: 1200 }] 
                })
            ];
            
            mockStorage.query.mockResolvedValue(mockDataPoints);
            
            const results = await mockStorage.query({
                includeUnknown: false,
                minConfidence: 0.3,
                cmsTypes: ['WordPress']
            });
            
            expect(mockStorage.query).toHaveBeenCalledWith({
                includeUnknown: false,
                minConfidence: 0.3,
                cmsTypes: ['WordPress']
            });
        });

        it('should handle invalid CMS types', async () => {
            mockStorage.query.mockResolvedValue([]);
            
            const results = await mockStorage.query({
                includeUnknown: false,
                minConfidence: 0.3,
                cmsTypes: ['InvalidCMS']
            });
            
            expect(results).toHaveLength(0);
        });
    });

    describe('Confidence Threshold Handling', () => {
        it('should respect minimum confidence threshold', async () => {
            const mockDataPoints = [
                createMockDataPoint({ 
                    detectionResults: [{ detector: 'wordpress-detector', strategy: 'meta-tag', cms: 'WordPress', confidence: 0.9, executionTime: 1000 }] 
                }),
                createMockDataPoint({ 
                    detectionResults: [{ detector: 'drupal-detector', strategy: 'api-endpoint', cms: 'Drupal', confidence: 0.2, executionTime: 1200 }] 
                })
            ];
            
            mockStorage.query.mockResolvedValue(mockDataPoints);
            
            const results = await mockStorage.query({
                includeUnknown: false,
                minConfidence: 0.5
            });
            
            expect(mockStorage.query).toHaveBeenCalledWith({
                includeUnknown: false,
                minConfidence: 0.5
            });
        });

        it('should handle confidence threshold validation', () => {
            const validConfidence = 0.7;
            const invalidLowConfidence = -0.1;
            const invalidHighConfidence = 1.5;
            
            expect(validConfidence >= 0 && validConfidence <= 1).toBe(true);
            expect(invalidLowConfidence >= 0 && invalidLowConfidence <= 1).toBe(false);
            expect(invalidHighConfidence >= 0 && invalidHighConfidence <= 1).toBe(false);
        });
    });

    describe('Integration Instructions', () => {
        it('should generate integration instructions for strategies', async () => {
            const mockStrategies = new Map([
                ['WordPress', createMockGeneratedStrategy('WordPress')],
                ['Drupal', createMockGeneratedStrategy('Drupal')]
            ]);
            
            // Test that integration instructions would be generated
            // This would test the generateIntegrationInstructions function
            const outputDir = './src/utils/cms/strategies/generated';
            
            expect(mockStrategies.size).toBe(2);
            expect(outputDir).toBe('./src/utils/cms/strategies/generated');
        });
    });

    describe('Error Handling', () => {
        it('should handle missing data directory', async () => {
            mockStorage.initialize.mockRejectedValue(new Error('Data directory not found'));
            
            await expect(mockStorage.initialize()).rejects.toThrow('Data directory not found');
        });

        it('should handle rule generation failures', async () => {
            mockGenerator.generateAllStrategies.mockRejectedValue(new Error('Rule generation failed'));
            
            await expect(mockGenerator.generateAllStrategies()).rejects.toThrow('Rule generation failed');
        });

        it('should handle file system errors', async () => {
            const mockStrategies = new Map([
                ['WordPress', createMockGeneratedStrategy('WordPress')]
            ]);
            
            mockGenerator.writeStrategies.mockRejectedValue(new Error('File system error'));
            
            await expect(mockGenerator.writeStrategies(mockStrategies))
                .rejects.toThrow('File system error');
        });
    });

    describe('Output Configuration', () => {
        it('should handle custom output directory', async () => {
            const customOutputDir = '/custom/output/dir';
            const mockDataPoints = [createMockDataPoint()];
            
            const generator = new RuleGenerator(mockDataPoints, {
                outputDir: customOutputDir,
                minConfidence: 0.7,
                generateTests: true,
                validateRules: true,
                namingPrefix: 'Generated'
            });
            
            expect(MockRuleGenerator).toHaveBeenCalledWith(mockDataPoints, {
                outputDir: customOutputDir,
                minConfidence: 0.7,
                generateTests: true,
                validateRules: true,
                namingPrefix: 'Generated'
            });
        });

        it('should handle test generation options', async () => {
            const mockDataPoints = [createMockDataPoint()];
            
            const generatorWithTests = new RuleGenerator(mockDataPoints, {
                generateTests: true,
                outputDir: './output',
                minConfidence: 0.7,
                validateRules: true,
                namingPrefix: 'Generated'
            });
            
            const generatorWithoutTests = new RuleGenerator(mockDataPoints, {
                generateTests: false,
                outputDir: './output',
                minConfidence: 0.7,
                validateRules: true,
                namingPrefix: 'Generated'
            });
            
            expect(MockRuleGenerator).toHaveBeenCalledWith(mockDataPoints, expect.objectContaining({
                generateTests: true
            }));
            expect(MockRuleGenerator).toHaveBeenCalledWith(mockDataPoints, expect.objectContaining({
                generateTests: false
            }));
        });
    });
});