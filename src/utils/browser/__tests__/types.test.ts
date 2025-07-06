import {
    BrowserManagerError,
    BrowserNetworkError,
    BrowserResourceError,
    BrowserTimeoutError,
    NAVIGATION_STRATEGIES,
    RESOURCE_BLOCKING_STRATEGIES,
    DEFAULT_ESSENTIAL_SCRIPT_PATTERNS,
    DEFAULT_BROWSER_CONFIG
} from '../types.js';

describe('Browser Manager Types', () => {
    describe('Error Classes', () => {
        describe('BrowserManagerError', () => {
            it('should create error with message and type', () => {
                const error = new BrowserManagerError('Test error', 'test_error');
                
                expect(error.message).toBe('Test error');
                expect(error.name).toBe('BrowserManagerError');
                expect(error.type).toBe('test_error');
                expect(error.context).toBeUndefined();
                expect(error.cause).toBeUndefined();
            });

            it('should create error with context and cause', () => {
                const cause = new Error('Original error');
                const context = { url: 'https://example.com', timeout: 5000 };
                
                const error = new BrowserManagerError(
                    'Test error with context',
                    'test_error',
                    context,
                    cause
                );
                
                expect(error.message).toBe('Test error with context');
                expect(error.context).toEqual(context);
                expect(error.cause).toBe(cause);
            });

            it('should default to browser_manager_error type', () => {
                const error = new BrowserManagerError('Test error');
                expect(error.type).toBe('browser_manager_error');
            });
        });

        describe('BrowserNetworkError', () => {
            it('should create network error with URL context', () => {
                const context = { 
                    url: 'https://example.com', 
                    networkError: 'timeout' 
                };
                
                const error = new BrowserNetworkError('Network error', context);
                
                expect(error.name).toBe('BrowserNetworkError');
                expect(error.type).toBe('browser_network_error');
                expect(error.url).toBe('https://example.com');
                expect(error.networkError).toBe('timeout');
            });

            it('should handle missing URL context', () => {
                const error = new BrowserNetworkError('Network error');
                
                expect(error.url).toBeUndefined();
                expect(error.networkError).toBeUndefined();
            });
        });

        describe('BrowserResourceError', () => {
            it('should create resource error with resource type', () => {
                const context = { resourceType: 'image' };
                const error = new BrowserResourceError('Resource error', context);
                
                expect(error.name).toBe('BrowserResourceError');
                expect(error.type).toBe('browser_resource_error');
                expect(error.resourceType).toBe('image');
            });

            it('should handle missing resource type', () => {
                const error = new BrowserResourceError('Resource error');
                expect(error.resourceType).toBeUndefined();
            });
        });

        describe('BrowserTimeoutError', () => {
            it('should create timeout error with timeout and operation', () => {
                const error = new BrowserTimeoutError(
                    'Timeout error',
                    5000,
                    'navigation'
                );
                
                expect(error.name).toBe('BrowserTimeoutError');
                expect(error.type).toBe('browser_timeout_error');
                expect(error.timeout).toBe(5000);
                expect(error.operation).toBe('navigation');
            });

            it('should include context and cause', () => {
                const cause = new Error('Original timeout');
                const context = { url: 'https://example.com' };
                
                const error = new BrowserTimeoutError(
                    'Timeout error',
                    10000,
                    'screenshot',
                    context,
                    cause
                );
                
                expect(error.context).toEqual(context);
                expect(error.cause).toBe(cause);
            });
        });
    });

    describe('Strategy Mappings', () => {
        describe('NAVIGATION_STRATEGIES', () => {
            it('should have correct navigation strategies for all purposes', () => {
                expect(NAVIGATION_STRATEGIES.detection).toEqual({
                    waitUntil: 'domcontentloaded',
                    reasoning: 'CMS detection only needs DOM structure, not full visual loading'
                });

                expect(NAVIGATION_STRATEGIES.capture).toEqual({
                    waitUntil: 'networkidle0',
                    reasoning: 'Screenshots need full visual rendering including images and styles'
                });

                expect(NAVIGATION_STRATEGIES.analysis).toEqual({
                    waitUntil: 'networkidle2',
                    reasoning: 'Analysis might need partial network activity for dynamic content'
                });
            });

            it('should have all required browser purposes', () => {
                const purposes = Object.keys(NAVIGATION_STRATEGIES);
                expect(purposes).toContain('detection');
                expect(purposes).toContain('capture');
                expect(purposes).toContain('analysis');
                expect(purposes).toHaveLength(3);
            });
        });

        describe('RESOURCE_BLOCKING_STRATEGIES', () => {
            it('should have correct resource blocking strategies', () => {
                expect(RESOURCE_BLOCKING_STRATEGIES.aggressive).toEqual([
                    'image', 'stylesheet', 'font', 'media', 'websocket'
                ]);

                expect(RESOURCE_BLOCKING_STRATEGIES.moderate).toEqual([
                    'font', 'media', 'websocket'
                ]);

                expect(RESOURCE_BLOCKING_STRATEGIES.minimal).toEqual([
                    'websocket'
                ]);
            });

            it('should have aggressive strategy blocking most resources', () => {
                const aggressive = RESOURCE_BLOCKING_STRATEGIES.aggressive;
                expect(aggressive.length).toBeGreaterThan(RESOURCE_BLOCKING_STRATEGIES.moderate.length);
                expect(aggressive).toContain('image');
                expect(aggressive).toContain('stylesheet');
            });

            it('should have moderate strategy preserving visual elements', () => {
                const moderate = RESOURCE_BLOCKING_STRATEGIES.moderate;
                expect(moderate).not.toContain('image');
                expect(moderate).not.toContain('stylesheet');
                expect(moderate).toContain('font');
            });

            it('should have minimal strategy blocking only non-essential resources', () => {
                const minimal = RESOURCE_BLOCKING_STRATEGIES.minimal;
                expect(minimal).toEqual(['websocket']);
            });
        });
    });

    describe('Default Configuration', () => {
        describe('DEFAULT_ESSENTIAL_SCRIPT_PATTERNS', () => {
            it('should include WordPress patterns', () => {
                expect(DEFAULT_ESSENTIAL_SCRIPT_PATTERNS).toContain('/wp-includes/');
                expect(DEFAULT_ESSENTIAL_SCRIPT_PATTERNS).toContain('/wp-content/');
                expect(DEFAULT_ESSENTIAL_SCRIPT_PATTERNS).toContain('/wp-admin/');
                expect(DEFAULT_ESSENTIAL_SCRIPT_PATTERNS).toContain('wp-json');
            });

            it('should include other CMS patterns', () => {
                expect(DEFAULT_ESSENTIAL_SCRIPT_PATTERNS).toContain('joomla');
                expect(DEFAULT_ESSENTIAL_SCRIPT_PATTERNS).toContain('drupal');
            });

            it('should include common library patterns', () => {
                expect(DEFAULT_ESSENTIAL_SCRIPT_PATTERNS).toContain('jquery');
                expect(DEFAULT_ESSENTIAL_SCRIPT_PATTERNS).toContain('bootstrap');
                expect(DEFAULT_ESSENTIAL_SCRIPT_PATTERNS).toContain('generator');
            });
        });

        describe('DEFAULT_BROWSER_CONFIG', () => {
            it('should have sensible default values', () => {
                expect(DEFAULT_BROWSER_CONFIG.headless).toBe(true);
                expect(DEFAULT_BROWSER_CONFIG.viewport).toEqual({ width: 1024, height: 768 });
                expect(DEFAULT_BROWSER_CONFIG.userAgent).toBe('Mozilla/5.0 (compatible; Inspector-CLI/1.0)');
            });

            it('should have default resource blocking configuration', () => {
                expect(DEFAULT_BROWSER_CONFIG.resourceBlocking).toEqual({
                    enabled: true,
                    strategy: 'moderate'
                });
            });

            it('should have default navigation configuration', () => {
                expect(DEFAULT_BROWSER_CONFIG.navigation).toEqual({
                    timeout: 10000,
                    retryAttempts: 3,
                    additionalWaitTime: 0
                });
            });

            it('should have default concurrency configuration', () => {
                expect(DEFAULT_BROWSER_CONFIG.concurrency).toEqual({
                    maxConcurrent: 2,
                    acquireTimeout: 30000
                });
            });

            it('should have default debug configuration', () => {
                expect(DEFAULT_BROWSER_CONFIG.debug).toEqual({
                    enableTracing: false,
                    captureConsole: false,
                    saveFailureScreenshots: false,
                    performanceMetrics: false
                });
            });
        });
    });

    describe('Type Validation', () => {
        it('should validate BrowserPurpose type values', () => {
            const validPurposes: string[] = ['detection', 'capture', 'analysis'];
            
            // Verify these are the only valid purposes in our strategies
            const strategyPurposes = Object.keys(NAVIGATION_STRATEGIES);
            expect(strategyPurposes.sort()).toEqual(validPurposes.sort());
        });

        it('should validate ResourceBlockingStrategy type values', () => {
            const validStrategies: string[] = ['aggressive', 'moderate', 'minimal'];
            
            // Verify these are the only valid strategies in our mappings
            const blockingStrategies = Object.keys(RESOURCE_BLOCKING_STRATEGIES);
            expect(blockingStrategies.sort()).toEqual(validStrategies.sort());
        });

        it('should validate NavigationWaitStrategy type values', () => {
            const validWaitStrategies = ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'];
            
            // Verify all navigation strategies use valid wait strategies
            const usedWaitStrategies = Object.values(NAVIGATION_STRATEGIES)
                .map(strategy => strategy.waitUntil);
            
            usedWaitStrategies.forEach(waitStrategy => {
                expect(validWaitStrategies).toContain(waitStrategy);
            });
        });
    });
});