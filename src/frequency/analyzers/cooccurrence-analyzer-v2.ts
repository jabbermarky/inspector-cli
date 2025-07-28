/**
 * CooccurrenceAnalyzerV2 - Native V2 Implementation
 *
 * Analyzes header co-occurrence patterns, technology stack signatures,
 * platform-specific combinations, and mutual exclusivity relationships.
 *
 * Architecture: Uses validated headers from ValidationPipelineV2 when available,
 * follows V2 FrequencyAnalyzer interface patterns.
 */

import type {
    FrequencyAnalyzer,
    PreprocessedData,
    AnalysisOptions,
    AnalysisResult,
    PatternData,
} from '../types/analyzer-interface.js';
import type { HeaderPrimaryCategory } from '../types/frequency-types-v2.js';
import type { VendorSpecificData } from './vendor-analyzer-v2.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('cooccurrence-analyzer-v2');

/**
 * Header co-occurrence pair with statistical metrics
 */
export interface HeaderCooccurrence {
    header1: string;
    header2: string;
    cooccurrenceCount: number; // Sites with both headers
    cooccurrenceFrequency: number; // Percentage (0-100)
    conditionalProbability: number; // P(header2 | header1)
    mutualInformation: number; // Statistical independence measure
    vendor1?: string;
    vendor2?: string;
    category1?: HeaderPrimaryCategory;
    category2?: HeaderPrimaryCategory;
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
    exclusivity: number; // How exclusive to this platform (0-1)
    strength: number; // Statistical strength (0-1)
    sites: string[];
}

/**
 * Mutual exclusivity group
 */
export interface MutualExclusivityGroup {
    headers: string[];
    exclusivityScore: number;
    reasoning: string;
}

/**
 * Co-occurrence analyzer specific data
 */
export interface CooccurrenceSpecificData {
    cooccurrences: Map<string, HeaderCooccurrence>;
    technologySignatures: Map<string, TechnologyStackSignature>;
    platformCombinations: Map<string, PlatformHeaderCombination>;
    mutualExclusivityGroups: MutualExclusivityGroup[];
    strongCorrelations: HeaderCooccurrence[];
    insights: string[];
    statisticalSummary: {
        totalHeaderPairs: number;
        significantCooccurrences: number;
        averageMutualInformation: number;
        topConditionalProbability: number;
    };
}

export class CooccurrenceAnalyzerV2 implements FrequencyAnalyzer<CooccurrenceSpecificData> {
    private vendorData?: VendorSpecificData;

    getName(): string {
        return 'CooccurrenceAnalyzerV2';
    }

    /**
     * Inject vendor analysis results for dependency resolution
     */
    setVendorData(vendorData: VendorSpecificData): void {
        this.vendorData = vendorData;
    }

    async analyze(
        data: PreprocessedData,
        options: AnalysisOptions
    ): Promise<AnalysisResult<CooccurrenceSpecificData>> {
        logger.info('Starting co-occurrence analysis V2', {
            totalSites: data.totalSites,
            minOccurrences: options.minOccurrences,
            hasValidation: !!data.metadata.validation,
        });

        const startTime = Date.now();

        // Step 1: Build header occurrence matrix (using validated headers when available)
        const headerMatrix = this.buildHeaderOccurrenceMatrix(data);
        logger.info('Built header occurrence matrix', { uniqueHeaders: headerMatrix.size });

        // Step 2: Calculate co-occurrence statistics
        const cooccurrences = this.calculateCooccurrenceStatistics(
            headerMatrix,
            data.totalSites,
            options
        );
        logger.info('Calculated co-occurrence statistics', { pairs: cooccurrences.size });

        // Step 3: Detect technology stack signatures
        const technologySignatures = this.detectTechnologySignatures(data, cooccurrences);
        logger.info('Detected technology signatures', { signatures: technologySignatures.size });

        // Step 4: Analyze platform-specific combinations
        const platformCombinations = this.analyzePlatformCombinations(data, options);
        logger.info('Analyzed platform combinations', { combinations: platformCombinations.size });

        // Step 5: Detect mutual exclusivity groups
        const mutualExclusivityGroups = this.detectMutualExclusivity(cooccurrences);
        logger.info('Detected mutual exclusivity groups', {
            groups: mutualExclusivityGroups.length,
        });

        // Step 6: Extract strong correlations
        const strongCorrelations = this.extractStrongCorrelations(cooccurrences);

        // Step 7: Generate insights
        const insights = this.generateInsights(
            cooccurrences,
            technologySignatures,
            platformCombinations,
            mutualExclusivityGroups
        );

        // Step 8: Create statistical summary
        const statisticalSummary = this.createStatisticalSummary(cooccurrences);

        // Step 9: Create V2 patterns for compatibility
        const patterns = this.createCooccurrencePatterns(cooccurrences, options);

        const analyzerSpecific: CooccurrenceSpecificData = {
            cooccurrences,
            technologySignatures,
            platformCombinations,
            mutualExclusivityGroups,
            strongCorrelations,
            insights,
            statisticalSummary,
        };

        const duration = Date.now() - startTime;
        logger.info('Co-occurrence analysis V2 completed', {
            duration,
            patterns: patterns.size,
            strongCorrelations: strongCorrelations.length,
        });

        return {
            patterns,
            totalSites: data.totalSites,
            metadata: {
                analyzer: 'CooccurrenceAnalyzerV2',
                analyzedAt: new Date().toISOString(),
                totalPatternsFound: patterns.size,
                totalPatternsAfterFiltering: patterns.size,
                options,
            },
            analyzerSpecific,
        };
    }

