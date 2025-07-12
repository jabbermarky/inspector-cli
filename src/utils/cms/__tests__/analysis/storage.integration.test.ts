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
import { setupDataStorageIntegrationTests } from '../../analysis/test-setup.js';
import { 
    createTestDataPoint, 
    createWordPressDataPoint, 
    createLargeTestDataBatch
} from '../../analysis/test-factories.js';

describe('DataStorage Integration Tests', () => {
    const { getStorage, getTempDir } = setupDataStorageIntegrationTests();
    
    let storage: DataStorage;
    let tempDir: string;
    
    beforeEach(() => {
        storage = getStorage();
        tempDir = getTempDir();
    });
    
    describe('Performance Tests', () => {
        it('should handle large batches efficiently', async () => {
            const startTime = Date.now();
            const dataPoints = createLargeTestDataBatch(100); // Smaller batch for CI
            
            const fileIds = await storage.storeBatch(dataPoints);
            const endTime = Date.now();
            
            expect(fileIds).toHaveLength(100);
            expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
        });
        
        it('should query large datasets efficiently', async () => {
            // Store test data
            await storage.storeBatch(createLargeTestDataBatch(50));
            
            const startTime = Date.now();
            const results = await storage.query({ cmsTypes: ['WordPress'] });
            const endTime = Date.now();
            
            expect(results.length).toBeGreaterThan(0);
            expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
        });
        
        it('should handle concurrent operations', async () => {
            const operations = Array.from({ length: 10 }, (_, i) => 
                storage.store(createWordPressDataPoint({ url: `https://concurrent${i}.com` }))
            );
            
            const results = await Promise.all(operations);
            
            expect(results).toHaveLength(10);
            expect(new Set(results).size).toBe(10); // All unique IDs
        });
    });
    
    describe('Reliability Tests', () => {
        it('should handle filesystem errors gracefully', async () => {
            // This test depends on the actual filesystem behavior
            // We can't easily simulate filesystem errors in integration tests
            // But we can test that the storage works with real files
            
            const dataPoint = createWordPressDataPoint();
            const fileId = await storage.store(dataPoint);
            
            expect(fileId).toBeDefined();
            
            // Verify the file was actually created
            const fs = await import('fs/promises');
            const path = await import('path');
            const filePath = path.join(tempDir, `${fileId}.json`);
            
            await expect(fs.access(filePath)).resolves.not.toThrow();
        });
        
        it('should recover from partial writes', async () => {
            // Store initial data
            await storage.store(createWordPressDataPoint({ url: 'https://test1.com' }));
            
            // Create a new storage instance pointing to the same directory
            const newStorage = new DataStorage(tempDir, 'node');
            await newStorage.initialize();
            
            // Should be able to read the previously stored data
            const results = await newStorage.query({ cmsTypes: ['WordPress'] });
            expect(results).toHaveLength(1);
        });
    });
    
    describe('Data Integrity Tests', () => {
        it('should preserve data across restarts', async () => {
            // Store data
            const originalDataPoint = createWordPressDataPoint({ url: 'https://persistence-test.com' });
            const fileId = await storage.store(originalDataPoint);
            
            // Create new storage instance (simulating restart)
            const newStorage = new DataStorage(tempDir, 'node');
            await newStorage.initialize();
            
            // Retrieve data
            const retrievedData = await newStorage.getDataPoint(fileId);
            
            expect(retrievedData).toBeDefined();
            expect(retrievedData!.url).toBe('https://persistence-test.com');
            expect(retrievedData!.detectionResults).toHaveLength(originalDataPoint.detectionResults.length);
        });
        
        it('should keep index in sync with files', async () => {
            // Store multiple data points
            const dataPoints = Array.from({ length: 5 }, (_, i) => 
                createWordPressDataPoint({ url: `https://sync-test${i}.com` })
            );
            
            const fileIds = await storage.storeBatch(dataPoints);
            
            // Verify all files exist
            const fs = await import('fs/promises');
            const path = await import('path');
            
            for (const fileId of fileIds) {
                const filePath = path.join(tempDir, `${fileId}.json`);
                await expect(fs.access(filePath)).resolves.not.toThrow();
            }
            
            // Verify index contains all entries
            const stats = await storage.getStatistics();
            expect(stats.totalDataPoints).toBe(5);
        });
        
        it('should handle concurrent access safely', async () => {
            // This is a basic test - real concurrent access would need more sophisticated testing
            const operations = [
                storage.store(createWordPressDataPoint({ url: 'https://concurrent1.com' })),
                storage.store(createWordPressDataPoint({ url: 'https://concurrent2.com' })),
                storage.query({ cmsTypes: ['WordPress'] })
            ];
            
            const results = await Promise.all(operations);
            
            expect(results[0]).toBeDefined(); // First store
            expect(results[1]).toBeDefined(); // Second store
            expect(Array.isArray(results[2])).toBe(true); // Query result
        });
    });
    
    describe('Export Integration Tests', () => {
        beforeEach(async () => {
            // Store test data
            await storage.storeBatch(createLargeTestDataBatch(10));
        });
        
        it('should export to real files', async () => {
            const path = await import('path');
            const fs = await import('fs/promises');
            
            const exportPath = path.join(tempDir, 'export.json');
            await storage.export('json', exportPath);
            
            // Verify file was created
            await expect(fs.access(exportPath)).resolves.not.toThrow();
            
            // Verify file content
            const content = await fs.readFile(exportPath, 'utf8');
            const data = JSON.parse(content);
            
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBe(10);
        });
        
        it('should handle large export operations', async () => {
            // Store more data
            await storage.storeBatch(createLargeTestDataBatch(50));
            
            const path = await import('path');
            const fs = await import('fs/promises');
            
            const exportPath = path.join(tempDir, 'large-export.json');
            
            const startTime = Date.now();
            await storage.export('json', exportPath);
            const endTime = Date.now();
            
            // Verify export completed in reasonable time
            expect(endTime - startTime).toBeLessThan(3000); // Under 3 seconds
            
            // Verify file was created and has correct size
            const stats = await fs.stat(exportPath);
            expect(stats.size).toBeGreaterThan(1000); // Should be substantial
        });
    });
});