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

        // Step 1: Analyze category distribution using preprocessed classifications
        const categoryDistribution = this.analyzeCategoryDistribution(
            headerCategories,
            headerClassifications,
            data
        );

        // Step 2: Create semantic patterns using preprocessed data
        const headerPatterns = this.createSemanticPatterns(headerClassifications, data, options);

        // Step 3: Analyze vendor detections from preprocessed mappings
        const vendorDetections = this.analyzeVendorDetections(
            vendorMappings,
            headerClassifications,
            data
        );

        // Step 4: Generate V2-native insights
        const insights = this.generateSemanticInsights(
            headerCategories,
            headerClassifications,
            vendorMappings,
            data
        );

        // Step 5: Calculate quality metrics
        const qualityMetrics = this.calculateQualityMetrics(
            headerCategories,
            headerClassifications,
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
     * Analyze category distribution from preprocessed classifications
     */
    private analyzeCategoryDistribution(
        headerCategories: Map<string, string>,
        headerClassifications: Map<string, HeaderClassification>,
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
     * Generate V2-native semantic insights
     */
    private generateSemanticInsights(
        headerCategories: Map<string, string>,
        headerClassifications: Map<string, HeaderClassification>,
        vendorMappings: Map<string, string>,
        _data: PreprocessedData
    ): SemanticInsightsV2 {
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
     * Calculate semantic quality metrics
     */
    private calculateQualityMetrics(
        headerCategories: Map<string, string>,
        headerClassifications: Map<string, HeaderClassification>,
        _data: PreprocessedData
    ): SemanticQualityMetrics {
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
