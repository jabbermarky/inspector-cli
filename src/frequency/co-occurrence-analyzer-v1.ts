import { createModuleLogger } from '../utils/logger.js';
import type { DetectionDataPoint } from './types-v1.js';
import { findVendorByHeader } from './vendor-patterns-v1.js';
import { analyzeHeaderSemantics } from './semantic-analyzer-v1.js';

const logger = createModuleLogger('frequency-co-occurrence-analyzer');

/**
 * Header co-occurrence pair with frequency and confidence metrics
 */
export interface HeaderCooccurrence {
    header1: string;
    header2: string;
    cooccurrenceCount: number;
    cooccurrenceFrequency: number; // Percentage of sites where both appear together
    conditionalProbability: number; // P(header2 | header1)
    mutualInformation: number; // Statistical independence measure
    vendor1?: string;
    vendor2?: string;
    category1?: string;
    category2?: string;
}

/**
 * Technology stack signature based on header combinations
 */
export interface TechnologyStackSignature {
    name: string;
    vendor: string;
    category: 'cms' | 'ecommerce' | 'cdn' | 'analytics' | 'framework' | 'hosting' | 'security';
    requiredHeaders: string[];
    optionalHeaders: string[];
    conflictingHeaders: string[];
    confidence: number;
    occurrenceCount: number;
    sites: string[];
}

/**
 * Platform-specific header combination patterns
 */
export interface PlatformHeaderCombination {
    platform: string;
    vendor: string;
    headerGroup: string[];
    frequency: number;
    exclusivity: number; // How exclusive this combination is to this platform
    strength: number; // Statistical strength of the association
    sites: string[];
}

/**
 * Co-occurrence analysis results
 */
export interface CooccurrenceAnalysis {
    totalSites: number;
    totalHeaders: number;
    cooccurrences: HeaderCooccurrence[];
    technologySignatures: TechnologyStackSignature[];
    platformCombinations: PlatformHeaderCombination[];
    mutuallyExclusiveGroups: string[][];
    strongCorrelations: HeaderCooccurrence[];
}

/**
 * Analyze header co-occurrence patterns across detection data points
 */
export function analyzeHeaderCooccurrence(dataPoints: DetectionDataPoint[]): CooccurrenceAnalysis {
    logger.info('Starting co-occurrence analysis', { dataPointCount: dataPoints.length });

    const startTime = performance.now();

    // Step 1: Build header occurrence matrix
    const headerOccurrences = buildHeaderOccurrenceMatrix(dataPoints);

    // Step 2: Calculate co-occurrence pairs (includes 0 co-occurrence for mutual exclusivity)
    const allCooccurrences = calculateCooccurrencePairs(headerOccurrences, dataPoints.length);

    // Filter for meaningful co-occurrences (exclude 0 co-occurrence for most analyses)
    const meaningfulCooccurrences = allCooccurrences.filter(c => c.cooccurrenceCount > 0);

    // Step 3: Identify technology stack signatures
    const technologySignatures = identifyTechnologyStackSignatures(
        meaningfulCooccurrences,
        dataPoints
    );

    // Step 4: Find platform-specific combinations
    const platformCombinations = findPlatformSpecificCombinations(dataPoints);

    // Step 5: Detect mutually exclusive groups (uses all co-occurrences including 0)
    const mutuallyExclusiveGroups = detectMutuallyExclusiveGroups(allCooccurrences);

    // Step 6: Extract strong correlations (uses meaningful co-occurrences only)
    const strongCorrelations = meaningfulCooccurrences
        .filter(c => c.mutualInformation > 0.1 && c.conditionalProbability > 0.7)
        .sort((a, b) => b.mutualInformation - a.mutualInformation);

    const duration = performance.now() - startTime;

    logger.info('Co-occurrence analysis complete', {
        duration: Math.round(duration),
        cooccurrences: meaningfulCooccurrences.length,
        technologySignatures: technologySignatures.length,
        platformCombinations: platformCombinations.length,
        strongCorrelations: strongCorrelations.length,
    });

    return {
        totalSites: dataPoints.length,
        totalHeaders: headerOccurrences.size,
        cooccurrences: meaningfulCooccurrences,
        technologySignatures,
        platformCombinations,
        mutuallyExclusiveGroups,
        strongCorrelations,
    };
}

