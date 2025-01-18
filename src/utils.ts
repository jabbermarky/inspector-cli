import fs from 'fs';
import path from 'path';
import process from 'process';
import { parse } from 'csv-parse/sync';
import { Jimp } from 'jimp';
import { InvalidArgumentError } from 'commander';

import puppeteer from "puppeteer-extra";
import puppeteerStealth from "puppeteer-extra-plugin-stealth";
import puppeteerAdblocker from "puppeteer-extra-plugin-adblocker";

puppeteer.use(puppeteerStealth());
puppeteer.use(puppeteerAdblocker({ blockTrackers: true }));

interface SegmentImageHeaderFooterOptions {
    header?: number;
    footer?: number;
}

export class Semaphore {
    tasks: ((value?: unknown) => void)[];
    max: number;
    counter: number;
    constructor(max: number) {
        this.tasks = [];
        this.max = max;
        this.counter = 0;
    }

    async acquire() {
        if (this.counter < this.max) {
            this.counter++;
            return;
        }

        return new Promise(resolve => this.tasks.push(resolve));
    }

    release() {
        if (this.tasks.length > 0) {
            const next = this.tasks.shift();
            if (next) next();
        } else {
            this.counter--;
        }
    }
}

export function analyzeFilePath(filePath: string, width: number): string {

    let ext = path.extname(filePath) || '.png';
    let base = path.basename(filePath, ext) + '_' + width + ext;
    let dir = path.dirname(filePath);
    // Check if the filepath has a directory
    if (!dir || dir === '.') {
        filePath = path.join('./scrapes', base);
    } else {
        filePath = path.join(dir, base);
    }

    return filePath;
}

export function myParseInt(value:string, _dummyPrevious:any) {
    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
        throw new InvalidArgumentError('Not a number.');
    }
    return parsedValue;
}

export function loadCSVFromFile(filePath: string) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data;
    } catch (err) {
        console.error(`Error reading file from disk: ${err}`);
        process.exit(1);
    }
}

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function parseCSV(csvData: string) : any{
    return parse(csvData, {
        columns: false,
        skip_empty_lines: true,
        trim: true,
        quote: '"',
        escape: '"'
    });
}
export async function segmentImageHeaderFooter(filename: string, options: SegmentImageHeaderFooterOptions) {
    try {
        const image = await Jimp.read(filename);
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        const headerSize = options.header || 0;
        const footerSize = options.footer || 0;
        //console.log(`Processing image file ${filename}, header size ${headerSize}, footer size ${footerSize}`);
        //console.log(`Image size: ${width} x ${height}`);

        // Create header segment
        if (headerSize > height || footerSize > height) {
            throw new Error('Header or footer size exceeds image height');
        }
        if (headerSize === 0 && footerSize === 0) {
            throw new Error('Header and footer size cannot be both 0');
        }
        if (headerSize > 0) {
            const header = image.clone().crop({ x: 0, y: 0, w: width, h: headerSize });
            const headerFilename = `${filename.split('.').slice(0, -1).join('.')}_header_${headerSize}.png` as `${string}.${string}`;
            await header.write(headerFilename);
            console.log(`Header segment created: ${headerFilename}`);
        }

        // Create footer segment
        if (footerSize > 0) {
            const footer = image.clone().crop({ x: 0, y: height - footerSize, w: width, h: footerSize });
            const footerFilename = `${filename.split('.').slice(0, -1).join('.')}_footer_${footerSize}.png` as `${string}.${string}`;
            await footer.write(footerFilename);
            console.log(`Footer segment created: ${footerFilename}`);
        }

    } catch (err) {
        console.error(`Error processing image: `, err);
    }
}
// define your custom headers
const requestHeaders = {
    Referer: 'https://www.google.com/',
};

export async function takeAScreenshotPuppeteer(url:string, path:string, width:number) {
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

        const sizes: Array<any> = await page.evaluate(() => [document.body.scrollWidth, document.body.scrollHeight]) as any[];
        console.log(`page size is ${sizes}, type ${typeof sizes} json ${JSON.stringify(sizes)} width: ${sizes[0]} height: ${sizes[1]}`);
        await page.screenshot({ path: path, fullPage: true });
        return { url, path, width, sizes };
    } finally {
        await browser.close();
    }
} const semaphore = new Semaphore(2); // Limit to 2 concurrent tasks

