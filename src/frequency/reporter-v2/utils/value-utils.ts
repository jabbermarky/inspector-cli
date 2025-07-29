import { formatFrequency } from './formatting.js';
import { isSet } from '../../utils/map-converter.js';

export interface ValueSummary {
  value: string;
  frequency: number;
  occurrences: number;
  siteCount: number;
}

export function getTopValues(
  examples: Set<string> | null | undefined,
  limit: number = 5
): ValueSummary[] {
  if (!examples || !isSet(examples) || examples.size === 0) return [];
  
  // Since we don't have frequency data per value, just return first few examples
  return Array.from(examples)
    .slice(0, limit)
    .map(value => ({
      value,
      frequency: 0, // No frequency data available
      occurrences: 0, // No occurrence data available
      siteCount: 0 // No site count data available
    }));
}

export function formatValueSummary(summary: ValueSummary): string {
  return `  - ${summary.value}: ${formatFrequency(summary.frequency)} (${summary.siteCount} sites, ${summary.occurrences} occurrences)`;
}

export function getValueDistribution(examples: Set<string> | null | undefined): {
  unique: number;
  total: number;
  topValue: string | null;
  topFrequency: number;
} {
  if (!examples || !isSet(examples) || examples.size === 0) {
    return {
      unique: 0,
      total: 0,
      topValue: null,
      topFrequency: 0
    };
  }
  
  const topValues = getTopValues(examples, 1);
  
  return {
    unique: examples.size,
    total: 0, // No occurrence data available
    topValue: topValues[0]?.value || null,
    topFrequency: 0 // No frequency data available
  };
}