import type { AnalysisResult } from '../../types/analyzer-interface.js';
import type { VendorSpecificData } from '../../analyzers/vendor-analyzer-v2.js';
import { formatFrequency, formatSubtitle } from '../utils/formatting.js';
import { isMap } from '../utils/safe-map-utils.js';

// Helper function for formatting percentage values that are already ratios (0-1)
function formatRatio(ratio: number): string {
  return formatFrequency(ratio);
}

export function formatForHuman(
  vendor: AnalysisResult<VendorSpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!vendor?.analyzerSpecific) return '';
  
  const data = vendor.analyzerSpecific;
  const lines: string[] = [];
  
  lines.push(formatSubtitle('VENDOR ANALYSIS'));
  lines.push('');
  
  // Summary metrics
  if (data.summary) {
    lines.push(`Total Vendors Detected: ${data.summary.totalVendorsDetected}`);
    lines.push(`High Confidence Vendors: ${data.summary.highConfidenceVendors}`);
    lines.push(`Technology Categories: ${data.summary.technologyCategories.join(', ')}`);
    lines.push(`Stack Complexity: ${data.summary.stackComplexity}`);
    lines.push('');
  }
  
  // Vendor detections with proper categories and confidence
  if (data.vendorsByHeader && isMap(data.vendorsByHeader) && data.vendorsByHeader.size > 0) {
    lines.push('Vendor Detection Summary:');
    
    // Group by vendor name and aggregate data
    const vendorSummary = new Map<string, {
      vendor: string;
      category: string;
      confidence: number;
      headerCount: number;
      headers: string[];
      totalSites: number;
    }>();
    
    for (const [header, detection] of data.vendorsByHeader.entries()) {
      const vendorName = detection.vendor.name;
      const category = detection.vendor.category;
      
      if (!vendorSummary.has(vendorName)) {
        vendorSummary.set(vendorName, {
          vendor: vendorName,
          category,
          confidence: detection.confidence,
          headerCount: 0,
          headers: [],
          totalSites: detection.matchedSites.length
        });
      }
      
      const summary = vendorSummary.get(vendorName)!;
      summary.headerCount++;
      summary.headers.push(header);
      summary.confidence = Math.max(summary.confidence, detection.confidence);
    }
    
    // Sort by confidence and show top vendors
    const sortedVendors = Array.from(vendorSummary.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, Math.min(maxItems, 10));
    
    sortedVendors.forEach(vendorData => {
      lines.push(`  ${vendorData.vendor}:`);
      lines.push(`    Headers: ${vendorData.headerCount}`);
      lines.push(`    Confidence: ${formatRatio(vendorData.confidence)}`);
      lines.push(`    Category: ${vendorData.category}`);
      if (vendorData.headers.length > 0) {
        lines.push(`    Key Headers: ${vendorData.headers.slice(0, 3).join(', ')}`);
      }
      lines.push('');
    });
  }
  
  // Technology stack analysis
  if (data.technologyStack) {
    const stack = data.technologyStack;
    lines.push('Technology Stack:');
    if (stack.cms) lines.push(`  CMS: ${stack.cms}`);
    if (stack.ecommerce) lines.push(`  E-commerce: ${stack.ecommerce}`);
    if (stack.framework) lines.push(`  Framework: ${stack.framework}`);
    if (stack.hosting) lines.push(`  Hosting: ${stack.hosting}`);
    if (stack.cdn && stack.cdn.length > 0) lines.push(`  CDN: ${stack.cdn.join(', ')}`);
    if (stack.analytics && stack.analytics.length > 0) lines.push(`  Analytics: ${stack.analytics.join(', ')}`);
    if (stack.security && stack.security.length > 0) lines.push(`  Security: ${stack.security.join(', ')}`);
    lines.push(`  Overall Confidence: ${formatRatio(stack.confidence)}`);
    lines.push(`  Complexity: ${stack.complexity}`);
    lines.push('');
  }
  
  // Conflicts if any
  if (data.conflictingVendors && data.conflictingVendors.length > 0) {
    lines.push('Technology Conflicts:');
    data.conflictingVendors.slice(0, 5).forEach(conflict => {
      lines.push(`  ${conflict.type}: ${conflict.vendors.join(' vs ')}`);
      lines.push(`    ${conflict.reason}`);
      lines.push(`    Severity: ${conflict.severity}`);
      lines.push('');
    });
  }
  
  // Technology Categorization - NEW ENHANCEMENT
  if (data.vendorStats && data.vendorStats.vendorDistribution.length > 0) {
    lines.push('Technology Categorization:');
    lines.push(`  Vendor Coverage: ${formatFrequency(data.vendorStats.vendorCoverage)}`);
    lines.push(`  Total Headers: ${data.vendorStats.totalHeaders}`);
    lines.push(`  Vendor Headers: ${data.vendorStats.vendorHeaders}`);
    lines.push('');
    
    // Category distribution
    lines.push('  By Category:');
    Object.entries(data.vendorStats.categoryDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .forEach(([category, count]) => {
        const percentage = (count / data.vendorStats.totalHeaders) * 100;
        lines.push(`    ${category}: ${count} headers (${percentage.toFixed(1)}%)`);
      });
    lines.push('');
    
    // Top vendor distribution
    lines.push('  Vendor Distribution:');
    data.vendorStats.vendorDistribution
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8)
      .forEach(vendor => {
        lines.push(`    ${vendor.vendor} (${vendor.category}):`);
        lines.push(`      Headers: ${vendor.headerCount} (${formatFrequency(vendor.percentage / 100)})`);
        lines.push(`      Confidence: ${formatRatio(vendor.confidence)}`);
        lines.push(`      Key Headers: ${vendor.headers.slice(0, 2).join(', ')}`);
        lines.push('');
      });
  }
  
  // Technology Signatures - NEW ENHANCEMENT
  if (data.technologySignatures && data.technologySignatures.length > 0) {
    lines.push('Technology Signatures (Multi-Header Patterns):');
    data.technologySignatures
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .forEach(signature => {
        lines.push(`  ${signature.name} (${signature.vendor}):`);
        lines.push(`    Category: ${signature.category}`);
        lines.push(`    Required Headers: ${signature.requiredHeaders.join(', ')}`);
        if (signature.optionalHeaders.length > 0) {
          lines.push(`    Optional Headers: ${signature.optionalHeaders.join(', ')}`);
        }
        lines.push(`    Confidence: ${formatRatio(signature.confidence)}`);
        lines.push(`    Sites: ${signature.sites.length}`);
        lines.push('');
      });
  }
  
  return lines.join('\n');
}

