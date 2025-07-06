import { getConfig } from './config.js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { Jimp } from 'jimp';
import { InvalidArgumentError } from 'commander';
import { createModuleLogger } from './logger.js';
import { loadCSVFromFile, validateFilePath } from './file/index.js';

const logger = createModuleLogger('utils');


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

// Re-export file operations for backward compatibility
export { analyzeFilePath, loadCSVFromFile, validateFilePath } from './file/index.js';

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

// loadCSVFromFile moved to src/utils/file/operations.ts

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
    const startTime = Date.now();
    try {
        logger.debug(`Starting image segmentation for: ${filename}`, { options });
        
        // Validate file path and security using the new file operations module
        validateFilePath(filename);
        
        // Check if file exists
        if (!fs.existsSync(filename)) {
            throw new Error(`File does not exist: ${filename}`);
        }

        const image = await Jimp.read(filename);
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        logger.debug(`Image dimensions: ${width}x${height}`);

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
            logger.info(`Header segment created: ${headerFilename}`, { headerSize });
        }

        // Create footer segment
        if (footerSize > 0) {
            const footer = image.clone().crop({ x: 0, y: height - footerSize, w: width, h: footerSize });
            const footerFilename = `${filename.split('.').slice(0, -1).join('.')}_footer_h${footerSize}.png` as `${string}.${string}`;
            await footer.write(footerFilename);
            logger.info(`Footer segment created: ${footerFilename}`, { footerSize });
        }

        const duration = Date.now() - startTime;
        logger.performance('Image segmentation', duration);

    } catch (err) {
        logger.error(`Error processing image: ${filename}`, { filename, options }, err as Error);
        throw err;
    }
}

// Lazy semaphore initialization
let semaphore: Semaphore | null = null;
export function getSemaphore(): Semaphore {
    if (!semaphore) {
        semaphore = new Semaphore(getConfig().puppeteer.maxConcurrency);
    }
    return semaphore;
}

export function validJSON(str: string): boolean {
    try {
        JSON.parse(str);
    } catch {
        return false;
    }
    return true;
}

// Auto-detect if input is URL or CSV file
export function detectInputType(input: string): 'url' | 'csv' {
    // Check for .csv extension first
    if (input.toLowerCase().endsWith('.csv')) {
        return 'csv';
    }
    
    // Check if it's a URL
    if (input.startsWith('http://') || input.startsWith('https://')) {
        return 'url';
    }
    
    // Try parsing as URL
    try {
        new URL(input.startsWith('http') ? input : `https://${input}`);
        return 'url';
    } catch {
        // If URL parsing fails, assume it's a file
        return 'csv';
    }
}

// Extract URLs from CSV with flexible column detection
export function extractUrlsFromCSV(csvPath: string): string[] {
    const csvData = loadCSVFromFile(csvPath);
    const lines = parseCSV(csvData);
    
    if (lines.length === 0) {
        throw new Error('CSV file is empty');
    }
    
    // Find the URL column (case-insensitive)
    const header = lines[0].map((col: string) => col.toLowerCase().trim());
    const urlColumnIndex = header.findIndex((col: string) => 
        col === 'url' || col === 'urls' || col === 'website' || col === 'link'
    );
    
    if (urlColumnIndex === -1) {
        throw new Error('No URL column found. Expected column names: url, urls, website, or link');
    }
    
    // Extract URLs from the identified column (skip header)
    const urls: string[] = [];
    for (let i = 1; i < lines.length; i++) {
        const url = lines[i][urlColumnIndex]?.trim();
        if (url && url.length > 0) {
            urls.push(url);
        }
    }
    
    if (urls.length === 0) {
        throw new Error('No valid URLs found in CSV file');
    }
    
    return urls;
}

// Clean URL for display (remove protocol)
export function cleanUrlForDisplay(url: string): string {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// CMS detection types and functions moved to src/utils/cms/
// Re-export for backward compatibility
export { 
    detectCMS, 
    CMSDetectionResult, 
    CMSPluginResult,
    CMSType
} from './cms/index.js';

// Screenshot functionality moved to src/utils/screenshot/
// Re-export for backward compatibility
export {
    takeScreenshot,
    takeAScreenshotPuppeteer,
    ScreenshotOptions,
    ScreenshotResult,
    ScreenshotError,
    ScreenshotService
} from './screenshot/index.js';

// detectCMS function moved to src/utils/cms/index.ts
// The original 207-line monolithic function has been refactored into a modular system
// takeAScreenshotPuppeteer function moved to src/utils/screenshot/index.ts
// The original 100+ line function has been refactored into a modular service-based system
