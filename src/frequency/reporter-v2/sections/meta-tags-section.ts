import { AnalysisResult, MetaSpecificData } from '../../types/analyzer-interface.js';
import { getTopPatterns, getTopValue, getTotalOccurrences } from '../utils/pattern-utils.js';
import { formatFrequency, formatSiteCount, formatSubtitle, truncateString } from '../utils/formatting.js';
import { getTopValues } from '../utils/value-utils.js';
import { hasValidPatterns, getPatternCount } from '../utils/safe-map-utils.js';

export function formatForHuman(
  meta: AnalysisResult<MetaSpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!hasValidPatterns(meta)) return '';
  
  const lines: string[] = [];
  
  lines.push(formatSubtitle(`META TAGS (${getPatternCount(meta)} patterns)`));
  lines.push('');
  
  const topMeta = getTopPatterns(meta!.patterns, maxItems);
  
  topMeta.forEach(([name, pattern], index) => {
    if (index > 0) lines.push(''); // Add spacing between tags
    
    lines.push(`${index + 1}. ${name}`);
    lines.push(`   Frequency: ${formatFrequency(pattern.frequency)}`);
    lines.push(`   Sites: ${formatSiteCount(pattern.siteCount || 0, meta!.totalSites)}`);
    lines.push(`   Total Occurrences: ${getTotalOccurrences(pattern)}`);
    
    // Show top examples if available
    if (pattern.examples && pattern.examples.size > 0) {
      const topValues = getTopValues(pattern.examples, 3);
      if (topValues.length > 0) {
        lines.push('   Top Examples:');
        topValues.forEach(value => {
          const truncatedValue = truncateString(value.value, 80);
          lines.push(`     - ${truncatedValue}`);
        });
      }
    } else {
      const topValue = getTopValue(pattern);
      if (topValue !== 'N/A') {
        lines.push(`   Most Common: ${truncateString(topValue, 80)}`);
      }
    }
  });
  
  // Add metadata if available
  if (meta!.metadata?.analyzedAt) {
    lines.push('');
    lines.push(`Analyzed at: ${meta!.metadata.analyzedAt}`);
  }
  
  return lines.join('\n');
}

export function formatForCSV(meta: AnalysisResult<MetaSpecificData> | null | undefined): string[] {
  if (!hasValidPatterns(meta)) return [];
  
  const rows: string[] = [];
  rows.push('Meta Tag,Frequency,Sites,Occurrences,Top Value');
  
  const sortedMeta = getTopPatterns(meta!.patterns, 100);
  
  sortedMeta.forEach(([name, pattern]) => {
    const frequency = (pattern.frequency * 100).toFixed(2);
    const sites = pattern.siteCount || 0;
    const occurrences = getTotalOccurrences(pattern);
    const topValue = getTopValue(pattern).replace(/,/g, ';'); // Escape commas
    
    rows.push(`${name},${frequency}%,${sites},${occurrences},"${topValue}"`);
  });
  
  return rows;
}

export function formatForMarkdown(
  meta: AnalysisResult<MetaSpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!hasValidPatterns(meta)) return '';
  
  const lines: string[] = [];
  
  lines.push(`## Meta Tags (${getPatternCount(meta)} patterns)`);
  lines.push('');
  lines.push('| Rank | Meta Tag | Frequency | Sites | Occurrences | Top Value |');
  lines.push('|------|----------|-----------|-------|-------------|-----------|');
  
  const topMeta = getTopPatterns(meta!.patterns, maxItems);
  
  topMeta.forEach(([name, pattern], index) => {
    const frequency = formatFrequency(pattern.frequency);
    const sites = pattern.siteCount || 0;
    const occurrences = getTotalOccurrences(pattern);
    const topValue = truncateString(getTopValue(pattern), 50);
    
    lines.push(`| ${index + 1} | ${name} | ${frequency} | ${sites} | ${occurrences} | ${topValue} |`);
  });
  
  return lines.join('\n');
}