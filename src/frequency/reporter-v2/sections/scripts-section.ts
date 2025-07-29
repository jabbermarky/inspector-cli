import { AnalysisResult, ScriptSpecificData } from '../../types/analyzer-interface.js';
import { getTopPatterns, getTopValue, getTotalOccurrences } from '../utils/pattern-utils.js';
import { formatFrequency, formatSiteCount, formatSubtitle, truncateString } from '../utils/formatting.js';
import { getTopValues } from '../utils/value-utils.js';
import { hasValidPatterns, getPatternCount, isMap } from '../utils/safe-map-utils.js';

/**
 * Format script value for markdown table cells
 * Handles pipe characters and line breaks to prevent table breakage
 */
function formatScriptValueForMarkdown(value: string): string {
  if (!value) return '';
  
  // Escape pipe characters that would break markdown tables
  let safeValue = value.replace(/\|/g, '\\|');
  
  // Handle line breaks: replace with HTML breaks using backtick interruption
  // Pattern: `code`<br/>`more code`
  safeValue = safeValue.replace(/\n/g, '`<br/>`');
  
  // Detect if this looks like HTML or has HTML tags
  const hasHtmlTags = /<[^>]+>/.test(value);
  
  // Detect if this looks like JavaScript (has common JS patterns)
  const hasJavaScript = /(\bfunction\b|\bvar\b|\blet\b|\bconst\b|\bif\b|\bfor\b|\breturn\b|=>|\{|\})/.test(value);
  
  // For table cells, use inline code with language hints
  if (hasHtmlTags) {
    return `\`${safeValue}\` (HTML)`;
  } else if (hasJavaScript) {
    return `\`${safeValue}\` (JS)`;
  } else {
    // For simple values or URLs, use single backticks
    return `\`${safeValue}\``;
  }
}

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
  const codeExamples: Array<{rank: number, pattern: string, value: string}> = [];
  
  topScripts.forEach(([name, pattern], index) => {
    const frequency = formatFrequency(pattern.frequency);
    const sites = pattern.siteCount || 0;
    const occurrences = getTotalOccurrences(pattern);
    const topValue = truncateString(getTopValue(pattern), 60);
    
    // For table: use inline code with language hints to avoid breaking table format
    const safeTopValue = topValue ? formatScriptValueForMarkdown(topValue) : '';
    
    lines.push(`| ${index + 1} | ${name} | ${frequency} | ${sites} | ${occurrences} | ${safeTopValue} |`);
    
    // Collect examples for detailed code blocks section
    if (topValue && topValue !== 'N/A') {
      codeExamples.push({rank: index + 1, pattern: name, value: topValue});
    }
  });
  
  // Add detailed code examples section with single backtick formatting
  if (codeExamples.length > 0) {
    lines.push('');
    lines.push('### Script Code Examples');
    lines.push('');
    
    codeExamples.forEach(({rank, pattern, value}) => {
      lines.push(`#### ${rank}. ${pattern}`);
      lines.push('');
      
      // Use single backticks with line break handling for consistency
      const safeValue = value.replace(/\|/g, '\\|').replace(/\n/g, '`<br/>`');
      
      // Detect language and add language hint
      const hasHtmlTags = /<[^>]+>/.test(value);
      const hasJavaScript = /(\bfunction\b|\bvar\b|\blet\b|\bconst\b|\bif\b|\bfor\b|\breturn\b|=>|\{|\})/.test(value);
      
      if (hasHtmlTags) {
        lines.push(`\`${safeValue}\` (HTML)`);
      } else if (hasJavaScript) {
        lines.push(`\`${safeValue}\` (JavaScript)`);
      } else {
        lines.push(`\`${safeValue}\``);
      }
      lines.push('');
    });
  }
  
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