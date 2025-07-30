/**
 * Platform Signature Analyzer V2 - Phase 5 implementation  
 * Cross-dimensional platform signature detection and correlation
 * 
 * Combines evidence from headers, meta tags, and scripts to create
 * high-confidence platform signatures with conflict detection.
 */

import type {
    HybridFrequencyAnalyzer,
    AnalysisContext,
    PreprocessedData,
    AnalysisOptions,
    AnalysisResult,
    PatternData,
    PlatformSignature,
    PlatformEvidence,
    EvidencePattern,
    PlatformConflict,
    CrossDimensionalCorrelation,
    AggregatedResults,
} from '../types/analyzer-interface.js';
import { createModuleLogger } from '../../utils/logger.js';
import { StatisticalUtils } from './statistical-utils-v2.js';

const logger = createModuleLogger('platform-signature-analyzer-v2');

export interface PlatformSignatureSpecificData {
    signatures: Map<string, PlatformSignature>;
    correlations: Map<string, CrossDimensionalCorrelation>;
    conflictMatrix: Map<string, Map<string, number>>; // platform -> conflicting platform -> conflict score
    crossDimensionalMetrics: {
        totalPlatformsDetected: number;
        multiDimensionalDetections: number;
        correlativeDetections: number;
        averageConfidenceBoost: number;
        dimensionAgreementRate: number;
    };
    platformRankings: Array<{
        platform: string;
        rank: number;
        totalScore: number;
        dimensionSupport: Record<string, number>;
    }>;
}

export class PlatformSignatureAnalyzerV2 implements HybridFrequencyAnalyzer<PlatformSignatureSpecificData> {
    private readonly supportedPlatforms = ['WordPress', 'Shopify', 'Drupal', 'Magento', 'Joomla'];
    private aggregatedResults?: AggregatedResults; // Legacy dependency injection support
    
    getName(): string {
        return 'PlatformSignatureAnalyzerV2';
    }

    /**
     * Check if analyzer supports progressive context (Phase 6)
     */
    supportsProgressiveContext(): boolean {
        return true;
    }

    /**
     * Phase 6: Progressive analysis with clean context
     */
    async analyzeWithContext(context: AnalysisContext): Promise<AnalysisResult<PlatformSignatureSpecificData>> {
        logger.info('Starting progressive cross-dimensional platform signature analysis', {
            totalSites: context.preprocessedData.totalSites,
            supportedPlatforms: this.supportedPlatforms.length,
            focusPlatformDiscrimination: context.options.focusPlatformDiscrimination,
            availableResults: Object.keys(context.previousResults)
        });

        const startTime = Date.now();

        // Create aggregated results from context
        const aggregatedResults: AggregatedResults = {
            headers: context.previousResults.headers!,
            metaTags: context.previousResults.metaTags!,
            scripts: context.previousResults.scripts!,
            validation: context.previousResults.validation!,
            semantic: context.previousResults.semantic!,
            vendor: context.previousResults.vendor!,
            discovery: context.previousResults.discovery!,
            cooccurrence: context.previousResults.cooccurrence!,
            correlations: context.previousResults.correlations!,
            summary: {} as any, // Not needed for signature analysis
        };

        return this.performCrossDimensionalAnalysis(context.preprocessedData, context.options, aggregatedResults, startTime);
    }

    /**
     * Legacy dependency injection method (for backward compatibility)
     */
    setAggregatedResults(results: AggregatedResults) {
        this.aggregatedResults = results;
    }

    /**
     * Legacy analysis method (for backward compatibility)
     */
    async analyze(
        data: PreprocessedData, 
        options: AnalysisOptions
    ): Promise<AnalysisResult<PlatformSignatureSpecificData>> {
        logger.info('Starting cross-dimensional platform signature analysis', {
            totalSites: data.totalSites,
            supportedPlatforms: this.supportedPlatforms.length,
            focusPlatformDiscrimination: options.focusPlatformDiscrimination
        });

        const startTime = Date.now();

        if (!this.aggregatedResults) {
            throw new Error('PlatformSignatureAnalyzerV2 requires aggregated results to be set via setAggregatedResults()');
        }

        return this.performCrossDimensionalAnalysis(data, options, this.aggregatedResults, startTime);
    }

