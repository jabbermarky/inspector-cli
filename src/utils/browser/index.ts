/**
 * Unified browser manager module
 * 
 * This module provides a purpose-driven browser management system that eliminates
 * code duplication between CMS detection and screenshot capture modules.
 */

// Main exports
export { BrowserManager } from './manager.js';

// Semaphore exports
export { Semaphore, createSemaphore } from './semaphore.js';

// Type exports
export type {
    BrowserManagerConfig,
    BrowserPurpose,
    ResourceBlockingStrategy,
    NavigationWaitStrategy,
    BrowserViewport,
    ResourceBlockingConfig,
    NavigationConfig,
    ConcurrencyConfig,
    DebugConfig,
    NavigationStrategy,
    ManagedPage,
    NavigationResult,
    RedirectInfo
} from './types.js';

// Import type for function signatures
import type { BrowserManagerConfig } from './types.js';

// Error class exports
export {
    BrowserManagerError,
    BrowserNetworkError,
    BrowserResourceError,
    BrowserTimeoutError,
    BrowserRedirectError
} from './types.js';

// Strategy and configuration exports
export {
    NAVIGATION_STRATEGIES,
    RESOURCE_BLOCKING_STRATEGIES,
    DEFAULT_ESSENTIAL_SCRIPT_PATTERNS,
    DEFAULT_BROWSER_CONFIG
} from './types.js';

// Convenience functions
export function createDetectionConfig(overrides?: Partial<BrowserManagerConfig>): BrowserManagerConfig {
    return {
        headless: true,
        viewport: { width: 1024, height: 768 },
        userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
        purpose: 'detection',
        resourceBlocking: {
            enabled: true,
            strategy: 'aggressive',
            allowEssentialScripts: true
        },
        navigation: {
            timeout: 5000,
            retryAttempts: 3,
            followRedirects: true,
            maxRedirects: 20,
            redirectTimeout: 5000,
            trackRedirectChain: true
        },
        concurrency: {
            maxConcurrent: 2
        },
        ...overrides
    };
}

export function createCaptureConfig(overrides?: Partial<BrowserManagerConfig>): BrowserManagerConfig {
    return {
        headless: true,
        viewport: { width: 1024, height: 768 },
        userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
        purpose: 'capture',
        resourceBlocking: {
            enabled: true,
            strategy: 'moderate'
        },
        navigation: {
            timeout: 15000,
            additionalWaitTime: 2000,
            followRedirects: true,
            maxRedirects: 20,
            redirectTimeout: 5000,
            trackRedirectChain: true
        },
        concurrency: {
            maxConcurrent: 2
        },
        ...overrides
    };
}

export function createAnalysisConfig(overrides?: Partial<BrowserManagerConfig>): BrowserManagerConfig {
    return {
        headless: true,
        viewport: { width: 1024, height: 768 },
        userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
        purpose: 'analysis',
        resourceBlocking: {
            enabled: true,
            strategy: 'minimal'
        },
        navigation: {
            timeout: 10000,
            retryAttempts: 2,
            followRedirects: true,
            maxRedirects: 20,
            redirectTimeout: 5000,
            trackRedirectChain: true
        },
        concurrency: {
            maxConcurrent: 2
        },
        ...overrides
    };
}