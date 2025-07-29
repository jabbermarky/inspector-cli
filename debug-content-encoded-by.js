#!/usr/bin/env node

// Debug script to find ALL sites with x-content-encoded-by and check their CMS detection
import { readFile } from 'fs/promises';
import { join } from 'path';

async function debugContentEncodedBy() {
  try {
    // Read the index file
    const indexPath = './data/cms-analysis/index.json';
    const indexContent = await readFile(indexPath, 'utf-8');
    const indexData = JSON.parse(indexContent);
    
    console.log('=== Debugging x-content-encoded-by Header Detection ===\n');
    console.log(`Total sites in index: ${indexData.length}\n`);
    
    const headerSites = [];
    let processed = 0;
    
    // Check every site for the header (case insensitive)
    for (const entry of indexData) {
      processed++;
      if (processed % 1000 === 0) {
        console.log(`Processed ${processed}/${indexData.length} sites...`);
      }
      
      try {
        const siteDataPath = join('./data/cms-analysis', entry.filePath);
        const siteContent = await readFile(siteDataPath, 'utf-8');
        const siteData = JSON.parse(siteContent);
        
        const headers = siteData.pageData?.httpInfo?.headers || {};
        
        // Check all variations of the header name
        const headerVariations = [
          'x-content-encoded-by',
          'X-Content-Encoded-By', 
          'X-content-encoded-by',
          'x-Content-Encoded-By'
        ];
        
        let headerValue = null;
        let headerName = null;
        
        for (const variation of headerVariations) {
          if (headers[variation]) {
            headerValue = headers[variation];
            headerName = variation;
            break;
          }
        }
        
        // Also check by iterating all headers for any containing "content-encoded-by"
        if (!headerValue) {
          for (const [name, value] of Object.entries(headers)) {
            if (name.toLowerCase().includes('content-encoded-by')) {
              headerValue = value;
              headerName = name;
              break;
            }
          }
        }
        
        if (headerValue) {
          headerSites.push({
            url: entry.url,
            cms: entry.cms,
            confidence: entry.confidence,
            headerName: headerName,
            headerValue: headerValue,
            filePath: entry.filePath
          });
        }
      } catch (e) {
        // Skip if file not found or malformed
        continue;
      }
    }
    
    console.log(`\nFound ${headerSites.length} sites with x-content-encoded-by header:\n`);
    
    if (headerSites.length === 0) {
      console.log('❌ No sites found with x-content-encoded-by header');
      console.log('This suggests the header may not be in the collected data.');
      
      // Let's check a few random sites to see what headers they have
      console.log('\n=== Sample of headers from random sites ===');
      
      const sampleSites = indexData.slice(0, 5);
      for (const entry of sampleSites) {
        try {
          const siteDataPath = join('./data/cms-analysis', entry.filePath);
          const siteContent = await readFile(siteDataPath, 'utf-8');
          const siteData = JSON.parse(siteContent);
          
          const headers = siteData.pageData?.httpInfo?.headers || {};
          const headerNames = Object.keys(headers);
          
          console.log(`\n${entry.url} (${entry.cms}):`);
          console.log(`  Headers (${headerNames.length}): ${headerNames.slice(0, 10).join(', ')}${headerNames.length > 10 ? '...' : ''}`);
          
          // Look for any interesting headers
          const interestingHeaders = headerNames.filter(h => 
            h.toLowerCase().includes('joomla') || 
            h.toLowerCase().includes('content') ||
            h.toLowerCase().includes('generator') ||
            h.toLowerCase().includes('encoded')
          );
          
          if (interestingHeaders.length > 0) {
            console.log(`  Interesting headers: ${interestingHeaders.join(', ')}`);
          }
          
        } catch (e) {
          console.log(`  Error reading ${entry.url}: ${e.message}`);
        }
      }
      
    } else {
      headerSites.forEach((site, index) => {
        console.log(`${index + 1}. ${site.url}`);
        console.log(`   CMS: ${site.cms} (confidence: ${site.confidence})`);
        console.log(`   Header: ${site.headerName} = "${site.headerValue}"`);
        console.log('');
      });
      
      // Analyze CMS distribution
      const cmsDistribution = {};
      headerSites.forEach(site => {
        const cms = site.cms || 'Unknown';
        cmsDistribution[cms] = (cmsDistribution[cms] || 0) + 1;
      });
      
      console.log('CMS Distribution for sites with x-content-encoded-by:');
      Object.entries(cmsDistribution)
        .sort(([,a], [,b]) => b - a)
        .forEach(([cms, count]) => {
          console.log(`  ${cms}: ${count} sites`);
        });
    }
    
  } catch (error) {
    console.error('Error debugging x-content-encoded-by:', error.message);
  }
}

debugContentEncodedBy();