    /**
     * Common cross-dimensional analysis logic
     */
    private async performCrossDimensionalAnalysis(
        data: PreprocessedData,
        options: AnalysisOptions,
        aggregatedResults: AggregatedResults,
        startTime: number
    ): Promise<AnalysisResult<PlatformSignatureSpecificData>> {
        // Extract patterns with platform discrimination data from all dimensions
        const dimensionalPatterns = this.extractDimensionalPatterns(aggregatedResults);
        
        // Generate cross-dimensional correlations
        const correlations = this.generateCrossDimensionalCorrelations(dimensionalPatterns);
        
        // Create platform signatures
        const signatures = this.createPlatformSignatures(correlations, dimensionalPatterns);
        
        // Detect conflicts between platforms
        const conflictMatrix = this.detectPlatformConflicts(signatures);
        
        // Calculate cross-dimensional metrics
        const crossDimensionalMetrics = this.calculateCrossDimensionalMetrics(signatures, correlations);
        
        // Generate platform rankings
        const platformRankings = this.generatePlatformRankings(signatures, correlations);

        const duration = Date.now() - startTime;
        logger.info('Platform signature analysis completed', {
            signaturesGenerated: signatures.size,
            platformsDetected: crossDimensionalMetrics.totalPlatformsDetected,
            multiDimensionalDetections: crossDimensionalMetrics.multiDimensionalDetections,
            duration
        });

        return {
            patterns: new Map(), // Platform signatures don't use traditional patterns
            totalSites: data.totalSites,
            metadata: {
                analyzer: this.getName(),
                analyzedAt: new Date().toISOString(),
                totalPatternsFound: signatures.size,
                totalPatternsAfterFiltering: signatures.size,
                options
            },
            analyzerSpecific: {
                signatures,
                correlations,
                conflictMatrix,
                crossDimensionalMetrics,
                platformRankings
            }
        };
    }

    /**
     * Extract patterns with platform discrimination data from all dimensions
     */
    private extractDimensionalPatterns(results: AggregatedResults): Map<string, EvidencePattern[]> {
        const dimensionalPatterns = new Map<string, EvidencePattern[]>();

        // Process headers
        const headerPatterns: EvidencePattern[] = [];
        for (const [pattern, data] of results.headers.patterns) {
            if (data.platformDiscrimination) {
                headerPatterns.push({
                    pattern,
                    discriminativeScore: data.platformDiscrimination.discriminativeScore,
                    frequency: data.frequency,
                    specificity: data.platformDiscrimination.discriminationMetrics.maxSpecificity,
                    dimension: 'header'
                });
            }
        }

        // Process meta tags
        const metaPatterns: EvidencePattern[] = [];
        for (const [pattern, data] of results.metaTags.patterns) {
            if (data.platformDiscrimination) {
                metaPatterns.push({
                    pattern,
                    discriminativeScore: data.platformDiscrimination.discriminativeScore,
                    frequency: data.frequency,
                    specificity: data.platformDiscrimination.discriminationMetrics.maxSpecificity,
                    dimension: 'meta'
                });
            }
        }

        // Process scripts
        const scriptPatterns: EvidencePattern[] = [];
        for (const [pattern, data] of results.scripts.patterns) {
            if (data.platformDiscrimination) {
                scriptPatterns.push({
                    pattern,
                    discriminativeScore: data.platformDiscrimination.discriminativeScore,
                    frequency: data.frequency,
                    specificity: data.platformDiscrimination.discriminationMetrics.maxSpecificity,
                    dimension: 'script'
                });
            }
        }

        dimensionalPatterns.set('headers', headerPatterns);
        dimensionalPatterns.set('metaTags', metaPatterns);
        dimensionalPatterns.set('scripts', scriptPatterns);

        logger.info('Extracted dimensional patterns', {
            headerPatterns: headerPatterns.length,
            metaPatterns: metaPatterns.length,
            scriptPatterns: scriptPatterns.length
        });

        return dimensionalPatterns;
    }

