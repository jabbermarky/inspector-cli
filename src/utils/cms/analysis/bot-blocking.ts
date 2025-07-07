/**
 * Bot Blocking Analysis Module
 * 
 * Analyzes website data to detect bot blocking mechanisms and provides
 * recommendations for evasion strategies.
 */

import { DetectionDataPoint } from './types.js';
import { createModuleLogger } from '../../logger.js';

const logger = createModuleLogger('bot-blocking-analyzer');

export interface BotBlockingSignature {
    name: string;
    provider: string;
    category: 'captcha' | 'rate_limiting' | 'behavior_analysis' | 'ip_blocking' | 'fingerprinting';
    confidence: number; // 0-1
    indicators: string[];
    evasionDifficulty: 'easy' | 'medium' | 'hard' | 'very_hard';
}

export interface BotBlockingResult {
    isBlocked: boolean;
    signatures: BotBlockingSignature[];
    primaryBlockingMethod: string;
    evasionStrategies: EvasionStrategy[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface EvasionStrategy {
    name: string;
    type: 'user_agent' | 'timing' | 'proxy' | 'behavior' | 'headers' | 'fingerprinting' | 'captcha';
    difficulty: 'easy' | 'medium' | 'hard';
    effectiveness: number; // 0-1
    description: string;
    implementation: string;
    risks: string[];
}

export interface BotBlockingReport {
    summary: {
        totalSites: number;
        blockedSites: number;
        blockingRate: number;
        topBlockingMethods: Array<{ method: string; count: number }>;
        topProviders: Array<{ provider: string; count: number }>;
    };
    detailedAnalysis: Array<{
        url: string;
        result: BotBlockingResult;
    }>;
    evasionRecommendations: {
        immediate: EvasionStrategy[];
        advanced: EvasionStrategy[];
        experimental: EvasionStrategy[];
    };
}

/**
 * Bot blocking detection signatures
 */
const BOT_BLOCKING_SIGNATURES: BotBlockingSignature[] = [
    // Cloudflare
    {
        name: 'Cloudflare Challenge',
        provider: 'Cloudflare',
        category: 'behavior_analysis',
        confidence: 0.95,
        indicators: ['cf-ray', 'cloudflare', 'just a moment', 'checking your browser'],
        evasionDifficulty: 'hard'
    },
    {
        name: 'Cloudflare Bot Management',
        provider: 'Cloudflare',
        category: 'fingerprinting',
        confidence: 0.9,
        indicators: ['cf-bot-management', 'challenge-platform.com'],
        evasionDifficulty: 'very_hard'
    },
    
    // PerimeterX
    {
        name: 'PerimeterX Protection',
        provider: 'PerimeterX',
        category: 'behavior_analysis',
        confidence: 0.95,
        indicators: ['perimeterx', '_pxAppId', 'px-captcha', 'blocked because we believe you are using automation'],
        evasionDifficulty: 'very_hard'
    },
    
    // DataDome
    {
        name: 'DataDome Protection',
        provider: 'DataDome',
        category: 'behavior_analysis',
        confidence: 0.9,
        indicators: ['datadome', 'dd-captcha', 'robot or automated system'],
        evasionDifficulty: 'hard'
    },
    
    // Imperva/Incapsula
    {
        name: 'Imperva Incapsula',
        provider: 'Imperva',
        category: 'rate_limiting',
        confidence: 0.85,
        indicators: ['incap_ses', 'incapsula', 'visid_incap'],
        evasionDifficulty: 'medium'
    },
    
    // Akamai
    {
        name: 'Akamai Bot Manager',
        provider: 'Akamai',
        category: 'fingerprinting',
        confidence: 0.9,
        indicators: ['akamai', '_abck', 'akam-sw'],
        evasionDifficulty: 'very_hard'
    },
    
    // reCAPTCHA
    {
        name: 'Google reCAPTCHA',
        provider: 'Google',
        category: 'captcha',
        confidence: 0.95,
        indicators: ['recaptcha', 'g-recaptcha', 'grecaptcha'],
        evasionDifficulty: 'hard'
    },
    
    // hCaptcha
    {
        name: 'hCaptcha',
        provider: 'hCaptcha',
        category: 'captcha',
        confidence: 0.95,
        indicators: ['hcaptcha', 'h-captcha'],
        evasionDifficulty: 'hard'
    },
    
    // Sucuri
    {
        name: 'Sucuri Firewall',
        provider: 'Sucuri',
        category: 'rate_limiting',
        confidence: 0.8,
        indicators: ['sucuri', 'x-sucuri'],
        evasionDifficulty: 'medium'
    },
    
    // Generic patterns
    {
        name: 'Rate Limiting',
        provider: 'Generic',
        category: 'rate_limiting',
        confidence: 0.7,
        indicators: ['too many requests', 'rate limit', 'slow down'],
        evasionDifficulty: 'easy'
    },
    
    {
        name: 'IP Blocking',
        provider: 'Generic',
        category: 'ip_blocking',
        confidence: 0.8,
        indicators: ['ip blocked', 'access denied', 'forbidden', 'your ip has been banned'],
        evasionDifficulty: 'medium'
    },
    
    {
        name: 'User Agent Blocking',
        provider: 'Generic',
        category: 'fingerprinting',
        confidence: 0.6,
        indicators: ['user agent blocked', 'automated request', 'bot detected'],
        evasionDifficulty: 'easy'
    }
];

/**
 * Evasion strategies database
 */
const EVASION_STRATEGIES: EvasionStrategy[] = [
    // Easy strategies
    {
        name: 'Rotate User Agents',
        type: 'user_agent',
        difficulty: 'easy',
        effectiveness: 0.6,
        description: 'Use different realistic browser user agent strings',
        implementation: 'Cycle through recent Chrome, Firefox, Safari user agents',
        risks: ['May still be detected by advanced fingerprinting']
    },
    {
        name: 'Add Request Delays',
        type: 'timing',
        difficulty: 'easy',
        effectiveness: 0.7,
        description: 'Add random delays between requests to mimic human behavior',
        implementation: 'Random delays of 1-5 seconds between requests',
        risks: ['Slows down data collection significantly']
    },
    {
        name: 'Modify Headers',
        type: 'headers',
        difficulty: 'easy',
        effectiveness: 0.5,
        description: 'Add realistic browser headers',
        implementation: 'Include Accept-Language, Accept-Encoding, DNT headers',
        risks: ['Basic mitigation, easily bypassed by modern systems']
    },
    
    // Medium strategies
    {
        name: 'Residential Proxy Rotation',
        type: 'proxy',
        difficulty: 'medium',
        effectiveness: 0.8,
        description: 'Route requests through residential IP addresses',
        implementation: 'Use services like Bright Data, Oxylabs, or Smartproxy',
        risks: ['Cost', 'Potential legal issues', 'IP reputation problems']
    },
    {
        name: 'Browser Automation Stealth',
        type: 'fingerprinting',
        difficulty: 'medium',
        effectiveness: 0.7,
        description: 'Hide automation indicators in browser',
        implementation: 'Use puppeteer-extra-plugin-stealth',
        risks: ['May break on updates', 'Not 100% effective']
    },
    {
        name: 'Session Management',
        type: 'behavior',
        difficulty: 'medium',
        effectiveness: 0.6,
        description: 'Maintain consistent sessions with cookies',
        implementation: 'Persist cookies across requests, handle session timeouts',
        risks: ['Complex state management', 'Session invalidation']
    },
    
    // Hard strategies
    {
        name: 'Full Browser Fingerprint Spoofing',
        type: 'fingerprinting',
        difficulty: 'hard',
        effectiveness: 0.9,
        description: 'Spoof complete browser fingerprint including canvas, fonts, etc.',
        implementation: 'Modify WebGL, Canvas, Audio context signatures',
        risks: ['Very complex', 'May cause site functionality issues']
    },
    {
        name: 'Behavioral Pattern Mimicking',
        type: 'behavior',
        difficulty: 'hard',
        effectiveness: 0.85,
        description: 'Simulate realistic mouse movements and scrolling',
        implementation: 'Record and replay human interaction patterns',
        risks: ['High complexity', 'Significant performance overhead']
    },
    {
        name: 'CAPTCHA Solving Integration',
        type: 'captcha',
        difficulty: 'hard',
        effectiveness: 0.8,
        description: 'Integrate with CAPTCHA solving services',
        implementation: 'Use services like 2captcha, Anti-Captcha',
        risks: ['Ongoing costs', 'Potential ToS violations', 'Reliability issues']
    }
];

export class BotBlockingAnalyzer {
    private signatures: BotBlockingSignature[];
    private strategies: EvasionStrategy[];
    
    constructor() {
        this.signatures = BOT_BLOCKING_SIGNATURES;
        this.strategies = EVASION_STRATEGIES;
    }
    
    /**
     * Analyze a single data point for bot blocking
     */
    analyzeDataPoint(dataPoint: DetectionDataPoint): BotBlockingResult {
        logger.debug('Analyzing data point for bot blocking', { url: dataPoint.url });
        
        const detectedSignatures: BotBlockingSignature[] = [];
        
        // Analyze various data sources
        const textContent = this.extractTextContent(dataPoint);
        const headers = dataPoint.httpHeaders || {};
        const title = dataPoint.title || '';
        
        // Check each signature
        for (const signature of this.signatures) {
            if (this.matchesSignature(signature, textContent, headers, title)) {
                detectedSignatures.push(signature);
            }
        }
        
        const isBlocked = detectedSignatures.length > 0;
        const primaryMethod = this.determinePrimaryBlockingMethod(detectedSignatures);
        const riskLevel = this.calculateRiskLevel(detectedSignatures);
        const evasionStrategies = this.recommendEvasionStrategies(detectedSignatures);
        
        return {
            isBlocked,
            signatures: detectedSignatures,
            primaryBlockingMethod: primaryMethod,
            evasionStrategies,
            riskLevel
        };
    }
    
    /**
     * Analyze multiple data points and generate comprehensive report
     */
    generateBlockingReport(dataPoints: DetectionDataPoint[]): BotBlockingReport {
        logger.info('Generating bot blocking report', { dataPointCount: dataPoints.length });
        
        const detailedAnalysis = dataPoints.map(dp => ({
            url: dp.url,
            result: this.analyzeDataPoint(dp)
        }));
        
        const blockedSites = detailedAnalysis.filter(analysis => analysis.result.isBlocked);
        const summary = this.generateSummaryStats(detailedAnalysis);
        const evasionRecommendations = this.categorizeEvasionStrategies(blockedSites);
        
        return {
            summary,
            detailedAnalysis,
            evasionRecommendations
        };
    }
    
    /**
     * Extract all text content for analysis
     */
    private extractTextContent(dataPoint: DetectionDataPoint): string {
        const parts = [
            dataPoint.title || '',
            dataPoint.htmlContent || '',
            JSON.stringify(dataPoint.metaTags || []),
            JSON.stringify(dataPoint.scripts || [])
        ];
        
        return parts.join(' ').toLowerCase();
    }
    
    /**
     * Check if data point matches a bot blocking signature
     */
    private matchesSignature(
        signature: BotBlockingSignature,
        textContent: string,
        headers: Record<string, string>,
        title: string
    ): boolean {
        const headerKeys = Object.keys(headers).join(' ').toLowerCase();
        const headerValues = Object.values(headers).join(' ').toLowerCase();
        const titleLower = title.toLowerCase();
        
        // Check if any indicator is present
        return signature.indicators.some(indicator => {
            const indicatorLower = indicator.toLowerCase();
            return (
                textContent.includes(indicatorLower) ||
                headerKeys.includes(indicatorLower) ||
                headerValues.includes(indicatorLower) ||
                titleLower.includes(indicatorLower)
            );
        });
    }
    
    /**
     * Determine the primary blocking method from detected signatures
     */
    private determinePrimaryBlockingMethod(signatures: BotBlockingSignature[]): string {
        if (signatures.length === 0) return 'none';
        
        // Sort by confidence and return highest confidence method
        signatures.sort((a, b) => b.confidence - a.confidence);
        return signatures[0].name;
    }
    
    /**
     * Calculate overall risk level based on detected signatures
     */
    private calculateRiskLevel(signatures: BotBlockingSignature[]): 'low' | 'medium' | 'high' | 'critical' {
        if (signatures.length === 0) return 'low';
        
        const maxDifficulty = Math.max(...signatures.map(s => {
            switch (s.evasionDifficulty) {
                case 'easy': return 1;
                case 'medium': return 2;
                case 'hard': return 3;
                case 'very_hard': return 4;
                default: return 1;
            }
        }));
        
        const avgConfidence = signatures.reduce((sum, s) => sum + s.confidence, 0) / signatures.length;
        
        if (maxDifficulty >= 4 || avgConfidence >= 0.9) return 'critical';
        if (maxDifficulty >= 3 || avgConfidence >= 0.8) return 'high';
        if (maxDifficulty >= 2 || avgConfidence >= 0.6) return 'medium';
        return 'low';
    }
    
    /**
     * Recommend evasion strategies based on detected blocking methods
     */
    private recommendEvasionStrategies(signatures: BotBlockingSignature[]): EvasionStrategy[] {
        if (signatures.length === 0) return [];
        
        const categories = signatures.map(s => s.category);
        const providers = signatures.map(s => s.provider);
        
        return this.strategies.filter(strategy => {
            // Recommend strategies based on blocking categories detected
            if (categories.includes('captcha') && strategy.type === 'captcha') return true;
            if (categories.includes('rate_limiting') && strategy.type === 'timing') return true;
            if (categories.includes('fingerprinting') && strategy.type === 'fingerprinting') return true;
            if (categories.includes('ip_blocking') && strategy.type === 'proxy') return true;
            if (categories.includes('behavior_analysis') && strategy.type === 'behavior') return true;
            
            // Universal strategies
            if (['user_agent', 'headers'].includes(strategy.type)) return true;
            
            return false;
        }).sort((a, b) => b.effectiveness - a.effectiveness);
    }
    
    /**
     * Generate summary statistics
     */
    private generateSummaryStats(analyses: Array<{ url: string; result: BotBlockingResult }>): BotBlockingReport['summary'] {
        const totalSites = analyses.length;
        const blockedSites = analyses.filter(a => a.result.isBlocked).length;
        const blockingRate = totalSites > 0 ? blockedSites / totalSites : 0;
        
        // Count blocking methods
        const methodCounts = new Map<string, number>();
        const providerCounts = new Map<string, number>();
        
        analyses.forEach(analysis => {
            if (analysis.result.isBlocked) {
                analysis.result.signatures.forEach(signature => {
                    methodCounts.set(signature.name, (methodCounts.get(signature.name) || 0) + 1);
                    providerCounts.set(signature.provider, (providerCounts.get(signature.provider) || 0) + 1);
                });
            }
        });
        
        const topBlockingMethods = Array.from(methodCounts.entries())
            .map(([method, count]) => ({ method, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
            
        const topProviders = Array.from(providerCounts.entries())
            .map(([provider, count]) => ({ provider, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        
        return {
            totalSites,
            blockedSites,
            blockingRate,
            topBlockingMethods,
            topProviders
        };
    }
    
    /**
     * Categorize evasion strategies by difficulty/priority
     */
    private categorizeEvasionStrategies(
        blockedSites: Array<{ url: string; result: BotBlockingResult }>
    ): BotBlockingReport['evasionRecommendations'] {
        // Collect all recommended strategies
        const allStrategies = new Set<EvasionStrategy>();
        blockedSites.forEach(site => {
            site.result.evasionStrategies.forEach(strategy => allStrategies.add(strategy));
        });
        
        const strategies = Array.from(allStrategies);
        
        return {
            immediate: strategies.filter(s => s.difficulty === 'easy').sort((a, b) => b.effectiveness - a.effectiveness),
            advanced: strategies.filter(s => s.difficulty === 'medium').sort((a, b) => b.effectiveness - a.effectiveness),
            experimental: strategies.filter(s => s.difficulty === 'hard').sort((a, b) => b.effectiveness - a.effectiveness)
        };
    }
}