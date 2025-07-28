import { createModuleLogger } from '../utils/logger.js';
import { EnhancedDataCollection, FilteringOptions, Script, MetaTag } from './types.js';
import { DataPreprocessor } from '../frequency/data-preprocessor-v2.js';

const logger = createModuleLogger('discriminative-filtering');

// Pattern definitions for filtering - Use centralized DataPreprocessor
// Legacy hardcoded Set replaced with dynamic classification

/**
 * Get headers that should be filtered out (considered generic/non-discriminative)
 * Uses centralized DataPreprocessor for consistent classification
 */
function getGenericHeaders(): Set<string> {
    const preprocessor = new DataPreprocessor();

    // Get all headers that should be filtered (generic + infrastructure)
    // This matches the original filtering behavior of excluding non-CMS-discriminative headers
    const genericHeaders = preprocessor.getHeadersByCategory('generic');
    const infrastructureHeaders = preprocessor.getHeadersByCategory('infrastructure');

    return new Set([...genericHeaders, ...infrastructureHeaders]);
}

// Export the dynamic generic headers for backwards compatibility
// Note: This is computed dynamically now, not a static Set
export const GENERIC_HTTP_HEADERS = getGenericHeaders();

// Removed large hardcoded Set - now using centralized DataPreprocessor
// Original Set contained 160+ hardcoded entries covering:
// - Standard HTTP headers (date, content-type, cache-control, etc.)
// - Security headers (HSTS, CSP, CORS, etc.)
// - Infrastructure headers (CDN, load balancer, proxy headers)
// - Client hints and performance headers
//
// All these are now dynamically classified by DataPreprocessor
// based on the 4-group system: generic, cms-indicative, infrastructure, platform
//
// The original behavior is preserved: filter out generic + infrastructure headers,
// keep cms-indicative + platform headers for discrimination

// Legacy hardcoded Set was: new Set([
//   ... 160+ hardcoded entries were here ...
// ]);
// Now replaced with dynamic DataPreprocessor classification

const UNIVERSAL_META_TAGS = new Set([
    'viewport', // Mobile responsiveness - universal
    'robots', // SEO directive - universal
    'description', // SEO description - universal (unless very specific)
    'charset', // UTF-8 - universal
    'author', // Author info - not discriminative
    'keywords', // SEO keywords - mostly deprecated
    'content-type', // Duplicate of HTTP header
    'theme-color', // Theme color - universal
    'msapplication-tilecolor', // Windows tile color - universal
    'msapplication-config', // Windows tile config - universal
    'apple-mobile-web-app-capable', // iOS web app - universal
    'apple-mobile-web-app-status-bar-style', // iOS status bar - universal
    'apple-mobile-web-app-title', // iOS app title - universal
    'application-name', // Application name - universal
    'msvalidate.01', // Bing webmaster tools - universal
    'google-site-verification', // Google Search Console - universal
    'yandex-verification', // Yandex webmaster tools - universal
    'p:domain_verify', // Pinterest verification - universal
    'facebook-domain-verification', // Facebook verification - universal
    'twitter:card', // Twitter card - universal
    'twitter:site', // Twitter site - universal
    'twitter:creator', // Twitter creator - universal
    'og:type', // Open Graph type - universal
    'og:title', // Open Graph title - universal
    'og:description', // Open Graph description - universal
    'og:image', // Open Graph image - universal
    'og:url', // Open Graph URL - universal
    'og:site_name', // Open Graph site name - universal
    'og:locale', // Open Graph locale - universal
]);

const GENERIC_SCRIPT_PATTERNS = new Set([
    'jquery', // Used everywhere
    'bootstrap', // Used everywhere
    'google-analytics', // Tracking - universal
    'gtag', // Google Tag Manager - universal
    'facebook-pixel', // Tracking - universal
    'facebook.net', // Facebook scripts - universal
    'fbevents', // Facebook events - universal
    'google-tag-manager', // Tracking - universal
    'googletagmanager', // Google Tag Manager - universal
    'googlesyndication', // Google Ads - universal
    'doubleclick', // Google Ads - universal
    'google-adservices', // Google Ads - universal
    'googleadservices', // Google Ads - universal
    'hotjar', // Heatmap tracking - universal
    'mixpanel', // Analytics - universal
    'segment', // Analytics - universal
    'intercom', // Chat widget - universal
    'zendesk', // Support widget - universal
    'freshchat', // Chat widget - universal
    'tawk', // Chat widget - universal
    'crisp', // Chat widget - universal
    'typekit', // Adobe fonts - universal
    'fonts.googleapis', // Google fonts - universal
    'cdnjs.cloudflare', // CDN - universal
    'jsdelivr', // CDN - universal
    'unpkg', // CDN - universal
    'polyfill', // Browser polyfills - universal
    'modernizr', // Feature detection - universal
    'respond', // Media query polyfill - universal
    'html5shiv', // HTML5 polyfill - universal
]);

