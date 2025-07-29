/**
 * Safe Map utilities for V2 Reporter
 * Wrapper functions that combine map-converter utilities with reporter-specific needs
 */

import { isMap, isSet, inspectMapStructure } from '../../utils/map-converter.js';
import { PatternData, AnalysisResult } from '../../types/analyzer-interface.js';

/**
 * Safely check if an AnalysisResult has valid patterns
 */
export function hasValidPatterns<T>(result: AnalysisResult<T> | null | undefined): boolean {
  return !!(result?.patterns && isMap(result.patterns) && result.patterns.size > 0);
}

/**
 * Safely get pattern count from AnalysisResult
 */
export function getPatternCount<T>(result: AnalysisResult<T> | null | undefined): number {
  if (!hasValidPatterns(result)) return 0;
  return result!.patterns!.size;
}

/**
 * Safely check if a pattern has valid examples
 */
export function hasValidExamples(pattern: PatternData | null | undefined): boolean {
  return !!(pattern?.examples && isSet(pattern.examples) && pattern.examples.size > 0);
}

/**
 * Safely get examples as array from a pattern
 */
export function getExamplesArray(pattern: PatternData | null | undefined): string[] {
  if (!hasValidExamples(pattern)) return [];
  return Array.from(pattern!.examples!);
}

/**
 * Debug utility for reporter development
 * Use this to inspect data structures when debugging map issues
 */
export function debugAnalysisResult<T>(
  result: AnalysisResult<T> | null | undefined, 
  label: string = 'AnalysisResult'
): void {
  console.log(`[Reporter Debug] ${label}:`);
  if (!result) {
    console.log('  Result is null/undefined');
    return;
  }
  
  console.log(`  Total sites: ${result.totalSites}`);
  console.log(`  Analyzer: ${result.metadata?.analyzer}`);
  
  inspectMapStructure(result.patterns, 'patterns');
  
  if (result.analyzerSpecific) {
    console.log('  Analyzer-specific data present');
    const specific = result.analyzerSpecific as Record<string, unknown>;
    Object.keys(specific).forEach(key => {
      const value = specific[key];
      if (isMap(value)) {
        inspectMapStructure(value, `analyzerSpecific.${key}`);
      } else if (isSet(value)) {
        console.log(`  analyzerSpecific.${key}: Set with ${value.size} items`);
      } else {
        console.log(`  analyzerSpecific.${key}: ${typeof value}`);
      }
    });
  }
}

/**
 * Validation function to ensure Map data integrity before processing
 */
export function validatePatternData(pattern: PatternData | null | undefined): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (!pattern) {
    issues.push('Pattern is null/undefined');
    return { isValid: false, issues };
  }
  
  if (typeof pattern.frequency !== 'number' || pattern.frequency < 0 || pattern.frequency > 1) {
    issues.push('Invalid frequency value');
  }
  
  if (typeof pattern.siteCount !== 'number' || pattern.siteCount < 0) {
    issues.push('Invalid siteCount value');
  }
  
  if (pattern.sites && !isSet(pattern.sites)) {
    issues.push('sites field is not a Set');
  }
  
  if (pattern.examples && !isSet(pattern.examples)) {
    issues.push('examples field is not a Set');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Safe pattern iteration that skips invalid patterns
 */
export function* safePatternEntries<T>(
  result: AnalysisResult<T> | null | undefined
): Generator<[string, PatternData], void, unknown> {
  if (!hasValidPatterns(result)) return;
  
  for (const [key, pattern] of result!.patterns!) {
    const validation = validatePatternData(pattern);
    if (validation.isValid) {
      yield [key, pattern];
    } else {
      console.warn(`Skipping invalid pattern '${key}':`, validation.issues);
    }
  }
}

/**
 * Export all map utilities for convenience
 */
export { isMap, isSet, inspectMapStructure } from '../../utils/map-converter.js';