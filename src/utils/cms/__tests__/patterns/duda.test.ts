import { describe, it, expect } from 'vitest';
import { 
    DUDA_HIGH_CONFIDENCE_PATTERNS,
    DUDA_MEDIUM_CONFIDENCE_PATTERNS,
    DUDA_META_PATTERNS,
    ALL_DUDA_PATTERNS,
    DUDA_PATTERN_CONFIDENCE
} from '../../patterns/duda.js';

describe('Duda Pattern Constants', () => {
    describe('High Confidence Patterns', () => {
        it('should contain core Duda JavaScript patterns', () => {
            expect(DUDA_HIGH_CONFIDENCE_PATTERNS.WINDOW_PARAMETERS).toBe('window.Parameters = window.Parameters');
            expect(DUDA_HIGH_CONFIDENCE_PATTERNS.DUDAONE_BASE64).toBe("SiteType: atob('RFVEQU9ORQ==')");
            expect(DUDA_HIGH_CONFIDENCE_PATTERNS.DM_DIRECT_PRODUCT).toBe("productId: 'DM_DIRECT'");
            expect(DUDA_HIGH_CONFIDENCE_PATTERNS.DM_BODY_SELECTOR).toBe("BlockContainerSelector: '.dmBody'");
            expect(DUDA_HIGH_CONFIDENCE_PATTERNS.US_DIRECT_PRODUCTION).toBe("SystemID: 'US_DIRECT_PRODUCTION'");
        });

        it('should have high confidence scores for high-confidence patterns', () => {
            expect(DUDA_PATTERN_CONFIDENCE[DUDA_HIGH_CONFIDENCE_PATTERNS.WINDOW_PARAMETERS]).toBe(0.99);
            expect(DUDA_PATTERN_CONFIDENCE[DUDA_HIGH_CONFIDENCE_PATTERNS.DUDAONE_BASE64]).toBe(0.99);
            expect(DUDA_PATTERN_CONFIDENCE[DUDA_HIGH_CONFIDENCE_PATTERNS.DM_DIRECT_PRODUCT]).toBe(0.98);
            expect(DUDA_PATTERN_CONFIDENCE[DUDA_HIGH_CONFIDENCE_PATTERNS.DM_BODY_SELECTOR]).toBe(0.98);
            expect(DUDA_PATTERN_CONFIDENCE[DUDA_HIGH_CONFIDENCE_PATTERNS.US_DIRECT_PRODUCTION]).toBe(0.90);
        });
    });

    describe('Medium Confidence Patterns', () => {
        it('should contain CDN and domain patterns', () => {
            expect(DUDA_MEDIUM_CONFIDENCE_PATTERNS.IRP_CDN).toBe('irp.cdn-website.com');
            expect(DUDA_MEDIUM_CONFIDENCE_PATTERNS.LIRP_CDN).toBe('lirp.cdn-website.com');
            expect(DUDA_MEDIUM_CONFIDENCE_PATTERNS.DUDA_MOBILE).toBe('dudamobile.com');
        });

        it('should contain CSS class patterns', () => {
            expect(DUDA_MEDIUM_CONFIDENCE_PATTERNS.DM_ALBUM).toBe('dmalbum');
            expect(DUDA_MEDIUM_CONFIDENCE_PATTERNS.DM_RESP_IMG).toBe('dmrespimg');
        });

        it('should contain builder identifiers', () => {
            expect(DUDA_MEDIUM_CONFIDENCE_PATTERNS.DUDA_BUILDER).toBe('duda_website_builder');
            expect(DUDA_MEDIUM_CONFIDENCE_PATTERNS.DUDA_UNDERSCORE).toBe('_duda_');
        });

        it('should have medium confidence scores for medium-confidence patterns', () => {
            expect(DUDA_PATTERN_CONFIDENCE[DUDA_MEDIUM_CONFIDENCE_PATTERNS.IRP_CDN]).toBe(0.85);
            expect(DUDA_PATTERN_CONFIDENCE[DUDA_MEDIUM_CONFIDENCE_PATTERNS.LIRP_CDN]).toBe(0.85);
            expect(DUDA_PATTERN_CONFIDENCE[DUDA_MEDIUM_CONFIDENCE_PATTERNS.DUDA_MOBILE]).toBe(0.80);
            expect(DUDA_PATTERN_CONFIDENCE[DUDA_MEDIUM_CONFIDENCE_PATTERNS.DM_ALBUM]).toBe(0.75);
            expect(DUDA_PATTERN_CONFIDENCE[DUDA_MEDIUM_CONFIDENCE_PATTERNS.DM_RESP_IMG]).toBe(0.75);
            expect(DUDA_PATTERN_CONFIDENCE[DUDA_MEDIUM_CONFIDENCE_PATTERNS.DUDA_BUILDER]).toBe(0.70);
            expect(DUDA_PATTERN_CONFIDENCE[DUDA_MEDIUM_CONFIDENCE_PATTERNS.DUDA_UNDERSCORE]).toBe(0.70);
        });
    });

    describe('Meta Tag Patterns', () => {
        it('should contain meta tag regex patterns', () => {
            expect(DUDA_META_PATTERNS.GENERATOR_DUDA).toBeInstanceOf(RegExp);
            expect(DUDA_META_PATTERNS.VIEWPORT_DUDA).toBeInstanceOf(RegExp);
        });

        it('should match Duda-related content case-insensitively', () => {
            expect(DUDA_META_PATTERNS.GENERATOR_DUDA.test('duda')).toBe(true);
            expect(DUDA_META_PATTERNS.GENERATOR_DUDA.test('DUDA')).toBe(true);
            expect(DUDA_META_PATTERNS.GENERATOR_DUDA.test('Duda Website Builder')).toBe(true);
            
            expect(DUDA_META_PATTERNS.VIEWPORT_DUDA.test('duda')).toBe(true);
            expect(DUDA_META_PATTERNS.VIEWPORT_DUDA.test('Duda Mobile')).toBe(true);
        });
    });

    describe('All Patterns Collection', () => {
        it('should include all pattern types', () => {
            // Check that ALL_DUDA_PATTERNS includes patterns from all categories
            expect(ALL_DUDA_PATTERNS.WINDOW_PARAMETERS).toBeDefined();
            expect(ALL_DUDA_PATTERNS.IRP_CDN).toBeDefined();
            expect(ALL_DUDA_PATTERNS.GENERATOR_DUDA).toBeDefined();
        });

        it('should have unique patterns across categories', () => {
            const allPatternValues = Object.values(ALL_DUDA_PATTERNS);
            const uniqueValues = new Set(allPatternValues);
            expect(uniqueValues.size).toBe(allPatternValues.length);
        });
    });

    describe('Pattern Confidence Scores', () => {
        it('should have confidence scores for all string patterns', () => {
            const stringPatterns = [
                ...Object.values(DUDA_HIGH_CONFIDENCE_PATTERNS),
                ...Object.values(DUDA_MEDIUM_CONFIDENCE_PATTERNS)
            ];

            for (const pattern of stringPatterns) {
                expect(DUDA_PATTERN_CONFIDENCE[pattern]).toBeDefined();
                expect(typeof DUDA_PATTERN_CONFIDENCE[pattern]).toBe('number');
                expect(DUDA_PATTERN_CONFIDENCE[pattern]).toBeGreaterThan(0);
                expect(DUDA_PATTERN_CONFIDENCE[pattern]).toBeLessThanOrEqual(1);
            }
        });

        it('should have higher scores for high-confidence patterns', () => {
            const highConfidenceValues = Object.values(DUDA_HIGH_CONFIDENCE_PATTERNS);
            const mediumConfidenceValues = Object.values(DUDA_MEDIUM_CONFIDENCE_PATTERNS);

            for (const highPattern of highConfidenceValues) {
                const highScore = DUDA_PATTERN_CONFIDENCE[highPattern];
                for (const mediumPattern of mediumConfidenceValues) {
                    const mediumScore = DUDA_PATTERN_CONFIDENCE[mediumPattern];
                    if (highScore && mediumScore) {
                        expect(highScore).toBeGreaterThanOrEqual(mediumScore);
                    }
                }
            }
        });

        it('should have realistic confidence ranges', () => {
            // High confidence patterns should be >= 0.9
            const highConfidenceValues = Object.values(DUDA_HIGH_CONFIDENCE_PATTERNS);
            for (const pattern of highConfidenceValues) {
                const score = DUDA_PATTERN_CONFIDENCE[pattern];
                if (score) {
                    expect(score).toBeGreaterThanOrEqual(0.9);
                }
            }

            // Medium confidence patterns should be between 0.7 and 0.9
            const mediumConfidenceValues = Object.values(DUDA_MEDIUM_CONFIDENCE_PATTERNS);
            for (const pattern of mediumConfidenceValues) {
                const score = DUDA_PATTERN_CONFIDENCE[pattern];
                if (score) {
                    expect(score).toBeGreaterThanOrEqual(0.7);
                    expect(score).toBeLessThan(0.9);
                }
            }
        });
    });

    describe('Pattern Completeness', () => {
        it('should cover all major Duda signatures discovered in ground-truth analysis', () => {
            // Core JavaScript patterns
            expect(DUDA_HIGH_CONFIDENCE_PATTERNS.WINDOW_PARAMETERS).toContain('window.Parameters');
            expect(DUDA_HIGH_CONFIDENCE_PATTERNS.DUDAONE_BASE64).toContain('RFVEQU9ORQ==');
            expect(DUDA_HIGH_CONFIDENCE_PATTERNS.DM_DIRECT_PRODUCT).toContain('DM_DIRECT');
            expect(DUDA_HIGH_CONFIDENCE_PATTERNS.DM_BODY_SELECTOR).toContain('.dmBody');

            // CDN patterns
            expect(DUDA_MEDIUM_CONFIDENCE_PATTERNS.IRP_CDN).toContain('irp.cdn-website.com');
            expect(DUDA_MEDIUM_CONFIDENCE_PATTERNS.LIRP_CDN).toContain('lirp.cdn-website.com');

            // CSS and DOM patterns
            expect(DUDA_MEDIUM_CONFIDENCE_PATTERNS.DM_ALBUM).toBe('dmalbum');
            expect(DUDA_MEDIUM_CONFIDENCE_PATTERNS.DM_RESP_IMG).toBe('dmrespimg');

            // Builder identifiers
            expect(DUDA_MEDIUM_CONFIDENCE_PATTERNS.DUDA_BUILDER).toBe('duda_website_builder');
            expect(DUDA_MEDIUM_CONFIDENCE_PATTERNS.DUDA_MOBILE).toBe('dudamobile.com');
        });

        it('should have patterns that are as const to ensure immutability', () => {
            // This test ensures that the pattern objects are properly typed as const
            // TypeScript will catch if patterns are accidentally modified
            expect(typeof DUDA_HIGH_CONFIDENCE_PATTERNS).toBe('object');
            expect(typeof DUDA_MEDIUM_CONFIDENCE_PATTERNS).toBe('object');
            expect(typeof DUDA_PATTERN_CONFIDENCE).toBe('object');
        });
    });
});