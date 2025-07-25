import { BaseCMSDetector } from './base.js';
import { DetectionStrategy, CMSType, PartialDetectionResult, DetectionPage } from '../types.js';
import { MetaTagStrategy } from '../strategies/meta-tag.js';
import { HtmlContentStrategy } from '../strategies/html-content.js';
import { HttpHeaderStrategy } from '../strategies/http-headers.js';
import { RobotsTxtStrategy, DRUPAL_ROBOTS_PATTERNS } from '../strategies/robots-txt.js';
import { createModuleLogger } from '../../logger.js';

const logger = createModuleLogger('cms-drupal-detector');

/**
 * Drupal-specific file detection strategy
 */
class DrupalFileStrategy implements DetectionStrategy {
    private readonly timeout = 4000;

    getName(): string {
        return 'file-detection';
    }

    getTimeout(): number {
        return this.timeout;
    }

    async detect(page: DetectionPage, url: string): Promise<PartialDetectionResult> {
        try {
            // Get final URL after redirects from page context, fallback to original URL
            const finalUrl = page._browserManagerContext?.lastNavigation?.finalUrl || url;
            
            logger.debug('Executing Drupal file detection', { 
                originalUrl: url,
                finalUrl 
            });

            // Check for CHANGELOG.txt file using final URL after redirects
            const baseUrl = finalUrl.replace(/\/$/, '');
            const changelogUrl = `${baseUrl}/CHANGELOG.txt`;

            const response = await page.goto(changelogUrl, {
                waitUntil: 'domcontentloaded',
                timeout: this.timeout
            });

            if (response && response.status() === 200) {
                const textContent = await page.evaluate(() => document.body.textContent || '');
                
                if (textContent.toLowerCase().includes('drupal')) {
                    logger.debug('Drupal CHANGELOG.txt found', { url });
                    
                    // Try to extract version from changelog
                    const version = this.extractVersionFromChangelog(textContent);
                    
                    return {
                        confidence: 0.9, // High confidence for changelog detection
                        version,
                        method: this.getName()
                    };
                }
            }

            // Also check for other common Drupal files
            const drupalFiles = ['/core/CHANGELOG.txt', '/INSTALL.txt'];
            
            for (const file of drupalFiles) {
                try {
                    const fileUrl = `${baseUrl}${file}`;
                    const fileResponse = await page.goto(fileUrl, {
                        waitUntil: 'domcontentloaded',
                        timeout: 2000
                    });

                    if (fileResponse && fileResponse.status() === 200) {
                        const content = await page.evaluate(() => document.body.textContent || '');
                        if (content.toLowerCase().includes('drupal')) {
                            logger.debug(`Drupal file found: ${file}`, { url });
                            return {
                                confidence: 0.8,
                                method: this.getName()
                            };
                        }
                    }
                } catch {
                    // Continue checking other files
                    continue;
                }
            }

            return {
                confidence: 0,
                method: this.getName(),
                error: 'No Drupal files found'
            };

        } catch (error) {
            logger.debug('Drupal file detection failed', {
                url,
                error: (error as Error).message
            });

            return {
                confidence: 0,
                method: this.getName(),
                error: 'File detection failed'
            };
        }
    }

    /**
     * Extract version information from changelog content
     */
    private extractVersionFromChangelog(content: string): string | undefined {
        // Look for version patterns in changelog
        const versionPatterns = [
            /Drupal\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i,
            /^([0-9]+\.[0-9]+(?:\.[0-9]+)?)/m,
            /version\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i
        ];

        for (const pattern of versionPatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return undefined;
    }
}


/**
 * Drupal CMS detector with Drupal-specific detection strategies
 */
export class DrupalDetector extends BaseCMSDetector {
    protected strategies: DetectionStrategy[] = [
        // HTTP headers - highest priority as they're most reliable
        new HttpHeaderStrategy([
            {
                name: 'X-Generator',
                pattern: /Drupal\s+(\d+(?:\.\d+)*)/i,
                confidence: 0.95,
                extractVersion: true
            },
            {
                name: 'X-Drupal-Cache',
                pattern: /.*/,  // Any value indicates Drupal
                confidence: 0.8,
                extractVersion: false
            },
            {
                name: 'X-Drupal-Route-Normalizer',
                pattern: /.*/,  // Any value indicates Drupal
                confidence: 0.8,
                extractVersion: false
            },
            {
                name: 'X-Powered-By',
                pattern: /Drupal/i,
                confidence: 0.7,
                extractVersion: false
            }
        ], 'Drupal', 5000),
        new MetaTagStrategy('Drupal', 6000),
        new HtmlContentStrategy([
            '/sites/all/',
            '/misc/drupal.js',
            'drupal-settings-json',
            'Drupal.settings',
            'drupal',
            '/core/',
            '/modules/',
            '/themes/'
        ], 'Drupal', 4000),
        new RobotsTxtStrategy(DRUPAL_ROBOTS_PATTERNS, 'Drupal', 3000),
        new DrupalFileStrategy()
    ];

    getCMSName(): CMSType {
        return 'Drupal';
    }

    getStrategies(): DetectionStrategy[] {
        return this.strategies;
    }

    /**
     * Override strategy weights for Drupal-specific detection
     */
    protected getStrategyWeight(method: string): number {
        const weights: Record<string, number> = {
            'http-headers': 1.0,      // Highest confidence - headers are most reliable
            'meta-tag': 1.0,          // Highest confidence for meta tags
            'file-detection': 0.9,    // Very high confidence for file detection
            'robots-txt': 0.85,       // High confidence for Drupal-specific paths
            'html-content': 0.8       // Good confidence for Drupal signatures
        };
        return weights[method] || 0.5;
    }
}