const COMMON_LIBRARY_PATTERNS = new Set([
    'lodash', // Utility library - universal
    'underscore', // Utility library - universal
    'moment', // Date library - universal
    'axios', // HTTP client - universal
    'fetch', // HTTP client - universal
    'socket.io', // WebSocket library - universal
    'swiper', // Slider library - universal
    'owl.carousel', // Carousel library - universal
    'slick', // Carousel library - universal
    'fancybox', // Lightbox library - universal
    'lightbox', // Lightbox library - universal
    'photoswipe', // Gallery library - universal
    'aos', // Animation library - universal
    'wow', // Animation library - universal
    'animate', // Animation library - universal
    'isotope', // Layout library - universal
    'masonry', // Layout library - universal
    'parallax', // Scrolling effects - universal
    'scrollmagic', // Scrolling effects - universal
    'waypoints', // Scrolling effects - universal
    'sticky', // Sticky elements - universal
    'lazyload', // Lazy loading - universal
    'intersection-observer', // Intersection observer - universal
]);

/**
 * Filtering statistics interface
 */
export interface FilteringStats {
    originalHeaders: number;
    filteredHeaders: number;
    originalMetaTags: number;
    filteredMetaTags: number;
    originalScripts: number;
    filteredScripts: number;
    originalDOMPatterns: number;
    filteredDOMPatterns: number;
    tokenReductionEstimate: number;
}

/**
 * Apply discriminative filtering to EnhancedDataCollection
 *
 * @param data - The original enhanced data collection
 * @param options - Filtering options
 * @returns Filtered copy of the data
 */
export function applyDiscriminativeFilters(
    data: EnhancedDataCollection,
    options: FilteringOptions = { level: 'conservative' }
): EnhancedDataCollection {
    const startTime = performance.now();

    // Create a deep copy to avoid mutating the original
    const filtered: EnhancedDataCollection = {
        ...data,
        httpHeaders: { ...data.httpHeaders },
        metaTags: [...data.metaTags],
        scripts: [...data.scripts],
        robotsTxt: {
            ...data.robotsTxt,
            headers: { ...data.robotsTxt.headers },
        },
        domStructure: {
            ...data.domStructure,
            classPatterns: [...data.domStructure.classPatterns],
            idPatterns: [...data.domStructure.idPatterns],
            dataAttributes: [...data.domStructure.dataAttributes],
            comments: [...data.domStructure.comments],
        },
    };

    // Store original counts for statistics
    const originalStats = {
        headers: Object.keys(data.httpHeaders).length,
        metaTags: data.metaTags.length,
        scripts: data.scripts.length,
        domPatterns:
            data.domStructure.classPatterns.length +
            data.domStructure.idPatterns.length +
            data.domStructure.dataAttributes.length,
    };

    // Apply filtering based on level and options
    const config = getFilteringConfig(options);

    if (config.removeGenericHeaders) {
        filtered.httpHeaders = filterGenericHeaders(filtered.httpHeaders);
        filtered.robotsTxt.headers = filterGenericHeaders(filtered.robotsTxt.headers);
    }

    if (config.removeUniversalMetaTags) {
        filtered.metaTags = filterUniversalMetaTags(filtered.metaTags);
    }

    if (config.removeTrackingScripts) {
        filtered.scripts = filterTrackingScripts(filtered.scripts);
    }

    if (config.removeCommonLibraries) {
        filtered.scripts = filterCommonLibraries(filtered.scripts);
    }

    if (config.customFilters && config.customFilters.length > 0) {
        filtered.scripts = filterCustomPatterns(filtered.scripts, config.customFilters);
    }

    // Calculate filtering statistics
    const filteredStats = {
        headers: Object.keys(filtered.httpHeaders).length,
        metaTags: filtered.metaTags.length,
        scripts: filtered.scripts.length,
        domPatterns:
            filtered.domStructure.classPatterns.length +
            filtered.domStructure.idPatterns.length +
            filtered.domStructure.dataAttributes.length,
    };

    const tokenReductionEstimate = calculateTokenReduction(originalStats, filteredStats);
    const processingTime = performance.now() - startTime;

    // Log filtering statistics
    logger.info('Applied discriminative filtering', {
        level: options.level,
        originalHeaders: originalStats.headers,
        filteredHeaders: filteredStats.headers,
        originalMetaTags: originalStats.metaTags,
        filteredMetaTags: filteredStats.metaTags,
        originalScripts: originalStats.scripts,
        filteredScripts: filteredStats.scripts,
        tokenReductionEstimate,
        processingTimeMs: Math.round(processingTime),
    });

    return filtered;
}

/**
 * Get filtering configuration based on options
 */
