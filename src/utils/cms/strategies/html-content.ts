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
            
            // Count signature matches with domain validation
            let matchCount = 0;
            const foundSignatures: string[] = [];

            for (const signature of this.signatures) {
                const matches = this.findValidSignatureMatches(html, signature, url);
                if (matches > 0) {
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

    /**
     * Find valid signature matches that belong to the same domain as the target URL
     */
    private findValidSignatureMatches(html: string, signature: string, targetUrl: string): number {
        // For non-URL signatures (like 'wordpress', 'joomla'), use simple string matching
        if (!signature.includes('/') && !signature.includes('wp-') && !signature.includes('drupal')) {
            return html.includes(signature) ? 1 : 0;
        }

        // For URL-based signatures, validate they belong to the same domain
        if (signature.startsWith('/wp-') || signature.startsWith('/sites/') || 
            signature.startsWith('/administrator/') || signature.startsWith('/components/') ||
            signature.startsWith('/modules/') || signature.startsWith('/templates/') ||
            signature.startsWith('/media/')) {
            
            return this.countSameDomainMatches(html, signature, targetUrl);
        }

        // For other patterns, use simple matching
        return html.includes(signature) ? 1 : 0;
    }

    /**
     * Count matches of URL patterns that belong to the same domain
     */
    private countSameDomainMatches(html: string, pattern: string, targetUrl: string): number {
        const targetDomain = this.extractDomain(targetUrl);
        let validMatches = 0;

        // Create regex to find URLs containing the pattern
        const urlRegex = new RegExp(`https?://[^\\s"']+${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s"']*`, 'gi');
        const matches = html.match(urlRegex);

        if (matches) {
            for (const match of matches) {
                const matchDomain = this.extractDomain(match);
                if (this.isSameDomain(targetDomain, matchDomain)) {
                    validMatches++;
                }
            }
        }

        // Also check for relative URLs (which implicitly belong to the same domain)
        const relativeRegex = new RegExp(`${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
        let match;
        
        while ((match = relativeRegex.exec(html)) !== null) {
            const matchIndex = match.index;
            
            // Check 50 characters before the match for protocol indicators
            const contextStart = Math.max(0, matchIndex - 50);
            const beforeContext = html.substring(contextStart, matchIndex);
            
            // If there's a protocol (http:// or https://) in the context before this match,
            // it means this is part of an absolute URL, so skip it
            if (beforeContext.includes('http://') || beforeContext.includes('https://')) {
                continue;
            }
            
            // This appears to be a relative URL, count it
            validMatches++;
        }

        return validMatches;
    }

    /**
     * Extract domain from URL
     */
    private extractDomain(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.toLowerCase();
        } catch {
            return '';
        }
    }

    /**
     * Check if two domains are the same
     */
    private isSameDomain(domain1: string, domain2: string): boolean {
        // Only exact matches are considered the same domain
        // blog.example.com and example.com are DIFFERENT domains
        return domain1 === domain2;
    }
}