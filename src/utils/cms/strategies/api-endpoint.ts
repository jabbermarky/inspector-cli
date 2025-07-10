import { DetectionStrategy, DetectionPage, PartialDetectionResult } from '../types.js';
import { createModuleLogger } from '../../logger.js';

const logger = createModuleLogger('cms-api-endpoint-strategy');

/**
 * Detects CMS by checking API endpoints and analyzing responses
 */
export class ApiEndpointStrategy implements DetectionStrategy {
    constructor(
        private readonly endpoint: string,
        private readonly cmsName: string,
        private readonly timeout: number = 6000
    ) {}

    getName(): string {
        return 'api-endpoint';
    }

    getTimeout(): number {
        return this.timeout;
    }

    async detect(page: DetectionPage, url: string): Promise<PartialDetectionResult> {
        try {
            // Get final URL after redirects from page context, fallback to original URL
            const finalUrl = page._browserManagerContext?.lastNavigation?.finalUrl || url;
            
            logger.debug(`Executing API endpoint strategy for ${this.cmsName}`, { 
                originalUrl: url,
                finalUrl, 
                endpoint: this.endpoint 
            });

            // Construct API endpoint URL using final URL after redirects
            const baseUrl = finalUrl.replace(/\/$/, '');
            const apiUrl = `${baseUrl}${this.endpoint}`;

            // Navigate to API endpoint
            const response = await page.goto(apiUrl, {
                waitUntil: 'domcontentloaded',
                timeout: this.timeout
            });

            if (!response) {
                return {
                    confidence: 0,
                    method: this.getName(),
                    error: 'No response from API endpoint'
                };
            }

            const statusCode = response.status();
            
            // Check if we got a successful response
            if (statusCode === 200) {
                const contentType = response.headers()['content-type'] || '';
                
                if (contentType.includes('application/json')) {
                    return await this.analyzeJsonResponse(page, url, apiUrl);
                } else {
                    return await this.analyzeTextResponse(page, url, apiUrl);
                }
            } else if (statusCode === 404) {
                logger.debug(`API endpoint not found`, { url, endpoint: apiUrl, status: statusCode });
                return {
                    confidence: 0,
                    method: this.getName(),
                    error: 'API endpoint not found (404)'
                };
            } else {
                logger.debug(`API endpoint returned non-200 status`, { 
                    url, 
                    endpoint: apiUrl, 
                    status: statusCode 
                });
                // Non-200, non-404 responses should not be treated as evidence of CMS
                // Many sites return 403, 500, redirects for non-existent endpoints
                return {
                    confidence: 0,
                    method: this.getName(),
                    error: `API endpoint returned status ${statusCode}`
                };
            }

        } catch (error) {
            logger.debug(`API endpoint detection failed`, {
                url,
                cms: this.cmsName,
                endpoint: this.endpoint,
                error: (error as Error).message
            });

            return {
                confidence: 0,
                method: this.getName(),
                error: `API endpoint check failed: ${(error as Error).message}`
            };
        }
    }

    /**
     * Analyze JSON response from API endpoint
     */
    private async analyzeJsonResponse(
        page: DetectionPage, 
        originalUrl: string, 
        apiUrl: string
    ): Promise<PartialDetectionResult> {
        try {
            // Get JSON content
            const jsonText = await page.evaluate(() => document.body.textContent || '');
            const jsonData = JSON.parse(jsonText);

            logger.debug(`API endpoint returned JSON`, { 
                originalUrl, 
                apiUrl, 
                cms: this.cmsName 
            });

            // Analyze JSON structure for CMS-specific patterns
            const analysis = this.analyzeJsonStructure(jsonData);

            return {
                confidence: analysis.confidence,
                version: analysis.version,
                method: this.getName()
            };

        } catch (error) {
            logger.warn(`Failed to parse JSON response`, {
                originalUrl,
                apiUrl,
                error: (error as Error).message
            });

            return {
                confidence: 0.5, // API exists but couldn't parse response
                method: this.getName(),
                error: 'Failed to parse JSON response'
            };
        }
    }

    /**
     * Analyze text response from API endpoint
     */
    private async analyzeTextResponse(
        page: DetectionPage, 
        originalUrl: string, 
        apiUrl: string
    ): Promise<PartialDetectionResult> {
        try {
            const textContent = await page.evaluate(() => document.body.textContent || '');
            
            // Look for CMS-specific patterns in text
            const cmsNameLower = this.cmsName.toLowerCase();
            const hasReference = textContent.toLowerCase().includes(cmsNameLower);

            logger.debug(`API endpoint returned text`, { 
                originalUrl, 
                apiUrl, 
                cms: this.cmsName,
                hasReference 
            });

            return {
                confidence: hasReference ? 0.7 : 0.4, // Lower confidence for text responses
                method: this.getName()
            };

        } catch (error) {
            return {
                confidence: 0.3, // API exists but couldn't analyze response
                method: this.getName(),
                error: 'Failed to analyze text response'
            };
        }
    }

    /**
     * Analyze JSON structure for CMS-specific patterns
     */
    private analyzeJsonStructure(jsonData: any): { confidence: number; version?: string } {
        // WordPress-specific analysis
        if (this.cmsName.toLowerCase() === 'wordpress') {
            if (jsonData.name && jsonData.description) {
                // Looks like WordPress REST API root
                const version = jsonData.wordpress?.version || 
                              jsonData.version ||
                              this.extractVersionFromText(JSON.stringify(jsonData));
                
                return { confidence: 0.9, version };
            }
        }

        // Joomla-specific analysis
        if (this.cmsName.toLowerCase() === 'joomla') {
            if (jsonData.joomla || (typeof jsonData === 'object' && jsonData.attributes)) {
                const version = jsonData.joomla?.version || 
                              this.extractVersionFromText(JSON.stringify(jsonData));
                
                return { confidence: 0.9, version };
            }
        }

        // Drupal-specific analysis
        if (this.cmsName.toLowerCase() === 'drupal') {
            if (jsonData.drupal || jsonData.core || (Array.isArray(jsonData) && jsonData.length > 0)) {
                const version = jsonData.drupal?.version || 
                              jsonData.core?.version ||
                              this.extractVersionFromText(JSON.stringify(jsonData));
                
                return { confidence: 0.9, version };
            }
        }

        // Generic analysis - if it's valid JSON from expected endpoint
        return { confidence: 0.6 };
    }

    /**
     * Extract version information from text
     */
    private extractVersionFromText(text: string): string | undefined {
        const versionPatterns = [
            /version["\s:]*([0-9]+(?:\.[0-9]+)*)/i,
            /"([0-9]+(?:\.[0-9]+)+)"/,
            /v([0-9]+(?:\.[0-9]+)+)/i
        ];

        for (const pattern of versionPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return undefined;
    }
}