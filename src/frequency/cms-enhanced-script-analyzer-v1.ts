import { DetectionDataPoint } from '../utils/cms/analysis/types.js';
import { createModuleLogger } from '../utils/logger.js';
import type { FrequencyOptionsWithDefaults } from './types-v1.js';
import { ScriptPattern } from './script-analyzer-v1.js';

const logger = createModuleLogger('cms-enhanced-script-analyzer');

export interface CMSCorrelatedPattern extends ScriptPattern {
    cmsCorrelation: Record<string, number>; // CMS -> correlation strength (0-1)
    discriminativePower: number; // How well this pattern distinguishes between CMS types
    confidenceLevel: 'high' | 'medium' | 'low';
    recommendedConfidence: number; // Suggested confidence for CMS detection
    sameDomainOnly: boolean; // Whether pattern should only apply to same-domain scripts
}

export interface CMSDetectionRecommendations {
    newPatterns: Array<{
        pattern: string;
        category: string;
        confidence: number;
        cms: string;
        reasoning: string;
        examples: string[];
    }>;

    patternRefinements: Array<{
        pattern: string;
        currentConfidence: number;
        recommendedConfidence: number;
        reasoning: string;
        affectedCMS: string[];
    }>;

    deprecatedPatterns: Array<{
        pattern: string;
        reason: string;
        cms: string;
        replacement?: string;
    }>;
}

/**
 * Enhanced script analyzer that correlates patterns with CMS types for detection improvements
 */
export async function analyzeCMSCorrelatedScripts(
    dataPoints: DetectionDataPoint[],
    options: FrequencyOptionsWithDefaults
): Promise<{
    patterns: Map<string, CMSCorrelatedPattern[]>;
    recommendations: CMSDetectionRecommendations;
}> {
    logger.info('Starting CMS-correlated script analysis', {
        sites: dataPoints.length,
        minOccurrences: options.minOccurrences,
    });

    // Group data points by detected CMS
    const cmsSites = groupSitesByCMS(dataPoints);

    // Analyze script patterns for each CMS and calculate correlations
    const patterns = await analyzePatternsByCMS(cmsSites, options);

    // Generate recommendations for detect-cms and ground-truth
    const recommendations = generateCMSDetectionRecommendations(patterns, cmsSites);

    logger.info('CMS-correlated script analysis complete', {
        patterns: Array.from(patterns.values()).flat().length,
        recommendations: recommendations.newPatterns.length,
    });

    return { patterns, recommendations };
}

/**
 * Group sites by their detected CMS type
 */
function groupSitesByCMS(dataPoints: DetectionDataPoint[]): Map<string, DetectionDataPoint[]> {
    const cmsSites = new Map<string, DetectionDataPoint[]>();

    for (const site of dataPoints) {
        let cms = 'Unknown';

        // Extract the most confident CMS detection
        if (site.detectionResults && site.detectionResults.length > 0) {
            const bestResult = site.detectionResults.reduce((best, current) =>
                current.confidence > best.confidence ? current : best
            );

            if (bestResult.confidence >= 0.5) {
                // Only trust results with 50%+ confidence
                cms = bestResult.cms;
            }
        }

        if (!cmsSites.has(cms)) {
            cmsSites.set(cms, []);
        }
        cmsSites.get(cms)!.push(site);
    }

    return cmsSites;
}

/**
 * Analyze script patterns for each CMS type and calculate correlations
 */
