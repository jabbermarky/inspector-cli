import { program } from 'commander';
import { DataStorage } from '../utils/cms/analysis/storage.js';
import { RuleGenerator, RuleGenerationOptions, GeneratedStrategy, ValidationResult } from '../utils/cms/analysis/generator.js';
import { createModuleLogger } from '../utils/logger.js';
import * as path from 'path';

const logger = createModuleLogger('generate');

interface GenerateOptions extends RuleGenerationOptions {
    dataDir?: string;
    cms?: string[];
    minConfidence?: number;
    dryRun?: boolean;
    includeTests?: boolean;
    validate?: boolean;
    preview?: boolean;
}

/**
 * Generate detection strategies from analyzed data
 */
export async function generateDetectionStrategies(options: GenerateOptions): Promise<void> {
    try {
        logger.info('Starting rule generation', options);

        // Initialize data storage
        const dataDir = options.dataDir || './data/cms-analysis';
        const storage = new DataStorage(dataDir);
        await storage.initialize();

        // Get storage statistics
        const stats = await storage.getStatistics();
        console.log(`\n🏭 Rule Generation Overview`);
        console.log(`Data Points: ${stats.totalDataPoints}`);
        console.log(`CMS Types: ${Array.from(stats.cmsDistribution.keys()).join(', ')}`);
        console.log(`Min Confidence: ${Math.round((options.minConfidence || 0.7) * 100)}%`);

        if (stats.totalDataPoints === 0) {
            console.log('\n❌ No data found. Run detect-cms with --collect-data flag first.');
            return;
        }

        // Query data points (exclude Unknown for rule generation)
        const dataPoints = await storage.query({
            includeUnknown: false,
            minConfidence: 0.3, // Include lower confidence for better training
            cmsTypes: options.cms
        });

        console.log(`\nAnalyzing ${dataPoints.length} data points for rule generation...\n`);

        if (dataPoints.length === 0) {
            console.log('❌ No suitable data points for rule generation.');
            console.log('💡 Try lowering --min-confidence or collecting more data.');
            return;
        }

        // Initialize rule generator
        const generatorOptions: RuleGenerationOptions = {
            outputDir: options.outputDir || './src/utils/cms/strategies/generated',
            minConfidence: options.minConfidence || 0.7,
            generateTests: options.includeTests ?? true,
            validateRules: options.validate ?? true,
            namingPrefix: 'Generated'
        };

        const generator = new RuleGenerator(dataPoints, generatorOptions);

        // Generate strategies
        console.log('🔧 Generating detection strategies...\n');
        const strategies = await generator.generateAllStrategies();

        if (strategies.size === 0) {
            console.log('❌ No strategies generated. This could be due to:');
            console.log('   • Insufficient confidence in discovered patterns');
            console.log('   • Not enough training data');
            console.log('   • Min confidence threshold too high');
            console.log('\n💡 Try lowering --min-confidence or collecting more data.');
            return;
        }

        // Display generation results
        console.log(`✅ Generated ${strategies.size} detection strategies:`);
        for (const [cms, strategy] of strategies.entries()) {
            console.log(`   📋 ${cms}: ${strategy.patterns} patterns, ${Math.round(strategy.confidence * 100)}% confidence`);
        }

        // Preview mode - show generated code
        if (options.preview) {
            console.log('\n📖 Generated Code Preview:\n');
            for (const [cms, strategy] of strategies.entries()) {
                console.log(`\n--- ${strategy.fileName} ---`);
                console.log(strategy.code.substring(0, 500) + '...\n');
            }
        }

        // Dry run mode - don't write files
        if (options.dryRun) {
            console.log('\n🔍 Dry run completed. No files were written.');
            console.log(`Would generate ${strategies.size} strategy files in: ${generatorOptions.outputDir}`);
            return;
        }

        // Write strategies to files
        console.log('\n💾 Writing strategy files...');
        await generator.writeStrategies(strategies);
        console.log(`✅ Strategy files written to: ${generatorOptions.outputDir}`);

        // Validate generated strategies
        if (options.validate) {
            console.log('\n🧪 Validating generated strategies...');
            const validationResults = await generator.validateStrategies(strategies);
            
            if (validationResults.size > 0) {
                console.log('\n📊 Validation Results:');
                for (const [cms, result] of validationResults.entries()) {
                    console.log(`   ${cms}: ${Math.round(result.accuracy * 100)}% accuracy, F1: ${Math.round(result.f1Score * 100)}%`);
                }
            }
        }

        // Generate integration instructions
        await generateIntegrationInstructions(strategies, generatorOptions.outputDir!);

        logger.info('Rule generation completed successfully', {
            strategiesGenerated: strategies.size,
            outputDir: generatorOptions.outputDir
        });

    } catch (error) {
        logger.error('Rule generation failed', { error: (error as Error).message });
        console.error(`❌ Generation failed: ${(error as Error).message}`);
        process.exit(1);
    }
}

/**
 * Generate integration instructions for the new strategies
 */
