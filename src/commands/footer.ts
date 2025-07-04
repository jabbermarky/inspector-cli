import { program } from 'commander';
import { myParseInt, segmentImageHeaderFooter } from '../utils/utils.js';

program
    .command("footer")
    .alias("header")
    .description("Create image segments from the header and footer of an image")
    .argument('<filename>', 'Image file to process')
    .option('-h, --header <headerSize>', 'Size of the header segment', myParseInt, 1024)
    .option('-f, --footer <footerSize>', 'Size of the footer segment', myParseInt, 1024)
    .action(async (filename, _options) => {
        try {
            const header = _options.header;
            const footer = _options.footer;
            console.log(`Creating Header/Footer from image file ${filename}: header size ${header}, footer size ${footer}`);
            await segmentImageHeaderFooter(filename, { header, footer });
        } catch (error) {
            console.error('Image segmentation failed:', (error as Error).message);
            process.exit(1);
        }
    });
