/**
 * Data collection types for CMS analysis and rule generation
 */

import { CaptureVersion } from '../types.js';

export interface DetectionDataPoint {
    // Basic metadata
    url: string;
    timestamp: Date;
    userAgent: string;
    
    // Version information
    captureVersion: CaptureVersion;
    
    // Navigation information
    originalUrl: string;
    finalUrl: string;
    redirectChain: Array<{
        from: string;
        to: string;
        statusCode?: number;
        reason?: string;
    }>;
    totalRedirects: number;
    protocolUpgraded: boolean;
    navigationTime: number;
    
    // HTTP response data
    httpHeaders: Record<string, string>;
    statusCode: number;
    contentType: string;
    contentLength?: number;
    
    // HTML metadata
    metaTags: Array<{
        name?: string;
        property?: string;
        content: string;
        httpEquiv?: string;
    }>;
    title?: string;
    
    // HTML content analysis
    htmlContent: string;
    htmlSize: number;
    
    // Robots.txt analysis
    robotsTxt?: {
        content: string;
        accessible: boolean;
        size: number;
        statusCode?: number;
        httpHeaders?: Record<string, string>;  // ADD: Capture robots.txt response headers
        responseTime?: number;                 // ADD: Track response time
        error?: string;
        patterns?: {
            disallowedPaths: string[];
            sitemapUrls: string[];
            crawlDelay?: number;
            userAgents: string[];
        };
    };
    
    // DOM structure analysis
    domElements: Array<{
        selector: string;
        count: number;
        sample?: string; // First element's outerHTML
        attributes?: Record<string, string>;
    }>;
    
    // Link analysis
    links: Array<{
        href: string;
        text?: string;
        rel?: string;
        type?: string;
    }>;
    
    // Script and style analysis
    scripts: Array<{
        src?: string;
        inline?: boolean;
        content?: string; // First 200 chars if inline
        type?: string;
    }>;
    
    stylesheets: Array<{
        href?: string;
        inline?: boolean;
        content?: string; // First 200 chars if inline
    }>;
    
    // Form analysis
    forms: Array<{
        action?: string;
        method?: string;
        fieldCount: number;
        fieldTypes: string[];
    }>;
    
    // Technology detection hints
    technologies: Array<{
        name: string;
        confidence: number;
        evidence: string[];
        category: 'cms' | 'framework' | 'library' | 'analytics' | 'other';
    }>;
    
    // Performance metrics
    loadTime: number;
    resourceCount: number;
    
    // Detection results (for correlation analysis)
    detectionResults: Array<{
        detector: string;
        strategy: string;
        cms: string;
        confidence: number;
        version?: string;
        evidence?: any;
        executionTime: number;
    }>;
    
    // Error information
    errors: Array<{
        stage: 'navigation' | 'parsing' | 'detection';
        error: string;
        details?: any;
    }>;
}

export interface CollectionConfig {
    // What data to collect
    includeHtmlContent: boolean;
    includeDomAnalysis: boolean;
    includeScriptAnalysis: boolean;
    maxHtmlSize: number;
    maxScriptSize: number;
    
    // Collection behavior
    timeout: number;
    retryAttempts: number;
    respectRobots: boolean;
    
    // Storage options
    compress: boolean;
    outputFormat: 'json' | 'jsonl' | 'csv';
    outputFile?: string;
}

export interface DataCollectionResult {
    success: boolean;
    dataPoint?: DetectionDataPoint;
    error?: string;
    executionTime: number;
}

export interface AnalysisQuery {
    // Filter criteria
    urls?: string[];
    cmsTypes?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    
    // Analysis options
    groupBy?: 'cms' | 'domain' | 'date';
    includeUnknown?: boolean;
    minConfidence?: number;
}

export interface PatternAnalysisResult {
    pattern: string;
    confidence: number;
    frequency: number;
    examples: string[];
    cmsCorrelation: Record<string, number>;
}

export interface TechnologySignature {
    name: string;
    patterns: Array<{
        type: 'meta' | 'html' | 'script' | 'header' | 'dom';
        pattern: string | RegExp;
        weight: number;
        required?: boolean;
    }>;
    confidence: number;
    category: string;
}