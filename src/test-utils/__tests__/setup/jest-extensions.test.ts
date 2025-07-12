/**
 * Unit tests for Vitest extensions and custom matchers
 * 
 * Tests the custom matchers and extensions for CMS detection testing.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
    setupVitestExtensions,
    setupAllVitestExtensions,
    verifyVitestExtensions
} from '../../setup/index.js';

describe('Vitest Extensions', () => {
    beforeAll(() => {
        // Setup the custom matchers
        setupVitestExtensions();
    });

    describe('Setup Functions', () => {
        it('should setup Vitest extensions without throwing', () => {
            expect(() => setupVitestExtensions()).not.toThrow();
        });
        
        it('should setup all Vitest extensions without throwing', () => {
            expect(() => setupAllVitestExtensions()).not.toThrow();
        });
        
        it('should verify Vitest extensions are working', () => {
            const isWorking = verifyVitestExtensions();
            expect(isWorking).toBe(true);
        });
    });

    describe('toBeValidCMSResult matcher', () => {
        it('should pass for valid CMS result', () => {
            const validResult = {
                cms: 'WordPress',
                confidence: 0.9,
                originalUrl: 'https://example.com',
                finalUrl: 'https://example.com',
                executionTime: 100,
                detectionMethods: ['meta-tag']
            };
            
            expect(validResult).toBeValidCMSResult();
        });
        
        it('should fail for invalid confidence range', () => {
            const invalidResult = {
                cms: 'WordPress',
                confidence: 1.5, // Invalid
                originalUrl: 'https://example.com',
                finalUrl: 'https://example.com',
                executionTime: 100,
                detectionMethods: ['meta-tag']
            };
            
            expect(() => {
                expect(invalidResult).toBeValidCMSResult();
            }).toThrow();
        });
        
        it('should fail for missing required fields', () => {
            const incompleteResult = {
                cms: 'WordPress',
                confidence: 0.9
                // Missing other required fields
            };
            
            expect(() => {
                expect(incompleteResult).toBeValidCMSResult();
            }).toThrow();
        });
        
        it('should fail for null/undefined input', () => {
            expect(() => {
                expect(null).toBeValidCMSResult();
            }).toThrow();
            
            expect(() => {
                expect(undefined).toBeValidCMSResult();
            }).toThrow();
        });
        
        it('should fail for negative execution time', () => {
            const invalidResult = {
                cms: 'WordPress',
                confidence: 0.9,
                originalUrl: 'https://example.com',
                finalUrl: 'https://example.com',
                executionTime: -50, // Invalid
                detectionMethods: ['meta-tag']
            };
            
            expect(() => {
                expect(invalidResult).toBeValidCMSResult();
            }).toThrow();
        });
        
        it('should fail for non-array detection methods', () => {
            const invalidResult = {
                cms: 'WordPress',
                confidence: 0.9,
                originalUrl: 'https://example.com',
                finalUrl: 'https://example.com',
                executionTime: 100,
                detectionMethods: 'not-an-array' // Invalid
            };
            
            expect(() => {
                expect(invalidResult).toBeValidCMSResult();
            }).toThrow();
        });
    });

    describe('toBeValidPartialResult matcher', () => {
        it('should pass for valid partial result', () => {
            const validPartial = {
                confidence: 0.8,
                method: 'meta-tag',
                evidence: ['Generator meta tag found']
            };
            
            expect(validPartial).toBeValidPartialResult();
        });
        
        it('should pass for partial result without evidence', () => {
            const validPartial = {
                confidence: 0.8,
                method: 'meta-tag'
            };
            
            expect(validPartial).toBeValidPartialResult();
        });
        
        it('should fail for invalid confidence', () => {
            const invalidPartial = {
                confidence: 1.5, // Invalid
                method: 'meta-tag'
            };
            
            expect(() => {
                expect(invalidPartial).toBeValidPartialResult();
            }).toThrow();
        });
        
        it('should fail for empty method string', () => {
            const invalidPartial = {
                confidence: 0.8,
                method: '' // Invalid
            };
            
            expect(() => {
                expect(invalidPartial).toBeValidPartialResult();
            }).toThrow();
        });
        
        it('should fail for non-array evidence', () => {
            const invalidPartial = {
                confidence: 0.8,
                method: 'meta-tag',
                evidence: 'not-an-array' // Invalid
            };
            
            expect(() => {
                expect(invalidPartial).toBeValidPartialResult();
            }).toThrow();
        });
    });

    describe('toHaveConfidenceAbove matcher', () => {
        it('should pass when confidence is above threshold', () => {
            const result = {
                confidence: 0.9
            };
            
            expect(result).toHaveConfidenceAbove(0.8);
        });
        
        it('should fail when confidence is below threshold', () => {
            const result = {
                confidence: 0.7
            };
            
            expect(() => {
                expect(result).toHaveConfidenceAbove(0.8);
            }).toThrow();
        });
        
        it('should fail when confidence equals threshold', () => {
            const result = {
                confidence: 0.8
            };
            
            expect(() => {
                expect(result).toHaveConfidenceAbove(0.8);
            }).toThrow();
        });
        
        it('should fail for non-numeric confidence', () => {
            const result = {
                confidence: 'not-a-number'
            };
            
            expect(() => {
                expect(result).toHaveConfidenceAbove(0.8);
            }).toThrow();
        });
    });

    describe('toHaveConfidenceBelow matcher', () => {
        it('should pass when confidence is below threshold', () => {
            const result = {
                confidence: 0.7
            };
            
            expect(result).toHaveConfidenceBelow(0.8);
        });
        
        it('should fail when confidence is above threshold', () => {
            const result = {
                confidence: 0.9
            };
            
            expect(() => {
                expect(result).toHaveConfidenceBelow(0.8);
            }).toThrow();
        });
        
        it('should fail when confidence equals threshold', () => {
            const result = {
                confidence: 0.8
            };
            
            expect(() => {
                expect(result).toHaveConfidenceBelow(0.8);
            }).toThrow();
        });
    });

    describe('toHaveDetectedCMS matcher', () => {
        it('should pass when CMS matches', () => {
            const result = {
                cms: 'WordPress'
            };
            
            expect(result).toHaveDetectedCMS('WordPress');
        });
        
        it('should fail when CMS does not match', () => {
            const result = {
                cms: 'Drupal'
            };
            
            expect(() => {
                expect(result).toHaveDetectedCMS('WordPress');
            }).toThrow();
        });
        
        it('should fail for missing CMS field', () => {
            const result = {};
            
            expect(() => {
                expect(result).toHaveDetectedCMS('WordPress');
            }).toThrow();
        });
    });

    describe('toHaveExecutedWithin matcher', () => {
        it('should pass when execution time is within range', () => {
            const result = {
                executionTime: 150
            };
            
            expect(result).toHaveExecutedWithin(100, 200);
        });
        
        it('should pass when execution time is at boundaries', () => {
            const result1 = { executionTime: 100 };
            const result2 = { executionTime: 200 };
            
            expect(result1).toHaveExecutedWithin(100, 200);
            expect(result2).toHaveExecutedWithin(100, 200);
        });
        
        it('should fail when execution time is outside range', () => {
            const result = {
                executionTime: 250
            };
            
            expect(() => {
                expect(result).toHaveExecutedWithin(100, 200);
            }).toThrow();
        });
        
        it('should fail for non-numeric execution time', () => {
            const result = {
                executionTime: 'not-a-number'
            };
            
            expect(() => {
                expect(result).toHaveExecutedWithin(100, 200);
            }).toThrow();
        });
    });

    describe('toHaveUsedMethods matcher', () => {
        it('should pass when detection methods match', () => {
            const result = {
                detectionMethods: ['meta-tag', 'http-headers']
            };
            
            expect(result).toHaveUsedMethods(['meta-tag', 'http-headers']);
        });
        
        it('should pass when checking subset of methods', () => {
            const result = {
                detectionMethods: ['meta-tag', 'http-headers', 'robots-txt']
            };
            
            expect(result).toHaveUsedMethods(['meta-tag']);
            expect(result).toHaveUsedMethods(['meta-tag', 'http-headers']);
        });
        
        it('should fail when methods do not match', () => {
            const result = {
                detectionMethods: ['meta-tag']
            };
            
            expect(() => {
                expect(result).toHaveUsedMethods(['http-headers']);
            }).toThrow();
        });
        
        it('should fail when missing some required methods', () => {
            const result = {
                detectionMethods: ['meta-tag']
            };
            
            expect(() => {
                expect(result).toHaveUsedMethods(['meta-tag', 'http-headers']);
            }).toThrow();
        });
        
        it('should fail for non-array detection methods', () => {
            const result = {
                detectionMethods: 'not-an-array'
            };
            
            expect(() => {
                expect(result).toHaveUsedMethods(['meta-tag']);
            }).toThrow();
        });
    });

    describe('toBeFailedDetection matcher', () => {
        it('should pass for failed detection with error', () => {
            const failedResult = {
                cms: 'Unknown',
                confidence: 0,
                error: 'Detection failed'
            };
            
            expect(failedResult).toBeFailedDetection();
        });
        
        it('should pass for failed detection with empty detection methods', () => {
            const failedResult = {
                cms: 'Unknown',
                confidence: 0,
                detectionMethods: []
            };
            
            expect(failedResult).toBeFailedDetection();
        });
        
        it('should fail for successful detection', () => {
            const successResult = {
                cms: 'WordPress',
                confidence: 0.9,
                detectionMethods: ['meta-tag']
            };
            
            expect(() => {
                expect(successResult).toBeFailedDetection();
            }).toThrow();
        });
        
        it('should fail for unknown CMS with high confidence', () => {
            const ambiguousResult = {
                cms: 'Unknown',
                confidence: 0.5,
                detectionMethods: ['meta-tag']
            };
            
            expect(() => {
                expect(ambiguousResult).toBeFailedDetection();
            }).toThrow();
        });
    });

    describe('toHaveRedirected matcher', () => {
        it('should pass when URL has redirected', () => {
            const result = {
                originalUrl: 'http://example.com',
                finalUrl: 'https://example.com'
            };
            
            expect(result).toHaveRedirected();
        });
        
        it('should pass when redirect count is present', () => {
            const result = {
                originalUrl: 'https://example.com',
                finalUrl: 'https://example.com',
                redirectCount: 1
            };
            
            expect(result).toHaveRedirected();
        });
        
        it('should pass when protocol was upgraded', () => {
            const result = {
                originalUrl: 'https://example.com',
                finalUrl: 'https://example.com',
                protocolUpgraded: true
            };
            
            expect(result).toHaveRedirected();
        });
        
        it('should fail when URL has not redirected', () => {
            const result = {
                originalUrl: 'https://example.com',
                finalUrl: 'https://example.com'
            };
            
            expect(() => {
                expect(result).toHaveRedirected();
            }).toThrow();
        });
        
        it('should fail for missing URL fields', () => {
            const result = {};
            
            expect(() => {
                expect(result).toHaveRedirected();
            }).toThrow();
        });
    });

    describe('toBeValidCMSType matcher', () => {
        it('should pass for valid CMS types', () => {
            expect('WordPress').toBeValidCMSType();
            expect('Drupal').toBeValidCMSType();
            expect('Joomla').toBeValidCMSType();
            expect('Unknown').toBeValidCMSType();
        });
        
        it('should fail for invalid CMS types', () => {
            expect(() => {
                expect('InvalidCMS').toBeValidCMSType();
            }).toThrow();
            
            expect(() => {
                expect('wordpress').toBeValidCMSType(); // Case sensitive
            }).toThrow();
        });
        
        it('should fail for non-string values', () => {
            expect(() => {
                expect(123).toBeValidCMSType();
            }).toThrow();
            
            expect(() => {
                expect(null).toBeValidCMSType();
            }).toThrow();
            
            expect(() => {
                expect(undefined).toBeValidCMSType();
            }).toThrow();
        });
    });

    describe('Error Messages', () => {
        it('should provide helpful error messages for validation failures', () => {
            const invalidResult = {
                cms: 'WordPress',
                confidence: 1.5 // Invalid
            };
            
            try {
                expect(invalidResult).toBeValidCMSResult();
                fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).toContain('confidence is not between 0 and 1');
                expect(error.message).toContain('originalUrl is not a string');
                expect(error.message).toContain('finalUrl is not a string');
            }
        });
        
        it('should provide helpful error messages for method matching failures', () => {
            const result = {
                detectionMethods: ['meta-tag']
            };
            
            try {
                expect(result).toHaveUsedMethods(['meta-tag', 'http-headers', 'robots-txt']);
                fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).toContain('Missing: http-headers, robots-txt');
                expect(error.message).toContain('Actual: meta-tag');
            }
        });
    });

    describe('Integration with Real Data', () => {
        it('should work with realistic WordPress detection result', () => {
            const wordpressResult = {
                cms: 'WordPress',
                confidence: 0.95,
                originalUrl: 'https://blog.example.com',
                finalUrl: 'https://blog.example.com',
                executionTime: 342,
                detectionMethods: ['meta-tag', 'http-headers', 'robots-txt'],
                version: '6.3.1'
            };
            
            expect(wordpressResult).toBeValidCMSResult();
            expect(wordpressResult).toHaveDetectedCMS('WordPress');
            expect(wordpressResult).toHaveConfidenceAbove(0.9);
            expect(wordpressResult).toHaveExecutedWithin(300, 400);
            expect(wordpressResult).toHaveUsedMethods(['meta-tag', 'http-headers']);
            expect(wordpressResult.cms).toBeValidCMSType();
        });
        
        it('should work with realistic failed detection result', () => {
            const failedResult = {
                cms: 'Unknown',
                confidence: 0,
                originalUrl: 'https://custom-cms.example.com',
                finalUrl: 'https://custom-cms.example.com',
                executionTime: 5000,
                detectionMethods: [],
                error: 'No recognizable CMS patterns found'
            };
            
            expect(failedResult).toBeValidCMSResult();
            expect(failedResult).toBeFailedDetection();
            expect(failedResult).toHaveDetectedCMS('Unknown');
            expect(failedResult).toHaveConfidenceBelow(0.1);
            expect(failedResult.cms).toBeValidCMSType();
        });
        
        it('should work with realistic partial detection result', () => {
            const partialResult = {
                confidence: 0.7,
                method: 'meta-tag-strategy',
                evidence: ['Generator meta tag found: Drupal 9.4'],
                executionTime: 125,
                version: '9.4'
            };
            
            expect(partialResult).toBeValidPartialResult();
            expect(partialResult).toHaveConfidenceAbove(0.6);
            expect(partialResult).toHaveConfidenceBelow(0.8);
            expect(partialResult).toHaveExecutedWithin(100, 150);
        });
    });
});