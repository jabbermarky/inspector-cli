#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function cleanCSV(filepath, cmsName) {
    console.log(`\nCleaning ${cmsName} sites from ${filepath}...`);
    
    const content = readFileSync(filepath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Skip header if present
    const urls = [];
    for (const line of lines) {
        const url = line.trim();
        // Skip headers and empty lines
        if (!url || url.toLowerCase().includes('url')) continue;
        
        // Clean up URL format
        let cleanUrl = url;
        
        // Remove any tabs or extra spaces
        cleanUrl = cleanUrl.split('\t')[0].trim();
        
        // Ensure https:// prefix
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'https://' + cleanUrl;
        }
        
        // Remove trailing slashes except for root paths
        if (cleanUrl.endsWith('/') && cleanUrl.split('/').length > 3) {
            cleanUrl = cleanUrl.slice(0, -1);
        }
        
        // Extract domain for uniqueness check
        try {
            const urlObj = new URL(cleanUrl);
            const domain = urlObj.hostname.replace('www.', '');
            
            // Check if we already have this domain
            const alreadyHasDomain = urls.some(u => {
                const existingUrl = new URL(u);
                return existingUrl.hostname.replace('www.', '') === domain;
            });
            
            if (!alreadyHasDomain && cleanUrl.startsWith('https://')) {
                urls.push(cleanUrl);
            }
        } catch (e) {
            console.warn(`  Skipping invalid URL: ${cleanUrl}`);
        }
    }
    
    console.log(`  Found ${urls.length} unique domains`);
    
    // Create clean output
    const cleanContent = 'url\n' + urls.slice(0, 15).join('\n');
    const outputPath = filepath.replace('.csv', '-verified.csv');
    writeFileSync(outputPath, cleanContent);
    
    console.log(`  Wrote ${urls.length} URLs to ${outputPath}`);
    
    return urls;
}

// Process all CMS files
const batchesDir = join(process.cwd(), 'batches');

const drupalUrls = cleanCSV(join(batchesDir, 'good-drupal.csv'), 'Drupal');
const wordpressUrls = cleanCSV(join(batchesDir, 'good-wordpress.csv'), 'WordPress');
const joomlaUrls = cleanCSV(join(batchesDir, 'good-joomla.csv'), 'Joomla');
const dudaUrls = cleanCSV(join(batchesDir, 'good-duda.csv'), 'Duda');

console.log('\n=== Summary ===');
console.log(`Drupal: ${drupalUrls.length} unique domains`);
console.log(`WordPress: ${wordpressUrls.length} unique domains`);
console.log(`Joomla: ${joomlaUrls.length} unique domains`);
console.log(`Duda: ${dudaUrls.length} unique domains`);

// Check if we have enough
const needed = [];
if (drupalUrls.length < 10) needed.push(`Drupal (need ${10 - drupalUrls.length} more)`);
if (wordpressUrls.length < 10) needed.push(`WordPress (need ${10 - wordpressUrls.length} more)`);
if (joomlaUrls.length < 10) needed.push(`Joomla (need ${10 - joomlaUrls.length} more)`);
if (dudaUrls.length < 10) needed.push(`Duda (need ${10 - dudaUrls.length} more)`);

if (needed.length > 0) {
    console.log('\n⚠️  Need more sites for:', needed.join(', '));
} else {
    console.log('\n✅ All CMSes have 10+ unique domains!');
}