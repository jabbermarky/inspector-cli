import { BaseCMSDetector } from './base.js';
import { DetectionStrategy, CMSType, PartialDetectionResult, DetectionPage } from '../types.js';
import { MetaTagStrategy } from '../strategies/meta-tag.js';
import { HtmlContentStrategy } from '../strategies/html-content.js';
import { HttpHeaderStrategy } from '../strategies/http-headers.js';
import { createModuleLogger } from '../../logger.js';
import { 
    DUDA_HIGH_CONFIDENCE_PATTERNS,
    DUDA_MEDIUM_CONFIDENCE_PATTERNS,
    DUDA_PATTERN_CONFIDENCE
} from '../patterns/duda.js';

const logger = createModuleLogger('cms-duda-detector');

/**
 * Duda-specific JavaScript pattern detection strategy
 */
class DudaJavaScriptStrategy implements DetectionStrategy {
    private readonly timeout = 6000; // Longer timeout for JavaScript analysis

    getName(): string {
        return 'duda-javascript';
    }

    getTimeout(): number {
        return this.timeout;
    }

    async detect(page: DetectionPage, url: string): Promise<PartialDetectionResult> {
        try {
            logger.debug('Executing Duda JavaScript detection', { url });

            // Get HTML content for JavaScript analysis
            const html = await page.content();
            
            // Extract all script contents and analyze
            const scripts = await page.evaluate(() => {
                const scriptElements = Array.from(document.querySelectorAll('script'));
                return scriptElements.map(script => ({
                    src: script.src || null,
                    content: script.textContent || script.innerHTML || null
                }));
            });

            const detectionResults = this.analyzeForDudaPatterns(html, scripts);
            
            const confidence = this.calculateConfidence(detectionResults);
            const evidence = detectionResults.map(r => r.pattern);

            logger.debug('Duda JavaScript detection completed', {
                url,
                confidence,
                evidenceCount: evidence.length
            });

            return {
                confidence,
                method: this.getName(),
                evidence
            };

        } catch (error) {
            logger.warn('Duda JavaScript detection failed', {
                url,
                error: (error as Error).message
            });

            return {
                confidence: 0,
                method: this.getName(),
                error: 'JavaScript analysis failed'
            };
        }
    }

    /**
     * Analyze HTML and scripts for Duda-specific patterns
     */
    private analyzeForDudaPatterns(html: string, scripts: any[]): Array<{pattern: string, confidence: number}> {
        const results: Array<{pattern: string, confidence: number}> = [];
        const htmlLower = html.toLowerCase();

        // Check high-confidence JavaScript patterns
        for (const [key, pattern] of Object.entries(DUDA_HIGH_CONFIDENCE_PATTERNS)) {
            const found = scripts.some(script => 
                script.content && script.content.includes(pattern)
            ) || htmlLower.includes(pattern.toLowerCase());

            if (found) {
                results.push({
                    pattern: `${key}: ${pattern}`,
                    confidence: DUDA_PATTERN_CONFIDENCE[pattern] || 0.9
                });
            }
        }

        // Check medium-confidence patterns
        for (const [key, pattern] of Object.entries(DUDA_MEDIUM_CONFIDENCE_PATTERNS)) {
            const patternLower = pattern.toLowerCase();
            const found = scripts.some(script => 
                (script.src && script.src.includes(pattern)) ||
                (script.content && script.content.toLowerCase().includes(patternLower))
            ) || htmlLower.includes(patternLower);

            if (found) {
                results.push({
                    pattern: `${key}: ${pattern}`,
                    confidence: DUDA_PATTERN_CONFIDENCE[pattern] || 0.7
                });
            }
        }

        return results;
    }

    /**
     * Calculate overall confidence based on detected patterns
     */
    private calculateConfidence(results: Array<{pattern: string, confidence: number}>): number {
        if (results.length === 0) return 0;

        // Weight by pattern confidence and apply diminishing returns
        const totalWeight = results.reduce((sum, result) => sum + result.confidence, 0);
        const averageConfidence = totalWeight / results.length;
        
        // Boost confidence if multiple high-confidence patterns found
        const highConfidenceCount = results.filter(r => r.confidence >= 0.9).length;
        const boost = Math.min(highConfidenceCount * 0.1, 0.3);
        
        return Math.min(averageConfidence + boost, 1.0);
    }
}

/**
 * Duda Website Builder CMS detector
 */
export class DudaDetector extends BaseCMSDetector {
    protected strategies: DetectionStrategy[] = [
        new MetaTagStrategy('Duda', 3000),
        new DudaJavaScriptStrategy(),
        new HtmlContentStrategy([
            'irp.cdn-website.com',
            'lirp.cdn-website.com', 
            'dudamobile.com',
            'duda_website_builder',
            '_duda_',
            'dmalbum',
            'dmrespimg'
        ], 'Duda', 5000),
        new HttpHeaderStrategy([
            {
                name: '*', // Search all headers
                pattern: /duda/i,
                confidence: 0.8,
                extractVersion: false,
                searchIn: 'both'
            },
            {
                name: 'X-Powered-By',
                pattern: /duda/i,
                confidence: 0.9,
                extractVersion: false,
                searchIn: 'value'
            }
        ], 'Duda', 4000)
    ];

    getCMSName(): CMSType {
        return 'Duda';
    }

    getStrategies(): DetectionStrategy[] {
        return this.strategies;
    }

    /**
     * Override strategy weights for Duda-specific detection
     */
    protected getStrategyWeight(method: string): number {
        const weights: Record<string, number> = {
            'meta-tag': 1.0,           // Highest confidence - meta generator tag is definitive  
            'duda-javascript': 1.0,    // Highest confidence - Duda's JavaScript patterns are unique
            'html-content': 0.8,       // Good confidence for Duda signatures
            'http-headers': 0.7        // Lower confidence for header patterns
        };
        return weights[method] || 0.5;
    }
}