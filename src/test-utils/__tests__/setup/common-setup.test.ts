/**
 * Unit tests for common setup utilities
 * 
 * Tests the setup functions that configure test environments
 * and provide common test utilities.
 */

import { jest } from '@jest/globals';
import {
    setupCMSDetectionTests,
    setupBrowserTests,
    setupStrategyTests,
    setupAnalysisTests,
    setupScreenshotTests,
    setupFileTests,
    setupUrlTests,
    setupCommandTests,
    setupTestEnvironment,
    teardownTestEnvironment,
    createTestContext,
    cleanupTestContext,
    expectSuccessfulDetection,
    expectFailedDetection,
    expectValidResult,
    expectDetectionTime,
    expectConfidenceRange,
    testConfig,
    createTestTempDir,
    cleanupTestResources,
    type TestEnvironmentOptions,
    type TestContextOptions
} from '../../setup/common-setup.js';

describe('Common Setup Utilities', () => {
    // Track original setTimeout to restore after tests
    let originalSetTimeout: typeof jest.setTimeout;
    
    beforeAll(() => {
        originalSetTimeout = jest.setTimeout;
    });
    
    afterEach(() => {
        // Restore default timeout after each test
        jest.setTimeout(5000);
        jest.clearAllMocks();
    });

    describe('Setup Functions', () => {
        it('should have CMS detection setup function available', () => {
            expect(setupCMSDetectionTests).toBeDefined();
            expect(typeof setupCMSDetectionTests).toBe('function');
        });
        
        it('should have browser setup function available', () => {
            expect(setupBrowserTests).toBeDefined();
            expect(typeof setupBrowserTests).toBe('function');
        });
        
        it('should have strategy setup function available', () => {
            expect(setupStrategyTests).toBeDefined();
            expect(typeof setupStrategyTests).toBe('function');
        });
        
        it('should have analysis setup function available', () => {
            expect(setupAnalysisTests).toBeDefined();
            expect(typeof setupAnalysisTests).toBe('function');
        });
        
        it('should have screenshot setup function available', () => {
            expect(setupScreenshotTests).toBeDefined();
            expect(typeof setupScreenshotTests).toBe('function');
        });
        
        it('should have file setup function available', () => {
            expect(setupFileTests).toBeDefined();
            expect(typeof setupFileTests).toBe('function');
        });
        
        it('should have URL setup function available', () => {
            expect(setupUrlTests).toBeDefined();
            expect(typeof setupUrlTests).toBe('function');
        });
        
        it('should have command setup function available', () => {
            expect(setupCommandTests).toBeDefined();
            expect(typeof setupCommandTests).toBe('function');
        });
    });
    
    describe('setupTestEnvironment', () => {
        it('should create test environment with defaults', () => {
            const env = setupTestEnvironment();
            
            expect(env).toBeDefined();
            expect(env.timeout).toBe(30000);
            expect(env.enableLogs).toBe(false);
            expect(env.enableMetrics).toBe(false);
            expect(env.customUserAgent).toBeUndefined();
            expect(env.mockConfig).toBeUndefined();
            expect(env.createdAt).toBeGreaterThan(0);
            expect(typeof env.createdAt).toBe('number');
        });
        
        it('should create test environment with custom options', () => {
            const options: TestEnvironmentOptions = {
                timeout: 60000,
                enableLogs: true,
                enableMetrics: true,
                customUserAgent: 'Test Agent 1.0',
                mockConfig: { testMode: true }
            };
            
            const env = setupTestEnvironment(options);
            
            expect(env.timeout).toBe(60000);
            expect(env.enableLogs).toBe(true);
            expect(env.enableMetrics).toBe(true);
            expect(env.customUserAgent).toBe('Test Agent 1.0');
            expect(env.mockConfig).toEqual({ testMode: true });
        });
        
        it('should handle empty options object', () => {
            const env = setupTestEnvironment({});
            
            expect(env).toBeDefined();
            expect(env.timeout).toBe(30000);
            expect(env.enableLogs).toBe(false);
        });
    });
    
    describe('teardownTestEnvironment', () => {
        it('should teardown test environment without throwing', async () => {
            const env = setupTestEnvironment();
            await expect(teardownTestEnvironment(env)).resolves.not.toThrow();
        });
        
        it('should handle null environment gracefully', async () => {
            await expect(teardownTestEnvironment(null as any)).resolves.not.toThrow();
        });
        
        it('should handle undefined environment gracefully', async () => {
            await expect(teardownTestEnvironment(undefined as any)).resolves.not.toThrow();
        });
    });
    
    describe('createTestContext', () => {
        it('should create test context with defaults', () => {
            const context = createTestContext();
            
            expect(context).toBeDefined();
            expect(context.url).toBe('https://example.com');
            expect(context.timeout).toBe(30000);
            expect(context.enableLogs).toBe(false);
            expect(context.userAgent).toBeUndefined();
            expect(context.mockBrowser).toBe(true);
            expect(context.createdAt).toBeGreaterThan(0);
        });
        
        it('should create test context with custom options', () => {
            const options: TestContextOptions = {
                url: 'https://custom.com',
                timeout: 45000,
                enableLogs: true,
                userAgent: 'Custom Agent',
                mockBrowser: false
            };
            
            const context = createTestContext(options);
            
            expect(context.url).toBe('https://custom.com');
            expect(context.timeout).toBe(45000);
            expect(context.enableLogs).toBe(true);
            expect(context.userAgent).toBe('Custom Agent');
            expect(context.mockBrowser).toBe(false);
        });
        
        it('should handle empty options object', () => {
            const context = createTestContext({});
            
            expect(context).toBeDefined();
            expect(context.url).toBe('https://example.com');
            expect(context.mockBrowser).toBe(true);
        });
    });
    
    describe('cleanupTestContext', () => {
        it('should cleanup test context without throwing', async () => {
            const context = createTestContext();
            await expect(cleanupTestContext(context)).resolves.not.toThrow();
        });
        
        it('should handle null context gracefully', async () => {
            await expect(cleanupTestContext(null as any)).resolves.not.toThrow();
        });
        
        it('should handle undefined context gracefully', async () => {
            await expect(cleanupTestContext(undefined as any)).resolves.not.toThrow();
        });
    });
    
    describe('Assertion Helpers', () => {
        describe('expectSuccessfulDetection', () => {
            it('should pass for valid successful detection', () => {
                const result = {
                    cms: 'WordPress',
                    confidence: 0.9,
                    originalUrl: 'https://example.com',
                    finalUrl: 'https://example.com',
                    executionTime: 100,
                    detectionMethods: ['meta-tag']
                };
                
                expect(() => expectSuccessfulDetection(result, 'WordPress')).not.toThrow();
            });
            
            it('should fail for incorrect CMS', () => {
                const result = {
                    cms: 'Drupal',
                    confidence: 0.9,
                    originalUrl: 'https://example.com',
                    finalUrl: 'https://example.com',
                    executionTime: 100,
                    detectionMethods: ['meta-tag']
                };
                
                expect(() => expectSuccessfulDetection(result, 'WordPress')).toThrow();
            });
            
            it('should fail for low confidence', () => {
                const result = {
                    cms: 'WordPress',
                    confidence: 0.3,
                    originalUrl: 'https://example.com',
                    finalUrl: 'https://example.com',
                    executionTime: 100,
                    detectionMethods: ['meta-tag']
                };
                
                expect(() => expectSuccessfulDetection(result, 'WordPress')).toThrow();
            });
            
            it('should fail for missing required properties', () => {
                const result = {
                    cms: 'WordPress',
                    confidence: 0.9
                    // Missing other required properties
                };
                
                expect(() => expectSuccessfulDetection(result, 'WordPress')).toThrow();
            });
        });
        
        describe('expectFailedDetection', () => {
            it('should pass for failed detection with error', () => {
                const result = {
                    cms: 'Unknown',
                    confidence: 0,
                    originalUrl: 'https://example.com',
                    finalUrl: 'https://example.com',
                    executionTime: 100,
                    detectionMethods: [],
                    error: 'Detection failed'
                };
                
                expect(() => expectFailedDetection(result)).not.toThrow();
            });
            
            it('should pass for failed detection without error but no detection methods', () => {
                const result = {
                    cms: 'Unknown',
                    confidence: 0,
                    originalUrl: 'https://example.com',
                    finalUrl: 'https://example.com',
                    executionTime: 100,
                    detectionMethods: []
                };
                
                expect(() => expectFailedDetection(result)).not.toThrow();
            });
            
            it('should fail for successful detection', () => {
                const result = {
                    cms: 'WordPress',
                    confidence: 0.9,
                    originalUrl: 'https://example.com',
                    finalUrl: 'https://example.com',
                    executionTime: 100,
                    detectionMethods: ['meta-tag']
                };
                
                expect(() => expectFailedDetection(result)).toThrow();
            });
            
            it('should fail for unknown CMS with high confidence', () => {
                const result = {
                    cms: 'Unknown',
                    confidence: 0.8,
                    originalUrl: 'https://example.com',
                    finalUrl: 'https://example.com',
                    executionTime: 100,
                    detectionMethods: []
                };
                
                expect(() => expectFailedDetection(result)).toThrow();
            });
        });
        
        describe('expectValidResult', () => {
            it('should pass for valid result structure', () => {
                const result = {
                    cms: 'WordPress',
                    confidence: 0.9,
                    originalUrl: 'https://example.com',
                    finalUrl: 'https://example.com',
                    executionTime: 100,
                    detectionMethods: ['meta-tag']
                };
                
                expect(() => expectValidResult(result)).not.toThrow();
            });
            
            it('should fail for invalid confidence range', () => {
                const result = {
                    cms: 'WordPress',
                    confidence: 1.5, // Invalid
                    originalUrl: 'https://example.com',
                    finalUrl: 'https://example.com',
                    executionTime: 100,
                    detectionMethods: ['meta-tag']
                };
                
                expect(() => expectValidResult(result)).toThrow();
            });
            
            it('should fail for negative execution time', () => {
                const result = {
                    cms: 'WordPress',
                    confidence: 0.9,
                    originalUrl: 'https://example.com',
                    finalUrl: 'https://example.com',
                    executionTime: -50, // Invalid
                    detectionMethods: ['meta-tag']
                };
                
                expect(() => expectValidResult(result)).toThrow();
            });
            
            it('should fail for missing required fields', () => {
                const result = {
                    cms: 'WordPress',
                    confidence: 0.9
                    // Missing other required fields
                };
                
                expect(() => expectValidResult(result)).toThrow();
            });
            
            it('should fail for non-array detection methods', () => {
                const result = {
                    cms: 'WordPress',
                    confidence: 0.9,
                    originalUrl: 'https://example.com',
                    finalUrl: 'https://example.com',
                    executionTime: 100,
                    detectionMethods: 'not-an-array' // Invalid
                };
                
                expect(() => expectValidResult(result)).toThrow();
            });
        });
        
        describe('expectDetectionTime', () => {
            it('should pass for time within range', () => {
                expect(() => expectDetectionTime(150, 100, 200)).not.toThrow();
            });
            
            it('should pass for time at boundaries', () => {
                expect(() => expectDetectionTime(100, 100, 200)).not.toThrow();
                expect(() => expectDetectionTime(200, 100, 200)).not.toThrow();
            });
            
            it('should fail for time below range', () => {
                expect(() => expectDetectionTime(50, 100, 200)).toThrow();
            });
            
            it('should fail for time above range', () => {
                expect(() => expectDetectionTime(250, 100, 200)).toThrow();
            });
        });
        
        describe('expectConfidenceRange', () => {
            it('should pass for confidence within range', () => {
                expect(() => expectConfidenceRange(0.85, 0.8, 0.9)).not.toThrow();
            });
            
            it('should pass for confidence at boundaries', () => {
                expect(() => expectConfidenceRange(0.8, 0.8, 0.9)).not.toThrow();
                expect(() => expectConfidenceRange(0.9, 0.8, 0.9)).not.toThrow();
            });
            
            it('should fail for confidence below range', () => {
                expect(() => expectConfidenceRange(0.75, 0.8, 0.9)).toThrow();
            });
            
            it('should fail for confidence above range', () => {
                expect(() => expectConfidenceRange(0.95, 0.8, 0.9)).toThrow();
            });
        });
    });
    
    describe('Utility Functions', () => {
        describe('createTestTempDir', () => {
            it('should create temp directory path with test name', () => {
                const testName = 'my-test';
                const path = createTestTempDir(testName);
                
                expect(path).toContain('/tmp/inspector-cli-test-');
                expect(path).toContain('my-test');
                expect(path).toMatch(/\/tmp\/inspector-cli-test-my-test-\d+/);
            });
            
            it('should sanitize test names with special characters', () => {
                const testName = 'test with spaces & symbols!';
                const path = createTestTempDir(testName);
                
                expect(path).toContain('test-with-spaces---symbols-');
                expect(path).not.toContain(' ');
                expect(path).not.toContain('&');
                expect(path).not.toContain('!');
            });
            
            it('should create unique paths for same test name', () => {
                const testName = 'duplicate-test';
                const path1 = createTestTempDir(testName);
                const path2 = createTestTempDir(testName);
                
                expect(path1).not.toBe(path2);
                expect(path1).toContain('duplicate-test');
                expect(path2).toContain('duplicate-test');
            });
        });
        
        describe('cleanupTestResources', () => {
            it('should cleanup test resources without throwing', () => {
                expect(() => cleanupTestResources()).not.toThrow();
            });
            
            it('should be safe to call multiple times', () => {
                expect(() => {
                    cleanupTestResources();
                    cleanupTestResources();
                    cleanupTestResources();
                }).not.toThrow();
            });
        });
    });
    
    describe('testConfig', () => {
        it('should have all required configuration properties', () => {
            expect(testConfig).toBeDefined();
            expect(typeof testConfig.defaultTimeout).toBe('number');
            expect(typeof testConfig.browserTimeout).toBe('number');
            expect(typeof testConfig.screenshotTimeout).toBe('number');
            expect(typeof testConfig.commandTimeout).toBe('number');
            expect(typeof testConfig.retryAttempts).toBe('number');
            expect(typeof testConfig.defaultUserAgent).toBe('string');
            expect(testConfig.testUrls).toBeDefined();
        });
        
        it('should have valid timeout values', () => {
            expect(testConfig.defaultTimeout).toBeGreaterThan(0);
            expect(testConfig.browserTimeout).toBeGreaterThan(testConfig.defaultTimeout);
            expect(testConfig.screenshotTimeout).toBeGreaterThan(testConfig.browserTimeout);
            expect(testConfig.commandTimeout).toBeGreaterThan(testConfig.screenshotTimeout);
        });
        
        it('should have valid test URLs', () => {
            expect(typeof testConfig.testUrls.valid).toBe('string');
            expect(typeof testConfig.testUrls.invalid).toBe('string');
            expect(typeof testConfig.testUrls.timeout).toBe('string');
            expect(typeof testConfig.testUrls.redirect).toBe('string');
            
            expect(testConfig.testUrls.valid).toMatch(/^https?:\/\//);
            expect(testConfig.testUrls.timeout).toMatch(/^https?:\/\//);
            expect(testConfig.testUrls.redirect).toMatch(/^https?:\/\//);
        });
        
        it('should have reasonable configuration values', () => {
            expect(testConfig.retryAttempts).toBeGreaterThan(0);
            expect(testConfig.retryAttempts).toBeLessThan(10);
            expect(testConfig.defaultUserAgent).toContain('Inspector-CLI-Test');
        });
    });
    
    describe('Integration Tests', () => {
        it('should work together in a typical test setup scenario', async () => {
            // Create environment
            const env = setupTestEnvironment({
                timeout: 15000,
                enableLogs: false
            });
            
            // Create context
            const context = createTestContext({
                url: 'https://test.com',
                enableLogs: env.enableLogs
            });
            
            // Verify setup
            expect(env.timeout).toBe(15000);
            expect(context.url).toBe('https://test.com');
            expect(context.enableLogs).toBe(false);
            
            // Cleanup
            await cleanupTestContext(context);
            await teardownTestEnvironment(env);
        });
        
        it('should handle assertion helpers in realistic scenarios', () => {
            const successfulResult = {
                cms: 'WordPress',
                confidence: 0.95,
                originalUrl: 'https://example.com',
                finalUrl: 'https://example.com',
                executionTime: 250,
                detectionMethods: ['meta-tag', 'http-headers']
            };
            
            const failedResult = {
                cms: 'Unknown',
                confidence: 0,
                originalUrl: 'https://failed.com',
                finalUrl: 'https://failed.com',
                executionTime: 1000,
                detectionMethods: [],
                error: 'Network timeout'
            };
            
            // Test successful detection assertions
            expect(() => {
                expectSuccessfulDetection(successfulResult, 'WordPress');
                expectValidResult(successfulResult);
                expectDetectionTime(successfulResult.executionTime, 200, 300);
                expectConfidenceRange(successfulResult.confidence, 0.9, 1.0);
            }).not.toThrow();
            
            // Test failed detection assertions
            expect(() => {
                expectFailedDetection(failedResult);
                expectValidResult(failedResult);
            }).not.toThrow();
        });
    });
});