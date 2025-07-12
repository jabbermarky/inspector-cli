/**
 * Test utilities specifically for ground-truth command testing
 */

import { beforeEach, afterEach, vi } from 'vitest';

export interface MockGroundTruthData {
    url: string;
    htmlContent?: string;
    scripts?: Array<{src: string}>;
    stylesheets?: Array<{href: string}>;
    metaTags?: Array<{name: string, content: string}>;
    httpHeaders?: Record<string, string>;
}

export interface MockGroundTruthSite {
    url: string;
    cms: string;
    version?: string;
    confidence: number;
    addedAt: string;
    verifiedBy: string;
    notes?: string;
    detectedVersion?: string;
    versionSource?: string;
}

export interface MockGroundTruthDatabase {
    version: string;
    lastUpdated: string;
    sites: MockGroundTruthSite[];
}

/**
 * Creates mock data for CMS detection analysis
 */
export function createMockCMSData(overrides: Partial<MockGroundTruthData> = {}): MockGroundTruthData {
    return {
        url: 'https://example.com',
        htmlContent: '<html><head><title>Test Site</title></head><body><p>Test content</p></body></html>',
        scripts: [],
        stylesheets: [],
        metaTags: [],
        httpHeaders: {},
        ...overrides
    };
}

/**
 * Creates mock WordPress site data with various detection patterns
 */
export function createWordPressMockData(domain: string = 'example.com', includeExternalRefs: boolean = false): MockGroundTruthData {
    const baseUrl = `https://${domain}`;
    const externalBlogUrl = `https://blog.${domain}`;
    
    const data: MockGroundTruthData = {
        url: baseUrl,
        htmlContent: `
            <html>
            <head>
                <meta name="generator" content="WordPress 6.3.1" />
                <title>WordPress Site</title>
                <link rel="stylesheet" href="${baseUrl}/wp-content/themes/twentytwentythree/style.css" />
            </head>
            <body>
                <div class="wp-block-group">WordPress content</div>
                <script src="${baseUrl}/wp-content/plugins/contact-form/script.js"></script>
                ${includeExternalRefs ? `
                    <img src="${externalBlogUrl}/wp-content/uploads/2023/image.jpg" alt="External image" />
                    <a href="${externalBlogUrl}/wp-content/uploads/document.pdf">External document</a>
                ` : ''}
            </body>
            </html>
        `,
        scripts: [
            { src: `${baseUrl}/wp-content/themes/twentytwentythree/assets/js/script.js` },
            { src: `${baseUrl}/wp-content/plugins/contact-form/script.js` },
            { src: `${baseUrl}/wp-includes/js/jquery/jquery.min.js?ver=3.6.0` },
            { src: `${baseUrl}/wp-admin/js/common.min.js?ver=6.3.1` }
        ],
        stylesheets: [
            { href: `${baseUrl}/wp-content/themes/twentytwentythree/style.css` },
            { href: `${baseUrl}/wp-content/plugins/contact-form/styles.css` }
        ],
        metaTags: [
            { name: 'generator', content: 'WordPress 6.3.1' },
            { name: 'description', content: 'A WordPress site' }
        ],
        httpHeaders: {
            'X-Pingback': `${baseUrl}/xmlrpc.php`,
            'Link': `<${baseUrl}/wp-json/>; rel="https://api.w.org/"`,
            'Content-Type': 'text/html; charset=UTF-8'
        }
    };

    if (includeExternalRefs) {
        // Add external references that should NOT be counted as same-domain
        data.scripts!.push(
            { src: `${externalBlogUrl}/wp-content/themes/blog-theme/script.js` },
            { src: `https://external-cdn.com/wp-content/plugins/plugin.js` }
        );
        data.stylesheets!.push(
            { href: `${externalBlogUrl}/wp-content/themes/blog-theme/style.css` }
        );
    }

    return data;
}

/**
 * Creates mock Drupal site data
 */
export function createDrupalMockData(domain: string = 'drupal-site.com'): MockGroundTruthData {
    const baseUrl = `https://${domain}`;
    
    return {
        url: baseUrl,
        htmlContent: `
            <html>
            <head>
                <meta name="generator" content="Drupal 10.1.5" />
                <title>Drupal Site</title>
            </head>
            <body>
                <div id="drupal-content">Drupal content</div>
                <script>
                    var drupal = drupal || {};
                    drupal.settings = {"baseUrl":"${baseUrl}/"};
                </script>
            </body>
            </html>
        `,
        scripts: [
            { src: `${baseUrl}/sites/default/files/js/js_123.js` },
            { src: `${baseUrl}/core/assets/vendor/jquery/jquery.min.js` },
            { src: `${baseUrl}/core/misc/drupal.js` }
        ],
        stylesheets: [
            { href: `${baseUrl}/themes/custom/mytheme/css/style.css` },
            { href: `${baseUrl}/modules/contrib/views/css/views.css` }
        ],
        metaTags: [
            { name: 'generator', content: 'Drupal 10.1.5' }
        ],
        httpHeaders: {
            'X-Drupal-Cache': 'HIT',
            'X-Drupal-Dynamic-Cache': 'UNCACHEABLE',
            'Content-Type': 'text/html; charset=UTF-8'
        }
    };
}

