import { DetectionStrategy, DetectionPage, PartialDetectionResult } from '../types.js';
import { createModuleLogger } from '../../logger.js';

const logger = createModuleLogger('cms-meta-tag-strategy');

/**
 * Detects CMS by analyzing meta generator tags
 */
export class MetaTagStrategy implements DetectionStrategy {
    constructor(
        private readonly targetCMS: string,
        private readonly timeout: number = 3000
    ) {}

    getName(): string {
        return 'meta-tag';
    }

    getTimeout(): number {
        return this.timeout;
    }

    async detect(page: DetectionPage, url: string): Promise<PartialDetectionResult> {
        try {
            logger.debug(`Executing meta tag strategy for ${this.targetCMS}`, { url });

            // Robust, case-insensitive search for meta[name="generator"]
            const metaContent: string = await page.evaluate(() => {
                const metas = Array.from(document.getElementsByTagName('meta'));
                const generatorMeta = metas.find(
                    m => m.getAttribute('name')?.toLowerCase() === 'generator'
                );
                return generatorMeta?.getAttribute('content') || '';
            });

            logger.debug(`Meta tag content found`, {
                url,
                cms: this.targetCMS,
                metaContent
            });

            // Case-insensitive CMS match
            if (
                metaContent &&
                metaContent.toLowerCase().includes(this.targetCMS.toLowerCase())
            ) {
                const version = this.extractVersion(metaContent);

                logger.debug(`Meta tag detection successful`, {
                    url,
                    cms: this.targetCMS,
                    metaContent,
                    version
                });

                return {
                    confidence: 0.95, // Very high confidence for meta tags
                    version,
                    method: this.getName()
                };
            }

            logger.debug(`Meta tag detection failed - CMS not found`, {
                url,
                cms: this.targetCMS,
                metaContent
            });

            return {
                confidence: 0,
                method: this.getName()
            };

        } catch (error) {
            logger.debug(`Meta tag detection failed - no meta tag found`, {
                url,
                cms: this.targetCMS,
                error: (error as Error).message
            });

            return {
                confidence: 0,
                method: this.getName(),
                error: 'Meta generator tag not found'
            };
        }
    }

    /**
     * Extract version from meta content
     */
    private extractVersion(metaContent: string): string | undefined {
        // Common patterns for version extraction
        const patterns = [
            // e.g. "WordPress 5.9", "Drupal 10.1.5", "Joomla! 4.2.3"
            new RegExp(`${this.targetCMS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[!\\s:-]*v?([0-9]+(?:\\.[0-9]+)*)`, 'i'),
            /version[:\-/\s]*v?([0-9]+(?:\.[0-9]+)*)/i,
            /v?([0-9]+(?:\.[0-9]+)*)/i
        ];

        for (const pattern of patterns) {
            const match = metaContent.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return undefined;
    }
}
