import { program } from 'commander';
import { detectCMS, detectInputType, extractUrlsFromCSV, cleanUrlForDisplay } from '../utils/utils.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('detect-cms');

interface CMSResult {
    url: string;
    success: boolean;
    cms?: string;
    version?: string;
    error?: string;
}

async function processCMSDetectionBatch(urls: string[]): Promise<CMSResult[]> {
    const results: CMSResult[] = [];
    const total = urls.length;
    let completed = 0;
    
    console.log(`Processing CMS detection for ${total} URLs...`);
    
    // Process URLs sequentially to avoid browser resource conflicts
    // The individual detectCMS calls handle their own browser management
    for (const url of urls) {
        try {
            const detected = await detectCMS(url);
            completed++;
            
            // Check if detectCMS returned an error (vs throwing an exception)
            if (detected.error) {
                const result: CMSResult = {
                    url,
                    success: false,
                    error: detected.error
                };
                
                // Real-time error update
                const cleanUrl = cleanUrlForDisplay(url);
                console.log(`[${completed}/${total}] ✗ ${cleanUrl} → Error: ${result.error}`);
                
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
                const cleanUrl = cleanUrlForDisplay(url);
                const cmsInfo = detected.cms === 'Unknown' ? 'Unknown' : 
                               `${detected.cms}${detected.version ? ` ${detected.version}` : ''}`;
                
                if (isKnownCMS) {
                    console.log(`[${completed}/${total}] ✓ ${cleanUrl} → ${cmsInfo}`);
                } else {
                    console.log(`[${completed}/${total}] ✗ ${cleanUrl} → ${cmsInfo} (no known CMS detected)`);
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
            const cleanUrl = cleanUrlForDisplay(url);
            console.log(`[${completed}/${total}] ✗ ${cleanUrl} → Error: ${result.error}`);
            
            results.push(result);
        }
    }
    
    return results;
}

function displaySingleResult(url: string, detected: any) {
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
            const cleanUrl = cleanUrlForDisplay(result.url);
            const cmsInfo = `${result.cms}${result.version ? ` ${result.version}` : ''}`;
            console.log(`- ${cleanUrl}: ${cmsInfo}`);
        });
    }
    
    if (failed.length > 0) {
        console.log(`\nFailed detections:`);
        failed.forEach(result => {
            const cleanUrl = cleanUrlForDisplay(result.url);
            if (result.error) {
                console.log(`- ${cleanUrl}: Error - ${result.error}`);
            } else {
                console.log(`- ${cleanUrl}: Unknown (no known CMS detected)`);
            }
        });
    }
}

program
    .command("detect-cms")
    .description("Detect CMS for a single URL or batch process URLs from a CSV file")
    .argument('<input>', 'URL to detect or CSV file containing URLs')
    .action(async (input, _options) => {
        try {
            const inputType = detectInputType(input);
            
            if (inputType === 'url') {
                // Single URL processing
                logger.info('Starting CMS detection for single URL', { url: input });
                const detected = await detectCMS(input);
                displaySingleResult(input, detected);
                logger.info('CMS detection completed', { url: input, cms: detected.cms, version: detected.version });
                
            } else {
                // CSV batch processing
                logger.info('Starting CSV batch CMS detection', { file: input });
                const urls = extractUrlsFromCSV(input);
                logger.info('Extracted URLs from CSV', { count: urls.length });
                
                const results = await processCMSDetectionBatch(urls);
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
