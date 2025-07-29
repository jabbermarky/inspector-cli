import { formatNumber, formatPercentage, formatSubtitle } from '../utils/formatting.js';

// Type for filtering stats from FrequencySummary (actual V2 data structure)
interface FilteringStats {
  sitesFilteredOut: number;
  filterReasons: Record<string, number>;
}

export function formatForHuman(stats: FilteringStats | undefined): string {
  if (!stats || stats.sitesFilteredOut === 0) return '';
  
  const lines: string[] = [];
  
  lines.push(formatSubtitle('DATA QUALITY & FILTERING'));
  lines.push('');
  
  // Overall stats
  lines.push(`Sites filtered out: ${formatNumber(stats.sitesFilteredOut)}`);
  lines.push('');
  
  // Filter reasons breakdown
  if (stats.filterReasons && Object.keys(stats.filterReasons).length > 0) {
    lines.push('Filter Reasons:');
    Object.entries(stats.filterReasons).forEach(([reason, count]) => {
      if (count > 0) {
        lines.push(`  - ${reason}: ${formatNumber(count)} sites`);
      }
    });
  }
  
  return lines.join('\n');
}

export function formatForCSV(stats: FilteringStats | undefined): string[] {
  if (!stats || stats.sitesFilteredOut === 0) return [];
  
  const rows: string[] = [];
  rows.push('Filter Metric,Value');
  rows.push(`Sites Filtered Out,${stats.sitesFilteredOut}`);
  
  // Add filter reasons
  Object.entries(stats.filterReasons).forEach(([reason, count]) => {
    if (count > 0) {
      rows.push(`${reason},${count}`);
    }
  });
  
  return rows;
}

export function formatForMarkdown(stats: FilteringStats | undefined): string {
  if (!stats || stats.sitesFilteredOut === 0) return '';
  
  const lines: string[] = [];
  
  lines.push('## Data Quality & Filtering');
  lines.push('');
  lines.push(`**Sites filtered out**: ${formatNumber(stats.sitesFilteredOut)}`);
  lines.push('');
  
  if (stats.filterReasons && Object.keys(stats.filterReasons).length > 0) {
    lines.push('### Filter Reasons');
    lines.push('');
    lines.push('| Reason | Sites Filtered |');
    lines.push('|--------|----------------|');
    
    Object.entries(stats.filterReasons).forEach(([reason, count]) => {
      if (count > 0) {
        lines.push(`| ${reason} | ${formatNumber(count)} |`);
      }
    });
  }
  
  return lines.join('\n');
}