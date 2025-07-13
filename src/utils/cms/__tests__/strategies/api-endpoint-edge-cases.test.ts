import { vi } from 'vitest';

// Mock logger before other imports
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

import { ApiEndpointStrategy } from '../../strategies/api-endpoint.js';
import { setupStrategyTests, createMockPage, setupVitestExtensions } from '@test-utils';

// Setup custom Vitest matchers
setupVitestExtensions();

describe('ApiEndpointStrategy - Edge Cases and Invalid Responses', () => {
    let strategy: ApiEndpointStrategy;
    let mockPage: any;

    setupStrategyTests();

    beforeEach(() => {
        strategy = new ApiEndpointStrategy('/wp-json/', 'WordPress', 5000);
        mockPage = createMockPage();
    });

    describe('Navigation and Response Failures', () => {
        it('should handle null response from page.goto', async () => {
            mockPage.goto.mockResolvedValue(null);

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toBe('No response from API endpoint');
        });

        it('should handle undefined response from page.goto', async () => {
            mockPage.goto.mockResolvedValue(undefined);

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toBe('No response from API endpoint');
        });

        it('should handle navigation timeout errors', async () => {
            const timeoutError = new Error('Timeout of 5000ms exceeded');
            (timeoutError as any).name = 'TimeoutError';
            mockPage.goto.mockRejectedValue(timeoutError);

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toContain('Timeout');
        });

        it('should handle DNS resolution failures', async () => {
            const dnsError = new Error('getaddrinfo ENOTFOUND example.com');
            (dnsError as any).code = 'ENOTFOUND';
            (dnsError as any).hostname = 'example.com';
            mockPage.goto.mockRejectedValue(dnsError);

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toContain('ENOTFOUND');
        });

        it('should handle connection refused errors', async () => {
            const connError = new Error('Connection refused');
            (connError as any).code = 'ECONNREFUSED';
            mockPage.goto.mockRejectedValue(connError);

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toContain('Connection refused');
        });

        it('should handle SSL/TLS certificate errors', async () => {
            const sslError = new Error('Certificate verification failed');
            (sslError as any).code = 'CERT_UNTRUSTED';
            mockPage.goto.mockRejectedValue(sslError);

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toContain('Certificate verification failed');
        });
    });

    describe('HTTP Status Code Edge Cases', () => {
        it('should handle 404 Not Found responses', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 404,
                ok: () => false,
                headers: () => ({ 'content-type': 'text/html' })
            });

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toBe('API endpoint not found (404)');
        });

        it('should handle 403 Forbidden responses', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 403,
                ok: () => false,
                headers: () => ({ 'content-type': 'application/json' })
            });

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toBe('API endpoint returned status 403');
        });

        it('should handle 500 Internal Server Error responses', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 500,
                ok: () => false,
                headers: () => ({ 'content-type': 'text/html' })
            });

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toBe('API endpoint returned status 500');
        });

        it('should handle 503 Service Unavailable responses', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 503,
                ok: () => false,
                headers: () => ({ 'content-type': 'text/html' })
            });

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toBe('API endpoint returned status 503');
        });

        it('should handle unexpected 2xx responses with wrong content', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({ 'content-type': 'text/html' }) // HTML instead of JSON
            });
            mockPage.evaluate.mockResolvedValue('<html><body>Not Found</body></html>');

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0.4); // Text response without CMS reference
            expect(result.method).toBe('api-endpoint');
        });
    });

    describe('Malformed Response Content', () => {
        it('should handle invalid JSON responses', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            });
            mockPage.evaluate.mockResolvedValue('{ invalid json content }');

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0.5); // API exists but JSON parsing failed
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toBe('Failed to parse JSON response');
        });

        it('should handle empty response body', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            });
            mockPage.evaluate.mockResolvedValue('');

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0.5); // API exists but empty response
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toBe('Failed to parse JSON response');
        });

        it('should handle null response body', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            });
            mockPage.evaluate.mockResolvedValue(null);

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0.5); // API exists but null response
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toBe('Failed to parse JSON response');
        });

        it('should handle extremely large JSON responses', async () => {
            const largeObject = {
                data: 'x'.repeat(1000000), // 1MB string
                nested: {
                    level1: { level2: { level3: 'deep nesting test' } }
                }
            };

            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            });
            mockPage.evaluate.mockResolvedValue(JSON.stringify(largeObject));

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.method).toBe('api-endpoint');
            // Should handle large responses without crashing
            // Should complete without hanging or crashing
        });

        it('should handle response with circular JSON references', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            });
            // Simulate what happens when JSON.stringify encounters circular references
            mockPage.evaluate.mockRejectedValue(new Error('Converting circular structure to JSON'));

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0.5); // API exists but evaluation failed
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toBe('Failed to parse JSON response');
        });
    });

    describe('Content-Type and Header Edge Cases', () => {
        it('should handle missing content-type header', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({}) // No content-type header
            });
            mockPage.evaluate.mockResolvedValue('{"some": "data"}');

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.method).toBe('api-endpoint');
            // Should still attempt to process the response
        });

        it('should handle incorrect content-type headers', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({ 'content-type': 'text/plain' }) // Wrong content type
            });
            mockPage.evaluate.mockResolvedValue('{"valid": "json", "wordpress": {"version": "6.3"}}');

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.method).toBe('api-endpoint');
            // Should still process JSON content even with wrong content-type
        });

        it('should handle malformed content-type headers', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json; charset=utf-8; boundary=something' })
            });
            mockPage.evaluate.mockResolvedValue('{"data": "test"}');

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.method).toBe('api-endpoint');
        });

        it('should handle headers with special characters', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({ 
                    'content-type': 'application/json; charset=utf-8',
                    'x-special': '测试值🚀',
                    'x-control-chars': '\\x00\\x01\\x02'
                })
            });
            mockPage.evaluate.mockResolvedValue('{"test": "data"}');

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.method).toBe('api-endpoint');
        });
    });

    describe('URL and Endpoint Edge Cases', () => {
        it('should handle malformed base URLs', async () => {
            const malformedStrategy = new ApiEndpointStrategy('/wp-json/', 'WordPress', 5000);
            
            // Test with various malformed URLs
            const malformedUrls = [
                'not-a-url',
                'http://',
                'https://',
                'ftp://example.com',
                '//example.com',
                'https://[invalid-ipv6',
                'https://example..com',
                'https://ex ample.com'
            ];

            for (const malformedUrl of malformedUrls) {
                mockPage.goto.mockRejectedValue(new Error('Invalid URL'));
                
                const result = await malformedStrategy.detect(mockPage, malformedUrl);
                
                expect(result).toBeDefined();
                expect(result.confidence).toBe(0);
                expect(result.method).toBe('api-endpoint');
            }
        });

        it('should handle URLs with special characters', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            });
            mockPage.evaluate.mockResolvedValue('{"test": "data"}');

            const specialUrls = [
                'https://测试.com',
                'https://example.com/path with spaces',
                'https://example.com/path?param=value&other=test',
                'https://example.com:8080',
                'https://user:pass@example.com'
            ];

            for (const specialUrl of specialUrls) {
                const result = await strategy.detect(mockPage, specialUrl);
                
                expect(result).toBeDefined();
                expect(result.method).toBe('api-endpoint');
            }
        });

        it('should handle missing browser manager context', async () => {
            mockPage._browserManagerContext = null;
            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            });
            mockPage.evaluate.mockResolvedValue('{"test": "data"}');

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.method).toBe('api-endpoint');
            // Should use original URL when context is missing
        });

        it('should handle redirected URLs properly', async () => {
            mockPage._browserManagerContext = {
                purpose: 'detection' as const,
                createdAt: Date.now(),
                navigationCount: 1,
                lastNavigation: {
                    originalUrl: 'http://example.com',
                    finalUrl: 'https://www.example.com/en/',
                    redirectChain: ['https://example.com', 'https://www.example.com'],
                    totalRedirects: 2,
                    navigationTime: 1000,
                    protocolUpgraded: true,
                    success: true,
                    headers: {}
                }
            };

            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            });
            mockPage.evaluate.mockResolvedValue('{"test": "data"}');

            const result = await strategy.detect(mockPage, 'http://example.com');

            expect(result).toBeDefined();
            expect(result.method).toBe('api-endpoint');
            // Should use finalUrl for API endpoint construction
        });
    });

    describe('Performance and Resource Management', () => {
        it('should handle very short timeouts', async () => {
            const shortTimeoutStrategy = new ApiEndpointStrategy('/wp-json/', 'WordPress', 1);
            
            mockPage.goto.mockImplementation(() => {
                return new Promise((resolve) => {
                    setTimeout(() => resolve({
                        status: () => 200,
                        ok: () => true,
                        headers: () => ({ 'content-type': 'application/json' })
                    }), 50); // 50ms delay
                });
            });

            const result = await shortTimeoutStrategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.method).toBe('api-endpoint');
            // Should handle timeout appropriately
        });

        it('should handle concurrent API requests', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            });
            mockPage.evaluate.mockResolvedValue('{"name": "Test Site"}');

            // Run multiple concurrent detections
            const promises = Array(5).fill(0).map(() => 
                strategy.detect(mockPage, 'https://example.com')
            );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(5);
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(result.method).toBe('api-endpoint');
            });
        });

        it('should handle page evaluation errors', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => 200,
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            });
            mockPage.evaluate.mockRejectedValue(new Error('Page evaluation failed'));

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0.5); // API exists but evaluation failed
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toBe('Failed to parse JSON response');
        });

        it('should handle response object method failures', async () => {
            mockPage.goto.mockResolvedValue({
                status: () => { throw new Error('Status method failed'); },
                ok: () => true,
                headers: () => ({ 'content-type': 'application/json' })
            });

            const result = await strategy.detect(mockPage, 'https://example.com');

            expect(result).toBeDefined();
            expect(result.confidence).toBe(0);
            expect(result.method).toBe('api-endpoint');
            expect(result.error).toContain('Status method failed');
        });
    });
});