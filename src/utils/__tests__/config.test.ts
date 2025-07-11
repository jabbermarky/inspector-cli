import { jest } from '@jest/globals';
import { ConfigManager, ConfigValidator, getConfig, reloadConfig } from '../config.js';
import { LogLevel } from '../logger.js';
import { setupFileTests, setupJestExtensions } from '@test-utils';

// Setup custom Jest matchers
setupJestExtensions();

// Factory functions for test configurations
const createBaseConfig = (overrides: any = {}) => ({
    openai: {
        apiKey: 'sk-test',
        temperature: 0.7,
        topP: 1.0,
        maxTokens: 4096,
        ...overrides.openai
    },
    puppeteer: {
        headless: true,
        timeout: 30000,
        viewport: { width: 1024, height: 768 },
        userAgent: 'test',
        blockAds: true,
        blockImages: false,
        maxConcurrency: 2,
        ...overrides.puppeteer
    },
    app: {
        environment: 'test' as const,
        screenshotDir: './test',
        logLevel: 'DEBUG' as const,
        logFormat: 'text' as const,
        ...overrides.app
    },
    api: {
        retryAttempts: 3,
        retryDelay: 1000,
        requestTimeout: 60000,
        enableCaching: false,
        ...overrides.api
    }
});

const createInvalidConfig = (field: string, value: any) => {
    const config = createBaseConfig();
    const keys = field.split('.');
    let target: any = config;
    for (let i = 0; i < keys.length - 1; i++) {
        target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
    return config;
};

// Mock dependencies
jest.mock('fs', () => ({
    readFileSync: jest.fn(),
    existsSync: jest.fn()
}));

jest.mock('path', () => ({
    join: jest.fn((...args) => args.join('/'))
}));

// Mock retry utility with standardized pattern
jest.mock('../retry.js', () => ({
    withRetry: jest.fn().mockImplementation(async (fn: any) => await fn())
}));

jest.mock('../logger.js', () => ({
    LogLevel: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        SILENT: 4
    },
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        apiCall: jest.fn(),
        apiResponse: jest.fn(),
        performance: jest.fn()
    })),
    updateLoggerConfig: jest.fn()
}));

import { readFileSync, existsSync } from 'fs';
import { updateLoggerConfig } from '../logger.js';

const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockUpdateLoggerConfig = updateLoggerConfig as jest.MockedFunction<typeof updateLoggerConfig>;

