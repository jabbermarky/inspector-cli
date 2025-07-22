// Re-export DetectionDataPoint type for convenience
export type { DetectionDataPoint } from '../utils/cms/analysis/types.js';

// Import and re-export bias analysis types
import type { DatasetBiasAnalysis, CMSDistribution, HeaderCMSCorrelation } from './bias-detector.js';
export type { DatasetBiasAnalysis, CMSDistribution, HeaderCMSCorrelation };

// Import and re-export semantic analysis types
import type { 
  HeaderSemanticAnalysis, 
  HeaderCategory, 
  HeaderPrimaryCategory,
  SemanticInsights 
} from './semantic-analyzer.js';
export type { HeaderSemanticAnalysis, HeaderCategory, HeaderPrimaryCategory, SemanticInsights };

// Import and re-export vendor pattern types
import type { VendorPattern, VendorStats, TechnologyStack } from './vendor-patterns.js';
export type { VendorPattern, VendorStats, TechnologyStack };

// Import and re-export co-occurrence analysis types
import type { 
  HeaderCooccurrence, 
  TechnologyStackSignature, 
  PlatformHeaderCombination,
  CooccurrenceAnalysis 
} from './co-occurrence-analyzer.js';
export type { HeaderCooccurrence, TechnologyStackSignature, PlatformHeaderCombination, CooccurrenceAnalysis };

// Import and re-export pattern discovery types
import type { 
  DiscoveredPattern, 
  EmergingVendorPattern, 
  PatternEvolution,
  SemanticAnomaly,
  PatternDiscoveryAnalysis 
} from './pattern-discovery.js';
export type { DiscoveredPattern, EmergingVendorPattern, PatternEvolution, SemanticAnomaly, PatternDiscoveryAnalysis };

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
  debugCalculations?: boolean;
  
  // Phase 3: Validation options
  enableValidation?: boolean;
  skipStatisticalTests?: boolean;
  validationStopOnError?: boolean;
  validationDebugMode?: boolean;
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
  
  semanticAnalysis?: {
    headerAnalyses: Map<string, HeaderSemanticAnalysis>;
    insights: SemanticInsights;
    vendorStats: VendorStats;
    technologyStack: TechnologyStack;
  };
  
  cooccurrenceAnalysis?: CooccurrenceAnalysis;
  
  patternDiscoveryAnalysis?: PatternDiscoveryAnalysis;
  
  // Phase 3: Validation framework results
  validationResults?: {
    pipelineResult: any; // PipelineResult from analysis-pipeline.ts
    qualityScore: number;
    validationPassed: boolean;
    sanityChecksPassed: boolean;
    statisticallySignificantHeaders: number;
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