/**
 * Creates mock Joomla site data
 */
export function createJoomlaMockData(domain: string = 'joomla-site.com'): MockGroundTruthData {
    const baseUrl = `https://${domain}`;
    
    return {
        url: baseUrl,
        htmlContent: `
            <html>
            <head>
                <meta name="generator" content="Joomla! - Open Source Content Management" />
                <title>Joomla Site</title>
            </head>
            <body>
                <div class="joomla-script-options new">Options</div>
                <div class="system-message">System message</div>
                <div class="com_content">Content component</div>
            </body>
            </html>
        `,
        scripts: [
            { src: `${baseUrl}/media/jui/js/jquery.min.js` },
            { src: `${baseUrl}/media/system/js/core.js` },
            { src: `${baseUrl}/components/com_content/views/article/tmpl/script.js` },
            { src: `${baseUrl}/templates/mytemplate/js/template.js` }
        ],
        stylesheets: [
            { href: `${baseUrl}/templates/mytemplate/css/template.css` },
            { href: `${baseUrl}/media/system/css/system.css` }
        ],
        metaTags: [
            { name: 'generator', content: 'Joomla! - Open Source Content Management' }
        ],
        httpHeaders: {
            'Content-Type': 'text/html; charset=UTF-8'
        }
    };
}

/**
 * Creates mock data for the logrocket.com false positive case
 */
export function createLogrocketMockData(): MockGroundTruthData {
    return {
        url: 'https://logrocket.com',
        htmlContent: `
            <html>
            <head>
                <title>LogRocket - Application Monitoring</title>
                <meta property="og:image" content="https://blog.logrocket.com/wp-content/uploads/2023/image1.jpg" />
                <link rel="canonical" href="https://logrocket.com/" />
            </head>
            <body>
                <div class="hero">LogRocket Application Monitoring</div>
                <p>Read our latest blog post at <a href="https://blog.logrocket.com/wp-content/uploads/tutorial.pdf">blog.logrocket.com</a></p>
                <img src="https://blog.logrocket.com/wp-content/uploads/2023/image2.jpg" alt="Blog image" />
                <link rel="stylesheet" href="https://blog.logrocket.com/wp-content/themes/logrocket-blog/style.css" />
                <script src="https://blog.logrocket.com/wp-content/plugins/analytics/script.js"></script>
                <div>Reference to https://blog.logrocket.com/wp-content/other/file.pdf</div>
            </body>
            </html>
        `,
        scripts: [
            { src: 'https://logrocket.com/static/js/app.js' },
            { src: 'https://logrocket.com/static/js/vendor.js' },
            // These are external references that should NOT be counted
            { src: 'https://blog.logrocket.com/wp-content/plugins/analytics/script.js' },
            { src: 'https://blog.logrocket.com/wp-content/themes/theme/script.js' }
        ],
        stylesheets: [
            { href: 'https://logrocket.com/static/css/app.css' },
            // These are external references that should NOT be counted
            { href: 'https://blog.logrocket.com/wp-content/themes/logrocket-blog/style.css' }
        ],
        metaTags: [
            { name: 'description', content: 'LogRocket application monitoring platform' },
            { name: 'author', content: 'LogRocket' }
        ],
        httpHeaders: {
            'Content-Type': 'text/html; charset=UTF-8',
            'Server': 'Cloudflare'
        }
    };
}

/**
 * Creates a mock ground truth database
 */
export function createMockGroundTruthDatabase(sites: MockGroundTruthSite[] = []): MockGroundTruthDatabase {
    return {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        sites: sites.length > 0 ? sites : [
            {
                url: 'https://www.wordpress-site.com',
                cms: 'WordPress',
                version: '6.3.1',
                confidence: 0.95,
                addedAt: '2025-01-01T00:00:00Z',
                verifiedBy: 'ground-truth-discovery',
                notes: 'Standard WordPress installation'
            },
            {
                url: 'https://www.drupal-site.com',
                cms: 'Drupal',
                version: '10.1.5',
                confidence: 0.88,
                addedAt: '2025-01-02T00:00:00Z',
                verifiedBy: 'ground-truth-discovery'
            },
            {
                url: 'https://www.joomla-site.com',
                cms: 'Joomla',
                version: '4.2.3',
                confidence: 0.92,
                addedAt: '2025-01-03T00:00:00Z',
                verifiedBy: 'ground-truth-discovery',
                notes: 'Custom Joomla template'
            }
        ]
    };
}

