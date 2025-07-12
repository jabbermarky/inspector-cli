import { program } from 'commander';
import { detectInputType, extractUrlsFromCSV } from '../utils/utils.js';
import { 
    analyzeGroundTruth, 
    GroundTruthOptions, 
    GroundTruthResult, 
    cleanup, 
    setShuttingDown, 
    isShuttingDown,
    displayBatchStart,
    displayUrlProgress,
    displayBatchComplete,
    displayBatchInterrupted,
    displayProcessingError,
    displayShutdownReceived,
    displayInputValidationError,
    displayCommandError
} from '../ground-truth';


// Command registration
program
    .command('ground-truth')
    .description('Interactive ground truth site discovery and management')
    .argument('[input]', 'URL or CSV file containing URLs to analyze')
    .option('--stats', 'Show ground truth database statistics')
    .option('--compact', 'Show compact output with less detailed analysis')
    .action(async (input: string, options: { stats?: boolean, compact?: boolean }) => {
        
        const groundOptions: GroundTruthOptions = {
            interactive: true, // Always interactive for this command
            save: false, // Default to not saving results
            collectData: true, // Default to collecting data
            compact: options.compact || false // Use provided compact option            
        }
        
        // Set up signal handling for graceful interruption
        const setupSignalHandling = () => {
            const signalHandler = async (signal: string) => {
                displayShutdownReceived(signal);
                await cleanup();
                process.exit(0);
            };
            
            process.on('SIGINT', () => signalHandler('SIGINT'));
            process.on('SIGTERM', () => signalHandler('SIGTERM'));
        };
        
        setupSignalHandling();
        
        try {
            //TODO - Implement stats option if needed
            // if (options.stats) {
            //     await discovery.showStats();
            //     return;
            // }
            
            if (!input) {
                displayInputValidationError('Please provide a URL or CSV file');
                return;
            }
            
            // Always treat as batch - single URLs become a batch of 1
            const inputType = detectInputType(input);
            let urls: string[] = [];
            
            if (inputType === 'csv') {
                urls = await extractUrlsFromCSV(input);
                displayBatchStart(urls.length, 'CSV');
            } else {
                urls = [input];
                displayBatchStart(urls.length, 'single');
            }
            
            for (let i = 0; i < urls.length; i++) {
                // Check if we're shutting down before processing each URL
                if (isShuttingDown) {
                    displayBatchInterrupted('user');
                    break;
                }
                
                const url = urls[i];
                displayUrlProgress(i + 1, urls.length, url);
                
                try {
                    const result: GroundTruthResult = await analyzeGroundTruth(url, groundOptions);
                    
                    // Check if user wants to continue or if we're shutting down
                    if (!result.shouldContinue || isShuttingDown) {
                        displayBatchInterrupted('stopped');
                        break;
                    }
                } catch (error) {
                    // Only log error if it's not a shutdown error
                    if (!isShuttingDown) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        displayProcessingError(url, errorMessage);
                    }
                    break;
                }
            }
            
            // Show completion message
            displayBatchComplete(urls.length);
            
        } catch (error) {
            displayCommandError((error as Error).message);
        } finally {
            // Clean shutdown sequence
            if (!isShuttingDown) {
                setShuttingDown(true);
            }
            
            try {
                await cleanup();
            } catch {
                // Ignore cleanup errors during shutdown
            }
        }
    });