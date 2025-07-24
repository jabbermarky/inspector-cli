import { vi } from 'vitest';
import { validateDNS, extractDomain, DNSSkipReason, validateDNSBatch, DNSValidationResult } from '../validator.js';
import { setupAnalysisTests, setupVitestExtensions } from '@test-utils';

// Setup custom Vitest matchers
setupVitestExtensions();

// Create mock functions using vi.hoisted for proper hoisting
const mockResolve4 = vi.hoisted(() => vi.fn());
const mockResolve6 = vi.hoisted(() => vi.fn());

// Mock DNS module before other imports
vi.mock('dns', () => ({
    default: {
        resolve4: mockResolve4,
        resolve6: mockResolve6
    },
    resolve4: mockResolve4,
    resolve6: mockResolve6
}));

// Mock util module
vi.mock('util', () => ({
    promisify: vi.fn((fn) => fn)
}));

// Mock logger
vi.mock('../../logger.js', () => ({
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

describe('DNS Validator', () => {
    setupAnalysisTests();
    
    beforeEach(() => {
        // Reset all mocks before each test - this handles all mock functions
        vi.clearAllMocks();
    });
    
    afterAll(() => {
        // Clean up any remaining timers/promises
        vi.clearAllTimers();
        vi.useRealTimers();
    });
    
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
        describe('successful DNS resolution', () => {
            it('should resolve IPv4 addresses successfully', async () => {
                mockResolve4.mockResolvedValue(['192.168.1.1', '192.168.1.2']);
                mockResolve6.mockRejectedValue(new Error('AAAA not found'));
                
                const result = await validateDNS('example.com');
                
                expect(result.valid).toBe(true);
                expect(result.addresses).toEqual(['192.168.1.1', '192.168.1.2']);
                expect(result.duration).toBeGreaterThanOrEqual(0);
                expect(result.reason).toBeUndefined();
                expect(result.error).toBeUndefined();
            });

            it('should resolve IPv6 addresses successfully', async () => {
                mockResolve4.mockRejectedValue(new Error('A record not found'));
                mockResolve6.mockResolvedValue(['2001:db8::1']);
                
                const result = await validateDNS('ipv6.example.com');
                
                expect(result.valid).toBe(true);
                expect(result.addresses).toEqual(['2001:db8::1']);
                expect(result.duration).toBeGreaterThanOrEqual(0);
            });

            it('should prefer IPv4 when both are available', async () => {
                mockResolve4.mockResolvedValue(['192.168.1.1']);
                mockResolve6.mockResolvedValue(['2001:db8::1']);
                
                const result = await validateDNS('dual-stack.example.com');
                
                expect(result.valid).toBe(true);
                expect(result.addresses).toEqual(['192.168.1.1']);
            });
        });

        describe('input validation', () => {
            it('should handle empty URLs', async () => {
                const result = await validateDNS('');
                
                expect(result.valid).toBe(false);
                expect(result.reason).toBe(DNSSkipReason.EMPTY_URL);
                expect(result.duration).toBeGreaterThanOrEqual(0);
            });

            it('should handle whitespace-only URLs', async () => {
                const result = await validateDNS('   ');
                
                expect(result.valid).toBe(false);
                expect(result.reason).toBe(DNSSkipReason.EMPTY_URL);
            });

            it('should handle null and undefined URLs', async () => {
                const nullResult = await validateDNS(null as any);
                const undefinedResult = await validateDNS(undefined as any);
                
                expect(nullResult.valid).toBe(false);
                expect(nullResult.reason).toBe(DNSSkipReason.EMPTY_URL);
                expect(undefinedResult.valid).toBe(false);
                expect(undefinedResult.reason).toBe(DNSSkipReason.EMPTY_URL);
            });

            it('should reject invalid domain formats', async () => {
                const invalidDomains = [
                    'invalid_domain',
                    'domain..com',
                    '.invalid.com',
                    'domain.c',
                    'domain.',
                    'http://not-a-domain',
                    'domain with spaces.com'
                ];
                
                for (const domain of invalidDomains) {
                    const result = await validateDNS(domain);
                    expect(result.valid).toBe(false);
                    expect(result.reason).toBe(DNSSkipReason.INVALID_FORMAT);
                }
            });
        });

        describe('DNS error handling', () => {
            it('should handle all DNS resolution failures', async () => {
                const notFoundError = new Error('Domain not found') as any;
                notFoundError.code = 'ENOTFOUND';
                mockResolve4.mockRejectedValue(notFoundError);
                mockResolve6.mockRejectedValue(notFoundError);
                
                const result = await validateDNS('nonexistent.example.com');
                
                expect(result.valid).toBe(false);
                expect(result.reason).toBe(DNSSkipReason.RESOLUTION_FAILED);
                expect(result.error).toBe('All DNS resolution attempts failed');
                expect(result.duration).toBeGreaterThanOrEqual(0);
            });

            it('should handle mixed DNS resolution failures', async () => {
                const noDataError = new Error('No data') as any;
                noDataError.code = 'ENODATA';
                mockResolve4.mockRejectedValue(noDataError);
                mockResolve6.mockRejectedValue(noDataError);
                
                const result = await validateDNS('norecord.example.com');
                
                expect(result.valid).toBe(false);
                expect(result.reason).toBe(DNSSkipReason.RESOLUTION_FAILED);
                expect(result.error).toBe('All DNS resolution attempts failed');
            });

            it('should handle network errors as generic failures', async () => {
                const networkError = new Error('Network unreachable') as any;
                networkError.code = 'ENETUNREACH';
                mockResolve4.mockRejectedValue(networkError);
                mockResolve6.mockRejectedValue(networkError);
                
                const result = await validateDNS('network-error.example.com');
                
                expect(result.valid).toBe(false);
                expect(result.reason).toBe(DNSSkipReason.RESOLUTION_FAILED);
                expect(result.error).toBe('All DNS resolution attempts failed');
            });

            it('should handle timeout errors', async () => {
                // Simulate slow DNS resolution
                mockResolve4.mockImplementation(() => 
                    new Promise((resolve: any) => setTimeout(() => resolve(['192.168.1.1']), 200))
                );
                mockResolve6.mockImplementation(() => 
                    new Promise((resolve: any) => setTimeout(() => resolve(['2001:db8::1']), 200))
                );
                
                const result = await validateDNS('slow.example.com', 50); // 50ms timeout
                
                expect(result.valid).toBe(false);
                expect(result.reason).toBe(DNSSkipReason.TIMEOUT);
                expect(result.error).toMatch(/DNS timeout after 50ms/);
                expect(result.duration).toBeGreaterThanOrEqual(45); // Allow for timing precision variance
            });

            it('should handle generic DNS resolution failures', async () => {
                const genericError = new Error('DNS server error');
                mockResolve4.mockRejectedValue(genericError);
                mockResolve6.mockRejectedValue(genericError);
                
                const result = await validateDNS('error.example.com');
                
                expect(result.valid).toBe(false);
                expect(result.reason).toBe(DNSSkipReason.RESOLUTION_FAILED);
                expect(result.error).toBe('All DNS resolution attempts failed');
            });
        });

        describe('timeout behavior', () => {
            it('should respect custom timeout values', async () => {
                const customTimeout = 3000;
                
                // Mock a successful resolution
                mockResolve4.mockResolvedValue(['192.168.1.1']);
                
                const result = await validateDNS('example.com', customTimeout);
                
                expect(result.valid).toBe(true);
                expect(result.duration).toBeLessThan(customTimeout);
            });

            it('should use default timeout when not specified', async () => {
                mockResolve4.mockResolvedValue(['192.168.1.1']);
                
                const result = await validateDNS('example.com');
                
                expect(result.valid).toBe(true);
                expect(result.duration).toBeDefined();
            });
        });

        describe('domain extraction integration', () => {
            it('should extract domains from full URLs', async () => {
                mockResolve4.mockResolvedValue(['192.168.1.1']);
                
                const urlsAndDomains = [
                    'https://example.com/path',
                    'http://subdomain.example.com:8080',
                    'example.com'
                ];
                
                for (const url of urlsAndDomains) {
                    const result = await validateDNS(url);
                    expect(result.valid).toBe(true);
                }
            });
        });
    });

    describe('validateDNSBatch', () => {
        beforeEach(() => {
            // Default to successful resolution for batch tests
            mockResolve4.mockResolvedValue(['192.168.1.1']);
            mockResolve6.mockRejectedValue(new Error('IPv6 not available'));
        });

        it('should validate multiple URLs successfully', async () => {
            const urls = [
                'example.com',
                'google.com',
                'github.com'
            ];
            
            const results = await validateDNSBatch(urls);
            
            expect(results.size).toBe(3);
            
            for (const url of urls) {
                const result = results.get(url);
                expect(result).toBeDefined();
                expect(result!.valid).toBe(true);
                expect(result!.addresses).toEqual(['192.168.1.1']);
            }
        });

        it('should handle mixed valid and invalid URLs', async () => {
            const urls = [
                'valid.example.com',
                'definitely..invalid..domain',
                'another.valid.com'
            ];
            
            // Mock different responses
            mockResolve4.mockImplementation((domain: string) => {
                if (domain === 'valid.example.com' || domain === 'another.valid.com') {
                    return Promise.resolve(['192.168.1.1']);
                }
                const error = new Error('Not found') as any;
                error.code = 'ENOTFOUND';
                throw error;
            });
            
            const results = await validateDNSBatch(urls);
            
            expect(results.size).toBe(3);
            expect(results.get('valid.example.com')!.valid).toBe(true);
            expect(results.get('definitely..invalid..domain')!.valid).toBe(false);
            expect(results.get('definitely..invalid..domain')!.reason).toBe(DNSSkipReason.INVALID_FORMAT);
            expect(results.get('another.valid.com')!.valid).toBe(true);
        });

        it('should respect custom timeout in batch validation', async () => {
            const urls = ['example.com', 'test.com'];
            const customTimeout = 2000;
            
            const results = await validateDNSBatch(urls, { timeoutMs: customTimeout });
            
            expect(results.size).toBe(2);
            for (const [, result] of results) {
                expect(result.duration).toBeLessThan(customTimeout);
            }
        });

        it('should respect concurrency limits', async () => {
            const urls = Array.from({ length: 20 }, (_, i) => `example${i}.com`);
            const concurrency = 5;
            
            // Track how many concurrent calls are made
            let concurrentCalls = 0;
            let maxConcurrent = 0;
            
            mockResolve4.mockImplementation(() => {
                concurrentCalls++;
                maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
                
                return new Promise((resolve: any) => {
                    setTimeout(() => {
                        concurrentCalls--;
                        resolve(['192.168.1.1']);
                    }, 10);
                });
            });
            
            const results = await validateDNSBatch(urls, { concurrency });
            
            expect(results.size).toBe(20);
            expect(maxConcurrent).toBeLessThanOrEqual(concurrency);
        });

        it('should handle empty URL list', async () => {
            const results = await validateDNSBatch([]);
            
            expect(results.size).toBe(0);
        });

        it('should use default options when none provided', async () => {
            const urls = ['example.com'];
            
            const results = await validateDNSBatch(urls);
            
            expect(results.size).toBe(1);
            expect(results.get('example.com')!.valid).toBe(true);
        });

        it('should handle batch with all failing URLs', async () => {
            const urls = ['invalid1', 'invalid2', 'invalid3'];
            
            const results = await validateDNSBatch(urls);
            
            expect(results.size).toBe(3);
            for (const [, result] of results) {
                expect(result.valid).toBe(false);
                expect(result.reason).toBe(DNSSkipReason.INVALID_FORMAT);
            }
        });

        it('should measure duration for each URL in batch', async () => {
            const urls = ['example.com', 'test.com'];
            
            const results = await validateDNSBatch(urls);
            
            expect(results.size).toBe(2);
            for (const [, result] of results) {
                expect(result.duration).toBeGreaterThanOrEqual(0);
                expect(typeof result.duration).toBe('number');
            }
        });
    });
});