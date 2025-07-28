import { writeFile } from 'fs/promises';
import { createModuleLogger } from '../utils/logger.js';
import type { FrequencyResult, FrequencyOptions } from './types/frequency-types-v2.js';
import { mapJsonReplacer } from './utils/map-converter.js';

const logger = createModuleLogger('frequency-reporter-v2');

/**
 * Format and output frequency analysis results (V2)
 */
export async function formatOutputV2(
    result: FrequencyResult,
    options: FrequencyOptions
): Promise<void> {
    logger.info('Formatting frequency analysis output V2', {
        output: options.output,
        outputFile: options.outputFile,
    });

    let outputContent: string;

    switch (options.output) {
        case 'json':
            outputContent = JSON.stringify(result, mapJsonReplacer, 2);
            break;

        case 'csv':
            outputContent = formatAsCSV(result);
            break;

        case 'markdown':
            outputContent = formatAsMarkdown(result);
            break;

        case 'human':
        default:
            outputContent = formatAsHuman(result);
            break;
    }

    if (options.outputFile) {
        await writeFile(options.outputFile, outputContent, 'utf-8');
        logger.info('Output written to file', { file: options.outputFile });
    } else {
        console.log(outputContent);
    }
}

/**
 * Format results as human-readable text
 */
function formatAsHuman(result: FrequencyResult): string {
    const lines: string[] = [];

    // Summary
    lines.push('='.repeat(60));
    lines.push('FREQUENCY ANALYSIS RESULTS');
    lines.push('='.repeat(60));
    lines.push(`Total Sites Analyzed: ${result.summary.totalSitesAnalyzed}`);
    lines.push(`Total Patterns Found: ${result.summary.totalPatternsFound}`);
    lines.push(`Analysis Date: ${result.summary.analysisDate}`);
    lines.push('');

    // Headers
    const headerCount = Object.keys(result.headers).length;
    if (headerCount > 0) {
        lines.push(`HTTP HEADERS (${headerCount} patterns):`);
        lines.push('-'.repeat(40));
        
        const sortedHeaders = Object.entries(result.headers)
            .sort(([,a], [,b]) => b.frequency - a.frequency)
            .slice(0, 10); // Top 10

        for (const [header, data] of sortedHeaders) {
            const freq = (data.frequency * 100).toFixed(1);
            lines.push(`${header}: ${freq}% (${data.occurrences}/${data.totalSites} sites)`);
        }
        lines.push('');
    }

    // Meta Tags
    const metaCount = Object.keys(result.metaTags).length;
    if (metaCount > 0) {
        lines.push(`META TAGS (${metaCount} patterns):`);
        lines.push('-'.repeat(40));
        
        const sortedMeta = Object.entries(result.metaTags)
            .sort(([,a], [,b]) => b.frequency - a.frequency)
            .slice(0, 10); // Top 10

        for (const [meta, data] of sortedMeta) {
            const freq = (data.frequency * 100).toFixed(1);
            lines.push(`${meta}: ${freq}% (${data.occurrences}/${data.totalSites} sites)`);
        }
        lines.push('');
    }

    // Scripts
    const scriptCount = Object.keys(result.scripts).length;
    if (scriptCount > 0) {
        lines.push(`SCRIPTS (${scriptCount} patterns):`);
        lines.push('-'.repeat(40));
        
        const sortedScripts = Object.entries(result.scripts)
            .sort(([,a], [,b]) => b.frequency - a.frequency)
            .slice(0, 10); // Top 10

        for (const [script, data] of sortedScripts) {
            const freq = (data.frequency * 100).toFixed(1);
            lines.push(`${script}: ${freq}% (${data.occurrences}/${data.totalSites} sites)`);
        }
        lines.push('');
    }

    // Bias Analysis (V2 Enhancement)
    if (result.biasAnalysis) {
        lines.push('BIAS ANALYSIS:');
        lines.push('='.repeat(40));
        
        const bias = result.biasAnalysis;
        
        // Overall bias metrics
        lines.push(`Dataset Concentration Score: ${(bias.concentrationMetrics.herfindahlIndex * 100).toFixed(1)}%`);
        lines.push(`Overall Bias Risk: ${bias.concentrationMetrics.overallBiasRisk.toUpperCase()}`);
        lines.push(`Dominant Platforms: ${bias.cmsDistribution.dominantPlatforms.join(', ') || 'None'}`);
        lines.push('');
        
        // CMS Distribution
        lines.push('CMS Distribution:');
        lines.push('-'.repeat(20));
        for (const [cms, stats] of bias.cmsDistribution.distributions) {
            lines.push(`  ${cms}: ${stats.percentage.toFixed(1)}% (${stats.count} sites)`);
        }
        lines.push('');
        
        // Bias Warnings
        if (bias.biasWarnings.length > 0) {
            lines.push(`Bias Warnings (${bias.biasWarnings.length}):`);
            lines.push('-'.repeat(20));
            for (const warning of bias.biasWarnings.slice(0, 5)) { // Show top 5
                const severity = warning.severity.toUpperCase();
                lines.push(`  [${severity}] ${warning.message}`);
            }
            if (bias.biasWarnings.length > 5) {
                lines.push(`  ... and ${bias.biasWarnings.length - 5} more warnings`);
            }
            lines.push('');
        }
        
        // Cross-analyzer insights
        if (bias.technologyBias && bias.technologyBias.dominantVendors.length > 0) {
            lines.push('Technology Bias:');
            lines.push('-'.repeat(20));
            lines.push(`  Dominant Vendors: ${bias.technologyBias.dominantVendors.join(', ')}`);
            lines.push(`  Overall Risk: ${bias.technologyBias.overallTechnologyBias.toUpperCase()}`);
            lines.push('');
        }
        
        if (bias.semanticBias && bias.semanticBias.overrepresentedCategories.length > 0) {
            lines.push('Semantic Bias:');
            lines.push('-'.repeat(20));
            lines.push(`  Overrepresented: ${bias.semanticBias.overrepresentedCategories.join(', ')}`);
            lines.push(`  Underrepresented: ${bias.semanticBias.underrepresentedCategories.join(', ')}`);
            lines.push(`  Overall Risk: ${bias.semanticBias.overallSemanticBias.toUpperCase()}`);
            lines.push('');
        }
        
        // Statistical Summary
        if (bias.statisticalSummary.chiSquareResults) {
            lines.push('Statistical Validation:');
            lines.push('-'.repeat(20));
            lines.push(`  Statistically Significant Headers: ${bias.statisticalSummary.chiSquareResults.statisticallySignificantHeaders}`);
            lines.push(`  Average p-value: ${bias.statisticalSummary.chiSquareResults.averagePValue.toFixed(3)}`);
            if (bias.statisticalSummary.sampleSizeAdequacy) {
                const adequacy = bias.statisticalSummary.sampleSizeAdequacy;
                lines.push(`  Sample Size: ${adequacy.adequate} adequate, ${adequacy.marginal} marginal, ${adequacy.inadequate} inadequate`);
            }
            lines.push('');
        }
    }

    return lines.join('\n');
}

