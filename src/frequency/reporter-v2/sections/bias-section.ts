import { AnalysisResult } from '../../types/analyzer-interface.js';
import { BiasSpecificData } from '../../types/bias-analysis-types-v2.js';
import { formatSubtitle } from '../utils/formatting.js';


export function formatForHuman(
  bias: AnalysisResult<BiasSpecificData> | undefined
): string {
  if (!bias || !bias.analyzerSpecific) {
    return '';
  }
  
  const lines: string[] = [];
  
  lines.push(formatSubtitle('ENHANCED BIAS ANALYSIS'));
  lines.push('');
  
  if (bias.analyzerSpecific) {
    const biasData = bias.analyzerSpecific;
    
    // Statistical Summary
    if (biasData.statisticalSummary) {
      lines.push('Dataset Quality Assessment:');
      lines.push(`  - Total headers analyzed: ${biasData.statisticalSummary.totalHeadersAnalyzed}`);
      lines.push(`  - Headers with bias indicators: ${biasData.statisticalSummary.headersWithBias}`);
      lines.push(`  - Dataset quality score: ${(biasData.statisticalSummary.datasetQualityScore * 100).toFixed(1)}%`);
      lines.push(`  - Bias risk score: ${(biasData.statisticalSummary.biasRiskScore * 100).toFixed(1)}%`);
      lines.push(`  - Recommendation reliability: ${(biasData.statisticalSummary.recommendationReliabilityScore * 100).toFixed(1)}%`);
      lines.push('');
      
      // Confidence Distribution
      const conf = biasData.statisticalSummary.confidenceDistribution;
      lines.push('Analysis Confidence Distribution:');
      lines.push(`  - High confidence: ${conf.high} headers`);
      lines.push(`  - Medium confidence: ${conf.medium} headers`);
      lines.push(`  - Low confidence: ${conf.low} headers`);
      lines.push('');
      
      // Chi-square results
      const chi = biasData.statisticalSummary.chiSquareResults;
      lines.push('Statistical Significance:');
      lines.push(`  - Statistically significant headers: ${chi.statisticallySignificantHeaders}`);
      lines.push(`  - Average chi-square value: ${chi.averageChiSquare.toFixed(2)}`);
      lines.push(`  - Average p-value: ${chi.averagePValue.toFixed(4)}`);
      lines.push('');
    }
    
    // CMS Distribution Analysis
    if (biasData.cmsDistribution) {
      lines.push('CMS Distribution Bias:');
      lines.push(`  - Total sites in analysis: ${biasData.cmsDistribution.totalSites}`);
      lines.push(`  - Concentration score (HHI): ${(biasData.cmsDistribution.concentrationScore * 100).toFixed(1)}%`);
      lines.push(`  - Diversity index (Shannon): ${biasData.cmsDistribution.diversityIndex.toFixed(2)}`);
      lines.push(`  - Unknown/undetected sites: ${biasData.cmsDistribution.unknownSites}`);
      
      if (biasData.cmsDistribution.dominantPlatforms.length > 0) {
        lines.push(`  - Dominant platforms: ${biasData.cmsDistribution.dominantPlatforms.join(', ')}`);
      }
      lines.push('');
    }
    
    // Concentration Metrics
    if (biasData.concentrationMetrics) {
      const metrics = biasData.concentrationMetrics;
      lines.push('Concentration Risk Assessment:');
      lines.push(`  - Herfindahl index: ${(metrics.herfindahlIndex * 100).toFixed(1)}%`);
      lines.push(`  - Effective platforms: ${metrics.effectiveNumberOfPlatforms.toFixed(1)}`);
      lines.push(`  - Dominance ratio: ${metrics.dominanceRatio.toFixed(2)}`);
      lines.push(`  - Concentration risk: ${metrics.concentrationRisk.toUpperCase()}`);
      lines.push(`  - Diversity risk: ${metrics.diversityRisk.toUpperCase()}`);
      lines.push(`  - Overall bias risk: ${metrics.overallBiasRisk.toUpperCase()}`);
      lines.push('');
    }
    
    // Bias Warnings
    if (biasData.biasWarnings && biasData.biasWarnings.length > 0) {
      lines.push('Bias Warnings:');
      biasData.biasWarnings.forEach(warning => {
        const severity = warning.severity.toUpperCase();
        lines.push(`  [${severity}] ${warning.message}`);
        if (warning.recommendation) {
          lines.push(`    → Recommendation: ${warning.recommendation}`);
        }
      });
      lines.push('');
    }
    
    // Platform Affinity Scores - Split into CMS and Non-CMS sections
    if (biasData.headerCorrelations && biasData.headerCorrelations.size > 0) {
      const allHeaders = Array.from(biasData.headerCorrelations.entries())
        .sort(([,a], [,b]) => (b.platformSpecificity.score) - (a.platformSpecificity.score));
      
      // Separate CMS-specific headers (>90% affinity with known CMS) from others
      const cmsSpecificHeaders = allHeaders.filter(([_header, correlation]) => {
        const score = correlation.platformSpecificity.score;
        const topCMS = correlation.platformSpecificity.discriminativeDetails?.topCMS;
        
        return score > 0.9 && topCMS;
      });
      
      const otherPlatformHeaders = allHeaders.filter(([_header, correlation]) => {
        const score = correlation.platformSpecificity.score;
        const topCMS = correlation.platformSpecificity.discriminativeDetails?.topCMS;
        
        return !(score > 0.9 && topCMS);
      }).slice(0, 5); // Top 5 other headers
      
      // CMS-Specific Headers
      if (cmsSpecificHeaders.length > 0) {
        lines.push('CMS-Specific Headers (>90% Platform Affinity):');
        lines.push('  (Headers strongly correlated with specific CMS platforms)');
        cmsSpecificHeaders.forEach(([header, correlation]) => {
          const score = correlation.platformSpecificity.score;
          const details = correlation.platformSpecificity.discriminativeDetails;
          const topCMS = details?.topCMS || 'Unknown';
          
          // Get CMS-specific metrics
          const cmsMetrics = correlation.perCMSMetrics.get(topCMS);
          const coverage = cmsMetrics ? (cmsMetrics.frequency * 100).toFixed(1) : 'N/A';
          const exclusivity = details ? (details.topCMSProbability * 100).toFixed(1) : 'N/A';
          const sites = correlation.overallMetrics.occurrences;
          
          lines.push(`  - ${header}: ${topCMS} (Affinity: ${(score * 100).toFixed(1)}%, Coverage: ${coverage}%, Exclusivity: ${exclusivity}%, Sites: ${sites})`);
        });
        lines.push('');
      }
      
      // Other Platform-Specific Headers
      if (otherPlatformHeaders.length > 0) {
        lines.push('Other Platform-Specific Headers (Top 5):');
        lines.push('  (Headers tied to CDN, infrastructure, security, or other platforms)');
        otherPlatformHeaders.forEach(([header, correlation]) => {
          const score = correlation.platformSpecificity.score;
          const sites = correlation.overallMetrics.occurrences;
          
          // Determine top platform
          let topPlatform = 'Mixed';
          let topPercentage = 0;
          if (correlation.conditionalProbabilities.cmsGivenHeader.size > 0) {
            const sortedPlatforms = Array.from(correlation.conditionalProbabilities.cmsGivenHeader.entries())
              .sort(([, a], [, b]) => b.probability - a.probability);
            if (sortedPlatforms.length > 0) {
              topPlatform = sortedPlatforms[0][0];
              topPercentage = sortedPlatforms[0][1].probability * 100;
            }
          }
          
          lines.push(`  - ${header}: ${(score * 100).toFixed(1)}% affinity, ${sites} sites, Top: ${topPlatform} (${topPercentage.toFixed(1)}%)`);
        });
        lines.push('');
      }
    }
  }
  
  return lines.join('\n');
}

