import { program } from 'commander';
import { createModuleLogger } from '../utils/logger.js';
import { analyzeFrequency } from '../frequency/analyzer.js';
import type { FrequencyOptions } from '../frequency/types.js';

const logger = createModuleLogger('frequency-command');

program
  .command('frequency')
  .description('Analyze frequency of headers and meta tags across collected sites')
  .option('--min-sites <number>', 'Minimum sites required for analysis', '100')
  .option('--min-occurrences <number>', 'Minimum occurrences to include in report', '5')
  .option('--output <format>', 'Output format: json, csv, human, markdown', 'human')
  .option('--output-file <path>', 'Save output to file')
  .option('--no-recommendations', 'Exclude filter recommendations')
  .option('--page-type <type>', 'Analyze specific page type: all, mainpage, robots', 'all')
  .option('--data-dir <path>', 'Data directory path', './data/cms-analysis')
  .action(async (options) => {
    try {
      logger.info('Starting frequency analysis command', { options });
      
      const frequencyOptions: FrequencyOptions = {
        minSites: parseInt(options.minSites, 10),
        minOccurrences: parseInt(options.minOccurrences, 10),
        output: options.output,
        outputFile: options.outputFile,
        includeRecommendations: options.recommendations !== false,
        pageType: options.pageType,
        dataDir: options.dataDir
      };
      
      // Validate options
      if (frequencyOptions.minSites! < 1) {
        throw new Error('Minimum sites must be at least 1');
      }
      
      if (frequencyOptions.minOccurrences! < 1) {
        throw new Error('Minimum occurrences must be at least 1');
      }
      
      if (!['json', 'csv', 'human', 'markdown'].includes(frequencyOptions.output!)) {
        throw new Error('Output format must be json, csv, human, or markdown');
      }
      
      // Run analysis
      const result = await analyzeFrequency(frequencyOptions);
      
      // If no output file specified, print to console manually
      if (!frequencyOptions.outputFile) {
        const { formatOutput } = await import('../frequency/reporter.js');
        await formatOutput(result, frequencyOptions as Required<FrequencyOptions>);
        logger.info('Frequency analysis completed successfully');
      } else {
        console.log(`Frequency analysis complete. Results saved to: ${frequencyOptions.outputFile}`);
      }
      
    } catch (error) {
      logger.error('Frequency analysis failed', error as Error);
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });