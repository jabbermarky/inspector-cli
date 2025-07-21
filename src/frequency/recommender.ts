import { createModuleLogger } from '../utils/logger.js';
import { GENERIC_HTTP_HEADERS } from '../learn/filtering.js';
import { analyzeDatasetBias, type DatasetBiasAnalysis, type HeaderCMSCorrelation, isEnterpriseInfrastructureHeader } from './bias-detector.js';
import type { DetectionDataPoint, FrequencyOptionsWithDefaults, LearnRecommendations, DetectCmsRecommendations, GroundTruthRecommendations } from './types.js';
import type { HeaderPattern } from './header-analyzer.js';

const logger = createModuleLogger('frequency-recommender');

export interface RecommendationInput {
  headerPatterns: Map<string, HeaderPattern[]>;
  metaPatterns: Map<string, any[]>;
  scriptPatterns: Map<string, any[]>;
  dataPoints: DetectionDataPoint[];
  options: FrequencyOptionsWithDefaults;
  biasAnalysis?: DatasetBiasAnalysis;
}

/**
 * Generate recommendations for learn, detect-cms, and ground-truth commands
 */
export async function generateRecommendations(input: RecommendationInput): Promise<{
  learn: LearnRecommendations;
  detectCms: DetectCmsRecommendations;
  groundTruth: GroundTruthRecommendations;
}> {
  logger.info('Generating filter and detection recommendations');
  
  // Perform bias analysis if not provided
  let biasAnalysis = input.biasAnalysis;
  if (!biasAnalysis) {
    logger.info('Performing dataset bias analysis');
    biasAnalysis = await analyzeDatasetBias(input.dataPoints, input.options);
  }
  
  // Generate bias-aware recommendations
  const inputWithBias = { ...input, biasAnalysis };
  const learnRecommendations = generateLearnRecommendations(inputWithBias);
  const detectCmsRecommendations = generateDetectCmsRecommendations(inputWithBias);
  const groundTruthRecommendations = generateGroundTruthRecommendations(inputWithBias);
  
  logger.info('Recommendation generation complete', {
    biasWarnings: biasAnalysis.biasWarnings.length,
    concentrationScore: biasAnalysis.concentrationScore
  });
  
  return {
    learn: learnRecommendations,
    detectCms: detectCmsRecommendations,
    groundTruth: groundTruthRecommendations
  };
}

/**
 * Generate recommendations for learn command filtering with bias awareness
 */
