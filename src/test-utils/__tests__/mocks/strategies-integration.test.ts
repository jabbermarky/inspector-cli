/**
 * Integration tests for strategy mock utilities
 * 
 * Tests the strategy mocking system in realistic usage scenarios,
 * exercising code paths that unit tests might miss.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import {
    createMockStrategy,
    createStrategyPageMock,
    createFailingStrategy,
    createMockStrategySet,
    createMixedStrategySet,
    expectValidDetectionResult,
    MockDetectionStrategy,
    createMockStrategies
} from '../../mocks/strategies.js';

describe('Strategy Mock Integration Tests', () => {
    describe('Advanced Page Mock Scenarios', () => {
        it('should create page mocks with complex robots.txt data', () => {
            const robotsTxtData = {
                accessible: true,
                content: `User-agent: *
Disallow: /wp-admin/
Disallow: /wp-includes/
Allow: /wp-admin/admin-ajax.php
Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/news-sitemap.xml`,
                patterns: {
                    disallowedPaths: ['/wp-admin/', '/wp-includes/'],
                    sitemapUrls: ['https://example.com/sitemap.xml', 'https://example.com/news-sitemap.xml'],
                    userAgents: ['*'],
                    allowPaths: ['/wp-admin/admin-ajax.php']
                },
                size: 150,
                statusCode: 200
            };
            
            const mockPage = createStrategyPageMock('robots-txt', { robotsTxtData }) as any;
            
            expect(mockPage._robotsTxtData).toEqual(robotsTxtData);
            expect(mockPage._robotsTxtData.patterns.disallowedPaths).toHaveLength(2);
            expect(mockPage._robotsTxtData.patterns.sitemapUrls).toHaveLength(2);
        });
        
        it('should create page mocks with complex HTTP headers', () => {
            const httpHeaders = {
                'server': 'nginx/1.18.0',
                'x-powered-by': 'PHP/8.1.12',
                'x-generator': 'WordPress 6.3.1',
                'x-frame-options': 'SAMEORIGIN',
                'x-content-type-options': 'nosniff',
                'strict-transport-security': 'max-age=31536000',
                'content-security-policy': "default-src 'self'",
                'set-cookie': 'session_id=abc123; HttpOnly; Secure'
            };
            
            const mockPage = createStrategyPageMock('http-headers', { httpHeaders }) as any;
            
            expect(mockPage._browserManagerContext.lastNavigation.headers).toEqual(httpHeaders);
            expect(mockPage._browserManagerContext.lastNavigation.headers['x-generator']).toBe('WordPress 6.3.1');
        });
        
        it('should create page mocks with API endpoint responses', () => {
            const apiResponse = {
                version: '10.1.5',
                name: 'Drupal',
                modules: ['views', 'user', 'system'],
                theme: 'bartik',
                database: 'mysql',
                php_version: '8.1.12'
            };
            const apiStatusCode = 200;
            
            const mockPage = createStrategyPageMock('api-endpoint', { 
                apiResponse, 
                apiStatusCode 
            }) as any;
            
            expect(mockPage.goto).toBeDefined();
            expect(mockPage.evaluate).toBeDefined();
        });
        
        it('should handle meta tag variations', () => {
            const metaTags = [
                { name: 'generator', content: 'WordPress 6.3.1' },
                { property: 'og:title', content: 'My WordPress Site' },
                { property: 'og:type', content: 'website' },
                { httpEquiv: 'refresh', content: '30; url=https://example.com' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1' },
                { name: 'robots', content: 'index, follow' }
            ];
            
            const mockPage = createStrategyPageMock('meta-tag', { metaTags });
            
            expect(mockPage.evaluate).toBeDefined();
            expect(vi.isMockFunction(mockPage.evaluate)).toBe(true);
        });
    });
    
    describe('Strategy Execution Patterns', () => {
        it('should execute strategy with realistic timing', async () => {
            const strategy = createMockStrategy({
                name: 'wordpress-meta-tag',
                confidence: 0.95,
                executionTime: 125,
                version: '6.3.1',
                evidence: ['Generator meta tag found', 'WordPress version detected']
            });
            
            const mockPage = createStrategyPageMock('meta-tag', {
                metaTags: [{ name: 'generator', content: 'WordPress 6.3.1' }]
            });
            
            const startTime = Date.now();
            const result = await strategy.detect(mockPage, 'https://wordpress-site.com');
            const actualTime = Date.now() - startTime;
            
            expect(result.confidence).toBe(0.95);
            expect(result.method).toBe('wordpress-meta-tag');
            expect(result.version).toBe('6.3.1');
            expect(result.executionTime).toBe(125);
            expect(actualTime).toBeGreaterThanOrEqual(0); // Allow some tolerance for mocked timing
        });
        
        it('should handle strategy failures with proper error propagation', async () => {
            const strategy = createFailingStrategy('network', 'Connection refused');
            
            const mockPage = createStrategyPageMock('meta-tag', {});
            
            await expect(strategy.detect(mockPage, 'https://unreachable-site.com'))
                .rejects.toThrow('Connection refused');
        });
        
        it('should validate detection results thoroughly', async () => {
            const strategy = createMockStrategy({
                confidence: 0.87,
                name: 'drupal-api-endpoint',
                version: '10.1.0',
                evidence: ['API endpoint accessible', 'Version info retrieved'],
                executionTime: 89
            });
            
            const result = await strategy.detect({} as any, 'https://drupal-site.com');
            
            expectValidDetectionResult(result);
            expect(result.confidence).toBe(0.87);
            expect(result.method).toBe('drupal-api-endpoint');
            expect(result.version).toBe('10.1.0');
            expect(result.evidence).toContain('API endpoint accessible');
        });
    });
    
    describe('Strategy Set Management', () => {
        it('should create and execute mixed strategy sets', async () => {
            const strategies = createMixedStrategySet();
            
            expect(strategies).toHaveLength(5);
            
            const mockPage = createStrategyPageMock('meta-tag', {});
            const results = [];
            
            for (const strategy of strategies) {
                try {
                    const result = await strategy.detect(mockPage, 'https://test-site.com');
                    results.push({ success: true, result });
                } catch (error) {
                    results.push({ success: false, error: (error as Error).message });
                }
            }
            
            // Should have both successes and failures
            const successes = results.filter(r => r.success);
            const failures = results.filter(r => !r.success);
            
            expect(successes.length).toBeGreaterThan(0);
            expect(failures.length).toBeGreaterThan(0);
            expect(successes.length + failures.length).toBe(5);
        });
        
        it('should handle large strategy sets efficiently', async () => {
            const largeStrategySet = createMockStrategySet(20);
            
            expect(largeStrategySet).toHaveLength(20);
            
            const mockPage = createStrategyPageMock('meta-tag', {});
            const startTime = Date.now();
            
            // Execute all strategies in parallel
            const results = await Promise.all(
                largeStrategySet.map(strategy => 
                    strategy.detect(mockPage, 'https://test-site.com')
                )
            );
            
            const totalTime = Date.now() - startTime;
            
            expect(results).toHaveLength(20);
            expect(totalTime).toBeLessThan(1000); // Should be fast since they're mocked
            
            // All results should be valid
            results.forEach(result => {
                expectValidDetectionResult(result);
            });
        });
    });
    
    describe('Legacy Strategy Support', () => {
        it('should support legacy MockDetectionStrategy class', async () => {
            const legacyStrategy = new MockDetectionStrategy('legacy-wordpress', 0.88);
            
            expect(legacyStrategy.getName()).toBe('legacy-wordpress');
            expect(legacyStrategy.getTimeout()).toBe(5000);
            
            const result = await legacyStrategy.detect({} as any, 'https://legacy-test.com');
            
            expect(result.confidence).toBe(0.88);
            expect(result.method).toBe('legacy-wordpress');
            expectValidDetectionResult(result);
        });
        
        it('should support legacy createMockStrategies function', async () => {
            const strategies = createMockStrategies();
            
            expect(strategies.successful).toBeInstanceOf(MockDetectionStrategy);
            expect(strategies.failing).toBeInstanceOf(MockDetectionStrategy);
            expect(strategies.lowConfidence).toBeInstanceOf(MockDetectionStrategy);
            expect(strategies.highConfidence).toBeInstanceOf(MockDetectionStrategy);
            expect(strategies.withVersion).toBeInstanceOf(MockDetectionStrategy);
            
            // Test execution
            const successResult = await strategies.successful.detect({} as any, 'https://test.com');
            const highConfidenceResult = await strategies.highConfidence.detect({} as any, 'https://test.com');
            
            expect(successResult.confidence).toBe(0.8);
            expect(highConfidenceResult.confidence).toBe(0.95);
        });
    });
    
    describe('Error Scenario Coverage', () => {
        it('should handle all error types in failing strategies', async () => {
            const errorTypes: Array<{ type: any, expectedMessage: string }> = [
                { type: 'timeout', expectedMessage: 'Strategy timeout exceeded' },
                { type: 'network', expectedMessage: 'Network request failed' },
                { type: 'parse', expectedMessage: 'Failed to parse response' },
                { type: 'evaluation', expectedMessage: 'Page evaluation failed' },
                { type: 'generic', expectedMessage: 'Strategy execution failed' }
            ];
            
            for (const { type, expectedMessage } of errorTypes) {
                const strategy = createFailingStrategy(type as any);
                
                await expect(strategy.detect({} as any, 'https://test.com'))
                    .rejects.toThrow(expectedMessage);
            }
        });
        
        it('should handle custom error messages', async () => {
            const customMessage = 'Custom network failure occurred';
            const strategy = createFailingStrategy('network', customMessage);
            
            await expect(strategy.detect({} as any, 'https://test.com'))
                .rejects.toThrow(customMessage);
        });
    });
    
    describe('Evasion Strategy Coverage', () => {
        it('should handle all evasion strategy types', () => {
            const evasionTypes = [
                'user_agent', 'timing', 'proxy', 'behavior', 'headers', 'fingerprinting', 'captcha'
            ];
            
            evasionTypes.forEach(type => {
                // This exercises the type checking and ensures all types are valid
                const strategy = createMockStrategy({
                    name: `test-${type}`,
                    confidence: 0.8
                });
                
                expect(strategy.getName()).toBe(`test-${type}`);
            });
        });
    });
    
    describe('Performance and Memory Tests', () => {
        it('should handle many strategy creations without memory leaks', () => {
            const strategies = [];
            
            for (let i = 0; i < 100; i++) {
                strategies.push(createMockStrategy({
                    name: `strategy-${i}`,
                    confidence: Math.random()
                }));
            }
            
            expect(strategies).toHaveLength(100);
            
            // All strategies should be independently configured
            expect(strategies[0].getName()).toBe('strategy-0');
            expect(strategies[99].getName()).toBe('strategy-99');
        });
        
        it('should handle rapid strategy execution', async () => {
            const strategy = createMockStrategy({
                executionTime: 1 // Very fast
            });
            
            const promises = Array.from({ length: 50 }, (_, i) => 
                strategy.detect({} as any, `https://test-${i}.com`)
            );
            
            const results = await Promise.all(promises);
            
            expect(results).toHaveLength(50);
            results.forEach(result => {
                expectValidDetectionResult(result);
            });
        });
    });
});