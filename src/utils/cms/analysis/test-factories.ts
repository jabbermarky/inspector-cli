/**
 * Test data factories for DataStorage testing
 * Provides realistic test data matching the DetectionDataPoint structure
 */

import { DetectionDataPoint } from './types.js';

/**
 * Create a basic DetectionDataPoint with sensible defaults
 */
export function createTestDataPoint(overrides: Partial<DetectionDataPoint> = {}): DetectionDataPoint {
    const baseDataPoint: DetectionDataPoint = {
        // Basic metadata
        url: 'https://example.com',
        timestamp: new Date(), // Use current timestamp by default
        userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
        
        // Version information
        captureVersion: {
            schema: '1',
            engine: {
                version: '1.0.0',
                commit: 'abc123',
                buildDate: '2025-01-01T00:00:00Z'
            },
            algorithms: {
                detection: '1',
                confidence: '1'
            },
            patterns: {
                lastUpdated: '2025-01-01T00:00:00Z'
            },
            features: {
                experimentalFlags: []
            }
        },
        
        // Navigation information
        originalUrl: 'https://example.com',
        finalUrl: 'https://example.com',
        redirectChain: [],
        totalRedirects: 0,
        protocolUpgraded: false,
        navigationTime: 500,
        
        // HTTP response data
        httpHeaders: {
            'server': 'Apache/2.4.41',
            'content-type': 'text/html; charset=UTF-8'
        },
        statusCode: 200,
        contentType: 'text/html',
        contentLength: 1024,
        
        // HTML metadata
        metaTags: [
            { name: 'generator', content: 'WordPress 6.1' }
        ],
        title: 'Example Website',
        
        // HTML content analysis
        htmlContent: '<html><head><meta name="generator" content="WordPress 6.1"></head><body><h1>Example Site</h1></body></html>',
        htmlSize: 1024,
        
        // Robots.txt analysis
        robotsTxt: {
            content: 'User-agent: *\nDisallow: /wp-admin/',
            accessible: true,
            size: 30,
            statusCode: 200,
            httpHeaders: { 'content-type': 'text/plain' },
            responseTime: 100,
            patterns: {
                disallowedPaths: ['/wp-admin/'],
                sitemapUrls: [],
                userAgents: ['*']
            }
        },
        
        // DOM structure analysis
        domElements: [
            { selector: 'meta[name="generator"]', count: 1, sample: '<meta name="generator" content="WordPress 6.1">' },
            { selector: 'link[rel="stylesheet"]', count: 3 }
        ],
        
        // Link analysis
        links: [
            { href: '/wp-content/themes/theme/style.css', rel: 'stylesheet', type: 'text/css' },
            { href: '/wp-admin/', text: 'Admin' }
        ],
        
        // Script and style analysis
        scripts: [
            { src: '/wp-includes/js/jquery/jquery.min.js', type: 'text/javascript' },
            { inline: true, content: 'var wpAjaxUrl = "/wp-admin/admin-ajax.php";', type: 'text/javascript' }
        ],
        
        stylesheets: [
            { href: '/wp-content/themes/theme/style.css' },
            { inline: true, content: 'body { font-family: Arial, sans-serif; }' }
        ],
        
        // Form analysis
        forms: [
            { action: '/wp-admin/admin-ajax.php', method: 'POST', fieldCount: 3, fieldTypes: ['text', 'email', 'submit'] }
        ],
        
        // Technology detection hints
        technologies: [
            { name: 'WordPress', confidence: 0.95, evidence: ['wp-content', 'wp-admin', 'generator meta tag'], category: 'cms' },
            { name: 'jQuery', confidence: 0.85, evidence: ['jquery.min.js'], category: 'library' }
        ],
        
        // Performance metrics
        loadTime: 1200,
        resourceCount: 25,
        
        // Detection results
        detectionResults: [
            { detector: 'WordPress', strategy: 'meta-tag', cms: 'WordPress', confidence: 0.95, version: '6.1', executionTime: 100 },
            { detector: 'WordPress', strategy: 'http-headers', cms: 'WordPress', confidence: 0.80, executionTime: 50 }
        ],
        
        // Error information
        errors: []
    };

    // Apply overrides
    return { ...baseDataPoint, ...overrides };
}

