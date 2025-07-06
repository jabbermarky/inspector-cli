import { ScreenshotService } from '../service.js';
import { ScreenshotValidationError } from '../types';

// Mock logger
jest.mock('../../logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        //debug: console.debug, // <-- This will call console.debug when invoked
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        screenshot: jest.fn(),
        performance: jest.fn(),
        apiCall: jest.fn(),
        apiResponse: jest.fn()
    }))
}));

// Mock browser manager
const mockPage = {
    goto: jest.fn(),
    setUserAgent: jest.fn(),
    setDefaultTimeout: jest.fn(),
    setDefaultNavigationTimeout: jest.fn(),
    setRequestInterception: jest.fn(),
    on: jest.fn(),
    screenshot: jest.fn(),
    evaluate: jest.fn(),
    close: jest.fn(),
    waitForTimeout: jest.fn(),
    _browserManagerContext: undefined
};

const mockBrowserManager = {
    createPage: jest.fn(() => Promise.resolve(mockPage)),
    captureScreenshot: jest.fn(() => Promise.resolve([1024, 768])),
    cleanup: jest.fn()
};

jest.mock('../../browser/index.js', () => ({
    BrowserManager: jest.fn(() => mockBrowserManager),
    createCaptureConfig: jest.fn(() => ({})),
    BrowserNetworkError: class BrowserNetworkError extends Error {
        constructor(message: string) { super(message); }
    },
    BrowserTimeoutError: class BrowserTimeoutError extends Error {
        constructor(message: string) { super(message); }
    }
}));

// Set a valid log level for tests to prevent logger/config errors
beforeAll(() => {
    process.env.LOG_LEVEL = 'ERROR';
});

describe('ScreenshotService', () => {
    let service: ScreenshotService;

    beforeEach(() => {
        service = new ScreenshotService();
        jest.spyOn(console, 'error').mockImplementation(() => {}); // suppress error logs
        
        // Reset mocks
        jest.clearAllMocks();
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
      jest.spyOn(console, 'error').mockImplementation(() => {}); // suppress error logs
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
        jest.resetModules();
        jest.doMock('../../config.js', () => ({
            getConfig: jest.fn(() => ({
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

        jest.spyOn(console, 'error').mockImplementation(() => {}); // suppress error logs
    });

    it('returns ScreenshotResult for valid input', async () => {
        // Mock Puppeteer before importing ScreenshotService
        jest.resetModules();
        jest.doMock('puppeteer', () => ({
            launch: jest.fn().mockResolvedValue({
                // Add a mock 'on' method to the browser mock to satisfy browser.on usage
                on: jest.fn(),
                newPage: jest.fn().mockResolvedValue({
                    setViewport: jest.fn(),
                    setUserAgent: jest.fn(),
                    goto: jest.fn().mockResolvedValue({}),
                    screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-image')),
                    evaluate: jest.fn().mockResolvedValue([1024, 768]),
                    close: jest.fn(),
                    setDefaultTimeout: jest.fn(),
                    setExtraHTTPHeaders: jest.fn()
                }),
                close: jest.fn()
            })
        }));

        // Re-import ScreenshotService after mocking puppeteer
        const mod = await import('../service.js');
        service = new mod.ScreenshotService();

        jest.spyOn(console, 'error').mockImplementation(() => {}); // suppress error logs

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
        jest.resetModules();
        jest.doMock('../../config.js', () => ({
            getConfig: jest.fn(() => ({
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

        jest.spyOn(console, 'error').mockImplementation(() => {}); // suppress error logs
    });

    it('throws ScreenshotNetworkError for browser launch failure', async () => {
        jest.resetModules();
        
        // Mock browser manager to fail during page creation
        jest.doMock('../../browser/index.js', () => ({
            BrowserManager: jest.fn(() => ({
                createPage: jest.fn().mockRejectedValue(new Error('Browser failed to launch')),
                cleanup: jest.fn()
            })),
            createCaptureConfig: jest.fn(() => ({})),
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
        jest.resetModules();
        
        // Create the error classes first  
        class BrowserTimeoutError extends Error {
            constructor(message: string) { super(message); }
        }
        
        const timeoutError = new BrowserTimeoutError('Navigation timeout of 30000 ms exceeded');
        
        // Mock browser manager to throw BrowserTimeoutError during page creation
        jest.doMock('../../browser/index.js', () => ({
            BrowserManager: jest.fn(() => ({
                createPage: jest.fn().mockRejectedValue(timeoutError),
                cleanup: jest.fn()
            })),
            createCaptureConfig: jest.fn(() => ({})),
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
        jest.resetModules();
        
        // Create the error classes first
        class BrowserNetworkError extends Error {
            constructor(message: string) { super(message); }
        }
        
        const networkError = new BrowserNetworkError('Connection refused: https://example.com');
        
        // Mock browser manager to throw BrowserNetworkError during page creation
        jest.doMock('../../browser/index.js', () => ({
            BrowserManager: jest.fn(() => ({
                createPage: jest.fn().mockRejectedValue(networkError),
                cleanup: jest.fn()
            })),
            createCaptureConfig: jest.fn(() => ({})),
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
        jest.resetModules();
        jest.doMock('../../config.js', () => ({
            getConfig: jest.fn(() => ({
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
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('closes browser and page on success', async () => {
        const cleanupMock = jest.fn();

        jest.resetModules();
        
        // Mock browser manager to succeed and track cleanup calls
        jest.doMock('../../browser/index.js', () => ({
            BrowserManager: jest.fn(() => ({
                createPage: jest.fn().mockResolvedValue({}),
                captureScreenshot: jest.fn().mockResolvedValue([1024, 768]),
                cleanup: cleanupMock
            })),
            createCaptureConfig: jest.fn(() => ({})),
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
        const cleanupMock = jest.fn();

        jest.resetModules();
        
        // Mock browser manager to fail during page creation but still track cleanup
        jest.doMock('../../browser/index.js', () => ({
            BrowserManager: jest.fn(() => ({
                createPage: jest.fn().mockRejectedValue(new Error('Navigation failed')),
                cleanup: cleanupMock
            })),
            createCaptureConfig: jest.fn(() => ({})),
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
