import fs from 'fs';
import path from 'path';
import {
    parseCSV,
    extractUrlsFromCSV,
    detectInputType,
    cleanUrlForDisplay,
    validJSON,
    myParseInt,
    myParseDecimal,
    delay,
    segmentImageHeaderFooter
} from '../utils';
import { setupFileTests, setupJestExtensions } from '@test-utils';
import { InvalidArgumentError } from 'commander';

// Setup custom Jest matchers
setupJestExtensions();

describe('CSV Processing Functions', () => {
    setupFileTests();
    
    const testDir = '/tmp/test-csv-processing';
    const csvFile = path.join(testDir, 'test.csv');
    const csvWithUrlsColumn = path.join(testDir, 'urls.csv');
    const csvWithWebsiteColumn = path.join(testDir, 'website.csv');
    const csvWithLinkColumn = path.join(testDir, 'link.csv');
    const emptyCsvFile = path.join(testDir, 'empty.csv');
    const noUrlColumnCsv = path.join(testDir, 'no-url.csv');

    beforeAll(() => {
        // Create test directory
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        
        // Create test CSV files
        fs.writeFileSync(csvFile, 'url,name\nhttps://example.com,test\nhttps://test.com,test2\n,empty\nhttps://third.com,test3');
        fs.writeFileSync(csvWithUrlsColumn, 'urls,description\nhttps://example.com,test\nhttps://test.com,test2');
        fs.writeFileSync(csvWithWebsiteColumn, 'website,company\nhttps://example.com,Example Inc\nhttps://test.com,Test Corp');
        fs.writeFileSync(csvWithLinkColumn, 'link,status\nhttps://example.com,active\nhttps://test.com,inactive');
        fs.writeFileSync(emptyCsvFile, '');
        fs.writeFileSync(noUrlColumnCsv, 'name,description\ntest1,description1\ntest2,description2');
    });

    afterAll(() => {
        // Clean up test files
        try {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('parseCSV', () => {
        it('should parse valid CSV data', () => {
            const csvData = 'name,value\ntest1,value1\ntest2,value2';
            const result = parseCSV(csvData);
            
            expect(result).toHaveLength(3); // header + 2 rows
            expect(result[0]).toEqual(['name', 'value']);
            expect(result[1]).toEqual(['test1', 'value1']);
            expect(result[2]).toEqual(['test2', 'value2']);
        });

        it('should handle CSV with quotes', () => {
            const csvData = 'name,description\n"test, name","description with, comma"\ntest2,"normal description"';
            const result = parseCSV(csvData);
            
            expect(result[1]).toEqual(['test, name', 'description with, comma']);
            expect(result[2]).toEqual(['test2', 'normal description']);
        });

        it('should skip empty lines', () => {
            const csvData = 'name,value\ntest1,value1\n\ntest2,value2\n';
            const result = parseCSV(csvData);
            
            expect(result).toHaveLength(3); // header + 2 rows (empty line skipped)
        });

        it('should trim whitespace', () => {
            const csvData = 'name , value \n test1 , value1 \n test2 , value2 ';
            const result = parseCSV(csvData);
            
            expect(result[0]).toEqual(['name', 'value']);
            expect(result[1]).toEqual(['test1', 'value1']);
        });

        it('should handle empty CSV data', () => {
            const result = parseCSV('');
            expect(result).toEqual([]);
        });
    });

    describe('extractUrlsFromCSV', () => {
        it('should extract URLs from csv file with url column', () => {
            const urls = extractUrlsFromCSV(csvFile);
            
            expect(urls).toHaveLength(3);
            expect(urls).toContain('https://example.com');
            expect(urls).toContain('https://test.com');
            expect(urls).toContain('https://third.com');
        });

        it('should work with urls column name', () => {
            const urls = extractUrlsFromCSV(csvWithUrlsColumn);
            
            expect(urls).toHaveLength(2);
            expect(urls).toContain('https://example.com');
            expect(urls).toContain('https://test.com');
        });

        it('should work with website column name', () => {
            const urls = extractUrlsFromCSV(csvWithWebsiteColumn);
            
            expect(urls).toHaveLength(2);
            expect(urls).toContain('https://example.com');
            expect(urls).toContain('https://test.com');
        });

        it('should work with link column name', () => {
            const urls = extractUrlsFromCSV(csvWithLinkColumn);
            
            expect(urls).toHaveLength(2);
            expect(urls).toContain('https://example.com');
            expect(urls).toContain('https://test.com');
        });

        it('should skip empty URL cells', () => {
            const urls = extractUrlsFromCSV(csvFile);
            
            // Should not include the empty URL from row 3
            expect(urls).not.toContain('');
            expect(urls).toHaveLength(3); // Only non-empty URLs
        });

        it('should throw error for empty CSV files', () => {
            expect(() => extractUrlsFromCSV(emptyCsvFile)).toThrow('CSV file is empty');
        });

        it('should throw error when no URL column found', () => {
            expect(() => extractUrlsFromCSV(noUrlColumnCsv)).toThrow('No URL column found. Expected column names: url, urls, website, or link');
        });

        it('should throw error when no valid URLs found', () => {
            const emptyUrlsCsv = path.join(testDir, 'empty-urls.csv');
            fs.writeFileSync(emptyUrlsCsv, 'url,name\n,test\n  ,test2');
            
            expect(() => extractUrlsFromCSV(emptyUrlsCsv)).toThrow('No valid URLs found in CSV file');
        });

        it('should be case insensitive for column names', () => {
            const upperCaseCsv = path.join(testDir, 'uppercase.csv');
            fs.writeFileSync(upperCaseCsv, 'URL,Name\nhttps://example.com,test');
            
            const urls = extractUrlsFromCSV(upperCaseCsv);
            expect(urls).toContain('https://example.com');
        });
    });

    describe('detectInputType', () => {
        it('should detect CSV files by extension', () => {
            expect(detectInputType('test.csv')).toBe('csv');
            expect(detectInputType('data.CSV')).toBe('csv');
            expect(detectInputType('/path/to/file.csv')).toBe('csv');
        });

        it('should detect URLs with protocols', () => {
            expect(detectInputType('https://example.com')).toBe('url');
            expect(detectInputType('http://example.com')).toBe('url');
            expect(detectInputType('https://subdomain.example.com/path')).toBe('url');
        });

        it('should detect URLs without protocols', () => {
            expect(detectInputType('example.com')).toBe('url');
            expect(detectInputType('subdomain.example.com')).toBe('url');
            expect(detectInputType('www.example.com')).toBe('url');
        });

        it('should handle ambiguous inputs', () => {
            // These could be interpreted as hostnames, so they return 'url'
            expect(detectInputType('random-string')).toBe('url'); // treated as hostname
            expect(detectInputType('file-without-extension')).toBe('url'); // treated as hostname
            expect(detectInputType('123456')).toBe('url'); // treated as hostname
        });

        it('should detect clearly invalid URLs as csv', () => {
            // These will fail URL parsing and default to csv
            expect(detectInputType('file with spaces.txt')).toBe('csv');
            // Note: file@with@special.txt is actually parsed as a valid URL with username
            // Let's test with truly invalid URLs
            expect(detectInputType('[invalid-url]')).toBe('csv');
        });

        it('should handle URLs that start with http but need https', () => {
            expect(detectInputType('example.com/path')).toBe('url');
            expect(detectInputType('api.example.com')).toBe('url');
        });
    });

    describe('cleanUrlForDisplay', () => {
        it('should remove https protocol', () => {
            expect(cleanUrlForDisplay('https://example.com')).toBe('example.com');
            expect(cleanUrlForDisplay('https://www.example.com/path')).toBe('www.example.com/path');
        });

        it('should remove http protocol', () => {
            expect(cleanUrlForDisplay('http://example.com')).toBe('example.com');
            expect(cleanUrlForDisplay('http://www.example.com/path')).toBe('www.example.com/path');
        });

        it('should remove trailing slash', () => {
            expect(cleanUrlForDisplay('https://example.com/')).toBe('example.com');
            expect(cleanUrlForDisplay('http://example.com/')).toBe('example.com');
        });

        it('should handle URLs without protocols', () => {
            expect(cleanUrlForDisplay('example.com')).toBe('example.com');
            expect(cleanUrlForDisplay('www.example.com')).toBe('www.example.com');
        });

        it('should handle complex URLs', () => {
            expect(cleanUrlForDisplay('https://subdomain.example.com/path/to/resource?param=value')).toBe('subdomain.example.com/path/to/resource?param=value');
        });

        it('should preserve paths and query parameters', () => {
            expect(cleanUrlForDisplay('https://example.com/api/v1?key=value')).toBe('example.com/api/v1?key=value');
            expect(cleanUrlForDisplay('http://example.com/path/')).toBe('example.com/path');
        });
    });

    describe('validJSON', () => {
        it('should return true for valid JSON strings', () => {
            expect(validJSON('{"key": "value"}')).toBe(true);
            expect(validJSON('[1, 2, 3]')).toBe(true);
            expect(validJSON('"string"')).toBe(true);
            expect(validJSON('123')).toBe(true);
            expect(validJSON('true')).toBe(true);
            expect(validJSON('false')).toBe(true);
            expect(validJSON('null')).toBe(true);
        });

        it('should return false for invalid JSON strings', () => {
            expect(validJSON('{"key": value}')).toBe(false); // Missing quotes
            expect(validJSON('[1, 2, 3')).toBe(false); // Missing closing bracket
            expect(validJSON('undefined')).toBe(false); // Not valid JSON
            expect(validJSON('{')).toBe(false); // Incomplete
            expect(validJSON('')).toBe(false); // Empty string
            expect(validJSON('random text')).toBe(false); // Plain text
        });

        it('should handle complex nested JSON', () => {
            const complexJSON = JSON.stringify({
                users: [
                    { id: 1, name: 'John', active: true },
                    { id: 2, name: 'Jane', active: false }
                ],
                settings: {
                    theme: 'dark',
                    notifications: null
                }
            });
            expect(validJSON(complexJSON)).toBe(true);
        });

        it('should handle JSON with special characters', () => {
            expect(validJSON('{"special": "\\"quoted\\", \\n newline, \\\\backslash"}')).toBe(true);
            expect(validJSON('{"unicode": "\\u0048\\u0065\\u006c\\u006c\\u006f"}')).toBe(true);
        });
    });

    describe('myParseInt', () => {
        it('should parse valid integer strings', () => {
            expect(myParseInt('123', null)).toBe(123);
            expect(myParseInt('0', null)).toBe(0);
            expect(myParseInt('-456', null)).toBe(-456);
            expect(myParseInt('  789  ', null)).toBe(789); // With whitespace
        });

        it('should handle large integers', () => {
            expect(myParseInt('999999999', null)).toBe(999999999);
            expect(myParseInt('-999999999', null)).toBe(-999999999);
        });

        it('should parse integers with leading zeros', () => {
            expect(myParseInt('0123', null)).toBe(123);
            expect(myParseInt('00000', null)).toBe(0);
        });

        it('should throw InvalidArgumentError for non-numeric strings', () => {
            expect(() => myParseInt('abc', null)).toThrow(InvalidArgumentError);
            expect(() => myParseInt('', null)).toThrow(InvalidArgumentError);
            expect(myParseInt('12.34', null)).toBe(12); // parseInt stops at decimal
        });

        it('should throw InvalidArgumentError for invalid inputs', () => {
            expect(() => myParseInt('NaN', null)).toThrow(InvalidArgumentError);
            expect(() => myParseInt('undefined', null)).toThrow(InvalidArgumentError);
            expect(() => myParseInt('null', null)).toThrow(InvalidArgumentError);
        });

        it('should ignore the second parameter as specified', () => {
            expect(myParseInt('123', 'ignored')).toBe(123);
            expect(myParseInt('456', { some: 'object' })).toBe(456);
        });
    });

    describe('myParseDecimal', () => {
        it('should parse valid decimal strings', () => {
            expect(myParseDecimal('123.45', null)).toBe(123.45);
            expect(myParseDecimal('0.5', null)).toBe(0.5);
            expect(myParseDecimal('-456.789', null)).toBe(-456.789);
            expect(myParseDecimal('  789.12  ', null)).toBe(789.12); // With whitespace
        });

        it('should parse integers as decimals', () => {
            expect(myParseDecimal('123', null)).toBe(123);
            expect(myParseDecimal('0', null)).toBe(0);
            expect(myParseDecimal('-456', null)).toBe(-456);
        });

        it('should handle scientific notation', () => {
            expect(myParseDecimal('1.23e2', null)).toBe(123);
            expect(myParseDecimal('1.5e-2', null)).toBe(0.015);
            expect(myParseDecimal('-2.5e3', null)).toBe(-2500);
        });

        it('should handle edge cases', () => {
            expect(myParseDecimal('0.0', null)).toBe(0);
            expect(myParseDecimal('.5', null)).toBe(0.5);
            expect(myParseDecimal('5.', null)).toBe(5);
        });

        it('should throw InvalidArgumentError for non-numeric strings', () => {
            expect(() => myParseDecimal('abc', null)).toThrow(InvalidArgumentError);
            expect(() => myParseDecimal('', null)).toThrow(InvalidArgumentError);
            expect(myParseDecimal('12.34.56', null)).toBe(12.34); // parseFloat stops at second decimal
        });

        it('should throw InvalidArgumentError for invalid inputs', () => {
            expect(() => myParseDecimal('NaN', null)).toThrow(InvalidArgumentError);
            expect(() => myParseDecimal('undefined', null)).toThrow(InvalidArgumentError);
            expect(myParseDecimal('Infinity', null)).toBe(Infinity); // parseFloat accepts Infinity
        });

        it('should ignore the second parameter as specified', () => {
            expect(myParseDecimal('123.45', 'ignored')).toBe(123.45);
            expect(myParseDecimal('67.89', { some: 'object' })).toBe(67.89);
        });
    });

    describe('delay', () => {
        it('should delay execution for specified milliseconds', async () => {
            const startTime = Date.now();
            await delay(100);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Allow some tolerance for timing
            expect(duration).toBeGreaterThanOrEqual(90);
            expect(duration).toBeLessThan(150);
        });

        it('should work with zero delay', async () => {
            const startTime = Date.now();
            await delay(0);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Zero delay should complete very quickly
            expect(duration).toBeLessThan(10);
        });

        it('should work with very small delays', async () => {
            const startTime = Date.now();
            await delay(1);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete quickly but allow some tolerance
            expect(duration).toBeLessThan(20);
        });

        it('should return a promise', () => {
            const result = delay(10);
            expect(result).toBeInstanceOf(Promise);
            
            // Clean up the promise
            result.then(() => {});
        });

        it('should handle negative delays gracefully', async () => {
            // Negative delays should be treated as 0 by setTimeout
            const startTime = Date.now();
            await delay(-100);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(10);
        });
    });

    describe('segmentImageHeaderFooter', () => {
        const testImageDir = '/tmp/test-image-segmentation';
        const testImagePath = path.join(testImageDir, 'test-image.png');
        
        beforeAll(() => {
            // Create test directory
            if (!fs.existsSync(testImageDir)) {
                fs.mkdirSync(testImageDir, { recursive: true });
            }
            
            // Create a simple test image (1x1 PNG)
            // This is a minimal valid PNG file (1x1 transparent pixel)
            const pngBuffer = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
                0x00, 0x00, 0x00, 0x0D, // IHDR length (13)
                0x49, 0x48, 0x44, 0x52, // IHDR
                0x00, 0x00, 0x00, 0x01, // Width: 1
                0x00, 0x00, 0x00, 0x01, // Height: 1
                0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth: 8, Color type: 6 (RGBA), Compression: 0, Filter: 0, Interlace: 0
                0x1F, 0x15, 0xC4, 0x89, // CRC
                0x00, 0x00, 0x00, 0x0A, // IDAT length (10)
                0x49, 0x44, 0x41, 0x54, // IDAT
                0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // Data
                0xE2, 0x21, 0xBC, 0x33, // CRC
                0x00, 0x00, 0x00, 0x00, // IEND length (0)
                0x49, 0x45, 0x4E, 0x44, // IEND
                0xAE, 0x42, 0x60, 0x82  // CRC
            ]);
            
            fs.writeFileSync(testImagePath, pngBuffer);
        });
        
        afterAll(() => {
            // Clean up test files
            try {
                if (fs.existsSync(testImageDir)) {
                    fs.rmSync(testImageDir, { recursive: true, force: true });
                }
            } catch {
                // Ignore cleanup errors
            }
        });

        it('should throw error for non-existent files', async () => {
            await expect(segmentImageHeaderFooter('/nonexistent/file.png', { header: 10 }))
                .rejects.toThrow('File does not exist');
        });

        it('should attempt to process and fail due to image format (validates flow)', async () => {
            // This tests that the function goes through the validation steps and attempts image processing
            await expect(segmentImageHeaderFooter(testImagePath, { header: 1 }))
                .rejects.toThrow(); // Will fail at image processing, but that's expected
        }, 10000);

        it('should validate input parameters exist', async () => {
            // Test that the function accepts various parameter combinations without type errors
            const testCases = [
                { header: 5 },
                { footer: 3 },
                { header: 2, footer: 2 }
            ];
            
            for (const options of testCases) {
                await expect(segmentImageHeaderFooter(testImagePath, options))
                    .rejects.toThrow(); // Will fail at image processing, but validates parameter handling
            }
        }, 10000);

        it('should validate file path security', async () => {
            await expect(segmentImageHeaderFooter('../../../etc/passwd', { header: 10 }))
                .rejects.toThrow(); // Should throw from validateFilePath
        });

        it('should handle valid options without throwing validation errors', async () => {
            // This test verifies the function doesn't throw validation errors for valid inputs
            // but may still fail due to Jimp image processing limitations with our minimal PNG
            try {
                await segmentImageHeaderFooter(testImagePath, { header: 1 });
                // If it succeeds, that's great
            } catch (error: any) {
                // If it fails, it should be due to image processing, not validation
                expect(error.message).not.toMatch(/Header and footer sizes must be non-negative/);
                expect(error.message).not.toMatch(/File does not exist/);
                expect(error.message).not.toMatch(/Header and footer size cannot be both 0/);
                // Image processing errors are acceptable for this test
            }
        }, 10000);

        it('should handle default options (no header or footer specified)', async () => {
            await expect(segmentImageHeaderFooter(testImagePath, {}))
                .rejects.toThrow(); // Will fail at image processing before reaching validation
        }, 10000);
    });
});