#!/usr/bin/env node

// Debug script to investigate Joomla CMS detection in the bias analyzer
import { readFile } from 'fs/promises';
import { join } from 'path';

async function debugJoomlaDetection() {
  try {
    // Read the index file to find sites with x-content-encoded-by header
    const indexPath = './data/cms-analysis/index.json';
    const indexContent = await readFile(indexPath, 'utf-8');
    const indexData = JSON.parse(indexContent);
    
    console.log('=== Debugging Joomla Detection in CMS Analysis Data ===\n');
    console.log(`Total sites in index: ${indexData.length}\n`);
    
    // Find sites that might have Joomla indicators
    const joomlaSites = [];
    const contentEncodedBySites = [];
    
    for (const entry of indexData) {
      if (entry.cms && entry.cms.toLowerCase().includes('joomla')) {
        joomlaSites.push(entry);
      }
      
      // Check if this site's data file contains x-content-encoded-by
      try {
        const siteDataPath = join('./data/cms-analysis', entry.filePath);
        const siteContent = await readFile(siteDataPath, 'utf-8');
        const siteData = JSON.parse(siteContent);
        
        const headers = siteData.pageData?.httpInfo?.headers || {};
        if (headers['x-content-encoded-by'] || headers['X-Content-Encoded-By']) {
          contentEncodedBySites.push({
            url: entry.url,
            cms: entry.cms,
            confidence: entry.confidence,
            headerValue: headers['x-content-encoded-by'] || headers['X-Content-Encoded-By']
          });
        }
      } catch (e) {
        // Skip if file not found or malformed
        continue;
      }
    }
    
    console.log(`Sites detected as Joomla: ${joomlaSites.length}`);
    joomlaSites.slice(0, 5).forEach(site => {
      console.log(`  - ${site.url}: ${site.cms} (confidence: ${site.confidence})`);
    });
    
    console.log(`\nSites with x-content-encoded-by header: ${contentEncodedBySites.length}`);
    contentEncodedBySites.slice(0, 10).forEach(site => {
      console.log(`  - ${site.url}: CMS="${site.cms}" Header="${site.headerValue}"`);
    });
    
    // Check for mismatches
    console.log('\n=== Analysis ===');
    const mismatchedSites = contentEncodedBySites.filter(site => 
      !site.cms || !site.cms.toLowerCase().includes('joomla')
    );
    
    if (mismatchedSites.length > 0) {
      console.log(`\n❌ Found ${mismatchedSites.length} sites with x-content-encoded-by but NOT detected as Joomla:`);
      mismatchedSites.forEach(site => {
        console.log(`  - ${site.url}: CMS="${site.cms}" (should be Joomla)`);
      });
    } else {
      console.log('\n✅ All sites with x-content-encoded-by are properly detected as Joomla');
    }
    
    // Check the opposite - Joomla sites without the header
    const joomlaWithoutHeader = joomlaSites.filter(joomla => {
      return !contentEncodedBySites.some(encoded => encoded.url === joomla.url);
    });
    
    if (joomlaWithoutHeader.length > 0) {
      console.log(`\n📊 Found ${joomlaWithoutHeader.length} Joomla sites WITHOUT x-content-encoded-by header:`);
      joomlaWithoutHeader.slice(0, 5).forEach(site => {
        console.log(`  - ${site.url}: ${site.cms}`);
      });
    }
    
    // Summary statistics
    console.log('\n=== Summary ===');
    console.log(`Total Joomla sites: ${joomlaSites.length}`);
    console.log(`Sites with x-content-encoded-by: ${contentEncodedBySites.length}`);
    console.log(`Joomla sites with header: ${contentEncodedBySites.filter(s => s.cms && s.cms.toLowerCase().includes('joomla')).length}`);
    console.log(`Non-Joomla sites with header: ${mismatchedSites.length}`);
    
  } catch (error) {
    console.error('Error debugging Joomla detection:', error.message);
  }
}

debugJoomlaDetection();