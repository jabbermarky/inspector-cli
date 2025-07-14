import { LearnResult } from './types.js';

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