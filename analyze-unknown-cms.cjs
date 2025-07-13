#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load index.json to get list of unknown CMS sites
const dataDir = '/Users/marklummus/Documents/inspector-cli/data/cms-analysis';
const indexPath = path.join(dataDir, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

// Get unknown sites (null, undefined, or "Unknown" cms)
const nullSites = index.filter(item => !item.cms || item.cms === null);
const unknownSites = index.filter(item => item.cms === "Unknown");
const allUnknownSites = [...nullSites, ...unknownSites];

console.log(`Sites with null cms: ${nullSites.length}`);
console.log(`Sites with "Unknown" cms: ${unknownSites.length}`);
console.log(`Total sites to analyze: ${allUnknownSites.length}`);

// Analysis results storage
const clusters = {
  generator: {},
  scripts: {},
  technologies: {},
  frameworks: {},
  headlessIndicators: {},
  serverHeaders: {},
  domPatterns: {},
  urlPatterns: {}
};

const siteData = [];

// Process each unknown site
allUnknownSites.forEach((site, index) => {
  if (index % 50 === 0) {
    console.log(`Processing ${index}/${allUnknownSites.length} sites...`);
  }
  
  try {
    const filePath = path.join(dataDir, site.filePath);
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${site.filePath}`);
      return;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const analysis = {
      url: data.url || site.url,
      generators: [],
      scriptPaths: [],
      technologies: [],
      frameworks: [],
      headless: [],
      headers: [],
      domClasses: [],
      urlStructure: ''
    };
    
    // Extract generator meta tags
    if (data.metaTags) {
      data.metaTags.forEach(tag => {
        if (tag.name && tag.name.toLowerCase() === 'generator' && tag.content) {
          const generator = tag.content.trim();
          analysis.generators.push(generator);
          clusters.generator[generator] = (clusters.generator[generator] || 0) + 1;
        }
      });
    }
    
    // Extract script source patterns
    if (data.scripts) {
      data.scripts.forEach(script => {
        if (script.src) {
          const src = script.src.toLowerCase();
          analysis.scriptPaths.push(src);
          
          // Look for framework indicators (avoid duplicates)
          if (src.includes('react') && !analysis.frameworks.includes('React')) {
            analysis.frameworks.push('React');
            clusters.frameworks['React'] = (clusters.frameworks['React'] || 0) + 1;
          }
          if (src.includes('vue') && !analysis.frameworks.includes('Vue')) {
            analysis.frameworks.push('Vue');
            clusters.frameworks['Vue'] = (clusters.frameworks['Vue'] || 0) + 1;
          }
          if (src.includes('angular') && !analysis.frameworks.includes('Angular')) {
            analysis.frameworks.push('Angular');
            clusters.frameworks['Angular'] = (clusters.frameworks['Angular'] || 0) + 1;
          }
          if (src.includes('jquery') && !analysis.frameworks.includes('jQuery')) {
            analysis.frameworks.push('jQuery');
            clusters.frameworks['jQuery'] = (clusters.frameworks['jQuery'] || 0) + 1;
          }
          
          // Look for CMS-specific patterns
          if (src.includes('/wp-content/') || src.includes('/wp-includes/')) {
            analysis.scriptPaths.push('WordPress-pattern');
            clusters.scripts['WordPress-pattern'] = (clusters.scripts['WordPress-pattern'] || 0) + 1;
          }
          if (src.includes('/sites/') && src.includes('/modules/')) {
            analysis.scriptPaths.push('Drupal-pattern');
            clusters.scripts['Drupal-pattern'] = (clusters.scripts['Drupal-pattern'] || 0) + 1;
          }
          if (src.includes('/media/') && src.includes('/jui/')) {
            analysis.scriptPaths.push('Joomla-pattern');
            clusters.scripts['Joomla-pattern'] = (clusters.scripts['Joomla-pattern'] || 0) + 1;
          }
          if ((src.includes('/_next/') || src.includes('/next/')) && !analysis.headless.includes('Next.js')) {
            analysis.headless.push('Next.js');
            clusters.headlessIndicators['Next.js'] = (clusters.headlessIndicators['Next.js'] || 0) + 1;
          }
          if (src.includes('/_nuxt/') && !analysis.headless.includes('Nuxt.js')) {
            analysis.headless.push('Nuxt.js');
            clusters.headlessIndicators['Nuxt.js'] = (clusters.headlessIndicators['Nuxt.js'] || 0) + 1;
          }
          if ((src.includes('/gatsby/') || src.includes('gatsby-')) && !analysis.headless.includes('Gatsby')) {
            analysis.headless.push('Gatsby');
            clusters.headlessIndicators['Gatsby'] = (clusters.headlessIndicators['Gatsby'] || 0) + 1;
          }
          if ((src.includes('strapi') || src.includes('/api/')) && !analysis.headless.includes('Headless-API')) {
            analysis.headless.push('Headless-API');
            clusters.headlessIndicators['Headless-API'] = (clusters.headlessIndicators['Headless-API'] || 0) + 1;
          }
        }
      });
    }
    
    // Extract technologies
    if (data.technologies) {
      data.technologies.forEach(tech => {
        if (typeof tech === 'string') {
          analysis.technologies.push(tech);
          clusters.technologies[tech] = (clusters.technologies[tech] || 0) + 1;
        } else if (tech.name) {
          analysis.technologies.push(tech.name);
          clusters.technologies[tech.name] = (clusters.technologies[tech.name] || 0) + 1;
        }
      });
    }
    
    // Extract server headers
    if (data.httpHeaders) {
      Object.keys(data.httpHeaders).forEach(header => {
        const headerName = header.toLowerCase();
        const headerValue = data.httpHeaders[header];
        
        if (headerName === 'server' || headerName === 'x-powered-by') {
          analysis.headers.push(`${headerName}: ${headerValue}`);
          clusters.serverHeaders[`${headerName}: ${headerValue}`] = (clusters.serverHeaders[`${headerName}: ${headerValue}`] || 0) + 1;
        }
        
        // Look for CMS-specific headers
        if (headerName.includes('drupal') || headerName.includes('joomla') || headerName.includes('wordpress')) {
          analysis.headers.push(`CMS-header: ${headerName}: ${headerValue}`);
          clusters.serverHeaders[`CMS-header: ${headerName}: ${headerValue}`] = (clusters.serverHeaders[`CMS-header: ${headerName}: ${headerValue}`] || 0) + 1;
        }
      });
    }
    
    // Extract DOM patterns from HTML content (sample)
    if (data.htmlContent) {
      const html = data.htmlContent.toLowerCase();
      
      // Look for specific class patterns
      const classMatches = html.match(/class="[^"]*"/g) || [];
      classMatches.slice(0, 10).forEach(classMatch => {
        const classes = classMatch.replace(/class="([^"]*)"/, '$1').split(' ');
        classes.forEach(cls => {
          if (cls && cls.length > 3) {
            clusters.domPatterns[cls] = (clusters.domPatterns[cls] || 0) + 1;
          }
        });
      });
      
      // Look for framework signatures (only count once per site)
      if ((html.includes('data-reactroot') || html.includes('react-')) && !analysis.frameworks.includes('React-DOM')) {
        analysis.frameworks.push('React-DOM');
        clusters.frameworks['React-DOM'] = (clusters.frameworks['React-DOM'] || 0) + 1;
      }
      if ((html.includes('ng-') || html.includes('angular')) && !analysis.frameworks.includes('Angular-DOM')) {
        analysis.frameworks.push('Angular-DOM');
        clusters.frameworks['Angular-DOM'] = (clusters.frameworks['Angular-DOM'] || 0) + 1;
      }
      if ((html.includes('v-') || html.includes('vue-')) && !analysis.frameworks.includes('Vue-DOM')) {
        analysis.frameworks.push('Vue-DOM');
        clusters.frameworks['Vue-DOM'] = (clusters.frameworks['Vue-DOM'] || 0) + 1;
      }
    }
    
    // URL structure analysis
    try {
      const url = new URL(data.url);
      analysis.urlStructure = url.pathname;
      clusters.urlPatterns[url.pathname] = (clusters.urlPatterns[url.pathname] || 0) + 1;
    } catch (urlError) {
      // Skip invalid URLs
      analysis.urlStructure = 'invalid-url';
    }
    
    siteData.push(analysis);
    
  } catch (error) {
    console.log(`Error processing ${site.filePath}: ${error.message}`);
  }
});

console.log('\n=== ANALYSIS COMPLETE ===\n');

// Output results
console.log('CLUSTER ANALYSIS RESULTS');
console.log('========================\n');

// Generator patterns
console.log('1. GENERATOR META TAG PATTERNS:');
const topGenerators = Object.entries(clusters.generator)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);
topGenerators.forEach(([generator, count]) => {
  console.log(`  ${count} sites: ${generator}`);
});

console.log('\n2. TECHNOLOGY PATTERNS:');
const topTechnologies = Object.entries(clusters.technologies)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);
topTechnologies.forEach(([tech, count]) => {
  console.log(`  ${count} sites: ${tech}`);
});

console.log('\n3. FRAMEWORK PATTERNS:');
const topFrameworks = Object.entries(clusters.frameworks)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);
topFrameworks.forEach(([framework, count]) => {
  console.log(`  ${count} sites: ${framework}`);
});

console.log('\n4. HEADLESS/MODERN CMS INDICATORS:');
const topHeadless = Object.entries(clusters.headlessIndicators)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);
topHeadless.forEach(([indicator, count]) => {
  console.log(`  ${count} sites: ${indicator}`);
});

console.log('\n5. SERVER HEADER PATTERNS:');
const topHeaders = Object.entries(clusters.serverHeaders)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);
topHeaders.forEach(([header, count]) => {
  console.log(`  ${count} sites: ${header}`);
});

console.log('\n6. SCRIPT PATH PATTERNS:');
const topScripts = Object.entries(clusters.scripts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);
topScripts.forEach(([script, count]) => {
  console.log(`  ${count} sites: ${script}`);
});

// Save detailed results to file
const results = {
  summary: {
    totalUnknownSites: allUnknownSites.length,
    analyzedSites: siteData.length,
    clusters: {
      generators: Object.keys(clusters.generator).length,
      technologies: Object.keys(clusters.technologies).length,
      frameworks: Object.keys(clusters.frameworks).length,
      headlessIndicators: Object.keys(clusters.headlessIndicators).length,
      serverHeaders: Object.keys(clusters.serverHeaders).length
    }
  },
  clusters,
  siteData
};

fs.writeFileSync('/Users/marklummus/Documents/inspector-cli/unknown-cms-analysis.json', JSON.stringify(results, null, 2));
console.log('\n📄 Detailed results saved to: unknown-cms-analysis.json');

console.log('\n=== POTENTIAL NEW CMS CLUSTERS ===\n');

// Identify potential CMS clusters
const potentialClusters = [];

// High-frequency generators that could be new CMS platforms
topGenerators.forEach(([generator, count]) => {
  if (count >= 5 && !generator.toLowerCase().includes('wordpress') && 
      !generator.toLowerCase().includes('joomla') && 
      !generator.toLowerCase().includes('drupal')) {
    potentialClusters.push({
      type: 'Generator-based CMS',
      name: generator.split(' ')[0], // Take first word as potential name
      pattern: `meta[name="generator"][content*="${generator}"]`,
      size: count,
      confidence: count >= 10 ? 'High' : 'Medium'
    });
  }
});

// Technology-based clusters
topTechnologies.forEach(([tech, count]) => {
  if (count >= 10 && !tech.toLowerCase().includes('wordpress') && 
      !tech.toLowerCase().includes('joomla') && 
      !tech.toLowerCase().includes('drupal')) {
    potentialClusters.push({
      type: 'Technology-based Platform',
      name: tech,
      pattern: `Technology signature: ${tech}`,
      size: count,
      confidence: count >= 20 ? 'High' : 'Medium'
    });
  }
});

// Framework-based clusters
topFrameworks.forEach(([framework, count]) => {
  if (count >= 8) {
    potentialClusters.push({
      type: 'Framework-based Platform',
      name: framework,
      pattern: `Framework signature: ${framework}`,
      size: count,
      confidence: count >= 15 ? 'High' : 'Medium'
    });
  }
});

// Headless CMS clusters
topHeadless.forEach(([headless, count]) => {
  if (count >= 5) {
    potentialClusters.push({
      type: 'Headless/Modern CMS',
      name: headless,
      pattern: `Headless indicator: ${headless}`,
      size: count,
      confidence: count >= 10 ? 'High' : 'Medium'
    });
  }
});

console.log('RECOMMENDED CLUSTERS FOR NEW DISCRIMINATORS:');
console.log('===========================================\n');

potentialClusters
  .sort((a, b) => b.size - a.size)
  .slice(0, 10)
  .forEach((cluster, index) => {
    console.log(`${index + 1}. ${cluster.name}`);
    console.log(`   Type: ${cluster.type}`);
    console.log(`   Cluster Size: ${cluster.size} sites`);
    console.log(`   Confidence: ${cluster.confidence}`);
    console.log(`   Pattern: ${cluster.pattern}`);
    console.log('');
  });

console.log('\n📊 Analysis complete! Check unknown-cms-analysis.json for full details.');