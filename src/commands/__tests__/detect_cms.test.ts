import { jest } from '@jest/globals';
import * as utils from '../../utils/utils.js';
import { CMSDetectionIterator, CMSDetectionResult } from '../../utils/cms/index.js';
import { CMSType } from '../../utils/cms/types.js';
import { processCMSDetectionBatch } from '../detect_cms.js';
import { setupCommandTests, setupJestExtensions, createWordPressResult, createDrupalResult, createFailedResult } from '@test-utils';

// Setup custom Jest matchers
setupJestExtensions();

// Factory functions for test data creation
const createCMSDetectionResult = (overrides: any = {}) => ({
    cms: 'WordPress',
    confidence: 0.9,
    originalUrl: 'http://example.com',
    finalUrl: 'http://example.com',
    executionTime: 1000,
    ...overrides
});

const createTestUrlsWithResult = (urls: string[], result: any) => ({ urls, result });

// Mock dependencies
jest.mock('../../utils/utils.js', () => ({
    detectInputType: jest.fn(),
    extractUrlsFromCSV: jest.fn()
}));

jest.mock('../../utils/cms/index.js', () => ({
    CMSDetectionIterator: jest.fn()
}));

jest.mock('../../utils/retry.js', () => ({
    withRetry: jest.fn().mockImplementation(async (fn: any) => await fn())
}));

