/**
 * Platform Discrimination Section - Phase 4-5 Reporter
 * 
 * Formats platform discrimination analysis results showing:
 * - Discrimination vs infrastructure noise metrics
 * - Top discriminatory patterns  
 * - Platform-specific pattern distribution
 * - Cross-dimensional platform signatures (Phase 5)
 */

import type { AggregatedResults } from '../../types/analyzer-interface.js';
import type { ExtendedFrequencyOptions } from '../types.js';

export interface PlatformDiscriminationSectionResult {
    markdown: string;
    csv: string;
    json: object;
}

/**
 * Generate platform discrimination section for all formats
 */
export function generatePlatformDiscriminationSection(
    result: AggregatedResults,
    options: ExtendedFrequencyOptions
): PlatformDiscriminationSectionResult {
    const summary = result.summary.platformDiscrimination;
    
    if (!summary || !summary.enabled) {
        return {
            markdown: '',
            csv: '',
            json: {}
        };
    }

    const markdown = generateMarkdown(summary, result, options);
    const csv = generateCSV(summary, options);
    const json = generateJSON(summary, result);

    return { markdown, csv, json };
}

/**
 * Generate markdown format for platform discrimination section
 */
function generateMarkdown(summary: any, result: AggregatedResults, options: ExtendedFrequencyOptions): string {
    let output = '\n## Platform Discrimination Analysis\n\n';
    
    // Overview metrics
    output += '### Discrimination Metrics\n\n';
    output += '| Metric | Value |\n';
    output += '|--------|-------|\n';
    output += `| Total Patterns Analyzed | ${summary.totalPatternsAnalyzed.toLocaleString()} |\n`;
    output += `| Discriminatory Patterns | ${summary.discriminatoryPatterns.toLocaleString()} |\n`;
    output += `| Infrastructure Noise Filtered | ${summary.infrastructureNoiseFiltered.toLocaleString()} |\n`;
    output += `| Average Discrimination Score | ${(summary.averageDiscriminationScore * 100).toFixed(1)}% |\n`;
    output += `| Noise Reduction Achieved | ${summary.noiseReductionPercentage.toFixed(1)}% |\n`;
    
    // Quality metrics
    output += '\n### Quality Metrics\n\n';
    output += '| Metric | Value |\n';
    output += '|--------|-------|\n';
    output += `| Signal-to-Noise Ratio | ${summary.qualityMetrics.signalToNoiseRatio.toFixed(2)} |\n`;
    output += `| Platform Coverage Score | ${(summary.qualityMetrics.platformCoverageScore * 100).toFixed(1)}% |\n`;
    output += `| Detection Confidence Boost | ${(summary.qualityMetrics.detectionConfidenceBoost * 100).toFixed(1)}% |\n`;
    
    // Top discriminatory patterns
    if (summary.topDiscriminatoryPatterns && summary.topDiscriminatoryPatterns.length > 0) {
        output += '\n### Top Discriminatory Patterns (All Dimensions)\n\n';
        output += '| Rank | Pattern | Dimension | Target Platform | Discrimination Score | Frequency |\n';
        output += '|------|---------|-----------|-----------------|---------------------|----------|\n';
        
        summary.topDiscriminatoryPatterns.forEach((pattern: any, index: number) => {
            const targetPlatform = pattern.targetPlatform || 'Unknown';
            const discriminationScore = (pattern.discriminativeScore * 100).toFixed(1);
            const frequency = (pattern.frequency * 100).toFixed(1);
            
            // Use explicit dimension from the pattern object, fallback to parsing if not available
            const dimension = pattern.dimension || 'Unknown';
            const cleanPattern = pattern.pattern;
            
            output += `| ${index + 1} | \`${cleanPattern}\` | ${dimension} | ${targetPlatform} | ${discriminationScore}% | ${frequency}% |\n`;
        });
    }
    
    // Platform specificity distribution
    if (summary.platformSpecificityDistribution && summary.platformSpecificityDistribution.size > 0) {
        output += '\n### Platform Specificity Distribution\n\n';
        output += '| Platform | High-Specificity Patterns |\n';
        output += '|----------|---------------------------|\n';
        
        const entries = Array.from(summary.platformSpecificityDistribution.entries()) as [string, number][];
        const sortedPlatforms = entries.sort(([,a], [,b]) => b - a);
            
        sortedPlatforms.forEach(([platform, count]) => {
            output += `| ${platform} | ${count} |\n`;
        });
    }
    
    // Cross-dimensional platform signatures (Phase 5)
    if (result.platformSignatures && result.platformSignatures.length > 0) {
        output += '\n### Cross-Dimensional Platform Signatures\n\n';
        output += '| Platform | Confidence | Detection Method | Evidence Dimensions | Conflicts |\n';
        output += '|----------|------------|------------------|--------------------|-----------|\n';
        
        result.platformSignatures.slice(0, options.maxItemsPerSection || 10).forEach((signature: any) => {
            const confidence = (signature.confidence * 100).toFixed(1);
            const evidenceDimensions = [
                signature.evidence.headers.length > 0 ? 'Headers' : null,
                signature.evidence.metaTags.length > 0 ? 'Meta' : null,
                signature.evidence.scripts.length > 0 ? 'Scripts' : null
            ].filter(Boolean).join(', ');
            const conflictCount = signature.conflicts ? signature.conflicts.length : 0;
            
            output += `| ${signature.platform} | ${confidence}% | ${signature.detectionMethod} | ${evidenceDimensions} | ${conflictCount} |\n`;
        });
        
        // Cross-dimensional analysis metrics
        if (result.crossDimensionalAnalysis?.analyzerSpecific?.crossDimensionalMetrics) {
            const metrics = result.crossDimensionalAnalysis.analyzerSpecific.crossDimensionalMetrics;
            output += '\n### Cross-Dimensional Analysis Metrics\n\n';
            output += '| Metric | Value |\n';
            output += '|--------|-------|\n';
            output += `| Total Platforms Detected | ${metrics.totalPlatformsDetected} |\n`;
            output += `| Multi-Dimensional Detections | ${metrics.multiDimensionalDetections} |\n`;
            output += `| Correlative Detections | ${metrics.correlativeDetections} |\n`;
            output += `| Average Confidence Boost | ${(metrics.averageConfidenceBoost * 100).toFixed(1)}% |\n`;
            output += `| Dimension Agreement Rate | ${(metrics.dimensionAgreementRate * 100).toFixed(1)}% |\n`;
        }
    }
    
    return output;
}

