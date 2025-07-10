import { 
    createMockConfig, 
    createTestConfig, 
    createDebugConfig, 
    createProductionTestConfig,
    createMockGetConfig,
    createSpyableConfig
} from '../../mocks/config.js';

describe('Config Mock Factory', () => {
    describe('createMockConfig', () => {
        it('should create config with default values', () => {
            const config = createMockConfig();
            
            expect(config.app.logLevel).toBe('ERROR');
            expect(config.app.environment).toBe('test');
            expect(config.app.logFormat).toBe('text');
            expect(config.puppeteer.headless).toBe(true);
            expect(config.puppeteer.timeout).toBe(10000);
            expect(config.puppeteer.viewport).toEqual({ width: 1024, height: 768 });
            expect(config.puppeteer.userAgent).toBe('Mozilla/5.0 (compatible; Inspector-CLI/1.0)');
            expect(config.puppeteer.blockAds).toBe(true);
            expect(config.puppeteer.blockImages).toBe(false);
            expect(config.puppeteer.maxConcurrency).toBe(2);
            expect(config.openai.apiKey).toBe('test-api-key');
            expect(config.openai.model).toBe('gpt-4');
            expect(config.api.retryAttempts).toBe(3);
        });

        it('should override specific values', () => {
            const config = createMockConfig({
                logLevel: 'DEBUG',
                headless: false,
                timeout: 5000,
                viewport: { width: 800, height: 600 },
                blockAds: false
            });
            
            expect(config.app.logLevel).toBe('DEBUG');
            expect(config.puppeteer.headless).toBe(false);
            expect(config.puppeteer.timeout).toBe(5000);
            expect(config.puppeteer.viewport).toEqual({ width: 800, height: 600 });
            expect(config.puppeteer.blockAds).toBe(false);
            
            // Unchanged values should keep defaults
            expect(config.puppeteer.blockImages).toBe(false);
            expect(config.openai.model).toBe('gpt-4');
        });
    });

    describe('createTestConfig', () => {
        it('should create optimized config for testing', () => {
            const config = createTestConfig();
            
            expect(config.app.logLevel).toBe('ERROR');
            expect(config.puppeteer.headless).toBe(true);
            expect(config.puppeteer.timeout).toBe(5000);
            expect(config.puppeteer.viewport).toEqual({ width: 800, height: 600 });
            expect(config.puppeteer.blockAds).toBe(true);
            expect(config.puppeteer.blockImages).toBe(true);
            expect(config.puppeteer.maxConcurrency).toBe(1);
        });
    });

    describe('createDebugConfig', () => {
        it('should create config optimized for debugging', () => {
            const config = createDebugConfig();
            
            expect(config.app.logLevel).toBe('DEBUG');
            expect(config.puppeteer.headless).toBe(false);
            expect(config.puppeteer.timeout).toBe(30000);
            expect(config.puppeteer.viewport).toEqual({ width: 1920, height: 1080 });
            expect(config.puppeteer.blockAds).toBe(false);
            expect(config.puppeteer.blockImages).toBe(false);
            expect(config.puppeteer.maxConcurrency).toBe(1);
        });
    });

    describe('createProductionTestConfig', () => {
        it('should create production-like config for testing', () => {
            const config = createProductionTestConfig();
            
            expect(config.app.logLevel).toBe('WARN');
            expect(config.puppeteer.headless).toBe(true);
            expect(config.puppeteer.timeout).toBe(15000);
            expect(config.puppeteer.viewport).toEqual({ width: 1024, height: 768 });
            expect(config.puppeteer.blockAds).toBe(true);
            expect(config.puppeteer.blockImages).toBe(false);
            expect(config.puppeteer.maxConcurrency).toBe(2);
        });
    });

    describe('createMockGetConfig', () => {
        it('should create a jest mock function with default config', () => {
            const mockGetConfig = createMockGetConfig();
            
            expect(jest.isMockFunction(mockGetConfig)).toBe(true);
            
            const config = mockGetConfig();
            expect(config.app.logLevel).toBe('ERROR');
            expect(config.puppeteer.timeout).toBe(5000);
            
            expect(mockGetConfig).toHaveBeenCalledTimes(1);
        });

        it('should create a jest mock function with custom config', () => {
            const customConfig = createMockConfig({ logLevel: 'DEBUG' });
            const mockGetConfig = createMockGetConfig(customConfig);
            
            const config = mockGetConfig();
            expect(config.app.logLevel).toBe('DEBUG');
            
            expect(mockGetConfig).toHaveBeenCalledTimes(1);
        });

        it('should be spyable across multiple calls', () => {
            const mockGetConfig = createMockGetConfig();
            
            mockGetConfig();
            mockGetConfig();
            
            expect(mockGetConfig).toHaveBeenCalledTimes(2);
            expect(mockGetConfig).toHaveReturnedTimes(2);
        });
    });

    describe('createSpyableConfig', () => {
        it('should create a config object suitable for spying', () => {
            const config = createSpyableConfig({ logLevel: 'INFO' });
            
            expect(config.app.logLevel).toBe('INFO');
            expect(config.puppeteer.headless).toBe(true);
            expect(config.openai.model).toBe('gpt-4');
            
            // Should have the structure of a full config
            expect(config).toHaveProperty('app');
            expect(config).toHaveProperty('puppeteer');
            expect(config).toHaveProperty('openai');
        });
    });

    describe('Integration scenarios', () => {
        it('should work with jest.doMock pattern', () => {
            const mockConfig = createTestConfig();
            const mockGetConfig = jest.fn(() => mockConfig);
            
            // Simulate the pattern users would use
            jest.doMock('../../../utils/config.js', () => ({
                getConfig: mockGetConfig
            }));
            
            // Verify the mock is set up correctly
            expect(mockGetConfig()).toBe(mockConfig);
            expect(mockGetConfig).toHaveBeenCalledTimes(1);
        });

        it('should provide consistent configs across test scenarios', () => {
            const testConfig = createTestConfig();
            const debugConfig = createDebugConfig();
            const prodConfig = createProductionTestConfig();
            
            // Test configs should be faster/smaller
            expect(testConfig.puppeteer.timeout).toBeLessThan(debugConfig.puppeteer.timeout);
            expect(testConfig.puppeteer.viewport.width).toBeLessThan(debugConfig.puppeteer.viewport.width);
            
            // Production configs should be more robust
            expect(prodConfig.puppeteer.timeout).toBeGreaterThan(testConfig.puppeteer.timeout);
            expect(prodConfig.app.logLevel).toBe('WARN');
            
            // Debug configs should be more verbose
            expect(debugConfig.app.logLevel).toBe('DEBUG');
            expect(debugConfig.puppeteer.headless).toBe(false);
        });
    });
});