export function formatForCSV(bias: AnalysisResult<BiasSpecificData> | undefined): string[] {
  if (!bias || !bias.analyzerSpecific) {
    return [];
  }
  
  const rows: string[] = [];
  rows.push('Bias Metric,Value,Category');
  
  if (bias.analyzerSpecific) {
    const biasData = bias.analyzerSpecific;
    
    // Statistical Summary
    if (biasData.statisticalSummary) {
      const stats = biasData.statisticalSummary;
      rows.push(`Headers Analyzed,${stats.totalHeadersAnalyzed},Statistical Summary`);
      rows.push(`Headers With Bias,${stats.headersWithBias},Statistical Summary`);
      rows.push(`Dataset Quality Score,${(stats.datasetQualityScore * 100).toFixed(1)}%,Statistical Summary`);
      rows.push(`Bias Risk Score,${(stats.biasRiskScore * 100).toFixed(1)}%,Statistical Summary`);
      rows.push(`Recommendation Reliability,${(stats.recommendationReliabilityScore * 100).toFixed(1)}%,Statistical Summary`);
      
      // Confidence distribution
      rows.push(`High Confidence Headers,${stats.confidenceDistribution.high},Confidence Distribution`);
      rows.push(`Medium Confidence Headers,${stats.confidenceDistribution.medium},Confidence Distribution`);
      rows.push(`Low Confidence Headers,${stats.confidenceDistribution.low},Confidence Distribution`);
      
      // Chi-square results
      rows.push(`Statistically Significant Headers,${stats.chiSquareResults.statisticallySignificantHeaders},Statistical Tests`);
      rows.push(`Average Chi-square,${stats.chiSquareResults.averageChiSquare.toFixed(2)},Statistical Tests`);
      rows.push(`Average P-value,${stats.chiSquareResults.averagePValue.toFixed(4)},Statistical Tests`);
    }
    
    // CMS Distribution
    if (biasData.cmsDistribution) {
      const cms = biasData.cmsDistribution;
      rows.push(`Total Sites,${cms.totalSites},CMS Distribution`);
      rows.push(`Concentration Score,${(cms.concentrationScore * 100).toFixed(1)}%,CMS Distribution`);
      rows.push(`Diversity Index,${cms.diversityIndex.toFixed(2)},CMS Distribution`);
      rows.push(`Unknown Sites,${cms.unknownSites},CMS Distribution`);
    }
    
    // Concentration Metrics
    if (biasData.concentrationMetrics) {
      const metrics = biasData.concentrationMetrics;
      rows.push(`Herfindahl Index,${(metrics.herfindahlIndex * 100).toFixed(1)}%,Concentration Metrics`);
      rows.push(`Effective Platforms,${metrics.effectiveNumberOfPlatforms.toFixed(1)},Concentration Metrics`);
      rows.push(`Dominance Ratio,${metrics.dominanceRatio.toFixed(2)},Concentration Metrics`);
      rows.push(`Concentration Risk,${metrics.concentrationRisk},Risk Assessment`);
      rows.push(`Diversity Risk,${metrics.diversityRisk},Risk Assessment`);
      rows.push(`Overall Bias Risk,${metrics.overallBiasRisk},Risk Assessment`);
    }
    
    // Platform Specificity Scores (top 10 for CSV)
    if (biasData.headerCorrelations && biasData.headerCorrelations.size > 0) {
      const sorted = Array.from(biasData.headerCorrelations.entries())
        .sort(([,a], [,b]) => (b.platformSpecificity.score) - (a.platformSpecificity.score))
        .slice(0, 10);
      
      sorted.forEach(([header, correlation]) => {
        const score = correlation.platformSpecificity.score;
        const topPlatform = correlation.platformSpecificity.discriminativeDetails?.topCMS;
        
        const platformDisplay = topPlatform || 'N/A';
        rows.push(`${header} Specificity,${(score * 100).toFixed(1)}%,Platform Specificity (${platformDisplay})`);
      });
    }
  }
  
  return rows;
}

