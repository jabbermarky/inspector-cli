import { createModuleLogger } from '../utils/logger.js';
import type { DetectionDataPoint, FrequencyOptionsWithDefaults } from './types.js';

const logger = createModuleLogger('frequency-bias-detector');

export interface CMSDistribution {
  [cmsName: string]: {
    count: number;
    percentage: number;
    sites: string[];
  };
}

export interface HeaderCMSCorrelation {
  headerName: string;
  overallFrequency: number;
  overallOccurrences: number;
  perCMSFrequency: Record<string, {
    frequency: number;
    occurrences: number;
    totalSitesForCMS: number;
  }>;
  platformSpecificity: number; // 0-1 score: how specific to particular platforms
  biasAdjustedFrequency: number; // frequency adjusted for dataset composition
  recommendationConfidence: 'high' | 'medium' | 'low';
  biasWarning?: string;
}

export interface DatasetBiasAnalysis {
  cmsDistribution: CMSDistribution;
  totalSites: number;
  concentrationScore: number; // 0-1: how concentrated dataset is in specific platforms
  biasWarnings: string[];
  headerCorrelations: Map<string, HeaderCMSCorrelation>;
}

/**
 * Analyze dataset composition and detect potential bias
 */
export async function analyzeDatasetBias(
  dataPoints: DetectionDataPoint[],
  options: FrequencyOptionsWithDefaults
): Promise<DatasetBiasAnalysis> {
  logger.info('Starting dataset bias analysis', { totalSites: dataPoints.length });
  
  // Step 1: Calculate CMS distribution
  const cmsDistribution = calculateCMSDistribution(dataPoints);
  
  // Step 2: Calculate concentration score
  const concentrationScore = calculateConcentrationScore(cmsDistribution);
  
  // Step 3: Generate bias warnings
  const biasWarnings = generateBiasWarnings(cmsDistribution, concentrationScore);
  
  // Step 4: Analyze header-CMS correlations
  const headerCorrelations = analyzeHeaderCMSCorrelations(dataPoints, cmsDistribution);
  
  logger.info('Dataset bias analysis complete', {
    cmsTypes: Object.keys(cmsDistribution).length,
    concentrationScore,
    biasWarnings: biasWarnings.length,
    headerCorrelations: headerCorrelations.size
  });
  
  return {
    cmsDistribution,
    totalSites: dataPoints.length,
    concentrationScore,
    biasWarnings,
    headerCorrelations
  };
}

/**
 * Calculate CMS distribution in the dataset with enhanced categorization
 */
function calculateCMSDistribution(dataPoints: DetectionDataPoint[]): CMSDistribution {
  const cmsStats: Record<string, { count: number; sites: string[] }> = {};
  
  for (const dataPoint of dataPoints) {
    let detectedCms = 'Unknown';
    
    // Get the highest confidence CMS detection
    if (dataPoint.detectionResults?.length > 0) {
      const bestDetection = dataPoint.detectionResults
        .sort((a, b) => b.confidence - a.confidence)[0];
      detectedCms = bestDetection?.cms || 'Unknown';
    }
    
    // If no CMS detected, try to categorize the website type
    if (detectedCms === 'Unknown') {
      const category = calculateWebsiteCategory(dataPoint.httpHeaders, dataPoint.detectionResults);
      if (category === 'enterprise') {
        detectedCms = 'Enterprise'; // Separate enterprise sites from generic "Unknown"
      } else if (category === 'cdn') {
        detectedCms = 'CDN';
      }
      // Keep 'Unknown' for sites that don't clearly fit other categories
    }
    
    if (!cmsStats[detectedCms]) {
      cmsStats[detectedCms] = { count: 0, sites: [] };
    }
    
    cmsStats[detectedCms].count++;
    cmsStats[detectedCms].sites.push(dataPoint.url);
  }
  
  // Convert to distribution with percentages
  const totalSites = dataPoints.length;
  const distribution: CMSDistribution = {};
  
  for (const [cms, stats] of Object.entries(cmsStats)) {
    distribution[cms] = {
      count: stats.count,
      percentage: (stats.count / totalSites) * 100,
      sites: stats.sites
    };
  }
  
  return distribution;
}

/**
 * Calculate how concentrated the dataset is in specific platforms
 * Returns 0-1 where 1 means highly concentrated (biased)
 */
