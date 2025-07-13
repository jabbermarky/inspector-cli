#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load the existing analysis
const resultsPath = '/Users/marklummus/Documents/inspector-cli/unknown-cms-analysis.json';
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

console.log('REFINED CMS CLUSTER ANALYSIS');
console.log('============================\n');
console.log(`Analyzing ${results.siteData.length} unknown CMS sites\n`);

// Refined pattern detection
const refinedClusters = {
  wix: [],
  webflow: [],
  gatsby: [],
  nextjs: [],
  squarespace: [],
  shopify: [],
  hubspot: [],
  atlassian: [],
  drupal_like: [],
  custom_cms: []
};

results.siteData.forEach(site => {
  // 1. WIX Detection
  if (site.generators.some(g => g.includes('Wix')) || 
      site.scriptPaths.some(s => s.includes('wix.com') || s.includes('parastorage'))) {
    refinedClusters.wix.push({
      url: site.url,
      evidence: [...site.generators.filter(g => g.includes('Wix')), 
               ...site.scriptPaths.filter(s => s.includes('wix') || s.includes('parastorage'))]
    });
  }
  
  // 2. Webflow Detection  
  else if (site.generators.some(g => g.includes('Webflow')) || 
           site.scriptPaths.some(s => s.includes('webflow') || s.includes('assets.website-files.com'))) {
    refinedClusters.webflow.push({
      url: site.url,
      evidence: [...site.generators.filter(g => g.includes('Webflow')), 
               ...site.scriptPaths.filter(s => s.includes('webflow') || s.includes('website-files'))]
    });
  }
  
  // 3. Gatsby Detection
  else if (site.generators.some(g => g.includes('Gatsby')) || 
           site.scriptPaths.some(s => s.includes('gatsby') || s.includes('___gatsby'))) {
    refinedClusters.gatsby.push({
      url: site.url,
      evidence: [...site.generators.filter(g => g.includes('Gatsby')), 
               ...site.scriptPaths.filter(s => s.includes('gatsby'))]
    });
  }
  
  // 4. Next.js Detection (more specific)
  else if (site.scriptPaths.some(s => s.includes('/_next/') || s.includes('__nextjs')) ||
           site.headers.some(h => h.includes('Next.js'))) {
    refinedClusters.nextjs.push({
      url: site.url,
      evidence: [...site.scriptPaths.filter(s => s.includes('/_next/') || s.includes('__nextjs')), 
               ...site.headers.filter(h => h.includes('Next.js'))]
    });
  }
  
  // 5. Squarespace Detection
  else if (site.scriptPaths.some(s => s.includes('squarespace') || s.includes('static1.squarespace.com')) ||
           site.headers.some(h => h.includes('Squarespace'))) {
    refinedClusters.squarespace.push({
      url: site.url,
      evidence: [...site.scriptPaths.filter(s => s.includes('squarespace')), 
               ...site.headers.filter(h => h.includes('Squarespace'))]
    });
  }
  
  // 6. Shopify Detection
  else if (site.scriptPaths.some(s => s.includes('shopify') || s.includes('cdn.shopify.com')) ||
           site.headers.some(h => h.includes('Shopify'))) {
    refinedClusters.shopify.push({
      url: site.url,
      evidence: [...site.scriptPaths.filter(s => s.includes('shopify')), 
               ...site.headers.filter(h => h.includes('Shopify'))]
    });
  }
  
  // 7. HubSpot Detection
  else if (site.scriptPaths.some(s => s.includes('hubspot') || s.includes('hs-scripts.com')) ||
           site.headers.some(h => h.includes('HubSpot'))) {
    refinedClusters.hubspot.push({
      url: site.url,
      evidence: [...site.scriptPaths.filter(s => s.includes('hubspot') || s.includes('hs-scripts')), 
               ...site.headers.filter(h => h.includes('HubSpot'))]
    });
  }
  
  // 8. Atlassian Products (Jira, Confluence, etc.)
  else if (site.scriptPaths.some(s => s.includes('atlassian') || s.includes('jira') || s.includes('confluence'))) {
    refinedClusters.atlassian.push({
      url: site.url,
      evidence: site.scriptPaths.filter(s => s.includes('atlassian') || s.includes('jira') || s.includes('confluence'))
    });
  }
  
  // 9. Drupal-like patterns (not detected by main detector)
  else if (site.scriptPaths.some(s => s.includes('/sites/') || s.includes('/modules/') || s.includes('drupal'))) {
    refinedClusters.drupal_like.push({
      url: site.url,
      evidence: site.scriptPaths.filter(s => s.includes('/sites/') || s.includes('/modules/') || s.includes('drupal'))
    });
  }
  
  // 10. Potential Custom CMS with distinctive patterns
  else if (site.generators.length > 0 && !site.generators.some(g => g.includes('WordPress') || g.includes('Joomla') || g.includes('Drupal'))) {
    refinedClusters.custom_cms.push({
      url: site.url,
      evidence: site.generators
    });
  }
});

