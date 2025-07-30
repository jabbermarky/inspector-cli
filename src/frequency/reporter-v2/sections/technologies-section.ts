import type { AnalysisResult, TechSpecificData } from '../../types/analyzer-interface.js';
import { formatFrequency, formatSiteCount, formatSubtitle, formatPercentage } from '../utils/formatting.js';
import { hasValidPatterns, isMap } from '../utils/safe-map-utils.js';

// Helper function for formatting percentage values that are already ratios (0-1)
function formatRatio(ratio: number): string {
  return formatFrequency(ratio);
}

export function formatForHuman(
  technologies: AnalysisResult<TechSpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!technologies?.analyzerSpecific) return '';
  
  const data = technologies.analyzerSpecific;
  const lines: string[] = [];
  
  lines.push(formatSubtitle('TECHNOLOGIES DETECTED'));
  lines.push('');
  
  // Technology categories (base TechSpecificData)
  if (data.categories && isMap(data.categories) && data.categories.size > 0) {
    lines.push('Technology Categories:');
    const sortedCategories = Array.from(data.categories.entries())
      .sort(([_, aSet], [__, bSet]) => bSet.size - aSet.size)
      .slice(0, maxItems);
    
    sortedCategories.forEach(([category, techSet]) => {
      const technologies = Array.from(techSet).slice(0, 8).join(', ');
      const remaining = techSet.size > 8 ? ` (+${techSet.size - 8} more)` : '';
      lines.push(`  ${category} (${techSet.size}): ${technologies}${remaining}`);
    });
    lines.push('');
  }
  
  // Enhanced data (if available from EnhancedTechSpecificData)
  const enhancedData = data as any; // Cast to access enhanced properties
  
  // Detected technologies with patterns
  if (enhancedData.detectedTechnologies && isMap(enhancedData.detectedTechnologies) && enhancedData.detectedTechnologies.size > 0) {
    lines.push('Detected Technology Patterns:');
    const sortedTech = Array.from(enhancedData.detectedTechnologies.entries() as any)
      .sort(([_, a]: any, [__, b]: any) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, Math.min(maxItems, 15));
    
    sortedTech.forEach(([techName, pattern]: any, index: number) => {
      lines.push(`${index + 1}. ${techName}`);
      lines.push(`   Category: ${pattern.category}`);
      lines.push(`   Confidence: ${formatRatio(pattern.confidence || 0)}`);
      if (pattern.version) {
        lines.push(`   Version: ${pattern.version}`);
      }
      if (pattern.sources && pattern.sources.length > 0) {
        lines.push(`   Sources: ${pattern.sources.slice(0, 2).join(', ')}`);
      }
      lines.push('');
    });
  }
  
  // Technology stack analysis
  if (enhancedData.stackAnalysis) {
    const stack = enhancedData.stackAnalysis;
    lines.push('Technology Stack Analysis:');
    lines.push(`  Complexity: ${stack.stackComplexity || 'unknown'}`);
    lines.push(`  Modernity Score: ${formatRatio(stack.modernityScore || 0)}`);
    lines.push(`  Compatibility Score: ${formatRatio(stack.compatibilityScore || 0)}`);
    lines.push(`  Primary Stack: ${stack.primaryStack ? stack.primaryStack.slice(0, 3).join(', ') : 'unknown'}`);
    
    if (stack.stackRecommendations && stack.stackRecommendations.length > 0) {
      lines.push(`  Recommendations: ${stack.stackRecommendations.slice(0, 2).join(', ')}`);
    }
    lines.push('');
  }
  
  // Technology trends
  if (enhancedData.technologyTrends && isMap(enhancedData.technologyTrends) && enhancedData.technologyTrends.size > 0) {
    lines.push('Technology Trends:');
    const trends = Array.from(enhancedData.technologyTrends.entries() as any)
      .slice(0, Math.min(maxItems, 8));
    
    trends.forEach(([tech, trend]: any) => {
      lines.push(`  ${tech}: ${trend.direction || 'stable'} (${formatRatio(trend.confidence || 0)})`);
    });
    lines.push('');
  }
  
  // Compatibility matrix highlights
  if (enhancedData.compatibilityMatrix && isMap(enhancedData.compatibilityMatrix) && enhancedData.compatibilityMatrix.size > 0) {
    lines.push('Technology Compatibility:');
    const compatEntries = Array.from(enhancedData.compatibilityMatrix.entries() as any)
      .slice(0, Math.min(maxItems, 6));
    
    compatEntries.forEach(([tech, compatibleWith]: any) => {
      if (compatibleWith && compatibleWith.length > 0) {
        lines.push(`  ${tech}: Compatible with ${compatibleWith.slice(0, 3).join(', ')}`);
      }
    });
    lines.push('');
  }
  
  // Security assessment highlights
  if (enhancedData.securityAssessment && isMap(enhancedData.securityAssessment) && enhancedData.securityAssessment.size > 0) {
    lines.push('Security Assessment:');
    const securityEntries = Array.from(enhancedData.securityAssessment.entries() as any)
      .slice(0, Math.min(maxItems, 5));
    
    securityEntries.forEach(([tech, assessment]: any) => {
      lines.push(`  ${tech}: ${assessment.status || 'unknown'} (Risk: ${assessment.riskLevel || 'unknown'})`);
    });
    lines.push('');
  }
  
  // Summary statistics
  const totalTech = data.categories ? Array.from(data.categories.values()).reduce((sum, set) => sum + set.size, 0) : 0;
  const totalCategories = data.categories ? data.categories.size : 0;
  
  lines.push('Detection Summary:');
  lines.push(`  Total Technologies: ${totalTech}`);
  lines.push(`  Technology Categories: ${totalCategories}`);
  lines.push(`  Total Sites: ${technologies.totalSites}`);
  lines.push('');
  
  return lines.join('\n');
}

