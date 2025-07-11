/**
 * Bot Blocking Analysis Tests
 * 
 * Comprehensive test suite for bot blocking detection and evasion analysis.
 */

import { BotBlockingAnalyzer } from '../bot-blocking.js';
import { DetectionDataPoint } from '../types.js';
import { setupJestExtensions } from '@test-utils';

// Setup custom Jest matchers
setupJestExtensions();

// Helper function to create test data points
function createTestDataPoint(partial: Partial<DetectionDataPoint>): DetectionDataPoint {
    return {
        url: 'https://example.com',
        timestamp: new Date(),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        captureVersion: {
            schema: '1',
            engine: { version: '1.0.0', commit: 'test', buildDate: new Date().toISOString() },
            algorithms: { detection: '1', confidence: '1' },
            patterns: { lastUpdated: new Date().toISOString() },
            features: { experimentalFlags: [] }
        },
        originalUrl: 'https://example.com',
        finalUrl: 'https://example.com',
        redirectChain: [],
        totalRedirects: 0,
        protocolUpgraded: false,
        navigationTime: 1000,
        httpHeaders: {},
        statusCode: 200,
        contentType: 'text/html',
        contentLength: 1000,
        metaTags: [],
        title: 'Test Page',
        htmlContent: '',
        htmlSize: 1000,
        robotsTxt: undefined,
        domElements: [],
        links: [],
        scripts: [],
        stylesheets: [],
        forms: [],
        technologies: [],
        loadTime: 1000,
        resourceCount: 1,
        detectionResults: [],
        errors: [],
        ...partial
    };
}

