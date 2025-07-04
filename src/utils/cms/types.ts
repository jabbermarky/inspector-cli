import { Page } from 'puppeteer';

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
 */
export interface DetectionPage extends Page {
    // Additional methods specific to CMS detection can be added here
}

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

/**
 * Browser configuration for CMS detection
 */
export interface BrowserConfig {
    timeout?: number;
    userAgent?: string;
    viewport?: {
        width: number;
        height: number;
    };
    blockResources?: boolean;
    blockedResourceTypes?: string[];
}

/**
 * Browser manager interface
 */
export interface BrowserManager {
    createPage(url: string): Promise<DetectionPage>;
    closePage(page: DetectionPage): Promise<void>;
    close(): Promise<void>;
    cleanup(): Promise<void>;
    isResourceBlocked(resourceType: string): boolean;
}

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