function calculateConcentrationScore(cmsDistribution: CMSDistribution): number {
  const percentages = Object.values(cmsDistribution).map(d => d.percentage);
  
  if (percentages.length === 0) return 0;
  if (percentages.length === 1) return 1; // Only one CMS type = maximum concentration
  
  // Calculate Herfindahl-Hirschman Index (HHI) for concentration
  // HHI = sum of squares of market shares (percentages)
  const hhi = percentages.reduce((sum, percentage) => sum + Math.pow(percentage, 2), 0);
  
  // Normalize HHI to 0-1 scale
  // Max HHI = 10000 (one platform has 100%), Min HHI approaches 0 (perfectly distributed)
  return hhi / 10000;
}

/**
 * Generate warnings about potential dataset bias
 */
function generateBiasWarnings(
  cmsDistribution: CMSDistribution, 
  concentrationScore: number
): string[] {
  const warnings: string[] = [];
  
  // High concentration warning
  if (concentrationScore > 0.6) {
    warnings.push(`High dataset concentration (${Math.round(concentrationScore * 100)}%) - recommendations may be biased`);
  }
  
  // Dominant platform warning
  for (const [cms, data] of Object.entries(cmsDistribution)) {
    if (data.percentage > 60) {
      warnings.push(`Dataset heavily skewed toward ${cms} (${Math.round(data.percentage)}%) - high-frequency headers may be platform-specific`);
    }
  }
  
  // Low diversity warning
  const cmsTypes = Object.keys(cmsDistribution).length;
  if (cmsTypes <= 2) {
    warnings.push(`Low CMS diversity (${cmsTypes} types) - may not represent general web patterns`);
  }
  
  // Unknown sites warning
  const unknownPercentage = cmsDistribution['Unknown']?.percentage || 0;
  if (unknownPercentage > 30) {
    warnings.push(`High percentage of unidentified sites (${Math.round(unknownPercentage)}%) - detection accuracy may be low`);
  }
  
  return warnings;
}

/**
 * Analyze correlation between headers and CMS types
 */
function analyzeHeaderCMSCorrelations(
  dataPoints: DetectionDataPoint[],
  cmsDistribution: CMSDistribution
): Map<string, HeaderCMSCorrelation> {
  const headerStats = new Map<string, Map<string, Set<string>>>(); // header -> cms -> set of URLs
  const totalSites = dataPoints.length;
  
  // Collect header-CMS correlations (tracking unique sites, not occurrences)
  for (const dataPoint of dataPoints) {
    let detectedCms = 'Unknown';
    
    if (dataPoint.detectionResults?.length > 0) {
      const bestDetection = dataPoint.detectionResults
        .sort((a, b) => b.confidence - a.confidence)[0];
      detectedCms = bestDetection?.cms || 'Unknown';
    }
    
    // Collect unique headers from both mainpage and robots.txt for this site
    const uniqueHeaders = new Set<string>();
    
    // Add mainpage headers
    if (dataPoint.httpHeaders) {
      for (const headerName of Object.keys(dataPoint.httpHeaders)) {
        uniqueHeaders.add(headerName.toLowerCase().trim());
      }
    }
    
    // Add robots.txt headers
    if (dataPoint.robotsTxt?.httpHeaders) {
      for (const headerName of Object.keys(dataPoint.robotsTxt.httpHeaders)) {
        uniqueHeaders.add(headerName.toLowerCase().trim());
      }
    }
    
    // Record this site as having each unique header for this CMS
    for (const headerName of uniqueHeaders) {
      if (!headerStats.has(headerName)) {
        headerStats.set(headerName, new Map());
      }
      
      const cmsMap = headerStats.get(headerName)!;
      if (!cmsMap.has(detectedCms)) {
        cmsMap.set(detectedCms, new Set());
      }
      
      cmsMap.get(detectedCms)!.add(dataPoint.url);
    }
  }
  
  // Calculate correlations for each header
  const correlations = new Map<string, HeaderCMSCorrelation>();
  
  for (const [headerName, cmsStats] of headerStats.entries()) {
    const overallOccurrences = Array.from(cmsStats.values()).reduce((sum, urlSet) => sum + urlSet.size, 0);
    const overallFrequency = overallOccurrences / totalSites;
    
    const perCMSFrequency: Record<string, { frequency: number; occurrences: number; totalSitesForCMS: number }> = {};
    
    // Calculate per-CMS frequencies
    for (const [cms, distribution] of Object.entries(cmsDistribution)) {
      const urlSet = cmsStats.get(cms);
      const occurrencesInCMS = urlSet ? urlSet.size : 0;
      const totalSitesForCMS = distribution.count;
      const frequency = totalSitesForCMS > 0 ? occurrencesInCMS / totalSitesForCMS : 0;
      
      perCMSFrequency[cms] = {
        frequency,
        occurrences: occurrencesInCMS,
        totalSitesForCMS
      };
    }
    
    // Calculate platform specificity (how concentrated the header is in specific platforms)
    const platformSpecificity = calculatePlatformSpecificity(perCMSFrequency, cmsDistribution);
    
    // Calculate bias-adjusted frequency
    const biasAdjustedFrequency = calculateBiasAdjustedFrequency(perCMSFrequency, cmsDistribution);
    
    // Determine recommendation confidence and bias warning
    const { recommendationConfidence, biasWarning } = assessRecommendationConfidence(
      overallFrequency,
      platformSpecificity,
      perCMSFrequency,
      cmsDistribution
    );
    
    correlations.set(headerName, {
      headerName,
      overallFrequency,
      overallOccurrences,
      perCMSFrequency,
      platformSpecificity,
      biasAdjustedFrequency,
      recommendationConfidence,
      biasWarning
    });
  }
  
  return correlations;
}


