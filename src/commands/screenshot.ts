import { program } from 'commander';
import { myParseInt, analyzeFilePath, takeAScreenshotPuppeteer } from '../utils/utils.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('screenshot');

interface ScreenshotOptions {
    width?: number;
}

/**
 * Take a screenshot of a URL and save it to the specified path
 */
export async function takeScreenshot(url: string, path: string, options: ScreenshotOptions = {}): Promise<void> {
    try {
        const width = options.width || 768;
        const processedPath = analyzeFilePath(path, width);
        logger.info('Taking screenshot', { url, path: processedPath, width });
        await takeAScreenshotPuppeteer(url, processedPath, width);
        logger.info('Screenshot completed successfully', { url, path: processedPath, width });
    } catch (error) {
        logger.error('Screenshot failed', { url, path, width: options.width || 768 }, error as Error);
        throw error; // Re-throw for handling by caller
    }
}

program
    .command("screenshot")
    .description("Take a screenshot of url and save it to path")
    .argument('<url>', 'URL to take a screenshot of')
    .argument('<path>', 'Path to save the screenshot')
    .option('-w, --width <width>', 'Specify the width of the screenshot', myParseInt)
    .action(async (url, path, options) => {
        try {
            await takeScreenshot(url, path, { width: options.width });
        } catch (error) {
            console.error('Screenshot failed:', (error as Error).message);
            process.exit(1);
        }
    });
