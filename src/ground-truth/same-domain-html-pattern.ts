import { extractDomain, isSameDomain } from './domain-utils.js';

/**
 * Functions for checking same-domain HTML patterns
 * 
 */

/**
 * Check if HTML content contains same-domain references to a pattern
 * 
 * @param htmlContent - The HTML content to search
 * @param pattern - The pattern to search for (e.g., 'wp-content', 'wp-json')
 * @param targetUrl - The target URL to compare domains against
 * @returns true if same-domain pattern found, false otherwise
 */
export function hasSameDomainHtmlPattern(
    htmlContent: string,
    pattern: string,
    targetUrl: string
): boolean {
    if (!htmlContent) return false;

    const targetDomain = extractDomain(targetUrl);

    // Look for URLs containing the pattern
    const urlRegex = new RegExp(
        `https?://[^\\s"']+${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s"']*`,
        'gi'
    );
    const matches = htmlContent.match(urlRegex);

    if (matches) {
        for (const match of matches) {
            const matchDomain = extractDomain(match);
            if (isSameDomain(targetDomain, matchDomain)) {
                return true;
            }
        }
    }

    // Also check for relative URLs (which implicitly belong to the same domain)
    const relativeRegex = new RegExp(`/${pattern}`, 'gi');
    let match;

    while ((match = relativeRegex.exec(htmlContent)) !== null) {
        const matchIndex = match.index;

        // Check 50 characters before the match for protocol indicators
        const contextStart = Math.max(0, matchIndex - 50);
        const beforeContext = htmlContent.substring(contextStart, matchIndex);

        // If there's a protocol (http:// or https://) in the context before this match,
        // it means this is part of an absolute URL, so skip it
        if (beforeContext.includes('http://') || beforeContext.includes('https://')) {
            continue;
        }

        // This appears to be a genuine relative URL, return true
        return true;
    }

    return false;
}

/**
 * Count same-domain HTML pattern matches
 * 
 * @param htmlContent - The HTML content to search
 * @param pattern - The pattern to search for
 * @param targetUrl - The target URL to compare domains against
 * @returns number of same-domain pattern matches
 */
export function countSameDomainHtmlPatterns(
    htmlContent: string,
    pattern: string,
    targetUrl: string
): number {
    if (!htmlContent) return 0;

    const targetDomain = extractDomain(targetUrl);
    let count = 0;

    // Look for URLs containing the pattern
    const urlRegex = new RegExp(
        `https?://[^\\s"']+${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s"']*`,
        'gi'
    );
    const matches = htmlContent.match(urlRegex);

    if (matches) {
        for (const match of matches) {
            const matchDomain = extractDomain(match);
            if (isSameDomain(targetDomain, matchDomain)) {
                count++;
            }
        }
    }

    // Also count relative URLs (which implicitly belong to the same domain)
    const relativeRegex = new RegExp(`/${pattern}`, 'gi');
    let match;

    while ((match = relativeRegex.exec(htmlContent)) !== null) {
        const matchIndex = match.index;

        // Check context before the match for protocol indicators
        // Look back for the start of the URL (quotes, spaces, or line boundaries)
        const contextStart = Math.max(0, matchIndex - 100);
        const beforeContext = htmlContent.substring(contextStart, matchIndex);

        // Find the last URL boundary before our match
        const lastQuote = Math.max(
            beforeContext.lastIndexOf('"'),
            beforeContext.lastIndexOf("'")
        );
        const lastSpace = Math.max(
            beforeContext.lastIndexOf(' '),
            beforeContext.lastIndexOf('\t'),
            beforeContext.lastIndexOf('\n')
        );
        const lastBoundary = Math.max(lastQuote, lastSpace, 0);

        // Get the text from the last boundary to our match
        const urlCandidate = beforeContext.substring(lastBoundary).trim().replace(/^["']/, '');

        // If this URL candidate contains a protocol, it's an absolute URL
        if (urlCandidate.includes('://')) {
            continue;
        }

        // This appears to be a genuine relative URL, count it
        count++;
    }

    return count;
}