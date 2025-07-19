import { createModuleLogger } from '../utils/logger.js';
import { GENERIC_HTTP_HEADERS } from '../learn/filtering.js';
import type { DetectionDataPoint, FrequencyOptions, LearnRecommendations, DetectCmsRecommendations, GroundTruthRecommendations } from './types.js';
import type { HeaderPattern } from './header-analyzer.js';

const logger = createModuleLogger('frequency-recommender');

export interface RecommendationInput {
  headerPatterns: Map<string, HeaderPattern[]>;
  metaPatterns: Map<string, any[]>;
  scriptPatterns: Map<string, any[]>;
  dataPoints: DetectionDataPoint[];
  options: Required<FrequencyOptions>;
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
  
  const learnRecommendations = generateLearnRecommendations(input);
  const detectCmsRecommendations = generateDetectCmsRecommendations(input);
  const groundTruthRecommendations = generateGroundTruthRecommendations(input);
  
  logger.info('Recommendation generation complete');
  
  return {
    learn: learnRecommendations,
    detectCms: detectCmsRecommendations,
    groundTruth: groundTruthRecommendations
  };
}

/**
 * Generate recommendations for learn command filtering
 */
function generateLearnRecommendations(input: RecommendationInput): LearnRecommendations {
  const { headerPatterns, options } = input;
  
  // Get currently filtered headers from discriminative filtering
  const currentlyFiltered = Array.from(GENERIC_HTTP_HEADERS);
  
  const recommendToFilter: LearnRecommendations['recommendToFilter'] = [];
  const recommendToKeep: LearnRecommendations['recommendToKeep'] = [];
  
  // Analyze each header for filtering recommendations
  for (const [headerName, patterns] of headerPatterns.entries()) {
    const isCurrentlyFiltered = currentlyFiltered.includes(headerName);
    
    // Calculate overall frequency and diversity for this header
    const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0);
    const diversity = patterns.length; // Number of unique values
    const maxFrequency = Math.max(...patterns.map(p => p.frequency));
    
    // Recommendation logic
    if (!isCurrentlyFiltered) {
      // Should this header be filtered?
      if (shouldFilterHeader(headerName, totalFrequency, diversity, maxFrequency)) {
        recommendToFilter.push({
          pattern: headerName,
          reason: getFilterReason(totalFrequency, diversity, maxFrequency),
          frequency: totalFrequency,
          diversity
        });
      }
    } else {
      // Should this header be kept (unfiltered)?
      if (shouldKeepHeader(headerName, totalFrequency, diversity, maxFrequency)) {
        recommendToKeep.push({
          pattern: headerName,
          reason: getKeepReason(totalFrequency, diversity, maxFrequency),
          frequency: totalFrequency,
          diversity
        });
      }
    }
  }
  
  // Sort recommendations by frequency (most important first)
  recommendToFilter.sort((a, b) => b.frequency - a.frequency);
  recommendToKeep.sort((a, b) => a.frequency - b.frequency);
  
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
      if (pattern.frequency > 0.7 && pattern.confidence < 0.3) {
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
  
  // Look for high-confidence, CMS-specific patterns
  for (const [headerName, patterns] of headerPatterns.entries()) {
    for (const pattern of patterns) {
      if (pattern.confidence > 0.8 && pattern.frequency < 0.2) {
        const strongestCms = Object.entries(pattern.cmsCorrelation)
          .filter(([cms]) => cms !== 'Unknown')
          .sort(([, a], [, b]) => b - a)[0];
        
        if (strongestCms && strongestCms[1] > 0.8) {
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