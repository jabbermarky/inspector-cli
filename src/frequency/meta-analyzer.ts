import { createModuleLogger } from '../utils/logger.js';
import type { DetectionDataPoint, FrequencyOptions } from './types.js';

const logger = createModuleLogger('frequency-meta-analyzer');

export interface MetaPattern {
  pattern: string;
  frequency: number;
  confidence: number;
  examples: string[];
  cmsCorrelation: Record<string, number>;
}

/**
 * Analyze meta tags for frequency patterns
 * Direct analysis of all meta tags, not just CMS-discriminative ones
 */
export async function analyzeMetaTags(
  dataPoints: DetectionDataPoint[], 
  options: Required<FrequencyOptions>
): Promise<Map<string, MetaPattern[]>> {
  
  logger.info('Starting meta tag frequency analysis', { 
    totalSites: dataPoints.length,
    minOccurrences: options.minOccurrences 
  });
  
  // Group meta tags by name and value
  const metaStats = new Map<string, Map<string, {
    count: number;
    examples: string[];
    sites: Set<string>;
    cmsSources: Set<string>;
  }>>();
  
  // Process each data point
  for (const dataPoint of dataPoints) {
    if (!dataPoint.metaTags) continue;
    
    // Get CMS from detection results (highest confidence)
    let detectedCms = 'Unknown';
    if (dataPoint.detectionResults?.length > 0) {
      const bestDetection = dataPoint.detectionResults
        .sort((a, b) => b.confidence - a.confidence)[0];
      detectedCms = bestDetection?.cms || 'Unknown';
    }
    
    // Process each meta tag
    for (const metaTag of dataPoint.metaTags) {
      // Skip null or invalid meta tags
      if (!metaTag || typeof metaTag !== 'object') {
        continue;
      }
      
      // Create consistent key format
      let metaKey;
      if (metaTag.name) {
        metaKey = `name:${metaTag.name}`;
      } else if (metaTag.property) {
        metaKey = `property:${metaTag.property}`;
      } else if (metaTag.httpEquiv) {
        metaKey = `http-equiv:${metaTag.httpEquiv}`;
      } else {
        metaKey = 'unknown';
      }
      
      const metaValue = metaTag.content || 'no-content';
      
      // Initialize meta tracking
      if (!metaStats.has(metaKey)) {
        metaStats.set(metaKey, new Map());
      }
      
      const metaMap = metaStats.get(metaKey)!;
      
      // Initialize value tracking
      if (!metaMap.has(metaValue)) {
        metaMap.set(metaValue, {
          count: 0,
          examples: [],
          sites: new Set(),
          cmsSources: new Set()
        });
      }
      
      const valueStats = metaMap.get(metaValue)!;
      valueStats.count++;
      valueStats.sites.add(dataPoint.url);
      valueStats.cmsSources.add(detectedCms);
      
      // Add example content (limit to 5)
      if (valueStats.examples.length < 5) {
        valueStats.examples.push(metaValue);
      }
    }
  }
  
  // Convert to pattern format
  const patterns = new Map<string, MetaPattern[]>();
  const totalSites = dataPoints.length;
  
  for (const [metaKey, metaMap] of metaStats.entries()) {
    const metaPatterns: MetaPattern[] = [];
    
    for (const [metaValue, stats] of metaMap.entries()) {
      const frequency = stats.sites.size / totalSites; // Use site count, not total occurrences
      
      // Apply minimum occurrence threshold (based on sites, not total count)
      if (stats.sites.size >= options.minOccurrences) {
        // Calculate CMS correlation
        const cmsCorrelation: Record<string, number> = {};
        const totalCmsCount = stats.cmsSources.size;
        
        for (const cms of stats.cmsSources) {
          cmsCorrelation[cms] = 1.0 / totalCmsCount;
        }
        
        // Calculate confidence based on discriminative value
        const confidence = calculateMetaConfidence(frequency, stats.cmsSources.size);
        
        metaPatterns.push({
          pattern: `${metaKey}:${metaValue}`,
          frequency,
          confidence,
          examples: stats.examples,
          cmsCorrelation
        });
      }
    }
    
    // Sort by frequency (most common first)
    metaPatterns.sort((a, b) => b.frequency - a.frequency);
    
    if (metaPatterns.length > 0) {
      patterns.set(metaKey, metaPatterns);
    }
  }
  
  logger.info('Meta tag analysis complete', {
    metaKeysAnalyzed: patterns.size,
    totalPatterns: Array.from(patterns.values()).reduce((sum, patterns) => sum + patterns.length, 0)
  });
  
  return patterns;
}

/**
 * Calculate confidence score for meta tag patterns
 * Higher confidence for less universal patterns
 */
function calculateMetaConfidence(frequency: number, cmsVariety: number): number {
  // Base confidence inversely related to frequency
  let confidence = 1.0 - frequency;
  
  // Adjust for CMS variety (more variety = less discriminative)
  if (cmsVariety > 3) {
    confidence *= 0.5; // Generic across many CMS types
  } else if (cmsVariety === 1) {
    confidence *= 1.2; // Specific to one CMS type
  }
  
  // Ensure confidence stays within bounds
  return Math.max(0.1, Math.min(1.0, confidence));
}