async function analyzePatternsByCMS(
    cmsSites: Map<string, DetectionDataPoint[]>,
    options: FrequencyOptionsWithDefaults
): Promise<Map<string, CMSCorrelatedPattern[]>> {
    const patterns = new Map<string, CMSCorrelatedPattern[]>();

    // Track global pattern occurrences across all CMS types
    const globalPatternCounts = new Map<
        string,
        {
            totalSites: number;
            cmsCounts: Map<string, number>;
            examples: Set<string>;
        }
    >();

    // First pass: collect all patterns and their CMS associations
    for (const [cms, sites] of cmsSites.entries()) {
        if (sites.length < 3) continue; // Skip CMS types with too few sites

        for (const site of sites) {
            const scripts = site.scripts || [];
            const sitePatterns = extractEnhancedScriptPatterns(scripts, site.url);
            const uniquePatterns = new Set(sitePatterns.map(p => p.pattern));

            for (const pattern of uniquePatterns) {
                if (!globalPatternCounts.has(pattern)) {
                    globalPatternCounts.set(pattern, {
                        totalSites: 0,
                        cmsCounts: new Map(),
                        examples: new Set(),
                    });
                }

                const data = globalPatternCounts.get(pattern)!;
                data.totalSites++;
                data.cmsCounts.set(cms, (data.cmsCounts.get(cms) || 0) + 1);

                // Add examples
                const patternObj = sitePatterns.find(p => p.pattern === pattern);
                if (patternObj && data.examples.size < 5) {
                    data.examples.add(patternObj.example);
                }
            }
        }
    }

    // Second pass: calculate correlations and discriminative power
    for (const [pattern, data] of globalPatternCounts.entries()) {
        if (data.totalSites < options.minOccurrences) continue;

        const frequency = data.totalSites / Array.from(cmsSites.values()).flat().length;
        const cmsCorrelation: Record<string, number> = {};

        // Calculate correlation with each CMS
        for (const [cms, sites] of cmsSites.entries()) {
            const cmsPatternCount = data.cmsCounts.get(cms) || 0;
            const cmsCorrelation_value = sites.length > 0 ? cmsPatternCount / sites.length : 0;
            cmsCorrelation[cms] = cmsCorrelation_value;
        }

        // Calculate discriminative power (how well this pattern distinguishes between CMS types)
        const discriminativePower = calculateDiscriminativePower(cmsCorrelation);

        // Determine if pattern should be same-domain only
        const sameDomainOnly = shouldBeSameDomainOnly(pattern);

        // Determine confidence level
        const { confidenceLevel, recommendedConfidence } = determineConfidenceLevel(
            pattern,
            cmsCorrelation,
            discriminativePower,
            frequency
        );

        const enhancedPattern: CMSCorrelatedPattern = {
            pattern,
            frequency,
            occurrences: data.totalSites,
            examples: Array.from(data.examples).slice(0, 3),
            cmsCorrelation,
            discriminativePower,
            confidenceLevel,
            recommendedConfidence,
            sameDomainOnly,
        };

        // Group by pattern category
        const category = categorizePattern(pattern);
        if (!patterns.has(category)) {
            patterns.set(category, []);
        }
        patterns.get(category)!.push(enhancedPattern);
    }

    // Sort patterns within each category by discriminative power
    for (const [_category, categoryPatterns] of patterns.entries()) {
        categoryPatterns.sort((a, b) => b.discriminativePower - a.discriminativePower);
    }

    return patterns;
}

/**
 * Extract enhanced script patterns with additional metadata
 */
function extractEnhancedScriptPatterns(
    scripts: any[],
    siteUrl: string
): Array<{
    pattern: string;
    example: string;
    sameDomain: boolean;
}> {
    const patterns: Array<{ pattern: string; example: string; sameDomain: boolean }> = [];

    for (const script of scripts) {
        if (script.src) {
            const sameDomain = isSameDomain(script.src, siteUrl);

            // Extract all pattern types we currently support
            const scriptPatterns = [
                ...extractPathPatterns(script.src),
                ...extractLibraryPatterns(script.src),
                ...extractDomainPatterns(script.src),
                ...extractFileTypePatterns(script.src),
            ];

            for (const pattern of scriptPatterns) {
                patterns.push({
                    pattern,
                    example: script.src,
                    sameDomain,
                });
            }
        }

        if (script.content || script.inline) {
            const content = script.content || '';
            const inlinePatterns = extractInlinePatterns(content);

            for (const pattern of inlinePatterns) {
                patterns.push({
                    pattern,
                    example: content.substring(0, 100),
                    sameDomain: true, // Inline scripts are always same-domain
                });
            }
        }
    }

    return patterns;
}

