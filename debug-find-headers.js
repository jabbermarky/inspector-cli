#!/usr/bin/env node

// Find sites with interesting headers
import { readFile } from 'fs/promises';
import { join } from 'path';

async function findInterestingHeaders() {
  try {
    const indexPath = './data/cms-analysis/index.json';
    const indexContent = await readFile(indexPath, 'utf-8');
    const indexData = JSON.parse(indexContent);
    
    console.log('=== Finding Sites with Interesting Headers ===\n');
    
    const interestingHeaders = [
      'x-powered-by',
      'x-pingback', 
      'd-cache',
      'x-domain',
      'x-logged-in',
      'x-content-encoded-by',
      'x-generator'
    ];
    
    const results = {};
    interestingHeaders.forEach(h => results[h] = []);
    
    let processed = 0;
    let sitesWithHeaders = 0;
    
    for (const entry of indexData) {
      processed++;
      if (processed % 1000 === 0) {
        console.log(`Processed ${processed}/${indexData.length} sites...`);
      }
      
      try {
        const siteDataPath = join('./data/cms-analysis', entry.filePath);
        const siteContent = await readFile(siteDataPath, 'utf-8');
        const siteData = JSON.parse(siteContent);
        
        // Check httpHeaders field directly
        const headers = siteData.httpHeaders || {};
        const headerCount = Object.keys(headers).length;
        
        if (headerCount > 0) {
          sitesWithHeaders++;
          
          // Check for interesting headers
          for (const interestingHeader of interestingHeaders) {
            // Case-insensitive check
            for (const [headerName, headerValue] of Object.entries(headers)) {
              if (headerName.toLowerCase() === interestingHeader.toLowerCase()) {
                results[interestingHeader].push({
                  url: entry.url,
                  cms: entry.cms,
                  headerName: headerName,
                  headerValue: headerValue
                });
              }
            }
          }
        }
      } catch (e) {
        // Skip errors
      }
    }
    
    console.log(`\nProcessed ${processed} sites`);
    console.log(`Sites with headers: ${sitesWithHeaders} (${((sitesWithHeaders/processed)*100).toFixed(1)}%)`);
    
    console.log('\n=== Interesting Headers Found ===');
    for (const [header, sites] of Object.entries(results)) {
      if (sites.length > 0) {
        console.log(`\n${header}: ${sites.length} sites`);
        sites.slice(0, 3).forEach(site => {
          console.log(`  - ${site.url} (${site.cms}): "${site.headerValue}"`);
        });
        if (sites.length > 3) {
          console.log(`  ... and ${sites.length - 3} more`);
        }
      }
    }
    
    // Check if data structure has changed over time
    console.log('\n=== Checking Data Structure Variations ===');
    const structureVariations = {
      withHttpHeaders: 0,
      withPageData: 0,
      withBoth: 0,
      withNeither: 0
    };
    
    const sampleSize = Math.min(100, indexData.length);
    for (let i = 0; i < sampleSize; i++) {
      const entry = indexData[i];
      try {
        const siteDataPath = join('./data/cms-analysis', entry.filePath);
        const siteContent = await readFile(siteDataPath, 'utf-8');
        const siteData = JSON.parse(siteContent);
        
        const hasHttpHeaders = !!siteData.httpHeaders;
        const hasPageData = !!siteData.pageData;
        
        if (hasHttpHeaders && hasPageData) structureVariations.withBoth++;
        else if (hasHttpHeaders) structureVariations.withHttpHeaders++;
        else if (hasPageData) structureVariations.withPageData++;
        else structureVariations.withNeither++;
      } catch (e) {
        // Skip
      }
    }
    
    console.log(`\nData structure variations (sample of ${sampleSize}):`);
    console.log(`  httpHeaders only: ${structureVariations.withHttpHeaders}`);
    console.log(`  pageData only: ${structureVariations.withPageData}`);
    console.log(`  Both fields: ${structureVariations.withBoth}`);
    console.log(`  Neither field: ${structureVariations.withNeither}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findInterestingHeaders();