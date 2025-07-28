/**
 * V2 Bias Analysis Types - Pure V2 Architecture
 * 
 * This file defines V2-native data structures for bias analysis output,
 * designed to work with preprocessed data and integrate with other V2 analyzers.
 * 
 * Key principles:
 * - Uses preprocessed data as single source of truth
 * - Integrates with other V2 analyzers via dependency injection
 * - Maintains statistical algorithm sophistication
 * - Zero V1 dependencies
 */

/**
 * Main interface for bias analyzer output
 */
export interface BiasSpecificData {
    cmsDistribution: CMSDistributionV2;
    concentrationMetrics: ConcentrationMetrics;
    headerCorrelations: Map<string, HeaderCMSCorrelationV2>;
    biasWarnings: BiasWarning[];
    platformSpecificityScores: Map<string, number>;
    statisticalSummary: BiasStatisticalSummary;
    
    // Cross-analyzer insights (dependency injection)
    technologyBias?: TechnologyBiasAssessment;
    semanticBias?: SemanticBiasAssessment;
    patternDiscoveryBias?: PatternDiscoveryBiasAssessment;
}

/**
 * CMS distribution analysis using preprocessed site data
 */
export interface CMSDistributionV2 {
    distributions: Map<string, CMSStats>;
    totalSites: number;
    concentrationScore: number; // HHI-based concentration index (0-1)
    dominantPlatforms: string[]; // Platforms with >60% representation
    diversityIndex: number; // Shannon diversity index
    enterpriseSites: number; // Sites categorized as enterprise
    unknownSites: number; // Sites with no CMS detection
    
    // Enhanced categorization based on preprocessed data
    siteCategories: {
        cms: number;
        enterprise: number;
        cdn: number;
        unknown: number;
    };
}

/**
 * Statistics for individual CMS platforms
 */
export interface CMSStats {
    count: number;
    percentage: number;
    sites: Set<string>; // Use Set for efficient operations
    averageConfidence: number; // From CMS detection confidence scores
    
    // Enhanced metadata from preprocessed data
    versionDetections?: Map<string, number>; // CMS version -> count
    technologyStack?: string[]; // Associated technologies
}

/**
 * Concentration and diversity metrics
 */
export interface ConcentrationMetrics {
    herfindahlIndex: number; // HHI concentration score (0-10000, normalized to 0-1)
    shannonDiversity: number; // Shannon diversity index
    effectiveNumberOfPlatforms: number; // Exp(shannon_diversity)
    dominanceRatio: number; // Largest platform % / Second largest platform %
    
    // Bias risk assessment
    concentrationRisk: 'low' | 'medium' | 'high';
    diversityRisk: 'low' | 'medium' | 'high';
    overallBiasRisk: 'low' | 'medium' | 'high';
}

/**
 * Header-CMS correlation analysis with V2 integration
 */
export interface HeaderCMSCorrelationV2 {
    headerName: string;
    overallMetrics: OverallHeaderMetrics;
    perCMSMetrics: Map<string, CMSSpecificMetrics>;
    conditionalProbabilities: ConditionalProbabilityMatrix;
    platformSpecificity: PlatformSpecificityScore;
    biasAdjustments: BiasAdjustmentFactors;
    recommendationRisk: RecommendationRiskAssessment;
    
    // V2 enhancements from cross-analyzer data
    semanticContext?: SemanticHeaderContext;
    vendorContext?: VendorHeaderContext;
    validationContext?: ValidationHeaderContext;
}

/**
 * Overall metrics for a header across all sites
 */
export interface OverallHeaderMetrics {
    frequency: number; // Percentage of sites with this header (0-1)
    occurrences: number; // Total unique sites with header
    totalSites: number; // Total sites in dataset
    
    // Page type distribution
    pageTypeDistribution: {
        mainpage: number;
        robots: number;
        both: number;
    };
    
    // Value diversity metrics
    uniqueValues: number;
    averageValuesPerSite: number;
    mostCommonValue?: string;
}

/**
 * CMS-specific metrics for a header
 */
export interface CMSSpecificMetrics {
    cms: string;
    frequency: number; // Percentage of CMS sites with this header (0-1)
    occurrences: number; // Number of CMS sites with header
    totalSitesForCMS: number; // Total sites for this CMS
    
    // Statistical significance
    expectedOccurrences: number; // Based on overall frequency
    chiSquareContribution: number; // Contribution to chi-square test
    isStatisticallySignificant: boolean;
    
    // Value patterns within CMS
    commonValues: string[];
    valueUniqueness: number; // How unique values are for this CMS
}