describe('ConfigValidator', () => {
    describe('validateOpenAIConfig', () => {
        it('should pass validation in non-strict mode without API key', () => {
            const config = createBaseConfig({
                openai: { apiKey: '' }
            });

            expect(() => ConfigValidator.validate(config, false)).not.toThrow();
        });

        it('should require API key in strict mode', () => {
            const config = createBaseConfig({
                openai: { apiKey: '' }
            });

            expect(() => ConfigValidator.validate(config, true))
                .toThrow('OPENAI_API_KEY is required for AI-powered commands');
        });

        it('should validate API key format in strict mode', () => {
            const config = {
                openai: {
                    apiKey: 'invalid-key',
                    temperature: 0.7,
                    topP: 1.0,
                    maxTokens: 4096
                },
                puppeteer: {
                    headless: true,
                    timeout: 30000,
                    viewport: { width: 1024, height: 768 },
                    userAgent: 'test',
                    blockAds: true,
                    blockImages: false,
                    maxConcurrency: 2
                },
                app: {
                    environment: 'test' as const,
                    screenshotDir: './test',
                    logLevel: 'DEBUG' as const,
                    logFormat: 'text' as const
                },
                api: {
                    retryAttempts: 3,
                    retryDelay: 1000,
                    requestTimeout: 60000,
                    enableCaching: false
                }
            };

            expect(() => ConfigValidator.validate(config, true))
                .toThrow('OPENAI_API_KEY must start with "sk-"');
        });

        it('should validate temperature range', () => {
            const config = createInvalidConfig('openai.temperature', 3.0);

            expect(() => ConfigValidator.validateForOpenAI(config))
                .toThrow('OpenAI temperature must be between 0 and 2');
        });

        it('should validate topP range', () => {
            const config = {
                openai: {
                    apiKey: 'sk-test',
                    temperature: 0.7,
                    topP: 1.5, // Invalid
                    maxTokens: 4096
                }
            };

            expect(() => ConfigValidator.validateForOpenAI(config))
                .toThrow('OpenAI topP must be between 0 and 1');
        });

        it('should validate maxTokens range', () => {
            const config = {
                openai: {
                    apiKey: 'sk-test',
                    temperature: 0.7,
                    topP: 1.0,
                    maxTokens: 150000 // Invalid
                }
            };

            expect(() => ConfigValidator.validateForOpenAI(config))
                .toThrow('OpenAI maxTokens must be between 1 and 128000');
        });
    });

    describe('validatePuppeteerConfig', () => {
        it('should validate timeout minimum', () => {
            const config = {
                openai: { apiKey: 'sk-test', temperature: 0.7, topP: 1.0, maxTokens: 4096 },
                puppeteer: {
                    headless: true,
                    timeout: 500, // Invalid
                    viewport: { width: 1024, height: 768 },
                    userAgent: 'test',
                    blockAds: true,
                    blockImages: false,
                    maxConcurrency: 2
                },
                app: { environment: 'test' as const, screenshotDir: './test', logLevel: 'DEBUG' as const, logFormat: 'text' as const },
                api: { retryAttempts: 3, retryDelay: 1000, requestTimeout: 60000, enableCaching: false }
            };

            expect(() => ConfigValidator.validate(config))
                .toThrow('Puppeteer timeout must be at least 1000ms');
        });

        it('should validate viewport dimensions', () => {
            const config = {
                openai: { apiKey: 'sk-test', temperature: 0.7, topP: 1.0, maxTokens: 4096 },
                puppeteer: {
                    headless: true,
                    timeout: 30000,
                    viewport: { width: 100, height: 768 }, // Invalid width
                    userAgent: 'test',
                    blockAds: true,
                    blockImages: false,
                    maxConcurrency: 2
                },
                app: { environment: 'test' as const, screenshotDir: './test', logLevel: 'DEBUG' as const, logFormat: 'text' as const },
                api: { retryAttempts: 3, retryDelay: 1000, requestTimeout: 60000, enableCaching: false }
            };

            expect(() => ConfigValidator.validate(config))
                .toThrow('Puppeteer viewport width must be between 320 and 3840');
        });

        it('should validate maxConcurrency range', () => {
            const config = {
                openai: { apiKey: 'sk-test', temperature: 0.7, topP: 1.0, maxTokens: 4096 },
                puppeteer: {
                    headless: true,
                    timeout: 30000,
                    viewport: { width: 1024, height: 768 },
                    userAgent: 'test',
                    blockAds: true,
                    blockImages: false,
                    maxConcurrency: 15 // Invalid
                },
                app: { environment: 'test' as const, screenshotDir: './test', logLevel: 'DEBUG' as const, logFormat: 'text' as const },
                api: { retryAttempts: 3, retryDelay: 1000, requestTimeout: 60000, enableCaching: false }
            };

            expect(() => ConfigValidator.validate(config))
                .toThrow('Puppeteer maxConcurrency must be between 1 and 10');
        });
    });

    describe('validateAppConfig', () => {
        it('should validate environment values', () => {
            const config = {
                openai: { apiKey: 'sk-test', temperature: 0.7, topP: 1.0, maxTokens: 4096 },
                puppeteer: {
                    headless: true, timeout: 30000, viewport: { width: 1024, height: 768 },
                    userAgent: 'test', blockAds: true, blockImages: false, maxConcurrency: 2
                },
                app: {
                    environment: 'invalid', // Invalid
                    screenshotDir: './test',
                    logLevel: 'DEBUG' as const,
                    logFormat: 'text' as const
                },
                api: { retryAttempts: 3, retryDelay: 1000, requestTimeout: 60000, enableCaching: false }
            };

            expect(() => ConfigValidator.validate(config))
                .toThrow('App environment must be one of: development, production, test');
        });

        it('should validate log level values', () => {
            const config = {
                openai: { apiKey: 'sk-test', temperature: 0.7, topP: 1.0, maxTokens: 4096 },
                puppeteer: {
                    headless: true, timeout: 30000, viewport: { width: 1024, height: 768 },
                    userAgent: 'test', blockAds: true, blockImages: false, maxConcurrency: 2
                },
                app: {
                    environment: 'test' as const,
                    screenshotDir: './test',
                    logLevel: 'INVALID' as any, // Invalid
                    logFormat: 'text' as const
                },
                api: { retryAttempts: 3, retryDelay: 1000, requestTimeout: 60000, enableCaching: false }
            };

            expect(() => ConfigValidator.validate(config))
                .toThrow('App logLevel must be one of: DEBUG, INFO, WARN, ERROR, SILENT');
        });

        it('should validate log format values', () => {
            const config = {
                openai: { apiKey: 'sk-test', temperature: 0.7, topP: 1.0, maxTokens: 4096 },
                puppeteer: {
                    headless: true, timeout: 30000, viewport: { width: 1024, height: 768 },
                    userAgent: 'test', blockAds: true, blockImages: false, maxConcurrency: 2
                },
                app: {
                    environment: 'test' as const,
                    screenshotDir: './test',
                    logLevel: 'DEBUG' as const,
                    logFormat: 'invalid' as any // Invalid
                },
                api: { retryAttempts: 3, retryDelay: 1000, requestTimeout: 60000, enableCaching: false }
            };

            expect(() => ConfigValidator.validate(config))
                .toThrow('App logFormat must be one of: text, json');
        });
    });

    describe('validateAPIConfig', () => {
        it('should validate retry attempts range', () => {
            const config = {
                openai: { apiKey: 'sk-test', temperature: 0.7, topP: 1.0, maxTokens: 4096 },
                puppeteer: {
                    headless: true, timeout: 30000, viewport: { width: 1024, height: 768 },
                    userAgent: 'test', blockAds: true, blockImages: false, maxConcurrency: 2
                },
                app: { environment: 'test' as const, screenshotDir: './test', logLevel: 'DEBUG' as const, logFormat: 'text' as const },
                api: {
                    retryAttempts: 15, // Invalid
                    retryDelay: 1000,
                    requestTimeout: 60000,
                    enableCaching: false
                }
            };

            expect(() => ConfigValidator.validate(config))
                .toThrow('API retryAttempts must be between 0 and 10');
        });

        it('should validate retry delay range', () => {
            const config = {
                openai: { apiKey: 'sk-test', temperature: 0.7, topP: 1.0, maxTokens: 4096 },
                puppeteer: {
                    headless: true, timeout: 30000, viewport: { width: 1024, height: 768 },
                    userAgent: 'test', blockAds: true, blockImages: false, maxConcurrency: 2
                },
                app: { environment: 'test' as const, screenshotDir: './test', logLevel: 'DEBUG' as const, logFormat: 'text' as const },
                api: {
                    retryAttempts: 3,
                    retryDelay: 50, // Invalid
                    requestTimeout: 60000,
                    enableCaching: false
                }
            };

            expect(() => ConfigValidator.validate(config))
                .toThrow('API retryDelay must be between 100 and 30000ms');
        });

        it('should validate request timeout range', () => {
            const config = {
                openai: { apiKey: 'sk-test', temperature: 0.7, topP: 1.0, maxTokens: 4096 },
                puppeteer: {
                    headless: true, timeout: 30000, viewport: { width: 1024, height: 768 },
                    userAgent: 'test', blockAds: true, blockImages: false, maxConcurrency: 2
                },
                app: { environment: 'test' as const, screenshotDir: './test', logLevel: 'DEBUG' as const, logFormat: 'text' as const },
                api: {
                    retryAttempts: 3,
                    retryDelay: 1000,
                    requestTimeout: 500, // Invalid
                    enableCaching: false
                }
            };

            expect(() => ConfigValidator.validate(config))
                .toThrow('API requestTimeout must be between 1000 and 300000ms');
        });
    });
});

