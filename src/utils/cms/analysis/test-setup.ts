/**
 * Test setup utilities for DataStorage testing
 * Provides standardized test patterns using @test-utils
 */

import { setupAnalysisTests } from '@test-utils';
import { DataStorage } from './storage.js';
import { InMemoryFileSystemAdapter } from './filesystem-adapter.js';

/**
 * Setup function for DataStorage unit tests
 * Uses in-memory filesystem for fast, isolated testing
 */
export function setupDataStorageTests() {
    // Use standard analysis test setup
    setupAnalysisTests();
    
    let storage: DataStorage;
    let fileSystem: InMemoryFileSystemAdapter;
    
    beforeEach(() => {
        // Create fresh instances for each test
        storage = new DataStorage('./test-data', 'memory');
        fileSystem = (storage as any).fileSystem as InMemoryFileSystemAdapter;
    });
    
    return {
        getStorage: () => storage,
        getFileSystem: () => fileSystem
    };
}

/**
 * Setup function for DataStorage integration tests
 * Uses real filesystem with temporary directories
 */
export function setupDataStorageIntegrationTests() {
    // Use standard analysis test setup
    setupAnalysisTests();
    
    let storage: DataStorage;
    let tempDir: string;
    
    beforeEach(async () => {
        // Create unique temp directory for each test
        const { mkdtemp } = await import('fs/promises');
        const { tmpdir } = await import('os');
        const { join } = await import('path');
        
        tempDir = await mkdtemp(join(tmpdir(), 'data-storage-integration-test-'));
        storage = new DataStorage(tempDir, 'node');
        await storage.initialize();
    });
    
    afterEach(async () => {
        // Clean up temp directory
        const { rm } = await import('fs/promises');
        await rm(tempDir, { recursive: true, force: true });
    });
    
    return {
        getStorage: () => storage,
        getTempDir: () => tempDir
    };
}