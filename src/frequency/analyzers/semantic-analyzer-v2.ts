/**
 * SemanticAnalyzerV2 - Pure V2 Implementation
 *
 * Uses only preprocessed semantic metadata from DataPreprocessor.
 * No V1 dependencies, no independent preprocessing, true V2 architecture.
 */

import type {
    FrequencyAnalyzer,
    PreprocessedData,
    AnalysisOptions,
    AnalysisResult,
    PatternData,
    SemanticSpecificData,
    CategoryDistribution,
    SemanticPattern,
    VendorSemanticData,
    SemanticInsightsV2,
    SemanticQualityMetrics,
} from '../types/analyzer-interface.js';
import type { HeaderClassification } from '../data-preprocessor-v2.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('semantic-analyzer-v2-pure');

/**
 * Pure V2 SemanticAnalyzerV2 - uses only preprocessed data
 */
export class SemanticAnalyzerV2 implements FrequencyAnalyzer<SemanticSpecificData> {
    getName(): string {
        return 'SemanticAnalyzerV2';
    }

    async analyze(
        data: PreprocessedData,
        options: AnalysisOptions
    ): Promise<AnalysisResult<SemanticSpecificData>> {
        const startTime = Date.now();

        logger.info('Starting pure V2 semantic analysis', {
            totalSites: data.totalSites,
            headerClassifications: data.metadata.semantic?.headerClassifications?.size || 0,
            vendorMappings: data.metadata.semantic?.vendorMappings?.size || 0,
        });

        // Use preprocessed semantic metadata - no independent classification
        const headerCategories = data.metadata.semantic?.headerCategories || new Map();
        const headerClassifications = data.metadata.semantic?.headerClassifications || new Map();
        const vendorMappings = data.metadata.semantic?.vendorMappings || new Map();

        if (headerCategories.size === 0) {
            logger.warn('No semantic metadata available in preprocessed data');
        }

        // Step 1: Create semantic patterns using preprocessed data (with filtering applied)
        const headerPatterns = this.createSemanticPatterns(headerClassifications, data, options);

        // Step 2: Analyze category distribution using FILTERED patterns only
        const categoryDistribution = this.analyzeCategoryDistributionFromPatterns(
            headerPatterns,
            data
        );

        // Step 3: Analyze vendor detections from preprocessed mappings
        const vendorDetections = this.analyzeVendorDetections(
            vendorMappings,
            headerClassifications,
            data
        );

        // Step 4: Generate V2-native insights using filtered patterns
        const insights = this.generateSemanticInsightsFromPatterns(
            headerPatterns,
            vendorMappings,
            data
        );

        // Step 5: Calculate quality metrics using filtered patterns
        const qualityMetrics = this.calculateQualityMetricsFromPatterns(
            headerPatterns,
            data
        );

        // Step 6: Create standard V2 patterns for FrequencyAnalyzer interface
        const patterns = this.createStandardPatterns(headerPatterns, options);

        const duration = Date.now() - startTime;
        logger.info('Pure V2 semantic analysis completed', {
            duration,
            categories: categoryDistribution.size,
            headerPatterns: headerPatterns.size,
            vendorDetections: vendorDetections.size,
            standardPatterns: patterns.size,
        });

        return {
            patterns,
            totalSites: data.totalSites,
            metadata: {
                analyzer: this.getName(),
                analyzedAt: new Date().toISOString(),
                totalPatternsFound: headerPatterns.size,
                totalPatternsAfterFiltering: patterns.size,
                options,
            },
            analyzerSpecific: {
                categoryDistribution,
                headerPatterns,
                vendorDetections,
                insights,
                qualityMetrics,
            },
        };
    }