describe('ConfigManager', () => {
    setupFileTests();
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        // Store original environment
        originalEnv = { ...process.env };
        
        // Clear environment variables
        delete process.env.OPENAI_API_KEY;
        delete process.env.LOG_LEVEL;
        delete process.env.NODE_ENV;
        
        // Reset mocks
        jest.clearAllMocks();
        
        // Reset singleton instance
        (ConfigManager as any).instance = undefined;
        
        // Default file system mocks
        mockExistsSync.mockReturnValue(false);
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe('singleton behavior', () => {
        it('should return the same instance', () => {
            const instance1 = ConfigManager.getInstance();
            const instance2 = ConfigManager.getInstance();
            
            expect(instance1).toBe(instance2);
        });
    });

    describe('environment variable loading', () => {
        it('should load configuration from environment variables', () => {
            process.env.OPENAI_API_KEY = 'sk-test123';
            process.env.LOG_LEVEL = 'ERROR';
            process.env.NODE_ENV = 'production';
            process.env.PUPPETEER_HEADLESS = 'false';
            process.env.SCREENSHOT_DIR = '/custom/screenshots';

            const manager = ConfigManager.getInstance();
            const config = manager.getConfig();

            expect(config.openai.apiKey).toBe('sk-test123');
            expect(config.app.logLevel).toBe('ERROR');
            expect(config.app.environment).toBe('production');
            expect(config.puppeteer.headless).toBe(false);
            expect(config.app.screenshotDir).toBe('/custom/screenshots');
        });

        it('should use defaults when environment variables are not set', () => {
            const manager = ConfigManager.getInstance();
            const config = manager.getConfig();

            expect(config.openai.apiKey).toBe('');
            expect(config.openai.model).toBe('gpt-4o');
            expect(config.openai.temperature).toBe(0.7);
            expect(config.puppeteer.headless).toBe(true);
            expect(config.app.screenshotDir).toBe('./scrapes');
            expect(config.api.retryAttempts).toBe(3);
        });

        it('should parse numeric environment variables correctly', () => {
            process.env.OPENAI_TEMPERATURE = '0.5';
            process.env.OPENAI_MAX_TOKENS = '2048';
            process.env.PUPPETEER_TIMEOUT = '45000';
            process.env.API_RETRY_ATTEMPTS = '5';

            const manager = ConfigManager.getInstance();
            const config = manager.getConfig();

            expect(config.openai.temperature).toBe(0.5);
            expect(config.openai.maxTokens).toBe(2048);
            expect(config.puppeteer.timeout).toBe(45000);
            expect(config.api.retryAttempts).toBe(5);
        });

        it('should parse boolean environment variables correctly', () => {
            process.env.PUPPETEER_HEADLESS = 'false';
            process.env.PUPPETEER_BLOCK_ADS = 'false';
            process.env.PUPPETEER_BLOCK_IMAGES = 'true';
            process.env.API_ENABLE_CACHING = 'true';

            const manager = ConfigManager.getInstance();
            const config = manager.getConfig();

            expect(config.puppeteer.headless).toBe(false);
            expect(config.puppeteer.blockAds).toBe(false);
            expect(config.puppeteer.blockImages).toBe(true);
            expect(config.api.enableCaching).toBe(true);
        });
    });

    describe('config file loading', () => {
        it('should attempt to load configuration from multiple file paths', () => {
            // Just verify that the file system is checked
            mockExistsSync.mockReturnValue(false);
            
            // Reset singleton to force reload
            (ConfigManager as any).instance = undefined;
            
            const manager = ConfigManager.getInstance();
            const config = manager.getConfig();

            // Should fall back to defaults when no config file exists
            expect(config.openai.model).toBe('gpt-4o');
            expect(mockExistsSync).toHaveBeenCalled();
        });

        it('should handle invalid JSON in config file gracefully', () => {
            mockExistsSync.mockImplementation((path) => {
                return typeof path === 'string' && (
                    path === './inspector.config.json' || 
                    path.includes('inspector.config.json')
                );
            });
            mockReadFileSync.mockImplementation(((path: any, options?: any) => {
                if (typeof path === 'string' && (
                    path === './inspector.config.json' || 
                    path.includes('inspector.config.json')
                )) {
                    return 'invalid json';
                }
                return '';
            }) as any);

            // Reset singleton to force reload
            (ConfigManager as any).instance = undefined;

            // Should not throw, should use defaults
            const manager = ConfigManager.getInstance();
            const config = manager.getConfig();

            expect(config.openai.model).toBe('gpt-4o'); // Default value
        });

        it('should prioritize environment variables over defaults', () => {
            process.env.OPENAI_MODEL = 'gpt-3.5-turbo';
            process.env.LOG_LEVEL = 'ERROR';
            process.env.OPENAI_TEMPERATURE = '0.3';

            mockExistsSync.mockReturnValue(false); // No config file

            // Reset singleton to force reload
            (ConfigManager as any).instance = undefined;

            const manager = ConfigManager.getInstance();
            const config = manager.getConfig();

            // Environment should win
            expect(config.openai.model).toBe('gpt-3.5-turbo');
            expect(config.app.logLevel).toBe('ERROR');
            expect(config.openai.temperature).toBe(0.3);
        });
    });

    describe('logger configuration updates', () => {
        it('should update logger configuration when config is loaded', () => {
            process.env.LOG_LEVEL = 'ERROR';
            process.env.LOG_FORMAT = 'json';
            process.env.INSPECTOR_LOG_FILE = '/tmp/test.log';

            const manager = ConfigManager.getInstance();
            manager.getConfig();

            expect(mockUpdateLoggerConfig).toHaveBeenCalledWith({
                level: LogLevel.ERROR,
                file: '/tmp/test.log',
                format: 'json'
            });
        });
    });

    describe('reloadConfig', () => {
        it('should reload configuration and update logger', () => {
            // Initial config
            process.env.LOG_LEVEL = 'INFO';
            const manager = ConfigManager.getInstance();
            let config = manager.getConfig();
            expect(config.app.logLevel).toBe('INFO');

            // Change environment and reload
            process.env.LOG_LEVEL = 'ERROR';
            manager.reloadConfig();
            config = manager.getConfig();
            expect(config.app.logLevel).toBe('ERROR');

            // Should have been called twice - once for initial load, once for reload
            expect(mockUpdateLoggerConfig).toHaveBeenCalledTimes(2);
        });
    });

    describe('convenience functions', () => {
        it('should provide getConfig convenience function', () => {
            process.env.OPENAI_MODEL = 'test-model';
            
            const config = getConfig();
            expect(config.openai.model).toBe('test-model');
        });

        it('should provide reloadConfig convenience function', () => {
            process.env.LOG_LEVEL = 'INFO';
            let config = getConfig();
            expect(config.app.logLevel).toBe('INFO');

            process.env.LOG_LEVEL = 'DEBUG';
            reloadConfig();
            config = getConfig();
            expect(config.app.logLevel).toBe('DEBUG');
        });
    });

    describe('log level mapping', () => {
        it('should default to DEBUG in development environment', () => {
            process.env.NODE_ENV = 'development';
            
            const manager = ConfigManager.getInstance();
            const config = manager.getConfig();
            
            expect(config.app.logLevel).toBe('DEBUG');
        });

        it('should default to INFO in production environment', () => {
            process.env.NODE_ENV = 'production';
            
            const manager = ConfigManager.getInstance();
            const config = manager.getConfig();
            
            expect(config.app.logLevel).toBe('INFO');
        });

        it('should respect explicit LOG_LEVEL over NODE_ENV defaults', () => {
            process.env.NODE_ENV = 'development';
            process.env.LOG_LEVEL = 'SILENT';
            
            const manager = ConfigManager.getInstance();
            const config = manager.getConfig();
            
            expect(config.app.logLevel).toBe('SILENT');
        });
    });
});