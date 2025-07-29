import { AnalysisResult, HeaderSpecificData } from '../../types/analyzer-interface.js';
import { getTopPatterns, getTopValue, getTotalOccurrences } from '../utils/pattern-utils.js';
import { formatFrequency, formatSiteCount, formatSubtitle, truncateString } from '../utils/formatting.js';
import { getTopValues, formatValueSummary } from '../utils/value-utils.js';
import { hasValidPatterns, getPatternCount, safePatternEntries } from '../utils/safe-map-utils.js';
import { calculateValidationScores, getValidationSummary, ValidationScore } from '../utils/validation-utils.js';

export function formatForHuman(
  headers: AnalysisResult<HeaderSpecificData> | null | undefined,
  maxItems: number = 20,
  includeValidation: boolean = false
): string {
  if (!hasValidPatterns(headers)) return '';
  
  const lines: string[] = [];
  
  lines.push(formatSubtitle(`HTTP HEADERS (${getPatternCount(headers)} patterns)`));
  lines.push('');
  
  // Add validation summary if enabled
  let validationScores: Map<string, ValidationScore> | undefined;
  if (includeValidation) {
    validationScores = calculateValidationScores(headers!.patterns, headers!.totalSites);
    const summary = getValidationSummary(validationScores);
    
    lines.push('VALIDATION SUMMARY:');
    lines.push(`  - Average confidence score: ${(summary.averageScore * 100).toFixed(1)}%`);
    lines.push(`  - High confidence: ${summary.highConfidence}/${summary.totalPatterns} patterns`);
    lines.push(`  - Medium confidence: ${summary.mediumConfidence}/${summary.totalPatterns} patterns`);
    lines.push(`  - Low confidence: ${summary.lowConfidence}/${summary.totalPatterns} patterns`);
    lines.push('');
  }
  
  const topHeaders = getTopPatterns(headers!.patterns, maxItems);
  
  topHeaders.forEach(([name, pattern], index) => {
    if (index > 0) lines.push(''); // Add spacing between headers
    
    lines.push(`${index + 1}. ${name.toUpperCase()}`);
    lines.push(`   Frequency: ${formatFrequency(pattern.frequency)}`);
    lines.push(`   Sites: ${formatSiteCount(pattern.siteCount || 0, headers!.totalSites)}`);
    lines.push(`   Total Occurrences: ${getTotalOccurrences(pattern)}`);
    
    // Add validation score if enabled
    if (includeValidation && validationScores) {
      const validation = validationScores.get(name);
      if (validation) {
        const confidenceEmoji = validation.confidence === 'high' ? '🟢' : 
                              validation.confidence === 'medium' ? '🟡' : '🔴';
        lines.push(`   Validation: ${confidenceEmoji} ${validation.confidence.toUpperCase()} confidence (${(validation.score * 100).toFixed(0)}%)`);
        lines.push(`   Recommendation: ${validation.recommendation}`);
      }
    }
    
    // Show top examples if available
    if (pattern.examples && pattern.examples.size > 0) {
      const topValues = getTopValues(pattern.examples, 3);
      if (topValues.length > 0) {
        lines.push('   Top Examples:');
        topValues.forEach(value => {
          const truncatedValue = truncateString(value.value, 60);
          lines.push(`     - ${truncatedValue}`);
        });
      }
    } else {
      lines.push(`   Most Common: ${getTopValue(pattern)}`);
    }
  });
  
  // Add metadata if available
  if (headers!.metadata?.analyzedAt) {
    lines.push('');
    lines.push(`Analyzed at: ${headers!.metadata.analyzedAt}`);
  }
  
  return lines.join('\n');
}

export function formatForCSV(headers: AnalysisResult<HeaderSpecificData> | null | undefined): string[] {
  if (!hasValidPatterns(headers)) return [];
  
  const rows: string[] = [];
  rows.push('Header,Frequency,Sites,Occurrences,Top Value');
  
  const sortedHeaders = getTopPatterns(headers!.patterns, 100);
  
  sortedHeaders.forEach(([name, pattern]) => {
    const frequency = (pattern.frequency * 100).toFixed(2);
    const sites = pattern.siteCount || 0;
    const occurrences = getTotalOccurrences(pattern);
    const topValue = getTopValue(pattern).replace(/,/g, ';'); // Escape commas
    
    rows.push(`${name},${frequency}%,${sites},${occurrences},"${topValue}"`);
  });
  
  return rows;
}

export function formatForMarkdown(
  headers: AnalysisResult<HeaderSpecificData> | null | undefined,
  maxItems: number = 20
): string {
  if (!hasValidPatterns(headers)) return '';
  
  const lines: string[] = [];
  
  lines.push(`## HTTP Headers (${getPatternCount(headers)} patterns)`);
  lines.push('');
  lines.push('| Rank | Header | Frequency | Sites | Occurrences | Top Value |');
  lines.push('|------|--------|-----------|-------|-------------|-----------|');
  
  const topHeaders = getTopPatterns(headers!.patterns, maxItems);
  
  topHeaders.forEach(([name, pattern], index) => {
    const frequency = formatFrequency(pattern.frequency);
    const sites = pattern.siteCount || 0;
    const occurrences = getTotalOccurrences(pattern);
    const topValue = truncateString(getTopValue(pattern), 40);
    
    lines.push(`| ${index + 1} | ${name} | ${frequency} | ${sites} | ${occurrences} | ${topValue} |`);
  });
  
  return lines.join('\n');
}