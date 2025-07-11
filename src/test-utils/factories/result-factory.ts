/**
 * Standardized result object factories
 * 
 * Provides factory functions for creating consistent test result objects
 * across different test scenarios.
 */

import { CMSType, CMSDetectionResult, PartialDetectionResult } from '../../utils/cms/types.js';
import { DetectionDataPoint } from '../../utils/cms/analysis/types.js';

export interface DetectionResultOptions {
    cms?: CMSType | 'Unknown';
    confidence?: number;
    originalUrl?: string;
    finalUrl?: string;
    version?: string;
    executionTime?: number;
    detectionMethods?: string[];
}

export interface PartialDetectionResultOptions {
    confidence?: number;
    method?: string;
    version?: string;
    evidence?: string[];
}

/**
 * Creates a standardized DetectionResult object
 */
export function createDetectionResult(options: DetectionResultOptions = {}): CMSDetectionResult {
    const {
        cms = 'Unknown',
        confidence = 0,
        originalUrl = 'https://example.com',
        finalUrl = 'https://example.com',
        version,
        executionTime = 100,
        detectionMethods = []
    } = options;

    return {
        cms,
        confidence,
        originalUrl,
        finalUrl,
        version,
        executionTime,
        detectionMethods
    };
}

/**
 * Creates a standardized PartialDetectionResult object
 */
export function createPartialDetectionResult(options: PartialDetectionResultOptions = {}): PartialDetectionResult {
    const {
        confidence = 0.8,
        method = 'test-method',
        version,
        evidence = ['Test evidence']
    } = options;

    return {
        confidence,
        method,
        version,
        evidence
    };
}

/**
 * Creates a successful WordPress detection result
 */
export function createWordPressResult(confidence: number = 0.9): CMSDetectionResult {
    return createDetectionResult({
        cms: 'WordPress',
        confidence,
        version: '6.3.1',
        detectionMethods: ['meta-tag', 'http-headers']
    });
}

/**
 * Creates a successful Drupal detection result
 */
export function createDrupalResult(confidence: number = 0.9): CMSDetectionResult {
    return createDetectionResult({
        cms: 'Drupal',
        confidence,
        version: '10.1.0',
        detectionMethods: ['meta-tag', 'http-headers']
    });
}

/**
 * Creates a successful Joomla detection result
 */
export function createJoomlaResult(confidence: number = 0.9): CMSDetectionResult {
    return createDetectionResult({
        cms: 'Joomla',
        confidence,
        version: '4.3.0',
        detectionMethods: ['meta-tag', 'robots-txt']
    });
}

/**
 * Creates a failed detection result
 */
export function createFailedResult(errorMessage: string = 'Detection failed'): CMSDetectionResult {
    return {
        ...createDetectionResult({
            cms: 'Unknown',
            confidence: 0
        }),
        error: errorMessage
    };
}

export interface DataPointOptions {
    url?: string;
    timestamp?: Date;
    userAgent?: string;
    originalUrl?: string;
    finalUrl?: string;
    httpHeaders?: Record<string, string>;
    statusCode?: number;
    contentType?: string;
    htmlContent?: string;
    metaTags?: Array<{name?: string; property?: string; httpEquiv?: string; content: string}>;
    title?: string;
    detectionResults?: any[];
}

/**
 * Creates a standardized DetectionDataPoint object for testing
 */
export function createMockDataPoint(options: DataPointOptions = {}): DetectionDataPoint {
    const {
        url = 'https://example.com',
        timestamp = new Date('2023-06-01'),
        userAgent = 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
        originalUrl = 'https://example.com',
        finalUrl = 'https://example.com', 
        httpHeaders = { 'content-type': 'text/html' },
        statusCode = 200,
        contentType = 'text/html',
        htmlContent = '<html><head><title>Example</title></head><body><h1>Hello</h1></body></html>',
        metaTags = [{ name: 'generator', content: 'WordPress 6.3' }],
        title = 'Example Title',
        detectionResults = []
    } = options;

    return {
        url,
        timestamp,
        userAgent,
        captureVersion: {
            schema: '2',
            engine: {
                version: '2.0.0',
                commit: 'abc123',
                buildDate: '2023-06-01T00:00:00Z'
            },
            algorithms: {
                detection: '2',
                confidence: '1'
            },
            patterns: {
                lastUpdated: '2023-06-01T00:00:00Z'
            },
            features: {
                experimentalFlags: ['feature1', 'feature2']
            }
        },
        originalUrl,
        finalUrl,
        redirectChain: [],
        totalRedirects: 0,
        protocolUpgraded: false,
        navigationTime: 1000,
        httpHeaders,
        statusCode,
        contentType,
        contentLength: htmlContent.length,
        metaTags,
        title,
        htmlContent,
        htmlSize: htmlContent.length,
        robotsTxt: {
            content: 'User-agent: *\nDisallow: /wp-admin/',
            accessible: true,
            size: 30,
            patterns: {
                disallowedPaths: ['/wp-admin/'],
                sitemapUrls: [],
                userAgents: ['*']
            }
        },
        domElements: [],
        links: [],
        scripts: [],
        stylesheets: [],
        forms: [],
        technologies: [],
        loadTime: 1500,
        resourceCount: 25,
        detectionResults,
        errors: []
    };
}