    /**
     * Build header occurrence matrix from preprocessed data
     * Prioritizes validated headers when available
     */
    private buildHeaderOccurrenceMatrix(data: PreprocessedData): Map<string, Set<string>> {
        const matrix = new Map<string, Set<string>>();

        // Use validated headers if available (architectural integration with ValidationPipelineV2)
        if (data.metadata.validation?.validatedHeaders) {
            logger.info('Using validated headers for co-occurrence analysis', {
                validatedCount: data.metadata.validation.validatedHeaders.size,
                qualityScore: data.metadata.validation.qualityScore,
            });

            // Build matrix from validated headers
            for (const [headerName, patternData] of data.metadata.validation.validatedHeaders) {
                matrix.set(headerName.toLowerCase(), new Set(patternData.sites));
            }
        } else {
            // Fallback to raw header extraction
            logger.warn('No validated headers available, using raw header extraction');

            for (const [siteUrl, siteData] of data.sites) {
                for (const [headerName, _] of siteData.headers) {
                    const lowerHeader = headerName.toLowerCase();
                    if (!matrix.has(lowerHeader)) {
                        matrix.set(lowerHeader, new Set());
                    }
                    matrix.get(lowerHeader)!.add(siteUrl);
                }
            }
        }

        return matrix;
    }

    /**
     * Calculate co-occurrence statistics for header pairs
     */
    private calculateCooccurrenceStatistics(
        headerMatrix: Map<string, Set<string>>,
        totalSites: number,
        options: AnalysisOptions
    ): Map<string, HeaderCooccurrence> {
        const cooccurrences = new Map<string, HeaderCooccurrence>();
        const headers = Array.from(headerMatrix.keys());

        for (let i = 0; i < headers.length; i++) {
            for (let j = i + 1; j < headers.length; j++) {
                const header1 = headers[i];
                const header2 = headers[j];

                const sites1 = headerMatrix.get(header1)!;
                const sites2 = headerMatrix.get(header2)!;

                // Calculate intersection (sites with both headers)
                const intersection = new Set([...sites1].filter(site => sites2.has(site)));
                const cooccurrenceCount = intersection.size;

                // Apply minOccurrences filtering
                if (cooccurrenceCount < options.minOccurrences) continue;

                // Calculate statistical metrics
                const freq1 = sites1.size / totalSites;
                const freq2 = sites2.size / totalSites;
                const cooccurrenceFrequency = (cooccurrenceCount / totalSites) * 100;
                const conditionalProbability = cooccurrenceCount / sites1.size;

                // Calculate mutual information: MI = P(X,Y) * log(P(X,Y) / (P(X) * P(Y)))
                // Handle edge case where headers are independent (MI can be negative for anti-correlation)
                const jointProbability = cooccurrenceCount / totalSites;
                const expectedJoint = freq1 * freq2;
                const mutualInformation =
                    jointProbability > 0 && expectedJoint > 0
                        ? jointProbability * Math.log(jointProbability / expectedJoint)
                        : 0;

                // Get vendor information from injected vendor data
                const vendor1 = this.vendorData?.vendorsByHeader.get(header1)?.vendor.name;
                const vendor2 = this.vendorData?.vendorsByHeader.get(header2)?.vendor.name;

                // Get semantic information (simplified categorization for now)
                const category1 = this.inferHeaderCategory(header1);
                const category2 = this.inferHeaderCategory(header2);

                const pairKey = `${header1}+${header2}`;
                cooccurrences.set(pairKey, {
                    header1,
                    header2,
                    cooccurrenceCount,
                    cooccurrenceFrequency,
                    conditionalProbability,
                    mutualInformation,
                    vendor1,
                    vendor2,
                    category1,
                    category2,
                });
            }
        }

        // Sort by mutual information (highest first)
        const sortedCooccurrences = new Map(
            [...cooccurrences.entries()].sort(
                ([, a], [, b]) => b.mutualInformation - a.mutualInformation
            )
        );

        return sortedCooccurrences;
    }