export function formatForCSV(vendor: AnalysisResult<VendorSpecificData> | null | undefined): string[] {
  if (!vendor?.analyzerSpecific) return [];
  
  const data = vendor.analyzerSpecific;
  const rows: string[] = [];
  
  // Vendor detection data
  if (data.vendorsByHeader && isMap(data.vendorsByHeader)) {
    rows.push('Section,Vendor,Category,Header,Confidence,Sites,Frequency');
    for (const [header, detection] of data.vendorsByHeader.entries()) {
      rows.push(`"Vendor Detection","${detection.vendor.name}","${detection.vendor.category}","${header}",${detection.confidence},${detection.matchedSites.length},${detection.frequency}`);
    }
  }
  
  // Vendor statistics data
  if (data.vendorStats && data.vendorStats.vendorDistribution.length > 0) {
    rows.push(''); // Empty row separator
    rows.push('Section,Vendor,Category,HeaderCount,Coverage,Confidence,KeyHeaders');
    data.vendorStats.vendorDistribution.forEach(vendorStat => {
      const keyHeaders = vendorStat.headers.slice(0, 3).join('; ');
      rows.push(`"Vendor Statistics","${vendorStat.vendor}","${vendorStat.category}",${vendorStat.headerCount},${vendorStat.percentage}%,${vendorStat.confidence},"${keyHeaders}"`);
    });
  }
  
  // Technology signatures data
  if (data.technologySignatures && data.technologySignatures.length > 0) {
    rows.push(''); // Empty row separator
    rows.push('Section,SignatureName,Vendor,Category,RequiredHeaders,Confidence,Sites');
    data.technologySignatures.forEach(signature => {
      const requiredHeaders = signature.requiredHeaders.join('; ');
      rows.push(`"Technology Signatures","${signature.name}","${signature.vendor}","${signature.category}","${requiredHeaders}",${signature.confidence},${signature.sites.length}`);
    });
  }
  
  return rows;
}

