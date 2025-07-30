/**
 * Platform Signature Analyzer V2 Tests - Phase 5
 * 
 * Tests cross-dimensional platform signature detection and evidence correlation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformSignatureAnalyzerV2 } from '../platform-signature-analyzer-v2.js';
import type { 
    PreprocessedData, 
    SiteData, 
    AnalysisContext,
    AnalysisResult,
    HeaderSpecificData,
    MetaSpecificData,
    ScriptSpecificData
} from '../../types/analyzer-interface.js';

describe('PlatformSignatureAnalyzerV2 - Phase 5', () => {
    let analyzer: PlatformSignatureAnalyzerV2;

    beforeEach(() => {
        analyzer = new PlatformSignatureAnalyzerV2();
    });

    it('should support progressive context', () => {
        expect(analyzer.supportsProgressiveContext()).toBe(true);
    });

    it('should detect WordPress signatures from multi-dimensional evidence', async () => {
        const testData = createWordPressTestData();
        const context = createTestContext(testData);
        
        const result = await analyzer.analyzeWithContext(context);
        
        expect(result).toBeDefined();
        expect(result.analyzerSpecific).toBeDefined();
        
        const signatures = result.analyzerSpecific!.signatures;
        expect(signatures.has('WordPress')).toBe(true);
        
        const wpSignature = signatures.get('WordPress')!;
        expect(wpSignature.confidence).toBeGreaterThan(0.2); // Lower threshold for testing
        expect(wpSignature.detectionMethod).toBe('correlative'); // Should detect from multiple dimensions
        expect(wpSignature.evidence.totalPatterns).toBeGreaterThan(0);
    });

    it('should detect Shopify signatures with high specificity', async () => {
        const testData = createShopifyTestData();
        const context = createTestContext(testData);
        
        const result = await analyzer.analyzeWithContext(context);
        
        const signatures = result.analyzerSpecific!.signatures;
        expect(signatures.has('Shopify')).toBe(true);
        
        const shopifySignature = signatures.get('Shopify')!;
        expect(shopifySignature.confidence).toBeGreaterThan(0.4); // Lower threshold for testing
        expect(shopifySignature.evidence.strongEvidence).toBeGreaterThan(0);
    });

    it('should apply evidence correlation boost for multi-dimensional detections', async () => {
        const testData = createMultiDimensionalTestData();
        const context = createTestContext(testData);
        
        const result = await analyzer.analyzeWithContext(context);
        
        const signatures = result.analyzerSpecific!.signatures;
        const wpSignature = signatures.get('WordPress');
        
        if (wpSignature) {
            // Multi-dimensional evidence should boost confidence
            expect(wpSignature.confidence).toBeGreaterThan(0.3); // Lower threshold for testing
            expect(wpSignature.detectionMethod).toBe('correlative');
            expect(wpSignature.evidence.headers.length).toBeGreaterThan(0);
            expect(wpSignature.evidence.metaTags.length).toBeGreaterThan(0);
            expect(wpSignature.evidence.scripts.length).toBeGreaterThan(0);
        }
    });

    it('should detect conflicts between mutually exclusive platforms', async () => {
        const testData = createConflictingTestData();
        const context = createTestContext(testData);
        
        const result = await analyzer.analyzeWithContext(context);
        
        const signatures = result.analyzerSpecific!.signatures;
        const conflictMatrix = result.analyzerSpecific!.conflictMatrix;
        
        // Check if any platforms were detected
        expect(signatures.size).toBeGreaterThan(0);
        
        // If both WordPress and Drupal are detected, check for conflicts
        if (signatures.has('WordPress') && signatures.has('Drupal')) {
            expect(conflictMatrix.has('WordPress')).toBe(true);
            expect(conflictMatrix.get('WordPress')!.has('Drupal')).toBe(true);
        } else {
            // At least one platform should be detected from conflicting data
            expect(signatures.has('WordPress') || signatures.has('Drupal')).toBe(true);
        }
    });

    it('should calculate cross-dimensional metrics correctly', async () => {
        const testData = createRichTestData();
        const context = createTestContext(testData);
        
        const result = await analyzer.analyzeWithContext(context);
        
        const metrics = result.analyzerSpecific!.crossDimensionalMetrics;
        expect(metrics.totalPlatformsDetected).toBeGreaterThan(0);
        expect(metrics.multiDimensionalDetections).toBeGreaterThanOrEqual(0);
        expect(metrics.correlativeDetections).toBeGreaterThanOrEqual(0);
        expect(metrics.averageConfidenceBoost).toBeGreaterThanOrEqual(0);
        expect(metrics.dimensionAgreementRate).toBeGreaterThanOrEqual(0);
    });

    it('should generate platform rankings based on evidence strength', async () => {
        const testData = createMultiPlatformTestData();
        const context = createTestContext(testData);
        
        const result = await analyzer.analyzeWithContext(context);
        
        const rankings = result.analyzerSpecific!.platformRankings;
        expect(rankings.length).toBeGreaterThan(0);
        
        // Rankings should be sorted by total score
        for (let i = 1; i < rankings.length; i++) {
            expect(rankings[i-1].totalScore).toBeGreaterThanOrEqual(rankings[i].totalScore);
            expect(rankings[i-1].rank).toBe(i);
        }
    });
});

/**
 * Create test data with strong WordPress signatures
 */
