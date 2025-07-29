import { PatternData } from '../../types/analyzer-interface.js';
import { isMap, isSet } from '../../utils/map-converter.js';

// ValueData interface for compatibility
export interface ValueData {
  frequency: number;
  siteCount: number;
  metadata?: {
    occurrences?: number;
  };
}

export function sortPatternsByFrequency(
  patterns: Map<string, PatternData> | null | undefined
): Array<[string, PatternData]> {
  if (!patterns || !isMap(patterns)) {
    return [];
  }
  
  return Array.from(patterns.entries())
    .sort(([, a], [, b]) => (b.frequency || 0) - (a.frequency || 0));
}

export function getTopPatterns(
  patterns: Map<string, PatternData> | null | undefined,
  limit: number
): Array<[string, PatternData]> {
  return sortPatternsByFrequency(patterns).slice(0, limit);
}

export function getTopValue(pattern: PatternData | null | undefined): string {
  if (!pattern || !pattern.examples || !isSet(pattern.examples) || pattern.examples.size === 0) {
    return 'N/A';
  }
  
  // For now, just return the first example since we don't have frequency data per value
  const firstExample = Array.from(pattern.examples)[0];
  return firstExample ? `${firstExample}` : 'N/A';
}

export function getTotalOccurrences(pattern: PatternData | null | undefined): number {
  if (!pattern) return 0;
  return pattern.occurrenceCount || pattern.metadata?.occurrences || 0;
}

export function getAveragePerSite(pattern: PatternData | null | undefined): number {
  if (!pattern || !pattern.siteCount || pattern.siteCount === 0) return 0;
  const occurrences = getTotalOccurrences(pattern);
  return occurrences / pattern.siteCount;
}