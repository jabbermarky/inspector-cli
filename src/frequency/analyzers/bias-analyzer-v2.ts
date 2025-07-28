/**
 * BiasAnalyzerV2 - V2 Architecture Implementation
 * 
 * Complete rewrite of bias detection for V2 pipeline integration.
 * This analyzer implements FrequencyAnalyzer<BiasSpecificData> interface
 * and uses preprocessed data as single source of truth.
 * 
 * Key architectural improvements:
 * - Zero V1 dependencies
 * - Uses preprocessed data instead of raw DetectionDataPoint[]
 * - Integrates with other V2 analyzers via dependency injection
 * - Maintains statistical algorithm sophistication
 * - Follows V2 interface patterns
 */

import { createModuleLogger } from '../../utils/logger.js';
import type {
    FrequencyAnalyzer,
    PreprocessedData,
    AnalysisOptions,
    AnalysisResult,
    AnalysisMetadata,
    VendorSpecificData,
    SemanticSpecificData,
    PatternDiscoverySpecificData,
} from '../types/analyzer-interface.js';
import type {
    BiasSpecificData,
    CMSDistributionV2,
    ConcentrationMetrics,
    HeaderCMSCorrelationV2,
    BiasWarning,
    BiasStatisticalSummary,
    OverallHeaderMetrics,
    CMSSpecificMetrics,
    ConditionalProbabilityMatrix,
    PlatformSpecificityScore,
    BiasAdjustmentFactors,
    RecommendationRiskAssessment,
    TechnologyBiasAssessment,
    SemanticBiasAssessment,
    PatternDiscoveryBiasAssessment,
    CMSStats,
    ConditionalProbability,
    RiskFactor,
    VendorConcentrationBias,
    TechnologyStackBias,
    CategoryBias,
    HeaderClassificationBias,
    EmergingPatternBias,
    DiscoveryBias,
    ValidationHeaderContext,
    SemanticHeaderContext,
    VendorHeaderContext,
//    WeightingStrategy,
} from '../types/bias-analysis-types-v2.js';

const logger = createModuleLogger('bias-analyzer-v2');

/**
 * V2 Bias Analyzer - Pure V2 architecture implementation
 * 
 * Implements FrequencyAnalyzer<BiasSpecificData> interface and integrates
 * with the V2 pipeline while preserving all statistical algorithm sophistication.
 */
export class BiasAnalyzerV2 implements FrequencyAnalyzer<BiasSpecificData> {
    private vendorData?: VendorSpecificData;
    private semanticData?: SemanticSpecificData;
    private patternDiscoveryData?: PatternDiscoverySpecificData;

    getName(): string {
        return 'BiasAnalyzerV2';
    }

    /**
     * Dependency injection for cross-analyzer insights
     * These methods allow other analyzers to provide context for enhanced bias detection
     */
    setVendorData(vendorData: VendorSpecificData): void {
        this.vendorData = vendorData;
        logger.info('Vendor data injected for technology bias analysis');
    }

    setSemanticData(semanticData: SemanticSpecificData): void {
        this.semanticData = semanticData;
        logger.info('Semantic data injected for category bias analysis');
    }

    setPatternDiscoveryData(patternDiscoveryData: PatternDiscoverySpecificData): void {
        this.patternDiscoveryData = patternDiscoveryData;
        logger.info('Pattern discovery data injected for emerging pattern bias analysis');
    }