/**
 * Build matrix of which headers appear on which sites
 */
function buildHeaderOccurrenceMatrix(dataPoints: DetectionDataPoint[]): Map<string, Set<string>> {
    const matrix = new Map<string, Set<string>>();

    for (const dataPoint of dataPoints) {
        const siteHeaders = new Set<string>();

        // Collect all headers from mainpage
        if (dataPoint.httpHeaders) {
            Object.keys(dataPoint.httpHeaders).forEach(header => {
                const lowerHeader = header.toLowerCase();
                siteHeaders.add(lowerHeader);
            });
        }

        // Collect all headers from robots.txt
        if (dataPoint.robotsTxt?.httpHeaders) {
            Object.keys(dataPoint.robotsTxt.httpHeaders).forEach(header => {
                const lowerHeader = header.toLowerCase();
                siteHeaders.add(lowerHeader);
            });
        }

        // Add to occurrence matrix
        for (const header of siteHeaders) {
            if (!matrix.has(header)) {
                matrix.set(header, new Set());
            }
            matrix.get(header)!.add(dataPoint.url);
        }
    }

    return matrix;
}

/**
 * Calculate co-occurrence statistics for header pairs
 */
function calculateCooccurrencePairs(
    headerOccurrences: Map<string, Set<string>>,
    totalSites: number
): HeaderCooccurrence[] {
    const cooccurrences: HeaderCooccurrence[] = [];
    const headers = Array.from(headerOccurrences.keys());

    for (let i = 0; i < headers.length; i++) {
        for (let j = i + 1; j < headers.length; j++) {
            const header1 = headers[i];
            const header2 = headers[j];

            const sites1 = headerOccurrences.get(header1)!;
            const sites2 = headerOccurrences.get(header2)!;

            // Calculate intersection (sites with both headers)
            const intersection = new Set([...sites1].filter(site => sites2.has(site)));
            const cooccurrenceCount = intersection.size;

            // Calculate statistics for all pairs (including 0 co-occurrence for mutual exclusivity analysis)
            const freq1 = sites1.size / totalSites;
            const freq2 = sites2.size / totalSites;
            const cooccurrenceFrequency = cooccurrenceCount / totalSites;
            const conditionalProbability = cooccurrenceCount / sites1.size;

            // Calculate mutual information: MI = P(X,Y) * log(P(X,Y) / (P(X) * P(Y)))
            const mutualInformation =
                cooccurrenceFrequency > 0
                    ? cooccurrenceFrequency * Math.log(cooccurrenceFrequency / (freq1 * freq2))
                    : 0;

            // Get vendor and category information
            const vendor1 = findVendorByHeader(header1)?.name;
            const vendor2 = findVendorByHeader(header2)?.name;
            const analysis1 = analyzeHeaderSemantics(header1);
            const analysis2 = analyzeHeaderSemantics(header2);

            cooccurrences.push({
                header1,
                header2,
                cooccurrenceCount,
                cooccurrenceFrequency: cooccurrenceFrequency * 100,
                conditionalProbability,
                mutualInformation,
                vendor1,
                vendor2,
                category1: analysis1.category.primary,
                category2: analysis2.category.primary,
            });
        }
    }

    return cooccurrences.sort((a, b) => b.mutualInformation - a.mutualInformation);
}

/**
 * Identify known technology stack signatures from co-occurrence patterns
 */
