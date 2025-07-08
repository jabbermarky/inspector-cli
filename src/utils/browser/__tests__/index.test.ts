import { jest } from '@jest/globals';
import {
    BrowserManager,
    createDetectionConfig,
    createCaptureConfig,
    createAnalysisConfig,
    BrowserManagerConfig,
    NAVIGATION_STRATEGIES,
    RESOURCE_BLOCKING_STRATEGIES,
    Semaphore,
    createSemaphore
} from '../index.js';
import { setupBrowserTests } from '@test-utils';

// Mock dependencies
jest.mock('../../config.js', () => ({
    getConfig: jest.fn(() => ({
        puppeteer: {
            timeout: 10000,
            userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
            viewport: { width: 1024, height: 768 },
            blockAds: true
        }
    }))
}));

jest.mock('../../logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        apiCall: jest.fn(),
        apiResponse: jest.fn(),
        performance: jest.fn()
    }))
}));

jest.mock('../semaphore.js', () => ({
    Semaphore: jest.fn().mockImplementation((max: any) => ({
        acquire: jest.fn(),
        release: jest.fn(),
        getState: jest.fn(() => ({ current: 0, max, queueSize: 0 }))
    })),
    createSemaphore: jest.fn(() => ({
        acquire: jest.fn(),
        release: jest.fn()
    }))
}));

