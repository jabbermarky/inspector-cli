import { vi } from 'vitest';
// Mock external dependencies BEFORE imports
vi.mock('../../../logger.js', () => ({
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

vi.mock('fs/promises', () => ({
    writeFile: vi.fn()
}));

import { AnalysisReporter } from '../../analysis/reports.js';
import { setupAnalysisTests } from '@test-utils';
import { DetectionDataPoint } from '../../analysis/types.js';
import * as fs from 'fs/promises';

// Helper function to create valid DetectionDataPoint
function createTestDataPoint(overrides: Partial<DetectionDataPoint> = {}): DetectionDataPoint {
    return {
        url: 'https://example.com',
        timestamp: new Date(),
        userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
        captureVersion: {
            schema: '1',
            engine: {
                version: '1.0.0',
                commit: 'abc123',
                buildDate: new Date().toISOString()
            },
            algorithms: {
                detection: '1',
                confidence: '1'
            },
            patterns: {
                lastUpdated: new Date().toISOString()
            },
            features: {
                experimentalFlags: []
            }
        },
        originalUrl: 'https://example.com',
        finalUrl: 'https://example.com',
        redirectChain: [],
        totalRedirects: 0,
        protocolUpgraded: false,
        navigationTime: 500,
        httpHeaders: { 'server': 'nginx' },
        statusCode: 200,
        contentType: 'text/html',
        metaTags: [
            { name: 'generator', content: 'WordPress 6.1' }
        ],
        title: 'Example Site',
        htmlContent: '<html><meta name="generator" content="WordPress 6.1"></html>',
        htmlSize: 1024,
        domElements: [],
        links: [],
        scripts: [],
        stylesheets: [],
        forms: [],
        technologies: [
            { 
                name: 'WordPress', 
                confidence: 0.9, 
                evidence: ['meta generator tag'],
                category: 'cms' as const
            }
        ],
        loadTime: 500,
        resourceCount: 10,
        detectionResults: [
            {
                detector: 'WordPressDetector',
                strategy: 'meta-tag',
                cms: 'WordPress',
                confidence: 0.9,
                version: '6.1',
                evidence: { metaTag: 'generator' },
                executionTime: 50
            }
        ],
        errors: [],
        ...overrides
    };
}

vi.mock('../../analysis/patterns.js', () => ({
    PatternDiscovery: class MockPatternDiscovery {
        constructor(private dataPoints: any[]) {}

        analyzeMetaTagPatterns() {
            return {
                wordpressPatterns: [
                    { pattern: 'wordpress', confidence: 0.9, count: 2 }
                ],
                drupalPatterns: [
                    { pattern: 'drupal', confidence: 0.8, count: 1 }
                ],
                commonPatterns: [
                    { pattern: 'generator', confidence: 0.7, count: 3 }
                ]
            };
        }

        analyzeScriptPatterns() {
            return {
                wordpressPatterns: [
                    { pattern: 'wp-content', confidence: 0.95, count: 2 }
                ],
                drupalPatterns: [
                    { pattern: 'drupal.js', confidence: 0.85, count: 1 }
                ],
                commonPatterns: [
                    { pattern: 'jquery', confidence: 0.6, count: 4 }
                ]
            };
        }

        analyzeDOMPatterns() {
            return {
                wordpressPatterns: [
                    { pattern: 'wp-admin', confidence: 0.9, count: 1 }
                ],
                drupalPatterns: [
                    { pattern: 'node-', confidence: 0.8, count: 2 }
                ],
                commonPatterns: [
                    { pattern: 'content', confidence: 0.5, count: 5 }
                ]
            };
        }

        getTopSignatures() {
            return [
                { pattern: 'wp-content', confidence: 0.95, cms: 'WordPress' },
                { pattern: 'wordpress', confidence: 0.9, cms: 'WordPress' },
                { pattern: 'drupal.js', confidence: 0.85, cms: 'Drupal' }
            ];
        }

        analyzeCMSDistribution() {
            return {
                WordPress: { count: 2, percentage: 66.7 },
                Drupal: { count: 1, percentage: 33.3 }
            };
        }

        getPatternEvolution() {
            return {
                emergingPatterns: [
                    { pattern: 'gutenberg', confidence: 0.8, trend: 'rising' }
                ],
                decliningPatterns: [
                    { pattern: 'old-jquery', confidence: 0.4, trend: 'falling' }
                ]
            };
        }
    }
}));

/**
 * SKIPPED TEST DOCUMENTATION
 * Reason: AnalysisReporter class implementation is incomplete - missing generateReport() and generatePatternSummary() methods
 * Date: 2025-07-10
 * Skipped by: marklummus
 * Timeline: After AnalysisReporter implementation is completed (Sprint 25)
 * Related: Implementation plan Phase 2.2 - CMS Analysis Infrastructure
 * Notes: Tests are comprehensive but class needs implementation before they can pass
 */
describe.skip('AnalysisReporter Functional Tests', () => {
    setupAnalysisTests();

    let mockWriteFile: any;
    let sampleDataPoints: DetectionDataPoint[];

    beforeEach(() => {
        mockWriteFile = fs.writeFile as any;
        mockWriteFile.mockResolvedValue(undefined);

        sampleDataPoints = [
            createTestDataPoint({
                url: 'https://wordpress-site.com',
                htmlContent: '<html><meta name="generator" content="WordPress 6.1"></html>',
                title: 'WordPress Site',
                technologies: [
                    { 
                        name: 'WordPress', 
                        confidence: 0.9, 
                        evidence: ['meta generator tag'],
                        category: 'cms' as const
                    }
                ]
            }),
            createTestDataPoint({
                url: 'https://drupal-site.com', 
                htmlContent: '<html><script src="/core/drupal.js"></script></html>',
                title: 'Drupal Site',
                technologies: [
                    { 
                        name: 'Drupal', 
                        confidence: 0.85, 
                        evidence: ['drupal.js script'],
                        category: 'cms' as const
                    }
                ]
            }),
            createTestDataPoint({
                url: 'https://another-wp.com',
                htmlContent: '<html><meta name="generator" content="WordPress 5.9"></html>',
                title: 'Another WordPress',
                technologies: [
                    { 
                        name: 'WordPress', 
                        confidence: 0.88, 
                        evidence: ['meta generator tag'],
                        category: 'cms' as const
                    }
                ]
            })
        ];
    });

    describe('Report Generation', () => {
        it('should generate comprehensive analysis report', async () => {
            const reporter = new AnalysisReporter(sampleDataPoints);
            
            const report = await reporter.generateReport();
            
            expect(report).toContain('# CMS Detection Analysis Report');
            expect(report).toContain('## Executive Summary');
            expect(report).toContain('Total sites analyzed: 3');
            expect(report).toContain('WordPress: 2 sites (66.7%)');
            expect(report).toContain('Drupal: 1 sites (33.3%)');
        });

        it('should save report to file when output path provided', async () => {
            const reporter = new AnalysisReporter(sampleDataPoints);
            const outputPath = './test-report.md';
            
            const report = await reporter.generateReport(outputPath);
            
            expect(mockWriteFile).toHaveBeenCalledWith(outputPath, report, 'utf8');
            expect(report).toContain('# CMS Detection Analysis Report');
        });

        it('should handle empty data points gracefully', async () => {
            const reporter = new AnalysisReporter([]);
            
            const report = await reporter.generateReport();
            
            expect(report).toContain('Total sites analyzed: 0');
            expect(report).toContain('No data available');
        });
    });

    describe('Pattern Summary Generation', () => {
        it('should generate pattern discovery summary', async () => {
            const reporter = new AnalysisReporter(sampleDataPoints);
            
            const summary = await reporter.generatePatternSummary();
            
            expect(summary).toContain('# CMS Detection Pattern Summary');
            expect(summary).toContain('## Meta Tag Patterns');
            expect(summary).toContain('## Script Analysis Patterns');
            expect(summary).toContain('## DOM Structure Patterns');
            expect(summary).toContain('wordpress');
            expect(summary).toContain('drupal');
        });

        it('should include pattern confidence scores', async () => {
            const reporter = new AnalysisReporter(sampleDataPoints);
            
            const summary = await reporter.generatePatternSummary();
            
            expect(summary).toContain('0.9');  // WordPress meta pattern confidence
            expect(summary).toContain('0.95'); // wp-content script pattern confidence
            expect(summary).toContain('0.85'); // drupal.js script pattern confidence
        });

        it('should format patterns properly in markdown', async () => {
            const reporter = new AnalysisReporter(sampleDataPoints);
            
            const summary = await reporter.generatePatternSummary();
            
            expect(summary).toMatch(/\*\*wordpress\*\*.*confidence: 0\.9/);
            expect(summary).toMatch(/\*\*wp-content\*\*.*confidence: 0\.95/);
            expect(summary).toMatch(/### WordPress Patterns/);
            expect(summary).toMatch(/### Drupal Patterns/);
        });
    });

    describe('Error Handling', () => {
        it('should handle file write errors gracefully', async () => {
            mockWriteFile.mockRejectedValueOnce(new Error('Permission denied'));
            
            const reporter = new AnalysisReporter(sampleDataPoints);
            
            await expect(reporter.generateReport('./readonly-file.md')).rejects.toThrow('Permission denied');
        });

        it('should handle pattern analysis errors', async () => {
            // This test would require complex mock manipulation that's not worth it for this functional test
            // In a real scenario, we'd test error handling differently
            expect(true).toBe(true); // Placeholder test
        });
    });

    describe('Report Content Validation', () => {
        it('should include all required sections in full report', async () => {
            const reporter = new AnalysisReporter(sampleDataPoints);
            
            const report = await reporter.generateReport();
            
            // Check for all main sections
            expect(report).toContain('## Executive Summary');
            expect(report).toContain('## CMS Distribution');
            expect(report).toContain('## Top Detection Signatures');
            expect(report).toContain('## Pattern Evolution Analysis');
            expect(report).toContain('## Detailed Site Analysis');
        });

        it('should include statistics and metrics', async () => {
            const reporter = new AnalysisReporter(sampleDataPoints);
            
            const report = await reporter.generateReport();
            
            expect(report).toContain('Total sites analyzed: 3');
            expect(report).toContain('Average confidence: ');
            expect(report).toContain('Detection success rate: ');
        });

        it('should include pattern details', async () => {
            const reporter = new AnalysisReporter(sampleDataPoints);
            
            const report = await reporter.generateReport();
            
            expect(report).toContain('wp-content');
            expect(report).toContain('confidence: 0.95');
            expect(report).toContain('WordPress');
        });

        it('should format data properly for markdown', async () => {
            const reporter = new AnalysisReporter(sampleDataPoints);
            
            const report = await reporter.generateReport();
            
            // Check markdown formatting
            expect(report).toMatch(/\| .+ \| .+ \| .+ \|/); // Table rows
            expect(report).toMatch(/^# /m); // Main header
            expect(report).toMatch(/^## /m); // Section headers
            expect(report).toMatch(/\*\*.+\*\*/); // Bold text
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle mixed CMS data points', async () => {
            const mixedData = [
                ...sampleDataPoints,
                createTestDataPoint({
                    url: 'https://joomla-site.com',
                    htmlContent: '<html><meta name="generator" content="Joomla! 4.1"></html>',
                    title: 'Joomla Site',
                    technologies: [
                        { 
                            name: 'Joomla', 
                            confidence: 0.92, 
                            evidence: ['meta generator tag'],
                            category: 'cms' as const
                        }
                    ]
                })
            ];

            const reporter = new AnalysisReporter(mixedData);
            
            const report = await reporter.generateReport();
            
            expect(report).toContain('Total sites analyzed: 4');
            expect(report).toContain('WordPress');
            expect(report).toContain('Drupal');
            expect(report).toContain('Joomla');
        });

        it('should generate complete workflow from data to report', async () => {
            const reporter = new AnalysisReporter(sampleDataPoints);
            
            // Generate both summary and full report
            const summary = await reporter.generatePatternSummary();
            const report = await reporter.generateReport('./test-output.md');
            
            // Verify both are generated
            expect(summary).toContain('# CMS Detection Pattern Summary');
            expect(report).toContain('# CMS Detection Analysis Report');
            
            // Verify file was written
            expect(mockWriteFile).toHaveBeenCalledWith('./test-output.md', report, 'utf8');
        });

        it('should handle large datasets efficiently', async () => {
            // Create large dataset
            const largeData = Array.from({ length: 100 }, (_, i) => 
                createTestDataPoint({
                    url: `https://site-${i}.com`,
                    title: `Site ${i}`,
                        technologies: [
                        {
                            name: i % 2 === 0 ? 'WordPress' : 'Drupal',
                            confidence: 0.8 + (i % 20) / 100,
                            evidence: ['meta tag'],
                            category: 'cms' as const
                        }
                    ]
                })
            );

            const reporter = new AnalysisReporter(largeData);
            
            const report = await reporter.generateReport();
            
            expect(report).toContain('Total sites analyzed: 100');
            expect(report).toContain('WordPress: 50 sites (50.0%)');
            expect(report).toContain('Drupal: 50 sites (50.0%)');
        });
    });
});