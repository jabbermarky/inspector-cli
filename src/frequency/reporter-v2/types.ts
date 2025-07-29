import { AggregatedResults } from '../types/analyzer-interface.js';
import { FrequencyOptions } from '../types/frequency-types-v2.js';

export type OutputFormat = 'human' | 'csv' | 'markdown' | 'json';

export interface SectionFormatter {
  formatForHuman(data: unknown): string;
  formatForCSV(data: unknown): string[];
  formatForMarkdown(data: unknown): string;
}

export interface FormattedSection {
  title: string;
  content: string;
  priority: number;
}

export type FormatterFunction = (
  result: AggregatedResults,
  options: FrequencyOptions
) => string | Promise<string>;

export interface ReporterOptions {
  includeEmpty?: boolean;
  maxItemsPerSection?: number;
}

// Extended FrequencyOptions for reporter-specific options
export interface ExtendedFrequencyOptions extends FrequencyOptions {
  maxItemsPerSection?: number;
  includeValidation?: boolean;      // Enable validation scoring
  validationThreshold?: number;     // Minimum confidence threshold (0-1)
  showValidationDetails?: boolean;  // Show detailed validation factors
}