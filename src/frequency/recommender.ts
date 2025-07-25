import { createModuleLogger } from '../utils/logger.js';
import { analyzeDatasetBias, type DatasetBiasAnalysis, type HeaderCMSCorrelation } from './bias-detector.js';
import type { DetectionDataPoint, FrequencyOptionsWithDefaults, LearnRecommendations, DetectCmsRecommendations, GroundTruthRecommendations } from './types.js';
import type { HeaderPattern } from './header-analyzer.js';
import { DataPreprocessor, type HeaderClassification } from './data-preprocessor.js';

const logger = createModuleLogger('frequency-recommender');

export interface RecommendationInput {
  headerPatterns: Map<string, HeaderPattern[]>;
  metaPatterns: Map<string, any[]>;
  scriptPatterns: Map<string, any[]>;
  dataPoints: DetectionDataPoint[];
  options: FrequencyOptionsWithDefaults;
  biasAnalysis?: DatasetBiasAnalysis;
  preprocessor?: DataPreprocessor;
}

/**
 * Generate recommendations for learn, detect-cms, and ground-truth commands
 */
// isCMSIndicativeHeader function removed - use DataPreprocessor.classifyHeader() instead

export async function generateRecommendations(input: RecommendationInput): Promise<{
  learn: LearnRecommendations;
  detectCms: DetectCmsRecommendations;
  groundTruth: GroundTruthRecommendations;
  biasAnalysis: DatasetBiasAnalysis;
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
    groundTruth: groundTruthRecommendations,
    biasAnalysis
  };
}

/**
 * Generate recommendations for learn command filtering with bias awareness
 */