/**
 * Creates discriminative features for testing
 */
export function createDiscriminativeFeatures() {
    return [
        {
            feature: 'hasWpContent',
            description: 'Scripts loaded from /wp-content/ directory',
            cms: 'WordPress',
            confidence: 0.9,
            type: 'script-src'
        },
        {
            feature: 'hasWpContentInHtml',
            description: 'HTML contains wp-content references',
            cms: 'WordPress',
            confidence: 0.9,
            type: 'html-content'
        },
        {
            feature: 'hasWpJsonLink',
            description: 'HTML contains wp-json API references',
            cms: 'WordPress',
            confidence: 0.8,
            type: 'html-content'
        },
        {
            feature: 'hasDrupalSites',
            description: 'Scripts loaded from /sites/ directory',
            cms: 'drupal',
            confidence: 0.8,
            type: 'script-src'
        },
        {
            feature: 'hasJoomlaScriptOptions',
            description: 'joomla-script-options new class (100% Joomla signature)',
            cms: 'Joomla',
            confidence: 1.0,
            type: 'dom-structure'
        },
        {
            feature: 'generatorContainsJoomla',
            description: 'Generator meta tag contains Joomla',
            cms: 'Joomla',
            confidence: 0.8,
            type: 'meta-tag'
        }
    ];
}

/**
 * Mock implementation of domain validation (correct behavior)
 */
export function mockHasSameDomainHtmlPattern(htmlContent: string, pattern: string, targetUrl: string): boolean {
    if (!htmlContent) return false;

    const targetDomain = extractDomain(targetUrl);
    
    // Look for URLs containing the pattern
    const urlRegex = new RegExp(`https?://[^\\s"']+${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s"']*`, 'gi');
    const matches = htmlContent.match(urlRegex);

    if (matches) {
        for (const match of matches) {
            const matchDomain = extractDomain(match);
            if (isSameDomain(targetDomain, matchDomain)) {
                return true;
            }
        }
    }

    // Also check for relative URLs (which implicitly belong to the same domain)
    const relativeRegex = new RegExp(`/${pattern}`, 'gi');
    let match;
    
    while ((match = relativeRegex.exec(htmlContent)) !== null) {
        const matchIndex = match.index;
        
        // Check 50 characters before the match for protocol indicators
        const contextStart = Math.max(0, matchIndex - 50);
        const beforeContext = htmlContent.substring(contextStart, matchIndex);
        
        // If there's a protocol (http:// or https://) in the context before this match,
        // it means this is part of an absolute URL, so skip it
        if (beforeContext.includes('http://') || beforeContext.includes('https://')) {
            continue;
        }
        
        // This appears to be a genuine relative URL, return true
        return true;
    }

    return false;
}

/**
 * Mock implementation of same-domain script validation
 */
export function mockIsSameDomainScript(scriptUrl: string, targetUrl: string): boolean {
    try {
        // If script URL is relative, it's same domain
        if (!scriptUrl.startsWith('http')) {
            return true;
        }

        const scriptDomain = new URL(scriptUrl).hostname.toLowerCase();
        const targetDomain = new URL(targetUrl).hostname.toLowerCase();

        // Only exact matches are considered the same domain
        // blog.example.com and example.com are DIFFERENT domains
        return scriptDomain === targetDomain;
    } catch {
        // If URL parsing fails, assume it's not same domain
        return false;
    }
}

/**
 * Mock implementation of simple regex counting (buggy behavior for comparison)
 */
export function mockSimplePatternCount(htmlContent: string, pattern: string): number {
    return (htmlContent.match(new RegExp(pattern, 'g')) || []).length;
}

/**
 * Mock implementation of domain-aware pattern counting (correct behavior)
 */