    /**
     * Analyze category distribution from FILTERED patterns only
     * This fixes the bug where ALL headers were being counted instead of just filtered ones
     */
    private analyzeCategoryDistributionFromPatterns(
        headerPatterns: Map<string, SemanticPattern>,
        data: PreprocessedData
    ): Map<string, CategoryDistribution> {
        const distribution = new Map<string, CategoryDistribution>();
        const categoryStats = new Map<
            string,
            {
                headers: Set<string>;
                sites: Set<string>;
                confidences: number[];
            }
        >();

        // Count ONLY filtered headers per category and collect statistics
        for (const [header, pattern] of headerPatterns) {
            const category = pattern.category;
            
            if (!categoryStats.has(category)) {
                categoryStats.set(category, {
                    headers: new Set(),
                    sites: new Set(),
                    confidences: [],
                });
            }

            const stats = categoryStats.get(category)!;
            stats.headers.add(header);
            stats.confidences.push(pattern.confidence);

            // Add sites from the pattern (already calculated)
            for (const site of pattern.sites) {
                stats.sites.add(site);
            }
        }

        // Create distribution objects
        for (const [category, stats] of categoryStats) {
            const averageConfidence =
                stats.confidences.length > 0
                    ? stats.confidences.reduce((sum, conf) => sum + conf, 0) /
                      stats.confidences.length
                    : 0.5;

            // Get top headers for this category (by site count from patterns)
            const headerSiteCounts = Array.from(stats.headers).map(header => {
                const pattern = headerPatterns.get(header);
                return {
                    header,
                    siteCount: pattern ? pattern.siteCount : 0,
                };
            });

            const topHeaders = headerSiteCounts
                .sort((a, b) => b.siteCount - a.siteCount)
                .slice(0, 5)
                .map(item => item.header);

            distribution.set(category, {
                category,
                headerCount: stats.headers.size,
                siteCount: stats.sites.size,
                frequency: stats.sites.size / data.totalSites,
                averageConfidence,
                topHeaders,
            });
        }

        return distribution;
    }
    
    /**
     * Analyze category distribution from preprocessed classifications (DEPRECATED - causes filtering bug)
     * Kept for reference but should not be used
     */
    private analyzeCategoryDistribution(
        headerCategories: Map<string, string>,
        headerClassifications: Map<string, HeaderClassification>,
        data: PreprocessedData
    ): Map<string, CategoryDistribution> {
        // This method was causing the bug where ALL headers were being counted
        // instead of just the filtered ones that meet frequency thresholds
        logger.warn('Using deprecated analyzeCategoryDistribution - should use analyzeCategoryDistributionFromPatterns');
        
        const distribution = new Map<string, CategoryDistribution>();
        const categoryStats = new Map<
            string,
            {
                headers: Set<string>;
                sites: Set<string>;
                confidences: number[];
            }
        >();

        // Count headers per category and collect statistics
        for (const [header, category] of headerCategories) {
            if (!categoryStats.has(category)) {
                categoryStats.set(category, {
                    headers: new Set(),
                    sites: new Set(),
                    confidences: [],
                });
            }

            const stats = categoryStats.get(category)!;
            stats.headers.add(header);

            // Get confidence from classification
            const classification = headerClassifications.get(header);
            if (classification) {
                stats.confidences.push(classification.discriminativeScore);
            }

            // Count sites that use this header
            for (const [siteUrl, siteData] of data.sites) {
                if (siteData.headers.has(header)) {
                    stats.sites.add(siteUrl);
                }
            }
        }

        // Create distribution objects
        for (const [category, stats] of categoryStats) {
            const averageConfidence =
                stats.confidences.length > 0
                    ? stats.confidences.reduce((sum, conf) => sum + conf, 0) /
                      stats.confidences.length
                    : 0.5;

            // Get top headers for this category (by site count)
            const headerSiteCounts = Array.from(stats.headers).map(header => ({
                header,
                siteCount: this.countSitesForHeader(header, data),
            }));

            const topHeaders = headerSiteCounts
                .sort((a, b) => b.siteCount - a.siteCount)
                .slice(0, 5)
                .map(item => item.header);

            distribution.set(category, {
                category,
                headerCount: stats.headers.size,
                siteCount: stats.sites.size,
                frequency: stats.sites.size / data.totalSites,
                averageConfidence,
                topHeaders,
            });
        }

        return distribution;
    }

    /**
     * Create semantic patterns from preprocessed classifications
     */
    private createSemanticPatterns(
        headerClassifications: Map<string, HeaderClassification>,
        data: PreprocessedData,
        options: AnalysisOptions
    ): Map<string, SemanticPattern> {
        const patterns = new Map<string, SemanticPattern>();

        for (const [header, classification] of headerClassifications) {
            const siteCount = this.countSitesForHeader(header, data);

            // Apply minOccurrences filter
            if (siteCount < options.minOccurrences) {
                continue;
            }

            // Get sites that use this header
            const sites = new Set<string>();
            for (const [siteUrl, siteData] of data.sites) {
                if (siteData.headers.has(header)) {
                    sites.add(siteUrl);
                }
            }

            patterns.set(header, {
                pattern: header,
                category: classification.category,
                confidence: classification.discriminativeScore,
                discriminativeScore: classification.discriminativeScore,
                filterRecommendation: classification.filterRecommendation,
                siteCount,
                sites,
                vendor: classification.vendor,
                platformName: classification.platformName,
            });
        }

        return patterns;
    }