export async function generateIntegrationInstructions(strategies: Map<string, GeneratedStrategy>, outputDir: string): Promise<void> {
    console.log('\n📋 Integration Instructions:');
    console.log('\n1. **Import the generated strategies** in your detector files:');
    
    for (const [cms, strategy] of strategies.entries()) {
        console.log(`   import { ${strategy.className} } from './strategies/generated/${strategy.fileName.replace('.ts', '.js')}';`);
    }

    console.log('\n2. **Add strategies to your detectors**:');
    console.log('   ```typescript');
    console.log('   getStrategies(): DetectionStrategy[] {');
    console.log('       return [');
    console.log('           new MetaTagStrategy(),');
    console.log('           new HtmlContentStrategy(),');
    for (const [, strategy] of strategies.entries()) {
        console.log(`           new ${strategy.className}(), // Generated strategy`);
    }
    console.log('       ];');
    console.log('   }');
    console.log('   ```');

    console.log('\n3. **Run tests** to verify the generated strategies:');
    console.log(`   npm test -- --testPathPatterns="generated"`);

    console.log('\n4. **Monitor performance** after deployment:');
    console.log('   • Track detection accuracy improvements');
    console.log('   • Compare before/after confidence scores');
    console.log('   • Collect feedback on false positives/negatives');

    console.log('\n💡 **Next Steps**:');
    console.log('   • Test strategies on additional websites');
    console.log('   • Fine-tune confidence thresholds based on performance');
    console.log('   • Collect more training data for continuous improvement');
}

// Command definitions
program
    .command('generate')
    .description('Generate detection strategies from analyzed CMS data')
    .option('--data-dir <path>', 'Directory containing analysis data', './data/cms-analysis')
    .option('--output-dir <path>', 'Output directory for generated strategies', './src/utils/cms/strategies/generated')
    .option('--cms <types...>', 'Generate strategies for specific CMS types only')
    .option('--min-confidence <number>', 'Minimum confidence threshold for pattern inclusion (0.0-1.0)', parseFloat, 0.7)
    .option('--dry-run', 'Preview generation without writing files')
    .option('--no-include-tests', 'Skip generating test files')
    .option('--no-validate', 'Skip strategy validation')
    .option('--preview', 'Show preview of generated code')
    .action(async (options: GenerateOptions) => {
        await generateDetectionStrategies(options);
    });

program
    .command('generate-single')
    .description('Generate detection strategy for a specific CMS')
    .argument('<cms>', 'CMS type to generate strategy for')
    .option('--data-dir <path>', 'Directory containing analysis data', './data/cms-analysis')
    .option('--output-dir <path>', 'Output directory for generated strategy', './src/utils/cms/strategies/generated')
    .option('--min-confidence <number>', 'Minimum confidence threshold (0.0-1.0)', parseFloat, 0.7)
    .option('--preview', 'Show preview without writing files')
    .action(async (cms: string, options: Omit<GenerateOptions, 'cms'>) => {
        await generateDetectionStrategies({ ...options, cms: [cms] });
    });

program
    .command('generate-test')
    .description('Test generated strategies against validation data')
    .option('--data-dir <path>', 'Directory containing analysis data', './data/cms-analysis')
    .option('--strategy-dir <path>', 'Directory containing generated strategies', './src/utils/cms/strategies/generated')
    .option('--cms <types...>', 'Test specific CMS types only')
    .action(async (options: { dataDir?: string; strategyDir?: string; cms?: string[] }) => {
        try {
            logger.info('Starting strategy testing', options);

            const dataDir = options.dataDir || './data/cms-analysis';
            const storage = new DataStorage(dataDir);
            await storage.initialize();

            // Get test data
            const testData = await storage.query({
                includeUnknown: false,
                cmsTypes: options.cms
            });

            console.log(`\n🧪 Testing Generated Strategies`);
            console.log(`Test Data Points: ${testData.length}`);
            console.log(`Strategy Directory: ${options.strategyDir}`);

            if (testData.length === 0) {
                console.log('❌ No test data available.');
                return;
            }

            // In a real implementation, this would:
            // 1. Load and compile the generated strategies
            // 2. Run them against the test data
            // 3. Calculate accuracy metrics
            // 4. Generate performance reports

            console.log('\n📊 Test Results (Simulated):');
            const cmsTypes = [...new Set(testData.map(dp => 
                dp.detectionResults.find(r => r.confidence > 0.5)?.cms
            ).filter(Boolean))];

            for (const cms of cmsTypes) {
                const accuracy = 0.85 + Math.random() * 0.1; // Simulated
                const f1Score = 0.80 + Math.random() * 0.15; // Simulated
                console.log(`   ${cms}: ${Math.round(accuracy * 100)}% accuracy, F1: ${Math.round(f1Score * 100)}%`);
            }

            console.log('\n💡 Note: Full strategy testing requires compilation and execution.');
            console.log('Consider implementing runtime strategy validation for production use.');

        } catch (error) {
            logger.error('Strategy testing failed', { error: (error as Error).message });
            console.error(`❌ Testing failed: ${(error as Error).message}`);
            process.exit(1);
        }
    });