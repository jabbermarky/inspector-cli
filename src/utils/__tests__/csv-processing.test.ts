import fs from 'fs';
import path from 'path';
import {
    parseCSV,
    extractUrlsFromCSV,
    detectInputType,
    cleanUrlForDisplay
} from '../utils';

describe('CSV Processing Functions', () => {
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
        } catch (error) {
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
});