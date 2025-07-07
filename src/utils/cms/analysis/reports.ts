import { PatternAnalysisResult, TechnologySignature, DetectionDataPoint } from './types.js';
import { PatternDiscovery } from './patterns.js';
import { createModuleLogger } from '../../logger.js';
import * as fs from 'fs/promises';

const logger = createModuleLogger('analysis-reports');

/**
 * Analysis report generator
 * Creates comprehensive reports from pattern discovery results
 */
export class AnalysisReporter {
    private dataPoints: DetectionDataPoint[];
    private patternDiscovery: PatternDiscovery;

    constructor(dataPoints: DetectionDataPoint[]) {
        this.dataPoints = dataPoints;
        this.patternDiscovery = new PatternDiscovery(dataPoints);
    }

    /**
     * Generate comprehensive analysis report
     */
    async generateReport(outputPath?: string): Promise<string> {
        logger.info('Generating comprehensive analysis report', { 
            dataPoints: this.dataPoints.length,
            outputPath 
        });

        const report = await this.buildReport();
        
        if (outputPath) {
            await fs.writeFile(outputPath, report, 'utf8');
            logger.info('Report saved to file', { outputPath });
        }

        return report;
    }

    /**
     * Generate pattern discovery summary
     */
    async generatePatternSummary(): Promise<string> {
        logger.info('Generating pattern discovery summary');

        const metaPatterns = this.patternDiscovery.analyzeMetaTagPatterns();
        const scriptPatterns = this.patternDiscovery.analyzeScriptPatterns();
        const domPatterns = this.patternDiscovery.analyzeDOMPatterns();

        let summary = '# CMS Detection Pattern Summary\n\n';
        
        summary += `**Analysis Date**: ${new Date().toISOString().split('T')[0]}\n`;
        summary += `**Data Points Analyzed**: ${this.dataPoints.length}\n`;
        summary += `**CMS Types Found**: ${Array.from(metaPatterns.keys()).join(', ')}\n\n`;

        for (const [cms, patterns] of metaPatterns.entries()) {
            summary += `## ${cms} Detection Patterns\n\n`;
            
            summary += `### Meta Tag Patterns (${patterns.length})\n`;
            for (const pattern of patterns.slice(0, 5)) {
                summary += `- **${pattern.pattern}**: ${Math.round(pattern.confidence * 100)}% confidence, ${Math.round(pattern.frequency * 100)}% frequency\n`;
                if (pattern.examples.length > 0) {
                    summary += `  - Example: "${pattern.examples[0]}"\n`;
                }
            }
            summary += '\n';

            const scriptPatternsForCMS = scriptPatterns.get(cms) || [];
            if (scriptPatternsForCMS.length > 0) {
                summary += `### Script Patterns (${scriptPatternsForCMS.length})\n`;
                for (const pattern of scriptPatternsForCMS.slice(0, 3)) {
                    summary += `- **${pattern.pattern}**: ${Math.round(pattern.confidence * 100)}% confidence, ${Math.round(pattern.frequency * 100)}% frequency\n`;
                }
                summary += '\n';
            }

            const domPatternsForCMS = domPatterns.get(cms) || [];
            if (domPatternsForCMS.length > 0) {
                summary += `### DOM Patterns (${domPatternsForCMS.length})\n`;
                for (const pattern of domPatternsForCMS.slice(0, 3)) {
                    summary += `- **${pattern.pattern}**: ${Math.round(pattern.confidence * 100)}% confidence, ${Math.round(pattern.frequency * 100)}% frequency\n`;
                }
                summary += '\n';
            }
        }

        return summary;
    }