/**
 * Format results as CSV
 */
function formatAsCSV(result: FrequencyResult): string {
    const lines: string[] = [];
    
    // Headers CSV
    lines.push('Type,Pattern,Frequency,Occurrences,TotalSites');
    
    for (const [header, data] of Object.entries(result.headers)) {
        lines.push(`Header,"${header}",${data.frequency},${data.occurrences},${data.totalSites}`);
    }
    
    for (const [meta, data] of Object.entries(result.metaTags)) {
        lines.push(`MetaTag,"${meta}",${data.frequency},${data.occurrences},${data.totalSites}`);
    }
    
    for (const [script, data] of Object.entries(result.scripts)) {
        lines.push(`Script,"${script}",${data.frequency},${data.occurrences},${data.totalSites}`);
    }
    
    // Bias Analysis CSV
    if (result.biasAnalysis) {
        lines.push(''); // Separator
        lines.push('BiasType,Metric,Value,Details');
        
        const bias = result.biasAnalysis;
        
        // Overall metrics
        lines.push(`Overall,ConcentrationScore,${bias.concentrationMetrics.herfindahlIndex.toFixed(3)},Herfindahl-Hirschman Index`);
        lines.push(`Overall,BiasRisk,"${bias.concentrationMetrics.overallBiasRisk}",Risk Level`);
        
        // CMS Distribution
        for (const [cms, stats] of bias.cmsDistribution.distributions) {
            lines.push(`CMSDistribution,"${cms}",${stats.percentage.toFixed(3)},${stats.count} sites`);
        }
        
        // Bias Warnings
        for (const warning of bias.biasWarnings) {
            lines.push(`Warning,"${warning.type}","${warning.severity}","${warning.message.replace(/"/g, '""')}"`);
        }
        
        // Statistical Summary
        if (bias.statisticalSummary.chiSquareResults) {
            const chi = bias.statisticalSummary.chiSquareResults;
            lines.push(`Statistical,SignificantHeaders,${chi.statisticallySignificantHeaders},Count`);
            lines.push(`Statistical,AveragePValue,${chi.averagePValue.toFixed(6)},Statistical Significance`);
        }
    }
    
    return lines.join('\n');
}

/**
 * Format results as Markdown
 */
