import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { setupCommandTests } from '@test-utils';

/**
 * Functional Tests for assistant.ts
 * 
 * These tests actually import and execute the command functions to generate
 * real code coverage for the assistant command.
 */

// Import the actual function we want to test functionally
import { processAssistantRequest } from '../assistant.js';

// Mock external dependencies that would cause issues in test environment
vi.mock('../../genai.js', () => ({
    callAssistant: vi.fn()
}));

vi.mock('../../brandi_json_schema.js', () => ({
    validateBrandiJsonSchema: vi.fn((jsonString: string) => {
        // Mock schema validation - return true for valid structures
        try {
            const parsed = JSON.parse(jsonString);
            return parsed.name && parsed.page_type && parsed.payment_methods;
        } catch {
            return false;
        }
    })
}));

vi.mock('../../utils/utils.js', () => ({
    myParseDecimal: vi.fn((value: string, _dummy: any) => {
        const parsed = parseFloat(value);
        if (isNaN(parsed)) {
            throw new Error('Not a number.');
        }
        return parsed;
    }),
    validJSON: vi.fn((jsonString: string) => {
        try {
            JSON.parse(jsonString);
            return true;
        } catch {
            return false;
        }
    })
}));

vi.mock('../../utils/file/index.js', () => ({
    validateImageFile: vi.fn((filename: string) => {
        // Mock file validation
        if (filename.includes('nonexistent')) {
            throw new Error('File does not exist');
        }
        if (filename.includes('invalid')) {
            throw new Error('Invalid image format');
        }
        return true;
    })
}));

