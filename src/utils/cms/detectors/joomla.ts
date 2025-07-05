import { BaseCMSDetector } from './base.js';
import { DetectionStrategy, CMSType } from '../types.js';
import { MetaTagStrategy } from '../strategies/meta-tag.js';
import { HtmlContentStrategy } from '../strategies/html-content.js';

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
            'joomla-cms'
        ], 'Joomla', 4000)
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
            'html-content': 0.8       // Good confidence for Joomla signatures
        };
        return weights[method] || 0.5;
    }
}