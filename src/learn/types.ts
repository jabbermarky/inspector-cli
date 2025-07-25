export interface FilteringOptions {
    level: 'conservative' | 'aggressive' | 'custom';
    removeGenericHeaders?: boolean;
    removeUniversalMetaTags?: boolean;
    removeTrackingScripts?: boolean;
    removeCommonLibraries?: boolean;
    customFilters?: string[];
}

export interface LearnOptions {
    collectData?: boolean;
    forceFresh?: boolean;
    promptTemplate?: string;
    model?: string;
    outputFormat?: string;
    dryRun?: boolean;
    costEstimate?: boolean;
    summary?: boolean;
    crossSiteAnalysis?: boolean;
    metaAnalysis?: boolean;
    phasedAnalysis?: boolean;
    modelPhase1?: string;
    modelPhase2?: string;
    bulkFile?: string;
    generateBulkData?: string;
    headed?: boolean;
    cacheStats?: boolean;
    cacheClear?: boolean;
    cacheReport?: boolean;
    filteringOptions?: FilteringOptions;
    // CLI filtering options (converted to filteringOptions)
    filterLevel?: 'conservative' | 'aggressive';
    filterHeaders?: boolean;
    filterMetaTags?: boolean;
    filterTracking?: boolean;
    filterLibraries?: boolean;
    noFiltering?: boolean;
}

export interface LearnResult {
    url: string;
    success: boolean;
    analysisId?: string;
    error?: string;
    skipped?: boolean;
    skipReason?: string;
    analysis?: {
        technology: string;
        confidence: number;
        keyPatterns?: string[];
        cost?: number;
        tokenCount?: number;
        dataSource?: 'fresh' | 'cached' | 'fallback-cached';
    };
}

export interface DataQualityAssessment {
    quality: 'high' | 'medium' | 'low' | 'blocked';
    score: number; // 0-1
    issues: string[];
    recommendations: string[];
}

export interface EnhancedDataCollection {
    url: string;
    timestamp: string;
    htmlContent: string;
    scripts: Script[];
    metaTags: MetaTag[];
    httpHeaders: Record<string, string>;
    robotsTxt: RobotsTxtData;
    domStructure: DOMStructure;
    navigationInfo?: {
        originalUrl: string;
        finalUrl: string;
        redirectCount: number;
        protocolUpgraded: boolean;
    };
    dataQuality?: DataQualityAssessment;
}

export interface Script {
    src?: string;
    content?: string;
    type?: string;
    async?: boolean;
    defer?: boolean;
}

export interface MetaTag {
    name?: string;
    property?: string;
    content: string;
    httpEquiv?: string;
}

export interface RobotsTxtData {
    content: string;
    headers: Record<string, string>;
    statusCode: number;
    accessible: boolean;
}

export interface DOMStructure {
    classPatterns: string[];
    idPatterns: string[];
    dataAttributes: string[];
    comments: string[];
}

export interface LLMResponse {
    rawResponse: string;
    parsedJson: any;
    parseErrors: string[];
    validationStatus: 'valid' | 'invalid' | 'partial' | 'placeholder' | 'failed';
    tokenUsage?: {
        totalTokens: number;
        promptTokens: number;
        completionTokens: number;
    };
    // Phased analysis fields
    phasedAnalysis?: boolean;
    phases?: any[];
    totalCost?: number;
    totalDuration?: number;
    mixedModels?: {
        phase1Model: string;
        phase2Model: string;
    };
    // API timing metrics
    timingMetrics?: {
        apiCallDurationMs: number;
        networkLatencyMs?: number;
        processingLatencyMs?: number;
        retryCount?: number;
        checkpoints?: Record<string, number>;
    };
}

export interface AnalysisResult {
    metadata: AnalysisMetadata;
    inputData: {
        url: string;
        collectionMetadata: {
            timestamp: string;
            enhanced: boolean;
        };
        enhancedData: EnhancedDataCollection;
    };
    llmResponse: LLMResponse;
    analysis: {
        confidence: number;
        technologyDetected: string;
        keyPatterns: string[];
        implementablePatterns: string[];
        analysisNotes?: string[];
    };
}

export interface AnalysisMetadata {
    analysisId: string;
    url: string;
    timestamp: string;
    model: string;
    promptTemplate: string;
    promptVersion: string;
    dataSource: 'fresh' | 'cached' | 'fallback-cached';
    tokenCount: number;
    estimatedCost: number;
    timingMetrics?: {
        apiCallDurationMs?: number;
        phase1DurationMs?: number;
        phase2DurationMs?: number;
        totalDurationMs?: number;
        networkLatencyMs?: number;
        processingLatencyMs?: number;
    };
    // Filtering information
    filteringApplied?: {
        level: 'conservative' | 'aggressive' | 'custom';
        removedHeaders?: boolean;
        removedMetaTags?: boolean;
        removedTracking?: boolean;
        removedLibraries?: boolean;
    };
    // Fields for failed analyses
    analysisStatus?: 'success' | 'failed';
    failureReason?: string;
}

export interface IndexEntry {
    analysisId: string;
    url: string;
    timestamp: string;
    filepath: string;
    technology: string;
    confidence: number;
}