#!/usr/bin/env node
import process from 'process';
process.removeAllListeners('warning');

import { program } from "commander";
import {
    ScrapflyClient
} from 'scrapfly-sdk';
import puppeteer from "puppeteer-extra";
import puppeteerStealth from "puppeteer-extra-plugin-stealth";
puppeteer.use(puppeteerStealth());
import puppeteerAdblocker from "puppeteer-extra-plugin-adblocker";
puppeteer.use(puppeteerAdblocker({ blockTrackers: true }));

import { analyzeFilePath, loadCSVFromFile, myParseInt, Semaphore, parseCSV } from './utils.js';
import { parse } from 'path';
import { escape } from 'querystring';

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

const semaphore = new Semaphore(2); // Limit to 2 concurrent tasks

program
    .command("csv")
    .description("Take a screenshot of url and save it to path where URL and PATH are loaded from a CSV file")
    .argument('<csv_file>', 'csv file to read the urls and paths from')
    .action(async (csv_file, _options) => {
        const csvData = loadCSVFromFile(csv_file);
        const lines = parseCSV(csvData, {
            columns: false,
            skip_empty_lines: true,
            trim: true,
            quote: '"',
            escape: '"'
        });
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

program.parse(process.argv);
program.showHelpAfterError();

async function callScreenshot(url, original_path, width) {
    const path = analyzeFilePath(original_path, width);
    let callResult = await takeAScreenshotPuppeteer(url, path, width);
}

// define your custom headers
const requestHeaders = {
    Referer: 'https://www.google.com/',
};

async function takeAScreenshotPuppeteer(url, path, width) {    
    await semaphore.acquire();
    console.log(`Taking a screenshot of ${url} with width ${width} and saving it to ${path}`);
    const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: width, height: 1200 } });
    browser.on('disconnected', () => {
        console.log('Browser closed or disconnected');
        semaphore.release();
    });
    try {
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({ ...requestHeaders });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1.1 Safari/605.1.15');
        await page.goto(url);

        const sizes = await page.evaluate(`[document.body.scrollWidth, document.body.scrollHeight]`);
        console.log(`page size is ${sizes}, type ${typeof sizes} json ${JSON.stringify(sizes)} width: ${sizes[0]} height: ${sizes[1]}`);  
        await page.screenshot({ path: path, fullPage: true });
        return { url, path, width, sizes };
    } finally {
        await browser.close();
    }
}


