import { UrlNormalizer } from '../normalizer.js';
import { UrlProtocolError } from '../types.js';
import { setupUrlTests, setupJestExtensions } from '@test-utils';

// Setup custom Jest matchers
setupJestExtensions();

describe('UrlNormalizer', () => {
    setupUrlTests();
    describe('normalizeUrl', () => {
        it('should add HTTP protocol to URLs without protocol', () => {
            expect(UrlNormalizer.normalizeUrl('example.com')).toBe('http://example.com');
            expect(UrlNormalizer.normalizeUrl('www.example.com')).toBe('http://www.example.com');
            expect(UrlNormalizer.normalizeUrl('subdomain.example.com')).toBe('http://subdomain.example.com');
        });

        it('should preserve existing HTTP protocol', () => {
            expect(UrlNormalizer.normalizeUrl('http://example.com')).toBe('http://example.com');
            expect(UrlNormalizer.normalizeUrl('http://www.example.com/path')).toBe('http://www.example.com/path');
        });

        it('should preserve existing HTTPS protocol', () => {
            expect(UrlNormalizer.normalizeUrl('https://example.com')).toBe('https://example.com');
            expect(UrlNormalizer.normalizeUrl('https://www.example.com/path')).toBe('https://www.example.com/path');
        });

        it('should handle URLs with paths and query parameters', () => {
            expect(UrlNormalizer.normalizeUrl('example.com/path?query=value')).toBe('http://example.com/path?query=value');
            expect(UrlNormalizer.normalizeUrl('example.com:8080/api/v1')).toBe('http://example.com:8080/api/v1');
        });

        it('should trim whitespace', () => {
            expect(UrlNormalizer.normalizeUrl('  example.com  ')).toBe('http://example.com');
            expect(UrlNormalizer.normalizeUrl('\texample.com\n')).toBe('http://example.com');
        });

        it('should use custom default protocol', () => {
            const context = { defaultProtocol: 'https' as const };
            expect(UrlNormalizer.normalizeUrl('example.com', context)).toBe('https://example.com');
        });

        it('should throw error for null/undefined URLs', () => {
            expect(() => UrlNormalizer.normalizeUrl(null as any)).toThrow(UrlProtocolError);
            expect(() => UrlNormalizer.normalizeUrl(undefined as any)).toThrow(UrlProtocolError);
            expect(() => UrlNormalizer.normalizeUrl('')).toThrow(UrlProtocolError);
        });

        it('should throw error for non-string URLs', () => {
            expect(() => UrlNormalizer.normalizeUrl(123 as any)).toThrow(UrlProtocolError);
            expect(() => UrlNormalizer.normalizeUrl({} as any)).toThrow(UrlProtocolError);
        });
    });

    describe('hasProtocol', () => {
        it('should detect URLs with protocols', () => {
            expect(UrlNormalizer.hasProtocol('http://example.com')).toBe(true);
            expect(UrlNormalizer.hasProtocol('https://example.com')).toBe(true);
            expect(UrlNormalizer.hasProtocol('ftp://example.com')).toBe(true);
            expect(UrlNormalizer.hasProtocol('ws://example.com')).toBe(true);
        });

        it('should detect URLs without protocols', () => {
            expect(UrlNormalizer.hasProtocol('example.com')).toBe(false);
            expect(UrlNormalizer.hasProtocol('www.example.com')).toBe(false);
            expect(UrlNormalizer.hasProtocol('subdomain.example.com/path')).toBe(false);
        });

        it('should handle edge cases', () => {
            expect(UrlNormalizer.hasProtocol('://example.com')).toBe(false); // Invalid protocol
            expect(UrlNormalizer.hasProtocol('http:/example.com')).toBe(false); // Missing slash
            expect(UrlNormalizer.hasProtocol('http:example.com')).toBe(false); // Missing slashes
        });
    });

    describe('extractProtocol', () => {
        it('should extract protocols from valid URLs', () => {
            expect(UrlNormalizer.extractProtocol('http://example.com')).toBe('http:');
            expect(UrlNormalizer.extractProtocol('https://example.com')).toBe('https:');
            expect(UrlNormalizer.extractProtocol('ftp://example.com')).toBe('ftp:');
        });

        it('should return null for invalid URLs', () => {
            expect(UrlNormalizer.extractProtocol('example.com')).toBe(null);
            expect(UrlNormalizer.extractProtocol('invalid-url')).toBe(null);
            expect(UrlNormalizer.extractProtocol('')).toBe(null);
        });
    });

    describe('removeProtocol', () => {
        it('should remove protocols from URLs', () => {
            expect(UrlNormalizer.removeProtocol('http://example.com')).toBe('example.com');
            expect(UrlNormalizer.removeProtocol('https://www.example.com/path')).toBe('www.example.com/path');
            expect(UrlNormalizer.removeProtocol('ftp://files.example.com')).toBe('files.example.com');
        });

        it('should return unchanged URLs without protocols', () => {
            expect(UrlNormalizer.removeProtocol('example.com')).toBe('example.com');
            expect(UrlNormalizer.removeProtocol('www.example.com/path')).toBe('www.example.com/path');
        });
    });

    describe('upgradeToHttps', () => {
        it('should upgrade HTTP to HTTPS', () => {
            expect(UrlNormalizer.upgradeToHttps('http://example.com')).toBe('https://example.com');
            expect(UrlNormalizer.upgradeToHttps('http://www.example.com/path')).toBe('https://www.example.com/path');
        });

        it('should leave HTTPS URLs unchanged', () => {
            expect(UrlNormalizer.upgradeToHttps('https://example.com')).toBe('https://example.com');
            expect(UrlNormalizer.upgradeToHttps('https://www.example.com/path')).toBe('https://www.example.com/path');
        });

        it('should leave non-HTTP URLs unchanged', () => {
            expect(UrlNormalizer.upgradeToHttps('ftp://example.com')).toBe('ftp://example.com');
            expect(UrlNormalizer.upgradeToHttps('example.com')).toBe('example.com');
        });
    });

    describe('downgradeToHttp', () => {
        it('should downgrade HTTPS to HTTP', () => {
            expect(UrlNormalizer.downgradeToHttp('https://example.com')).toBe('http://example.com');
            expect(UrlNormalizer.downgradeToHttp('https://www.example.com/path')).toBe('http://www.example.com/path');
        });

        it('should leave HTTP URLs unchanged', () => {
            expect(UrlNormalizer.downgradeToHttp('http://example.com')).toBe('http://example.com');
            expect(UrlNormalizer.downgradeToHttp('http://www.example.com/path')).toBe('http://www.example.com/path');
        });

        it('should leave non-HTTPS URLs unchanged', () => {
            expect(UrlNormalizer.downgradeToHttp('ftp://example.com')).toBe('ftp://example.com');
            expect(UrlNormalizer.downgradeToHttp('example.com')).toBe('example.com');
        });
    });

    describe('cleanUrl', () => {
        it('should remove fragments', () => {
            expect(UrlNormalizer.cleanUrl('http://example.com#fragment')).toBe('http://example.com/');
            expect(UrlNormalizer.cleanUrl('http://example.com/path#section')).toBe('http://example.com/path');
        });

        it('should preserve query parameters by default', () => {
            expect(UrlNormalizer.cleanUrl('http://example.com?query=value')).toBe('http://example.com/?query=value');
            expect(UrlNormalizer.cleanUrl('http://example.com/path?a=1&b=2')).toBe('http://example.com/path?a=1&b=2');
        });

        it('should remove query parameters when requested', () => {
            expect(UrlNormalizer.cleanUrl('http://example.com?query=value', false)).toBe('http://example.com/');
            expect(UrlNormalizer.cleanUrl('http://example.com/path?a=1&b=2', false)).toBe('http://example.com/path');
        });

        it('should handle invalid URLs gracefully', () => {
            expect(UrlNormalizer.cleanUrl('invalid-url')).toBe('invalid-url');
            expect(UrlNormalizer.cleanUrl('')).toBe('');
        });
    });

    describe('normalizeDomain', () => {
        it('should convert domain to lowercase', () => {
            expect(UrlNormalizer.normalizeDomain('http://EXAMPLE.COM')).toBe('http://example.com/');
            expect(UrlNormalizer.normalizeDomain('https://WWW.EXAMPLE.COM/PATH')).toBe('https://www.example.com/PATH');
            expect(UrlNormalizer.normalizeDomain('http://SubDomain.Example.Com')).toBe('http://subdomain.example.com/');
        });

        it('should preserve path case', () => {
            expect(UrlNormalizer.normalizeDomain('http://EXAMPLE.COM/CaseSensitivePath')).toBe('http://example.com/CaseSensitivePath');
        });

        it('should handle invalid URLs gracefully', () => {
            expect(UrlNormalizer.normalizeDomain('invalid-url')).toBe('invalid-url');
            expect(UrlNormalizer.normalizeDomain('')).toBe('');
        });
    });
});