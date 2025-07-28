/**
 * Analyzer Interface Types - Placeholder
 * 
 * This is a placeholder for the analyzer interface types.
 * These will be properly defined when the analyzer interface system is implemented.
 */

export interface FrequencyAnalyzer<T> {
    getName(): string;
    analyze(data: any, options: AnalysisOptions): Promise<AnalysisResult<T>>;
}

export interface AnalysisOptions {
    readonly minOccurrences?: number;
    readonly includeRecommendations?: boolean;
    readonly biasAwareAnalysis?: boolean;
    readonly crossAnalyzerIntelligence?: boolean;
    readonly confidenceThreshold?: number;
}

export interface AnalysisResult<T> {
    readonly success: boolean;
    readonly analyzerSpecific: T;
    readonly metadata: AnalysisMetadata;
}

export interface AnalysisMetadata {
    readonly analyzer: string;
    readonly version: string;
    readonly executionTime: number;
    readonly dataPointsProcessed: number;
    readonly confidence?: number;
    readonly qualityScore?: number;
    readonly errors?: string[];
}

// Re-export for convenience
export { PreprocessedData } from '../../types/preprocessed-data.js';