vi.mock('fs', () => ({
    default: {
        writeFileSync: vi.fn((filepath: string, content: string) => {
            // Mock file writing
            if (filepath.includes('readonly')) {
                throw new Error('EACCES: permission denied');
            }
        })
    },
    writeFileSync: vi.fn((filepath: string, content: string) => {
        // Mock file writing
        if (filepath.includes('readonly')) {
            throw new Error('EACCES: permission denied');
        }
    })
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

import { callAssistant } from '../../genai.js';
const mockCallAssistant = callAssistant as vi.MockedFunction<typeof callAssistant>;

describe('Functional: assistant.ts', () => {
    setupCommandTests();
    
    let consoleSpy: any;
    let consoleErrorSpy: any;
    let processExitSpy: any;

    beforeEach(() => {
        // Reset all mocks before each test
        vi.clearAllMocks();
        
        // Set default successful assistant response
        mockCallAssistant.mockResolvedValue({
            data: [
                {
                    role: 'assistant',
                    content: [{
                        type: 'text',
                        text: {
                            value: JSON.stringify({
                                name: 'Example E-commerce Site',
                                page_type: 'checkout',
                                page_type_reason: 'Contains payment form elements',
                                payment_methods: [
                                    { type: 'PayPal', size: 'large', format: 'button' },
                                    { type: 'Credit Card', size: 'medium', format: 'form' }
                                ]
                            })
                        }
                    }]
                }
            ],
            run: {
                model: 'gpt-4-vision-preview',
                temperature: 0.7,
                top_p: 0.9,
                assistant_id: 'asst_test123456',
                usage: {
                    total_tokens: 1250,
                    completion_tokens: 800,
                    prompt_tokens: 450
                }
            } as any
        });
        
        // Spy on console methods to capture output
        consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
    });

    describe('processAssistantRequest - Functional Tests', () => {
        it('should process assistant request with default options', async () => {
            const screenshots = ['./screenshot1.png'];
            
            await processAssistantRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('site name: Example E-commerce Site');
            expect(consoleSpy).toHaveBeenCalledWith('page type: checkout - Contains payment form elements');
            expect(consoleSpy).toHaveBeenCalledWith('payment methods: PayPal large button, Credit Card medium form');
            expect(consoleSpy).toHaveBeenCalledWith('tokens used: 1250');
            expect(consoleSpy).toHaveBeenCalledWith('model: gpt-4-vision-preview');
        });

        it('should process assistant request with custom options', async () => {
            const screenshots = ['./screenshot1.png'];
            const options = {
                model: 'gpt-4',
                assistant: 'asst_custom123',
                temperature: 0.5,
                top_p: 0.8
            };
            
            await processAssistantRequest(screenshots, options);
            
            expect(consoleSpy).toHaveBeenCalledWith('site name: Example E-commerce Site');
            expect(consoleSpy).toHaveBeenCalledWith('temperature: 0.7');
            expect(consoleSpy).toHaveBeenCalledWith('assistant: asst_test123456');
        });

        it('should handle multiple screenshot files', async () => {
            const screenshots = [
                './screenshot1.png',
                './screenshot2.png',
                './screenshot3.png'
            ];
            
            await processAssistantRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('site name: Example E-commerce Site');
        });

        it('should handle empty options object', async () => {
            const screenshots = ['./screenshot.png'];
            const options = {};
            
            await processAssistantRequest(screenshots, options);
            
            expect(consoleSpy).toHaveBeenCalledWith('site name: Example E-commerce Site');
        });

        it('should handle undefined options', async () => {
            const screenshots = ['./screenshot.png'];
            
            await processAssistantRequest(screenshots, undefined);
            
            expect(consoleSpy).toHaveBeenCalledWith('site name: Example E-commerce Site');
        });

        it('should save output to file when outfile specified', async () => {
            const screenshots = ['./screenshot.png'];
            const options = { outfile: './output.json' };
            
            await processAssistantRequest(screenshots, options);
            
            expect(consoleSpy).toHaveBeenCalledWith('Output written to ./output.json');
        });

        it('should handle different temperature values', async () => {
            const screenshots = ['./screenshot.png'];
            const temperatures = [0.0, 0.3, 0.7, 1.0, 2.0];
            
            for (const temperature of temperatures) {
                await processAssistantRequest(screenshots, { temperature });
            }
            
            expect(consoleSpy).toHaveBeenCalledTimes(temperatures.length * 8); // 8 console.log calls per request
        });
    });

    describe('File Validation - Functional Tests', () => {
        it('should handle file validation errors', async () => {
            const screenshots = ['./nonexistent-file.png'];
            
            await processAssistantRequest(screenshots);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'File does not exist');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should handle invalid image format errors', async () => {
            const screenshots = ['./invalid-file.png'];
            
            await processAssistantRequest(screenshots);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Invalid image format');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should validate multiple files and fail on first error', async () => {
            const screenshots = ['./valid.png', './nonexistent.png', './another.png'];
            
            await processAssistantRequest(screenshots);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'File does not exist');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });
    });

    describe('API Response Handling - Functional Tests', () => {
        it('should handle API error responses', async () => {
            mockCallAssistant.mockResolvedValue({
                error: 'API key not configured'
            });

            const screenshots = ['./screenshot.png'];
            
            await processAssistantRequest(screenshots);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('callAssistant error: ', 'API key not configured');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should handle rate limit errors', async () => {
            mockCallAssistant.mockResolvedValue({
                error: 'Rate limit exceeded'
            });

            const screenshots = ['./screenshot.png'];
            
            await processAssistantRequest(screenshots);
            
            expect(consoleErrorSpy).toHaveBeenCalledWith('callAssistant error: ', 'Rate limit exceeded');
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should handle malformed API responses (no data or error)', async () => {
            mockCallAssistant.mockResolvedValue({
                // Missing both data and error
            } as any);

            const screenshots = ['./screenshot.png'];
            
            await processAssistantRequest(screenshots);
            
            // Should complete without error or output
            expect(consoleSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle empty data array', async () => {
            mockCallAssistant.mockResolvedValue({
                data: []
            });

            const screenshots = ['./screenshot.png'];
            
            await processAssistantRequest(screenshots);
            
            // Should complete without output
            expect(consoleSpy).not.toHaveBeenCalled();
        });

        it('should handle non-assistant messages', async () => {
            mockCallAssistant.mockResolvedValue({
                data: [
                    {
                        role: 'user',
                        content: [{ type: 'text', text: { value: 'User message' } }]
                    }
                ]
            });

            const screenshots = ['./screenshot.png'];
            
            await processAssistantRequest(screenshots);
            
            // Should not process non-assistant messages
            expect(consoleSpy).not.toHaveBeenCalled();
        });

        it('should handle non-text content types', async () => {
            mockCallAssistant.mockResolvedValue({
                data: [
                    {
                        role: 'assistant',
                        content: [{ type: 'image', image_url: 'http://example.com/image.png' }]
                    }
                ]
            });

            const screenshots = ['./screenshot.png'];
            
            await processAssistantRequest(screenshots);
            
            // Should not process non-text content
            expect(consoleSpy).not.toHaveBeenCalled();
        });
    });

    describe('JSON Processing - Functional Tests', () => {
        it('should handle invalid JSON responses', async () => {
            mockCallAssistant.mockResolvedValue({
                data: [
                    {
                        role: 'assistant',
                        content: [{
                            type: 'text',
                            text: { value: 'This is not valid JSON' }
                        }]
                    }
                ]
            });

            const screenshots = ['./screenshot.png'];
            
            await processAssistantRequest(screenshots);
            
            // Should not process invalid JSON
            expect(consoleSpy).not.toHaveBeenCalled();
        });

        it('should handle JSON that fails schema validation', async () => {
            mockCallAssistant.mockResolvedValue({
                data: [
                    {
                        role: 'assistant',
                        content: [{
                            type: 'text',
                            text: { 
                                value: JSON.stringify({
                                    // Missing required fields for schema validation
                                    incomplete: 'data'
                                })
                            }
                        }]
                    }
                ]
            });

            const screenshots = ['./screenshot.png'];
            
            await processAssistantRequest(screenshots);
            
            // Should not process data that fails schema validation
            expect(consoleSpy).not.toHaveBeenCalled();
        });

        it('should handle complex payment methods array', async () => {
            mockCallAssistant.mockResolvedValue({
                data: [
                    {
                        role: 'assistant',
                        content: [{
                            type: 'text',
                            text: {
                                value: JSON.stringify({
                                    name: 'Complex Commerce Site',
                                    page_type: 'product',
                                    page_type_reason: 'Product listing page',
                                    payment_methods: [
                                        { type: 'PayPal Express', size: 'large', format: 'button' },
                                        { type: 'Apple Pay', size: 'medium', format: 'button' },
                                        { type: 'Google Pay', size: 'medium', format: 'button' },
                                        { type: 'Visa', size: 'small', format: 'logo' },
                                        { type: 'Mastercard', size: 'small', format: 'logo' }
                                    ]
                                })
                            }
                        }]
                    }
                ]
            });

            const screenshots = ['./screenshot.png'];
            
            await processAssistantRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('site name: Complex Commerce Site');
            expect(consoleSpy).toHaveBeenCalledWith('payment methods: PayPal Express large button, Apple Pay medium button, Google Pay medium button, Visa small logo, Mastercard small logo');
        });

        it('should handle empty payment methods array', async () => {
            mockCallAssistant.mockResolvedValue({
                data: [
                    {
                        role: 'assistant',
                        content: [{
                            type: 'text',
                            text: {
                                value: JSON.stringify({
                                    name: 'No Payment Site',
                                    page_type: 'informational',
                                    page_type_reason: 'No payment elements found',
                                    payment_methods: []
                                })
                            }
                        }]
                    }
                ]
            });

            const screenshots = ['./screenshot.png'];
            
            await processAssistantRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('payment methods: ');
        });
    });

    describe('File Output - Functional Tests', () => {
        it('should handle file write errors', async () => {
            const screenshots = ['./screenshot.png'];
            const options = { outfile: './readonly-output.json' };
            
            // File write errors will propagate since they're not caught in the implementation
            await expect(processAssistantRequest(screenshots, options))
                .rejects.toThrow('EACCES: permission denied');
        });

        it('should handle different output file extensions', async () => {
            const screenshots = ['./screenshot.png'];
            const outputFiles = [
                './output.json',
                './result.txt',
                './data.log',
                './analysis.dat'
            ];

            for (const outfile of outputFiles) {
                await processAssistantRequest(screenshots, { outfile });
                expect(consoleSpy).toHaveBeenCalledWith(`Output written to ${outfile}`);
            }
        });

        it('should handle output files with special paths', async () => {
            const screenshots = ['./screenshot.png'];
            const specialPaths = [
                '../outputs/result.json',
                '/tmp/analysis.json',
                './outputs/file with spaces.json',
                './outputs/测试文件.json'
            ];

            for (const outfile of specialPaths) {
                await processAssistantRequest(screenshots, { outfile });
                expect(consoleSpy).toHaveBeenCalledWith(`Output written to ${outfile}`);
            }
        });
    });

    describe('Missing Run Data - Functional Tests', () => {
        it('should handle missing run data gracefully', async () => {
            mockCallAssistant.mockResolvedValue({
                data: [
                    {
                        role: 'assistant',
                        content: [{
                            type: 'text',
                            text: {
                                value: JSON.stringify({
                                    name: 'Test Site',
                                    page_type: 'checkout',
                                    page_type_reason: 'Test',
                                    payment_methods: []
                                })
                            }
                        }]
                    }
                ]
                // Missing run data
            });

            const screenshots = ['./screenshot.png'];
            
            await processAssistantRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('tokens used: ?');
            expect(consoleSpy).toHaveBeenCalledWith('model: ?');
            expect(consoleSpy).toHaveBeenCalledWith('assistant: ?');
            expect(consoleSpy).toHaveBeenCalledWith('top_p: ?');
            expect(consoleSpy).toHaveBeenCalledWith('temperature: ?');
        });

        it('should handle partial run data', async () => {
            mockCallAssistant.mockResolvedValue({
                data: [
                    {
                        role: 'assistant',
                        content: [{
                            type: 'text',
                            text: {
                                value: JSON.stringify({
                                    name: 'Test Site',
                                    page_type: 'checkout',
                                    page_type_reason: 'Test',
                                    payment_methods: []
                                })
                            }
                        }]
                    }
                ],
                run: {
                    model: 'gpt-4'
                    // Missing other run properties
                } as any
            });

            const screenshots = ['./screenshot.png'];
            
            await processAssistantRequest(screenshots);
            
            expect(consoleSpy).toHaveBeenCalledWith('model: gpt-4');
            expect(consoleSpy).toHaveBeenCalledWith('tokens used: ?');
            expect(consoleSpy).toHaveBeenCalledWith('assistant: ?');
        });
    });

    describe('Integration Scenarios - Functional Tests', () => {
        it('should handle complete workflow with all options', async () => {
            const screenshots = ['./page1.png', './page2.png'];
            const options = {
                model: 'gpt-4-vision-preview',
                assistant: 'asst_ecommerce_analyzer',
                temperature: 0.3,
                top_p: 0.95,
                outfile: './analysis_result.json'
            };
            
            await processAssistantRequest(screenshots, options);
            
            expect(consoleSpy).toHaveBeenCalledWith('site name: Example E-commerce Site');
            expect(consoleSpy).toHaveBeenCalledWith('Output written to ./analysis_result.json');
        });

        it('should handle multiple assistant responses', async () => {
            mockCallAssistant.mockResolvedValue({
                data: [
                    {
                        role: 'user',
                        content: [{ type: 'text', text: { value: 'Analyze this screenshot' } }]
                    },
                    {
                        role: 'assistant',
                        content: [{
                            type: 'text',
                            text: {
                                value: JSON.stringify({
                                    name: 'Multi-response Site',
                                    page_type: 'landing',
                                    page_type_reason: 'Landing page detected',
                                    payment_methods: [{ type: 'PayPal', size: 'large', format: 'button' }]
                                })
                            }
                        }]
                    },
                    {
                        role: 'assistant',
                        content: [{ type: 'text', text: { value: 'Additional analysis' } }]
                    }
                ]
            });

            const screenshots = ['./screenshot.png'];
            
            await processAssistantRequest(screenshots);
            
            // Should process only the first assistant message with valid JSON
            expect(consoleSpy).toHaveBeenCalledWith('site name: Multi-response Site');
        });
    });
});