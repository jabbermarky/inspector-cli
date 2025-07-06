import { jest } from '@jest/globals';
import { ApiEndpointStrategy } from '../../strategies/api-endpoint.js';

// Mock logger
jest.mock('../../../logger.js', () => ({
    createModuleLogger: () => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

describe('ApiEndpointStrategy', () => {
    let strategy: ApiEndpointStrategy;
    let mockPage: any;
    let mockResponse: any;

    beforeEach(() => {
        strategy = new ApiEndpointStrategy('/wp-json/wp/v2', 'WordPress', 5000);
        
        mockResponse = {
            status: jest.fn().mockReturnValue(200),
            headers: jest.fn().mockReturnValue({ 'content-type': 'application/json' }),
            ok: jest.fn().mockReturnValue(true)
        } as any;

        mockPage = {
            content: jest.fn(),
            goto: jest.fn(),
            evaluate: jest.fn()
        } as any;
        
        // Setup default mock behavior
        mockPage.goto.mockResolvedValue(mockResponse);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Basic Configuration', () => {
        it('should return correct name', () => {
            expect(strategy.getName()).toBe('api-endpoint');
        });

        it('should return correct timeout', () => {
            expect(strategy.getTimeout()).toBe(5000);
        });

        it('should use default timeout if not specified', () => {
            const defaultStrategy = new ApiEndpointStrategy('/api', 'TestCMS');
            expect(defaultStrategy.getTimeout()).toBe(6000);
        });
    });

    describe('JSON Response Analysis', () => {
        it('should detect WordPress from JSON API response', async () => {
            const wordpressJson = JSON.stringify({
                name: 'My WordPress Site',
                description: 'A WordPress site',
                wordpress: { version: '6.3.1' },
                home: 'https://example.com'
            });

            mockPage.evaluate.mockResolvedValue(wordpressJson);

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.9);
            expect(result.version).toBe('6.3.1');
            expect(result.method).toBe('api-endpoint');
        });

        it('should detect WordPress without version info', async () => {
            const wordpressJson = JSON.stringify({
                name: 'My WordPress Site',
                description: 'A WordPress site',
                home: 'https://example.com'
            });

            mockPage.evaluate.mockResolvedValue(wordpressJson);

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.9);
            expect(result.version).toBeUndefined();
            expect(result.method).toBe('api-endpoint');
        });

        it('should detect Joomla from JSON API response', async () => {
            const joomlaStrategy = new ApiEndpointStrategy('/api/index.php/v1', 'Joomla');
            const joomlaJson = JSON.stringify({
                joomla: { version: '4.2.3' },
                attributes: { type: 'cms' }
            });

            mockPage.evaluate.mockResolvedValue(joomlaJson);

            const result = await joomlaStrategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.9);
            expect(result.version).toBe('4.2.3');
        });

        it('should detect Drupal from JSON API response', async () => {
            const drupalStrategy = new ApiEndpointStrategy('/jsonapi', 'Drupal');
            const drupalJson = JSON.stringify({
                drupal: { version: '10.1.5' },
                data: [],
                links: {}
            });

            mockPage.evaluate.mockResolvedValue(drupalJson);

            const result = await drupalStrategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.9);
            expect(result.version).toBe('10.1.5');
        });

        it('should handle malformed JSON gracefully', async () => {
            mockPage.evaluate.mockResolvedValue('invalid json {');

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.5);
            expect(result.error).toBe('Failed to parse JSON response');
        });

        it('should extract version from generic JSON structure', async () => {
            const genericJson = JSON.stringify({
                version: '5.8.1',
                name: 'Some API'
            });

            mockPage.evaluate.mockResolvedValue(genericJson);

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.6);
            expect(result.version).toBeUndefined(); // Generic analysis doesn't extract version for WordPress
        });
    });

    describe('Text Response Analysis', () => {
        it('should analyze text response with CMS reference', async () => {
            mockResponse.headers.mockReturnValue({ 'content-type': 'text/html' });
            mockPage.evaluate.mockResolvedValue('This is a WordPress powered site');

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.7);
            expect(result.method).toBe('api-endpoint');
        });

        it('should analyze text response without CMS reference', async () => {
            mockResponse.headers.mockReturnValue({ 'content-type': 'text/html' });
            mockPage.evaluate.mockResolvedValue('This is some other content');

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.4);
        });

        it('should handle text analysis errors', async () => {
            mockResponse.headers.mockReturnValue({ 'content-type': 'text/html' });
            mockPage.evaluate.mockRejectedValue(new Error('Page evaluation failed'));

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.3);
            expect(result.error).toBe('Failed to analyze text response');
        });
    });

    describe('HTTP Status Handling', () => {
        it('should handle 404 responses', async () => {
            mockResponse.status.mockReturnValue(404);

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0);
            expect(result.error).toBe('API endpoint not found (404)');
        });

        it('should handle non-200 status codes', async () => {
            mockResponse.status.mockReturnValue(403);

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.3);
            expect(result.error).toBe('API endpoint returned status 403');
        });

        it('should handle no response', async () => {
            mockPage.goto.mockResolvedValue(null);

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0);
            expect(result.error).toBe('No response from API endpoint');
        });
    });

    describe('Error Handling', () => {
        it('should handle navigation errors', async () => {
            mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0);
            expect(result.error).toBe('API endpoint check failed: Navigation timeout');
        });

        it('should handle page evaluation errors in JSON analysis', async () => {
            mockPage.evaluate.mockRejectedValue(new Error('Page destroyed'));

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.5);
            expect(result.error).toBe('Failed to parse JSON response');
        });
    });

    describe('URL Construction', () => {
        it('should construct API URL correctly with trailing slash', async () => {
            await strategy.detect(mockPage, 'https://example.com/');

            expect(mockPage.goto).toHaveBeenCalledWith(
                'https://example.com/wp-json/wp/v2',
                expect.any(Object)
            );
        });

        it('should construct API URL correctly without trailing slash', async () => {
            await strategy.detect(mockPage, 'https://example.com');

            expect(mockPage.goto).toHaveBeenCalledWith(
                'https://example.com/wp-json/wp/v2',
                expect.any(Object)
            );
        });
    });

    describe('Version Extraction', () => {
        it('should extract version from various patterns', async () => {
            const testCases = [
                { text: 'version: "5.8.1"', expected: '5.8.1' },
                { text: '"version":"4.9.18"', expected: '4.9.18' },
                { text: 'v6.3.1', expected: '6.3.1' },
                { text: 'no version here', expected: undefined }
            ];

            for (const testCase of testCases) {
                const extractMethod = (strategy as any).extractVersionFromText;
                const result = extractMethod(testCase.text);
                expect(result).toBe(testCase.expected);
            }
        });
    });

    describe('CMS-Specific JSON Analysis', () => {
        it('should analyze WordPress JSON structure without wordpress object', async () => {
            const wordpressJson = JSON.stringify({
                name: 'My Site',
                description: 'A site',
                version: '6.3.1'
            });

            mockPage.evaluate.mockResolvedValue(wordpressJson);

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.9);
            expect(result.version).toBe('6.3.1');
        });

        it('should analyze Joomla JSON with attributes only', async () => {
            const joomlaStrategy = new ApiEndpointStrategy('/api', 'Joomla');
            const joomlaJson = JSON.stringify({
                attributes: { type: 'cms' },
                version: '4.2.0'
            });

            mockPage.evaluate.mockResolvedValue(joomlaJson);

            const result = await joomlaStrategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.9);
            expect(result.version).toBe('4.2.0');
        });

        it('should analyze Drupal JSON with core object', async () => {
            const drupalStrategy = new ApiEndpointStrategy('/jsonapi', 'Drupal');
            const drupalJson = JSON.stringify({
                core: { version: '10.1.5' },
                data: []
            });

            mockPage.evaluate.mockResolvedValue(drupalJson);

            const result = await drupalStrategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.9);
            expect(result.version).toBe('10.1.5');
        });

        it('should analyze Drupal JSON as array', async () => {
            const drupalStrategy = new ApiEndpointStrategy('/jsonapi', 'Drupal');
            const drupalJson = JSON.stringify([
                { type: 'node--article', id: '1' }
            ]);

            mockPage.evaluate.mockResolvedValue(drupalJson);

            const result = await drupalStrategy.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBe(0.9);
        });
    });
});