function generateLearnRecommendations(input: RecommendationInput & { biasAnalysis: DatasetBiasAnalysis }): LearnRecommendations {
  const { headerPatterns, options, biasAnalysis } = input;
  
  // Get currently filtered headers from discriminative filtering
  const currentlyFiltered = Array.from(GENERIC_HTTP_HEADERS);
  
  const recommendToFilter: LearnRecommendations['recommendToFilter'] = [];
  const recommendToKeep: LearnRecommendations['recommendToKeep'] = [];
  
  // Analyze each header for filtering recommendations using bias analysis
  for (const [headerName, patterns] of headerPatterns.entries()) {
    const isCurrentlyFiltered = currentlyFiltered.includes(headerName);
    const correlation = biasAnalysis.headerCorrelations.get(headerName);
    
    // Calculate overall frequency and diversity for this header
    const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0);
    const diversity = patterns.length; // Number of unique values
    const maxFrequency = Math.max(...patterns.map(p => p.frequency));
    
    // Use bias-aware logic if correlation data is available, otherwise fall back to original logic
    const useBiasAware = correlation !== undefined;
    
    if (!isCurrentlyFiltered) {
      // Should this header be filtered?
      const shouldFilter = useBiasAware 
        ? shouldFilterHeaderBiasAware(headerName, correlation, totalFrequency, diversity)
        : shouldFilterHeader(headerName, totalFrequency, diversity, maxFrequency);
      
      if (shouldFilter) {
        const reason = useBiasAware 
          ? getFilterReasonBiasAware(correlation, totalFrequency, diversity)
          : getFilterReason(totalFrequency, diversity, maxFrequency);
        recommendToFilter.push({
          pattern: headerName,
          reason,
          frequency: totalFrequency,
          diversity
        });
      } else {
        const shouldKeep = useBiasAware
          ? shouldKeepHeaderBiasAware(headerName, correlation, totalFrequency, diversity)
          : shouldKeepHeader(headerName, totalFrequency, diversity, maxFrequency);
        
        if (shouldKeep) {
          const reason = useBiasAware
            ? getKeepReasonBiasAware(correlation, totalFrequency, diversity)
            : getKeepReason(totalFrequency, diversity, maxFrequency);
          recommendToKeep.push({
            pattern: headerName,
            reason,
            frequency: totalFrequency,
            diversity
          });
        }
      }
    } else {
      // Should this currently filtered header be kept (unfiltered)?
      const shouldKeep = useBiasAware
        ? shouldKeepHeaderBiasAware(headerName, correlation, totalFrequency, diversity)
        : shouldKeepHeader(headerName, totalFrequency, diversity, maxFrequency);
      
      if (shouldKeep) {
        const reason = useBiasAware
          ? getKeepReasonBiasAware(correlation, totalFrequency, diversity)
          : getKeepReason(totalFrequency, diversity, maxFrequency);
        recommendToKeep.push({
          pattern: headerName,
          reason,
          frequency: totalFrequency,
          diversity
        });
      }
    }
  }
  
  // Sort recommendations by bias-adjusted frequency and platform specificity
  recommendToFilter.sort((a, b) => {
    const aCorr = biasAnalysis.headerCorrelations.get(a.pattern);
    const bCorr = biasAnalysis.headerCorrelations.get(b.pattern);
    if (!aCorr || !bCorr) return b.frequency - a.frequency;
    return bCorr.biasAdjustedFrequency - aCorr.biasAdjustedFrequency;
  });
  
  recommendToKeep.sort((a, b) => {
    const aCorr = biasAnalysis.headerCorrelations.get(a.pattern);
    const bCorr = biasAnalysis.headerCorrelations.get(b.pattern);
    if (!aCorr || !bCorr) return a.frequency - b.frequency;
    return bCorr.platformSpecificity - aCorr.platformSpecificity;
  });
  
  return {
    currentlyFiltered: currentlyFiltered as string[],
    recommendToFilter: recommendToFilter.slice(0, 10), // Top 10
    recommendToKeep: recommendToKeep.slice(0, 10) // Top 10
  };
}

/**
 * Generate recommendations for detect-cms command
 */
function generateDetectCmsRecommendations(input: RecommendationInput): DetectCmsRecommendations {
  const { headerPatterns, metaPatterns } = input;
  
  const newPatternOpportunities: DetectCmsRecommendations['newPatternOpportunities'] = [];
  const patternsToRefine: DetectCmsRecommendations['patternsToRefine'] = [];
  
  // Analyze headers for CMS detection opportunities
  for (const [headerName, patterns] of headerPatterns.entries()) {
    for (const pattern of patterns) {
      // Look for patterns with strong CMS correlation
      const strongCorrelations = Object.entries(pattern.cmsCorrelation)
        .filter(([cms, correlation]) => correlation > 0.8 && cms !== 'Unknown')
        .sort(([, a], [, b]) => b - a);
      
      if (strongCorrelations.length > 0 && pattern.frequency >= 0.05 && pattern.frequency <= 0.3) {
        newPatternOpportunities.push({
          pattern: pattern.pattern,
          frequency: pattern.frequency,
          confidence: pattern.confidence,
          cmsCorrelation: pattern.cmsCorrelation
        });
      }
      
      // Look for overly generic patterns (high frequency, low confidence)
      if (pattern.frequency > 0.3 && pattern.confidence < 0.5) {
        patternsToRefine.push({
          pattern: pattern.pattern,
          issue: 'Too generic - appears in most sites',
          currentFrequency: pattern.frequency
        });
      }
    }
  }
  
  // Sort by potential value
  newPatternOpportunities.sort((a, b) => (b.confidence * (1 - b.frequency)) - (a.confidence * (1 - a.frequency)));
  patternsToRefine.sort((a, b) => b.currentFrequency - a.currentFrequency);
  
  return {
    newPatternOpportunities: newPatternOpportunities.slice(0, 10),
    patternsToRefine: patternsToRefine.slice(0, 5)
  };
}

/**
 * Generate recommendations for ground-truth command
 */
