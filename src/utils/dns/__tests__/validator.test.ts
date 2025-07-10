import { validateDNS, extractDomain, DNSSkipReason } from '../validator.js';

// Mock logger
jest.mock('../../logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

describe('DNS Validator', () => {
    describe('extractDomain', () => {
        it('should be imported from centralized URL utilities', () => {
            expect(extractDomain).toBeDefined();
            expect(typeof extractDomain).toBe('function');
        });

        it('should extract domains correctly', () => {
            expect(extractDomain('https://example.com')).toBe('example.com');
            expect(extractDomain('example.com')).toBe('example.com');
            expect(extractDomain('https://www.google.com')).toBe('www.google.com');
        });

        it('should handle URLs with ports', () => {
            expect(extractDomain('https://example.com:8080')).toBe('example.com');
            expect(extractDomain('localhost:3000')).toBe('localhost');
        });

        it('should handle invalid URLs gracefully', () => {
            expect(extractDomain('')).toBe('');
            expect(extractDomain('not-a-url')).toBe('not-a-url');
        });
    });

    describe('validateDNS', () => {
        it('should validate valid domains', async () => {
            const result = await validateDNS('google.com');
            
            expect(result).toHaveProperty('valid');
            expect(result).toHaveProperty('duration');
            expect(typeof result.valid).toBe('boolean');
            expect(typeof result.duration).toBe('number');
        }, 10000);

        it('should handle invalid domains', async () => {
            const result = await validateDNS('definitely-not-a-real-domain-12345.invalid');
            
            expect(result.valid).toBe(false);
            expect(result.reason).toBeTruthy();
            expect(result.duration).toBeGreaterThan(0);
        }, 10000);

        it('should handle empty URLs', async () => {
            const result = await validateDNS('');
            
            expect(result.valid).toBe(false);
            expect(result.reason).toBe(DNSSkipReason.EMPTY_URL);
        });

        it('should respect timeout', async () => {
            const startTime = Date.now();
            const result = await validateDNS('google.com', 100);
            const endTime = Date.now();
            
            expect(endTime - startTime).toBeLessThan(1000); // Should be much less than 1 second
            expect(result).toHaveProperty('valid');
        }, 5000);
    });
});