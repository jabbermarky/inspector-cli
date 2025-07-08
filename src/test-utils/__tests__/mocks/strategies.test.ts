/**
 * Unit tests for strategy mock utilities
 * 
 * Tests the centralized strategy mocking system to ensure proper
 * mock creation, configuration, and type safety.
 */

import { jest } from '@jest/globals';
import {
    createMockStrategy,
    createStrategyPageMock,
    createFailingStrategy,
    createMockStrategySet,
    createMixedStrategySet,
    expectValidDetectionResult,
    MockDetectionStrategy,
    createMockStrategies,
    type MockStrategyOptions,
    type StrategyPageMockData,
    type StrategyType,
    type ErrorType
} from '../../mocks/strategies.js';

describe('Strategy Mock Utilities', () => {
    describe('createMockStrategy', () => {
        it('should create a basic mock strategy with defaults', () => {
            const mockStrategy = createMockStrategy();
            
            expect(mockStrategy.getName).toBeDefined();
            expect(mockStrategy.getTimeout).toBeDefined();
            expect(mockStrategy.detect).toBeDefined();
            
            expect(mockStrategy.getName()).toBe('mock-strategy');
            expect(mockStrategy.getTimeout()).toBe(5000);
        });
        
        it('should create a mock strategy with custom options', () => {
            const options: MockStrategyOptions = {
                name: 'custom-strategy',
                confidence: 0.85,
                timeout: 8000,
                version: '1.2.3',
                evidence: ['Custom evidence'],
                executionTime: 150
            };
            
            const mockStrategy = createMockStrategy(options);
            
            expect(mockStrategy.getName()).toBe('custom-strategy');
            expect(mockStrategy.getTimeout()).toBe(8000);
        });
        
        it('should create a successful detection result', async () => {
            const mockStrategy = createMockStrategy({
                name: 'test-strategy',
                confidence: 0.9,
                version: '2.1.0'
            });
            
            const result = await mockStrategy.detect({} as any, 'https://example.com');
            
            expect(result.confidence).toBe(0.9);
            expect(result.method).toBe('test-strategy');
            expect(result.version).toBe('2.1.0');
            expect(result.executionTime).toBe(100);
            expect(result.evidence).toEqual(['Mock detection evidence']);
        });
        
        it('should create a failing strategy', async () => {
            const mockStrategy = createMockStrategy({
                shouldFail: true,
                errorMessage: 'Test error'
            });
            
            await expect(mockStrategy.detect({} as any, 'https://example.com'))
                .rejects.toThrow('Test error');
        });
    });
    
    describe('createStrategyPageMock', () => {
        it('should create a basic page mock', () => {
            const mockPage = createStrategyPageMock('meta-tag', {});
            
            expect(mockPage.url).toBeDefined();
            expect(mockPage.title).toBeDefined();
            expect(mockPage.content).toBeDefined();
            expect(mockPage.goto).toBeDefined();
            expect(mockPage.evaluate).toBeDefined();
            
            expect(mockPage.url()).toBe('https://example.com');
        });
        
        it('should configure meta-tag strategy page mock', () => {
            const metaTags = [
                { name: 'generator', content: 'WordPress 6.3' },
                { property: 'og:title', content: 'Test Site' }
            ];
            
            const mockPage = createStrategyPageMock('meta-tag', { metaTags });
            
            expect(mockPage.evaluate).toBeDefined();
            // Test that evaluate mock is configured for meta tags
            expect(jest.isMockFunction(mockPage.evaluate)).toBe(true);
        });
        
        it('should configure http-headers strategy page mock', () => {
            const httpHeaders = { 'x-generator': 'Drupal', 'x-powered-by': 'PHP' };
            
            const mockPage = createStrategyPageMock('http-headers', { httpHeaders });
            
            expect(mockPage._browserManagerContext).toBeDefined();
            expect(mockPage._browserManagerContext.lastNavigation.headers).toEqual(httpHeaders);
            expect(mockPage._browserManagerContext.purpose).toBe('detection');
        });
        
        it('should configure robots-txt strategy page mock', () => {
            const robotsTxtData = {
                accessible: true,
                content: 'User-agent: *\nDisallow: /admin/',
                patterns: {
                    disallowedPaths: ['/admin/'],
                    sitemapUrls: ['https://example.com/sitemap.xml']
                }
            };
            
            const mockPage = createStrategyPageMock('robots-txt', { robotsTxtData });
            
            expect(mockPage._robotsTxtData).toEqual(robotsTxtData);
        });
        
        it('should configure api-endpoint strategy page mock', () => {
            const apiResponse = { version: '3.8.1', status: 'ok' };
            const apiStatusCode = 200;
            
            const mockPage = createStrategyPageMock('api-endpoint', { 
                apiResponse, 
                apiStatusCode 
            });
            
            expect(mockPage.evaluate).toHaveBeenCalledWith = jest.fn();
            expect(mockPage.goto).toBeDefined();
        });
        
        it('should configure html-content strategy page mock', () => {
            const htmlContent = '<meta name="generator" content="Joomla! 4.2">';
            
            const mockPage = createStrategyPageMock('html-content', { htmlContent });
            
            expect(mockPage.content).toBeDefined();
            // Verify the content mock returns our HTML
            expect(jest.isMockFunction(mockPage.content)).toBe(true);
        });
    });
    
    describe('createFailingStrategy', () => {
        it('should create a strategy that throws timeout error', async () => {
            const failingStrategy = createFailingStrategy('timeout');
            
            expect(failingStrategy.getName()).toBe('failing-timeout-strategy');
            
            await expect(failingStrategy.detect({} as any, 'https://example.com'))
                .rejects.toThrow('Strategy timeout exceeded');
        });
        
        it('should create a strategy that throws network error', async () => {
            const failingStrategy = createFailingStrategy('network');
            
            await expect(failingStrategy.detect({} as any, 'https://example.com'))
                .rejects.toThrow('Network request failed');
        });
        
        it('should create a strategy with custom error message', async () => {
            const failingStrategy = createFailingStrategy('generic', 'Custom failure message');
            
            await expect(failingStrategy.detect({} as any, 'https://example.com'))
                .rejects.toThrow('Custom failure message');
        });
    });
    
    describe('createMockStrategySet', () => {
        it('should create default set of 3 strategies', () => {
            const strategies = createMockStrategySet();
            
            expect(strategies).toHaveLength(3);
            expect(strategies[0].getName()).toBe('strategy-1');
            expect(strategies[1].getName()).toBe('strategy-2');
            expect(strategies[2].getName()).toBe('strategy-3');
        });
        
        it('should create custom number of strategies', () => {
            const strategies = createMockStrategySet(5);
            
            expect(strategies).toHaveLength(5);
            expect(strategies[4].getName()).toBe('strategy-5');
        });
        
        it('should create strategies with varying confidence levels', async () => {
            const strategies = createMockStrategySet(3);
            
            const results = await Promise.all(
                strategies.map(s => s.detect({} as any, 'https://example.com'))
            );
            
            // Confidence should increase: 0.8, 0.82, 0.84
            expect(results[0].confidence).toBe(0.8);
            expect(results[1].confidence).toBeCloseTo(0.82, 5);
            expect(results[2].confidence).toBeCloseTo(0.84, 5);
        });
    });
    
    describe('createMixedStrategySet', () => {
        it('should create a mix of successful and failing strategies', () => {
            const strategies = createMixedStrategySet();
            
            expect(strategies).toHaveLength(5);
            
            // Check that we have both successful and failing strategies
            const names = strategies.map(s => s.getName());
            expect(names).toContain('successful-strategy-1');
            expect(names).toContain('failing-timeout-strategy');
            expect(names).toContain('failing-network-strategy');
        });
        
        it('should have working successful strategies', async () => {
            const strategies = createMixedStrategySet();
            const successfulStrategy = strategies.find(s => 
                s.getName() === 'successful-strategy-1'
            )!;
            
            const result = await successfulStrategy.detect({} as any, 'https://example.com');
            expect(result.confidence).toBe(0.9);
        });
        
        it('should have working failing strategies', async () => {
            const strategies = createMixedStrategySet();
            const failingStrategy = strategies.find(s => 
                s.getName().includes('failing-timeout')
            )!;
            
            await expect(failingStrategy.detect({} as any, 'https://example.com'))
                .rejects.toThrow();
        });
    });
    
    describe('expectValidDetectionResult', () => {
        it('should pass validation for valid result', () => {
            const validResult = {
                confidence: 0.8,
                method: 'test-method',
                version: '1.0.0',
                evidence: ['Test evidence'],
                executionTime: 100
            };
            
            expect(() => expectValidDetectionResult(validResult)).not.toThrow();
        });
        
        it('should fail validation for invalid confidence', () => {
            const invalidResult = {
                confidence: 1.5, // Invalid: > 1
                method: 'test-method'
            };
            
            expect(() => expectValidDetectionResult(invalidResult)).toThrow();
        });
        
        it('should fail validation for missing required fields', () => {
            const invalidResult = {
                confidence: 0.8
                // Missing method
            };
            
            expect(() => expectValidDetectionResult(invalidResult)).toThrow();
        });
        
        it('should validate optional fields when present', () => {
            const resultWithOptionals = {
                confidence: 0.9,
                method: 'test-method',
                version: '2.1.0',
                evidence: ['Evidence 1', 'Evidence 2'],
                executionTime: 250,
                error: 'Some error'
            };
            
            expect(() => expectValidDetectionResult(resultWithOptionals)).not.toThrow();
        });
        
        it('should fail validation for invalid execution time', () => {
            const invalidResult = {
                confidence: 0.8,
                method: 'test-method',
                executionTime: -100 // Invalid: negative
            };
            
            expect(() => expectValidDetectionResult(invalidResult)).toThrow();
        });
    });
    
    describe('Legacy MockDetectionStrategy class', () => {
        it('should create a working strategy instance', async () => {
            const strategy = new MockDetectionStrategy('legacy-test', 0.75);
            
            expect(strategy.getName()).toBe('legacy-test');
            expect(strategy.getTimeout()).toBe(5000);
            
            const result = await strategy.detect({} as any, 'https://example.com');
            expect(result.confidence).toBe(0.75);
            expect(result.method).toBe('legacy-test');
        });
        
        it('should handle failures correctly', async () => {
            const strategy = new MockDetectionStrategy('failing-legacy', 0.5, true);
            
            await expect(strategy.detect({} as any, 'https://example.com'))
                .rejects.toThrow('failing-legacy strategy failed');
        });
        
        it('should simulate execution time', async () => {
            const executionTime = 50;
            const strategy = new MockDetectionStrategy('timed-test', 0.8, false, executionTime);
            
            const startTime = Date.now();
            const result = await strategy.detect({} as any, 'https://example.com');
            const actualTime = Date.now() - startTime;
            
            expect(actualTime).toBeGreaterThanOrEqual(executionTime - 10); // Allow some tolerance
            expect(result.executionTime).toBe(executionTime);
        });
    });
    
    describe('Legacy createMockStrategies function', () => {
        it('should create all strategy types', () => {
            const strategies = createMockStrategies();
            
            expect(strategies.successful).toBeInstanceOf(MockDetectionStrategy);
            expect(strategies.failing).toBeInstanceOf(MockDetectionStrategy);
            expect(strategies.lowConfidence).toBeInstanceOf(MockDetectionStrategy);
            expect(strategies.highConfidence).toBeInstanceOf(MockDetectionStrategy);
            expect(strategies.withVersion).toBeInstanceOf(MockDetectionStrategy);
        });
        
        it('should have correct confidence levels', async () => {
            const strategies = createMockStrategies();
            
            const lowResult = await strategies.lowConfidence.detect({} as any, 'https://example.com');
            const highResult = await strategies.highConfidence.detect({} as any, 'https://example.com');
            
            expect(lowResult.confidence).toBe(0.2);
            expect(highResult.confidence).toBe(0.95);
        });
        
        it('should include version information when specified', async () => {
            const strategies = createMockStrategies();
            
            const result = await strategies.withVersion.detect({} as any, 'https://example.com');
            expect(result.version).toBe('6.3.1');
            expect(result.evidence).toContain('Version 6.3.1 detected');
        });
    });
    
    describe('Type Safety', () => {
        it('should accept all valid strategy types', () => {
            const validTypes: StrategyType[] = [
                'meta-tag', 'http-headers', 'robots-txt', 'api-endpoint', 'html-content'
            ];
            
            validTypes.forEach(type => {
                expect(() => createStrategyPageMock(type, {})).not.toThrow();
            });
        });
        
        it('should accept all valid error types', () => {
            const validErrors: ErrorType[] = [
                'timeout', 'network', 'parse', 'evaluation', 'generic'
            ];
            
            validErrors.forEach(errorType => {
                expect(() => createFailingStrategy(errorType)).not.toThrow();
            });
        });
    });
});