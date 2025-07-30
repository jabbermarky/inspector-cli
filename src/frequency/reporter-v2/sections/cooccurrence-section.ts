import type { AnalysisResult } from '../../types/analyzer-interface.js';
import type { CooccurrenceSpecificData } from '../../types/analyzer-interface.js';
import { formatFrequency, formatSiteCount, formatSubtitle, formatPercentage } from '../utils/formatting.js';
import { hasValidPatterns, isMap } from '../utils/safe-map-utils.js';

// Helper function for formatting percentage values that are already ratios (0-1)
function formatRatio(ratio: number): string {
  return formatFrequency(ratio);
}

export function formatForHuman(
  cooccurrence: AnalysisResult<CooccurrenceSpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!cooccurrence?.analyzerSpecific) return '';
  
  const data = cooccurrence.analyzerSpecific;
  const lines: string[] = [];
  
  lines.push(formatSubtitle('CO-OCCURRENCE ANALYSIS'));
  lines.push('');
  
  // Statistical summary
  if (data.statisticalSummary) {
    const summary = data.statisticalSummary;
    lines.push(`Header Pairs Analyzed: ${summary.totalHeaderPairs}`);
    lines.push(`Significant Co-occurrences: ${summary.significantCooccurrences}`);
    lines.push(`Average Mutual Information: ${summary.averageMutualInformation.toFixed(3)}`);
    lines.push(`Top Conditional Probability: ${formatRatio(summary.topConditionalProbability)}`);
    lines.push('');
  }
  
  // Technology stack signatures
  if (data.technologySignatures && isMap(data.technologySignatures) && data.technologySignatures.size > 0) {
    lines.push('Technology Stack Signatures:');
    
    const sortedSignatures = Array.from(data.technologySignatures.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, Math.min(maxItems, 10));
    
    sortedSignatures.forEach(sig => {
      lines.push(`  ${sig.name} (${sig.vendor}):`);
      lines.push(`    Category: ${sig.category}`);
      lines.push(`    Confidence: ${formatRatio(sig.confidence)}`);
      lines.push(`    Sites: ${sig.occurrenceCount}`);
      if (sig.requiredHeaders && sig.requiredHeaders.length > 0) {
        lines.push(`    Required Headers: ${sig.requiredHeaders.slice(0, 3).join(', ')}`);
      }
      if (sig.optionalHeaders && sig.optionalHeaders.length > 0) {
        lines.push(`    Optional Headers: ${sig.optionalHeaders.slice(0, 3).join(', ')}`);
      }
      lines.push('');
    });
  }
  
  // Platform-specific combinations
  if (data.platformCombinations && isMap(data.platformCombinations) && data.platformCombinations.size > 0) {
    lines.push('Platform-Specific Header Combinations:');
    
    const sortedCombinations = Array.from(data.platformCombinations.values())
      .sort((a, b) => b.strength - a.strength)
      .slice(0, Math.min(maxItems, 8));
    
    sortedCombinations.forEach(combo => {
      lines.push(`  ${combo.platform} (${combo.vendor}):`);
      lines.push(`    Headers: ${combo.headerGroup.slice(0, 4).join(', ')}`);
      lines.push(`    Frequency: ${formatRatio(combo.frequency)}`);
      lines.push(`    Exclusivity: ${formatRatio(combo.exclusivity)}`);
      lines.push(`    Statistical Strength: ${formatRatio(combo.strength)}`);
      lines.push(`    Sites: ${combo.sites.length}`);
      lines.push('');
    });
  }
  
  // Strong correlations
  if (data.strongCorrelations && data.strongCorrelations.length > 0) {
    lines.push('Strong Header Correlations:');
    
    const topCorrelations = data.strongCorrelations
      .sort((a, b) => b.mutualInformation - a.mutualInformation)
      .slice(0, Math.min(maxItems, 8));
    
    topCorrelations.forEach(corr => {
      lines.push(`  ${corr.header1} ↔ ${corr.header2}:`);
      lines.push(`    Co-occurrence: ${formatRatio(corr.cooccurrenceFrequency / 100)}`);
      lines.push(`    Conditional P(${corr.header2}|${corr.header1}): ${formatRatio(corr.conditionalProbability)}`);
      lines.push(`    Mutual Information: ${corr.mutualInformation.toFixed(3)}`);
      lines.push(`    Sites: ${corr.cooccurrenceCount}`);
      if (corr.vendor1 && corr.vendor2) {
        lines.push(`    Vendors: ${corr.vendor1} + ${corr.vendor2}`);
      }
      lines.push('');
    });
  }
  
  // Mutual exclusivity groups
  if (data.mutualExclusivityGroups && data.mutualExclusivityGroups.length > 0) {
    lines.push('Mutual Exclusivity Groups:');
    
    data.mutualExclusivityGroups
      .sort((a, b) => b.exclusivityScore - a.exclusivityScore)
      .slice(0, Math.min(maxItems, 5))
      .forEach(group => {
        lines.push(`  Headers: ${group.headers.join(', ')}`);
        lines.push(`    Exclusivity Score: ${formatRatio(group.exclusivityScore)}`);
        lines.push(`    Reasoning: ${group.reasoning}`);
        lines.push('');
      });
  }
  
  // Insights
  if (data.insights && data.insights.length > 0) {
    lines.push('Co-occurrence Insights:');
    data.insights.slice(0, 5).forEach(insight => {
      lines.push(`  • ${insight}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

export function formatForCSV(cooccurrence: AnalysisResult<CooccurrenceSpecificData> | null | undefined): string[] {
  if (!cooccurrence?.analyzerSpecific) return [];
  
  const data = cooccurrence.analyzerSpecific;
  const rows: string[] = [];
  
  // Technology signatures
  if (data.technologySignatures && isMap(data.technologySignatures)) {
    rows.push('Technology,Vendor,Category,Confidence,Sites,Required Headers,Optional Headers');
    
    for (const sig of data.technologySignatures.values()) {
      const requiredHeaders = sig.requiredHeaders ? sig.requiredHeaders.join(';') : '';
      const optionalHeaders = sig.optionalHeaders ? sig.optionalHeaders.join(';') : '';
      rows.push(`"${sig.name}","${sig.vendor}","${sig.category}",${sig.confidence},${sig.occurrenceCount},"${requiredHeaders}","${optionalHeaders}"`);
    }
    
    rows.push(''); // Section separator
  }
  
  // Strong correlations
  if (data.strongCorrelations && data.strongCorrelations.length > 0) {
    rows.push('Header1,Header2,Cooccurrence Frequency,Conditional Probability,Mutual Information,Sites,Vendor1,Vendor2');
    
    data.strongCorrelations.forEach(corr => {
      const vendor1 = corr.vendor1 || '';
      const vendor2 = corr.vendor2 || '';
      rows.push(`"${corr.header1}","${corr.header2}",${corr.cooccurrenceFrequency},${corr.conditionalProbability},${corr.mutualInformation},${corr.cooccurrenceCount},"${vendor1}","${vendor2}"`);
    });
  }
  
  return rows;
}

export function formatForMarkdown(
  cooccurrence: AnalysisResult<CooccurrenceSpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!cooccurrence?.analyzerSpecific) return '';
  
  const data = cooccurrence.analyzerSpecific;
  const lines: string[] = [];
  
  lines.push(`## Co-occurrence Analysis`);
  lines.push('');
  
  // Statistical summary
  if (data.statisticalSummary) {
    const summary = data.statisticalSummary;
    lines.push('### Analysis Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Header Pairs Analyzed | ${summary.totalHeaderPairs} |`);
    lines.push(`| Significant Co-occurrences | ${summary.significantCooccurrences} |`);
    lines.push(`| Average Mutual Information | ${summary.averageMutualInformation.toFixed(3)} |`);
    lines.push(`| Top Conditional Probability | ${formatRatio(summary.topConditionalProbability)} |`);
    lines.push('');
  }
  
  // Technology stack signatures
  if (data.technologySignatures && isMap(data.technologySignatures) && data.technologySignatures.size > 0) {
    lines.push('### Technology Stack Signatures');
    lines.push('');
    lines.push('| Technology | Vendor | Category | Confidence | Sites | Required Headers |');
    lines.push('|------------|--------|----------|------------|-------|------------------|');
    
    const sortedSignatures = Array.from(data.technologySignatures.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, Math.min(maxItems, 10));
    
    sortedSignatures.forEach(sig => {
      const requiredHeaders = sig.requiredHeaders ? sig.requiredHeaders.slice(0, 3).join(', ') : 'None';
      lines.push(`| ${sig.name} | ${sig.vendor} | ${sig.category} | ${formatRatio(sig.confidence)} | ${sig.occurrenceCount} | \`${requiredHeaders}\` |`);
    });
    lines.push('');
  }
  
  // Strong correlations
  if (data.strongCorrelations && data.strongCorrelations.length > 0) {
    lines.push('### Strong Header Correlations');
    lines.push('');
    lines.push('| Header 1 | Header 2 | Co-occurrence | Conditional P | Mutual Info | Sites |');
    lines.push('|----------|----------|---------------|---------------|-------------|-------|');
    
    const topCorrelations = data.strongCorrelations
      .sort((a, b) => b.mutualInformation - a.mutualInformation)
      .slice(0, Math.min(maxItems, 8));
    
    topCorrelations.forEach(corr => {
      lines.push(`| \`${corr.header1}\` | \`${corr.header2}\` | ${formatRatio(corr.cooccurrenceFrequency / 100)} | ${formatRatio(corr.conditionalProbability)} | ${corr.mutualInformation.toFixed(3)} | ${corr.cooccurrenceCount} |`);
    });
    lines.push('');
  }
  
  // Platform combinations
  if (data.platformCombinations && isMap(data.platformCombinations) && data.platformCombinations.size > 0) {
    lines.push('### Platform-Specific Header Combinations');
    lines.push('');
    lines.push('| Platform | Vendor | Frequency | Exclusivity | Strength | Headers |');
    lines.push('|----------|--------|-----------|-------------|----------|---------|');
    
    const sortedCombinations = Array.from(data.platformCombinations.values())
      .sort((a, b) => b.strength - a.strength)
      .slice(0, Math.min(maxItems, 8));
    
    sortedCombinations.forEach(combo => {
      const headers = combo.headerGroup.slice(0, 3).join(', ');
      lines.push(`| ${combo.platform} | ${combo.vendor} | ${formatRatio(combo.frequency)} | ${formatRatio(combo.exclusivity)} | ${formatRatio(combo.strength)} | \`${headers}\` |`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

export function formatForJSON(cooccurrence: AnalysisResult<CooccurrenceSpecificData> | null | undefined): any {
  if (!cooccurrence?.analyzerSpecific) return null;
  
  const data = cooccurrence.analyzerSpecific;
  
  // Convert Maps to objects for JSON serialization
  const cooccurrencesObj: Record<string, any> = {};
  if (data.cooccurrences && isMap(data.cooccurrences)) {
    for (const [key, value] of data.cooccurrences.entries()) {
      cooccurrencesObj[key] = value;
    }
  }
  
  const technologySignaturesObj: Record<string, any> = {};
  if (data.technologySignatures && isMap(data.technologySignatures)) {
    for (const [key, value] of data.technologySignatures.entries()) {
      technologySignaturesObj[key] = {
        ...value,
        sites: Array.from(value.sites || []) // Convert Set to Array if needed
      };
    }
  }
  
  const platformCombinationsObj: Record<string, any> = {};
  if (data.platformCombinations && isMap(data.platformCombinations)) {
    for (const [key, value] of data.platformCombinations.entries()) {
      platformCombinationsObj[key] = {
        ...value,
        sites: Array.from(value.sites || []) // Convert Set to Array if needed
      };
    }
  }
  
  return {
    cooccurrences: cooccurrencesObj,
    technologySignatures: technologySignaturesObj,
    platformCombinations: platformCombinationsObj,
    mutualExclusivityGroups: data.mutualExclusivityGroups,
    strongCorrelations: data.strongCorrelations,
    insights: data.insights,
    statisticalSummary: data.statisticalSummary,
    totalSites: cooccurrence.totalSites
  };
}