    /**
     * Generate suggested detection rules
     */
    async generateDetectionRules(): Promise<string> {
        logger.info('Generating suggested detection rules');

        const signatures = this.patternDiscovery.generateTechnologySignatures();
        
        let rules = '# Suggested CMS Detection Rules\n\n';
        rules += `Generated from analysis of ${this.dataPoints.length} websites\n\n`;

        for (const [cms, signature] of signatures.entries()) {
            rules += `## ${cms} Detection Rules\n\n`;
            rules += `**Overall Confidence**: ${Math.round(signature.confidence * 100)}%\n`;
            rules += `**Rule Count**: ${signature.patterns.length}\n\n`;

            rules += '### Meta Tag Rules\n';
            const metaRules = signature.patterns.filter(p => p.type === 'meta');
            if (metaRules.length > 0) {
                rules += '```typescript\n';
                rules += `// ${cms} Meta Tag Detection\n`;
                for (const rule of metaRules) {
                    const required = rule.required ? 'REQUIRED' : 'OPTIONAL';
                    rules += `// ${required} - Weight: ${Math.round(rule.weight * 100)}%\n`;
                    const patternStr = typeof rule.pattern === 'string' ? rule.pattern : rule.pattern.toString();
                    const [tagType, tagValue] = patternStr.split(':');
                    rules += `if (metaTags.find(tag => tag.${tagType} === '${tagValue}')) {\n`;
                    rules += `    confidence += ${Math.round(rule.weight * 100)};\n`;
                    rules += `}\n\n`;
                }
                rules += '```\n\n';
            }

            rules += '### Script Detection Rules\n';
            const scriptRules = signature.patterns.filter(p => p.type === 'script');
            if (scriptRules.length > 0) {
                rules += '```typescript\n';
                rules += `// ${cms} Script Detection\n`;
                for (const rule of scriptRules) {
                    const required = rule.required ? 'REQUIRED' : 'OPTIONAL';
                    rules += `// ${required} - Weight: ${Math.round(rule.weight * 100)}%\n`;
                    const patternStr = typeof rule.pattern === 'string' ? rule.pattern : rule.pattern.toString();
                    rules += `if (scripts.some(script => script.src?.includes('${patternStr.replace('script:', '').replace('path:', '')}'))) {\n`;
                    rules += `    confidence += ${Math.round(rule.weight * 100)};\n`;
                    rules += `}\n\n`;
                }
                rules += '```\n\n';
            }

            rules += '### DOM Structure Rules\n';
            const domRules = signature.patterns.filter(p => p.type === 'dom');
            if (domRules.length > 0) {
                rules += '```typescript\n';
                rules += `// ${cms} DOM Structure Detection\n`;
                for (const rule of domRules) {
                    const required = rule.required ? 'REQUIRED' : 'OPTIONAL';
                    rules += `// ${required} - Weight: ${Math.round(rule.weight * 100)}%\n`;
                    rules += `if (document.querySelector('${rule.pattern}')) {\n`;
                    rules += `    confidence += ${Math.round(rule.weight * 100)};\n`;
                    rules += `}\n\n`;
                }
                rules += '```\n\n';
            }
        }

        return rules;
    }

    /**
     * Generate comparative analysis report
     */
    async generateComparativeAnalysis(): Promise<string> {
        logger.info('Generating comparative analysis');

        const comparison = this.patternDiscovery.compareDetectionPatterns();
        
        let analysis = '# CMS Detection Comparative Analysis\n\n';
        analysis += `Based on analysis of ${this.dataPoints.length} websites\n\n`;

        // Create comparison table
        analysis += '## Key Metrics Comparison\n\n';
        analysis += '| CMS | Sites | Avg Meta Tags | Avg Scripts | Avg DOM Elements | Avg HTML Size (KB) | Avg Load Time (ms) | Detection Confidence |\n';
        analysis += '|-----|-------|---------------|-------------|------------------|-------------------|--------------------|-----------------|\n';

        for (const [cms, stats] of comparison.entries()) {
            analysis += `| ${cms} | ${stats.siteCount} | ${Math.round(stats.avgMetaTags)} | ${Math.round(stats.avgScripts)} | ${Math.round(stats.avgDOMElements)} | ${Math.round(stats.avgHtmlSize / 1024)} | ${Math.round(stats.avgLoadTime)} | ${Math.round(stats.detectionConfidence * 100)}% |\n`;
        }
        analysis += '\n';

        // Detailed analysis
        analysis += '## Detailed Analysis\n\n';
        
        for (const [cms, stats] of comparison.entries()) {
            analysis += `### ${cms}\n\n`;
            analysis += `- **Site Count**: ${stats.siteCount}\n`;
            analysis += `- **Meta Tags**: ${Math.round(stats.avgMetaTags)} average (${this.getPerformanceRating(stats.avgMetaTags, 'metaTags')})\n`;
            analysis += `- **Scripts**: ${Math.round(stats.avgScripts)} average (${this.getPerformanceRating(stats.avgScripts, 'scripts')})\n`;
            analysis += `- **DOM Elements**: ${Math.round(stats.avgDOMElements)} average (${this.getPerformanceRating(stats.avgDOMElements, 'domElements')})\n`;
            analysis += `- **HTML Size**: ${Math.round(stats.avgHtmlSize / 1024)}KB average\n`;
            analysis += `- **Load Time**: ${Math.round(stats.avgLoadTime)}ms average\n`;
            analysis += `- **Protocol Upgrade Rate**: ${Math.round(stats.protocolUpgradeRate * 100)}%\n`;
            analysis += `- **Average Redirects**: ${Math.round(stats.avgRedirects)}\n`;
            analysis += `- **Detection Confidence**: ${Math.round(stats.detectionConfidence * 100)}%\n\n`;

            // Status code distribution
            analysis += `**Status Code Distribution**:\n`;
            for (const [code, count] of Object.entries(stats.statusCodes)) {
                analysis += `- ${code}: ${count} sites\n`;
            }
            analysis += '\n';
        }

        // Insights and recommendations
        analysis += '## Key Insights\n\n';
        analysis += this.generateInsights(comparison);

        return analysis;
    }

