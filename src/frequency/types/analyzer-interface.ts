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
    validation?: {
      qualityScore: number;
      validationPassed: boolean;
      validatedHeaders?: Map<string, PatternData>;
      statisticallySignificantHeaders: number;
    };
    semantic?: {
      categoryCount: number;
      headerCategories: Map<string, string>;
      vendorMappings: Map<string, string>;
    };
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
  semantic: AnalysisResult<SemanticSpecificData>;
  validation: AnalysisResult<ValidationSpecificData>;
  vendor: AnalysisResult<VendorSpecificData>;
  discovery: AnalysisResult<PatternDiscoverySpecificData>;
  cooccurrence: AnalysisResult<CooccurrenceSpecificData>;
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

export interface SemanticSpecificData {
  semanticAnalyses: Map<string, any>; // HeaderSemanticAnalysis from semantic-analyzer.ts
  insights: any; // SemanticInsights from semantic-analyzer.ts  
  vendorStats: any; // VendorStats from vendor-patterns.ts
  technologyStack: any; // TechnologyStack from vendor-patterns.ts
  categoryPatterns: Map<string, any>; // CategoryPattern from semantic-analyzer-v2.ts
  vendorPatterns: Map<string, any>; // VendorPattern from semantic-analyzer-v2.ts
}
export interface VendorSpecificData {
  vendorsByHeader: Map<string, any>; // VendorDetection from vendor-analyzer-v2.ts
  vendorStats: any; // VendorStats from vendor-analyzer-v2.ts
  technologyStack: any; // TechnologyStack from vendor-analyzer-v2.ts
  vendorConfidence: Map<string, number>;
  technologySignatures: any[]; // TechnologySignature from vendor-analyzer-v2.ts
  conflictingVendors: any[]; // TechnologyConflict from vendor-analyzer-v2.ts
  summary: {
    totalVendorsDetected: number;
    highConfidenceVendors: number;
    technologyCategories: string[];
    stackComplexity: 'simple' | 'moderate' | 'complex';
  };
}

export interface TechSpecificData {
  categories: Map<string, Set<string>>;
}

export interface PatternDiscoverySpecificData {
  discoveredPatterns: Map<string, any>; // DiscoveredPattern from pattern-discovery-v2.ts
  emergingVendors: Map<string, any>; // EmergingVendorPattern from pattern-discovery-v2.ts
  patternEvolution: Map<string, any>; // PatternEvolution from pattern-discovery-v2.ts
  semanticAnomalies: any[]; // SemanticAnomaly[] from pattern-discovery-v2.ts
  patternNetworks: any[]; // PatternNetwork[] from pattern-discovery-v2.ts
  insights: string[];
  discoveryMetrics: {
    totalPatternsDiscovered: number;
    newVendorsDetected: number;
    evolutionPatternsFound: number;
    anomaliesDetected: number;
    averagePatternConfidence: number;
    coveragePercentage: number;
  };
  validationIntegration: {
    validatedPatternsUsed: number;
    validationBoostApplied: boolean;
    qualityScore: number;
  };
}

export interface CooccurrenceSpecificData {
  cooccurrences: Map<string, any>; // HeaderCooccurrence from cooccurrence-analyzer-v2.ts
  technologySignatures: Map<string, any>; // TechnologyStackSignature
  platformCombinations: Map<string, any>; // PlatformHeaderCombination
  mutualExclusivityGroups: any[]; // MutualExclusivityGroup[]
  strongCorrelations: any[]; // HeaderCooccurrence[]
  insights: string[];
  statisticalSummary: {
    totalHeaderPairs: number;
    significantCooccurrences: number;
    averageMutualInformation: number;
    topConditionalProbability: number;
  };
}

export interface ValidationSpecificData {
  pipelineResult: any; // PipelineResult from analysis-pipeline.ts
  qualityScore: number;
  validationPassed: boolean;
  sanityChecksPassed: boolean;
  statisticallySignificantHeaders: number;
  biasAnalysis: any; // DatasetBiasAnalysis from bias-detector.ts
  validatedPatterns: {
    headers: Map<string, PatternData>;
    correlations: Map<string, any>; // Map<string, HeaderCMSCorrelation>
  };
  stages: {
    frequencyFilter: { filtered: number; passed: number };
    sampleSizeFilter: { filtered: number; passed: number };
    distributionAnalysis: { filtered: number; passed: number };
    correlationValidation: { errors: number; warnings: number };
    sanityChecks: { passed: number; failed: number };
    significanceTesting: { significant: number; total: number };
    recommendationValidation: { highConfidence: number; lowConfidence: number };
  };
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