export function mockDomainAwarePatternCount(htmlContent: string, pattern: string, targetUrl: string): number {
    if (!mockHasSameDomainHtmlPattern(htmlContent, pattern, targetUrl)) {
        return 0;
    }
    
    // Count only same-domain instances
    const targetDomain = extractDomain(targetUrl);
    let count = 0;
    
    // Count absolute URLs
    const urlRegex = new RegExp(`https?://[^\\s"']+${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s"']*`, 'gi');
    const matches = htmlContent.match(urlRegex);
    
    if (matches) {
        for (const match of matches) {
            const matchDomain = extractDomain(match);
            if (isSameDomain(targetDomain, matchDomain)) {
                count++;
            }
        }
    }
    
    // Count relative URLs
    const relativeRegex = new RegExp(`/${pattern}`, 'gi');
    let match;
    
    while ((match = relativeRegex.exec(htmlContent)) !== null) {
        const matchIndex = match.index;
        const contextStart = Math.max(0, matchIndex - 50);
        const beforeContext = htmlContent.substring(contextStart, matchIndex);
        
        if (!beforeContext.includes('http://') && !beforeContext.includes('https://')) {
            count++;
        }
    }
    
    return count;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.toLowerCase();
    } catch {
        return '';
    }
}

/**
 * Check if two domains are the same (exact match only)
 */
function isSameDomain(domain1: string, domain2: string): boolean {
    return domain1 === domain2;
}

/**
 * Creates test cases for domain validation
 */
export function createDomainValidationTestCases() {
    return [
        {
            name: 'same domain absolute URL',
            htmlContent: '<script src="https://example.com/wp-content/script.js"></script>',
            pattern: 'wp-content',
            targetUrl: 'https://example.com',
            expectedSameDomain: true,
            expectedCount: 1
        },
        {
            name: 'different domain absolute URL',
            htmlContent: '<img src="https://blog.example.com/wp-content/image.jpg">',
            pattern: 'wp-content',
            targetUrl: 'https://example.com',
            expectedSameDomain: false,
            expectedCount: 0
        },
        {
            name: 'relative URL (implicit same domain)',
            htmlContent: '<link href="/wp-content/themes/style.css">',
            pattern: 'wp-content',
            targetUrl: 'https://example.com',
            expectedSameDomain: true,
            expectedCount: 1
        },
        {
            name: 'pattern within external absolute URL',
            htmlContent: 'Visit https://external.com/wp-content/page.html for more info',
            pattern: 'wp-content',
            targetUrl: 'https://example.com',
            expectedSameDomain: false,
            expectedCount: 0
        },
        {
            name: 'logrocket false positive case',
            htmlContent: createLogrocketMockData().htmlContent!,
            pattern: 'wp-content',
            targetUrl: 'https://logrocket.com',
            expectedSameDomain: false,
            expectedCount: 0
        },
        {
            name: 'mixed same and different domain',
            htmlContent: `
                <script src="https://example.com/wp-content/local.js"></script>
                <img src="https://cdn.example.com/wp-content/image.jpg">
                <link href="/wp-content/style.css">
            `,
            pattern: 'wp-content',
            targetUrl: 'https://example.com',
            expectedSameDomain: true,
            expectedCount: 2 // local script + relative link
        }
    ];
}

/**
 * Version validation test data
 */
export function createVersionValidationTestCases() {
    return {
        wordpress: {
            valid: ['4.0', '4.9.18', '5.0', '5.8.1', '6.3.1', '6.0.0'],
            invalid: ['3.9.2', '11.0', '4.25.1', '6.3.25', '2.1', '15.0']
        },
        drupal: {
            valid: ['7', '8', '9.5.2', '10.1.5', '11.0', '8.9.20'],
            invalid: ['5.7', '12.0', '6.0', '9.60.1', '10.100.5']
        },
        joomla: {
            valid: ['1.5', '2.5.28', '3.10.12', '4.2.3', '5.0.0'],
            invalid: ['0.9', '6.0', '1.100.5', '4.15.1', '3.25.0']
        }
    };
}

/**
 * Setup function for ground-truth specific tests
 */
export function setupGroundTruthTests() {
    beforeEach(() => {
        // Clear all mocks
        vi.clearAllMocks();
        
        // Reset any global state
        process.removeAllListeners('SIGINT');
        process.removeAllListeners('uncaughtException');
        process.removeAllListeners('unhandledRejection');
        
        // Restore TTY status
        Object.defineProperty(process.stdin, 'isTTY', {
            value: true,
            configurable: true
        });
    });
    
    afterEach(() => {
        // Cleanup any test-specific state
        vi.restoreAllMocks();
    });
}

export default {
    createMockCMSData,
    createWordPressMockData,
    createDrupalMockData,
    createJoomlaMockData,
    createLogrocketMockData,
    createMockGroundTruthDatabase,
    createDiscriminativeFeatures,
    mockHasSameDomainHtmlPattern,
    mockIsSameDomainScript,
    mockSimplePatternCount,
    mockDomainAwarePatternCount,
    createDomainValidationTestCases,
    createVersionValidationTestCases,
    setupGroundTruthTests
};