    /**
     * Generate actionable recommendations
     */
    async generateRecommendations(): Promise<string> {
        logger.info('Generating actionable recommendations');

        const comparison = this.patternDiscovery.compareDetectionPatterns();
        const signatures = this.patternDiscovery.generateTechnologySignatures();

        let recommendations = '# CMS Detection Improvement Recommendations\n\n';
        recommendations += `Based on analysis of ${this.dataPoints.length} websites\n\n`;

        // Identify detection gaps
        recommendations += '## Detection Gaps Identified\n\n';
        
        const unknownStats = comparison.get('Unknown');
        if (unknownStats && unknownStats.siteCount > 0) {
            recommendations += `### Unknown CMS Detection (${unknownStats.siteCount} sites)\n\n`;
            recommendations += `- **Meta Tags**: ${Math.round(unknownStats.avgMetaTags)} average - ${this.getRecommendation('unknown', unknownStats.avgMetaTags, 'metaTags')}\n`;
            recommendations += `- **Scripts**: ${Math.round(unknownStats.avgScripts)} average - ${this.getRecommendation('unknown', unknownStats.avgScripts, 'scripts')}\n`;
            recommendations += `- **DOM Elements**: ${Math.round(unknownStats.avgDOMElements)} average - ${this.getRecommendation('unknown', unknownStats.avgDOMElements, 'domElements')}\n\n`;
        }

        // Improvement opportunities
        recommendations += '## Improvement Opportunities\n\n';
        
        for (const [cms, signature] of signatures.entries()) {
            if (signature.confidence < 0.8) {
                recommendations += `### ${cms} Detection (${Math.round(signature.confidence * 100)}% confidence)\n\n`;
                recommendations += `- **Priority**: ${signature.confidence < 0.6 ? 'HIGH' : 'MEDIUM'}\n`;
                recommendations += `- **Current Rules**: ${signature.patterns.length}\n`;
                recommendations += `- **Recommended Actions**:\n`;
                
                if (signature.patterns.filter(p => p.type === 'meta').length < 3) {
                    recommendations += `  - Add more meta tag detection patterns\n`;
                }
                if (signature.patterns.filter(p => p.type === 'script').length < 2) {
                    recommendations += `  - Analyze script patterns more thoroughly\n`;
                }
                if (signature.patterns.filter(p => p.type === 'dom').length < 2) {
                    recommendations += `  - Include DOM structure analysis\n`;
                }
                recommendations += '\n';
            }
        }

        // Next steps
        recommendations += '## Recommended Next Steps\n\n';
        recommendations += '1. **Collect More Data**: Gather data from additional websites for underperforming CMS types\n';
        recommendations += '2. **Refine Patterns**: Update detection rules based on discovered patterns\n';
        recommendations += '3. **Implement New Rules**: Add high-confidence patterns to detection strategies\n';
        recommendations += '4. **Validate Changes**: Test updated rules against known websites\n';
        recommendations += '5. **Monitor Performance**: Track detection accuracy improvements\n\n';

        return recommendations;
    }

    // Private helper methods