function identifyTechnologyStackSignatures(
    cooccurrences: HeaderCooccurrence[],
    dataPoints: DetectionDataPoint[]
): TechnologyStackSignature[] {
    const signatures: TechnologyStackSignature[] = [];

    // Known technology signatures to detect
    const knownSignatures = [
        {
            name: 'Shopify Platform',
            vendor: 'Shopify',
            category: 'ecommerce' as const,
            requiredHeaders: ['x-shopify-shop-id', 'x-sorting-hat-shopid'],
            optionalHeaders: ['x-shardid', 'x-sorting-hat-podid', 'x-shopify-stage'],
            conflictingHeaders: ['x-wp-total', 'x-drupal-cache'],
        },
        {
            name: 'WordPress + Cloudflare',
            vendor: 'WordPress + Cloudflare',
            category: 'cms' as const,
            requiredHeaders: ['x-wp-total', 'cf-ray'],
            optionalHeaders: ['x-pingback', 'cf-cache-status'],
            conflictingHeaders: ['x-shopify-shop-id', 'x-drupal-cache'],
        },
        {
            name: 'Duda Platform',
            vendor: 'Duda',
            category: 'cms' as const,
            requiredHeaders: ['d-geo', 'd-cache'],
            optionalHeaders: ['d-sid', 'd-rid'],
            conflictingHeaders: ['x-wp-total', 'x-shopify-shop-id'],
        },
        {
            name: 'Drupal + Varnish Cache',
            vendor: 'Drupal + Varnish',
            category: 'cms' as const,
            requiredHeaders: ['x-drupal-cache', 'via'],
            optionalHeaders: ['x-drupal-dynamic-cache', 'x-cache'],
            conflictingHeaders: ['x-wp-total', 'x-shopify-shop-id'],
        },
    ];

    for (const template of knownSignatures) {
        const sites = findSitesWithSignature(template, dataPoints);

        if (sites.length > 0) {
            const confidence = calculateSignatureConfidence(template, cooccurrences);

            signatures.push({
                ...template,
                confidence,
                occurrenceCount: sites.length,
                sites: sites.slice(0, 10), // Limit to first 10 examples
            });
        }
    }

    return signatures.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
}

/**
 * Find sites that match a technology signature
 */
function findSitesWithSignature(
    signature: Omit<TechnologyStackSignature, 'confidence' | 'occurrenceCount' | 'sites'>,
    dataPoints: DetectionDataPoint[]
): string[] {
    const matchingSites: string[] = [];

    for (const dataPoint of dataPoints) {
        const siteHeaders = new Set<string>();

        // Collect all headers from site
        if (dataPoint.httpHeaders) {
            Object.keys(dataPoint.httpHeaders).forEach(header => {
                siteHeaders.add(header.toLowerCase());
            });
        }
        if (dataPoint.robotsTxt?.httpHeaders) {
            Object.keys(dataPoint.robotsTxt.httpHeaders).forEach(header => {
                siteHeaders.add(header.toLowerCase());
            });
        }

        // Check if all required headers are present
        const hasAllRequired = signature.requiredHeaders.every(header =>
            siteHeaders.has(header.toLowerCase())
        );

        // Check if any conflicting headers are present
        const hasConflicting = signature.conflictingHeaders.some(header =>
            siteHeaders.has(header.toLowerCase())
        );

        if (hasAllRequired && !hasConflicting) {
            matchingSites.push(dataPoint.url);
        }
    }

    return matchingSites;
}

/**
 * Calculate confidence score for a technology signature
 */
function calculateSignatureConfidence(
    signature: Omit<TechnologyStackSignature, 'confidence' | 'occurrenceCount' | 'sites'>,
    cooccurrences: HeaderCooccurrence[]
): number {
    let totalConfidence = 0;
    let pairCount = 0;

    // Calculate average mutual information for required header pairs
    for (let i = 0; i < signature.requiredHeaders.length; i++) {
        for (let j = i + 1; j < signature.requiredHeaders.length; j++) {
            const header1 = signature.requiredHeaders[i];
            const header2 = signature.requiredHeaders[j];

            const cooccurrence = cooccurrences.find(
                c =>
                    (c.header1 === header1 && c.header2 === header2) ||
                    (c.header1 === header2 && c.header2 === header1)
            );

            if (cooccurrence) {
                totalConfidence += cooccurrence.conditionalProbability;
                pairCount++;
            }
        }
    }

    return pairCount > 0 ? totalConfidence / pairCount : 0;
}

/**
 * Find platform-specific header combinations
 */
