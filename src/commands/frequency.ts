import { program } from 'commander';
import { createModuleLogger } from '../utils/logger.js';
import { analyzeFrequencyV2 } from '../frequency/analyzer-v2.js';
import type { FrequencyOptions } from '../frequency/types/frequency-types-v2.js';

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
    .option('--date-start <date>', 'Filter captures from this date (YYYY-MM-DD)')
    .option('--date-end <date>', 'Filter captures until this date (YYYY-MM-DD)')
    .option(
        '--last-days <number>',
        'Filter captures: 0=today only, 1=yesterday+today, 2=last 2 days+today, etc.'
    )
    .option('--no-validation', 'Disable Phase 3 validation framework')
    .option('--skip-statistical-tests', 'Skip statistical significance tests (faster)')
    .option('--validation-stop-on-error', 'Stop validation pipeline on first error')
    .option('--validation-debug', 'Enable detailed validation debug output')
    .action(async options => {
        try {
            logger.info('Starting frequency analysis command', { options });

            // Parse date range options
            let dateRange: { start?: Date; end?: Date } | undefined;

            if (options.lastDays) {
                const days = parseInt(options.lastDays, 10);
                if (isNaN(days) || days < 0) {
                    throw new Error(
                        'Last days must be a non-negative number (0 = today only, 1 = yesterday and today, etc.)'
                    );
                }

                const end = new Date();
                // Set to end of current day
                end.setHours(23, 59, 59, 999);

                const start = new Date();
                if (days === 0) {
                    // Today only - start at beginning of today
                    start.setHours(0, 0, 0, 0);
                } else {
                    // Go back N days from start of today
                    start.setDate(start.getDate() - days);
                    start.setHours(0, 0, 0, 0);
                }

                dateRange = { start, end };
            } else if (options.dateStart || options.dateEnd) {
                dateRange = {};

                if (options.dateStart) {
                    const startDate = new Date(options.dateStart);
                    if (isNaN(startDate.getTime())) {
                        throw new Error('Invalid start date format. Use YYYY-MM-DD');
                    }
                    dateRange.start = startDate;
                }

                if (options.dateEnd) {
                    const endDate = new Date(options.dateEnd);
                    if (isNaN(endDate.getTime())) {
                        throw new Error('Invalid end date format. Use YYYY-MM-DD');
                    }
                    // Set to end of day
                    endDate.setHours(23, 59, 59, 999);
                    dateRange.end = endDate;
                }

                // Validate date range
                if (dateRange.start && dateRange.end && dateRange.start > dateRange.end) {
                    throw new Error('Start date must be before end date');
                }
            }

            const frequencyOptions: FrequencyOptions = {
                minSites: parseInt(options.minSites, 10),
                minOccurrences: parseInt(options.minOccurrences, 10),
                output: options.output,
                outputFile: options.outputFile,
                includeRecommendations: options.recommendations !== false,
                pageType: options.pageType,
                dataDir: options.dataDir,
                dateRange,
                // Phase 3: Validation options
                enableValidation: options.validation !== false,
                skipStatisticalTests: Boolean(options.skipStatisticalTests),
                validationStopOnError: Boolean(options.validationStopOnError),
                validationDebugMode: Boolean(options.validationDebug),
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
            const result = await analyzeFrequencyV2(frequencyOptions);

            // If no output file specified, print to console manually
            if (!frequencyOptions.outputFile) {
                const { formatOutputV2: formatOutput } = await import(
                    '../frequency/simple-reporter-v2.js'
                );
                await formatOutput(result, frequencyOptions);
                logger.info('Frequency analysis completed successfully');
            } else {
                console.log(
                    `Frequency analysis complete. Results saved to: ${frequencyOptions.outputFile}`
                );
            }
        } catch (error) {
            logger.error('Frequency analysis failed', error as Error);
            console.error(`Error: ${(error as Error).message}`);
            process.exit(1);
        }
    });
