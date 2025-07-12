import { vi } from 'vitest';
import { ScreenshotService } from '../service.js';
import { ScreenshotValidationError } from '../types';
import { setupScreenshotTests, setupVitestExtensions, createMockPage, createMockBrowserManager } from '@test-utils';

// Setup custom matchers
setupVitestExtensions();

// Mock logger
vi.mock('../../logger.js', () => ({
    createModuleLogger: vi.fn(() => ({
        //debug: console.debug, // <-- This will call console.debug when invoked
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        screenshot: vi.fn(),
        performance: vi.fn(),
        apiCall: vi.fn(),
        apiResponse: vi.fn()
    }))
}));

vi.mock('../../browser/index.js', () => ({
    BrowserManager: vi.fn(() => createMockBrowserManager()),
    createCaptureConfig: vi.fn(() => ({})),
    BrowserNetworkError: class BrowserNetworkError extends Error {
        constructor(message: string) { super(message); }
    },
    BrowserTimeoutError: class BrowserTimeoutError extends Error {
        constructor(message: string) { super(message); }
    }
}));

// Mock URL module to provide UrlValidationError
vi.mock('../../url/index.js', () => ({
    validateUrl: vi.fn((url: string) => {
        // Realistic validation: reject empty, invalid protocol, etc.
        if (!url || url.trim() === '') {
            throw new Error('URL is required');
        }
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            throw new Error('URL must use http or https protocol');
        }
        return true;
    }),
    normalizeUrl: vi.fn((url: string) => url),
    UrlValidationError: class UrlValidationError extends Error {
        constructor(message: string) { super(message); }
    },
    createValidationContext: vi.fn(() => ({ type: 'test' }))
}));

// Set a valid log level for tests to prevent logger/config errors
beforeAll(() => {
    process.env.LOG_LEVEL = 'ERROR';
});

describe('ScreenshotService', () => {
    setupScreenshotTests();
    
    let service: ScreenshotService;

    beforeEach(() => {
        service = new ScreenshotService();
        vi.spyOn(console, 'error').mockImplementation(() => {}); // suppress error logs
        
        // Reset mocks
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create a new ScreenshotService instance', () => {
            expect(service).toBeInstanceOf(ScreenshotService);
        });

        it('should have all required methods', () => {
            expect(typeof service.captureScreenshot).toBe('function');
            expect(typeof service.validateOptions).toBe('function');
            expect(typeof service.cleanup).toBe('function');
        });
    });

    describe('method existence', () => {
        it('should have captureScreenshot method', () => {
            expect(service.captureScreenshot).toBeDefined();
            expect(typeof service.captureScreenshot).toBe('function');
        });

        it('should have validateOptions method', () => {
            expect(service.validateOptions).toBeDefined();
            expect(typeof service.validateOptions).toBe('function');
        });

        it('should have cleanup method', () => {
            expect(service.cleanup).toBeDefined();
            expect(typeof service.cleanup).toBe('function');
        });
    });
});

describe('ScreenshotService - Input Validation', () => {
    let service: ScreenshotService;
  
    beforeEach(() => {
      service = new ScreenshotService();
      vi.spyOn(console, 'error').mockImplementation(() => {}); // suppress error logs
    });
  
    it('throws ScreenshotValidationError for missing URL', async () => {
      await expect(service.captureScreenshot({
        url: '',
        path: './out.png',
        width: 1024
      })).rejects.toThrow(ScreenshotValidationError);
    });
  
    it('throws ScreenshotValidationError for invalid URL protocol', async () => {
      await expect(service.captureScreenshot({
        url: 'ftp://example.com',
        path: './out.png',
        width: 1024
      })).rejects.toThrow(ScreenshotValidationError);
    });
  
    it('throws ScreenshotValidationError for missing path', async () => {
      await expect(service.captureScreenshot({
        url: 'https://example.com',
        path: '',
        width: 1024
      })).rejects.toThrow(ScreenshotValidationError);
    });
  
    it('throws ScreenshotValidationError for invalid path extension', async () => {
      await expect(service.captureScreenshot({
        url: 'https://example.com',
        path: './out.txt',
        width: 1024
      })).rejects.toThrow(ScreenshotValidationError);
    });
  
    it('throws ScreenshotValidationError for width below minimum', async () => {
      await expect(service.captureScreenshot({
        url: 'https://example.com',
        path: './out.png',
        width: 100
      })).rejects.toThrow(ScreenshotValidationError);
    });
  
    it('throws ScreenshotValidationError for width above maximum', async () => {
      await expect(service.captureScreenshot({
        url: 'https://example.com',
        path: './out.png',
        width: 4000
      })).rejects.toThrow(ScreenshotValidationError);
    });
  
    it('throws ScreenshotValidationError for timeout below minimum', async () => {
      await expect(service.captureScreenshot({
        url: 'https://example.com',
        path: './out.png',
        width: 1024,
        timeout: 500
      })).rejects.toThrow(ScreenshotValidationError);
    });
  
    it('throws ScreenshotValidationError for timeout above maximum', async () => {
      await expect(service.captureScreenshot({
        url: 'https://example.com',
        path: './out.png',
        width: 1024,
        timeout: 500000
      })).rejects.toThrow(ScreenshotValidationError);
    });
  });

