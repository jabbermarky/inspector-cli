import { UrlValidationContext, UrlProtocolError } from './types.js';

/**
 * URL normalization utilities
 */
export class UrlNormalizer {
    private static readonly PROTOCOL_REGEX = /^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//;
    private static readonly DEFAULT_CONTEXT: UrlValidationContext = {
        environment: 'production',
        allowLocalhost: false,
        allowPrivateIPs: false,
        allowCustomPorts: false,
        strictMode: true,
        defaultProtocol: 'http' // Updated to use HTTP as default
    };

    /**
     * Normalize URL by adding protocol if missing
     * @param url The URL to normalize
     * @param context Validation context
     * @returns Normalized URL
     */
    static normalizeUrl(url: string, context?: Partial<UrlValidationContext>): string {
        const ctx = { ...this.DEFAULT_CONTEXT, ...context };
        
        if (!url || typeof url !== 'string') {
            throw new UrlProtocolError('URL must be a non-empty string', { url });
        }

        const trimmedUrl = url.trim();
        
        // Check if protocol is already present
        if (this.hasProtocol(trimmedUrl)) {
            return trimmedUrl;
        }

        // Add default protocol (HTTP as per revised plan)
        return `${ctx.defaultProtocol}://${trimmedUrl}`;
    }

    /**
     * Check if URL has a protocol
     * @param url URL to check
     * @returns True if protocol is present
     */
    static hasProtocol(url: string): boolean {
        return this.PROTOCOL_REGEX.test(url);
    }

    /**
     * Extract protocol from URL
     * @param url URL to parse
     * @returns Protocol string (e.g., 'http:', 'https:')
     */
    static extractProtocol(url: string): string | null {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol;
        } catch {
            return null;
        }
    }

    /**
     * Remove protocol from URL
     * @param url URL to process
     * @returns URL without protocol
     */
    static removeProtocol(url: string): string {
        return url.replace(this.PROTOCOL_REGEX, '');
    }

    /**
     * Upgrade HTTP to HTTPS
     * @param url URL to upgrade
     * @returns HTTPS URL
     */
    static upgradeToHttps(url: string): string {
        if (url.startsWith('http://')) {
            return url.replace('http://', 'https://');
        }
        return url;
    }

    /**
     * Downgrade HTTPS to HTTP
     * @param url URL to downgrade
     * @returns HTTP URL
     */
    static downgradeToHttp(url: string): string {
        if (url.startsWith('https://')) {
            return url.replace('https://', 'http://');
        }
        return url;
    }

    /**
     * Clean URL by removing fragments and unnecessary query parameters
     * @param url URL to clean
     * @param preserveQuery Whether to preserve query parameters
     * @returns Cleaned URL
     */
    static cleanUrl(url: string, preserveQuery: boolean = true): string {
        try {
            const urlObj = new URL(url);
            
            // Remove fragment
            urlObj.hash = '';
            
            // Optionally remove query parameters
            if (!preserveQuery) {
                urlObj.search = '';
            }
            
            return urlObj.href;
        } catch {
            return url; // Return original if parsing fails
        }
    }

    /**
     * Normalize domain to lowercase
     * @param url URL to normalize
     * @returns URL with lowercase domain
     */
    static normalizeDomain(url: string): string {
        try {
            const urlObj = new URL(url);
            urlObj.hostname = urlObj.hostname.toLowerCase();
            return urlObj.href;
        } catch {
            return url; // Return original if parsing fails
        }
    }
}