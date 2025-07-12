import { CMSDetectionIterator } from '../utils/cms/index.js';
import { GroundTruthOptions } from './types.js';
import { RobotsTxtAnalyzer } from '../utils/robots-txt-analyzer.js';
import { createModuleLogger } from '../utils/logger.js';
import { generateCollectedDataAnalysis } from './generate-collected-data-analysis.js';
import { selectBestVersion } from './select-best-version.js';
import { findDataFile } from './datastore.js';

const logger = createModuleLogger('generate-ground-truth-analysis');

/**
 * Types for ground truth analysis results
 */
export interface GroundTruthAnalysis {
    url: string;
    robotsAnalysis: {
        cms: string;
        confidence: number;
        error?: string;
        url?: string;
        content?: string;
        signals: string[];
        headers?: Record<string, string>;
        interestingHeaders?: Record<string, string>;
    };
    mainPageAnalysis: {
        cms: string;
        confidence: number;
        error?: string;
        executionTime?: number;
    };
    finalResult: {
        cms: string;
        confidence: number;
        method: 'robots.txt' | 'main page';
        agreement: boolean;
        bothDetected: boolean;
    };
    collectedDataAnalysis?: {
        versions: Array<{ cms: string; version: string; source: string; confidence?: string }>;
        bestVersion?: { cms: string; version: string; source: string; confidence?: string } | null;
        dataPath?: string;
    };
    error?: string;
    success: boolean;
}

/**
 * Generate ground truth analysis data for a URL
 * Pure function - separates business logic from presentation
 * 
 * @param url - URL to analyze
 * @param options - Analysis options
 * @returns Structured analysis results
 */
export async function generateGroundTruthAnalysis(
    url: string,
    options: GroundTruthOptions
): Promise<GroundTruthAnalysis> {
    try {
        // Step 1: Analyze robots.txt
        const robotsAnalyzer = new RobotsTxtAnalyzer();
        const robotsAnalysis = await robotsAnalyzer.analyze(url);
        
        // Extract interesting headers
        const interestingHeaders = robotsAnalyzer.getInterestingHeaders(robotsAnalysis.headers || {});

        // Step 2: Initialize CMS detection
        let cmsIterator: CMSDetectionIterator | null = null;
        try {
            cmsIterator = new CMSDetectionIterator({
                collectData: options.collectData,
                collectionConfig: {
                    includeHtmlContent: true,
                    includeDomAnalysis: true,
                    includeScriptAnalysis: true,
                    maxHtmlSize: 500000,
                    outputFormat: 'json'
                }
            });
        } catch (error) {
            logger.error('Failed to initialize CMS detection iterator', { error: (error as Error).message });
            return {
                url,
                robotsAnalysis: {
                    cms: robotsAnalysis.cms,
                    confidence: robotsAnalysis.confidence,
                    error: robotsAnalysis.error,
                    url: robotsAnalysis.url,
                    content: robotsAnalysis.content,
                    signals: robotsAnalysis.signals,
                    headers: robotsAnalysis.headers,
                    interestingHeaders
                },
                mainPageAnalysis: {
                    cms: 'Unknown',
                    confidence: 0,
                    error: `CMS detection initialization failed: ${(error as Error).message}`
                },
                finalResult: {
                    cms: robotsAnalysis.cms,
                    confidence: robotsAnalysis.confidence,
                    method: 'robots.txt',
                    agreement: false,
                    bothDetected: false
                },
                error: `CMS detection initialization failed: ${(error as Error).message}`,
                success: false
            };
        }

        if (!cmsIterator) {
            throw new Error('CMS detection iterator is not initialized');
        }

        // Step 3: Perform main page detection
        const mainPageResult = await cmsIterator.detect(url);

        // Step 4: Calculate final result and comparison
        const finalCms = robotsAnalysis.confidence > mainPageResult.confidence ? robotsAnalysis.cms : mainPageResult.cms;
        const finalConfidence = Math.max(robotsAnalysis.confidence, mainPageResult.confidence);
        const method = robotsAnalysis.confidence > mainPageResult.confidence ? 'robots.txt' : 'main page';
        
        const bothDetected = robotsAnalysis.cms !== 'Unknown' && mainPageResult.cms !== 'Unknown';
        const agreement = bothDetected && robotsAnalysis.cms.toLowerCase() === mainPageResult.cms.toLowerCase();

        // Step 5: Analyze collected data if available
        let collectedDataAnalysis: GroundTruthAnalysis['collectedDataAnalysis'];
        const dataPath = findDataFile(url);
        if (dataPath) {
            const analysis = generateCollectedDataAnalysis(dataPath);
            const bestVersion = selectBestVersion(analysis.versionInfo, finalCms);
            
            collectedDataAnalysis = {
                versions: analysis.versionInfo,
                bestVersion,
                dataPath
            };
        }

        return {
            url,
            robotsAnalysis: {
                cms: robotsAnalysis.cms,
                confidence: robotsAnalysis.confidence,
                error: robotsAnalysis.error,
                url: robotsAnalysis.url,
                content: robotsAnalysis.content,
                signals: robotsAnalysis.signals,
                headers: robotsAnalysis.headers,
                interestingHeaders
            },
            mainPageAnalysis: {
                cms: mainPageResult.cms,
                confidence: mainPageResult.confidence,
                error: mainPageResult.error,
                executionTime: mainPageResult.executionTime
            },
            finalResult: {
                cms: finalCms,
                confidence: finalConfidence,
                method,
                agreement,
                bothDetected
            },
            collectedDataAnalysis,
            success: true
        };

    } catch (error) {
        logger.error('Ground truth analysis failed', { url, error: (error as Error).message });
        
        return {
            url,
            robotsAnalysis: {
                cms: 'Unknown',
                confidence: 0,
                error: 'Analysis failed',
                signals: []
            },
            mainPageAnalysis: {
                cms: 'Unknown',
                confidence: 0,
                error: 'Analysis failed'
            },
            finalResult: {
                cms: 'Unknown',
                confidence: 0,
                method: 'robots.txt',
                agreement: false,
                bothDetected: false
            },
            error: (error as Error).message,
            success: false
        };
    }
}