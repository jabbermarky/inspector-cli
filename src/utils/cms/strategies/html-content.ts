import { DetectionStrategy, DetectionPage, PartialDetectionResult } from '../types.js';
import { createModuleLogger } from '../../logger.js';

const logger = createModuleLogger('cms-html-content-strategy');

/**
 * Detects CMS by scanning HTML content for specific signatures
 */
export class HtmlContentStrategy implements DetectionStrategy {
    constructor(
        private readonly signatures: string[],
        private readonly cmsName: string,
        private readonly timeout: number = 4000
    ) {}

    getName(): string {
        return 'html-content';
    }

    getTimeout(): number {
        return this.timeout;
    }

    async detect(page: DetectionPage, url: string): Promise<PartialDetectionResult> {
        try {
            logger.debug(`Executing HTML content strategy for ${this.cmsName}`, { 
                url, 
                signatures: this.signatures.length 
            });

            // Get page HTML content
            const html = await page.content();
            
            // Count signature matches
            let matchCount = 0;
            const foundSignatures: string[] = [];

            for (const signature of this.signatures) {
                if (html.includes(signature)) {
                    matchCount++;
                    foundSignatures.push(signature);
                }
            }

            // Calculate confidence based on match ratio
            const confidence = matchCount / this.signatures.length;
            const adjustedConfidence = confidence * 0.8; // HTML content is less reliable than meta tags

            logger.debug(`HTML content detection completed`, {
                url,
                cms: this.cmsName,
                matchCount,
                totalSignatures: this.signatures.length,
                confidence: adjustedConfidence,
                foundSignatures
            });

            return {
                confidence: adjustedConfidence,
                method: this.getName()
            };

        } catch (error) {
            logger.warn(`HTML content detection failed`, {
                url,
                cms: this.cmsName,
                error: (error as Error).message
            });

            return {
                confidence: 0,
                method: this.getName(),
                error: 'Failed to retrieve HTML content'
            };
        }
    }
}