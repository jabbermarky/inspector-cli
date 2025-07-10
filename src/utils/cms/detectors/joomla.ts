import { BaseCMSDetector } from './base.js';
import { DetectionStrategy, CMSType } from '../types.js';
import { MetaTagStrategy } from '../strategies/meta-tag.js';
import { HtmlContentStrategy } from '../strategies/html-content.js';
import { HttpHeaderStrategy } from '../strategies/http-headers.js';
import { RobotsTxtStrategy, JOOMLA_ROBOTS_PATTERNS } from '../strategies/robots-txt.js';

/**
 * Joomla CMS detector with Joomla-specific detection strategies
 */
export class JoomlaDetector extends BaseCMSDetector {
    protected strategies: DetectionStrategy[] = [
        new MetaTagStrategy('Joomla', 3000),
        new HtmlContentStrategy([
            'content="Joomla!',
            'joomla',
            '/administrator/',
            '/components/',
            '/modules/',
            '/templates/',
            'Joomla.JText',
            'joomla-cms',
            'joomla-script-options new',  // 100% confidence Joomla signal
            '/media/jui/js/'  // Joomla UI library path
        ], 'Joomla', 4000),
        new HttpHeaderStrategy([
            {
                name: 'X-Content-Encoded-By',
                pattern: /Joomla/i,
                confidence: 0.95,
                extractVersion: false,
                searchIn: 'value'
            },
            {
                name: '*', // Search all headers
                pattern: 'Joomla',
                confidence: 0.7,
                searchIn: 'both'
            },
            {
                name: 'X-Generator',
                pattern: /Joomla\s*(\d+(?:\.\d+)*)/i,
                confidence: 0.9,
                extractVersion: true,
                searchIn: 'value'
            }
        ], 'Joomla', 5000),
        new RobotsTxtStrategy(JOOMLA_ROBOTS_PATTERNS, 'Joomla', 3000)
    ];

    getCMSName(): CMSType {
        return 'Joomla';
    }

    getStrategies(): DetectionStrategy[] {
        return this.strategies;
    }

    /**
     * Override strategy weights for Joomla-specific detection
     */
    protected getStrategyWeight(method: string): number {
        const weights: Record<string, number> = {
            'meta-tag': 1.0,          // Highest confidence
            'http-headers': 0.95,     // Very high confidence for headers like X-Content-Encoded-By
            'robots-txt': 0.9,        // Very high confidence for /administrator/ pattern
            'html-content': 0.8       // Good confidence for Joomla signatures
        };
        return weights[method] || 0.5;
    }
}