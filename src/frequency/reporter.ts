import { writeFile } from 'fs/promises';
import { createModuleLogger } from '../utils/logger.js';
import type { FrequencyResult, FrequencyOptions } from './types.js';

const logger = createModuleLogger('frequency-reporter');

/**
 * Format and output frequency analysis results
 */
export async function formatOutput(result: FrequencyResult, options: Required<FrequencyOptions>): Promise<void> {
  logger.info('Formatting output', { format: options.output, file: options.outputFile });
  
  let content: string;
  
  switch (options.output) {
    case 'json':
      content = JSON.stringify(result, null, 2);
      break;
    case 'csv':
      content = formatAsCSV(result);
      break;
    case 'markdown':
      content = formatAsMarkdown(result);
      break;
    case 'human':
    default:
      content = formatAsHuman(result);
      break;
  }
  
  if (options.outputFile) {
    await writeFile(options.outputFile, content, 'utf-8');
    logger.info('Output written to file', { file: options.outputFile, size: content.length });
  } else {
    console.log(content);
  }
}

/**
 * Format results as human-readable report
 */
function formatAsHuman(result: FrequencyResult): string {
  const { metadata, headers, metaTags, scripts, recommendations, filteringReport } = result;
  
  let output = `# Frequency Analysis Report

## Summary
- Total Sites Analyzed: ${metadata.totalSites}
- Valid Sites: ${metadata.validSites}
- Filtered Out: ${metadata.filteredSites}
- Analysis Date: ${new Date(metadata.analysisDate).toLocaleString()}
- Min Occurrences Threshold: ${metadata.options.minOccurrences}

`;

  // Filtering Report
  if (filteringReport) {
    output += `## Data Quality Filtering

Sites filtered out: ${filteringReport.sitesFilteredOut}

Filter Reasons:
`;
    for (const [reason, count] of Object.entries(filteringReport.filterReasons)) {
      if (count > 0) {
        output += `- ${reason}: ${count} sites\n`;
      }
    }
    output += '\n';
  }

  // HTTP Headers
  output += `## HTTP Headers (${Object.keys(headers).length} headers analyzed)

`;
  
  const sortedHeaders = Object.entries(headers)
    .sort(([, a], [, b]) => b.frequency - a.frequency)
    .slice(0, 20); // Top 20
  
  for (const [headerName, data] of sortedHeaders) {
    output += `### ${headerName}
- Frequency: ${Math.round(data.frequency * 100)}% (${data.occurrences}/${data.totalSites} sites)
- Unique Values: ${data.values.length}

Top Values:
`;
    for (const value of data.values.slice(0, 5)) {
      output += `  - \`${value.value}\`: ${Math.round(value.frequency * 100)}% (${value.occurrences} sites)\n`;
    }
    output += '\n';
  }

  // Meta Tags
  output += `## Meta Tags (${Object.keys(metaTags).length} patterns analyzed)

`;
  
  const sortedMetaTags = Object.entries(metaTags)
    .sort(([, a], [, b]) => b.frequency - a.frequency)
    .slice(0, 15); // Top 15
  
  for (const [tagKey, data] of sortedMetaTags) {
    output += `### ${tagKey}
- Frequency: ${Math.round(data.frequency * 100)}% (${data.occurrences}/${data.totalSites} sites)
- Example Values: ${data.values.map(v => v.value).slice(0, 3).join(', ')}

`;
  }

  // Scripts
  output += `## Script Patterns (${Object.keys(scripts).length} patterns analyzed)

`;
  
  const sortedScripts = Object.entries(scripts)
    .sort(([, a], [, b]) => b.frequency - a.frequency)
    .slice(0, 10); // Top 10
  
  for (const [pattern, data] of sortedScripts) {
    output += `### ${pattern}
- Frequency: ${Math.round(data.frequency * 100)}% (${data.occurrences}/${data.totalSites} sites)
- Examples: ${data.examples.slice(0, 2).join(', ')}

`;
  }

  // Recommendations
  if (recommendations) {
    output += `## Recommendations

### Learn Command Filter Recommendations

#### Currently Filtered Headers (${recommendations.learn.currentlyFiltered.length}):
${recommendations.learn.currentlyFiltered.map(h => `- ${h}`).join('\n')}

#### Recommend to Filter:
`;
    for (const rec of recommendations.learn.recommendToFilter) {
      output += `- ${rec.pattern}: ${rec.reason} (${Math.round(rec.frequency * 100)}% frequency, ${rec.diversity} values)\n`;
    }

    output += `
#### Recommend to Keep:
`;
    for (const rec of recommendations.learn.recommendToKeep) {
      output += `- ${rec.pattern}: ${rec.reason} (${Math.round(rec.frequency * 100)}% frequency, ${rec.diversity} values)\n`;
    }

    output += `
### Detect-CMS Recommendations

#### New Pattern Opportunities:
`;
    for (const opp of recommendations.detectCms.newPatternOpportunities) {
      const topCms = Object.entries(opp.cmsCorrelation)
        .filter(([cms]) => cms !== 'Unknown')
        .sort(([, a], [, b]) => b - a)[0];
      
      if (topCms) {
        output += `- ${opp.pattern}: ${Math.round(opp.frequency * 100)}% frequency, ${Math.round(topCms[1] * 100)}% correlation with ${topCms[0]}\n`;
      }
    }

    output += `
#### Patterns to Refine:
`;
    for (const refine of recommendations.detectCms.patternsToRefine) {
      output += `- ${refine.pattern}: ${refine.issue} (${Math.round(refine.currentFrequency * 100)}% frequency)\n`;
    }

    output += `
### Ground-Truth Recommendations

#### Potential New Rules:
`;
    for (const rule of recommendations.groundTruth.potentialNewRules) {
      output += `- ${rule.suggestedRule} (${Math.round(rule.confidence * 100)}% confidence)\n`;
    }
  }

  return output;
}