export function formatForMarkdown(bias: AnalysisResult<BiasSpecificData> | undefined): string {
  if (!bias || !bias.analyzerSpecific) {
    return '';
  }
  
  const lines: string[] = [];
  
  lines.push('## Enhanced Bias Analysis');
  lines.push('');
  
  if (bias.analyzerSpecific) {
    const biasData = bias.analyzerSpecific;
    
    // Statistical Summary
    if (biasData.statisticalSummary) {
      lines.push('### Dataset Quality Assessment');
      lines.push('');
      lines.push('| Metric | Value |');
      lines.push('|--------|-------|');
      lines.push(`| Headers analyzed | ${biasData.statisticalSummary.totalHeadersAnalyzed} |`);
      lines.push(`| Headers with bias indicators | ${biasData.statisticalSummary.headersWithBias} |`);
      lines.push(`| Dataset quality score | ${(biasData.statisticalSummary.datasetQualityScore * 100).toFixed(1)}% |`);
      lines.push(`| Bias risk score | ${(biasData.statisticalSummary.biasRiskScore * 100).toFixed(1)}% |`);
      lines.push(`| Recommendation reliability | ${(biasData.statisticalSummary.recommendationReliabilityScore * 100).toFixed(1)}% |`);
      lines.push('');
      
      // Confidence Distribution
      const conf = biasData.statisticalSummary.confidenceDistribution;
      lines.push('### Analysis Confidence');
      lines.push('');
      lines.push('| Confidence Level | Count |');
      lines.push('|------------------|-------|');
      lines.push(`| High | ${conf.high} |`);
      lines.push(`| Medium | ${conf.medium} |`);
      lines.push(`| Low | ${conf.low} |`);
      lines.push('');
      
      // Statistical Significance
      const chi = biasData.statisticalSummary.chiSquareResults;
      lines.push('### Statistical Significance');
      lines.push('');
      lines.push(`- **Statistically significant headers**: ${chi.statisticallySignificantHeaders}`);
      lines.push(`- **Average chi-square value**: ${chi.averageChiSquare.toFixed(2)}`);
      lines.push(`- **Average p-value**: ${chi.averagePValue.toFixed(4)}`);
      lines.push('');
    }
    
    // CMS Distribution and Risk
    if (biasData.cmsDistribution && biasData.concentrationMetrics) {
      lines.push('### Platform Distribution & Risk');
      lines.push('');
      lines.push('| Metric | Value |');
      lines.push('|--------|-------|');
      lines.push(`| Total sites | ${biasData.cmsDistribution.totalSites} |`);
      lines.push(`| Concentration score (HHI) | ${(biasData.cmsDistribution.concentrationScore * 100).toFixed(1)}% |`);
      lines.push(`| Diversity index (Shannon) | ${biasData.cmsDistribution.diversityIndex.toFixed(2)} |`);
      lines.push(`| Effective platforms | ${biasData.concentrationMetrics.effectiveNumberOfPlatforms.toFixed(1)} |`);
      lines.push(`| Concentration risk | **${biasData.concentrationMetrics.concentrationRisk.toUpperCase()}** |`);
      lines.push(`| Overall bias risk | **${biasData.concentrationMetrics.overallBiasRisk.toUpperCase()}** |`);
      lines.push('');
      
      if (biasData.cmsDistribution.dominantPlatforms.length > 0) {
        lines.push(`**Dominant platforms**: ${biasData.cmsDistribution.dominantPlatforms.join(', ')}`);
        lines.push('');
      }
    }
    
    // Bias Warnings
    if (biasData.biasWarnings && biasData.biasWarnings.length > 0) {
      lines.push('### Bias Warnings');
      lines.push('');
      biasData.biasWarnings.forEach(warning => {
        const severity = warning.severity;
        const icon = severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : 'ℹ️';
        lines.push(`${icon} **${severity.toUpperCase()}**: ${warning.message}`);
        if (warning.recommendation) {
          lines.push(`   > Recommendation: ${warning.recommendation}`);
        }
        lines.push('');
      });
    }
    
    // Platform Specificity Scores - Split into CMS and Non-CMS tables
    if (biasData.headerCorrelations && biasData.headerCorrelations.size > 0) {
      const allHeaders = Array.from(biasData.headerCorrelations.entries())
        .sort(([,a], [,b]) => (b.platformSpecificity.score) - (a.platformSpecificity.score));
      
      // Separate CMS-specific headers (>90% specificity with known CMS) from others
      const cmsSpecificHeaders = allHeaders.filter(([_header, correlation]) => {
        const score = correlation.platformSpecificity.score;
        const topCMS = correlation.platformSpecificity.discriminativeDetails?.topCMS;
        
        return score > 0.9 && topCMS;
      });
      
      const otherPlatformHeaders = allHeaders.filter(([_header, correlation]) => {
        const score = correlation.platformSpecificity.score;
        const topCMS = correlation.platformSpecificity.discriminativeDetails?.topCMS;
        
        return !(score > 0.9 && topCMS);
      }).slice(0, 10); // Limit other headers to top 10
      
      // CMS-Specific Headers Table
      if (cmsSpecificHeaders.length > 0) {
        lines.push('### CMS-Specific Headers (>90% Platform Affinity)');
        lines.push('');
        lines.push('*Headers that are strongly correlated with specific CMS platforms and likely indicate dataset bias toward those platforms.*');
        lines.push('');
        lines.push('| Rank | Header | CMS | Affinity | Coverage | Exclusivity | Sites | P-value |');
        lines.push('|------|--------|-----|----------|----------|-------------|-------|---------|');
        
        cmsSpecificHeaders.forEach(([header, correlation], index) => {
          const score = correlation.platformSpecificity.score;
          const details = correlation.platformSpecificity.discriminativeDetails;
          const topCMS = details?.topCMS || 'Unknown';
          
          // Get CMS-specific metrics
          const cmsMetrics = correlation.perCMSMetrics.get(topCMS);
          const coverage = cmsMetrics ? (cmsMetrics.frequency * 100).toFixed(1) : 'N/A';
          const exclusivity = details ? (details.topCMSProbability * 100).toFixed(1) : 'N/A';
          const sites = correlation.overallMetrics.occurrences;
          const pValue = cmsMetrics?.isStatisticallySignificant ? '<0.05' : '>0.05';
          
          lines.push(`| ${index + 1} | \`${header}\` | ${topCMS} | ${(score * 100).toFixed(1)}% | ${coverage}% | ${exclusivity}% | ${sites} | ${pValue} |`);
        });
        lines.push('');
        lines.push('**Legend:**');
        lines.push('- **Coverage**: % of CMS sites that have this header');
        lines.push('- **Exclusivity**: % of sites with this header that use this CMS');
        lines.push('- **Sites**: Total number of sites with this header');
        lines.push('- **P-value**: Statistical significance of the correlation');
        lines.push('');
      }
      
      // Other Platform-Specific Headers Table
      if (otherPlatformHeaders.length > 0) {
        lines.push('### Other Platform-Specific Headers');
        lines.push('');
        lines.push('*Headers tied to CDN, infrastructure, security, or other non-CMS platforms.*');
        lines.push('');
        lines.push('| Rank | Header | Affinity | Sites | Top Platform | Top % | Why Not CMS |');
        lines.push('|------|--------|----------|-------|--------------|-------|-------------|');
        
        otherPlatformHeaders.forEach(([header, correlation], index) => {
          const score = correlation.platformSpecificity.score;
          const sites = correlation.overallMetrics.occurrences;
          
          // Determine top platform from conditional probabilities
          let topPlatform = 'Mixed';
          let topPercentage = 0;
          let whyNotCMS = 'Low coverage';
          
          if (correlation.conditionalProbabilities.cmsGivenHeader.size > 0) {
            // Find the top platform (including non-CMS)
            const sortedPlatforms = Array.from(correlation.conditionalProbabilities.cmsGivenHeader.entries())
              .sort(([, a], [, b]) => b.probability - a.probability);
            
            if (sortedPlatforms.length > 0) {
              topPlatform = sortedPlatforms[0][0];
              topPercentage = sortedPlatforms[0][1].probability * 100;
              
              // Determine why it's not CMS-specific
              if (topPlatform === 'Unknown' || topPlatform === 'undefined') {
                whyNotCMS = 'No CMS detected';
              } else if (['CDN', 'Enterprise'].includes(topPlatform)) {
                whyNotCMS = 'Infrastructure';
              } else if (topPercentage < 40) {
                whyNotCMS = 'Low concentration';
              } else if (sites < 30) {
                whyNotCMS = 'Small sample';
              } else {
                // Check coverage on the top CMS
                const cmsMetrics = correlation.perCMSMetrics.get(topPlatform);
                if (cmsMetrics && cmsMetrics.frequency < 0.1) {
                  whyNotCMS = 'Low CMS coverage';
                }
              }
            }
          }
          
          lines.push(`| ${index + 1} | \`${header}\` | ${(score * 100).toFixed(1)}% | ${sites} | ${topPlatform} | ${topPercentage.toFixed(1)}% | ${whyNotCMS} |`);
        });
        lines.push('');
        lines.push('**Legend:**');
        lines.push('- **Sites**: Total number of sites with this header');
        lines.push('- **Top Platform**: Most common platform/CMS for sites with this header');
        lines.push('- **Top %**: Percentage of sites with this header that have the top platform');
        lines.push('- **Why Not CMS**: Reason this header isn\'t in the CMS-specific table');
        lines.push('');
      }
    }
  }
  
  return lines.join('\n');
}