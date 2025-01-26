import { program } from 'commander';
import { myParseInt, analyzeFilePath, takeAScreenshotPuppeteer } from '../utils/utils.js';

program
    .command("screenshot")
    .description("Take a screenshot of url and save it to path")
    .argument('<url>', 'URL to take a screenshot of')
    .argument('<path>', 'Path to save the screenshot')
    .option('-w, --width <width>', 'Specify the width of the screenshot', myParseInt)
    .action((url, path, options) => {
        let width = options.width || 768;
        path = analyzeFilePath(path, width);
        //takeAScreenshotScrapFly(url, path);
        takeAScreenshotPuppeteer(url, path, width);
    });