    /**
     * Generate cross-dimensional correlations for each platform
     */
    private generateCrossDimensionalCorrelations(
        patterns: Map<string, EvidencePattern[]>
    ): Map<string, CrossDimensionalCorrelation> {
        const correlations = new Map<string, CrossDimensionalCorrelation>();

        for (const platform of this.supportedPlatforms) {
            const headerSupport = this.calculateDimensionSupport(patterns.get('headers') || [], platform);
            const metaSupport = this.calculateDimensionSupport(patterns.get('metaTags') || [], platform);
            const scriptSupport = this.calculateDimensionSupport(patterns.get('scripts') || [], platform);

            const dimensionSupports = [headerSupport, metaSupport, scriptSupport];
            const correlationStrength = this.calculateCorrelationStrength(dimensionSupports);
            const dimensionAgreement = this.checkDimensionAgreement(dimensionSupports);

            correlations.set(platform, {
                platform,
                headerSupport,
                metaSupport,
                scriptSupport,
                correlationStrength,
                dimensionAgreement
            });
        }

        return correlations;
    }

    /**
     * Check if a pattern is relevant to a specific platform
     */
    private isPlatformRelevantPattern(pattern: string, platform: string): boolean {
        const lowerPattern = pattern.toLowerCase();
        const lowerPlatform = platform.toLowerCase();

        // WordPress patterns
        if (lowerPlatform === 'wordpress') {
            return lowerPattern.includes('wp-') ||
                   lowerPattern.includes('wordpress') ||
                   lowerPattern.includes('wp/') ||
                   lowerPattern.includes('wp-content') ||
                   lowerPattern.includes('wp-includes') ||
                   lowerPattern.includes('wp-admin') ||
                   lowerPattern.includes('xmlrpc') ||
                   lowerPattern.includes('pingback');
        }

        // Shopify patterns
        if (lowerPlatform === 'shopify') {
            return lowerPattern.includes('shopify') ||
                   lowerPattern.includes('shop-id') ||
                   lowerPattern.includes('cdn.shopify') ||
                   lowerPattern.includes('shopify-stage') ||
                   lowerPattern.includes('myshopify');
        }

        // Drupal patterns
        if (lowerPlatform === 'drupal') {
            return lowerPattern.includes('drupal') ||
                   lowerPattern.includes('x-generator') && lowerPattern.includes('drupal') ||
                   lowerPattern.includes('sites/default') ||
                   lowerPattern.includes('modules/') ||
                   lowerPattern.includes('themes/') && lowerPattern.includes('drupal');
        }

        // Magento patterns
        if (lowerPlatform === 'magento') {
            return lowerPattern.includes('magento') ||
                   lowerPattern.includes('mage') ||
                   lowerPattern.includes('skin/frontend') ||
                   lowerPattern.includes('js/mage');
        }

        // Joomla patterns
        if (lowerPlatform === 'joomla') {
            return lowerPattern.includes('joomla') ||
                   lowerPattern.includes('administrator/') ||
                   lowerPattern.includes('component') ||
                   lowerPattern.includes('modules/mod_');
        }

        return false;
    }

