/**
 * Technology Categorization Section - NEW ENHANCEMENT
 * 
 * Showcases VendorAnalyzerV2's technology categories and vendor relationship analysis
 * Provides detailed insights into technology stack composition and vendor distribution
 */

import type { AnalysisResult } from '../../types/analyzer-interface.js';
import type { VendorSpecificData } from '../../analyzers/vendor-analyzer-v2.js';
import { formatFrequency, formatSubtitle } from '../utils/formatting.js';

// Helper function for formatting percentage values that are already ratios (0-1)
function formatRatio(ratio: number): string {
  return formatFrequency(ratio);
}

export function formatForHuman(
  vendor: AnalysisResult<VendorSpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!vendor?.analyzerSpecific?.vendorStats) return '';
  
  const data = vendor.analyzerSpecific;
  const stats = data.vendorStats;
  const lines: string[] = [];
  
  lines.push(formatSubtitle('TECHNOLOGY CATEGORIZATION'));
  lines.push('');
  
  // Overall vendor coverage metrics
  lines.push('Vendor Coverage Analysis:');
  lines.push(`  Total Headers Analyzed: ${stats.totalHeaders}`);
  lines.push(`  Vendor-Mapped Headers: ${stats.vendorHeaders}`);
  lines.push(`  Coverage Rate: ${formatFrequency(stats.vendorCoverage)}`);
  lines.push(`  Unmapped Headers: ${stats.totalHeaders - stats.vendorHeaders}`);
  lines.push('');
  
  // Technology category breakdown
  if (Object.keys(stats.categoryDistribution).length > 0) {
    lines.push('Technology Categories:');
    const sortedCategories = Object.entries(stats.categoryDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxItems);
    
    sortedCategories.forEach(([category, count]) => {
      const percentage = (count / stats.totalHeaders) * 100;
      const coverage = (count / stats.vendorHeaders) * 100;
      lines.push(`  ${category.toUpperCase()}:`);
      lines.push(`    Headers: ${count} (${percentage.toFixed(1)}% of all headers)`);
      lines.push(`    Coverage: ${coverage.toFixed(1)}% of vendor headers`);
      lines.push('');
    });
  }
  
  // Detailed vendor analysis
  if (stats.vendorDistribution.length > 0) {
    lines.push('Vendor Distribution Analysis:');
    const topVendors = stats.vendorDistribution
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, Math.min(maxItems, 12));
    
    topVendors.forEach(vendor => {
      lines.push(`  ${vendor.vendor} (${vendor.category.toUpperCase()}):`);
      lines.push(`    Headers: ${vendor.headerCount}`);
      lines.push(`    Market Share: ${formatFrequency(vendor.percentage / 100)}`);
      lines.push(`    Confidence: ${formatRatio(vendor.confidence)}`);
      lines.push(`    Key Headers: ${vendor.headers.slice(0, 3).join(', ')}`);
      
      // Show technology footprint
      const footprint = (vendor.headerCount / stats.vendorHeaders) * 100;
      lines.push(`    Technology Footprint: ${footprint.toFixed(1)}% of vendor ecosystem`);
      lines.push('');
    });
  }
  
  // Technology relationship analysis
  if (data.technologySignatures && data.technologySignatures.length > 0) {
    lines.push('Technology Relationship Patterns:');
    const topSignatures = data.technologySignatures
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
    
    topSignatures.forEach(signature => {
      lines.push(`  ${signature.name}:`);
      lines.push(`    Vendor: ${signature.vendor} (${signature.category})`);
      lines.push(`    Header Dependencies: ${signature.requiredHeaders.length} required`);
      lines.push(`    Pattern Strength: ${formatRatio(signature.confidence)}`);
      lines.push(`    Market Presence: ${signature.sites.length} sites`);
      
      if (signature.optionalHeaders.length > 0) {
        lines.push(`    Optional Headers: ${signature.optionalHeaders.slice(0, 2).join(', ')}`);
      }
      if (signature.conflictingHeaders.length > 0) {
        lines.push(`    Conflicts With: ${signature.conflictingHeaders.slice(0, 2).join(', ')}`);
      }
      lines.push('');
    });
  }
  
  // Technology ecosystem insights
  if (data.summary) {
    lines.push('Ecosystem Insights:');
    lines.push(`  Technology Diversity: ${data.summary.technologyCategories.length} categories detected`);
    lines.push(`  Vendor Ecosystem: ${data.summary.totalVendorsDetected} vendors identified`);
    lines.push(`  High-Confidence Detections: ${data.summary.highConfidenceVendors} vendors`);
    lines.push(`  Stack Complexity: ${data.summary.stackComplexity}`);
    
    // Calculate ecosystem diversity score
    const diversityScore = (data.summary.technologyCategories.length / 7) * 100; // 7 categories max
    lines.push(`  Ecosystem Diversity Score: ${Math.min(diversityScore, 100).toFixed(1)}%`);
    lines.push('');
  }
  
  return lines.join('\n');
}

