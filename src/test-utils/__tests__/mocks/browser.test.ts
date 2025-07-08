/**
 * Unit tests for browser manager mock utilities
 * 
 * Tests the centralized browser manager mocking system to ensure proper
 * mock creation, method coverage, and behavior configuration.
 */

import { jest } from '@jest/globals';
import {
    createMockBrowserManager,
    type BrowserManagerMockOptions
} from '../../mocks/browser.js';

describe('Browser Manager Mock Utilities', () => {
    describe('createMockBrowserManager', () => {
        it('should create a basic browser manager mock with all required methods', () => {
            const mockBrowserManager = createMockBrowserManager();
            
            // Core page management methods
            expect(mockBrowserManager.createPage).toBeDefined();
            expect(mockBrowserManager.createPageInIsolatedContext).toBeDefined();
            expect(mockBrowserManager.createIsolatedContext).toBeDefined();
            expect(mockBrowserManager.closePage).toBeDefined();
            expect(mockBrowserManager.closeContext).toBeDefined();
            
            // Navigation and info methods
            expect(mockBrowserManager.navigateToUrl).toBeDefined();
            expect(mockBrowserManager.getNavigationInfo).toBeDefined();
            
            // User agent management methods
            expect(mockBrowserManager.getUserAgentStats).toBeDefined();
            expect(mockBrowserManager.resetUserAgentRotation).toBeDefined();
            
            // Screenshot functionality
            expect(mockBrowserManager.captureScreenshot).toBeDefined();
            
            // Cleanup
            expect(mockBrowserManager.cleanup).toBeDefined();
        });
        
        it('should have jest mock functions for all methods', () => {
            const mockBrowserManager = createMockBrowserManager();
            
            expect(jest.isMockFunction(mockBrowserManager.createPage)).toBe(true);
            expect(jest.isMockFunction(mockBrowserManager.navigateToUrl)).toBe(true);
            expect(jest.isMockFunction(mockBrowserManager.getNavigationInfo)).toBe(true);
            expect(jest.isMockFunction(mockBrowserManager.captureScreenshot)).toBe(true);
            expect(jest.isMockFunction(mockBrowserManager.cleanup)).toBe(true);
        });
        
        it('should configure successful page creation by default', async () => {
            const mockBrowserManager = createMockBrowserManager();
            
            const page = await mockBrowserManager.createPage('https://example.com');
            expect(page).toBeDefined();
            
            const { page: isolatedPage, context } = await mockBrowserManager.createPageInIsolatedContext('https://example.com');
            expect(isolatedPage).toBeDefined();
            expect(context).toBeDefined();
        });
        
        it('should configure page creation failures when requested', async () => {
            const mockBrowserManager = createMockBrowserManager({ shouldFailCreation: true });
            
            await expect(mockBrowserManager.createPage('https://example.com'))
                .rejects.toThrow('Failed to create page');
            
            await expect(mockBrowserManager.createPageInIsolatedContext('https://example.com'))
                .rejects.toThrow('Failed to create isolated context');
        });
        
        it('should return proper navigation info by default', () => {
            const mockBrowserManager = createMockBrowserManager();
            
            const navInfo = mockBrowserManager.getNavigationInfo({} as any);
            
            expect(navInfo).toBeDefined();
            expect(navInfo!.originalUrl).toBe('https://example.com');
            expect(navInfo!.finalUrl).toBe('https://example.com');
            expect(navInfo!.redirectChain).toEqual([]);
            expect(navInfo!.totalRedirects).toBe(0);
            expect(navInfo!.navigationTime).toBe(1000);
            expect(navInfo!.protocolUpgraded).toBe(false);
            expect(navInfo!.success).toBe(true);
            expect(navInfo!.headers).toEqual({
                'content-type': 'text/html',
                'server': 'nginx'
            });
        });
        
        it('should return null navigation info when navigation fails', () => {
            const mockBrowserManager = createMockBrowserManager({ shouldFailNavigation: true });
            
            const navInfo = mockBrowserManager.getNavigationInfo({} as any);
            expect(navInfo).toBeNull();
        });
        
        it('should use custom navigation info when provided', () => {
            const customNavInfo = {
                originalUrl: 'https://custom.com',
                finalUrl: 'https://custom.com/redirected',
                redirectChain: [{ from: 'https://custom.com', to: 'https://custom.com/redirected' }],
                totalRedirects: 1,
                navigationTime: 2500,
                protocolUpgraded: true,
                success: true,
                headers: { 'x-custom': 'header' }
            };
            
            const mockBrowserManager = createMockBrowserManager({ 
                customNavigationInfo: customNavInfo 
            });
            
            const navInfo = mockBrowserManager.getNavigationInfo({} as any);
            expect(navInfo).toEqual(customNavInfo);
        });
        
        it('should configure navigation URL method properly', async () => {
            const mockBrowserManager = createMockBrowserManager();
            
            const result = await mockBrowserManager.navigateToUrl({} as any, 'https://test.com');
            
            expect(result).toBeDefined();
            expect(result.originalUrl).toBe('https://example.com');
            expect(result.finalUrl).toBe('https://example.com');
            expect(result.success).toBe(true);
        });
        
        it('should configure user agent methods properly', () => {
            const mockBrowserManager = createMockBrowserManager();
            
            const stats = mockBrowserManager.getUserAgentStats();
            expect(stats).toEqual({ enabled: false });
            
            // Should not throw
            expect(() => mockBrowserManager.resetUserAgentRotation()).not.toThrow();
        });
        
        it('should configure screenshot capture with default dimensions', async () => {
            const mockBrowserManager = createMockBrowserManager();
            
            const [width, height] = await mockBrowserManager.captureScreenshot({} as any, './test.png');
            expect(width).toBe(1024);
            expect(height).toBe(768);
        });
        
        it('should use custom screenshot dimensions when provided', async () => {
            const customDimensions: [number, number] = [1920, 1080];
            const mockBrowserManager = createMockBrowserManager({ 
                customScreenshotResult: customDimensions 
            });
            
            const [width, height] = await mockBrowserManager.captureScreenshot({} as any, './test.png');
            expect(width).toBe(1920);
            expect(height).toBe(1080);
        });
        
        it('should configure cleanup methods properly', async () => {
            const mockBrowserManager = createMockBrowserManager();
            
            await expect(mockBrowserManager.closeContext({} as any)).resolves.toBeUndefined();
            await expect(mockBrowserManager.closePage({} as any)).resolves.toBeUndefined();
            await expect(mockBrowserManager.cleanup()).resolves.toBeUndefined();
        });
    });
    
    describe('Configuration Options', () => {
        it('should handle all configuration options together', async () => {
            const options: BrowserManagerMockOptions = {
                shouldFailCreation: false,
                shouldFailNavigation: false,
                customNavigationInfo: {
                    originalUrl: 'https://test.example',
                    finalUrl: 'https://test.example/final',
                    redirectChain: [],
                    totalRedirects: 0,
                    navigationTime: 1500,
                    protocolUpgraded: false,
                    success: true,
                    headers: { 'x-test': 'true' }
                },
                customScreenshotResult: [800, 600]
            };
            
            const mockBrowserManager = createMockBrowserManager(options);
            
            // Test page creation succeeds
            const page = await mockBrowserManager.createPage('https://example.com');
            expect(page).toBeDefined();
            
            // Test custom navigation info
            const navInfo = mockBrowserManager.getNavigationInfo({} as any);
            expect(navInfo!.originalUrl).toBe('https://test.example');
            expect(navInfo!.headers!['x-test']).toBe('true');
            
            // Test custom screenshot dimensions
            const [width, height] = await mockBrowserManager.captureScreenshot({} as any, './test.png');
            expect(width).toBe(800);
            expect(height).toBe(600);
        });
        
        it('should handle empty options object', () => {
            const mockBrowserManager = createMockBrowserManager({});
            
            // Should create successfully with defaults
            expect(mockBrowserManager).toBeDefined();
            expect(mockBrowserManager.createPage).toBeDefined();
        });
        
        it('should handle undefined options', () => {
            const mockBrowserManager = createMockBrowserManager();
            
            // Should create successfully with defaults
            expect(mockBrowserManager).toBeDefined();
            expect(mockBrowserManager.createPage).toBeDefined();
        });
    });
    
    describe('Mock Behavior Verification', () => {
        it('should allow verification of method calls', async () => {
            const mockBrowserManager = createMockBrowserManager();
            
            await mockBrowserManager.createPage('https://test.com');
            await mockBrowserManager.captureScreenshot({} as any, './screenshot.png');
            mockBrowserManager.getNavigationInfo({} as any);
            
            expect(mockBrowserManager.createPage).toHaveBeenCalledWith('https://test.com');
            expect(mockBrowserManager.captureScreenshot).toHaveBeenCalledWith({}, './screenshot.png');
            expect(mockBrowserManager.getNavigationInfo).toHaveBeenCalledWith({});
        });
        
        it('should track call counts correctly', async () => {
            const mockBrowserManager = createMockBrowserManager();
            
            await mockBrowserManager.createPage('https://example1.com');
            await mockBrowserManager.createPage('https://example2.com');
            await mockBrowserManager.cleanup();
            
            expect(mockBrowserManager.createPage).toHaveBeenCalledTimes(2);
            expect(mockBrowserManager.cleanup).toHaveBeenCalledTimes(1);
        });
        
        it('should allow mock reset between tests', () => {
            const mockBrowserManager = createMockBrowserManager();
            
            mockBrowserManager.getNavigationInfo({} as any);
            expect(mockBrowserManager.getNavigationInfo).toHaveBeenCalledTimes(1);
            
            jest.clearAllMocks();
            expect(mockBrowserManager.getNavigationInfo).toHaveBeenCalledTimes(0);
        });
    });
    
    describe('Type Safety', () => {
        it('should satisfy BrowserManager interface requirements', () => {
            const mockBrowserManager = createMockBrowserManager();
            
            // Type checking happens at compile time, but we can verify
            // the mock has the expected shape
            expect(typeof mockBrowserManager.createPage).toBe('function');
            expect(typeof mockBrowserManager.createPageInIsolatedContext).toBe('function');
            expect(typeof mockBrowserManager.createIsolatedContext).toBe('function');
            expect(typeof mockBrowserManager.navigateToUrl).toBe('function');
            expect(typeof mockBrowserManager.getNavigationInfo).toBe('function');
            expect(typeof mockBrowserManager.getUserAgentStats).toBe('function');
            expect(typeof mockBrowserManager.resetUserAgentRotation).toBe('function');
            expect(typeof mockBrowserManager.captureScreenshot).toBe('function');
            expect(typeof mockBrowserManager.closePage).toBe('function');
            expect(typeof mockBrowserManager.closeContext).toBe('function');
            expect(typeof mockBrowserManager.cleanup).toBe('function');
        });
        
        it('should handle unknown type casting properly', () => {
            // The mock uses 'unknown' type casting which should work
            expect(() => createMockBrowserManager()).not.toThrow();
        });
    });
});