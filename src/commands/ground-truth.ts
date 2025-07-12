import { program } from 'commander';
import { detectInputType, extractUrlsFromCSV } from '../utils/utils.js';
import { createModuleLogger } from '../utils/logger.js';
import { displayMessage, analyzeGroundTruth, GroundTruthOptions, GroundTruthResult } from '../ground-truth';
const logger = createModuleLogger('ground-truth');


// Command registration
program
    .command('ground-truth')
    .description('Interactive ground truth site discovery and management')
    .argument('[input]', 'URL or CSV file containing URLs to analyze')
    .option('--stats', 'Show ground truth database statistics')
    .option('--compact', 'Show compact output with less detailed analysis')
    .action(async (input: string, options: { stats?: boolean, batch?: boolean, compact?: boolean }) => {
        
        const groundOptions: GroundTruthOptions = {
            interactive: true, // Always interactive for this command
            save: false, // Default to not saving results
            collectData: true, // Default to collecting data
            compact: options.compact || false // Use provided compact option            
        }
        
        try {
            //TODO - Implement stats option if needed
            // if (options.stats) {
            //     await discovery.showStats();
            //     return;
            // }
            
            if (!input) {
                displayMessage('❌ Please provide a URL or CSV file');
                return;
            }
            
            // Always treat as batch - single URLs become a batch of 1
            const inputType = detectInputType(input);
            let urls: string[] = [];
            
            if (inputType === 'csv') {
                urls = await extractUrlsFromCSV(input);
                displayMessage(`Loaded ${urls.length} URLs from CSV`);
            } else {
                urls = [input];
            }
            
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                try {
                    const _result : GroundTruthResult = await analyzeGroundTruth(url, groundOptions);
                } catch (error) {
                    // Only log error if it's not a shutdown error
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    displayMessage(`\n❌ Error processing ${url}: ${errorMessage}`);
                    break;
                }
            }
            
            // Show completion message
            if (urls.length > 1) {
                displayMessage(`\n✅ Completed processing ${urls.length} URLs`);
            }
            
        } catch (error) {
            displayMessage(`❌ Error: ${(error as Error).message}`);
        } finally {
            // Clean shutdown sequence
            try {
                await discovery.cleanup();
            } catch {
                // Ignore cleanup errors
            }
            
            // Force exit to prevent hanging
            process.nextTick(() => {
                // Close stdin to prevent readline events
                if (process.stdin.isTTY) {
                    process.stdin.pause();
                    process.stdin.unref();
                }
                
                // Suppress specific readline errors during shutdown
                process.removeAllListeners('uncaughtException');
                process.removeAllListeners('unhandledRejection');
                
                // Add specific error handlers that suppress readline errors
                process.on('uncaughtException', (error) => {
                    if (error.message && error.message.includes('readline was closed')) {
                        return; // Suppress this specific error
                    }
                    displayMessage(`Uncaught exception: ${error}`);
                });
                
                process.on('unhandledRejection', (error) => {
                    if (error && typeof error === 'object' && 'message' in error && 
                        typeof error.message === 'string' && error.message.includes('readline was closed')) {
                        return; // Suppress this specific error
                    }
                    displayMessage(`Unhandled rejection:${error}`);
                });
                
                // Exit after a short delay to ensure all output is flushed
                setTimeout(() => {
                    process.exit(0);
                }, 100);
            });
        }
    });