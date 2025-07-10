import { program } from 'commander';
import { myParseInt, segmentImageHeaderFooter } from '../utils/utils.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('footer');

interface ImageSegmentationOptions {
    header?: number;
    footer?: number;
}

/**
 * Create image segments from the header and footer of an image
 */
export async function segmentImage(filename: string, options: ImageSegmentationOptions = {}): Promise<void> {
    try {
        const header = options.header || 1024;
        const footer = options.footer || 1024;
        
        logger.info('Starting image segmentation', { filename, header, footer });
        await segmentImageHeaderFooter(filename, { header, footer });
        logger.info('Image segmentation completed successfully', { filename });
    } catch (error) {
        logger.error('Image segmentation failed', { filename }, error as Error);
        console.error('Image segmentation failed:', (error as Error).message);
        process.exit(1);
    }
}

program
    .command("footer")
    .alias("header")
    .description("Create image segments from the header and footer of an image")
    .argument('<filename>', 'Image file to process')
    .option('-h, --header <headerSize>', 'Size of the header segment', myParseInt, 1024)
    .option('-f, --footer <footerSize>', 'Size of the footer segment', myParseInt, 1024)
    .action(async (filename, _options) => {
        await segmentImage(filename, { header: _options.header, footer: _options.footer });
    });
