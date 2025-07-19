// Re-export DetectionDataPoint type for convenience
export type { DetectionDataPoint } from '../utils/cms/analysis/types.js';

export interface FrequencyOptions {
  // Data source options
  dataSource?: 'cms-analysis' | 'learn';
  dataDir?: string;
  
  // Filtering options
  minSites?: number;
  minOccurrences?: number;
  pageType?: 'all' | 'mainpage' | 'robots';
  
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