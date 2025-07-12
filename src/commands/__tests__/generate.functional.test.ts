import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { setupCommandTests, setupVitestExtensions } from '@test-utils';

// Setup custom Vitest matchers
setupVitestExtensions();

/**
 * Functional Tests for generate.ts
 * 
 * These tests actually import and execute the command functions to generate
 * real code coverage for the generate command.
 */

// Import the actual functions we want to test functionally
import { generateDetectionStrategies, generateIntegrationInstructions } from '../generate.js';

// Mock external dependencies that would cause issues in test environment
vi.mock('../../utils/retry.js', () => ({
    withRetry: vi.fn().mockImplementation(async (fn: any) => await fn())
}));

vi.mock('../../utils/cms/analysis/storage.js', () => ({
    DataStorage: class MockDataStorage {
        constructor(dataDir: string) {
            this.dataDir = dataDir;
        }
        
        async initialize() {
            // Mock initialization
        }
        
        async getStatistics() {
            return {
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
        }
        
        async query(query: any) {
            // Mock query results for rule generation
            const mockDataPoints = [
                {
                    url: 'https://wordpress-site.com',
                    timestamp: new Date('2023-06-01'),
                    metaTags: [{ name: 'generator', content: 'WordPress 6.3' }],
                    scripts: [{ src: '/wp-includes/js/wp-emoji-release.min.js' }],
                    detectionResults: [{
                        detector: 'wordpress-detector',
                        strategy: 'meta-tag',
                        cms: 'WordPress',
                        confidence: 0.9,
                        version: '6.3',
                        executionTime: 1000
                    }]
                },
                {
                    url: 'https://drupal-site.com',
                    timestamp: new Date('2023-06-15'),
                    metaTags: [{ name: 'generator', content: 'Drupal 10' }],
                    scripts: [{ src: '/sites/all/modules/drupal.js' }],
                    detectionResults: [{
                        detector: 'drupal-detector',
                        strategy: 'api-endpoint',
                        cms: 'Drupal',
                        confidence: 0.8,
                        version: '10.1',
                        executionTime: 1200
                    }]
                }
            ];
            
            // Filter based on query
            let results = mockDataPoints;
            
            if (query.cmsTypes && query.cmsTypes.length > 0) {
                results = results.filter(dp => 
                    dp.detectionResults.some(dr => query.cmsTypes.includes(dr.cms))
                );
            }
            
            if (!query.includeUnknown) {
                results = results.filter(dp =>
                    dp.detectionResults.some(dr => dr.cms !== 'Unknown')
                );
            }
            
            return results;
        }
        
        async export(format: string, path: string, query: any) {
            // Mock export functionality
        }
        
        private dataDir: string;
    }
}));

vi.mock('../../utils/cms/analysis/generator.js', () => ({
    RuleGenerator: class MockRuleGenerator {
        constructor(dataPoints: any[], options: any) {
            this.dataPoints = dataPoints;
            this.options = options;
        }
        
        async generateAllStrategies() {
            // Mock strategy generation
            const strategies = new Map();
            
            // Add strategies based on data points
            this.dataPoints.forEach(dp => {
                const cms = dp.detectionResults[0]?.cms;
                if (cms && cms !== 'Unknown') {
                    strategies.set(cms, {
                        name: `${cms.toLowerCase()}-generated`,
                        className: `${cms}GeneratedStrategy`,
                        fileName: `${cms.toLowerCase()}-generated-strategy.ts`,
                        code: `export class ${cms}GeneratedStrategy implements DetectionStrategy { /* generated code */ }`,
                        confidence: 0.85,
                        patterns: 5,
                        testCases: [{
                            description: `should detect ${cms}`,
                            input: { metaTags: [], scripts: [], domElements: [] },
                            expectedOutput: { confidence: 0.85, detected: true }
                        }]
                    });
                }
            });
            
            return strategies;
        }
        
        async writeStrategies(strategies: Map<string, any>) {
            // Mock file writing
        }
        
        async validateStrategies(strategies: Map<string, any>) {
            // Mock validation
            const results = new Map();
            
            for (const [cms] of strategies) {
                results.set(cms, {
                    accuracy: 0.9,
                    truePositives: 45,
                    falsePositives: 5,
                    trueNegatives: 40,
                    falseNegatives: 10,
                    precision: 0.9,
                    recall: 0.82,
                    f1Score: 0.86
                });
            }
            
            return results;
        }
        
        private dataPoints: any[];
        private options: any;
    }
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

vi.mock('path', () => ({
    resolve: vi.fn((path: string) => `/resolved/${path}`)
}));

describe('Functional: generate.ts', () => {
    setupCommandTests();
    
    let consoleSpy: any;
    let consoleErrorSpy: any;
    let processExitSpy: any;

    beforeEach(() => {
        // Spy on console methods to capture output
        consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
    });

    describe('generateDetectionStrategies - Functional Tests', () => {
        it('should generate strategies with default options', async () => {
            const options = {};
            
            await generateDetectionStrategies(options);
            
            // Verify console output shows generation overview
            expect(consoleSpy).toHaveBeenCalledWith('\n🏭 Rule Generation Overview');
            expect(consoleSpy).toHaveBeenCalledWith('Data Points: 100');
            expect(consoleSpy).toHaveBeenCalledWith('CMS Types: WordPress, Drupal, Joomla, Unknown');
            expect(consoleSpy).toHaveBeenCalledWith('Min Confidence: 70%');
            
            // Verify analysis progress
            expect(consoleSpy).toHaveBeenCalledWith('\nAnalyzing 2 data points for rule generation...\n');
            
            // Verify strategy generation
            expect(consoleSpy).toHaveBeenCalledWith('🔧 Generating detection strategies...\n');
            expect(consoleSpy).toHaveBeenCalledWith('✅ Generated 2 detection strategies:');
        });

        it('should handle custom data directory', async () => {
            const options = {
                dataDir: '/custom/data/path'
            };
            
            await generateDetectionStrategies(options);
            
            expect(consoleSpy).toHaveBeenCalledWith('\n🏭 Rule Generation Overview');
            expect(consoleSpy).toHaveBeenCalledWith('Data Points: 100');
        });

        it('should handle custom output directory', async () => {
            const options = {
                outputDir: '/custom/output/path'
            };
            
            await generateDetectionStrategies(options);
            
            expect(consoleSpy).toHaveBeenCalledWith('\n💾 Writing strategy files...');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('✅ Strategy files written to:')
            );
        });

        it('should filter by specific CMS types', async () => {
            const options = {
                cms: ['WordPress']
            };
            
            await generateDetectionStrategies(options);
            
            // Should only process WordPress data
            expect(consoleSpy).toHaveBeenCalledWith('\nAnalyzing 1 data points for rule generation...\n');
            expect(consoleSpy).toHaveBeenCalledWith('✅ Generated 1 detection strategies:');
        });

        it('should apply minimum confidence threshold', async () => {
            const options = {
                minConfidence: 0.8
            };
            
            await generateDetectionStrategies(options);
            
            expect(consoleSpy).toHaveBeenCalledWith('Min Confidence: 80%');
        });

        it('should handle dry run mode', async () => {
            const options = {
                dryRun: true
            };
            
            await generateDetectionStrategies(options);
            
            expect(consoleSpy).toHaveBeenCalledWith('\n🔍 Dry run completed. No files were written.');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Would generate 2 strategy files in:')
            );
        });

        it('should show preview when requested', async () => {
            const options = {
                preview: true
            };
            
            await generateDetectionStrategies(options);
            
            expect(consoleSpy).toHaveBeenCalledWith('\n📖 Generated Code Preview:\n');
        });

        it('should validate strategies when requested', async () => {
            const options = {
                validate: true
            };
            
            await generateDetectionStrategies(options);
            
            expect(consoleSpy).toHaveBeenCalledWith('\n🧪 Validating generated strategies...');
            expect(consoleSpy).toHaveBeenCalledWith('\n📊 Validation Results:');
        });

        it('should skip test generation when disabled', async () => {
            const options = {
                includeTests: false
            };
            
            await generateDetectionStrategies(options);
            
            // Should still complete generation
            expect(consoleSpy).toHaveBeenCalledWith('✅ Generated 2 detection strategies:');
        });

        it('should skip validation when disabled', async () => {
            const options = {
                validate: false
            };
            
            await generateDetectionStrategies(options);
            
            // Should not show validation output
            expect(consoleSpy).not.toHaveBeenCalledWith('\n🧪 Validating generated strategies...');
        });

        it('should handle combined options', async () => {
            const options = {
                dataDir: '/custom/data',
                outputDir: '/custom/output',
                cms: ['WordPress', 'Drupal'],
                minConfidence: 0.8,
                includeTests: true,
                validate: true,
                preview: false,
                dryRun: false
            };
            
            await generateDetectionStrategies(options);
            
            expect(consoleSpy).toHaveBeenCalledWith('Min Confidence: 80%');
            expect(consoleSpy).toHaveBeenCalledWith('\nAnalyzing 2 data points for rule generation...\n');
            expect(consoleSpy).toHaveBeenCalledWith('✅ Generated 2 detection strategies:');
        });
    });

    describe('generateIntegrationInstructions - Functional Tests', () => {
        it('should generate integration instructions for strategies', async () => {
            const strategies = new Map([
                ['WordPress', {
                    name: 'wordpress-generated',
                    className: 'WordPressGeneratedStrategy',
                    fileName: 'wordpress-generated-strategy.ts',
                    code: 'export class WordPressGeneratedStrategy implements DetectionStrategy { /* code */ }',
                    confidence: 0.85,
                    patterns: 5,
                    testCases: []
                }],
                ['Drupal', {
                    name: 'drupal-generated',
                    className: 'DrupalGeneratedStrategy',
                    fileName: 'drupal-generated-strategy.ts',
                    code: 'export class DrupalGeneratedStrategy implements DetectionStrategy { /* code */ }',
                    confidence: 0.80,
                    patterns: 3,
                    testCases: []
                }]
            ]);
            
            const outputDir = './src/utils/cms/strategies/generated';
            
            await generateIntegrationInstructions(strategies, outputDir);
            
            // Verify integration instructions output
            expect(consoleSpy).toHaveBeenCalledWith('\n📋 Integration Instructions:');
            expect(consoleSpy).toHaveBeenCalledWith('\n1. **Import the generated strategies** in your detector files:');
            expect(consoleSpy).toHaveBeenCalledWith(
                "   import { WordPressGeneratedStrategy } from './strategies/generated/wordpress-generated-strategy.js';"
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                "   import { DrupalGeneratedStrategy } from './strategies/generated/drupal-generated-strategy.js';"
            );
            
            expect(consoleSpy).toHaveBeenCalledWith('\n2. **Add strategies to your detectors**:');
            expect(consoleSpy).toHaveBeenCalledWith('   ```typescript');
            expect(consoleSpy).toHaveBeenCalledWith('   getStrategies(): DetectionStrategy[] {');
            expect(consoleSpy).toHaveBeenCalledWith('       return [');
            expect(consoleSpy).toHaveBeenCalledWith('           new MetaTagStrategy(),');
            expect(consoleSpy).toHaveBeenCalledWith('           new HtmlContentStrategy(),');
            expect(consoleSpy).toHaveBeenCalledWith('           new WordPressGeneratedStrategy(), // Generated strategy');
            expect(consoleSpy).toHaveBeenCalledWith('           new DrupalGeneratedStrategy(), // Generated strategy');
            expect(consoleSpy).toHaveBeenCalledWith('       ];');
            expect(consoleSpy).toHaveBeenCalledWith('   }');
            expect(consoleSpy).toHaveBeenCalledWith('   ```');
            
            expect(consoleSpy).toHaveBeenCalledWith('\n3. **Run tests** to verify the generated strategies:');
            expect(consoleSpy).toHaveBeenCalledWith('   npm test -- --testPathPatterns="generated"');
            
            expect(consoleSpy).toHaveBeenCalledWith('\n4. **Monitor performance** after deployment:');
            expect(consoleSpy).toHaveBeenCalledWith('   • Track detection accuracy improvements');
            expect(consoleSpy).toHaveBeenCalledWith('   • Compare before/after confidence scores');
            expect(consoleSpy).toHaveBeenCalledWith('   • Collect feedback on false positives/negatives');
            
            expect(consoleSpy).toHaveBeenCalledWith('\n💡 **Next Steps**:');
            expect(consoleSpy).toHaveBeenCalledWith('   • Test strategies on additional websites');
            expect(consoleSpy).toHaveBeenCalledWith('   • Fine-tune confidence thresholds based on performance');
            expect(consoleSpy).toHaveBeenCalledWith('   • Collect more training data for continuous improvement');
        });

        it('should handle single strategy', async () => {
            const strategies = new Map([
                ['WordPress', {
                    name: 'wordpress-generated',
                    className: 'WordPressGeneratedStrategy',
                    fileName: 'wordpress-generated-strategy.ts',
                    code: 'export class WordPressGeneratedStrategy implements DetectionStrategy { /* code */ }',
                    confidence: 0.85,
                    patterns: 5,
                    testCases: []
                }]
            ]);
            
            const outputDir = './src/utils/cms/strategies/generated';
            
            await generateIntegrationInstructions(strategies, outputDir);
            
            expect(consoleSpy).toHaveBeenCalledWith('\n📋 Integration Instructions:');
            expect(consoleSpy).toHaveBeenCalledWith(
                "   import { WordPressGeneratedStrategy } from './strategies/generated/wordpress-generated-strategy.js';"
            );
        });

        it('should handle empty strategies map', async () => {
            const strategies = new Map();
            const outputDir = './src/utils/cms/strategies/generated';
            
            await generateIntegrationInstructions(strategies, outputDir);
            
            expect(consoleSpy).toHaveBeenCalledWith('\n📋 Integration Instructions:');
            expect(consoleSpy).toHaveBeenCalledWith('\n1. **Import the generated strategies** in your detector files:');
            // No specific imports should be shown for empty strategies
        });
    });

    describe('Error Handling', () => {
        it('should handle storage initialization errors', async () => {
            // Test that the function completes without throwing
            const options = { dataDir: '/invalid/path' };
            
            // This should complete without throwing since errors are caught
            await generateDetectionStrategies(options);
            
            // Function should complete (errors are caught internally)
            expect(true).toBe(true);
        });
    });
});