/**
 * Create a WordPress-specific data point
 */
export function createWordPressDataPoint(overrides: Partial<DetectionDataPoint> = {}): DetectionDataPoint {
    return createTestDataPoint({
        url: 'https://wordpress-example.com',
        metaTags: [
            { name: 'generator', content: 'WordPress 6.1' }
        ],
        htmlContent: '<html><head><meta name="generator" content="WordPress 6.1"></head><body><h1>WordPress Site</h1></body></html>',
        links: [
            { href: '/wp-content/themes/twentytwentythree/style.css', rel: 'stylesheet' },
            { href: '/wp-admin/', text: 'Dashboard' }
        ],
        scripts: [
            { src: '/wp-includes/js/jquery/jquery.min.js' },
            { src: '/wp-content/themes/twentytwentythree/script.js' }
        ],
        detectionResults: [
            { detector: 'WordPress', strategy: 'meta-tag', cms: 'WordPress', confidence: 0.95, version: '6.1', executionTime: 100 },
            { detector: 'WordPress', strategy: 'url-pattern', cms: 'WordPress', confidence: 0.90, executionTime: 75 }
        ],
        ...overrides
    });
}

/**
 * Create a Drupal-specific data point
 */
export function createDrupalDataPoint(overrides: Partial<DetectionDataPoint> = {}): DetectionDataPoint {
    return createTestDataPoint({
        url: 'https://drupal-example.com',
        metaTags: [
            { name: 'generator', content: 'Drupal 10' }
        ],
        htmlContent: '<html><head><meta name="generator" content="Drupal 10"></head><body><h1>Drupal Site</h1></body></html>',
        links: [
            { href: '/core/themes/olivero/css/base/base.css', rel: 'stylesheet' },
            { href: '/admin/', text: 'Admin' }
        ],
        scripts: [
            { src: '/core/assets/vendor/jquery/jquery.min.js' },
            { src: '/core/misc/drupal.js' }
        ],
        detectionResults: [
            { detector: 'Drupal', strategy: 'meta-tag', cms: 'Drupal', confidence: 0.95, version: '10', executionTime: 100 },
            { detector: 'Drupal', strategy: 'url-pattern', cms: 'Drupal', confidence: 0.85, executionTime: 80 }
        ],
        ...overrides
    });
}

/**
 * Create a Joomla-specific data point
 */
export function createJoomlaDataPoint(overrides: Partial<DetectionDataPoint> = {}): DetectionDataPoint {
    return createTestDataPoint({
        url: 'https://joomla-example.com',
        metaTags: [
            { name: 'generator', content: 'Joomla! 4.2' }
        ],
        htmlContent: '<html><head><meta name="generator" content="Joomla! 4.2"></head><body><h1>Joomla Site</h1></body></html>',
        links: [
            { href: '/templates/cassiopeia/css/template.css', rel: 'stylesheet' },
            { href: '/administrator/', text: 'Administrator' }
        ],
        scripts: [
            { src: '/media/system/js/core.js' },
            { src: '/templates/cassiopeia/js/template.js' }
        ],
        detectionResults: [
            { detector: 'Joomla', strategy: 'meta-tag', cms: 'Joomla', confidence: 0.95, version: '4.2', executionTime: 100 },
            { detector: 'Joomla', strategy: 'url-pattern', cms: 'Joomla', confidence: 0.88, executionTime: 70 }
        ],
        ...overrides
    });
}

/**
 * Create a Duda-specific data point
 */
export function createDudaDataPoint(overrides: Partial<DetectionDataPoint> = {}): DetectionDataPoint {
    return createTestDataPoint({
        url: 'https://duda-example.com',
        metaTags: [
            { name: 'viewport', content: 'width=device-width, initial-scale=1' }
        ],
        htmlContent: '<html><head><script src="https://irp.cdn-website.com/js/main.js"></script></head><body><div class="dmBody"><script>window.Parameters = window.Parameters || {};</script></div></body></html>',
        links: [
            { href: 'https://lirp.cdn-website.com/css/styles.css', rel: 'stylesheet' },
            { href: 'https://www.dudamobile.com', text: 'Mobile Website Builder' }
        ],
        scripts: [
            { src: 'https://irp.cdn-website.com/js/main.js' },
            { inline: true, content: 'window.Parameters = window.Parameters || {}; var config = { SiteType: atob("RFVEQU9ORQ=="), productId: "DM_DIRECT", BlockContainerSelector: ".dmBody" };' }
        ],
        stylesheets: [
            { href: 'https://lirp.cdn-website.com/css/styles.css' }
        ],
        technologies: [
            { name: 'Duda', confidence: 0.95, evidence: ['window.Parameters', 'irp.cdn-website.com', '.dmBody'], category: 'cms' }
        ],
        detectionResults: [
            { detector: 'Duda', strategy: 'duda-javascript', cms: 'Duda', confidence: 0.95, executionTime: 120 },
            { detector: 'Duda', strategy: 'html-content', cms: 'Duda', confidence: 0.85, executionTime: 80 }
        ],
        ...overrides
    });
}