describe('Browser Module Index', () => {
    setupBrowserTests();
    describe('Exports', () => {
        it('should export BrowserManager class', () => {
            expect(BrowserManager).toBeDefined();
            expect(typeof BrowserManager).toBe('function');
        });

        it('should export strategy mappings', () => {
            expect(NAVIGATION_STRATEGIES).toBeDefined();
            expect(typeof NAVIGATION_STRATEGIES).toBe('object');
            
            expect(RESOURCE_BLOCKING_STRATEGIES).toBeDefined();
            expect(typeof RESOURCE_BLOCKING_STRATEGIES).toBe('object');
        });

        it('should export convenience functions', () => {
            expect(typeof createDetectionConfig).toBe('function');
            expect(typeof createCaptureConfig).toBe('function');
            expect(typeof createAnalysisConfig).toBe('function');
        });

        it('should export semaphore utilities', () => {
            expect(Semaphore).toBeDefined();
            expect(typeof Semaphore).toBe('function');
            expect(typeof createSemaphore).toBe('function');
        });
    });

    describe('Convenience Configuration Functions', () => {
        describe('createDetectionConfig', () => {
            it('should create detection config with defaults', () => {
                const config = createDetectionConfig();
                
                expect(config.purpose).toBe('detection');
                expect(config.resourceBlocking.strategy).toBe('aggressive');
                expect(config.resourceBlocking.allowEssentialScripts).toBe(true);
                expect(config.navigation.timeout).toBe(5000);
                expect(config.navigation.retryAttempts).toBe(3);
            });

            it('should create detection config with overrides', () => {
                const overrides: Partial<BrowserManagerConfig> = {
                    navigation: {
                        timeout: 8000,
                        retryAttempts: 5
                    },
                    resourceBlocking: {
                        enabled: false,
                        strategy: 'minimal'
                    }
                };
                
                const config = createDetectionConfig(overrides);
                
                expect(config.purpose).toBe('detection');
                expect(config.navigation.timeout).toBe(8000);
                expect(config.navigation.retryAttempts).toBe(5);
                expect(config.resourceBlocking.enabled).toBe(false);
                expect(config.resourceBlocking.strategy).toBe('minimal');
            });

            it('should maintain detection-specific defaults when overriding', () => {
                const overrides = {
                    viewport: { width: 1920, height: 1080 }
                };
                
                const config = createDetectionConfig(overrides);
                
                expect(config.purpose).toBe('detection');
                expect(config.resourceBlocking.strategy).toBe('aggressive');
                expect(config.viewport.width).toBe(1920);
                expect(config.viewport.height).toBe(1080);
            });
        });

        describe('createCaptureConfig', () => {
            it('should create capture config with defaults', () => {
                const config = createCaptureConfig();
                
                expect(config.purpose).toBe('capture');
                expect(config.resourceBlocking.strategy).toBe('moderate');
                expect(config.resourceBlocking.allowEssentialScripts).toBeUndefined();
                expect(config.navigation.timeout).toBe(15000);
                expect(config.navigation.additionalWaitTime).toBe(2000);
            });

            it('should create capture config with overrides', () => {
                const overrides: Partial<BrowserManagerConfig> = {
                    navigation: {
                        timeout: 20000,
                        additionalWaitTime: 5000
                    },
                    resourceBlocking: {
                        enabled: true,
                        strategy: 'aggressive'
                    }
                };
                
                const config = createCaptureConfig(overrides);
                
                expect(config.purpose).toBe('capture');
                expect(config.navigation.timeout).toBe(20000);
                expect(config.navigation.additionalWaitTime).toBe(5000);
                expect(config.resourceBlocking.strategy).toBe('aggressive');
            });

            it('should maintain capture-specific defaults when overriding', () => {
                const overrides = {
                    userAgent: 'Custom User Agent'
                };
                
                const config = createCaptureConfig(overrides);
                
                expect(config.purpose).toBe('capture');
                expect(config.resourceBlocking.strategy).toBe('moderate');
                expect(config.navigation.additionalWaitTime).toBe(2000);
                expect(config.userAgent).toBe('Custom User Agent');
            });
        });

        describe('createAnalysisConfig', () => {
            it('should create analysis config with defaults', () => {
                const config = createAnalysisConfig();
                
                expect(config.purpose).toBe('analysis');
                expect(config.resourceBlocking.strategy).toBe('minimal');
                expect(config.navigation.timeout).toBe(10000);
                expect(config.navigation.retryAttempts).toBe(2);
            });

            it('should create analysis config with overrides', () => {
                const overrides: Partial<BrowserManagerConfig> = {
                    navigation: {
                        timeout: 12000,
                        retryAttempts: 4
                    },
                    concurrency: {
                        maxConcurrent: 4
                    }
                };
                
                const config = createAnalysisConfig(overrides);
                
                expect(config.purpose).toBe('analysis');
                expect(config.navigation.timeout).toBe(12000);
                expect(config.navigation.retryAttempts).toBe(4);
                expect(config.concurrency.maxConcurrent).toBe(4);
            });

            it('should maintain analysis-specific defaults when overriding', () => {
                const overrides = {
                    headless: false
                };
                
                const config = createAnalysisConfig(overrides);
                
                expect(config.purpose).toBe('analysis');
                expect(config.resourceBlocking.strategy).toBe('minimal');
                expect(config.navigation.retryAttempts).toBe(2);
                expect(config.headless).toBe(false);
            });
        });
    });

    describe('Configuration Consistency', () => {
        it('should have consistent base configuration across all configs', () => {
            const detection = createDetectionConfig();
            const capture = createCaptureConfig();
            const analysis = createAnalysisConfig();
            
            // Base browser settings should be consistent
            expect(detection.headless).toBe(capture.headless);
            expect(capture.headless).toBe(analysis.headless);
            
            expect(detection.viewport).toEqual(capture.viewport);
            expect(capture.viewport).toEqual(analysis.viewport);
            
            // User agent configuration may differ by purpose
            // Detection uses rotation for bot evasion, capture/analysis use static
            if (typeof detection.userAgent === 'object') {
                expect(detection.userAgent).toHaveProperty('rotation');
                expect(detection.userAgent).toHaveProperty('strategy');
            }
            expect(capture.userAgent).toBe(analysis.userAgent);
            
            expect(detection.concurrency.maxConcurrent).toBe(capture.concurrency.maxConcurrent);
            expect(capture.concurrency.maxConcurrent).toBe(analysis.concurrency.maxConcurrent);
        });

        it('should have different purposes and strategies', () => {
            const detection = createDetectionConfig();
            const capture = createCaptureConfig();
            const analysis = createAnalysisConfig();
            
            expect(detection.purpose).toBe('detection');
            expect(capture.purpose).toBe('capture');
            expect(analysis.purpose).toBe('analysis');
            
            expect(detection.resourceBlocking.strategy).toBe('aggressive');
            expect(capture.resourceBlocking.strategy).toBe('moderate');
            expect(analysis.resourceBlocking.strategy).toBe('minimal');
        });

        it('should have appropriate timeout configurations', () => {
            const detection = createDetectionConfig();
            const capture = createCaptureConfig();
            const analysis = createAnalysisConfig();
            
            // Detection should be fastest (DOM content only)
            expect(detection.navigation.timeout).toBeLessThan(capture.navigation.timeout);
            
            // Capture should have longest timeout (full rendering)
            expect(capture.navigation.timeout).toBeGreaterThan(analysis.navigation.timeout);
            
            // Only capture should have additional wait time
            expect(capture.navigation.additionalWaitTime).toBeGreaterThan(0);
            expect(detection.navigation.additionalWaitTime).toBeUndefined();
            expect(analysis.navigation.additionalWaitTime).toBeUndefined();
        });

        it('should have appropriate retry configurations', () => {
            const detection = createDetectionConfig();
            const _capture = createCaptureConfig();
            const analysis = createAnalysisConfig();
            
            // Detection should have most retries (fastest operations)
            expect(detection.navigation.retryAttempts || 0).toBeGreaterThan(analysis.navigation.retryAttempts || 0);
            
            // Analysis should have fewer retries (longer operations)
            expect(analysis.navigation.retryAttempts || 0).toBeLessThan(detection.navigation.retryAttempts || 0);
        });
    });

    describe('Purpose-Strategy Mapping', () => {
        it('should map detection purpose to domcontentloaded strategy', () => {
            const detectionConfig = createDetectionConfig();
            const strategy = NAVIGATION_STRATEGIES[detectionConfig.purpose as keyof typeof NAVIGATION_STRATEGIES];
            
            expect(strategy.waitUntil).toBe('domcontentloaded');
            expect(strategy.reasoning).toContain('DOM structure');
        });

        it('should map capture purpose to networkidle0 strategy', () => {
            const captureConfig = createCaptureConfig();
            const strategy = NAVIGATION_STRATEGIES[captureConfig.purpose as keyof typeof NAVIGATION_STRATEGIES];
            
            expect(strategy.waitUntil).toBe('networkidle0');
            expect(strategy.reasoning).toContain('visual rendering');
        });

        it('should map analysis purpose to networkidle2 strategy', () => {
            const analysisConfig = createAnalysisConfig();
            const strategy = NAVIGATION_STRATEGIES[analysisConfig.purpose as keyof typeof NAVIGATION_STRATEGIES];
            
            expect(strategy.waitUntil).toBe('networkidle2');
            expect(strategy.reasoning).toContain('partial network activity');
        });
    });

    describe('Resource Blocking Strategy Mapping', () => {
        it('should map aggressive strategy to comprehensive blocking', () => {
            const detectionConfig = createDetectionConfig();
            const blockedTypes = RESOURCE_BLOCKING_STRATEGIES[detectionConfig.resourceBlocking.strategy as keyof typeof RESOURCE_BLOCKING_STRATEGIES];
            
            expect(blockedTypes).toContain('image');
            expect(blockedTypes).toContain('stylesheet');
            expect(blockedTypes).toContain('font');
            expect(blockedTypes).toContain('media');
            expect(blockedTypes.length).toBeGreaterThan(3);
        });

        it('should map moderate strategy to selective blocking', () => {
            const captureConfig = createCaptureConfig();
            const blockedTypes = RESOURCE_BLOCKING_STRATEGIES[captureConfig.resourceBlocking.strategy as keyof typeof RESOURCE_BLOCKING_STRATEGIES];
            
            expect(blockedTypes).not.toContain('image');
            expect(blockedTypes).not.toContain('stylesheet');
            expect(blockedTypes).toContain('font');
            expect(blockedTypes).toContain('media');
        });

        it('should map minimal strategy to minimal blocking', () => {
            const analysisConfig = createAnalysisConfig();
            const blockedTypes = RESOURCE_BLOCKING_STRATEGIES[analysisConfig.resourceBlocking.strategy as keyof typeof RESOURCE_BLOCKING_STRATEGIES];
            
            expect(blockedTypes.length).toBeLessThan(3);
            expect(blockedTypes).toContain('websocket');
        });
    });

    describe('Integration with BrowserManager', () => {
        it('should create BrowserManager with detection config', () => {
            const config = createDetectionConfig();
            const manager = new BrowserManager(config);
            
            expect(manager).toBeInstanceOf(BrowserManager);
        });

        it('should create BrowserManager with capture config', () => {
            const config = createCaptureConfig();
            const manager = new BrowserManager(config);
            
            expect(manager).toBeInstanceOf(BrowserManager);
        });

        it('should create BrowserManager with analysis config', () => {
            const config = createAnalysisConfig();
            const manager = new BrowserManager(config);
            
            expect(manager).toBeInstanceOf(BrowserManager);
        });
    });
});