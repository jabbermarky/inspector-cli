import { formatNumber, formatPercentage, formatSubtitle } from '../utils/formatting.js';

// Type for filtering stats from FrequencySummary (actual V2 data structure)
interface FilteringStats {
  sitesFilteredOut?: number;
  filterReasons?: Record<string, number>;
  // Additional fields from test expectations
  sitesBeforeFiltering?: number;
  sitesAfterFiltering?: number;
  sitesFiltered?: number;
  reasonsForFiltering?: Record<string, number>;
}

export function formatForHuman(stats: FilteringStats | undefined): string {
  if (!stats) return '';
  
  // Check if any filtering occurred
  const sitesFiltered = stats.sitesFiltered || stats.sitesFilteredOut || 0;
  if (sitesFiltered === 0) return '';
  
  const lines: string[] = [];
  
  lines.push('DATA QUALITY FILTERING:');
  lines.push('');
  
  // Overall stats
  lines.push(`Sites filtered out: ${formatNumber(sitesFiltered)}`);
  
  // Show before/after if available
  if (stats.sitesBeforeFiltering && stats.sitesAfterFiltering) {
    lines.push(`Sites before filtering: ${formatNumber(stats.sitesBeforeFiltering)}`);
    lines.push(`Sites after filtering: ${formatNumber(stats.sitesAfterFiltering)}`);
  }
  
  lines.push('');
  
  // Filter reasons breakdown
  const reasons = stats.reasonsForFiltering || stats.filterReasons;
  if (reasons && Object.keys(reasons).length > 0) {
    lines.push('Filter Reasons:');
    
    // Sort by count (highest first) and filter out zero counts
    const sortedReasons = Object.entries(reasons)
      .filter(([_, count]) => count > 0)
      .sort(([_, a], [__, b]) => b - a);
    
    sortedReasons.forEach(([reason, count]) => {
      lines.push(`  ${reason}: ${formatNumber(count)} sites`);
    });
  }
  
  return lines.join('\n');
}

export function formatForCSV(stats: FilteringStats | undefined): string[] {
  if (!stats) return [];
  
  const sitesFiltered = stats.sitesFiltered || stats.sitesFilteredOut || 0;
  if (sitesFiltered === 0) return [];
  
  const rows: string[] = [];
  rows.push('FilteringStatistic,Value,TotalSites');
  rows.push(`SitesFiltered,${sitesFiltered},TotalAfterFiltering`);
  
  // Add before/after if available
  if (stats.sitesBeforeFiltering) {
    rows.push(`SitesBeforeFiltering,${stats.sitesBeforeFiltering},TotalBeforeFiltering`);
  }
  if (stats.sitesAfterFiltering) {
    rows.push(`SitesAfterFiltering,${stats.sitesAfterFiltering},TotalAfterFiltering`);
  }
  
  // Add filter reasons
  const reasons = stats.reasonsForFiltering || stats.filterReasons || {};
  const sortedReasons = Object.entries(reasons)
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a);
  
  sortedReasons.forEach(([reason, count]) => {
    // Escape quotes in reason if needed
    const escapedReason = reason.includes('"') ? `"${reason.replace(/"/g, '""')}"` : reason;
    rows.push(`${escapedReason},${count},FilterReason`);
  });
  
  return rows;
}

export function formatForMarkdown(stats: FilteringStats | undefined): string {
  if (!stats) return '';
  
  const sitesFiltered = stats.sitesFiltered || stats.sitesFilteredOut || 0;
  if (sitesFiltered === 0) return '';
  
  const lines: string[] = [];
  
  lines.push('## Data Quality Filtering');
  lines.push('');
  lines.push(`**Sites filtered out**: ${formatNumber(sitesFiltered)}`);
  
  if (stats.sitesBeforeFiltering && stats.sitesAfterFiltering) {
    lines.push(`**Sites before filtering**: ${formatNumber(stats.sitesBeforeFiltering)}`);
    lines.push(`**Sites after filtering**: ${formatNumber(stats.sitesAfterFiltering)}`);
  }
  
  lines.push('');
  
  const reasons = stats.reasonsForFiltering || stats.filterReasons;
  if (reasons && Object.keys(reasons).length > 0) {
    lines.push('### Filter Reasons');
    lines.push('');
    lines.push('| Reason | Sites Filtered |');
    lines.push('|--------|----------------|');
    
    const sortedReasons = Object.entries(reasons)
      .filter(([_, count]) => count > 0)
      .sort(([_, a], [__, b]) => b - a);
    
    sortedReasons.forEach(([reason, count]) => {
      lines.push(`| ${reason} | ${formatNumber(count)} |`);
    });
  }
  
  return lines.join('\n');
}