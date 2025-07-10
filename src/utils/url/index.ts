/**
 * Shared URL validation module
 * 
 * Provides comprehensive URL validation and normalization functionality
 * used across screenshot and CMS detection modules.
 */

// Export main classes
export { UrlValidator } from './validator.js';
export { UrlNormalizer } from './normalizer.js';

// Export types and errors
export type {
    UrlValidationContext,
    UrlValidationOptions
} from './types.js';

export {
    UrlValidationErrorType,
    UrlValidationError,
    UrlProtocolError,
    UrlDomainError,
    UrlSecurityError,
    UrlFormatError
} from './types.js';

// Convenience functions for common operations
import { UrlValidator } from './validator.js';
import { UrlNormalizer } from './normalizer.js';
import type { UrlValidationContext } from './types.js';

export function validateUrl(url: string, options?: any): void {
    return UrlValidator.validate(url, options);
}

export function normalizeUrl(url: string, context?: any): string {
    return UrlNormalizer.normalizeUrl(url, context);
}

export function validateAndNormalizeUrl(url: string, options?: any): string {
    return UrlValidator.validateAndNormalize(url, options);
}

// Additional utility functions for common URL operations

/**
 * Extract domain from URL with error handling
 */
export function extractDomain(url: string): string {
    try {
        // Try with original URL first
        const urlObj = new URL(url.includes('://') ? url : `https://${url}`);
        return urlObj.hostname;
    } catch (error) {
        return url;
    }
}

/**
 * Join base URL with path safely
 */
export function joinUrl(baseUrl: string, path: string): string {
    try {
        // Try to use normalized URL for better safety
        const normalized = validateAndNormalizeUrl(baseUrl);
        const base = normalized.replace(/\/$/, '');
        const endpoint = path.startsWith('/') ? path : `/${path}`;
        return `${base}${endpoint}`;
    } catch (error) {
        // Fallback to simple concatenation if validation fails
        const base = baseUrl.replace(/\/$/, '');
        const endpoint = path.startsWith('/') ? path : `/${path}`;
        return `${base}${endpoint}`;
    }
}

/**
 * Create validation context for different environments
 */
export function createValidationContext(
    purpose: 'production' | 'development' | 'testing'
): UrlValidationContext {
    switch (purpose) {
        case 'production':
            return {
                environment: 'production',
                allowLocalhost: false,
                allowPrivateIPs: false,
                allowCustomPorts: false,
                strictMode: true,
                defaultProtocol: 'https'
            };
        case 'development':
            return {
                environment: 'development',
                allowLocalhost: true,
                allowPrivateIPs: true,
                allowCustomPorts: true,
                strictMode: false,
                defaultProtocol: 'http'
            };
        case 'testing':
            return {
                environment: 'test',
                allowLocalhost: true,
                allowPrivateIPs: true,
                allowCustomPorts: true,
                strictMode: false,
                defaultProtocol: 'http'
            };
        default:
            throw new Error(`Unknown validation context purpose: ${purpose}`);
    }
}

/**
 * Detect if input is a URL or CSV file path
 */
export function detectInputType(input: string): 'url' | 'csv' {
    if (input.toLowerCase().endsWith('.csv')) {
        return 'csv';
    }
    try {
        validateUrl(input);
        return 'url';
    } catch {
        return 'csv';
    }
}

/**
 * Clean URL for display purposes
 */
export function cleanUrlForDisplay(url: string): string {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}