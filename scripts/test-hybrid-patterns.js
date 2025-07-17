#!/usr/bin/env node

// Test script to verify hybrid pattern extraction works correctly
import { extractHybridPatterns, extractHybridPatternsByCMS, getAvailableHybridPatterns } from '../dist/ground-truth/extract-hybrid-patterns.js';
import { loadCollectedDataFile } from '../dist/ground-truth/generate-collected-data-analysis.js';
import * as fs from 'fs';
import * as path from 'path';

async function testHybridPatterns() {
    console.log('='.repeat(80));
    console.log('TESTING HYBRID PATTERN EXTRACTION');
    console.log('='.repeat(80));
    
    // Find a recent WordPress detection file
    const cmsAnalysisDir = 'data/cms-analysis';
    const files = fs.readdirSync(cmsAnalysisDir)
        .filter(f => f.endsWith('.json') && !f.includes('index'))
        .sort()
        .slice(-5); // Get 5 most recent files
    
    console.log('\nTesting with recent detection files...\n');
    
    for (const file of files) {
        const filePath = path.join(cmsAnalysisDir, file);
        const data = loadCollectedDataFile(filePath);
        
        if (!data) continue;
        
        console.log(`File: ${file}`);
        console.log(`URL: ${data.url || 'unknown'}`);
        
        // Extract hybrid patterns
        const hybridPatterns = extractHybridPatterns(data);
        const patternsByCMS = extractHybridPatternsByCMS(data);
        
        console.log(`Hybrid patterns found: ${hybridPatterns.length}`);
        if (hybridPatterns.length > 0) {
            hybridPatterns.forEach(pattern => {
                console.log(`  • ${pattern}`);
            });
        }
        
        console.log('Patterns by CMS:');
        Object.entries(patternsByCMS).forEach(([cms, patterns]) => {
            console.log(`  ${cms}: ${patterns.join(', ')}`);
        });
        
        console.log('');
    }
    
    // Test available patterns for each CMS
    console.log('\n' + '='.repeat(80));
    console.log('AVAILABLE HYBRID PATTERNS BY CMS');
    console.log('='.repeat(80));
    
    const cmsList = ['WordPress', 'Drupal', 'Joomla', 'Duda'];
    cmsList.forEach(cms => {
        const patterns = getAvailableHybridPatterns(cms);
        console.log(`\n${cms} (${patterns.length} patterns):`);
        patterns.forEach(pattern => {
            console.log(`  • ${pattern}`);
        });
    });
}

testHybridPatterns().catch(console.error);