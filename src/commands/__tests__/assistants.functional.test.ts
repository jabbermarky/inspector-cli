import { jest } from '@jest/globals';
import { setupCommandTests } from '@test-utils';

/**
 * Functional Tests for assistants.ts
 * 
 * These tests actually import and execute the command functions to generate
 * real code coverage for the assistants command.
 */

// Mock external dependencies that would cause issues in test environment
jest.mock('../../genai.js', () => ({
    getOpenAIAssistants: jest.fn()
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

// Import the actual function we want to test functionally
import { listAssistants } from '../assistants.js';
import { getOpenAIAssistants } from '../../genai.js';

const mockGetOpenAIAssistants = getOpenAIAssistants as jest.MockedFunction<typeof getOpenAIAssistants>;

describe('Functional: assistants.ts', () => {
    setupCommandTests();
    
    let consoleSpy: any;
    let consoleErrorSpy: any;
    let processExitSpy: any;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
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

    describe('listAssistants - Functional Tests', () => {
        it('should list available assistants successfully', async () => {
            mockGetOpenAIAssistants.mockResolvedValue({
                list: [
                    { id: 'asst_1234567890', name: 'E-commerce Assistant' },
                    { id: 'asst_9876543210', name: 'Website Analyzer' },
                    { id: 'asst_abcdef1234', name: 'Payment Detector' }
                ]
            });

            await listAssistants();
            
            // Verify console output shows assistants list
            expect(consoleSpy).toHaveBeenCalledWith('asst_1234567890 - E-commerce Assistant');
            expect(consoleSpy).toHaveBeenCalledWith('asst_9876543210 - Website Analyzer');
            expect(consoleSpy).toHaveBeenCalledWith('asst_abcdef1234 - Payment Detector');
            expect(consoleSpy).toHaveBeenCalledTimes(3);
        });

        it('should handle API error responses', async () => {
            mockGetOpenAIAssistants.mockResolvedValue({
                error: 'API key not configured'
            });

            await listAssistants();
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('getOpenAIAssistants error: ', 'API key not configured');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should handle empty assistants list', async () => {
            mockGetOpenAIAssistants.mockResolvedValue({
                list: []
            });

            await listAssistants();
            
            // Should complete without console output
            expect(consoleSpy).not.toHaveBeenCalled();
        });

        it('should handle malformed response', async () => {
            mockGetOpenAIAssistants.mockResolvedValue({
                // Missing both list and error properties
            } as any);

            await listAssistants();
            
            // Should complete without error or output
            expect(consoleSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle thrown exceptions', async () => {
            mockGetOpenAIAssistants.mockRejectedValue(new Error('Network connection failed'));

            await listAssistants();
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching assistants:', 'Network connection failed');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should handle assistants with special characters', async () => {
            mockGetOpenAIAssistants.mockResolvedValue({
                list: [
                    { id: 'asst_special', name: 'Assistant with émojis 🤖 and symbols!@#$%' }
                ]
            });

            await listAssistants();
            
            expect(consoleSpy).toHaveBeenCalledWith('asst_special - Assistant with émojis 🤖 and symbols!@#$%');
        });

        it('should handle large assistant lists', async () => {
            const manyAssistants = Array.from({ length: 10 }, (_, i) => ({
                id: `asst_${i.toString().padStart(3, '0')}`,
                name: `Assistant ${i + 1}`
            }));

            mockGetOpenAIAssistants.mockResolvedValue({
                list: manyAssistants
            });

            await listAssistants();
            
            expect(consoleSpy).toHaveBeenCalledTimes(10);
            expect(consoleSpy).toHaveBeenCalledWith('asst_000 - Assistant 1');
            expect(consoleSpy).toHaveBeenCalledWith('asst_009 - Assistant 10');
        });
    });
});