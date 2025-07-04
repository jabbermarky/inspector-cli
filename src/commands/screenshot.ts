import { program } from 'commander';
import { myParseInt, analyzeFilePath, takeAScreenshotPuppeteer } from '../utils/utils.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('screenshot');

program
    .command("screenshot")
    .description("Take a screenshot of url and save it to path")
    .argument('<url>', 'URL to take a screenshot of')
    .argument('<path>', 'Path to save the screenshot')
    .option('-w, --width <width>', 'Specify the width of the screenshot', myParseInt)
    .action(async (url, path, options) => {
        try {
            const width = options.width || 768;
            path = analyzeFilePath(path, width);
            logger.info('Taking screenshot', { url, path, width });
            await takeAScreenshotPuppeteer(url, path, width);
            logger.info('Screenshot completed successfully', { url, path, width });
        } catch (error) {
            logger.error('Screenshot failed', { url, path: path, width: options.width || 768 }, error as Error);
            console.error('Screenshot failed:', (error as Error).message);
            process.exit(1);
        }
    });
