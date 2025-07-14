import { createModuleLogger } from '../utils/logger.js';
import { EnhancedDataCollection } from './types.js';
import { BrowserManager, createDetectionConfig } from '../utils/browser/index.js';
import { validateAndNormalizeUrl, createValidationContext } from '../utils/url/index.js';
import { RobotsTxtAnalyzer } from '../utils/robots-txt-analyzer.js';
import path from 'path';
import fs from 'fs/promises';

const logger = createModuleLogger('learn-data-collection');

/**
 * Detect if collected data represents a failed response (403, 404, error pages, etc.)
 */
function isFailedResponse(data: EnhancedDataCollection): boolean {
    // Check for common error page indicators
    const htmlContent = data.htmlContent.toLowerCase();
    
    // Check for explicit error titles
    if (htmlContent.includes('<title>403 forbidden</title>') ||
        htmlContent.includes('<title>404 not found</title>') ||
        htmlContent.includes('<title>500 internal server error</title>') ||
        htmlContent.includes('<title>access denied</title>') ||
        htmlContent.includes('<title>blocked</title>')) {
        return true;
    }
    
    // Check for error headings
    if (htmlContent.includes('<h1>403</h1>') ||
        htmlContent.includes('<h1>404</h1>') ||
        htmlContent.includes('<h1>500</h1>') ||
        htmlContent.includes('<h1>forbidden</h1>') ||
        htmlContent.includes('<h1>access denied</h1>') ||
        htmlContent.includes('<h1>blocked</h1>')) {
        return true;
    }
    
    // Check for minimal content that suggests an error page
    const textContent = htmlContent.replace(/<[^>]*>/g, '').trim();
    if (textContent.length < 500) {
        // Very short content might be an error page
        if (textContent.toLowerCase().includes('forbidden') ||
            textContent.toLowerCase().includes('access denied') ||
            textContent.toLowerCase().includes('blocked') ||
            textContent.toLowerCase().includes('not found')) {
            return true;
        }
    }
    
    // Check if there are no scripts or very few meta tags (common in error pages)
    if (data.scripts.length === 0 && data.metaTags.length < 3) {
        // Additional check for generic error page content
        if (htmlContent.includes('nginx') && textContent.length < 200) {
            return true;
        }
    }
    
    return false;
}

/**
 * Enhanced data collection for LLM analysis
 * Collects comprehensive website data including robots.txt, enhanced headers, meta tags, and DOM patterns
 */