    /**
     * Calculate platform specificity score for a pattern
     */
    private calculatePlatformSpecificity(pattern: string, platform: string): number {
        const lowerPattern = pattern.toLowerCase();
        const lowerPlatform = platform.toLowerCase();

        // High specificity patterns (0.9-1.0)
        const highSpecificityPatterns = {
            wordpress: ['wp-admin', 'wp-content', 'wp-includes', 'xmlrpc.php', 'wp-json'],
            shopify: ['cdn.shopify.com', 'shopify-stage', 'shop-id', 'myshopify.com'],
            drupal: ['sites/default', 'core/modules', 'core/themes'],
            magento: ['skin/frontend', 'js/mage', 'catalog/product'],
            joomla: ['administrator/index.php', 'modules/mod_', 'components/com_']
        };

        // Medium specificity patterns (0.6-0.8)
        const mediumSpecificityPatterns = {
            wordpress: ['wp-', 'wordpress'],
            shopify: ['shopify'],
            drupal: ['drupal'],
            magento: ['magento', 'mage'],
            joomla: ['joomla']
        };

        // Check high specificity patterns
        const highPatterns = highSpecificityPatterns[lowerPlatform as keyof typeof highSpecificityPatterns] || [];
        for (const highPattern of highPatterns) {
            if (lowerPattern.includes(highPattern)) {
                return 0.95;
            }
        }

        // Check medium specificity patterns
        const mediumPatterns = mediumSpecificityPatterns[lowerPlatform as keyof typeof mediumSpecificityPatterns] || [];
        for (const mediumPattern of mediumPatterns) {
            if (lowerPattern.includes(mediumPattern)) {
                return 0.7;
            }
        }

        // Low specificity - pattern mentions platform but not specific
        if (lowerPattern.includes(lowerPlatform)) {
            return 0.4;
        }

        return 0.1; // Very low specificity
    }

    /**
     * Calculate support strength for a platform from a specific dimension
     */
    private calculateDimensionSupport(patterns: EvidencePattern[], platform: string): number {
        if (patterns.length === 0) return 0;

        // Filter patterns that are platform-specific and discriminatory
        const platformPatterns = patterns.filter(p => {
            const isPlatformRelevant = this.isPlatformRelevantPattern(p.pattern, platform);
            return p.discriminativeScore > 0.3 && // Only consider discriminatory patterns
                   p.specificity > 0.3 && // Only consider patterns with some platform specificity
                   isPlatformRelevant; // Only consider patterns relevant to this platform
        });

        if (platformPatterns.length === 0) return 0;

        // Weight by discriminative score, specificity, and frequency
        const totalSupport = platformPatterns.reduce((sum, pattern) => {
            const platformSpecificity = this.calculatePlatformSpecificity(pattern.pattern, platform);
            return sum + (pattern.discriminativeScore * platformSpecificity * pattern.frequency);
        }, 0);

        return Math.min(totalSupport / platformPatterns.length, 1.0);
    }

    /**
     * Calculate correlation strength between dimensions using statistical utilities
     */
    private calculateCorrelationStrength(supports: number[]): number {
        if (supports.length === 0) return 0;

        const moments = StatisticalUtils.Distribution.calculateDistributionMoments(supports);
        
        // Lower standard deviation = higher correlation strength
        return Math.max(0, 1 - moments.stdDev);
    }

    /**
     * Check if dimensions agree on platform detection
     */
    private checkDimensionAgreement(supports: number[]): boolean {
        const threshold = 0.3;
        const activeSupports = supports.filter(s => s > threshold);
        
        // Agreement if either all dimensions support or none support
        return activeSupports.length === 0 || activeSupports.length === supports.length;
    }