/**
 * Calculate how well a pattern distinguishes between CMS types
 */
function calculateDiscriminativePower(cmsCorrelation: Record<string, number>): number {
    const correlations = Object.values(cmsCorrelation).filter(c => c > 0);
    if (correlations.length <= 1) return 0;

    // Calculate standard deviation of correlations
    const mean = correlations.reduce((sum, c) => sum + c, 0) / correlations.length;
    const variance =
        correlations.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / correlations.length;
    const stdDev = Math.sqrt(variance);

    // Higher standard deviation = more discriminative
    return Math.min(stdDev * 2, 1.0); // Cap at 1.0
}

/**
 * Determine if a pattern should only apply to same-domain scripts
 */
function shouldBeSameDomainOnly(pattern: string): boolean {
    // CMS-specific path patterns should be same-domain only
    const sameDomainPatterns = [
        'path:wp-content',
        'path:wp-includes',
        'path:wp-admin',
        'path:sites',
        'path:core',
        'path:modules',
        'path:administrator',
        'path:components',
        'path:templates',
        'path:media',
        'path:assets',
        'path:js',
    ];

    return sameDomainPatterns.includes(pattern);
}

/**
 * Determine confidence level and recommended confidence score
 */
function determineConfidenceLevel(
    pattern: string,
    cmsCorrelation: Record<string, number>,
    discriminativePower: number,
    frequency: number
): { confidenceLevel: 'high' | 'medium' | 'low'; recommendedConfidence: number } {
    const maxCorrelation = Math.max(...Object.values(cmsCorrelation));

    // High confidence: high correlation + high discriminative power + reasonable frequency
    if (maxCorrelation >= 0.8 && discriminativePower >= 0.6 && frequency >= 0.05) {
        return {
            confidenceLevel: 'high',
            recommendedConfidence: Math.min(0.85 + discriminativePower * 0.1, 0.95),
        };
    }

    // Medium confidence: moderate correlation or discriminative power
    if (maxCorrelation >= 0.5 && discriminativePower >= 0.3) {
        return {
            confidenceLevel: 'medium',
            recommendedConfidence: 0.6 + discriminativePower * 0.2,
        };
    }

    // Low confidence: everything else
    return {
        confidenceLevel: 'low',
        recommendedConfidence: 0.3 + discriminativePower * 0.2,
    };
}

/**
 * Generate recommendations for improving CMS detection
 */
