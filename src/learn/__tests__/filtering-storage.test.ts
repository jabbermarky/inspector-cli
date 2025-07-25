import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processLearnAnalysis } from '../analysis.js';
import { applyDiscriminativeFilters } from '../filtering.js';
import { storeAnalysisResult } from '../storage.js';
import { EnhancedDataCollection, FilteringOptions } from '../types.js';

// Mock dependencies
vi.mock('../data-collection.js', () => ({
    collectEnhancedDataWithFallback: vi.fn(),
    retrieveCollectedData: vi.fn()
}));

vi.mock('../llm-integration.js', () => ({
    performLLMAnalysis: vi.fn(),
    formatPrompt: vi.fn(),
    estimateTokensAndCost: vi.fn()
}));

vi.mock('../storage.js', () => ({
    storeAnalysisResult: vi.fn()
}));

describe('Filtering Storage Integration', () => {
    let mockData: EnhancedDataCollection;
    
    beforeEach(() => {
        vi.clearAllMocks();
        
        mockData = {
            url: 'https://example.com',
            timestamp: new Date().toISOString(),
            htmlContent: '<html><body>Test</body></html>',
            scripts: [],
            metaTags: [],
            httpHeaders: {
                'content-type': 'text/html', // Should be filtered
                'x-powered-by': 'WordPress', // Should be kept
                'cache-control': 'no-cache', // Should be filtered
                'x-custom-header': 'custom-value' // Should be kept
            },
            robotsTxt: {
                content: '',
                headers: {},
                statusCode: 200,
                accessible: true
            },
            domStructure: {
                classPatterns: [],
                idPatterns: [],
                dataAttributes: [],
                comments: []
            }
        };
    });

    it('should store filtered data when filtering is enabled', async () => {
        const { collectEnhancedDataWithFallback } = await import('../data-collection.js');
        const { performLLMAnalysis, formatPrompt } = await import('../llm-integration.js');
        const { storeAnalysisResult } = await import('../storage.js');
        
        // Mock data collection to return our test data
        vi.mocked(collectEnhancedDataWithFallback).mockResolvedValue(mockData);
        
        // Mock LLM response
        vi.mocked(performLLMAnalysis).mockResolvedValue({
            rawResponse: '{}',
            parsedJson: { technology: 'WordPress', confidence: 0.8 },
            parseErrors: [],
            validationStatus: 'valid',
            tokenUsage: { totalTokens: 1000, promptTokens: 800, completionTokens: 200 }
        });
        
        vi.mocked(formatPrompt).mockReturnValue('test prompt');
        
        // Run analysis with filtering
        const result = await processLearnAnalysis('https://example.com', {
            collectData: true,
            filteringOptions: {
                level: 'conservative',
                removeGenericHeaders: true,
                removeUniversalMetaTags: true
            }
        });
        
        // Verify storage was called
        expect(storeAnalysisResult).toHaveBeenCalledOnce();
        
        // Get the stored analysis result
        const storedResult = vi.mocked(storeAnalysisResult).mock.calls[0][0];
        
        // Verify filtered data was stored
        const storedHeaders = storedResult.inputData.enhancedData.httpHeaders;
        expect(storedHeaders).not.toHaveProperty('content-type'); // Filtered out
        expect(storedHeaders).not.toHaveProperty('cache-control'); // Filtered out
        expect(storedHeaders).toHaveProperty('x-powered-by', 'WordPress'); // Kept
        expect(storedHeaders).toHaveProperty('x-custom-header', 'custom-value'); // Kept
        
        // Verify filtering metadata was stored
        expect(storedResult.metadata.filteringApplied).toEqual({
            level: 'conservative',
            removedHeaders: true,
            removedMetaTags: true,
            removedTracking: undefined,
            removedLibraries: undefined
        });
    });

    it('should store original data when filtering is disabled', async () => {
        const { collectEnhancedDataWithFallback } = await import('../data-collection.js');
        const { performLLMAnalysis, formatPrompt } = await import('../llm-integration.js');
        const { storeAnalysisResult } = await import('../storage.js');
        
        // Mock data collection to return our test data
        vi.mocked(collectEnhancedDataWithFallback).mockResolvedValue(mockData);
        
        // Mock LLM response
        vi.mocked(performLLMAnalysis).mockResolvedValue({
            rawResponse: '{}',
            parsedJson: { technology: 'WordPress', confidence: 0.8 },
            parseErrors: [],
            validationStatus: 'valid',
            tokenUsage: { totalTokens: 1000, promptTokens: 800, completionTokens: 200 }
        });
        
        vi.mocked(formatPrompt).mockReturnValue('test prompt');
        
        // Run analysis without filtering
        const result = await processLearnAnalysis('https://example.com', {
            collectData: true
        });
        
        // Verify storage was called
        expect(storeAnalysisResult).toHaveBeenCalledOnce();
        
        // Get the stored analysis result
        const storedResult = vi.mocked(storeAnalysisResult).mock.calls[0][0];
        
        // Verify original data was stored
        const storedHeaders = storedResult.inputData.enhancedData.httpHeaders;
        expect(storedHeaders).toHaveProperty('content-type', 'text/html'); // Kept
        expect(storedHeaders).toHaveProperty('cache-control', 'no-cache'); // Kept
        expect(storedHeaders).toHaveProperty('x-powered-by', 'WordPress'); // Kept
        expect(storedHeaders).toHaveProperty('x-custom-header', 'custom-value'); // Kept
        
        // Verify no filtering metadata
        expect(storedResult.metadata.filteringApplied).toBeUndefined();
    });
});