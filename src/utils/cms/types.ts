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