/**
 * Format results as markdown with tables
 */
function formatAsMarkdown(result: FrequencyResult): string {
  const { metadata, headers, metaTags, scripts, recommendations, filteringReport } = result;
  
  let output = `# Frequency Analysis Report

## Summary

- **Total Sites Analyzed**: ${metadata.totalSites}
- **Valid Sites**: ${metadata.validSites}
- **Filtered Out**: ${metadata.filteredSites}
- **Analysis Date**: ${new Date(metadata.analysisDate).toLocaleString()}
- **Min Occurrences Threshold**: ${metadata.options.minOccurrences}

`;

  // Filtering Report
  if (filteringReport) {
    output += `## Data Quality Filtering

Sites filtered out: ${filteringReport.sitesFilteredOut}

**Filter Reasons:**
`;
    for (const [reason, count] of Object.entries(filteringReport.filterReasons)) {
      if (count > 0) {
        output += `- **${reason}**: ${count} sites\n`;
      }
    }
    output += '\n';
  }

  // HTTP Headers as Table
  output += `## HTTP Headers

Total headers analyzed: **${Object.keys(headers).length}**

| Header | Frequency | Sites Using | Unique Values | Top Value | Top Value Usage |
|--------|-----------|-------------|---------------|-----------|----------------|
`;
  
  const sortedHeaders = Object.entries(headers)
    .sort(([, a], [, b]) => b.frequency - a.frequency);
  
  for (const [headerName, data] of sortedHeaders) {
    const topValue = data.values[0];
    const frequencyPercent = Math.round(data.frequency * 100);
    const topValuePercent = topValue ? Math.round(topValue.frequency * 100) : 0;
    const topValueDisplay = topValue ? escapeMarkdownTableCell(topValue.value) : 'N/A';
    
    // Extract just the header name (before colon) for display
    const displayName = headerName.split(':')[0];
    
    output += `| \`${displayName}\` | ${frequencyPercent}% | ${data.occurrences}/${data.totalSites} | ${data.values.length} | \`${topValueDisplay}\` | ${topValuePercent}% |\n`;
  }

  // Meta Tags as Table
  output += `

## Meta Tags

Total meta tag types analyzed: **${Object.keys(metaTags).length}**

*Each meta tag type may have multiple values. Table shows frequency of each type across all sites.*

| Meta Tag | Frequency | Sites Using | Example Value |
|----------|-----------|-------------|---------------|
`;
  
  const sortedMetaTags = Object.entries(metaTags)
    .sort(([, a], [, b]) => b.frequency - a.frequency)
    .slice(0, 50); // Top 50 (more comprehensive for markdown reports)
  
  for (const [tagKey, data] of sortedMetaTags) {
    const frequencyPercent = Math.round(data.frequency * 100);
    const exampleValue = data.values[0] ? escapeMarkdownTableCell(data.values[0].value) : 'N/A';
    
    output += `| \`${tagKey}\` | ${frequencyPercent}% | ${data.occurrences}/${data.totalSites} | \`${exampleValue}\` |\n`;
  }

  // Scripts organized by classification
  output += formatScriptPatternsByClassification(scripts);

  // Recommendations
  if (recommendations) {
    output += `## Recommendations

### Learn Command Filter Recommendations

#### Currently Filtered Headers (${recommendations.learn.currentlyFiltered.length}):
`;
    for (const header of recommendations.learn.currentlyFiltered) {
      output += `- \`${header}\`\n`;
    }

    output += `
#### Recommend to Filter:
`;
    for (const rec of recommendations.learn.recommendToFilter) {
      const freqPercent = Math.round(rec.frequency * 100);
      output += `- **\`${rec.pattern}\`**: ${rec.reason} (${freqPercent}% frequency, ${rec.diversity} values)\n`;
    }

    output += `
#### Recommend to Keep:
`;
    for (const rec of recommendations.learn.recommendToKeep) {
      const freqPercent = Math.round(rec.frequency * 100);
      output += `- **\`${rec.pattern}\`**: ${rec.reason} (${freqPercent}% frequency, ${rec.diversity} values)\n`;
    }

    output += `
### Detect-CMS Recommendations

#### New Pattern Opportunities:
`;
    for (const opp of recommendations.detectCms.newPatternOpportunities) {
      const topCms = Object.entries(opp.cmsCorrelation)
        .filter(([cms]) => cms !== 'Unknown')
        .sort(([, a], [, b]) => b - a)[0];
      
      if (topCms) {
        const freqPercent = Math.round(opp.frequency * 100);
        const corrPercent = Math.round(topCms[1] * 100);
        output += `- **\`${opp.pattern}\`**: ${freqPercent}% frequency, ${corrPercent}% correlation with ${topCms[0]}\n`;
      }
    }

    output += `
#### Patterns to Refine:
`;
    for (const refine of recommendations.detectCms.patternsToRefine) {
      const freqPercent = Math.round(refine.currentFrequency * 100);
      output += `- **\`${refine.pattern}\`**: ${refine.issue} (${freqPercent}% frequency)\n`;
    }

    output += `
### Ground-Truth Recommendations

#### Potential New Rules:
`;
    for (const rule of recommendations.groundTruth.potentialNewRules) {
      const confPercent = Math.round(rule.confidence * 100);
      output += `- ${rule.suggestedRule} (${confPercent}% confidence)\n`;
    }
  }

  return output;
}