export function formatForMarkdown(
  vendor: AnalysisResult<VendorSpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!vendor?.analyzerSpecific?.vendorStats) return '';
  
  const data = vendor.analyzerSpecific;
  const stats = data.vendorStats;
  const lines: string[] = [];
  
  lines.push(`## Technology Categorization`);
  lines.push('');
  lines.push('Comprehensive analysis of technology stack composition and vendor relationships.');
  lines.push('');
  
  // Coverage metrics table
  lines.push('### Vendor Coverage Analysis');
  lines.push('');
  lines.push('| Metric | Value | Percentage |');
  lines.push('|--------|-------|------------|');
  lines.push(`| Total Headers | ${stats.totalHeaders} | 100% |`);
  lines.push(`| Vendor-Mapped Headers | ${stats.vendorHeaders} | ${formatFrequency(stats.vendorCoverage)} |`);
  lines.push(`| Unmapped Headers | ${stats.totalHeaders - stats.vendorHeaders} | ${formatFrequency(1 - stats.vendorCoverage)} |`);
  lines.push('');
  
  // Technology categories
  if (Object.keys(stats.categoryDistribution).length > 0) {
    lines.push('### Technology Categories');
    lines.push('');
    lines.push('| Category | Headers | % of All Headers | % of Vendor Headers |');
    lines.push('|----------|---------|------------------|---------------------|');
    
    Object.entries(stats.categoryDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxItems)
      .forEach(([category, count]) => {
        const allPercentage = (count / stats.totalHeaders) * 100;
        const vendorPercentage = (count / stats.vendorHeaders) * 100;
        lines.push(`| **${category.toUpperCase()}** | ${count} | ${allPercentage.toFixed(1)}% | ${vendorPercentage.toFixed(1)}% |`);
      });
    lines.push('');
  }
  
  // Vendor distribution analysis
  if (stats.vendorDistribution.length > 0) {
    lines.push('### Vendor Distribution Analysis');
    lines.push('');
    lines.push('| Vendor | Category | Headers | Market Share | Confidence | Technology Footprint | Key Headers |');
    lines.push('|--------|----------|---------|--------------|------------|---------------------|-------------|');
    
    stats.vendorDistribution
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, Math.min(maxItems, 12))
      .forEach(vendor => {
        const footprint = (vendor.headerCount / stats.vendorHeaders) * 100;
        const keyHeaders = vendor.headers.slice(0, 2).join(', ');
        lines.push(`| **${vendor.vendor}** | ${vendor.category.toUpperCase()} | ${vendor.headerCount} | ${formatFrequency(vendor.percentage / 100)} | ${formatRatio(vendor.confidence)} | ${footprint.toFixed(1)}% | \`${keyHeaders}\` |`);
      });
    lines.push('');
  }
  
  // Technology signatures
  if (data.technologySignatures && data.technologySignatures.length > 0) {
    lines.push('### Technology Relationship Patterns');
    lines.push('');
    lines.push('Complex technology signatures that require multiple headers for identification:');
    lines.push('');
    lines.push('| Signature | Vendor | Category | Required Headers | Pattern Strength | Market Presence |');
    lines.push('|-----------|--------|----------|------------------|------------------|-----------------|');
    
    data.technologySignatures
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .forEach(signature => {
        const requiredHeaders = signature.requiredHeaders.join(', ');
        lines.push(`| **${signature.name}** | ${signature.vendor} | ${signature.category.toUpperCase()} | \`${requiredHeaders}\` | ${formatRatio(signature.confidence)} | ${signature.sites.length} sites |`);
      });
    lines.push('');
  }
  
  // Ecosystem insights
  if (data.summary) {
    lines.push('### Ecosystem Insights');
    lines.push('');
    const diversityScore = (data.summary.technologyCategories.length / 7) * 100;
    
    lines.push('| Insight | Value |');
    lines.push('|---------|-------|');
    lines.push(`| Technology Diversity | ${data.summary.technologyCategories.length} categories |`);
    lines.push(`| Vendor Ecosystem Size | ${data.summary.totalVendorsDetected} vendors |`);
    lines.push(`| High-Confidence Detections | ${data.summary.highConfidenceVendors} vendors |`);
    lines.push(`| Stack Complexity | ${data.summary.stackComplexity} |`);
    lines.push(`| Ecosystem Diversity Score | ${Math.min(diversityScore, 100).toFixed(1)}% |`);
    lines.push('');
  }
  
  return lines.join('\n');
}

