import { DetectionStrategy, DetectionPage, PartialDetectionResult } from '../types.js';
import { createModuleLogger } from '../../logger.js';

const logger = createModuleLogger('http-headers-strategy');

export interface HeaderPattern {
    name: string;
    pattern: string | RegExp;
    confidence: number;
    extractVersion?: boolean;
    searchIn?: 'name' | 'value' | 'both'; // Where to search for the pattern
}

/**
 * HTTP header-based CMS detection strategy
 * Analyzes response headers for CMS-specific signatures
 */
export class HttpHeaderStrategy implements DetectionStrategy {
    private readonly patterns: HeaderPattern[];
    private readonly cmsName: string;
    private readonly timeout: number;

    constructor(patterns: HeaderPattern[], cmsName: string, timeout: number = 3000) {
        this.patterns = patterns;
        this.cmsName = cmsName;
        this.timeout = timeout;
    }

    getName(): string {
        return 'http-headers';
    }

    getTimeout(): number {
        return this.timeout;
    }

    async detect(page: DetectionPage, url: string): Promise<PartialDetectionResult> {
        try {
            logger.debug('Starting HTTP header detection', { url, cms: this.cmsName });

            // Get response headers from browser manager navigation context
            const headers = page._browserManagerContext?.lastNavigation?.headers || {};
            
            if (Object.keys(headers).length === 0) {
                logger.debug('No response headers available for analysis', { url });
                return {
                    confidence: 0,
                    method: this.getName(),
                    error: 'No response headers available'
                };
            }

            logger.debug('Found response headers for analysis', { 
                url, 
                headerCount: Object.keys(headers).length,
                headerNames: Object.keys(headers)
            });
            logger.debug('Analyzing response headers', { 
                url, 
                headerCount: Object.keys(headers).length,
                headerNames: Object.keys(headers)
            });

            let totalConfidence = 0;
            let version: string | undefined;
            const evidence: string[] = [];

            // Enhanced pattern matching: search in header names, values, or both
            for (const pattern of this.patterns) {
                const searchIn = pattern.searchIn || 'value'; // Default to searching in values
                let matches = false;
                let matchedHeaderName = '';
                let matchedHeaderValue = '';

                if (searchIn === 'name' || searchIn === 'both') {
                    // Search in header names
                    for (const [headerName, headerValue] of Object.entries(headers)) {
                        let nameMatches = false;
                        if (typeof pattern.pattern === 'string') {
                            nameMatches = headerName.toLowerCase().includes(pattern.pattern.toLowerCase());
                        } else {
                            nameMatches = pattern.pattern.test(headerName);
                        }

                        if (nameMatches) {
                            matches = true;
                            matchedHeaderName = headerName;
                            matchedHeaderValue = headerValue;
                            break;
                        }
                    }
                }

                if (!matches && (searchIn === 'value' || searchIn === 'both')) {
                    // Search in header values
                    if (pattern.name === '*') {
                        // Wildcard - search in ALL header values
                        for (const [headerName, headerValue] of Object.entries(headers)) {
                            let valueMatches = false;
                            if (typeof pattern.pattern === 'string') {
                                valueMatches = headerValue.toLowerCase().includes(pattern.pattern.toLowerCase());
                            } else {
                                valueMatches = pattern.pattern.test(headerValue);
                            }

                            if (valueMatches) {
                                matches = true;
                                matchedHeaderName = headerName;
                                matchedHeaderValue = headerValue;
                                break;
                            }
                        }
                    } else {
                        // Search in specific header value - handle case-insensitive header names
                        let headerValue: string | undefined;
                        let actualHeaderName = pattern.name;
                        
                        // Try exact match first
                        headerValue = headers[pattern.name];
                        
                        // If not found, try case-insensitive lookup
                        if (!headerValue) {
                            const targetHeaderName = pattern.name.toLowerCase();
                            for (const [name, value] of Object.entries(headers)) {
                                if (name.toLowerCase() === targetHeaderName) {
                                    headerValue = value;
                                    actualHeaderName = name;
                                    break;
                                }
                            }
                        }
                        
                        if (headerValue) {
                            if (typeof pattern.pattern === 'string') {
                                matches = headerValue.toLowerCase().includes(pattern.pattern.toLowerCase());
                            } else {
                                matches = pattern.pattern.test(headerValue);
                            }

                            if (matches) {
                                matchedHeaderName = actualHeaderName;
                                matchedHeaderValue = headerValue;
                            }
                        }
                    }
                }

                if (matches) {
                    totalConfidence += pattern.confidence;
                    evidence.push(`${matchedHeaderName}: ${matchedHeaderValue.substring(0, 100)}${matchedHeaderValue.length > 100 ? '...' : ''}`);
                    
                    logger.debug('Header pattern matched', {
                        url,
                        header: matchedHeaderName,
                        value: matchedHeaderValue.substring(0, 100),
                        pattern: pattern.pattern.toString(),
                        confidence: pattern.confidence,
                        searchIn
                    });

                    // Extract version if pattern supports it
                    if (pattern.extractVersion && typeof pattern.pattern !== 'string') {
                        const versionMatch = matchedHeaderValue.match(pattern.pattern);
                        if (versionMatch && versionMatch[1]) {
                            version = versionMatch[1];
                            logger.debug('Version extracted from header', {
                                url,
                                header: matchedHeaderName,
                                version
                            });
                        }
                    }
                }
            }

            // Normalize confidence to 0-1 range
            const normalizedConfidence = Math.min(totalConfidence, 1.0);

            logger.debug('HTTP header detection completed', {
                url,
                cms: this.cmsName,
                confidence: normalizedConfidence,
                version,
                evidenceCount: evidence.length
            });

            return {
                confidence: normalizedConfidence,
                version,
                method: this.getName(),
                evidence
            };

        } catch (error) {
            logger.error('HTTP header detection failed', {
                url,
                cms: this.cmsName,
                error: (error as Error).message
            });

            return {
                confidence: 0,
                method: this.getName(),
                error: `Header detection failed: ${(error as Error).message}`
            };
        }
    }
}