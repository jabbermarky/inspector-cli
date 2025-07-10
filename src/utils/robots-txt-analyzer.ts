import { createModuleLogger } from './logger.js';
import { joinUrl } from './url/index.js';
import { withRetry } from './retry.js';

const logger = createModuleLogger('robots-txt-analyzer');

export interface RobotsTxtAnalysis {
    cms: 'WordPress' | 'Drupal' | 'Joomla' | 'Unknown';
    confidence: number;
    version?: string;
    signals: string[];
    headers: Record<string, string>;
    content: string;
    url: string;
    error?: string;
}

export class RobotsTxtAnalyzer {
    private userAgent = 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)';

    async analyze(url: string): Promise<RobotsTxtAnalysis> {
        const robotsUrl = this.buildRobotsUrl(url);
        
        try {
            const response = await withRetry(async () => {
                logger.debug(`Fetching robots.txt from: ${robotsUrl}`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                try {
                    const response = await fetch(robotsUrl, {
                        headers: {
                            'User-Agent': this.userAgent,
                            'Accept': 'text/plain, */*',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'DNT': '1',
                            'Connection': 'keep-alive',
                            'Upgrade-Insecure-Requests': '1'
                        },
                        signal: controller.signal
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    return response;
                } finally {
                    clearTimeout(timeoutId);
                }
            });

            const content = await response.text();
            const headers = this.extractHeaders(response);
            
            logger.debug(`Successfully fetched robots.txt (${content.length} bytes)`);
            
            return this.analyzeContent(robotsUrl, content, headers);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to analyze robots.txt: ${errorMessage}`);
            return {
                cms: 'Unknown',
                confidence: 0,
                signals: [],
                headers: {},
                content: '',
                url: robotsUrl,
                error: errorMessage
            };
        }
    }

    private buildRobotsUrl(url: string): string {
        return joinUrl(url, '/robots.txt');
    }

    private extractHeaders(response: Response): Record<string, string> {
        const headers: Record<string, string> = {};
        
        response.headers.forEach((value, key) => {
            headers[key.toLowerCase()] = value;
        });
        
        return headers;
    }

    private analyzeContent(url: string, content: string, headers: Record<string, string>): RobotsTxtAnalysis {
        const analysis: RobotsTxtAnalysis = {
            cms: 'Unknown',
            confidence: 0,
            signals: [],
            headers,
            content,
            url
        };

        const lowerContent = content.toLowerCase();
        
        // Drupal detection patterns
        const drupalPatterns = [
            { pattern: '/core/', signal: 'Drupal 8+ core directory', confidence: 0.9 },
            { pattern: '/profiles/', signal: 'Drupal profiles directory', confidence: 0.8 },
            { pattern: '/sites/', signal: 'Drupal sites directory', confidence: 0.7 },
            { pattern: '/modules/', signal: 'Drupal modules directory', confidence: 0.6 },
            { pattern: '/themes/', signal: 'Drupal themes directory', confidence: 0.5 },
            { pattern: '/misc/', signal: 'Drupal misc directory (legacy)', confidence: 0.4 }
        ];

        // WordPress detection patterns
        const wordpressPatterns = [
            { pattern: '/wp-admin/', signal: 'WordPress admin directory', confidence: 0.9 },
            { pattern: '/wp-content/', signal: 'WordPress content directory', confidence: 0.9 },
            { pattern: '/wp-includes/', signal: 'WordPress includes directory', confidence: 0.8 },
            { pattern: '/wp-json/', signal: 'WordPress REST API', confidence: 0.7 },
            { pattern: 'wp-login.php', signal: 'WordPress login page', confidence: 0.6 },
            // Additional WordPress patterns for better detection
            { pattern: 'wp-admin/admin-ajax.php', signal: 'WordPress AJAX endpoint', confidence: 0.8 },
            { pattern: '/feed/', signal: 'WordPress RSS feeds', confidence: 0.4 },
            { pattern: 'sitemap_index.xml', signal: 'WordPress sitemap (common)', confidence: 0.3 }
        ];

        // Joomla detection patterns
        const joomlaPatterns = [
            { pattern: '/administrator/', signal: 'Joomla administrator directory', confidence: 0.9 },
            { pattern: '/components/', signal: 'Joomla components directory', confidence: 0.8 },
            { pattern: '/modules/', signal: 'Joomla modules directory', confidence: 0.7 },
            { pattern: '/templates/', signal: 'Joomla templates directory', confidence: 0.6 },
            { pattern: '/media/', signal: 'Joomla media directory', confidence: 0.5 },
            { pattern: '/cache/', signal: 'Joomla cache directory', confidence: 0.4 }
        ];

        // Analyze patterns for each CMS
        const drupalScore = this.calculateScore(lowerContent, drupalPatterns, analysis.signals);
        const wordpressScore = this.calculateScore(lowerContent, wordpressPatterns, analysis.signals);
        const joomlaScore = this.calculateScore(lowerContent, joomlaPatterns, analysis.signals);

        // Determine CMS based on highest score
        const maxScore = Math.max(drupalScore, wordpressScore, joomlaScore);
        
        if (maxScore > 0.3) {
            if (drupalScore === maxScore) {
                analysis.cms = 'Drupal';
                analysis.confidence = drupalScore;
            } else if (wordpressScore === maxScore) {
                analysis.cms = 'WordPress';
                analysis.confidence = wordpressScore;
            } else {
                analysis.cms = 'Joomla';
                analysis.confidence = joomlaScore;
            }
        }

        // Try to extract version information
        analysis.version = this.extractVersion(content, analysis.cms);

        // Special handling for WordPress plugin indicators
        if (analysis.cms === 'Unknown' && this.detectWordPressPlugins(content)) {
            analysis.cms = 'WordPress';
            analysis.confidence = 0.7; // Medium confidence for plugin-based detection
            analysis.signals.push('WordPress plugin patterns detected');
        }

        logger.debug(`Robots.txt analysis complete: ${analysis.cms} (${(analysis.confidence * 100).toFixed(1)}%)`);
        
        return analysis;
    }

    private calculateScore(content: string, patterns: Array<{pattern: string, signal: string, confidence: number}>, signals: string[]): number {
        let totalScore = 0;
        let patternCount = 0;
        let cmsSpecificCount = 0;
        let sharedPatternPenalty = 0;

        // Shared patterns that appear in multiple CMS types (lower specificity)
        const sharedPatterns = ['/modules/', '/themes/', '/media/', '/cache/'];
        
        for (const { pattern, signal, confidence } of patterns) {
            // More precise pattern matching for directory patterns
            const isDirectoryPattern = this.isDirectoryPattern(content, pattern);
            
            if (isDirectoryPattern) {
                signals.push(signal);
                totalScore += confidence;
                patternCount++;
                
                // Track CMS-specific vs shared patterns
                if (sharedPatterns.includes(pattern)) {
                    sharedPatternPenalty += 0.2; // Reduce confidence for shared patterns
                } else {
                    cmsSpecificCount++; // Count CMS-specific patterns
                }
            }
        }

        if (patternCount === 0) {
            return 0;
        }

        // Calculate base score (average confidence)
        const baseScore = totalScore / patternCount;
        
        // Apply bonuses and penalties
        // Signal count bonus: More patterns = higher confidence
        const signalCountBonus = Math.min(patternCount * 0.1, 0.3); // Max 30% bonus
        
        // CMS-specific pattern bonus: Reward unique patterns
        const specificityBonus = cmsSpecificCount > 0 ? Math.min(cmsSpecificCount * 0.15, 0.3) : 0;
        
        // Shared pattern penalty: Reduce confidence for generic patterns
        const sharedPenalty = Math.min(sharedPatternPenalty, 0.4); // Max 40% penalty
        
        // Legacy pattern recognition: Detect old Drupal patterns
        const legacyDrupalBonus = this.detectLegacyDrupal(content, signals) ? 0.2 : 0;
        
        // Final score calculation
        const finalScore = baseScore + signalCountBonus + specificityBonus - sharedPenalty + legacyDrupalBonus;
        
        return Math.max(0, Math.min(1, finalScore)); // Clamp between 0 and 1
    }
    
    private detectLegacyDrupal(content: string, signals: string[]): boolean {
        // Legacy Drupal 7 pattern: /misc/ + /profiles/ + /modules/ + /themes/ (but no /core/)
        const hasLegacyPatterns = content.includes('/misc/') && 
                                 content.includes('/profiles/') && 
                                 content.includes('/modules/') && 
                                 content.includes('/themes/');
        
        const hasModernCore = content.includes('/core/');
        
        // If we have legacy patterns but no modern /core/, it's likely legacy Drupal
        if (hasLegacyPatterns && !hasModernCore) {
            signals.push('Legacy Drupal 7 pattern detected');
            return true;
        }
        
        return false;
    }

    private detectWordPressPlugins(content: string): boolean {
        // Detect WordPress-specific plugin patterns in robots.txt
        const wordPressPluginIndicators = [
            'YOAST BLOCK',
            'END YOAST BLOCK',
            'wp-admin/admin-ajax.php',
            'RankMath',
            'All in One SEO',
            'wp-sitemap.xml',
            'wordpress.org',
            '/wp-json/',
            '/xmlrpc.php'
        ];
        
        const lowerContent = content.toLowerCase();
        
        return wordPressPluginIndicators.some(indicator => 
            lowerContent.includes(indicator.toLowerCase())
        );
    }

    private extractVersion(content: string, cms: string): string | undefined {
        // Version extraction patterns are limited in robots.txt
        // Most version info would be in comments or specific patterns
        
        if (cms === 'Drupal') {
            // Look for Drupal version hints in comments
            const drupalMatch = content.match(/drupal[.\s]*(\d+\.\d+)/i);
            if (drupalMatch) {
                return drupalMatch[1];
            }
        }
        
        if (cms === 'WordPress') {
            // Look for WordPress version hints in comments
            const wpMatch = content.match(/wordpress[.\s]*(\d+\.\d+)/i);
            if (wpMatch) {
                return wpMatch[1];
            }
        }
        
        if (cms === 'Joomla') {
            // Look for Joomla version hints in comments
            const joomlaMatch = content.match(/joomla[.\s]*(\d+\.\d+)/i);
            if (joomlaMatch) {
                return joomlaMatch[1];
            }
        }
        
        return undefined;
    }

    private isDirectoryPattern(content: string, pattern: string): boolean {
        // For more precise pattern matching, look for directory patterns specifically
        // Pattern should appear after "Disallow:" or "Allow:" and be a root directory
        
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim().toLowerCase();
            
            // Check if this is a disallow/allow directive
            if (trimmedLine.startsWith('disallow:') || trimmedLine.startsWith('allow:')) {
                const directive = trimmedLine.includes('disallow:') ? 'disallow:' : 'allow:';
                const path = trimmedLine.substring(directive.length).trim();
                
                // Check if the pattern matches as a root directory pattern
                if (this.matchesDirectoryPattern(path, pattern)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    private matchesDirectoryPattern(path: string, pattern: string): boolean {
        // Remove trailing slashes for comparison
        const normalizedPath = path.replace(/\/+$/, '');
        const normalizedPattern = pattern.replace(/\/+$/, '');
        
        // Exact match for root directories
        if (normalizedPath === normalizedPattern) {
            return true;
        }
        
        // Match for directory patterns like "/wp-admin/*"
        if (path.startsWith(pattern) && (path === pattern || path.charAt(pattern.length) === '*')) {
            return true;
        }
        
        // Special case for file patterns (like wp-login.php)
        if (!pattern.startsWith('/') && path.includes(pattern)) {
            return true;
        }
        
        return false;
    }

    // Helper method to get interesting headers for analysis
    getInterestingHeaders(headers: Record<string, string>): Record<string, string> {
        const interestingHeaders = [
            'server',
            'x-powered-by',
            'x-drupal-cache',
            'x-drupal-dynamic-cache',
            'x-generator',
            'x-pingback',
            'x-content-encoded-by',
            'content-type',
            'content-length',
            'last-modified',
            'etag',
            'cache-control',
            'expires',
            'cf-ray',
            'cf-cache-status',
            'x-frame-options',
            'x-content-type-options',
            'x-xss-protection',
            'strict-transport-security'
        ];
        
        const result: Record<string, string> = {};
        
        for (const header of interestingHeaders) {
            if (headers[header]) {
                result[header] = headers[header];
            }
        }
        
        return result;
    }
}