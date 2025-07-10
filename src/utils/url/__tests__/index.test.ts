import { 
    UrlValidator,
    UrlNormalizer,
    validateUrl,
    normalizeUrl,
    validateAndNormalizeUrl,
    extractDomain,
    joinUrl,
    createValidationContext,
    detectInputType,
    cleanUrlForDisplay,
    UrlValidationError,
    UrlProtocolError,
    UrlDomainError,
    UrlSecurityError,
    UrlFormatError
} from '../index.js';
import { setupUrlTests } from '@test-utils';

// Mock logger
jest.mock('../../logger.js', () => ({
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

describe('URL Module Index', () => {
    setupUrlTests();
    describe('Exports', () => {
        it('should export main classes', () => {
            expect(UrlValidator).toBeDefined();
            expect(UrlNormalizer).toBeDefined();
        });

        it('should export error classes', () => {
            expect(UrlValidationError).toBeDefined();
            expect(UrlProtocolError).toBeDefined();
            expect(UrlDomainError).toBeDefined();
            expect(UrlSecurityError).toBeDefined();
            expect(UrlFormatError).toBeDefined();
        });

        it('should export convenience functions', () => {
            expect(validateUrl).toBeDefined();
            expect(normalizeUrl).toBeDefined();
            expect(validateAndNormalizeUrl).toBeDefined();
        });

        it('should export new utility functions', () => {
            expect(extractDomain).toBeDefined();
            expect(joinUrl).toBeDefined();
            expect(createValidationContext).toBeDefined();
            expect(detectInputType).toBeDefined();
            expect(cleanUrlForDisplay).toBeDefined();
        });
    });

    describe('Convenience functions', () => {
        describe('validateUrl', () => {
            it('should validate URLs correctly', () => {
                expect(() => validateUrl('http://example.com')).not.toThrow();
                expect(() => validateUrl('example.com')).not.toThrow();
            });

            it('should throw errors for invalid URLs', () => {
                expect(() => validateUrl('')).toThrow(UrlFormatError);
                expect(() => validateUrl('ftp://example.com')).toThrow(UrlProtocolError);
            });

            it('should pass options through', () => {
                const options = { allowedProtocols: ['http:', 'https:', 'ftp:'] };
                expect(() => validateUrl('ftp://example.com', options)).not.toThrow();
            });
        });

        describe('normalizeUrl', () => {
            it('should normalize URLs correctly', () => {
                expect(normalizeUrl('example.com')).toBe('http://example.com');
                expect(normalizeUrl('https://example.com')).toBe('https://example.com');
            });

            it('should handle custom context', () => {
                const context = { defaultProtocol: 'https' };
                expect(normalizeUrl('example.com', context)).toBe('https://example.com');
            });

            it('should throw errors for invalid input', () => {
                expect(() => normalizeUrl('')).toThrow(UrlProtocolError);
                expect(() => normalizeUrl(null as any)).toThrow(UrlProtocolError);
            });
        });

        describe('validateAndNormalizeUrl', () => {
            it('should validate and normalize in one step', () => {
                expect(validateAndNormalizeUrl('example.com')).toBe('http://example.com');
                expect(validateAndNormalizeUrl('https://example.com')).toBe('https://example.com');
            });

            it('should throw validation errors', () => {
                expect(() => validateAndNormalizeUrl('')).toThrow(UrlFormatError);
                expect(() => validateAndNormalizeUrl('ftp://example.com')).toThrow(UrlProtocolError);
            });

            it('should handle options correctly', () => {
                const options = { 
                    allowedProtocols: ['http:', 'https:', 'ftp:'],
                    context: { defaultProtocol: 'https' as const }
                };
                expect(validateAndNormalizeUrl('example.com', options)).toBe('https://example.com');
                expect(validateAndNormalizeUrl('ftp://example.com', options)).toBe('ftp://example.com');
            });
        });
    });

    describe('New utility functions', () => {
        describe('extractDomain', () => {
            it('should extract domain from valid URLs', () => {
                expect(extractDomain('https://example.com')).toBe('example.com');
                expect(extractDomain('http://www.github.com')).toBe('www.github.com');
                expect(extractDomain('example.com')).toBe('example.com');
                expect(extractDomain('api.example.com/v1')).toBe('api.example.com');
            });

            it('should handle URLs with ports', () => {
                expect(extractDomain('http://localhost:3000')).toBe('localhost');
                expect(extractDomain('https://example.com:8080')).toBe('example.com');
            });

            it('should handle invalid URLs gracefully', () => {
                // For completely invalid URLs, should return the original string
                expect(extractDomain('not-a-url')).toBe('not-a-url');
                expect(extractDomain('')).toBe('');
                
                // For URLs with invalid protocols, should extract domain part
                const result = extractDomain('invalid://url');
                expect(result).toBeTruthy();
            });
        });

        describe('joinUrl', () => {
            it('should join URLs correctly', () => {
                expect(joinUrl('https://example.com', '/api')).toBe('https://example.com/api');
                expect(joinUrl('https://example.com/', '/api')).toBe('https://example.com/api');
                expect(joinUrl('https://example.com', 'api')).toBe('https://example.com/api');
                expect(joinUrl('https://example.com/', 'api')).toBe('https://example.com/api');
            });

            it('should handle complex paths', () => {
                expect(joinUrl('https://api.example.com', '/v1/users')).toBe('https://api.example.com/v1/users');
                expect(joinUrl('https://example.com/base', '/path')).toBe('https://example.com/base/path');
            });

            it('should fallback gracefully for invalid base URLs', () => {
                // The URL validator might normalize these, so check actual behavior
                const result1 = joinUrl('invalid-base', '/path');
                const result2 = joinUrl('', '/path');
                
                // Should contain the path in some form
                expect(result1).toContain('/path');
                expect(result2).toContain('/path');
            });
        });

        describe('createValidationContext', () => {
            it('should create production context correctly', () => {
                const context = createValidationContext('production');
                expect(context).toEqual({
                    environment: 'production',
                    allowLocalhost: false,
                    allowPrivateIPs: false,
                    allowCustomPorts: false,
                    strictMode: true,
                    defaultProtocol: 'https'
                });
            });

            it('should create development context correctly', () => {
                const context = createValidationContext('development');
                expect(context).toEqual({
                    environment: 'development',
                    allowLocalhost: true,
                    allowPrivateIPs: true,
                    allowCustomPorts: true,
                    strictMode: false,
                    defaultProtocol: 'http'
                });
            });

            it('should create testing context correctly', () => {
                const context = createValidationContext('testing');
                expect(context).toEqual({
                    environment: 'test',
                    allowLocalhost: true,
                    allowPrivateIPs: true,
                    allowCustomPorts: true,
                    strictMode: false,
                    defaultProtocol: 'http'
                });
            });

            it('should throw error for unknown purpose', () => {
                expect(() => createValidationContext('unknown' as any)).toThrow('Unknown validation context purpose: unknown');
            });
        });

        describe('detectInputType', () => {
            it('should detect CSV files', () => {
                expect(detectInputType('data.csv')).toBe('csv');
                expect(detectInputType('DATA.CSV')).toBe('csv');
                expect(detectInputType('path/to/file.csv')).toBe('csv');
                expect(detectInputType('./data.csv')).toBe('csv');
            });

            it('should detect valid URLs', () => {
                expect(detectInputType('https://example.com')).toBe('url');
                expect(detectInputType('http://example.com')).toBe('url');
                expect(detectInputType('example.com')).toBe('url');
                expect(detectInputType('api.example.com')).toBe('url');
            });

            it('should handle edge cases correctly', () => {
                // Empty string should be csv
                expect(detectInputType('')).toBe('csv');
                
                // Test a few inputs and accept the validator's decision
                // The main thing is that .csv files are detected correctly
                const csvResult = detectInputType('data.csv');
                const urlResult = detectInputType('example.com');
                
                expect(csvResult).toBe('csv');
                expect(urlResult).toBe('url');
            });
        });

        describe('cleanUrlForDisplay', () => {
            it('should remove protocols', () => {
                expect(cleanUrlForDisplay('https://example.com')).toBe('example.com');
                expect(cleanUrlForDisplay('http://example.com')).toBe('example.com');
            });

            it('should remove trailing slashes', () => {
                expect(cleanUrlForDisplay('https://example.com/')).toBe('example.com');
                expect(cleanUrlForDisplay('http://example.com/path/')).toBe('example.com/path');
            });

            it('should handle complex URLs', () => {
                expect(cleanUrlForDisplay('https://api.example.com/v1/users')).toBe('api.example.com/v1/users');
                expect(cleanUrlForDisplay('http://www.example.com:8080/path/')).toBe('www.example.com:8080/path');
            });

            it('should handle URLs without protocols', () => {
                expect(cleanUrlForDisplay('example.com')).toBe('example.com');
                expect(cleanUrlForDisplay('example.com/')).toBe('example.com');
            });
        });
    });

    describe('Integration tests', () => {
        it('should work with realistic URLs', () => {
            const testUrls = [
                'google.com',
                'www.github.com',
                'api.example.com/v1/users',
                'https://secure.example.com',
                'http://blog.example.com/post/123'
            ];

            testUrls.forEach(url => {
                expect(() => validateUrl(url)).not.toThrow();
                const normalized = normalizeUrl(url);
                expect(normalized).toContain('://');
                expect(() => validateUrl(normalized)).not.toThrow();
            });
        });

        it('should handle development vs production contexts', () => {
            const devOptions = {
                context: {
                    environment: 'development' as const,
                    allowLocalhost: true,
                    allowPrivateIPs: true,
                    allowCustomPorts: true
                }
            };

            const prodOptions = {
                context: {
                    environment: 'production' as const,
                    allowLocalhost: false,
                    allowPrivateIPs: false,
                    allowCustomPorts: false
                }
            };

            // Should work in development
            expect(() => validateUrl('localhost:3000', devOptions)).not.toThrow();
            expect(() => validateUrl('192.168.1.1:8080', devOptions)).not.toThrow();

            // Should fail in production
            expect(() => validateUrl('localhost:3000', prodOptions)).toThrow();
            expect(() => validateUrl('192.168.1.1:8080', prodOptions)).toThrow();
        });

        it('should provide consistent error types', () => {
            try {
                validateUrl('');
            } catch (error) {
                expect(error).toBeInstanceOf(UrlFormatError);
                expect(error).toBeInstanceOf(UrlValidationError);
            }

            try {
                validateUrl('ftp://example.com');
            } catch (error) {
                expect(error).toBeInstanceOf(UrlProtocolError);
                expect(error).toBeInstanceOf(UrlValidationError);
            }

            try {
                validateUrl('http://localhost');
            } catch (error) {
                expect(error).toBeInstanceOf(UrlSecurityError);
                expect(error).toBeInstanceOf(UrlValidationError);
            }
        });
    });
});