    /**
     * Main analysis method - implements FrequencyAnalyzer interface
     * 
     * Analyzes preprocessed data for bias patterns and generates comprehensive
     * bias assessment with cross-analyzer insights.
     */
    async analyze(
        data: PreprocessedData,
        options: AnalysisOptions
    ): Promise<AnalysisResult<BiasSpecificData>> {
        logger.info('Starting V2 bias analysis', {
            totalSites: data.totalSites,
            minOccurrences: options.minOccurrences,
            hasVendorData: !!this.vendorData,
            hasSemanticData: !!this.semanticData,
            hasPatternDiscoveryData: !!this.patternDiscoveryData,
        });

        const startTime = Date.now();

        try {
            // Step 1: Analyze CMS distribution from preprocessed data
            const cmsDistribution = this.analyzeCMSDistribution(data);
            logger.info('CMS distribution analysis completed', {
                totalPlatforms: cmsDistribution.distributions.size,
                concentrationScore: cmsDistribution.concentrationScore,
                dominantPlatforms: cmsDistribution.dominantPlatforms.length,
            });

            // Step 2: Calculate concentration metrics
            const concentrationMetrics = this.calculateConcentrationMetrics(cmsDistribution);

            // Step 3: Analyze header-CMS correlations
            const headerCorrelations = await this.calculateHeaderCorrelations(data, cmsDistribution, options);
            logger.info('Header correlation analysis completed', {
                correlationsAnalyzed: headerCorrelations.size,
            });

            // Step 4: Calculate platform specificity scores
            const platformSpecificityScores = this.calculatePlatformSpecificityScores(headerCorrelations);

            // Step 5: Generate bias warnings
            const biasWarnings = this.generateBiasWarnings(
                cmsDistribution,
                concentrationMetrics,
                headerCorrelations
            );

            // Step 6: Generate statistical summary
            const statisticalSummary = this.generateStatisticalSummary(
                headerCorrelations,
                concentrationMetrics,
                data.totalSites
            );

            // Step 7: Cross-analyzer bias assessments (if data available)
            const technologyBias = this.vendorData ? 
                this.assessTechnologyBias(this.vendorData, cmsDistribution, headerCorrelations) : 
                undefined;
            
            const semanticBias = this.semanticData ? 
                this.assessSemanticBias(this.semanticData, cmsDistribution, headerCorrelations) : 
                undefined;
            
            const patternDiscoveryBias = this.patternDiscoveryData ? 
                this.assessPatternDiscoveryBias(this.patternDiscoveryData, cmsDistribution) : 
                undefined;

            // Compile bias-specific data
            const biasSpecificData: BiasSpecificData = {
                cmsDistribution,
                concentrationMetrics,
                headerCorrelations,
                biasWarnings,
                platformSpecificityScores,
                statisticalSummary,
                technologyBias,
                semanticBias,
                patternDiscoveryBias,
            };

            // Create analysis metadata
            const metadata: AnalysisMetadata = {
                analyzer: this.getName(),
                analyzedAt: new Date().toISOString(),
                totalPatternsFound: headerCorrelations.size,
                totalPatternsAfterFiltering: headerCorrelations.size, // Filtering already applied
                options,
            };

            // Phase 6.2: Apply advanced statistical validation
            const statisticallyEnhancedData = this.enhanceWithStatisticalValidation(biasSpecificData, data);
            
            // Phase 6.3: Apply enhanced reporting integration
            const enhancedBiasData = this.enhanceWithReportingIntegration(statisticallyEnhancedData);

            const duration = Date.now() - startTime;
            logger.info('V2 bias analysis completed', {
                duration: `${duration}ms`,
                headerCorrelations: headerCorrelations.size,
                biasWarnings: enhancedBiasData.biasWarnings.length,
                concentrationScore: concentrationMetrics.herfindahlIndex,
                overallBiasRisk: concentrationMetrics.overallBiasRisk,
                statisticalValidation: 'enhanced',
            });

            return {
                patterns: new Map(), // Bias analyzer doesn't produce pattern data
                totalSites: data.totalSites,
                metadata,
                analyzerSpecific: enhancedBiasData,
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('V2 bias analysis failed', { error: errorMessage });
            throw error;
        }
    }

    // Private methods for bias analysis algorithms
    // These preserve the sophisticated statistical methods from V1 while using V2 data

    /**
     * Analyze CMS distribution using preprocessed site data
     * This replaces manual DetectionDataPoint processing with preprocessed data consumption
     * 
     * Key V2 improvements:
     * - Uses preprocessed site data as single source of truth
     * - Leverages technology stack information for enhanced categorization
     * - Preserves sophisticated HHI and diversity calculations from V1
     */
    private analyzeCMSDistribution(data: PreprocessedData): CMSDistributionV2 {
        logger.info('Analyzing CMS distribution from preprocessed data');

        const distributions = new Map<string, CMSStats>();
        const siteCategories = {
            cms: 0,
            enterprise: 0,
            cdn: 0,
            unknown: 0,
        };

        // Process preprocessed site data instead of raw DetectionDataPoint[]
        for (const [_siteUrl, siteData] of data.sites) {
            const cms = siteData.cms || 'Unknown';
            
            // Initialize CMS stats if not exists
            if (!distributions.has(cms)) {
                distributions.set(cms, {
                    count: 0,
                    percentage: 0, // Will be calculated later
                    sites: new Set<string>(),
                    averageConfidence: 0,
                    versionDetections: new Map(),
                    technologyStack: [],
                });
            }

            const cmsStats = distributions.get(cms)!;
            cmsStats.count++;
            cmsStats.sites.add(_siteUrl);
            
            // Accumulate confidence for later averaging
            cmsStats.averageConfidence += siteData.confidence;

            // Enhanced categorization using preprocessed technology stack
            if (cms !== 'Unknown') {
                siteCategories.cms++;
                
                // Extract technology stack for CMS sites
                if (siteData.technologies && siteData.technologies.size > 0) {
                    cmsStats.technologyStack = Array.from(siteData.technologies);
                }
            } else {
                // Enhanced Unknown site categorization using technology signals
                const techStack = siteData.technologies ? Array.from(siteData.technologies) : [];
                
                if (this.isEnterpriseSite(techStack, siteData.headers)) {
                    siteCategories.enterprise++;
                } else if (this.isCDNSite(techStack, siteData.headers)) {
                    siteCategories.cdn++;
                } else {
                    siteCategories.unknown++;
                }
            }
        }

        // Calculate percentages and average confidences
        const totalSites = data.totalSites;
        for (const [_cms, stats] of distributions) {
            stats.percentage = (stats.count / totalSites) * 100;
            stats.averageConfidence = stats.count > 0 ? stats.averageConfidence / stats.count : 0;
        }

        // Calculate concentration score using HHI algorithm (preserved from V1)
        const concentrationScore = this.calculateHerfindahlIndex(distributions);

        // Identify dominant platforms (>60% representation)
        const dominantPlatforms: string[] = [];
        for (const [cms, stats] of distributions) {
            if (stats.percentage > 60) {
                dominantPlatforms.push(cms);
            }
        }

        // Calculate Shannon diversity index
        const diversityIndex = this.calculateShannonDiversity(distributions, totalSites);

        logger.info('CMS distribution analysis completed', {
            totalPlatforms: distributions.size,
            concentrationScore: concentrationScore.toFixed(3),
            diversityIndex: diversityIndex.toFixed(3),
            dominantPlatforms: dominantPlatforms.length,
            siteCategories,
        });

        return {
            distributions,
            totalSites,
            concentrationScore,
            dominantPlatforms,
            diversityIndex,
            enterpriseSites: siteCategories.enterprise,
            unknownSites: siteCategories.unknown,
            siteCategories,
        };
    }

    /**
     * Calculate header-CMS correlations using preprocessed data
     * This replaces manual header collection with preprocessed pattern consumption
     * 
     * Key V2 improvements:
     * - Uses preprocessed header data from site.headers Map
     * - Eliminates independent header classification calls
     * - Applies consistent minOccurrences filtering with other analyzers
     * - Preserves sophisticated statistical calculations from V1
     */
    private async calculateHeaderCorrelations(
        data: PreprocessedData,
        cmsDistribution: CMSDistributionV2,
        options: AnalysisOptions
    ): Promise<Map<string, HeaderCMSCorrelationV2>> {
        logger.info('Calculating header-CMS correlations from preprocessed data');

        const correlations = new Map<string, HeaderCMSCorrelationV2>();
        const headerStats = new Map<string, Map<string, Set<string>>>(); // header -> cms -> sites
        const headerValueStats = new Map<string, Map<string, Set<string>>>(); // header -> value -> sites

        // Collect header-CMS correlations from preprocessed site data
        // This replaces the V1 manual DetectionDataPoint processing
        for (const [_siteUrl, siteData] of data.sites) {
            const cms = siteData.cms || 'Unknown';
            
            // Process all headers for this site (already preprocessed and filtered by DataPreprocessor)
            for (const [headerName, headerValues] of siteData.headers) {
                // Initialize header stats
                if (!headerStats.has(headerName)) {
                    headerStats.set(headerName, new Map());
                    headerValueStats.set(headerName, new Map());
                }

                // Track site for this header-CMS combination
                const cmsMap = headerStats.get(headerName)!;
                if (!cmsMap.has(cms)) {
                    cmsMap.set(cms, new Set());
                }
                cmsMap.get(cms)!.add(_siteUrl);

                // Track header values for value diversity analysis
                const valueMap = headerValueStats.get(headerName)!;
                for (const headerValue of headerValues) {
                    if (!valueMap.has(headerValue)) {
                        valueMap.set(headerValue, new Set());
                    }
                    valueMap.get(headerValue)!.add(_siteUrl);
                }
            }
        }

        // Calculate correlations for each header
        for (const [headerName, cmsStats] of headerStats) {
            const overallOccurrences = Array.from(cmsStats.values())
                .reduce((sum, siteSet) => sum + siteSet.size, 0);

            // Apply minOccurrences filter (consistent with other V2 analyzers)
            if (overallOccurrences < options.minOccurrences) {
                continue;
            }

            // Calculate overall metrics
            const overallMetrics = this.calculateOverallHeaderMetrics(
                headerName,
                cmsStats,
                headerValueStats.get(headerName)!,
                data
            );

            // Calculate per-CMS metrics with statistical significance
            const perCMSMetrics = this.calculatePerCMSMetrics(
                headerName,
                cmsStats,
                cmsDistribution,
                overallOccurrences,
                data
            );

            // Calculate conditional probabilities P(CMS|header) and P(header|CMS)
            const conditionalProbabilities = this.calculateConditionalProbabilities(
                cmsStats,
                cmsDistribution,
                overallOccurrences
            );

            // Calculate platform specificity (preserves V1 two-tier algorithm)
            const platformSpecificity = this.calculatePlatformSpecificity(
                perCMSMetrics,
                cmsDistribution,
                conditionalProbabilities,
                overallOccurrences
            );

            // Calculate bias adjustments using weighted methodology
            const biasAdjustments = this.calculateBiasAdjustments(
                perCMSMetrics,
                cmsDistribution
            );

            // Assess recommendation risk based on multiple factors
            const recommendationRisk = this.assessRecommendationRisk(
                overallMetrics,
                platformSpecificity,
                perCMSMetrics,
                cmsDistribution
            );

            // Add cross-analyzer context if available (V2-only enhancement)
            const semanticContext = this.getSemanticContext(headerName);
            const vendorContext = this.getVendorContext(headerName);
            const validationContext = this.getValidationContext(headerName, data);

            const correlation: HeaderCMSCorrelationV2 = {
                headerName,
                overallMetrics,
                perCMSMetrics,
                conditionalProbabilities,
                platformSpecificity,
                biasAdjustments,
                recommendationRisk,
                semanticContext,
                vendorContext,
                validationContext,
            };

            correlations.set(headerName, correlation);
        }

        logger.info('Header correlation calculation completed', {
            totalHeaders: headerStats.size,
            filteredHeaders: correlations.size,
            minOccurrences: options.minOccurrences,
            avgCorrelationsPerHeader: correlations.size > 0 ? 
                Array.from(correlations.values())
                    .reduce((sum, c) => sum + c.perCMSMetrics.size, 0) / correlations.size : 0,
        });

        return correlations;
    }

    // Placeholder implementations for sophisticated algorithms
    // These will be implemented in subsequent phases with full V1 algorithm preservation

    private calculateConcentrationMetrics(cmsDistribution: CMSDistributionV2): ConcentrationMetrics {
        /**
         * Calculate sophisticated concentration metrics including HHI, Shannon diversity, and risk assessments
         * Preserves V1 statistical algorithm sophistication
         */
        const hhi = cmsDistribution.concentrationScore;
        
        return {
            herfindahlIndex: hhi,
            shannonDiversity: cmsDistribution.diversityIndex,
            effectiveNumberOfPlatforms: Math.exp(cmsDistribution.diversityIndex),
            dominanceRatio: this.calculateDominanceRatio(cmsDistribution),
            concentrationRisk: hhi > 0.6 ? 'high' : hhi > 0.3 ? 'medium' : 'low',
            diversityRisk: cmsDistribution.diversityIndex < 1.0 ? 'high' : 
                          cmsDistribution.diversityIndex < 2.0 ? 'medium' : 'low',
            overallBiasRisk: hhi > 0.6 || cmsDistribution.diversityIndex < 1.0 ? 'high' : 
                            hhi > 0.3 || cmsDistribution.diversityIndex < 2.0 ? 'medium' : 'low',
        };
    }

    private calculatePlatformSpecificityScores(
        headerCorrelations: Map<string, HeaderCMSCorrelationV2>
    ): Map<string, number> {
        const scores = new Map<string, number>();
        for (const [headerName, correlation] of headerCorrelations) {
            scores.set(headerName, correlation.platformSpecificity.score);
        }
        return scores;
    }

    private generateBiasWarnings(
        cmsDistribution: CMSDistributionV2,
        concentrationMetrics: ConcentrationMetrics,
        headerCorrelations: Map<string, HeaderCMSCorrelationV2>
    ): BiasWarning[] {
        /**
         * Generate comprehensive bias warnings (enhanced from V1)
         * Covers concentration, platform dominance, diversity, and cross-analyzer insights
         */
        const warnings: BiasWarning[] = [];

        // 1. High concentration warning (from V1)
        if (concentrationMetrics.concentrationRisk === 'high') {
            warnings.push({
                type: 'concentration',
                severity: 'warning',
                message: `High dataset concentration (${Math.round(concentrationMetrics.herfindahlIndex * 100)}%) - recommendations may be biased`,
                metricValue: concentrationMetrics.herfindahlIndex,
                threshold: 0.6,
                recommendation: 'Consider expanding dataset diversity across CMS platforms',
            });
        }

        // 2. Platform dominance warnings (from V1)
        for (const [cms, stats] of cmsDistribution.distributions) {
            if (stats.percentage > 60) {
                warnings.push({
                    type: 'platform_dominance',
                    severity: 'warning',
                    message: `Dataset heavily skewed toward ${cms} (${Math.round(stats.percentage)}%) - high-frequency headers may be platform-specific`,
                    affectedPlatforms: [cms],
                    metricValue: stats.percentage,
                    threshold: 60,
                    recommendation: 'Filter out platform-specific patterns or apply bias adjustment',
                });
            }
        }

        // 3. Low diversity warning (from V1)
        const cmsTypes = cmsDistribution.distributions.size;
        if (cmsTypes <= 2) {
            warnings.push({
                type: 'low_diversity',
                severity: 'warning',
                message: `Low CMS diversity (${cmsTypes} types) - may not represent general web patterns`,
                metricValue: cmsTypes,
                threshold: 3,
                recommendation: 'Expand dataset to include more CMS platforms',
            });
        }

        // 4. Unknown sites warning (from V1)
        const unknownPercentage = cmsDistribution.distributions.get('Unknown')?.percentage || 0;
        if (unknownPercentage > 30) {
            warnings.push({
                type: 'unknown_sites',
                severity: 'info',
                message: `High percentage of unidentified sites (${Math.round(unknownPercentage)}%) - detection accuracy may be low`,
                metricValue: unknownPercentage,
                threshold: 30,
                recommendation: 'Improve CMS detection algorithms or accept uncertainty',
            });
        }

        // 5. Header-specific bias warnings
        const highSpecificityHeaders: string[] = [];
        for (const [headerName, correlation] of headerCorrelations) {
            if (correlation.platformSpecificity.score > 0.7) {
                highSpecificityHeaders.push(headerName);
            }
        }

        if (highSpecificityHeaders.length > 0) {
            warnings.push({
                type: 'header_specificity',
                severity: 'info',
                message: `${highSpecificityHeaders.length} headers show high platform specificity`,
                affectedHeaders: highSpecificityHeaders.slice(0, 10), // Limit to first 10
                metricValue: highSpecificityHeaders.length,
                threshold: 1,
                recommendation: 'Review platform-specific headers for filtering decisions',
            });
        }

        // 6. Cross-analyzer warnings (V2-only enhancement)
        if (this.vendorData) {
            const vendorConcentration = this.assessVendorConcentration();
            if (vendorConcentration > 0.7) {
                warnings.push({
                    type: 'cross_analyzer',
                    severity: 'warning',
                    message: 'High vendor concentration detected - technology stack may be biased',
                    relatedAnalyzer: 'vendor',
                    metricValue: vendorConcentration,
                    threshold: 0.7,
                    recommendation: 'Consider technology diversity in analysis',
                    crossAnalyzerEvidence: { vendorConcentration },
                });
            }
        }

        return warnings;
    }

    /**
     * Assess vendor concentration from injected vendor data (V2-only enhancement)
     */
    private assessVendorConcentration(): number {
        if (!this.vendorData || !this.vendorData.vendorsByHeader) {
            return 0;
        }

        // Calculate vendor concentration using HHI methodology
        const vendorCounts = new Map<string, number>();
        let totalHeaders = 0;

        for (const [_headerName, vendorDetection] of this.vendorData.vendorsByHeader) {
            if (vendorDetection && vendorDetection.vendor && vendorDetection.vendor.name) {
                const vendorName = vendorDetection.vendor.name;
                vendorCounts.set(vendorName, (vendorCounts.get(vendorName) || 0) + 1);
                totalHeaders++;
            }
        }

        if (totalHeaders === 0) return 0;

        // Calculate HHI for vendor concentration
        let hhi = 0;
        for (const count of vendorCounts.values()) {
            const share = count / totalHeaders;
            hhi += share * share;
        }

        return hhi; // Already normalized (0-1)
    }

    private generateStatisticalSummary(
        headerCorrelations: Map<string, HeaderCMSCorrelationV2>,
        concentrationMetrics: ConcentrationMetrics,
        totalSites: number
    ): BiasStatisticalSummary {
        // Comprehensive statistical summary with chi-square tests, confidence distributions, and quality scores
        
        let highConfidence = 0;
        let mediumConfidence = 0;
        let lowConfidence = 0;
        let adequate = 0;
        let marginal = 0;
        let inadequate = 0;
        let totalChiSquare = 0;
        let totalPValue = 0;
        let significantHeaders = 0;

        for (const correlation of headerCorrelations.values()) {
            // Count confidence levels
            switch (correlation.recommendationRisk.recommendationConfidence) {
                case 'high':
                    highConfidence++;
                    break;
                case 'medium':
                    mediumConfidence++;
                    break;
                case 'low':
                    lowConfidence++;
                    break;
            }

            // Calculate chi-square statistics for this header
            let headerChiSquare = 0;
            let _significantCMSCount = 0;
            
            for (const cmsMetrics of correlation.perCMSMetrics.values()) {
                headerChiSquare += cmsMetrics.chiSquareContribution;
                if (cmsMetrics.isStatisticallySignificant) {
                    _significantCMSCount++;
                }
            }

            totalChiSquare += headerChiSquare;
            
            // Calculate p-value using chi-square distribution
            // Simple approximation for degrees of freedom = number of CMS platforms - 1
            const degreesOfFreedom = Math.max(1, correlation.perCMSMetrics.size - 1);
            const pValue = this.calculateChiSquarePValue(headerChiSquare, degreesOfFreedom);
            totalPValue += pValue;
            
            if (pValue < 0.05) {
                significantHeaders++;
            }

            // Assess sample size adequacy based on minimum expected frequency
            let minExpectedFreq = Infinity;
            for (const cmsMetrics of correlation.perCMSMetrics.values()) {
                minExpectedFreq = Math.min(minExpectedFreq, cmsMetrics.expectedOccurrences);
            }

            // Sample size adequacy rules: expected frequency ≥ 5 adequate, ≥ 2 marginal, < 2 inadequate
            if (minExpectedFreq >= 5) {
                adequate++;
            } else if (minExpectedFreq >= 2) {
                marginal++;
            } else {
                inadequate++;
            }
        }

        const headerCount = headerCorrelations.size;
        const averageChiSquare = headerCount > 0 ? totalChiSquare / headerCount : 0;
        const averagePValue = headerCount > 0 ? totalPValue / headerCount : 1;

        return {
            totalHeadersAnalyzed: headerCount,
            headersWithBias: Array.from(headerCorrelations.values())
                .filter(c => c.platformSpecificity.score > 0.5).length,
            averagePlatformSpecificity: headerCount > 0 ? 
                Array.from(headerCorrelations.values())
                    .reduce((sum, c) => sum + c.platformSpecificity.score, 0) / headerCount : 0,
            averageBiasAdjustment: headerCount > 0 ?
                Array.from(headerCorrelations.values())
                    .reduce((sum, c) => sum + c.biasAdjustments.adjustmentFactor, 0) / headerCount : 1,
            confidenceDistribution: {
                high: highConfidence,
                medium: mediumConfidence,
                low: lowConfidence,
            },
            chiSquareResults: {
                statisticallySignificantHeaders: significantHeaders,
                averageChiSquare,
                averagePValue,
                significanceThreshold: 0.05,
            },
            sampleSizeAdequacy: {
                adequate,
                marginal,
                inadequate,
            },
            datasetQualityScore: this.calculateDatasetQualityScore(concentrationMetrics, totalSites),
            biasRiskScore: concentrationMetrics.herfindahlIndex,
            recommendationReliabilityScore: 1 - concentrationMetrics.herfindahlIndex,
        };
    }

    // Cross-analyzer bias assessment methods

    private assessTechnologyBias(
        vendorData: VendorSpecificData,
        cmsDistribution: CMSDistributionV2,
        headerCorrelations: Map<string, HeaderCMSCorrelationV2>
    ): TechnologyBiasAssessment {
        /**
         * Phase 6: Technology Vendor Bias Detection (V2-only enhancement)
         * 
         * Analyzes vendor concentration patterns to detect technology stack bias
         * that may skew header frequency analysis. This cross-analyzer insight
         * is only possible with V2's dependency injection architecture.
         */
        
        logger.info('Assessing technology bias using vendor data', {
            totalVendorHeaders: vendorData.vendorsByHeader.size,
            totalVendorsDetected: vendorData.summary?.totalVendorsDetected || 0,
        });

        // 1. Calculate vendor concentration across all detected headers
        const vendorConcentration = this.calculateVendorConcentration(vendorData);
        
        // 2. Analyze technology stack bias patterns
        const technologyStackBias = this.analyzeTechnologyStackBias(vendorData, cmsDistribution);
        
        // 3. Identify dominant vendors that may bias results
        const dominantVendors = this.identifyDominantVendors(vendorData, headerCorrelations);
        
        // 4. Detect technology gaps that may indicate incomplete representation
        const technologyGaps = this.detectTechnologyGaps(vendorData, cmsDistribution);
        
        // 5. Identify biased technology categories
        const biasedTechnologyCategories = this.identifyBiasedTechnologyCategories(vendorData);
        
        // 6. Determine overall technology bias level
        const overallTechnologyBias = this.calculateOverallTechnologyBias(
            vendorConcentration,
            dominantVendors,
            technologyStackBias
        );
        
        // 7. Generate technology bias mitigation recommendations
        const recommendations = this.generateTechnologyBiasRecommendations(
            overallTechnologyBias,
            dominantVendors,
            technologyGaps,
            biasedTechnologyCategories
        );

        logger.info('Technology bias assessment completed', {
            overallBias: overallTechnologyBias,
            dominantVendors: dominantVendors.length,
            biasedCategories: biasedTechnologyCategories.length,
            recommendations: recommendations.length,
        });

        return {
            vendorConcentration,
            technologyStackBias,
            overallTechnologyBias,
            dominantVendors,
            technologyGaps,
            biasedTechnologyCategories,
            recommendations,
        };
    }

    private assessSemanticBias(
        semanticData: SemanticSpecificData,
        cmsDistribution: CMSDistributionV2,
        headerCorrelations: Map<string, HeaderCMSCorrelationV2>
    ): SemanticBiasAssessment {
        /**
         * Phase 6.2: Semantic Category Bias Analysis (V2-only enhancement)
         * 
         * Analyzes semantic header categorization patterns to detect category bias
         * that may affect filtering and recommendation decisions. This cross-analyzer
         * insight leverages SemanticAnalyzerV2's categorization data.
         */
        
        logger.info('Assessing semantic bias using semantic analyzer data', {
            categorizedHeaders: semanticData.insights?.categorizedHeaders || 0,
            totalCategories: semanticData.categoryDistribution?.size || 0,
        });

        // 1. Analyze category bias across semantic classifications
        const categoryBias = this.analyzeSemanticCategoryBias(semanticData, cmsDistribution);
        
        // 2. Detect header classification bias patterns
        const headerClassificationBias = this.detectHeaderClassificationBias(
            semanticData, 
            headerCorrelations
        );
        
        // 3. Identify over/under-represented categories
        const { overrepresentedCategories, underrepresentedCategories } = 
            this.identifySemanticCategoryImbalances(semanticData);
        
        // 4. Assess misclassification risk
        const misclassificationRisk = this.assessSemanticMisclassificationRisk(semanticData);
        
        // 5. Determine overall semantic bias level
        const overallSemanticBias = this.calculateOverallSemanticBias(
            categoryBias,
            headerClassificationBias,
            overrepresentedCategories.length,
            underrepresentedCategories.length
        );
        
        // 6. Generate semantic bias mitigation recommendations
        const recommendations = this.generateSemanticBiasRecommendations(
            overallSemanticBias,
            overrepresentedCategories,
            underrepresentedCategories,
            misclassificationRisk
        );

        logger.info('Semantic bias assessment completed', {
            overallBias: overallSemanticBias,
            categoryBiases: categoryBias.size,
            classificationBiases: headerClassificationBias.length,
            recommendations: recommendations.length,
        });

        return {
            categoryBias,
            headerClassificationBias,
            overallSemanticBias,
            overrepresentedCategories,
            underrepresentedCategories,
            misclassificationRisk: misclassificationRisk.map(risk => `${risk.header}: ${risk.recommendation}`),
            recommendations,
        };
    }

    private assessPatternDiscoveryBias(
        patternDiscoveryData: PatternDiscoverySpecificData,
        cmsDistribution: CMSDistributionV2
    ): PatternDiscoveryBiasAssessment {
        /**
         * Assess bias in pattern discovery process using PatternDiscoveryV2 insights
         * This cross-analyzer analysis is only possible in V2 architecture
         */
        
        // 1. Assess bias in emerging patterns
        const emergingPatternBias = this.assessEmergingPatternBias(
            patternDiscoveryData,
            cmsDistribution
        );
        
        // 2. Calculate overall discovery bias metrics
        const discoveryBias = this.calculateDiscoveryBias(
            patternDiscoveryData,
            cmsDistribution
        );
        
        // 3. Identify biased and underdiscovered patterns
        const biasedPatterns = this.identifyBiasedEmergingPatterns(emergingPatternBias);
        const underdiscoveredPatterns = this.identifyUnderdiscoveredPatterns(
            patternDiscoveryData,
            cmsDistribution
        );
        const discoveryGaps = this.identifyDiscoveryGaps(patternDiscoveryData);
        
        // 4. Determine overall discovery bias level
        const overallDiscoveryBias = this.calculateOverallDiscoveryBias(
            emergingPatternBias,
            discoveryBias,
            biasedPatterns.length,
            underdiscoveredPatterns.length
        );
        
        // 5. Generate recommendations
        const recommendations = this.generatePatternDiscoveryRecommendations(
            overallDiscoveryBias,
            biasedPatterns,
            underdiscoveredPatterns,
            discoveryGaps
        );
        
        logger.debug('Pattern discovery bias assessment completed', {
            emergingPatterns: emergingPatternBias.length,
            biasedPatterns: biasedPatterns.length,
            underdiscoveredPatterns: underdiscoveredPatterns.length,
            overallBias: overallDiscoveryBias,
            recommendations: recommendations.length,
        });
        
        return {
            emergingPatternBias,
            discoveryBias,
            overallDiscoveryBias,
            biasedEmergingPatterns: biasedPatterns,
            underdiscoveredPatterns,
            discoveryGaps,
            recommendations,
        };
    }

    // Helper methods for pattern discovery bias assessment
    
    private assessEmergingPatternBias(
        patternDiscoveryData: PatternDiscoverySpecificData,
        cmsDistribution: CMSDistributionV2
    ): EmergingPatternBias[] {
        /**
         * Assess bias in emerging pattern detection based on dataset composition
         */
        const biases: EmergingPatternBias[] = [];
        
        // Analyze each discovered pattern for platform bias
        for (const [patternName, discoveredPattern] of patternDiscoveryData.discoveredPatterns) {
            const platformSpecificity = this.calculatePatternPlatformSpecificity(
                discoveredPattern,
                cmsDistribution
            );
            
            const datasetBiasImpact = this.calculateDatasetBiasImpact(
                discoveredPattern,
                cmsDistribution
            );
            
            const biasRisk = this.determinePatternBiasRisk(
                platformSpecificity,
                datasetBiasImpact,
                discoveredPattern
            );
            
            biases.push({
                pattern: patternName,
                discoveryConfidence: discoveredPattern.confidence || 0.5,
                datasetBiasImpact,
                platformSpecificity,
                biasRisk,
                validation: this.getPatternValidation(discoveredPattern)
            });
        }
        
        return biases;
    }
    
    private calculateDiscoveryBias(
        patternDiscoveryData: PatternDiscoverySpecificData,
        cmsDistribution: CMSDistributionV2
    ): DiscoveryBias {
        /**
         * Calculate overall discovery bias metrics
         */
        const totalPatterns = patternDiscoveryData.discoveredPatterns.size;
        const platformCount = cmsDistribution.distributions.size;
        
        // Calculate discovery completeness (how thoroughly we've discovered patterns)
        const expectedPatternsPerPlatform = 10; // Baseline expectation
        const expectedTotalPatterns = platformCount * expectedPatternsPerPlatform;
        const discoveryCompleteness = Math.min(totalPatterns / expectedTotalPatterns, 1.0);
        
        // Calculate platform discovery balance
        const platformDiscoveryBalance = this.calculatePlatformDiscoveryBalance(
            patternDiscoveryData,
            cmsDistribution
        );
        
        // Calculate category discovery balance
        const categoryDiscoveryBalance = this.calculateCategoryDiscoveryBalance(
            patternDiscoveryData
        );
        
        // Determine bias impact on discovery
        const biasImpactOnDiscovery = this.determineBiasImpactOnDiscovery(
            discoveryCompleteness,
            platformDiscoveryBalance,
            categoryDiscoveryBalance
        );
        
        return {
            discoveryCompleteness,
            platformDiscoveryBalance,
            categoryDiscoveryBalance,
            biasImpactOnDiscovery
        };
    }
    
    private identifyBiasedEmergingPatterns(
        emergingPatternBias: EmergingPatternBias[]
    ): string[] {
        /**
         * Identify patterns that show significant bias
         */
        return emergingPatternBias
            .filter(bias => bias.biasRisk === 'high' || 
                          (bias.biasRisk === 'medium' && bias.platformSpecificity > 0.8))
            .map(bias => bias.pattern);
    }
    
    private identifyUnderdiscoveredPatterns(
        patternDiscoveryData: PatternDiscoverySpecificData,
        cmsDistribution: CMSDistributionV2
    ): string[] {
        /**
         * Identify patterns that may be underdiscovered due to bias
         */
        const underdiscovered: string[] = [];
        
        // Look for platforms with low pattern discovery rates
        const discoveryByPlatform = this.calculateDiscoveryByPlatform(
            patternDiscoveryData,
            cmsDistribution
        );
        
        for (const [platform, discoveryRate] of discoveryByPlatform) {
            if (discoveryRate < 0.3) { // Less than 30% of expected patterns
                underdiscovered.push(`${platform} patterns may be underdiscovered`);
            }
        }
        
        return underdiscovered;
    }
    
    private identifyDiscoveryGaps(
        patternDiscoveryData: PatternDiscoverySpecificData
    ): string[] {
        /**
         * Identify gaps in pattern discovery coverage
         */
        const gaps: string[] = [];
        
        const metrics = patternDiscoveryData.discoveryMetrics;
        
        if (metrics.newVendorsDetected === 0) {
            gaps.push('No new vendors detected - may indicate discovery limitations');
        }
        
        if (metrics.evolutionPatternsFound < 2) {
            gaps.push('Limited pattern evolution detection - temporal bias possible');
        }
        
        if (metrics.anomaliesDetected === 0) {
            gaps.push('No anomalies detected - may miss edge cases due to dataset bias');
        }
        
        if (metrics.coveragePercentage < 0.8) {
            gaps.push('Low pattern coverage - significant discovery gaps exist');
        }
        
        return gaps;
    }
    
    private calculateOverallDiscoveryBias(
        emergingPatternBias: EmergingPatternBias[],
        discoveryBias: DiscoveryBias,
        biasedPatternsCount: number,
        underdiscoveredPatternsCount: number
    ): 'low' | 'medium' | 'high' {
        /**
         * Calculate overall discovery bias level
         */
        let biasScore = 0;
        
        // Factor in discovery completeness
        if (discoveryBias.discoveryCompleteness < 0.5) biasScore += 2;
        else if (discoveryBias.discoveryCompleteness < 0.8) biasScore += 1;
        
        // Factor in platform balance
        if (discoveryBias.platformDiscoveryBalance < 0.6) biasScore += 2;
        else if (discoveryBias.platformDiscoveryBalance < 0.8) biasScore += 1;
        
        // Factor in category balance  
        if (discoveryBias.categoryDiscoveryBalance < 0.6) biasScore += 2;
        else if (discoveryBias.categoryDiscoveryBalance < 0.8) biasScore += 1;
        
        // Factor in biased patterns
        if (biasedPatternsCount > 0) {
            biasScore += Math.min(biasedPatternsCount, 3);
        }
        
        // Factor in underdiscovered patterns
        if (underdiscoveredPatternsCount > 0) {
            biasScore += Math.min(underdiscoveredPatternsCount, 2);
        }
        
        if (biasScore >= 6) return 'high';
        if (biasScore >= 3) return 'medium';
        return 'low';
    }
    
    private generatePatternDiscoveryRecommendations(
        overallBias: 'low' | 'medium' | 'high',
        biasedPatterns: string[],
        underdiscoveredPatterns: string[],
        discoveryGaps: string[]
    ): string[] {
        /**
         * Generate actionable recommendations for improving pattern discovery
         */
        const recommendations: string[] = [];
        
        if (overallBias === 'high') {
            recommendations.push('Pattern discovery shows significant bias - review discovery algorithms');
            recommendations.push('Consider targeted pattern discovery for underrepresented platforms');
        }
        
        if (biasedPatterns.length > 0) {
            recommendations.push(`Review biased patterns: ${biasedPatterns.slice(0, 3).join(', ')}`);
            recommendations.push('Apply platform-weighted discovery to reduce pattern bias');
        }
        
        if (underdiscoveredPatterns.length > 0) {
            recommendations.push('Address underdiscovered pattern areas:');
            underdiscoveredPatterns.forEach(pattern => {
                recommendations.push(`  - ${pattern}`);
            });
        }
        
        if (discoveryGaps.length > 0) {
            recommendations.push('Close discovery gaps:');
            discoveryGaps.forEach(gap => {
                recommendations.push(`  - ${gap}`);
            });
        }
        
        if (overallBias === 'medium' || overallBias === 'high') {
            recommendations.push('Implement discovery bias monitoring for future analyses');
        }
        
        return recommendations;
    }

    // Helper methods for algorithm implementation
    // These preserve V1 statistical sophistication

    private calculateHerfindahlIndex(distributions: Map<string, CMSStats>): number {
        const percentages = Array.from(distributions.values()).map(stats => stats.percentage);
        if (percentages.length === 0) return 0;
        if (percentages.length === 1) return 1;

        // Calculate HHI: sum of squares of market shares
        const hhi = percentages.reduce((sum, percentage) => sum + Math.pow(percentage, 2), 0);
        return hhi / 10000; // Normalize to 0-1 scale
    }

    private calculateShannonDiversity(distributions: Map<string, CMSStats>, totalSites: number): number {
        let diversity = 0;
        for (const stats of distributions.values()) {
            if (stats.count > 0) {
                const proportion = stats.count / totalSites;
                diversity -= proportion * Math.log(proportion);
            }
        }
        return diversity;
    }

    private calculateDominanceRatio(cmsDistribution: CMSDistributionV2): number {
        const percentages = Array.from(cmsDistribution.distributions.values())
            .map(stats => stats.percentage)
            .sort((a, b) => b - a);
        
        return percentages.length >= 2 ? percentages[0] / percentages[1] : 1;
    }

    private calculateDatasetQualityScore(concentrationMetrics: ConcentrationMetrics, totalSites: number): number {
        // Combine multiple quality factors into single score
        const diversityScore = Math.min(1, concentrationMetrics.shannonDiversity / 3); // Normalize assuming max diversity ~3
        const concentrationScore = 1 - concentrationMetrics.herfindahlIndex; // Invert so higher is better
        const sampleSizeScore = Math.min(1, Math.log10(totalSites) / Math.log10(1000)); // 1000 sites = 1.0
        
        return (diversityScore + concentrationScore + sampleSizeScore) / 3;
    }

    // Placeholder implementations for detailed algorithm methods
    // These will be fully implemented in subsequent phases

    private isEnterpriseSite(technologies: string[], headers?: Map<string, Set<string>>): boolean {
        // Enhanced enterprise site detection using technology stack and headers
        const enterpriseTech = technologies.some(tech => 
            ['enterprise', 'security', 'load-balancer', 'waf'].includes(tech.toLowerCase())
        );
        
        // Check for enterprise security headers if available
        if (headers) {
            const enterpriseHeaders = ['strict-transport-security', 'content-security-policy', 
                                     'x-frame-options', 'x-content-type-options'];
            const hasEnterpriseHeaders = enterpriseHeaders.some(header => headers.has(header));
            return enterpriseTech || hasEnterpriseHeaders;
        }
        
        return enterpriseTech;
    }

    private isCDNSite(technologies: string[], headers?: Map<string, Set<string>>): boolean {
        // Enhanced CDN site detection using technology stack and headers
        const cdnTech = technologies.some(tech => 
            ['cloudflare', 'akamai', 'fastly', 'cdn', 'edge'].includes(tech.toLowerCase())
        );
        
        // Check for CDN headers if available
        if (headers) {
            const cdnHeaders = ['cf-ray', 'x-amz-cf-id', 'x-served-by', 'x-cache', 'via'];
            const hasCDNHeaders = cdnHeaders.some(header => headers.has(header));
            return cdnTech || hasCDNHeaders;
        }
        
        return cdnTech;
    }

    private calculateOverallHeaderMetrics(
        headerName: string,
        cmsStats: Map<string, Set<string>>,
        valueStats: Map<string, Set<string>>,
        data: PreprocessedData
    ): OverallHeaderMetrics {
        // Calculate total occurrences (unique sites with this header)
        const totalOccurrences = Array.from(cmsStats.values())
            .reduce((sum, siteSet) => sum + siteSet.size, 0);

        // Calculate value diversity metrics
        const uniqueValues = valueStats.size;
        const totalValueOccurrences = Array.from(valueStats.values())
            .reduce((sum, siteSet) => sum + siteSet.size, 0);
        const averageValuesPerSite = totalOccurrences > 0 ? totalValueOccurrences / totalOccurrences : 0;

        // Find most common value
        let mostCommonValue: string | undefined;
        let maxSites = 0;
        for (const [value, sites] of valueStats) {
            if (sites.size > maxSites) {
                maxSites = sites.size;
                mostCommonValue = value;
            }
        }

        // Calculate page type distribution from preprocessed data
        let mainpageOnly = 0;
        let robotsOnly = 0;
        let bothPages = 0;
        
        // Track which sites have this header on which page types
        const sitePageTypes = new Map<string, Set<string>>();
        
        for (const [_siteUrl, siteData] of data.sites) {
            // Check if site has this header
            const hasHeader = siteData.headers ? siteData.headers.has(headerName) : false;
            if (hasHeader) {
                // Determine page types - this is a simplified approach
                // In practice, would need page-specific header tracking in preprocessed data
                const pageTypes = new Set<string>();
                
                // Check if header appears on different page types using headersByPageType
                if (siteData.headersByPageType?.robots?.has(headerName)) {
                    pageTypes.add('robots');
                }
                if (siteData.headersByPageType?.mainpage?.has(headerName)) {
                    pageTypes.add('mainpage');
                } else {
                    // If no specific page type data, assume mainpage (most common case)
                    pageTypes.add('mainpage');
                }
                
                sitePageTypes.set(_siteUrl, pageTypes);
            }
        }
        
        // Calculate distribution
        for (const pageTypes of sitePageTypes.values()) {
            if (pageTypes.has('mainpage') && pageTypes.has('robots')) {
                bothPages++;
            } else if (pageTypes.has('robots')) {
                robotsOnly++;
            } else {
                mainpageOnly++;
            }
        }
        
        const pageTypeDistribution = {
            mainpage: mainpageOnly,
            robots: robotsOnly,
            both: bothPages,
        };

        return {
            frequency: totalOccurrences / data.totalSites,
            occurrences: totalOccurrences,
            totalSites: data.totalSites,
            pageTypeDistribution,
            uniqueValues,
            averageValuesPerSite,
            mostCommonValue,
        };
    }

    private calculatePerCMSMetrics(
        headerName: string,
        cmsStats: Map<string, Set<string>>,
        cmsDistribution: CMSDistributionV2,
        overallOccurrences: number,
        data: PreprocessedData
    ): Map<string, CMSSpecificMetrics> {
        // Calculate per-CMS metrics with statistical significance testing
        const metrics = new Map<string, CMSSpecificMetrics>();
        const overallFrequency = overallOccurrences / cmsDistribution.totalSites;
        
        for (const [cms, cmsDistData] of cmsDistribution.distributions) {
            const siteSet = cmsStats.get(cms) || new Set();
            const occurrences = siteSet.size;
            const totalSitesForCMS = cmsDistData.count;
            const frequency = totalSitesForCMS > 0 ? occurrences / totalSitesForCMS : 0;

            // Calculate expected occurrences based on overall frequency
            const expectedOccurrences = overallFrequency * totalSitesForCMS;

            // Calculate chi-square contribution: (observed - expected)² / expected
            const chiSquareContribution = expectedOccurrences > 0 ? 
                Math.pow(occurrences - expectedOccurrences, 2) / expectedOccurrences : 0;

            // Simple significance test: |observed - expected| > 1.96 * sqrt(expected)
            // This is a basic test - more sophisticated tests can be added later
            const standardError = Math.sqrt(expectedOccurrences * (1 - overallFrequency));
            const isStatisticallySignificant = Math.abs(occurrences - expectedOccurrences) > 1.96 * standardError;

            metrics.set(cms, {
                cms,
                frequency,
                occurrences,
                totalSitesForCMS,
                expectedOccurrences,
                chiSquareContribution,
                isStatisticallySignificant,
                commonValues: this.extractCommonValuesForCMS(headerName, cms, data),
                valueUniqueness: this.calculateValueUniquenessForCMS(headerName, cms, data)
            });
        }

        return metrics;
    }

    private calculateConditionalProbabilities(
        cmsStats: Map<string, Set<string>>,
        cmsDistribution: CMSDistributionV2,
        totalOccurrences: number
    ): ConditionalProbabilityMatrix {
        // Calculate sophisticated conditional probability matrices
        const cmsGivenHeader = new Map<string, ConditionalProbability>();
        const headerGivenCMS = new Map<string, ConditionalProbability>();

        for (const [cms, cmsDistData] of cmsDistribution.distributions) {
            const siteSet = cmsStats.get(cms) || new Set();
            const occurrences = siteSet.size;
            
            // P(CMS|header)
            const probability = totalOccurrences > 0 ? occurrences / totalOccurrences : 0;
            const expectedProbability = cmsDistData.percentage / 100;
            
            cmsGivenHeader.set(cms, {
                probability,
                count: occurrences,
                confidence: this.calculateStatisticalConfidence(occurrences, cmsDistData.count),
                expectedProbability,
                lift: expectedProbability > 0 ? probability / expectedProbability : 0,
                isSignificant: this.calculateStatisticalSignificance(occurrences, cmsDistData.count, expectedProbability)
            });

            // P(header|CMS) is the same as frequency
            const headerProbability = cmsDistData.count > 0 ? occurrences / cmsDistData.count : 0;
            const expectedHeaderProbability = totalOccurrences / cmsDistribution.totalSites;
            headerGivenCMS.set(cms, {
                probability: headerProbability,
                count: occurrences,
                confidence: this.calculateStatisticalConfidence(occurrences, cmsDistData.count),
                expectedProbability: expectedHeaderProbability,
                lift: expectedHeaderProbability > 0 ? headerProbability / expectedHeaderProbability : 0,
                isSignificant: this.calculateStatisticalSignificance(occurrences, cmsDistData.count, expectedHeaderProbability),
            });
        }

        return {
            cmsGivenHeader,
            headerGivenCMS,
            maxConditionalProbability: Math.max(...Array.from(cmsGivenHeader.values()).map(p => p.probability)),
            entropyReduction: this.calculateInformationGain(cmsGivenHeader, cmsDistribution),
            discriminativePower: this.calculateDiscriminativePower(cmsGivenHeader)
        };
    }

    private calculatePlatformSpecificity(
        perCMSMetrics: Map<string, CMSSpecificMetrics>,
        cmsDistribution: CMSDistributionV2,
        conditionalProbabilities: ConditionalProbabilityMatrix,
        overallOccurrences: number
    ): PlatformSpecificityScore {
        /**
         * Two-tier platform specificity algorithm (preserved from V1)
         * - Large datasets (≥30 sites): Discriminative scoring based on P(CMS|header)
         * - Small datasets (<30 sites): Coefficient of variation fallback
         */

        const method = overallOccurrences >= 30 ? 'discriminative' : 'coefficient_variation';
        let score = 0;
        let discriminativeDetails: {
            topCMS: string;
            topCMSProbability: number;
            concentrationScore: number;
            sampleSizeScore: number;
            backgroundContrast: number;
            discriminativeThreshold: number;
        } | undefined = undefined;
        let coefficientVariationDetails: {
            mean: number;
            standardDeviation: number;
            coefficientOfVariation: number;
            normalized: number;
        } | undefined = undefined;

        if (overallOccurrences >= 30) {
            // Large dataset: Use discriminative scoring
            
            // Find CMS with highest P(CMS|header), excluding infrastructure categories
            const validCMSEntries = Array.from(conditionalProbabilities.cmsGivenHeader.entries())
                .filter(([cms]) => !['Unknown', 'Enterprise', 'CDN'].includes(cms))
                .sort(([, a], [, b]) => b.probability - a.probability);

            if (validCMSEntries.length === 0) {
                score = 0; // No valid CMS to discriminate
            } else {
                const [topCMS, topCMSData] = validCMSEntries[0];
                const discriminativeThreshold = 0.4;

                // Require minimum discriminative threshold
                if (topCMSData.probability < discriminativeThreshold) {
                    score = 0; // Not discriminative enough
                } else {
                    // Calculate discriminative power components
                    
                    // 1. Concentration score: How concentrated in top CMS
                    const concentrationScore = Math.min(1, topCMSData.probability * 2); // 50% = 1.0
                    
                    // 2. Sample size score: Logarithmic scaling
                    const sampleSizeScore = Math.min(1, Math.log10(overallOccurrences) / Math.log10(100)); // 100 sites = 1.0
                    
                    // 3. Background contrast: Header frequency in top CMS vs overall
                    const topCMSMetrics = perCMSMetrics.get(topCMS);
                    const topCMSFrequency = topCMSMetrics?.frequency || 0;
                    const overallFrequency = overallOccurrences / cmsDistribution.totalSites;
                    const backgroundContrast = topCMSFrequency > 0 ? 
                        Math.min(2, topCMSFrequency / Math.max(overallFrequency, 0.001)) : 0;
                    const contrastScore = Math.min(1, backgroundContrast / 2); // 2x background = 1.0

                    // Weighted combination (preserved from V1)
                    score = concentrationScore * 0.5 + sampleSizeScore * 0.3 + contrastScore * 0.2;
                    score = Math.max(0, Math.min(1, score));

                    discriminativeDetails = {
                        topCMS,
                        topCMSProbability: topCMSData.probability,
                        concentrationScore,
                        sampleSizeScore,
                        backgroundContrast,
                        discriminativeThreshold,
                    };
                }
            }
        } else {
            // Small dataset: Coefficient of variation fallback
            const frequencies = Array.from(perCMSMetrics.values()).map(metrics => metrics.frequency);

            if (frequencies.length === 0) {
                score = 0;
            } else {
                // Calculate coefficient of variation
                const mean = frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
                
                if (mean === 0) {
                    score = 0;
                } else {
                    const variance = frequencies.reduce((sum, freq) => sum + Math.pow(freq - mean, 2), 0) / frequencies.length;
                    const standardDeviation = Math.sqrt(variance);
                    const coefficientOfVariation = standardDeviation / mean;
                    
                    // Normalize to 0-1 scale
                    score = Math.min(1, coefficientOfVariation);

                    coefficientVariationDetails = {
                        mean,
                        standardDeviation,
                        coefficientOfVariation,
                        normalized: score,
                    };
                }
            }
        }

        // Assess sample size adequacy
        const sampleSizeAdequacy = overallOccurrences >= 100 ? 'high' : 
                                  overallOccurrences >= 30 ? 'medium' : 'low';

        // Determine recommendation confidence
        let recommendationConfidence: 'low' | 'medium' | 'high';
        if (score > 0.7 || sampleSizeAdequacy === 'low') {
            recommendationConfidence = 'low'; // High specificity or low sample size = low confidence
        } else if (score > 0.5 || sampleSizeAdequacy === 'medium') {
            recommendationConfidence = 'medium';
        } else {
            recommendationConfidence = 'high';
        }

        return {
            score,
            method,
            discriminativeDetails,
            coefficientVariationDetails,
            sampleSizeAdequacy,
            recommendationConfidence,
        };
    }

    private calculateBiasAdjustments(
        perCMSMetrics: Map<string, CMSSpecificMetrics>,
        cmsDistribution: CMSDistributionV2
    ): BiasAdjustmentFactors {
        /**
         * Bias adjustment calculation (preserved from V1)
         * Adjusts header frequency for dataset composition bias by weighting
         * each CMS frequency by what its representation should be in a balanced dataset
         */

        // Calculate raw frequency (simple average across all CMS types)
        const frequencies = Array.from(perCMSMetrics.values()).map(metrics => metrics.frequency);
        const rawFrequency = frequencies.length > 0 ? 
            frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length : 0;

        // Identify major CMS types (excluding Unknown, with >5% representation)
        const majorCMSTypes = Array.from(cmsDistribution.distributions.entries())
            .filter(([cms, stats]) => cms !== 'Unknown' && stats.percentage > 5)
            .map(([cms, _]) => cms);

        let biasAdjustedFrequency: number;
        let adjustmentMethod: 'equal_weight' | 'population_weight' | 'none';
        let adjustmentFactor: number;
        const weights = new Map<string, number>();

        if (majorCMSTypes.length === 0) {
            // Fallback: No major CMS types identified, use raw frequency
            biasAdjustedFrequency = rawFrequency;
            adjustmentMethod = 'none';
            adjustmentFactor = 1.0;
        } else {
            // Equal weighting strategy: Assume balanced dataset with equal representation
            adjustmentMethod = 'equal_weight';
            const equalWeight = 1 / majorCMSTypes.length;
            let weightedSum = 0;

            for (const cms of majorCMSTypes) {
                const cmsMetrics = perCMSMetrics.get(cms);
                const frequency = cmsMetrics?.frequency || 0;
                weightedSum += frequency * equalWeight;
                weights.set(cms, equalWeight);
            }

            biasAdjustedFrequency = weightedSum;
            adjustmentFactor = rawFrequency > 0 ? biasAdjustedFrequency / rawFrequency : 1.0;
        }

        // Assess adjustment reliability and impact
        const adjustmentMagnitude = Math.abs(adjustmentFactor - 1.0);
        const adjustmentReliability: 'low' | 'medium' | 'high' = 
            majorCMSTypes.length >= 3 ? 'high' : 
            majorCMSTypes.length >= 2 ? 'medium' : 'low';
        
        const impactAssessment: 'minimal' | 'moderate' | 'significant' =
            adjustmentMagnitude < 0.1 ? 'minimal' :
            adjustmentMagnitude < 0.3 ? 'moderate' : 'significant';

        // Generate rationale text
        const rationaleText = adjustmentMethod === 'none' ? 
            'No bias adjustment applied - insufficient major CMS platforms' :
            `Equal weighting across ${majorCMSTypes.length} major platforms: ${majorCMSTypes.join(', ')}`;

        const qualityScore = adjustmentReliability === 'high' ? 0.8 :
                           adjustmentReliability === 'medium' ? 0.6 : 0.4;

        return {
            rawFrequency,
            biasAdjustedFrequency,
            adjustmentFactor,
            adjustmentMethod,
            majorPlatformsConsidered: majorCMSTypes,
            weightingStrategy: {
                strategy: adjustmentMethod,
                weights,
                rationaleText,
                qualityScore,
            },
            adjustmentReliability,
            impactAssessment,
        };
    }

    private assessRecommendationRisk(
        overallMetrics: OverallHeaderMetrics,
        platformSpecificity: PlatformSpecificityScore,
        perCMSMetrics: Map<string, CMSSpecificMetrics>,
        cmsDistribution: CMSDistributionV2
    ): RecommendationRiskAssessment {
        /**
         * Comprehensive recommendation risk assessment (enhanced from V1)
         * Evaluates multiple risk factors to determine recommendation confidence
         */

        const riskFactors: RiskFactor[] = [];
        let recommendationConfidence: 'low' | 'medium' | 'high' = 'high';
        const mitigationStrategies: string[] = [];

        // 1. Platform specificity risk (from V1 logic)
        if (platformSpecificity.score > 0.7) {
            riskFactors.push({
                type: 'platform_specificity',
                severity: 'high',
                description: 'Header appears platform-specific - high frequency may indicate dataset bias',
                metricValue: platformSpecificity.score,
                threshold: 0.7,
                recommendation: 'Consider platform-aware filtering or weighted analysis',
            });
            recommendationConfidence = 'low';
            mitigationStrategies.push('Apply platform-specific filtering');
            mitigationStrategies.push('Use bias-adjusted frequency instead of raw frequency');
        }

        // 2. Dominant platform correlation risk (from V1 logic)
        const nonUnknownCMS = Array.from(perCMSMetrics.entries())
            .filter(([cms, _]) => cms !== 'Unknown')
            .sort(([, a], [, b]) => b.frequency - a.frequency);

        if (nonUnknownCMS.length > 0) {
            const [dominantCMS, dominantMetrics] = nonUnknownCMS[0];
            const cmsDistribution_dominantCMS = cmsDistribution.distributions.get(dominantCMS);
            
            if (dominantMetrics.frequency > 0.8 && 
                cmsDistribution_dominantCMS && 
                cmsDistribution_dominantCMS.percentage > 50) {
                
                riskFactors.push({
                    type: 'dataset_bias',
                    severity: 'high',
                    description: `High correlation with ${dominantCMS} (${Math.round(dominantMetrics.frequency * 100)}%) in biased dataset`,
                    metricValue: dominantMetrics.frequency,
                    threshold: 0.8,
                    recommendation: 'Dataset appears biased toward this CMS platform',
                });
                recommendationConfidence = 'low';
                mitigationStrategies.push('Expand dataset diversity');
                mitigationStrategies.push('Apply bias adjustment factors');
            }
        }

        // 3. Low frequency with high concentration risk (from V1 logic)
        if (overallMetrics.frequency < 0.1 && platformSpecificity.score > 0.5) {
            riskFactors.push({
                type: 'sample_size',
                severity: 'medium',
                description: 'Low frequency header with high platform concentration',
                metricValue: overallMetrics.frequency,
                threshold: 0.1,
                recommendation: 'Increase sample size or treat with caution',
            });
            if (recommendationConfidence === 'high') {
                recommendationConfidence = 'medium';
            }
            mitigationStrategies.push('Collect more data points');
            mitigationStrategies.push('Apply statistical significance tests');
        }

        // 4. Sample size adequacy risk
        if (platformSpecificity.sampleSizeAdequacy === 'low') {
            riskFactors.push({
                type: 'sample_size',
                severity: 'medium',
                description: 'Insufficient sample size for reliable analysis',
                metricValue: overallMetrics.occurrences,
                threshold: 30,
                recommendation: 'Collect more data or treat results as preliminary',
            });
            if (recommendationConfidence === 'high') {
                recommendationConfidence = 'medium';
            }
            mitigationStrategies.push('Increase data collection');
        }

        // 5. Statistical significance risk
        const statisticallySignificantCMS = Array.from(perCMSMetrics.values())
            .filter(metrics => metrics.isStatisticallySignificant).length;
        const totalCMS = perCMSMetrics.size;
        const significanceRatio = totalCMS > 0 ? statisticallySignificantCMS / totalCMS : 0;

        if (significanceRatio < 0.3) {
            riskFactors.push({
                type: 'statistical_significance',
                severity: 'medium',
                description: 'Low statistical significance across CMS platforms',
                metricValue: significanceRatio,
                threshold: 0.3,
                recommendation: 'Results may not be statistically reliable',
            });
        }

        // 6. Value diversity risk
        if (overallMetrics.uniqueValues < 3 && overallMetrics.occurrences > 10) {
            riskFactors.push({
                type: 'value_diversity',
                severity: 'low',
                description: 'Low header value diversity may indicate implementation uniformity',
                metricValue: overallMetrics.uniqueValues,
                threshold: 3,
                recommendation: 'Consider value patterns in analysis',
            });
            mitigationStrategies.push('Analyze header value patterns');
        }

        // Determine overall risk level
        const highRiskFactors = riskFactors.filter(f => f.severity === 'high').length;
        const mediumRiskFactors = riskFactors.filter(f => f.severity === 'medium').length;
        
        const overallRisk: 'low' | 'medium' | 'high' = 
            highRiskFactors > 0 ? 'high' :
            mediumRiskFactors > 1 ? 'medium' : 'low';

        // Risk-specific assessments
        const platformSpecificityRisk: 'low' | 'medium' | 'high' = 
            platformSpecificity.score > 0.7 ? 'high' :
            platformSpecificity.score > 0.5 ? 'medium' : 'low';

        const datasetBiasRisk: 'low' | 'medium' | 'high' = 
            cmsDistribution.concentrationScore > 0.6 ? 'high' :
            cmsDistribution.concentrationScore > 0.3 ? 'medium' : 'low';

        const sampleSizeRisk: 'low' | 'medium' | 'high' = 
            platformSpecificity.sampleSizeAdequacy === 'low' ? 'high' :
            platformSpecificity.sampleSizeAdequacy === 'medium' ? 'medium' : 'low';

        const statisticalSignificanceRisk: 'low' | 'medium' | 'high' = 
            significanceRatio < 0.3 ? 'high' :
            significanceRatio < 0.6 ? 'medium' : 'low';

        return {
            overallRisk,
            riskFactors,
            recommendationConfidence,
            mitigationStrategies: Array.from(new Set(mitigationStrategies)), // Remove duplicates
            platformSpecificityRisk,
            datasetBiasRisk,
            sampleSizeRisk,
            statisticalSignificanceRisk,
        };
    }

    // Cross-analyzer context methods

    private getSemanticContext(headerName: string): SemanticHeaderContext | undefined {
        // Extract semantic context from injected semantic data
        // This is a simplified implementation based on what's available in semantic analyzer
        if (!this.semanticData) return undefined;
        
        // Try to get category from semantic data summary
        const categoryFromSummary = this.semanticData.categoryDistribution?.get(headerName);
        if (!categoryFromSummary) return undefined;
        
        return {
            category: categoryFromSummary.toString(),
            confidence: 0.8, // Default confidence since we don't have specific confidence data
            vendor: undefined, // Would be populated from cross-analyzer data
            platformName: undefined, // Would be populated from cross-analyzer data  
            filterRecommendation: 'keep', // Default recommendation
            discriminativeScore: 0.5, // Default discriminative score
        };
    }

    private getVendorContext(headerName: string): VendorHeaderContext | undefined {
        // Extract vendor context from injected vendor data
        if (!this.vendorData?.vendorsByHeader) return undefined;
        
        const vendorDetection = this.vendorData.vendorsByHeader.get(headerName);
        if (!vendorDetection?.vendor) return undefined;
        
        return {
            vendor: vendorDetection.vendor.name,
            vendorCategory: vendorDetection.vendor.category,
            vendorConfidence: vendorDetection.confidence,
            technologySignatures: vendorDetection.technologySignatures || [],
            conflictingVendors: vendorDetection.conflictingVendors || [],
        };
    }

    private getValidationContext(headerName: string, data: PreprocessedData): ValidationHeaderContext | undefined {
        // Extract validation context from preprocessed data metadata
        // This is a simplified implementation - would be enhanced when validation metadata is fully implemented
        if (!data.metadata.validation) return undefined;
        
        // Check if we have validated header data
        const validatedHeader = data.metadata.validation.validatedHeaders?.get(headerName);
        if (!validatedHeader) return undefined;
        
        return {
            validationPassed: true, // Assume passed if it exists in validated headers
            qualityScore: validatedHeader.siteCount > 10 ? 0.8 : 0.5, // Basic quality based on site count
            statisticallySignificant: validatedHeader.siteCount > 30, // Simple significance threshold
            sampleSizeAdequate: validatedHeader.siteCount >= 5, // Basic adequacy check
            validationWarnings: validatedHeader.siteCount < 5 ? ['Low sample size'] : [],
        };
    }

    // Phase 6: Technology bias assessment helper methods (V2-only enhancements)

    private calculateVendorConcentration(vendorData: VendorSpecificData): Map<string, VendorConcentrationBias> {
        /**
         * Calculate vendor concentration using HHI methodology for each header category
         */
        const vendorConcentration = new Map<string, VendorConcentrationBias>();
        const vendorCounts = new Map<string, number>();
        let totalDetections = 0;

        // Count vendor detections across all headers
        for (const [_headerName, detection] of vendorData.vendorsByHeader) {
            if (detection?.vendor?.name) {
                const vendor = detection.vendor.name;
                vendorCounts.set(vendor, (vendorCounts.get(vendor) || 0) + 1);
                totalDetections++;
            }
        }

        if (totalDetections === 0) {
            return vendorConcentration;
        }

        // Create vendor concentration bias objects for each vendor
        for (const [vendor, count] of vendorCounts) {
            const siteConcentration = (count / totalDetections) * 100;
            const expectedConcentration = 100 / vendorCounts.size; // Equal distribution
            const biasScore = Math.abs(siteConcentration - expectedConcentration) / expectedConcentration;

            // Collect headers impacted by this vendor
            const impactedHeaders: string[] = [];
            for (const [headerName, detection] of vendorData.vendorsByHeader) {
                if (detection?.vendor?.name === vendor) {
                    impactedHeaders.push(headerName);
                }
            }

            vendorConcentration.set(vendor, {
                vendor,
                headerCount: count,
                siteConcentration,
                expectedConcentration,
                biasScore,
                impactedHeaders,
            });
        }

        return vendorConcentration;
    }

    private analyzeTechnologyStackBias(vendorData: VendorSpecificData, _cmsDistribution: CMSDistributionV2): TechnologyStackBias[] {
        /**
         * Analyze correlation between vendor detection and CMS distribution
         * to identify technology stack biases
         */
        const biasPatterns: TechnologyStackBias[] = [];

        // Analyze technology stack bias by category
        const categoryConcentration = new Map<string, Map<string, number>>();
        
        for (const [_headerName, detection] of vendorData.vendorsByHeader) {
            if (detection?.vendor?.name && detection?.category) {
                const category = detection.category;
                const vendor = detection.vendor.name;
                
                if (!categoryConcentration.has(category)) {
                    categoryConcentration.set(category, new Map());
                }
                const catMap = categoryConcentration.get(category)!;
                catMap.set(vendor, (catMap.get(vendor) || 0) + 1);
            }
        }

        // Create TechnologyStackBias objects for each category
        for (const [category, vendors] of categoryConcentration) {
            const totalInCategory = Array.from(vendors.values()).reduce((sum, count) => sum + count, 0);
            
            if (totalInCategory < 3) continue; // Skip categories with too few detections
            
            // Calculate concentration score (HHI)
            let concentrationScore = 0;
            for (const count of vendors.values()) {
                const share = count / totalInCategory;
                concentrationScore += share * share;
            }
            
            // Calculate diversity score (inverse of concentration)
            const diversityScore = 1 - concentrationScore;
            
            // Identify dominant technologies
            const sortedVendors = Array.from(vendors.entries())
                .sort(([,a], [,b]) => b - a);
            const dominantTechnologies = sortedVendors
                .filter(([,count]) => count / totalInCategory > 0.3)
                .map(([vendor,]) => vendor);
            
            // Determine bias risk
            const biasRisk: 'low' | 'medium' | 'high' = 
                concentrationScore > 0.7 ? 'high' :
                concentrationScore > 0.5 ? 'medium' : 'low';
            
            // Identify affected analysis areas
            const affectedAnalysis: string[] = [];
            if (biasRisk !== 'low') {
                affectedAnalysis.push('header_frequency_analysis');
                affectedAnalysis.push('cms_correlation_analysis');
                if (category === 'security') affectedAnalysis.push('security_header_recommendations');
                if (category === 'cdn') affectedAnalysis.push('performance_header_analysis');
            }
            
            biasPatterns.push({
                category,
                dominantTechnologies,
                concentrationScore,
                diversityScore,
                biasRisk,
                affectedAnalysis,
            });
        }

        return biasPatterns;
    }

    private identifyDominantVendors(vendorData: VendorSpecificData, headerCorrelations: Map<string, HeaderCMSCorrelationV2>): string[] {
        /**
         * Identify vendors that may be biasing high-frequency header patterns
         */
        const dominantVendors: string[] = [];
        const vendorInfluence = new Map<string, number>();

        // Calculate vendor influence on high-specificity headers
        for (const [headerName, correlation] of headerCorrelations) {
            if (correlation.platformSpecificity.score > 0.6) {
                const detection = vendorData.vendorsByHeader.get(headerName);
                if (detection?.vendor?.name) {
                    const vendor = detection.vendor.name;
                    vendorInfluence.set(vendor, (vendorInfluence.get(vendor) || 0) + correlation.platformSpecificity.score);
                }
            }
        }

        // Vendors with high cumulative influence on platform-specific headers
        const sortedInfluence = Array.from(vendorInfluence.entries())
            .sort(([,a], [,b]) => b - a);

        for (const [vendor, influence] of sortedInfluence) {
            if (influence > 2.0) { // Threshold for significant influence
                dominantVendors.push(vendor);
            }
        }

        return dominantVendors.slice(0, 5); // Top 5 most influential
    }

    private detectTechnologyGaps(vendorData: VendorSpecificData, cmsDistribution: CMSDistributionV2): string[] {
        /**
         * Detect missing technology vendors that should be present given CMS distribution
         */
        const technologyGaps: string[] = [];
        
        // Expected vendors based on CMS distribution
        const expectedVendors = new Set<string>();
        for (const [cms, stats] of cmsDistribution.distributions) {
            if (stats.percentage > 10) { // Major CMS platforms
                // Add expected vendors for major CMS platforms
                switch (cms.toLowerCase()) {
                    case 'wordpress':
                        expectedVendors.add('Automattic');
                        expectedVendors.add('WordPress');
                        break;
                    case 'shopify':
                        expectedVendors.add('Shopify');
                        break;
                    case 'wix':
                        expectedVendors.add('Wix');
                        break;
                    case 'squarespace':
                        expectedVendors.add('Squarespace');
                        break;
                }
            }
        }

        // Check which expected vendors are missing
        const detectedVendors = new Set<string>();
        for (const [_headerName, detection] of vendorData.vendorsByHeader) {
            if (detection?.vendor?.name) {
                detectedVendors.add(detection.vendor.name);
            }
        }
        
        for (const expectedVendor of expectedVendors) {
            if (!detectedVendors.has(expectedVendor)) {
                technologyGaps.push(expectedVendor);
            }
        }

        return technologyGaps;
    }

    private identifyBiasedTechnologyCategories(vendorData: VendorSpecificData): string[] {
        /**
         * Identify technology categories that show concentration bias
         */
        const biasedCategories: string[] = [];
        const categoryStats = new Map<string, { totalHeaders: number; uniqueVendors: Set<string> }>();

        // Collect category statistics
        for (const [_headerName, detection] of vendorData.vendorsByHeader) {
            if (detection?.category && detection?.vendor?.name) {
                const category = detection.category;
                const vendor = detection.vendor.name;
                
                if (!categoryStats.has(category)) {
                    categoryStats.set(category, { totalHeaders: 0, uniqueVendors: new Set() });
                }
                
                const stats = categoryStats.get(category)!;
                stats.totalHeaders++;
                stats.uniqueVendors.add(vendor);
            }
        }

        // Identify categories with low vendor diversity
        for (const [category, stats] of categoryStats) {
            if (stats.totalHeaders >= 5) { // Minimum threshold for analysis
                const vendorDiversity = stats.uniqueVendors.size / stats.totalHeaders;
                
                if (vendorDiversity < 0.3) { // Less than 30% vendor diversity
                    biasedCategories.push(category);
                }
            }
        }

        return biasedCategories;
    }

    private calculateOverallTechnologyBias(
        vendorConcentration: Map<string, VendorConcentrationBias>,
        dominantVendors: string[],
        technologyStackBias: TechnologyStackBias[]
    ): 'low' | 'medium' | 'high' {
        /**
         * Calculate overall technology bias level based on multiple factors
         */
        let biasScore = 0;

        // Factor 1: Overall vendor concentration (average bias score)
        const biasScores = Array.from(vendorConcentration.values()).map(v => v.biasScore);
        const avgBiasScore = biasScores.length > 0 ? biasScores.reduce((sum, score) => sum + score, 0) / biasScores.length : 0;
        if (avgBiasScore > 0.6) biasScore += 3;
        else if (avgBiasScore > 0.3) biasScore += 2;
        else biasScore += 1;

        // Factor 2: Number of dominant vendors
        if (dominantVendors.length >= 3) biasScore += 3;
        else if (dominantVendors.length >= 1) biasScore += 2;
        else biasScore += 1;

        // Factor 3: High-severity bias patterns
        const highSeverityPatterns = technologyStackBias.filter(pattern => pattern.biasRisk === 'high').length;
        if (highSeverityPatterns >= 2) biasScore += 3;
        else if (highSeverityPatterns >= 1) biasScore += 2;
        else biasScore += 1;

        // Convert score to risk level
        if (biasScore >= 8) return 'high';
        if (biasScore >= 5) return 'medium';
        return 'low';
    }

    private generateTechnologyBiasRecommendations(
        overallBias: 'low' | 'medium' | 'high',
        dominantVendors: string[],
        technologyGaps: string[],
        biasedCategories: string[]
    ): string[] {
        /**
         * Generate actionable recommendations for mitigating technology bias
         */
        const recommendations: string[] = [];

        if (overallBias === 'high') {
            recommendations.push('Technology bias detected - consider technology-aware filtering for header recommendations');
            recommendations.push('Apply vendor concentration adjustments to frequency calculations');
        }

        if (dominantVendors.length > 0) {
            recommendations.push(`Monitor headers associated with dominant vendors: ${dominantVendors.join(', ')}`);
            recommendations.push('Consider vendor-specific confidence adjustments for these headers');
        }

        if (technologyGaps.length > 0) {
            recommendations.push(`Expand dataset to include underrepresented vendors: ${technologyGaps.join(', ')}`);
        }

        if (biasedCategories.length > 0) {
            recommendations.push(`Review vendor diversity in categories: ${biasedCategories.join(', ')}`);
            recommendations.push('Consider category-specific bias adjustments');
        }

        if (overallBias === 'medium' || overallBias === 'high') {
            recommendations.push('Document technology bias findings in analysis reports');
            recommendations.push('Consider weighted sampling based on technology diversity');
        }

        return recommendations;
    }

    // Phase 6.2: Semantic bias assessment helper methods (V2-only enhancements)

    private analyzeSemanticCategoryBias(semanticData: SemanticSpecificData, cmsDistribution: CMSDistributionV2): Map<string, CategoryBias> {
        /**
         * Analyze bias in semantic category distribution relative to CMS distribution
         */
        const categoryBias = new Map<string, CategoryBias>();

        if (!semanticData.categoryDistribution) {
            return categoryBias;
        }

        // Calculate total headers across all categories
        const totalCategorizedHeaders = Array.from(semanticData.categoryDistribution.values())
            .reduce((sum, categoryDist) => sum + categoryDist.headerCount, 0);

        if (totalCategorizedHeaders === 0) {
            return categoryBias;
        }

        // Analyze each semantic category for bias
        for (const [category, categoryDist] of semanticData.categoryDistribution) {
            const headerCount = categoryDist.headerCount;
            const categoryFrequency = headerCount / totalCategorizedHeaders;
            
            // Expected frequency (assuming equal distribution across categories)
            const expectedFrequency = 1 / semanticData.categoryDistribution.size;
            
            // Calculate bias metrics
            const overrepresentationRatio = categoryFrequency / expectedFrequency;
            const _concentrationScore = categoryFrequency; // Simple concentration metric
            
            // Determine bias severity
            let biasLevel: 'low' | 'medium' | 'high';
            if (overrepresentationRatio > 2.0 || overrepresentationRatio < 0.5) {
                biasLevel = 'high';
            } else if (overrepresentationRatio > 1.5 || overrepresentationRatio < 0.67) {
                biasLevel = 'medium';
            } else {
                biasLevel = 'low';
            }

            // Identify affected CMS platforms (simplified - could be enhanced with correlation data)
            const affectedPlatforms: string[] = [];
            for (const [cms, stats] of cmsDistribution.distributions) {
                if (stats.percentage > 20) { // Major platforms
                    affectedPlatforms.push(cms);
                }
            }

            categoryBias.set(category, {
                category,
                expectedHeaders: Math.round(expectedFrequency * totalCategorizedHeaders),
                actualHeaders: headerCount,
                biasRatio: overrepresentationRatio,
                confidence: categoryDist.averageConfidence,
                impactAssessment: biasLevel,
            });
        }

        return categoryBias;
    }

    private detectHeaderClassificationBias(
        semanticData: SemanticSpecificData, 
        headerCorrelations: Map<string, HeaderCMSCorrelationV2>
    ): HeaderClassificationBias[] {
        /**
         * Detect bias in how headers are classified semantically vs their actual platform specificity
         */
        const biases: HeaderClassificationBias[] = [];

        if (!semanticData.headerPatterns) {
            return biases;
        }

        // Analyze discrepancies between semantic classification and platform specificity
        for (const [headerName, semanticPattern] of semanticData.headerPatterns) {
            const correlation = headerCorrelations.get(headerName);
            
            if (!correlation) continue;

            const platformSpecificity = correlation.platformSpecificity.score;
            const expectedClassification = this.getExpectedSemanticClassification(
                platformSpecificity, 
                correlation
            );

            // Check for misalignment
            if (expectedClassification !== semanticPattern.category) {
                const confidenceGap = Math.abs(semanticPattern.confidence - platformSpecificity);
                
                if (confidenceGap > 0.3) { // Significant discrepancy
                    biases.push({
                        header: headerName,
                        expectedCategory: expectedClassification,
                        actualClassification: semanticPattern.category,
                        confidence: semanticPattern.confidence,
                        biasEvidence: [
                            `Platform specificity: ${platformSpecificity.toFixed(3)}`,
                            `Semantic confidence: ${semanticPattern.confidence.toFixed(3)}`,
                            `Confidence gap: ${confidenceGap.toFixed(3)}`
                        ],
                        recommendation: this.identifyClassificationBiasCause(semanticPattern, correlation),
                    });
                }
            }
        }

        return biases;
    }

    private identifySemanticCategoryImbalances(semanticData: SemanticSpecificData): {
        overrepresentedCategories: string[];
        underrepresentedCategories: string[];
    } {
        /**
         * Identify semantic categories that are significantly over or under-represented
         */
        const overrepresentedCategories: string[] = [];
        const underrepresentedCategories: string[] = [];

        if (!semanticData.categoryDistribution) {
            return { overrepresentedCategories, underrepresentedCategories };
        }

        const totalHeaders = Array.from(semanticData.categoryDistribution.values())
            .reduce((sum, categoryDist) => sum + categoryDist.headerCount, 0);
        const expectedPerCategory = totalHeaders / semanticData.categoryDistribution.size;

        for (const [category, categoryDist] of semanticData.categoryDistribution) {
            const ratio = categoryDist.headerCount / expectedPerCategory;
            
            if (ratio > 1.8) { // 80% above expected
                overrepresentedCategories.push(category);
            } else if (ratio < 0.6) { // 40% below expected
                underrepresentedCategories.push(category);
            }
        }

        return { overrepresentedCategories, underrepresentedCategories };
    }

    private assessSemanticMisclassificationRisk(
        semanticData: SemanticSpecificData
    ): HeaderClassificationBias[] {
        /**
         * Assess risk of semantic misclassification affecting bias analysis
         */
        const risks: HeaderClassificationBias[] = [];

        // Generate risks based on low-confidence semantic classifications
        for (const [headerName, pattern] of semanticData.headerPatterns) {
            if (pattern.confidence < 0.7) {
                risks.push({
                    header: headerName,
                    expectedCategory: pattern.category,
                    actualClassification: pattern.category,
                    confidence: pattern.confidence,
                    biasEvidence: [`Low confidence: ${pattern.confidence}`],
                    recommendation: 'Review semantic classification accuracy'
                });
            }
        }
        
        return risks;
    }

    private calculateOverallSemanticBias(
        categoryBias: Map<string, CategoryBias>,
        headerClassificationBias: HeaderClassificationBias[],
        overrepresentedCount: number,
        underrepresentedCount: number
    ): 'low' | 'medium' | 'high' {
        /**
         * Calculate overall semantic bias level based on multiple factors
         */
        let biasScore = 0;

        // Factor 1: Category bias severity
        const highBiasCategories = Array.from(categoryBias.values())
            .filter(bias => bias.impactAssessment === 'high').length;
        const mediumBiasCategories = Array.from(categoryBias.values())
            .filter(bias => bias.impactAssessment === 'medium').length;
        
        if (highBiasCategories >= 2) biasScore += 3;
        else if (highBiasCategories >= 1 || mediumBiasCategories >= 3) biasScore += 2;
        else biasScore += 1;

        // Factor 2: Classification bias issues  
        const highRiskClassifications = headerClassificationBias
            .filter(bias => bias.confidence < 0.5).length; // Low confidence = high risk
        
        if (highRiskClassifications >= 3) biasScore += 3;
        else if (highRiskClassifications >= 1) biasScore += 2;
        else biasScore += 1;

        // Factor 3: Category imbalances
        const totalImbalances = overrepresentedCount + underrepresentedCount;
        if (totalImbalances >= 4) biasScore += 3;
        else if (totalImbalances >= 2) biasScore += 2;
        else biasScore += 1;

        // Convert score to risk level
        if (biasScore >= 8) return 'high';
        if (biasScore >= 5) return 'medium';
        return 'low';
    }

    private generateSemanticBiasRecommendations(
        overallBias: 'low' | 'medium' | 'high',
        overrepresentedCategories: string[],
        underrepresentedCategories: string[],
        misclassificationRisk: HeaderClassificationBias[]
    ): string[] {
        /**
         * Generate actionable recommendations for mitigating semantic bias
         */
        const recommendations: string[] = [];

        if (overallBias === 'high') {
            recommendations.push('Semantic category bias detected - review semantic classification impact on filtering decisions');
            recommendations.push('Consider category-weighted analysis to balance semantic representation');
        }

        if (overrepresentedCategories.length > 0) {
            recommendations.push(`Monitor overrepresented categories: ${overrepresentedCategories.join(', ')}`);
            recommendations.push('Apply downweighting to overrepresented semantic categories in recommendations');
        }

        if (underrepresentedCategories.length > 0) {
            recommendations.push(`Enhance coverage for underrepresented categories: ${underrepresentedCategories.join(', ')}`);
            recommendations.push('Consider targeted data collection for underrepresented semantic categories');
        }

        for (const risk of misclassificationRisk) {
            if (risk.confidence < 0.7) {
                recommendations.push(`Address header classification risk for ${risk.header}: ${risk.recommendation}`);
            }
        }

        if (overallBias === 'medium' || overallBias === 'high') {
            recommendations.push('Document semantic bias findings for filtering and recommendation review');
            recommendations.push('Consider semantic-aware bias adjustments in frequency analysis');
        }

        return recommendations;
    }

    // Helper methods for semantic bias analysis

    private calculateSemanticCategoryImpact(category: string, biasLevel: 'low' | 'medium' | 'high'): string {
        const impacts = {
            security: 'May affect security header filtering recommendations',
            performance: 'May skew performance optimization suggestions',
            custom: 'May hide platform-specific custom header patterns',
            infrastructure: 'May bias infrastructure header analysis',
            analytics: 'May affect tracking header recommendations',
        };

        const baseImpact = impacts[category as keyof typeof impacts] || 'May affect category-specific analysis';
        const severityPrefix = biasLevel === 'high' ? 'Significantly ' : biasLevel === 'medium' ? 'Moderately ' : '';
        
        return severityPrefix + baseImpact.toLowerCase();
    }

    private getExpectedSemanticClassification(
        platformSpecificity: number, 
        correlation: HeaderCMSCorrelationV2
    ): string {
        // Simplified classification logic - could be enhanced
        if (platformSpecificity > 0.7) {
            return 'platform_specific';
        } else if (correlation.overallMetrics.frequency < 0.1) {
            return 'rare';
        } else if (correlation.overallMetrics.frequency > 0.8) {
            return 'common';
        } else {
            return 'standard';
        }
    }

    private identifyClassificationBiasCause(
        semanticCategory: any,
        correlation: HeaderCMSCorrelationV2
    ): string {
        // Analyze potential causes of classification bias
        if (correlation.platformSpecificity.score > 0.7 && semanticCategory.category === 'standard') {
            return 'Platform-specific header misclassified as standard';
        } else if (correlation.overallMetrics.frequency < 0.1 && semanticCategory.category !== 'custom') {
            return 'Rare header not identified as custom/specialized';
        } else if (correlation.overallMetrics.frequency > 0.8 && semanticCategory.confidence < 0.5) {
            return 'Common header has unexpectedly low semantic confidence';
        } else {
            return 'Semantic-platform specificity mismatch';
        }
    }

    private getUncategorizedHeaders(_semanticData: SemanticSpecificData): string[] {
        // Would require additional data structure to track uncategorized headers
        // For now, return empty array - could be enhanced with more semantic data
        return [];
    }

    private getLowConfidenceHeaders(semanticData: SemanticSpecificData): string[] {
        const lowConfidenceHeaders: string[] = [];
        
        if (semanticData.headerPatterns) {
            for (const [headerName, pattern] of semanticData.headerPatterns) {
                if (pattern.confidence < 0.5) {
                    lowConfidenceHeaders.push(headerName);
                }
            }
        }
        
        return lowConfidenceHeaders;
    }

    // Additional helper methods for pattern discovery bias assessment
    
    private calculatePatternPlatformSpecificity(
        discoveredPattern: any,
        cmsDistribution: CMSDistributionV2
    ): number {
        /**
         * Calculate how platform-specific a discovered pattern is
         */
        // If pattern has platform information, use it
        if (discoveredPattern.platformAssociation) {
            const platformSites = cmsDistribution.distributions.get(discoveredPattern.platformAssociation)?.count || 0;
            const totalSites = cmsDistribution.totalSites;
            return platformSites / totalSites;
        }
        
        // Default moderate specificity if no platform information
        return 0.5;
    }
    
    private calculateDatasetBiasImpact(
        discoveredPattern: any,
        cmsDistribution: CMSDistributionV2
    ): number {
        /**
         * Calculate how much dataset bias affects this pattern
         */
        const _concentrationScore = cmsDistribution.concentrationScore;
        const patternConfidence = discoveredPattern.confidence || 0.5;
        
        // Higher concentration and lower confidence = higher bias impact
        return _concentrationScore * (1 - patternConfidence);
    }
    
    private determinePatternBiasRisk(
        platformSpecificity: number,
        datasetBiasImpact: number,
        discoveredPattern: any
    ): 'low' | 'medium' | 'high' {
        /**
         * Determine bias risk level for a pattern
         */
        const confidence = discoveredPattern.confidence || 0.5;
        
        let riskScore = 0;
        
        // High platform specificity increases risk
        if (platformSpecificity > 0.8) riskScore += 2;
        else if (platformSpecificity > 0.6) riskScore += 1;
        
        // High dataset bias impact increases risk
        if (datasetBiasImpact > 0.6) riskScore += 2;
        else if (datasetBiasImpact > 0.4) riskScore += 1;
        
        // Low confidence increases risk
        if (confidence < 0.5) riskScore += 1;
        
        if (riskScore >= 4) return 'high';
        if (riskScore >= 2) return 'medium';
        return 'low';
    }
    
    private getPatternValidation(discoveredPattern: any): string {
        /**
         * Get validation status for a discovered pattern
         */
        if (discoveredPattern.validated === true) {
            return 'validated';
        } else if (discoveredPattern.validated === false) {
            return 'failed validation';
        } else {
            return 'pending validation';
        }
    }
    
    private calculatePlatformDiscoveryBalance(
        patternDiscoveryData: PatternDiscoverySpecificData,
        _cmsDistribution: CMSDistributionV2
    ): number {
        /**
         * Calculate how balanced pattern discovery is across platforms
         */
        const platformCounts = new Map<string, number>();
        
        // Count patterns per platform
        for (const [_patternName, pattern] of patternDiscoveryData.discoveredPatterns) {
            const platform = pattern.platformAssociation || 'unknown';
            platformCounts.set(platform, (platformCounts.get(platform) || 0) + 1);
        }
        
        // Calculate balance using coefficient of variation
        const actualCounts = Array.from(platformCounts.values());
        
        if (actualCounts.length === 0) return 0;
        
        const mean = actualCounts.reduce((sum, count) => sum + count, 0) / actualCounts.length;
        const variance = actualCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / actualCounts.length;
        const coefficientOfVariation = Math.sqrt(variance) / mean;
        
        // Return balance score (0-1, higher is more balanced)
        return Math.max(0, 1 - coefficientOfVariation);
    }
    
    private calculateCategoryDiscoveryBalance(
        patternDiscoveryData: PatternDiscoverySpecificData
    ): number {
        /**
         * Calculate how balanced pattern discovery is across categories
         */
        const categoryCounts = new Map<string, number>();
        
        // Count patterns per category
        for (const [_patternName, pattern] of patternDiscoveryData.discoveredPatterns) {
            const category = pattern.category || 'unknown';
            categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        }
        
        if (categoryCounts.size === 0) return 0;
        
        // Calculate balance using Shannon diversity
        const totalPatterns = patternDiscoveryData.discoveredPatterns.size;
        let shannonDiversity = 0;
        
        for (const count of categoryCounts.values()) {
            if (count > 0) {
                const probability = count / totalPatterns;
                shannonDiversity -= probability * Math.log2(probability);
            }
        }
        
        // Normalize by maximum possible diversity
        const maxDiversity = Math.log2(categoryCounts.size);
        return maxDiversity > 0 ? shannonDiversity / maxDiversity : 0;
    }
    
    private determineBiasImpactOnDiscovery(
        discoveryCompleteness: number,
        platformDiscoveryBalance: number,
        categoryDiscoveryBalance: number
    ): 'minimal' | 'moderate' | 'significant' {
        /**
         * Determine overall bias impact on discovery process
         */
        const averageScore = (discoveryCompleteness + platformDiscoveryBalance + categoryDiscoveryBalance) / 3;
        
        if (averageScore < 0.4) return 'significant';
        if (averageScore < 0.7) return 'moderate';
        return 'minimal';
    }
    
    private calculateDiscoveryByPlatform(
        patternDiscoveryData: PatternDiscoverySpecificData,
        cmsDistribution: CMSDistributionV2
    ): Map<string, number> {
        /**
         * Calculate discovery rate by platform
         */
        const discoveryRates = new Map<string, number>();
        const expectedPatternsPerPlatform = 10; // Baseline expectation
        
        for (const [platform, _stats] of cmsDistribution.distributions) {
            // Count patterns discovered for this platform
            let discoveredCount = 0;
            for (const [_patternName, pattern] of patternDiscoveryData.discoveredPatterns) {
                if (pattern.platformAssociation === platform) {
                    discoveredCount++;
                }
            }
            
            const discoveryRate = discoveredCount / expectedPatternsPerPlatform;
            discoveryRates.set(platform, discoveryRate);
        }
        
        return discoveryRates;
    }

    // Helper methods for completing TODO functionality
    
    /**
     * Calculate statistical confidence for conditional probabilities
     */
    private calculateStatisticalConfidence(occurrences: number, totalForCMS: number): number {
        // Use Wilson score interval for confidence calculation
        if (totalForCMS === 0 || occurrences === 0) return 0;
        
        const n = totalForCMS;
        const p = occurrences / n;
        const z = 1.96; // 95% confidence
        
        // Wilson score interval
        const denominator = 1 + (z * z) / n;
        const centerAdjustment = p + (z * z) / (2 * n);
        const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
        
        const confidence = (centerAdjustment - margin / denominator) / denominator;
        return Math.max(0, Math.min(1, confidence));
    }
    
    /**
     * Calculate statistical significance for conditional probabilities
     */
    private calculateStatisticalSignificance(
        occurrences: number, 
        totalForCMS: number, 
        expectedProbability: number
    ): boolean {
        if (totalForCMS < 5 || occurrences === 0) return false;
        
        const _observedProbability = occurrences / totalForCMS;
        const expected = expectedProbability * totalForCMS;
        
        // Chi-square goodness of fit test
        if (expected < 5) return false;
        
        const chiSquare = Math.pow(occurrences - expected, 2) / expected + 
                         Math.pow((totalForCMS - occurrences) - (totalForCMS - expected), 2) / (totalForCMS - expected);
        
        // Critical value for 95% confidence (df=1)
        return chiSquare > 3.84;
    }
    
    /**
     * Calculate information gain (entropy reduction)
     */
    private calculateInformationGain(
        cmsGivenHeader: Map<string, ConditionalProbability>,
        cmsDistribution: CMSDistributionV2
    ): number {
        // Calculate original entropy of CMS distribution
        let originalEntropy = 0;
        for (const [_cms, stats] of cmsDistribution.distributions) {
            const p = stats.percentage / 100;
            if (p > 0) {
                originalEntropy -= p * Math.log2(p);
            }
        }
        
        // Calculate weighted entropy after seeing the header
        let weightedEntropy = 0;
        const totalProbability = Array.from(cmsGivenHeader.values())
            .reduce((sum, cp) => sum + cp.probability, 0);
            
        if (totalProbability > 0) {
            for (const condProb of cmsGivenHeader.values()) {
                const weight = condProb.probability / totalProbability;
                if (condProb.probability > 0) {
                    weightedEntropy -= weight * condProb.probability * Math.log2(condProb.probability);
                }
            }
        }
        
        return Math.max(0, originalEntropy - weightedEntropy);
    }
    
    /**
     * Calculate discriminative power of a header
     */
    private calculateDiscriminativePower(
        cmsGivenHeader: Map<string, ConditionalProbability>
    ): number {
        if (cmsGivenHeader.size === 0) return 0;
        
        // Calculate max probability vs average of others
        const probabilities = Array.from(cmsGivenHeader.values()).map(cp => cp.probability);
        const maxProb = Math.max(...probabilities);
        const avgOthers = probabilities.length > 1 ? 
            (probabilities.reduce((sum, p) => sum + p, 0) - maxProb) / (probabilities.length - 1) : 0;
        
        // Discriminative power is the ratio of max to average others
        return avgOthers > 0 ? maxProb / avgOthers : maxProb;
    }

    // Phase 6.4: Advanced Statistical Validation Features
    
    /**
     * Perform cross-analyzer statistical consistency checks
     * This ensures mathematical consistency between bias analysis and other V2 analyzers
     */
    private performCrossAnalyzerConsistencyChecks(
        data: PreprocessedData,
        headerCorrelations: Map<string, HeaderCMSCorrelationV2>
    ): { passed: boolean; issues: string[] } {
        const issues: string[] = [];
        
        // Check 1: Header counts must match across analyzers
        const headerPatterns = data.metadata.validation?.validatedHeaders;
        if (headerPatterns) {
            for (const [headerName, correlation] of headerCorrelations) {
                const expectedCount = headerPatterns.get(headerName)?.siteCount || 0;
                const actualCount = correlation.overallMetrics.occurrences;
                
                if (Math.abs(expectedCount - actualCount) > 0) {
                    issues.push(`Header count mismatch for ${headerName}: expected ${expectedCount}, got ${actualCount}`);
                }
            }
        }
        
        // Check 2: Site totals must be consistent
        const totalSitesFromBias = Array.from(headerCorrelations.values())[0]?.overallMetrics.totalSites || 0;
        if (totalSitesFromBias !== data.totalSites) {
            issues.push(`Total sites mismatch: bias analysis=${totalSitesFromBias}, preprocessed=${data.totalSites}`);
        }
        
        // Check 3: Frequency calculations must be mathematically sound
        for (const [headerName, correlation] of headerCorrelations) {
            const calculatedFreq = correlation.overallMetrics.occurrences / correlation.overallMetrics.totalSites;
            const reportedFreq = correlation.overallMetrics.frequency;
            
            if (Math.abs(calculatedFreq - reportedFreq) > 0.001) {
                issues.push(`Frequency calculation error for ${headerName}: calculated=${calculatedFreq.toFixed(3)}, reported=${reportedFreq.toFixed(3)}`);
            }
        }
        
        return {
            passed: issues.length === 0,
            issues
        };
    }
    
    /**
     * Perform chi-square tests for bias significance
     * Tests whether header-CMS associations are statistically significant
     */
    private performChiSquareTests(
        headerCorrelations: Map<string, HeaderCMSCorrelationV2>,
        cmsDistribution: CMSDistributionV2
    ): { significantHeaders: number; averageChiSquare: number; averagePValue: number } {
        let totalChiSquare = 0;
        let totalPValue = 0;
        let significantCount = 0;
        let validTests = 0;
        
        for (const [_headerName, correlation] of headerCorrelations) {
            const chiSquareResult = this.calculateChiSquareForHeader(correlation, cmsDistribution);
            
            if (chiSquareResult.valid) {
                totalChiSquare += chiSquareResult.chiSquare;
                totalPValue += chiSquareResult.pValue;
                validTests++;
                
                if (chiSquareResult.pValue < 0.05) {
                    significantCount++;
                }
                
                // Store results in correlation for future reference
                if (correlation.perCMSMetrics) {
                    for (const [_cms, metrics] of correlation.perCMSMetrics) {
                        metrics.isStatisticallySignificant = chiSquareResult.pValue < 0.05;
                        metrics.chiSquareContribution = chiSquareResult.chiSquare;
                    }
                }
            }
        }
        
        return {
            significantHeaders: significantCount,
            averageChiSquare: validTests > 0 ? totalChiSquare / validTests : 0,
            averagePValue: validTests > 0 ? totalPValue / validTests : 1
        };
    }
    
    /**
     * Calculate chi-square test for individual header
     */
    private calculateChiSquareForHeader(
        correlation: HeaderCMSCorrelationV2,
        cmsDistribution: CMSDistributionV2
    ): { chiSquare: number; pValue: number; valid: boolean } {
        const observed: number[] = [];
        const expected: number[] = [];
        let totalObserved = 0;
        
        // Collect observed and expected frequencies for each CMS
        for (const [cms, cmsStats] of cmsDistribution.distributions) {
            const perCMSMetrics = correlation.perCMSMetrics.get(cms);
            if (perCMSMetrics) {
                const observedCount = perCMSMetrics.occurrences;
                const expectedCount = (correlation.overallMetrics.frequency * cmsStats.count);
                
                observed.push(observedCount);
                expected.push(expectedCount);
                totalObserved += observedCount;
            }
        }
        
        // Validate sample size adequacy
        const minExpectedCount = Math.min(...expected);
        if (minExpectedCount < 5 || totalObserved < 10) {
            return { chiSquare: 0, pValue: 1, valid: false };
        }
        
        // Calculate chi-square statistic
        let chiSquare = 0;
        for (let i = 0; i < observed.length; i++) {
            if (expected[i] > 0) {
                chiSquare += Math.pow(observed[i] - expected[i], 2) / expected[i];
            }
        }
        
        // Calculate p-value (simplified approximation)
        const degreesOfFreedom = observed.length - 1;
        const pValue = this.calculateChiSquarePValue(chiSquare, degreesOfFreedom);
        
        return { chiSquare, pValue, valid: true };
    }
    
    /**
     * Calculate confidence intervals for bias metrics
     */
    private calculateBiasConfidenceIntervals(
        headerCorrelations: Map<string, HeaderCMSCorrelationV2>
    ): Map<string, { lower: number; upper: number; margin: number }> {
        const intervals = new Map<string, { lower: number; upper: number; margin: number }>();
        
        for (const [headerName, correlation] of headerCorrelations) {
            const n = correlation.overallMetrics.totalSites;
            const p = correlation.overallMetrics.frequency;
            
            // Calculate 95% confidence interval for proportion
            if (n > 0 && p > 0 && p < 1) {
                const z = 1.96; // 95% confidence level
                const standardError = Math.sqrt((p * (1 - p)) / n);
                const margin = z * standardError;
                
                intervals.set(headerName, {
                    lower: Math.max(0, p - margin),
                    upper: Math.min(1, p + margin),
                    margin
                });
            }
        }
        
        return intervals;
    }
    
    /**
     * Validate sample size adequacy for bias analysis
     */
    private validateSampleSizeAdequacy(
        headerCorrelations: Map<string, HeaderCMSCorrelationV2>,
        _cmsDistribution: CMSDistributionV2
    ): { adequate: number; marginal: number; inadequate: number; recommendations: string[] } {
        let adequate = 0;
        let marginal = 0;
        let inadequate = 0;
        const recommendations: string[] = [];
        
        for (const [headerName, correlation] of headerCorrelations) {
            const totalOccurrences = correlation.overallMetrics.occurrences;
            const minCMSCount = Math.min(...Array.from(correlation.perCMSMetrics.values()).map(m => m.occurrences));
            
            if (totalOccurrences >= 30 && minCMSCount >= 5) {
                adequate++;
            } else if (totalOccurrences >= 15 && minCMSCount >= 3) {
                marginal++;
                if (marginal <= 5) { // Limit recommendations to avoid spam
                    recommendations.push(`${headerName}: marginal sample size (${totalOccurrences} total, ${minCMSCount} min per CMS)`);
                }
            } else {
                inadequate++;
                if (inadequate <= 3) { // Limit recommendations to avoid spam
                    recommendations.push(`${headerName}: inadequate sample size - consider excluding from analysis`);
                }
            }
        }
        
        // Add general recommendations
        if (inadequate > 0) {
            recommendations.push(`${inadequate} headers have inadequate sample sizes - consider increasing dataset size`);
        }
        if (marginal > adequate) {
            recommendations.push('Most headers have marginal sample sizes - results may be unreliable');
        }
        
        return { adequate, marginal, inadequate, recommendations };
    }
    
    /**
     * Perform bias detection sensitivity analysis
     */
    private performSensitivityAnalysis(
        cmsDistribution: CMSDistributionV2,
        headerCorrelations: Map<string, HeaderCMSCorrelationV2>
    ): { 
        sensitivityScore: number; 
        robustHeaders: string[]; 
        sensitiveHeaders: string[];
        recommendations: string[];
    } {
        const robustHeaders: string[] = [];
        const sensitiveHeaders: string[] = [];
        let totalSensitivity = 0;
        let validHeaders = 0;
        
        for (const [headerName, correlation] of headerCorrelations) {
            const sensitivity = this.calculateHeaderSensitivity(correlation, cmsDistribution);
            
            if (sensitivity !== null) {
                totalSensitivity += sensitivity;
                validHeaders++;
                
                if (sensitivity < 0.2) {
                    robustHeaders.push(headerName);
                } else if (sensitivity > 0.5) {
                    sensitiveHeaders.push(headerName);
                }
            }
        }
        
        const sensitivityScore = validHeaders > 0 ? totalSensitivity / validHeaders : 0;
        
        const recommendations: string[] = [];
        if (sensitivityScore > 0.4) {
            recommendations.push('High sensitivity detected - bias analysis may be unstable');
            recommendations.push('Consider platform-weighted analysis to reduce sensitivity');
        }
        
        if (sensitiveHeaders.length > 0) {
            recommendations.push(`Monitor sensitive headers: ${sensitiveHeaders.slice(0, 5).join(', ')}`);
        }
        
        if (robustHeaders.length > sensitiveHeaders.length) {
            recommendations.push(`Focus analysis on ${robustHeaders.length} robust headers for stable insights`);
        }
        
        return {
            sensitivityScore,
            robustHeaders,
            sensitiveHeaders,
            recommendations
        };
    }
    
    /**
     * Calculate sensitivity of individual header to dataset composition changes
     */
    private calculateHeaderSensitivity(
        correlation: HeaderCMSCorrelationV2,
        cmsDistribution: CMSDistributionV2
    ): number | null {
        // Calculate how much platform specificity would change with different dataset composition
        const platformSpecificity = correlation.platformSpecificity.score;
        const dominantPlatforms = cmsDistribution.dominantPlatforms;
        
        if (dominantPlatforms.length === 0) return null;
        
        // Estimate sensitivity based on concentration and conditional probabilities
        let maxConditionalProb = 0;
        for (const [_cms, condProb] of correlation.conditionalProbabilities.cmsGivenHeader) {
            maxConditionalProb = Math.max(maxConditionalProb, condProb.probability);
        }
        
        // High sensitivity if header is closely tied to dominant platform
        const concentrationFactor = cmsDistribution.concentrationScore;
        const sensitivity = platformSpecificity * maxConditionalProb * concentrationFactor;
        
        return Math.min(sensitivity, 1.0);
    }
    
    
    /**
     * Enhanced bias analysis with statistical validation
     * This integrates all the advanced statistical features
     */
    private enhanceWithStatisticalValidation(
        biasResult: BiasSpecificData,
        data: PreprocessedData
    ): BiasSpecificData {
        // 1. Cross-analyzer consistency checks
        const consistencyCheck = this.performCrossAnalyzerConsistencyChecks(
            data, 
            biasResult.headerCorrelations
        );
        
        // 2. Chi-square significance testing
        const chiSquareResults = this.performChiSquareTests(
            biasResult.headerCorrelations,
            biasResult.cmsDistribution
        );
        
        // 3. Confidence intervals
        const confidenceIntervals = this.calculateBiasConfidenceIntervals(
            biasResult.headerCorrelations
        );
        
        // 4. Sample size validation
        const sampleSizeValidation = this.validateSampleSizeAdequacy(
            biasResult.headerCorrelations,
            biasResult.cmsDistribution
        );
        
        // 5. Sensitivity analysis  
        const sensitivityAnalysis = this.performSensitivityAnalysis(
            biasResult.cmsDistribution,
            biasResult.headerCorrelations
        );
        
        // Enhance statistical summary with advanced metrics
        biasResult.statisticalSummary.chiSquareResults = {
            statisticallySignificantHeaders: chiSquareResults.significantHeaders,
            averageChiSquare: chiSquareResults.averageChiSquare,
            averagePValue: chiSquareResults.averagePValue,
            significanceThreshold: 0.05
        };
        
        biasResult.statisticalSummary.sampleSizeAdequacy = sampleSizeValidation;
        
        // Add validation warnings if consistency checks failed
        if (!consistencyCheck.passed) {
            biasResult.biasWarnings.push({
                type: 'cross_analyzer',
                severity: 'critical',
                message: 'Cross-analyzer consistency check failed',
                affectedHeaders: [],
                affectedPlatforms: [],
                metricValue: consistencyCheck.issues.length,
                threshold: 0,
                recommendation: 'Review data preprocessing and analyzer integration',
                relatedAnalyzer: 'CrossAnalyzerValidation',
                crossAnalyzerEvidence: { issues: consistencyCheck.issues }
            });
        }
        
        // Add sensitivity warnings
        if (sensitivityAnalysis.sensitivityScore > 0.4) {
            biasResult.biasWarnings.push({
                type: 'header_specificity',
                severity: 'warning',
                message: `High sensitivity detected (${(sensitivityAnalysis.sensitivityScore * 100).toFixed(1)}%)`,
                affectedHeaders: sensitivityAnalysis.sensitiveHeaders,
                affectedPlatforms: [],
                metricValue: sensitivityAnalysis.sensitivityScore,
                threshold: 0.4,
                recommendation: 'Monitor bias stability with different dataset compositions',
                relatedAnalyzer: 'SensitivityAnalysis',
                crossAnalyzerEvidence: { 
                    robustHeaders: sensitivityAnalysis.robustHeaders.length,
                    sensitiveHeaders: sensitivityAnalysis.sensitiveHeaders.length
                }
            });
        }
        
        logger.debug('Statistical validation completed', {
            consistencyPassed: consistencyCheck.passed,
            significantHeaders: chiSquareResults.significantHeaders,
            adequateSampleSizes: sampleSizeValidation.adequate,
            sensitivityScore: sensitivityAnalysis.sensitivityScore,
            confidenceIntervals: confidenceIntervals.size
        });
        
        return biasResult;
    }

    // Phase 6.3: Enhanced Reporting Integration Features
    
    /**
     * Design bias visualization data structures
     * Creates structured data optimized for visualization tools
     */
    private createBiasVisualizationData(
        biasResult: BiasSpecificData
    ): {
        concentrationChart: { platform: string; percentage: number; sites: number }[];
        riskMatrix: { category: string; risk: string; score: number; description: string }[];
        timeSeriesData: { timestamp: string; concentrationScore: number; biasRisk: string }[];
        correlationHeatmap: { header: string; cms: string; correlation: number; significance: boolean }[];
    } {
        // Concentration chart data
        const concentrationChart = Array.from(biasResult.cmsDistribution.distributions.entries())
            .map(([platform, stats]) => ({
                platform,
                percentage: stats.percentage,
                sites: stats.count
            }))
            .sort((a, b) => b.percentage - a.percentage);

        // Risk matrix data
        const riskMatrix = [
            {
                category: 'Overall Dataset',
                risk: biasResult.concentrationMetrics.overallBiasRisk,
                score: biasResult.concentrationMetrics.herfindahlIndex,
                description: `HHI concentration score: ${(biasResult.concentrationMetrics.herfindahlIndex * 100).toFixed(1)}%`
            },
            {
                category: 'Platform Concentration',
                risk: biasResult.concentrationMetrics.concentrationRisk,
                score: biasResult.concentrationMetrics.dominanceRatio,
                description: `Dominant platform ratio: ${biasResult.concentrationMetrics.dominanceRatio.toFixed(2)}`
            },
            {
                category: 'Platform Diversity',
                risk: biasResult.concentrationMetrics.diversityRisk,
                score: biasResult.concentrationMetrics.shannonDiversity,
                description: `Shannon diversity: ${biasResult.concentrationMetrics.shannonDiversity.toFixed(3)}`
            }
        ];

        // Technology bias risks
        if (biasResult.technologyBias) {
            riskMatrix.push({
                category: 'Technology Bias',
                risk: biasResult.technologyBias.overallTechnologyBias,
                score: biasResult.technologyBias.dominantVendors.length / 10, // Normalize
                description: `${biasResult.technologyBias.dominantVendors.length} dominant vendors`
            });
        }

        // Semantic bias risks
        if (biasResult.semanticBias) {
            riskMatrix.push({
                category: 'Semantic Bias',
                risk: biasResult.semanticBias.overallSemanticBias,
                score: biasResult.semanticBias.overrepresentedCategories.length / 5, // Normalize
                description: `${biasResult.semanticBias.overrepresentedCategories.length} overrepresented categories`
            });
        }

        // Time series data (placeholder - would be enhanced with historical data)
        const timeSeriesData = [{
            timestamp: new Date().toISOString(),
            concentrationScore: biasResult.concentrationMetrics.herfindahlIndex,
            biasRisk: biasResult.concentrationMetrics.overallBiasRisk
        }];

        // Correlation heatmap data
        const correlationHeatmap: { header: string; cms: string; correlation: number; significance: boolean }[] = [];
        for (const [headerName, correlation] of biasResult.headerCorrelations) {
            for (const [cms, condProb] of correlation.conditionalProbabilities.cmsGivenHeader) {
                correlationHeatmap.push({
                    header: headerName,
                    cms,
                    correlation: condProb.probability,
                    significance: condProb.isSignificant
                });
            }
        }

        return {
            concentrationChart,
            riskMatrix,
            timeSeriesData,
            correlationHeatmap
        };
    }

    /**
     * Implement bias severity scoring for prioritization
     * Creates a unified scoring system for prioritizing bias issues
     */
    private calculateBiasSeverityScores(
        biasResult: BiasSpecificData
    ): {
        overallSeverity: number;
        categoryScores: Map<string, { score: number; priority: 'low' | 'medium' | 'high' | 'critical'; factors: string[] }>;
        prioritizedIssues: Array<{ issue: string; severity: number; category: string; recommendation: string }>;
    } {
        const categoryScores = new Map<string, { score: number; priority: 'low' | 'medium' | 'high' | 'critical'; factors: string[] }>();
        const prioritizedIssues: Array<{ issue: string; severity: number; category: string; recommendation: string }> = [];

        // Dataset concentration severity
        let concentrationScore = 0;
        const concentrationFactors: string[] = [];
        
        if (biasResult.concentrationMetrics.herfindahlIndex > 0.6) {
            concentrationScore += 30;
            concentrationFactors.push('High HHI concentration');
        }
        if (biasResult.concentrationMetrics.dominanceRatio > 3.0) {
            concentrationScore += 20;
            concentrationFactors.push('Dominant platform');
        }
        if (biasResult.cmsDistribution.dominantPlatforms.length > 0) {
            concentrationScore += 15;
            concentrationFactors.push('Platform dominance');
        }

        categoryScores.set('concentration', {
            score: concentrationScore,
            priority: concentrationScore > 50 ? 'critical' : concentrationScore > 30 ? 'high' : concentrationScore > 15 ? 'medium' : 'low',
            factors: concentrationFactors
        });

        // Statistical significance severity
        let statisticalScore = 0;
        const statisticalFactors: string[] = [];
        
        if (biasResult.statisticalSummary.chiSquareResults) {
            const chi = biasResult.statisticalSummary.chiSquareResults;
            const significanceRatio = chi.statisticallySignificantHeaders / biasResult.statisticalSummary.totalHeadersAnalyzed;
            
            if (significanceRatio < 0.3) {
                statisticalScore += 25;
                statisticalFactors.push('Low statistical significance');
            }
            if (chi.averagePValue > 0.1) {
                statisticalScore += 15;
                statisticalFactors.push('High p-values');
            }
            if (biasResult.statisticalSummary.sampleSizeAdequacy && 
                biasResult.statisticalSummary.sampleSizeAdequacy.inadequate > biasResult.statisticalSummary.sampleSizeAdequacy.adequate) {
                statisticalScore += 20;
                statisticalFactors.push('Inadequate sample sizes');
            }
        }

        categoryScores.set('statistical', {
            score: statisticalScore,
            priority: statisticalScore > 45 ? 'critical' : statisticalScore > 30 ? 'high' : statisticalScore > 15 ? 'medium' : 'low',
            factors: statisticalFactors
        });

        // Cross-analyzer bias severity
        let crossAnalyzerScore = 0;
        const crossAnalyzerFactors: string[] = [];

        if (biasResult.technologyBias && biasResult.technologyBias.overallTechnologyBias !== 'low') {
            crossAnalyzerScore += biasResult.technologyBias.overallTechnologyBias === 'high' ? 25 : 15;
            crossAnalyzerFactors.push(`Technology bias: ${biasResult.technologyBias.overallTechnologyBias}`);
        }

        if (biasResult.semanticBias && biasResult.semanticBias.overallSemanticBias !== 'low') {
            crossAnalyzerScore += biasResult.semanticBias.overallSemanticBias === 'high' ? 25 : 15;
            crossAnalyzerFactors.push(`Semantic bias: ${biasResult.semanticBias.overallSemanticBias}`);
        }

        if (biasResult.patternDiscoveryBias && biasResult.patternDiscoveryBias.overallDiscoveryBias !== 'low') {
            crossAnalyzerScore += biasResult.patternDiscoveryBias.overallDiscoveryBias === 'high' ? 25 : 15;
            crossAnalyzerFactors.push(`Pattern discovery bias: ${biasResult.patternDiscoveryBias.overallDiscoveryBias}`);
        }

        categoryScores.set('cross_analyzer', {
            score: crossAnalyzerScore,
            priority: crossAnalyzerScore > 50 ? 'critical' : crossAnalyzerScore > 30 ? 'high' : crossAnalyzerScore > 15 ? 'medium' : 'low',
            factors: crossAnalyzerFactors
        });

        // Warning severity
        let warningScore = 0;
        const criticalWarnings = biasResult.biasWarnings.filter(w => w.severity === 'critical').length;
        const warningCount = biasResult.biasWarnings.filter(w => w.severity === 'warning').length;
        
        warningScore = criticalWarnings * 20 + warningCount * 10;
        
        categoryScores.set('warnings', {
            score: warningScore,
            priority: warningScore > 40 ? 'critical' : warningScore > 20 ? 'high' : warningScore > 10 ? 'medium' : 'low',
            factors: [`${criticalWarnings} critical, ${warningCount} warnings`]
        });

        // Calculate overall severity
        const overallSeverity = Array.from(categoryScores.values()).reduce((sum, cat) => sum + cat.score, 0) / categoryScores.size;

        // Generate prioritized issues
        for (const [category, scoreData] of categoryScores) {
            if (scoreData.priority === 'critical' || scoreData.priority === 'high') {
                prioritizedIssues.push({
                    issue: `${category.replace('_', ' ')} bias detected`,
                    severity: scoreData.score,
                    category,
                    recommendation: this.generateCategoryRecommendation(category, scoreData.factors)
                });
            }
        }

        // Sort by severity
        prioritizedIssues.sort((a, b) => b.severity - a.severity);

        return {
            overallSeverity,
            categoryScores,
            prioritizedIssues
        };
    }

    /**
     * Create bias impact assessment for recommendations
     * Assesses how bias affects the reliability of recommendations
     */
    private createBiasImpactAssessment(
        biasResult: BiasSpecificData
    ): {
        recommendationReliability: 'high' | 'medium' | 'low';
        impactFactors: Array<{ factor: string; impact: 'high' | 'medium' | 'low'; description: string }>;
        mitigationStrategies: Array<{ strategy: string; effectiveness: 'high' | 'medium' | 'low'; effort: 'low' | 'medium' | 'high' }>;
        confidenceAdjustments: Map<string, { originalConfidence: number; adjustedConfidence: number; reason: string }>;
    } {
        const impactFactors: Array<{ factor: string; impact: 'high' | 'medium' | 'low'; description: string }> = [];
        const mitigationStrategies: Array<{ strategy: string; effectiveness: 'high' | 'medium' | 'low'; effort: 'low' | 'medium' | 'high' }> = [];
        const confidenceAdjustments = new Map<string, { originalConfidence: number; adjustedConfidence: number; reason: string }>();

        // Assess concentration impact
        if (biasResult.concentrationMetrics.herfindahlIndex > 0.5) {
            impactFactors.push({
                factor: 'High platform concentration',
                impact: 'high',
                description: `Dataset is ${(biasResult.concentrationMetrics.herfindahlIndex * 100).toFixed(1)}% concentrated, reducing recommendation generalizability`
            });
            
            mitigationStrategies.push({
                strategy: 'Platform-weighted analysis',
                effectiveness: 'high',
                effort: 'medium'
            });
        }

        // Assess statistical significance impact
        if (biasResult.statisticalSummary.chiSquareResults) {
            const chi = biasResult.statisticalSummary.chiSquareResults;
            const significanceRatio = chi.statisticallySignificantHeaders / biasResult.statisticalSummary.totalHeadersAnalyzed;
            
            if (significanceRatio < 0.4) {
                impactFactors.push({
                    factor: 'Low statistical significance',
                    impact: 'medium',
                    description: `Only ${(significanceRatio * 100).toFixed(1)}% of headers are statistically significant`
                });
                
                mitigationStrategies.push({
                    strategy: 'Increase dataset size',
                    effectiveness: 'high',
                    effort: 'high'
                });
            }
        }

        // Assess cross-analyzer impact
        if (biasResult.technologyBias && biasResult.technologyBias.overallTechnologyBias === 'high') {
            impactFactors.push({
                factor: 'Technology vendor bias',
                impact: 'medium',
                description: 'Technology stack bias may skew technology-related recommendations'
            });
        }

        // Calculate overall reliability
        const highImpactCount = impactFactors.filter(f => f.impact === 'high').length;
        const mediumImpactCount = impactFactors.filter(f => f.impact === 'medium').length;
        
        const recommendationReliability: 'high' | 'medium' | 'low' = 
            highImpactCount > 0 ? 'low' :
            mediumImpactCount > 1 ? 'medium' : 'high';

        // Generate confidence adjustments for high-risk headers
        for (const [headerName, correlation] of biasResult.headerCorrelations) {
            if (correlation.platformSpecificity.score > 0.8 && correlation.recommendationRisk.overallRisk !== 'low') {
                const originalConfidence = correlation.recommendationRisk.recommendationConfidence === 'high' ? 0.9 : 
                                         correlation.recommendationRisk.recommendationConfidence === 'medium' ? 0.7 : 0.5;
                const adjustedConfidence = Math.max(0.3, originalConfidence * 0.7); // Reduce by 30%
                
                confidenceAdjustments.set(headerName, {
                    originalConfidence,
                    adjustedConfidence,
                    reason: `High platform specificity (${correlation.platformSpecificity.score.toFixed(2)}) with ${correlation.recommendationRisk.overallRisk} risk`
                });
            }
        }

        return {
            recommendationReliability,
            impactFactors,
            mitigationStrategies,
            confidenceAdjustments
        };
    }

    /**
     * Generate category-specific recommendations
     */
    private generateCategoryRecommendation(category: string, factors: string[]): string {
        switch (category) {
            case 'concentration':
                return 'Consider collecting data from more diverse platforms to reduce concentration bias';
            case 'statistical':
                return 'Increase sample sizes and validate statistical assumptions before making recommendations';
            case 'cross_analyzer':
                return 'Apply cross-analyzer bias correction factors when generating recommendations';
            case 'warnings':
                return 'Address critical bias warnings before using results for decision making';
            default:
                return `Review ${factors.join(', ').toLowerCase()} and apply appropriate bias mitigation strategies`;
        }
    }

    /**
     * Enhanced bias analysis with reporting integration
     * This integrates all Phase 6.3 reporting features
     */
    private enhanceWithReportingIntegration(
        biasResult: BiasSpecificData
    ): BiasSpecificData {
        // Generate visualization data
        const visualizationData = this.createBiasVisualizationData(biasResult);
        
        // Calculate severity scores
        const severityScores = this.calculateBiasSeverityScores(biasResult);
        
        // Create impact assessment
        const impactAssessment = this.createBiasImpactAssessment(biasResult);
        
        // Enhance the bias result with reporting metadata
        const enhancedResult = {
            ...biasResult,
            // Add reporting-specific metadata
            reportingMetadata: {
                visualizationData,
                severityScores,
                impactAssessment,
                generatedAt: new Date().toISOString(),
                reportingVersion: '2.0'
            }
        };
        
        logger.debug('Reporting integration completed', {
            visualizationDataPoints: visualizationData.concentrationChart.length,
            severityScore: severityScores.overallSeverity,
            prioritizedIssues: severityScores.prioritizedIssues.length,
            recommendationReliability: impactAssessment.recommendationReliability,
            confidenceAdjustments: impactAssessment.confidenceAdjustments.size
        });
        
        return enhancedResult;
    }

    /**
     * Extract common values for a header within a specific CMS
     */
    private extractCommonValuesForCMS(headerName: string, cms: string, data: PreprocessedData): string[] {
        const cmsValues = new Map<string, number>();
        
        for (const [_siteUrl, siteData] of data.sites) {
            // Only consider sites with this CMS
            if (siteData.cms !== cms) continue;
            
            // Get header values for this header name
            const headerValues = siteData.headers?.get(headerName);
            if (headerValues) {
                for (const headerValue of headerValues) {
                    if (headerValue) {
                        cmsValues.set(headerValue, (cmsValues.get(headerValue) || 0) + 1);
                    }
                }
            }
        }
        
        // Return top 3 most common values
        const sortedValues = Array.from(cmsValues.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([value]) => value);
            
        return sortedValues;
    }

    /**
     * Calculate value uniqueness score for a header within a specific CMS
     */
    private calculateValueUniquenessForCMS(headerName: string, cms: string, data: PreprocessedData): number {
        const cmsValues = new Map<string, number>();
        let totalOccurrences = 0;
        
        for (const [_siteUrl, siteData] of data.sites) {
            // Only consider sites with this CMS
            if (siteData.cms !== cms) continue;
            
            // Get header values for this header name
            const headerValues = siteData.headers?.get(headerName);
            if (headerValues) {
                for (const headerValue of headerValues) {
                    if (headerValue) {
                        cmsValues.set(headerValue, (cmsValues.get(headerValue) || 0) + 1);
                        totalOccurrences++;
                    }
                }
            }
        }
        
        if (totalOccurrences === 0) return 0;
        
        // Calculate Shannon diversity index for value uniqueness
        let diversity = 0;
        for (const count of cmsValues.values()) {
            const probability = count / totalOccurrences;
            diversity -= probability * Math.log2(probability);
        }
        
        // Normalize by maximum possible diversity (log2 of unique values)
        const maxDiversity = Math.log2(cmsValues.size);
        return maxDiversity > 0 ? diversity / maxDiversity : 0;
    }

    /**
     * Calculate chi-square distribution p-value
     * Simple approximation for statistical significance testing
     */
    private calculateChiSquarePValue(chiSquare: number, degreesOfFreedom: number): number {
        // Simple approximation using Gamma function relationship
        // For more precision, could use a proper chi-square distribution library
        if (chiSquare <= 0 || degreesOfFreedom <= 0) return 1;
        
        // Very basic approximation for common degrees of freedom
        // This is sufficient for bias analysis where exact p-values aren't critical
        if (degreesOfFreedom === 1) {
            // Chi-square with 1 df approximation
            if (chiSquare >= 3.84) return 0.05;
            if (chiSquare >= 6.64) return 0.01;
            if (chiSquare >= 10.83) return 0.001;
            return 0.1; // Conservative estimate
        } else if (degreesOfFreedom === 2) {
            // Chi-square with 2 df approximation  
            if (chiSquare >= 5.99) return 0.05;
            if (chiSquare >= 9.21) return 0.01;
            if (chiSquare >= 13.82) return 0.001;
            return 0.1;
        } else {
            // General approximation for higher df
            const critical05 = 3.84 + (degreesOfFreedom - 1) * 2;
            const critical01 = 6.64 + (degreesOfFreedom - 1) * 2.5;
            
            if (chiSquare >= critical01) return 0.01;
            if (chiSquare >= critical05) return 0.05;
            return 0.1;
        }
    }
}