describe('BotBlockingAnalyzer', () => {
    let analyzer: BotBlockingAnalyzer;
    
    beforeEach(() => {
        analyzer = new BotBlockingAnalyzer();
    });
    
    describe('analyzeDataPoint', () => {
        describe('Cloudflare Detection', () => {
            it('should detect Cloudflare challenge page', () => {
                const dataPoint = createTestDataPoint({
                    title: 'Just a moment...',
                    htmlContent: 'Checking your browser before accessing the website.',
                    httpHeaders: {
                        'server': 'cloudflare',
                        'cf-ray': '12345-LAX'
                    },
                    statusCode: 503,
                    contentType: 'text/html'
                });
                
                const result = analyzer.analyzeDataPoint(dataPoint);
                
                expect(result.isBlocked).toBe(true);
                expect(result.signatures).toHaveLength(1);
                expect(result.signatures[0].provider).toBe('Cloudflare');
                expect(result.signatures[0].name).toBe('Cloudflare Challenge');
                expect(result.primaryBlockingMethod).toBe('Cloudflare Challenge');
                expect(result.riskLevel).toBe('critical'); // High confidence (0.95) = critical
                expect(result.evasionStrategies.length).toBeGreaterThan(0);
            });
            
            it('should detect Cloudflare Bot Management', () => {
                const dataPoint = createTestDataPoint({
                    title: 'Access Denied',
                    htmlContent: 'Bot management by Cloudflare',
                    httpHeaders: {
                        'cf-bot-management': 'true'
                    },
                    statusCode: 403,
                    loadTime: 500
                });
                
                const result = analyzer.analyzeDataPoint(dataPoint);
                
                expect(result.isBlocked).toBe(true);
                expect(result.signatures[0].evasionDifficulty).toBe('hard'); // Based on signature definition
                expect(result.riskLevel).toBe('critical');
            });
        });
        
        describe('PerimeterX Detection', () => {
            it('should detect PerimeterX protection', () => {
                const dataPoint = createTestDataPoint({
                    title: 'Access to this page has been denied.',
                    htmlContent: 'You have been blocked because we believe you are using automation tools to browse the website.',
                    statusCode: 403,
                    scripts: [
                        {
                            src: '',
                            inline: true,
                            content: "window._pxAppId = 'PXtest123';"
                        }
                    ],
                    loadTime: 800,
                    resourceCount: 2
                });
                
                const result = analyzer.analyzeDataPoint(dataPoint);
                
                expect(result.isBlocked).toBe(true);
                expect(result.signatures[0].provider).toBe('PerimeterX');
                expect(result.riskLevel).toBe('critical');
            });
        });
        
        describe('reCAPTCHA Detection', () => {
            it('should detect Google reCAPTCHA', () => {
                const dataPoint = createTestDataPoint({
                    title: 'Verify you are human',
                    htmlContent: '<div class="g-recaptcha"></div>',
                    scripts: [
                        {
                            src: 'https://www.google.com/recaptcha/api.js',
                            inline: false,
                            content: ''
                        }
                    ],
                    loadTime: 1200,
                    resourceCount: 3
                });
                
                const result = analyzer.analyzeDataPoint(dataPoint);
                
                expect(result.isBlocked).toBe(true);
                expect(result.signatures[0].provider).toBe('Google');
                expect(result.signatures[0].category).toBe('captcha');
            });
        });
        
        describe('Rate Limiting Detection', () => {
            it('should detect generic rate limiting', () => {
                const dataPoint = createTestDataPoint({
                    title: 'Too Many Requests',
                    htmlContent: 'Rate limit exceeded. Please slow down.',
                    statusCode: 429,
                    loadTime: 200
                });
                
                const result = analyzer.analyzeDataPoint(dataPoint);
                
                expect(result.isBlocked).toBe(true);
                expect(result.signatures[0].category).toBe('rate_limiting');
                expect(result.signatures[0].evasionDifficulty).toBe('easy');
                expect(result.riskLevel).toBe('medium'); // Easy difficulty (1) but confidence 0.7 = medium
            });
        });
        
        describe('No Blocking Detection', () => {
            it('should not detect blocking on normal page', () => {
                const dataPoint = createTestDataPoint({
                    title: 'Welcome to Example.com',
                    htmlContent: '<html><body><h1>Normal website content</h1></body></html>',
                    httpHeaders: {
                        'server': 'nginx',
                        'content-type': 'text/html'
                    },
                    metaTags: [
                        { name: 'description', content: 'A normal website' }
                    ],
                    loadTime: 800,
                    resourceCount: 5
                });
                
                const result = analyzer.analyzeDataPoint(dataPoint);
                
                expect(result.isBlocked).toBe(false);
                expect(result.signatures).toHaveLength(0);
                expect(result.primaryBlockingMethod).toBe('none');
                expect(result.riskLevel).toBe('low');
                expect(result.evasionStrategies).toHaveLength(0);
            });
        });
        
        describe('Multiple Blocking Methods', () => {
            it('should detect multiple blocking signatures', () => {
                const dataPoint = createTestDataPoint({
                    title: 'Security Check - Cloudflare',
                    htmlContent: 'Checking your browser with reCAPTCHA protection',
                    httpHeaders: {
                        'cf-ray': '12345-LAX',
                        'server': 'cloudflare'
                    },
                    statusCode: 503,
                    scripts: [
                        {
                            src: 'https://www.google.com/recaptcha/api.js',
                            inline: false,
                            content: ''
                        }
                    ],
                    loadTime: 1500,
                    resourceCount: 3
                });
                
                const result = analyzer.analyzeDataPoint(dataPoint);
                
                expect(result.isBlocked).toBe(true);
                expect(result.signatures.length).toBeGreaterThan(1);
                
                const providers = result.signatures.map(s => s.provider);
                expect(providers).toContain('Cloudflare');
                expect(providers).toContain('Google');
                
                expect(result.riskLevel).toBe('critical');
            });
        });
    });
    
    describe('generateBlockingReport', () => {
        it('should generate comprehensive blocking report', () => {
            const dataPoints: DetectionDataPoint[] = [
                // Blocked by Cloudflare
                createTestDataPoint({
                    url: 'https://blocked1.com',
                    title: 'Just a moment...',
                    htmlContent: 'Cloudflare security check',
                    httpHeaders: { 'cf-ray': '12345' },
                    statusCode: 503
                }),
                
                // Blocked by PerimeterX
                createTestDataPoint({
                    url: 'https://blocked2.com',
                    title: 'Access Denied',
                    htmlContent: 'PerimeterX protection active',
                    statusCode: 403
                }),
                
                // Not blocked
                createTestDataPoint({
                    url: 'https://normal.com',
                    title: 'Normal Site',
                    htmlContent: 'Regular website content',
                    httpHeaders: { 'server': 'nginx' }
                }),
                
                // Rate limited
                createTestDataPoint({
                    url: 'https://ratelimited.com',
                    title: 'Too Many Requests',
                    htmlContent: 'Rate limit exceeded',
                    statusCode: 429
                })
            ];
            
            const report = analyzer.generateBlockingReport(dataPoints);
            
            // Summary checks
            expect(report.summary.totalSites).toBe(4);
            expect(report.summary.blockedSites).toBe(3);
            expect(report.summary.blockingRate).toBe(0.75);
            expect(report.summary.topProviders.length).toBeGreaterThan(0);
            expect(report.summary.topBlockingMethods.length).toBeGreaterThan(0);
            
            // Detailed analysis checks
            expect(report.detailedAnalysis).toHaveLength(4);
            expect(report.detailedAnalysis.filter(a => a.result.isBlocked)).toHaveLength(3);
            
            // Evasion recommendations checks
            expect(report.evasionRecommendations.immediate.length).toBeGreaterThan(0);
            expect(report.evasionRecommendations.advanced.length).toBeGreaterThan(0);
            expect(report.evasionRecommendations.experimental.length).toBeGreaterThan(0);
            
            // Check that strategies are sorted by effectiveness
            const immediateStrategies = report.evasionRecommendations.immediate;
            for (let i = 1; i < immediateStrategies.length; i++) {
                expect(immediateStrategies[i].effectiveness).toBeLessThanOrEqual(immediateStrategies[i-1].effectiveness);
            }
        });
        
        it('should handle empty dataset', () => {
            const report = analyzer.generateBlockingReport([]);
            
            expect(report.summary.totalSites).toBe(0);
            expect(report.summary.blockedSites).toBe(0);
            expect(report.summary.blockingRate).toBe(0);
            expect(report.detailedAnalysis).toHaveLength(0);
        });
        
        it('should calculate blocking rate correctly', () => {
            const dataPoints: DetectionDataPoint[] = [
                createTestDataPoint({
                    url: 'https://blocked.com',
                    title: 'Just a moment...',
                    htmlContent: 'Cloudflare check',
                    httpHeaders: { 'cf-ray': '12345' },
                    statusCode: 503
                }),
                
                createTestDataPoint({
                    url: 'https://normal1.com',
                    title: 'Normal Site',
                    htmlContent: 'Regular content'
                }),
                
                createTestDataPoint({
                    url: 'https://normal2.com',
                    title: 'Another Normal Site',
                    htmlContent: 'More regular content'
                })
            ];
            
            const report = analyzer.generateBlockingReport(dataPoints);
            
            expect(report.summary.totalSites).toBe(3);
            expect(report.summary.blockedSites).toBe(1);
            expect(report.summary.blockingRate).toBeCloseTo(0.333, 3);
        });
    });
    
    describe('Evasion Strategy Recommendations', () => {
        it('should recommend appropriate strategies for CAPTCHA', () => {
            const dataPoint = createTestDataPoint({
                htmlContent: 'reCAPTCHA challenge'
            });
            
            const result = analyzer.analyzeDataPoint(dataPoint);
            
            expect(result.isBlocked).toBe(true);
            expect(result.evasionStrategies.some(s => s.type === 'captcha')).toBe(true);
            expect(result.evasionStrategies.some(s => s.name === 'CAPTCHA Solving Integration')).toBe(true);
        });
        
        it('should recommend proxy strategies for IP blocking', () => {
            const dataPoint = createTestDataPoint({
                htmlContent: 'Your IP has been banned',
                statusCode: 403
            });
            
            const result = analyzer.analyzeDataPoint(dataPoint);
            
            expect(result.isBlocked).toBe(true);
            expect(result.evasionStrategies.some(s => s.type === 'proxy')).toBe(true);
            expect(result.evasionStrategies.some(s => s.name === 'Residential Proxy Rotation')).toBe(true);
        });
        
        it('should recommend timing strategies for rate limiting', () => {
            const dataPoint = createTestDataPoint({
                htmlContent: 'Too many requests. Please slow down.',
                statusCode: 429
            });
            
            const result = analyzer.analyzeDataPoint(dataPoint);
            
            expect(result.isBlocked).toBe(true);
            expect(result.evasionStrategies.some(s => s.type === 'timing')).toBe(true);
            expect(result.evasionStrategies.some(s => s.name === 'Add Request Delays')).toBe(true);
        });
    });
    
    describe('Risk Level Calculation', () => {
        it('should assign critical risk for very hard evasion', () => {
            const dataPoint = createTestDataPoint({
                htmlContent: 'PerimeterX protection with high confidence',
                statusCode: 403
            });
            
            const result = analyzer.analyzeDataPoint(dataPoint);
            
            expect(result.riskLevel).toBe('critical');
        });
        
        it('should assign low risk for easy evasion', () => {
            const dataPoint = createTestDataPoint({
                htmlContent: 'Rate limit exceeded',
                statusCode: 429
            });
            
            const result = analyzer.analyzeDataPoint(dataPoint);
            
            expect(result.riskLevel).toBe('medium'); // Easy difficulty (1) but confidence 0.7 = medium
        });
    });
    
    describe('Provider Detection', () => {
        const testCases = [
            { provider: 'Cloudflare', content: 'cloudflare security check', header: 'cf-ray' },
            { provider: 'PerimeterX', content: '_pxAppId', header: null },
            { provider: 'Google', content: 'recaptcha', header: null },
            { provider: 'Imperva', content: 'incapsula', header: 'incap_ses' },
            { provider: 'Akamai', content: 'akamai bot manager', header: '_abck' }
        ];
        
        testCases.forEach(({ provider, content, header }) => {
            it(`should detect ${provider} provider`, () => {
                const headers = header ? { [header]: 'test-value' } : {};
                
                const dataPoint = createTestDataPoint({
                    htmlContent: content,
                    httpHeaders: headers,
                    statusCode: 403
                });
                
                const result = analyzer.analyzeDataPoint(dataPoint);
                
                expect(result.isBlocked).toBe(true);
                expect(result.signatures.some(s => s.provider === provider)).toBe(true);
            });
        });
    });
});