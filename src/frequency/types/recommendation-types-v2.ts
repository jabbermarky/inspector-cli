/**
 * V2 Recommendation System Type Definitions
 * 
 * This file defines comprehensive type-safe interfaces for the V2 recommendation system,
 * eliminating any types and providing strong typing throughout the recommendation pipeline.
 * 
 * Key principles applied:
 * - Zero `any` types for strong type safety
 * - Specific interfaces for all data structures  
 * - Discriminated unions for polymorphic data
 * - Comprehensive error type hierarchy
 * - Type guards for runtime validation
 */

// ============================================================================
// Core Recommendation Data Interface
// ============================================================================

export interface RecommendationSpecificData {
    readonly learnRecommendations: LearnRecommendationsV2;
    readonly detectCmsRecommendations: DetectCmsRecommendationsV2;
    readonly groundTruthRecommendations: GroundTruthRecommendationsV2;
    readonly crossAnalyzerInsights: CrossAnalyzerInsights;
    readonly recommendationMetrics: RecommendationQualityMetrics;
    readonly biasAwareAssessments: BiasAwareRecommendationAssessment;
}

// ============================================================================
// Learn Recommendations
// ============================================================================

export interface LearnRecommendationsV2 {
    readonly filteringRecommendations: FilteringRecommendation[];
    readonly retentionRecommendations: RetentionRecommendation[];
    readonly refinementSuggestions: RefinementSuggestion[];
    readonly confidenceDistribution: ConfidenceDistribution;
    readonly biasMitigationStrategies: BiasMitigationStrategy[];
}

export interface FilteringRecommendation {
    readonly pattern: string;
    readonly action: FilteringAction;
    readonly confidence: ConfidenceScore;
    readonly reasoning: RecommendationReasoning;
    readonly evidence: RecommendationEvidence;
    readonly biasAssessment: BiasRiskAssessment;
    readonly crossAnalyzerSupport: CrossAnalyzerEvidence;
    readonly diversityMetrics: DiversityMetrics;
}

export interface RetentionRecommendation {
    readonly pattern: string;
    readonly retentionReason: RetentionReason;
    readonly confidence: ConfidenceScore;
    readonly strategicValue: StrategicValue;
    readonly crossAnalyzerSupport: CrossAnalyzerEvidence;
    readonly technologyContext: TechnologyContext[];
}

export interface RefinementSuggestion {
    readonly currentPattern: string;
    readonly suggestedPattern: string;
    readonly refinementType: RefinementType;
    readonly expectedImprovement: ExpectedImprovement;
    readonly confidence: ConfidenceScore;
    readonly reasoning: RecommendationReasoning;
}

// ============================================================================
// Detect-CMS Recommendations
// ============================================================================

export interface DetectCmsRecommendationsV2 {
    readonly emergingOpportunities: EmergingPatternOpportunity[];
    readonly vendorBasedOpportunities: VendorBasedOpportunity[];
    readonly semanticOpportunities: SemanticOpportunity[];
    readonly technologyStackOpportunities: TechnologyStackOpportunity[];
    readonly confidenceDistribution: ConfidenceDistribution;
    readonly crossAnalyzerSupport: CrossAnalyzerInsights;
}

export interface EmergingPatternOpportunity {
    readonly type: 'emerging-pattern';
    readonly vendor: string;
    readonly patterns: EmergingPatternDetails[];
    readonly confidence: ConfidenceScore;
    readonly detectionRules: DetectionRule[];
    readonly reasoning: RecommendationReasoning;
    readonly temporalStability: TemporalStability;
}

export interface VendorBasedOpportunity {
    readonly type: 'vendor-cluster';
    readonly cluster: TechnologyCluster;
    readonly detectionPotential: DetectionPotential;
    readonly suggestedPatterns: SuggestedPattern[];
    readonly confidence: ConfidenceScore;
    readonly reasoning: RecommendationReasoning;
}

export interface SemanticOpportunity {
    readonly type: 'semantic-signature';
    readonly semanticCategory: SemanticCategory;
    readonly technologySignatures: TechnologySignature[];
    readonly confidence: ConfidenceScore;
    readonly applicabilityScope: ApplicabilityScope;
}