    /**
     * Analyze vendor detections from preprocessed mappings
     */
    private analyzeVendorDetections(
        vendorMappings: Map<string, string>,
        headerClassifications: Map<string, HeaderClassification>,
        _data: PreprocessedData
    ): Map<string, VendorSemanticData> {
        const vendorDetections = new Map<string, VendorSemanticData>();
        const vendorStats = new Map<
            string,
            {
                headers: Set<string>;
                confidences: number[];
                categories: Set<string>;
            }
        >();

        // Group data by vendor
        for (const [header, vendor] of vendorMappings) {
            if (!vendorStats.has(vendor)) {
                vendorStats.set(vendor, {
                    headers: new Set(),
                    confidences: [],
                    categories: new Set(),
                });
            }

            const stats = vendorStats.get(vendor)!;
            stats.headers.add(header);

            const classification = headerClassifications.get(header);
            if (classification) {
                stats.confidences.push(classification.discriminativeScore);
                stats.categories.add(classification.category);
            }
        }

        // Create vendor detection objects
        for (const [vendor, stats] of vendorStats) {
            const averageConfidence =
                stats.confidences.length > 0
                    ? stats.confidences.reduce((sum, conf) => sum + conf, 0) /
                      stats.confidences.length
                    : 0.5;

            // Choose primary category (most common)
            const categoryArray = Array.from(stats.categories);
            const primaryCategory = categoryArray.length > 0 ? categoryArray[0] : 'custom';

            vendorDetections.set(vendor, {
                vendor,
                headerCount: stats.headers.size,
                confidence: averageConfidence,
                headers: Array.from(stats.headers),
                category: primaryCategory,
            });
        }

        return vendorDetections;
    }

    /**
     * Generate V2-native semantic insights from FILTERED patterns only
     * This fixes the bug where insights were generated from ALL headers instead of filtered ones
     */
    private generateSemanticInsightsFromPatterns(
        headerPatterns: Map<string, SemanticPattern>,
        vendorMappings: Map<string, string>,
        _data: PreprocessedData
    ): SemanticInsightsV2 {
        const totalHeaders = headerPatterns.size;
        const categorizedHeaders = Array.from(headerPatterns.values()).filter(
            pattern => pattern.category !== 'custom'
        ).length;
        const uncategorizedHeaders = totalHeaders - categorizedHeaders;

        // Find most common category from filtered patterns
        const categoryCounts = new Map<string, number>();
        for (const pattern of headerPatterns.values()) {
            categoryCounts.set(pattern.category, (categoryCounts.get(pattern.category) || 0) + 1);
        }
        const mostCommonCategory =
            Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'custom';

        // Count high confidence headers from filtered patterns
        const highConfidenceHeaders = Array.from(headerPatterns.values()).filter(
            pattern => pattern.confidence > 0.8
        ).length;

        // Count vendor headers from filtered patterns
        const vendorHeaders = Array.from(headerPatterns.values()).filter(
            pattern => pattern.vendor || pattern.platformName
        ).length;
        
        const customHeaders = Array.from(headerPatterns.values()).filter(
            pattern => pattern.category === 'custom'
        ).length;

        // Identify potential security headers from filtered patterns
        const potentialSecurity = Array.from(headerPatterns.entries())
            .filter(
                ([header, pattern]) =>
                    pattern.category === 'security' ||
                    header.toLowerCase().includes('security') ||
                    header.toLowerCase().includes('csp') ||
                    header.toLowerCase().includes('cors')
            )
            .map(([header]) => header);

        // Generate recommendations focused on CMS/platform detection improvement
        const recommendations = [
            'Analyze platform-specific headers for improved CMS detection accuracy',
            'Focus on headers with high discriminative scores for reliable technology identification',
            'Investigate custom headers for emerging platform signatures and vendor patterns',
            'Cross-reference vendor-specific headers with technology stack patterns for better inference',
        ];

        return {
            totalHeaders,
            categorizedHeaders,
            uncategorizedHeaders,
            mostCommonCategory,
            highConfidenceHeaders,
            vendorHeaders,
            customHeaders,
            potentialSecurity,
            recommendations,
        };
    }

