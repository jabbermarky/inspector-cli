import { DetectionDataPoint, CollectionConfig, DataCollectionResult } from './types.js';
import { BrowserManager, ManagedPage } from '../../browser/index.js';
import { createModuleLogger } from '../../logger.js';
import { validateAndNormalizeUrl } from '../../url/index.js';

const logger = createModuleLogger('data-collector');

/**
 * Comprehensive data collector for CMS analysis
 * Captures all relevant data points for pattern analysis and rule generation
 */
export class DataCollector {
    private browserManager: BrowserManager;
    private config: CollectionConfig;

    constructor(browserManager: BrowserManager, config: Partial<CollectionConfig> = {}) {
        this.browserManager = browserManager;
        this.config = {
            includeHtmlContent: true,
            includeDomAnalysis: true,
            includeScriptAnalysis: true,
            maxHtmlSize: 500000, // 500KB
            maxScriptSize: 10000, // 10KB
            timeout: 10000,
            retryAttempts: 2,
            respectRobots: true,
            compress: true,
            outputFormat: 'json',
            ...config
        };
    }

    /**
     * Collect comprehensive data for a single URL
     */
    async collect(url: string): Promise<DataCollectionResult> {
        const startTime = Date.now();
        
        try {
            logger.info('Starting data collection', { url });

            // Validate and normalize URL
            const validationContext = {
                environment: 'production' as const,
                allowLocalhost: false,
                allowPrivateIPs: false,
                allowCustomPorts: false,
                defaultProtocol: 'http' as const
            };
            
            const normalizedUrl = validateAndNormalizeUrl(url, { context: validationContext });
            
            // Create isolated page for clean collection
            const { page, context } = await this.browserManager.createPageInIsolatedContext(normalizedUrl);
            
            try {
                // Collect all data points
                const dataPoint = await this.collectDataPoint(page, url, normalizedUrl);
                
                const executionTime = Date.now() - startTime;
                logger.info('Data collection completed', {
                    url: normalizedUrl,
                    dataSize: JSON.stringify(dataPoint).length,
                    executionTime
                });

                return {
                    success: true,
                    dataPoint,
                    executionTime
                };
                
            } finally {
                // Clean up isolated context
                await this.browserManager.closeContext(context);
            }
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            logger.error('Data collection failed', {
                url,
                error: (error as Error).message,
                executionTime
            });

            return {
                success: false,
                error: (error as Error).message,
                executionTime
            };
        }
    }

    /**
     * Collect comprehensive data point from page
     */
    private async collectDataPoint(page: ManagedPage, originalUrl: string, finalUrl: string): Promise<DetectionDataPoint> {
        const timestamp = new Date();
        
        // Collect navigation information
        const navigationInfo = this.browserManager.getNavigationInfo(page);
        
        // Collect HTTP response data (simplified for now)
        const httpHeaders: Record<string, string> = {};
        const statusCode = 200; // Will be enhanced in future iterations

        // Collect HTML content
        const htmlContent = await this.collectHtmlContent(page);
        
        // Collect meta tags
        const metaTags = await this.collectMetaTags(page);
        
        // Collect DOM elements
        const domElements = this.config.includeDomAnalysis ? 
            await this.collectDomElements(page) : [];
        
        // Collect links
        const links = await this.collectLinks(page);
        
        // Collect scripts and stylesheets
        const scripts = this.config.includeScriptAnalysis ? 
            await this.collectScripts(page) : [];
        const stylesheets = this.config.includeScriptAnalysis ? 
            await this.collectStylesheets(page) : [];
        
        // Collect forms
        const forms = await this.collectForms(page);
        
        // Collect page title
        const title = await this.collectTitle(page);
        
        // Collect performance metrics
        const performanceMetrics = await this.collectPerformanceMetrics(page);

        return {
            url: originalUrl,
            timestamp,
            userAgent: await page.evaluate(() => navigator.userAgent),
            
            // Navigation information
            originalUrl,
            finalUrl: navigationInfo?.finalUrl || finalUrl,
            redirectChain: navigationInfo?.redirectChain?.map(redirect => ({
                from: redirect.from,
                to: redirect.to,
                statusCode: redirect.status
            })) || [],
            totalRedirects: navigationInfo?.totalRedirects || 0,
            protocolUpgraded: navigationInfo?.protocolUpgraded || false,
            navigationTime: navigationInfo?.navigationTime || 0,
            
            // HTTP response data
            httpHeaders,
            statusCode,
            contentType: httpHeaders['content-type'] || '',
            contentLength: parseInt(httpHeaders['content-length'] || '0', 10) || undefined,
            
            // HTML metadata
            metaTags,
            title,
            
            // HTML content
            htmlContent: this.config.includeHtmlContent ? htmlContent : '',
            htmlSize: htmlContent.length,
            
            // DOM structure
            domElements,
            
            // Links and resources
            links,
            scripts,
            stylesheets,
            forms,
            
            // Technology detection (placeholder for now)
            technologies: [],
            
            // Performance
            loadTime: performanceMetrics.loadTime,
            resourceCount: performanceMetrics.resourceCount,
            
            // Detection results (will be populated by caller)
            detectionResults: [],
            
            // Errors
            errors: []
        };
    }