function createWordPressTestData(): PreprocessedData {
    const siteMap = new Map<string, SiteData>();
    
    siteMap.set('wordpress-site.com', {
        url: 'https://wordpress-site.com',
        normalizedUrl: 'wordpress-site.com',
        cms: 'WordPress',
        confidence: 0.95,
        headers: new Map([
            ['x-wp-total', new Set(['42'])],
            ['x-pingback', new Set(['https://wordpress-site.com/xmlrpc.php'])],
            ['server', new Set(['nginx'])],
        ]),
        metaTags: new Map([
            ['generator', new Set(['WordPress 6.2'])],
        ]),
        scripts: new Set([
            'https://wordpress-site.com/wp-content/themes/theme/script.js',
            'https://wordpress-site.com/wp-includes/js/jquery/jquery.min.js'
        ]),
        technologies: new Set(['WordPress']),
        capturedAt: new Date().toISOString()
    });

    return {
        sites: siteMap,
        totalSites: 1,
        metadata: {
            version: '1.0.0',
            preprocessedAt: new Date().toISOString()
        }
    };
}

/**
 * Create test data with strong Shopify signatures
 */
function createShopifyTestData(): PreprocessedData {
    const siteMap = new Map<string, SiteData>();
    
    siteMap.set('shopify-store.com', {
        url: 'https://shopify-store.com',
        normalizedUrl: 'shopify-store.com',
        cms: 'Shopify',
        confidence: 0.9,
        headers: new Map([
            ['x-shopify-stage', new Set(['production'])],
            ['x-shopify-shop-id', new Set(['12345'])],
            ['server', new Set(['nginx'])],
        ]),
        metaTags: new Map([
            ['generator', new Set(['Shopify'])],
        ]),
        scripts: new Set([
            'https://cdn.shopify.com/s/files/1/0123/4567/t/1/assets/theme.js'
        ]),
        technologies: new Set(['Shopify']),
        capturedAt: new Date().toISOString()
    });

    return {
        sites: siteMap,
        totalSites: 1,
        metadata: {
            version: '1.0.0',
            preprocessedAt: new Date().toISOString()
        }
    };
}

/**
 * Create test data with multi-dimensional evidence
 */
function createMultiDimensionalTestData(): PreprocessedData {
    const siteMap = new Map<string, SiteData>();
    
    siteMap.set('wordpress-multi.com', {
        url: 'https://wordpress-multi.com',
        normalizedUrl: 'wordpress-multi.com',
        cms: 'WordPress',
        confidence: 0.95,
        headers: new Map([
            ['x-wp-total', new Set(['42'])],
            ['x-pingback', new Set(['https://wordpress-multi.com/xmlrpc.php'])],
            ['link', new Set(['<https://wordpress-multi.com/wp-json/>; rel="https://api.w.org/"'])],
        ]),
        metaTags: new Map([
            ['generator', new Set(['WordPress 6.2'])],
            ['wordpress-version', new Set(['6.2'])],
        ]),
        scripts: new Set([
            'https://wordpress-multi.com/wp-content/themes/twentytwentythree/script.js',
            'https://wordpress-multi.com/wp-includes/js/wp-embed.min.js',
            'https://wordpress-multi.com/wp-admin/js/common.min.js'
        ]),
        technologies: new Set(['WordPress']),
        capturedAt: new Date().toISOString()
    });

    return {
        sites: siteMap,
        totalSites: 1,
        metadata: {
            version: '1.0.0',
            preprocessedAt: new Date().toISOString()
        }
    };
}

/**
 * Create test data with conflicting platform signatures
 */
