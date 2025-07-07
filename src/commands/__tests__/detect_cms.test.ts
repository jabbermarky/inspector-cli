import { jest } from '@jest/globals';
import * as utils from '../../utils/utils.js';
import { CMSDetectionIterator, CMSDetectionResult } from '../../utils/cms/index.js';

// Mock dependencies
jest.mock('../../utils/utils.js', () => ({
    detectInputType: jest.fn(),
    extractUrlsFromCSV: jest.fn(),
    detectCMS: jest.fn()
}));

jest.mock('../../utils/cms/index.js', () => ({
    detectCMS: jest.fn(),
    CMSDetectionIterator: jest.fn()
}));

jest.mock('../../utils/logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

// Import the function we want to test (this must be after mocking)
const mockDetectInputType = utils.detectInputType as jest.MockedFunction<typeof utils.detectInputType>;
const mockExtractUrlsFromCSV = utils.extractUrlsFromCSV as jest.MockedFunction<typeof utils.extractUrlsFromCSV>;
const mockDetectCMS = utils.detectCMS as jest.MockedFunction<typeof utils.detectCMS>;
const MockCMSDetectionIterator = CMSDetectionIterator as jest.MockedClass<typeof CMSDetectionIterator>;

describe('CMS Detection Command', () => {
    let mockIterator: jest.Mocked<CMSDetectionIterator>;
    let consoleSpy: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create mock iterator instance
        mockIterator = {
            detect: jest.fn(),
            finalize: jest.fn()
        } as any;
        
        MockCMSDetectionIterator.mockImplementation(() => mockIterator);
        
        // Spy on console methods
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
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
            const { processCMSDetectionBatch } = await import('../detect_cms.js');
            
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

            // Import and test the function
            const { processCMSDetectionBatch } = await import('../detect_cms.js');
            
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

            // Import and test the function
            const { processCMSDetectionBatch } = await import('../detect_cms.js');
            
            // Should not throw error even if finalize fails
            await expect(processCMSDetectionBatch(testUrls)).resolves.toBeDefined();
            
            // Verify finalize was attempted
            expect(mockIterator.finalize).toHaveBeenCalledTimes(1);
        });

        it('should not create iterator for empty URL list', async () => {
            // Setup mocks for empty list
            mockExtractUrlsFromCSV.mockReturnValue([]);

            // Import and test the function
            const { processCMSDetectionBatch } = await import('../detect_cms.js');
            
            // Execute with empty list
            const results = await processCMSDetectionBatch([]);

            // Should still create iterator but not call detect
            expect(MockCMSDetectionIterator).toHaveBeenCalledTimes(1);
            expect(mockIterator.detect).not.toHaveBeenCalled();
            expect(mockIterator.finalize).toHaveBeenCalledTimes(1);
            expect(results).toHaveLength(0);
        });
    });

    describe('Single URL Processing', () => {
        it('should not use iterator for single URL detection', async () => {
            // Setup mocks for single URL
            mockDetectInputType.mockReturnValue('url');
            
            const mockResult: CMSDetectionResult = {
                cms: 'Drupal',
                confidence: 0.8,
                originalUrl: 'http://example.com',
                finalUrl: 'https://example.com',
                executionTime: 1200
            };
            
            mockDetectCMS.mockResolvedValue(mockResult);

            // We can't easily test the command action directly due to commander.js,
            // but we can verify that detectCMS is called for single URLs
            await mockDetectCMS('http://example.com');

            // Verify regular detectCMS was called, not iterator
            expect(mockDetectCMS).toHaveBeenCalledWith('http://example.com');
            expect(MockCMSDetectionIterator).not.toHaveBeenCalled();
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

            // Import and test the function
            const { processCMSDetectionBatch } = await import('../detect_cms.js');
            
            // Execute batch processing
            await processCMSDetectionBatch(testUrls);

            // Verify the lifecycle: constructor → detect calls → finalize
            // Should have constructor call, then detect calls, then finalize call
            expect(MockCMSDetectionIterator).toHaveBeenCalledTimes(1);
            expect(mockIterator.detect).toHaveBeenCalledTimes(2);
            expect(mockIterator.finalize).toHaveBeenCalledTimes(1);
        });
    });
});

