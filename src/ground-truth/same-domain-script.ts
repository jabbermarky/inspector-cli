/**
 * Check if a script URL belongs to the same domain as the target URL
 * 
 * @param scriptUrl - The script URL to check
 * @param targetUrl - The target URL to compare against
 * @returns true if script belongs to same domain, false otherwise
 * 
 */
export function isSameDomainScript(scriptUrl: string, targetUrl: string): boolean {
    try {
        // If script URL is relative, it's same domain
        if (!scriptUrl.startsWith('http')) {
            return true;
        }

        const scriptDomain = new URL(scriptUrl).hostname.toLowerCase();
        const targetDomain = new URL(targetUrl).hostname.toLowerCase();

        // Check exact match first
        if (scriptDomain === targetDomain) {
            return true;
        }

        // Handle www vs non-www variations
        // www.example.com and example.com should be considered the same
        const scriptWithoutWww = scriptDomain.replace(/^www\./, '');
        const targetWithoutWww = targetDomain.replace(/^www\./, '');
        
        // Both domains without www should match
        return scriptWithoutWww === targetWithoutWww;
    } catch {
        // If URL parsing fails, assume it's not same domain
        return false;
    }
}