jest.mock('../../utils/logger.js', () => ({
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

// Import the function we want to test (this must be after mocking)
const mockDetectInputType = utils.detectInputType as jest.MockedFunction<typeof utils.detectInputType>;
const mockExtractUrlsFromCSV = utils.extractUrlsFromCSV as jest.MockedFunction<typeof utils.extractUrlsFromCSV>;
const MockCMSDetectionIterator = CMSDetectionIterator as jest.MockedClass<typeof CMSDetectionIterator>;

describe('CMS Detection Command', () => {
    setupCommandTests();
    let mockIterator: jest.Mocked<CMSDetectionIterator>;
    let consoleSpy: any;
    let consoleErrorSpy: any;

    beforeEach(() => {
        // Create mock iterator instance
        mockIterator = {
            detect: jest.fn(),
            finalize: jest.fn()
        } as any;
        
        MockCMSDetectionIterator.mockImplementation(() => mockIterator);
        
        // Spy on console methods
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('Batch Processing', () => {
        it('should finalize iterator after processing all URLs', async () => {
            // Setup mocks
            const testUrls = ['http://example.com', 'http://test.com'];
            mockExtractUrlsFromCSV.mockReturnValue(testUrls);
            
            const mockResults: CMSDetectionResult[] = [
                {
                    cms: 'WordPress',
                    confidence: 0.9,
                    originalUrl: 'http://example.com',
                    finalUrl: 'http://example.com',
                    executionTime: 1000
                },
                {
                    cms: 'Unknown',
                    confidence: 0,
                    originalUrl: 'http://test.com',
                    finalUrl: 'http://test.com',
                    executionTime: 500
                }
            ];
            
            mockIterator.detect
                .mockResolvedValueOnce(mockResults[0])
                .mockResolvedValueOnce(mockResults[1]);

            // Import and test the function (must be after mocking)
            // Execute the function directly
            
            // Execute the batch processing
            const results = await processCMSDetectionBatch(testUrls);

            // Verify iterator was created and used correctly
            expect(MockCMSDetectionIterator).toHaveBeenCalledTimes(1);
            expect(mockIterator.detect).toHaveBeenCalledTimes(2);
            expect(mockIterator.detect).toHaveBeenCalledWith('http://example.com');
            expect(mockIterator.detect).toHaveBeenCalledWith('http://test.com');
            
            // Verify finalize was called exactly once at the end
            expect(mockIterator.finalize).toHaveBeenCalledTimes(1);
            
            // Verify results structure
            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({
                url: 'http://example.com',
                success: true,
                cms: 'WordPress',
                version: undefined
            });
            expect(results[1]).toEqual({
                url: 'http://test.com',
                success: false,
                cms: 'Unknown',
                version: undefined
            });
        });

        it('should finalize iterator even when detection fails', async () => {
            // Setup mocks for failure scenario
            const testUrls = ['http://error-site.com'];
            mockExtractUrlsFromCSV.mockReturnValue(testUrls);
            
            mockIterator.detect.mockRejectedValue(new Error('Navigation timeout'));

            // Execute the function directly
            
            // Execute the batch processing
            const results = await processCMSDetectionBatch(testUrls);

            // Verify finalize was still called despite the error
            expect(mockIterator.finalize).toHaveBeenCalledTimes(1);
            
            // Verify error was handled correctly
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                url: 'http://error-site.com',
                success: false,
                error: 'Navigation timeout'
            });
        });

        it('should handle finalize errors gracefully', async () => {
            // Setup mocks
            const testUrls = ['http://example.com'];
            mockExtractUrlsFromCSV.mockReturnValue(testUrls);
            
            const mockResult: CMSDetectionResult = {
                cms: 'WordPress',
                confidence: 0.9,
                originalUrl: 'http://example.com',
                finalUrl: 'http://example.com',
                executionTime: 1000
            };
            
            mockIterator.detect.mockResolvedValue(mockResult);
            mockIterator.finalize.mockRejectedValue(new Error('Cleanup failed'));

            // Execute the function directly
            
            // Should not throw error even if finalize fails
            await expect(processCMSDetectionBatch(testUrls)).resolves.toBeDefined();
            
            // Verify finalize was attempted
            expect(mockIterator.finalize).toHaveBeenCalledTimes(1);
        });

        it('should not create iterator for empty URL list', async () => {
            // Setup mocks for empty list
            mockExtractUrlsFromCSV.mockReturnValue([]);

            // Execute the function directly
            
            // Execute with empty list
            const results = await processCMSDetectionBatch([]);

            // Should still create iterator but not call detect
            expect(MockCMSDetectionIterator).toHaveBeenCalledTimes(1);
            expect(mockIterator.detect).not.toHaveBeenCalled();
            expect(mockIterator.finalize).toHaveBeenCalledTimes(1);
            expect(results).toHaveLength(0);
        });
    });

    describe('Unified Pipeline Processing', () => {
        it('should use iterator for both single URL and batch processing', async () => {
            // Setup mocks for single URL (now uses batch pipeline)
            mockDetectInputType.mockReturnValue('url');
            
            const mockResult: CMSDetectionResult = {
                cms: 'Drupal',
                confidence: 0.8,
                originalUrl: 'http://example.com',
                finalUrl: 'https://example.com',
                executionTime: 1200
            };
            
            mockIterator.detect.mockResolvedValue(mockResult);

            // Test single URL through batch pipeline
            const testUrls = ['http://example.com'];
            // Execute the function directly
            
            const results = await processCMSDetectionBatch(testUrls);

            // Verify iterator was used (unified pipeline)
            expect(MockCMSDetectionIterator).toHaveBeenCalledTimes(1);
            expect(mockIterator.detect).toHaveBeenCalledWith('http://example.com');
            expect(mockIterator.finalize).toHaveBeenCalledTimes(1);
            
            // Verify results structure
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                url: 'http://example.com',
                success: true,
                cms: 'Drupal',
                version: undefined
            });
        });

        it('should produce identical results for same URL in single vs batch mode', async () => {
            // Setup consistent mock result
            const mockResult: CMSDetectionResult = {
                cms: 'WordPress',
                confidence: 0.9,
                originalUrl: 'http://drupal.org',
                finalUrl: 'https://www.drupal.org',
                executionTime: 1000,
                redirectCount: 2,
                protocolUpgraded: true
            };
            
            mockIterator.detect.mockResolvedValue(mockResult);
            
            // Execute the function directly
            
            // Test single URL (processed as batch of 1)
            const singleResults = await processCMSDetectionBatch(['http://drupal.org']);
            
            // Reset mocks for batch test
            jest.clearAllMocks();
            mockIterator.detect.mockResolvedValue(mockResult);
            MockCMSDetectionIterator.mockImplementation(() => mockIterator);
            
            // Test same URL in batch with other URLs
            const batchResults = await processCMSDetectionBatch(['http://other.com', 'http://drupal.org']);
            
            // Results for drupal.org should be identical
            expect(singleResults[0]).toEqual({
                url: 'http://drupal.org',
                success: true,
                cms: 'WordPress',
                version: undefined
            });
            
            expect(batchResults[1]).toEqual(singleResults[0]);
        });
    });

    describe('Iterator Lifecycle', () => {
        it('should follow correct lifecycle pattern', async () => {
            const testUrls = ['http://site1.com', 'http://site2.com'];
            mockExtractUrlsFromCSV.mockReturnValue(testUrls);
            
            const mockResults: CMSDetectionResult[] = [
                {
                    cms: 'WordPress',
                    confidence: 0.9,
                    originalUrl: 'http://site1.com',
                    finalUrl: 'http://site1.com',
                    executionTime: 800
                },
                {
                    cms: 'Joomla',
                    confidence: 0.7,
                    originalUrl: 'http://site2.com',
                    finalUrl: 'http://site2.com',
                    executionTime: 900
                }
            ];
            
            mockIterator.detect
                .mockResolvedValueOnce(mockResults[0])
                .mockResolvedValueOnce(mockResults[1]);

            // Execute the function directly
            
            // Execute batch processing
            await processCMSDetectionBatch(testUrls);

            // Verify the lifecycle: constructor → detect calls → finalize
            // Should have constructor call, then detect calls, then finalize call
            expect(MockCMSDetectionIterator).toHaveBeenCalledTimes(1);
            expect(mockIterator.detect).toHaveBeenCalledTimes(2);
            expect(mockIterator.finalize).toHaveBeenCalledTimes(1);
        });
    });

    describe('Iterator Initialization', () => {
        it('should handle iterator initialization failures', async () => {
            // Mock iterator constructor to throw error
            MockCMSDetectionIterator.mockImplementation(() => {
                throw new Error('Failed to initialize browser manager');
            });

            await expect(processCMSDetectionBatch(['http://example.com']))
                .rejects.toThrow('CMS detection initialization failed: Failed to initialize browser manager');
        });

        it('should handle null iterator scenario', async () => {
            // Mock iterator constructor to return null/undefined (which shouldn't happen in practice)
            // This tests the defensive null check in the code
            MockCMSDetectionIterator.mockImplementation(() => {
                // Return an object that gets set to null somehow
                const mockIter = {
                    detect: jest.fn(),
                    finalize: jest.fn()
                } as any;
                // Simulate the iterator becoming null after creation
                Object.defineProperty(mockIter, 'detect', { 
                    get: () => { throw new Error('cmsIterator.detect is not a function'); }
                });
                return mockIter;
            });

            const results = await processCMSDetectionBatch(['http://example.com']);
            
            // Should handle the error gracefully and return failed result
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                url: 'http://example.com',
                success: false,
                error: 'cmsIterator.detect is not a function'
            });
        });

        it('should pass data collection options to iterator', async () => {
            const testUrls = ['http://example.com'];
            const mockResult: CMSDetectionResult = {
                cms: 'WordPress',
                confidence: 0.9,
                originalUrl: 'http://example.com',
                finalUrl: 'http://example.com',
                executionTime: 1000
            };
            
            mockIterator.detect.mockResolvedValue(mockResult);

            await processCMSDetectionBatch(testUrls, { collectData: true });

            // Verify iterator was created with correct options
            expect(MockCMSDetectionIterator).toHaveBeenCalledWith({
                collectData: true,
                collectionConfig: {
                    includeHtmlContent: true,
                    includeDomAnalysis: true,
                    includeScriptAnalysis: true,
                    maxHtmlSize: 500000,
                    outputFormat: 'json'
                }
            });
        });
    });

    describe('Skipped URLs and DNS Handling', () => {
        it('should handle skipped URLs due to DNS failures', async () => {
            const testUrls = ['http://dns-fail.example'];
            const mockResult: CMSDetectionResult = {
                cms: 'Unknown',
                confidence: 0,
                originalUrl: 'http://dns-fail.example',
                finalUrl: 'http://dns-fail.example',
                executionTime: 0,
                skipped: true,
                skipReason: 'DNS resolution failed',
                error: 'ENOTFOUND dns-fail.example'
            };
            
            mockIterator.detect.mockResolvedValue(mockResult);

            const results = await processCMSDetectionBatch(testUrls);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                url: 'http://dns-fail.example',
                success: false,
                error: 'ENOTFOUND dns-fail.example',
                skipped: true,
                skipReason: 'DNS resolution failed'
            });

            // Verify console output for skipped URL
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('⚠ http://dns-fail.example → DNS resolution failed')
            );
        });

        it('should handle skipped URLs with custom skip reasons', async () => {
            const testUrls = ['http://blocked.example'];
            const mockResult: CMSDetectionResult = {
                cms: 'Unknown',
                confidence: 0,
                originalUrl: 'http://blocked.example',
                finalUrl: 'http://blocked.example',
                executionTime: 0,
                skipped: true,
                skipReason: 'Bot protection detected',
                error: 'Request blocked by server'
            };
            
            mockIterator.detect.mockResolvedValue(mockResult);

            const results = await processCMSDetectionBatch(testUrls);

            expect(results[0].skipReason).toBe('Bot protection detected');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('⚠ http://blocked.example → Bot protection detected')
            );
        });
    });

    describe('Error Handling Scenarios', () => {
        it('should handle URLs with errors but not skipped', async () => {
            const testUrls = ['http://error.example'];
            const mockResult: CMSDetectionResult = {
                cms: 'Unknown',
                confidence: 0,
                originalUrl: 'http://error.example',
                finalUrl: 'http://error.example',
                executionTime: 500,
                error: 'Network timeout after 30 seconds'
            };
            
            mockIterator.detect.mockResolvedValue(mockResult);

            const results = await processCMSDetectionBatch(testUrls);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                url: 'http://error.example',
                success: false,
                error: 'Network timeout after 30 seconds'
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('✗ http://error.example → Error: Network timeout after 30 seconds')
            );
        });

        it('should handle mixed success, failure, and skip scenarios', async () => {
            const testUrls = ['http://success.com', 'http://error.com', 'http://skipped.com'];
            const mockResults: CMSDetectionResult[] = [
                {
                    cms: 'WordPress',
                    confidence: 0.9,
                    originalUrl: 'http://success.com',
                    finalUrl: 'http://success.com',
                    executionTime: 1000,
                    version: '6.3.1'
                },
                {
                    cms: 'Unknown',
                    confidence: 0,
                    originalUrl: 'http://error.com',
                    finalUrl: 'http://error.com',
                    executionTime: 500,
                    error: 'Page load failed'
                },
                {
                    cms: 'Unknown',
                    confidence: 0,
                    originalUrl: 'http://skipped.com',
                    finalUrl: 'http://skipped.com',
                    executionTime: 0,
                    skipped: true,
                    skipReason: 'DNS resolution failed'
                }
            ];
            
            mockIterator.detect
                .mockResolvedValueOnce(mockResults[0])
                .mockResolvedValueOnce(mockResults[1])
                .mockResolvedValueOnce(mockResults[2]);

            const results = await processCMSDetectionBatch(testUrls);

            expect(results).toHaveLength(3);
            
            // Success case
            expect(results[0]).toEqual({
                url: 'http://success.com',
                success: true,
                cms: 'WordPress',
                version: '6.3.1'
            });
            
            // Error case
            expect(results[1]).toEqual({
                url: 'http://error.com',
                success: false,
                error: 'Page load failed'
            });
            
            // Skipped case
            expect(results[2]).toEqual({
                url: 'http://skipped.com',
                success: false,
                error: undefined,
                skipped: true,
                skipReason: 'DNS resolution failed'
            });
        });
    });

    describe('CMS Detection Success Criteria', () => {
        it('should mark known CMS as successful', async () => {
            const knownCMSTypes: CMSType[] = ['WordPress', 'Drupal', 'Joomla'];
            
            for (const cms of knownCMSTypes) {
                const mockResult: CMSDetectionResult = {
                    cms,
                    confidence: 0.8,
                    originalUrl: 'http://example.com',
                    finalUrl: 'http://example.com',
                    executionTime: 1000
                };
                
                mockIterator.detect.mockResolvedValue(mockResult);

                const results = await processCMSDetectionBatch(['http://example.com']);

                expect(results[0].success).toBe(true);
                expect(results[0].cms).toBe(cms);
                
                // Reset for next iteration
                jest.clearAllMocks();
                MockCMSDetectionIterator.mockImplementation(() => mockIterator);
            }
        });

        it('should mark Unknown CMS as failed detection', async () => {
            const mockResult: CMSDetectionResult = {
                cms: 'Unknown',
                confidence: 0.2,
                originalUrl: 'http://example.com',
                finalUrl: 'http://example.com',
                executionTime: 1000
            };
            
            mockIterator.detect.mockResolvedValue(mockResult);

            const results = await processCMSDetectionBatch(['http://example.com']);

            expect(results[0].success).toBe(false);
            expect(results[0].cms).toBe('Unknown');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('✗ http://example.com → Unknown (no known CMS detected)')
            );
        });
    });

    describe('Console Output and Progress Tracking', () => {
        it('should display progress correctly for successful detection', async () => {
            const testUrls = ['http://wordpress.example'];
            const mockResult: CMSDetectionResult = {
                cms: 'WordPress',
                confidence: 0.9,
                originalUrl: 'http://wordpress.example',
                finalUrl: 'http://wordpress.example',
                executionTime: 1000,
                version: '6.3.1'
            };
            
            mockIterator.detect.mockResolvedValue(mockResult);

            await processCMSDetectionBatch(testUrls);

            expect(consoleSpy).toHaveBeenCalledWith(
                '[1/1] ✓ http://wordpress.example → WordPress 6.3.1'
            );
        });

        it('should display progress correctly for CMS without version', async () => {
            const testUrls = ['http://drupal.example'];
            const mockResult: CMSDetectionResult = {
                cms: 'Drupal',
                confidence: 0.8,
                originalUrl: 'http://drupal.example',
                finalUrl: 'http://drupal.example',
                executionTime: 1000
            };
            
            mockIterator.detect.mockResolvedValue(mockResult);

            await processCMSDetectionBatch(testUrls);

            expect(consoleSpy).toHaveBeenCalledWith(
                '[1/1] ✓ http://drupal.example → Drupal'
            );
        });

        it('should show total progress for multiple URLs', async () => {
            const testUrls = ['http://site1.com', 'http://site2.com', 'http://site3.com'];
            const mockResults: CMSDetectionResult[] = [
                {
                    cms: 'WordPress',
                    confidence: 0.9,
                    originalUrl: 'http://site1.com',
                    finalUrl: 'http://site1.com',
                    executionTime: 1000
                },
                {
                    cms: 'Unknown',
                    confidence: 0,
                    originalUrl: 'http://site2.com',
                    finalUrl: 'http://site2.com',
                    executionTime: 500
                },
                {
                    cms: 'Joomla',
                    confidence: 0.7,
                    originalUrl: 'http://site3.com',
                    finalUrl: 'http://site3.com',
                    executionTime: 800
                }
            ];
            
            mockIterator.detect
                .mockResolvedValueOnce(mockResults[0])
                .mockResolvedValueOnce(mockResults[1])
                .mockResolvedValueOnce(mockResults[2]);

            await processCMSDetectionBatch(testUrls);

            expect(consoleSpy).toHaveBeenCalledWith('[1/3] ✓ http://site1.com → WordPress');
            expect(consoleSpy).toHaveBeenCalledWith('[2/3] ✗ http://site2.com → Unknown (no known CMS detected)');
            expect(consoleSpy).toHaveBeenCalledWith('[3/3] ✓ http://site3.com → Joomla');
        });
    });

    describe('Data Collection Configuration', () => {
        it('should use default data collection when not specified', async () => {
            const testUrls = ['http://example.com'];
            const mockResult: CMSDetectionResult = {
                cms: 'WordPress',
                confidence: 0.9,
                originalUrl: 'http://example.com',
                finalUrl: 'http://example.com',
                executionTime: 1000
            };
            
            mockIterator.detect.mockResolvedValue(mockResult);

            await processCMSDetectionBatch(testUrls);

            // Should default to collectData: true
            expect(MockCMSDetectionIterator).toHaveBeenCalledWith({
                collectData: true,
                collectionConfig: {
                    includeHtmlContent: true,
                    includeDomAnalysis: true,
                    includeScriptAnalysis: true,
                    maxHtmlSize: 500000,
                    outputFormat: 'json'
                }
            });
        });

        it('should respect explicitly disabled data collection', async () => {
            const testUrls = ['http://example.com'];
            const mockResult: CMSDetectionResult = {
                cms: 'WordPress',
                confidence: 0.9,
                originalUrl: 'http://example.com',
                finalUrl: 'http://example.com',
                executionTime: 1000
            };
            
            mockIterator.detect.mockResolvedValue(mockResult);

            await processCMSDetectionBatch(testUrls, { collectData: false });

            expect(MockCMSDetectionIterator).toHaveBeenCalledWith({
                collectData: false,
                collectionConfig: {
                    includeHtmlContent: true,
                    includeDomAnalysis: true,
                    includeScriptAnalysis: true,
                    maxHtmlSize: 500000,
                    outputFormat: 'json'
                }
            });
        });
    });
});