function getFilteringConfig(options: FilteringOptions): Required<FilteringOptions> {
    const defaults: Required<FilteringOptions> = {
        level: 'conservative',
        removeGenericHeaders: false,
        removeUniversalMetaTags: false,
        removeTrackingScripts: false,
        removeCommonLibraries: false,
        customFilters: [],
    };

    // Apply level-based defaults
    switch (options.level) {
        case 'conservative':
            return {
                ...defaults,
                ...options,
                removeGenericHeaders: options.removeGenericHeaders ?? true,
                removeUniversalMetaTags: options.removeUniversalMetaTags ?? true,
                removeTrackingScripts: options.removeTrackingScripts ?? false,
                removeCommonLibraries: options.removeCommonLibraries ?? false,
            };
        case 'aggressive':
            return {
                ...defaults,
                ...options,
                removeGenericHeaders: options.removeGenericHeaders ?? true,
                removeUniversalMetaTags: options.removeUniversalMetaTags ?? true,
                removeTrackingScripts: options.removeTrackingScripts ?? true,
                removeCommonLibraries: options.removeCommonLibraries ?? true,
            };
        case 'custom':
            return { ...defaults, ...options };
        default:
            return { ...defaults, ...options };
    }
}

/**
 * Filter generic HTTP headers
 */
function filterGenericHeaders(headers: Record<string, string>): Record<string, string> {
    const filtered: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
        const normalizedKey = key.toLowerCase();
        if (!GENERIC_HTTP_HEADERS.has(normalizedKey)) {
            filtered[key] = value;
        }
    }

    return filtered;
}

/**
 * Filter universal meta tags
 */
function filterUniversalMetaTags(metaTags: MetaTag[]): MetaTag[] {
    return metaTags.filter(tag => {
        const tagName = (tag.name || tag.property || tag.httpEquiv || '').toLowerCase();
        return !UNIVERSAL_META_TAGS.has(tagName);
    });
}

/**
 * Filter tracking scripts
 */
function filterTrackingScripts(scripts: Script[]): Script[] {
    return scripts.filter(script => {
        if (script.src) {
            const srcLower = script.src.toLowerCase();
            return !Array.from(GENERIC_SCRIPT_PATTERNS).some(pattern => srcLower.includes(pattern));
        }
        return true;
    });
}

/**
 * Filter common libraries
 */
function filterCommonLibraries(scripts: Script[]): Script[] {
    return scripts.filter(script => {
        if (script.src) {
            const srcLower = script.src.toLowerCase();
            return !Array.from(COMMON_LIBRARY_PATTERNS).some(pattern => srcLower.includes(pattern));
        }
        return true;
    });
}

/**
 * Filter custom patterns
 */
function filterCustomPatterns(scripts: Script[], patterns: string[]): Script[] {
    return scripts.filter(script => {
        if (script.src) {
            const srcLower = script.src.toLowerCase();
            return !patterns.some(pattern => srcLower.includes(pattern.toLowerCase()));
        }
        return true;
    });
}

/**
 * Calculate estimated token reduction
 */
function calculateTokenReduction(original: any, filtered: any): number {
    // Rough estimation: each header/meta tag/script contributes ~10-50 tokens
    const avgTokensPerHeader = 25;
    const avgTokensPerMetaTag = 15;
    const avgTokensPerScript = 20;

    const originalTokens =
        original.headers * avgTokensPerHeader +
        original.metaTags * avgTokensPerMetaTag +
        original.scripts * avgTokensPerScript;

    const filteredTokens =
        filtered.headers * avgTokensPerHeader +
        filtered.metaTags * avgTokensPerMetaTag +
        filtered.scripts * avgTokensPerScript;

    return originalTokens > 0 ? (originalTokens - filteredTokens) / originalTokens : 0;
}

/**
 * Get filtering statistics for a dataset
 */
export function getFilteringStats(
    original: EnhancedDataCollection,
    filtered: EnhancedDataCollection
): FilteringStats {
    const tokenReductionEstimate = calculateTokenReduction(
        {
            headers: Object.keys(original.httpHeaders).length,
            metaTags: original.metaTags.length,
            scripts: original.scripts.length,
            domPatterns:
                original.domStructure.classPatterns.length +
                original.domStructure.idPatterns.length +
                original.domStructure.dataAttributes.length,
        },
        {
            headers: Object.keys(filtered.httpHeaders).length,
            metaTags: filtered.metaTags.length,
            scripts: filtered.scripts.length,
            domPatterns:
                filtered.domStructure.classPatterns.length +
                filtered.domStructure.idPatterns.length +
                filtered.domStructure.dataAttributes.length,
        }
    );

    return {
        originalHeaders: Object.keys(original.httpHeaders).length,
        filteredHeaders: Object.keys(filtered.httpHeaders).length,
        originalMetaTags: original.metaTags.length,
        filteredMetaTags: filtered.metaTags.length,
        originalScripts: original.scripts.length,
        filteredScripts: filtered.scripts.length,
        originalDOMPatterns:
            original.domStructure.classPatterns.length +
            original.domStructure.idPatterns.length +
            original.domStructure.dataAttributes.length,
        filteredDOMPatterns:
            filtered.domStructure.classPatterns.length +
            filtered.domStructure.idPatterns.length +
            filtered.domStructure.dataAttributes.length,
        tokenReductionEstimate,
    };
}
