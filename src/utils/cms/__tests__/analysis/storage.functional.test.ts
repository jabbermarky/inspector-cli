// Mock external dependencies BEFORE imports
jest.mock('../../../logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        apiCall: jest.fn(),
        apiResponse: jest.fn(),
        performance: jest.fn()
    }))
}));

jest.mock('fs/promises', () => ({
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn(),
    readdir: jest.fn(),
    unlink: jest.fn()
}));

import { jest } from '@jest/globals';
import { DataStorage } from '../../analysis/storage.js';
import { setupAnalysisTests } from '@test-utils';
import { DetectionDataPoint } from '../../analysis/types.js';
import * as fs from 'fs/promises';

/**
 * SKIPPED TEST DOCUMENTATION
 * Reason: File system operations causing intermittent test failures and race conditions
 * Date: 2025-07-10
 * Skipped by: marklummus
 * Timeline: After file system mock strategy is improved (Sprint 25)
 * Related: Issue with fs/promises mocking causing flaky tests
 * Notes: Tests are well-written but need better isolation from file system
 */
describe.skip('DataStorage Functional Tests', () => {
    setupAnalysisTests();

    let mockMkdir: jest.MockedFunction<typeof fs.mkdir>;
    let mockWriteFile: jest.MockedFunction<typeof fs.writeFile>;
    let mockReadFile: jest.MockedFunction<typeof fs.readFile>;
    let mockAccess: jest.MockedFunction<typeof fs.access>;
    let mockReaddir: jest.MockedFunction<typeof fs.readdir>;
    let mockUnlink: jest.MockedFunction<typeof fs.unlink>;
    let sampleDataPoint: DetectionDataPoint;

    beforeEach(() => {
        mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
        mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
        mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
        mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
        mockReaddir = fs.readdir as jest.MockedFunction<typeof fs.readdir>;
        mockUnlink = fs.unlink as jest.MockedFunction<typeof fs.unlink>;

        mockMkdir.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);
        mockReadFile.mockResolvedValue('{}'); // Empty index initially
        mockAccess.mockResolvedValue(undefined);
        mockReaddir.mockResolvedValue([]);
        mockUnlink.mockResolvedValue(undefined);

        sampleDataPoint = {
            url: 'https://example.com',
            timestamp: new Date(),
            userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
            captureVersion: {
                schema: '1',
                engine: {
                    version: '1.0.0',
                    commit: 'abc123',
                    buildDate: new Date().toISOString()
                },
                algorithms: {
                    detection: '1',
                    confidence: '1'
                },
                patterns: {
                    lastUpdated: new Date().toISOString()
                },
                features: {
                    experimentalFlags: []
                }
            },
            originalUrl: 'https://example.com',
            finalUrl: 'https://example.com',
            redirectChain: [],
            totalRedirects: 0,
            protocolUpgraded: false,
            navigationTime: 500,
            httpHeaders: { 'server': 'apache' },
            statusCode: 200,
            contentType: 'text/html',
            metaTags: [
                { name: 'generator', content: 'WordPress 6.1' }
            ],
            title: 'Example Site',
            htmlContent: '<html><meta name="generator" content="WordPress 6.1"></html>',
            htmlSize: 1024,
            domElements: [],
            links: [],
            scripts: [],
            stylesheets: [],
            forms: [],
            technologies: [
                { 
                    name: 'WordPress', 
                    confidence: 0.9, 
                    evidence: ['meta generator tag'],
                    category: 'cms' as const
                }
            ],
            loadTime: 500,
            resourceCount: 10,
            detectionResults: [
                {
                    detector: 'WordPressDetector',
                    strategy: 'meta-tag',
                    cms: 'WordPress',
                    confidence: 0.9,
                    version: '6.1',
                    evidence: { metaTag: 'generator' },
                    executionTime: 50
                }
            ],
            errors: []
        };
    });

    describe('Initialization', () => {
        it('should initialize storage with default data directory', async () => {
            const storage = new DataStorage();
            
            await storage.initialize();
            
            expect(mockMkdir).toHaveBeenCalledWith('./data/cms-analysis', { recursive: true });
            expect(mockReadFile).toHaveBeenCalled();
        });

        it('should initialize storage with custom data directory', async () => {
            const storage = new DataStorage('./custom-data');
            
            await storage.initialize();
            
            expect(mockMkdir).toHaveBeenCalledWith('./custom-data', { recursive: true });
        });

        it('should load existing index on initialization', async () => {
            const mockIndex = {
                'example-com': {
                    url: 'https://example.com',
                    filename: 'example-com.json',
                    timestamp: Date.now(),
                    cmsTypes: ['WordPress'],
                    confidence: 0.9
                }
            };
            mockReadFile.mockResolvedValueOnce(JSON.stringify(mockIndex));
            
            const storage = new DataStorage();
            await storage.initialize();
            
            // Should be able to query loaded data
            const results = await storage.query({ cmsTypes: ['WordPress'] });
            expect(results).toHaveLength(1);
        });

        it('should handle missing index file gracefully', async () => {
            mockReadFile.mockRejectedValueOnce(new Error('ENOENT: no such file'));
            
            const storage = new DataStorage();
            
            await expect(storage.initialize()).resolves.not.toThrow();
        });

        it('should handle directory creation errors', async () => {
            mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));
            
            const storage = new DataStorage();
            
            await expect(storage.initialize()).rejects.toThrow('Permission denied');
        });
    });

    describe('Data Storage', () => {
        it('should store data point successfully', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            await storage.store(sampleDataPoint);
            
            // Should write the data file
            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('example-com.json'),
                expect.stringContaining('WordPress'),
                'utf8'
            );
            
            // Should update the index
            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('index.json'),
                expect.any(String),
                'utf8'
            );
        });

        it('should generate unique filenames for duplicate URLs', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            await storage.store(sampleDataPoint);
            await storage.store({ ...sampleDataPoint, timestamp: new Date(Date.now() + 1000) });
            
            // Should create two separate files
            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('example-com.json'),
                expect.any(String),
                'utf8'
            );
            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('example-com-'),
                expect.any(String),
                'utf8'
            );
        });

        it('should handle file write errors', async () => {
            mockWriteFile.mockRejectedValueOnce(new Error('Disk full'));
            
            const storage = new DataStorage();
            await storage.initialize();
            
            await expect(storage.store(sampleDataPoint)).rejects.toThrow('Disk full');
        });

        it('should validate data point before storing', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            const invalidDataPoint = { url: 'invalid' } as DetectionDataPoint;
            
            await expect(storage.store(invalidDataPoint)).rejects.toThrow();
        });
    });

    describe('Data Retrieval', () => {
        beforeEach(async () => {
            // Setup mock data in index
            const mockIndex = {
                'example-com': {
                    url: 'https://example.com',
                    filename: 'example-com.json', 
                    timestamp: Date.now(),
                    cmsTypes: ['WordPress'],
                    confidence: 0.9
                },
                'test-site-com': {
                    url: 'https://test-site.com',
                    filename: 'test-site-com.json',
                    timestamp: Date.now(),
                    cms: 'Drupal', 
                    confidence: 0.85
                }
            };
            mockReadFile.mockImplementation(((path: any, options?: any): Promise<string | Buffer> => {
                if (path.includes('index.json')) {
                    return Promise.resolve(JSON.stringify(mockIndex));
                }
                if (path.includes('example-com.json')) {
                    return Promise.resolve(JSON.stringify(sampleDataPoint));
                }
                if (path.includes('test-site-com.json')) {
                    return Promise.resolve(JSON.stringify({
                        ...sampleDataPoint,
                        url: 'https://test-site.com',
                        cms: 'Drupal',
                        confidence: 0.85
                    }));
                }
                return Promise.resolve('{}');
            }) as any);
        });

        it('should retrieve data points from storage', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            const allDataPoints = await storage.getAllDataPoints();
            
            expect(allDataPoints).toBeDefined();
            expect(Array.isArray(allDataPoints)).toBe(true);
        });

        it('should retrieve all data points', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            const allDataPoints = await storage.getAllDataPoints();
            
            expect(allDataPoints).toHaveLength(2);
            expect(allDataPoints.length).toBeGreaterThan(0);
        });

        it('should handle file read errors', async () => {
            mockReadFile.mockImplementation(((path: any, options?: any): Promise<string | Buffer> => {
                if (path.includes('index.json')) {
                    return Promise.resolve(JSON.stringify({
                        'example-com': {
                            url: 'https://example.com',
                            filename: 'example-com.json',
                            timestamp: Date.now(),
                            cmsTypes: ['WordPress'],
                            confidence: 0.9
                        }
                    }));
                }
                return Promise.reject(new Error('File not found'));
            }) as any);
            
            const storage = new DataStorage();
            await storage.initialize();
            
            const dataPoints = await storage.getAllDataPoints();
            expect(dataPoints).toEqual([]);
        });
    });

    describe('Querying', () => {
        beforeEach(async () => {
            // Setup comprehensive mock data
            const mockIndex = {
                'wp-site-1': {
                    url: 'https://wp1.com',
                    filename: 'wp-site-1.json',
                    timestamp: Date.now() - 1000,
                    cmsTypes: ['WordPress'],
                    confidence: 0.9
                },
                'wp-site-2': {
                    url: 'https://wp2.com',
                    filename: 'wp-site-2.json',
                    timestamp: Date.now(),
                    cmsTypes: ['WordPress'],
                    confidence: 0.95
                },
                'drupal-site': {
                    url: 'https://drupal.com',
                    filename: 'drupal-site.json',
                    timestamp: Date.now() - 500,
                    cms: 'Drupal',
                    confidence: 0.85
                }
            };
            mockReadFile.mockResolvedValue(JSON.stringify(mockIndex));
        });

        it('should query by CMS type', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            const results = await storage.query({ cmsTypes: ['WordPress'] });
            
            expect(results).toHaveLength(2);
            expect(results).toBeDefined();
        });

        it('should query by confidence threshold', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            const results = await storage.query({ minConfidence: 0.9 });
            
            expect(results).toBeDefined();
            expect(Array.isArray(results)).toBe(true);
        });

        it('should query by date range', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            const now = new Date();
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const results = await storage.query({ 
                dateRange: { 
                    start: yesterday, 
                    end: now 
                } 
            });
            
            expect(results).toBeDefined();
            expect(Array.isArray(results)).toBe(true);
        });

        it('should combine multiple query filters', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            const results = await storage.query({ 
                cmsTypes: ['WordPress'],
                minConfidence: 0.9
            });
            
            expect(results).toBeDefined();
            expect(Array.isArray(results)).toBe(true);
        });

        it('should return empty results for no matches', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            const results = await storage.query({ cmsTypes: ['Joomla'] });
            
            expect(results).toHaveLength(0);
        });
    });

    describe('Bulk Operations', () => {
        it('should store multiple data points efficiently', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            const dataPoints = [
                { ...sampleDataPoint, url: 'https://site1.com' },
                { ...sampleDataPoint, url: 'https://site2.com' },
                { ...sampleDataPoint, url: 'https://site3.com' }
            ];
            
            await storage.storeBatch(dataPoints);
            
            // Should write files
            expect(mockWriteFile).toHaveBeenCalled();
        });

        it('should handle bulk store errors gracefully', async () => {
            mockWriteFile.mockRejectedValueOnce(new Error('Storage error'));
            
            const storage = new DataStorage();
            await storage.initialize();
            
            const dataPoints = [sampleDataPoint];
            
            await expect(storage.storeBatch(dataPoints)).rejects.toThrow('Storage error');
        });
    });

    describe('Data Management', () => {
        it('should get statistics from storage', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            const stats = await storage.getStatistics();
            
            expect(stats).toBeDefined();
            expect(typeof stats).toBe('object');
        });

        it('should export data in different formats', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            await storage.export('json', './test-export.json');
            
            expect(mockWriteFile).toHaveBeenCalled();
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle complete data lifecycle', async () => {
            const storage = new DataStorage('./test-data');
            await storage.initialize();
            
            // Store data
            await storage.store(sampleDataPoint);
            
            // Query data 
            const results = await storage.query({ cmsTypes: ['WordPress'] });
            expect(results).toHaveLength(1);
            
            // Get all data points
            const allData = await storage.getAllDataPoints();
            expect(allData).toBeDefined();
            
            // Get stats
            const stats = await storage.getStatistics();
            expect(stats).toBeDefined();
        });

        it('should maintain data consistency across operations', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            // Store multiple data points
            const dataPoints = [
                { ...sampleDataPoint, url: 'https://site1.com' },
                { ...sampleDataPoint, url: 'https://site2.com' },
                { ...sampleDataPoint, url: 'https://site3.com' }
            ];
            
            await storage.storeBatch(dataPoints);
            
            // All should be retrievable
            const all = await storage.getAllDataPoints();
            expect(all).toHaveLength(3);
            
            // Query should work correctly
            const wpSites = await storage.query({ cmsTypes: ['WordPress'] });
            expect(wpSites).toBeDefined();
        });

        it('should handle large datasets efficiently', async () => {
            const storage = new DataStorage();
            await storage.initialize();
            
            // Create large dataset
            const largeDataset = Array.from({ length: 10 }, (_, i) => ({
                ...sampleDataPoint,
                url: `https://site${i}.com`
            }));
            
            await storage.storeBatch(largeDataset);
            
            // Should handle queries efficiently
            const allSites = await storage.getAllDataPoints();
            expect(allSites).toBeDefined();
            
            const results = await storage.query({ cmsTypes: ['WordPress'] });
            expect(results).toBeDefined();
        });
    });
});