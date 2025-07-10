import { ManagedPage } from '../browser/index.js';

/**
 * Supported CMS types
 */
export type CMSType = 'WordPress' | 'Joomla' | 'Drupal' | 'Unknown';

/**
 * CMS plugin information
 */
export interface CMSPluginResult {
    name: string;
    version?: string;
    description?: string;
    author?: string;
    homepage?: string;
}

/**
 * Complete CMS detection result
 */
export interface CMSDetectionResult {
    cms: CMSType;
    version?: string;
    plugins?: CMSPluginResult[];
    confidence: number;
    // URL tracking for redirect chains
    originalUrl: string;                 // Input URL (e.g., http://drupal.org)
    finalUrl: string;                    // Resolved URL (e.g., https://new.drupal.org/home)
    redirectCount?: number;              // Number of redirects followed
    protocolUpgraded?: boolean;          // HTTP→HTTPS upgrade occurred
    
    detectionMethods?: string[];
    executionTime?: number;
    error?: string;
    
    // DNS skip tracking
    skipped?: boolean;                   // URL was skipped due to DNS issues
    skipReason?: string;                 // Reason for skipping (from DNSSkipReason)
}

/**
 * Partial result from individual detection strategy
 */
export interface PartialDetectionResult {
    confidence: number;
    version?: string;
    plugins?: CMSPluginResult[];
    method: string;
    evidence?: string[];
    error?: string;
    executionTime?: number;
}

/**
 * Configuration for CMS detection
 */
export interface CMSDetectionConfig {
    timeout: {
        navigation: number;
        strategy: number;
        overall: number;
    };
    retry: {
        maxAttempts: number;
        initialDelay: number;
        retryableErrors: string[];
    };
    confidence: {
        threshold: number;
        metaTagWeight: number;
        htmlContentWeight: number;
        apiEndpointWeight: number;
    };
    browser: {
        blockResources: boolean;
        userAgent?: string;
        viewport: {
            width: number;
            height: number;
        };
    };
}

/**
 * Browser page interface for detection strategies
 * Uses shared browser manager's ManagedPage
 */
export type DetectionPage = ManagedPage;

/**
 * Detection strategy interface
 */
export interface DetectionStrategy {
    getName(): string;
    getTimeout(): number;
    detect(page: DetectionPage, url: string): Promise<PartialDetectionResult>;
}

/**
 * CMS detector interface
 */
export interface CMSDetector {
    getCMSName(): CMSType;
    getStrategies(): DetectionStrategy[];
    detect(page: DetectionPage, url: string): Promise<CMSDetectionResult>;
}

// Browser configuration and management now handled by shared browser manager

/**
 * Error types for CMS detection
 */
export class CMSDetectionError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly url?: string,
        public readonly strategy?: string
    ) {
        super(message);
        this.name = 'CMSDetectionError';
    }
}

export class CMSTimeoutError extends CMSDetectionError {
    constructor(url: string, strategy: string, timeout: number) {
        super(
            `CMS detection timeout after ${timeout}ms`,
            'DETECTION_TIMEOUT',
            url,
            strategy
        );
        this.name = 'CMSTimeoutError';
    }
}

export class CMSNetworkError extends CMSDetectionError {
    constructor(url: string, strategy: string, originalError: Error) {
        super(
            `Network error during CMS detection: ${originalError.message}`,
            'NETWORK_ERROR',
            url,
            strategy
        );
        this.name = 'CMSNetworkError';
    }
}

/**
 * Version information for captured data
 */
export interface CaptureVersion {
    schema: string;           // "1", "2", "3" - simple incrementing
    engine: {
        version: string;      // from package.json
        commit: string;       // git commit hash
        buildDate: string;    // ISO timestamp
    };
    algorithms: {
        detection: string;    // "1", "2", "3" - increments for new strategies/weights/bugs
        confidence: string;   // "1", "2", "3" - increments for calculation changes
    };
    patterns: {
        lastUpdated: string;  // latest mtime from all src/utils/cms/ files
    };
    features: {
        [key: string]: any;   // All config values auto-scanned
        experimentalFlags: string[];
    };
}

/**
 * Session tracking information for scan history
 */
export interface ScanSession {
    sessionId: string;        // timestamp + random chars
    timestamp: string;        // ISO timestamp
    command: string;          // full command executed
    urlCount: number;         // number of URLs processed
    captureVersion: CaptureVersion;
    results: {
        successful: number;
        failed: number;
        blocked: number;
        duration: number;     // milliseconds
    };
}

/**
 * Scan history file structure
 */
export interface ScanHistory {
    sessions: ScanSession[];
    metadata: {
        totalSessions: number;
        lastUpdated: string;
    };
}