    /**
     * Create platform signatures from correlations and patterns
     */
    private createPlatformSignatures(
        correlations: Map<string, CrossDimensionalCorrelation>,
        patterns: Map<string, EvidencePattern[]>
    ): Map<string, PlatformSignature> {
        const signatures = new Map<string, PlatformSignature>();

        for (const [platform, correlation] of correlations) {
            // Only create signatures for platforms with evidence
            const totalSupport = correlation.headerSupport + correlation.metaSupport + correlation.scriptSupport;
            if (totalSupport < 0.3) continue;

            const evidence = this.createPlatformEvidence(platform, patterns);
            const conflicts = this.detectPlatformSpecificConflicts(platform, correlations);
            const crossDimensionalScore = this.calculateCrossDimensionalScore(correlation, evidence);
            const detectionMethod = this.determineDetectionMethod(evidence);

            // Enhanced confidence calculation with evidence correlation
            const baseConfidence = crossDimensionalScore * correlation.correlationStrength;
            const evidenceBoost = this.calculateEvidenceCorrelationBoost(evidence, correlation);
            const conflictPenalty = this.calculateConflictPenalty(conflicts);
            const confidence = Math.min(Math.max(baseConfidence + evidenceBoost - conflictPenalty, 0), 1.0);

            signatures.set(platform, {
                platform,
                confidence,
                evidence,
                conflicts,
                crossDimensionalScore,
                detectionMethod
            });
        }

        return signatures;
    }

    /**
     * Create platform evidence from patterns
     */
    private createPlatformEvidence(platform: string, patterns: Map<string, EvidencePattern[]>): PlatformEvidence {
        const headers = (patterns.get('headers') || []).filter(p => p.specificity > 0.3);
        const metaTags = (patterns.get('metaTags') || []).filter(p => p.specificity > 0.3);
        const scripts = (patterns.get('scripts') || []).filter(p => p.specificity > 0.3);

        const allPatterns = [...headers, ...metaTags, ...scripts];
        const strongEvidence = allPatterns.filter(p => p.discriminativeScore > 0.8).length;
        const weakEvidence = allPatterns.filter(p => p.discriminativeScore >= 0.3 && p.discriminativeScore <= 0.8).length;

        return {
            headers,
            metaTags,
            scripts,
            totalPatterns: allPatterns.length,
            strongEvidence,
            weakEvidence
        };
    }

    /**
     * Calculate cross-dimensional score
     */
    private calculateCrossDimensionalScore(
        correlation: CrossDimensionalCorrelation, 
        evidence: PlatformEvidence
    ): number {
        const dimensionScore = (correlation.headerSupport + correlation.metaSupport + correlation.scriptSupport) / 3;
        const evidenceScore = evidence.strongEvidence * 0.8 + evidence.weakEvidence * 0.4;
        const evidenceBonus = Math.min(evidenceScore / Math.max(evidence.totalPatterns, 1), 1.0);
        
        return Math.min(dimensionScore + evidenceBonus * 0.3, 1.0);
    }

    /**
     * Determine detection method based on evidence
     */
    private determineDetectionMethod(evidence: PlatformEvidence): 'single' | 'multi-dimensional' | 'correlative' {
        const activeDimensions = [
            evidence.headers.length > 0,
            evidence.metaTags.length > 0,
            evidence.scripts.length > 0
        ].filter(Boolean).length;

        if (activeDimensions === 1) return 'single';
        if (activeDimensions === 2) return 'multi-dimensional';
        return 'correlative';
    }

    /**
     * Calculate evidence correlation boost to confidence
     */
    private calculateEvidenceCorrelationBoost(evidence: PlatformEvidence, correlation: CrossDimensionalCorrelation): number {
        let boost = 0;

        // Multi-dimensional evidence boost (when multiple dimensions agree)
        if (correlation.dimensionAgreement) {
            boost += 0.15; // Strong boost for dimension agreement
        }

        // Strong evidence pattern boost
        if (evidence.strongEvidence > 0) {
            const strongEvidenceRatio = evidence.strongEvidence / Math.max(evidence.totalPatterns, 1);
            boost += strongEvidenceRatio * 0.2; // Up to 20% boost for strong evidence
        }

        // High correlation strength boost
        if (correlation.correlationStrength > 0.8) {
            boost += 0.1; // Boost for high correlation between dimensions
        }

        // Multi-dimensional detection method boost
        const activeDimensions = [
            evidence.headers.length > 0,
            evidence.metaTags.length > 0,
            evidence.scripts.length > 0
        ].filter(Boolean).length;

        if (activeDimensions >= 2) {
            boost += (activeDimensions - 1) * 0.05; // 5% boost per additional dimension
        }

        // Pattern diversity boost (different types of evidence)
        const patternDiversity = this.calculatePatternDiversity(evidence);
        boost += patternDiversity * 0.1; // Up to 10% boost for diverse patterns

        return Math.min(boost, 0.4); // Cap total boost at 40%
    }

