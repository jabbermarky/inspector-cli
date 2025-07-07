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

            // Calculate confidence based on match ratio with minimum threshold
            const baseConfidence = matchCount / this.signatures.length;
            // Ensure minimum confidence of 0.5 if any signature matches
            const minConfidence = matchCount > 0 ? 0.5 : 0;
            const adjustedConfidence = Math.max(minConfidence, baseConfidence * 0.8);
            
            // Special boost for strong Joomla indicators
            let boostedConfidence = adjustedConfidence;
            if (this.cmsName === 'Joomla' && matchCount >= 3) {
                // Strong Joomla evidence - boost confidence
                boostedConfidence = Math.min(0.8, adjustedConfidence + 0.2);
            }

            logger.debug(`HTML content detection completed`, {
                url,
                cms: this.cmsName,
                matchCount,
                totalSignatures: this.signatures.length,
                confidence: boostedConfidence,
                foundSignatures
            });

            return {
                confidence: boostedConfidence,
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