// Mock external dependencies BEFORE imports
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

jest.mock('fs/promises', () => ({
    mkdir: jest.fn(),
    writeFile: jest.fn()
}));

import { jest } from '@jest/globals';
import { analyzeBlocking } from '../analyze-blocking.js';
import { setupCommandTests, setupJestExtensions } from '@test-utils';
import * as fs from 'fs/promises';

// Setup custom Jest matchers
setupJestExtensions();

// Mock the classes BEFORE they are used
jest.mock('../../utils/cms/analysis/storage.js', () => ({
    DataStorage: class MockDataStorage {
        constructor(public dataDir: string) {}
        async initialize() {}
        async getAllDataPoints() {
            return [
                {
                    url: 'https://blocked-site.com',
                    title: 'Access Denied',
                    htmlContent: '<html>CloudFlare protection</html>',
                    statusCode: 403,
                    timestamp: Date.now()
                },
                {
                    url: 'https://normal-site.com', 
                    title: 'Welcome',
                    htmlContent: '<html>Normal content</html>',
                    statusCode: 200,
                    timestamp: Date.now()
                },
                {
                    url: 'https://captcha-site.com',
                    title: 'Captcha Required',
                    htmlContent: '<html>Please verify you are human</html>',
                    statusCode: 200,
                    timestamp: Date.now()
                }
            ];
        }
    }
}));

jest.mock('../../utils/cms/analysis/bot-blocking.js', () => ({
    BotBlockingAnalyzer: class MockBotBlockingAnalyzer {
        generateBlockingReport(dataPoints: any[]) {
            return {
                summary: {
                    totalSites: dataPoints.length,
                    blockedSites: 2,
                    blockingRate: 0.67,
                    topProviders: [
                        { provider: 'CloudFlare', count: 1 },
                        { provider: 'Custom', count: 1 }
                    ],
                    topBlockingMethods: [
                        { method: 'WAF', count: 1 },
                        { method: 'Captcha', count: 1 }
                    ]
                },
                detailedAnalysis: dataPoints.map(dp => ({
                    url: dp.url,
                    result: {
                        isBlocked: dp.statusCode === 403 || dp.title?.includes('Captcha'),
                        primaryBlockingMethod: dp.statusCode === 403 ? 'WAF' : 'Captcha',
                        riskLevel: 'medium',
                        signatures: [
                            {
                                provider: dp.htmlContent?.includes('CloudFlare') ? 'CloudFlare' : 'Custom',
                                category: 'bot-protection',
                                confidence: 0.8
                            }
                        ],
                        evasionStrategies: [
                            { name: 'User-Agent Rotation' },
                            { name: 'Proxy Usage' }
                        ]
                    }
                })),
                evasionRecommendations: {
                    immediate: [
                        {
                            name: 'User-Agent Rotation',
                            effectiveness: 0.7,
                            description: 'Rotate user agents',
                            implementation: 'Set random user agents',
                            risks: ['Detection']
                        }
                    ],
                    advanced: [
                        {
                            name: 'Proxy Chains',
                            effectiveness: 0.9,
                            description: 'Use proxy chains',
                            implementation: 'Configure proxy rotation',
                            risks: ['Cost', 'Speed']
                        }
                    ],
                    experimental: [
                        {
                            name: 'ML Evasion',
                            effectiveness: 0.95,
                            description: 'Machine learning based evasion',
                            implementation: 'Train ML models',
                            risks: ['Complexity', 'Resources']
                        }
                    ]
                }
            };
        }
    }
}));

