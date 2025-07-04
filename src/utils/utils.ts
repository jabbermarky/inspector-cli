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
    // Input validation
    if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path: path must be a non-empty string');
    }
    
    if (width === undefined || width <= 0) {
        throw new Error('Invalid width: width must be a positive number');
    }

    // Security: Prevent directory traversal attacks
    if (filePath.includes('..') || filePath.includes('~')) {
        throw new Error('Invalid file path: path cannot contain ".." or "~"');
    }

    // Security: Restrict to safe characters
    const safePathRegex = /^[a-zA-Z0-9._/-]+$/;
    if (!safePathRegex.test(filePath)) {
        throw new Error('Invalid file path: path contains unsafe characters');
    }

    let ext = path.extname(filePath) || '.png';
    let base = path.basename(filePath, ext) + '_w' + width + ext;
    let dir = path.dirname(filePath);
    
    // Check if the filepath has a directory
    if (!dir || dir === '.') {
        filePath = path.join('./scrapes', base);
    } else {
        // Security: Ensure the resolved path is within safe boundaries
        const resolvedPath = path.resolve(dir, base);
        const safePath = path.resolve('./scrapes');
        
        if (!resolvedPath.startsWith(safePath) && !resolvedPath.startsWith(path.resolve('.'))) {
            throw new Error('Invalid file path: path must be within current directory or scrapes folder');
        }
        
        filePath = path.join(dir, base);
    }

    return filePath;
}

export function myParseInt(value: string, _dummyPrevious: any) {
    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
        throw new InvalidArgumentError('Not a number.');
    }
    return parsedValue;
}

export function myParseDecimal(value: string, _dummyPrevious: any) {
    // parseFloat takes a string
    const parsedValue = parseFloat(value);
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
        throw new Error(`Failed to read CSV file: ${filePath}`);
    }
}

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function parseCSV(csvData: string): any {
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
        // Input validation
        if (!filename || typeof filename !== 'string') {
            throw new Error('Invalid filename: filename must be a non-empty string');
        }

        // Security: Prevent directory traversal attacks
        if (filename.includes('..') || filename.includes('~')) {
            throw new Error('Invalid filename: filename cannot contain ".." or "~"');
        }

        // Security: Restrict to safe characters
        const safePathRegex = /^[a-zA-Z0-9._/-]+$/;
        if (!safePathRegex.test(filename)) {
            throw new Error('Invalid filename: filename contains unsafe characters');
        }

        // Check if file exists
        if (!fs.existsSync(filename)) {
            throw new Error(`File does not exist: ${filename}`);
        }

        const image = await Jimp.read(filename);
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        const headerSize = options.header || 0;
        const footerSize = options.footer || 0;
        
        // Validate header and footer sizes
        if (headerSize < 0 || footerSize < 0) {
            throw new Error('Header and footer sizes must be non-negative');
        }
        
        if (headerSize > height || footerSize > height) {
            throw new Error('Header or footer size exceeds image height');
        }
        
        if (headerSize === 0 && footerSize === 0) {
            throw new Error('Header and footer size cannot be both 0');
        }
        
        if (headerSize > 0) {
            const header = image.clone().crop({ x: 0, y: 0, w: width, h: headerSize });
            const headerFilename = `${filename.split('.').slice(0, -1).join('.')}_header_h${headerSize}.png` as `${string}.${string}`;
            await header.write(headerFilename);
            console.log(`Header segment created: ${headerFilename}`);
        }

        // Create footer segment
        if (footerSize > 0) {
            const footer = image.clone().crop({ x: 0, y: height - footerSize, w: width, h: footerSize });
            const footerFilename = `${filename.split('.').slice(0, -1).join('.')}_footer_h${footerSize}.png` as `${string}.${string}`;
            await footer.write(footerFilename);
            console.log(`Footer segment created: ${footerFilename}`);
        }

    } catch (err) {
        console.error(`Error processing image: `, (err as Error).message);
        throw err;
    }
}
// define your custom headers
const requestHeaders = {
    Referer: 'https://www.google.com/',
};

