import type { AnalysisResult, PatternDiscoverySpecificData } from '../../types/analyzer-interface.js';
import { formatFrequency, formatSiteCount, formatSubtitle, formatPercentage } from '../utils/formatting.js';
import { hasValidPatterns, isMap } from '../utils/safe-map-utils.js';

// Helper function for formatting percentage values that are already ratios (0-1)
function formatRatio(ratio: number): string {
  return formatFrequency(ratio);
}

export function formatForHuman(
  discovery: AnalysisResult<PatternDiscoverySpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!discovery?.analyzerSpecific) return '';
  
  const data = discovery.analyzerSpecific;
  const lines: string[] = [];
  
  lines.push(formatSubtitle('PATTERN DISCOVERY ANALYSIS'));
  lines.push('');
  
  // Discovery overview
  const discoveredCount = data.discoveredPatterns ? data.discoveredPatterns.size : 0;
  const emergingCount = data.emergingVendors ? data.emergingVendors.size : 0;
  const evolutionCount = data.patternEvolution ? data.patternEvolution.size : 0;
  const anomalyCount = data.semanticAnomalies ? data.semanticAnomalies.length : 0;
  
  lines.push(`Discovered Patterns: ${discoveredCount}`);
  lines.push(`Emerging Vendors: ${emergingCount}`);
  lines.push(`Pattern Evolution Trends: ${evolutionCount}`);
  lines.push(`Semantic Anomalies: ${anomalyCount}`);
  lines.push('');
  
  // Discovery metrics
  if (data.discoveryMetrics) {
    lines.push('Discovery Metrics:');
    lines.push(`  Coverage Percentage: ${formatRatio(data.discoveryMetrics.coveragePercentage / 100)}`);
    lines.push(`  Average Pattern Confidence: ${formatRatio(data.discoveryMetrics.averagePatternConfidence)}`);
    lines.push(`  Total Patterns Discovered: ${data.discoveryMetrics.totalPatternsDiscovered}`);
    lines.push(`  New Vendors Detected: ${data.discoveryMetrics.newVendorsDetected}`);
    lines.push(`  Evolution Patterns Found: ${data.discoveryMetrics.evolutionPatternsFound}`);
    lines.push(`  Anomalies Detected: ${data.discoveryMetrics.anomaliesDetected}`);
    lines.push('');
  }
  
  // Discovered patterns
  if (data.discoveredPatterns && isMap(data.discoveredPatterns) && data.discoveredPatterns.size > 0) {
    lines.push('Top Discovered Patterns:');
    const sortedPatterns = Array.from(data.discoveredPatterns.entries())
      .sort(([, a], [, b]) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, Math.min(maxItems, 10));
    
    sortedPatterns.forEach(([patternName, pattern], index) => {
      lines.push(`${index + 1}. ${patternName}`);
      lines.push(`   Type: ${pattern.type || 'unknown'}`);
      lines.push(`   Frequency: ${formatFrequency(pattern.frequency || 0)}`);
      lines.push(`   Sites: ${formatSiteCount(pattern.siteCount || 0, discovery.totalSites)}`);
      lines.push(`   Confidence: ${formatRatio(pattern.confidence || 0)}`);
      
      if (pattern.potentialVendor) {
        lines.push(`   Potential Vendor: ${pattern.potentialVendor}`);
      }
      
      if (pattern.examples && pattern.examples.length > 0) {
        lines.push(`   Examples: ${pattern.examples.slice(0, 2).join(', ')}`);
      }
      lines.push('');
    });
  }
  
  // Emerging vendors
  if (data.emergingVendors && isMap(data.emergingVendors) && data.emergingVendors.size > 0) {
    lines.push('Emerging Vendor Patterns:');
    const sortedVendors = Array.from(data.emergingVendors.entries())
      .sort(([, a], [, b]) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, Math.min(maxItems, 8));
    
    sortedVendors.forEach(([vendorName, vendor]) => {
      lines.push(`  ${vendorName}:`);
      lines.push(`    Confidence: ${formatRatio(vendor.confidence || 0)}`);
      lines.push(`    Sites: ${formatSiteCount(vendor.siteCount || 0, discovery.totalSites)}`);
      lines.push(`    Patterns: ${vendor.patterns ? vendor.patterns.length : 0}`);
      
      if (vendor.characteristics?.namingConvention) {
        lines.push(`    Naming Convention: ${vendor.characteristics.namingConvention}`);
      }
      
      if (vendor.technologyStack?.inferredStack) {
        lines.push(`    Tech Stack: ${vendor.technologyStack.inferredStack.slice(0, 3).join(', ')}`);
      }
      lines.push('');
    });
  }
  
  // Pattern evolution
  if (data.patternEvolution && isMap(data.patternEvolution) && data.patternEvolution.size > 0) {
    lines.push('Pattern Evolution Trends:');
    const sortedEvolution = Array.from(data.patternEvolution.entries())
      .sort(([, a], [, b]) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, Math.min(maxItems, 8));
    
    sortedEvolution.forEach(([patternName, evolution]) => {
      lines.push(`  ${patternName}:`);
      lines.push(`    Evolution Type: ${evolution.evolutionType || 'unknown'}`);
      lines.push(`    Trend: ${evolution.trendDirection || 'unknown'}`);
      lines.push(`    Confidence: ${formatRatio(evolution.confidence || 0)}`);
      lines.push(`    Versions: ${evolution.versions ? evolution.versions.length : 0}`);
      
      if (evolution.migrationPattern) {
        lines.push(`    Migration: ${evolution.migrationPattern}`);
      }
      lines.push('');
    });
  }
  
  // Semantic anomalies
  if (data.semanticAnomalies && data.semanticAnomalies.length > 0) {
    lines.push('Semantic Anomalies:');
    const highConfidenceAnomalies = data.semanticAnomalies
      .filter(a => (a.confidence || 0) > 0.6)
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, Math.min(maxItems, 10));
    
    highConfidenceAnomalies.forEach(anomaly => {
      lines.push(`  ${anomaly.headerName}:`);
      lines.push(`    Expected: ${anomaly.expectedCategory} → Actual: ${anomaly.actualCategory}`);
      lines.push(`    Confidence: ${formatRatio(anomaly.confidence || 0)}`);
      lines.push(`    Severity: ${anomaly.severity || 'unknown'}`);
      lines.push(`    Type: ${anomaly.anomalyType || 'unknown'}`);
      if (anomaly.reason) {
        lines.push(`    Reason: ${anomaly.reason}`);
      }
      lines.push('');
    });
  }
  
  // Insights
  if (data.insights && data.insights.length > 0) {
    lines.push('Pattern Discovery Insights:');
    data.insights.slice(0, 5).forEach(insight => {
      lines.push(`  • ${insight}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

export function formatForCSV(discovery: AnalysisResult<PatternDiscoverySpecificData> | null | undefined): string[] {
  if (!discovery?.analyzerSpecific) return [];
  
  const data = discovery.analyzerSpecific;
  const rows: string[] = [];
  
  // Discovered patterns
  if (data.discoveredPatterns && isMap(data.discoveredPatterns)) {
    rows.push('Pattern,Type,Frequency,Sites,Confidence,Potential Vendor,Examples');
    
    const sortedPatterns = Array.from(data.discoveredPatterns.entries())
      .sort(([, a], [, b]) => (b.confidence || 0) - (a.confidence || 0));
    
    sortedPatterns.forEach(([patternName, pattern]) => {
      const frequency = ((pattern.frequency || 0) * 100).toFixed(2);
      const confidence = ((pattern.confidence || 0) * 100).toFixed(1);
      const vendor = pattern.potentialVendor || '';
      const examples = pattern.examples ? pattern.examples.slice(0, 2).join(';') : '';
      
      rows.push(`"${patternName}","${pattern.type || ''}",${frequency}%,${pattern.siteCount || 0},${confidence}%,"${vendor}","${examples}"`);
    });
  }
  
  return rows;
}

export function formatForMarkdown(
  discovery: AnalysisResult<PatternDiscoverySpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!discovery?.analyzerSpecific) return '';
  
  const data = discovery.analyzerSpecific;
  const lines: string[] = [];
  
  lines.push(`## Pattern Discovery Analysis`);
  lines.push('');
  
  // Overview metrics
  const discoveredCount = data.discoveredPatterns ? data.discoveredPatterns.size : 0;
  const emergingCount = data.emergingVendors ? data.emergingVendors.size : 0;
  const evolutionCount = data.patternEvolution ? data.patternEvolution.size : 0;
  const anomalyCount = data.semanticAnomalies ? data.semanticAnomalies.length : 0;
  
  lines.push('### Discovery Overview');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Discovered Patterns | ${discoveredCount} |`);
  lines.push(`| Emerging Vendors | ${emergingCount} |`);
  lines.push(`| Pattern Evolution Trends | ${evolutionCount} |`);
  lines.push(`| Semantic Anomalies | ${anomalyCount} |`);
  lines.push('');
  
  // Discovery metrics
  if (data.discoveryMetrics) {
    lines.push('### Discovery Quality Metrics');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Coverage Percentage | ${formatRatio(data.discoveryMetrics.coveragePercentage / 100)} |`);
    lines.push(`| Average Pattern Confidence | ${formatRatio(data.discoveryMetrics.averagePatternConfidence)} |`);
    lines.push(`| Total Patterns Discovered | ${data.discoveryMetrics.totalPatternsDiscovered} |`);
    lines.push(`| New Vendors Detected | ${data.discoveryMetrics.newVendorsDetected} |`);
    lines.push(`| Evolution Patterns Found | ${data.discoveryMetrics.evolutionPatternsFound} |`);
    lines.push(`| Anomalies Detected | ${data.discoveryMetrics.anomaliesDetected} |`);
    lines.push('');
  }
  
  // Discovered patterns table
  if (data.discoveredPatterns && isMap(data.discoveredPatterns) && data.discoveredPatterns.size > 0) {
    lines.push('### Discovered Header Patterns');
    lines.push('');
    lines.push('| Pattern | Type | Frequency | Sites | Confidence | Potential Vendor | Examples |');
    lines.push('|---------|------|-----------|-------|------------|------------------|----------|');
    
    const sortedPatterns = Array.from(data.discoveredPatterns.entries())
      .sort(([, a], [, b]) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, Math.min(maxItems, 12));
    
    sortedPatterns.forEach(([patternName, pattern]) => {
      const examples = pattern.examples ? pattern.examples.slice(0, 2).join(', ') : '';
      const vendor = pattern.potentialVendor || '';
      lines.push(`| \`${patternName}\` | ${pattern.type || ''} | ${formatFrequency(pattern.frequency || 0)} | ${formatSiteCount(pattern.siteCount || 0, discovery.totalSites)} | ${formatRatio(pattern.confidence || 0)} | ${vendor} | \`${examples}\` |`);
    });
    lines.push('');
  }
  
  // Emerging vendors table
  if (data.emergingVendors && isMap(data.emergingVendors) && data.emergingVendors.size > 0) {
    lines.push('### Emerging Vendor Patterns');
    lines.push('');
    lines.push('| Vendor | Confidence | Sites | Patterns | Naming Convention | Tech Stack |');
    lines.push('|--------|------------|-------|----------|-------------------|------------|');
    
    const sortedVendors = Array.from(data.emergingVendors.entries())
      .sort(([, a], [, b]) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, Math.min(maxItems, 10));
    
    sortedVendors.forEach(([vendorName, vendor]) => {
      const convention = vendor.characteristics?.namingConvention || '';
      const techStack = vendor.technologyStack?.inferredStack ? vendor.technologyStack.inferredStack.slice(0, 2).join(', ') : '';
      lines.push(`| ${vendorName} | ${formatRatio(vendor.confidence || 0)} | ${formatSiteCount(vendor.siteCount || 0, discovery.totalSites)} | ${vendor.patterns ? vendor.patterns.length : 0} | ${convention} | ${techStack} |`);
    });
    lines.push('');
  }
  
  // Pattern evolution table
  if (data.patternEvolution && isMap(data.patternEvolution) && data.patternEvolution.size > 0) {
    lines.push('### Pattern Evolution Trends');
    lines.push('');
    lines.push('| Pattern | Evolution Type | Trend | Confidence | Versions | Migration |');
    lines.push('|---------|----------------|-------|------------|----------|-----------|');
    
    const sortedEvolution = Array.from(data.patternEvolution.entries())
      .sort(([, a], [, b]) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, Math.min(maxItems, 10));
    
    sortedEvolution.forEach(([patternName, evolution]) => {
      const migration = evolution.migrationPattern || '';
      lines.push(`| \`${patternName}\` | ${evolution.evolutionType || ''} | ${evolution.trendDirection || ''} | ${formatRatio(evolution.confidence || 0)} | ${evolution.versions ? evolution.versions.length : 0} | ${migration} |`);
    });
    lines.push('');
  }
  
  // Semantic anomalies table
  if (data.semanticAnomalies && data.semanticAnomalies.length > 0) {
    lines.push('### Semantic Anomalies');
    lines.push('');
    lines.push('| Header | Expected | Actual | Confidence | Severity | Type | Reason |');
    lines.push('|--------|----------|--------|------------|----------|------|--------|');
    
    const highConfidenceAnomalies = data.semanticAnomalies
      .filter(a => (a.confidence || 0) > 0.6)
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, Math.min(maxItems, 12));
    
    highConfidenceAnomalies.forEach(anomaly => {
      const reason = anomaly.reason ? anomaly.reason.substring(0, 80) : 'N/A';
      lines.push(`| \`${anomaly.headerName}\` | ${anomaly.expectedCategory} | ${anomaly.actualCategory} | ${formatRatio(anomaly.confidence || 0)} | ${anomaly.severity || ''} | ${anomaly.anomalyType || ''} | ${reason} |`);
    });
    lines.push('');
  }
  
  // Insights
  if (data.insights && data.insights.length > 0) {
    lines.push('### Pattern Discovery Insights');
    lines.push('');
    data.insights.slice(0, 8).forEach(insight => {
      lines.push(`- ${insight}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

export function formatForJSON(discovery: AnalysisResult<PatternDiscoverySpecificData> | null | undefined): any {
  if (!discovery?.analyzerSpecific) return null;
  
  const data = discovery.analyzerSpecific;
  
  return {
    overview: {
      discoveredPatterns: data.discoveredPatterns ? data.discoveredPatterns.size : 0,
      emergingVendors: data.emergingVendors ? data.emergingVendors.size : 0,
      patternEvolution: data.patternEvolution ? data.patternEvolution.size : 0,
      semanticAnomalies: data.semanticAnomalies ? data.semanticAnomalies.length : 0
    },
    discoveryMetrics: data.discoveryMetrics,
    discoveredPatterns: data.discoveredPatterns ? 
      Object.fromEntries(Array.from(data.discoveredPatterns.entries())) : {},
    emergingVendors: data.emergingVendors ? 
      Object.fromEntries(Array.from(data.emergingVendors.entries())) : {},
    patternEvolution: data.patternEvolution ? 
      Object.fromEntries(Array.from(data.patternEvolution.entries())) : {},
    semanticAnomalies: data.semanticAnomalies || [],
    insights: data.insights || [],
    totalSites: discovery.totalSites
  };
}