export async function collectEnhancedData(url: string): Promise<EnhancedDataCollection> {
    logger.info('Starting enhanced data collection', { url });
    
    let browserManager: BrowserManager | null = null;
    let context: any = null;
    
    try {
        // Validate and normalize URL
        const validationContext = createValidationContext('production');
        const normalizedUrl = validateAndNormalizeUrl(url, { context: validationContext });
        
        // Initialize browser manager for data collection
        const config = createDetectionConfig({
            resourceBlocking: {
                enabled: false, // Disable blocking for comprehensive data collection
                strategy: 'minimal',
                allowEssentialScripts: true
            },
            navigation: {
                timeout: 15000, // Longer timeout for comprehensive collection
                retryAttempts: 2
            }
        });
        
        browserManager = new BrowserManager(config);
        
        // Step 1: Collect robots.txt data first
        logger.debug('Collecting robots.txt data', { url: normalizedUrl });
        const robotsAnalyzer = new RobotsTxtAnalyzer();
        const robotsAnalysis = await robotsAnalyzer.analyze(normalizedUrl);
        
        // Step 2: Create page and navigate for main content collection
        logger.debug('Creating browser page for main content collection', { url: normalizedUrl });
        const { page, context: browserContext } = await browserManager.createPageInIsolatedContext(normalizedUrl);
        context = browserContext;
        
        // Step 3: Collect HTML content
        logger.debug('Collecting HTML content', { url: normalizedUrl });
        const htmlContent = await page.content();
        
        // Step 4: Get navigation info and collect HTTP headers
        logger.debug('Collecting navigation info and HTTP headers', { url: normalizedUrl });
        const navigationInfo = browserManager.getNavigationInfo(page);
        const httpHeaders: Record<string, string> = {};
        if (navigationInfo?.headers) {
            Object.assign(httpHeaders, navigationInfo.headers);
        }
        
        // Step 5: Collect meta tags
        logger.debug('Collecting meta tags', { url: normalizedUrl });
        const metaTags = await page.evaluate(() => {
            const metas = Array.from(document.querySelectorAll('meta'));
            return metas.map(meta => ({
                name: meta.getAttribute('name') || undefined,
                property: meta.getAttribute('property') || undefined,
                content: meta.getAttribute('content') || '',
                httpEquiv: meta.getAttribute('http-equiv') || undefined
            }));
        });
        
        // Step 6: Collect script information
        logger.debug('Collecting script information', { url: normalizedUrl });
        const scripts = await page.evaluate(() => {
            const scriptElements = Array.from(document.querySelectorAll('script'));
            return scriptElements.map(script => ({
                src: script.src || undefined,
                content: script.src ? undefined : script.textContent?.substring(0, 10000) || '', // Limit inline script content
                type: script.type || 'text/javascript',
                async: script.async,
                defer: script.defer
            }));
        });
        
        // Step 7: Collect DOM structure patterns
        logger.debug('Collecting DOM structure patterns', { url: normalizedUrl });
        const domStructure = await page.evaluate(() => {
            // Collect class patterns
            const classPatterns = Array.from(new Set(
                Array.from(document.querySelectorAll('*'))
                    .map(el => el.className)
                    .filter(className => typeof className === 'string' && className.trim())
                    .flatMap(className => className.trim().split(/\s+/))
                    .filter(cls => cls.length > 0)
            )).slice(0, 100); // Limit to first 100 unique classes
            
            // Collect ID patterns
            const idPatterns = Array.from(new Set(
                Array.from(document.querySelectorAll('[id]'))
                    .map(el => el.id)
                    .filter(id => id && id.trim())
            )).slice(0, 50); // Limit to first 50 unique IDs
            
            // Collect data attributes
            const dataAttributes = Array.from(new Set(
                Array.from(document.querySelectorAll('*'))
                    .flatMap(el => Array.from(el.attributes))
                    .filter(attr => attr.name.startsWith('data-'))
                    .map(attr => attr.name)
            )).slice(0, 50); // Limit to first 50 unique data attributes
            
            // Collect HTML comments
            const walker = document.createTreeWalker(
                document.documentElement,
                NodeFilter.SHOW_COMMENT,
                null
            );
            
            const comments: string[] = [];
            let comment = walker.nextNode();
            while (comment && comments.length < 20) { // Limit to 20 comments
                const commentText = comment.textContent?.trim();
                if (commentText && commentText.length > 5 && commentText.length < 200) {
                    comments.push(commentText);
                }
                comment = walker.nextNode();
            }
            
            return {
                classPatterns,
                idPatterns,
                dataAttributes,
                comments
            };
        });
        
        const data: EnhancedDataCollection = {
            url: normalizedUrl,
            timestamp: new Date().toISOString(),
            htmlContent: htmlContent.substring(0, 500000), // Limit HTML content to 500KB
            scripts: scripts.slice(0, 50), // Limit to 50 scripts
            metaTags: metaTags.slice(0, 100), // Limit to 100 meta tags
            httpHeaders,
            robotsTxt: {
                content: robotsAnalysis.content || '',
                headers: robotsAnalysis.headers || {},
                statusCode: robotsAnalysis.error ? 404 : 200,
                accessible: !robotsAnalysis.error
            },
            domStructure,
            navigationInfo: {
                originalUrl: navigationInfo?.originalUrl || url,
                finalUrl: navigationInfo?.finalUrl || normalizedUrl,
                redirectCount: navigationInfo?.totalRedirects || 0,
                protocolUpgraded: navigationInfo?.protocolUpgraded || false
            }
        };
        
        logger.info('Enhanced data collection completed', { 
            url: normalizedUrl, 
            scriptsCount: data.scripts.length,
            metaTagsCount: data.metaTags.length,
            robotsTxtAccessible: data.robotsTxt.accessible,
            htmlContentSize: data.htmlContent.length,
            redirectCount: data.navigationInfo?.redirectCount
        });
        
        return data;
        
    } catch (error) {
        logger.error('Enhanced data collection failed', { url }, error as Error);
        throw error;
    } finally {
        // Cleanup browser resources
        if (browserManager && context) {
            await browserManager.closeContext(context);
        }
        // Full cleanup of browser manager for single URL processing
        if (browserManager) {
            await browserManager.cleanup();
        }
    }
}

/**
 * Retrieve existing collected data from CMS analysis storage
 */
export async function retrieveCollectedData(url: string): Promise<EnhancedDataCollection | null> {
    logger.info('Attempting to retrieve existing data', { url });
    
    try {
        const cmsDataDir = path.join(process.cwd(), 'data', 'cms-analysis');
        const indexPath = path.join(cmsDataDir, 'index.json');
        
        // Check if index exists
        try {
            await fs.access(indexPath);
        } catch {
            logger.info('No CMS analysis index found', { indexPath });
            return null;
        }
        
        // Read index and search for URL
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        const index = JSON.parse(indexContent);
        
        // Normalize URL for comparison
        const validationContext = createValidationContext('production');
        const normalizedUrl = validateAndNormalizeUrl(url, { context: validationContext });
        
        // Find matching entry by URL (check both original and final URLs)
        const matchingEntry = index.find((entry: any) => {
            return entry.url === normalizedUrl || 
                   entry.originalUrl === normalizedUrl ||
                   entry.finalUrl === normalizedUrl ||
                   entry.url === url ||
                   entry.originalUrl === url ||
                   entry.finalUrl === url;
        });
        
        if (!matchingEntry) {
            logger.info('No existing data found for URL', { url, normalizedUrl });
            return null;
        }
        
        // Read the actual data file
        const dataFilePath = path.join(cmsDataDir, matchingEntry.fileId + '.json');
        try {
            const dataContent = await fs.readFile(dataFilePath, 'utf-8');
            const cmsData = JSON.parse(dataContent);
            
            // Convert CMS analysis data to EnhancedDataCollection format
            const enhancedData = convertCMSDataToEnhanced(cmsData, normalizedUrl);
            
            logger.info('Successfully retrieved existing data', { 
                url: normalizedUrl,
                fileId: matchingEntry.fileId,
                scriptsCount: enhancedData.scripts.length,
                metaTagsCount: enhancedData.metaTags.length
            });
            
            return enhancedData;
            
        } catch (fileError) {
            logger.warn('Failed to read existing data file', { 
                url: normalizedUrl,
                fileId: matchingEntry.fileId,
                error: (fileError as Error).message 
            });
            return null;
        }
        
    } catch (error) {
        logger.error('Failed to retrieve existing data', { url }, error as Error);
        return null;
    }
}

