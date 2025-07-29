#!/usr/bin/env node

// Debug script to check if we actually have headers in the CMS data
import { readFile } from 'fs/promises';
import { join } from 'path';

async function debugCMSHeaders() {
  try {
    // Read the index file
    const indexPath = './data/cms-analysis/index.json';
    const indexContent = await readFile(indexPath, 'utf-8');
    const indexData = JSON.parse(indexContent);
    
    console.log('=== Debugging CMS Headers in Data ===\n');
    console.log(`Total sites in index: ${indexData.length}\n`);
    
    // Sample some sites to check headers
    const samplesToCheck = 50;
    const headerStats = {
      sitesWithHeaders: 0,
      sitesWithoutHeaders: 0,
      cmsSpecificHeaders: {},
      totalHeaders: 0
    };
    
    // Check specific CMS-related headers
    const cmsHeaders = {
      'x-pingback': [],
      'd-cache': [],
      'x-domain': [],
      'x-logged-in': [],
      'x-content-encoded-by': [],
      'x-generator': [],
      'x-powered-by': []
    };
    
    for (let i = 0; i < Math.min(samplesToCheck, indexData.length); i++) {
      const entry = indexData[i];
      
      try {
        const siteDataPath = join('./data/cms-analysis', entry.filePath);
        const siteContent = await readFile(siteDataPath, 'utf-8');
        const siteData = JSON.parse(siteContent);
        
        // Check different possible locations for headers
        const headers = siteData.pageData?.httpInfo?.headers || 
                       siteData.httpInfo?.headers || 
                       siteData.headers || 
                       {};
        
        const headerCount = Object.keys(headers).length;
        
        if (headerCount > 0) {
          headerStats.sitesWithHeaders++;
          headerStats.totalHeaders += headerCount;
          
          // Check for specific CMS headers
          for (const [headerName, sites] of Object.entries(cmsHeaders)) {
            if (headers[headerName] || headers[headerName.toLowerCase()]) {
              sites.push({
                url: entry.url,
                cms: entry.cms,
                value: headers[headerName] || headers[headerName.toLowerCase()]
              });
            }
          }
        } else {
          headerStats.sitesWithoutHeaders++;
        }
        
        // Print first site with headers as example
        if (headerCount > 0 && headerStats.sitesWithHeaders === 1) {
          console.log('Example site with headers:');
          console.log(`  URL: ${entry.url}`);
          console.log(`  CMS: ${entry.cms}`);
          console.log(`  Headers (${headerCount}):`);
          Object.entries(headers).slice(0, 10).forEach(([name, value]) => {
            console.log(`    ${name}: ${JSON.stringify(value).substring(0, 50)}...`);
          });
          console.log('');
        }
        
      } catch (e) {
        // Skip if file not found or malformed
        continue;
      }
    }
    
    console.log(`\nHeader Statistics (from ${samplesToCheck} samples):`);
    console.log(`  Sites with headers: ${headerStats.sitesWithHeaders}`);
    console.log(`  Sites without headers: ${headerStats.sitesWithoutHeaders}`);
    console.log(`  Average headers per site: ${(headerStats.totalHeaders / samplesToCheck).toFixed(1)}`);
    
    console.log('\nCMS-Specific Headers Found:');
    for (const [headerName, sites] of Object.entries(cmsHeaders)) {
      if (sites.length > 0) {
        console.log(`\n${headerName}: ${sites.length} sites`);
        sites.slice(0, 3).forEach(site => {
          console.log(`  - ${site.url} (${site.cms}): "${site.value}"`);
        });
      }
    }
    
    // Now specifically look for x-content-encoded-by across ALL sites
    console.log('\n=== Searching ALL sites for x-content-encoded-by ===');
    let contentEncodedByCount = 0;
    const contentEncodedBySites = [];
    
    for (const entry of indexData) {
      try {
        const siteDataPath = join('./data/cms-analysis', entry.filePath);
        const siteContent = await readFile(siteDataPath, 'utf-8');
        const siteData = JSON.parse(siteContent);
        
        const headers = siteData.pageData?.httpInfo?.headers || 
                       siteData.httpInfo?.headers || 
                       siteData.headers || 
                       {};
        
        // Check all case variations
        const headerVariations = ['x-content-encoded-by', 'X-Content-Encoded-By', 'X-content-encoded-by'];
        for (const variant of headerVariations) {
          if (headers[variant]) {
            contentEncodedByCount++;
            contentEncodedBySites.push({
              url: entry.url,
              cms: entry.cms,
              headerName: variant,
              value: headers[variant]
            });
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    console.log(`\nTotal sites with x-content-encoded-by: ${contentEncodedByCount}`);
    if (contentEncodedBySites.length > 0) {
      console.log('Examples:');
      contentEncodedBySites.slice(0, 5).forEach(site => {
        console.log(`  - ${site.url} (${site.cms}): ${site.headerName}="${site.value}"`);
      });
    }
    
  } catch (error) {
    console.error('Error debugging CMS headers:', error.message);
  }
}

debugCMSHeaders();