export function formatForMarkdown(
  vendor: AnalysisResult<VendorSpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!vendor?.analyzerSpecific) return '';
  
  const data = vendor.analyzerSpecific;
  const lines: string[] = [];
  
  lines.push(`## Vendor Analysis`);
  lines.push('');
  
  // Summary metrics
  if (data.summary) {
    lines.push('### Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Vendors | ${data.summary.totalVendorsDetected} |`);
    lines.push(`| High Confidence | ${data.summary.highConfidenceVendors} |`);
    lines.push(`| Categories | ${data.summary.technologyCategories.join(', ')} |`);
    lines.push(`| Stack Complexity | ${data.summary.stackComplexity} |`);
    lines.push('');
  }
  
  // Vendor detections table
  if (data.vendorsByHeader && isMap(data.vendorsByHeader) && data.vendorsByHeader.size > 0) {
    lines.push('### Vendor Detection Summary');
    lines.push('');
    lines.push('| Vendor | Headers | Confidence | Category | Key Headers |');
    lines.push('|--------|---------|------------|----------|-------------|');
    
    // Group by vendor name and aggregate data
    const vendorSummary = new Map<string, {
      vendor: string;
      category: string;
      confidence: number;
      headerCount: number;
      headers: string[];
    }>();
    
    for (const [header, detection] of data.vendorsByHeader.entries()) {
      const vendorName = detection.vendor.name;
      const category = detection.vendor.category;
      
      if (!vendorSummary.has(vendorName)) {
        vendorSummary.set(vendorName, {
          vendor: vendorName,
          category,
          confidence: detection.confidence,
          headerCount: 0,
          headers: []
        });
      }
      
      const summary = vendorSummary.get(vendorName)!;
      summary.headerCount++;
      summary.headers.push(header);
      summary.confidence = Math.max(summary.confidence, detection.confidence);
    }
    
    // Sort by confidence and show top vendors
    const sortedVendors = Array.from(vendorSummary.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, Math.min(maxItems, 10));
    
    sortedVendors.forEach(vendorData => {
      const keyHeaders = vendorData.headers.slice(0, 3).join(', ');
      lines.push(`| ${vendorData.vendor} | ${vendorData.headerCount} | ${formatRatio(vendorData.confidence)} | ${vendorData.category} | \`${keyHeaders}\` |`);
    });
    lines.push('');
  }
  
  // Technology Categorization - NEW ENHANCEMENT
  if (data.vendorStats && data.vendorStats.vendorDistribution.length > 0) {
    lines.push('### Technology Categorization');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Vendor Coverage | ${formatFrequency(data.vendorStats.vendorCoverage)} |`);
    lines.push(`| Total Headers | ${data.vendorStats.totalHeaders} |`);
    lines.push(`| Vendor Headers | ${data.vendorStats.vendorHeaders} |`);
    lines.push('');
    
    // Category distribution table
    lines.push('#### By Category');
    lines.push('');
    lines.push('| Category | Headers | Percentage |');
    lines.push('|----------|---------|------------|');
    Object.entries(data.vendorStats.categoryDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .forEach(([category, count]) => {
        const percentage = (count / data.vendorStats.totalHeaders) * 100;
        lines.push(`| ${category} | ${count} | ${percentage.toFixed(1)}% |`);
      });
    lines.push('');
    
    // Vendor distribution table
    lines.push('#### Vendor Distribution');
    lines.push('');
    lines.push('| Vendor | Category | Headers | Coverage | Confidence | Key Headers |');
    lines.push('|--------|----------|---------|----------|------------|-------------|');
    data.vendorStats.vendorDistribution
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8)
      .forEach(vendor => {
        const keyHeaders = vendor.headers.slice(0, 2).join(', ');
        lines.push(`| ${vendor.vendor} | ${vendor.category} | ${vendor.headerCount} | ${formatFrequency(vendor.percentage / 100)} | ${formatRatio(vendor.confidence)} | \`${keyHeaders}\` |`);
      });
    lines.push('');
  }
  
  // Technology Signatures - NEW ENHANCEMENT
  if (data.technologySignatures && data.technologySignatures.length > 0) {
    lines.push('### Technology Signatures');
    lines.push('');
    lines.push('Multi-header patterns that identify specific technology combinations:');
    lines.push('');
    lines.push('| Signature | Vendor | Category | Required Headers | Confidence | Sites |');
    lines.push('|-----------|--------|----------|------------------|------------|-------|');
    data.technologySignatures
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .forEach(signature => {
        const requiredHeaders = signature.requiredHeaders.join(', ');
        lines.push(`| ${signature.name} | ${signature.vendor} | ${signature.category} | \`${requiredHeaders}\` | ${formatRatio(signature.confidence)} | ${signature.sites.length} |`);
      });
    lines.push('');
  }
  
  return lines.join('\n');
}

export function formatForJSON(vendor: AnalysisResult<VendorSpecificData> | null | undefined): Record<string, unknown> | null {
  if (!vendor?.analyzerSpecific) return null;
  
  const data = vendor.analyzerSpecific;
  
  // Convert Maps to objects for JSON serialization
  const vendorsByHeaderObj: Record<string, unknown> = {};
  if (data.vendorsByHeader && isMap(data.vendorsByHeader)) {
    for (const [key, value] of data.vendorsByHeader.entries()) {
      vendorsByHeaderObj[key] = {
        ...value,
        matchedSites: Array.from(value.matchedSites) // Convert Set to Array
      };
    }
  }
  
  // Convert technology signatures for JSON
  const technologySignaturesArray = data.technologySignatures ? 
    data.technologySignatures.map(signature => ({
      ...signature,
      sites: Array.from(signature.sites) // Convert Set to Array if needed
    })) : [];

  return {
    summary: data.summary,
    vendorsByHeader: vendorsByHeaderObj,
    vendorStats: data.vendorStats,
    technologyStack: data.technologyStack,
    technologySignatures: technologySignaturesArray,
    conflictingVendors: data.conflictingVendors,
    totalSites: vendor.totalSites
  };
}