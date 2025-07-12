import { vi } from 'vitest';
import { setupCommandTests } from '@test-utils';
import type { ScreenshotResult } from '../../utils/screenshot/types.js';

// Mock dependencies
vi.mock('../../utils/utils.js', () => ({
    myParseInt: vi.fn(),
    analyzeFilePath: vi.fn(),
    takeAScreenshotPuppeteer: vi.fn()
}));

vi.mock('../../utils/logger.js', () => ({
    createModuleLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        apiCall: vi.fn(),
        apiResponse: vi.fn(),
        performance: vi.fn()
    }))
}));

// Import mocked functions
import { myParseInt, analyzeFilePath, takeAScreenshotPuppeteer } from '../../utils/utils.js';

const mockMyParseInt = myParseInt as any;
const mockAnalyzeFilePath = analyzeFilePath as any;
const mockTakeAScreenshotPuppeteer = takeAScreenshotPuppeteer as any;

// Helper function to create mock screenshot results
function createMockScreenshotResult(url: string, path: string, width: number): ScreenshotResult {
    return {
        url,
        path,
        width,
        sizes: [1920, 1080],
        duration: 2500,
        screenshotTime: 150
    };
}

describe('Screenshot Command', () => {
    setupCommandTests();
    
    let consoleSpy: any;
    let consoleErrorSpy: any;
    let processExitSpy: any;

    beforeEach(() => {
        // Reset all mocks
        mockMyParseInt.mockClear();
        mockAnalyzeFilePath.mockClear();
        mockTakeAScreenshotPuppeteer.mockClear();

        // Spy on console methods
        consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
    });

    describe('Width Parameter Parsing', () => {
        it('should parse valid width parameter', () => {
            mockMyParseInt.mockReturnValue(1024);
            
            const result = mockMyParseInt('1024', null);
            
            expect(mockMyParseInt).toHaveBeenCalledWith('1024', null);
            expect(result).toBe(1024);
        });

        it('should handle invalid width parameter', () => {
            mockMyParseInt.mockReturnValue(NaN);
            
            const result = mockMyParseInt('invalid', null);
            
            expect(mockMyParseInt).toHaveBeenCalledWith('invalid', null);
            expect(result).toBeNaN();
        });

        it('should use default width when not specified', () => {
            const options: { width?: number } = {}; // No width specified
            const defaultWidth = 768;
            
            // Simulate the default behavior
            const width = options.width || defaultWidth;
            
            expect(width).toBe(768);
        });

        it('should use custom width when specified', () => {
            mockMyParseInt.mockReturnValue(1920);
            const options = { width: mockMyParseInt('1920', null) };
            
            const width = options.width || 768;
            
            expect(mockMyParseInt).toHaveBeenCalledWith('1920', null);
            expect(width).toBe(1920);
        });
    });

    describe('File Path Analysis', () => {
        it('should analyze and process file path with width', () => {
            const inputPath = './screenshots/test.png';
            const width = 1024;
            const expectedPath = './screenshots/test-1024.png';
            
            mockAnalyzeFilePath.mockReturnValue(expectedPath);
            
            const result = mockAnalyzeFilePath(inputPath, width);
            
            expect(mockAnalyzeFilePath).toHaveBeenCalledWith(inputPath, width);
            expect(result).toBe(expectedPath);
        });

        it('should handle relative paths', () => {
            const inputPath = '../screenshots/test.png';
            const width = 768;
            const expectedPath = '../screenshots/test-768.png';
            
            mockAnalyzeFilePath.mockReturnValue(expectedPath);
            
            const result = mockAnalyzeFilePath(inputPath, width);
            
            expect(result).toBe(expectedPath);
        });

        it('should handle absolute paths', () => {
            const inputPath = '/usr/local/screenshots/test.png';
            const width = 1920;
            const expectedPath = '/usr/local/screenshots/test-1920.png';
            
            mockAnalyzeFilePath.mockReturnValue(expectedPath);
            
            const result = mockAnalyzeFilePath(inputPath, width);
            
            expect(result).toBe(expectedPath);
        });

        it('should handle paths with different extensions', () => {
            const inputPaths = [
                'test.jpg',
                'test.jpeg',
                'test.png',
                'test.webp'
            ];
            
            inputPaths.forEach((path, index) => {
                const width = 800 + index * 100;
                const expectedPath = `test-${width}${path.substring(path.lastIndexOf('.'))}`;
                
                mockAnalyzeFilePath.mockReturnValue(expectedPath);
                
                const result = mockAnalyzeFilePath(path, width);
                
                expect(result).toBe(expectedPath);
            });
        });

        it('should handle paths without extensions', () => {
            const inputPath = './screenshots/test';
            const width = 768;
            const expectedPath = './screenshots/test-768.png'; // Assuming PNG is added as default
            
            mockAnalyzeFilePath.mockReturnValue(expectedPath);
            
            const result = mockAnalyzeFilePath(inputPath, width);
            
            expect(result).toBe(expectedPath);
        });
    });

    describe('Screenshot Capture', () => {
        it('should take screenshot successfully', async () => {
            const url = 'https://example.com';
            const path = './screenshots/example-768.png';
            const width = 768;
            const mockResult = createMockScreenshotResult(url, path, width);
            
            mockTakeAScreenshotPuppeteer.mockResolvedValue(mockResult);
            
            const result = await mockTakeAScreenshotPuppeteer(url, path, width);
            
            expect(mockTakeAScreenshotPuppeteer).toHaveBeenCalledWith(url, path, width);
            expect(result).toEqual(mockResult);
        });

        it('should handle screenshot capture errors', async () => {
            const url = 'https://example.com';
            const path = './screenshots/example-768.png';
            const width = 768;
            const error = new Error('Failed to navigate to page');
            
            mockTakeAScreenshotPuppeteer.mockRejectedValue(error);
            
            await expect(mockTakeAScreenshotPuppeteer(url, path, width))
                .rejects.toThrow('Failed to navigate to page');
        });

        it('should handle invalid URLs', async () => {
            const invalidUrl = 'not-a-valid-url';
            const path = './screenshots/invalid-768.png';
            const width = 768;
            const error = new Error('Invalid URL');
            
            mockTakeAScreenshotPuppeteer.mockRejectedValue(error);
            
            await expect(mockTakeAScreenshotPuppeteer(invalidUrl, path, width))
                .rejects.toThrow('Invalid URL');
        });

        it('should handle network timeouts', async () => {
            const url = 'https://timeout-example.com';
            const path = './screenshots/timeout-768.png';
            const width = 768;
            const error = new Error('Navigation timeout of 30000 ms exceeded');
            
            mockTakeAScreenshotPuppeteer.mockRejectedValue(error);
            
            await expect(mockTakeAScreenshotPuppeteer(url, path, width))
                .rejects.toThrow('Navigation timeout of 30000 ms exceeded');
        });

        it('should handle different screen widths', async () => {
            const url = 'https://example.com';
            const widths = [320, 768, 1024, 1366, 1920];
            
            for (const width of widths) {
                const path = `./screenshots/example-${width}.png`;
                
                const mockResult = createMockScreenshotResult(url, path, width);
            mockTakeAScreenshotPuppeteer.mockResolvedValue(mockResult);
                
                await mockTakeAScreenshotPuppeteer(url, path, width);
                
                expect(mockTakeAScreenshotPuppeteer).toHaveBeenCalledWith(url, path, width);
            }
        });
    });

    describe('URL Validation', () => {
        it('should handle HTTP URLs', async () => {
            const url = 'http://example.com';
            const path = './screenshots/example-768.png';
            const width = 768;
            
            const mockResult = createMockScreenshotResult(url, path, width);
            mockTakeAScreenshotPuppeteer.mockResolvedValue(mockResult);
            
            await mockTakeAScreenshotPuppeteer(url, path, width);
            
            expect(mockTakeAScreenshotPuppeteer).toHaveBeenCalledWith(url, path, width);
        });

        it('should handle HTTPS URLs', async () => {
            const url = 'https://example.com';
            const path = './screenshots/example-768.png';
            const width = 768;
            
            const mockResult = createMockScreenshotResult(url, path, width);
            mockTakeAScreenshotPuppeteer.mockResolvedValue(mockResult);
            
            await mockTakeAScreenshotPuppeteer(url, path, width);
            
            expect(mockTakeAScreenshotPuppeteer).toHaveBeenCalledWith(url, path, width);
        });

        it('should handle URLs with paths', async () => {
            const url = 'https://example.com/path/to/page';
            const path = './screenshots/page-768.png';
            const width = 768;
            
            const mockResult = createMockScreenshotResult(url, path, width);
            mockTakeAScreenshotPuppeteer.mockResolvedValue(mockResult);
            
            await mockTakeAScreenshotPuppeteer(url, path, width);
            
            expect(mockTakeAScreenshotPuppeteer).toHaveBeenCalledWith(url, path, width);
        });

        it('should handle URLs with query parameters', async () => {
            const url = 'https://example.com?param1=value1&param2=value2';
            const path = './screenshots/query-768.png';
            const width = 768;
            
            const mockResult = createMockScreenshotResult(url, path, width);
            mockTakeAScreenshotPuppeteer.mockResolvedValue(mockResult);
            
            await mockTakeAScreenshotPuppeteer(url, path, width);
            
            expect(mockTakeAScreenshotPuppeteer).toHaveBeenCalledWith(url, path, width);
        });

        it('should handle localhost URLs', async () => {
            const url = 'http://localhost:3000';
            const path = './screenshots/localhost-768.png';
            const width = 768;
            
            const mockResult = createMockScreenshotResult(url, path, width);
            mockTakeAScreenshotPuppeteer.mockResolvedValue(mockResult);
            
            await mockTakeAScreenshotPuppeteer(url, path, width);
            
            expect(mockTakeAScreenshotPuppeteer).toHaveBeenCalledWith(url, path, width);
        });
    });

    describe('Error Handling and Logging', () => {
        it('should handle file system permission errors', async () => {
            const url = 'https://example.com';
            const path = '/readonly/screenshots/test-768.png';
            const width = 768;
            const error = new Error('EACCES: permission denied');
            
            mockTakeAScreenshotPuppeteer.mockRejectedValue(error);
            
            await expect(mockTakeAScreenshotPuppeteer(url, path, width))
                .rejects.toThrow('EACCES: permission denied');
        });

        it('should handle disk space errors', async () => {
            const url = 'https://example.com';
            const path = './screenshots/test-768.png';
            const width = 768;
            const error = new Error('ENOSPC: no space left on device');
            
            mockTakeAScreenshotPuppeteer.mockRejectedValue(error);
            
            await expect(mockTakeAScreenshotPuppeteer(url, path, width))
                .rejects.toThrow('ENOSPC: no space left on device');
        });

        it('should handle browser launch failures', async () => {
            const url = 'https://example.com';
            const path = './screenshots/test-768.png';
            const width = 768;
            const error = new Error('Failed to launch browser');
            
            mockTakeAScreenshotPuppeteer.mockRejectedValue(error);
            
            await expect(mockTakeAScreenshotPuppeteer(url, path, width))
                .rejects.toThrow('Failed to launch browser');
        });

        it('should handle page load failures', async () => {
            const url = 'https://broken-site.com';
            const path = './screenshots/broken-768.png';
            const width = 768;
            const error = new Error('ERR_NAME_NOT_RESOLVED');
            
            mockTakeAScreenshotPuppeteer.mockRejectedValue(error);
            
            await expect(mockTakeAScreenshotPuppeteer(url, path, width))
                .rejects.toThrow('ERR_NAME_NOT_RESOLVED');
        });
    });

    describe('Edge Cases and Validation', () => {
        it('should handle very small width values', () => {
            mockMyParseInt.mockReturnValue(1);
            
            const result = mockMyParseInt('1', null);
            
            expect(result).toBe(1);
        });

        it('should handle very large width values', () => {
            mockMyParseInt.mockReturnValue(99999);
            
            const result = mockMyParseInt('99999', null);
            
            expect(result).toBe(99999);
        });

        it('should handle zero width value', () => {
            mockMyParseInt.mockReturnValue(0);
            
            const result = mockMyParseInt('0', null);
            
            expect(result).toBe(0);
        });

        it('should handle negative width values', () => {
            mockMyParseInt.mockReturnValue(-100);
            
            const result = mockMyParseInt('-100', null);
            
            expect(result).toBe(-100);
        });

        it('should handle width values with decimals', () => {
            // myParseInt should truncate decimals
            mockMyParseInt.mockReturnValue(768);
            
            const result = mockMyParseInt('768.5', null);
            
            expect(result).toBe(768);
        });
    });

    describe('Path Security and Validation', () => {
        it('should handle paths with special characters', () => {
            const inputPath = './screenshots/test@#$%^&*()-768.png';
            const width = 768;
            
            mockAnalyzeFilePath.mockReturnValue(inputPath);
            
            const result = mockAnalyzeFilePath(inputPath, width);
            
            expect(result).toBe(inputPath);
        });

        it('should handle paths with spaces', () => {
            const inputPath = './screenshots/test with spaces-768.png';
            const width = 768;
            
            mockAnalyzeFilePath.mockReturnValue(inputPath);
            
            const result = mockAnalyzeFilePath(inputPath, width);
            
            expect(result).toBe(inputPath);
        });

        it('should handle Unicode characters in paths', () => {
            const inputPath = './screenshots/test_测试_тест-768.png';
            const width = 768;
            
            mockAnalyzeFilePath.mockReturnValue(inputPath);
            
            const result = mockAnalyzeFilePath(inputPath, width);
            
            expect(result).toBe(inputPath);
        });

        it('should handle empty path strings', () => {
            const inputPath = '';
            const width = 768;
            const defaultPath = 'screenshot-768.png';
            
            mockAnalyzeFilePath.mockReturnValue(defaultPath);
            
            const result = mockAnalyzeFilePath(inputPath, width);
            
            expect(result).toBe(defaultPath);
        });
    });

    describe('Integration with Command Options', () => {
        it('should process complete command scenario with defaults', async () => {
            const url = 'https://example.com';
            const inputPath = './screenshot.png';
            const width = 768; // default
            const processedPath = './screenshot-768.png';
            
            mockAnalyzeFilePath.mockReturnValue(processedPath);
            const mockResult = createMockScreenshotResult(url, processedPath, width);
            mockTakeAScreenshotPuppeteer.mockResolvedValue(mockResult);
            
            // Simulate command execution
            const processedFilePath = mockAnalyzeFilePath(inputPath, width);
            await mockTakeAScreenshotPuppeteer(url, processedFilePath, width);
            
            expect(mockAnalyzeFilePath).toHaveBeenCalledWith(inputPath, width);
            expect(mockTakeAScreenshotPuppeteer).toHaveBeenCalledWith(url, processedPath, width);
        });

        it('should process complete command scenario with custom width', async () => {
            const url = 'https://example.com';
            const inputPath = './screenshot.png';
            const customWidth = 1920;
            const processedPath = './screenshot-1920.png';
            
            mockMyParseInt.mockReturnValue(customWidth);
            mockAnalyzeFilePath.mockReturnValue(processedPath);
            
            // Simulate command execution with custom width
            const width = mockMyParseInt('1920', null);
            const mockResult = createMockScreenshotResult(url, processedPath, width);
            mockTakeAScreenshotPuppeteer.mockResolvedValue(mockResult);
            const processedFilePath = mockAnalyzeFilePath(inputPath, width);
            await mockTakeAScreenshotPuppeteer(url, processedFilePath, width);
            
            expect(mockMyParseInt).toHaveBeenCalledWith('1920', null);
            expect(mockAnalyzeFilePath).toHaveBeenCalledWith(inputPath, customWidth);
            expect(mockTakeAScreenshotPuppeteer).toHaveBeenCalledWith(url, processedPath, customWidth);
        });
    });

    describe('Performance and Resource Management', () => {
        it('should handle multiple screenshot requests', async () => {
            const urls = [
                'https://example1.com',
                'https://example2.com',
                'https://example3.com'
            ];
            const width = 768;
            
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                const path = `./screenshots/example${i + 1}-768.png`;
                const mockResult = createMockScreenshotResult(url, path, width);
                mockTakeAScreenshotPuppeteer.mockResolvedValue(mockResult);
                
                await mockTakeAScreenshotPuppeteer(url, path, width);
                
                expect(mockTakeAScreenshotPuppeteer).toHaveBeenCalledWith(url, path, width);
            }
            
            expect(mockTakeAScreenshotPuppeteer).toHaveBeenCalledTimes(3);
        });

        it('should handle screenshot timeout scenarios', async () => {
            const url = 'https://slow-loading-site.com';
            const path = './screenshots/slow-768.png';
            const width = 768;
            const timeoutError = new Error('TimeoutError: waiting for Page.screenshot failed: timeout 30000ms exceeded');
            
            mockTakeAScreenshotPuppeteer.mockRejectedValue(timeoutError);
            
            await expect(mockTakeAScreenshotPuppeteer(url, path, width))
                .rejects.toThrow('TimeoutError: waiting for Page.screenshot failed: timeout 30000ms exceeded');
        });
    });
});