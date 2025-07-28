/**
 * Legacy Adapter - Converts V2 results to legacy FrequencyResult format
 * Maintains backward compatibility with existing CLI and reporter
 */

import { createModuleLogger } from '../utils/logger.js';
import { RecommendationsCoordinator } from './analyzers/recommendations-coordinator.js';
import { mapOfSetsToRecord, mapOfSetsToMetaTags } from './utils/map-converter.js';
import { DataPreprocessor } from './data-preprocessor-v2.js';
import type { FrequencyOptions, FrequencyResult } from './types/frequency-types-v2.js';
import type { DetectionDataPoint } from '../utils/cms/analysis/types.js';

const logger = createModuleLogger('legacy-adapter');

/**
 * Convert new aggregated results to legacy FrequencyResult format
 * This maintains backward compatibility with existing CLI and reporter
 */
export async function convertV2ToV1Format(
    aggregatedResults: any,
    options: FrequencyOptions,
    biasAnalysisParam?: any,
    dataPoints: DetectionDataPoint[] = []
): Promise<FrequencyResult> {
    // Convert header patterns to legacy format
    const headerPatterns: any = {};
    for (const [name, pattern] of aggregatedResults.headers.patterns) {
        // Use new value frequency data from analyzer metadata
        const valueFrequencies = pattern.metadata?.valueFrequencies;
        let valuesArray: any[] = [];

        if (valueFrequencies && valueFrequencies.size > 0) {
            // Convert Map<string, number> to array format
            const valueEntries = Array.from(valueFrequencies as Map<string, number>);
            const allValues = valueEntries
                .map(([value, siteCount]) => ({
                    value,
                    frequency: siteCount / aggregatedResults.headers.totalSites, // Accurate frequency
                    occurrences: siteCount, // In V2, this is site count
                    examples: [`${name}: ${value}`], // Create example in expected format
                }))
                .sort((a, b) => b.occurrences - a.occurrences);

            // Keep only top 5 for display, but remember total count
            valuesArray = allValues.slice(0, 5);
            // Store total unique value count for reporter
            (valuesArray as any).totalUniqueValues = valueFrequencies.size;
        }

        // If no value data available, fall back to examples parsing
        if (valuesArray.length === 0) {
            const headerValues = new Map<string, { count: number; examples: string[] }>();

            for (const example of pattern.examples || []) {
                // Examples are in format "headerName: value"
                const colonIndex = example.indexOf(': ');
                if (colonIndex !== -1) {
                    const headerValue = example.substring(colonIndex + 2);
                    const existing = headerValues.get(headerValue);
                    if (existing) {
                        existing.count++;
                        if (existing.examples.length < 3) {
                            existing.examples.push(example);
                        }
                    } else {
                        headerValues.set(headerValue, { count: 1, examples: [example] });
                    }
                }
            }

            const allValuesFromExamples = Array.from(headerValues.entries())
                .map(([value, data]) => ({
                    value,
                    frequency: data.count / (pattern.examples?.size || 1), // Approximate from examples
                    occurrences: data.count,
                    examples: data.examples,
                }))
                .sort((a, b) => b.occurrences - a.occurrences);

            valuesArray = allValuesFromExamples.slice(0, 5);
            (valuesArray as any).totalUniqueValues = headerValues.size;
        }

        // If still no values, create a default entry
        if (valuesArray.length === 0) {
            valuesArray.push({
                value: '<no-value>',
                frequency: pattern.frequency,
                occurrences: pattern.siteCount,
                examples: Array.from(pattern.examples || []).slice(0, 3) as string[],
            });
            (valuesArray as any).totalUniqueValues = 1; // Only one "no-value" entry
        }

        headerPatterns[name] = {
            frequency: pattern.frequency,
            occurrences: pattern.siteCount, // In V2, occurrences == siteCount
            totalSites: aggregatedResults.headers.totalSites,
            values: valuesArray,
            pageDistribution: pattern.metadata?.pageDistribution || {
                mainpage: 1.0,
                robots: 0.0,
            },
        };
    }

    // Convert meta tag patterns to legacy format
    const metaPatterns: any = {};
    for (const [name, pattern] of aggregatedResults.metaTags.patterns) {
        // Use new value frequency data from analyzer metadata
        const valueFrequencies = pattern.metadata?.valueFrequencies;
        let valuesArray: any[] = [];

        if (valueFrequencies && valueFrequencies.size > 0) {
            // Convert Map<string, number> to array format
            const valueEntries = Array.from(valueFrequencies as Map<string, number>);
            const allValues = valueEntries
                .map(([value, siteCount]) => ({
                    value,
                    frequency: siteCount / aggregatedResults.metaTags.totalSites, // Accurate frequency
                    occurrences: siteCount, // In V2, this is site count
                    examples: [`${name}="${value}"`], // Create example in expected format
                }))
                .sort((a, b) => b.occurrences - a.occurrences);

            // Keep only top 5 for display, but remember total count
            valuesArray = allValues.slice(0, 5);
            // Store total unique value count for reporter
            (valuesArray as any).totalUniqueValues = valueFrequencies.size;
        }

        // If no value data available, fall back to examples parsing
        if (valuesArray.length === 0) {
            const metaValues = new Map<string, { count: number; examples: string[] }>();

            for (const example of pattern.examples || []) {
                // For meta tags, examples are in format 'name="value"'
                const equalsIndex = example.indexOf('="');
                if (equalsIndex !== -1) {
                    const endQuoteIndex = example.lastIndexOf('"');
                    if (endQuoteIndex > equalsIndex + 2) {
                        const metaValue = example.substring(equalsIndex + 2, endQuoteIndex);
                        const existing = metaValues.get(metaValue);
                        if (existing) {
                            existing.count++;
                            if (existing.examples.length < 3) {
                                existing.examples.push(example);
                            }
                        } else {
                            metaValues.set(metaValue, { count: 1, examples: [example] });
                        }
                    }
                }
            }

            const allValuesFromExamples = Array.from(metaValues.entries())
                .map(([value, data]) => ({
                    value,
                    frequency: data.count / (pattern.examples?.size || 1), // Approximate from examples
                    occurrences: data.count,
                    examples: data.examples,
                }))
                .sort((a, b) => b.occurrences - a.occurrences);

            valuesArray = allValuesFromExamples.slice(0, 5);
            (valuesArray as any).totalUniqueValues = metaValues.size;
        }

        // If still no values, create a default entry
        if (valuesArray.length === 0) {
            valuesArray.push({
                value: '<no-value>',
                frequency: pattern.frequency,
                occurrences: pattern.siteCount,
                examples: Array.from(pattern.examples || []).slice(0, 3) as string[],
            });
            (valuesArray as any).totalUniqueValues = 1; // Only one "no-value" entry
        }

        metaPatterns[name] = {
            frequency: pattern.frequency,
            occurrences: pattern.siteCount,
            totalSites: aggregatedResults.metaTags.totalSites,
            values: valuesArray,
        };
    }

    // Convert script patterns to legacy format
    const scriptPatterns: any = {};
    if (aggregatedResults.scripts?.patterns) {
        for (const [name, pattern] of aggregatedResults.scripts.patterns) {
            // Extract actual script values from examples
            const scriptValues = new Map<string, { count: number; examples: string[] }>();

            for (const example of pattern.examples || []) {
                // For scripts, use the example as-is since it's already the script URL/path
                const scriptValue = example;

                const existing = scriptValues.get(scriptValue);
                if (existing) {
                    existing.count++;
                    if (existing.examples.length < 3) {
                        existing.examples.push(example);
                    }
                } else {
                    scriptValues.set(scriptValue, { count: 1, examples: [example] });
                }
            }

            // Convert to values array, sorted by frequency
            const valuesArray = Array.from(scriptValues.entries())
                .map(([value, data]) => ({
                    value,
                    frequency: data.count / pattern.siteCount, // Approximate frequency
                    occurrences: data.count,
                    examples: data.examples,
                }))
                .sort((a, b) => b.occurrences - a.occurrences);

            // If no values parsed, create a default entry
            if (valuesArray.length === 0) {
                valuesArray.push({
                    value: name, // For scripts, use the pattern name as value
                    frequency: pattern.frequency,
                    occurrences: pattern.siteCount,
                    examples: Array.from(pattern.examples || []).slice(0, 3) as string[],
                });
            }

            scriptPatterns[name] = {
                frequency: pattern.frequency,
                occurrences: pattern.siteCount,
                totalSites: aggregatedResults.scripts.totalSites,
                examples: Array.from(pattern.examples || []).slice(0, 5) as string[],
            };
        }
    }

    // Generate recommendations if requested (use biasAnalysisParam if available)
    let recommendations = {
        learn: {
            currentlyFiltered: [],
            recommendToFilter: [],
            recommendToKeep: [],
        },
        detectCms: {
            newPatternOpportunities: [],
            patternsToRefine: [],
        },
        groundTruth: {
            currentlyUsedPatterns: [],
            potentialNewRules: [],
        },
    };

    if (options.includeRecommendations !== false) {
        try {
            const coordinator = new RecommendationsCoordinator();

            // Reuse the same data points from the bias analysis call
            const result = await coordinator.generateRecommendations(
                aggregatedResults,
                dataPoints,
                options
            );
            recommendations = {
                learn: result.learn,
                detectCms: result.detectCms,
                groundTruth: result.groundTruth,
            };
        } catch (error) {
            logger.warn('Failed to generate recommendations', { error: (error as Error).message });
        }
    }

    // Create legacy result structure
    return {
        summary: {
            totalSitesAnalyzed: aggregatedResults.summary.totalSitesAnalyzed,
            totalPatternsFound: aggregatedResults.summary.totalPatternsFound,
            analysisDate: new Date().toISOString(),
            filteringStats: aggregatedResults.summary.filteringStats,
        },
        headers: headerPatterns,
        metaTags: metaPatterns,
        scripts: scriptPatterns,
        recommendations,
        filteringReport: {
            sitesFilteredOut: aggregatedResults.summary.filteringStats?.sitesFilteredOut || 0,
            filterReasons: aggregatedResults.summary.filteringStats?.filterReasons || {},
        },
        metadata: {
            totalSites: aggregatedResults.summary.totalSitesAnalyzed,
            validSites: aggregatedResults.summary.totalSitesAnalyzed,
            filteredSites: 0, // TODO: Track filtered sites
            analysisDate: new Date().toISOString(),
            options: {
                ...options,
                // Ensure defaults are applied
                minOccurrences: options.minOccurrences || 10,
                output: options.output || 'human',
                includeRecommendations: options.includeRecommendations ?? true,
            },
            temporalRange: undefined, // TODO: Add temporal info from preprocessor
        },
    };
}