function generateLearnRecommendations(input: RecommendationInput & { biasAnalysis: DatasetBiasAnalysis }): LearnRecommendations {
  const { headerPatterns, options, biasAnalysis } = input;
  const preprocessor = input.preprocessor || new DataPreprocessor();
  
  // Get currently filtered headers using centralized classification
  // This integrates V2 architecture data with the legacy recommendation system
  const currentlyFiltered = Array.from(headerPatterns.keys()).filter(headerName => {
    const classification = preprocessor.classifyHeader(headerName);
    return classification.filterRecommendation === 'always-filter';
  });
  
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
      // Check if this header should be filtered using centralized classification
      const classification = preprocessor.classifyHeader(headerName);
      // Don't filter context-dependent headers that have high CMS correlation
      const hasHighCMSCorrelation = correlation && 
        Object.values(correlation.cmsGivenHeader).some(cms => cms.probability > 0.7);
      
      const shouldFilter = classification.filterRecommendation === 'always-filter' ||
        (classification.filterRecommendation === 'context-dependent' && 
         !hasHighCMSCorrelation &&
         preprocessor.shouldFilterHeader(headerName, { frequency: totalFrequency, diversity, maxFrequency }));
      
      if (shouldFilter) {
        const reason = useBiasAware 
          ? getFilterReasonBiasAware(correlation, totalFrequency, diversity, preprocessor)
          : getFilterReason(totalFrequency, diversity, maxFrequency);
        recommendToFilter.push({
          pattern: headerName,
          reason,
          frequency: totalFrequency,
          diversity
        });
      } else {
        const shouldKeep = classification.filterRecommendation === 'never-filter' ||
          (useBiasAware && correlation && shouldKeepBasedOnCorrelation(headerName, correlation, totalFrequency, diversity, classification));
        
        if (shouldKeep) {
          const reason = useBiasAware
            ? getKeepReasonBiasAware(correlation, totalFrequency, diversity, preprocessor)
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
      const classification = preprocessor.classifyHeader(headerName);
      const shouldKeep = classification.filterRecommendation === 'never-filter' ||
        (useBiasAware && correlation && shouldKeepBasedOnCorrelation(headerName, correlation, totalFrequency, diversity, classification));
      
      if (shouldKeep) {
        const reason = useBiasAware
          ? getKeepReasonBiasAware(correlation, totalFrequency, diversity, preprocessor)
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
    
    // Primary sort: Platform specificity (higher first)
    if (Math.abs(bCorr.platformSpecificity - aCorr.platformSpecificity) > 0.01) {
      return bCorr.platformSpecificity - aCorr.platformSpecificity;
    }
    
    // Secondary sort for ties: Prefer platform-prefix headers
    const aClassification = preprocessor.classifyHeader(a.pattern);
    const bClassification = preprocessor.classifyHeader(b.pattern);
    const aIsPlatformPrefix = aClassification.category === 'platform';
    const bIsPlatformPrefix = bClassification.category === 'platform';
    if (aIsPlatformPrefix !== bIsPlatformPrefix) {
      return bIsPlatformPrefix ? 1 : -1; // Platform prefix headers first
    }
    
    // Tertiary sort: Higher frequency first
    return b.frequency - a.frequency;
  });
  
  // Separate platform-specific headers from general recommendations
  // Include both prefix-based headers AND bias-aware platform-specific headers
  const platformSpecificHeaders = recommendToKeep.filter(r => {
    const classification = preprocessor.classifyHeader(r.pattern);
    const hasPrefix = classification.category === 'platform';
    const correlation = biasAnalysis.headerCorrelations.get(r.pattern);
    const hasPlatformSpecificity = correlation && correlation.platformSpecificity > 0.8; // Very high threshold
    
    return hasPrefix || hasPlatformSpecificity;
  });
  const generalHeaders = recommendToKeep.filter(r => {
    const classification = preprocessor.classifyHeader(r.pattern);
    const hasPrefix = classification.category === 'platform';
    const correlation = biasAnalysis.headerCorrelations.get(r.pattern);
    const hasPlatformSpecificity = correlation && correlation.platformSpecificity > 0.8;
    
    return !hasPrefix && !hasPlatformSpecificity;
  });
  
  
  // Always include ALL platform-specific headers, then add up to 10 general headers
  // If there are 10+ platform headers, we exceed the normal limit to ensure they're all included
  const maxGeneralHeaders = 10; // Always allow up to 10 general headers in addition to platform-specific
  const finalKeepRecommendations = [
    ...platformSpecificHeaders,
    ...generalHeaders.slice(0, maxGeneralHeaders)
  ];
  
  // If we have more platform-specific headers than the normal limit, we exceed 10
  // This ensures ALL platform-specific headers are always included
  
  return {
    currentlyFiltered: currentlyFiltered as string[],
    recommendToFilter: recommendToFilter.slice(0, 10), // Top 10
    recommendToKeep: finalKeepRecommendations // All platform-specific + up to 10 total
  };
}

/**
 * Generate recommendations for detect-cms command
 */
function generateDetectCmsRecommendations(input: RecommendationInput & { biasAnalysis: DatasetBiasAnalysis }): DetectCmsRecommendations {
  const { headerPatterns, metaPatterns, biasAnalysis } = input;
  const preprocessor = input.preprocessor || new DataPreprocessor();
  
  const newPatternOpportunities: DetectCmsRecommendations['newPatternOpportunities'] = [];
  const patternsToRefine: DetectCmsRecommendations['patternsToRefine'] = [];

  // Analyze headers for CMS detection opportunities using bias analysis
  for (const [headerName, patterns] of headerPatterns.entries()) {
    // Skip headers that should always be filtered using centralized classification
    const classification = preprocessor.classifyHeader(headerName);
    if (classification.filterRecommendation === 'always-filter') {
      continue; // Skip Group 1 headers
    }
    
    // Check if this header should be filtered based on context
    const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0);
    const diversity = patterns.length;
    const maxFrequency = Math.max(...patterns.map(p => p.frequency));
    
    if (classification.filterRecommendation === 'context-dependent' &&
        preprocessor.shouldFilterHeader(headerName, { frequency: totalFrequency, diversity, maxFrequency })) {
      continue; // Skip headers that should be filtered based on context
    }
    
    const correlation = biasAnalysis.headerCorrelations.get(headerName);
    
    // If no correlation data, still try basic frequency-based analysis
    if (!correlation) {
      // Look for headers that might be CMS-indicative based on frequency
      const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0);
      
      // Low-frequency headers might be discriminative
      const classification = preprocessor.classifyHeader(headerName);
      if (totalFrequency >= 0.01 && totalFrequency <= 0.15 && classification.category === 'cms-indicative') {
        // Create basic CMS correlation based on header name patterns
        let cmsGuess = 'CMS';
        if (headerName.includes('shopify')) cmsGuess = 'Shopify';
        else if (headerName.includes('wordpress') || headerName.includes('wp-')) cmsGuess = 'WordPress';
        else if (headerName.includes('drupal')) cmsGuess = 'Drupal';
        else if (headerName.includes('joomla')) cmsGuess = 'Joomla';
        else if (headerName.includes('generator')) cmsGuess = 'CMS';
        else if (headerName.includes('powered-by')) cmsGuess = 'CMS';
        
        newPatternOpportunities.push({
          pattern: headerName,
          frequency: totalFrequency,
          confidence: 0.6, // Medium confidence without correlation data
          cmsCorrelation: { [cmsGuess]: 0.6 }
        });
      }
      continue;
    }
    
    // Find the most correlated CMS using P(CMS|header)
    const topCMS = Object.entries(correlation.cmsGivenHeader)
      .filter(([cms]) => !['Unknown', 'Enterprise', 'CDN'].includes(cms))
      .sort(([, a], [, b]) => b.probability - a.probability)[0];
    
    if (topCMS && topCMS[1].probability > 0.5 && topCMS[1].count >= 10) {
      // Strong pattern opportunity
      const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0);
      
      if (totalFrequency >= 0.01 && totalFrequency <= 0.3) { // 1-30% frequency range
        const cmsCorrelation: Record<string, number> = {};
        for (const [cms, data] of Object.entries(correlation.cmsGivenHeader)) {
          cmsCorrelation[cms] = data.probability;
        }
        
        newPatternOpportunities.push({
          pattern: headerName,
          frequency: totalFrequency,
          confidence: topCMS[1].probability,
          cmsCorrelation
        });
      }
    }
    
    // Look for overly generic patterns (high frequency, low specificity)
    // totalFrequency already calculated above
    if (totalFrequency > 0.3 && correlation.platformSpecificity < 0.2) {
      patternsToRefine.push({
        pattern: headerName,
        issue: 'Too generic - appears in most sites',
        currentFrequency: totalFrequency
      });
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
  const preprocessor = input.preprocessor || new DataPreprocessor();
  
  // Find currently used patterns based on actual data
  const currentlyUsedPatterns: string[] = [];
  const potentialNewRules: GroundTruthRecommendations['potentialNewRules'] = [];
  
  // Identify headers that are already being used for ground-truth (high confidence, CMS-indicative)
  for (const [headerName, patterns] of headerPatterns.entries()) {
    const classification = preprocessor.classifyHeader(headerName);
    if (classification.category === 'cms-indicative') {
      currentlyUsedPatterns.push(headerName);
    }
  }
  
  // Look for patterns that could be good ground-truth rules
  for (const [headerName, patterns] of headerPatterns.entries()) {
    // Skip headers already in use
    if (currentlyUsedPatterns.includes(headerName)) continue;
    
    for (const pattern of patterns) {
      // Look for discriminative patterns (medium-high confidence, not too common)
      if (pattern.frequency >= 0.02 && pattern.frequency <= 0.3) {
        // Check if it's a CMS-indicative header or has distinctive values
        // Convert Set to Array if needed for .some() method
        const examplesArray = Array.isArray(pattern.examples) ? pattern.examples : Array.from(pattern.examples || []);
        const hasDistinctiveValues = examplesArray.some(example => 
          /wordpress|drupal|joomla|shopify|woocommerce|magento|prestashop/i.test(String(example))
        );
        
        const classification = preprocessor.classifyHeader(headerName);
        if (classification.category === 'cms-indicative' || hasDistinctiveValues) {
          // Determine the most likely CMS from correlation data
          const strongestCms = Object.entries(pattern.cmsCorrelation || {})
            .filter(([cms]) => cms !== 'Unknown')
            .sort(([, a], [, b]) => (b as number) - (a as number))[0];
            
          const cmsName = strongestCms ? strongestCms[0] : 'specific CMS';
          
          potentialNewRules.push({
            pattern: pattern.pattern,
            confidence: pattern.confidence,
            suggestedRule: `Sites with "${headerName}" containing "${examplesArray[0] || 'specific values'}" are likely ${cmsName}`
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

// shouldFilterHeader function removed - use DataPreprocessor.shouldFilterHeader() instead

// shouldKeepHeader function removed - use DataPreprocessor.shouldFilterHeader() instead

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
 * Get reason for keeping recommendation when correlation data is not available
 */
function getKeepReason(frequency: number, diversity: number, maxFrequency: number): string {
  if (maxFrequency < 0.2) return `Low frequency (${Math.round(maxFrequency * 100)}%) - insufficient data for correlation analysis`;
  if (diversity <= 3) return `Low diversity (${diversity} values) may indicate platform-specific usage`;
  return 'Insufficient data to determine if pattern is discriminative';
}

// shouldFilterHeaderBiasAware function removed - use DataPreprocessor.shouldFilterHeader() instead

/**
 * Bias-aware keep recommendation logic
 */
// shouldKeepHeaderBiasAware function removed - use DataPreprocessor.shouldFilterHeader() instead

/**
 * Helper function to determine if header should be kept based on correlation data and classification
 */
function shouldKeepBasedOnCorrelation(
  headerName: string, 
  correlation: HeaderCMSCorrelation, 
  frequency: number, 
  diversity: number,
  classification: HeaderClassification
): boolean {
  // Never keep headers that should always be filtered
  if (classification.filterRecommendation === 'always-filter') {
    return false;
  }
  
  // Always keep headers with platform names
  if (classification.filterRecommendation === 'never-filter') {
    return true;
  }
  
  // For context-dependent headers, use correlation analysis
  const topCMSByProbability = Object.entries(correlation.cmsGivenHeader)
    .filter(([cms]) => !['Unknown', 'Enterprise', 'CDN'].includes(cms))
    .sort(([, a], [, b]) => b.probability - a.probability)[0];
  
  // Strong CMS correlation suggests discriminative value
  if (topCMSByProbability && 
      topCMSByProbability[1].probability > 0.5 && 
      topCMSByProbability[1].count >= 10) {
    return true;
  }
  
  // High platform specificity suggests discriminative value
  if (correlation.platformSpecificity > 0.6) {
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
  diversity: number,
  preprocessor: DataPreprocessor
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
  
  const classification = preprocessor.classifyHeader(headerName);
  if ((classification.category === 'infrastructure' || classification.category === 'generic') && correlation.platformSpecificity < 0.2) {
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
  diversity: number,
  preprocessor: DataPreprocessor
): string {
  // Check for CMS-specific correlations using P(CMS|header)
  const topCMSByProbability = Object.entries(correlation.cmsGivenHeader)
    .filter(([cms]) => !['Unknown', 'Enterprise', 'CDN'].includes(cms))
    .sort(([, a], [, b]) => b.probability - a.probability)[0];
  
  if (topCMSByProbability && topCMSByProbability[1].probability > 0.5) {
    const percentage = Math.round(topCMSByProbability[1].probability * 100);
    const sampleSize = topCMSByProbability[1].count;
    return `Strong correlation with ${topCMSByProbability[0]} (${percentage}% of sites with this header, ${sampleSize} sites)`;
  }
  
  if (correlation.platformSpecificity > 0.6) {
    // Check if we have sufficient CMS correlation data to make this claim
    const topCMSByProbability = Object.entries(correlation.cmsGivenHeader)
      .filter(([cms]) => !['Unknown', 'Enterprise', 'CDN'].includes(cms))
      .sort(([, a], [, b]) => b.probability - a.probability)[0];
    
    // Only claim "high platform specificity" if we have strong correlation data
    if (topCMSByProbability && 
        topCMSByProbability[1].count >= 10 && 
        topCMSByProbability[1].probability >= 0.6) {
      return `High platform specificity (${Math.round(correlation.platformSpecificity * 100)}%) - excellent discriminative value`;
    } else {
      // Platform specificity calculation exists but lacks sufficient correlation data or strength
      return `High calculated platform specificity but insufficient correlation data to confirm discriminative value (sample: ${topCMSByProbability?.[1]?.count || 0} sites, ${Math.round((topCMSByProbability?.[1]?.probability || 0) * 100)}% correlation)`;
    }
  }
  
  if (topCMSByProbability && topCMSByProbability[1].probability > 0.3 && correlation.platformSpecificity > 0.3) {
    const percentage = Math.round(topCMSByProbability[1].probability * 100);
    const sampleSize = topCMSByProbability[1].count;
    return `Strong correlation with ${topCMSByProbability[0]} (${percentage}% of sites with this header, ${sampleSize} sites)`;
  }
  
  const classification = preprocessor.classifyHeader(correlation.headerName);
  if (classification.category === 'platform') {
    return `Platform-specific header pattern (identified by name prefix) - likely discriminative for CMS detection`;
  }
  
  if ((classification.category === 'infrastructure' || classification.category === 'generic') && correlation.platformSpecificity > 0.4) {
    return `Infrastructure header (identified by name pattern) with platform specificity - may indicate specific CMS configurations`;
  }
  
  if (correlation.platformSpecificity > 0.4) {
    return `Moderate platform specificity (${Math.round(correlation.platformSpecificity * 100)}%) - potentially discriminative`;
  }
  
  return `Shows discriminative potential (${Math.round(correlation.biasAdjustedFrequency * 100)}% frequency, ${Math.round(correlation.platformSpecificity * 100)}% specificity)`;
}

// isPlatformPrefixHeader function removed - use DataPreprocessor.classifyHeader() instead

// hasCMSNameInHeaderValue function removed - use DataPreprocessor.classifyHeader() instead