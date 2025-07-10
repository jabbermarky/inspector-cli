import { program } from 'commander';
import { analyzeFilePath, takeAScreenshotPuppeteer, loadCSVFromFile, parseCSV } from '../utils/utils.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('csv');

interface CSVScreenshotOptions {
    widths?: number[];
}

/**
 * Process CSV file to take screenshots of URLs at specified widths
 */
export async function processCsvScreenshots(csvFile: string, options: CSVScreenshotOptions = {}): Promise<void> {
    try {
        const widths = options.widths || [768, 1024, 1536];
        
        async function callScreenshot(url: string, original_path: string, width: number) {
            const path = analyzeFilePath(original_path, width);
            await takeAScreenshotPuppeteer(url, path, width);
        }
        
        logger.info('Starting CSV screenshot processing', { file: csvFile });
        const csvData = loadCSVFromFile(csvFile);
        const lines = parseCSV(csvData);
        lines.shift(); // skip the header
        
        logger.info('Processing CSV entries', { count: lines.length });
        for (const line of lines) {
            const url = line[0];
            const original_path = line[1];

            try {
                // Take screenshots at all specified widths
                for (const width of widths) {
                    await callScreenshot(url, original_path, width);
                }
                logger.info('Completed screenshots for URL', { url, path: original_path, widths });
            } catch (error) {
                logger.error('Failed to process URL', { url, path: original_path }, error as Error);
                console.error(`Failed to process ${url}:`, (error as Error).message);
                // Continue with next URL instead of stopping
            }
        }
        logger.info('CSV processing completed successfully');
    } catch (error) {
        logger.error('CSV processing failed', { file: csvFile }, error as Error);
        console.error('CSV processing failed:', (error as Error).message);
        process.exit(1);
    }
}

program
    .command("csv")
    .description("Take a screenshot of url and save it to path where URL and PATH are loaded from a CSV file")
    .argument('<csv_file>', 'csv file to read the urls and paths from')
    .action(async (csv_file, _options) => {
        await processCsvScreenshots(csv_file);
    });