    /**
     * Calculate conflict penalty for confidence
     */
    private calculateConflictPenalty(conflicts: PlatformConflict[]): number {
        let penalty = 0;

        for (const conflict of conflicts) {
            switch (conflict.severity) {
                case 'high':
                    penalty += 0.3; // Major penalty for high severity conflicts
                    break;
                case 'medium':
                    penalty += 0.15; // Moderate penalty for medium severity
                    break;
                case 'low':
                    penalty += 0.05; // Minor penalty for low severity
                    break;
            }

            // Additional penalty for mutual exclusion conflicts
            if (conflict.conflictType === 'mutual_exclusion') {
                penalty += 0.1;
            }
        }

        return Math.min(penalty, 0.6); // Cap total penalty at 60%
    }

    /**
     * Calculate pattern diversity for evidence correlation boost using statistical distribution analysis
     */
    private calculatePatternDiversity(evidence: PlatformEvidence): number {
        if (evidence.totalPatterns === 0) return 0;

        // Calculate distribution of patterns across dimensions
        const counts = [evidence.headers.length, evidence.metaTags.length, evidence.scripts.length];
        const activeDimensions = counts.filter(c => c > 0).length;
        
        if (activeDimensions === 0) return 0;
        if (activeDimensions === 1) return 0.3; // Low diversity for single dimension

        // Use statistical distribution analysis to measure evenness
        const moments = StatisticalUtils.Distribution.calculateDistributionMoments(counts);
        
        // Lower variance = more even distribution = higher diversity score
        const maxVariance = Math.pow(evidence.totalPatterns / Math.sqrt(3), 2); // Theoretical max for 3 dimensions
        const normalizedVariance = Math.min(moments.variance / maxVariance, 1.0);
        
        // Invert variance to get diversity (low variance = high diversity)
        return Math.max(0, 1 - normalizedVariance) * (activeDimensions / 3);
    }

    /**
     * Detect platform-specific conflicts
     */
    private detectPlatformSpecificConflicts(
        platform: string,
        correlations: Map<string, CrossDimensionalCorrelation>
    ): PlatformConflict[] {
        const conflicts: PlatformConflict[] = [];
        const currentCorrelation = correlations.get(platform);
        
        if (!currentCorrelation) return conflicts;

        for (const [otherPlatform, otherCorrelation] of correlations) {
            if (otherPlatform === platform) continue;

            // Detect mutual exclusion conflicts
            if (this.isMutuallyExclusive(platform, otherPlatform)) {
                const conflictStrength = Math.min(
                    currentCorrelation.correlationStrength,
                    otherCorrelation.correlationStrength
                );

                if (conflictStrength > 0.3) {
                    conflicts.push({
                        conflictingPlatform: otherPlatform,
                        conflictType: 'mutual_exclusion',
                        conflictingPatterns: [], // Could be populated with specific conflicting patterns
                        severity: conflictStrength > 0.7 ? 'high' : conflictStrength > 0.5 ? 'medium' : 'low'
                    });
                }
            }
        }

        return conflicts;
    }

    /**
     * Check if two platforms are mutually exclusive
     */
    private isMutuallyExclusive(platform1: string, platform2: string): boolean {
        const mutuallyExclusivePairs = [
            ['WordPress', 'Drupal'],
            ['WordPress', 'Joomla'],
            ['Shopify', 'Magento'],
            ['Drupal', 'Joomla']
        ];

        return mutuallyExclusivePairs.some(pair => 
            (pair[0] === platform1 && pair[1] === platform2) ||
            (pair[0] === platform2 && pair[1] === platform1)
        );
    }