/**
 * Generate CSV format for platform discrimination section
 */
function generateCSV(summary: any, options: ExtendedFrequencyOptions): string {
    let csv = 'Section,Metric,Value\n';
    
    csv += `Platform Discrimination,Total Patterns Analyzed,${summary.totalPatternsAnalyzed}\n`;
    csv += `Platform Discrimination,Discriminatory Patterns,${summary.discriminatoryPatterns}\n`;
    csv += `Platform Discrimination,Infrastructure Noise Filtered,${summary.infrastructureNoiseFiltered}\n`;
    csv += `Platform Discrimination,Average Discrimination Score,${summary.averageDiscriminationScore}\n`;
    csv += `Platform Discrimination,Noise Reduction Percentage,${summary.noiseReductionPercentage}\n`;
    csv += `Platform Discrimination,Signal-to-Noise Ratio,${summary.qualityMetrics.signalToNoiseRatio}\n`;
    csv += `Platform Discrimination,Platform Coverage Score,${summary.qualityMetrics.platformCoverageScore}\n`;
    csv += `Platform Discrimination,Detection Confidence Boost,${summary.qualityMetrics.detectionConfidenceBoost}\n`;
    
    if (summary.topDiscriminatoryPatterns) {
        csv += '\nPattern,Target Platform,Discrimination Score,Frequency\n';
        summary.topDiscriminatoryPatterns.slice(0, options.maxItemsPerSection || 10).forEach((pattern: any) => {
            csv += `"${pattern.pattern}","${pattern.targetPlatform || 'Unknown'}",${pattern.discriminativeScore},${pattern.frequency}\n`;
        });
    }
    
    return csv;
}

/**
 * Generate JSON format for platform discrimination section
 */
function generateJSON(summary: any, result: AggregatedResults): object {
    const json: any = {
        platformDiscrimination: {
            summary: {
                totalPatternsAnalyzed: summary.totalPatternsAnalyzed,
                discriminatoryPatterns: summary.discriminatoryPatterns,
                infrastructureNoiseFiltered: summary.infrastructureNoiseFiltered,
                averageDiscriminationScore: summary.averageDiscriminationScore,
                noiseReductionPercentage: summary.noiseReductionPercentage,
                qualityMetrics: summary.qualityMetrics
            },
            topDiscriminatoryPatterns: summary.topDiscriminatoryPatterns || [],
            platformSpecificityDistribution: summary.platformSpecificityDistribution ? 
                Object.fromEntries(summary.platformSpecificityDistribution) : {}
        }
    };
    
    if (result.platformSignatures) {
        json.platformDiscrimination.crossDimensionalSignatures = result.platformSignatures;
    }
    
    if (result.crossDimensionalAnalysis?.analyzerSpecific?.crossDimensionalMetrics) {
        json.platformDiscrimination.crossDimensionalMetrics = result.crossDimensionalAnalysis.analyzerSpecific.crossDimensionalMetrics;
    }
    
    return json;
}