import fs from 'fs';
import path from 'path';
import process from 'process';
import { parse } from 'csv-parse/sync';
import { Jimp } from 'jimp';

export class Semaphore {
    constructor(max) {
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
            next();
        } else {
            this.counter--;
        }
    }
}

// Example usage
async function example() {
    const semaphore = new Semaphore(2);

    const task = async (id) => {
        await semaphore.acquire();
        console.log(`Task ${id} started`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async work
        console.log(`Task ${id} finished`);
        semaphore.release();
    };

    for (let i = 1; i <= 5; i++) {
        task(i);
    }
}

export function analyzeFilePath(filePath, width) {

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
} export function myParseInt(value, dummyPrevious) {
    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
        throw new commander.InvalidArgumentError('Not a number.');
    }
    return parsedValue;
}
export function loadCSVFromFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data;
    } catch (err) {
        console.error(`Error reading file from disk: ${err}`);
        process.exit(1);
    }
}
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function parseCSV(csvData) {
    return parse(csvData, {
        columns: false,
        skip_empty_lines: true,
        trim: true,
        quote: '"',
        escape: '"'
    });
}
/**
 * 
 * SegmentImageHeaderFooterOptions
 * @typedef {Object} SegmentImageHeaderFooterOptions
 * @property {number} header - Size of the header segment
 * @property {number} footer - Size of the footer segment
 */

/**
 * segmentImageHeaderFooter - Create image segments from the header and footer of an image
 * @param {string} filename 
 * @param {SegmentImageHeaderFooterOptions} options 
 */
export async function segmentImageHeaderFooter(filename, options) {
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
            const header = image.clone().crop({ x:0, y:0, w:width, h:headerSize });
            const headerFilename = `${filename.split('.').slice(0, -1).join('.')}_header_${headerSize}.png`;
            await header.write(headerFilename);
            console.log(`Header segment created: ${headerFilename}`);
        }

        // Create footer segment
        if (footerSize > 0) {
            const footer = image.clone().crop({ x:0, y:height - footerSize, w:width, h:footerSize});
            const footerFilename = `${filename.split('.').slice(0, -1).join('.')}_footer_${footerSize}.png`;
            await footer.write(footerFilename);
            console.log(`Footer segment created: ${footerFilename}`);
        }

    } catch (err) {
        console.error(`Error processing image: `, err);
    }
}