/**
 * Calculate how specific a header is to particular platforms
 * Returns 0-1 where 1 means highly platform-specific
 */
function calculatePlatformSpecificity(
  perCMSFrequency: Record<string, { frequency: number; occurrences: number; totalSitesForCMS: number }>,
  cmsDistribution: CMSDistribution
): number {
  const frequencies = Object.values(perCMSFrequency).map(stat => stat.frequency);
  
  if (frequencies.length === 0) return 0;
  
  // Calculate coefficient of variation (standard deviation / mean)
  // Higher variation means more platform-specific
  const mean = frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
  if (mean === 0) return 0;
  
  const variance = frequencies.reduce((sum, freq) => sum + Math.pow(freq - mean, 2), 0) / frequencies.length;
  const standardDeviation = Math.sqrt(variance);
  
  const coefficientOfVariation = standardDeviation / mean;
  
  // Normalize to 0-1 scale (coefficient of variation can be > 1)
  return Math.min(1, coefficientOfVariation);
}

/**
 * Calculate frequency adjusted for dataset composition bias
 */
function calculateBiasAdjustedFrequency(
  perCMSFrequency: Record<string, { frequency: number; occurrences: number; totalSitesForCMS: number }>,
  cmsDistribution: CMSDistribution
): number {
  // Weight each CMS frequency by what its representation should be in a balanced dataset
  // Assume balanced dataset would have equal representation of major CMS types
  
  const majorCMSTypes = Object.keys(cmsDistribution).filter(cms => 
    cms !== 'Unknown' && cmsDistribution[cms].percentage > 5
  );
  
  if (majorCMSTypes.length === 0) {
    // Fallback to simple average if no major CMS types identified
    const frequencies = Object.values(perCMSFrequency).map(stat => stat.frequency);
    return frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
  }
  
  // Calculate weighted average assuming equal representation of major CMS types
  const equalWeight = 1 / majorCMSTypes.length;
  let weightedSum = 0;
  
  for (const cms of majorCMSTypes) {
    const frequency = perCMSFrequency[cms]?.frequency || 0;
    weightedSum += frequency * equalWeight;
  }
  
  return weightedSum;
}

/**
 * Assess confidence level for recommendations based on bias analysis
 */
