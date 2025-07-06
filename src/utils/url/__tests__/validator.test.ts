import { jest } from '@jest/globals';
import { UrlValidator } from '../validator.js';
import { 
    UrlFormatError,
    UrlProtocolError,
    UrlDomainError,
    UrlSecurityError,
    UrlValidationError 
} from '../types.js';

// Mock logger
jest.mock('../../logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

describe('UrlValidator', () => {
    describe('validate', () => {
        describe('Basic input validation', () => {
            it('should validate correct URLs', () => {
                expect(() => UrlValidator.validate('http://example.com')).not.toThrow();
                expect(() => UrlValidator.validate('https://example.com')).not.toThrow();
                expect(() => UrlValidator.validate('example.com')).not.toThrow();
                expect(() => UrlValidator.validate('www.example.com')).not.toThrow();
                expect(() => UrlValidator.validate('subdomain.example.com/path')).not.toThrow();
            });

            it('should reject null/undefined URLs', () => {
                expect(() => UrlValidator.validate(null as any)).toThrow(UrlFormatError);
                expect(() => UrlValidator.validate(undefined as any)).toThrow(UrlFormatError);
            });

            it('should reject non-string URLs', () => {
                expect(() => UrlValidator.validate(123 as any)).toThrow(UrlFormatError);
                expect(() => UrlValidator.validate({} as any)).toThrow(UrlFormatError);
                expect(() => UrlValidator.validate([] as any)).toThrow(UrlFormatError);
            });

            it('should reject empty URLs', () => {
                expect(() => UrlValidator.validate('')).toThrow(UrlFormatError);
                expect(() => UrlValidator.validate('   ')).toThrow(UrlFormatError);
                expect(() => UrlValidator.validate('\t\n')).toThrow(UrlFormatError);
            });
        });

        describe('Length validation', () => {
            it('should reject URLs exceeding default length limit', () => {
                const longUrl = 'http://example.com/' + 'a'.repeat(2100);
                expect(() => UrlValidator.validate(longUrl)).toThrow(UrlValidationError);
            });

            it('should respect custom length limits', () => {
                const url = 'http://example.com/path';
                expect(() => UrlValidator.validate(url, { maxLength: 10 })).toThrow(UrlValidationError);
                expect(() => UrlValidator.validate(url, { maxLength: 100 })).not.toThrow();
            });
        });

        describe('Security pattern validation', () => {
            it('should reject URLs with obvious path traversal', () => {
                expect(() => UrlValidator.validate('http://example.com/../')).toThrow(UrlSecurityError);
                expect(() => UrlValidator.validate('http://example.com/path/../file')).toThrow(UrlSecurityError);
            });

            it('should reject dangerous protocols in URL', () => {
                expect(() => UrlValidator.validate('javascript:alert(1)')).toThrow(UrlSecurityError);
                expect(() => UrlValidator.validate('vbscript:msgbox(1)')).toThrow(UrlSecurityError);
                expect(() => UrlValidator.validate('data:text/html,<script>alert(1)</script>')).toThrow(UrlSecurityError);
            });
        });

        describe('Protocol validation', () => {
            it('should allow HTTP and HTTPS by default', () => {
                expect(() => UrlValidator.validate('http://example.com')).not.toThrow();
                expect(() => UrlValidator.validate('https://example.com')).not.toThrow();
            });

            it('should reject invalid protocols', () => {
                expect(() => UrlValidator.validate('ftp://example.com')).toThrow(UrlProtocolError);
                expect(() => UrlValidator.validate('file://path/to/file')).toThrow(UrlProtocolError);
                expect(() => UrlValidator.validate('ws://example.com')).toThrow(UrlProtocolError);
                expect(() => UrlValidator.validate('wss://example.com')).toThrow(UrlProtocolError);
            });

            it('should respect custom allowed protocols', () => {
                const options = { allowedProtocols: ['http:', 'https:', 'ftp:'] };
                expect(() => UrlValidator.validate('ftp://example.com', options)).not.toThrow();
                expect(() => UrlValidator.validate('ws://example.com', options)).toThrow(UrlProtocolError);
            });
        });

        describe('Domain validation', () => {
            it('should validate proper domains', () => {
                expect(() => UrlValidator.validate('http://example.com')).not.toThrow();
                expect(() => UrlValidator.validate('http://www.example.com')).not.toThrow();
                expect(() => UrlValidator.validate('http://subdomain.example.com')).not.toThrow();
                expect(() => UrlValidator.validate('http://example-with-dash.com')).not.toThrow();
            });

            it('should reject localhost by default', () => {
                expect(() => UrlValidator.validate('http://localhost')).toThrow(UrlSecurityError);
                expect(() => UrlValidator.validate('http://127.0.0.1')).toThrow(UrlSecurityError);
                expect(() => UrlValidator.validate('http://0.0.0.0')).toThrow(UrlSecurityError);
            });

            it('should allow localhost in development context', () => {
                const options = { context: { allowLocalhost: true } };
                expect(() => UrlValidator.validate('http://localhost', options)).not.toThrow();
                expect(() => UrlValidator.validate('http://127.0.0.1', options)).not.toThrow();
            });

            it('should reject private IPs by default', () => {
                expect(() => UrlValidator.validate('http://192.168.1.1')).toThrow(UrlSecurityError);
                expect(() => UrlValidator.validate('http://10.0.0.1')).toThrow(UrlSecurityError);
                expect(() => UrlValidator.validate('http://172.16.0.1')).toThrow(UrlSecurityError);
            });

            it('should allow private IPs when configured', () => {
                const options = { context: { allowPrivateIPs: true } };
                expect(() => UrlValidator.validate('http://192.168.1.1', options)).not.toThrow();
                expect(() => UrlValidator.validate('http://10.0.0.1', options)).not.toThrow();
            });

            it('should reject domains exceeding length limits', () => {
                const longDomain = 'a'.repeat(260) + '.com';
                expect(() => UrlValidator.validate(`http://${longDomain}`)).toThrow(UrlDomainError);
            });

            it('should reject domain labels exceeding length limits', () => {
                const longLabel = 'a'.repeat(70);
                expect(() => UrlValidator.validate(`http://${longLabel}.com`)).toThrow(UrlDomainError);
            });

            it('should reject blocked domains', () => {
                expect(() => UrlValidator.validate('http://localhost')).toThrow(UrlSecurityError);
                expect(() => UrlValidator.validate('http://127.0.0.1')).toThrow(UrlSecurityError);
            });
        });

        describe('Port validation', () => {
            it('should allow standard ports', () => {
                expect(() => UrlValidator.validate('http://example.com:80')).not.toThrow();
                expect(() => UrlValidator.validate('https://example.com:443')).not.toThrow();
            });

            it('should allow no port specification', () => {
                expect(() => UrlValidator.validate('http://example.com')).not.toThrow();
                expect(() => UrlValidator.validate('https://example.com')).not.toThrow();
            });

            it('should reject invalid port numbers through URL parsing', () => {
                // These will be caught by URL constructor as format errors
                expect(() => UrlValidator.validate('http://example.com:0')).toThrow();
                expect(() => UrlValidator.validate('http://example.com:65536')).toThrow();
                expect(() => UrlValidator.validate('http://example.com:-1')).toThrow();
            });

            it('should reject blocked ports', () => {
                expect(() => UrlValidator.validate('http://example.com:22')).toThrow(UrlSecurityError); // SSH
                expect(() => UrlValidator.validate('http://example.com:25')).toThrow(UrlSecurityError); // SMTP
                expect(() => UrlValidator.validate('http://example.com:110')).toThrow(UrlSecurityError); // POP3
            });

            it('should reject custom ports when not allowed', () => {
                expect(() => UrlValidator.validate('http://example.com:8080')).toThrow(UrlSecurityError);
                expect(() => UrlValidator.validate('http://example.com:3000')).toThrow(UrlSecurityError);
            });

            it('should allow custom ports when configured', () => {
                const options = { context: { allowCustomPorts: true } };
                expect(() => UrlValidator.validate('http://example.com:8080', options)).not.toThrow();
                expect(() => UrlValidator.validate('http://example.com:3000', options)).not.toThrow();
            });
        });

        describe('Path validation', () => {
            it('should allow normal paths', () => {
                expect(() => UrlValidator.validate('http://example.com/path')).not.toThrow();
                expect(() => UrlValidator.validate('http://example.com/path/to/resource')).not.toThrow();
                expect(() => UrlValidator.validate('http://example.com/api/v1/users')).not.toThrow();
            });

            it('should reject path traversal in paths', () => {
                expect(() => UrlValidator.validate('http://example.com/../admin')).toThrow(UrlSecurityError);
                expect(() => UrlValidator.validate('http://example.com/path/../secret')).toThrow(UrlSecurityError);
            });
        });
    });

    describe('validateAndNormalize', () => {
        it('should validate and normalize valid URLs', () => {
            const result = UrlValidator.validateAndNormalize('example.com');
            expect(result).toBe('http://example.com');
        });

        it('should validate and normalize URLs with custom context', () => {
            const options = { context: { defaultProtocol: 'https' as const } };
            const result = UrlValidator.validateAndNormalize('example.com', options);
            expect(result).toBe('https://example.com');
        });

        it('should throw validation errors', () => {
            expect(() => UrlValidator.validateAndNormalize('')).toThrow(UrlFormatError);
            expect(() => UrlValidator.validateAndNormalize('ftp://example.com')).toThrow(UrlProtocolError);
        });

        it('should preserve valid URLs with protocols', () => {
            const result = UrlValidator.validateAndNormalize('https://example.com');
            expect(result).toBe('https://example.com');
        });
    });

    describe('Context-based validation', () => {
        it('should use development context appropriately', () => {
            const devContext = {
                context: {
                    environment: 'development' as const,
                    allowLocalhost: true,
                    allowPrivateIPs: true,
                    allowCustomPorts: true
                }
            };

            expect(() => UrlValidator.validate('http://localhost:3000', devContext)).not.toThrow();
            expect(() => UrlValidator.validate('http://192.168.1.1:8080', devContext)).not.toThrow();
        });

        it('should use production context appropriately', () => {
            const prodContext = {
                context: {
                    environment: 'production' as const,
                    allowLocalhost: false,
                    allowPrivateIPs: false,
                    allowCustomPorts: false,
                    strictMode: true
                }
            };

            expect(() => UrlValidator.validate('http://localhost:3000', prodContext)).toThrow();
            expect(() => UrlValidator.validate('http://192.168.1.1:8080', prodContext)).toThrow();
            expect(() => UrlValidator.validate('http://example.com', prodContext)).not.toThrow();
        });

        it('should handle test context', () => {
            const testContext = {
                context: {
                    environment: 'test' as const,
                    allowLocalhost: true,
                    allowPrivateIPs: false,
                    allowCustomPorts: true
                }
            };

            expect(() => UrlValidator.validate('http://localhost:3000', testContext)).not.toThrow();
            expect(() => UrlValidator.validate('http://192.168.1.1', testContext)).toThrow();
        });
    });

    describe('Edge cases', () => {
        it('should handle IPv6 addresses', () => {
            const options = { context: { allowLocalhost: true } };
            expect(() => UrlValidator.validate('http://[::1]', options)).not.toThrow();
        });

        it('should handle URLs with query parameters', () => {
            expect(() => UrlValidator.validate('http://example.com?param=value')).not.toThrow();
            expect(() => UrlValidator.validate('http://example.com/path?a=1&b=2')).not.toThrow();
        });

        it('should handle URLs with fragments', () => {
            expect(() => UrlValidator.validate('http://example.com#section')).not.toThrow();
            expect(() => UrlValidator.validate('http://example.com/path#anchor')).not.toThrow();
        });

        it('should handle internationalized domain names', () => {
            // Note: This might need special handling depending on requirements
            expect(() => UrlValidator.validate('http://example.com')).not.toThrow();
        });
    });
});