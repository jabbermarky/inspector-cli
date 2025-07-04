import { program } from 'commander';
import { detectCMS } from '../utils/utils.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('detect-cms');

program
    .command("detect-cms")
    .description("Detect if the url is powered by a CMS and save it to path")
    .argument('<url>', 'URL to detect')
//    .argument('<path>', 'Path to save the screenshot')
    .action(async (url, _path, _options) => {
//        path = analyzeFilePath(path, width);
        logger.info('Starting CMS detection', { url });
        const detected = await detectCMS(url);
        
        // CLI output is appropriate for user interaction
        console.log(`Detected CMS for ${url}:`);
        if (detected) {
            console.log(`CMS: ${detected.cms}`);
            console.log(`Version: ${detected.version ?? 'Unknown'}`);
            logger.info('CMS detection completed', { url, cms: detected.cms, version: detected.version });
        }
        else {
            console.log(`No CMS detected for ${url}`);
            logger.info('No CMS detected', { url });
        }
    });