export function formatForCSV(technologies: AnalysisResult<TechSpecificData> | null | undefined): string[] {
  if (!technologies?.analyzerSpecific) return [];
  
  const data = technologies.analyzerSpecific;
  const rows: string[] = [];
  
  // Technology categories
  if (data.categories && isMap(data.categories)) {
    rows.push('Category,Technology,Count');
    
    const sortedCategories = Array.from(data.categories.entries())
      .sort(([_, aSet], [__, bSet]) => bSet.size - aSet.size);
    
    sortedCategories.forEach(([category, techSet]) => {
      Array.from(techSet).forEach(tech => {
        rows.push(`"${category}","${tech}",${techSet.size}`);
      });
    });
  }
  
  return rows;
}

export function formatForMarkdown(
  technologies: AnalysisResult<TechSpecificData> | null | undefined,
  maxItems: number = 15
): string {
  if (!technologies?.analyzerSpecific) return '';
  
  const data = technologies.analyzerSpecific;
  const lines: string[] = [];
  
  lines.push(`## Technologies Detected`);
  lines.push('');
  
  // Technology categories table
  if (data.categories && isMap(data.categories) && data.categories.size > 0) {
    lines.push('### Technology Categories');
    lines.push('');
    lines.push('| Category | Count | Technologies |');
    lines.push('|----------|-------|-------------|');
    
    const sortedCategories = Array.from(data.categories.entries())
      .sort(([_, aSet], [__, bSet]) => bSet.size - aSet.size)
      .slice(0, maxItems);
    
    sortedCategories.forEach(([category, techSet]) => {
      const technologies = Array.from(techSet).slice(0, 5).join(', ');
      const remaining = techSet.size > 5 ? ` (+${techSet.size - 5})` : '';
      lines.push(`| ${category} | ${techSet.size} | ${technologies}${remaining} |`);
    });
    lines.push('');
  }
  
  // Enhanced data sections (if available)
  const enhancedData = data as any;
  
  // Detected technology patterns
  if (enhancedData.detectedTechnologies && isMap(enhancedData.detectedTechnologies) && enhancedData.detectedTechnologies.size > 0) {
    lines.push('### Detected Technology Patterns');
    lines.push('');
    lines.push('| Technology | Category | Confidence | Version | Sources |');
    lines.push('|------------|----------|------------|---------|---------|');
    
    const sortedTech = Array.from(enhancedData.detectedTechnologies.entries() as any)
      .sort(([_, a]: any, [__, b]: any) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, Math.min(maxItems, 12));
    
    sortedTech.forEach(([techName, pattern]: any) => {
      const version = pattern.version || 'N/A';
      const sources = pattern.sources ? pattern.sources.slice(0, 2).join(', ') : 'N/A';
      lines.push(`| ${techName} | ${pattern.category} | ${formatRatio(pattern.confidence || 0)} | ${version} | ${sources} |`);
    });
    lines.push('');
  }
  
  // Technology stack analysis
  if (enhancedData.stackAnalysis) {
    const stack = enhancedData.stackAnalysis;
    lines.push('### Technology Stack Analysis');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Complexity | ${stack.stackComplexity || 'unknown'} |`);
    lines.push(`| Modernity Score | ${formatRatio(stack.modernityScore || 0)} |`);
    lines.push(`| Compatibility Score | ${formatRatio(stack.compatibilityScore || 0)} |`);
    lines.push(`| Primary Stack | ${stack.primaryStack ? stack.primaryStack.slice(0, 3).join(', ') : 'unknown'} |`);
    
    if (stack.stackRecommendations && stack.stackRecommendations.length > 0) {
      lines.push(`| Recommendations | ${stack.stackRecommendations.slice(0, 2).join(', ')} |`);
    }
    lines.push('');
  }
  
  // Technology trends
  if (enhancedData.technologyTrends && isMap(enhancedData.technologyTrends) && enhancedData.technologyTrends.size > 0) {
    lines.push('### Technology Trends');
    lines.push('');
    lines.push('| Technology | Trend | Confidence |');
    lines.push('|------------|-------|------------|');
    
    const trends = Array.from(enhancedData.technologyTrends.entries() as any)
      .slice(0, Math.min(maxItems, 10));
    
    trends.forEach(([tech, trend]: any) => {
      lines.push(`| ${tech} | ${trend.direction || 'stable'} | ${formatRatio(trend.confidence || 0)} |`);
    });
    lines.push('');
  }
  
  // Summary statistics
  const totalTech = data.categories ? Array.from(data.categories.values()).reduce((sum, set) => sum + set.size, 0) : 0;
  const totalCategories = data.categories ? data.categories.size : 0;
  
  lines.push('### Detection Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Technologies | ${totalTech} |`);
  lines.push(`| Technology Categories | ${totalCategories} |`);
  lines.push(`| Total Sites | ${technologies.totalSites} |`);
  lines.push('');
  
  return lines.join('\n');
}

