/**
 * Unit tests for result factory utilities
 * 
 * Tests the centralized result object factory system to ensure proper
 * result creation, default values, and CMS-specific result generation.
 */

import { jest } from '@jest/globals';
import {
    createDetectionResult,
    createPartialDetectionResult,
    createWordPressResult,
    createDrupalResult,
    createJoomlaResult,
    createFailedResult,
    type DetectionResultOptions,
    type PartialDetectionResultOptions
} from '../../factories/result-factory.js';
import { setupJestExtensions } from '../../setup/jest-extensions.js';

// Setup custom Jest matchers
setupJestExtensions();

describe('Result Factory Utilities', () => {
    describe('createDetectionResult', () => {
        it('should create a basic detection result with defaults', () => {
            const result = createDetectionResult();
            
            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.originalUrl).toBe('https://example.com');
            expect(result.finalUrl).toBe('https://example.com');
            expect(result.version).toBeUndefined();
            expect(result.executionTime).toBe(100);
            expect(result.detectionMethods).toEqual([]);
        });
        
        it('should create a detection result with custom options', () => {
            const options: DetectionResultOptions = {
                cms: 'WordPress',
                confidence: 0.95,
                originalUrl: 'https://test.com',
                finalUrl: 'https://test.com/redirected',
                version: '6.4.0',
                executionTime: 250,
                detectionMethods: ['meta-tag', 'http-headers', 'robots-txt']
            };
            
            const result = createDetectionResult(options);
            
            expect(result.cms).toBe('WordPress');
            expect(result.confidence).toBe(0.95);
            expect(result.originalUrl).toBe('https://test.com');
            expect(result.finalUrl).toBe('https://test.com/redirected');
            expect(result.version).toBe('6.4.0');
            expect(result.executionTime).toBe(250);
            expect(result.detectionMethods).toEqual(['meta-tag', 'http-headers', 'robots-txt']);
        });
        
        it('should handle partial options correctly', () => {
            const result = createDetectionResult({
                cms: 'Drupal',
                confidence: 0.8
            });
            
            expect(result.cms).toBe('Drupal');
            expect(result.confidence).toBe(0.8);
            expect(result.originalUrl).toBe('https://example.com'); // Default
            expect(result.finalUrl).toBe('https://example.com'); // Default
            expect(result.executionTime).toBe(100); // Default
            expect(result.detectionMethods).toEqual([]); // Default
        });
        
        it('should handle all CMS types', () => {
            const wordpressResult = createDetectionResult({ cms: 'WordPress' });
            const drupalResult = createDetectionResult({ cms: 'Drupal' });
            const joomlaResult = createDetectionResult({ cms: 'Joomla' });
            const unknownResult = createDetectionResult({ cms: 'Unknown' });
            
            expect(wordpressResult.cms).toBe('WordPress');
            expect(drupalResult.cms).toBe('Drupal');
            expect(joomlaResult.cms).toBe('Joomla');
            expect(unknownResult.cms).toBe('Unknown');
        });
        
        it('should handle zero confidence correctly', () => {
            const result = createDetectionResult({ confidence: 0 });
            expect(result.confidence).toBe(0);
        });
        
        it('should handle maximum confidence correctly', () => {
            const result = createDetectionResult({ confidence: 1.0 });
            expect(result.confidence).toBe(1.0);
        });
    });
    
    describe('createPartialDetectionResult', () => {
        it('should create a basic partial detection result with defaults', () => {
            const result = createPartialDetectionResult();
            
            expect(result.confidence).toBe(0.8);
            expect(result.method).toBe('test-method');
            expect(result.version).toBeUndefined();
            expect(result.evidence).toEqual(['Test evidence']);
        });
        
        it('should create a partial detection result with custom options', () => {
            const options: PartialDetectionResultOptions = {
                confidence: 0.95,
                method: 'meta-tag-strategy',
                version: '5.8.2',
                evidence: ['Generator meta tag found', 'WordPress version detected']
            };
            
            const result = createPartialDetectionResult(options);
            
            expect(result.confidence).toBe(0.95);
            expect(result.method).toBe('meta-tag-strategy');
            expect(result.version).toBe('5.8.2');
            expect(result.evidence).toEqual(['Generator meta tag found', 'WordPress version detected']);
        });
        
        it('should handle empty evidence array', () => {
            const result = createPartialDetectionResult({ evidence: [] });
            expect(result.evidence).toEqual([]);
        });
        
        it('should handle multiple evidence items', () => {
            const evidence = [
                'Meta tag detected',
                'HTTP header found',
                'API endpoint responded',
                'Robots.txt pattern matched'
            ];
            
            const result = createPartialDetectionResult({ evidence });
            expect(result.evidence).toEqual(evidence);
        });
        
        it('should handle different method types', () => {
            const methods = ['meta-tag', 'http-headers', 'robots-txt', 'api-endpoint', 'html-content'];
            
            methods.forEach(method => {
                const result = createPartialDetectionResult({ method });
                expect(result.method).toBe(method);
            });
        });
    });
    
    describe('createWordPressResult', () => {
        it('should create a WordPress result with default confidence', () => {
            const result = createWordPressResult();
            
            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('WordPress');
            expect(result).toHaveConfidenceAbove(0.89);
            expect(result.version).toBe('6.3.1');
            expect(result.detectionMethods).toEqual(['meta-tag', 'http-headers']);
            expect(result.originalUrl).toBe('https://example.com');
            expect(result.finalUrl).toBe('https://example.com');
            expect(result.executionTime).toBe(100);
        });
        
        it('should create a WordPress result with custom confidence', () => {
            const result = createWordPressResult(0.85);
            
            expect(result).toBeValidCMSResult();
            expect(result).toHaveDetectedCMS('WordPress');
            expect(result.confidence).toBe(0.85);
            expect(result.version).toBe('6.3.1');
            expect(result.detectionMethods).toEqual(['meta-tag', 'http-headers']);
        });
        
        it('should handle edge case confidence values', () => {
            const lowResult = createWordPressResult(0.1);
            const highResult = createWordPressResult(1.0);
            
            expect(lowResult.confidence).toBe(0.1);
            expect(highResult.confidence).toBe(1.0);
        });
    });
    
    describe('createDrupalResult', () => {
        it('should create a Drupal result with default confidence', () => {
            const result = createDrupalResult();
            
            expect(result.cms).toBe('Drupal');
            expect(result.confidence).toBe(0.9);
            expect(result.version).toBe('10.1.0');
            expect(result.detectionMethods).toEqual(['meta-tag', 'http-headers']);
            expect(result.originalUrl).toBe('https://example.com');
            expect(result.finalUrl).toBe('https://example.com');
            expect(result.executionTime).toBe(100);
        });
        
        it('should create a Drupal result with custom confidence', () => {
            const result = createDrupalResult(0.75);
            
            expect(result.cms).toBe('Drupal');
            expect(result.confidence).toBe(0.75);
            expect(result.version).toBe('10.1.0');
            expect(result.detectionMethods).toEqual(['meta-tag', 'http-headers']);
        });
    });
    
    describe('createJoomlaResult', () => {
        it('should create a Joomla result with default confidence', () => {
            const result = createJoomlaResult();
            
            expect(result.cms).toBe('Joomla');
            expect(result.confidence).toBe(0.9);
            expect(result.version).toBe('4.3.0');
            expect(result.detectionMethods).toEqual(['meta-tag', 'robots-txt']);
            expect(result.originalUrl).toBe('https://example.com');
            expect(result.finalUrl).toBe('https://example.com');
            expect(result.executionTime).toBe(100);
        });
        
        it('should create a Joomla result with custom confidence', () => {
            const result = createJoomlaResult(0.65);
            
            expect(result.cms).toBe('Joomla');
            expect(result.confidence).toBe(0.65);
            expect(result.version).toBe('4.3.0');
            expect(result.detectionMethods).toEqual(['meta-tag', 'robots-txt']);
        });
    });
    
    describe('createFailedResult', () => {
        it('should create a failed result with default error message', () => {
            const result = createFailedResult();
            
            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.originalUrl).toBe('https://example.com');
            expect(result.finalUrl).toBe('https://example.com');
            expect(result.version).toBeUndefined();
            expect(result.executionTime).toBe(100);
            expect(result.detectionMethods).toEqual([]);
            expect(result.error).toBe('Detection failed');
        });
        
        it('should create a failed result with custom error message', () => {
            const result = createFailedResult('Network timeout occurred');
            
            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.error).toBe('Network timeout occurred');
        });
        
        it('should be consistent with createDetectionResult defaults', () => {
            const failedResult = createFailedResult();
            const defaultResult = createDetectionResult();
            
            expect(failedResult.cms).toBe(defaultResult.cms);
            expect(failedResult.confidence).toBe(defaultResult.confidence);
            expect(failedResult.originalUrl).toBe(defaultResult.originalUrl);
            expect(failedResult.finalUrl).toBe(defaultResult.finalUrl);
            expect(failedResult.executionTime).toBe(defaultResult.executionTime);
            expect(failedResult.detectionMethods).toEqual(defaultResult.detectionMethods);
            
            // Failed results have an error field, default results don't
            expect(failedResult.error).toBe('Detection failed');
            expect(defaultResult.error).toBeUndefined();
        });
    });
    
    describe('CMS-Specific Result Comparison', () => {
        it('should create distinct results for different CMS types', () => {
            const wordpress = createWordPressResult(0.8);
            const drupal = createDrupalResult(0.8);
            const joomla = createJoomlaResult(0.8);
            
            expect(wordpress.cms).toBe('WordPress');
            expect(drupal.cms).toBe('Drupal');
            expect(joomla.cms).toBe('Joomla');
            
            expect(wordpress.version).toBe('6.3.1');
            expect(drupal.version).toBe('10.1.0');
            expect(joomla.version).toBe('4.3.0');
            
            expect(wordpress.confidence).toBe(0.8);
            expect(drupal.confidence).toBe(0.8);
            expect(joomla.confidence).toBe(0.8);
        });
        
        it('should have different detection methods for different CMS types', () => {
            const wordpress = createWordPressResult();
            const drupal = createDrupalResult();
            const joomla = createJoomlaResult();
            
            expect(wordpress.detectionMethods).toEqual(['meta-tag', 'http-headers']);
            expect(drupal.detectionMethods).toEqual(['meta-tag', 'http-headers']);
            expect(joomla.detectionMethods).toEqual(['meta-tag', 'robots-txt']);
        });
    });
    
    describe('Type Safety and Interface Compliance', () => {
        it('should satisfy CMSDetectionResult interface', () => {
            const result = createDetectionResult();
            
            // Test that all required properties exist
            expect(typeof result.cms).toBe('string');
            expect(typeof result.confidence).toBe('number');
            expect(typeof result.originalUrl).toBe('string');
            expect(typeof result.finalUrl).toBe('string');
            expect(typeof result.executionTime).toBe('number');
            expect(Array.isArray(result.detectionMethods)).toBe(true);
        });
        
        it('should satisfy PartialDetectionResult interface', () => {
            const result = createPartialDetectionResult();
            
            // Test that all required properties exist
            expect(typeof result.confidence).toBe('number');
            expect(typeof result.method).toBe('string');
            expect(Array.isArray(result.evidence)).toBe(true);
        });
        
        it('should handle optional properties correctly', () => {
            const detectionResult = createDetectionResult();
            const partialResult = createPartialDetectionResult();
            
            // version is optional and can be undefined
            expect(detectionResult.version === undefined || typeof detectionResult.version === 'string').toBe(true);
            expect(partialResult.version === undefined || typeof partialResult.version === 'string').toBe(true);
        });
    });
    
    describe('Edge Cases and Error Conditions', () => {
        it('should handle empty options objects', () => {
            const detectionResult = createDetectionResult({});
            const partialResult = createPartialDetectionResult({});
            
            expect(detectionResult).toBeDefined();
            expect(partialResult).toBeDefined();
        });
        
        it('should handle null/undefined options gracefully', () => {
            // These should use defaults
            const detectionResult = createDetectionResult();
            const partialResult = createPartialDetectionResult();
            
            expect(detectionResult.cms).toBe('Unknown');
            expect(partialResult.method).toBe('test-method');
        });
        
        it('should preserve all provided option values', () => {
            const customOptions: DetectionResultOptions = {
                cms: 'WordPress',
                confidence: 0.123456789, // Precise decimal
                originalUrl: 'https://custom-domain.example.org/path',
                finalUrl: 'https://final-domain.example.org/different-path',
                version: 'v1.2.3-beta.4',
                executionTime: 1337,
                detectionMethods: ['custom-method-1', 'custom-method-2']
            };
            
            const result = createDetectionResult(customOptions);
            
            expect(result.cms).toBe(customOptions.cms);
            expect(result.confidence).toBe(customOptions.confidence);
            expect(result.originalUrl).toBe(customOptions.originalUrl);
            expect(result.finalUrl).toBe(customOptions.finalUrl);
            expect(result.version).toBe(customOptions.version);
            expect(result.executionTime).toBe(customOptions.executionTime);
            expect(result.detectionMethods).toEqual(customOptions.detectionMethods);
        });
    });
});