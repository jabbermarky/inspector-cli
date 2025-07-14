import { program } from 'commander';
import { detectInputType, extractUrlsFromCSV } from '../utils/utils.js';
import { createModuleLogger } from '../utils/logger.js';
import { 
    LearnOptions, 
    processLearnBatch, 
    displayResults, 
    ensureLearnDirectoryStructure 
} from '../learn/index.js';

const logger = createModuleLogger('learn-command');

program
    .command("learn")
    .description("Perform LLM-powered analysis to discover CMS detection patterns")
    .argument('<input>', 'URL to analyze or CSV file containing URLs')
    .option('--collect-data', 'Force fresh data collection instead of using cached data')
    .option('--force-fresh', 'Force fresh data collection even when it fails (no fallback to cached)')
    .option('--prompt-template <name>', 'Use specific prompt template', 'cms-detection')
    .option('--model <model>', 'OpenAI model to use', 'gpt-4o')
    .option('--output-format <format>', 'Output format: json, summary, both', 'both')
    .option('--dry-run', 'Show what data would be sent without making LLM API call')
    .option('--cost-estimate', 'Display token count and estimated cost before proceeding')
    .action(async (input, options: LearnOptions) => {
        try {
            // Ensure learn directory structure exists
            await ensureLearnDirectoryStructure();
            
            const inputType = detectInputType(input);
            
            if (inputType === 'url') {
                // Single URL processing
                logger.info('Starting learn analysis for single URL', { 
                    url: input, 
                    options 
                });
                
                const results = await processLearnBatch([input], options);
                displayResults(results);
                
                logger.info('Learn analysis completed', { 
                    url: input, 
                    success: results[0]?.success,
                    analysisId: results[0]?.analysisId
                });
                
            } else {
                // CSV batch processing
                logger.info('Starting CSV batch learn analysis', { 
                    file: input, 
                    options 
                });
                
                const urls = extractUrlsFromCSV(input);
                logger.info('Extracted URLs from CSV', { count: urls.length });
                
                const results = await processLearnBatch(urls, options);
                displayResults(results);
                
                logger.info('CSV batch learn analysis completed', { 
                    total: results.length, 
                    successful: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length
                });
            }
            
        } catch (error) {
            logger.error('Learn command failed', { input }, error as Error);
            console.error('Learn analysis failed:', (error as Error).message);
            process.exit(1);
        } finally {
            // Ensure clean exit to prevent hanging
            // Give a small delay to ensure all async operations complete
            setTimeout(() => {
                process.exit(0);
            }, 100);
        }
    });