    /**
     * Generate V2-native semantic insights (DEPRECATED - causes filtering bug)
     * Kept for reference but should not be used
     */
    private generateSemanticInsights(
        headerCategories: Map<string, string>,
        headerClassifications: Map<string, HeaderClassification>,
        vendorMappings: Map<string, string>,
        _data: PreprocessedData
    ): SemanticInsightsV2 {
        // This method was causing the bug where ALL headers were being counted
        logger.warn('Using deprecated generateSemanticInsights - should use generateSemanticInsightsFromPatterns');
        const totalHeaders = headerCategories.size;
        const categorizedHeaders = Array.from(headerCategories.values()).filter(
            cat => cat !== 'custom'
        ).length;
        const uncategorizedHeaders = totalHeaders - categorizedHeaders;

        // Find most common category
        const categoryCounts = new Map<string, number>();
        for (const category of headerCategories.values()) {
            categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        }
        const mostCommonCategory =
            Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'custom';

        // Count high confidence headers
        const highConfidenceHeaders = Array.from(headerClassifications.values()).filter(
            classification => classification.discriminativeScore > 0.8
        ).length;

        const vendorHeaders = vendorMappings.size;
        const customHeaders = Array.from(headerCategories.values()).filter(
            cat => cat === 'custom'
        ).length;

        // Identify potential security headers
        const potentialSecurity = Array.from(headerCategories.entries())
            .filter(
                ([header, category]) =>
                    category === 'security' ||
                    header.toLowerCase().includes('security') ||
                    header.toLowerCase().includes('csp') ||
                    header.toLowerCase().includes('cors')
            )
            .map(([header]) => header);

        // Generate recommendations
        const recommendations = this.generateRecommendations(
            headerCategories,
            headerClassifications,
            vendorMappings
        );

        return {
            totalHeaders,
            categorizedHeaders,
            uncategorizedHeaders,
            mostCommonCategory,
            highConfidenceHeaders,
            vendorHeaders,
            customHeaders,
            potentialSecurity,
            recommendations,
        };
    }

    /**
     * Calculate semantic quality metrics from FILTERED patterns only
     * This fixes the bug where metrics were calculated on ALL headers instead of filtered ones
     */
    private calculateQualityMetricsFromPatterns(
        headerPatterns: Map<string, SemanticPattern>,
        _data: PreprocessedData
    ): SemanticQualityMetrics {
        const totalHeaders = headerPatterns.size;

        if (totalHeaders === 0) {
            return {
                categorizationCoverage: 0,
                averageConfidence: 0,
                vendorDetectionRate: 0,
                customHeaderRatio: 0,
            };
        }

        // Categorization coverage (non-custom headers / total headers)
        const categorizedHeaders = Array.from(headerPatterns.values()).filter(
            pattern => pattern.category !== 'custom'
        ).length;
        const categorizationCoverage = categorizedHeaders / totalHeaders;

        // Average confidence from filtered patterns
        const confidences = Array.from(headerPatterns.values()).map(
            pattern => pattern.confidence
        );
        const averageConfidence =
            confidences.length > 0
                ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
                : 0;

        // Vendor detection rate (patterns with vendors / total patterns)
        const patternsWithVendors = Array.from(headerPatterns.values()).filter(
            pattern => pattern.vendor || pattern.platformName
        ).length;
        const vendorDetectionRate = patternsWithVendors / totalHeaders;

        // Custom header ratio from filtered patterns
        const customHeaders = Array.from(headerPatterns.values()).filter(
            pattern => pattern.category === 'custom'
        ).length;
        const customHeaderRatio = customHeaders / totalHeaders;

        return {
            categorizationCoverage,
            averageConfidence,
            vendorDetectionRate,
            customHeaderRatio,
        };
    }
    