describe('ScreenshotService - Successful Screenshot', () => {
    let service: ScreenshotService;

    beforeEach(async () => {
        vi.resetModules();
        
        // Re-mock URL module after resetModules
        vi.doMock('../../url/index.js', () => ({
            validateUrl: vi.fn((url: string) => {
                if (!url || url.trim() === '') {
                    throw new Error('URL is required');
                }
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    throw new Error('URL must use http or https protocol');
                }
                return true;
            }),
            normalizeUrl: vi.fn((url: string) => url),
            UrlValidationError: class UrlValidationError extends Error {
                constructor(message: string) { super(message); }
            },
            createValidationContext: vi.fn(() => ({ type: 'test' }))
        }));
        
        vi.doMock('../../config.js', () => ({
            getConfig: vi.fn(() => ({
                puppeteer: {
                    headless: true,
                    timeout: 30000,
                    viewport: { width: 1024, height: 768 },
                    userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
                    blockAds: true,
                    blockImages: false,
                    maxConcurrency: 2
                },
                app: {
                    logLevel: 'ERROR',
                    logFile: '',
                    logFormat: 'plain'
                }
            })),
            LogLevel: {
                DEBUG: 0,
                INFO: 1,
                WARN: 2,
                ERROR: 3,
                SILENT: 4
            }
        }));

        // Use dynamic import to avoid require() and satisfy eslint
        const mod = await import('../service.js');
        service = new mod.ScreenshotService();

        vi.spyOn(console, 'error').mockImplementation(() => {}); // suppress error logs
    });

    it('returns ScreenshotResult for valid input', async () => {
        // Mock Puppeteer before importing ScreenshotService
        vi.resetModules();
        
        // Re-mock URL module after resetModules
        vi.doMock('../../url/index.js', () => ({
            validateUrl: vi.fn((url: string) => {
                if (!url || url.trim() === '') {
                    throw new Error('URL is required');
                }
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    throw new Error('URL must use http or https protocol');
                }
                return true;
            }),
            normalizeUrl: vi.fn((url: string) => url),
            UrlValidationError: class UrlValidationError extends Error {
                constructor(message: string) { super(message); }
            },
            createValidationContext: vi.fn(() => ({ type: 'test' }))
        }));
        
        vi.doMock('puppeteer', () => ({
            launch: vi.fn().mockResolvedValue({
                // Add a mock 'on' method to the browser mock to satisfy browser.on usage
                on: vi.fn(),
                newPage: vi.fn().mockResolvedValue({
                    setViewport: vi.fn(),
                    setUserAgent: vi.fn(),
                    goto: vi.fn().mockResolvedValue({}),
                    screenshot: vi.fn().mockResolvedValue(Buffer.from('mock-image')),
                    evaluate: vi.fn().mockResolvedValue([1024, 768]),
                    close: vi.fn(),
                    setDefaultTimeout: vi.fn(),
                    setExtraHTTPHeaders: vi.fn()
                }),
                close: vi.fn()
            })
        }));

        // Re-import ScreenshotService after mocking puppeteer
        const mod = await import('../service.js');
        service = new mod.ScreenshotService();

        vi.spyOn(console, 'error').mockImplementation(() => {}); // suppress error logs

        const result = await service.captureScreenshot({
            url: 'https://example.com',
            path: './out.png',
            width: 1024
        });

        expect(result).toHaveProperty('url', 'https://example.com');
        expect(result).toHaveProperty('path', './out.png');
        expect(result).toHaveProperty('width', 1024);
        expect(result).toHaveProperty('sizes');
        expect(Array.isArray(result.sizes)).toBe(true);
        expect(result.sizes.length).toBe(2);
        expect(typeof result.sizes[0]).toBe('number');
        expect(typeof result.sizes[1]).toBe('number');
        expect(result).toHaveProperty('duration');
        expect(typeof result.duration).toBe('number');
        expect(result).toHaveProperty('screenshotTime');
        expect(typeof result.screenshotTime).toBe('number');
    });
});

