import { jest } from '@jest/globals';
import { MetaTagStrategy } from '../../strategies/meta-tag.js';

describe('MetaTagStrategy', () => {
    const cms = 'WordPress';
    const strategy = new MetaTagStrategy(cms);

    it('detects CMS from meta tag with name="generator"', async () => {
        
        const mockPage = {
            evaluate: jest.fn().mockImplementation(_fn => {
                // Simulate meta[name="generator"]
                return 'WordPress 5.9';
            })
        };
        const result = await strategy.detect(mockPage as any, 'https://example.com');
        expect(result.confidence).toBeGreaterThan(0.9);
        expect(result.version).toBe('5.9');
        expect(result.method).toBe('meta-tag');
    });

    it('detects CMS from meta tag with name="Generator"', async () => {
        const mockPage = {
            evaluate: jest.fn().mockImplementation(_fn => {
                // Simulate meta[name="Generator"]
                return 'WordPress 6.0';
            })
        };
        const result = await strategy.detect(mockPage as any, 'https://example.com');
        expect(result.confidence).toBeGreaterThan(0.9);
        expect(result.version).toBe('6.0');
        expect(result.method).toBe('meta-tag');
    });
});
