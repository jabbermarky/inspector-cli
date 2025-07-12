import { displayMessage } from './interactive-ui-utils.js';

/**
 * Display functions for batch processing progress
 * Display functions intentionally have console output side effects
 */

/**
 * Display batch processing start message
 */
export function displayBatchStart(totalUrls: number, source: 'CSV' | 'single'): void {
    if (source === 'CSV') {
        displayMessage(`Loaded ${totalUrls} URLs from CSV`);
    }
    // Single URLs don't need a start message
}

/**
 * Display progress for current URL being processed
 */
export function displayUrlProgress(current: number, total: number, url: string): void {
    displayMessage(`\n📍 Processing ${current}/${total}: ${url}`);
}

/**
 * Display batch completion message
 */
export function displayBatchComplete(totalUrls: number): void {
    if (totalUrls > 1) {
        displayMessage(`\n✅ Completed processing ${totalUrls} URLs`);
    }
}

/**
 * Display batch interruption messages
 */
export function displayBatchInterrupted(reason: 'user' | 'error' | 'stopped'): void {
    switch (reason) {
        case 'user':
            displayMessage('\n🛑 Batch processing interrupted by user');
            break;
        case 'stopped':
            displayMessage('\n🛑 Stopping batch processing');
            break;
        case 'error':
            // Error-specific message should be handled separately
            break;
    }
}

/**
 * Display processing error for specific URL
 */
export function displayProcessingError(url: string, error: string): void {
    displayMessage(`\n❌ Error processing ${url}: ${error}`);
}