import { vi } from 'vitest';

// Mock external dependencies BEFORE imports
vi.mock('../../../logger.js', () => ({
    createModuleLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        apiCall: vi.fn(),
        apiResponse: vi.fn(),
        performance: vi.fn()
    }))
}));
import { DataStorage } from '../../analysis/storage.js';
import { InMemoryFileSystemAdapter } from '../../analysis/filesystem-adapter.js';
import { setupDataStorageTests } from '../../analysis/test-setup.js';
import { 
    createTestDataPoint, 
    createWordPressDataPoint, 
    createDrupalDataPoint, 
    createJoomlaDataPoint,
    createDudaDataPoint,
    createUnknownCMSDataPoint,
    createErrorDataPoint,
    createTestDataPointBatch
} from '../../analysis/test-factories.js';

describe('DataStorage Unit Tests', () => {
    const { getStorage, getFileSystem } = setupDataStorageTests();
    
    let storage: DataStorage;
    let fileSystem: InMemoryFileSystemAdapter;
    
    beforeEach(() => {
        storage = getStorage();
        fileSystem = getFileSystem();
    });
    
    describe('Initialization', () => {
        it('should initialize successfully', async () => {
            await storage.initialize();
            
            expect(fileSystem.hasDirectory('./test-data')).toBe(true);
        });
        
        it('should handle missing index file gracefully', async () => {
            await storage.initialize();
            
            // Should not throw error when index file doesn't exist
            expect(fileSystem.hasDirectory('./test-data')).toBe(true);
        });
        
        it('should handle corrupted index file', async () => {
            // Ensure directory exists first
            await fileSystem.mkdir('./test-data', { recursive: true });
            
            // Pre-populate with invalid JSON using the correct path
            const indexFile = (storage as any).indexFile;
            await fileSystem.writeFile(indexFile, 'invalid json');
            
            await expect(storage.initialize()).rejects.toThrow();
        });
        
        it('should handle mkdir errors gracefully', async () => {
            fileSystem.setErrorConfig({
                mkdirError: new Error('EACCES: permission denied')
            });
            
            await expect(storage.initialize()).rejects.toThrow('EACCES: permission denied');
        });
    });
    
    describe('Store Operations', () => {
        beforeEach(async () => {
            await storage.initialize();
        });
        
        it('should store single data point', async () => {
            const dataPoint = createWordPressDataPoint();
            
            const fileId = await storage.store(dataPoint);
            
            expect(fileId).toBeDefined();
            expect(fileSystem.getFile(`test-data/${fileId}.json`)).toBeDefined();
            expect(fileSystem.getFile('test-data/index.json')).toContain(fileId);
        });
        
        it('should generate unique file IDs', async () => {
            const dataPoint1 = createWordPressDataPoint({ url: 'https://example1.com' });
            const dataPoint2 = createWordPressDataPoint({ url: 'https://example2.com' });
            
            const fileId1 = await storage.store(dataPoint1);
            const fileId2 = await storage.store(dataPoint2);
            
            expect(fileId1).not.toBe(fileId2);
        });
        
        it('should handle storage failures gracefully', async () => {
            fileSystem.setErrorConfig({
                writeFileError: new Error('ENOSPC: no space left on device')
            });
            
            const dataPoint = createWordPressDataPoint();
            
            await expect(storage.store(dataPoint)).rejects.toThrow('ENOSPC: no space left on device');
        });
        
        it('should handle concurrent stores safely', async () => {
            const dataPoints = Array.from({ length: 10 }, (_, i) => 
                createWordPressDataPoint({ url: `https://example${i}.com` })
            );
            
            const results = await Promise.all(
                dataPoints.map(dp => storage.store(dp))
            );
            
            expect(new Set(results).size).toBe(10); // All unique IDs
            expect(fileSystem.getFileCount()).toBe(11); // 10 data + 1 index
        });
    });
    
    describe('Batch Storage Operations', () => {
        beforeEach(async () => {
            await storage.initialize();
        });
        
        it('should store multiple data points in batch', async () => {
            const dataPoints = createTestDataPointBatch(5);
            
            const fileIds = await storage.storeBatch(dataPoints);
            
            expect(fileIds).toHaveLength(5);
            expect(new Set(fileIds).size).toBe(5); // All unique
            expect(fileSystem.getFileCount()).toBe(6); // 5 data + 1 index
        });
        
        it('should handle empty batch', async () => {
            const fileIds = await storage.storeBatch([]);
            
            expect(fileIds).toHaveLength(0);
            expect(fileSystem.getFileCount()).toBe(1); // Just index
        });
        
        it('should handle batch storage errors', async () => {
            fileSystem.setErrorConfig({
                writeFileError: new Error('ENOSPC: no space left on device')
            });
            
            const dataPoints = createTestDataPointBatch(3);
            
            await expect(storage.storeBatch(dataPoints)).rejects.toThrow('ENOSPC: no space left on device');
        });
    });
    
    describe('Query Operations', () => {
        beforeEach(async () => {
            await storage.initialize();
            
            // Store test data
            await storage.store(createWordPressDataPoint({ url: 'https://wp1.com' }));
            await storage.store(createWordPressDataPoint({ url: 'https://wp2.com' }));
            await storage.store(createDrupalDataPoint({ url: 'https://drupal1.com' }));
            await storage.store(createJoomlaDataPoint({ url: 'https://joomla1.com' }));
            await storage.store(createDudaDataPoint({ url: 'https://duda1.com' }));
            await storage.store(createUnknownCMSDataPoint({ url: 'https://unknown1.com' }));
        });
        
        it('should query by CMS type', async () => {
            const results = await storage.query({ cmsTypes: ['WordPress'] });
            
            expect(results).toHaveLength(2);
            expect(results.every(r => r.url?.includes('wp'))).toBe(true);
        });
        
        it('should query by multiple CMS types', async () => {
            const results = await storage.query({ cmsTypes: ['WordPress', 'Drupal'] });
            
            expect(results).toHaveLength(3);
        });
        
        it('should query Duda data points', async () => {
            const results = await storage.query({ cmsTypes: ['Duda'] });
            
            expect(results).toHaveLength(1);
            expect(results[0].url).toBe('https://duda1.com');
            expect(results[0].detectionResults.some(dr => dr.cms === 'Duda')).toBe(true);
        });
        
        it('should query by multiple CMS types including Duda', async () => {
            const results = await storage.query({ cmsTypes: ['WordPress', 'Duda'] });
            
            expect(results).toHaveLength(3); // 2 WordPress + 1 Duda
        });
        
        it('should query by confidence threshold', async () => {
            const results = await storage.query({ minConfidence: 0.8 });
            
            expect(results.length).toBeGreaterThan(0);
            // Verify each result has detection results with confidence >= 0.8
            results.forEach(result => {
                expect(result.detectionResults.some(dr => dr.confidence >= 0.8)).toBe(true);
            });
        });
        
        it('should query by date range', async () => {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
            
            const results = await storage.query({ 
                dateRange: { start: yesterday, end: tomorrow } 
            });
            
            expect(results.length).toBeGreaterThan(0);
        });
        
        it('should handle complex query combinations', async () => {
            const results = await storage.query({
                cmsTypes: ['WordPress'],
                minConfidence: 0.5,
                dateRange: { 
                    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    end: new Date(Date.now() + 24 * 60 * 60 * 1000)
                }
            });
            
            expect(results.length).toBeGreaterThan(0);
        });
        
        it('should return empty results for no matches', async () => {
            const results = await storage.query({ cmsTypes: ['NonExistentCMS'] });
            
            expect(results).toHaveLength(0);
        });
    });
    
    describe('Statistics Operations', () => {
        beforeEach(async () => {
            await storage.initialize();
            
            // Store test data
            await storage.storeBatch(createTestDataPointBatch(10));
        });
        
        it('should provide accurate statistics', async () => {
            const stats = await storage.getStatistics();
            
            expect(stats.totalDataPoints).toBe(10);
            expect(stats.totalSize).toBeGreaterThan(0);
            expect(stats.avgConfidence).toBeGreaterThan(0);
            expect(stats.cmsDistribution.size).toBeGreaterThan(0);
        });
        
        it('should handle empty storage statistics', async () => {
            // Clear all data
            fileSystem.clear();
            await storage.initialize();
            
            const stats = await storage.getStatistics();
            
            expect(stats.totalDataPoints).toBe(0);
            expect(stats.totalSize).toBe(0);
            expect(stats.avgConfidence).toBe(0);
            expect(stats.cmsDistribution.size).toBe(0);
        });
    });
    
    describe('Error Handling', () => {
        beforeEach(async () => {
            await storage.initialize();
        });
        
        it('should handle read errors gracefully', async () => {
            // Store some data first so there are files to read
            await storage.store(createWordPressDataPoint());
            
            // Now set the error config to simulate read failures
            fileSystem.setErrorConfig({
                readFileError: new Error('ENOENT: file not found')
            });
            
            // Query should handle the read error gracefully and return empty results
            const results = await storage.query({ cmsTypes: ['WordPress'] });
            expect(results).toHaveLength(0);
        });
        
        it('should handle index corruption', async () => {
            // Store valid data first
            await storage.store(createWordPressDataPoint());
            
            // Corrupt the index file using the correct path
            const indexFile = (storage as any).indexFile;
            await fileSystem.writeFile(indexFile, 'invalid json');
            
            // Create a new storage instance that will try to load the corrupted index
            const newStorage = new DataStorage('./test-data', 'memory');
            (newStorage as any).fileSystem = fileSystem; // Use the same filesystem
            
            // Should fail when trying to initialize with corrupted index
            await expect(newStorage.initialize()).rejects.toThrow();
        });
        
        it('should handle missing data files', async () => {
            // Store data point
            const fileId = await storage.store(createWordPressDataPoint());
            
            // Remove the data file but keep index
            await fileSystem.unlink(`test-data/${fileId}.json`);
            
            // Should handle gracefully when querying
            const results = await storage.query({ cmsTypes: ['WordPress'] });
            expect(results).toHaveLength(0);
        });
    });
    
    describe('Export Operations', () => {
        beforeEach(async () => {
            await storage.initialize();
            await storage.storeBatch(createTestDataPointBatch(3));
        });
        
        it('should export to JSON format', async () => {
            await storage.export('json', './test-data/export.json');
            
            const exportedData = fileSystem.getFile('./test-data/export.json');
            expect(exportedData).toBeDefined();
            expect(() => JSON.parse(exportedData!)).not.toThrow();
        });
        
        it('should export to JSONL format', async () => {
            await storage.export('jsonl', './test-data/export.jsonl');
            
            const exportedData = fileSystem.getFile('./test-data/export.jsonl');
            expect(exportedData).toBeDefined();
            expect(exportedData!.split('\n').length).toBe(3);
        });
        
        it('should export to CSV format', async () => {
            await storage.export('csv', './test-data/export.csv');
            
            const exportedData = fileSystem.getFile('./test-data/export.csv');
            expect(exportedData).toBeDefined();
            expect(exportedData!.includes('url,timestamp')).toBe(true);
        });
        
        it('should handle export errors', async () => {
            fileSystem.setErrorConfig({
                writeFileError: new Error('ENOSPC: no space left on device')
            });
            
            await expect(storage.export('json', './test-data/export.json')).rejects.toThrow('ENOSPC: no space left on device');
        });
    });
});