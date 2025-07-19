import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyDiscriminativeFilters, getFilteringStats } from '../filtering.js';
import { FilteringOptions, EnhancedDataCollection } from '../types.js';

describe('Discriminative Filtering System', () => {
    let mockData: EnhancedDataCollection;

    beforeEach(() => {
        mockData = {
            url: 'https://example.com',
            timestamp: new Date().toISOString(),
            htmlContent: '<html><head><title>Test</title></head><body>Test content</body></html>',
            scripts: [
                { src: 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js' },
                { src: 'https://example.com/wp-content/themes/theme/script.js' },
                { src: 'https://www.google-analytics.com/analytics.js' },
                { src: 'https://connect.facebook.net/en_US/fbevents.js' },
                { src: 'https://example.com/custom-cms-script.js' }
            ],
            metaTags: [
                { name: 'viewport', content: 'width=device-width, initial-scale=1' },
                { name: 'generator', content: 'WordPress 6.3.1' },
                { name: 'robots', content: 'index, follow' },
                { name: 'description', content: 'Test website description' },
                { property: 'og:title', content: 'Test Page' },
                { name: 'custom-cms-tag', content: 'specific-value' }
            ],
            httpHeaders: {
                'server': 'Apache/2.4.41',
                'content-type': 'text/html; charset=UTF-8',
                'x-powered-by': 'PHP/7.4.3',
                'cache-control': 'max-age=0, no-cache',
                'x-generator': 'WordPress 6.3.1',
                'x-custom-header': 'custom-value',
                'last-modified': 'Wed, 15 Nov 2023 12:00:00 GMT',
                'etag': '"abc123"',
                'vary': 'Accept-Encoding',
                'strict-transport-security': 'max-age=31536000'
            },
            robotsTxt: {
                content: 'User-agent: *\nDisallow: /wp-admin/',
                headers: {},
                statusCode: 200,
                accessible: true
            },
            domStructure: {
                classPatterns: ['wp-block', 'container', 'row', 'col-md-6'],
                idPatterns: ['header', 'footer', 'wp-content'],
                dataAttributes: ['data-toggle', 'data-target'],
                comments: ['WordPress 6.3.1', 'End of header']
            }
        };
    });

    describe('Conservative Filtering', () => {
        it('should remove generic HTTP headers while preserving discriminative ones', () => {
            const filtered = applyDiscriminativeFilters(mockData, { level: 'conservative' });
            
            // Should remove generic headers
            expect(filtered.httpHeaders).not.toHaveProperty('server');
            expect(filtered.httpHeaders).not.toHaveProperty('cache-control');
            expect(filtered.httpHeaders).not.toHaveProperty('last-modified');
            expect(filtered.httpHeaders).not.toHaveProperty('etag');
            expect(filtered.httpHeaders).not.toHaveProperty('vary');
            expect(filtered.httpHeaders).not.toHaveProperty('strict-transport-security');
            
            // Should preserve discriminative headers
            expect(filtered.httpHeaders).toHaveProperty('x-powered-by', 'PHP/7.4.3');
            expect(filtered.httpHeaders).toHaveProperty('x-generator', 'WordPress 6.3.1');
            expect(filtered.httpHeaders).toHaveProperty('x-custom-header', 'custom-value');
        });

        it('should remove universal meta tags while preserving discriminative ones', () => {
            const filtered = applyDiscriminativeFilters(mockData, { level: 'conservative' });
            
            // Should remove universal meta tags
            const metaTagNames = filtered.metaTags.map(tag => tag.name || tag.property);
            expect(metaTagNames).not.toContain('viewport');
            expect(metaTagNames).not.toContain('robots');
            expect(metaTagNames).not.toContain('description');
            expect(metaTagNames).not.toContain('og:title');
            
            // Should preserve discriminative meta tags
            expect(metaTagNames).toContain('generator');
            expect(metaTagNames).toContain('custom-cms-tag');
        });

        it('should not remove scripts in conservative mode', () => {
            const filtered = applyDiscriminativeFilters(mockData, { level: 'conservative' });
            
            // Conservative mode should preserve all scripts
            expect(filtered.scripts).toHaveLength(mockData.scripts.length);
        });

        it('should preserve original data structure', () => {
            const filtered = applyDiscriminativeFilters(mockData, { level: 'conservative' });
            
            // Should not mutate original data
            expect(mockData.httpHeaders).toHaveProperty('server');
            expect(mockData.metaTags.some(tag => tag.name === 'viewport')).toBe(true);
            
            // Should preserve required fields
            expect(filtered.url).toBe(mockData.url);
            expect(filtered.timestamp).toBe(mockData.timestamp);
            expect(filtered.htmlContent).toBe(mockData.htmlContent);
            expect(filtered.robotsTxt).toEqual(mockData.robotsTxt);
            expect(filtered.domStructure).toEqual(mockData.domStructure);
        });
    });

    describe('Aggressive Filtering', () => {
        it('should remove tracking scripts and common libraries', () => {
            const filtered = applyDiscriminativeFilters(mockData, { level: 'aggressive' });
            
            // Should remove tracking scripts
            const scriptSrcs = filtered.scripts.map(s => s.src).filter(Boolean);
            expect(scriptSrcs.some(src => src!.includes('jquery'))).toBe(false);
            expect(scriptSrcs.some(src => src!.includes('google-analytics'))).toBe(false);
            expect(scriptSrcs.some(src => src!.includes('facebook.net'))).toBe(false);
            
            // Should preserve discriminative scripts
            expect(scriptSrcs.some(src => src!.includes('wp-content'))).toBe(true);
            expect(scriptSrcs.some(src => src!.includes('custom-cms-script'))).toBe(true);
        });

        it('should apply all conservative filters plus additional ones', () => {
            const filtered = applyDiscriminativeFilters(mockData, { level: 'aggressive' });
            
            // Should apply conservative filtering
            expect(filtered.httpHeaders).not.toHaveProperty('server');
            expect(filtered.metaTags.some(tag => tag.name === 'viewport')).toBe(false);
            
            // Should apply aggressive filtering
            expect(filtered.scripts.length).toBeLessThan(mockData.scripts.length);
        });
    });

    describe('Custom Filtering', () => {
        it('should apply only specified filters', () => {
            const options: FilteringOptions = {
                level: 'custom',
                removeGenericHeaders: true,
                removeUniversalMetaTags: false,
                removeTrackingScripts: false,
                removeCommonLibraries: false
            };
            
            const filtered = applyDiscriminativeFilters(mockData, options);
            
            // Should remove headers but preserve meta tags and scripts
            expect(filtered.httpHeaders).not.toHaveProperty('server');
            expect(filtered.metaTags.some(tag => tag.name === 'viewport')).toBe(true);
            expect(filtered.scripts).toHaveLength(mockData.scripts.length);
        });

        it('should apply custom patterns', () => {
            const options: FilteringOptions = {
                level: 'custom',
                removeGenericHeaders: false,
                removeUniversalMetaTags: false,
                removeTrackingScripts: false,
                removeCommonLibraries: false,
                customFilters: ['wp-content', 'custom-cms']
            };
            
            const filtered = applyDiscriminativeFilters(mockData, options);
            
            // Should remove scripts matching custom patterns
            const scriptSrcs = filtered.scripts.map(s => s.src).filter(Boolean);
            expect(scriptSrcs.some(src => src!.includes('wp-content'))).toBe(false);
            expect(scriptSrcs.some(src => src!.includes('custom-cms'))).toBe(false);
            
            // Should preserve other scripts
            expect(scriptSrcs.some(src => src!.includes('jquery'))).toBe(true);
        });
    });

    describe('Token Reduction Measurement', () => {
        it('should calculate token reduction accurately', () => {
            const filtered = applyDiscriminativeFilters(mockData, { level: 'aggressive' });
            const stats = getFilteringStats(mockData, filtered);
            
            expect(stats.tokenReductionEstimate).toBeGreaterThan(0);
            expect(stats.tokenReductionEstimate).toBeLessThan(1);
            expect(stats.originalHeaders).toBeGreaterThan(stats.filteredHeaders);
            expect(stats.originalMetaTags).toBeGreaterThan(stats.filteredMetaTags);
            expect(stats.originalScripts).toBeGreaterThan(stats.filteredScripts);
        });

        it('should show no reduction when no filtering is applied', () => {
            const filtered = applyDiscriminativeFilters(mockData, { 
                level: 'custom',
                removeGenericHeaders: false,
                removeUniversalMetaTags: false,
                removeTrackingScripts: false,
                removeCommonLibraries: false
            });
            const stats = getFilteringStats(mockData, filtered);
            
            expect(stats.tokenReductionEstimate).toBe(0);
            expect(stats.originalHeaders).toBe(stats.filteredHeaders);
            expect(stats.originalMetaTags).toBe(stats.filteredMetaTags);
            expect(stats.originalScripts).toBe(stats.filteredScripts);
        });
    });

    describe('Performance', () => {
        it('should filter data efficiently', () => {
            const start = performance.now();
            applyDiscriminativeFilters(mockData, { level: 'aggressive' });
            const end = performance.now();
            
            // Should complete in reasonable time
            expect(end - start).toBeLessThan(50);
        });

        it('should handle large datasets', () => {
            // Create large dataset with mix of generic and custom headers
            const largeData: EnhancedDataCollection = {
                ...mockData,
                httpHeaders: {
                    ...Object.fromEntries(
                        Array.from({ length: 90 }, (_, i) => [`header-${i}`, `value-${i}`])
                    ),
                    // Add some generic headers that should be filtered
                    'server': 'Apache/2.4.41',
                    'cache-control': 'max-age=0',
                    'content-type': 'text/html',
                    'last-modified': 'Wed, 15 Nov 2023 12:00:00 GMT',
                    'etag': '"abc123"',
                    'vary': 'Accept-Encoding',
                    'expires': 'Thu, 01 Dec 1994 16:00:00 GMT',
                    'pragma': 'no-cache',
                    'connection': 'keep-alive',
                    'accept-ranges': 'bytes'
                },
                metaTags: [
                    ...Array.from({ length: 40 }, (_, i) => ({ 
                        name: `tag-${i}`, 
                        content: `content-${i}` 
                    })),
                    // Add some universal meta tags that should be filtered
                    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
                    { name: 'robots', content: 'index, follow' },
                    { name: 'description', content: 'Test website description' },
                    { name: 'author', content: 'Test Author' },
                    { name: 'keywords', content: 'test, keywords' },
                    { property: 'og:title', content: 'Test Page' },
                    { property: 'og:description', content: 'Test description' },
                    { name: 'twitter:card', content: 'summary' },
                    { name: 'theme-color', content: '#000000' },
                    { name: 'apple-mobile-web-app-capable', content: 'yes' }
                ],
                scripts: [
                    ...Array.from({ length: 40 }, (_, i) => ({ 
                        src: `https://example.com/script-${i}.js` 
                    })),
                    // Add some generic scripts that should be filtered
                    { src: 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js' },
                    { src: 'https://www.google-analytics.com/analytics.js' },
                    { src: 'https://connect.facebook.net/en_US/fbevents.js' },
                    { src: 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.1.3/js/bootstrap.min.js' },
                    { src: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap' },
                    { src: 'https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX' },
                    { src: 'https://static.hotjar.com/c/hotjar-123456.js' },
                    { src: 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js' },
                    { src: 'https://unpkg.com/axios@0.24.0/dist/axios.min.js' },
                    { src: 'https://polyfill.io/v3/polyfill.min.js' }
                ]
            };
            
            const start = performance.now();
            const filtered = applyDiscriminativeFilters(largeData, { level: 'aggressive' });
            const end = performance.now();
            
            expect(end - start).toBeLessThan(100);
            expect(Object.keys(filtered.httpHeaders).length).toBeLessThan(100);
            expect(filtered.metaTags.length).toBeLessThan(50);
            expect(filtered.scripts.length).toBeLessThan(50);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty data gracefully', () => {
            const emptyData: EnhancedDataCollection = {
                url: 'https://example.com',
                timestamp: new Date().toISOString(),
                htmlContent: '',
                scripts: [],
                metaTags: [],
                httpHeaders: {},
                robotsTxt: { content: '', headers: {}, statusCode: 404, accessible: false },
                domStructure: { classPatterns: [], idPatterns: [], dataAttributes: [], comments: [] }
            };
            
            const filtered = applyDiscriminativeFilters(emptyData, { level: 'aggressive' });
            
            expect(filtered.scripts).toHaveLength(0);
            expect(filtered.metaTags).toHaveLength(0);
            expect(Object.keys(filtered.httpHeaders)).toHaveLength(0);
        });

        it('should handle missing src in scripts', () => {
            const dataWithInlineScripts: EnhancedDataCollection = {
                ...mockData,
                scripts: [
                    { content: 'console.log("inline script");' },
                    { src: 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js' }
                ]
            };
            
            const filtered = applyDiscriminativeFilters(dataWithInlineScripts, { level: 'aggressive' });
            
            // Should preserve inline scripts (no src)
            expect(filtered.scripts.some(s => s.content?.includes('inline script'))).toBe(true);
            // Should remove external jQuery
            expect(filtered.scripts.some(s => s.src?.includes('jquery'))).toBe(false);
        });

        it('should handle case-insensitive header matching', () => {
            const dataWithMixedCaseHeaders: EnhancedDataCollection = {
                ...mockData,
                httpHeaders: {
                    'Server': 'Apache/2.4.41',
                    'CACHE-CONTROL': 'no-cache',
                    'X-Powered-By': 'PHP/7.4.3'
                }
            };
            
            const filtered = applyDiscriminativeFilters(dataWithMixedCaseHeaders, { level: 'conservative' });
            
            // Should remove generic headers regardless of case
            expect(filtered.httpHeaders).not.toHaveProperty('Server');
            expect(filtered.httpHeaders).not.toHaveProperty('CACHE-CONTROL');
            // Should preserve discriminative headers
            expect(filtered.httpHeaders).toHaveProperty('X-Powered-By');
        });
    });
});