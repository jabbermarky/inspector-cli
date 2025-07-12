/**
 * Utility functions for domain extraction and comparison
 * 
 * These are simple utility functions that can be grouped together.
 */

/**
 * Extract domain from URL for HTML pattern matching
 * 
 * @param url - The URL to extract domain from
 * @returns lowercase hostname or empty string if parsing fails
 */
export function extractDomain(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.toLowerCase();
    } catch {
        return '';
    }
}

/**
 * Check if two domains are the same for HTML pattern matching
 * 
 * @param domain1 - First domain to compare
 * @param domain2 - Second domain to compare
 * @returns true if domains are exactly the same, false otherwise
 * 
 * Note: Only exact matches are considered the same domain
 * blog.example.com and example.com are DIFFERENT domains
 */
export function isSameDomain(domain1: string, domain2: string): boolean {
    // Only exact matches are considered the same domain
    // blog.example.com and example.com are DIFFERENT domains
    return domain1 === domain2;
}