export async function takeAScreenshotPuppeteer(url: string, path: string, width: number) {
    let browser: any = null;
    let semaphoreAcquired = false;
    
    try {
        // Validate the input
        if (url === undefined || url === '') {
            throw new Error(`Invalid URL: ${url}`);
        }
        if (!URL.canParse(url)) {
            //confirm that url has a protocol
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
        }
        let urlObj = new URL(url);
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            throw new Error(`Invalid URL protocol: ${urlObj.protocol}, protocol must be http or https`);
        }
        if (path === undefined || path === '') {
            throw new Error(`Invalid path`);
        }
        if (width === undefined) {
            throw new Error(`Invalid width`);
        }
        if (width < 0) {
            throw new Error(`Invalid width: ${width}, width must be greater than 0`);
        }

        await semaphore.acquire();
        semaphoreAcquired = true;
        console.log(`Taking a screenshot of ${url} with width ${width} and saving it to ${path}`);
        
        browser = await puppeteer.launch({ headless: true, defaultViewport: { width: width, height: 1200 } });
        
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({ ...requestHeaders });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1.1 Safari/605.1.15');
        await page.goto(url);

        const sizes: Array<any> = await page.evaluate(() => [document.body.scrollWidth, document.body.scrollHeight]) as any[];
        console.log(`page size is ${sizes}, type ${typeof sizes} json ${JSON.stringify(sizes)} width: ${sizes[0]} height: ${sizes[1]}`);
        await page.screenshot({ path: path, fullPage: true });
        
        return { url, path, width, sizes };
    } catch (e) {
        console.error(`Error taking screenshot of ${url}:`, (e as Error).message);
        throw e;
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (e) {
                console.error('Error closing browser:', (e as Error).message);
            }
        }
        if (semaphoreAcquired) {
            semaphore.release();
        }
    }
} const semaphore = new Semaphore(2); // Limit to 2 concurrent tasks