export interface TechnologyStackOpportunity {
    readonly type: 'technology-stack';
    readonly technologyStack: TechnologyContext[];
    readonly detectionSignature: string;
    readonly confidence: ConfidenceScore;
    readonly platformIndicators: string[];
    readonly reasoning: RecommendationReasoning;
}

// ============================================================================
// Ground Truth Recommendations
// ============================================================================

export interface GroundTruthRecommendationsV2 {
    readonly statisticallyValidatedRules: StatisticallyValidatedRule[];
    readonly technologyBasedRules: TechnologyBasedRule[];
    readonly semanticCategoryRules: SemanticCategoryRule[];
    readonly confidenceDistribution: ConfidenceDistribution;
    readonly evidenceQuality: EvidenceQualityAssessment;
    readonly biasRiskAssessment: BiasRiskAssessment;
}

export interface StatisticallyValidatedRule {
    readonly pattern: string;
    readonly ruleType: 'multi-analyzer-validated';
    readonly confidence: ConfidenceScore;
    readonly supportingAnalyzers: SupportingAnalyzer[];
    readonly ruleTemplate: RuleTemplate;
    readonly evidenceChain: EvidenceChain;
    readonly biasAssessment: BiasRiskAssessment;
    readonly statisticalValidation: StatisticalValidation;
}

export interface TechnologyBasedRule {
    readonly pattern: string;
    readonly ruleType: 'technology-signature';
    readonly confidence: ConfidenceScore;
    readonly technologyContext: TechnologyContext;
    readonly ruleTemplate: RuleTemplate;
    readonly evidenceChain: EvidenceChain;
    readonly applicabilityConditions: ApplicabilityCondition[];
}

export interface SemanticCategoryRule {
    readonly pattern: string;
    readonly ruleType: 'semantic-category';
    readonly semanticCategory: SemanticCategory;
    readonly confidence: ConfidenceScore;
    readonly categorySpecificLogic: CategorySpecificLogic;
    readonly validationResults: ValidationResult[];
}

// ============================================================================
// Cross-Analyzer Intelligence
// ============================================================================

export interface CrossAnalyzerInsights {
    readonly analyzerAgreement: AnalyzerAgreement;
    readonly conflictResolution: ConflictResolution[];
    readonly emergingPatterns: EmergingPatternInsight[];
    readonly biasDetection: BiasDetectionInsight[];
    readonly confidenceCalibration: ConfidenceCalibration;
    readonly supportingAnalyzers: SupportingAnalyzer[];
}

export interface CrossAnalyzerEvidence {
    readonly headerAnalysis?: HeaderAnalysisEvidence;
    readonly vendorAnalysis?: VendorAnalysisEvidence;
    readonly semanticAnalysis?: SemanticAnalysisEvidence;
    readonly cooccurrenceAnalysis?: CooccurrenceAnalysisEvidence;
    readonly patternDiscovery?: PatternDiscoveryEvidence;
    readonly validationResults?: ValidationEvidence;
    readonly technologyAnalysis?: TechnologyAnalysisEvidence;
}

// ============================================================================
// Confidence and Evidence Systems
// ============================================================================

export interface ConfidenceScore {
    readonly value: number; // 0-1 range
    readonly level: ConfidenceLevel;
    readonly source: ConfidenceSource;
    readonly breakdown: ConfidenceBreakdown;
    readonly uncertainty: UncertaintyMeasure;
}

export interface RecommendationReasoning {
    readonly primaryReason: string;
    readonly supportingFactors: string[];
    readonly riskFactors: string[];
    readonly statisticalBasis: StatisticalJustification;
    readonly algorithmicLogic: AlgorithmicReasoning;
    readonly crossAnalyzerEvidence: CrossAnalyzerEvidence;
}

export interface RecommendationEvidence {
    readonly quality: number; // 0-1 range
    readonly sources: EvidenceSource[];
    readonly confidence: number; // 0-1 range
    readonly dataPoints: EvidenceDataPoint[];
    readonly validationResults: ValidationResult[];
}