function generateGroundTruthRecommendations(input: RecommendationInput): GroundTruthRecommendations {
  const { headerPatterns, metaPatterns } = input;
  
  // This would need to analyze existing ground-truth rules
  // For prototype, we'll provide a basic implementation
  const currentlyUsedPatterns: string[] = [
    'x-powered-by',
    'x-generator', 
    'server'
  ];
  
  const potentialNewRules: GroundTruthRecommendations['potentialNewRules'] = [];
  
  // Look for high-confidence, CMS-specific patterns in headers
  for (const [headerName, patterns] of headerPatterns.entries()) {
    for (const pattern of patterns) {
      if (pattern.confidence > 0.8 && pattern.frequency < 0.2) {
        const strongestCms = Object.entries(pattern.cmsCorrelation)
          .filter(([cms]) => cms !== 'Unknown')
          .sort(([, a], [, b]) => (b as number) - (a as number))[0];
        
        if (strongestCms && (strongestCms[1] as number) > 0.8) {
          potentialNewRules.push({
            pattern: pattern.pattern,
            confidence: pattern.confidence,
            suggestedRule: `Sites with "${pattern.pattern}" are likely ${strongestCms[0]}`
          });
        }
      }
    }
  }
  
  // Look for high-confidence, CMS-specific patterns in meta tags
  for (const [metaName, patterns] of metaPatterns.entries()) {
    for (const pattern of patterns) {
      if (pattern.confidence > 0.8 && pattern.frequency < 0.2) {
        const strongestCms = Object.entries(pattern.cmsCorrelation)
          .filter(([cms]) => cms !== 'Unknown')
          .sort(([, a], [, b]) => (b as number) - (a as number))[0];
        
        if (strongestCms && (strongestCms[1] as number) > 0.8) {
          potentialNewRules.push({
            pattern: pattern.pattern,
            confidence: pattern.confidence,
            suggestedRule: `Sites with "${pattern.pattern}" are likely ${strongestCms[0]}`
          });
        }
      }
    }
  }
  
  return {
    currentlyUsedPatterns,
    potentialNewRules: potentialNewRules.slice(0, 5)
  };
}

/**
 * Determine if a header should be filtered
 */
function shouldFilterHeader(headerName: string, frequency: number, diversity: number, maxFrequency: number): boolean {
  // High universality (>70% of sites)
  if (maxFrequency > 0.7) return true;
  
  // High diversity + high frequency (likely request IDs, timestamps, etc.)
  if (diversity > 20 && frequency > 0.5) return true;
  
  // Known generic patterns
  const genericPatterns = ['request-id', 'trace-id', 'timestamp', 'correlation-id'];
  if (genericPatterns.some(pattern => headerName.includes(pattern))) return true;
  
  return false;
}

/**
 * Determine if a currently filtered header should be kept
 */
function shouldKeepHeader(headerName: string, frequency: number, diversity: number, maxFrequency: number): boolean {
  // Low frequency but appears consistently (could be discriminative)
  if (maxFrequency < 0.3 && diversity <= 5) return true;
  
  // Platform-specific headers
  const platformHeaders = ['powered-by', 'generator', 'cms', 'framework'];
  if (platformHeaders.some(pattern => headerName.includes(pattern))) return true;
  
  return false;
}

/**
 * Get reason for filtering recommendation
 */
function getFilterReason(frequency: number, diversity: number, maxFrequency: number): string {
  if (maxFrequency > 0.8) return `Universal header (${Math.round(maxFrequency * 100)}% of sites)`;
  if (diversity > 20) return `High diversity (${diversity} unique values) suggests non-discriminative`;
  if (frequency > 0.6) return `High frequency (${Math.round(frequency * 100)}%) across platforms`;
  return 'Generic pattern with low discriminative value';
}

/**
 * Get reason for keeping recommendation  
 */
function getKeepReason(frequency: number, diversity: number, maxFrequency: number): string {
  if (maxFrequency < 0.2) return `Low frequency (${Math.round(maxFrequency * 100)}%) suggests discriminative value`;
  if (diversity <= 3) return `Low diversity (${diversity} values) suggests specific platforms`;
  return 'Potentially discriminative pattern worth preserving';
}

/**
 * Bias-aware filtering recommendation logic
 */