export function validJSON(str: string): boolean {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

export interface CMSPluginResult {
    name: string;
    version?: string;
    description?: string;
    author?: string;
    homepage?: string;
    [key: string]: any; // for future extensibility
}
export interface CMSDetectionResult {
    error?: string | undefined;
    cms: "WordPress" | "Joomla" | "Drupal" | "Unknown";
    version?: string;
    plugins?: CMSPluginResult[]; // for WordPress plugins
    [key: string]: any; // for future extensibility
}

export async function detectCMS(url: string): Promise<CMSDetectionResult> {
    // Validate the input
    if (url === undefined || url === '') {
        console.error(`Invalid URL: ${url}`);
        return { cms: "Unknown", error: "Invalid URL" };
    }
    if (!URL.canParse(url)) {
        //confirm that url has a protocol
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
    }
    let urlObj = new URL(url);
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        console.error(`Invalid URL protocol: ${urlObj.protocol}, protocol must be http or https`);
        return { cms: "Unknown", error: "Invalid URL protocol" };
    }

    const browser = await puppeteer.launch({ headless: true });
    try {
        const page = await browser.newPage();
        let result: CMSDetectionResult = { cms: "Unknown" };

        const mainResponse = await page.goto(url, { waitUntil: "domcontentloaded" });
        if (mainResponse) {
            console.log(`Headers for ${url}:`);
            console.dir(mainResponse.headers(), { depth: 1, colors: true });
        }

        // --- WordPress ---
        const hasWpMeta = await page.$eval(
            'meta[name="generator"]',
            el => (el as HTMLMetaElement).content.toLowerCase(),
        ).catch(() => "");
        if (hasWpMeta.includes("wordpress")) {
            result = { error: "success", cms: "WordPress", version: hasWpMeta.match(/wordpress\s*([\d.]+)/i)?.[1] };
        }

        const html = await page.content();
        if (
            html.includes("/wp-content/") ||
            html.includes("/wp-includes/") ||
            html.includes("/wp-json/") ||
            html.includes("wp-")
        ) {
            result.cms = "WordPress";
            result.version = hasWpMeta.match(/wordpress\s*([\d.]+)/i)?.[1];
            const pluginRegex = /\/wp-content\/plugins\/([a-zA-Z0-9-_]+)\//g;
            const foundPlugins = new Set<string>();
            let match;
            while ((match = pluginRegex.exec(html)) !== null) {
                // Add the plugin slug to the set
                foundPlugins.add(match[1]);
            }
            // foundPlugins now contains plugin slugs that are publicly referenced
            if (foundPlugins.size > 0) {
                console.log(`Found WordPress plugins: ${Array.from(foundPlugins).join(", ")}`);
                result.plugins = Array.from(foundPlugins).map(plugin => ({ name: plugin }));
            } else {
                console.log("No WordPress plugins found in the HTML content.");
            }
        }
        const wpJsonResp = await page.goto(url.replace(/\/$/, "") + "/wp-json/", { waitUntil: "domcontentloaded" }).catch(() => null);
        if (wpJsonResp && wpJsonResp.status() === 200) {
            const json = await wpJsonResp.json().catch(() => null);
            if (json) {
                console.log(`Found WordPress JSON data:`);
                console.dir(json, { depth: 1, colors: true });
                result.error = "success";
                result.cms = "WordPress";
                result.version = json.wordpress?.version || hasWpMeta.match(/wordpress\s*([\d.]+)/i)?.[1];
                // if (json.plugins) {
                //     const plugins = Object.keys(json.plugins).map(plugin => {
                //         return { name: plugin, version: json.plugins[plugin].version };
                //     });
                //     result.plugins = plugins;
                // }
                const pluginResponse = await page.goto(url.replace(/\/$/, "") + "/wp-json/wp/v2/plugins", { waitUntil: "domcontentloaded" }).catch(() => null);
                if (pluginResponse && pluginResponse.status() === 200) {
                    const pluginJson = await pluginResponse.json().catch(() => null);
                    if (pluginJson && Array.isArray(pluginJson)) {
                        console.log(`Found WordPress plugins JSON data:`);
                        console.dir(pluginJson, { depth: 1, colors: true });
                    }
                } else {
                    console.log(`pluginResponse is null or not 200: ${pluginResponse?.status()}`);
                }
            }
            console.log('trying to get WordPress types JSON data');
            const typesResponse = await page.goto(url.replace(/\/$/, "") + "/wp-json/wp/v2/types", { waitUntil: "domcontentloaded" }).catch(() => null);
            if (typesResponse && typesResponse.status() === 200) {
                const pluginJson = await typesResponse.json().catch(() => null);
                if (pluginJson) {
                    console.log(`Found WordPress types JSON data:`);
                    console.dir(pluginJson, { depth: 1, colors: true });
                }
            } else {
                console.log(`typesResponse is null or not 200: ${typesResponse?.status()}`);
            }

            const jsonText = await wpJsonResp.text();
            if (jsonText.includes("wp-json")) {
                const jsonData = JSON.parse(jsonText);
                if (jsonData && jsonData.wordpress) {
                    console.log(`Found WordPress JSON data: ${JSON.stringify(jsonData)}`);
                    result.error = "success";
                    result.cms = "WordPress";
                    result.version = jsonData.wordpress.version || hasWpMeta.match(/wordpress\s*([\d.]+)/i)?.[1];
                }
            }
        };
        if (result.cms === "WordPress") {
            return result;
        }
        // --- Joomla ---
        const hasJoomlaMeta = await page.$eval(
            'meta[name="generator"]',
            el => (el as HTMLMetaElement).content.toLowerCase(),
        ).catch(() => "");
        if (hasJoomlaMeta.includes("joomla")) {
            console.log(`Found Joomla meta tag: ${hasJoomlaMeta}`);
            return { cms: "Joomla", version: hasJoomlaMeta.match(/joomla!\s*([\d.]+)/i)?.[1] };
        }
        if (
            html.includes("content=\"Joomla!") ||
//            html.includes("/media/system/js/") ||
//            html.includes("com_content") ||
            html.includes("joomla")
        ) {
            console.log(`Found Joomla content in HTML`);
            return { cms: "Joomla" };
        }

        // --- Drupal ---
        const hasDrupalMeta = await page.$eval(
            'meta[name="generator"]',
            el => (el as HTMLMetaElement).content.toLowerCase(),
        ).catch(() => "");
        if (hasDrupalMeta.includes("drupal")) {
            console.log(`Found Drupal meta tag: ${hasDrupalMeta}`);
            return { cms: "Drupal", version: hasDrupalMeta.match(/drupal\s*([\d.]+)/i)?.[1] };
        }
        if (
            html.includes("/sites/all/") ||
            html.includes("/misc/drupal.js") ||
            html.includes("drupal-settings-json") ||
            html.includes("Drupal.settings")
        ) {
            console.log(`Found Drupal content in HTML`);
            return { cms: "Drupal" };
        }
        const drupalChangelog = await page.goto(url.replace(/\/$/, "") + "/CHANGELOG.txt", { waitUntil: "domcontentloaded" }).catch(() => null);
        if (drupalChangelog && drupalChangelog.status() === 200) {
            const text = await drupalChangelog.text();
            if (text.includes("Drupal")) return { cms: "Drupal" };
        }

        return { cms: "Unknown" };
    } catch (error) {
        console.error(`Error detecting CMS for ${url}:`, (error as  Error).message);
        return { cms: "Unknown", error: (error as Error).message };
    } finally {
        await browser.close();
    }
}
