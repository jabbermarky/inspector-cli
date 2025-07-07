import { DetectionStrategy, DetectionPage, PartialDetectionResult } from '../types.js';
import { createModuleLogger } from '../../logger.js';

const logger = createModuleLogger('robots-txt-strategy');

export interface RobotsPattern {
    pattern: string | RegExp;
    confidence: number;
    description: string;
    category: 'disallow' | 'sitemap' | 'admin' | 'content';
}

/**
 * Robots.txt-based CMS detection strategy
 * Analyzes robots.txt content for CMS-specific patterns and directory structures
 */
export class RobotsTxtStrategy implements DetectionStrategy {
    private readonly patterns: RobotsPattern[];
    private readonly cmsName: string;
    private readonly timeout: number;

    constructor(patterns: RobotsPattern[], cmsName: string, timeout: number = 3000) {
        this.patterns = patterns;
        this.cmsName = cmsName;
        this.timeout = timeout;
    }

    getName(): string {
        return 'robots-txt';
    }

    getTimeout(): number {
        return this.timeout;
    }

    async detect(page: DetectionPage, url: string): Promise<PartialDetectionResult> {
        try {
            logger.debug('Starting robots.txt detection', { url, cms: this.cmsName });

            // Get robots.txt data from page context if available
            // Note: This assumes the robots.txt data has been collected separately
            // In a real implementation, we'd access this from the collected data
            const robotsTxtData = (page as any)._robotsTxtData;
            
            if (!robotsTxtData?.accessible || !robotsTxtData?.content) {
                logger.debug('No robots.txt data available for analysis', { url });
                return {
                    confidence: 0,
                    method: this.getName(),
                    error: 'No robots.txt data available'
                };
            }

            logger.debug('Analyzing robots.txt content', { 
                url, 
                contentSize: robotsTxtData.content.length,
                disallowedPaths: robotsTxtData.patterns?.disallowedPaths?.length || 0
            });

            let totalConfidence = 0;
            const evidence: string[] = [];
            const content = robotsTxtData.content.toLowerCase();
            const disallowedPaths = robotsTxtData.patterns?.disallowedPaths || [];
            const sitemapUrls = robotsTxtData.patterns?.sitemapUrls || [];

            // Check each pattern against robots.txt content
            for (const pattern of this.patterns) {
                let matches = false;
                let matchedText = '';

                if (pattern.category === 'disallow') {
                    // Check disallowed paths
                    for (const path of disallowedPaths) {
                        if (typeof pattern.pattern === 'string') {
                            matches = path.toLowerCase().includes(pattern.pattern.toLowerCase());
                        } else {
                            matches = pattern.pattern.test(path);
                        }

                        if (matches) {
                            matchedText = `Disallow: ${path}`;
                            break;
                        }
                    }
                } else if (pattern.category === 'sitemap') {
                    // Check sitemap URLs
                    for (const sitemapUrl of sitemapUrls) {
                        if (typeof pattern.pattern === 'string') {
                            matches = sitemapUrl.toLowerCase().includes(pattern.pattern.toLowerCase());
                        } else {
                            matches = pattern.pattern.test(sitemapUrl);
                        }

                        if (matches) {
                            matchedText = `Sitemap: ${sitemapUrl}`;
                            break;
                        }
                    }
                } else {
                    // Check full content
                    if (typeof pattern.pattern === 'string') {
                        matches = content.includes(pattern.pattern.toLowerCase());
                        if (matches) {
                            // Find the actual line that matched
                            const lines = robotsTxtData.content.split('\n');
                            for (const line of lines) {
                                if (line.toLowerCase().includes(pattern.pattern.toLowerCase())) {
                                    matchedText = line.trim();
                                    break;
                                }
                            }
                        }
                    } else {
                        const match = pattern.pattern.exec(robotsTxtData.content);
                        if (match) {
                            matches = true;
                            matchedText = match[0];
                        }
                    }
                }

                if (matches) {
                    totalConfidence += pattern.confidence;
                    evidence.push(`${pattern.description}: ${matchedText}`);
                    
                    logger.debug('Robots.txt pattern matched', {
                        url,
                        pattern: pattern.pattern.toString(),
                        description: pattern.description,
                        matchedText,
                        confidence: pattern.confidence
                    });
                }
            }

            // Normalize confidence to 0-1 range
            const normalizedConfidence = Math.min(totalConfidence, 1.0);

            logger.debug('Robots.txt detection completed', {
                url,
                cms: this.cmsName,
                confidence: normalizedConfidence,
                evidenceCount: evidence.length
            });

            return {
                confidence: normalizedConfidence,
                method: this.getName(),
                evidence
            };

        } catch (error) {
            logger.error('Robots.txt detection failed', {
                url,
                cms: this.cmsName,
                error: (error as Error).message
            });

            return {
                confidence: 0,
                method: this.getName(),
                error: `Robots.txt detection failed: ${(error as Error).message}`
            };
        }
    }
}