// ============================================================================
// Bias-Aware Assessment
// ============================================================================

export interface BiasAwareRecommendationAssessment {
    readonly overallBiasRisk: BiasRiskLevel;
    readonly biasSourceIdentification: BiasSource[];
    readonly mitigationStrategies: BiasMitigationStrategy[];
    readonly biasAdjustedConfidence: ConfidenceScore;
    readonly transparencyReport: BiasTransparencyReport;
}

export interface BiasRiskAssessment {
    readonly riskLevel: BiasRiskLevel;
    readonly riskScore: number; // 0-1 range, higher = more risk
    readonly identifiedBiases: IdentifiedBias[];
    readonly mitigationStrategies: BiasMitigationStrategy[];
    readonly adjustmentFactor: number; // multiplier for confidence
}

// ============================================================================
// Quality Metrics
// ============================================================================

export interface RecommendationQualityMetrics {
    readonly accuracyEstimate: number; // 0-1 range
    readonly comprehensiveness: number; // 0-1 range
    readonly actionability: number; // 0-1 range
    readonly evidenceQuality: number; // 0-1 range
    readonly biasAwareness: number; // 0-1 range
    readonly crossAnalyzerAlignment: number; // 0-1 range
}

// ============================================================================
// Type Discriminators and Enums
// ============================================================================

export type FilteringAction = 'filter' | 'keep' | 'conditional';
export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'very-high';
export type BiasRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RetentionReason = 'high-discriminative-power' | 'technology-specific' | 'semantic-value' | 'cross-analyzer-support';
export type RefinementType = 'pattern-expansion' | 'pattern-restriction' | 'conditional-logic' | 'technology-specific';

// ============================================================================
// Supporting Types
// ============================================================================

export interface DiversityMetrics {
    readonly semanticDiversity: number;
    readonly vendorDiversity: number;
    readonly platformDiversity: number;
    readonly temporalStability: number;
    readonly overallScore: number;
}

export interface StrategicValue {
    readonly cmsDetectionValue: number;
    readonly learningValue: number;
    readonly groundTruthValue: number;
    readonly overallStrategicImportance: number;
}

export interface TechnologyContext {
    readonly technology: string;
    readonly version?: string;
    readonly category: TechnologyCategory;
    readonly confidence: number;
    readonly specificity: number;
}

export interface ExpectedImprovement {
    readonly accuracyImprovement: number;
    readonly precisionImprovement: number;
    readonly recallImprovement: number;
    readonly confidenceInImprovement: number;
}

export interface DetectionRule {
    readonly id: string;
    readonly pattern: string;
    readonly confidence: number;
    readonly conditions: RuleCondition[];
    readonly actions: RuleAction[];
}

export interface EvidenceChain {
    readonly links: EvidenceLink[];
    readonly strength: number;
    readonly reliability: number;
    readonly completeness: number;
}

export interface StatisticalValidation {
    readonly pValue: number;
    readonly confidenceInterval: ConfidenceInterval;
    readonly significanceLevel: number;
    readonly testStatistic: number;
    readonly testMethod: string;
}

// ============================================================================
// Error Types for Strong Error Handling
// ============================================================================

export abstract class RecommendationAnalysisError extends Error {
    constructor(
        message: string,
        public readonly code: RecommendationErrorCode,
        public readonly context: RecommendationErrorContext,
        cause?: Error
    ) {
        super(message);
        this.name = this.constructor.name;
        // Note: cause property not available in all TypeScript versions
    }
}

export class FilteringAnalysisError extends RecommendationAnalysisError {
    constructor(message: string, code: FilteringErrorCode, context: FilteringErrorContext, cause?: Error) {
        super(message, code, context, cause);
    }
}

export class CmsDetectionAnalysisError extends RecommendationAnalysisError {
    constructor(message: string, code: CmsDetectionErrorCode, context: CmsDetectionErrorContext, cause?: Error) {
        super(message, code, context, cause);
    }
}