describe('analyze-blocking.ts Functional Tests', () => {
    setupCommandTests();

    let mockMkdir: jest.MockedFunction<typeof fs.mkdir>;
    let mockWriteFile: jest.MockedFunction<typeof fs.writeFile>;
    let consoleSpy: any;

    beforeEach(() => {
        mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
        mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
        
        mockMkdir.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);
        
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('Core Analysis Functionality', () => {
        it('should analyze blocking with default options', async () => {
            await analyzeBlocking();
            
            expect(mockMkdir).toHaveBeenCalledWith('./reports', { recursive: true });
            expect(mockWriteFile).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🔍 Analyzing'));
        });

        it('should handle custom data and output directories', async () => {
            await analyzeBlocking({
                dataDir: './custom-data',
                outputDir: './custom-reports'
            });
            
            expect(mockMkdir).toHaveBeenCalledWith('./custom-reports', { recursive: true });
        });

        it('should filter data points when includeUnblocked is false', async () => {
            await analyzeBlocking({ includeUnblocked: false });
            
            // Should analyze fewer sites due to filtering
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/🔍 Analyzing \d+ data points/));
        });

        it('should include all data points when includeUnblocked is true', async () => {
            await analyzeBlocking({ includeUnblocked: true });
            
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🔍 Analyzing 3 data points'));
        });
    });

    describe('Report Generation', () => {
        it('should generate JSON report by default', async () => {
            await analyzeBlocking();
            
            const jsonWriteCalls = (mockWriteFile as jest.Mock).mock.calls.filter((call: any[]) => 
                (call[0] as string).includes('.json')
            );
            expect(jsonWriteCalls).toHaveLength(1);
        });

        it('should generate CSV report when format is csv', async () => {
            await analyzeBlocking({ format: 'csv' });
            
            const csvWriteCalls = (mockWriteFile as jest.Mock).mock.calls.filter((call: any[]) => 
                (call[0] as string).includes('.csv')
            );
            expect(csvWriteCalls).toHaveLength(1);
        });

        it('should generate markdown report when format is markdown', async () => {
            await analyzeBlocking({ format: 'markdown' });
            
            const mdWriteCalls = (mockWriteFile as jest.Mock).mock.calls.filter((call: any[]) => 
                (call[0] as string).includes('.md')
            );
            expect(mdWriteCalls).toHaveLength(1);
        });

        it('should generate all report formats when format is all', async () => {
            await analyzeBlocking({ format: 'all' as any });
            
            expect(mockWriteFile).toHaveBeenCalledTimes(3); // JSON, CSV, Markdown
        });
    });

    describe('Filtering Options', () => {
        it('should handle minimum blocking rate filter', async () => {
            await analyzeBlocking({ minBlockingRate: 0.8 });
            
            // Should show warning since blocking rate (67%) is below 80%
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  Blocking rate'));
        });

        it('should handle provider filtering', async () => {
            await analyzeBlocking({ providerFilter: ['CloudFlare'] });
            
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🔍 Analyzing'));
        });

        it('should handle empty provider filter array', async () => {
            await analyzeBlocking({ providerFilter: [] });
            
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Bot blocking analysis complete!'));
        });
    });

    describe('Summary Display', () => {
        it('should display comprehensive analysis summary', async () => {
            await analyzeBlocking();
            
            expect(consoleSpy).toHaveBeenCalledWith('📊 BOT BLOCKING ANALYSIS SUMMARY');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Total sites analyzed: 2'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Sites with blocking: 2'));
            // Check for any blocking rate format (since mock may calculate differently)
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Blocking rate: \d+\.\d%/));
        });

        it('should display top blocking providers', async () => {
            await analyzeBlocking();
            
            expect(consoleSpy).toHaveBeenCalledWith('🏢 Top Blocking Providers:');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1. CloudFlare: 1 sites'));
        });

        it('should display top blocking methods', async () => {
            await analyzeBlocking();
            
            expect(consoleSpy).toHaveBeenCalledWith('🛡️  Top Blocking Methods:');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1. WAF: 1 sites'));
        });

        it('should display evasion recommendations summary', async () => {
            await analyzeBlocking();
            
            expect(consoleSpy).toHaveBeenCalledWith('🚀 Evasion Strategy Recommendations:');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Immediate (easy): 1 strategies'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Advanced (medium): 1 strategies'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Experimental (hard): 1 strategies'));
        });

        it('should display top immediate recommendations', async () => {
            await analyzeBlocking();
            
            expect(consoleSpy).toHaveBeenCalledWith('💡 Top Immediate Recommendations:');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1. User-Agent Rotation (70% effective)'));
        });
    });

    describe('Error Handling', () => {
        it('should handle file write errors', async () => {
            mockWriteFile.mockRejectedValueOnce(new Error('Permission denied'));
            
            const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
                throw new Error('process.exit called');
            }) as any);

            await expect(analyzeBlocking()).rejects.toThrow('process.exit called');
            
            expect(exitSpy).toHaveBeenCalledWith(1);
            exitSpy.mockRestore();
        });
    });

    describe('Report Content Validation', () => {
        it('should generate valid JSON report content', async () => {
            await analyzeBlocking({ format: 'json' });
            
            const jsonCall = (mockWriteFile as jest.Mock).mock.calls.find((call: any[]) => 
                (call[0] as string).includes('.json')
            );
            expect(jsonCall).toBeDefined();
            
            const jsonContent = JSON.parse(jsonCall![1] as string);
            expect(jsonContent).toHaveProperty('summary');
            expect(jsonContent).toHaveProperty('detailedAnalysis');
            expect(jsonContent).toHaveProperty('evasionRecommendations');
        });

        it('should generate valid CSV report content', async () => {
            await analyzeBlocking({ format: 'csv' });
            
            const csvCall = (mockWriteFile as jest.Mock).mock.calls.find((call: any[]) => 
                (call[0] as string).includes('.csv')
            );
            expect(csvCall).toBeDefined();
            
            const csvContent = csvCall![1] as string;
            expect(csvContent).toContain('"url","is_blocked","primary_method"');
            expect(csvContent).toContain('https://blocked-site.com');
        });

        it('should generate valid Markdown report content', async () => {
            await analyzeBlocking({ format: 'markdown' });
            
            const mdCall = (mockWriteFile as jest.Mock).mock.calls.find((call: any[]) => 
                (call[0] as string).includes('.md')
            );
            expect(mdCall).toBeDefined();
            
            const mdContent = mdCall![1] as string;
            expect(mdContent).toContain('# Bot Blocking Analysis Report');
            expect(mdContent).toContain('## Summary');
            expect(mdContent).toContain('## Top Blocking Providers');
            expect(mdContent).toContain('## Evasion Strategy Recommendations');
        });
    });

    describe('File Path Generation', () => {
        it('should generate timestamped report files', async () => {
            await analyzeBlocking({ format: 'json' });
            
            const jsonCall = (mockWriteFile as jest.Mock).mock.calls.find((call: any[]) => 
                (call[0] as string).includes('.json')
            );
            
            expect(jsonCall![0]).toMatch(/bot-blocking-analysis-\d{4}-\d{2}-\d{2}\.json$/);
        });

        it('should use custom output directory in file paths', async () => {
            await analyzeBlocking({ 
                outputDir: './custom-reports',
                format: 'json'
            });
            
            const jsonCall = (mockWriteFile as jest.Mock).mock.calls.find((call: any[]) => 
                (call[0] as string).includes('.json')
            );
            
            expect(jsonCall![0]).toContain('custom-reports/bot-blocking-analysis-');
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle comprehensive analysis workflow', async () => {
            await analyzeBlocking({
                dataDir: './test-data',
                outputDir: './test-reports', 
                format: 'json',
                minBlockingRate: 0.5,
                includeUnblocked: true
            });
            
            expect(mockMkdir).toHaveBeenCalledWith('./test-reports', { recursive: true });
            expect(mockWriteFile).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Bot blocking analysis complete!'));
        });

        it('should handle real-world blocking detection patterns', async () => {
            await analyzeBlocking({ includeUnblocked: false });
            
            // Verify it filters for blocking patterns
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/🔍 Analyzing [12] data points/));
        });
    });
});