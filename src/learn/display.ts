import { LearnResult } from './types.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Display results summary for learn command
 */
export function displayResults(results: LearnResult[]): void {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const skipped = results.filter(r => r.skipped);
    
    console.log(`\nLearn Analysis Results (${results.length} URLs processed):`);
    console.log(`✓ ${successful.length} successful, ✗ ${failed.length} failed${skipped.length > 0 ? `, ⚠ ${skipped.length} skipped` : ''}\n`);
    
    if (successful.length > 0) {
        console.log('Successful analyses:');
        successful.forEach(result => {
            if (result.analysis) {
                const confidence = (result.analysis.confidence * 100).toFixed(0);
                const cost = result.analysis.cost ? `$${result.analysis.cost.toFixed(4)}` : '';
                const tokens = result.analysis.tokenCount ? `${result.analysis.tokenCount} tokens` : '';
                const dataSourceNote = result.analysis.dataSource === 'fallback-cached' ? ' (using cached data)' : '';
                console.log(`- ${result.url}:`);
                console.log(`  → Technology: ${result.analysis.technology} (${confidence}% confidence)${dataSourceNote}`);
                if (result.analysis.keyPatterns && result.analysis.keyPatterns.length > 0) {
                    console.log(`  → Key patterns: ${result.analysis.keyPatterns.slice(0, 3).join(', ')}`);
                }
                if (cost || tokens) {
                    console.log(`  → Analysis cost: ${tokens}${cost ? `, ${cost}` : ''}`);
                }
            } else {
                console.log(`- ${result.url}: ${result.analysisId}`);
            }
        });
    }
    
    if (skipped.length > 0) {
        console.log(`\nSkipped URLs:`);
        skipped.forEach(result => {
            console.log(`- ${result.url}: ${result.skipReason}`);
        });
    }
    
    if (failed.length > 0) {
        console.log(`\nFailed analyses:`);
        failed.forEach(result => {
            console.log(`- ${result.url}: ${result.error}`);
        });
    }
    
    if (successful.length > 0) {
        console.log(`\nResults stored in: ./data/learn/`);
        console.log(`Index file: ./data/learn/index.json`);
    }
}

/**
 * Display single URL progress during batch processing
 */
export function displayUrlProgress(current: number, total: number, url: string): void {
    console.log(`[${current}/${total}] Processing: ${url}`);
}

/**
 * Display batch start message
 */
export function displayBatchStart(total: number, type: 'CSV' | 'single'): void {
    console.log(`Starting learn analysis for ${total} URL${total > 1 ? 's' : ''} from ${type} input...`);
}

/**
 * Display batch completion message
 */
export function displayBatchComplete(total: number): void {
    console.log(`\nBatch learn analysis completed for ${total} URL${total > 1 ? 's' : ''}.`);
}

/**
 * Display detailed analysis report for a single successful result
 */
