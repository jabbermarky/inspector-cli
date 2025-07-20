// Re-export DetectionDataPoint type for convenience
export type { DetectionDataPoint } from '../utils/cms/analysis/types.js';

// Import and re-export bias analysis types
import type { DatasetBiasAnalysis, CMSDistribution, HeaderCMSCorrelation } from './bias-detector.js';
export type { DatasetBiasAnalysis, CMSDistribution, HeaderCMSCorrelation };

// Type for options with all required except dateRange  
export type FrequencyOptionsWithDefaults = Required<Omit<FrequencyOptions, 'dateRange'>> & Pick<FrequencyOptions, 'dateRange'>;

export interface FrequencyOptions {
  // Data source options
  dataSource?: 'cms-analysis' | 'learn';
  dataDir?: string;
  
  // Filtering options
  minSites?: number;
  minOccurrences?: number;
  pageType?: 'all' | 'mainpage' | 'robots';
  
  // Temporal filtering options
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  
  // Output options
  output?: 'json' | 'csv' | 'human' | 'markdown';
  outputFile?: string;
  
  // Analysis options
  includeRecommendations?: boolean;
  includeCurrentFilters?: boolean;
}

export interface FrequencyResult {
  metadata: {
    totalSites: number;
    validSites: number;
    filteredSites: number;
    analysisDate: string;
    options: FrequencyOptions;
    temporalRange?: {
      earliestCapture: string;
      latestCapture: string;
      timeSpan: string; // human readable like "3 days" or "2 weeks"
    };
  };
  
  headers: HeaderFrequencyData;
  metaTags: MetaTagFrequencyData;
  scripts: ScriptFrequencyData;
  
  recommendations?: {
    learn: LearnRecommendations;
    detectCms: DetectCmsRecommendations;
    groundTruth: GroundTruthRecommendations;
  };
  
  filteringReport?: {
    sitesFilteredOut: number;
    filterReasons: Record<string, number>;
  };
  
  biasAnalysis?: DatasetBiasAnalysis;
}

export interface HeaderFrequencyData {
  [headerName: string]: {
    frequency: number;
    occurrences: number;
    totalSites: number;
    values: Array<{
      value: string;
      frequency: number;
      occurrences: number;
      examples: string[];
    }>;
    pageDistribution?: {
      mainpage: number;
      robots: number;
    };
  };
}

export interface MetaTagFrequencyData {
  [tagKey: string]: {
    frequency: number;
    occurrences: number;
    totalSites: number;
    values: Array<{
      value: string;
      frequency: number;
      occurrences: number;
      examples: string[];
    }>;
  };
}

export interface ScriptFrequencyData {
  [scriptPattern: string]: {
    frequency: number;
    occurrences: number;
    totalSites: number;
    examples: string[];
  };
}

export interface LearnRecommendations {
  currentlyFiltered: string[];
  recommendToFilter: Array<{
    pattern: string;
    reason: string;
    frequency: number;
    diversity: number;
  }>;
  recommendToKeep: Array<{
    pattern: string;
    reason: string;
    frequency: number;
    diversity: number;
  }>;
}

export interface DetectCmsRecommendations {
  newPatternOpportunities: Array<{
    pattern: string;
    frequency: number;
    confidence: number;
    cmsCorrelation: Record<string, number>;
  }>;
  patternsToRefine: Array<{
    pattern: string;
    issue: string;
    currentFrequency: number;
  }>;
}

export interface GroundTruthRecommendations {
  currentlyUsedPatterns: string[];
  potentialNewRules: Array<{
    pattern: string;
    confidence: number;
    suggestedRule: string;
  }>;
}