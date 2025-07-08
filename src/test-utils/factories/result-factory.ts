/**
 * Standardized result object factories
 * 
 * Provides factory functions for creating consistent test result objects
 * across different test scenarios.
 */

import { CMSType, CMSDetectionResult, PartialDetectionResult } from '../../utils/cms/types.js';

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
    executionTime?: number;
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
        evidence = ['Test evidence'],
        executionTime = 100
    } = options;

    return {
        confidence,
        method,
        version,
        evidence,
        executionTime
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