// Predefined patterns for common CMSes
export const WORDPRESS_ROBOTS_PATTERNS: RobotsPattern[] = [
    {
        pattern: '/wp-admin/',
        confidence: 0.9,
        description: 'WordPress admin directory',
        category: 'disallow'
    },
    {
        pattern: '/wp-content/',
        confidence: 0.8,
        description: 'WordPress content directory',
        category: 'disallow'
    },
    {
        pattern: '/wp-includes/',
        confidence: 0.8,
        description: 'WordPress includes directory',
        category: 'disallow'
    },
    {
        pattern: '/wp-login.php',
        confidence: 0.9,
        description: 'WordPress login page',
        category: 'disallow'
    },
    {
        pattern: 'wp-sitemap.xml',
        confidence: 0.7,
        description: 'WordPress sitemap',
        category: 'sitemap'
    },
    {
        pattern: /wp-/i,
        confidence: 0.6,
        description: 'WordPress path pattern',
        category: 'admin'
    }
];

export const DRUPAL_ROBOTS_PATTERNS: RobotsPattern[] = [
    {
        pattern: '/admin/',
        confidence: 0.7,
        description: 'Drupal admin directory',
        category: 'disallow'
    },
    {
        pattern: '/user/login',
        confidence: 0.8,
        description: 'Drupal user login',
        category: 'disallow'
    },
    {
        pattern: '/node/add',
        confidence: 0.8,
        description: 'Drupal node creation',
        category: 'disallow'
    },
    {
        pattern: '/sites/',
        confidence: 0.7,
        description: 'Drupal sites directory',
        category: 'disallow'
    },
    {
        pattern: '/modules/',
        confidence: 0.6,
        description: 'Drupal modules directory',
        category: 'disallow'
    },
    {
        pattern: '/themes/',
        confidence: 0.6,
        description: 'Drupal themes directory',
        category: 'disallow'
    },
    {
        pattern: /\/\?q=/,
        confidence: 0.5,
        description: 'Drupal query parameter pattern',
        category: 'disallow'
    }
];

export const JOOMLA_ROBOTS_PATTERNS: RobotsPattern[] = [
    {
        pattern: '/administrator/',
        confidence: 0.9,
        description: 'Joomla administrator directory',
        category: 'disallow'
    },
    {
        pattern: '/components/',
        confidence: 0.7,
        description: 'Joomla components directory',
        category: 'disallow'
    },
    {
        pattern: '/modules/',
        confidence: 0.6,
        description: 'Joomla modules directory',
        category: 'disallow'
    },
    {
        pattern: '/templates/',
        confidence: 0.6,
        description: 'Joomla templates directory',
        category: 'disallow'
    },
    {
        pattern: '/cache/',
        confidence: 0.5,
        description: 'Joomla cache directory',
        category: 'disallow'
    },
    {
        pattern: '/plugins/',
        confidence: 0.6,
        description: 'Joomla plugins directory',
        category: 'disallow'
    }
];