function shouldFilterHeaderBiasAware(
  headerName: string, 
  correlation: HeaderCMSCorrelation, 
  frequency: number, 
  diversity: number
): boolean {
  // NEVER filter headers with strong CMS correlation regardless of confidence
  const topCMS = Object.entries(correlation.perCMSFrequency)
    .filter(([cms]) => !['Unknown', 'Enterprise', 'CDN'].includes(cms))
    .sort(([, a], [, b]) => b.frequency - a.frequency)[0];
  
  if (topCMS && topCMS[1].frequency > 0.7) {
    return false; // Strong CMS correlation = discriminative value, DO NOT filter
  }
  
  // NEVER filter headers with high platform specificity
  if (correlation.platformSpecificity > 0.6) {
    return false; // High platform specificity = discriminative value, DO NOT filter
  }
  
  // Filter truly generic patterns that appear across all platforms equally
  if (correlation.platformSpecificity < 0.3 && correlation.biasAdjustedFrequency > 0.8) {
    return true; // Truly universal headers with no platform bias
  }
  
  // Check for generic request ID patterns (but only if they also have low platform specificity)
  const genericPatterns = ['request-id', 'trace-id', 'timestamp', 'correlation-id'];
  if (genericPatterns.some(pattern => headerName.includes(pattern)) && 
      correlation.platformSpecificity < 0.3 && 
      correlation.biasAdjustedFrequency > 0.6) {
    return true;
  }
  
  // High diversity + truly universal = likely non-discriminative
  if (diversity > 50 && correlation.platformSpecificity < 0.3 && correlation.biasAdjustedFrequency > 0.7) {
    return true;
  }
  
  // Enterprise infrastructure headers should only be filtered if they are truly generic
  if (isEnterpriseInfrastructureHeader(headerName)) {
    // Only filter if no CMS correlation AND very low platform specificity
    const hasCMSCorrelation = Object.entries(correlation.perCMSFrequency)
      .filter(([cms]) => !['Unknown', 'Enterprise', 'CDN'].includes(cms))
      .some(([, data]) => data.frequency > 0.5);
    
    if (hasCMSCorrelation || correlation.platformSpecificity > 0.4) {
      return false; // Keep infrastructure headers that show CMS correlation or platform specificity
    }
    
    // Only filter truly generic infrastructure headers
    if (correlation.platformSpecificity < 0.3 && correlation.biasAdjustedFrequency > 0.8) {
      return true;
    }
  }
  
  return false;
}

/**
 * Bias-aware keep recommendation logic
 */
function shouldKeepHeaderBiasAware(
  headerName: string, 
  correlation: HeaderCMSCorrelation, 
  frequency: number, 
  diversity: number
): boolean {
  // Strongly recommend keeping headers with high CMS correlation
  const topCMS = Object.entries(correlation.perCMSFrequency)
    .filter(([cms]) => !['Unknown', 'Enterprise', 'CDN'].includes(cms))
    .sort(([, a], [, b]) => b.frequency - a.frequency)[0];
  
  // Only consider it "strong CMS correlation" if BOTH high frequency AND high platform specificity
  if (topCMS && topCMS[1].frequency > 0.7 && correlation.platformSpecificity > 0.5) {
    return true; // Strong CMS correlation = highly discriminative, definitely keep
  }
  
  // Strongly recommend keeping headers with high platform specificity
  if (correlation.platformSpecificity > 0.6) {
    return true; // High platform specificity = discriminative value, definitely keep
  }
  
  // Platform-specific header name patterns should be kept
  const platformPatterns = ['powered-by', 'generator', 'cms', 'framework'];
  if (platformPatterns.some(pattern => headerName.includes(pattern))) {
    return true;
  }
  
  // Platform prefix patterns should be kept if they show any specificity
  if (isPlatformPrefixHeader(headerName) && correlation.platformSpecificity > 0.3) {
    return true;
  }
  
  // Enterprise infrastructure headers should be kept ONLY if they show platform specificity
  // For infrastructure headers, high frequency alone is not discriminative - they must show variation across platforms
  if (isEnterpriseInfrastructureHeader(headerName)) {
    if (correlation.platformSpecificity > 0.6) {
      return true; // Keep infrastructure headers only if they show high platform specificity
    }
    // If infrastructure header has low platform specificity, don't keep it regardless of frequency
    return false; // Early return for infrastructure headers with low specificity
  }
  
  // Keep headers that are moderately platform-specific even if not infrastructure
  if (correlation.platformSpecificity > 0.4 && correlation.biasAdjustedFrequency < 0.7) {
    return true;
  }
  
  // Keep headers that show moderate CMS correlation
  if (topCMS && topCMS[1].frequency > 0.5 && correlation.platformSpecificity > 0.3) {
    return true;
  }
  
  return false;
}