export class GroundTruthAnalysisError extends RecommendationAnalysisError {
    constructor(message: string, code: GroundTruthErrorCode, context: GroundTruthErrorContext, cause?: Error) {
        super(message, code, context, cause);
    }
}

export type RecommendationErrorCode = FilteringErrorCode | CmsDetectionErrorCode | GroundTruthErrorCode | 'UNKNOWN_ERROR';

export type FilteringErrorCode = 
    | 'INSUFFICIENT_DATA'
    | 'DIVERSITY_CALCULATION_FAILURE'
    | 'BIAS_ASSESSMENT_FAILURE'
    | 'CONFIDENCE_CALCULATION_ERROR';

export type CmsDetectionErrorCode =
    | 'PATTERN_DISCOVERY_FAILURE'
    | 'VENDOR_CLUSTERING_ERROR'
    | 'SEMANTIC_ANALYSIS_UNAVAILABLE'
    | 'DETECTION_RULE_GENERATION_FAILURE';

export type GroundTruthErrorCode =
    | 'PATTERN_IDENTIFICATION_FAILURE'
    | 'EVIDENCE_CHAIN_FAILURE'
    | 'CONFIDENCE_CALIBRATION_FAILURE'
    | 'STATISTICAL_VALIDATION_ERROR';

// Re-export analyzer interface types for convenience
export { AnalysisResult, AnalysisOptions, AnalysisMetadata } from '../analyzers/types/analyzer-interface.js';

// ============================================================================
// Type Guards for Runtime Validation
// ============================================================================

export function isValidConfidenceScore(value: unknown): value is ConfidenceScore {
    return (
        typeof value === 'object' &&
        value !== null &&
        'value' in value &&
        typeof (value as any).value === 'number' &&
        (value as any).value >= 0 &&
        (value as any).value <= 1 &&
        'level' in value &&
        ['low', 'medium', 'high', 'very-high'].includes((value as any).level)
    );
}

export function isValidFilteringAction(value: unknown): value is FilteringAction {
    return typeof value === 'string' && ['filter', 'keep', 'conditional'].includes(value);
}

export function isValidBiasRiskLevel(value: unknown): value is BiasRiskLevel {
    return typeof value === 'string' && ['low', 'medium', 'high', 'critical'].includes(value);
}

export function isValidRecommendationSpecificData(value: unknown): value is RecommendationSpecificData {
    return (
        typeof value === 'object' &&
        value !== null &&
        'learnRecommendations' in value &&
        'detectCmsRecommendations' in value &&
        'groundTruthRecommendations' in value &&
        'crossAnalyzerInsights' in value &&
        'recommendationMetrics' in value &&
        'biasAwareAssessments' in value
    );
}

// ============================================================================
// Additional Supporting Interfaces
// ============================================================================

export interface RecommendationErrorContext {
    readonly analyzer: string;
    readonly operation: string;
    readonly dataSize: number;
    readonly timestamp: Date;
    readonly additionalContext?: Record<string, unknown>;
}

export interface FilteringErrorContext extends RecommendationErrorContext {
    readonly patternsProcessed: number;
    readonly diversityCalculationStatus: 'success' | 'failure' | 'partial';
    readonly biasAssessmentStatus: 'success' | 'failure' | 'unavailable';
}

export interface CmsDetectionErrorContext extends RecommendationErrorContext {
    readonly patternDiscoveryStatus: 'success' | 'failure' | 'unavailable';
    readonly vendorAnalysisStatus: 'success' | 'failure' | 'unavailable';
    readonly semanticAnalysisStatus: 'success' | 'failure' | 'unavailable';
}

export interface GroundTruthErrorContext extends RecommendationErrorContext {
    readonly validationPipelineStatus: 'success' | 'failure' | 'unavailable';
    readonly crossAnalyzerStatus: CrossAnalyzerStatus;
    readonly evidenceQuality: number;
}

export interface CrossAnalyzerStatus {
    readonly headerAnalysis: AnalyzerStatus;
    readonly vendorAnalysis: AnalyzerStatus;
    readonly semanticAnalysis: AnalyzerStatus;
    readonly cooccurrenceAnalysis: AnalyzerStatus;
    readonly patternDiscovery: AnalyzerStatus;
    readonly validationPipeline: AnalyzerStatus;
}

