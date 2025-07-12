// Mock dependencies BEFORE other imports (following testing standardization)
jest.mock('readline/promises', () => ({
    createInterface: jest.fn()
}));

jest.mock('process', () => ({
    stdin: {},
    stdout: {}
}));

import { jest } from '@jest/globals';
import { createInterface } from 'readline/promises';
import { setupInteractiveTests } from '@test-utils';
import * as InteractiveUI from '../interactive-ui.js';

// Use jest.spyOn to mock displayMessage following standardization patterns
const mockDisplayMessage = jest.spyOn(InteractiveUI, 'displayMessage').mockImplementation(() => {});

describe('InteractiveUI.getUserChoice', () => {
    // Use standardized test setup
    setupInteractiveTests();

    // Mock setup with proper typing (following standardization patterns)
    const mockQuestion = jest.fn() as jest.MockedFunction<(prompt: string) => Promise<string>>;
    const mockClose = jest.fn() as jest.MockedFunction<() => void>;

    beforeEach(() => {
        // Set up the createInterface mock (external dependency)
        (createInterface as jest.Mock).mockImplementation(() => ({
            question: mockQuestion,
            close: mockClose
        }));

        // Set up the displayMessage mock (internal dependency)
        mockDisplayMessage.mockClear();
        mockDisplayMessage.mockImplementation(() => {}); // Ensure it's properly mocked
    });

    describe('basic functionality', () => {
        it('should accept valid input on first try', async () => {
            mockQuestion.mockResolvedValueOnce('y');

            const result = await InteractiveUI.getUserChoice('Choose yes or no', ['y', 'n']);

            expect(result).toBe('y');
            expect(mockQuestion).toHaveBeenCalledTimes(1);
            expect(mockQuestion).toHaveBeenCalledWith('Choose yes or no ');
            expect(mockClose).toHaveBeenCalledTimes(1);
        });

        it('should handle case-insensitive input by default', async () => {
            mockQuestion.mockResolvedValueOnce('Y');

            const result = await InteractiveUI.getUserChoice('Choose yes or no', ['y', 'n']);

            expect(result).toBe('Y'); // Returns original case
            expect(mockQuestion).toHaveBeenCalledTimes(1);
            expect(mockClose).toHaveBeenCalledTimes(1);
        });

        it('should retry on invalid input', async () => {
            mockQuestion
                .mockResolvedValueOnce('invalid')
                .mockResolvedValueOnce('still invalid')
                .mockResolvedValueOnce('y');

            const result = await InteractiveUI.getUserChoice('Choose yes or no', ['y', 'n']);

            expect(result).toBe('y');
            expect(mockQuestion).toHaveBeenCalledTimes(3);
            expect(mockDisplayMessage).toHaveBeenCalledWith('Invalid input. Please choose from: y, n');
            expect(mockDisplayMessage).toHaveBeenCalledTimes(2);
            expect(mockClose).toHaveBeenCalledTimes(1);
        });

        it('should handle empty string as valid input if included in allowed values', async () => {
            mockQuestion.mockResolvedValueOnce('');

            const result = await InteractiveUI.getUserChoice('Press Enter to continue', ['', 'n']);

            expect(result).toBe('');
            expect(mockQuestion).toHaveBeenCalledTimes(1);
            expect(mockClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('help functionality', () => {
        it('should show help when help value is entered', async () => {
            const helpFunction = jest.fn();
            mockQuestion
                .mockResolvedValueOnce('?')
                .mockResolvedValueOnce('y');

            const result = await InteractiveUI.getUserChoice(
                'Choose option',
                ['y', 'n', '?'],
                { helpValue: '?', helpFunction }
            );

            expect(result).toBe('y');
            expect(helpFunction).toHaveBeenCalledTimes(1);
            expect(mockQuestion).toHaveBeenCalledTimes(2);
            expect(mockClose).toHaveBeenCalledTimes(1);
        });

        it('should not show help if helpFunction is not provided', async () => {
            mockQuestion.mockResolvedValueOnce('?');

            const result = await InteractiveUI.getUserChoice(
                'Choose option',
                ['y', 'n', '?'],
                { helpValue: '?' }
            );

            expect(result).toBe('?');
            expect(mockQuestion).toHaveBeenCalledTimes(1);
            expect(mockClose).toHaveBeenCalledTimes(1);
        });

        it('should handle help value case-insensitively', async () => {
            const helpFunction = jest.fn();
            mockQuestion
                .mockResolvedValueOnce('HELP')
                .mockResolvedValueOnce('y');

            const result = await InteractiveUI.getUserChoice(
                'Choose option',
                ['y', 'n', 'help'],
                { helpValue: 'help', helpFunction }
            );

            expect(result).toBe('y');
            expect(helpFunction).toHaveBeenCalledTimes(1);
            expect(mockQuestion).toHaveBeenCalledTimes(2);
        });
    });

    describe('case sensitivity', () => {
        it('should enforce case sensitivity when option is enabled', async () => {
            mockQuestion
                .mockResolvedValueOnce('y')
                .mockResolvedValueOnce('Y');

            const result = await InteractiveUI.getUserChoice(
                'Choose Y or N',
                ['Y', 'N'],
                { caseSensitive: true }
            );

            expect(result).toBe('Y');
            expect(mockQuestion).toHaveBeenCalledTimes(2);
            expect(mockDisplayMessage).toHaveBeenCalledWith('Invalid input. Please choose from: Y, N');
        });

        it('should preserve original case in return value', async () => {
            mockQuestion.mockResolvedValueOnce('YES');

            const result = await InteractiveUI.getUserChoice('Choose yes or no', ['yes', 'no']);

            expect(result).toBe('YES'); // Returns original input case
        });
    });

    describe('error handling', () => {
        it('should return null on readline error', async () => {
            mockQuestion.mockRejectedValueOnce(new Error('Readline error'));

            const result = await InteractiveUI.getUserChoice('Choose option', ['y', 'n']);

            expect(result).toBeNull();
            expect(mockDisplayMessage).toHaveBeenCalledWith('Error reading input: Readline error');
            expect(mockClose).toHaveBeenCalledTimes(1);
        });

        it('should close readline even if error occurs', async () => {
            mockQuestion.mockRejectedValueOnce(new Error('Test error'));

            await InteractiveUI.getUserChoice('Choose option', ['y', 'n']);

            expect(mockClose).toHaveBeenCalledTimes(1);
        });

        it('should handle non-Error objects in catch block', async () => {
            mockQuestion.mockRejectedValueOnce('String error');

            const result = await InteractiveUI.getUserChoice('Choose option', ['y', 'n']);

            expect(result).toBeNull();
            expect(mockClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('edge cases', () => {
        it('should handle special characters in allowed values', async () => {
            mockQuestion.mockResolvedValueOnce('!@#');

            const result = await InteractiveUI.getUserChoice('Choose special', ['!@#', '$%^']);

            expect(result).toBe('!@#');
            expect(mockQuestion).toHaveBeenCalledTimes(1);
        });

        it('should handle whitespace in input', async () => {
            mockQuestion.mockResolvedValueOnce('  y  ');

            const result = await InteractiveUI.getUserChoice('Choose option', ['  y  ', 'n']);

            expect(result).toBe('  y  '); // Preserves whitespace when it exactly matches allowed value
            expect(mockQuestion).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple consecutive invalid inputs', async () => {
            const inputs = ['wrong1', 'wrong2', 'wrong3', 'wrong4', 'y'];
            inputs.forEach(input => mockQuestion.mockResolvedValueOnce(input));

            const result = await InteractiveUI.getUserChoice('Choose option', ['y', 'n']);

            expect(result).toBe('y');
            expect(mockQuestion).toHaveBeenCalledTimes(5);
            expect(mockDisplayMessage).toHaveBeenCalledTimes(4);
        });
    });

    describe('integration scenarios', () => {
        it('should handle complex help workflow', async () => {
            const helpShown: number[] = [];
            const helpFunction = () => {
                helpShown.push(Date.now());
            };

            mockQuestion
                .mockResolvedValueOnce('?')
                .mockResolvedValueOnce('invalid')
                .mockResolvedValueOnce('?')
                .mockResolvedValueOnce('y');

            const result = await InteractiveUI.getUserChoice(
                'Complex choice',
                ['y', 'n', '?'],
                { helpValue: '?', helpFunction }
            );

            expect(result).toBe('y');
            expect(helpShown.length).toBe(2);
            expect(mockDisplayMessage).toHaveBeenCalledTimes(1); // Only for 'invalid' input
            expect(mockQuestion).toHaveBeenCalledTimes(4);
        });

        it('should work with real-world CMS detection scenario', async () => {
            mockQuestion.mockResolvedValueOnce('w');

            const result = await InteractiveUI.getUserChoice(
                '[w] WordPress  [d] Drupal  [j] Joomla  [o] Other/Static  [s] Skip',
                ['w', 'd', 'j', 'o', 's']
            );

            expect(result).toBe('w');
            expect(mockQuestion).toHaveBeenCalledWith('[w] WordPress  [d] Drupal  [j] Joomla  [o] Other/Static  [s] Skip ');
        });
    });
});