export function displayDetailedAnalysis(result: LearnResult, analysisData: any): void {
    if (!result.success || !result.analysis || !analysisData?.llmResponse?.parsedJson) {
        return;
    }

    const llmData = analysisData.llmResponse.parsedJson;
    const confidence = (result.analysis.confidence * 100).toFixed(0);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`DETAILED ANALYSIS REPORT: ${result.url}`);
    console.log(`${'='.repeat(80)}\n`);
    
    // Platform Identification
    console.log(`🎯 PLATFORM IDENTIFICATION`);
    console.log(`   Technology: ${result.analysis.technology}`);
    console.log(`   Category: ${llmData.platform_identification?.category || 'unknown'}`);
    console.log(`   Confidence: ${confidence}%`);
    
    if (llmData.platform_identification?.primary_evidence?.length > 0) {
        console.log(`   Primary Evidence:`);
        llmData.platform_identification.primary_evidence.forEach((evidence: string, index: number) => {
            console.log(`     ${index + 1}. ${evidence}`);
        });
    }
    
    // Discriminative Patterns
    console.log(`\n🔍 DISCRIMINATIVE PATTERNS`);
    
    const patterns = llmData.discriminative_patterns || {};
    
    if (patterns.high_confidence?.length > 0) {
        console.log(`   High Confidence Patterns:`);
        patterns.high_confidence.forEach((pattern: any, index: number) => {
            const conf = (pattern.confidence * 100).toFixed(0);
            console.log(`     ${index + 1}. [${pattern.data_source}] ${pattern.pattern} (${conf}%)`);
            console.log(`        → ${pattern.description}`);
        });
    }
    
    if (patterns.medium_confidence?.length > 0) {
        console.log(`   Medium Confidence Patterns:`);
        patterns.medium_confidence.forEach((pattern: any, index: number) => {
            const conf = (pattern.confidence * 100).toFixed(0);
            console.log(`     ${index + 1}. [${pattern.data_source}] ${pattern.pattern} (${conf}%)`);
            console.log(`        → ${pattern.description}`);
        });
    }
    
    if (patterns.low_confidence?.length > 0) {
        console.log(`   Low Confidence Patterns:`);
        patterns.low_confidence.forEach((pattern: any, index: number) => {
            const conf = (pattern.confidence * 100).toFixed(0);
            console.log(`     ${index + 1}. [${pattern.data_source}] ${pattern.pattern} (${conf}%)`);
            console.log(`        → ${pattern.description}`);
        });
    }
    
    // Version Information
    if (llmData.version_information?.version_patterns?.length > 0) {
        console.log(`\n📋 VERSION INFORMATION`);
        llmData.version_information.version_patterns.forEach((version: any, index: number) => {
            const conf = (version.confidence * 100).toFixed(0);
            console.log(`   ${index + 1}. ${version.source}: ${version.example_value} (${conf}%)`);
            console.log(`      Pattern: ${version.pattern}`);
        });
    }
    
    // Infrastructure Analysis
    if (llmData.infrastructure_analysis) {
        console.log(`\n🏗️ INFRASTRUCTURE ANALYSIS`);
        const infra = llmData.infrastructure_analysis;
        
        if (infra.hosting_provider) {
            console.log(`   Hosting Provider: ${infra.hosting_provider}`);
        }
        
        if (infra.cdn_usage?.length > 0) {
            console.log(`   CDN Usage: ${infra.cdn_usage.join(', ')}`);
        }
        
        if (infra.server_technology) {
            console.log(`   Server Technology: ${infra.server_technology}`);
        }
        
        if (infra.security_headers?.length > 0) {
            console.log(`   Security Headers:`);
            infra.security_headers.forEach((header: string, index: number) => {
                console.log(`     ${index + 1}. ${header}`);
            });
        }
    }
    
    // Implementation Recommendations
    if (llmData.implementation_recommendations) {
        console.log(`\n💡 IMPLEMENTATION RECOMMENDATIONS`);
        const rec = llmData.implementation_recommendations;
        
        if (rec.detection_strategy) {
            console.log(`   Detection Strategy: ${rec.detection_strategy}`);
        }
        
        if (rec.regex_patterns?.length > 0) {
            console.log(`   Regex Patterns:`);
            rec.regex_patterns.forEach((pattern: string, index: number) => {
                console.log(`     ${index + 1}. ${pattern}`);
            });
        }
        
        if (rec.required_combinations?.length > 0) {
            console.log(`   Required Combinations:`);
            rec.required_combinations.forEach((combo: string, index: number) => {
                console.log(`     ${index + 1}. ${combo}`);
            });
        }
        
        if (rec.exclusion_patterns?.length > 0) {
            console.log(`   Exclusion Patterns:`);
            rec.exclusion_patterns.forEach((pattern: string, index: number) => {
                console.log(`     ${index + 1}. ${pattern}`);
            });
        }
    }
    
    // Analysis Metadata
    console.log(`\n📊 ANALYSIS METADATA`);
    console.log(`   Analysis ID: ${result.analysisId}`);
    console.log(`   Data Source: ${result.analysis.dataSource || 'unknown'}`);
    if (result.analysis.tokenCount) {
        console.log(`   Token Usage: ${result.analysis.tokenCount} tokens`);
    }
    if (result.analysis.cost) {
        console.log(`   Analysis Cost: $${result.analysis.cost.toFixed(4)}`);
    }
    
    console.log(`\n${'='.repeat(80)}\n`);
}

/**
 * Load analysis data from stored file
 */
async function loadAnalysisData(result: LearnResult): Promise<any | null> {
    if (!result.success || !result.analysisId) {
        return null;
    }
    
    try {
        const learnDir = path.join(process.cwd(), 'data', 'learn');
        
        // First try to find the file by looking up the analysisId in the index
        const indexPath = path.join(learnDir, 'index.json');
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        const index = JSON.parse(indexContent);
        
        // Find the entry with matching analysisId
        const entry = index.find((item: any) => item.analysisId === result.analysisId);
        
        if (entry && entry.filepath) {
            // Use the stored filepath
            const fullPath = path.join(learnDir, entry.filepath);
            const content = await fs.readFile(fullPath, 'utf-8');
            return JSON.parse(content);
        } else {
            // Fallback: construct filename using normalized URL from analysis
            // This handles cases where the index might not be up to date
            const today = new Date().toISOString().split('T')[0];
            const dateDir = path.join(learnDir, 'by-date', today);
            
            // Try to construct filename with normalized URL
            let domain: string;
            try {
                const urlObj = new URL(result.url);
                domain = urlObj.hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
            } catch {
                // If URL parsing fails, try to extract domain from the URL string
                const urlStr = result.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
                domain = urlStr.replace(/[^a-zA-Z0-9.-]/g, '_');
            }
            
            const filename = `analysis-${result.analysisId}-${domain}.json`;
            const filepath = path.join(dateDir, filename);
            
            const content = await fs.readFile(filepath, 'utf-8');
            return JSON.parse(content);
        }
    } catch (error) {
        console.error(`Failed to load analysis data for ${result.url}:`, (error as Error).message);
        return null;
    }
}

/**
 * Display detailed analysis reports for all successful results
 */
export async function displayDetailedAnalysisReports(results: LearnResult[]): Promise<void> {
    const successful = results.filter(r => r.success && r.analysis);
    
    if (successful.length === 0) {
        return;
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`DETAILED ANALYSIS REPORTS`);
    console.log(`${'='.repeat(80)}`);
    
    for (const result of successful) {
        const analysisData = await loadAnalysisData(result);
        if (analysisData) {
            displayDetailedAnalysis(result, analysisData);
        }
    }
}