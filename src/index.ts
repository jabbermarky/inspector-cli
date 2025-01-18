#!/usr/bin/env node
import process from 'process';
import figlet from 'figlet';

process.removeAllListeners('warning');
console.log(figlet.textSync('Inspector CLI'));

import { program } from "commander";
import {
    ScrapflyClient
} from 'scrapfly-sdk';

import { analyzeFilePath, loadCSVFromFile, myParseInt, parseCSV, segmentImageHeaderFooter, takeAScreenshotPuppeteer } from './utils.js';

export const client = new ScrapflyClient({ key: "scp-live-6bd7f34dcc694950955a9ce85e4a823b" });

program
    .version("1.0.0")
    .summary("Inspector CLI")
    .description("Take a screen shot of a website");

program
    .command("screenshot")
    .description("Take a screenshot of url and save it to path")
    .argument('<url>', 'URL to take a screenshot of')
    .argument('<path>', 'Path to save the screenshot')
    .option('-w, --width <width>', 'Specify the width of the screenshot', myParseInt)
    .action((url, path, options) => {
        let width = options.width || 768;
        path = analyzeFilePath(path, width);
        console.log(`Taking a screenshot of ${url} with width ${width} and saving it to ${path}`);
        //takeAScreenshotScrapFly(url, path);

        takeAScreenshotPuppeteer(url, path, width);
    });

program
    .command("csv")
    .description("Take a screenshot of url and save it to path where URL and PATH are loaded from a CSV file")
    .argument('<csv_file>', 'csv file to read the urls and paths from')
    .action(async (csv_file, _options) => {
        const csvData = loadCSVFromFile(csv_file);
        const lines = parseCSV(csvData);
        lines.shift();  // skip the header
        for (const line of lines) {
            const url = line[0];
            const original_path = line[1];

            (async () => {
                await callScreenshot(url, original_path, 768);
                await callScreenshot(url, original_path, 1024);
                await callScreenshot(url, original_path, 1536);
            })();
        }
    });

program
    .command("footer")
    .alias("header")
    .description("Create image segments from the header and footer of an image")
    .argument('<filename>', 'Image file to process')
    .option('-h, --header <headerSize>', 'Size of the header segment', myParseInt, 1024)
    .option('-f, --footer <footerSize>', 'Size of the footer segment', myParseInt, 1024)
    .action(async (filename, _options) => {
        const header = _options.header;
        const footer = _options.footer;
        //console.log(`Processing image file ${filename}, header size ${header}, footer size ${footer}`);
        await segmentImageHeaderFooter(filename, { header, footer });
    });

program.parse(process.argv);
program.showHelpAfterError();

if (!process.argv.slice(2).length) {
    program.outputHelp();
}

async function callScreenshot(url: string, original_path: string, width: number) {
    const path = analyzeFilePath(original_path, width);
    let callResult = await takeAScreenshotPuppeteer(url, path, width);
}