export function formatForCSV(vendor: AnalysisResult<VendorSpecificData> | null | undefined): string[] {
  if (!vendor?.analyzerSpecific?.vendorStats) return [];
  
  const data = vendor.analyzerSpecific;
  const stats = data.vendorStats;
  const rows: string[] = [];
  
  // Coverage analysis
  rows.push('Section,Metric,Value,Percentage');
  rows.push(`"Coverage Analysis","Total Headers",${stats.totalHeaders},100%`);
  rows.push(`"Coverage Analysis","Vendor-Mapped Headers",${stats.vendorHeaders},"${formatFrequency(stats.vendorCoverage)}"`);
  rows.push(`"Coverage Analysis","Unmapped Headers",${stats.totalHeaders - stats.vendorHeaders},"${formatFrequency(1 - stats.vendorCoverage)}"`);
  
  // Category distribution
  rows.push(''); // Empty row separator
  rows.push('Section,Category,Headers,PercentageOfAll,PercentageOfVendor');
  Object.entries(stats.categoryDistribution)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      const allPercentage = (count / stats.totalHeaders) * 100;
      const vendorPercentage = (count / stats.vendorHeaders) * 100;
      rows.push(`"Technology Categories","${category}",${count},${allPercentage.toFixed(1)}%,${vendorPercentage.toFixed(1)}%`);
    });
  
  // Vendor distribution
  if (stats.vendorDistribution.length > 0) {
    rows.push(''); // Empty row separator
    rows.push('Section,Vendor,Category,Headers,MarketShare,Confidence,TechnologyFootprint,KeyHeaders');
    stats.vendorDistribution
      .sort((a, b) => b.confidence - a.confidence)
      .forEach(vendor => {
        const footprint = (vendor.headerCount / stats.vendorHeaders) * 100;
        const keyHeaders = vendor.headers.slice(0, 3).join('; ');
        rows.push(`"Vendor Distribution","${vendor.vendor}","${vendor.category}",${vendor.headerCount},"${formatFrequency(vendor.percentage / 100)}",${vendor.confidence},${footprint.toFixed(1)}%,"${keyHeaders}"`);
      });
  }
  
  return rows;
}

export function formatForJSON(vendor: AnalysisResult<VendorSpecificData> | null | undefined): Record<string, unknown> | null {
  if (!vendor?.analyzerSpecific?.vendorStats) return null;
  
  const data = vendor.analyzerSpecific;
  const stats = data.vendorStats;
  
  // Calculate additional insights
  const diversityScore = data.summary ? (data.summary.technologyCategories.length / 7) * 100 : 0;
  
  return {
    coverageAnalysis: {
      totalHeaders: stats.totalHeaders,
      vendorMappedHeaders: stats.vendorHeaders,
      unmappedHeaders: stats.totalHeaders - stats.vendorHeaders,
      coverageRate: stats.vendorCoverage
    },
    technologyCategories: Object.entries(stats.categoryDistribution)
      .sort(([,a], [,b]) => b - a)
      .map(([category, count]) => ({
        category,
        headers: count,
        percentageOfAll: (count / stats.totalHeaders) * 100,
        percentageOfVendor: (count / stats.vendorHeaders) * 100
      })),
    vendorDistribution: stats.vendorDistribution
      .sort((a, b) => b.confidence - a.confidence)
      .map(vendor => ({
        ...vendor,
        technologyFootprint: (vendor.headerCount / stats.vendorHeaders) * 100
      })),
    technologySignatures: data.technologySignatures ? 
      data.technologySignatures.map(signature => ({
        ...signature,
        sites: Array.from(signature.sites)
      })) : [],
    ecosystemInsights: data.summary ? {
      ...data.summary,
      ecosystemDiversityScore: Math.min(diversityScore, 100)
    } : null,
    totalSites: vendor.totalSites
  };
}