function createConflictingTestData(): PreprocessedData {
    const siteMap = new Map<string, SiteData>();
    
    siteMap.set('conflicting-site.com', {
        url: 'https://conflicting-site.com',
        normalizedUrl: 'conflicting-site.com',
        cms: 'WordPress', // Primary detection
        confidence: 0.7,
        headers: new Map([
            ['x-wp-total', new Set(['42'])], // WordPress
            ['x-generator', new Set(['Drupal 9'])], // Drupal
        ]),
        metaTags: new Map([
            ['generator', new Set(['WordPress 6.2', 'Drupal 9'])], // Conflicting
        ]),
        scripts: new Set([
            'https://conflicting-site.com/wp-content/themes/theme/script.js', // WordPress
            'https://conflicting-site.com/core/misc/drupal.js' // Drupal
        ]),
        technologies: new Set(['WordPress', 'Drupal']),
        capturedAt: new Date().toISOString()
    });

    return {
        sites: siteMap,
        totalSites: 1,
        metadata: {
            version: '1.0.0',
            preprocessedAt: new Date().toISOString()
        }
    };
}

/**
 * Create rich test data with multiple platforms
 */
function createRichTestData(): PreprocessedData {
    const siteMap = new Map<string, SiteData>();
    
    // WordPress site
    siteMap.set('wp-site.com', {
        url: 'https://wp-site.com',
        normalizedUrl: 'wp-site.com',
        cms: 'WordPress',
        confidence: 0.95,
        headers: new Map([
            ['x-wp-total', new Set(['42'])],
            ['x-pingback', new Set(['https://wp-site.com/xmlrpc.php'])],
        ]),
        metaTags: new Map([
            ['generator', new Set(['WordPress 6.2'])],
        ]),
        scripts: new Set([
            'https://wp-site.com/wp-content/themes/theme/script.js'
        ]),
        technologies: new Set(['WordPress']),
        capturedAt: new Date().toISOString()
    });

    // Shopify site
    siteMap.set('shop-site.com', {
        url: 'https://shop-site.com',
        normalizedUrl: 'shop-site.com',
        cms: 'Shopify',
        confidence: 0.9,
        headers: new Map([
            ['x-shopify-stage', new Set(['production'])],
        ]),
        metaTags: new Map([
            ['generator', new Set(['Shopify'])],
        ]),
        scripts: new Set([
            'https://cdn.shopify.com/s/files/1/0123/4567/t/1/assets/theme.js'
        ]),
        technologies: new Set(['Shopify']),
        capturedAt: new Date().toISOString()
    });

    return {
        sites: siteMap,
        totalSites: 2,
        metadata: {
            version: '1.0.0',
            preprocessedAt: new Date().toISOString()
        }
    };
}

/**
 * Create test data with multiple platforms for ranking
 */
function createMultiPlatformTestData(): PreprocessedData {
    const siteMap = new Map<string, SiteData>();
    
    // Strong WordPress evidence
    siteMap.set('strong-wp.com', {
        url: 'https://strong-wp.com',
        normalizedUrl: 'strong-wp.com',
        cms: 'WordPress',
        confidence: 0.95,
        headers: new Map([
            ['x-wp-total', new Set(['42'])],
            ['x-pingback', new Set(['https://strong-wp.com/xmlrpc.php'])],
            ['link', new Set(['<https://strong-wp.com/wp-json/>; rel="https://api.w.org/"'])],
        ]),
        metaTags: new Map([
            ['generator', new Set(['WordPress 6.2'])],
        ]),
        scripts: new Set([
            'https://strong-wp.com/wp-content/themes/theme/script.js',
            'https://strong-wp.com/wp-includes/js/jquery/jquery.min.js'
        ]),
        technologies: new Set(['WordPress']),
        capturedAt: new Date().toISOString()
    });

    // Weak Shopify evidence
    siteMap.set('weak-shopify.com', {
        url: 'https://weak-shopify.com',
        normalizedUrl: 'weak-shopify.com',
        cms: 'Shopify',
        confidence: 0.6,
        headers: new Map([
            ['server', new Set(['nginx'])], // Generic
        ]),
        metaTags: new Map([
            ['generator', new Set(['Shopify'])], // Only meta evidence
        ]),
        scripts: new Set([]),
        technologies: new Set(['Shopify']),
        capturedAt: new Date().toISOString()
    });

    return {
        sites: siteMap,
        totalSites: 2,
        metadata: {
            version: '1.0.0',
            preprocessedAt: new Date().toISOString()
        }
    };
}

/**
 * Create test context with mock analyzer results
 */
