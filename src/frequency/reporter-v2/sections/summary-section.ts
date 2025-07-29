import { FrequencySummary } from '../../types/analyzer-interface.js';
import { formatNumber, formatTitle } from '../utils/formatting.js';

export function formatForHuman(summary: FrequencySummary): string {
  if (!summary) return '';
  
  const lines: string[] = [];
  
  lines.push(formatTitle('FREQUENCY ANALYSIS RESULTS'));
  lines.push('');
  lines.push(`Analysis Date: ${new Date().toISOString()}`);
  lines.push(`Total Sites Analyzed: ${formatNumber(summary.totalSitesAnalyzed)}`);
  lines.push(`Total Patterns Found: ${formatNumber(summary.totalPatternsFound)}`);
  
  // Analysis date from the summary
  if (summary.analysisDate) {
    lines.push(`Analysis Date: ${summary.analysisDate}`);
  }
  
  return lines.join('\n');
}

export function formatForCSV(summary: FrequencySummary): string[] {
  if (!summary) return [];
  
  return [
    'Category,Value',
    `Analysis Date,${new Date().toISOString()}`,
    `Total Sites,${summary.totalSitesAnalyzed}`,
    `Total Data Points,${summary.totalPatternsFound}`
  ];
}

export function formatForMarkdown(summary: FrequencySummary): string {
  if (!summary) return '';
  
  const lines: string[] = [];
  
  lines.push('# Frequency Analysis Results');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Analysis Date**: ${new Date().toISOString()}`);
  lines.push(`- **Total Sites Analyzed**: ${formatNumber(summary.totalSitesAnalyzed)}`);
  lines.push(`- **Total Data Points**: ${formatNumber(summary.totalPatternsFound)}`);
  
  // Analysis date from the summary
  if (summary.analysisDate) {
    lines.push('');
    lines.push(`- **Analysis Date**: ${summary.analysisDate}`);
  }
  
  return lines.join('\n');
}