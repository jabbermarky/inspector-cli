import { jest } from '@jest/globals';
import { setupCommandTests } from '@test-utils';

/**
 * Functional Tests for chat.ts
 * 
 * These tests actually import and execute the command functions to generate
 * real code coverage for the chat command.
 */

// Import the actual function we want to test functionally
import { processChatRequest } from '../chat.js';

// Mock external dependencies that would cause issues in test environment
jest.mock('../../genai.js', () => ({
    callChat: jest.fn()
}));

jest.mock('../../utils/file/index.js', () => ({
    validateImageFile: jest.fn((filename: string) => {
        // Mock file validation
        if (filename.includes('nonexistent')) {
            throw new Error('File does not exist');
        }
        if (filename.includes('invalid')) {
            throw new Error('Invalid image format');
        }
        if (filename.includes('corrupted')) {
            throw new Error('Image file is corrupted');
        }
        // Return true for valid files
        return true;
    })
}));

jest.mock('../../utils/logger.js', () => ({
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

import { callChat } from '../../genai.js';
const mockCallChat = callChat as jest.MockedFunction<typeof callChat>;

describe('Functional: chat.ts', () => {
    setupCommandTests();
    
    let consoleSpy: any;
    let consoleErrorSpy: any;
    let processExitSpy: any;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Set default successful chat response
        mockCallChat.mockResolvedValue({
            content: 'This is a mock chat response from the AI assistant.'
        });
        
        // Spy on console methods to capture output
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
    });

    describe('processChatRequest - Functional Tests', () => {
        it('should process chat request with default model', async () => {
            const screenshots = ['./screenshot1.png', './screenshot2.png'];
            
            await processChatRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('This is a mock chat response from the AI assistant.');
        });

        it('should process chat request with custom model', async () => {
            const screenshots = ['./screenshot1.png'];
            const options = { model: 'gpt-4' };
            
            await processChatRequest(screenshots, options);
            
            expect(consoleSpy).toHaveBeenCalledWith('This is a mock chat response from the AI assistant.');
        });

        it('should handle single screenshot file', async () => {
            const screenshots = ['./single-screenshot.png'];
            
            await processChatRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('This is a mock chat response from the AI assistant.');
        });

        it('should handle multiple screenshot files', async () => {
            const screenshots = [
                './screenshot1.png',
                './screenshot2.png', 
                './screenshot3.png',
                './screenshot4.png'
            ];
            
            await processChatRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('This is a mock chat response from the AI assistant.');
        });

        it('should handle empty options object', async () => {
            const screenshots = ['./screenshot.png'];
            const options = {};
            
            await processChatRequest(screenshots, options);
            
            expect(consoleSpy).toHaveBeenCalledWith('This is a mock chat response from the AI assistant.');
        });

        it('should handle undefined options', async () => {
            const screenshots = ['./screenshot.png'];
            
            await processChatRequest(screenshots, undefined);
            
            expect(consoleSpy).toHaveBeenCalledWith('This is a mock chat response from the AI assistant.');
        });

        it('should handle different model options', async () => {
            const screenshots = ['./screenshot.png'];
            const models = ['gpt-3.5-turbo', 'gpt-4', 'chatgpt-4o-latest', 'gpt-4-vision-preview'];
            
            for (const model of models) {
                await processChatRequest(screenshots, { model });
            }
            
            expect(consoleSpy).toHaveBeenCalledTimes(models.length);
        });
    });

    describe('File Validation - Functional Tests', () => {
        it('should handle file validation errors', async () => {
            const screenshots = ['./nonexistent-file.png'];
            
            await processChatRequest(screenshots);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'File does not exist');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should handle invalid file format errors', async () => {
            const screenshots = ['./invalid-file.png'];
            
            await processChatRequest(screenshots);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Invalid image format');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should handle corrupted file errors', async () => {
            const screenshots = ['./corrupted-file.png'];
            
            await processChatRequest(screenshots);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Image file is corrupted');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should validate multiple files and fail on first error', async () => {
            const screenshots = ['./valid-file.png', './nonexistent-file.png', './another-valid.png'];
            
            await processChatRequest(screenshots);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'File does not exist');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should handle mixed valid and invalid files', async () => {
            const screenshots = ['./invalid-file.png', './valid-file.png'];
            
            await processChatRequest(screenshots);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Invalid image format');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });
    });

    describe('API Response Handling - Functional Tests', () => {
        it('should handle API success responses', async () => {
            mockCallChat.mockResolvedValue({
                content: 'Successful AI response with detailed analysis.'
            });

            const screenshots = ['./screenshot.png'];
            
            await processChatRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('Successful AI response with detailed analysis.');
        });

        it('should handle API error responses', async () => {
            mockCallChat.mockResolvedValue({
                error: 'API key not configured'
            });

            const screenshots = ['./screenshot.png'];
            
            await processChatRequest(screenshots);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Chat error:', 'API key not configured');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should handle rate limit errors', async () => {
            mockCallChat.mockResolvedValue({
                error: 'Rate limit exceeded. Try again later.'
            });

            const screenshots = ['./screenshot.png'];
            
            await processChatRequest(screenshots);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Chat error:', 'Rate limit exceeded. Try again later.');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should handle network timeout errors', async () => {
            mockCallChat.mockResolvedValue({
                error: 'Request timeout'
            });

            const screenshots = ['./screenshot.png'];
            
            await processChatRequest(screenshots);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Chat error:', 'Request timeout');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should handle empty response content', async () => {
            mockCallChat.mockResolvedValue({
                content: ''
            });

            const screenshots = ['./screenshot.png'];
            
            await processChatRequest(screenshots);
            
            // Empty content is falsy, so console.log won't be called
            expect(consoleSpy).not.toHaveBeenCalled();
        });

        it('should handle very long response content', async () => {
            const longContent = 'A'.repeat(10000);
            mockCallChat.mockResolvedValue({
                content: longContent
            });

            const screenshots = ['./screenshot.png'];
            
            await processChatRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith(longContent);
        });

        it('should handle malformed API responses', async () => {
            mockCallChat.mockResolvedValue({
                // Missing both content and error
            } as any);

            const screenshots = ['./screenshot.png'];
            
            await processChatRequest(screenshots);
            
            // Function should complete without throwing or outputting
            expect(consoleSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });
    });

    describe('File Types and Paths - Functional Tests', () => {
        it('should handle different image file extensions', async () => {
            const screenshots = [
                './screenshot.png',
                './image.jpg',
                './photo.jpeg',
                './graphic.gif',
                './picture.bmp',
                './modern.webp'
            ];
            
            await processChatRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('This is a mock chat response from the AI assistant.');
        });

        it('should handle relative paths', async () => {
            const screenshots = ['../images/screenshot.png', './local/image.jpg'];
            
            await processChatRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('This is a mock chat response from the AI assistant.');
        });

        it('should handle absolute paths', async () => {
            const screenshots = ['/usr/local/screenshots/image.png', '/home/user/pictures/photo.jpg'];
            
            await processChatRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('This is a mock chat response from the AI assistant.');
        });

        it('should handle paths with spaces', async () => {
            const screenshots = ['./screenshots/image with spaces.png', './path/another file.jpg'];
            
            await processChatRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('This is a mock chat response from the AI assistant.');
        });

        it('should handle paths with special characters', async () => {
            const screenshots = ['./screenshots/image@#$%^&*().png', './测试图片.jpg'];
            
            await processChatRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('This is a mock chat response from the AI assistant.');
        });
    });

    describe('Integration Scenarios - Functional Tests', () => {
        it('should handle complete workflow with multiple files and custom model', async () => {
            const screenshots = [
                './screenshot1.png',
                './screenshot2.jpg',
                './screenshot3.gif'
            ];
            const options = { model: 'gpt-4-vision-preview' };
            
            mockCallChat.mockResolvedValue({
                content: 'Detailed analysis of all three screenshots with comprehensive insights.'
            });
            
            await processChatRequest(screenshots, options);
            
            expect(consoleSpy).toHaveBeenCalledWith('Detailed analysis of all three screenshots with comprehensive insights.');
        });

        it('should handle workflow with fallback to default model', async () => {
            const screenshots = ['./screenshot.png'];
            const options = { model: undefined };
            
            await processChatRequest(screenshots, options);
            
            expect(consoleSpy).toHaveBeenCalledWith('This is a mock chat response from the AI assistant.');
        });

        it('should handle large batch of screenshots', async () => {
            const screenshots = Array.from({ length: 20 }, (_, i) => `./screenshot${i + 1}.png`);
            
            await processChatRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('This is a mock chat response from the AI assistant.');
        });
    });
});