function generateCMSDetectionRecommendations(
    patterns: Map<string, CMSCorrelatedPattern[]>,
    _cmsSites: Map<string, DetectionDataPoint[]>
): CMSDetectionRecommendations {
    const newPatterns: Array<{
        pattern: string;
        category: string;
        confidence: number;
        cms: string;
        reasoning: string;
        examples: string[];
    }> = [];

    const patternRefinements: Array<{
        pattern: string;
        currentConfidence: number;
        recommendedConfidence: number;
        reasoning: string;
        affectedCMS: string[];
    }> = [];

    const deprecatedPatterns: Array<{
        pattern: string;
        reason: string;
        cms: string;
        replacement?: string;
    }> = [];

    for (const [category, categoryPatterns] of patterns.entries()) {
        for (const pattern of categoryPatterns) {
            // Recommend new high-confidence patterns
            if (pattern.confidenceLevel === 'high' && pattern.discriminativePower >= 0.7) {
                const dominantCMS = Object.entries(pattern.cmsCorrelation)
                    .filter(([cms]) => cms !== 'Unknown')
                    .reduce(
                        (max, [cms, correlation]) =>
                            correlation > max.correlation ? { cms, correlation } : max,
                        { cms: '', correlation: 0 }
                    );

                if (dominantCMS.correlation >= 0.8) {
                    newPatterns.push({
                        pattern: pattern.pattern,
                        category,
                        confidence: pattern.recommendedConfidence,
                        cms: dominantCMS.cms,
                        reasoning: `High correlation (${Math.round(dominantCMS.correlation * 100)}%) with ${dominantCMS.cms}, strong discriminative power (${Math.round(pattern.discriminativePower * 100)}%)`,
                        examples: pattern.examples,
                    });
                }
            }

            // Identify patterns that need confidence refinement
            if (pattern.discriminativePower < 0.3 && pattern.frequency > 0.3) {
                patternRefinements.push({
                    pattern: pattern.pattern,
                    currentConfidence: 0.7, // Placeholder - would need to check current detection rules
                    recommendedConfidence: pattern.recommendedConfidence,
                    reasoning: `Pattern appears frequently (${Math.round(pattern.frequency * 100)}%) but has low discriminative power`,
                    affectedCMS: Object.keys(pattern.cmsCorrelation).filter(
                        cms => pattern.cmsCorrelation[cms] > 0.1
                    ),
                });
            }
        }
    }

    return {
        newPatterns: newPatterns.slice(0, 10), // Top 10 recommendations
        patternRefinements: patternRefinements.slice(0, 5),
        deprecatedPatterns, // Could be populated by comparing with existing detection rules
    };
}

// Helper functions (simplified versions of existing pattern extraction)
function extractPathPatterns(src: string): string[] {
    const patterns = [];
    if (src.includes('/wp-content/')) patterns.push('path:wp-content');
    if (src.includes('/wp-includes/')) patterns.push('path:wp-includes');
    if (src.includes('/sites/')) patterns.push('path:sites');
    if (src.includes('/modules/')) patterns.push('path:modules');
    if (src.includes('/templates/')) patterns.push('path:templates');
    if (src.includes('/media/')) patterns.push('path:media');
    return patterns;
}

function extractLibraryPatterns(src: string): string[] {
    const patterns = [];
    if (src.includes('jquery')) patterns.push('library:jquery');
    if (src.includes('bootstrap')) patterns.push('library:bootstrap');
    return patterns;
}

function extractDomainPatterns(src: string): string[] {
    const patterns = [];
    try {
        const url = new URL(src, 'https://example.com');
        if (url.hostname.includes('cdn-website.com')) patterns.push('domain:duda-cdn');
        if (url.hostname.includes('googleapis.com')) patterns.push('domain:google-apis');
    } catch { /* empty */ }
    return patterns;
}

function extractFileTypePatterns(src: string): string[] {
    const patterns = [];
    if (src.includes('.min.js')) patterns.push('script:minified');
    if (src.includes('bundle')) patterns.push('script:bundled');
    return patterns;
}

function extractInlinePatterns(content: string): string[] {
    const patterns = [];
    if (content.includes('Drupal.')) patterns.push('inline:drupal');
    if (content.includes('wp-admin')) patterns.push('inline:wordpress');
    if (content.includes('window.Parameters')) patterns.push('inline:duda');
    return patterns;
}

function categorizePattern(pattern: string): string {
    if (pattern.startsWith('path:')) return 'paths';
    if (pattern.startsWith('library:')) return 'libraries';
    if (pattern.startsWith('inline:')) return 'inline';
    if (pattern.startsWith('domain:')) return 'domains';
    if (pattern.startsWith('script:')) return 'scripts';
    return 'other';
}

function isSameDomain(scriptSrc: string, siteUrl: string): boolean {
    try {
        const scriptUrl = new URL(scriptSrc, siteUrl);
        const siteUrlObj = new URL(siteUrl);
        return scriptUrl.hostname === siteUrlObj.hostname;
    } catch {
        return scriptSrc.startsWith('/'); // Relative URLs are same-domain
    }
}