/**
 * Escape markdown table cell content
 */
function escapeMarkdownTableCell(text: string): string {
  if (!text) return '';
  // Escape pipes and trim for table cells
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ').substring(0, 50) + (text.length > 50 ? '...' : '');
}

/**
 * Escape markdown text content
 */
function escapeMarkdownText(text: string): string {
  if (!text) return '';
  // Basic markdown escaping
  return text.replace(/[*_`]/g, '\\$&').substring(0, 100) + (text.length > 100 ? '...' : '');
}

/**
 * Format script examples for markdown table cells
 */
function formatScriptExample(example: string): string {
  if (!example) return 'N/A';
  
  // Check if this contains HTML comments or CDATA that should be in a code block
  if (example.includes('<!--') || example.includes('<![CDATA[') || example.includes('Drupal.behaviors')) {
    // For table cells with complex code, show just a summary and indicate it's code
    const summary = example.substring(0, 30).replace(/\n/g, ' ').trim();
    return `\`${summary}...\` (inline code)`;
  }
  
  // For simple examples, escape and truncate for table cell
  return escapeMarkdownTableCell(example);
}

/**
 * Format script patterns organized by classification type
 */
function formatScriptPatternsByClassification(scripts: FrequencyResult['scripts']): string {
  const classifications = {
    'path': {
      title: 'Path Patterns',
      description: 'Script locations that indicate CMS structure, platform architecture, or organizational patterns.'
    },
    'library': {
      title: 'JavaScript Libraries',
      description: 'Popular JavaScript libraries and frameworks detected across sites.'
    },
    'tracking': {
      title: 'Analytics & Tracking',
      description: 'Analytics platforms, marketing pixels, and user tracking technologies.'
    },
    'script': {
      title: 'Script Characteristics',
      description: 'Technical attributes and optimization patterns of JavaScript files.'
    },
    'inline': {
      title: 'Inline Script Patterns',
      description: 'Common patterns found in inline JavaScript code embedded in HTML.'
    },
    'domain': {
      title: 'CDN & External Domains',
      description: 'Content delivery networks and external script hosting services.'
    }
  };

  let output = `

## Script Patterns

`;

  // Group scripts by classification
  const groupedScripts = new Map<string, Array<[string, any]>>();
  
  for (const [pattern, data] of Object.entries(scripts)) {
    const prefix = pattern.split(':')[0];
    if (!groupedScripts.has(prefix)) {
      groupedScripts.set(prefix, []);
    }
    groupedScripts.get(prefix)!.push([pattern, data]);
  }

  // Sort each group by frequency
  for (const [prefix, patterns] of groupedScripts.entries()) {
    patterns.sort(([, a], [, b]) => b.frequency - a.frequency);
  }

  // Generate tables for each classification that has patterns
  for (const [prefix, config] of Object.entries(classifications)) {
    const patterns = groupedScripts.get(prefix);
    if (!patterns || patterns.length === 0) continue;

    output += `### ${config.title}

*${config.description}*

| Pattern | Frequency | Sites Using | Example |
|---------|-----------|-------------|---------|
`;

    for (const [pattern, data] of patterns.slice(0, 15)) { // Top 15 per category
      const frequencyPercent = Math.round(data.frequency * 100);
      const firstExample = data.examples[0] ? formatScriptExample(data.examples[0]) : 'N/A';
      const patternDisplay = pattern.replace(`${prefix}:`, ''); // Remove prefix for cleaner display
      
      output += `| \`${patternDisplay}\` | ${frequencyPercent}% | ${data.occurrences}/${data.totalSites} | ${firstExample} |\n`;
    }

    output += '\n';
  }

  // Add summary statistics
  const totalPatterns = Object.keys(scripts).length;
  const categoriesWithData = groupedScripts.size;
  
  output += `**Summary:** ${totalPatterns} total patterns across ${categoriesWithData} categories analyzed.

`;

  return output;
}

/**
 * Format results as CSV
 */
function formatAsCSV(result: FrequencyResult): string {
  let csv = 'Type,Pattern,Frequency,Occurrences,TotalSites,Examples\n';
  
  // Helper function to escape CSV values
  const escapeCSV = (value: string): string => {
    return `"${value.replace(/"/g, '""')}"`;
  };
  
  // Headers
  for (const [headerName, data] of Object.entries(result.headers)) {
    for (const value of data.values) {
      // If headerName already ends with the value, use as-is, otherwise append value
      const pattern = headerName.endsWith(`:${value.value}`) ? headerName : `${headerName}:${value.value}`;
      csv += `Header,${escapeCSV(pattern)},${value.frequency},${value.occurrences},${data.totalSites},${escapeCSV(value.examples.join('; '))}\n`;
    }
  }
  
  // Meta Tags
  for (const [tagKey, data] of Object.entries(result.metaTags)) {
    for (const value of data.values) {
      csv += `MetaTag,${escapeCSV(`${tagKey}:${value.value}`)},${value.frequency},${value.occurrences},${data.totalSites},${escapeCSV(value.examples.join('; '))}\n`;
    }
  }
  
  // Scripts
  for (const [pattern, data] of Object.entries(result.scripts)) {
    csv += `Script,${escapeCSV(pattern)},${data.frequency},${data.occurrences},${data.totalSites},${escapeCSV(data.examples.join('; '))}\n`;
  }
  
  return csv;
}