function formatAsMarkdown(result: FrequencyResult): string {
    const lines: string[] = [];

    lines.push('# Frequency Analysis Results');
    lines.push('');
    lines.push(`- **Total Sites Analyzed:** ${result.summary.totalSitesAnalyzed}`);
    lines.push(`- **Total Patterns Found:** ${result.summary.totalPatternsFound}`);
    lines.push(`- **Analysis Date:** ${result.summary.analysisDate}`);
    lines.push('');

    // Headers table
    const headerCount = Object.keys(result.headers).length;
    if (headerCount > 0) {
        lines.push(`## HTTP Headers (${headerCount} patterns)`);
        lines.push('');
        lines.push('| Header | Frequency | Occurrences | Total Sites |');
        lines.push('|--------|-----------|-------------|-------------|');
        
        const sortedHeaders = Object.entries(result.headers)
            .sort(([,a], [,b]) => b.frequency - a.frequency);

        for (const [header, data] of sortedHeaders) {
            const freq = (data.frequency * 100).toFixed(1);
            lines.push(`| ${header} | ${freq}% | ${data.occurrences} | ${data.totalSites} |`);
        }
        lines.push('');
    }

    // Bias Analysis (Markdown)
    if (result.biasAnalysis) {
        const bias = result.biasAnalysis;
        
        lines.push('## Bias Analysis');
        lines.push('');
        
        // Overview
        lines.push('### Overview');
        lines.push('');
        lines.push(`- **Dataset Concentration Score:** ${(bias.concentrationMetrics.herfindahlIndex * 100).toFixed(1)}%`);
        lines.push(`- **Overall Bias Risk:** ${bias.concentrationMetrics.overallBiasRisk}`);
        lines.push(`- **Dominant Platforms:** ${bias.cmsDistribution.dominantPlatforms.join(', ') || 'None'}`);
        lines.push('');
        
        // CMS Distribution
        lines.push('### CMS Distribution');
        lines.push('');
        lines.push('| CMS | Percentage | Sites |');
        lines.push('|-----|------------|-------|');
        
        const sortedCMS = Array.from(bias.cmsDistribution.distributions.entries())
            .sort(([,a], [,b]) => b.percentage - a.percentage);
            
        for (const [cms, stats] of sortedCMS) {
            lines.push(`| ${cms} | ${stats.percentage.toFixed(1)}% | ${stats.count} |`);
        }
        lines.push('');
        
        // Bias Warnings
        if (bias.biasWarnings.length > 0) {
            lines.push('### Bias Warnings');
            lines.push('');
            
            for (const warning of bias.biasWarnings) {
                const severity = warning.severity === 'critical' ? '🔴' : 
                               warning.severity === 'warning' ? '🟡' : 'ℹ️';
                lines.push(`${severity} **${warning.type.toUpperCase()}**: ${warning.message}`);
                lines.push('');
            }
        }
        
        // Cross-analyzer insights
        if (bias.technologyBias || bias.semanticBias) {
            lines.push('### Cross-Analyzer Insights');
            lines.push('');
            
            if (bias.technologyBias && bias.technologyBias.dominantVendors.length > 0) {
                lines.push('#### Technology Bias');
                lines.push(`- **Dominant Vendors:** ${bias.technologyBias.dominantVendors.join(', ')}`);
                lines.push(`- **Risk Level:** ${bias.technologyBias.overallTechnologyBias}`);
                lines.push('');
            }
            
            if (bias.semanticBias && bias.semanticBias.overrepresentedCategories.length > 0) {
                lines.push('#### Semantic Bias');
                lines.push(`- **Overrepresented Categories:** ${bias.semanticBias.overrepresentedCategories.join(', ')}`);
                lines.push(`- **Underrepresented Categories:** ${bias.semanticBias.underrepresentedCategories.join(', ')}`);
                lines.push(`- **Risk Level:** ${bias.semanticBias.overallSemanticBias}`);
                lines.push('');
            }
        }
        
        // Statistical Validation
        if (bias.statisticalSummary.chiSquareResults) {
            lines.push('### Statistical Validation');
            lines.push('');
            const chi = bias.statisticalSummary.chiSquareResults;
            lines.push(`- **Statistically Significant Headers:** ${chi.statisticallySignificantHeaders}`);
            lines.push(`- **Average p-value:** ${chi.averagePValue.toFixed(3)}`);
            
            if (bias.statisticalSummary.sampleSizeAdequacy) {
                const adequacy = bias.statisticalSummary.sampleSizeAdequacy;
                lines.push(`- **Sample Size Assessment:** ${adequacy.adequate} adequate, ${adequacy.marginal} marginal, ${adequacy.inadequate} inadequate`);
            }
            lines.push('');
        }
    }

    return lines.join('\n');
}