/**
 * Convert CMS analysis data format to EnhancedDataCollection format
 */
function convertCMSDataToEnhanced(cmsData: any, url: string): EnhancedDataCollection {
    return {
        url: cmsData.finalUrl || cmsData.url || url,
        timestamp: cmsData.timestamp || new Date().toISOString(),
        htmlContent: cmsData.htmlContent || '',
        scripts: (cmsData.scripts || []).map((script: any) => ({
            src: script.src,
            content: script.content,
            type: script.type || 'text/javascript',
            async: script.async || false,
            defer: script.defer || false
        })),
        metaTags: (cmsData.metaTags || []).map((meta: any) => ({
            name: meta.name,
            property: meta.property,
            content: meta.content || '',
            httpEquiv: meta.httpEquiv
        })),
        httpHeaders: cmsData.httpHeaders || {},
        robotsTxt: {
            content: cmsData.robotsTxt?.content || '',
            headers: cmsData.robotsTxt?.headers || {},
            statusCode: cmsData.robotsTxt?.statusCode || 404,
            accessible: cmsData.robotsTxt?.accessible || false
        },
        domStructure: {
            classPatterns: cmsData.domStructure?.classPatterns || [],
            idPatterns: cmsData.domStructure?.idPatterns || [],
            dataAttributes: cmsData.domStructure?.dataAttributes || [],
            comments: cmsData.domStructure?.comments || []
        },
        navigationInfo: {
            originalUrl: cmsData.originalUrl || url,
            finalUrl: cmsData.finalUrl || url,
            redirectCount: cmsData.totalRedirects || 0,
            protocolUpgraded: cmsData.protocolUpgraded || false
        }
    };
}

/**
 * Enhanced data collection with automatic fallback to cached data on failure
 * This is the main entry point that implements the fallback strategy
 */
export async function collectEnhancedDataWithFallback(url: string, forceFresh: boolean = false): Promise<EnhancedDataCollection> {
    logger.info('Starting enhanced data collection with fallback', { url, forceFresh });
    
    try {
        // Always try fresh collection first
        const freshData = await collectEnhancedData(url);
        
        // Check if the fresh data is a failed response
        if (isFailedResponse(freshData)) {
            logger.warn('Fresh data collection returned failed response (403, 404, etc.)', { 
                url,
                htmlLength: freshData.htmlContent.length,
                scriptsCount: freshData.scripts.length,
                metaTagsCount: freshData.metaTags.length
            });
            
            if (forceFresh) {
                logger.info('Force fresh mode enabled, returning failed response data', { url });
                return freshData;
            }
            
            // Try to fall back to cached data
            logger.info('Attempting fallback to cached data', { url });
            const cachedData = await retrieveCollectedData(url);
            
            if (cachedData) {
                logger.info('Successfully retrieved cached data as fallback', { 
                    url,
                    cachedScriptsCount: cachedData.scripts.length,
                    cachedMetaTagsCount: cachedData.metaTags.length,
                    cacheTimestamp: cachedData.timestamp
                });
                
                // Update timestamp to indicate this is cached data
                return {
                    ...cachedData,
                    timestamp: cachedData.timestamp // Keep original timestamp but add a note
                };
            } else {
                logger.warn('No cached data available for fallback, returning failed response', { url });
                return freshData;
            }
        }
        
        // Fresh data looks good, return it
        logger.info('Fresh data collection successful', { url });
        return freshData;
        
    } catch (error) {
        logger.error('Fresh data collection failed with exception', { url }, error as Error);
        
        if (forceFresh) {
            logger.info('Force fresh mode enabled, re-throwing exception', { url });
            throw error;
        }
        
        // Try to fall back to cached data
        logger.info('Attempting fallback to cached data after exception', { url });
        const cachedData = await retrieveCollectedData(url);
        
        if (cachedData) {
            logger.info('Successfully retrieved cached data as fallback after exception', { 
                url,
                cachedScriptsCount: cachedData.scripts.length,
                cachedMetaTagsCount: cachedData.metaTags.length,
                cacheTimestamp: cachedData.timestamp
            });
            return cachedData;
        }
        
        // No fallback available, re-throw the original error
        logger.error('No cached data available for fallback, re-throwing exception', { url });
        throw error;
    }
}