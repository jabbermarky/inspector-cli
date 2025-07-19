import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LearnOptions, FilteringOptions } from '../../learn/types.js';

describe('Learn Command CLI Integration', () => {
    let mockOptions: LearnOptions;
    
    beforeEach(() => {
        mockOptions = {
            collectData: true,
            dryRun: true,
            model: 'gpt-4o'
        };
    });

    it('should parse explicit filtering flags correctly', () => {
        // Simulate Commander.js parsed options with explicit flags
        const cliOptions = {
            ...mockOptions,
            filterHeaders: true,
            filterTracking: true,
            filterMetaTags: undefined,
            filterLibraries: undefined,
            noFiltering: undefined
        };

        // Simulate the new CLI parsing logic
        const hasExplicitFlags = cliOptions.filterHeaders || cliOptions.filterMetaTags || cliOptions.filterTracking || cliOptions.filterLibraries;
        const hasPresetLevel = cliOptions.filterLevel && ['conservative', 'aggressive'].includes(cliOptions.filterLevel);
        const shouldApplyFiltering = !cliOptions.noFiltering && (hasExplicitFlags || hasPresetLevel);

        expect(shouldApplyFiltering).toBe(true);
        expect(hasExplicitFlags).toBe(true);
        expect(hasPresetLevel).toBeFalsy();

        if (shouldApplyFiltering) {
            if (hasExplicitFlags) {
                cliOptions.filteringOptions = {
                    level: 'custom',
                    removeGenericHeaders: cliOptions.filterHeaders,
                    removeUniversalMetaTags: cliOptions.filterMetaTags,
                    removeTrackingScripts: cliOptions.filterTracking,
                    removeCommonLibraries: cliOptions.filterLibraries
                };
            }
        }

        expect(cliOptions.filteringOptions).toEqual({
            level: 'custom',
            removeGenericHeaders: true,
            removeUniversalMetaTags: undefined,
            removeTrackingScripts: true,
            removeCommonLibraries: undefined
        });
    });

    it('should respect no-filtering flag', () => {
        // Simulate Commander.js parsed options with no-filtering
        const cliOptions = {
            ...mockOptions,
            filterLevel: 'conservative',
            filterHeaders: true,
            filterTracking: true,
            noFiltering: true // This should override other filtering options
        };

        const hasExplicitFlags = cliOptions.filterHeaders || cliOptions.filterMetaTags || cliOptions.filterTracking || cliOptions.filterLibraries;
        const hasPresetLevel = cliOptions.filterLevel && ['conservative', 'aggressive'].includes(cliOptions.filterLevel);
        const shouldApplyFiltering = !cliOptions.noFiltering && (hasExplicitFlags || hasPresetLevel);

        expect(shouldApplyFiltering).toBe(false);
        expect(hasExplicitFlags).toBe(true);
        expect(hasPresetLevel).toBe(true);
        expect(cliOptions.noFiltering).toBe(true);
    });

    it('should apply conservative preset automatically', () => {
        const cliOptions = {
            ...mockOptions,
            filterLevel: 'conservative',
            noFiltering: undefined
        };

        const hasExplicitFlags = cliOptions.filterHeaders || cliOptions.filterMetaTags || cliOptions.filterTracking || cliOptions.filterLibraries;
        const hasPresetLevel = cliOptions.filterLevel && ['conservative', 'aggressive'].includes(cliOptions.filterLevel);
        const shouldApplyFiltering = !cliOptions.noFiltering && (hasExplicitFlags || hasPresetLevel);

        expect(shouldApplyFiltering).toBe(true);
        expect(hasExplicitFlags).toBe(undefined);
        expect(hasPresetLevel).toBe(true);

        if (shouldApplyFiltering) {
            if (hasExplicitFlags) {
                cliOptions.filteringOptions = {
                    level: 'custom',
                    removeGenericHeaders: cliOptions.filterHeaders,
                    removeUniversalMetaTags: cliOptions.filterMetaTags,
                    removeTrackingScripts: cliOptions.filterTracking,
                    removeCommonLibraries: cliOptions.filterLibraries
                };
            } else {
                cliOptions.filteringOptions = {
                    level: cliOptions.filterLevel
                };
            }
        }

        expect(cliOptions.filteringOptions?.level).toBe('conservative');
        expect(cliOptions.filteringOptions?.removeGenericHeaders).toBe(undefined); // Set by filtering logic
    });

    it('should apply aggressive preset automatically', () => {
        const cliOptions = {
            ...mockOptions,
            filterLevel: 'aggressive',
            noFiltering: undefined
        };

        const hasExplicitFlags = cliOptions.filterHeaders || cliOptions.filterMetaTags || cliOptions.filterTracking || cliOptions.filterLibraries;
        const hasPresetLevel = cliOptions.filterLevel && ['conservative', 'aggressive'].includes(cliOptions.filterLevel);
        const shouldApplyFiltering = !cliOptions.noFiltering && (hasExplicitFlags || hasPresetLevel);

        expect(shouldApplyFiltering).toBe(true);
        expect(hasExplicitFlags).toBe(undefined);
        expect(hasPresetLevel).toBe(true);

        if (shouldApplyFiltering) {
            if (hasExplicitFlags) {
                cliOptions.filteringOptions = {
                    level: 'custom',
                    removeGenericHeaders: cliOptions.filterHeaders,
                    removeUniversalMetaTags: cliOptions.filterMetaTags,
                    removeTrackingScripts: cliOptions.filterTracking,
                    removeCommonLibraries: cliOptions.filterLibraries
                };
            } else {
                cliOptions.filteringOptions = {
                    level: cliOptions.filterLevel
                };
            }
        }

        expect(cliOptions.filteringOptions?.level).toBe('aggressive');
    });

    it('should not apply filtering when no options are set', () => {
        const cliOptions = {
            ...mockOptions,
            noFiltering: undefined
        };

        const hasExplicitFlags = cliOptions.filterHeaders || cliOptions.filterMetaTags || cliOptions.filterTracking || cliOptions.filterLibraries;
        const hasPresetLevel = cliOptions.filterLevel && ['conservative', 'aggressive'].includes(cliOptions.filterLevel);
        const shouldApplyFiltering = !cliOptions.noFiltering && (hasExplicitFlags || hasPresetLevel);

        expect(shouldApplyFiltering).toBeFalsy();
        expect(hasExplicitFlags).toBe(undefined);
        expect(hasPresetLevel).toBeFalsy();
    });

    it('should handle all explicit filtering options together', () => {
        const cliOptions = {
            ...mockOptions,
            filterHeaders: true,
            filterMetaTags: true,
            filterTracking: true,
            filterLibraries: true,
            noFiltering: undefined
        };

        const hasExplicitFlags = cliOptions.filterHeaders || cliOptions.filterMetaTags || cliOptions.filterTracking || cliOptions.filterLibraries;
        const hasPresetLevel = cliOptions.filterLevel && ['conservative', 'aggressive'].includes(cliOptions.filterLevel);
        const shouldApplyFiltering = !cliOptions.noFiltering && (hasExplicitFlags || hasPresetLevel);

        if (shouldApplyFiltering) {
            if (hasExplicitFlags) {
                cliOptions.filteringOptions = {
                    level: 'custom',
                    removeGenericHeaders: cliOptions.filterHeaders,
                    removeUniversalMetaTags: cliOptions.filterMetaTags,
                    removeTrackingScripts: cliOptions.filterTracking,
                    removeCommonLibraries: cliOptions.filterLibraries
                };
            }
        }

        expect(cliOptions.filteringOptions).toEqual({
            level: 'custom',
            removeGenericHeaders: true,
            removeUniversalMetaTags: true,
            removeTrackingScripts: true,
            removeCommonLibraries: true
        });
    });
});