/**
 * Create a data point with no CMS detected
 */
export function createUnknownCMSDataPoint(overrides: Partial<DetectionDataPoint> = {}): DetectionDataPoint {
    return createTestDataPoint({
        url: 'https://static-example.com',
        metaTags: [
            { name: 'description', content: 'Static HTML site' }
        ],
        htmlContent: '<html><head><title>Static Site</title></head><body><h1>Static HTML Site</h1></body></html>',
        links: [
            { href: '/css/style.css', rel: 'stylesheet' },
            { href: '/about.html', text: 'About' }
        ],
        scripts: [
            { src: '/js/main.js' }
        ],
        detectionResults: [
            { detector: 'Unknown', strategy: 'fallback', cms: 'Unknown', confidence: 0.1, executionTime: 50 }
        ],
        ...overrides
    });
}

/**
 * Create a data point with multiple detection results (conflicting)
 */
export function createMultipleDetectionDataPoint(overrides: Partial<DetectionDataPoint> = {}): DetectionDataPoint {
    return createTestDataPoint({
        url: 'https://mixed-example.com',
        detectionResults: [
            { detector: 'WordPress', strategy: 'meta-tag', cms: 'WordPress', confidence: 0.60, version: '6.1', executionTime: 100 },
            { detector: 'Drupal', strategy: 'url-pattern', cms: 'Drupal', confidence: 0.70, version: '10', executionTime: 80 },
            { detector: 'Custom', strategy: 'custom', cms: 'Custom', confidence: 0.40, executionTime: 60 }
        ],
        ...overrides
    });
}

/**
 * Create a data point with errors
 */
export function createErrorDataPoint(overrides: Partial<DetectionDataPoint> = {}): DetectionDataPoint {
    return createTestDataPoint({
        url: 'https://error-example.com',
        statusCode: 500,
        errors: [
            { stage: 'navigation', error: 'Timeout after 10 seconds' },
            { stage: 'parsing', error: 'Invalid HTML structure' }
        ],
        detectionResults: [
            { detector: 'Unknown', strategy: 'fallback', cms: 'Unknown', confidence: 0.1, executionTime: 50 }
        ],
        ...overrides
    });
}

/**
 * Create a batch of test data points
 */
export function createTestDataPointBatch(count: number = 10): DetectionDataPoint[] {
    const dataPoints: DetectionDataPoint[] = [];
    
    for (let i = 0; i < count; i++) {
        const cmsType = ['WordPress', 'Drupal', 'Joomla', 'Duda', 'Unknown'][i % 5];
        const url = `https://example${i}.com`;
        const timestamp = new Date(Date.now() - (i * 3600000)); // 1 hour apart
        
        switch (cmsType) {
            case 'WordPress':
                dataPoints.push(createWordPressDataPoint({ url, timestamp }));
                break;
            case 'Drupal':
                dataPoints.push(createDrupalDataPoint({ url, timestamp }));
                break;
            case 'Joomla':
                dataPoints.push(createJoomlaDataPoint({ url, timestamp }));
                break;
            case 'Duda':
                dataPoints.push(createDudaDataPoint({ url, timestamp }));
                break;
            default:
                dataPoints.push(createUnknownCMSDataPoint({ url, timestamp }));
        }
    }
    
    return dataPoints;
}

/**
 * Create a large batch for performance testing
 */
export function createLargeTestDataBatch(count: number = 1000): DetectionDataPoint[] {
    return createTestDataPointBatch(count);
}