    /**
     * Detect known technology stack signatures
     */
    private detectTechnologySignatures(
        data: PreprocessedData,
        cooccurrences: Map<string, HeaderCooccurrence>
    ): Map<string, TechnologyStackSignature> {
        const signatures = new Map<string, TechnologyStackSignature>();

        // Known technology signatures (V2 native implementation)
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
                optionalHeaders: ['x-pingback', 'cf-cache-status', 'cf-request-id'],
                conflictingHeaders: ['x-shopify-shop-id', 'x-drupal-cache'],
            },
            {
                name: 'Duda Platform',
                vendor: 'Duda',
                category: 'cms' as const,
                requiredHeaders: ['d-geo', 'd-cache'],
                optionalHeaders: ['d-sid', 'd-rid', 'd-cache-status'],
                conflictingHeaders: ['x-wp-total', 'x-shopify-shop-id'],
            },
            {
                name: 'Drupal + Varnish Cache',
                vendor: 'Drupal + Varnish',
                category: 'cms' as const,
                requiredHeaders: ['x-drupal-cache', 'via'],
                optionalHeaders: ['x-drupal-dynamic-cache', 'x-cache', 'x-varnish'],
                conflictingHeaders: ['x-wp-total', 'x-shopify-shop-id'],
            },
            {
                name: 'Nginx + FastCGI',
                vendor: 'Nginx + FastCGI',
                category: 'hosting' as const,
                requiredHeaders: ['server', 'x-powered-by'],
                optionalHeaders: ['x-fastcgi-cache', 'x-cache-status'],
                conflictingHeaders: [],
            },
        ];

        for (const template of knownSignatures) {
            const sites = this.findSitesWithSignature(template, data);

            if (sites.length > 0) {
                const confidence = this.calculateSignatureConfidence(template, cooccurrences);

                signatures.set(template.name, {
                    ...template,
                    confidence,
                    occurrenceCount: sites.length,
                    sites: sites.slice(0, 10), // Limit examples
                });
            }
        }

        return signatures;
    }

    /**
     * Find sites that match a technology signature
     */
    private findSitesWithSignature(
        signature: Omit<TechnologyStackSignature, 'confidence' | 'occurrenceCount' | 'sites'>,
        data: PreprocessedData
    ): string[] {
        const matchingSites: string[] = [];

        for (const [siteUrl, siteData] of data.sites) {
            const siteHeaders = new Set(
                Array.from(siteData.headers.keys()).map(h => h.toLowerCase())
            );

            // Check if all required headers are present
            const hasAllRequired = signature.requiredHeaders.every(header =>
                siteHeaders.has(header.toLowerCase())
            );

            // Check if any conflicting headers are present
            const hasConflicting = signature.conflictingHeaders.some(header =>
                siteHeaders.has(header.toLowerCase())
            );

            if (hasAllRequired && !hasConflicting) {
                matchingSites.push(siteUrl);
            }
        }

        return matchingSites;
    }

    /**
     * Calculate confidence score for a technology signature
     */
    private calculateSignatureConfidence(
        signature: Omit<TechnologyStackSignature, 'confidence' | 'occurrenceCount' | 'sites'>,
        cooccurrences: Map<string, HeaderCooccurrence>
    ): number {
        let totalConfidence = 0;
        let pairCount = 0;

        // Calculate average conditional probability for required header pairs
        for (let i = 0; i < signature.requiredHeaders.length; i++) {
            for (let j = i + 1; j < signature.requiredHeaders.length; j++) {
                const header1 = signature.requiredHeaders[i];
                const header2 = signature.requiredHeaders[j];

                const pairKey1 = `${header1}+${header2}`;
                const pairKey2 = `${header2}+${header1}`;

                const cooccurrence = cooccurrences.get(pairKey1) || cooccurrences.get(pairKey2);

                if (cooccurrence) {
                    totalConfidence += cooccurrence.conditionalProbability;
                    pairCount++;
                }
            }
        }

        return pairCount > 0 ? totalConfidence / pairCount : 0;
    }

    /**
     * Analyze platform-specific header combinations
     */
    private analyzePlatformCombinations(
        data: PreprocessedData,
        options: AnalysisOptions
    ): Map<string, PlatformHeaderCombination> {
        const combinations = new Map<string, PlatformHeaderCombination>();

        // Group sites by CMS
        const cmsSites = this.groupSitesByCMS(data);

        for (const [cms, sites] of cmsSites.entries()) {
            if (sites.length < Math.max(2, options.minOccurrences)) continue;

            const headerCombinations = this.findCommonHeaderCombinations(sites, options);

            for (const combination of headerCombinations) {
                if (combination.headers.length >= 2) {
                    const exclusivity = this.calculatePlatformExclusivity(
                        combination.headers,
                        cms,
                        cmsSites
                    );
                    const strength = combination.frequency;

                    const comboKey = `${cms}:${combination.headers.join('+')}`;
                    combinations.set(comboKey, {
                        platform: cms,
                        vendor: cms,
                        headerGroup: combination.headers,
                        frequency: combination.frequency,
                        exclusivity,
                        strength,
                        sites: combination.sites.slice(0, 5),
                    });
                }
            }
        }

        return combinations;
    }

    /**
     * Group sites by CMS type
     */
    private groupSitesByCMS(
        data: PreprocessedData
    ): Map<string, Array<{ url: string; headers: Set<string> }>> {
        const cmsSites = new Map<string, Array<{ url: string; headers: Set<string> }>>();

        for (const [siteUrl, siteData] of data.sites) {
            const cms = siteData.cms || 'Unknown';

            if (!cmsSites.has(cms)) {
                cmsSites.set(cms, []);
            }

            const headers = new Set(Array.from(siteData.headers.keys()).map(h => h.toLowerCase()));
            cmsSites.get(cms)!.push({ url: siteUrl, headers });
        }

        return cmsSites;
    }

    /**
     * Find common header combinations within a group of sites
     */
    private findCommonHeaderCombinations(
        sites: Array<{ url: string; headers: Set<string> }>,
        options: AnalysisOptions
    ): Array<{ headers: string[]; frequency: number; sites: string[] }> {
        const combinations: Array<{ headers: string[]; frequency: number; sites: string[] }> = [];

        // Get all unique headers
        const allHeaders = new Set<string>();
        sites.forEach(site => {
            site.headers.forEach(header => allHeaders.add(header));
        });

        const headerArray = Array.from(allHeaders);

        // Find 2-header combinations
        for (let i = 0; i < headerArray.length; i++) {
            for (let j = i + 1; j < headerArray.length; j++) {
                const header1 = headerArray[i];
                const header2 = headerArray[j];

                const sitesWithBoth = sites.filter(
                    site => site.headers.has(header1) && site.headers.has(header2)
                );

                const frequency = sitesWithBoth.length / sites.length;

                // Frequency threshold for meaningful combinations (reduced for testing)
                if (frequency >= 0.1 && sitesWithBoth.length >= options.minOccurrences) {
                    combinations.push({
                        headers: [header1, header2],
                        frequency,
                        sites: sitesWithBoth.map(s => s.url),
                    });
                }
            }
        }

        return combinations.sort((a, b) => b.frequency - a.frequency);
    }

    /**
     * Calculate platform exclusivity for header combination
     */
    private calculatePlatformExclusivity(
        headers: string[],
        platform: string,
        allPlatformSites: Map<string, Array<{ url: string; headers: Set<string> }>>
    ): number {
        let totalOccurrences = 0;
        let platformOccurrences = 0;

        for (const [cms, sites] of allPlatformSites.entries()) {
            for (const site of sites) {
                const hasAllHeaders = headers.every(header => site.headers.has(header));

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
     * Detect mutually exclusive header groups
     */
    private detectMutualExclusivity(
        cooccurrences: Map<string, HeaderCooccurrence>
    ): MutualExclusivityGroup[] {
        const exclusiveGroups: MutualExclusivityGroup[] = [];

        // Find header pairs with very low co-occurrence
        const lowCooccurrencePairs = Array.from(cooccurrences.values()).filter(
            c =>
                c.cooccurrenceFrequency < 5 && // Very rare to appear together (< 5%)
                c.conditionalProbability < 0.1 // Low conditional probability
        );

        // Build exclusivity graph
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

        // Find connected components
        const visited = new Set<string>();

        for (const [header, exclusives] of exclusivityMap.entries()) {
            if (visited.has(header) || exclusives.size < 2) continue;

            const group = [header];
            visited.add(header);

            // Add connected exclusive headers
            for (const exclusive of exclusives) {
                if (!visited.has(exclusive)) {
                    group.push(exclusive);
                    visited.add(exclusive);
                }
            }

            if (group.length >= 3) {
                const avgExclusivity =
                    Array.from(group).reduce((sum, h) => {
                        const exclusiveCount = exclusivityMap.get(h)?.size || 0;
                        return sum + exclusiveCount;
                    }, 0) / group.length;

                exclusiveGroups.push({
                    headers: group,
                    exclusivityScore: avgExclusivity / group.length,
                    reasoning: `Headers rarely appear together, suggesting different technology stacks`,
                });
            }
        }

        return exclusiveGroups;
    }

    /**
     * Extract strong correlations from co-occurrences
     */
    private extractStrongCorrelations(
        cooccurrences: Map<string, HeaderCooccurrence>
    ): HeaderCooccurrence[] {
        return Array.from(cooccurrences.values())
            .filter(c => c.mutualInformation > 0.1 && c.conditionalProbability > 0.7)
            .sort((a, b) => b.mutualInformation - a.mutualInformation)
            .slice(0, 10); // Top 10 correlations
    }

    /**
     * Generate insights from co-occurrence analysis
     */
    private generateInsights(
        cooccurrences: Map<string, HeaderCooccurrence>,
        technologySignatures: Map<string, TechnologyStackSignature>,
        platformCombinations: Map<string, PlatformHeaderCombination>,
        mutualExclusivityGroups: MutualExclusivityGroup[]
    ): string[] {
        const insights: string[] = [];

        // Strong correlations insight
        const strongCorrelations = this.extractStrongCorrelations(cooccurrences);
        if (strongCorrelations.length > 0) {
            const top = strongCorrelations[0];
            insights.push(
                `Strongest header correlation: ${top.header1} ↔ ${top.header2} ` +
                    `(${(top.conditionalProbability * 100).toFixed(1)}% conditional probability)`
            );
        }

        // Technology signatures insight
        const topSignature = Array.from(technologySignatures.values()).sort(
            (a, b) => b.occurrenceCount - a.occurrenceCount
        )[0];
        if (topSignature) {
            insights.push(
                `Most common technology stack: ${topSignature.name} found on ${topSignature.occurrenceCount} sites ` +
                    `(confidence: ${(topSignature.confidence * 100).toFixed(1)}%)`
            );
        }

        // Platform exclusivity insight
        const topCombination = Array.from(platformCombinations.values()).sort(
            (a, b) => b.frequency * b.exclusivity - a.frequency * a.exclusivity
        )[0];
        if (topCombination) {
            insights.push(
                `Most platform-specific combination: ${topCombination.headerGroup.join(' + ')} ` +
                    `exclusive to ${topCombination.platform} (${(topCombination.exclusivity * 100).toFixed(1)}% exclusive)`
            );
        }

        // Mutual exclusivity insight
        if (mutualExclusivityGroups.length > 0) {
            const largest = mutualExclusivityGroups.reduce((a, b) =>
                a.headers.length > b.headers.length ? a : b
            );
            insights.push(
                `Mutually exclusive header group: ${largest.headers.slice(0, 3).join(', ')} ` +
                    `${largest.headers.length > 3 ? `and ${largest.headers.length - 3} others` : ''} rarely appear together`
            );
        }

        return insights;
    }

    /**
     * Create statistical summary
     */
    private createStatisticalSummary(
        cooccurrences: Map<string, HeaderCooccurrence>
    ): CooccurrenceSpecificData['statisticalSummary'] {
        const cooccurrenceArray = Array.from(cooccurrences.values());

        if (cooccurrenceArray.length === 0) {
            return {
                totalHeaderPairs: 0,
                significantCooccurrences: 0,
                averageMutualInformation: 0,
                topConditionalProbability: 0,
            };
        }

        const avgMI =
            cooccurrenceArray.reduce((sum, c) => sum + c.mutualInformation, 0) /
            cooccurrenceArray.length;
        const significantCount = cooccurrenceArray.filter(c => c.mutualInformation > 0.05).length;
        const topCP = Math.max(...cooccurrenceArray.map(c => c.conditionalProbability));

        return {
            totalHeaderPairs: cooccurrenceArray.length,
            significantCooccurrences: significantCount,
            averageMutualInformation: avgMI,
            topConditionalProbability: topCP,
        };
    }

    /**
     * Infer header category from header name (simplified V2 implementation)
     */
    private inferHeaderCategory(headerName: string): HeaderPrimaryCategory {
        const lower = headerName.toLowerCase();

        // Security headers
        if (
            lower.includes('csp') ||
            lower.includes('security') ||
            lower.includes('cors') ||
            lower.includes('frame') ||
            lower.includes('hsts')
        ) {
            return 'security';
        }

        // Caching headers
        if (
            lower.includes('cache') ||
            lower.includes('etag') ||
            lower.includes('vary') ||
            lower.includes('expires') ||
            lower.includes('modified')
        ) {
            return 'caching';
        }

        // Infrastructure headers (request/response tracking, performance, content)
        if (
            lower.includes('content') ||
            lower.includes('type') ||
            lower.includes('encoding') ||
            lower.includes('language') ||
            lower.includes('length') ||
            lower.includes('request') ||
            lower.includes('id') ||
            lower.includes('trace') ||
            lower.includes('correlation') ||
            lower.includes('session') ||
            lower.includes('timing') ||
            lower.includes('performance') ||
            lower.includes('speed')
        ) {
            return 'infrastructure';
        }

        // Custom/vendor headers (x- prefix or vendor-specific)
        if (
            lower.startsWith('x-') ||
            lower.includes('cf-') ||
            lower.includes('amz') ||
            lower.includes('shopify') ||
            lower.includes('wp-')
        ) {
            return 'custom';
        }

        // Default to custom for unrecognized headers
        return 'custom';
    }

    /**
     * Create V2 patterns for interface compatibility
     */
    private createCooccurrencePatterns(
        cooccurrences: Map<string, HeaderCooccurrence>,
        options: AnalysisOptions
    ): Map<string, PatternData> {
        const patterns = new Map<string, PatternData>();

        for (const [pairKey, cooccurrence] of cooccurrences) {
            if (cooccurrence.cooccurrenceCount >= options.minOccurrences) {
                // Create a placeholder sites set - in a full implementation, we'd rebuild from matrix
                const sites = new Set<string>();
                for (let i = 0; i < cooccurrence.cooccurrenceCount; i++) {
                    sites.add(`site${i}.com`); // Placeholder site URLs
                }

                patterns.set(`cooccurrence:${pairKey}`, {
                    pattern: `${cooccurrence.header1} + ${cooccurrence.header2}`,
                    siteCount: cooccurrence.cooccurrenceCount,
                    sites,
                    frequency: cooccurrence.cooccurrenceFrequency / 100,
                    examples: options.includeExamples
                        ? new Set([`${cooccurrence.header1} + ${cooccurrence.header2}`])
                        : undefined,
                    metadata: {
                        type: 'cooccurrence',
                        mutualInformation: cooccurrence.mutualInformation,
                        conditionalProbability: cooccurrence.conditionalProbability,
                        vendor1: cooccurrence.vendor1,
                        vendor2: cooccurrence.vendor2,
                        category1: cooccurrence.category1,
                        category2: cooccurrence.category2,
                    },
                });
            }
        }

        return patterns;
    }
}
