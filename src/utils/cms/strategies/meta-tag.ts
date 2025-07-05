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

            // Look for generator meta tag
            const metaContent = await page.$eval(
                'meta[name="generator"]',
                (el) => (el as HTMLMetaElement).content.toLowerCase()
            );

            if (metaContent.includes(this.targetCMS.toLowerCase())) {
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
            new RegExp(`${this.targetCMS}\\s*[:\\/]?\\s*v?([0-9]+(?:\\.[0-9]+)*(?:\\.[0-9]+)?)`, 'i'),
            /version[:\\/\s]*v?([0-9]+(?:\.[0-9]+)*(?:\.[0-9]+)?)/i,
            /v?([0-9]+(?:\.[0-9]+)*(?:\.[0-9]+)?)/i
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