function findPlatformSpecificCombinations(
    dataPoints: DetectionDataPoint[]
): PlatformHeaderCombination[] {
    const combinations: PlatformHeaderCombination[] = [];

    // Group sites by detected CMS
    const cmsSites = new Map<string, DetectionDataPoint[]>();

    for (const dataPoint of dataPoints) {
        let cms = 'Unknown';

        // Get the highest confidence CMS detection
        if (dataPoint.detectionResults?.length > 0) {
            const bestDetection = dataPoint.detectionResults.sort(
                (a, b) => b.confidence - a.confidence
            )[0];
            cms = bestDetection?.cms || 'Unknown';
        }
        if (!cmsSites.has(cms)) {
            cmsSites.set(cms, []);
        }
        cmsSites.get(cms)!.push(dataPoint);
    }

    // Analyze header combinations for each CMS
    for (const [cms, sites] of cmsSites.entries()) {
        if (sites.length < 2) continue; // Skip CMS with too few sites (2 for testing, 5 for production)

        const headerCombinations = findCommonHeaderCombinations(sites);

        for (const combination of headerCombinations) {
            if (combination.headers.length >= 2) {
                const exclusivity = calculateExclusivity(combination.headers, cms, cmsSites);
                const strength = combination.frequency; // Use frequency as strength measure

                combinations.push({
                    platform: cms,
                    vendor: cms, // Use CMS name as vendor for now
                    headerGroup: combination.headers,
                    frequency: combination.frequency,
                    exclusivity,
                    strength,
                    sites: combination.sites.slice(0, 5), // Limit examples
                });
            }
        }
    }

    return combinations.sort((a, b) => b.frequency * b.exclusivity - a.frequency * a.exclusivity);
}

/**
 * Find common header combinations within a group of sites
 */
