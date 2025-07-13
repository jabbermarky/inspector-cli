import { UrlNormalizer } from '../utils/url/index.js';

    /**
     * Normalize URL for data file search to handle different URL formats
     * Removes protocol, www prefix, and trailing slashes for consistent matching
     */
    export function normalizeUrlForDataFileSearch(url: string): string {
        if (!url) return '';

        try {
            let normalized = url.toLowerCase().trim();

            // Remove protocol
            normalized = normalized.replace(/^https?:\/\//, '');

            // Remove www prefix
            normalized = normalized.replace(/^www\./, '');

            // Remove trailing slash
            normalized = normalized.replace(/\/$/, '');

            // Remove port numbers (common defaults)
            normalized = normalized.replace(/:80$/, '').replace(/:443$/, '');

            return normalized;
        } catch {
            // If any parsing fails, return the original URL
            return url;
        }
    }


export function normalizeUrlForGroundTruth(url: string): string {
    try {
        // First use the existing URL normalizer to add protocol
        const normalized = UrlNormalizer.normalizeUrl(url, { defaultProtocol: 'https' });

        // Additional normalization for ground truth deduplication
        const urlObj = new URL(normalized);

        // Normalize to https (most sites support it)
        urlObj.protocol = 'https:';

        // Add www if missing for common domains (avoid IP addresses and localhost)
        if (
            !urlObj.hostname.startsWith('www.') &&
            !urlObj.hostname.includes('localhost') &&
            !urlObj.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)
        ) {
            // not IP address
            urlObj.hostname = 'www.' + urlObj.hostname;
        }

        // Remove trailing slash from path
        if (urlObj.pathname === '/') {
            urlObj.pathname = '';
        }

        // Remove default ports
        if (
            (urlObj.protocol === 'https:' && urlObj.port === '443') ||
            (urlObj.protocol === 'http:' && urlObj.port === '80')
        ) {
            urlObj.port = '';
        }

        // Use existing cleanUrl and normalizeDomain utilities
        let result = UrlNormalizer.cleanUrl(urlObj.toString(), false); // Remove query params
        result = UrlNormalizer.normalizeDomain(result);

        return result.replace(/\/$/, ''); // Remove final trailing slash
    } catch {
        // If URL parsing fails, return original
        return url;
    }
}
