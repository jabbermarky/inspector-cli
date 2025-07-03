import { program } from 'commander';
import { myParseInt, analyzeFilePath, detectCMS, CMSDetectionResult } from '../utils/utils.js';

program
    .command("detect-cms")
    .description("Detect if the url is powered by a CMS and save it to path")
    .argument('<url>', 'URL to detect')
//    .argument('<path>', 'Path to save the screenshot')
    .action(async (url, path, options) => {
//        path = analyzeFilePath(path, width);
        let detected = await detectCMS(url);
        console.log(`Detected CMS for ${url}:`);
        if (detected) {
            console.log(`CMS: ${detected.cms}`);
            console.log(`Version: ${detected.version} ? ${detected.version ? detected.version : 'Unknown'}`);
        }
        else {
            console.log(`No CMS detected for ${url}`);
        }
    });
