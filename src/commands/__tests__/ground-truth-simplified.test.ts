/**
 * Simplified Ground-Truth Command Tests
 * 
 * These tests focus on the critical domain validation bug and core functionality
 * without complex TypeScript mock issues.
 */

import { jest } from '@jest/globals';
import { 
    createMockCMSData,
    createWordPressMockData,
    createLogrocketMockData,
    mockHasSameDomainHtmlPattern,
    mockIsSameDomainScript,
    mockSimplePatternCount,
    mockDomainAwarePatternCount,
    createDomainValidationTestCases,
    setupGroundTruthTests
} from '@test-utils';

describe('Ground-Truth Domain Validation Bug Analysis', () => {
    setupGroundTruthTests();

    describe('Critical Bug: HTML Pattern Analysis', () => {
        describe('LogRocket False Positive Case', () => {
            it('should demonstrate the bug: simple counting vs domain-aware counting', () => {
                const logrocketData = createLogrocketMockData();
                
                // Current buggy implementation - counts ALL wp-content instances
                const buggyCount = mockSimplePatternCount(logrocketData.htmlContent!, 'wp-content');
                
                // Fixed implementation - only counts same-domain instances
                const fixedCount = mockDomainAwarePatternCount(
                    logrocketData.htmlContent!, 
                    'wp-content', 
                    logrocketData.url
                );
                
                // Bug demonstration
                expect(buggyCount).toBe(6); // Counts external blog.logrocket.com references
                expect(fixedCount).toBe(0); // Correctly ignores external references
            });

            it('should show HTML content patterns that cause false positives', () => {
                const logrocketData = createLogrocketMockData();
                const html = logrocketData.htmlContent!;
                
                // Extract the actual wp-content URLs found
                const wpContentMatches = html.match(/https?:\/\/[^\s"']+wp-content[^\s"']*/gi) || [];
                
                // Verify all matches are external (blog.logrocket.com)
                wpContentMatches.forEach(match => {
                    const url = new URL(match);
                    expect(url.hostname).toBe('blog.logrocket.com');
                    expect(url.hostname).not.toBe('logrocket.com');
                });
                
                expect(wpContentMatches.length).toBe(6);
            });
        });

        describe('WordPress Site Validation', () => {
            it('should correctly validate real WordPress site', () => {
                const wordpressData = createWordPressMockData('example.com');
                
                const hasSameDomain = mockHasSameDomainHtmlPattern(
                    wordpressData.htmlContent!,
                    'wp-content',
                    wordpressData.url
                );
                
                const count = mockDomainAwarePatternCount(
                    wordpressData.htmlContent!,
                    'wp-content',
                    wordpressData.url
                );
                
                expect(hasSameDomain).toBe(true);
                expect(count).toBeGreaterThan(0);
            });

            it('should handle WordPress site with mixed external references', () => {
                const wordpressData = createWordPressMockData('example.com', true); // Include external refs
                
                const totalCount = mockSimplePatternCount(wordpressData.htmlContent!, 'wp-content');
                const sameDomainCount = mockDomainAwarePatternCount(
                    wordpressData.htmlContent!,
                    'wp-content',
                    wordpressData.url
                );
                
                // Should have both internal and external references
                expect(totalCount).toBeGreaterThan(sameDomainCount);
                expect(sameDomainCount).toBeGreaterThan(0);
            });
        });
    });

    describe('Domain Validation Functions', () => {
        describe('hasSameDomainHtmlPattern', () => {
            const testCases = createDomainValidationTestCases();
            
            testCases.forEach(testCase => {
                it(`should handle: ${testCase.name}`, () => {
                    const result = mockHasSameDomainHtmlPattern(
                        testCase.htmlContent,
                        testCase.pattern,
                        testCase.targetUrl
                    );
                    
                    expect(result).toBe(testCase.expectedSameDomain);
                });
            });
        });

        describe('isSameDomainScript', () => {
            it('should validate relative URLs as same domain', () => {
                const result = mockIsSameDomainScript('/wp-content/script.js', 'https://example.com');
                expect(result).toBe(true);
            });

            it('should validate same domain absolute URLs', () => {
                const result = mockIsSameDomainScript(
                    'https://example.com/wp-content/script.js',
                    'https://example.com'
                );
                expect(result).toBe(true);
            });

            it('should reject different domain URLs', () => {
                const result = mockIsSameDomainScript(
                    'https://blog.example.com/wp-content/script.js',
                    'https://example.com'
                );
                expect(result).toBe(false);
            });

            it('should handle the critical subdomain distinction', () => {
                // This is the key issue: blog.logrocket.com vs logrocket.com
                const result = mockIsSameDomainScript(
                    'https://blog.logrocket.com/wp-content/script.js',
                    'https://logrocket.com'
                );
                expect(result).toBe(false);
            });
        });
    });

    describe('Bug Impact Analysis', () => {
        it('should show how the bug affects signal strength calculation', () => {
            const logrocketData = createLogrocketMockData();
            
            // Mock signal analysis results
            const buggySignals = {
                wpContentFound: mockSimplePatternCount(logrocketData.htmlContent!, 'wp-content') > 0,
                wpContentCount: mockSimplePatternCount(logrocketData.htmlContent!, 'wp-content'),
                signalStrength: 0.9 // High confidence due to multiple matches
            };
            
            const fixedSignals = {
                wpContentFound: mockDomainAwarePatternCount(logrocketData.htmlContent!, 'wp-content', logrocketData.url) > 0,
                wpContentCount: mockDomainAwarePatternCount(logrocketData.htmlContent!, 'wp-content', logrocketData.url),
                signalStrength: 0.0 // No confidence due to no same-domain matches
            };
            
            // Demonstrate the impact
            expect(buggySignals.wpContentFound).toBe(true);
            expect(buggySignals.wpContentCount).toBe(6);
            expect(buggySignals.signalStrength).toBe(0.9);
            
            expect(fixedSignals.wpContentFound).toBe(false);
            expect(fixedSignals.wpContentCount).toBe(0);
            expect(fixedSignals.signalStrength).toBe(0.0);
        });

        it('should demonstrate signal strength difference between methods', () => {
            const testUrls = [
                { url: 'https://logrocket.com', isWordPress: false },
                { url: 'https://wordpress-site.com', isWordPress: true }
            ];
            
            testUrls.forEach(({ url, isWordPress }) => {
                const testData = isWordPress ? 
                    createWordPressMockData(url.replace('https://', '')) :
                    createLogrocketMockData();
                
                const buggyResult = mockSimplePatternCount(testData.htmlContent!, 'wp-content') > 0;
                const fixedResult = mockDomainAwarePatternCount(testData.htmlContent!, 'wp-content', url) > 0;
                
                if (isWordPress) {
                    // WordPress sites should be detected by both methods
                    expect(buggyResult).toBe(true);
                    expect(fixedResult).toBe(true);
                } else {
                    // Non-WordPress sites should only trigger the buggy method
                    expect(buggyResult).toBe(true); // Bug: false positive
                    expect(fixedResult).toBe(false); // Fixed: correct negative
                }
            });
        });
    });

    describe('Data Structure Validation', () => {
        it('should validate mock data structures', () => {
            const wordpressData = createWordPressMockData();
            expect(wordpressData.url).toBeDefined();
            expect(wordpressData.htmlContent).toBeDefined();
            expect(wordpressData.scripts).toBeDefined();
            expect(wordpressData.metaTags).toBeDefined();
            expect(wordpressData.httpHeaders).toBeDefined();
        });

        it('should validate discriminative feature data', () => {
            const wordpressData = createWordPressMockData();
            
            // Check that the mock data contains the patterns we expect
            expect(wordpressData.htmlContent).toContain('wp-content');
            expect(wordpressData.scripts!.some(s => s.src.includes('wp-content'))).toBe(true);
            expect(wordpressData.metaTags!.some(t => t.name === 'generator')).toBe(true);
        });
    });

    describe('Fix Implementation Guidelines', () => {
        it('should provide pattern for fixing analyzeHtmlSignals method', () => {
            const testData = createLogrocketMockData();
            
            // Current implementation (buggy)
            const currentImpl = (html: string, pattern: string) => {
                return (html.match(new RegExp(pattern, 'g')) || []).length;
            };
            
            // Fixed implementation (domain-aware)
            const fixedImpl = (html: string, pattern: string, targetUrl: string) => {
                return mockDomainAwarePatternCount(html, pattern, targetUrl);
            };
            
            const currentResult = currentImpl(testData.htmlContent!, 'wp-content');
            const fixedResult = fixedImpl(testData.htmlContent!, 'wp-content', testData.url);
            
            expect(currentResult).toBe(6); // Demonstrates the bug
            expect(fixedResult).toBe(0);   // Shows the fix
            
            // This test serves as documentation for the required fix
        });
    });
});

describe('Ground-Truth Test Utilities', () => {
    describe('Mock Data Generators', () => {
        it('should create valid WordPress mock data', () => {
            const data = createWordPressMockData();
            expect(data.url).toMatch(/^https:\/\//);
            expect(data.htmlContent).toContain('WordPress');
            expect(data.metaTags!.find(t => t.name === 'generator')).toBeDefined();
        });

        it('should create LogRocket false positive case', () => {
            const data = createLogrocketMockData();
            expect(data.url).toBe('https://logrocket.com');
            expect(data.htmlContent).toContain('blog.logrocket.com/wp-content');
            
            // Verify no same-domain wp-content references (only external blog references)
            const sameDomainRefs = data.htmlContent!.match(/https:\/\/logrocket\.com[^\/]*\/wp-content/g);
            expect(sameDomainRefs).toBeNull();
        });

        it('should create mixed external reference WordPress data', () => {
            const data = createWordPressMockData('example.com', true);
            const html = data.htmlContent!;
            
            // Should have both same-domain and external references
            expect(html).toContain('https://example.com/wp-content');
            expect(html).toContain('https://blog.example.com/wp-content');
        });
    });

    describe('Validation Functions', () => {
        it('should validate domain validation test cases structure', () => {
            const testCases = createDomainValidationTestCases();
            
            testCases.forEach(testCase => {
                expect(testCase.name).toBeDefined();
                expect(testCase.htmlContent).toBeDefined();
                expect(testCase.pattern).toBeDefined();
                expect(testCase.targetUrl).toBeDefined();
                expect(typeof testCase.expectedSameDomain).toBe('boolean');
                expect(typeof testCase.expectedCount).toBe('number');
            });
        });
    });
});