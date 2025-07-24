/**
 * Unified interface for frequency analyzers - Phase 3 implementation
 * This ensures consistent counting methodology across all analyzers
 */

export interface FrequencyAnalyzer<T> {
  /**
   * Analyze preprocessed data and return standardized results
   */
  analyze(data: PreprocessedData, options: AnalysisOptions): Promise<AnalysisResult<T>>;
  
  /**
   * Get analyzer name for logging/debugging
   */
  getName(): string;
}

export interface PreprocessedData {
  sites: Map<string, SiteData>;
  totalSites: number;
  filteringStats?: {
    sitesFilteredOut: number;
    filterReasons: Record<string, number>;
  };
  metadata: {
    dateRange?: DateRange;
    version: string;
    preprocessedAt: string;
  };
}

export interface SiteData {
  url: string;
  normalizedUrl: string;  // For deduplication
  cms: string | null;     // Allow null for undetected CMS
  confidence: number;
  headers: Map<string, Set<string>>;      // header name → values (combined from both page types)
  headersByPageType?: {                   // Page-type specific headers for distribution analysis
    mainpage: Map<string, Set<string>>;   // mainpage headers
    robots: Map<string, Set<string>>;     // robots.txt headers
  };
  metaTags: Map<string, Set<string>>;     // meta name → values  
  scripts: Set<string>;                    // script URLs
  technologies: Set<string>;               // detected tech stack
  capturedAt: string;
}

export interface AnalysisOptions {
  minOccurrences: number;
  includeExamples: boolean;
  maxExamples?: number;
  semanticFiltering?: boolean;
}

export interface AnalysisResult<T> {
  patterns: Map<string, PatternData>;
  totalSites: number;
  metadata: AnalysisMetadata;
  analyzerSpecific?: T;  // For analyzer-specific data
}

export interface PatternData {
  pattern: string;
  siteCount: number;              // PRIMARY metric - number of unique sites
  sites: Set<string>;             // Which sites have this pattern
  frequency: number;              // siteCount / totalSites
  examples?: Set<string>;         // Example values (e.g., header values)
  occurrenceCount?: number;       // Optional: total times seen across all sites
  metadata?: Record<string, any>; // Optional: pattern-specific metadata
}

export interface AnalysisMetadata {
  analyzer: string;
  analyzedAt: string;
  totalPatternsFound: number;
  totalPatternsAfterFiltering: number;
  options: AnalysisOptions;
}

export interface DateRange {
  start?: Date;
  end?: Date;
  lastDays?: number;
}

// Aggregated results from all analyzers
export interface AggregatedResults {
  headers: AnalysisResult<HeaderSpecificData>;
  metaTags: AnalysisResult<MetaSpecificData>;
  scripts: AnalysisResult<ScriptSpecificData>;
  technologies: AnalysisResult<TechSpecificData>;
  correlations: BiasAnalysisResult;
  summary: FrequencySummary;
}

// Analyzer-specific data types
export interface HeaderSpecificData {
  securityHeaders: Set<string>;
  customHeaders: Set<string>;
}

export interface MetaSpecificData {
  ogTags: Set<string>;
  twitterTags: Set<string>;
}

export interface ScriptSpecificData {
  cdnUsage: Map<string, number>;
  scriptTypes: Map<string, number>;
}

export interface TechSpecificData {
  categories: Map<string, Set<string>>;
}

export interface BiasAnalysisResult {
  recommendations: BiasRecommendation[];
  metadata: AnalysisMetadata;
}

export interface BiasRecommendation {
  pattern: string;
  type: string;
  correlation: number;
  cms: string;
  cmsCount: number;
  totalSites: number;
  confidence: number;
}

export interface FrequencySummary {
  totalSitesAnalyzed: number;
  totalPatternsFound: number;
  analysisDate: string;
  filteringStats?: {
    sitesFilteredOut: number;
    filterReasons: Record<string, number>;
  };
  topPatterns: {
    headers: PatternSummary[];
    metaTags: PatternSummary[];
    scripts: PatternSummary[];
    technologies: PatternSummary[];
  };
}

export interface PatternSummary {
  pattern: string;
  siteCount: number;
  frequency: number;
}