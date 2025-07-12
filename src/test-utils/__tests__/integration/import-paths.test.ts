/**
 * Integration tests for test-utils import paths and setup
 * 
 * These tests exercise the actual import paths and setup functions
 * that real tests would use, ensuring proper code coverage.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

describe('Test Utils Import Path Integration', () => {
    describe('Main index imports', () => {
        it('should export all utilities from main index', async () => {
            const testUtils = await import('../../index.js');
            
            // Should have all major exports
            expect(testUtils.createMockPage).toBeDefined();
            expect(testUtils.createMockBrowserManager).toBeDefined();
            expect(testUtils.createMockStrategy).toBeDefined();
            expect(testUtils.createDetectionResult).toBeDefined();
            expect(testUtils.mockRetry).toBeDefined();
            expect(testUtils.mockUrlValidation).toBeDefined();
        });
    });
    
    describe('Factory index imports', () => {
        it('should export all factories from factory index', async () => {
            const factories = await import('../../factories/index.js');
            
            expect(factories.createMockPage).toBeDefined();
            expect(factories.createDetectionResult).toBeDefined();
            expect(factories.createPartialDetectionResult).toBeDefined();
            expect(factories.createWordPressResult).toBeDefined();
            expect(factories.createDrupalResult).toBeDefined();
            expect(factories.createJoomlaResult).toBeDefined();
        });
    });
    
    describe('Mocks index imports', () => {
        it('should export all mocks from mocks index', async () => {
            const mocks = await import('../../mocks/index.js');
            
            expect(mocks.createMockBrowserManager).toBeDefined();
            expect(mocks.createMockStrategy).toBeDefined();
            expect(mocks.mockRetry).toBeDefined();
            expect(mocks.mockUrlValidation).toBeDefined();
        });
    });
    
    describe('Setup index imports', () => {
        it('should successfully import setup index', async () => {
            const setup = await import('../../setup/index.js');
            
            // Setup index should exist and be importable
            expect(setup).toBeDefined();
        });
    });
    
    describe('Types import', () => {
        it('should successfully import types file', async () => {
            // This test ensures the types file can be imported without errors
            const types = await import('../../types.js');
            
            // Types file should exist and be importable
            expect(types).toBeDefined();
        });
    });
});