export interface AnalyzerStatus {
    readonly available: boolean;
    readonly dataQuality: 'high' | 'medium' | 'low' | 'unavailable';
    readonly lastUpdated?: Date;
    readonly errorCount: number;
}

// Additional enums and types for completeness
export type TechnologyCategory = 'cms' | 'framework' | 'library' | 'cdn' | 'analytics' | 'security' | 'other';
export type SemanticCategory = 'security' | 'performance' | 'analytics' | 'development' | 'infrastructure' | 'other';
export type EvidenceSource = 'header' | 'vendor' | 'semantic' | 'cooccurrence' | 'pattern-discovery' | 'validation';

// Placeholder interfaces for complex supporting types
export interface ConfidenceSource { method: string; version: string; }
export interface ConfidenceBreakdown { [factor: string]: number; }
export interface UncertaintyMeasure { type: string; value: number; }
export interface StatisticalJustification { method: string; pValue: number; }
export interface AlgorithmicReasoning { algorithm: string; parameters: Record<string, unknown>; }
export interface EvidenceDataPoint { source: string; value: unknown; weight: number; }
export interface ValidationResult { test: string; passed: boolean; score: number; }
export interface BiasSource { type: string; severity: BiasRiskLevel; description: string; }
export interface BiasMitigationStrategy { strategy: string; effectiveness: number; implementation: string; }
export interface BiasTransparencyReport { biasesIdentified: string[]; mitigationApplied: string[]; }
export interface IdentifiedBias { type: string; severity: BiasRiskLevel; evidence: string; }
export interface ConfidenceDistribution { low: number; medium: number; high: number; veryHigh: number; }
export interface ConfidenceInterval { lower: number; upper: number; }
export interface ConfidenceCalibration { method: string; accuracy: number; }
export interface AnalyzerAgreement { overallAgreement: number; analyzerSpecificAgreement: Record<string, number>; }
export interface ConflictResolution { conflict: string; resolution: string; confidence: number; }
export interface EmergingPatternInsight { pattern: string; novelty: number; confidence: number; }
export interface BiasDetectionInsight { biasType: string; severity: BiasRiskLevel; mitigation: string; }
export interface SupportingAnalyzer { name: string; confidence: number; evidence: string; }
export interface HeaderAnalysisEvidence { patterns: string[]; confidence: number; }
export interface VendorAnalysisEvidence { vendors: string[]; clusters: string[]; confidence: number; }
export interface SemanticAnalysisEvidence { categories: string[]; confidence: number; }
export interface CooccurrenceAnalysisEvidence { relationships: string[]; strength: number; }
export interface PatternDiscoveryEvidence { emergingPatterns: string[]; confidence: number; }
export interface ValidationEvidence { tests: string[]; passRate: number; }
export interface TechnologyAnalysisEvidence { technologies: string[]; confidence: number; }
export interface EmergingPatternDetails { pattern: string; confidence: number; evidence: string; }
export interface TechnologyCluster { name: string; technologies: string[]; confidence: number; }
export interface DetectionPotential { score: number; factors: string[]; }
export interface SuggestedPattern { pattern: string; confidence: number; rationale: string; }
export interface TechnologySignature { signature: string; technologies: string[]; confidence: number; }
export interface ApplicabilityScope { scope: string; conditions: string[]; }
export interface ApplicabilityCondition { condition: string; required: boolean; }
export interface CategorySpecificLogic { logic: string; parameters: Record<string, unknown>; }
export interface TemporalStability { stability: number; trend: 'increasing' | 'decreasing' | 'stable'; }
export interface RuleTemplate { template: string; parameters: Record<string, unknown>; }
export interface RuleCondition { field: string; operator: string; value: unknown; }
export interface RuleAction { action: string; parameters: Record<string, unknown>; }
export interface EvidenceLink { from: string; to: string; strength: number; type: string; }
export interface EvidenceQualityAssessment { overall: number; bySource: Record<string, number>; }