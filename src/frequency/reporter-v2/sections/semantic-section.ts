import { AnalysisResult, SemanticSpecificData, CategoryDistribution, SemanticPattern, VendorSemanticData } from '../../types/analyzer-interface.js';
import { formatFrequency, formatSiteCount, formatSubtitle, formatPercentage } from '../utils/formatting.js';
import { hasValidPatterns, isMap } from '../utils/safe-map-utils.js';

// Helper function for formatting percentage values that are already ratios (0-1)
function formatRatio(ratio: number): string {
  return formatFrequency(ratio);
}

export function formatForHuman(
  semantic: AnalysisResult<SemanticSpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!semantic?.analyzerSpecific) return '';
  
  const data = semantic.analyzerSpecific;
  const lines: string[] = [];
  
  lines.push(formatSubtitle('SEMANTIC HEADER ANALYSIS'));
  lines.push('');
  
  // Overview metrics
  if (data.insights) {
    lines.push(`Headers Analyzed: ${data.insights.totalHeaders}`);
    lines.push(`Categorized: ${data.insights.categorizedHeaders} (${formatPercentage(data.insights.categorizedHeaders, data.insights.totalHeaders)})`);
    lines.push(`Uncategorized: ${data.insights.uncategorizedHeaders}`);
    lines.push(`High Confidence: ${data.insights.highConfidenceHeaders}`);
    lines.push(`Vendor Headers: ${data.insights.vendorHeaders}`);
    lines.push(`Custom Headers: ${data.insights.customHeaders}`);
    
    if (data.insights.mostCommonCategory) {
      lines.push(`Most Common Category: ${data.insights.mostCommonCategory}`);
    }
    lines.push('');
  }
  
  // Quality metrics
  if (data.qualityMetrics) {
    lines.push('Quality Metrics:');
    lines.push(`  Categorization Coverage: ${formatRatio(data.qualityMetrics.categorizationCoverage)}`);
    lines.push(`  Average Confidence: ${formatRatio(data.qualityMetrics.averageConfidence)}`);
    lines.push(`  Vendor Detection Rate: ${formatRatio(data.qualityMetrics.vendorDetectionRate)}`);
    lines.push(`  Custom Header Ratio: ${formatRatio(data.qualityMetrics.customHeaderRatio)}`);
    lines.push('');
  }
  
  // Category distribution
  if (data.categoryDistribution && isMap(data.categoryDistribution) && data.categoryDistribution.size > 0) {
    lines.push('Category Distribution:');
    const sortedCategories = Array.from(data.categoryDistribution.entries())
      .sort(([, a], [, b]) => b.headerCount - a.headerCount)
      .slice(0, maxItems);
    
    sortedCategories.forEach(([category, dist]) => {
      lines.push(`  ${category}:`);
      lines.push(`    Headers: ${dist.headerCount}`);
      lines.push(`    Sites: ${formatSiteCount(dist.siteCount, semantic.totalSites)}`);
      lines.push(`    Frequency: ${formatFrequency(dist.frequency)}`);
      lines.push(`    Avg Confidence: ${formatRatio(dist.averageConfidence)}`);
      
      if (dist.topHeaders && dist.topHeaders.length > 0) {
        lines.push(`    Top Headers: ${dist.topHeaders.slice(0, 3).join(', ')}`);
      }
      lines.push('');
    });
  }
  
  // Removed vendor detections - this should come from the dedicated vendor analyzer section
  
  // Security insights
  if (data.insights?.potentialSecurity && data.insights.potentialSecurity.length > 0) {
    lines.push('Security Headers Detected:');
    data.insights.potentialSecurity.slice(0, 10).forEach(header => {
      lines.push(`  - ${header}`);
    });
    lines.push('');
  }
  
  // Recommendations
  if (data.insights?.recommendations && data.insights.recommendations.length > 0) {
    lines.push('Semantic Analysis Recommendations:');
    data.insights.recommendations.slice(0, 5).forEach(rec => {
      lines.push(`  • ${rec}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

export function formatForCSV(semantic: AnalysisResult<SemanticSpecificData> | null | undefined): string[] {
  if (!semantic?.analyzerSpecific) return [];
  
  const data = semantic.analyzerSpecific;
  const rows: string[] = [];
  
  // Category distribution
  if (data.categoryDistribution && isMap(data.categoryDistribution)) {
    rows.push('Category,Headers,Sites,Frequency,Avg Confidence,Top Headers');
    
    const sortedCategories = Array.from(data.categoryDistribution.entries())
      .sort(([, a], [, b]) => b.headerCount - a.headerCount);
    
    sortedCategories.forEach(([category, dist]) => {
      const frequency = (dist.frequency * 100).toFixed(2);
      const confidence = (dist.averageConfidence * 100).toFixed(1);
      const topHeaders = dist.topHeaders ? dist.topHeaders.slice(0, 3).join(';') : '';
      
      rows.push(`"${category}",${dist.headerCount},${dist.siteCount},${frequency}%,${confidence}%,"${topHeaders}"`);
    });
  }
  
  return rows;
}

export function formatForMarkdown(
  semantic: AnalysisResult<SemanticSpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!semantic?.analyzerSpecific) return '';
  
  const data = semantic.analyzerSpecific;
  const lines: string[] = [];
  
  lines.push(`## Semantic Header Analysis`);
  lines.push('');
  
  // Overview metrics
  if (data.insights) {
    lines.push('### Analysis Overview');
    lines.push('');
    lines.push('| Metric | Count | Percentage |');
    lines.push('|--------|-------|------------|');
    lines.push(`| Total Headers | ${data.insights.totalHeaders} | 100% |`);
    lines.push(`| Categorized | ${data.insights.categorizedHeaders} | ${formatPercentage(data.insights.categorizedHeaders, data.insights.totalHeaders)} |`);
    lines.push(`| Uncategorized | ${data.insights.uncategorizedHeaders} | ${formatPercentage(data.insights.uncategorizedHeaders, data.insights.totalHeaders)} |`);
    lines.push(`| High Confidence | ${data.insights.highConfidenceHeaders} | ${formatPercentage(data.insights.highConfidenceHeaders, data.insights.totalHeaders)} |`);
    lines.push(`| Vendor Headers | ${data.insights.vendorHeaders} | ${formatPercentage(data.insights.vendorHeaders, data.insights.totalHeaders)} |`);
    lines.push(`| Custom Headers | ${data.insights.customHeaders} | ${formatPercentage(data.insights.customHeaders, data.insights.totalHeaders)} |`);
    lines.push('');
  }
  
  // Quality metrics
  if (data.qualityMetrics) {
    lines.push('### Quality Metrics');
    lines.push('');
    lines.push('| Metric | Score |');
    lines.push('|--------|-------|');
    lines.push(`| Categorization Coverage | ${formatRatio(data.qualityMetrics.categorizationCoverage)} |`);
    lines.push(`| Average Confidence | ${formatRatio(data.qualityMetrics.averageConfidence)} |`);
    lines.push(`| Vendor Detection Rate | ${formatRatio(data.qualityMetrics.vendorDetectionRate)} |`);
    lines.push(`| Custom Header Ratio | ${formatRatio(data.qualityMetrics.customHeaderRatio)} |`);
    lines.push('');
  }
  
  // Category distribution
  if (data.categoryDistribution && isMap(data.categoryDistribution) && data.categoryDistribution.size > 0) {
    lines.push('### Category Distribution');
    lines.push('');
    lines.push('| Category | Headers | Sites | Frequency | Avg Confidence | Top Headers |');
    lines.push('|----------|---------|-------|-----------|----------------|-------------|');
    
    const sortedCategories = Array.from(data.categoryDistribution.entries())
      .sort(([, a], [, b]) => b.headerCount - a.headerCount)
      .slice(0, maxItems);
    
    sortedCategories.forEach(([category, dist]) => {
      const topHeaders = dist.topHeaders ? dist.topHeaders.slice(0, 3).join(', ') : '';
      lines.push(`| ${category} | ${dist.headerCount} | ${formatSiteCount(dist.siteCount, semantic.totalSites)} | ${formatFrequency(dist.frequency)} | ${formatRatio(dist.averageConfidence)} | \`${topHeaders}\` |`);
    });
    lines.push('');
  }
  
  // Removed vendor detections - this should come from the dedicated vendor analyzer section
  
  // Security insights
  if (data.insights?.potentialSecurity && data.insights.potentialSecurity.length > 0) {
    lines.push('### Security Headers Detected');
    lines.push('');
    data.insights.potentialSecurity.slice(0, 10).forEach(header => {
      lines.push(`- \`${header}\``);
    });
    lines.push('');
  }
  
  // Recommendations
  if (data.insights?.recommendations && data.insights.recommendations.length > 0) {
    lines.push('### Recommendations');
    lines.push('');
    data.insights.recommendations.slice(0, 5).forEach(rec => {
      lines.push(`- ${rec}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

export function formatForJSON(semantic: AnalysisResult<SemanticSpecificData> | null | undefined): any {
  if (!semantic?.analyzerSpecific) return null;
  
  const data = semantic.analyzerSpecific;
  
  return {
    insights: data.insights,
    qualityMetrics: data.qualityMetrics,
    categoryDistribution: data.categoryDistribution ? 
      Object.fromEntries(Array.from(data.categoryDistribution.entries())) : {},
    vendorDetections: data.vendorDetections ? 
      Object.fromEntries(Array.from(data.vendorDetections.entries())) : {},
    headerPatterns: data.headerPatterns ? 
      Object.fromEntries(Array.from(data.headerPatterns.entries())) : {},
    totalPatterns: semantic.patterns?.size || 0,
    totalSites: semantic.totalSites
  };
}