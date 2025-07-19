import { createModuleLogger } from '../utils/logger.js';
import type { DetectionDataPoint, FrequencyOptions } from './types.js';

const logger = createModuleLogger('frequency-header-analyzer');

export interface HeaderPattern {
  pattern: string;
  frequency: number;
  confidence: number;
  examples: string[];
  cmsCorrelation: Record<string, number>;
}

/**
 * Analyze HTTP headers for frequency patterns
 * Extends PatternDiscovery functionality for headers specifically
 */
export async function analyzeHeaders(
  dataPoints: DetectionDataPoint[], 
  options: Required<FrequencyOptions>
): Promise<Map<string, HeaderPattern[]>> {
  
  logger.info('Starting header frequency analysis', { 
    totalSites: dataPoints.length,
    minOccurrences: options.minOccurrences 
  });
  
  // Group headers by name and value
  const headerStats = new Map<string, Map<string, {
    count: number;
    examples: string[];
    cmsSources: Set<string>;
  }>>();
  
  // Process each data point
  for (const dataPoint of dataPoints) {
    if (!dataPoint.httpHeaders) continue;
    
    // Get CMS from detection results (highest confidence)
    let detectedCms = 'Unknown';
    if (dataPoint.detectionResults?.length > 0) {
      const bestDetection = dataPoint.detectionResults
        .sort((a, b) => b.confidence - a.confidence)[0];
      detectedCms = bestDetection?.cms || 'Unknown';
    }
    
    // Process each header
    for (const [headerName, headerValue] of Object.entries(dataPoint.httpHeaders)) {
      const normalizedHeaderName = normalizeHeaderName(headerName);
      const normalizedHeaderValue = normalizeHeaderValue(headerValue);
      
      // Handle empty values by marking them as <empty>
      const finalHeaderValue = normalizedHeaderValue || '<empty>';
      
      // Initialize header tracking
      if (!headerStats.has(normalizedHeaderName)) {
        headerStats.set(normalizedHeaderName, new Map());
      }
      
      const headerMap = headerStats.get(normalizedHeaderName)!;
      
      // Initialize value tracking
      if (!headerMap.has(finalHeaderValue)) {
        headerMap.set(finalHeaderValue, {
          count: 0,
          examples: [],
          cmsSources: new Set()
        });
      }
      
      const valueStats = headerMap.get(finalHeaderValue)!;
      valueStats.count++;
      valueStats.cmsSources.add(detectedCms);
      
      // Add example URL (limit to 5)
      if (valueStats.examples.length < 5) {
        valueStats.examples.push(dataPoint.url);
      }
    }
  }
  
  // Convert to pattern format
  const patterns = new Map<string, HeaderPattern[]>();
  const totalSites = dataPoints.length;
  
  for (const [headerName, headerMap] of headerStats.entries()) {
    const headerPatterns: HeaderPattern[] = [];
    
    for (const [headerValue, stats] of headerMap.entries()) {
      const frequency = stats.count / totalSites;
      
      // Apply minimum occurrence threshold
      if (stats.count >= options.minOccurrences) {
        // Calculate CMS correlation
        const cmsCorrelation: Record<string, number> = {};
        const totalCmsCount = stats.cmsSources.size;
        
        for (const cms of stats.cmsSources) {
          // This is a simplified correlation - could be enhanced
          cmsCorrelation[cms] = 1.0 / totalCmsCount;
        }
        
        // Calculate confidence based on discriminative value
        const confidence = calculateHeaderConfidence(frequency, stats.cmsSources.size);
        
        headerPatterns.push({
          pattern: `${headerName}:${headerValue}`,
          frequency,
          confidence,
          examples: stats.examples,
          cmsCorrelation
        });
      }
    }
    
    // Sort by frequency (most common first)
    headerPatterns.sort((a, b) => b.frequency - a.frequency);
    
    if (headerPatterns.length > 0) {
      patterns.set(headerName, headerPatterns);
    }
  }
  
  logger.info('Header analysis complete', {
    headersAnalyzed: patterns.size,
    totalPatterns: Array.from(patterns.values()).reduce((sum, patterns) => sum + patterns.length, 0)
  });
  
  return patterns;
}

/**
 * Normalize header names (lowercase, trim)
 */
function normalizeHeaderName(headerName: string): string {
  return headerName.toLowerCase().trim();
}

/**
 * Normalize header values (trim, handle encoding)
 */
function normalizeHeaderValue(headerValue: string | string[]): string {
  if (!headerValue) return '';
  
  // Handle array values (like set-cookie)
  if (Array.isArray(headerValue)) {
    return headerValue.join('; ');
  }
  
  let normalized = headerValue.trim();
  
  // Handle quoted values
  if (normalized.startsWith('"') && normalized.endsWith('"')) {
    normalized = normalized.slice(1, -1);
  }
  
  // Limit length for analysis
  if (normalized.length > 200) {
    normalized = normalized.substring(0, 200) + '...';
  }
  
  return normalized;
}

/**
 * Calculate confidence score for header patterns
 * Higher confidence for less universal patterns
 */
function calculateHeaderConfidence(frequency: number, cmsVariety: number): number {
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