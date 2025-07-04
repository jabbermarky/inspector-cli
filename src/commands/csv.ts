import { program } from 'commander';
import { analyzeFilePath, takeAScreenshotPuppeteer, loadCSVFromFile, parseCSV } from '../utils/utils.js';

program
    .command("csv")
    .description("Take a screenshot of url and save it to path where URL and PATH are loaded from a CSV file")
    .argument('<csv_file>', 'csv file to read the urls and paths from')
    .action(async (csv_file, _options) => {
        try {
            async function callScreenshot(url: string, original_path: string, width: number) {
                const path = analyzeFilePath(original_path, width);
                let callResult = await takeAScreenshotPuppeteer(url, path, width);
            }
            const csvData = loadCSVFromFile(csv_file);
            const lines = parseCSV(csvData);
            lines.shift(); // skip the header
            for (const line of lines) {
                const url = line[0];
                const original_path = line[1];

                try {
                    await callScreenshot(url, original_path, 768);
                    await callScreenshot(url, original_path, 1024);
                    await callScreenshot(url, original_path, 1536);
                } catch (error) {
                    console.error(`Failed to process ${url}:`, (error as Error).message);
                    // Continue with next URL instead of stopping
                }
            }
        } catch (error) {
            console.error('CSV processing failed:', (error as Error).message);
            process.exit(1);
        }
    });