    /**
     * Calculate semantic quality metrics (DEPRECATED - causes filtering bug)
     * Kept for reference but should not be used
     */
    private calculateQualityMetrics(
        headerCategories: Map<string, string>,
        headerClassifications: Map<string, HeaderClassification>,
        _data: PreprocessedData
    ): SemanticQualityMetrics {
        // This method was causing the bug where ALL headers were being counted
        logger.warn('Using deprecated calculateQualityMetrics - should use calculateQualityMetricsFromPatterns');
        
        const totalHeaders = headerCategories.size;

        if (totalHeaders === 0) {
            return {
                categorizationCoverage: 0,
                averageConfidence: 0,
                vendorDetectionRate: 0,
                customHeaderRatio: 0,
            };
        }

        // Categorization coverage (non-custom headers / total headers)
        const categorizedHeaders = Array.from(headerCategories.values()).filter(
            cat => cat !== 'custom'
        ).length;
        const categorizationCoverage = categorizedHeaders / totalHeaders;

        // Average confidence
        const confidences = Array.from(headerClassifications.values()).map(
            classification => classification.discriminativeScore
        );
        const averageConfidence =
            confidences.length > 0
                ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
                : 0;

        // Vendor detection rate (headers with vendors / total headers)
        const headersWithVendors = Array.from(headerClassifications.values()).filter(
            classification => classification.vendor || classification.platformName
        ).length;
        const vendorDetectionRate = headersWithVendors / totalHeaders;

        // Custom header ratio
        const customHeaders = Array.from(headerCategories.values()).filter(
            cat => cat === 'custom'
        ).length;
        const customHeaderRatio = customHeaders / totalHeaders;

        return {
            categorizationCoverage,
            averageConfidence,
            vendorDetectionRate,
            customHeaderRatio,
        };
    }

    /**
     * Create standard patterns for FrequencyAnalyzer interface compatibility
     */
    private createStandardPatterns(
        headerPatterns: Map<string, SemanticPattern>,
        options: AnalysisOptions
    ): Map<string, PatternData> {
        const patterns = new Map<string, PatternData>();

        for (const [header, semanticPattern] of headerPatterns) {
            patterns.set(header, {
                pattern: header,
                siteCount: semanticPattern.siteCount,
                frequency: semanticPattern.siteCount / (semanticPattern.sites.size || 1),
                sites: semanticPattern.sites,
                examples: options.includeExamples ? new Set([header]) : undefined,
                metadata: {
                    type: 'semantic',
                    category: semanticPattern.category,
                    confidence: semanticPattern.confidence,
                    discriminativeScore: semanticPattern.discriminativeScore,
                    filterRecommendation: semanticPattern.filterRecommendation,
                    vendor: semanticPattern.vendor,
                    platformName: semanticPattern.platformName,
                    source: 'semantic_analyzer_v2_pure',
                },
            });
        }

        return patterns;
    }

    /**
     * Count sites that use a specific header
     */
    private countSitesForHeader(header: string, data: PreprocessedData): number {
        let count = 0;
        for (const siteData of data.sites.values()) {
            if (siteData.headers.has(header)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Generate semantic recommendations
     */
    private generateRecommendations(
        headerCategories: Map<string, string>,
        headerClassifications: Map<string, HeaderClassification>,
        vendorMappings: Map<string, string>
    ): string[] {
        const recommendations: string[] = [];

        // Check for security headers
        const hasSecurityHeaders = Array.from(headerCategories.values()).includes('security');
        if (!hasSecurityHeaders) {
            recommendations.push('Consider implementing security headers for improved protection');
        }

        // Check for high custom header ratio
        const customHeaders = Array.from(headerCategories.values()).filter(
            cat => cat === 'custom'
        ).length;
        const customRatio = customHeaders / headerCategories.size;
        if (customRatio > 0.3) {
            recommendations.push(
                'High ratio of custom headers detected - consider standardization'
            );
        }

        // Check for low confidence classifications
        const lowConfidenceHeaders = Array.from(headerClassifications.values()).filter(
            classification => classification.discriminativeScore < 0.5
        ).length;
        if (lowConfidenceHeaders > 0) {
            recommendations.push(
                `${lowConfidenceHeaders} headers have low classification confidence`
            );
        }

        // Check vendor diversity
        if (vendorMappings.size > 10) {
            recommendations.push(
                'High vendor diversity detected - consider consolidation for maintenance'
            );
        }

        return recommendations;
    }
}

/**
 * Factory function for SemanticAnalyzerV2
 */
export function createSemanticAnalyzer(): SemanticAnalyzerV2 {
    return new SemanticAnalyzerV2();
}
