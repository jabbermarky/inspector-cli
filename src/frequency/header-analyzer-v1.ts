import { createModuleLogger } from '../utils/logger.js';
import type {
    DetectionDataPoint,
    FrequencyOptions,
    FrequencyOptionsWithDefaults,
} from './types-v1.js';

const logger = createModuleLogger('frequency-header-analyzer');

export interface HeaderPattern {
    pattern: string;
    frequency: number;
    confidence: number;
    examples: string[];
    cmsCorrelation: Record<string, number>;
    pageDistribution: {
        mainpage: number;
        robots: number;
    };
}

/**
 * Analyze HTTP headers for frequency patterns
 * Extends PatternDiscovery functionality for headers specifically
 */
export async function analyzeHeaders(
    dataPoints: DetectionDataPoint[],
    options: FrequencyOptionsWithDefaults
): Promise<Map<string, HeaderPattern[]>> {
    logger.info('Starting header frequency analysis', {
        totalSites: dataPoints.length,
        minOccurrences: options.minOccurrences,
    });

    // Group headers by name and value
    const headerStats = new Map<
        string,
        Map<
            string,
            {
                count: number;
                examples: string[];
                cmsSources: Set<string>;
                pageCount: {
                    mainpage: number;
                    robots: number;
                };
            }
        >
    >();

    // Process each data point
    for (const dataPoint of dataPoints) {
        if (!dataPoint.httpHeaders) continue;

        // Get CMS from detection results (highest confidence)
        let detectedCms = 'Unknown';
        if (dataPoint.detectionResults?.length > 0) {
            const bestDetection = dataPoint.detectionResults.sort(
                (a, b) => b.confidence - a.confidence
            )[0];
            detectedCms = bestDetection?.cms || 'Unknown';
        }

        // Process mainpage headers
        processHeaders(dataPoint.httpHeaders, 'mainpage', detectedCms, dataPoint.url, headerStats);

        // Process robots.txt headers if available
        if (dataPoint.robotsTxt?.httpHeaders) {
            processHeaders(
                dataPoint.robotsTxt.httpHeaders,
                'robots',
                detectedCms,
                dataPoint.url,
                headerStats
            );
        }
    }

    // Convert to pattern format
    const patterns = new Map<string, HeaderPattern[]>();
    const totalSites = dataPoints.length;

    for (const [headerName, headerMap] of headerStats.entries()) {
        const headerPatterns: HeaderPattern[] = [];

        for (const [headerValue, stats] of headerMap.entries()) {
            const frequency = stats.count / totalSites;

            // Apply minimum occurrence threshold
            if (stats.count >= options.minOccurrences) {
                // Calculate CMS correlation
                const cmsCorrelation: Record<string, number> = {};
                const totalCmsCount = stats.cmsSources.size;

                for (const cms of stats.cmsSources) {
                    // This is a simplified correlation - could be enhanced
                    cmsCorrelation[cms] = 1.0 / totalCmsCount;
                }

                // Calculate confidence based on discriminative value
                const confidence = calculateHeaderConfidence(frequency, stats.cmsSources.size);

                // Calculate page distribution percentages
                const totalPageCount = stats.pageCount.mainpage + stats.pageCount.robots;
                const pageDistribution = {
                    mainpage: totalPageCount > 0 ? stats.pageCount.mainpage / totalPageCount : 0,
                    robots: totalPageCount > 0 ? stats.pageCount.robots / totalPageCount : 0,
                };

                headerPatterns.push({
                    pattern: `${headerName}:${headerValue}`,
                    frequency,
                    confidence,
                    examples: stats.examples,
                    cmsCorrelation,
                    pageDistribution,
                });
            }
        }

        // Sort by frequency (most common first)
        headerPatterns.sort((a, b) => b.frequency - a.frequency);

        if (headerPatterns.length > 0) {
            patterns.set(headerName, headerPatterns);
        }
    }

    logger.info('Header analysis complete', {
        headersAnalyzed: patterns.size,
        totalPatterns: Array.from(patterns.values()).reduce(
            (sum, patterns) => sum + patterns.length,
            0
        ),
    });

    return patterns;
}

/**
 * Normalize header names (lowercase, trim)
 */
function normalizeHeaderName(headerName: string): string {
    return headerName.toLowerCase().trim();
}

/**
 * Normalize header values (trim, handle encoding)
 */
function normalizeHeaderValue(headerValue: string | string[]): string {
    if (!headerValue) return '';

    // Handle array values (like set-cookie)
    if (Array.isArray(headerValue)) {
        return headerValue.join('; ');
    }

    let normalized = headerValue.trim();

    // Handle quoted values
    if (normalized.startsWith('"') && normalized.endsWith('"')) {
        normalized = normalized.slice(1, -1);
    }

    // Limit length for analysis
    if (normalized.length > 200) {
        normalized = normalized.substring(0, 200) + '...';
    }

    return normalized;
}

/**
 * Process headers from a specific page type (mainpage or robots.txt)
 */
function processHeaders(
    headers: Record<string, string>,
    pageType: 'mainpage' | 'robots',
    detectedCms: string,
    url: string,
    headerStats: Map<
        string,
        Map<
            string,
            {
                count: number;
                examples: string[];
                cmsSources: Set<string>;
                pageCount: {
                    mainpage: number;
                    robots: number;
                };
            }
        >
    >
): void {
    for (const [headerName, headerValue] of Object.entries(headers)) {
        const normalizedHeaderName = normalizeHeaderName(headerName);
        const normalizedHeaderValue = normalizeHeaderValue(headerValue);

        // Handle empty values by marking them as <empty>
        const finalHeaderValue = normalizedHeaderValue || '<empty>';

        // Initialize header tracking
        if (!headerStats.has(normalizedHeaderName)) {
            headerStats.set(normalizedHeaderName, new Map());
        }

        const headerMap = headerStats.get(normalizedHeaderName)!;

        // Initialize value tracking
        if (!headerMap.has(finalHeaderValue)) {
            headerMap.set(finalHeaderValue, {
                count: 0,
                examples: [],
                cmsSources: new Set(),
                pageCount: {
                    mainpage: 0,
                    robots: 0,
                },
            });
        }

        const valueStats = headerMap.get(finalHeaderValue)!;
        valueStats.count++;
        valueStats.cmsSources.add(detectedCms);
        valueStats.pageCount[pageType]++;

        // Add example URL (limit to 5)
        if (valueStats.examples.length < 5) {
            const pageLabel = pageType === 'robots' ? 'robots.txt' : pageType;
            valueStats.examples.push(`${url} (${pageLabel})`);
        }
    }
}

/**
 * Calculate confidence score for header patterns
 * Higher confidence for less universal patterns
 */
function calculateHeaderConfidence(frequency: number, cmsVariety: number): number {
    // Base confidence inversely related to frequency
    let confidence = 1.0 - frequency;

    // Adjust for CMS variety (more variety = less discriminative)
    if (cmsVariety > 3) {
        confidence *= 0.5; // Generic across many CMS types
    } else if (cmsVariety === 1) {
        confidence *= 1.2; // Specific to one CMS type
    }

    // Ensure confidence stays within bounds
    return Math.max(0.1, Math.min(1.0, confidence));
}
