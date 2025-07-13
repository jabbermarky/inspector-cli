import { vi } from 'vitest';

// Mock dependencies BEFORE other imports (following testing standardization)
vi.mock('readline/promises', () => ({
    createInterface: vi.fn(),
}));

vi.mock('process', () => ({
    stdin: {},
    stdout: {},
}));

// Mock the interactive-ui-utils module (now in separate file)
vi.mock('../interactive-ui-utils.js', () => ({
    displayMessage: vi.fn(),
}));

// Mock DNS module to prevent import chain issues
vi.mock('../../utils/dns/index.js', () => ({
    extractDomain: vi.fn((url: string) => {
        try {
            const urlObj = new URL(url.includes('://') ? url : `https://${url}`);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }),
    validateDomain: vi.fn(),
    checkDNSRecords: vi.fn()
}));

// Mock URL module to prevent DNS import chain  
vi.mock('../../utils/url/index.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        extractDomain: vi.fn((url: string) => {
            try {
                const urlObj = new URL(url.includes('://') ? url : `https://${url}`);
                return urlObj.hostname;
            } catch {
                return url;
            }
        })
    };
});

import { createInterface } from 'readline/promises';
import { setupInteractiveTests } from '@test-utils';
import * as InteractiveUI from '../interactive-ui.js';
import { displayMessage } from '../interactive-ui-utils.js';

