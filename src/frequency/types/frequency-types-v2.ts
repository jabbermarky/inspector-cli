/**
 * Frequency Analysis V2 Types
 *
 * Pure V2 type definitions with zero V1 dependencies.
 * These types replace the V1 types that were previously imported.
 */

import type { BiasSpecificData } from './bias-analysis-types-v2.js';

/**
 * Options for frequency analysis
 */
export interface FrequencyOptions {
    /** Data source options */
    dataSource?: 'cms-analysis' | 'learn';
    dataDir?: string;

    /** Filtering options */
    minSites?: number;
    minOccurrences?: number;
    pageType?: 'all' | 'mainpage' | 'robots';

    /** Temporal filtering options */
    dateRange?: {
        start?: Date;
        end?: Date;
    };

    /** Output options */
    output?: 'json' | 'csv' | 'human' | 'markdown';
    outputFile?: string;

    /** Analysis options */
    includeRecommendations?: boolean;
    includeCurrentFilters?: boolean;
    debugCalculations?: boolean;

    /** Phase 3: Validation options */
    enableValidation?: boolean;
    skipStatisticalTests?: boolean;
    validationStopOnError?: boolean;
    validationDebugMode?: boolean;
}

/**
 * Result of frequency analysis
 */
export interface FrequencyResult {
    /** Metadata for backward compatibility with V1 */
    metadata: {
        totalSites: number;
        validSites: number;
        filteredSites: number;
        analysisDate: string;
        options: FrequencyOptions;
        temporalRange?: {
            earliestCapture: string;
            latestCapture: string;
            timeSpan: string;
        };
    };

    /** Analysis summary */
    summary: {
        totalSitesAnalyzed: number;
        totalPatternsFound: number;
        analysisDate: string;
        filteringStats?: {
            sitesBeforeFiltering: number;
            sitesAfterFiltering: number;
            sitesFiltered: number;
            reasonsForFiltering: Record<string, number>;
        };
    };

    /** Header patterns found (V1 compatible structure) */
    headers: {
        [headerName: string]: {
            frequency: number;
            occurrences: number;
            totalSites: number;
            values: Array<{
                value: string;
                frequency: number;
                occurrences: number;
                examples: string[];
            }>;
            pageDistribution?: {
                mainpage: number;
                robots: number;
            };
        };
    };

    /** Meta tag patterns found (V1 compatible structure) */
    metaTags: {
        [tagKey: string]: {
            frequency: number;
            occurrences: number;
            totalSites: number;
            values: Array<{
                value: string;
                frequency: number;
                occurrences: number;
                examples: string[];
            }>;
        };
    };

    /** Script patterns found (V1 compatible structure) */
    scripts: {
        [scriptPattern: string]: {
            frequency: number;
            occurrences: number;
            totalSites: number;
            examples: string[];
        };
    };

    /** Technology patterns found */
    technologies?: {
        patterns: Array<{
            pattern: string;
            siteCount: number;
            frequency: number;
            confidence?: number;
        }>;
        totalUnique: number;
    };

    /** Bias analysis results */
    biasAnalysis?: BiasSpecificData;

    /** Validation results */
    validation?: {
        passed: boolean;
        qualityScore: number;
        statisticalMetrics?: {
            chiSquare: number;
            pValue: number;
            significantPatterns: number;
        };
    };

    /** Recommendations for improving detection/filtering */
    recommendations?: {
        learn: {
            currentlyFiltered: Array<{
                pattern: string;
                reason: string;
                frequency: number;
                diversity: number;
            }>;
            recommendToFilter: Array<{
                pattern: string;
                reason: string;
                frequency: number;
                diversity: number;
            }>;
            recommendToKeep: Array<{
                pattern: string;
                reason: string;
                frequency: number;
                diversity: number;
            }>;
        };
        detectCms: {
            newPatternOpportunities: Array<{
                pattern: string;
                frequency: number;
                confidence: number;
                cmsCorrelation: Record<string, number>;
            }>;
            patternsToRefine: Array<{
                pattern: string;
                issue: string;
                currentFrequency: number;
            }>;
        };
        groundTruth: {
            currentlyUsedPatterns: string[];
            potentialNewRules: Array<{
                pattern: string;
                confidence: number;
                suggestedRule: string;
            }>;
        };
    };

    /** Filtering report for backward compatibility */
    filteringReport?: {
        sitesFilteredOut: number;
        filterReasons: Record<string, number>;
    };
}

/**
 * Header primary category type for semantic analysis
 */
export type HeaderPrimaryCategory = 'security' | 'caching' | 'infrastructure' | 'custom';

/**
 * Header categorization result
 */
export interface HeaderCategorization {
    primary: HeaderPrimaryCategory;
    secondary?: string;
    confidence: number;
}

/**
 * Type for options with all required except dateRange
 */
export type FrequencyOptionsWithDefaults = Required<Omit<FrequencyOptions, 'dateRange'>> &
    Pick<FrequencyOptions, 'dateRange'>;
