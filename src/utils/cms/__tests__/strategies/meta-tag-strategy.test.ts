import { jest } from '@jest/globals';
import { MetaTagStrategy } from '../../strategies/meta-tag.js';
import { createMockPage, setupStrategyTests, setupJestExtensions } from '@test-utils';

// Setup custom Jest matchers
setupJestExtensions();

describe('MetaTagStrategy', () => {
    setupStrategyTests();
    
    const cms = 'WordPress';
    const strategy = new MetaTagStrategy(cms);

    it('detects CMS from meta tag with name="generator"', async () => {
        const mockPage = createMockPage({
            evaluateImplementation: () => 'WordPress 5.9'
        });
        
        const result = await strategy.detect(mockPage, 'https://example.com');
        expect(result).toBeValidPartialResult();
        expect(result).toHaveConfidenceAbove(0.9);
        expect(result.version).toBe('5.9');
        expect(result.method).toBe('meta-tag');
    });

    it('detects CMS from meta tag with name="Generator"', async () => {
        const mockPage = createMockPage({
            evaluateImplementation: () => 'WordPress 6.0'
        });
        
        const result = await strategy.detect(mockPage, 'https://example.com');
        expect(result).toBeValidPartialResult();
        expect(result).toHaveConfidenceAbove(0.9);
        expect(result.version).toBe('6.0');
        expect(result.method).toBe('meta-tag');
    });
});