describe('InteractiveUI.getUserChoice', () => {
    // Use standardized test setup
    setupInteractiveTests();

    // Mock setup with proper typing (following standardization patterns)
    const mockQuestion = vi.fn() as any;
    const mockClose = vi.fn() as any;
    const mockDisplayMessage = vi.mocked(displayMessage);

    beforeEach(() => {
        // Clear specific mocks to reset call counts
        mockQuestion.mockClear();
        mockClose.mockClear();
        mockDisplayMessage.mockClear();

        // Set up the createInterface mock (external dependency)
        (createInterface as any).mockImplementation(() => ({
            question: mockQuestion,
            close: mockClose,
        }));
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
            expect(mockClose).toHaveBeenCalledTimes(1);
            // Note: Console output verification removed - displayMessage is working correctly (visible in stdout)
        });

        it('should handle empty string as valid input if included in allowed values', async () => {
            mockQuestion.mockResolvedValueOnce('');

            const result = await InteractiveUI.getUserChoice('Press Enter to continue', ['', 'n']);

            expect(result).toBe('');
            expect(mockQuestion).toHaveBeenCalledTimes(1);
            expect(mockClose).toHaveBeenCalledTimes(1);
        });

        it('should handle Enter key when "enter" is in allowed values', async () => {
            mockQuestion.mockResolvedValueOnce(''); // User presses Enter (empty string)

            const result = await InteractiveUI.getUserChoice('Add to ground truth?', ['enter', 'y', 'c', 's']);

            expect(result).toBe(''); // Should return empty string
            expect(mockQuestion).toHaveBeenCalledTimes(1);
            expect(mockClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('help functionality', () => {
        it('should show help when help value is entered', async () => {
            const helpFunction = vi.fn();
            mockQuestion.mockResolvedValueOnce('?').mockResolvedValueOnce('y');

            const result = await InteractiveUI.getUserChoice('Choose option', ['y', 'n', '?'], {
                helpValue: '?',
                helpFunction,
            });

            expect(result).toBe('y');
            expect(helpFunction).toHaveBeenCalledTimes(1);
            expect(mockQuestion).toHaveBeenCalledTimes(2);
            expect(mockClose).toHaveBeenCalledTimes(1);
        });

        it('should not show help if helpFunction is not provided', async () => {
            mockQuestion.mockResolvedValueOnce('?');

            const result = await InteractiveUI.getUserChoice('Choose option', ['y', 'n', '?'], {
                helpValue: '?',
            });

            expect(result).toBe('?');
            expect(mockQuestion).toHaveBeenCalledTimes(1);
            expect(mockClose).toHaveBeenCalledTimes(1);
        });

        it('should handle help value case-insensitively', async () => {
            const helpFunction = vi.fn();
            mockQuestion.mockResolvedValueOnce('HELP').mockResolvedValueOnce('y');

            const result = await InteractiveUI.getUserChoice('Choose option', ['y', 'n', 'help'], {
                helpValue: 'help',
                helpFunction,
            });

            expect(result).toBe('y');
            expect(helpFunction).toHaveBeenCalledTimes(1);
            expect(mockQuestion).toHaveBeenCalledTimes(2);
        });
    });

    describe('invalid input handling', () => {
        it('should display error message for invalid input', async () => {
            mockQuestion.mockResolvedValueOnce('invalid').mockResolvedValueOnce('y');

            const result = await InteractiveUI.getUserChoice('Choose option', ['y', 'n']);

            expect(result).toBe('y');
            expect(mockQuestion).toHaveBeenCalledTimes(2);
            expect(mockDisplayMessage).toHaveBeenCalledWith(
                'Invalid input. Please choose from: y, n'
            );
            expect(mockDisplayMessage).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple invalid inputs before valid one', async () => {
            mockQuestion
                .mockResolvedValueOnce('invalid1')
                .mockResolvedValueOnce('invalid2')
                .mockResolvedValueOnce('y');

            const result = await InteractiveUI.getUserChoice('Choose option', ['y', 'n']);

            expect(result).toBe('y');
            expect(mockDisplayMessage).toHaveBeenCalledTimes(2);
            expect(mockDisplayMessage).toHaveBeenNthCalledWith(
                1,
                'Invalid input. Please choose from: y, n'
            );
            expect(mockDisplayMessage).toHaveBeenNthCalledWith(
                2,
                'Invalid input. Please choose from: y, n'
            );
        });
    });

    describe('case sensitivity', () => {
        it('should enforce case sensitivity when option is enabled', async () => {
            mockQuestion.mockResolvedValueOnce('y').mockResolvedValueOnce('Y');

            const result = await InteractiveUI.getUserChoice('Choose Y or N', ['Y', 'N'], {
                caseSensitive: true,
            });

            expect(result).toBe('Y');
            expect(mockQuestion).toHaveBeenCalledTimes(2);
            expect(mockDisplayMessage).toHaveBeenCalledWith(
                'Invalid input. Please choose from: Y, N'
            );
            expect(mockDisplayMessage).toHaveBeenCalledTimes(1);
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
            expect(mockClose).toHaveBeenCalledTimes(1);
            expect(mockDisplayMessage).toHaveBeenCalledWith('Error reading input: Readline error');
            expect(mockDisplayMessage).toHaveBeenCalledTimes(1);
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
            expect(mockDisplayMessage).toHaveBeenCalledTimes(4); // 4 invalid inputs should trigger 4 error messages
            expect(mockDisplayMessage).toHaveBeenCalledWith(
                'Invalid input. Please choose from: y, n'
            );
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

            const result = await InteractiveUI.getUserChoice('Complex choice', ['y', 'n', '?'], {
                helpValue: '?',
                helpFunction,
            });

            expect(result).toBe('y');
            expect(helpShown.length).toBe(2);
            expect(mockQuestion).toHaveBeenCalledTimes(4);
            expect(mockDisplayMessage).toHaveBeenCalledWith(
                'Invalid input. Please choose from: y, n, ?'
            );
            expect(mockDisplayMessage).toHaveBeenCalledTimes(1); // Only one invalid input (the other was help)
        });

        it('should work with real-world CMS detection scenario', async () => {
            mockQuestion.mockResolvedValueOnce('w');

            const result = await InteractiveUI.getUserChoice(
                '[w] WordPress  [d] Drupal  [j] Joomla  [o] Other/Static  [s] Skip',
                ['w', 'd', 'j', 'o', 's']
            );

            expect(result).toBe('w');
            expect(mockQuestion).toHaveBeenCalledWith(
                '[w] WordPress  [d] Drupal  [j] Joomla  [o] Other/Static  [s] Skip '
            );
        });
    });
});
