import { displayMessage } from './interactive-ui-utils.js';

/**
 * Display functions for shutdown and signal handling messages
 * Display functions intentionally have console output side effects
 */

/**
 * Display shutdown signal received message
 */
export function displayShutdownReceived(signal: string): void {
    displayMessage(`\n\n🛑 Received ${signal} - shutting down gracefully...`);
}

/**
 * Display input validation error messages
 */
export function displayInputValidationError(message: string): void {
    displayMessage(`❌ ${message}`);
}

/**
 * Display general command error message
 */
export function displayCommandError(error: string): void {
    displayMessage(`❌ Error: ${error}`);
}