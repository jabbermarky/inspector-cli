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

export function validateUrl(url: string, options?: any): void {
    return UrlValidator.validate(url, options);
}

export function normalizeUrl(url: string, context?: any): string {
    return UrlNormalizer.normalizeUrl(url, context);
}

export function validateAndNormalizeUrl(url: string, options?: any): string {
    return UrlValidator.validateAndNormalize(url, options);
}