/**
 * Conditional probability matrix for P(CMS|header) analysis
 */
export interface ConditionalProbabilityMatrix {
    // P(CMS|header) - probability of CMS given header presence
    cmsGivenHeader: Map<string, ConditionalProbability>;
    
    // P(header|CMS) - probability of header given CMS (same as frequency)
    headerGivenCMS: Map<string, ConditionalProbability>;
    
    // Summary statistics
    maxConditionalProbability: number;
    entropyReduction: number; // Information gain from knowing header
    discriminativePower: number; // How well header distinguishes CMSs
}

/**
 * Individual conditional probability
 */
export interface ConditionalProbability {
    probability: number; // 0-1
    count: number; // Raw count for transparency
    confidence: number; // Statistical confidence based on sample size
    
    // Comparison to baseline
    expectedProbability: number; // Based on overall CMS distribution
    lift: number; // Actual / Expected probability
    isSignificant: boolean; // Statistical significance
}

/**
 * Platform specificity scoring with two-tier approach
 */
export interface PlatformSpecificityScore {
    score: number; // 0-1 platform specificity score
    method: 'discriminative' | 'coefficient_variation'; // Method used
    
    // Method-specific details
    discriminativeDetails?: {
        topCMS: string;
        topCMSProbability: number; // P(topCMS|header)
        concentrationScore: number;
        sampleSizeScore: number;
        backgroundContrast: number;
        discriminativeThreshold: number; // Minimum P(CMS|header) required
    };
    
    coefficientVariationDetails?: {
        mean: number;
        standardDeviation: number;
        coefficientOfVariation: number;
        normalized: number;
    };
    
    // Quality assessment
    sampleSizeAdequacy: 'low' | 'medium' | 'high';
    recommendationConfidence: 'low' | 'medium' | 'high';
}

/**
 * Bias adjustment factors for frequency calculations
 */
export interface BiasAdjustmentFactors {
    rawFrequency: number; // Original overall frequency
    biasAdjustedFrequency: number; // Adjusted for dataset composition
    adjustmentFactor: number; // biasAdjustedFrequency / rawFrequency
    
    // Adjustment methodology
    adjustmentMethod: 'equal_weight' | 'population_weight' | 'none';
    majorPlatformsConsidered: string[];
    weightingStrategy: WeightingStrategy;
    
    // Quality metrics
    adjustmentReliability: 'low' | 'medium' | 'high';
    impactAssessment: 'minimal' | 'moderate' | 'significant';
}

/**
 * Weighting strategy for bias adjustment
 */
export interface WeightingStrategy {
    strategy: string;
    weights: Map<string, number>; // CMS -> weight
    rationaleText: string;
    qualityScore: number; // 0-1 confidence in weighting
}

/**
 * Recommendation risk assessment
 */
export interface RecommendationRiskAssessment {
    overallRisk: 'low' | 'medium' | 'high';
    riskFactors: RiskFactor[];
    recommendationConfidence: 'low' | 'medium' | 'high';
    mitigationStrategies: string[];
    
    // Specific risk assessments
    platformSpecificityRisk: 'low' | 'medium' | 'high';
    datasetBiasRisk: 'low' | 'medium' | 'high';
    sampleSizeRisk: 'low' | 'medium' | 'high';
    statisticalSignificanceRisk: 'low' | 'medium' | 'high';
}

/**
 * Individual risk factor
 */
export interface RiskFactor {
    type: 'platform_specificity' | 'dataset_bias' | 'sample_size' | 'statistical_significance' | 'value_diversity';
    severity: 'low' | 'medium' | 'high';
    description: string;
    metricValue: number;
    threshold: number;
    recommendation: string;
}

/**
 * Bias warning with enhanced context
 */
export interface BiasWarning {
    type: 'concentration' | 'platform_dominance' | 'low_diversity' | 'unknown_sites' | 'header_specificity' | 'cross_analyzer';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    affectedHeaders?: string[];
    affectedPlatforms?: string[];
    
    // Quantitative details
    metricValue: number;
    threshold: number;
    recommendation: string;
    
    // Cross-analyzer context
    relatedAnalyzer?: string; // Which analyzer provided context
    crossAnalyzerEvidence?: Record<string, any>;
}

/**
 * Statistical summary of bias analysis
 */
export interface BiasStatisticalSummary {
    totalHeadersAnalyzed: number;
    headersWithBias: number;
    averagePlatformSpecificity: number;
    averageBiasAdjustment: number;
    
    // Distribution of confidence levels
    confidenceDistribution: {
        high: number;
        medium: number;
        low: number;
    };
    