    private async buildReport(): Promise<string> {
        let report = '# CMS Detection Analysis Report\n\n';
        
        report += `**Generated**: ${new Date().toISOString()}\n`;
        report += `**Data Points**: ${this.dataPoints.length}\n`;
        report += `**Analysis Tool**: Inspector CLI Pattern Discovery\n\n`;

        report += '---\n\n';
        report += await this.generatePatternSummary();
        report += '\n---\n\n';
        report += await this.generateComparativeAnalysis();
        report += '\n---\n\n';
        report += await this.generateDetectionRules();
        report += '\n---\n\n';
        report += await this.generateRecommendations();

        return report;
    }

    private getPerformanceRating(value: number, metric: string): string {
        const thresholds = {
            metaTags: { high: 15, medium: 8 },
            scripts: { high: 10, medium: 5 },
            domElements: { high: 8, medium: 3 }
        };

        const threshold = thresholds[metric as keyof typeof thresholds];
        if (value >= threshold.high) return 'Rich';
        if (value >= threshold.medium) return 'Moderate';
        return 'Sparse';
    }

    private getRecommendation(cms: string, value: number, metric: string): string {
        const recommendations = {
            metaTags: {
                sparse: 'Consider analyzing meta tag patterns more deeply',
                moderate: 'Good foundation, look for unique identifying tags',
                rich: 'Excellent meta tag coverage for pattern analysis'
            },
            scripts: {
                sparse: 'Analyze script sources and inline code for CMS signatures',
                moderate: 'Good script coverage, look for framework-specific patterns',
                rich: 'Rich script environment, ideal for pattern discovery'
            },
            domElements: {
                sparse: 'Expand DOM element analysis to include more selectors',
                moderate: 'Good DOM coverage, focus on CMS-specific class/ID patterns',
                rich: 'Comprehensive DOM structure for reliable detection'
            }
        };

        const rating = this.getPerformanceRating(value, metric).toLowerCase();
        return recommendations[metric as keyof typeof recommendations][rating as keyof typeof recommendations.metaTags];
    }

    private generateInsights(comparison: Map<string, any>): string {
        let insights = '';

        // Find the best detected CMS
        const successfulCMS = Array.from(comparison.entries())
            .filter(([cms, stats]) => cms !== 'Unknown' && stats.detectionConfidence > 0.5)
            .sort((a, b) => b[1].detectionConfidence - a[1].detectionConfidence);

        if (successfulCMS.length > 0) {
            const [bestCMS, bestStats] = successfulCMS[0];
            insights += `### Most Reliably Detected CMS: ${bestCMS}\n\n`;
            insights += `- **Detection Confidence**: ${Math.round(bestStats.detectionConfidence * 100)}%\n`;
            insights += `- **Key Strength**: ${Math.round(bestStats.avgMetaTags)} meta tags provide rich detection signals\n\n`;
        }

        // Identify detection challenges
        const unknownStats = comparison.get('Unknown');
        if (unknownStats && unknownStats.siteCount > 0) {
            insights += `### Detection Challenges\n\n`;
            insights += `- **${unknownStats.siteCount} sites** remain undetected\n`;
            insights += `- These sites have **${Math.round(unknownStats.avgMetaTags)} meta tags** on average (vs ${Math.round(successfulCMS[0]?.[1].avgMetaTags || 0)} for ${successfulCMS[0]?.[0] || 'detected sites'})\n`;
            insights += `- Lower signal-to-noise ratio suggests need for more sophisticated detection patterns\n\n`;
        }

        // Performance patterns
        insights += `### Performance Patterns\n\n`;
        
        const avgLoadTimes = Array.from(comparison.entries())
            .filter(([cms]) => cms !== 'Unknown')
            .map(([cms, stats]) => ({ cms, loadTime: stats.avgLoadTime }))
            .sort((a, b) => a.loadTime - b.loadTime);

        if (avgLoadTimes.length > 1) {
            insights += `- **Fastest Loading**: ${avgLoadTimes[0].cms} (${Math.round(avgLoadTimes[0].loadTime)}ms average)\n`;
            insights += `- **Slowest Loading**: ${avgLoadTimes[avgLoadTimes.length - 1].cms} (${Math.round(avgLoadTimes[avgLoadTimes.length - 1].loadTime)}ms average)\n\n`;
        }

        return insights;
    }
}