/**
 * Shared Duda Website Builder detection patterns
 * These patterns are used by both ground-truth prototyping tool and production detect-cms command
 */

/**
 * High-confidence JavaScript patterns that uniquely identify Duda
 */
export const DUDA_HIGH_CONFIDENCE_PATTERNS = {
    // Core Duda JavaScript patterns (99%+ accuracy)
    WINDOW_PARAMETERS: 'window.Parameters = window.Parameters',
    DUDAONE_BASE64: "SiteType: atob('RFVEQU9ORQ==')", // Decodes to 'DUDAONE'
    DM_DIRECT_PRODUCT: "productId: 'DM_DIRECT'",
    DM_BODY_SELECTOR: "BlockContainerSelector: '.dmBody'",
    US_DIRECT_PRODUCTION: "SystemID: 'US_DIRECT_PRODUCTION'",
    // Version detection patterns (99%+ accuracy)
    D_VERSION_PATTERN: 'var d_version = "production_'
} as const;

/**
 * Medium-confidence patterns that suggest Duda presence
 */
export const DUDA_MEDIUM_CONFIDENCE_PATTERNS = {
    // CDN and domain patterns
    IRP_CDN: 'irp.cdn-website.com',
    LIRP_CDN: 'lirp.cdn-website.com',
    DUDA_MOBILE: 'dudamobile.com',
    
    // CSS class patterns
    DM_ALBUM: 'dmalbum',
    DM_RESP_IMG: 'dmrespimg',
    
    // General builder identifiers
    DUDA_BUILDER: 'duda_website_builder',
    DUDA_UNDERSCORE: '_duda_'
} as const;

/**
 * Meta tag patterns for Duda detection
 */
export const DUDA_META_PATTERNS = {
    GENERATOR_DUDA: /duda/i,
    VIEWPORT_DUDA: /duda/i
} as const;

/**
 * All Duda patterns for comprehensive detection
 */
export const ALL_DUDA_PATTERNS = {
    ...DUDA_HIGH_CONFIDENCE_PATTERNS,
    ...DUDA_MEDIUM_CONFIDENCE_PATTERNS,
    ...DUDA_META_PATTERNS
} as const;

/**
 * Version detection regex patterns
 */
export const DUDA_VERSION_PATTERNS = {
    // Primary version pattern: var d_version = "production_XXXX"
    D_VERSION_REGEX: /var\s+d_version\s*=\s*["']([^_]+)_(\d{4})["']/,
    // Build timestamp pattern: var build = "YYYY-MM-DDTHH_MM_SS"
    BUILD_TIMESTAMP_REGEX: /var\s+build\s*=\s*["'](\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2})["']/,
    // Window version assignment: window['v' + 'ersion'] = d_version
    WINDOW_VERSION_REGEX: /window\[['"]v['"]\s*\+\s*['"]ersion['"]\]\s*=\s*d_version/
} as const;

/**
 * Pattern confidence scoring
 */
export const DUDA_PATTERN_CONFIDENCE: Record<string, number> = {
    [DUDA_HIGH_CONFIDENCE_PATTERNS.WINDOW_PARAMETERS]: 0.99,
    [DUDA_HIGH_CONFIDENCE_PATTERNS.DUDAONE_BASE64]: 0.99,
    [DUDA_HIGH_CONFIDENCE_PATTERNS.DM_DIRECT_PRODUCT]: 0.98,
    [DUDA_HIGH_CONFIDENCE_PATTERNS.DM_BODY_SELECTOR]: 0.98,
    [DUDA_HIGH_CONFIDENCE_PATTERNS.US_DIRECT_PRODUCTION]: 0.90,
    [DUDA_HIGH_CONFIDENCE_PATTERNS.D_VERSION_PATTERN]: 0.99,
    
    [DUDA_MEDIUM_CONFIDENCE_PATTERNS.IRP_CDN]: 0.85,
    [DUDA_MEDIUM_CONFIDENCE_PATTERNS.LIRP_CDN]: 0.85,
    [DUDA_MEDIUM_CONFIDENCE_PATTERNS.DUDA_MOBILE]: 0.80,
    [DUDA_MEDIUM_CONFIDENCE_PATTERNS.DM_ALBUM]: 0.75,
    [DUDA_MEDIUM_CONFIDENCE_PATTERNS.DM_RESP_IMG]: 0.75,
    [DUDA_MEDIUM_CONFIDENCE_PATTERNS.DUDA_BUILDER]: 0.70,
    [DUDA_MEDIUM_CONFIDENCE_PATTERNS.DUDA_UNDERSCORE]: 0.70
} as const;