    // Chi-square test results
    chiSquareResults: {
        statisticallySignificantHeaders: number;
        averageChiSquare: number;
        averagePValue: number;
        significanceThreshold: number;
    };
    
    // Sample size adequacy
    sampleSizeAdequacy: {
        adequate: number;
        marginal: number;
        inadequate: number;
    };
    
    // Overall assessment
    datasetQualityScore: number; // 0-1
    biasRiskScore: number; // 0-1
    recommendationReliabilityScore: number; // 0-1
}

// Cross-analyzer context interfaces

/**
 * Semantic context for headers from SemanticAnalyzerV2
 */
export interface SemanticHeaderContext {
    category: string;
    confidence: number;
    vendor?: string;
    platformName?: string;
    filterRecommendation: string;
    discriminativeScore: number;
}

/**
 * Vendor context for headers from VendorAnalyzerV2  
 */
export interface VendorHeaderContext {
    vendor: string;
    vendorCategory: string;
    vendorConfidence: number;
    technologySignatures: string[];
    conflictingVendors: string[];
}

/**
 * Validation context for headers from ValidationPipelineV2
 */
export interface ValidationHeaderContext {
    validationPassed: boolean;
    qualityScore: number;
    statisticallySignificant: boolean;
    sampleSizeAdequate: boolean;
    validationWarnings: string[];
}

// Cross-analyzer bias assessments

/**
 * Technology bias assessment using VendorAnalyzerV2 data
 */
export interface TechnologyBiasAssessment {
    vendorConcentration: Map<string, VendorConcentrationBias>;
    technologyStackBias: TechnologyStackBias[];
    overallTechnologyBias: 'low' | 'medium' | 'high';
    
    // Insights
    dominantVendors: string[];
    technologyGaps: string[];
    biasedTechnologyCategories: string[];
    recommendations: string[];
}

/**
 * Vendor concentration bias details
 */
export interface VendorConcentrationBias {
    vendor: string;
    headerCount: number;
    siteConcentration: number; // Percentage of sites using this vendor
    expectedConcentration: number; // Expected based on overall distribution
    biasScore: number; // How biased the dataset is toward this vendor
    impactedHeaders: string[];
}

/**
 * Technology stack bias analysis
 */
export interface TechnologyStackBias {
    category: string; // e.g., 'cdn', 'analytics', 'ecommerce'
    dominantTechnologies: string[];
    concentrationScore: number;
    diversityScore: number;
    biasRisk: 'low' | 'medium' | 'high';
    affectedAnalysis: string[];
}

/**
 * Semantic bias assessment using SemanticAnalyzerV2 data
 */
export interface SemanticBiasAssessment {
    categoryBias: Map<string, CategoryBias>;
    headerClassificationBias: HeaderClassificationBias[];
    overallSemanticBias: 'low' | 'medium' | 'high';
    
    // Insights
    overrepresentedCategories: string[];
    underrepresentedCategories: string[];
    misclassificationRisk: string[];
    recommendations: string[];
}

/**
 * Category-specific bias analysis
 */
export interface CategoryBias {
    category: string;
    expectedHeaders: number;
    actualHeaders: number;
    biasRatio: number; // actual / expected
    confidence: number;
    impactAssessment: 'low' | 'medium' | 'high';
}

/**
 * Header classification bias
 */
export interface HeaderClassificationBias {
    header: string;
    expectedCategory: string;
    actualClassification: string;
    confidence: number;
    biasEvidence: string[];
    recommendation: string;
}

/**
 * Pattern discovery bias assessment using PatternDiscoveryV2 data
 */
export interface PatternDiscoveryBiasAssessment {
    emergingPatternBias: EmergingPatternBias[];
    discoveryBias: DiscoveryBias;
    overallDiscoveryBias: 'low' | 'medium' | 'high';
    
    // Insights
    biasedEmergingPatterns: string[];
    underdiscoveredPatterns: string[];
    discoveryGaps: string[];
    recommendations: string[];
}

/**
 * Emerging pattern bias analysis
 */
export interface EmergingPatternBias {
    pattern: string;
    discoveryConfidence: number;
    datasetBiasImpact: number;
    platformSpecificity: number;
    biasRisk: 'low' | 'medium' | 'high';
    validation: string;
}

/**
 * Overall discovery bias metrics
 */
export interface DiscoveryBias {
    discoveryCompleteness: number; // 0-1, how complete discovery is
    platformDiscoveryBalance: number; // 0-1, how balanced across platforms
    categoryDiscoveryBalance: number; // 0-1, how balanced across categories
    biasImpactOnDiscovery: 'minimal' | 'moderate' | 'significant';
}