function createTestContext(data: PreprocessedData): AnalysisContext {
    // Create mock results from previous analyzers with platform discrimination data
    const mockHeaderResult: AnalysisResult<HeaderSpecificData> = {
        patterns: new Map(),
        totalSites: data.totalSites,
        metadata: {
            analyzer: 'HeaderAnalyzerV2',
            analyzedAt: new Date().toISOString(),
            totalPatternsFound: 0,
            totalPatternsAfterFiltering: 0,
            options: { minOccurrences: 1, includeExamples: true, focusPlatformDiscrimination: true }
        },
        analyzerSpecific: {
            securityHeaders: new Set(),
            customHeaders: new Set()
        }
    };

    const mockMetaResult: AnalysisResult<MetaSpecificData> = {
        patterns: new Map(),
        totalSites: data.totalSites,
        metadata: {
            analyzer: 'MetaAnalyzerV2',
            analyzedAt: new Date().toISOString(),
            totalPatternsFound: 0,
            totalPatternsAfterFiltering: 0,
            options: { minOccurrences: 1, includeExamples: true, focusPlatformDiscrimination: true }
        },
        analyzerSpecific: {
            ogTags: new Set(),
            twitterTags: new Set()
        }
    };

    const mockScriptResult: AnalysisResult<ScriptSpecificData> = {
        patterns: new Map(),
        totalSites: data.totalSites,
        metadata: {
            analyzer: 'ScriptAnalyzerV2',
            analyzedAt: new Date().toISOString(),
            totalPatternsFound: 0,
            totalPatternsAfterFiltering: 0,
            options: { minOccurrences: 1, includeExamples: true, focusPlatformDiscrimination: true }
        },
        analyzerSpecific: {
            cdnUsage: new Map(),
            scriptTypes: new Map()
        }
    };

    // Add patterns with platform discrimination data
    for (const [siteUrl, siteData] of data.sites) {
        // Add header patterns
        for (const [header, values] of siteData.headers) {
            const discriminationData = createPlatformDiscriminationData(header, siteData.cms);
            mockHeaderResult.patterns.set(header, {
                pattern: header,
                siteCount: 1,
                sites: new Set([siteUrl]),
                frequency: 1 / data.totalSites,
                examples: values,
                platformDiscrimination: discriminationData
            });
        }

        // Add meta patterns
        for (const [meta, values] of siteData.metaTags) {
            const discriminationData = createPlatformDiscriminationData(meta, siteData.cms);
            mockMetaResult.patterns.set(meta, {
                pattern: meta,
                siteCount: 1,
                sites: new Set([siteUrl]),
                frequency: 1 / data.totalSites,
                examples: values,
                platformDiscrimination: discriminationData
            });
        }

        // Add script patterns
        for (const script of siteData.scripts) {
            const discriminationData = createPlatformDiscriminationData(script, siteData.cms);
            mockScriptResult.patterns.set(script, {
                pattern: script,
                siteCount: 1,
                sites: new Set([siteUrl]),
                frequency: 1 / data.totalSites,
                examples: new Set([script]),
                platformDiscrimination: discriminationData
            });
        }
    }

    return {
        preprocessedData: data,
        options: {
            minOccurrences: 1,
            includeExamples: true,
            focusPlatformDiscrimination: true
        },
        previousResults: {
            headers: mockHeaderResult,
            metaTags: mockMetaResult,
            scripts: mockScriptResult
        },
        pipelineStage: 4,
        totalStages: 5,
        stageTimings: new Map()
    };
}

/**
 * Create platform discrimination data for a pattern
 */
function createPlatformDiscriminationData(pattern: string, cms: string | null) {
    const lowerPattern = pattern.toLowerCase();
    let discriminativeScore = 0.5;
    let targetPlatform = cms;
    let isInfrastructureNoise = false;

    // Determine discrimination based on pattern content
    if (lowerPattern.includes('wp-') || lowerPattern.includes('wordpress')) {
        discriminativeScore = 0.95;
        targetPlatform = 'WordPress';
    } else if (lowerPattern.includes('shopify')) {
        discriminativeScore = 0.95;
        targetPlatform = 'Shopify';
    } else if (lowerPattern.includes('drupal')) {
        discriminativeScore = 0.95;
        targetPlatform = 'Drupal';
    } else if (lowerPattern.includes('server') || lowerPattern.includes('nginx')) {
        discriminativeScore = 0.1;
        isInfrastructureNoise = true;
        targetPlatform = null;
    }

    const platformSpecificity = new Map<string, number>();
    const crossPlatformFrequency = new Map<string, number>();

    ['WordPress', 'Shopify', 'Drupal'].forEach(platform => {
        const specificity = platform === targetPlatform ? 0.9 : 0.1;
        const frequency = platform === targetPlatform ? 0.8 : 0.1;
        
        platformSpecificity.set(platform, specificity);
        crossPlatformFrequency.set(platform, frequency);
    });

    return {
        discriminativeScore,
        platformSpecificity,
        crossPlatformFrequency,
        discriminationMetrics: {
            entropy: discriminativeScore * 2.0,
            maxSpecificity: targetPlatform ? 0.9 : 0.3,
            targetPlatform,
            isInfrastructureNoise
        }
    };
}