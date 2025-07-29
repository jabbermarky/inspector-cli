/**
 * Simple Reporter V2 - Minimal implementation for V1 adapter removal
 * Only handles basic pattern reporting without bias analysis
 */

import { writeFile } from 'fs/promises';
import { createModuleLogger } from '../utils/logger.js';
import type { FrequencyOptions } from './types/frequency-types-v2.js';
import type { AggregatedResults } from './types/analyzer-interface.js';

const logger = createModuleLogger('simple-reporter-v2');

/**
 * Simple format and output for frequency analysis results
 */
export async function formatOutputV2(
    result: AggregatedResults,
    options: FrequencyOptions
): Promise<void> {
    logger.info('Formatting frequency analysis output V2 (simple)', {
        output: options.output,
        outputFile: options.outputFile,
    });

    let outputContent: string;

    switch (options.output) {
        case 'json':
            outputContent = JSON.stringify(result, null, 2);
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
function formatAsHuman(result: AggregatedResults): string {
    const lines: string[] = [];

    // Summary
    lines.push('='.repeat(60));
    lines.push('FREQUENCY ANALYSIS RESULTS');
    lines.push('='.repeat(60));
    lines.push(`Total Sites Analyzed: ${result.summary?.totalSitesAnalyzed || 0}`);
    lines.push(`Total Patterns Found: ${result.summary?.totalPatternsFound || 0}`);
    lines.push(`Analysis Date: ${new Date().toISOString()}`);
    lines.push('');

    // Headers
    if (result.headers?.patterns && result.headers.patterns.size > 0) {
        lines.push('HEADER PATTERNS:');
        lines.push('='.repeat(40));
        
        for (const [name, pattern] of Array.from(result.headers.patterns.entries()).slice(0, 10)) {
            lines.push(`${name}:`);
            lines.push(`  Frequency: ${(pattern.frequency * 100).toFixed(1)}%`);
            lines.push(`  Site Count: ${pattern.siteCount}`);
            lines.push(`  Examples: ${Array.from(pattern.examples || []).slice(0, 3).join(', ')}`);
            lines.push('');
        }
    }

    // Meta Tags
    if (result.metaTags?.patterns && result.metaTags.patterns.size > 0) {
        lines.push('META TAG PATTERNS:');
        lines.push('='.repeat(40));
        
        for (const [name, pattern] of Array.from(result.metaTags.patterns.entries()).slice(0, 10)) {
            lines.push(`${name}:`);
            lines.push(`  Frequency: ${(pattern.frequency * 100).toFixed(1)}%`);
            lines.push(`  Site Count: ${pattern.siteCount}`);
            lines.push(`  Examples: ${Array.from(pattern.examples || []).slice(0, 3).join(', ')}`);
            lines.push('');
        }
    }

    // Scripts
    if (result.scripts?.patterns && result.scripts.patterns.size > 0) {
        lines.push('SCRIPT PATTERNS:');
        lines.push('='.repeat(40));
        
        for (const [name, pattern] of Array.from(result.scripts.patterns.entries()).slice(0, 10)) {
            lines.push(`${name}:`);
            lines.push(`  Frequency: ${(pattern.frequency * 100).toFixed(1)}%`);
            lines.push(`  Site Count: ${pattern.siteCount}`);
            lines.push(`  Examples: ${Array.from(pattern.examples || []).slice(0, 3).join(', ')}`);
            lines.push('');
        }
    }

    return lines.join('\n');
}

/**
 * Format results as CSV
 */
function formatAsCSV(result: AggregatedResults): string {
    const lines: string[] = [];
    
    lines.push('Type,Pattern,Frequency,SiteCount,TotalSites');
    
    // Headers
    if (result.headers?.patterns) {
        for (const [name, pattern] of result.headers.patterns) {
            lines.push(`Header,${name},${pattern.frequency},${pattern.siteCount},${result.headers.totalSites}`);
        }
    }
    
    // Meta Tags
    if (result.metaTags?.patterns) {
        for (const [name, pattern] of result.metaTags.patterns) {
            lines.push(`MetaTag,${name},${pattern.frequency},${pattern.siteCount},${result.metaTags.totalSites}`);
        }
    }
    
    // Scripts
    if (result.scripts?.patterns) {
        for (const [name, pattern] of result.scripts.patterns) {
            lines.push(`Script,${name},${pattern.frequency},${pattern.siteCount},${result.scripts.totalSites}`);
        }
    }
    
    return lines.join('\n');
}

/**
 * Format results as Markdown
 */
function formatAsMarkdown(result: AggregatedResults): string {
    const lines: string[] = [];

    lines.push('# Frequency Analysis Results');
    lines.push('');
    lines.push(`**Total Sites Analyzed:** ${result.summary?.totalSitesAnalyzed || 0}`);
    lines.push(`**Total Patterns Found:** ${result.summary?.totalPatternsFound || 0}`);
    lines.push(`**Analysis Date:** ${new Date().toISOString()}`);
    lines.push('');

    // Headers
    if (result.headers?.patterns && result.headers.patterns.size > 0) {
        lines.push('## Header Patterns');
        lines.push('');
        
        for (const [name, pattern] of Array.from(result.headers.patterns.entries()).slice(0, 10)) {
            lines.push(`### ${name}`);
            lines.push(`- **Frequency:** ${(pattern.frequency * 100).toFixed(1)}%`);
            lines.push(`- **Site Count:** ${pattern.siteCount}`);
            lines.push(`- **Examples:** ${Array.from(pattern.examples || []).slice(0, 3).join(', ')}`);
            lines.push('');
        }
    }

    // Meta Tags
    if (result.metaTags?.patterns && result.metaTags.patterns.size > 0) {
        lines.push('## Meta Tag Patterns');
        lines.push('');
        
        for (const [name, pattern] of Array.from(result.metaTags.patterns.entries()).slice(0, 10)) {
            lines.push(`### ${name}`);
            lines.push(`- **Frequency:** ${(pattern.frequency * 100).toFixed(1)}%`);
            lines.push(`- **Site Count:** ${pattern.siteCount}`);
            lines.push(`- **Examples:** ${Array.from(pattern.examples || []).slice(0, 3).join(', ')}`);
            lines.push('');
        }
    }

    // Scripts
    if (result.scripts?.patterns && result.scripts.patterns.size > 0) {
        lines.push('## Script Patterns');
        lines.push('');
        
        for (const [name, pattern] of Array.from(result.scripts.patterns.entries()).slice(0, 10)) {
            lines.push(`### ${name}`);
            lines.push(`- **Frequency:** ${(pattern.frequency * 100).toFixed(1)}%`);
            lines.push(`- **Site Count:** ${pattern.siteCount}`);
            lines.push(`- **Examples:** ${Array.from(pattern.examples || []).slice(0, 3).join(', ')}`);
            lines.push('');
        }
    }

    return lines.join('\n');
}