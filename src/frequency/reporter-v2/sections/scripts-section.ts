import { AnalysisResult, ScriptSpecificData } from '../../types/analyzer-interface.js';
import { getTopPatterns, getTopValue, getTotalOccurrences } from '../utils/pattern-utils.js';
import { formatFrequency, formatSiteCount, formatSubtitle, truncateString } from '../utils/formatting.js';
import { getTopValues } from '../utils/value-utils.js';
import { hasValidPatterns, getPatternCount, isMap } from '../utils/safe-map-utils.js';

export function formatForHuman(
  scripts: AnalysisResult<ScriptSpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!hasValidPatterns(scripts)) return '';
  
  const lines: string[] = [];
  
  lines.push(formatSubtitle(`SCRIPT PATTERNS (${getPatternCount(scripts)} patterns)`));
  lines.push('');
  
  const topScripts = getTopPatterns(scripts!.patterns, maxItems);
  
  topScripts.forEach(([name, pattern], index) => {
    if (index > 0) lines.push(''); // Add spacing between scripts
    
    lines.push(`${index + 1}. ${name}`);
    lines.push(`   Frequency: ${formatFrequency(pattern.frequency)}`);
    lines.push(`   Sites: ${formatSiteCount(pattern.siteCount || 0, scripts!.totalSites)}`);
    lines.push(`   Total Occurrences: ${getTotalOccurrences(pattern)}`);
    
    // Show top examples if available (e.g., script sources, content patterns)
    if (pattern.examples && pattern.examples.size > 0) {
      const topValues = getTopValues(pattern.examples, 2);
      if (topValues.length > 0) {
        lines.push('   Top Examples:');
        topValues.forEach(value => {
          const truncatedValue = truncateString(value.value, 100);
          lines.push(`     - ${truncatedValue}`);
        });
      }
    } else {
      const topValue = getTopValue(pattern);
      if (topValue !== 'N/A') {
        lines.push(`   Most Common: ${truncateString(topValue, 100)}`);
      }
    }
  });
  
  // Add script-specific insights if available
  if (scripts!.analyzerSpecific) {
    const scriptData = scripts!.analyzerSpecific;
    if (scriptData.cdnUsage && isMap(scriptData.cdnUsage) && scriptData.cdnUsage.size > 0) {
      lines.push('');
      lines.push('CDN Usage Summary:');
      const cdnEntries = Array.from(scriptData.cdnUsage.entries()).slice(0, 5);
      cdnEntries.forEach(([cdn, count]) => {
        lines.push(`  - ${cdn}: ${count} occurrences`);
      });
    }
  }
  
  // Add metadata if available
  if (scripts!.metadata?.analyzedAt) {
    lines.push('');
    lines.push(`Analyzed at: ${scripts!.metadata.analyzedAt}`);
  }
  
  return lines.join('\n');
}

export function formatForCSV(scripts: AnalysisResult<ScriptSpecificData> | null | undefined): string[] {
  if (!hasValidPatterns(scripts)) return [];
  
  const rows: string[] = [];
  rows.push('Script Pattern,Frequency,Sites,Occurrences,Top Source');
  
  const sortedScripts = getTopPatterns(scripts!.patterns, 100);
  
  sortedScripts.forEach(([name, pattern]) => {
    const frequency = (pattern.frequency * 100).toFixed(2);
    const sites = pattern.siteCount || 0;
    const occurrences = getTotalOccurrences(pattern);
    const topValue = getTopValue(pattern).replace(/,/g, ';'); // Escape commas
    
    rows.push(`${name},${frequency}%,${sites},${occurrences},"${topValue}"`);
  });
  
  return rows;
}

export function formatForMarkdown(
  scripts: AnalysisResult<ScriptSpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!hasValidPatterns(scripts)) return '';
  
  const lines: string[] = [];
  
  lines.push(`## Script Patterns (${getPatternCount(scripts)} patterns)`);
  lines.push('');
  lines.push('| Rank | Pattern | Frequency | Sites | Occurrences | Top Source |');
  lines.push('|------|---------|-----------|-------|-------------|------------|');
  
  const topScripts = getTopPatterns(scripts!.patterns, maxItems);
  
  topScripts.forEach(([name, pattern], index) => {
    const frequency = formatFrequency(pattern.frequency);
    const sites = pattern.siteCount || 0;
    const occurrences = getTotalOccurrences(pattern);
    const topValue = truncateString(getTopValue(pattern), 60);
    
    // Wrap script content in code blocks to prevent HTML/JS from breaking markdown
    const safeTopValue = topValue ? `\`${topValue}\`` : '';
    
    lines.push(`| ${index + 1} | ${name} | ${frequency} | ${sites} | ${occurrences} | ${safeTopValue} |`);
  });
  
  // Add script analysis summary if available
  if (scripts!.analyzerSpecific) {
    const scriptData = scripts!.analyzerSpecific;
    if (scriptData.cdnUsage && isMap(scriptData.cdnUsage) && scriptData.cdnUsage.size > 0) {
      lines.push('');
      lines.push('### CDN Usage Summary');
      lines.push('');
      lines.push('| CDN | Occurrences |');
      lines.push('|-----|-------------|');
      const cdnEntries = Array.from(scriptData.cdnUsage.entries()).slice(0, 10);
      cdnEntries.forEach(([cdn, count]) => {
        lines.push(`| ${cdn} | ${count} |`);
      });
    }
  }
  
  return lines.join('\n');
}