    private async collectHtmlContent(page: ManagedPage): Promise<string> {
        try {
            const html = await page.content();
            return html.length > this.config.maxHtmlSize ? 
                html.substring(0, this.config.maxHtmlSize) + '...[truncated]' : 
                html;
        } catch (error) {
            logger.warn('Failed to collect HTML content', { error: (error as Error).message });
            return '';
        }
    }

    private async collectMetaTags(page: ManagedPage): Promise<DetectionDataPoint['metaTags']> {
        try {
            return await page.evaluate(() => {
                const metaTags: any[] = [];
                const metas = document.querySelectorAll('meta');
                
                metas.forEach(meta => {
                    const tag: any = {
                        content: meta.getAttribute('content') || ''
                    };
                    
                    if (meta.getAttribute('name')) tag.name = meta.getAttribute('name');
                    if (meta.getAttribute('property')) tag.property = meta.getAttribute('property');
                    if (meta.getAttribute('http-equiv')) tag.httpEquiv = meta.getAttribute('http-equiv');
                    
                    metaTags.push(tag);
                });
                
                return metaTags;
            });
        } catch (error) {
            logger.warn('Failed to collect meta tags', { error: (error as Error).message });
            return [];
        }
    }

    private async collectDomElements(page: ManagedPage): Promise<DetectionDataPoint['domElements']> {
        try {
            return await page.evaluate(() => {
                const selectors = [
                    'script[src*="wp-"]',
                    'link[href*="wp-"]',
                    'script[src*="drupal"]',
                    'script[src*="joomla"]',
                    'div[id*="wp-"]',
                    'div[class*="wp-"]',
                    'body[class*="wp-"]',
                    'html[class*="wp-"]',
                    'link[href*="/sites/"]',
                    'script[src*="/sites/"]',
                    'div[id*="block-"]',
                    'div[class*="block-"]'
                ];
                
                const elements: any[] = [];
                
                selectors.forEach(selector => {
                    try {
                        const found = document.querySelectorAll(selector);
                        if (found.length > 0) {
                            const sample = found[0];
                            elements.push({
                                selector,
                                count: found.length,
                                sample: sample.outerHTML.substring(0, 200),
                                attributes: Array.from(sample.attributes).reduce((acc: any, attr) => {
                                    acc[attr.name] = attr.value;
                                    return acc;
                                }, {})
                            });
                        }
                    } catch (e) {
                        // Ignore invalid selectors
                    }
                });
                
                return elements;
            });
        } catch (error) {
            logger.warn('Failed to collect DOM elements', { error: (error as Error).message });
            return [];
        }
    }

