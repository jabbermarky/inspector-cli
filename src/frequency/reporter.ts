import { writeFile } from 'fs/promises';
import { createModuleLogger } from '../utils/logger.js';
import type { FrequencyResult, FrequencyOptionsWithDefaults, HeaderCooccurrence } from './types.js';
import type { DatasetBiasAnalysis } from './bias-detector.js';

const logger = createModuleLogger('frequency-reporter');

import { mapJsonReplacer } from './utils/map-converter.js';

/**
 * Custom JSON replacer to handle Map objects properly in JSON serialization
 * @deprecated Use mapJsonReplacer from utils/map-converter.ts instead
 */
function mapReplacer(key: string, value: any): any {
  return mapJsonReplacer(key, value);
}

/**
 * Format and output frequency analysis results
 */
export async function formatOutput(result: FrequencyResult, options: FrequencyOptionsWithDefaults, biasAnalysis?: DatasetBiasAnalysis | null): Promise<void> {
  logger.info('Formatting output', { format: options.output, file: options.outputFile });
  
  let content: string;
  
  switch (options.output) {
    case 'json':
      content = JSON.stringify(result, mapReplacer, 2);
      break;
    case 'csv':
      content = formatAsCSV(result);
      break;
    case 'markdown':
      content = formatAsMarkdown(result, options, biasAnalysis);
      break;
    case 'human':
    default:
      content = formatAsHuman(result, options, biasAnalysis);
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
function formatAsHuman(result: FrequencyResult, options: FrequencyOptionsWithDefaults, biasAnalysisParam?: DatasetBiasAnalysis | null): string {
  const { metadata, headers, metaTags, scripts, recommendations, filteringReport, cooccurrenceAnalysis, patternDiscoveryAnalysis, semanticAnalysis } = result;
  
  // Use passed biasAnalysis parameter if available, otherwise fall back to result's biasAnalysis
  const biasAnalysis = biasAnalysisParam || result.biasAnalysis;
  
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

  // Dataset Bias Analysis
  if (biasAnalysis) {
    output += `## Dataset Quality Assessment

**CMS Distribution:**
`;
    for (const [cms, data] of Object.entries(biasAnalysis.cmsDistribution)) {
      const distribution = data as { count: number; percentage: number; sites: string[] };
      output += `- ${cms}: ${distribution.count} sites (${Math.round(distribution.percentage)}%)\n`;
    }
    
    output += `\n**Dataset Concentration Score:** ${Math.round(biasAnalysis.concentrationScore * 100)}% (0% = perfectly balanced, 100% = single platform)\n\n`;
    
    if (biasAnalysis.biasWarnings.length > 0) {
      output += `**⚠️ Dataset Quality Warnings:**\n`;
      for (const warning of biasAnalysis.biasWarnings) {
        output += `- ${warning}\n`;
      }
      output += '\n';
    }
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
- Unique Values: ${(data.values as any)?.totalUniqueValues || (data.values || []).length}`;
    
    // Add page distribution if available
    if (data.pageDistribution) {
      const mainPercent = Math.round(data.pageDistribution.mainpage * 100);
      const robotsPercent = Math.round(data.pageDistribution.robots * 100);
      output += `\n- Page Distribution: ${mainPercent}% mainpage, ${robotsPercent}% robots.txt`;
    }
    
    output += `\n\nTop Values:\n`;
    for (const value of (data.values || []).slice(0, 5)) {
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
- Unique Values: ${(data.values as any)?.totalUniqueValues || (data.values || []).length}

Top Values:
`;
    
    // Add top values if available
    if (data.values?.length > 0) {
      for (const value of data.values.slice(0, 5)) {
        output += `  - \`${value.value}\`: ${Math.round(value.frequency * 100)}% (${value.occurrences} sites)
`;
      }
    } else {
      output += `  - No values available
`;
    }
    
    output += `
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
`;
    
    // Show examples - scripts use direct examples array
    if (data.examples && data.examples.length > 0) {
      output += `- Examples: ${data.examples.slice(0, 3).join(', ')}
`;
    } else {
      output += `- Examples: (no examples available)
`;
    }
    
    output += `
`;
  }

  // Debug Mode: Calculation Audit Trail
  if (options.debugCalculations && biasAnalysis) {
    output += `## 🔧 Debug Mode: Calculation Audit Trail

### Statistical Thresholds Applied
- **Minimum Sample Size**: 30 sites (for strict discriminative scoring)
- **Minimum CMS Concentration**: 40% (for discriminative headers)
- **Platform Specificity Algorithm**: Two-tier (strict for ≥30 sites, coefficient of variation for <30 sites)

### Header Correlation Details
`;
    
    for (const [headerName, correlation] of biasAnalysis.headerCorrelations.entries()) {
      if (correlation.overallOccurrences >= 5) { // Only show headers with reasonable sample size
        output += `
#### \`${headerName}\`
- **Sample Size**: ${correlation.overallOccurrences} sites (${(correlation.overallFrequency * 100).toFixed(1)}% of dataset)
- **Platform Specificity**: ${(correlation.platformSpecificity * 100).toFixed(1)}%
- **Confidence Level**: ${correlation.recommendationConfidence}

**P(CMS|header) Breakdown:**
`;
        
        for (const [cms, data] of Object.entries(correlation.cmsGivenHeader)) {
          if (data.count > 0) {
            output += `- ${cms}: ${data.count}/${correlation.overallOccurrences} = ${(data.probability * 100).toFixed(1)}%\n`;
          }
        }
        
        if (correlation.biasWarning) {
          output += `⚠️ **Bias Warning**: ${correlation.biasWarning}\n`;
        }
      }
    }
    
    output += `\n---\n`;
  }

  // Recommendations with Calculation Transparency
  if (recommendations) {
    output += `## Recommendations

### Learn Command Filter Recommendations

#### Currently Filtered Headers (${recommendations.learn.currentlyFiltered.length}):
${recommendations.learn.currentlyFiltered.map(h => `- ${h}`).join('\n')}

#### Recommend to Filter:
`;
    for (const rec of recommendations.learn.recommendToFilter) {
      const headerData = headers[rec.pattern];
      const freqPercent = headerData ? Math.round(headerData.frequency * 100) : Math.round(rec.frequency * 100);
      output += `- ${rec.pattern}: ${rec.reason} (${freqPercent}% frequency, ${rec.diversity} values)\n`;
    }

    output += `
#### Recommend to Keep:
`;
    
    // Separate recommendations by confidence level
    const highConfidence = recommendations.learn.recommendToKeep.filter(rec => {
      if (biasAnalysis && biasAnalysis.headerCorrelations.has(rec.pattern)) {
        const correlation = biasAnalysis.headerCorrelations.get(rec.pattern)!;
        return correlation.recommendationConfidence === 'high';
      }
      return false;
    });
    
    const mediumConfidence = recommendations.learn.recommendToKeep.filter(rec => {
      if (biasAnalysis && biasAnalysis.headerCorrelations.has(rec.pattern)) {
        const correlation = biasAnalysis.headerCorrelations.get(rec.pattern)!;
        return correlation.recommendationConfidence === 'medium';
      }
      return false;
    });
    
    const lowConfidence = recommendations.learn.recommendToKeep.filter(rec => {
      if (biasAnalysis && biasAnalysis.headerCorrelations.has(rec.pattern)) {
        const correlation = biasAnalysis.headerCorrelations.get(rec.pattern)!;
        return correlation.recommendationConfidence === 'low';
      }
      return true; // Default to low confidence if no bias analysis
    });
    
    // High Confidence Recommendations
    if (highConfidence.length > 0) {
      output += `
##### High Confidence Recommendations (${highConfidence.length})
*Headers with strong statistical support for CMS detection*

`;
      for (const rec of highConfidence) {
        const headerData = headers[rec.pattern];
        const freqPercent = headerData ? Math.round(headerData.frequency * 100) : Math.round(rec.frequency * 100);
        
        let transparencyInfo = '';
        if (biasAnalysis && biasAnalysis.headerCorrelations.has(rec.pattern)) {
          const correlation = biasAnalysis.headerCorrelations.get(rec.pattern)!;
          const topCMS = Object.entries(correlation.cmsGivenHeader)
            .filter(([cms]) => !['Unknown', 'Enterprise', 'CDN'].includes(cms))
            .sort(([, a], [, b]) => b.probability - a.probability)[0];
          
          if (topCMS && topCMS[1].probability > 0.1) {
            const cmsPercent = Math.round(topCMS[1].probability * 100);
            const cmsCount = topCMS[1].count;
            transparencyInfo = ` | **${cmsCount}/${correlation.overallOccurrences} sites (${cmsPercent}%) are ${topCMS[0]}**`;
          }
        }
        
        output += `- **${rec.pattern}**: ${rec.reason}${transparencyInfo}\n`;
      }
    }
    
    // Medium Confidence Recommendations  
    if (mediumConfidence.length > 0) {
      output += `
##### Medium Confidence Recommendations (${mediumConfidence.length})
*Headers with moderate support - use with caution*

`;
      for (const rec of mediumConfidence) {
        const headerData = headers[rec.pattern];
        const freqPercent = headerData ? Math.round(headerData.frequency * 100) : Math.round(rec.frequency * 100);
        
        let transparencyInfo = '';
        if (biasAnalysis && biasAnalysis.headerCorrelations.has(rec.pattern)) {
          const correlation = biasAnalysis.headerCorrelations.get(rec.pattern)!;
          transparencyInfo = ` | ${correlation.overallOccurrences} sites total`;
        }
        
        output += `- **${rec.pattern}**: ${rec.reason} (${freqPercent}% frequency)${transparencyInfo}\n`;
      }
    }
    
    // Low Confidence Recommendations
    if (lowConfidence.length > 0) {
      output += `
##### Low Confidence Recommendations (${lowConfidence.length})
*Headers flagged for future analysis when more data available*

`;
      for (const rec of lowConfidence) {
        const headerData = headers[rec.pattern];
        const freqPercent = headerData ? Math.round(headerData.frequency * 100) : Math.round(rec.frequency * 100);
        
        let warningInfo = '';
        if (biasAnalysis && biasAnalysis.headerCorrelations.has(rec.pattern)) {
          const correlation = biasAnalysis.headerCorrelations.get(rec.pattern)!;
          if (correlation.biasWarning) {
            warningInfo = ` ⚠️ *${correlation.biasWarning}*`;
          }
        }
        
        output += `- **${rec.pattern}**: ${rec.reason} (${freqPercent}% frequency)${warningInfo}\n`;
      }
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

  // Co-occurrence Analytics
  if (cooccurrenceAnalysis) {
    output += `\n## Header Co-occurrence Analytics

**Technology Stack Signatures:** ${cooccurrenceAnalysis.technologySignatures.length} discovered

`;
    
    // Technology Stack Signatures
    if (cooccurrenceAnalysis.technologySignatures.length > 0) {
      output += `### Technology Stack Signatures\n\n`;
      
      for (const signature of cooccurrenceAnalysis.technologySignatures.slice(0, 10)) {
        output += `#### ${signature.name} Stack\n`;
        output += `- **Vendor**: ${signature.vendor}\n`;
        output += `- **Category**: ${signature.category}\n`;
        output += `- **Required Headers**: ${signature.requiredHeaders.join(', ')}\n`;
        output += `- **Optional Headers**: ${signature.optionalHeaders.join(', ')}\n`;
        output += `- **Sites**: ${signature.sites.length} sites\n`;
        output += `- **Confidence**: ${Math.round(signature.confidence * 100)}%\n`;
        output += `- **Occurrences**: ${signature.occurrenceCount}\n`
        
        output += `\n`;
      }
    }
    
    // Platform Header Combinations
    if (cooccurrenceAnalysis.platformCombinations.length > 0) {
      output += `### Platform-Specific Header Combinations\n\n`;
      
      const topCombinations = cooccurrenceAnalysis.platformCombinations
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 15);
      
      for (const combo of topCombinations) {
        output += `- **${combo.platform}**: ${combo.headerGroup.join(' + ')} `;
        output += `(${Math.round(combo.frequency * 100)}%, Strength: ${combo.strength.toFixed(3)})\n`;
      }
      output += `\n`;
    }
    
    // High Correlation Pairs
    const highCorrelationPairs = cooccurrenceAnalysis.cooccurrences
      .filter((h: HeaderCooccurrence) => h.mutualInformation > 0.3)
      .sort((a: HeaderCooccurrence, b: HeaderCooccurrence) => b.mutualInformation - a.mutualInformation)
      .slice(0, 20);
    
    if (highCorrelationPairs.length > 0) {
      output += `### High Correlation Header Pairs\n\n`;
      output += `Headers with strong co-occurrence patterns (Mutual Information > 0.3):\n\n`;
      
      for (const pair of highCorrelationPairs) {
        output += `- **${pair.header1}** ↔ **${pair.header2}**: `;
        output += `${pair.cooccurrenceCount} sites `;
        output += `(${Math.round(pair.cooccurrenceFrequency * 100)}%, MI: ${pair.mutualInformation.toFixed(3)})\n`;
      }
      output += `\n`;
    }
    
    // Mutual Exclusivity Analysis
    const exclusivePairs = cooccurrenceAnalysis.cooccurrences
      .filter((h: HeaderCooccurrence) => h.cooccurrenceCount === 0 && h.cooccurrenceFrequency === 0)
      .sort((a: HeaderCooccurrence, b: HeaderCooccurrence) => (b.conditionalProbability + a.conditionalProbability) - (a.conditionalProbability + b.conditionalProbability))
      .slice(0, 10);
    
    if (exclusivePairs.length > 0) {
      output += `### Mutually Exclusive Header Patterns\n\n`;
      output += `Headers that never appear together (potential platform isolation):\n\n`;
      
      for (const pair of exclusivePairs) {
        output += `- **${pair.header1}** vs **${pair.header2}**: `;
        output += `(0 sites overlap)\n`;
      }
      output += `\n`;
    }
    
    // Summary insights
    output += `### Co-occurrence Insights\n\n`;
    output += `- **Total Header Pairs Analyzed**: ${cooccurrenceAnalysis.cooccurrences.length}\n`;
    output += `- **Technology Stacks Identified**: ${cooccurrenceAnalysis.technologySignatures.length}\n`;
    output += `- **Platform Combinations**: ${cooccurrenceAnalysis.platformCombinations.length}\n`;
    output += `- **High Correlation Pairs**: ${highCorrelationPairs.length} (MI > 0.3)\n`;
    output += `- **Mutually Exclusive Pairs**: ${exclusivePairs.length}\n\n`;
  }

  // Semantic Analysis Insights
  if (semanticAnalysis) {
    output += `\n## Semantic Header Analysis

**Headers Analyzed:** ${semanticAnalysis.headerAnalyses.size} headers with semantic classification

`;
    
    // Category Distribution
    output += `### Header Category Distribution\n\n`;
    
    const sortedCategories = semanticAnalysis.insights.topCategories
      .sort((a, b) => b.count - a.count);
    
    for (const category of sortedCategories) {
      if (category.count > 0) {
        output += `- **${category.category}**: ${category.count} headers (${Math.round(category.percentage)}%)\n`;
      }
    }
    output += `\n`;
    
    // Vendor Distribution
    if (semanticAnalysis.insights.topVendors.length > 0) {
      output += `### Technology Vendor Distribution\n\n`;
      
      const topVendors = semanticAnalysis.insights.topVendors
        .filter(v => v.count > 1) // Only show vendors with multiple headers
        .slice(0, 15);
      
      for (const vendor of topVendors) {
        output += `- **${vendor.vendor}**: ${vendor.count} headers (${Math.round(vendor.percentage)}%)\n`;
      }
      output += `\n`;
    }
    
    // Naming Convention Analysis
    output += `### Naming Convention Compliance\n\n`;
    
    const conventions = Object.entries(semanticAnalysis.insights.namingConventions)
      .sort(([, a], [, b]) => b - a);
    
    // Calculate total from all convention counts
    const totalConventionHeaders = Object.values(semanticAnalysis.insights.namingConventions)
      .reduce((sum, count) => sum + count, 0);
    
    for (const [convention, count] of conventions) {
      if (count > 0) {
        const percentage = Math.round((count / totalConventionHeaders) * 100);
        output += `- **${convention}**: ${count} headers (${percentage}%)\n`;
      }
    }
    output += `\n`;
    
    // Pattern Type Distribution
    output += `### Header Pattern Types\n\n`;
    
    const patternTypes = Object.entries(semanticAnalysis.insights.patternTypes)
      .sort(([, a], [, b]) => b - a);
    
    // Calculate total from all pattern type counts
    const totalPatternHeaders = Object.values(semanticAnalysis.insights.patternTypes)
      .reduce((sum, count) => sum + count, 0);
    
    for (const [type, count] of patternTypes) {
      if (count > 0) {
        const percentage = Math.round((count / totalPatternHeaders) * 100);
        output += `- **${type}**: ${count} headers (${percentage}%)\n`;
      }
    }
    output += `\n`;
    
    // Technology Stack Summary
    if (semanticAnalysis.technologyStack) {
      output += `### Technology Stack Summary\n\n`;
      
      if (semanticAnalysis.technologyStack.cdn && semanticAnalysis.technologyStack.cdn.length > 0) {
        output += `**CDN Services:** ${semanticAnalysis.technologyStack.cdn.join(', ')}\n\n`;
      }
      
      if (semanticAnalysis.technologyStack.cms) {
        output += `**CMS Platform:** ${semanticAnalysis.technologyStack.cms}\n\n`;
      }
      
      if (semanticAnalysis.technologyStack.framework) {
        output += `**Framework:** ${semanticAnalysis.technologyStack.framework}\n\n`;
      }
      
      if (semanticAnalysis.technologyStack.analytics && semanticAnalysis.technologyStack.analytics.length > 0) {
        output += `**Analytics Services:** ${semanticAnalysis.technologyStack.analytics.join(', ')}\n\n`;
      }
      
      if (semanticAnalysis.technologyStack.ecommerce) {
        output += `**E-commerce Platform:** ${semanticAnalysis.technologyStack.ecommerce}\n\n`;
      }
      
      if (semanticAnalysis.technologyStack.hosting) {
        output += `**Hosting Provider:** ${semanticAnalysis.technologyStack.hosting}\n\n`;
      }
      
      if (semanticAnalysis.technologyStack.security && semanticAnalysis.technologyStack.security.length > 0) {
        output += `**Security Services:** ${semanticAnalysis.technologyStack.security.join(', ')}\n\n`;
      }
      
      output += `**Stack Confidence:** ${Math.round(semanticAnalysis.technologyStack.confidence * 100)}%\n`;
      output += `*(Higher scores indicate more diverse technology usage across the dataset)*\n\n`;
    }
    
    // Vendor Statistics
    if (semanticAnalysis.vendorStats) {
      output += `### Vendor Analysis\n\n`;
      output += `- **Total Headers Analyzed**: ${semanticAnalysis.vendorStats.totalHeaders}\n`;
      output += `- **Headers with Vendor Detection**: ${semanticAnalysis.vendorStats.vendorHeaders}\n`;
      output += `- **Vendor Coverage**: ${Math.round(semanticAnalysis.vendorStats.vendorCoverage)}%\n\n`;
      
      if (semanticAnalysis.vendorStats.vendorDistribution.length > 0) {
        output += `**Top Vendors by Header Count:**\n`;
        for (const vendor of semanticAnalysis.vendorStats.vendorDistribution.slice(0, 8)) {
          output += `- ${vendor.vendor}: ${vendor.headerCount} headers (${Math.round(vendor.percentage)}%)\n`;
        }
        output += `\n`;
      }
    }
  }

  // Pattern Discovery Analysis
  if (patternDiscoveryAnalysis) {
    output += `\n## Pattern Discovery Analysis

**Discovered Patterns:** ${patternDiscoveryAnalysis.discoveredPatterns.length} patterns found

`;
    
    // Discovered Patterns
    if (patternDiscoveryAnalysis.discoveredPatterns.length > 0) {
      output += `### Discovered Header Patterns\n\n`;
      
      const topPatterns = patternDiscoveryAnalysis.discoveredPatterns
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 15);
      
      for (const pattern of topPatterns) {
        output += `#### ${pattern.pattern} (${pattern.type})\n`;
        output += `- **Frequency**: ${Math.round(pattern.frequency * 100)}% (${pattern.sites.length} sites)\n`;
        output += `- **Confidence**: ${Math.round(pattern.confidence * 100)}%\n`;
        output += `- **Examples**: ${(pattern.examples || []).slice(0, 3).join(', ')}\n`;
        
        if (pattern.potentialVendor) {
          output += `- **Potential Vendor**: ${pattern.potentialVendor}\n`;
        }
        
        if (pattern.cmsCorrelation) {
          const topCms = Object.entries(pattern.cmsCorrelation)
            .filter(([cms]) => cms !== 'Unknown')
            .sort(([, a], [, b]) => b - a)[0];
          if (topCms && topCms[1] > 0.5) {
            output += `- **CMS Correlation**: ${Math.round(topCms[1] * 100)}% ${topCms[0]}\n`;
          }
        }
        
        output += `\n`;
      }
    }
    
    // Emerging Vendors
    if (patternDiscoveryAnalysis.emergingVendors.length > 0) {
      output += `### Emerging Vendor Patterns\n\n`;
      
      for (const vendor of patternDiscoveryAnalysis.emergingVendors.slice(0, 8)) {
        output += `#### ${vendor.vendorName}\n`;
        output += `- **Patterns**: ${vendor.patterns.length} discovered\n`;
        output += `- **Sites**: ${vendor.sites.length} sites\n`;
        output += `- **Confidence**: ${Math.round(vendor.confidence * 100)}%\n`;
        output += `- **Naming Convention**: ${vendor.characteristics.namingConvention}\n`;
        
        if (vendor.characteristics.commonPrefixes.length > 0) {
          output += `- **Common Prefixes**: ${vendor.characteristics.commonPrefixes.join(', ')}\n`;
        }
        
        if (vendor.characteristics.semanticCategories.length > 0) {
          output += `- **Categories**: ${vendor.characteristics.semanticCategories.join(', ')}\n`;
        }
        
        output += `\n`;
      }
    }
    
    // Pattern Evolution
    if (patternDiscoveryAnalysis.patternEvolution.length > 0) {
      output += `### Pattern Evolution Trends\n\n`;
      
      for (const evolution of patternDiscoveryAnalysis.patternEvolution.slice(0, 10)) {
        output += `#### ${evolution.pattern}\n`;
        output += `- **Evolution Type**: ${evolution.evolutionType}\n`;
        output += `- **Confidence**: ${Math.round(evolution.confidence * 100)}%\n`;
        output += `- **Versions**: ${evolution.versions.length} tracked\n`;
        
        if (evolution.versions.length > 0) {
          const latestVersion = evolution.versions[evolution.versions.length - 1];
          output += `- **Latest Pattern**: ${latestVersion.pattern}\n`;
          output += `- **Latest Frequency**: ${Math.round(latestVersion.frequency * 100)}%\n`;
        }
        
        output += `\n`;
      }
    }
    
    // Semantic Anomalies
    if (patternDiscoveryAnalysis.semanticAnomalies.length > 0) {
      output += `### Semantic Anomalies\n\n`;
      output += `Headers with unexpected categorization patterns:\n\n`;
      
      const highConfidenceAnomalies = patternDiscoveryAnalysis.semanticAnomalies
        .filter(a => a.confidence > 0.6)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 12);
      
      for (const anomaly of highConfidenceAnomalies) {
        output += `- **${anomaly.headerName}**: Expected ${anomaly.expectedCategory}, got ${anomaly.actualCategory} `;
        output += `(${Math.round(anomaly.confidence * 100)}% confidence)\n`;
        output += `  - Reason: ${anomaly.reason}\n`;
        output += `  - Sites: ${anomaly.sites.slice(0, 3).join(', ')}\n`;
      }
      output += `\n`;
    }
    
    // Pattern Discovery Insights
    if (patternDiscoveryAnalysis.insights.length > 0) {
      output += `### Pattern Discovery Insights\n\n`;
      
      for (const insight of patternDiscoveryAnalysis.insights) {
        output += `- ${insight}\n`;
      }
      output += `\n`;
    }
    
    // Summary
    output += `### Pattern Discovery Summary\n\n`;
    output += `- **Total Patterns Discovered**: ${patternDiscoveryAnalysis.discoveredPatterns.length}\n`;
    output += `- **Emerging Vendors Detected**: ${patternDiscoveryAnalysis.emergingVendors.length}\n`;
    output += `- **Pattern Evolution Trends**: ${patternDiscoveryAnalysis.patternEvolution.length}\n`;
    output += `- **Semantic Anomalies**: ${patternDiscoveryAnalysis.semanticAnomalies.length}\n`;
    
    const prefixPatterns = patternDiscoveryAnalysis.discoveredPatterns.filter(p => p.type === 'prefix').length;
    const suffixPatterns = patternDiscoveryAnalysis.discoveredPatterns.filter(p => p.type === 'suffix').length;
    const containsPatterns = patternDiscoveryAnalysis.discoveredPatterns.filter(p => p.type === 'contains').length;
    const regexPatterns = patternDiscoveryAnalysis.discoveredPatterns.filter(p => p.type === 'regex').length;
    
    output += `- **Pattern Types**: ${prefixPatterns} prefix, ${suffixPatterns} suffix, ${containsPatterns} contains, ${regexPatterns} regex\n\n`;
  }

  return output;
}

/**
 * Format results as markdown with tables
 */
function formatAsMarkdown(result: FrequencyResult, options: FrequencyOptionsWithDefaults, biasAnalysisParam?: DatasetBiasAnalysis | null): string {
  const { metadata, headers, metaTags, scripts, recommendations, filteringReport, cooccurrenceAnalysis, patternDiscoveryAnalysis, semanticAnalysis } = result;
  
  // Use passed biasAnalysis parameter if available, otherwise fall back to result's biasAnalysis
  const biasAnalysis = biasAnalysisParam || result.biasAnalysis;
  // Debug removed - biasAnalysis parameter flow is working
  
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

  // Dataset Bias Analysis
  if (biasAnalysis) {
    output += `## Dataset Quality Assessment

### CMS Distribution

| CMS | Sites | Percentage |
|-----|-------|------------|
`;
    
    const sortedCMS = Object.entries(biasAnalysis.cmsDistribution)
      .sort(([, a], [, b]) => (b as any).count - (a as any).count);
      
    for (const [cms, data] of sortedCMS) {
      const distribution = data as { count: number; percentage: number; sites: string[] };
      output += `| ${cms} | ${distribution.count} | ${Math.round(distribution.percentage)}% |\n`;
    }
    
    output += `\n**Dataset Concentration Score:** ${Math.round(biasAnalysis.concentrationScore * 100)}%  
*(0% = perfectly balanced across platforms, 100% = single platform dominance)*\n\n`;
    
    if (biasAnalysis.biasWarnings.length > 0) {
      output += `### ⚠️ Dataset Quality Warnings
\n`;
      for (const warning of biasAnalysis.biasWarnings) {
        output += `- **${warning}**\n`;
      }
      output += `\n**Impact:** These warnings indicate potential bias in recommendations. Headers appearing frequently may be platform-specific rather than truly generic.\n\n`;
    }
  }

  // HTTP Headers as Table
  output += `## HTTP Headers

Total headers analyzed: **${Object.keys(headers).length}**

| Header | Frequency | Sites Using | Unique Values | Top Value | Top Value Usage | Page Distribution |
|--------|-----------|-------------|---------------|-----------|-----------------|-------------------|
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
    
    // Format page distribution
    let pageDistDisplay = 'N/A';
    if (data.pageDistribution) {
      const mainPercent = Math.round(data.pageDistribution.mainpage * 100);
      const robotsPercent = Math.round(data.pageDistribution.robots * 100);
      pageDistDisplay = `${mainPercent}% main, ${robotsPercent}% robots`;
    }
    
    output += `| \`${displayName}\` | ${frequencyPercent}% | ${data.occurrences}/${data.totalSites} | ${(data.values as any)?.totalUniqueValues || (data.values || []).length} | \`${topValueDisplay}\` | ${topValuePercent}% | ${pageDistDisplay} |\n`;
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

  // Debug Mode for Markdown
  if (options.debugCalculations && biasAnalysis) {
    output += `## 🔧 Calculation Debug Information

### P(CMS|header) Calculation Details

| Header | Sample Size | Platform Specificity | Top CMS Correlation | Confidence | Bias Warning |
|--------|-------------|---------------------|--------------------| -----------|--------------|
`;
    
    for (const [headerName, correlation] of biasAnalysis.headerCorrelations.entries()) {
      if (correlation.overallOccurrences >= 5) {
        const topCMS = Object.entries(correlation.cmsGivenHeader)
          .filter(([cms]) => !['Unknown', 'Enterprise', 'CDN'].includes(cms))
          .sort(([, a], [, b]) => b.probability - a.probability)[0];
        
        let topCMSDisplay = 'None';
        if (topCMS && topCMS[1].probability > 0.05) {
          topCMSDisplay = `${topCMS[1].count}/${correlation.overallOccurrences} = ${(topCMS[1].probability * 100).toFixed(1)}% ${topCMS[0]}`;
        }
        
        const biasWarningDisplay = correlation.biasWarning || 'None';
        
        output += `| \`${headerName}\` | ${correlation.overallOccurrences} sites | ${(correlation.platformSpecificity * 100).toFixed(1)}% | ${topCMSDisplay} | ${correlation.recommendationConfidence} | ${biasWarningDisplay} |\n`;
      }
    }
    
    output += `\n### Statistical Thresholds\n\n`;
    output += `- **Minimum Sample Size for Strict Scoring**: 30 sites\n`;
    output += `- **Minimum CMS Concentration**: 40%\n`;
    output += `- **Platform Specificity Calculation**: Two-tier algorithm\n`;
    output += `- **Correlation Metric**: P(CMS|header) instead of P(header|CMS)\n\n`;
    output += `---\n\n`;
  }

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

| Header | Frequency | Sites Using | Unique Values | Top Value | Page Distribution | Recommendation |
|--------|-----------|-------------|---------------|-----------|------------------|----------------|
`;
    for (const rec of recommendations.learn.recommendToFilter) {
      const headerData = headers[rec.pattern];
      const freqPercent = headerData ? Math.round(headerData.frequency * 100) : Math.round(rec.frequency * 100);
      
      if (headerData) {
        const topValue = headerData.values[0];
        const topValueDisplay = topValue ? escapeMarkdownTableCell(topValue.value) : 'N/A';
        
        let pageDistDisplay = 'N/A';
        if (headerData.pageDistribution) {
          const mainPercent = Math.round(headerData.pageDistribution.mainpage * 100);
          const robotsPercent = Math.round(headerData.pageDistribution.robots * 100);
          pageDistDisplay = `${mainPercent}% main, ${robotsPercent}% robots`;
        }
        
        output += `| \`${rec.pattern}\` | ${freqPercent}% | ${headerData.occurrences}/${headerData.totalSites} | ${rec.diversity} | \`${topValueDisplay}\` | ${pageDistDisplay} | ${rec.reason} |\n`;
      } else {
        output += `| \`${rec.pattern}\` | ${freqPercent}% | N/A | ${rec.diversity} | N/A | N/A | ${rec.reason} |\n`;
      }
    }

    output += `

#### Recommend to Keep:

| Header | Frequency | Sites Using | CMS Correlation | Platform Specificity | Confidence | Recommendation |
|--------|-----------|-------------|-----------------|---------------------|------------|----------------|
`;
    for (const rec of recommendations.learn.recommendToKeep) {
      const headerData = headers[rec.pattern];
      const freqPercent = headerData ? Math.round(headerData.frequency * 100) : Math.round(rec.frequency * 100);
      
      // Calculate transparency columns consistently using bias detector data when available
      let cmsCorrelationDisplay = 'N/A';
      let platformSpecificityDisplay = 'N/A';
      let confidenceDisplay = 'Unknown';
      let sitesUsingDisplay = 'N/A';
      
      if (biasAnalysis && biasAnalysis.headerCorrelations && biasAnalysis.headerCorrelations.has(rec.pattern)) {
        const correlation = biasAnalysis.headerCorrelations.get(rec.pattern)!;
        
        // Use bias detector data for Sites Using column (consistent with CMS Correlation)
        const totalSites = headerData?.totalSites || 4569; // Use header data total or fallback
        sitesUsingDisplay = `${correlation.overallOccurrences}/${totalSites}`;
        
        // Show top CMS correlation with calculation
        const topCMS = Object.entries(correlation.cmsGivenHeader)
          .filter(([cms]) => !['Unknown', 'Enterprise', 'CDN'].includes(cms))
          .sort(([, a], [, b]) => b.probability - a.probability)[0];
        
        if (topCMS && topCMS[1].probability > 0.05) {
          const cmsPercent = Math.round(topCMS[1].probability * 100);
          const cmsCount = topCMS[1].count;
          cmsCorrelationDisplay = `${cmsCount}/${correlation.overallOccurrences} = ${cmsPercent}% ${topCMS[0]}`;
        }
        
        // Platform specificity
        const specificityPercent = Math.round(correlation.platformSpecificity * 100);
        platformSpecificityDisplay = `${specificityPercent}%`;
        
        // Confidence level
        confidenceDisplay = correlation.recommendationConfidence;
      } else {
        // Fallback logic when bias analysis is not available
        // Use header pattern analysis to provide basic insights
        if (headerData) {
          sitesUsingDisplay = `${headerData.occurrences}/${headerData.totalSites}`;
          
          // Basic platform specificity based on header name patterns
          const headerName = rec.pattern.toLowerCase();
          if (headerName.includes('shopify') || headerName.includes('x-shopid')) {
            platformSpecificityDisplay = '~95%';
            cmsCorrelationDisplay = 'Shopify-specific';
            confidenceDisplay = 'High';
          } else if (headerName.includes('drupal') || headerName.includes('x-drupal')) {
            platformSpecificityDisplay = '~90%';
            cmsCorrelationDisplay = 'Drupal-specific';
            confidenceDisplay = 'High';
          } else if (headerName.includes('wp-') || headerName.includes('wordpress')) {
            platformSpecificityDisplay = '~85%';
            cmsCorrelationDisplay = 'WordPress-specific';
            confidenceDisplay = 'High';
          } else if (headerName.includes('vercel') || headerName.includes('x-vercel')) {
            platformSpecificityDisplay = '~95%';
            cmsCorrelationDisplay = 'Vercel-specific';
            confidenceDisplay = 'High';
          } else if (headerName.startsWith('d-')) {
            platformSpecificityDisplay = '~90%';
            cmsCorrelationDisplay = 'Duda-specific';
            confidenceDisplay = 'High';
          } else if (headerName.includes('cdn') || headerName.includes('cache')) {
            platformSpecificityDisplay = '~20%';
            cmsCorrelationDisplay = 'Infrastructure';
            confidenceDisplay = 'Medium';
          } else {
            // Calculate basic frequency-based specificity
            const frequency = headerData.frequency;
            if (frequency < 0.05) {
              platformSpecificityDisplay = '~80%';
              confidenceDisplay = 'Medium';
            } else if (frequency < 0.15) {
              platformSpecificityDisplay = '~60%';
              confidenceDisplay = 'Medium';
            } else {
              platformSpecificityDisplay = '~30%';
              confidenceDisplay = 'Low';
            }
          }
        }
      }
      
      output += `| \`${rec.pattern}\` | ${freqPercent}% | ${sitesUsingDisplay} | ${cmsCorrelationDisplay} | ${platformSpecificityDisplay} | ${confidenceDisplay} | ${rec.reason} |\n`;
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

  // Co-occurrence Analytics  
  if (cooccurrenceAnalysis) {
    output += `\n## Header Co-occurrence Analytics\n\n`;
    output += `**Technology Stack Signatures Discovered:** ${cooccurrenceAnalysis.technologySignatures.length}\n\n`;
    
    // Technology Stack Signatures Table
    if (cooccurrenceAnalysis.technologySignatures.length > 0) {
      output += `### Technology Stack Signatures\n\n`;
      output += `| Name | Vendor | Category | Required Headers | Sites | Confidence |\n`;
      output += `|------|--------|----------|------------------|-------|------------|\n`;
      
      for (const signature of cooccurrenceAnalysis.technologySignatures.slice(0, 10)) {
        const headers = signature.requiredHeaders.length > 3 
          ? signature.requiredHeaders.slice(0, 3).join(', ') + `... (${signature.requiredHeaders.length} total)`
          : signature.requiredHeaders.join(', ');
        
        output += `| ${signature.name} | ${signature.vendor} | ${signature.category} | `;
        output += `${headers} | ${signature.sites.length} | `;
        output += `${Math.round(signature.confidence * 100)}% |\n`;
      }
      output += `\n`;
    }
    
    // High Correlation Pairs Table
    const highCorrelationPairs = cooccurrenceAnalysis.cooccurrences
      .filter((h: HeaderCooccurrence) => h.mutualInformation > 0.3)
      .sort((a: HeaderCooccurrence, b: HeaderCooccurrence) => b.mutualInformation - a.mutualInformation)
      .slice(0, 15);
    
    if (highCorrelationPairs.length > 0) {
      output += `### High Correlation Header Pairs\n\n`;
      output += `Headers with strong co-occurrence patterns (Mutual Information > 0.3):\n\n`;
      output += `| Header 1 | Header 2 | Co-occurrences | Frequency | Mutual Info |\n`;
      output += `|----------|----------|----------------|-----------|-------------|\n`;
      
      for (const pair of highCorrelationPairs) {
        output += `| ${pair.header1} | ${pair.header2} | `;
        output += `${pair.cooccurrenceCount} | ${Math.round(pair.cooccurrenceFrequency * 100)}% | `;
        output += `${pair.mutualInformation.toFixed(3)} |\n`;
      }
      output += `\n`;
    }
    
    // Platform Combinations Table
    if (cooccurrenceAnalysis.platformCombinations.length > 0) {
      output += `### Platform-Specific Header Combinations\n\n`;
      output += `| Platform | Header Combination | Frequency | Strength |\n`;
      output += `|----------|-------------------|-----------|----------|\n`;
      
      const topCombinations = cooccurrenceAnalysis.platformCombinations
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 12);
      
      for (const combo of topCombinations) {
        const headers = combo.headerGroup.length > 2 
          ? combo.headerGroup.slice(0, 2).join(' + ') + `... (${combo.headerGroup.length})`
          : combo.headerGroup.join(' + ');
          
        output += `| ${combo.platform} | ${headers} | `;
        output += `${Math.round(combo.frequency * 100)}% | `;
        output += `${combo.strength.toFixed(3)} |\n`;
      }
      output += `\n`;
    }
    
    // Mutual Exclusivity Table
    const exclusivePairs = cooccurrenceAnalysis.cooccurrences
      .filter((h: HeaderCooccurrence) => h.cooccurrenceCount === 0 && h.cooccurrenceFrequency === 0)
      .sort((a: HeaderCooccurrence, b: HeaderCooccurrence) => (b.conditionalProbability + a.conditionalProbability) - (a.conditionalProbability + b.conditionalProbability))
      .slice(0, 8);
    
    if (exclusivePairs.length > 0) {
      output += `### Mutually Exclusive Header Patterns\n\n`;
      output += `Headers that never appear together (potential platform isolation):\n\n`;
      output += `| Header 1 | Header 2 | Header 1 Freq | Header 2 Freq | Overlap |\n`;
      output += `|----------|----------|---------------|---------------|----------|\n`;
      
      for (const pair of exclusivePairs) {
        output += `| ${pair.header1} | ${pair.header2} | `;
        output += `N/A | N/A | 0 sites |\n`;
      }
      output += `\n`;
    }
    
    // Summary Statistics
    output += `### Co-occurrence Analysis Summary\n\n`;
    output += `| Metric | Count |\n`;
    output += `|--------|-------|\n`;
    output += `| Total Header Pairs Analyzed | ${cooccurrenceAnalysis.cooccurrences.length} |\n`;
    output += `| Technology Stacks Identified | ${cooccurrenceAnalysis.technologySignatures.length} |\n`;
    output += `| Platform Combinations | ${cooccurrenceAnalysis.platformCombinations.length} |\n`;
    output += `| High Correlation Pairs (MI > 0.3) | ${highCorrelationPairs.length} |\n`;
    output += `| Mutually Exclusive Pairs | ${exclusivePairs.length} |\n`;
    output += `\n`;
  }

  // Semantic Analysis Insights
  if (semanticAnalysis) {
    output += `\n## Semantic Header Analysis\n\n`;
    output += `**Headers Analyzed:** ${semanticAnalysis.headerAnalyses.size} headers with semantic classification\n\n`;
    
    // Category Distribution Table
    output += `### Header Category Distribution\n\n`;
    output += `| Category | Headers | Percentage |\n`;
    output += `|----------|---------|------------|\n`;
    
    const sortedCategories = semanticAnalysis.insights.topCategories
      .sort((a, b) => b.count - a.count);
    
    for (const category of sortedCategories) {
      if (category.count > 0) {
        output += `| **${category.category}** | ${category.count} | ${Math.round(category.percentage)}% |\n`;
      }
    }
    output += `\n`;
    
    // Vendor Distribution Table
    if (semanticAnalysis.insights.topVendors.length > 0) {
      output += `### Technology Vendor Distribution\n\n`;
      output += `| Vendor | Headers | Percentage |\n`;
      output += `|--------|---------|------------|\n`;
      
      const topVendors = semanticAnalysis.insights.topVendors
        .filter(v => v.count > 1) // Only show vendors with multiple headers
        .slice(0, 20);
      
      for (const vendor of topVendors) {
        output += `| **${vendor.vendor}** | ${vendor.count} | ${Math.round(vendor.percentage)}% |\n`;
      }
      output += `\n`;
    }
    
    // Naming Convention Table
    output += `### Naming Convention Compliance\n\n`;
    output += `| Convention | Headers | Percentage |\n`;
    output += `|------------|---------|------------|\n`;
    
    const conventions = Object.entries(semanticAnalysis.insights.namingConventions)
      .sort(([, a], [, b]) => b - a);
    
    // Calculate total from all convention counts
    const totalConventionHeaders = Object.values(semanticAnalysis.insights.namingConventions)
      .reduce((sum, count) => sum + count, 0);
    
    for (const [convention, count] of conventions) {
      if (count > 0) {
        const percentage = Math.round((count / totalConventionHeaders) * 100);
        output += `| **${convention}** | ${count} | ${percentage}% |\n`;
      }
    }
    output += `\n`;
    
    // Pattern Type Table
    output += `### Header Pattern Types\n\n`;
    output += `| Pattern Type | Headers | Percentage |\n`;
    output += `|--------------|---------|------------|\n`;
    
    const patternTypes = Object.entries(semanticAnalysis.insights.patternTypes)
      .sort(([, a], [, b]) => b - a);
    
    // Calculate total from all pattern type counts
    const totalPatternHeaders = Object.values(semanticAnalysis.insights.patternTypes)
      .reduce((sum, count) => sum + count, 0);
    
    for (const [type, count] of patternTypes) {
      if (count > 0) {
        const percentage = Math.round((count / totalPatternHeaders) * 100);
        output += `| **${type}** | ${count} | ${percentage}% |\n`;
      }
    }
    output += `\n`;
    
    // Technology Stack Table
    if (semanticAnalysis.technologyStack) {
      output += `### Technology Stack Summary\n\n`;
      output += `| Technology Type | Technologies |\n`;
      output += `|-----------------|--------------|\n`;
      
      if (semanticAnalysis.technologyStack.cdn && semanticAnalysis.technologyStack.cdn.length > 0) {
        const cdns = semanticAnalysis.technologyStack.cdn.slice(0, 8).join(', ');
        const cdnDisplay = semanticAnalysis.technologyStack.cdn.length > 8
          ? `${cdns}... (+${semanticAnalysis.technologyStack.cdn.length - 8})`
          : cdns;
        output += `| **CDN Services** | ${cdnDisplay} |\n`;
      }
      
      if (semanticAnalysis.technologyStack.cms) {
        output += `| **CMS Platform** | ${semanticAnalysis.technologyStack.cms} |\n`;
      }
      
      if (semanticAnalysis.technologyStack.framework) {
        output += `| **Framework** | ${semanticAnalysis.technologyStack.framework} |\n`;
      }
      
      if (semanticAnalysis.technologyStack.analytics && semanticAnalysis.technologyStack.analytics.length > 0) {
        const analytics = semanticAnalysis.technologyStack.analytics.slice(0, 6).join(', ');
        const analyticsDisplay = semanticAnalysis.technologyStack.analytics.length > 6
          ? `${analytics}... (+${semanticAnalysis.technologyStack.analytics.length - 6})`
          : analytics;
        output += `| **Analytics Services** | ${analyticsDisplay} |\n`;
      }
      
      if (semanticAnalysis.technologyStack.ecommerce) {
        output += `| **E-commerce Platform** | ${semanticAnalysis.technologyStack.ecommerce} |\n`;
      }
      
      if (semanticAnalysis.technologyStack.hosting) {
        output += `| **Hosting Provider** | ${semanticAnalysis.technologyStack.hosting} |\n`;
      }
      
      if (semanticAnalysis.technologyStack.security && semanticAnalysis.technologyStack.security.length > 0) {
        output += `| **Security Services** | ${semanticAnalysis.technologyStack.security.join(', ')} |\n`;
      }
      
      output += `\n**Stack Confidence:** ${Math.round(semanticAnalysis.technologyStack.confidence * 100)}%  \n`;
      output += `*(Higher scores indicate more diverse technology usage across the dataset)*\n\n`;
    }
    
    // Vendor Statistics Table
    if (semanticAnalysis.vendorStats) {
      output += `### Vendor Analysis Statistics\n\n`;
      output += `| Metric | Value |\n`;
      output += `|--------|-------|\n`;
      output += `| Total Headers Analyzed | ${semanticAnalysis.vendorStats.totalHeaders} |\n`;
      output += `| Headers with Vendor Detection | ${semanticAnalysis.vendorStats.vendorHeaders} |\n`;
      output += `| Vendor Coverage | ${Math.round(semanticAnalysis.vendorStats.vendorCoverage)}% |\n`;
      output += `\n`;
      
      if (semanticAnalysis.vendorStats.vendorDistribution.length > 0) {
        output += `#### Top Vendors by Header Count\n\n`;
        output += `| Vendor | Header Count | Percentage |\n`;
        output += `|--------|--------------|------------|\n`;
        
        for (const vendor of semanticAnalysis.vendorStats.vendorDistribution.slice(0, 12)) {
          output += `| **${vendor.vendor}** | ${vendor.headerCount} | ${Math.round(vendor.percentage)}% |\n`;
        }
        output += `\n`;
      }
    }
  }

  // Pattern Discovery Analysis
  if (patternDiscoveryAnalysis) {
    output += `\n## Pattern Discovery Analysis\n\n`;
    output += `**Discovered Patterns:** ${patternDiscoveryAnalysis.discoveredPatterns.length} patterns found\n\n`;
    
    // Discovered Patterns Table
    if (patternDiscoveryAnalysis.discoveredPatterns.length > 0) {
      output += `### Discovered Header Patterns\n\n`;
      output += `| Pattern | Type | Frequency | Sites | Confidence | Examples | Potential Vendor |\n`;
      output += `|---------|------|-----------|-------|------------|----------|------------------|\n`;
      
      const topPatterns = patternDiscoveryAnalysis.discoveredPatterns
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 20);
      
      for (const pattern of topPatterns) {
        const examples = (pattern.examples || []).slice(0, 2).join(', ');
        const examplesDisplay = (pattern.examples || []).length > 2 ? `${examples}... (+${(pattern.examples || []).length - 2})` : examples;
        const vendor = pattern.potentialVendor || 'N/A';
        
        output += `| \`${pattern.pattern}\` | ${pattern.type} | `;
        output += `${Math.round(pattern.frequency * 100)}% | ${pattern.sites.length} | `;
        output += `${Math.round(pattern.confidence * 100)}% | ${escapeMarkdownTableCell(examplesDisplay)} | `;
        output += `${vendor} |\n`;
      }
      output += `\n`;
    }
    
    // Emerging Vendors Table
    if (patternDiscoveryAnalysis.emergingVendors.length > 0) {
      output += `### Emerging Vendor Patterns\n\n`;
      output += `| Vendor | Patterns | Sites | Confidence | Naming Convention | Common Prefixes |\n`;
      output += `|--------|----------|-------|------------|-------------------|-----------------|\n`;
      
      for (const vendor of patternDiscoveryAnalysis.emergingVendors.slice(0, 10)) {
        const prefixes = vendor.characteristics.commonPrefixes.slice(0, 3).join(', ');
        const prefixDisplay = vendor.characteristics.commonPrefixes.length > 3 
          ? `${prefixes}... (+${vendor.characteristics.commonPrefixes.length - 3})`
          : prefixes;
        
        output += `| **${vendor.vendorName}** | ${vendor.patterns.length} | `;
        output += `${vendor.sites.length} | ${Math.round(vendor.confidence * 100)}% | `;
        output += `${vendor.characteristics.namingConvention} | ${prefixDisplay} |\n`;
      }
      output += `\n`;
    }
    
    // Pattern Evolution Table
    if (patternDiscoveryAnalysis.patternEvolution.length > 0) {
      output += `### Pattern Evolution Trends\n\n`;
      output += `| Pattern | Evolution Type | Confidence | Versions | Latest Frequency |\n`;
      output += `|---------|----------------|------------|----------|------------------|\n`;
      
      for (const evolution of patternDiscoveryAnalysis.patternEvolution.slice(0, 12)) {
        const latestVersion = evolution.versions[evolution.versions.length - 1];
        const latestFreq = latestVersion ? Math.round(latestVersion.frequency * 100) + '%' : 'N/A';
        
        output += `| \`${evolution.pattern}\` | ${evolution.evolutionType} | `;
        output += `${Math.round(evolution.confidence * 100)}% | ${evolution.versions.length} | `;
        output += `${latestFreq} |\n`;
      }
      output += `\n`;
    }
    
    // Semantic Anomalies Table
    if (patternDiscoveryAnalysis.semanticAnomalies.length > 0) {
      output += `### Semantic Anomalies\n\n`;
      output += `Headers with unexpected categorization patterns:\n\n`;
      output += `| Header | Expected | Actual | Confidence | Reason |\n`;
      output += `|--------|----------|--------|------------|--------|\n`;
      
      const highConfidenceAnomalies = patternDiscoveryAnalysis.semanticAnomalies
        .filter(a => a.confidence > 0.6)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 15);
      
      for (const anomaly of highConfidenceAnomalies) {
        output += `| \`${anomaly.headerName}\` | ${anomaly.expectedCategory} | `;
        output += `${anomaly.actualCategory} | ${Math.round(anomaly.confidence * 100)}% | `;
        output += `${escapeMarkdownTableCell(anomaly.reason)} |\n`;
      }
      output += `\n`;
    }
    
    // Pattern Discovery Summary Table
    output += `### Pattern Discovery Summary\n\n`;
    output += `| Metric | Count |\n`;
    output += `|--------|-------|\n`;
    output += `| Total Patterns Discovered | ${patternDiscoveryAnalysis.discoveredPatterns.length} |\n`;
    output += `| Emerging Vendors Detected | ${patternDiscoveryAnalysis.emergingVendors.length} |\n`;
    output += `| Pattern Evolution Trends | ${patternDiscoveryAnalysis.patternEvolution.length} |\n`;
    output += `| Semantic Anomalies | ${patternDiscoveryAnalysis.semanticAnomalies.length} |\n`;
    
    const prefixPatterns = patternDiscoveryAnalysis.discoveredPatterns.filter(p => p.type === 'prefix').length;
    const suffixPatterns = patternDiscoveryAnalysis.discoveredPatterns.filter(p => p.type === 'suffix').length;
    const containsPatterns = patternDiscoveryAnalysis.discoveredPatterns.filter(p => p.type === 'contains').length;
    const regexPatterns = patternDiscoveryAnalysis.discoveredPatterns.filter(p => p.type === 'regex').length;
    
    output += `| Prefix Patterns | ${prefixPatterns} |\n`;
    output += `| Suffix Patterns | ${suffixPatterns} |\n`;
    output += `| Contains Patterns | ${containsPatterns} |\n`;
    output += `| Regex Patterns | ${regexPatterns} |\n`;
    output += `\n`;
    
    // Insights
    if (patternDiscoveryAnalysis.insights.length > 0) {
      output += `### Key Insights\n\n`;
      
      for (const insight of patternDiscoveryAnalysis.insights) {
        output += `- ${insight}\n`;
      }
      output += `\n`;
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

  // Map script patterns to classifications
  const scriptClassificationMap: Record<string, string> = {
    'inline-script': 'inline',
    'google-analytics': 'tracking',
    'facebook-pixel': 'tracking',
    'cdn-usage': 'domain',
    'jquery': 'library',
    'jquery-inline': 'library',
    'wordpress-scripts': 'path',
    'bootstrap': 'library',
    'react': 'library'
  };

  // Group scripts by classification
  const groupedScripts = new Map<string, Array<[string, any]>>();
  
  for (const [pattern, data] of Object.entries(scripts)) {
    const classification = scriptClassificationMap[pattern] || 'other';
    if (!groupedScripts.has(classification)) {
      groupedScripts.set(classification, []);
    }
    groupedScripts.get(classification)!.push([pattern, data]);
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
      const firstExample = (data.examples && data.examples[0]) ? formatScriptExample(data.examples[0]) : 'N/A';
      const patternDisplay = pattern; // Script patterns don't use prefixes
      
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
    for (const value of (data.values || [])) {
      // If headerName already ends with the value, use as-is, otherwise append value
      const pattern = headerName.endsWith(`:${value.value}`) ? headerName : `${headerName}:${value.value}`;
      csv += `Header,${escapeCSV(pattern)},${value.frequency},${value.occurrences},${data.totalSites},${escapeCSV((value.examples || []).join('; '))}\n`;
    }
  }
  
  // Meta Tags
  for (const [tagKey, data] of Object.entries(result.metaTags)) {
    for (const value of (data.values || [])) {
      csv += `MetaTag,${escapeCSV(`${tagKey}:${value.value}`)},${value.frequency},${value.occurrences},${data.totalSites},${escapeCSV((value.examples || []).join('; '))}\n`;
    }
  }
  
  // Scripts
  for (const [pattern, data] of Object.entries(result.scripts)) {
    csv += `Script,${escapeCSV(pattern)},${data.frequency},${data.occurrences},${data.totalSites},${escapeCSV((data.examples || []).join('; '))}\n`;
  }
  
  return csv;
}