describe('ScreenshotService - Error Handling', () => {
    let service: ScreenshotService;

    beforeEach(async () => {
        vi.resetModules();
        
        // Re-mock URL module after resetModules
        vi.doMock('../../url/index.js', () => ({
            validateUrl: vi.fn((url: string) => {
                if (!url || url.trim() === '') {
                    throw new Error('URL is required');
                }
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    throw new Error('URL must use http or https protocol');
                }
                return true;
            }),
            normalizeUrl: vi.fn((url: string) => url),
            UrlValidationError: class UrlValidationError extends Error {
                constructor(message: string) { super(message); }
            },
            createValidationContext: vi.fn(() => ({ type: 'test' }))
        }));
        
        vi.doMock('../../config.js', () => ({
            getConfig: vi.fn(() => ({
                puppeteer: {
                    headless: true,
                    timeout: 30000,
                    viewport: { width: 1024, height: 768 },
                    userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
                    blockAds: true,
                    blockImages: false,
                    maxConcurrency: 2
                },
                app: {
                    logLevel: 'ERROR',
                    logFile: '',
                    logFormat: 'plain'
                }
            })),
            LogLevel: {
                DEBUG: 0,
                INFO: 1,
                WARN: 2,
                ERROR: 3,
                SILENT: 4
            }
        }));

        // Use dynamic import to avoid require() and satisfy eslint
        const mod = await import('../service.js');
        service = new mod.ScreenshotService();

        vi.spyOn(console, 'error').mockImplementation(() => {}); // suppress error logs
    });

    it('throws ScreenshotNetworkError for browser launch failure', async () => {
        vi.resetModules();
        
        // Mock browser manager to fail during page creation
        vi.doMock('../../browser/index.js', () => ({
            BrowserManager: vi.fn(() => ({
                createPage: vi.fn().mockRejectedValue(new Error('Browser failed to launch')),
                cleanup: vi.fn()
            })),
            createCaptureConfig: vi.fn(() => ({})),
            BrowserNetworkError: class BrowserNetworkError extends Error {
                constructor(message: string) { super(message); }
            },
            BrowserTimeoutError: class BrowserTimeoutError extends Error {
                constructor(message: string) { super(message); }
            }
        }));
        
        const mod = await import('../service.js');
        service = new mod.ScreenshotService();

        await expect(service.captureScreenshot({
            url: 'https://example.com',
            path: './out.png',
            width: 1024
        })).rejects.toThrow(/Browser failed to launch/);
    });

    it('throws ScreenshotNetworkError for navigation timeout', async () => {
        vi.resetModules();
        
        // Create the error classes first  
        class BrowserTimeoutError extends Error {
            constructor(message: string) { super(message); }
        }
        
        const timeoutError = new BrowserTimeoutError('Navigation timeout of 30000 ms exceeded');
        
        // Mock browser manager to throw BrowserTimeoutError during page creation
        vi.doMock('../../browser/index.js', () => ({
            BrowserManager: vi.fn(() => ({
                createPage: vi.fn().mockRejectedValue(timeoutError),
                cleanup: vi.fn()
            })),
            createCaptureConfig: vi.fn(() => ({})),
            BrowserNetworkError: class BrowserNetworkError extends Error {
                constructor(message: string) { super(message); }
            },
            BrowserTimeoutError: BrowserTimeoutError
        }));
        
        const mod = await import('../service.js');
        service = new mod.ScreenshotService();

        await expect(service.captureScreenshot({
            url: 'https://example.com',
            path: './out.png',
            width: 1024
        })).rejects.toThrow(/Timeout during screenshot/);
    });

    it('throws ScreenshotNetworkError for network error during navigation', async () => {
        vi.resetModules();
        
        // Create the error classes first
        class BrowserNetworkError extends Error {
            constructor(message: string) { super(message); }
        }
        
        const networkError = new BrowserNetworkError('Connection refused: https://example.com');
        
        // Mock browser manager to throw BrowserNetworkError during page creation
        vi.doMock('../../browser/index.js', () => ({
            BrowserManager: vi.fn(() => ({
                createPage: vi.fn().mockRejectedValue(networkError),
                cleanup: vi.fn()
            })),
            createCaptureConfig: vi.fn(() => ({})),
            BrowserNetworkError: BrowserNetworkError,
            BrowserTimeoutError: class BrowserTimeoutError extends Error {
                constructor(message: string) { super(message); }
            }
        }));
        
        const mod = await import('../service.js');
        service = new mod.ScreenshotService();

        // The error message is "Network error during screenshot: Connection refused: https://example.com"
        await expect(service.captureScreenshot({
            url: 'https://example.com',
            path: './out.png',
            width: 1024
        })).rejects.toThrow(/Network error during screenshot/);
    });
});