    /**
     * Detect conflicts between all platforms
     */
    private detectPlatformConflicts(signatures: Map<string, PlatformSignature>): Map<string, Map<string, number>> {
        const conflictMatrix = new Map<string, Map<string, number>>();

        for (const [platform1, signature1] of signatures) {
            const conflicts = new Map<string, number>();
            
            for (const [platform2, signature2] of signatures) {
                if (platform1 === platform2) continue;

                const conflictScore = this.calculateConflictScore(signature1, signature2);
                if (conflictScore > 0.02) { // Even lower threshold for testing
                    conflicts.set(platform2, conflictScore);
                }
            }

            conflictMatrix.set(platform1, conflicts);
        }

        return conflictMatrix;
    }

    /**
     * Calculate conflict score between two signatures using statistical validation
     */
    private calculateConflictScore(sig1: PlatformSignature, sig2: PlatformSignature): number {
        if (!this.isMutuallyExclusive(sig1.platform, sig2.platform)) return 0;

        // Use statistical sanity check to validate confidence values
        const confidenceMap = new Map([
            [sig1.platform, sig1.confidence],
            [sig2.platform, sig2.confidence]
        ]);
        
        const rangeCheck = StatisticalUtils.SanityCheck.correlationRangeCheck(confidenceMap);
        if (!rangeCheck.passed) {
            logger.warn('Invalid confidence values in conflict calculation', {
                platform1: sig1.platform,
                confidence1: sig1.confidence,
                platform2: sig2.platform,
                confidence2: sig2.confidence,
                error: rangeCheck.message
            });
            return 0;
        }

        // Higher conflict if both have high confidence
        return Math.min(sig1.confidence * sig2.confidence, 1.0);
    }

    /**
     * Calculate cross-dimensional metrics
     */
    private calculateCrossDimensionalMetrics(
        signatures: Map<string, PlatformSignature>,
        correlations: Map<string, CrossDimensionalCorrelation>
    ): PlatformSignatureSpecificData['crossDimensionalMetrics'] {
        const signatureArray = Array.from(signatures.values());
        const correlationArray = Array.from(correlations.values());

        const totalPlatformsDetected = signatureArray.length;
        const multiDimensionalDetections = signatureArray.filter(s => s.detectionMethod !== 'single').length;
        const correlativeDetections = signatureArray.filter(s => s.detectionMethod === 'correlative').length;

        const averageConfidenceBoost = signatureArray.length > 0
            ? signatureArray.reduce((sum, sig) => sum + (sig.crossDimensionalScore - sig.confidence), 0) / signatureArray.length
            : 0;

        const dimensionAgreementRate = correlationArray.length > 0
            ? correlationArray.filter(c => c.dimensionAgreement).length / correlationArray.length
            : 0;

        return {
            totalPlatformsDetected,
            multiDimensionalDetections,
            correlativeDetections,
            averageConfidenceBoost,
            dimensionAgreementRate
        };
    }

    /**
     * Generate platform rankings
     */
    private generatePlatformRankings(
        signatures: Map<string, PlatformSignature>,
        correlations: Map<string, CrossDimensionalCorrelation>
    ): PlatformSignatureSpecificData['platformRankings'] {
        const rankings = Array.from(signatures.entries()).map(([platform, signature]) => {
            const correlation = correlations.get(platform)!;
            const totalScore = signature.confidence * signature.crossDimensionalScore * correlation.correlationStrength;

            return {
                platform,
                rank: 0, // Will be set after sorting
                totalScore,
                dimensionSupport: {
                    headers: correlation.headerSupport,
                    metaTags: correlation.metaSupport,
                    scripts: correlation.scriptSupport
                }
            };
        });

        // Sort by total score and assign ranks
        rankings.sort((a, b) => b.totalScore - a.totalScore);
        rankings.forEach((ranking, index) => {
            ranking.rank = index + 1;
        });

        return rankings;
    }
}