export function formatForJSON(technologies: AnalysisResult<TechSpecificData> | null | undefined): any {
  if (!technologies?.analyzerSpecific) return null;
  
  const data = technologies.analyzerSpecific;
  const enhancedData = data as any;
  
  // Safe map conversion for JSON output
  const categoriesObj: Record<string, string[]> = {};
  if (data.categories && isMap(data.categories)) {
    for (const [key, value] of data.categories.entries()) {
      categoriesObj[key] = Array.from(value);
    }
  }
  
  const detectedTechObj: Record<string, any> = {};
  if (enhancedData.detectedTechnologies && isMap(enhancedData.detectedTechnologies)) {
    for (const [key, value] of enhancedData.detectedTechnologies.entries()) {
      detectedTechObj[key] = value;
    }
  }
  
  const trendsObj: Record<string, any> = {};
  if (enhancedData.technologyTrends && isMap(enhancedData.technologyTrends)) {
    for (const [key, value] of enhancedData.technologyTrends.entries()) {
      trendsObj[key] = value;
    }
  }
  
  const compatObj: Record<string, any> = {};
  if (enhancedData.compatibilityMatrix && isMap(enhancedData.compatibilityMatrix)) {
    for (const [key, value] of enhancedData.compatibilityMatrix.entries()) {
      compatObj[key] = value;
    }
  }
  
  const securityObj: Record<string, any> = {};
  if (enhancedData.securityAssessment && isMap(enhancedData.securityAssessment)) {
    for (const [key, value] of enhancedData.securityAssessment.entries()) {
      securityObj[key] = value;
    }
  }

  return {
    categories: categoriesObj,
    detectedTechnologies: detectedTechObj,
    stackAnalysis: enhancedData.stackAnalysis || null,
    technologyTrends: trendsObj,
    compatibilityMatrix: compatObj,
    securityAssessment: securityObj,
    totalSites: technologies.totalSites
  };
}