/**
 * Prepare shared data points for recommendations coordinator
 * Converts preprocessed site data to DetectionDataPoint format
 */
export async function prepareSharedDataPoints(
    options: FrequencyOptions
): Promise<DetectionDataPoint[]> {
    const preprocessor = new DataPreprocessor(options.dataDir);
    const preprocessedData = await preprocessor.load({});

    return Array.from(preprocessedData.sites.values()).map((site: any) => ({
        url: site.url,
        timestamp: new Date(site.capturedAt),
        userAgent: '',
        captureVersion: 'v2' as any,
        originalUrl: site.url,
        finalUrl: site.url,
        redirectChain: [],
        totalRedirects: 0,
        protocolUpgraded: false,
        navigationTime: 0,
        httpHeaders: mapOfSetsToRecord(site.headers),
        statusCode: 200,
        contentType: 'text/html',
        metaTags: mapOfSetsToMetaTags(site.metaTags),
        htmlContent: '',
        htmlSize: 0,
        domElements: [],
        links: [],
        scripts: [],
        stylesheets: [],
        forms: [],
        technologies: [],
        loadTime: 0,
        resourceCount: 0,
        detectionResults: site.cms
            ? [
                  {
                      detector: 'cms-detection',
                      strategy: 'auto',
                      cms: site.cms,
                      confidence: site.confidence || 1.0,
                      executionTime: 0,
                  },
              ]
            : [],
        errors: [],
    }));
}