    private async collectLinks(page: ManagedPage): Promise<DetectionDataPoint['links']> {
        try {
            return await page.evaluate(() => {
                const links: any[] = [];
                const linkElements = document.querySelectorAll('a[href], link[href]');
                
                linkElements.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href) {
                        links.push({
                            href,
                            text: link.textContent?.trim().substring(0, 100) || '',
                            rel: link.getAttribute('rel') || undefined,
                            type: link.getAttribute('type') || undefined
                        });
                    }
                });
                
                return links.slice(0, 100); // Limit to first 100 links
            });
        } catch (error) {
            logger.warn('Failed to collect links', { error: (error as Error).message });
            return [];
        }
    }

    private async collectScripts(page: ManagedPage): Promise<DetectionDataPoint['scripts']> {
        try {
            return await page.evaluate((maxSize) => {
                const scripts: any[] = [];
                const scriptElements = document.querySelectorAll('script');
                
                scriptElements.forEach(script => {
                    const src = script.getAttribute('src');
                    const isInline = !src && script.textContent;
                    
                    scripts.push({
                        src: src || undefined,
                        inline: isInline,
                        content: isInline ? 
                            script.textContent?.substring(0, maxSize) : undefined,
                        type: script.getAttribute('type') || undefined
                    });
                });
                
                return scripts.slice(0, 50); // Limit to first 50 scripts
            }, this.config.maxScriptSize);
        } catch (error) {
            logger.warn('Failed to collect scripts', { error: (error as Error).message });
            return [];
        }
    }

    private async collectStylesheets(page: ManagedPage): Promise<DetectionDataPoint['stylesheets']> {
        try {
            return await page.evaluate((maxSize) => {
                const stylesheets: any[] = [];
                const styleElements = document.querySelectorAll('style, link[rel="stylesheet"]');
                
                styleElements.forEach(style => {
                    const href = style.getAttribute('href');
                    const isInline = style.tagName === 'STYLE';
                    
                    stylesheets.push({
                        href: href || undefined,
                        inline: isInline,
                        content: isInline ? 
                            style.textContent?.substring(0, maxSize) : undefined
                    });
                });
                
                return stylesheets.slice(0, 20); // Limit to first 20 stylesheets
            }, this.config.maxScriptSize);
        } catch (error) {
            logger.warn('Failed to collect stylesheets', { error: (error as Error).message });
            return [];
        }
    }

    private async collectForms(page: ManagedPage): Promise<DetectionDataPoint['forms']> {
        try {
            return await page.evaluate(() => {
                const forms: any[] = [];
                const formElements = document.querySelectorAll('form');
                
                formElements.forEach(form => {
                    const inputs = form.querySelectorAll('input, select, textarea');
                    const fieldTypes = Array.from(inputs).map(input => 
                        input.getAttribute('type') || input.tagName.toLowerCase()
                    );
                    
                    forms.push({
                        action: form.getAttribute('action') || undefined,
                        method: form.getAttribute('method') || undefined,
                        fieldCount: inputs.length,
                        fieldTypes: [...new Set(fieldTypes)] // Unique field types
                    });
                });
                
                return forms;
            });
        } catch (error) {
            logger.warn('Failed to collect forms', { error: (error as Error).message });
            return [];
        }
    }

    private async collectTitle(page: ManagedPage): Promise<string | undefined> {
        try {
            return await page.title();
        } catch (error) {
            logger.warn('Failed to collect title', { error: (error as Error).message });
            return undefined;
        }
    }

    private async collectPerformanceMetrics(page: ManagedPage): Promise<{ loadTime: number; resourceCount: number }> {
        try {
            return await page.evaluate(() => {
                const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                const resources = performance.getEntriesByType('resource');
                
                return {
                    loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
                    resourceCount: resources.length
                };
            });
        } catch (error) {
            logger.warn('Failed to collect performance metrics', { error: (error as Error).message });
            return { loadTime: 0, resourceCount: 0 };
        }
    }
}