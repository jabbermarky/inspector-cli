import { program } from 'commander';
import { detectInputType, extractUrlsFromCSV } from '../utils/utils.js';
import { CMSDetectionIterator, CMSDetectionResult } from '../utils/cms/index.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('detect-cms');

interface CMSResult {
    url: string;
    success: boolean;
    cms?: string;
    version?: string;
    error?: string;
}

export async function processCMSDetectionBatch(urls: string[], options: { collectData?: boolean } = {}): Promise<CMSResult[]> {
    const results: CMSResult[] = [];
    const total = urls.length;
    let completed = 0;
    let cmsIterator: CMSDetectionIterator | null = null;
    
    // Initialize CMS detection enumerator with optional data collection
    try {
        cmsIterator = new CMSDetectionIterator({ 
            collectData: options.collectData || false,
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
        throw new Error(`CMS detection initialization failed: ${(error as Error).message}`);
    }
    if (!cmsIterator) {
        throw new Error('CMS detection iterator is not initialized');
    }   

    console.log(`Processing CMS detection for ${total} URLs...`);
    
    try {
        // Process URLs sequentially using isolated browser contexts
        // Each URL gets a fresh browser state to prevent cross-URL contamination
        for (const url of urls) {
            try {
                const detected = await cmsIterator.detect(url);
                completed++;
                
                // Check if detectCMS returned an error (vs throwing an exception)
                if (detected.error) {
                    const result: CMSResult = {
                        url,
                        success: false,
                        error: detected.error
                    };
                    
                    // Real-time error update
                    console.log(`[${completed}/${total}] ✗ ${url} → Error: ${result.error}`);
                    
                    results.push(result);
                } else {
                    // Success means we detected a known CMS (WordPress, Joomla, Drupal)
                    // "Unknown" CMS counts as a failed detection
                    const isKnownCMS = detected.cms && detected.cms !== 'Unknown';
                    
                    const result: CMSResult = {
                        url,
                        success: isKnownCMS,
                        cms: detected.cms,
                        version: detected.version
                    };
                    
                    // Real-time progress update
                    const cmsInfo = detected.cms === 'Unknown' ? 'Unknown' : 
                                   `${detected.cms}${detected.version ? ` ${detected.version}` : ''}`;
                    
                    if (isKnownCMS) {
                        console.log(`[${completed}/${total}] ✓ ${url} → ${cmsInfo}`);
                    } else {
                        console.log(`[${completed}/${total}] ✗ ${url} → ${cmsInfo} (no known CMS detected)`);
                    }
                    
                    results.push(result);
                }
                
            } catch (error) {
                completed++;
                const result: CMSResult = {
                    url,
                    success: false,
                    error: (error as Error).message
                };
                
                // Real-time error update
                console.log(`[${completed}/${total}] ✗ ${url} → Error: ${result.error}`);
                
                results.push(result);
            }
        }
    } finally {
        // Finalize the iterator and cleanup browser resources after all URLs are processed
        if (cmsIterator) {
            try {
                await cmsIterator.finalize();
            } catch (cleanupError) {
                logger.error('Failed to finalize CMS detection iterator', { error: (cleanupError as Error).message });
            }
        }
    }
    
    return results;
}

function displaySingleResult(url: string, detected: CMSDetectionResult | null) {
    console.log(`Detected CMS for ${url}:`);
    if (detected && detected.cms) {
        console.log(`CMS: ${detected.cms}`);
        console.log(`Version: ${detected.version ?? 'Unknown'}`);
        
        // Show redirect information if available
        if (detected.originalUrl && detected.finalUrl && detected.originalUrl !== detected.finalUrl) {
            console.log(`Original URL: ${detected.originalUrl}`);
            console.log(`Final URL: ${detected.finalUrl}`);
            if (detected.redirectCount) {
                console.log(`Redirects: ${detected.redirectCount}`);
            }
            if (detected.protocolUpgraded) {
                console.log(`Protocol upgraded: HTTP → HTTPS`);
            }
        }
    } else {
        console.log(`No CMS detected for ${url}`);
    }
}

function displayBatchResults(results: CMSResult[]) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`\nCMS Detection Results (${results.length} URLs processed):`);
    console.log(`✓ ${successful.length} successful, ✗ ${failed.length} failed\n`);
    
    if (successful.length > 0) {
        console.log('Successful detections (known CMS found):');
        successful.forEach(result => {
            const cmsInfo = `${result.cms}${result.version ? ` ${result.version}` : ''}`;
            console.log(`- ${result.url}: ${cmsInfo}`);
        });
    }
    
    if (failed.length > 0) {
        console.log(`\nFailed detections:`);
        failed.forEach(result => {
            if (result.error) {
                console.log(`- ${result.url}: Error - ${result.error}`);
            } else {
                console.log(`- ${result.url}: Unknown (no known CMS detected)`);
            }
        });
    }
}

program
    .command("detect-cms")
    .description("Detect CMS for a single URL or batch process URLs from a CSV file")
    .argument('<input>', 'URL to detect or CSV file containing URLs')
    .option('--collect-data', 'Enable comprehensive data collection for analysis (stores data in ./data/cms-analysis/)')
    .action(async (input, options) => {
        try {
            const inputType = detectInputType(input);
            
            if (inputType === 'url') {
                // Single URL processing - now uses unified pipeline (batch of 1)
                logger.info('Starting unified CMS detection for single URL', { 
                    url: input, 
                    collectData: options.collectData 
                });
                const results = await processCMSDetectionBatch([input], { 
                    collectData: options.collectData 
                });
                
                // Display single result using batch result format for consistency
                if (results.length > 0) {
                    const result = results[0];
                    if (result.success) {
                        console.log(`Detected CMS for ${result.url}:`);
                        console.log(`CMS: ${result.cms}`);
                        console.log(`Version: ${result.version ?? 'Unknown'}`);
                    } else {
                        console.log(`No CMS detected for ${result.url}`);
                        if (result.error) {
                            console.log(`Error: ${result.error}`);
                        }
                    }
                }
                
                logger.info('Unified CMS detection completed', { 
                    url: input, 
                    cms: results[0]?.cms, 
                    version: results[0]?.version 
                });
                
            } else {
                // CSV batch processing
                logger.info('Starting CSV batch CMS detection', { 
                    file: input, 
                    collectData: options.collectData 
                });
                const urls = extractUrlsFromCSV(input);
                logger.info('Extracted URLs from CSV', { count: urls.length });
                
                const results = await processCMSDetectionBatch(urls, { 
                    collectData: options.collectData 
                });
                displayBatchResults(results);
                
                logger.info('CSV batch CMS detection completed', { 
                    total: results.length, 
                    successful: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length
                });
            }
            
        } catch (error) {
            logger.error('CMS detection failed', { input }, error as Error);
            console.error('CMS detection failed:', (error as Error).message);
            process.exit(1);
        }
    });