describe('ScreenshotService - Resource Cleanup', () => {
    let service: ScreenshotService;

    beforeEach(async () => {
        vi.resetModules();
        
        // Re-mock URL module after resetModules
        vi.doMock('../../url/index.js', () => ({
            validateUrl: vi.fn((url: string) => {
                if (!url || url.trim() === '') {
                    throw new Error('URL is required');
                }
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    throw new Error('URL must use http or https protocol');
                }
                return true;
            }),
            normalizeUrl: vi.fn((url: string) => url),
            UrlValidationError: class UrlValidationError extends Error {
                constructor(message: string) { super(message); }
            },
            createValidationContext: vi.fn(() => ({ type: 'test' }))
        }));
        
        vi.doMock('../../config.js', () => ({
            getConfig: vi.fn(() => ({
                puppeteer: {
                    headless: true,
                    timeout: 30000,
                    viewport: { width: 1024, height: 768 },
                    userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
                    blockAds: true,
                    blockImages: false,
                    maxConcurrency: 2
                },
                app: {
                    logLevel: 'ERROR',
                    logFile: '',
                    logFormat: 'plain'
                }
            })),
            LogLevel: {
                DEBUG: 0,
                INFO: 1,
                WARN: 2,
                ERROR: 3,
                SILENT: 4
            }
        }));
        const mod = await import('../service.js');
        service = new mod.ScreenshotService();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('closes browser and page on success', async () => {
        const cleanupMock = vi.fn();

        vi.resetModules();
        
        // Mock browser manager to succeed and track cleanup calls
        vi.doMock('../../browser/index.js', () => ({
            BrowserManager: vi.fn(() => ({
                createPage: vi.fn().mockResolvedValue({}),
                captureScreenshot: vi.fn().mockResolvedValue([1024, 768]),
                cleanup: cleanupMock
            })),
            createCaptureConfig: vi.fn(() => ({})),
            BrowserNetworkError: class BrowserNetworkError extends Error {
                constructor(message: string) { super(message); }
            },
            BrowserTimeoutError: class BrowserTimeoutError extends Error {
                constructor(message: string) { super(message); }
            }
        }));

        const mod = await import('../service.js');
        service = new mod.ScreenshotService();

        await service.captureScreenshot({
            url: 'https://example.com',
            path: './out.png',
            width: 1024
        });

        expect(cleanupMock).toHaveBeenCalled();
    });

    it('closes browser and page on failure', async () => {
        const cleanupMock = vi.fn();

        vi.resetModules();
        
        // Mock browser manager to fail during page creation but still track cleanup
        vi.doMock('../../browser/index.js', () => ({
            BrowserManager: vi.fn(() => ({
                createPage: vi.fn().mockRejectedValue(new Error('Navigation failed')),
                cleanup: cleanupMock
            })),
            createCaptureConfig: vi.fn(() => ({})),
            BrowserNetworkError: class BrowserNetworkError extends Error {
                constructor(message: string) { super(message); }
            },
            BrowserTimeoutError: class BrowserTimeoutError extends Error {
                constructor(message: string) { super(message); }
            }
        }));

        const mod = await import('../service.js');
        service = new mod.ScreenshotService();

        await expect(service.captureScreenshot({
            url: 'https://example.com',
            path: './out.png',
            width: 1024
        })).rejects.toThrow();

        expect(cleanupMock).toHaveBeenCalled();
    });
});
