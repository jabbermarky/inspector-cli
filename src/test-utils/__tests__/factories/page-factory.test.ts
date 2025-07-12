/**
 * Unit tests for page factory utilities
 * 
 * Tests the centralized page mock factory system to ensure proper
 * mock creation, configuration, and strategy-specific data handling.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import {
    createMockPage,
    createMetaTagMockPage,
    createHttpHeaderMockPage,
    createRobotsTxtMockPage,
    type PageMockOptions
} from '../../factories/page-factory.js';

describe('Page Factory Utilities', () => {
    describe('createMockPage', () => {
        it('should create a basic page mock with defaults', async () => {
            const mockPage = createMockPage();
            
            // Core Puppeteer methods
            expect(mockPage.url).toBeDefined();
            expect(mockPage.title).toBeDefined();
            expect(mockPage.content).toBeDefined();
            expect(mockPage.goto).toBeDefined();
            expect(mockPage.evaluate).toBeDefined();
            
            // Default values
            expect(mockPage.url()).toBe('https://example.com');
            await expect(mockPage.title()).resolves.toBe('Example Title');
            await expect(mockPage.content()).resolves.toContain('<html>');
        });
        
        it('should create a page mock with custom options', async () => {
            const options: PageMockOptions = {
                url: 'https://custom.com',
                title: 'Custom Title',
                content: '<html><body>Custom content</body></html>',
                userAgent: 'Custom User Agent'
            };
            
            const mockPage = createMockPage(options);
            
            expect(mockPage.url()).toBe('https://custom.com');
            await expect(mockPage.title()).resolves.toBe('Custom Title');
            await expect(mockPage.content()).resolves.toBe('<html><body>Custom content</body></html>');
        });
        
        it('should configure page mock for navigation failures', async () => {
            const mockPage = createMockPage({ shouldFailNavigation: true });
            
            await expect(mockPage.goto()).rejects.toThrow('Navigation failed');
        });
        
        it('should configure page mock for evaluation failures', async () => {
            const mockPage = createMockPage({ shouldFailEvaluation: true });
            
            await expect(mockPage.evaluate()).rejects.toThrow('Evaluation failed');
            await expect(mockPage.$eval()).rejects.toThrow('Evaluation failed');
            await expect(mockPage.$$eval()).rejects.toThrow('Evaluation failed');
        });
        
        it('should configure custom evaluation implementation', async () => {
            const customEvaluation = vi.fn().mockReturnValue('custom result');
            const mockPage = createMockPage({ evaluateImplementation: customEvaluation });
            
            const result = await mockPage.evaluate(() => 'test');
            expect(result).toBe('custom result');
            expect(customEvaluation).toHaveBeenCalled();
        });
        
        it('should handle user agent requests in default evaluation', async () => {
            const customUserAgent = 'Test Agent 1.0';
            const mockPage = createMockPage({ userAgent: customUserAgent });
            
            // Simulate a function that requests navigator.userAgent
            const result = await mockPage.evaluate(() => navigator.userAgent);
            expect(result).toBe(customUserAgent);
        });
        
        it('should handle title requests in default evaluation', async () => {
            const customTitle = 'Test Page Title';
            const mockPage = createMockPage({ title: customTitle });
            
            // Simulate a function that requests document.title
            const result = await mockPage.evaluate(() => document.title);
            expect(result).toBe(customTitle);
        });
        
        it('should handle meta tag queries in default evaluation', async () => {
            const mockPage = createMockPage();
            
            // Simulate a function that queries meta tags
            const metaTagFunction = () => document.querySelectorAll('meta');
            const result = await mockPage.evaluate(metaTagFunction);
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toHaveProperty('name', 'generator');
            expect(result[0]).toHaveProperty('content', 'WordPress 6.3');
        });
        
        it('should add robots.txt data when provided', () => {
            const robotsTxtData = {
                accessible: true,
                content: 'User-agent: *\nDisallow: /admin/',
                patterns: {
                    disallowedPaths: ['/admin/'],
                    sitemapUrls: []
                }
            };
            
            const mockPage = createMockPage({ robotsTxtData });
            
            expect(mockPage._robotsTxtData).toEqual(robotsTxtData);
        });
        
        it('should add browser manager context when headers provided', () => {
            const httpHeaders = { 'x-powered-by': 'Express' };
            const mockPage = createMockPage({ httpHeaders });
            
            expect(mockPage._browserManagerContext).toBeDefined();
            expect(mockPage._browserManagerContext.purpose).toBe('detection');
            expect(mockPage._browserManagerContext.lastNavigation.headers).toEqual(httpHeaders);
            expect(mockPage._browserManagerContext.lastNavigation.success).toBe(true);
        });
        
        it('should add browser manager context when browserContext provided', () => {
            const browserContext = {
                navigationCount: 5,
                lastNavigation: {
                    totalRedirects: 2,
                    protocolUpgraded: true
                }
            };
            
            const mockPage = createMockPage({ browserContext } as any);
            
            // The factory merges browserContext into the default context
            expect(mockPage._browserManagerContext.navigationCount).toBe(5);
            expect(mockPage._browserManagerContext.lastNavigation.totalRedirects).toBe(2);
            expect(mockPage._browserManagerContext.lastNavigation.protocolUpgraded).toBe(true);
        });
    });
    
    describe('createMetaTagMockPage', () => {
        it('should create a page mock configured for meta tag strategy', () => {
            const metaTags = [
                { name: 'generator', content: 'WordPress 6.3.1' },
                { property: 'og:title', content: 'My Blog' },
                { httpEquiv: 'refresh', content: '30' }
            ];
            
            const mockPage = createMetaTagMockPage(metaTags);
            
            expect(mockPage.evaluate).toBeDefined();
            expect(vi.isMockFunction(mockPage.evaluate)).toBe(true);
        });
        
        it('should return meta tags when meta selector is used', async () => {
            const metaTags = [
                { name: 'generator', content: 'Drupal 9.4' },
                { name: 'description', content: 'Test site description' }
            ];
            
            const mockPage = createMetaTagMockPage(metaTags);
            
            // Simulate meta tag query
            const metaQuery = () => document.querySelectorAll('meta');
            const result = await mockPage.evaluate(metaQuery);
            
            expect(result).toEqual(metaTags);
        });
        
        it('should return empty array for non-meta queries', async () => {
            const metaTags = [{ name: 'generator', content: 'Joomla 4.2' }];
            const mockPage = createMetaTagMockPage(metaTags);
            
            // Simulate non-meta query
            const divQuery = () => document.querySelectorAll('div');
            const result = await mockPage.evaluate(divQuery);
            
            expect(result).toEqual([]);
        });
    });
    
    describe('createHttpHeaderMockPage', () => {
        it('should create a page mock with HTTP headers', () => {
            const headers = {
                'x-generator': 'WordPress',
                'x-powered-by': 'PHP/8.1',
                'server': 'nginx'
            };
            
            const mockPage = createHttpHeaderMockPage(headers);
            
            expect(mockPage._browserManagerContext).toBeDefined();
            expect(mockPage._browserManagerContext.lastNavigation.headers).toEqual(headers);
        });
        
        it('should set correct navigation context', () => {
            const headers = { 'x-framework': 'Next.js' };
            const mockPage = createHttpHeaderMockPage(headers);
            
            const context = mockPage._browserManagerContext;
            expect(context.purpose).toBe('detection');
            expect(context.navigationCount).toBe(1);
            expect(context.lastNavigation.success).toBe(true);
            expect(context.lastNavigation.totalRedirects).toBe(0);
            expect(context.lastNavigation.protocolUpgraded).toBe(false);
        });
    });
    
    describe('createRobotsTxtMockPage', () => {
        it('should create a page mock with robots.txt data', () => {
            const robotsTxtData = {
                accessible: true,
                content: 'User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php',
                patterns: {
                    disallowedPaths: ['/wp-admin/'],
                    sitemapUrls: ['https://example.com/sitemap.xml'],
                    userAgents: ['*']
                },
                size: 150,
                statusCode: 200
            };
            
            const mockPage = createRobotsTxtMockPage(robotsTxtData);
            
            expect(mockPage._robotsTxtData).toEqual(robotsTxtData);
        });
        
        it('should handle inaccessible robots.txt', () => {
            const robotsTxtData = {
                accessible: false,
                content: '',
                patterns: {
                    disallowedPaths: [],
                    sitemapUrls: []
                },
                statusCode: 404,
                error: 'File not found'
            };
            
            const mockPage = createRobotsTxtMockPage(robotsTxtData);
            
            expect(mockPage._robotsTxtData.accessible).toBe(false);
            expect(mockPage._robotsTxtData.statusCode).toBe(404);
            expect(mockPage._robotsTxtData.error).toBe('File not found');
        });
    });
    
    describe('Mock Method Functionality', () => {
        it('should have all required Puppeteer page methods', () => {
            const mockPage = createMockPage();
            
            // Core navigation methods
            expect(mockPage.goto).toBeDefined();
            expect(mockPage.url).toBeDefined();
            
            // Content methods
            expect(mockPage.title).toBeDefined();
            expect(mockPage.content).toBeDefined();
            
            // Evaluation methods
            expect(mockPage.evaluate).toBeDefined();
            expect(mockPage.$eval).toBeDefined();
            expect(mockPage.$$eval).toBeDefined();
            
            // Configuration methods
            expect(mockPage.setUserAgent).toBeDefined();
            expect(mockPage.setViewport).toBeDefined();
            
            // Wait methods
            expect(mockPage.waitForSelector).toBeDefined();
            expect(mockPage.waitForFunction).toBeDefined();
            expect(mockPage.waitForTimeout).toBeDefined();
            
            // Utility methods
            expect(mockPage.screenshot).toBeDefined();
            expect(mockPage.setDefaultNavigationTimeout).toBeDefined();
            expect(mockPage.setDefaultTimeout).toBeDefined();
        });
        
        it('should have mock functions for all methods', () => {
            const mockPage = createMockPage();
            
            expect(vi.isMockFunction(mockPage.goto)).toBe(true);
            expect(vi.isMockFunction(mockPage.evaluate)).toBe(true);
            expect(vi.isMockFunction(mockPage.setUserAgent)).toBe(true);
            expect(vi.isMockFunction(mockPage.screenshot)).toBe(true);
        });
        
        it('should return promises for async methods', () => {
            const mockPage = createMockPage();
            
            expect(mockPage.title()).toBeInstanceOf(Promise);
            expect(mockPage.content()).toBeInstanceOf(Promise);
            expect(mockPage.goto('https://test.com')).toBeInstanceOf(Promise);
        });
    });
    
    describe('Error Handling', () => {
        it('should properly mock navigation failures', async () => {
            const mockPage = createMockPage({ shouldFailNavigation: true });
            
            await expect(mockPage.goto('https://example.com'))
                .rejects.toThrow('Navigation failed');
        });
        
        it('should properly mock evaluation failures', async () => {
            const mockPage = createMockPage({ shouldFailEvaluation: true });
            
            await expect(mockPage.evaluate(() => {}))
                .rejects.toThrow('Evaluation failed');
            
            await expect(mockPage.$eval('div', (el: any) => el.textContent))
                .rejects.toThrow('Evaluation failed');
        });
        
        it('should allow successful operations when no failures configured', async () => {
            const mockPage = createMockPage();
            
            await expect(mockPage.goto('https://example.com')).resolves.not.toThrow();
            const result = await mockPage.evaluate(() => 'test');
            expect(result).toBe('test');
        });
    });
});