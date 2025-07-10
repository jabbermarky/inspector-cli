import { RobotsTxtAnalyzer } from '../robots-txt-analyzer.js';
import { setupAnalysisTests } from '@test-utils';

// Mock logger
jest.mock('../logger.js', () => ({
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

// Use standardized retry mock pattern from test-utils
jest.mock('../retry.js', () => ({
    withRetry: jest.fn().mockImplementation(async (fn: any) => await fn())
}));

describe('RobotsTxtAnalyzer', () => {
    setupAnalysisTests();
    
    let analyzer: RobotsTxtAnalyzer;

    beforeEach(() => {
        analyzer = new RobotsTxtAnalyzer();
    });

    describe('buildRobotsUrl', () => {
        it('should use centralized joinUrl function', () => {
            // Access the private method for testing by casting to any
            const buildRobotsUrl = (analyzer as any).buildRobotsUrl.bind(analyzer);
            
            expect(buildRobotsUrl('https://example.com')).toBe('https://example.com/robots.txt');
            expect(buildRobotsUrl('https://example.com/')).toBe('https://example.com/robots.txt');
            expect(buildRobotsUrl('example.com')).toContain('/robots.txt');
        });

        it('should handle URLs with paths', () => {
            const buildRobotsUrl = (analyzer as any).buildRobotsUrl.bind(analyzer);
            
            const result = buildRobotsUrl('https://example.com/some/path');
            expect(result).toContain('/robots.txt');
            expect(result).toContain('example.com');
        });
    });

    describe('analyze', () => {
        it('should be callable', () => {
            expect(typeof analyzer.analyze).toBe('function');
        });

        it('should return a promise', () => {
            const result = analyzer.analyze('https://example.com');
            expect(result).toBeInstanceOf(Promise);
            
            // Clean up the promise to avoid hanging tests
            result.catch(() => {
                // Ignore errors for this test
            });
        });
    });
});