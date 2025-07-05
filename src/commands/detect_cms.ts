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
            
            const result: CMSResult = {
                url,
                success: !detected.error,
                cms: detected.cms,
                version: detected.version
            };
            
            // Real-time progress update
            const cleanUrl = cleanUrlForDisplay(url);
            const cmsInfo = detected.cms === 'Unknown' ? 'Unknown' : 
                           `${detected.cms}${detected.version ? ` ${detected.version}` : ''}`;
            console.log(`[${completed}/${total}] ✓ ${cleanUrl} → ${cmsInfo}`);
            
            results.push(result);
            
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
        console.log('Successful detections:');
        successful.forEach(result => {
            const cleanUrl = cleanUrlForDisplay(result.url);
            const cmsInfo = result.cms === 'Unknown' ? 'Unknown' : 
                           `${result.cms}${result.version ? ` ${result.version}` : ''}`;
            console.log(`- ${cleanUrl}: ${cmsInfo}`);
        });
    }
    
    if (failed.length > 0) {
        console.log(`\nFailed URLs:`);
        failed.forEach(result => {
            const cleanUrl = cleanUrlForDisplay(result.url);
            console.log(`- ${cleanUrl}: ${result.error}`);
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
