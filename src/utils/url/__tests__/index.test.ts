import { 
    UrlValidator,
    UrlNormalizer,
    validateUrl,
    normalizeUrl,
    validateAndNormalizeUrl,
    UrlValidationError,
    UrlProtocolError,
    UrlDomainError,
    UrlSecurityError,
    UrlFormatError
} from '../index.js';

// Mock logger
jest.mock('../../logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

describe('URL Module Index', () => {
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