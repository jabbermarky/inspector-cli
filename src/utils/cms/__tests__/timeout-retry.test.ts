import { jest } from '@jest/globals';
import { MetaTagStrategy } from '../strategies/meta-tag.js';
import { HtmlContentStrategy } from '../strategies/html-content.js';
import { ApiEndpointStrategy } from '../strategies/api-endpoint.js';
import { WordPressDetector } from '../detectors/wordpress.js';
import { CMSTimeoutError, CMSNetworkError } from '../types.js';
import { setupCMSDetectionTests, createMockPage } from '@test-utils';

// Mock logger
jest.mock('../../logger.js', () => ({
    createModuleLogger: () => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        apiCall: jest.fn(),
        apiResponse: jest.fn(),
        performance: jest.fn()
    })
}));

// Use standardized retry mock pattern from test-utils
jest.mock('../../retry.js', () => ({
    withRetry: jest.fn().mockImplementation(async (fn: any) => await fn())
}));

describe('CMS Detection Timeout and Retry Behavior', () => {
    setupCMSDetectionTests();
    
    let mockPage: any;

    beforeEach(() => {
        // Create mock page
        mockPage = createMockPage();
    });

    describe('Strategy Timeout Handling', () => {
        it('should handle strategy timeout gracefully', async () => {
            const strategy = new MetaTagStrategy('WordPress', 1000);
            
            // Mock page that rejects with timeout error
            mockPage.evaluate.mockRejectedValue(new Error('Navigation timeout'));

            const result = await strategy.detect(mockPage, 'https://example.com');
            
            expect(result.confidence).toBe(0);
            expect(result.error).toBeDefined();
        });

        it('should handle timeout in HTML content strategy', async () => {
            const strategy = new HtmlContentStrategy(['wp-content'], 'WordPress', 1000);
            
            // Mock page that rejects with timeout error
            mockPage.content.mockRejectedValue(new Error('Timeout waiting for content'));

            const result = await strategy.detect(mockPage, 'https://example.com');
            
            expect(result.confidence).toBe(0);
            expect(result.error).toBeDefined();
        });

        it('should handle timeout in API endpoint strategy', async () => {
            const strategy = new ApiEndpointStrategy('/wp-json/', 'WordPress', 1000);
            
            // Mock page that rejects with timeout error
            mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

            const result = await strategy.detect(mockPage, 'https://example.com');
            
            expect(result.confidence).toBe(0);
            expect(result.error).toBeDefined();
        });
    });

    describe('Retry Behavior', () => {
        it('should handle network errors gracefully', async () => {
            const strategy = new MetaTagStrategy('WordPress', 5000);
            
            mockPage.evaluate.mockRejectedValue(new Error('ECONNRESET'));

            const result = await strategy.detect(mockPage, 'https://example.com');
            
            expect(result.confidence).toBe(0);
            expect(result.error).toBeDefined();
        });

        it('should handle non-retryable errors', async () => {
            const strategy = new MetaTagStrategy('WordPress', 5000);
            
            mockPage.evaluate.mockRejectedValue(new Error('Invalid selector'));

            const result = await strategy.detect(mockPage, 'https://example.com');
            
            expect(result.confidence).toBe(0);
            expect(result.error).toBeDefined();
        });

        it('should handle ECONNRESET errors', async () => {
            const strategy = new HtmlContentStrategy(['wp-content'], 'WordPress', 5000);
            
            mockPage.content.mockRejectedValue(new Error('connect ECONNRESET'));

            const result = await strategy.detect(mockPage, 'https://example.com');
            
            expect(result.confidence).toBe(0);
            expect(result.error).toBeDefined();
        });

        it('should handle ENOTFOUND errors', async () => {
            const strategy = new ApiEndpointStrategy('/wp-json/', 'WordPress', 5000);
            
            mockPage.goto.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

            const result = await strategy.detect(mockPage, 'https://example.com');
            
            expect(result.confidence).toBe(0);
            expect(result.error).toBeDefined();
        });
    });

    describe('Concurrent Strategy Execution', () => {
        it('should handle parallel strategy execution', async () => {
            const detector = new WordPressDetector();
            
            // Mock successful responses for multiple strategies
            mockPage.evaluate.mockResolvedValue('WordPress 5.9');
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/wp-content/themes/theme/script.js"></script>
                    <script src="/wp-includes/js/jquery.js"></script>
                    <link rel="stylesheet" href="/wp-content/plugins/plugin/style.css">
                    <div class="wp-content">WordPress content</div>
                </html>
            `);
            mockPage.goto.mockResolvedValue({ 
                status: () => 200, 
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            });
            mockPage.evaluate.mockResolvedValue('{"wordpress":{"version":"5.9"}}');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.confidence).toBeGreaterThan(0.6);
            expect(result.detectionMethods?.length).toBeGreaterThan(1);
        });

        it('should handle some strategies timing out while others succeed', async () => {
            const detector = new WordPressDetector();
            
            // Meta tag strategy times out
            mockPage.evaluate.mockImplementation(() => {
                return new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('TIMEOUT')), 100);
                });
            });

            // HTML content strategy succeeds
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/wp-content/themes/theme/script.js"></script>
                    <script src="/wp-includes/js/jquery.js"></script>
                    <link rel="stylesheet" href="/wp-content/plugins/plugin/style.css">
                    <div class="wp-content">WordPress content</div>
                </html>
            `);

            // API endpoint strategy succeeds
            mockPage.goto.mockResolvedValue({ 
                status: () => 200, 
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            });
            mockPage.evaluate.mockResolvedValue('{"wordpress":{"version":"5.9"}}');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('WordPress');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.detectionMethods).toContain('html-content');
        });
    });

    describe('Error Types and Handling', () => {
        it('should properly categorize and handle CMSTimeoutError', () => {
            const timeoutError = new CMSTimeoutError('https://example.com', 'meta-tag', 3000);
            
            expect(timeoutError.name).toBe('CMSTimeoutError');
            expect(timeoutError.code).toBe('DETECTION_TIMEOUT');
            expect(timeoutError.url).toBe('https://example.com');
            expect(timeoutError.strategy).toBe('meta-tag');
            expect(timeoutError.message).toContain('timeout after 3000ms');
        });

        it('should properly categorize and handle CMSNetworkError', () => {
            const originalError = new Error('Connection refused');
            const networkError = new CMSNetworkError('https://example.com', 'api-endpoint', originalError);
            
            expect(networkError.name).toBe('CMSNetworkError');
            expect(networkError.code).toBe('NETWORK_ERROR');
            expect(networkError.url).toBe('https://example.com');
            expect(networkError.strategy).toBe('api-endpoint');
            expect(networkError.message).toContain('Connection refused');
        });
    });

    describe('Strategy Performance', () => {
        it('should complete strategies within reasonable time', async () => {
            const metaStrategy = new MetaTagStrategy('WordPress', 3000);
            const htmlStrategy = new HtmlContentStrategy(['wp-content'], 'WordPress', 4000);
            const apiStrategy = new ApiEndpointStrategy('/wp-json/', 'WordPress', 6000);

            // Mock successful responses for each strategy
            mockPage.evaluate.mockResolvedValue('WordPress 5.9');
            mockPage.content.mockResolvedValue('<html><script src="/wp-content/themes/theme/script.js"></script></html>');
            mockPage.goto.mockResolvedValue({ 
                status: () => 200, 
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            });
            mockPage.evaluate.mockResolvedValue('{"name":"Test Site","wordpress":{"version":"5.9"}}');

            // Test meta tag strategy
            const metaResult = await metaStrategy.detect(mockPage, 'https://example.com');
            expect(metaResult.confidence).toBeGreaterThan(0);

            // Test HTML content strategy  
            const htmlResult = await htmlStrategy.detect(mockPage, 'https://example.com');
            expect(htmlResult.confidence).toBeGreaterThan(0);

            // Test API endpoint strategy
            const apiResult = await apiStrategy.detect(mockPage, 'https://example.com');
            expect(apiResult.confidence).toBeGreaterThan(0);
        });

        it('should handle strategy execution time tracking', async () => {
            const detector = new WordPressDetector();
            
            // Mock responses with some delay
            mockPage.evaluate.mockImplementation(() => {
                return new Promise(resolve => {
                    setTimeout(() => resolve('wordpress 5.9'), 100);
                });
            });
            mockPage.content.mockResolvedValue('<html></html>');
            mockPage.goto.mockResolvedValue({ status: () => 404, ok: () => false });

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.executionTime).toBeDefined();
            expect(result.executionTime).toBeGreaterThan(0);
        });
    });
});