/**
 * Get bias-aware filtering reason
 */
function getFilterReasonBiasAware(
  correlation: HeaderCMSCorrelation, 
  frequency: number, 
  diversity: number
): string {
  const headerName = correlation.headerName;
  
  if (correlation.biasAdjustedFrequency > 0.8 && correlation.platformSpecificity < 0.2) {
    return `Universal header (${Math.round(correlation.biasAdjustedFrequency * 100)}% frequency, ${Math.round(correlation.platformSpecificity * 100)}% platform specificity)`;
  }
  
  if (diversity > 50 && correlation.platformSpecificity < 0.2) {
    return `High diversity (${diversity} values) with no platform specificity - likely non-discriminative`;
  }
  
  // Check for generic request ID patterns
  const genericPatterns = ['request-id', 'trace-id', 'timestamp', 'correlation-id'];
  if (genericPatterns.some(pattern => headerName.includes(pattern))) {
    return `Generic tracking header pattern with low discriminative value`;
  }
  
  if (isEnterpriseInfrastructureHeader(headerName) && correlation.platformSpecificity < 0.2) {
    return `Generic infrastructure header - appears across all enterprise websites`;
  }
  
  return `Generic pattern (${Math.round(correlation.biasAdjustedFrequency * 100)}% frequency) with minimal platform specificity`;
}

/**
 * Get bias-aware keep reason
 */
function getKeepReasonBiasAware(
  correlation: HeaderCMSCorrelation, 
  frequency: number, 
  diversity: number
): string {
  // Check for CMS-specific correlations first
  const topCMS = Object.entries(correlation.perCMSFrequency)
    .filter(([cms]) => !['Unknown', 'Enterprise', 'CDN'].includes(cms))
    .sort(([, a], [, b]) => b.frequency - a.frequency)[0];
  
  if (topCMS && topCMS[1].frequency > 0.7) {
    return `Strong correlation with ${topCMS[0]} (${Math.round(topCMS[1].frequency * 100)}%) - highly discriminative`;
  }
  
  if (correlation.platformSpecificity > 0.6) {
    return `High platform specificity (${Math.round(correlation.platformSpecificity * 100)}%) - excellent discriminative value`;
  }
  
  if (topCMS && topCMS[1].frequency > 0.5 && correlation.platformSpecificity > 0.3) {
    return `Moderate correlation with ${topCMS[0]} (${Math.round(topCMS[1].frequency * 100)}%) with platform specificity`;
  }
  
  if (isPlatformPrefixHeader(correlation.headerName)) {
    return `Platform-specific header pattern - likely discriminative for CMS detection`;
  }
  
  if (isEnterpriseInfrastructureHeader(correlation.headerName) && correlation.platformSpecificity > 0.4) {
    return `Infrastructure header with platform specificity - may indicate specific CMS configurations`;
  }
  
  if (correlation.platformSpecificity > 0.4) {
    return `Moderate platform specificity (${Math.round(correlation.platformSpecificity * 100)}%) - potentially discriminative`;
  }
  
  return `Shows discriminative potential (${Math.round(correlation.biasAdjustedFrequency * 100)}% frequency, ${Math.round(correlation.platformSpecificity * 100)}% specificity)`;
}

/**
 * Check if header follows platform prefix patterns
 */
function isPlatformPrefixHeader(headerName: string): boolean {
  const platformPrefixes = [
    'd-',           // Duda
    'x-wix-',       // Wix
    'x-wp-',        // WordPress
    'x-shopify-',   // Shopify
    'x-drupal-',    // Drupal
    'x-joomla-',    // Joomla
    'x-ghost-',     // Ghost
    'x-squarespace-', // Squarespace
    'x-webflow-',   // Webflow
    'x-kong-',      // Kong Gateway
    'x-nf-',        // Netlify
    'x-vercel-',    // Vercel
    'x-bz-'         // Unknown platform
  ];
  
  return platformPrefixes.some(prefix => headerName.toLowerCase().startsWith(prefix));
}