function assessRecommendationConfidence(
  overallFrequency: number,
  platformSpecificity: number,
  perCMSFrequency: Record<string, { frequency: number; occurrences: number; totalSitesForCMS: number }>,
  cmsDistribution: CMSDistribution
): { recommendationConfidence: 'high' | 'medium' | 'low'; biasWarning?: string } {
  let recommendationConfidence: 'high' | 'medium' | 'low' = 'high';
  let biasWarning: string | undefined;
  
  // Check for high platform specificity
  if (platformSpecificity > 0.7) {
    recommendationConfidence = 'low';
    biasWarning = 'Header appears platform-specific - high frequency may indicate dataset bias';
  }
  
  // Check for dominant platform correlation
  const dominantCMS = Object.entries(perCMSFrequency)
    .filter(([cms]) => cms !== 'Unknown')
    .sort(([, a], [, b]) => b.frequency - a.frequency)[0];
  
  if (dominantCMS && dominantCMS[1].frequency > 0.8 && cmsDistribution[dominantCMS[0]]?.percentage > 50) {
    recommendationConfidence = 'low';
    biasWarning = `High correlation with ${dominantCMS[0]} (${Math.round(dominantCMS[1].frequency * 100)}%) in biased dataset`;
  }
  
  // Check for low overall frequency but high concentration
  if (overallFrequency < 0.1 && platformSpecificity > 0.5) {
    recommendationConfidence = 'medium';
    biasWarning = 'Low frequency header with high platform concentration';
  }
  
  return { recommendationConfidence, biasWarning };
}

/**
 * Check if header is enterprise/infrastructure related (not CMS-specific)
 */
export function isEnterpriseInfrastructureHeader(headerName: string): boolean {
  const enterprisePatterns = [
    // Caching infrastructure
    'pragma',
    'cache-control',
    'expires',
    'age',
    'etag',
    'last-modified',
    'if-modified-since',
    'if-none-match',
    
    // CDN and load balancing
    'via',
    'x-cache',
    'x-cache-hits',
    'x-served-by',
    'x-timer',
    'cf-ray',
    'cf-cache-status',
    'x-amz-cf-id',
    'x-amz-cf-pop',
    'x-forwarded-for',
    'x-real-ip',
    
    // Connection management
    'connection',
    'keep-alive',
    'upgrade',
    'transfer-encoding',
    
    // Enterprise security
    'strict-transport-security',
    'content-security-policy',
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'referrer-policy',
    'permissions-policy',
    'cross-origin-opener-policy',
    'cross-origin-embedder-policy',
    
    // Generic server info
    'server',
    'content-type',
    'content-length',
    'content-encoding',
    'content-language',
    'accept-ranges',
    'vary',
    'date'
  ];
  
  const normalized = headerName.toLowerCase().trim();
  return enterprisePatterns.some(pattern => 
    normalized === pattern || normalized.startsWith(pattern + ':')
  );
}

/**
 * Calculate website category based on headers and detection results
 */
export function calculateWebsiteCategory(
  headers: Record<string, string> | undefined,
  detectionResults: any[] | undefined
): 'cms' | 'enterprise' | 'cdn' | 'unknown' {
  // If CMS was detected with reasonable confidence, categorize as CMS
  if (detectionResults && detectionResults.length > 0) {
    const bestDetection = detectionResults
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (bestDetection && bestDetection.confidence > 0.3 && bestDetection.cms !== 'Unknown') {
      return 'cms';
    }
  }
  
  if (!headers) return 'unknown';
  
  // Check for enterprise infrastructure patterns
  const headerNames = Object.keys(headers).map(h => h.toLowerCase());
  
  // CDN indicators
  const cdnHeaders = ['cf-ray', 'x-amz-cf-id', 'x-served-by', 'x-cache', 'via'];
  const cdnCount = cdnHeaders.filter(h => headerNames.includes(h)).length;
  
  // Enterprise infrastructure indicators  
  const enterpriseHeaders = ['x-frame-options', 'content-security-policy', 'strict-transport-security', 'x-content-type-options'];
  const enterpriseCount = enterpriseHeaders.filter(h => headerNames.includes(h)).length;
  
  // Advanced caching indicators
  const cachingHeaders = ['pragma', 'age', 'x-cache-hits', 'x-timer'];
  const cachingCount = cachingHeaders.filter(h => headerNames.includes(h)).length;
  
  if (cdnCount >= 2 || cachingCount >= 2) {
    return 'enterprise'; // Likely major website with CDN/enterprise infrastructure
  }
  
  if (enterpriseCount >= 2) {
    return 'enterprise'; // Advanced security headers suggest enterprise setup
  }
  
  return 'unknown';
}