// Output results
console.log('POTENTIAL NEW CMS DISCRIMINATORS');
console.log('================================\n');

let clusterIndex = 1;

Object.entries(refinedClusters).forEach(([clusterName, sites]) => {
  if (sites.length >= 2) { // Only show clusters with 2+ sites
    console.log(`${clusterIndex}. ${clusterName.toUpperCase()} CLUSTER`);
    console.log(`   Cluster Size: ${sites.length} sites`);
    console.log(`   Confidence: ${sites.length >= 5 ? 'High' : 'Medium'}`);
    console.log(`   Suggested Name: ${clusterName.charAt(0).toUpperCase() + clusterName.slice(1).replace('_', ' ')}`);
    console.log('   Example Sites:');
    
    sites.slice(0, 5).forEach(site => {
      console.log(`     - ${site.url}`);
      if (site.evidence.length > 0) {
        console.log(`       Evidence: ${site.evidence.slice(0, 2).join(', ')}`);
      }
    });
    
    // Generate discriminator pattern
    if (sites.length > 0 && sites[0].evidence.length > 0) {
      const evidence = sites[0].evidence[0];
      if (evidence.includes('generator')) {
        console.log(`   Pattern: meta[name="generator"][content*="${evidence}"]`);
      } else if (evidence.includes('script') || evidence.includes('.js')) {
        console.log(`   Pattern: script[src*="${evidence.split('/').pop().split('?')[0]}"]`);
      } else {
        console.log(`   Pattern: Look for "${evidence}" in scripts or headers`);
      }
    }
    
    console.log('');
    clusterIndex++;
  }
});

// Analysis of server header patterns
console.log('SERVER-BASED CLUSTERS');
console.log('====================\n');

const serverClusters = {};
results.siteData.forEach(site => {
  site.headers.forEach(header => {
    if (header.includes('server:')) {
      const server = header.replace('server: ', '').trim();
      if (!serverClusters[server]) {
        serverClusters[server] = [];
      }
      serverClusters[server].push(site.url);
    }
  });
});

Object.entries(serverClusters)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10)
  .forEach(([server, urls]) => {
    if (urls.length >= 5 && !server.includes('nginx') && !server.includes('Apache') && !server.includes('cloudflare')) {
      console.log(`${server}: ${urls.length} sites`);
      console.log(`  Pattern: Server header detection`);
      console.log(`  Example: ${urls[0]}`);
      console.log('');
    }
  });

// Domain pattern analysis
console.log('DOMAIN PATTERN ANALYSIS');
console.log('=======================\n');

const domainPatterns = {};
results.siteData.forEach(site => {
  if (site.url && site.url.includes('.')) {
    const domain = site.url.replace(/https?:\/\//, '').split('/')[0];
    const parts = domain.split('.');
    
    // Look for hosting service patterns
    if (parts.length >= 3) {
      const subdomain = parts[0];
      const mainDomain = parts.slice(-2).join('.');
      
      // Common hosting patterns
      if (mainDomain.includes('herokuapp.com') || 
          mainDomain.includes('netlify.app') || 
          mainDomain.includes('vercel.app') ||
          mainDomain.includes('github.io') ||
          mainDomain.includes('s3.amazonaws.com')) {
        if (!domainPatterns[mainDomain]) {
          domainPatterns[mainDomain] = [];
        }
        domainPatterns[mainDomain].push(site.url);
      }
    }
  }
});

Object.entries(domainPatterns).forEach(([pattern, urls]) => {
  if (urls.length >= 3) {
    console.log(`${pattern}: ${urls.length} sites`);
    console.log(`  Type: Static Site/JAMstack hosting`);
    console.log(`  Pattern: Domain contains "${pattern}"`);
    console.log(`  Examples: ${urls.slice(0, 3).join(', ')}`);
    console.log('');
  }
});

console.log('SUMMARY & RECOMMENDATIONS');
console.log('=========================\n');

const recommendations = [];

Object.entries(refinedClusters).forEach(([name, sites]) => {
  if (sites.length >= 3) {
    recommendations.push({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
      size: sites.length,
      confidence: sites.length >= 5 ? 'High' : 'Medium',
      type: name.includes('next') || name.includes('gatsby') ? 'Headless/Static Site Generator' : 'CMS Platform'
    });
  }
});

recommendations.sort((a, b) => b.size - a.size);

console.log('TOP RECOMMENDATIONS FOR NEW DISCRIMINATORS:\\n');
recommendations.forEach((rec, index) => {
  console.log(`${index + 1}. ${rec.name}`);
  console.log(`   Type: ${rec.type}`);
  console.log(`   Cluster Size: ${rec.size} sites`);
  console.log(`   Confidence Level: ${rec.confidence}`);
  console.log('');
});

console.log(`\\nTotal unknown sites analyzed: ${results.siteData.length}`);
console.log(`Potential new CMS platforms identified: ${recommendations.length}`);
console.log(`Sites successfully clustered: ${recommendations.reduce((sum, rec) => sum + rec.size, 0)}`);