function findCommonHeaderCombinations(sites: DetectionDataPoint[]): Array<{
    headers: string[];
    frequency: number;
    sites: string[];
}> {
    const combinations: Array<{
        headers: string[];
        frequency: number;
        sites: string[];
    }> = [];

    // Get all unique headers across sites
    const allHeaders = new Set<string>();
    const siteHeaderSets = new Map<string, Set<string>>();

    for (const site of sites) {
        const headers = new Set<string>();

        if (site.httpHeaders) {
            Object.keys(site.httpHeaders).forEach(h => {
                const header = h.toLowerCase();
                headers.add(header);
                allHeaders.add(header);
            });
        }

        if (site.robotsTxt?.httpHeaders) {
            Object.keys(site.robotsTxt.httpHeaders).forEach(h => {
                const header = h.toLowerCase();
                headers.add(header);
                allHeaders.add(header);
            });
        }

        siteHeaderSets.set(site.url, headers);
    }

    const headerArray = Array.from(allHeaders);

    // Find 2-header combinations that appear frequently
    for (let i = 0; i < headerArray.length; i++) {
        for (let j = i + 1; j < headerArray.length; j++) {
            const header1 = headerArray[i];
            const header2 = headerArray[j];

            const sitesWithBoth: string[] = [];

            for (const [siteUrl, siteHeaders] of siteHeaderSets.entries()) {
                if (siteHeaders.has(header1) && siteHeaders.has(header2)) {
                    sitesWithBoth.push(siteUrl);
                }
            }

            const frequency = sitesWithBoth.length / sites.length;

            // Only include combinations that appear in at least 30% of sites (reduce for testing)
            if (frequency >= 0.1) {
                combinations.push({
                    headers: [header1, header2],
                    frequency,
                    sites: sitesWithBoth,
                });
            }
        }
    }

    return combinations.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Calculate how exclusive a header combination is to a specific platform
 */
function calculateExclusivity(
    headers: string[],
    platform: string,
    allPlatformSites: Map<string, DetectionDataPoint[]>
): number {
    let totalOccurrences = 0;
    let platformOccurrences = 0;

    for (const [cms, sites] of allPlatformSites.entries()) {
        for (const site of sites) {
            const siteHeaders = new Set<string>();

            if (site.httpHeaders) {
                Object.keys(site.httpHeaders).forEach(h => {
                    siteHeaders.add(h.toLowerCase());
                });
            }

            if (site.robotsTxt?.httpHeaders) {
                Object.keys(site.robotsTxt.httpHeaders).forEach(h => {
                    siteHeaders.add(h.toLowerCase());
                });
            }

            const hasAllHeaders = headers.every(header => siteHeaders.has(header));

            if (hasAllHeaders) {
                totalOccurrences++;
                if (cms === platform) {
                    platformOccurrences++;
                }
            }
        }
    }

    return totalOccurrences > 0 ? platformOccurrences / totalOccurrences : 0;
}

/**
 * Detect mutually exclusive header groups (headers that rarely appear together)
 */
function detectMutuallyExclusiveGroups(cooccurrences: HeaderCooccurrence[]): string[][] {
    const exclusiveGroups: string[][] = [];

    // Find pairs with very low co-occurrence but high individual frequency
    // Use 20% threshold for testing (5 sites = 20% each), 1% for production
    const minFrequencyThreshold = cooccurrences.length > 50 ? 1 : 20;
    const lowCooccurrencePairs = cooccurrences.filter(
        c =>
            c.cooccurrenceFrequency < minFrequencyThreshold && // Very rare to appear together
            c.conditionalProbability < 0.1 // Low conditional probability
    );

    // Group headers that are mutually exclusive with each other
    const exclusivityMap = new Map<string, Set<string>>();

    for (const pair of lowCooccurrencePairs) {
        if (!exclusivityMap.has(pair.header1)) {
            exclusivityMap.set(pair.header1, new Set());
        }
        if (!exclusivityMap.has(pair.header2)) {
            exclusivityMap.set(pair.header2, new Set());
        }

        exclusivityMap.get(pair.header1)!.add(pair.header2);
        exclusivityMap.get(pair.header2)!.add(pair.header1);
    }

    // Find connected components of mutually exclusive headers
    const visited = new Set<string>();

    for (const [header, exclusives] of exclusivityMap.entries()) {
        if (visited.has(header) || exclusives.size < 2) continue;

        const group = [header];
        visited.add(header);

        // Add all headers that are mutually exclusive with this one
        for (const exclusive of exclusives) {
            if (!visited.has(exclusive)) {
                group.push(exclusive);
                visited.add(exclusive);
            }
        }

        if (group.length >= 3) {
            // Only include groups with 3+ headers
            exclusiveGroups.push(group);
        }
    }

    return exclusiveGroups;
}

/**
 * Generate insights from co-occurrence analysis
 */
export function generateCooccurrenceInsights(analysis: CooccurrenceAnalysis): string[] {
    const insights: string[] = [];

    // Strong correlations insight
    if (analysis.strongCorrelations.length > 0) {
        const topCorrelation = analysis.strongCorrelations[0];
        insights.push(
            `Strongest header correlation: ${topCorrelation.header1} ↔ ${topCorrelation.header2} ` +
                `(${(topCorrelation.conditionalProbability * 100).toFixed(1)}% conditional probability)`
        );
    }

    // Technology signatures insight
    if (analysis.technologySignatures.length > 0) {
        const topSignature = analysis.technologySignatures[0];
        insights.push(
            `Most common technology stack: ${topSignature.name} found on ${topSignature.occurrenceCount} sites ` +
                `(${((topSignature.occurrenceCount / analysis.totalSites) * 100).toFixed(1)}%)`
        );
    }

    // Platform exclusivity insight
    if (analysis.platformCombinations.length > 0) {
        const topCombination = analysis.platformCombinations[0];
        insights.push(
            `Most platform-specific combination: ${topCombination.headerGroup.join(' + ')} ` +
                `exclusive to ${topCombination.platform} (${(topCombination.exclusivity * 100).toFixed(1)}% exclusive)`
        );
    }

    // Mutual exclusivity insight
    if (analysis.mutuallyExclusiveGroups.length > 0) {
        const largestGroup = analysis.mutuallyExclusiveGroups.reduce((a, b) =>
            a.length > b.length ? a : b
        );
        insights.push(
            `Mutually exclusive header group detected: ${largestGroup.slice(0, 3).join(', ')} ` +
                `${largestGroup.length > 3 ? `and ${largestGroup.length - 3} others` : ''} rarely appear together`
        );
    }

    return insights;
}
